import { supabase } from "./db.js";
import { store, peso, el, $, toast } from "./util.js";
import { showReceipt } from "./receipt.js";
import { isOnline, cacheMenu, getCachedMenu, queueSale, updateCachedStock, nextOfflineSeq } from "./offline.js";

let cart = [];             // { product_id, name, price, qty, stock }
let promos = [];           // active promos/discounts from the DB
let selectedPromo = null;  // null | promo row | { custom: true }
let customAmount = 0;      // used only when a custom discount is chosen

export async function renderPOS(root) {
  root.innerHTML = "";
  const layout = el("div", { class: "pos-layout" });
  const menu = el("div", { class: "pos-menu", id: "pos-menu" }, el("p", { class: "muted" }, "Loading menu..."));
  const cartPanel = el("div", { class: "pos-cart", id: "pos-cart" });
  layout.append(menu, cartPanel);
  root.append(layout);

  await loadMenu(menu);
  await loadPromos();
  renderCart();
}

async function loadPromos() {
  if (!isOnline()) return; // keep whatever was already loaded this session
  const { data } = await supabase.from("promos").select("*").eq("is_active", true).order("name");
  if (data) promos = data;
}

async function loadMenu(menu) {
  let data = null, error = null;

  // Online: fetch fresh and cache locally. Offline: use the cached menu.
  if (isOnline()) {
    const res = await supabase
      .from("products").select("*").eq("is_active", true).order("category").order("name");
    data = res.data; error = res.error;
    if (!error && data) cacheMenu(data);
  }
  if (!data || error) {
    data = (await getCachedMenu())
      .filter((p) => p.is_active !== false)
      .sort((a, b) => (a.category || "").localeCompare(b.category || "") || (a.name || "").localeCompare(b.name || ""));
    error = null;
  }

  if (!data || !data.length) {
    menu.innerHTML = `<p class="muted">No products available${isOnline() ? ". Add some in the Inventory tab." : " offline yet. Connect once to load the menu."}</p>`;
    return;
  }

  // Group by category
  const groups = {};
  for (const p of data) (groups[p.category || "Others"] ??= []).push(p);

  // Display order: Coffee, Non-Coffee, Others (anything else goes last)
  const CATEGORY_ORDER = ["Coffee", "Non-Coffee", "Others"];
  const rank = (c) => { const i = CATEGORY_ORDER.indexOf(c); return i === -1 ? 999 : i; };
  const orderedCats = Object.keys(groups).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  menu.innerHTML = "";
  for (const cat of orderedCats) {
    const items = groups[cat];
    menu.append(el("h3", { class: "cat-title" }, cat));
    const grid = el("div", { class: "product-grid" });
    for (const p of items) {
      const out = p.stock !== null && p.stock <= 0;
      const btn = el("button", {
        class: "product-btn" + (out ? " is-out" : ""),
        onclick: () => addToCart(p),
        ...(out ? { disabled: "true" } : {}),
      },
        p.image_url ? el("img", { class: "product-img", src: p.image_url, alt: "", loading: "lazy" }) : null,
        el("span", { class: "product-name" }, p.name),
        el("span", { class: "product-price" }, peso(p.price)),
        p.stock !== null ? el("span", { class: "product-stock" }, out ? "OUT OF STOCK" : `stock: ${p.stock}`) : null,
      );
      grid.append(btn);
    }
    menu.append(grid);
  }
}

function addToCart(p) {
  const line = cart.find((c) => c.product_id === p.id);
  if (line) {
    if (p.stock !== null && line.qty >= p.stock) { toast("Not enough stock", "warn"); return; }
    line.qty++;
  } else {
    cart.push({ product_id: p.id, name: p.name, price: Number(p.price), qty: 1, stock: p.stock });
  }
  renderCart();
}

