import { supabase } from "./db.js";
import { peso, el, $, toast } from "./util.js";

let tab = "products";

export async function renderInventory(root) {
  root.innerHTML = "";
  const tabs = el("div", { class: "subtabs" },
    subTab("products", "☕ Products"),
    subTab("ingredients", "🧂 Ingredients"),
    subTab("promos", "🏷️ Promos"),
  );
  const body = el("div", { id: "inv-body" });
  root.append(tabs, body);
  await draw(body);
}

function subTab(id, label) {
  return el("button", {
    class: "subtab" + (tab === id ? " active" : ""),
    onclick: async () => { tab = id; await renderInventory($("#view")); },
  }, label);
}

async function draw(body) {
  if (tab === "products") await drawProducts(body);
  else if (tab === "ingredients") await drawIngredients(body);
  else await drawPromos(body);
}

// ---------------- PROMOS / DISCOUNTS ----------------
async function drawPromos(body) {
  const { data, error } = await supabase.from("promos").select("*").order("name");
  if (error) { body.innerHTML = `<p class="error">${error.message}</p>`; return; }

  body.innerHTML = "";

  const add = el("div", { class: "add-row" },
    el("input", { id: "npr-name", placeholder: "Promo name (Senior, October Sale...)" }),
    el("select", { id: "npr-type" },
      el("option", { value: "percent" }, "percent (%)"),
      el("option", { value: "fixed" }, "fixed (₱)")),
    el("input", { id: "npr-value", type: "number", step: "0.01", min: "0", placeholder: "Value" }),
    el("button", { class: "btn btn-primary", onclick: addPromo }, "+ Add"),
  );
  body.append(el("div", { class: "card" },
    el("h4", {}, "Add a Promo / Discount"),
    el("p", { class: "muted" }, "Servers pick these from a dropdown at checkout — the discount is applied automatically."),
    add));

  const table = el("table", { class: "data-table" });
  table.innerHTML = `<thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Active</th><th></th></tr></thead>`;
  const tbody = el("tbody");
  for (const pr of data) {
    const tr = el("tr", { class: pr.is_active ? "" : "inactive" });
    tr.append(
      td(el("input", { class: "cell-in", value: pr.name, "data-f": "name" })),
      td(el("select", { class: "cell-in cell-sm", "data-f": "type" },
        el("option", { value: "percent", ...(pr.type === "percent" ? { selected: "selected" } : {}) }, "percent (%)"),
        el("option", { value: "fixed", ...(pr.type === "fixed" ? { selected: "selected" } : {}) }, "fixed (₱)"))),
      td(el("input", { class: "cell-in cell-num", type: "number", step: "0.01", value: pr.value, "data-f": "value" })),
      td(el("input", { type: "checkbox", "data-f": "is_active", ...(pr.is_active ? { checked: "checked" } : {}) })),
      td(
        el("button", { class: "btn btn-sm btn-primary", onclick: (e) => savePromo(pr.id, e) }, "Save"),
        el("button", { class: "btn btn-sm btn-danger", onclick: () => delPromo(pr.id, pr.name) }, "Delete"),
      ),
    );
    tbody.append(tr);
  }
  table.append(tbody);
  body.append(el("div", { class: "card" }, el("h4", {}, "All Promos"), table));
}

async function addPromo() {
  const name = $("#npr-name").value.trim();
  if (!name) { toast("Name is required", "warn"); return; }
  const { error } = await supabase.from("promos").insert({
    name,
    type: $("#npr-type").value,
    value: Number($("#npr-value").value || 0),
  });
  if (error) return toast(error.message, "error");
  toast("Promo added", "success");
  await renderInventory($("#view"));
}

async function savePromo(id, e) {
  const tr = e.target.closest("tr");
  const get = (f) => tr.querySelector(`[data-f="${f}"]`);
  const { error } = await supabase.from("promos").update({
    name: get("name").value.trim(),
    type: get("type").value,
    value: Number(get("value").value || 0),
    is_active: get("is_active").checked,
  }).eq("id", id);
  if (error) return toast(error.message, "error");
  toast("Saved!", "success");
}

async function delPromo(id, name) {
  if (!confirm(`Delete promo "${name}"?`)) return;
  const { error } = await supabase.from("promos").delete().eq("id", id);
  if (error) return toast(error.message, "error");
  toast("Deleted", "success");
  await renderInventory($("#view"));
}

