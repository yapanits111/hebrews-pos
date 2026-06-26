import { supabase } from "./db.js";
import { store, isSuperadmin, roleClass, roleLabel, el, $, toast } from "./util.js";

export async function renderStaff(root) {
  root.innerHTML = `<p class="muted">Loading...</p>`;
  if (!navigator.onLine) { root.innerHTML = `<p class="muted">Staff management needs an internet connection.</p>`; return; }

  const { data, error } = await supabase
    .from("profiles").select("id, full_name, role").order("role").order("full_name");
  if (error) { root.innerHTML = `<p class="error">${error.message}</p>`; return; }

  const me = store.profile;
  const roles = isSuperadmin() ? ["server", "admin", "superadmin"] : ["server", "admin"];

  const table = el("table", { class: "data-table" });
  table.innerHTML = `<thead><tr>
    <th>Name</th><th>Current Role</th><th>Change To</th><th></th>
  </tr></thead>`;
  const tbody = el("tbody");

  for (const u of data) {
    const isSelf = u.id === me.id;
    const lockedSuper = u.role === "superadmin" && !isSuperadmin();
    const disabled = isSelf || lockedSuper;

    const sel = el("select", disabled ? { disabled: "true" } : {},
      ...roles.map((r) => el("option", { value: r, ...(r === u.role ? { selected: "selected" } : {}) }, r)));

    const action = disabled
      ? el("span", { class: "muted" }, isSelf ? "(you)" : "locked")
      : el("button", { class: "btn btn-sm btn-primary", onclick: () => applyRole(u, sel.value) }, "Apply");

    tbody.append(el("tr", {},
      el("td", {}, u.full_name || "—"),
      el("td", {}, el("span", { class: "role-badge " + roleClass(u.role) }, roleLabel(u.role))),
      el("td", {}, sel),
      el("td", {}, action),
    ));
  }
  table.append(tbody);

  const note = isSuperadmin()
    ? "As superadmin, you can assign server, admin, or superadmin."
    : "You can assign server or admin. Only a superadmin can manage admins/superadmins.";

  root.innerHTML = "";
  if (isSuperadmin()) root.append(buildAddStaff());
  root.append(el("div", { class: "card" },
    el("h4", {}, "Staff & Roles"),
    el("p", { class: "muted" }, note),
    table,
  ));
}

function buildAddStaff() {
  const card = el("div", { class: "card" });
  card.append(
    el("h4", {}, "Add Staff Account"),
    el("p", { class: "muted" }, "Only a superadmin can create accounts. Share the email + temporary password with the staff member; they can change it later."),
    el("div", { class: "add-row" },
      el("input", { id: "as-name", placeholder: "Full name" }),
      el("input", { id: "as-email", type: "email", placeholder: "Email" }),
      el("input", { id: "as-pass", type: "text", placeholder: "Temp password (min 6)" }),
      el("select", { id: "as-role" },
        el("option", { value: "server", selected: "selected" }, "server"),
        el("option", { value: "admin" }, "admin"),
        el("option", { value: "superadmin" }, "superadmin")),
      el("button", { class: "btn btn-primary", id: "as-btn", onclick: addStaff }, "Create Account"),
    ),
  );
  return card;
}

async function addStaff() {
  const full_name = $("#as-name").value.trim();
  const email = $("#as-email").value.trim();
  const password = $("#as-pass").value;
  const role = $("#as-role").value;
  if (!email || !password) { toast("Email and password are required", "warn"); return; }
  if (password.length < 6) { toast("Password must be at least 6 characters", "warn"); return; }

  const btn = $("#as-btn");
  btn.disabled = true; btn.textContent = "Creating...";
  const { data, error } = await supabase.functions.invoke("create-user", {
    body: { email, password, full_name, role },
  });
  btn.disabled = false; btn.textContent = "Create Account";

  if (error) {
    let msg = error.message;
    try { const body = await error.context.json(); if (body?.error) msg = body.error; } catch {}
    toast("Error: " + msg, "error");
    return;
  }
  if (data?.error) { toast("Error: " + data.error, "error"); return; }
  toast("Account created!", "success");
  await renderStaff($("#view"));
}

async function applyRole(u, newRole) {
  if (newRole === u.role) { toast("No change", "warn"); return; }
  if (!confirm(`Change ${u.full_name || "this user"} from ${u.role} to ${newRole}?`)) return;
  const { error } = await supabase.rpc("set_user_role", { target_id: u.id, new_role: newRole });
  if (error) return toast(error.message, "error");
  toast("Role updated", "success");
  await renderStaff($("#view"));
}