function changeQty(id, delta) {
  const line = cart.find((c) => c.product_id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((c) => c.product_id !== id);
  else if (line.stock !== null && line.qty > line.stock) { line.qty = line.stock; toast("Not enough stock", "warn"); }
  renderCart();
}

function computeDiscount(subtotal) {
  if (!selectedPromo) return { amount: 0, label: "" };
  if (selectedPromo.custom)
    return { amount: Math.min(Number(customAmount) || 0, subtotal), label: "Custom" };
  const v = Number(selectedPromo.value) || 0;
  const raw = selectedPromo.type === "percent" ? (subtotal * v) / 100 : v;
  return { amount: Math.min(subtotal, Math.round(raw * 100) / 100), label: selectedPromo.name };
}

function totals() {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const { amount: disc, label: discLabel } = computeDiscount(subtotal);
  return { subtotal, disc, discLabel, total: subtotal - disc };
}

function renderCart() {
  const panel = $("#pos-cart");
  if (!panel) return;
  const { subtotal, disc, total } = totals();

  panel.innerHTML = `<h3 class="cart-title">🧾 Order</h3>`;
  const list = el("div", { class: "cart-list" });
  if (!cart.length) list.append(el("p", { class: "muted" }, "Tap a product to add it."));
  for (const c of cart) {
    list.append(el("div", { class: "cart-item" },
      el("div", { class: "cart-item-top" },
        el("span", { class: "cart-item-name" }, c.name),
        el("button", { class: "icon-btn", title: "Remove", onclick: () => changeQty(c.product_id, -c.qty) }, "✕"),
      ),
      el("div", { class: "cart-item-bot" },
        el("div", { class: "qty" },
          el("button", { class: "qty-btn", onclick: () => changeQty(c.product_id, -1) }, "−"),
          el("span", { class: "qty-val" }, String(c.qty)),
          el("button", { class: "qty-btn", onclick: () => changeQty(c.product_id, 1) }, "+"),
        ),
        el("span", { class: "cart-item-total" }, peso(c.price * c.qty)),
      ),
    ));
  }
  panel.append(list);

  // Discount / Promo — the server just picks one; it's applied automatically.
  const discBox = el("div", { class: "disc-box" },
    el("label", {}, "Discount / Promo"),
    promoSelect(),
    el("div", { class: "custom-disc", id: "custom-disc", style: selectedPromo?.custom ? "" : "display:none" },
      el("input", { type: "number", min: "0", step: "0.01", id: "custom-amount",
        value: String(customAmount || ""), placeholder: "₱ amount",
        oninput: (e) => { customAmount = e.target.value; updateSummary(); } }),
    ),
  );
  panel.append(discBox);

  // Summary
  panel.append(el("div", { class: "summary", id: "pos-summary" }));
  updateSummary();

  // Payment
  const pay = el("div", { class: "pay-box" },
    el("label", {}, "Payment method"),
    el("div", { class: "pay-methods" },
      payBtn("Cash", true), payBtn("GCash", false),
    ),
    el("div", { class: "cash-box", id: "cash-box" },
      el("label", {}, "Customer payment (₱)"),
      el("input", { type: "number", id: "cash-input", min: "0", step: "0.01", placeholder: "0.00",
        oninput: updateSummary }),
      el("div", { class: "change-line", id: "change-line" }),
    ),
  );
  panel.append(pay);

  panel.append(el("button", { class: "btn btn-primary btn-checkout", id: "checkout-btn",
    onclick: checkout, ...(cart.length ? {} : { disabled: "true" }) }, "✓ Complete & Print Receipt"));

  selectedPayment = "Cash";
  updateSummary();
}

let selectedPayment = "Cash";
function payBtn(name, active) {
  return el("button", {
    class: "pay-btn" + (active ? " active" : ""),
    "data-pay": name,
    onclick: (e) => {
      selectedPayment = name;
      document.querySelectorAll(".pay-btn").forEach((b) => b.classList.toggle("active", b === e.currentTarget));
      $("#cash-box").style.display = name === "Cash" ? "block" : "none";
      updateSummary();
    },
  }, name);
}

function promoSelect() {
  const sel = el("select", { id: "promo-select", class: "promo-select", onchange: onPromoChange });
  sel.append(el("option", { value: "" }, "No discount"));
  for (const p of promos) {
    const tag = p.type === "percent" ? `${Number(p.value)}%` : `₱${Number(p.value).toFixed(2)}`;
    const isSel = selectedPromo && !selectedPromo.custom && selectedPromo.id === p.id;
    sel.append(el("option", { value: String(p.id), ...(isSel ? { selected: "selected" } : {}) }, `${p.name} (${tag})`));
  }
  sel.append(el("option", { value: "__custom__", ...(selectedPromo?.custom ? { selected: "selected" } : {}) }, "Custom amount"));
  return sel;
}

function onPromoChange(e) {
  const v = e.target.value;
  if (v === "") selectedPromo = null;
  else if (v === "__custom__") selectedPromo = { custom: true };
  else { selectedPromo = promos.find((p) => String(p.id) === v) || null; customAmount = 0; }
  const box = $("#custom-disc");
  if (box) box.style.display = selectedPromo?.custom ? "block" : "none";
  updateSummary();
}

function updateSummary() {
  const sum = $("#pos-summary");
  if (!sum) return;
  const { subtotal, disc, discLabel, total } = totals();
  sum.innerHTML = `
    <div class="sum-row"><span>Subtotal</span><span>${peso(subtotal)}</span></div>
    ${disc > 0 ? `<div class="sum-row"><span>Discount${discLabel ? ` (${discLabel})` : ""}</span><span>-${peso(disc)}</span></div>` : ""}
    <div class="sum-row sum-total"><span>TOTAL</span><span>${peso(total)}</span></div>`;

  const cl = $("#change-line");
  if (cl && selectedPayment === "Cash") {
    const cash = Number($("#cash-input")?.value || 0);
    const change = cash - total;
    cl.innerHTML = cash > 0
      ? `<span>Change</span><span class="${change < 0 ? "neg" : ""}">${peso(change)}</span>`
      : "";
  }
}

// Step 1: validate + build the order, then show a review modal. Nothing is
// saved to the database yet.
function checkout() {
  if (!cart.length) return;
  const { subtotal, disc, discLabel, total } = totals();
  let cash_received = 0, change_amount = 0;

  if (selectedPayment === "Cash") {
    cash_received = Number($("#cash-input")?.value || 0);
    if (cash_received < total) { toast("Customer payment is short", "warn"); return; }
    change_amount = cash_received - total;
  }

  const saleRow = {
    cashier: store.profile?.full_name || store.user?.email,
    subtotal, discount_label: discLabel || null, discount_amount: disc,
    total, payment_method: selectedPayment, cash_received, change_amount,
    created_at: new Date().toISOString(),
  };
  const baseItems = cart.map((c) => ({
    product_id: c.product_id, name: c.name,
    qty: c.qty, unit_price: c.price, line_total: c.price * c.qty,
  }));
  const stockDec = cart.filter((c) => c.stock !== null).map((c) => ({ product_id: c.product_id, qty: c.qty }));

  showReview({ saleRow, baseItems, stockDec });
}

// Review modal — lets the cashier double-check before anything is saved.
function showReview(order) {
  const { saleRow, baseItems } = order;
  const overlay = el("div", { class: "modal-overlay" });
  const card = el("div", { class: "modal review-modal" });
  card.append(el("h3", {}, "Review Order"));

  const list = el("div", { class: "review-list" });
  for (const it of baseItems) {
    list.append(el("div", { class: "review-row" },
      el("span", {}, `${it.qty} × ${it.name}`),
      el("span", {}, peso(it.line_total)),
    ));
  }
  card.append(list);

  const sums = el("div", { class: "review-sums" });
  sums.append(reviewSum("Subtotal", peso(saleRow.subtotal)));
  if (saleRow.discount_amount > 0)
    sums.append(reviewSum("Discount" + (saleRow.discount_label ? ` (${saleRow.discount_label})` : ""),
      "-" + peso(saleRow.discount_amount)));
  sums.append(reviewSum("TOTAL", peso(saleRow.total), "review-total"));
  sums.append(reviewSum("Payment", saleRow.payment_method));
  if (saleRow.payment_method === "Cash") {
    sums.append(reviewSum("Cash", peso(saleRow.cash_received)));
    sums.append(reviewSum("Change", peso(saleRow.change_amount)));
  }
  card.append(sums);

  const confirmBtn = el("button", { class: "btn btn-primary", id: "confirm-sale-btn" }, "Confirm & Print");
  card.append(el("div", { class: "modal-actions" },
    el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "← Back"),
    confirmBtn,
  ));

  overlay.append(card);
  document.body.append(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true; confirmBtn.textContent = "Saving...";
    try { await saveSale(order); }
    finally { overlay.remove(); }
  };
}

