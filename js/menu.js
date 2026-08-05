import { supabase } from "./db.js";
import { SHOP } from "./config.js";
import { peso, el } from "./util.js";
import { getCachedMenu } from "./offline.js";

const CATEGORY_ORDER = ["Coffee", "Non-Coffee", "Others"];
const rank = (c) => { const i = CATEGORY_ORDER.indexOf(c); return i === -1 ? 999 : i; };

export async function renderPublicMenu(root, onLogin) {
  root.innerHTML = "";
  const wrap = el("div", { class: "public-menu" });

  wrap.append(el("div", { class: "pm-head" },
    el("div", { class: "pm-logo" }, "☕"),
    el("h1", { class: "pm-title" }, SHOP.name),
    el("p", { class: "pm-tag" }, SHOP.tagline),
    el("p", { class: "pm-verse" }, `"${SHOP.verse}"`),
  ));

  const list = el("div", { class: "pm-list" }, el("p", { class: "muted" }, "Loading menu..."));
  wrap.append(list);
  root.append(wrap);

  // Read active products (anon-readable). Fall back to cached menu offline.
  let data = null, error = null;
  if (navigator.onLine) {
    // select("*") is resilient: it never errors if a column (e.g. image_url
    // before its migration is run) doesn't exist yet.
    const res = await supabase.from("products").select("*")
      .eq("is_active", true).order("name");
    data = res.data; error = res.error;
  }
  if (!data || error) data = (await getCachedMenu()).filter((p) => p.is_active !== false);

  if (!data || !data.length) {
    list.innerHTML = `<p class="muted">Menu coming soon.</p>`;
    return;
  }

  const groups = {};
  for (const p of data) (groups[p.category || "Others"] ??= []).push(p);
  const cats = Object.keys(groups).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  list.innerHTML = "";
  for (const cat of cats) {
    list.append(el("h3", { class: "pm-cat" }, cat));
    const items = el("div", { class: "pm-items" });
    for (const p of groups[cat]) {
      items.append(el("div", { class: "pm-item" },
        p.image_url ? el("img", { class: "pm-img", src: p.image_url, alt: "", loading: "lazy" }) : null,
        el("span", { class: "pm-name" }, p.name),
        el("span", { class: "pm-dots" }, ""),
        el("span", { class: "pm-price" }, peso(p.price)),
      ));
    }
    list.append(items);
  }

  wrap.append(el("p", { class: "pm-foot" }, `📍 ${SHOP.address}  ·  ${SHOP.contact}`));
  wrap.append(el("button", { class: "btn btn-ghost btn-sm pm-staff-link", onclick: onLogin }, "Staff Login"));
}
