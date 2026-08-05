import { configNotSet } from "./db.js";
import { loadSession, login, logout, changePassword } from "./auth.js";
import { store, isAdmin, roleClass, roleLabel, $, el, toast } from "./util.js";
import { SHOP } from "./config.js";
import { renderPOS } from "./pos.js";
import { renderInventory } from "./inventory.js";
import { renderSales } from "./sales.js";
import { renderAnalytics } from "./analytics.js";
import { renderStaff } from "./staff.js";
import { renderPublicMenu } from "./menu.js";
import { syncPending, getPendingCount } from "./offline.js";

const app = $("#app");

const TABS = [
  { id: "pos",       label: "🛒 Order",     adminOnly: false, render: renderPOS },
  { id: "analytics", label: "📈 Analytics", adminOnly: true,  render: renderAnalytics },
  { id: "inventory", label: "📦 Inventory", adminOnly: true,  render: renderInventory },
  { id: "sales",     label: "📊 Sales",     adminOnly: true,  render: renderSales },
  { id: "staff",     label: "👥 Staff",     adminOnly: true,  render: renderStaff },
];

async function boot() {
  if (configNotSet) { renderSetupNeeded(); return; }
  try {
    const session = await loadSession();
    if (session) renderApp("pos");
    else showPublicMenu();
  } catch (e) {
    renderAuth("login", e.message);
  }
}

function showPublicMenu() {
  renderPublicMenu(app, () => renderAuth("login"));
}

function renderSetupNeeded() {
  app.innerHTML = `
    <div class="centered">
      <div class="card setup-card">
        <h2>${SHOP.name}</h2>
        <p>The database connection is not set up yet.</p>
        <p>Open <code>js/config.js</code> and fill in <b>SUPABASE_URL</b> and <b>SUPABASE_ANON_KEY</b> from your Supabase project.</p>
        <p class="muted">See <code>README.md</code> for the step-by-step guide.</p>
      </div>
    </div>`;
}