// ---------------- PRODUCTS ----------------
async function drawProducts(body) {
  const { data, error } = await supabase.from("products").select("*").order("category").order("name");
  if (error) { body.innerHTML = `<p class="error">${error.message}</p>`; return; }

  body.innerHTML = "";

  // Add form
  const add = el("div", { class: "add-row" },
    el("input", { id: "np-name", placeholder: "Product name" }),
    el("input", { id: "np-cat", placeholder: "Category (Coffee...)", value: "Coffee" }),
    el("input", { id: "np-price", type: "number", step: "0.01", min: "0", placeholder: "Price" }),
    el("input", { id: "np-stock", type: "number", step: "1", placeholder: "Stock (blank = not tracked)" }),
    el("button", { class: "btn btn-primary", onclick: addProduct }, "+ Add"),
  );
  body.append(el("div", { class: "card" }, el("h4", {}, "Add a Product"), add));

  // Table
  const table = el("table", { class: "data-table" });
  table.innerHTML = `<thead><tr>
    <th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Active</th><th></th>
  </tr></thead>`;
  const tbody = el("tbody");
  for (const p of data) {
    const tr = el("tr", { class: p.is_active ? "" : "inactive" });
    tr.append(
      td(imageCell(p)),
      td(el("input", { class: "cell-in", value: p.name, "data-f": "name" })),
      td(el("input", { class: "cell-in cell-sm", value: p.category || "", "data-f": "category" })),
      td(el("input", { class: "cell-in cell-num", type: "number", step: "0.01", value: p.price, "data-f": "price" })),
      td(el("input", { class: "cell-in cell-num", type: "number", step: "1", value: p.stock ?? "", placeholder: "—", "data-f": "stock" })),
      td(el("input", { type: "checkbox", "data-f": "is_active", ...(p.is_active ? { checked: "checked" } : {}) })),
      td(
        el("button", { class: "btn btn-sm btn-primary", onclick: (e) => saveProduct(p.id, e) }, "Save"),
        el("button", { class: "btn btn-sm btn-danger", onclick: () => delProduct(p.id, p.name) }, "Delete"),
      ),
    );
    tbody.append(tr);
  }
  table.append(tbody);
  body.append(el("div", { class: "card" }, el("h4", {}, "All Products"), table));
}

function imageCell(p) {
  const wrap = el("div", { class: "img-cell" });
  if (p.image_url) {
    wrap.append(el("img", { class: "prod-thumb", src: p.image_url, alt: "" }));
    wrap.append(el("button", { class: "btn btn-danger btn-xs img-remove",
      onclick: () => removeProductImage(p.id, p.image_url) }, "Remove image"));
  }
  wrap.append(el("input", {
    type: "file", accept: "image/*", class: "img-file",
    onchange: (e) => { if (e.target.files[0]) uploadProductImage(p.id, e.target.files[0]); },
  }));
  return wrap;
}

async function removeProductImage(productId, imageUrl) {
  if (!confirm("Remove this product's image?")) return;
  // Best-effort delete of the file from storage (harmless if it fails).
  try {
    const path = imageUrl.split("/product-images/")[1];
    if (path) await supabase.storage.from("product-images").remove([decodeURIComponent(path)]);
  } catch (_) { /* ignore */ }
  const { error } = await supabase.from("products").update({ image_url: null }).eq("id", productId);
  if (error) return toast(error.message, "error");
  toast("Image removed", "success");
  await renderInventory($("#view"));
}

