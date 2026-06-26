// ============================================================
//  Edge Function: create-user
//  Only a SUPERADMIN may create staff accounts.
//  Runs server-side and uses the service_role key (never exposed
//  to the browser). The caller's JWT is verified first.
//
//  DEPLOY (dashboard):
//    Supabase > Edge Functions > Deploy a new function
//    Name it exactly:  create-user
//    Paste this file's contents > Deploy.
//  (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected
//   automatically — no secrets to set.)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 1) Verify the caller
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing token" }, 401);
    const { data: caller, error: cErr } = await admin.auth.getUser(jwt);
    if (cErr || !caller.user) return json({ error: "Unauthorized" }, 401);

    // 2) Caller must be a superadmin
    const { data: prof } = await admin
      .from("profiles").select("role").eq("id", caller.user.id).single();
    if (!prof || prof.role !== "superadmin")
      return json({ error: "Only a superadmin can create accounts" }, 403);

    // 3) Validate input
    const { email, password, full_name, role } = await req.json();
    if (!email || !password) return json({ error: "Email and password are required" }, 400);
    if (String(password).length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
    const newRole = ["server", "admin", "superadmin"].includes(role) ? role : "server";

    // 4) Create the auth user (auto-confirmed so they can log in right away)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });
    if (createErr) return json({ error: createErr.message }, 400);

    // 5) Set role + name on the profile (trigger creates it as 'server')
    await admin.from("profiles")
      .update({ role: newRole, full_name: full_name || email })
      .eq("id", created.user!.id);

    return json({ ok: true, id: created.user!.id, role: newRole });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
