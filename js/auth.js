import { supabase } from "./db.js";
import { store } from "./util.js";

export async function loadSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { store.user = null; store.profile = null; return null; }
  store.user = session.user;
  await loadProfile();
  return session;
}

export async function loadProfile() {
  try {
    const { data, error } = await supabase
      .from("profiles").select("*").eq("id", store.user.id).single();
    if (error) throw error;
    store.profile = data;
    localStorage.setItem("hb_profile", JSON.stringify(data)); // cache for offline
  } catch {
    // Offline (or no profile): fall back to the cached profile
    const cached = localStorage.getItem("hb_profile");
    store.profile = cached
      ? JSON.parse(cached)
      : { id: store.user.id, full_name: store.user?.email, role: "server" };
  }
  return store.profile;
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return loadSession();
}

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || email } },
  });
  if (error) throw error;
  return data; // data.session is null if email confirmation is required
}

export async function logout() {
  await supabase.auth.signOut();
  store.user = null;
  store.profile = null;
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
