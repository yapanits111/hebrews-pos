import { SHOP } from "./config.js";
import { pesoR, fmtDateTime, receiptNo, el, $ } from "./util.js";

// Buong HTML ng resibo (galing taas pababa)
export function buildReceiptHTML(sale, items) {
  const lines = items.map(it => `
    <div class="r-item">
      <div class="r-item-name">${escapeHtml(it.name)}</div>
      <div class="r-item-row">
        <span>${it.qty} x ${pesoR(it.unit_price)}</span>
        <span>${pesoR(it.line_total)}</span>
      </div>
    </div>`).join("");

  const discountRow = Number(sale.discount_amount) > 0 ? `
    <div class="r-row"><span>Diskwento${sale.discount_label ? " (" + escapeHtml(sale.discount_label) + ")" : ""}</span>
      <span>-${pesoR(sale.discount_amount)}</span></div>` : "";

  const cashRows = sale.payment_method === "Cash" ? `
    <div class="r-row"><span>Cash</span><span>${pesoR(sale.cash_received)}</span></div>
    <div class="r-row"><span>Sukli</span><span>${pesoR(sale.change_amount)}</span></div>` : "";

  return `
  <div class="r-head">
    <div class="r-shop">${escapeHtml(SHOP.name)}</div>
    <div class="r-tag">${escapeHtml(SHOP.tagline)}</div>
    <div class="r-verse">"${escapeHtml(SHOP.verse)}"</div>
    <div class="r-meta">${escapeHtml(SHOP.address)}</div>
    <div class="r-meta">${escapeHtml(SHOP.contact)}</div>
  </div>

  <div class="r-divider"></div>

  <div class="r-row"><span>Resibo</span><span>${receiptNo(sale.id)}</span></div>
  <div class="r-row"><span>Petsa</span><span>${fmtDateTime(sale.created_at)}</span></div>
  <div class="r-row"><span>Cashier</span><span>${escapeHtml(sale.cashier || "-")}</span></div>

  <div class="r-divider"></div>

  ${lines}

  <div class="r-divider"></div>

  <div class="r-row"><span>Subtotal</span><span>${pesoR(sale.subtotal)}</span></div>
  ${discountRow}
  <div class="r-row r-total"><span>TOTAL</span><span>${pesoR(sale.total)}</span></div>
  <div class="r-row"><span>Bayad</span><span>${escapeHtml(sale.payment_method)}</span></div>
  ${cashRows}

  <div class="r-divider"></div>

  <div class="r-foot">${escapeHtml(SHOP.footer)}</div>
  <div class="r-foot-small">${escapeHtml(SHOP.email)}</div>
  <div class="r-cut">. . . . . . . . . . . . . . . . . .</div>
  `;
}

// Ipakita ang preview modal na may "I-print" button
export function showReceipt(sale, items) {
  const html = buildReceiptHTML(sale, items);
  $("#receipt-print").innerHTML = html;

  const overlay = el("div", { class: "modal-overlay", id: "receipt-modal" });
  const card = el("div", { class: "modal receipt-modal" });
  card.innerHTML = `
    <div class="receipt-paper">${html}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="rc-close">Close</button>
      <button class="btn btn-primary" id="rc-print">🖨️ Print</button>
    </div>`;
  overlay.append(card);
  document.body.append(overlay);

  card.querySelector("#rc-close").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  card.querySelector("#rc-print").onclick = () => window.print();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
