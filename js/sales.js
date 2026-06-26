import { supabase } from "./db.js";
import { peso, el, $, toast, fmtDateTime, receiptNo } from "./util.js";
import { showReceipt } from "./receipt.js";

export async function renderSales(root) {
  root.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);

  const controls = el("div", { class: "card sales-controls" },
    el("label", {}, "From"),
    el("input", { type: "date", id: "s-from", value: today }),
    el("label", {}, "To"),
    el("input", { type: "date", id: "s-to", value: today }),
    el("button", { class: "btn btn-primary", onclick: load }, "View"),
  );
  const summary = el("div", { class: "sales-summary", id: "s-summary" });
  const list = el("div", { id: "s-list" });
  root.append(controls, summary, list);
  await load();
}

async function load() {
  const from = $("#s-from").value;
  const to = $("#s-to").value;
  const list = $("#s-list");
  list.innerHTML = `<p class="muted">Loading...</p>`;

  const start = new Date(from + "T00:00:00").toISOString();
  const end = new Date(to + "T23:59:59.999").toISOString();

  const { data, error } = await supabase
    .from("sales").select("*")
    .gte("created_at", start).lte("created_at", end)
    .order("created_at", { ascending: false });

  if (error) { list.innerHTML = `<p class="error">${error.message}</p>`; return; }

  // Summary
  const count = data.length;
  const gross = data.reduce((s, x) => s + Number(x.total), 0);
  const cash = data.filter((x) => x.payment_method === "Cash").reduce((s, x) => s + Number(x.total), 0);
  const gcash = data.filter((x) => x.payment_method === "GCash").reduce((s, x) => s + Number(x.total), 0);
  const disc = data.reduce((s, x) => s + Number(x.discount_amount), 0);

  $("#s-summary").innerHTML = `
    ${card("Total Sales", peso(gross))}
    ${card("Order Count", String(count))}
    ${card("Cash", peso(cash))}
    ${card("GCash", peso(gcash))}
    ${card("Discounts", peso(disc))}`;

  if (!count) { list.innerHTML = `<p class="muted">No sales for this date range.</p>`; return; }

  list.innerHTML = "";
  const table = el("table", { class: "data-table" });
  table.innerHTML = `<thead><tr>
    <th>Receipt</th><th>Date/Time</th><th>Cashier</th><th>Payment</th><th>Total</th><th></th>
  </tr></thead>`;
  const tbody = el("tbody");
  for (const s of data) {
    tbody.append(el("tr", {},
      el("td", {}, receiptNo(s.id)),
      el("td", {}, fmtDateTime(s.created_at)),
      el("td", {}, s.cashier || "-"),
      el("td", {}, s.payment_method),
      el("td", { class: "num" }, peso(s.total)),
      el("td", {}, el("button", { class: "btn btn-sm", onclick: () => reprint(s) }, "🖨️ Receipt")),
    ));
  }
  table.append(tbody);
  list.append(el("div", { class: "card" }, table));
}

async function reprint(sale) {
  const { data, error } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
  if (error) return toast(error.message, "error");
  showReceipt(sale, data);
}

function card(label, val) {
  return `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-val">${val}</div></div>`;
}