function reviewSum(label, val, cls) {
  return el("div", { class: "review-sum-row" + (cls ? " " + cls : "") },
    el("span", {}, label), el("span", {}, val));
}

// Step 2: actually persist the order (online) or queue it (offline), print, reset.
async function saveSale({ saleRow, baseItems, stockDec }) {
  if (isOnline()) {
    const { data: sale, error: e1 } = await supabase.from("sales").insert(saleRow).select().single();
    if (e1) { toast("Error saving: " + e1.message, "error"); return; }
    const items = baseItems.map((it) => ({ ...it, sale_id: sale.id }));
    const { error: e2 } = await supabase.from("sale_items").insert(items);
    if (e2) toast("Sale saved but item error: " + e2.message, "warn");
    for (const c of cart) {
      if (c.stock !== null) {
        await supabase.from("products").update({ stock: Math.max(0, c.stock - c.qty) }).eq("id", c.product_id);
      }
    }
    showReceipt(sale, items);
    toast("Sale successful!", "success");
  } else {
    // Offline: queue the sale locally, print now, sync when back online
    const seq = nextOfflineSeq();
    const localId = "off-" + Date.now() + "-" + seq;
    await queueSale({ localId, sale: saleRow, items: baseItems, stockDec });
    for (const c of cart) {
      if (c.stock !== null) await updateCachedStock(c.product_id, Math.max(0, c.stock - c.qty));
    }
    showReceipt({ ...saleRow, id: "OFF-" + seq }, baseItems);
    toast("Saved offline — will sync when online", "success");
  }

  cart = []; selectedPromo = null; customAmount = 0;
  await renderPOS($("#view"));
}