async function uploadProductImage(productId, file) {
  if (file.size > 5 * 1024 * 1024) { toast("Image too large (max 5MB)", "warn"); return; }
  toast("Uploading image...", "info");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `product-${productId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("product-images").upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return toast("Upload failed: " + upErr.message, "error");
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  const { error } = await supabase.from("products").update({ image_url: data.publicUrl }).eq("id", productId);
  if (error) return toast(error.message, "error");
  toast("Image saved", "success");
  await renderInventory($("#view"));
}

async function addProduct() {
  const name = $("#np-name").value.trim();
  if (!name) { toast("Name is required", "warn"); return; }
  const stockVal = $("#np-stock").value;
  const { error } = await supabase.from("products").insert({
    name,
    category: $("#np-cat").value.trim() || "Others",
    price: Number($("#np-price").value || 0),
    stock: stockVal === "" ? null : Number(stockVal),
  });
  if (error) return toast(error.message, "error");
  toast("Product added", "success");
  await renderInventory($("#view"));
}

async function saveProduct(id, e) {
  const tr = e.target.closest("tr");
  const get = (f) => tr.querySelector(`[data-f="${f}"]`);
  const stockVal = get("stock").value;
  const { error } = await supabase.from("products").update({
    name: get("name").value.trim(),
    category: get("category").value.trim(),
    price: Number(get("price").value || 0),
    stock: stockVal === "" ? null : Number(stockVal),
    is_active: get("is_active").checked,
  }).eq("id", id);
  if (error) return toast(error.message, "error");
  toast("Saved!", "success");
}

async function delProduct(id, name) {
  if (!confirm(`Delete "${name}"? (Better to just uncheck Active so it stays in your reports.)`)) return;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return toast("Cannot delete (already used in a sale?). Try unchecking Active instead.", "error");
  toast("Deleted", "success");
  await renderInventory($("#view"));
}

// ---------------- INGREDIENTS ----------------
async function drawIngredients(body) {
  const { data, error } = await supabase.from("ingredients").select("*").order("name");
  if (error) { body.innerHTML = `<p class="error">${error.message}</p>`; return; }

  body.innerHTML = "";

  const add = el("div", { class: "add-row" },
    el("input", { id: "ni-name", placeholder: "Name (Coffee Beans...)" }),
    el("input", { id: "ni-unit", placeholder: "Unit (g/ml/pcs)", value: "pcs" }),
    el("input", { id: "ni-stock", type: "number", step: "0.01", placeholder: "Stock" }),
    el("input", { id: "ni-cost", type: "number", step: "0.01", placeholder: "Cost/unit" }),
    el("input", { id: "ni-low", type: "number", step: "0.01", placeholder: "Low alert" }),
    el("button", { class: "btn btn-primary", onclick: addIngredient }, "+ Add"),
  );
  body.append(el("div", { class: "card" }, el("h4", {}, "Add an Ingredient"), add));

  const table = el("table", { class: "data-table" });
  table.innerHTML = `<thead><tr>
    <th>Name</th><th>Unit</th><th>Stock</th><th>Adjust</th><th>Cost</th><th>Low</th><th></th>
  </tr></thead>`;
  const tbody = el("tbody");
  for (const g of data) {
    const low = Number(g.stock) <= Number(g.low_stock);
    const tr = el("tr", { class: low ? "low-stock" : "" });
    tr.append(
      td(el("input", { class: "cell-in", value: g.name, "data-f": "name" })),
      td(el("input", { class: "cell-in cell-sm", value: g.unit || "", "data-f": "unit" })),
      td(el("input", { class: "cell-in cell-num", type: "number", step: "0.01", value: g.stock, "data-f": "stock" }),
         low ? el("span", { class: "low-badge" }, "LOW") : null),
      td(el("div", { class: "adj" },
        el("input", { class: "cell-num adj-in", type: "number", step: "0.01", placeholder: "qty", "data-f": "adj" }),
        el("button", { class: "btn btn-sm", onclick: (e) => adjust(g.id, e, -1) }, "−"),
        el("button", { class: "btn btn-sm", onclick: (e) => adjust(g.id, e, 1) }, "+"),
      )),
      td(el("input", { class: "cell-in cell-num", type: "number", step: "0.01", value: g.cost, "data-f": "cost" })),
      td(el("input", { class: "cell-in cell-num", type: "number", step: "0.01", value: g.low_stock, "data-f": "low_stock" })),
      td(
        el("button", { class: "btn btn-sm btn-primary", onclick: (e) => saveIngredient(g.id, e) }, "Save"),
        el("button", { class: "btn btn-sm btn-danger", onclick: () => delIngredient(g.id, g.name) }, "Delete"),
      ),
    );
    tbody.append(tr);
  }
  table.append(tbody);
  body.append(el("div", { class: "card" }, el("h4", {}, "All Ingredients"),
    el("p", { class: "muted" }, "Tip: use the Adjust (− / +) buttons to quickly change stock."), table));
}

async function addIngredient() {
  const name = $("#ni-name").value.trim();
  if (!name) { toast("Name is required", "warn"); return; }
  const { error } = await supabase.from("ingredients").insert({
    name,
    unit: $("#ni-unit").value.trim() || "pcs",
    stock: Number($("#ni-stock").value || 0),
    cost: Number($("#ni-cost").value || 0),
    low_stock: Number($("#ni-low").value || 0),
  });
  if (error) return toast(error.message, "error");
  toast("Added", "success");
  await renderInventory($("#view"));
}

async function adjust(id, e, sign) {
  const tr = e.target.closest("tr");
  const adjIn = tr.querySelector('[data-f="adj"]');
  const amt = Number(adjIn.value || 0);
  if (!amt) { toast("Enter a quantity first", "warn"); return; }
  const stockIn = tr.querySelector('[data-f="stock"]');
  const newStock = Math.max(0, Number(stockIn.value || 0) + sign * amt);
  const { error } = await supabase.from("ingredients").update({ stock: newStock }).eq("id", id);
  if (error) return toast(error.message, "error");
  stockIn.value = newStock; adjIn.value = "";
  toast(sign > 0 ? `+${amt} added` : `-${amt} removed`, "success");
  await renderInventory($("#view"));
}

async function saveIngredient(id, e) {
  const tr = e.target.closest("tr");
  const get = (f) => tr.querySelector(`[data-f="${f}"]`);
  const { error } = await supabase.from("ingredients").update({
    name: get("name").value.trim(),
    unit: get("unit").value.trim(),
    stock: Number(get("stock").value || 0),
    cost: Number(get("cost").value || 0),
    low_stock: Number(get("low_stock").value || 0),
  }).eq("id", id);
  if (error) return toast(error.message, "error");
  toast("Saved!", "success");
}

async function delIngredient(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  if (error) return toast(error.message, "error");
  toast("Deleted", "success");
  await renderInventory($("#view"));
}

function td(...children) { return el("td", {}, ...children); }
