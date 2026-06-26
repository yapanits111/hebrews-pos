// ---------- Shared helpers + state ----------

export const store = { user: null, profile: null };
// admin-level access covers both admin and superadmin
export const isAdmin = () => ["admin", "superadmin"].includes(store.profile?.role);
export const isSuperadmin = () => store.profile?.role === "superadmin";
export const roleLabel = (r = store.profile?.role) => (r || "server").toUpperCase();
export const roleClass = (r = store.profile?.role) =>
  r === "superadmin" ? "super" : r === "admin" ? "admin" : "";

// Pera format (UI)
export const peso = (n) =>
  "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Pera para sa resibo (walang thousands separator, may peso sign)
export const pesoR = (n) =>
  "₱" + Number(n || 0).toFixed(2);

// DOM shortcuts
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Gumawa ng element: el("div", {class:"x"}, child1, child2)
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

// Toast notification
let toastTimer;
export function toast(msg, type = "info") {
  let t = $("#toast");
  if (!t) {
    t = el("div", { id: "toast" });
    document.body.append(t);
  }
  t.textContent = msg;
  t.className = "show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2800);
}

// Petsa/oras na readable
export function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// Receipt number from sale id. Numeric (synced) -> HB-000123.
// Offline temp ids (e.g. "OFF-3") render as HB-OFF-3 until synced.
export const receiptNo = (id) =>
  typeof id === "number" ? "HB-" + String(id).padStart(6, "0") : "HB-" + String(id);