function renderAuth(mode = "login", err) {
  app.innerHTML = "";
  const card = el("div", { class: "card login-card" },
    el("div", { class: "login-logo" }, "☕"),
    el("h2", {}, SHOP.name),
    el("p", { class: "muted" }, "Staff login"),
    err ? el("p", { class: "error" }, err) : null,
    el("input", { id: "li-email", type: "email", placeholder: "Email", autocomplete: "username" }),
    el("input", { id: "li-pass", type: "password", placeholder: "Password", autocomplete: "current-password" }),
    el("button", { class: "btn btn-primary btn-block", id: "li-btn", onclick: doLogin }, "Log in"),
    el("button", { class: "btn btn-ghost btn-block auth-toggle", onclick: showPublicMenu }, "← Back to menu"),
  );
  app.append(el("div", { class: "centered" }, card));
  $("#li-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
}

async function doLogin() {
  const email = $("#li-email").value.trim();
  const pass = $("#li-pass").value;
  if (!email || !pass) { toast("Enter your email and password", "warn"); return; }
  const btn = $("#li-btn");
  btn.disabled = true; btn.textContent = "Logging in...";
  try {
    await login(email, pass);
    renderApp("pos");
  } catch (e) {
    btn.disabled = false; btn.textContent = "Log in";
    const m = e?.message || "";
    if (/email not confirmed/i.test(m))
      toast("Email not confirmed yet. Confirm it first (or turn off email confirmation in Supabase).", "error");
    else if (/invalid login/i.test(m))
      toast("Wrong email or password", "error");
    else
      toast(m || "Login failed", "error");
  }
}

function renderApp(activeTab) {
  const visible = TABS.filter((t) => !t.adminOnly || isAdmin());
  app.innerHTML = "";

  const header = el("header", { class: "topbar" },
    el("div", { class: "brand" }, el("span", { class: "brand-logo" }, "☕"), el("span", {}, SHOP.name)),
    el("nav", { class: "nav" },
      ...visible.map((t) => el("button", {
        class: "nav-btn" + (t.id === activeTab ? " active" : ""),
        onclick: () => switchTab(t.id),
      }, t.label)),
    ),
    el("div", { class: "user-box" },
      el("span", { class: "net-badge", id: "net-status" }, ""),
      el("span", { class: "user-name" }, `${store.profile?.full_name || store.user?.email}`),
      el("span", { class: "role-badge " + roleClass() }, roleLabel()),
      el("button", { class: "btn btn-ghost btn-sm", onclick: openChangePassword }, "🔑 Password"),
      el("button", { class: "btn btn-ghost btn-sm", onclick: doLogout }, "Log out"),
    ),
  );

  const view = el("main", { id: "view", class: "view" });
  app.append(header, view);
  switchTab(activeTab);
  setupConnectivity();
}

let _netWired = false;
function setupConnectivity() {
  refreshNetStatus();
  if (!_netWired) {
    window.addEventListener("online", onBackOnline);
    window.addEventListener("offline", refreshNetStatus);
    _netWired = true;
  }
  trySync();
}

async function onBackOnline() {
  await refreshNetStatus();
  await trySync();
}

async function trySync() {
  if (!navigator.onLine || !store.user) return;
  if (!(await getPendingCount())) { refreshNetStatus(); return; }
  const { synced } = await syncPending();
  if (synced > 0) {
    toast(`Synced ${synced} offline sale${synced > 1 ? "s" : ""}`, "success");
    const onOrder = document.querySelector(".nav-btn.active")?.textContent?.includes("Order");
    if (onOrder) switchTab("pos");
  }
  refreshNetStatus();
}

async function refreshNetStatus() {
  const badge = $("#net-status");
  if (!badge) return;
  const pending = await getPendingCount();
  if (navigator.onLine) {
    badge.className = "net-badge online";
    badge.textContent = pending > 0 ? `● Online · ${pending} to sync` : "● Online";
  } else {
    badge.className = "net-badge offline";
    badge.textContent = pending > 0 ? `● Offline · ${pending} pending` : "● Offline";
  }
}

async function switchTab(id) {
  const visible = TABS.filter((t) => !t.adminOnly || isAdmin());
  const tab = visible.find((t) => t.id === id) || visible[0];
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b.textContent === tab.label));
  const view = $("#view");
  view.innerHTML = `<p class="muted">Loading...</p>`;
  await tab.render(view);
}

function openChangePassword() {
  const overlay = el("div", { class: "modal-overlay" });
  const card = el("div", { class: "modal pw-modal" });
  card.append(
    el("h3", {}, "Change Password"),
    el("p", { class: "muted pw-hint" }, "Enter a new password (at least 6 characters)."),
  );
  const newIn = el("input", { type: "password", placeholder: "New password", autocomplete: "new-password" });
  const confIn = el("input", { type: "password", placeholder: "Confirm new password", autocomplete: "new-password" });
  const saveBtn = el("button", { class: "btn btn-primary" }, "Save");
  const actions = el("div", { class: "modal-actions" },
    el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
    saveBtn,
  );
  card.append(newIn, confIn, actions);
  overlay.append(card);
  document.body.append(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const save = async () => {
    const p1 = newIn.value, p2 = confIn.value;
    if (p1.length < 6) { toast("Password must be at least 6 characters", "warn"); return; }
    if (p1 !== p2) { toast("Passwords do not match", "warn"); return; }
    saveBtn.disabled = true; saveBtn.textContent = "Saving...";
    try {
      await changePassword(p1);
      overlay.remove();
      toast("Password changed!", "success");
    } catch (e) {
      saveBtn.disabled = false; saveBtn.textContent = "Save";
      toast("Error: " + e.message, "error");
    }
  };
  saveBtn.onclick = save;
  confIn.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
  newIn.focus();
}

async function doLogout() {
  if (!confirm("Log out of Hebrews POS?")) return;
  await logout();
  showPublicMenu();
}

// Register the service worker so the app loads offline
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

boot();
