import { supabase } from "./db.js";
import { peso, el, $ } from "./util.js";

export async function renderAnalytics(root) {
  root.innerHTML = "";
  const today = new Date();
  const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 6);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const controls = el("div", { class: "card sales-controls" },
    el("label", {}, "From"), el("input", { type: "date", id: "a-from", value: fmt(weekAgo) }),
    el("label", {}, "To"), el("input", { type: "date", id: "a-to", value: fmt(today) }),
    el("button", { class: "btn btn-primary", onclick: load }, "View"),
  );
  const body = el("div", { id: "a-body" });
  root.append(controls, body);
  await load();
}

async function load() {
  const from = $("#a-from").value, to = $("#a-to").value;
  const body = $("#a-body");
  body.innerHTML = `<p class="muted">Loading...</p>`;
  if (!navigator.onLine) { body.innerHTML = `<p class="muted">Analytics needs an internet connection.</p>`; return; }

  const start = new Date(from + "T00:00:00").toISOString();
  const end = new Date(to + "T23:59:59.999").toISOString();

  const { data: sales, error } = await supabase.from("sales")
    .select("id,total,discount_amount,payment_method,created_at")
    .gte("created_at", start).lte("created_at", end);
  if (error) { body.innerHTML = `<p class="error">${error.message}</p>`; return; }

  body.innerHTML = "";
  if (!sales.length) { body.append(el("p", { class: "muted" }, "No sales in this range.")); return; }

  // KPIs
  const revenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const orders = sales.length;
  const disc = sales.reduce((s, x) => s + Number(x.discount_amount), 0);
  body.append(kpiGrid([
    ["Revenue", peso(revenue)],
    ["Orders", String(orders)],
    ["Avg Order", peso(revenue / orders)],
    ["Discounts", peso(disc)],
  ]));

  // Daily revenue
  const byDay = {};
  for (const s of sales) { const d = s.created_at.slice(0, 10); byDay[d] = (byDay[d] || 0) + Number(s.total); }
  const days = eachDay(from, to);
  body.append(chartCard("Daily Revenue",
    barChart(days.map((d) => ({ label: d.slice(5), value: byDay[d] || 0, display: peso(byDay[d] || 0) })))));

  // Payment methods
  const cash = sales.filter((s) => s.payment_method === "Cash").reduce((a, b) => a + Number(b.total), 0);
  const gcash = sales.filter((s) => s.payment_method === "GCash").reduce((a, b) => a + Number(b.total), 0);
  body.append(chartCard("Payment Methods", barChartH([
    { label: "Cash", value: cash, display: peso(cash) },
    { label: "GCash", value: gcash, display: peso(gcash) },
  ])));

  // Peak hours
  const byHour = new Array(24).fill(0);
  for (const s of sales) byHour[new Date(s.created_at).getHours()] += Number(s.total);
  body.append(chartCard("Sales by Hour",
    barChart(byHour.map((v, h) => ({ label: String(h), value: v, display: peso(v) })))));

  // Top products (needs sale_items joined with sales date range)
  const { data: items } = await supabase.from("sale_items")
    .select("name,qty,line_total,sales!inner(created_at)")
    .gte("sales.created_at", start).lte("sales.created_at", end);
  if (items && items.length) {
    const agg = {};
    for (const it of items) {
      (agg[it.name] ??= { qty: 0, rev: 0 });
      agg[it.name].qty += it.qty; agg[it.name].rev += Number(it.line_total);
    }
    const top = Object.entries(agg).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
    body.append(chartCard("Top Products (by revenue)",
      barChartH(top.map(([name, v]) => ({ label: name, value: v.rev, display: `${peso(v.rev)} · ${v.qty} sold` })))));
  }
}

// ---------- tiny chart helpers (no external library) ----------
function kpiGrid(pairs) {
  const grid = el("div", { class: "sales-summary" });
  for (const [label, val] of pairs)
    grid.append(el("div", { class: "kpi" },
      el("div", { class: "kpi-label" }, label),
      el("div", { class: "kpi-val" }, val)));
  return grid;
}

function chartCard(title, node) {
  return el("div", { class: "card" }, el("h4", {}, title), node);
}

function barChart(data) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const showVals = data.length <= 12;
  const wrap = el("div", { class: "bars" });
  for (const d of data) {
    const h = Math.round((d.value / max) * 100);
    wrap.append(el("div", { class: "bar-col" },
      showVals ? el("div", { class: "bar-val" }, d.value ? d.display : "") : null,
      el("div", { class: "bar-track" }, el("div", { class: "bar-fill", style: `height:${h}%`, title: d.display })),
      el("div", { class: "bar-label" }, d.label),
    ));
  }
  return wrap;
}

function barChartH(data) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const wrap = el("div", { class: "hbars" });
  for (const d of data) {
    const w = Math.round((d.value / max) * 100);
    wrap.append(el("div", { class: "hbar-row" },
      el("div", { class: "hbar-label", title: d.label }, d.label),
      el("div", { class: "hbar-track" }, el("div", { class: "hbar-fill", style: `width:${w}%` })),
      el("div", { class: "hbar-val" }, d.display),
    ));
  }
  return wrap;
}

function eachDay(from, to) {
  const out = [];
  const d = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  let guard = 0;
  while (d <= end && guard++ < 92) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return out;
}
