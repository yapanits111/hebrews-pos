// ============================================================
//  Offline engine — local queue (IndexedDB) + auto-sync
//  Single-device design: sales made offline are queued locally
//  and pushed to Supabase when the connection returns.
// ============================================================
import { supabase } from "./db.js";

const DB_NAME = "hebrews-pos";
const DB_VERSION = 1;
let _dbp;

function db() {
  if (_dbp) return _dbp;
  _dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("pending_sales"))
        d.createObjectStore("pending_sales", { keyPath: "localId" });
      if (!d.objectStoreNames.contains("menu_cache"))
        d.createObjectStore("menu_cache", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbp;
}

export function isOnline() { return navigator.onLine; }

// ---------- Pending sales queue ----------
export async function queueSale(record) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction("pending_sales", "readwrite");
    t.objectStore("pending_sales").put(record);
    t.oncomplete = () => res(record.localId);
    t.onerror = () => rej(t.error);
  });
}

export async function getPending() {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction("pending_sales", "readonly");
    const r = t.objectStore("pending_sales").getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

export async function getPendingCount() {
  try { return (await getPending()).length; } catch { return 0; }
}

async function removePending(localId) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction("pending_sales", "readwrite");
    t.objectStore("pending_sales").delete(localId);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

// ---------- Menu cache (so POS works offline) ----------
export async function cacheMenu(products) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction("menu_cache", "readwrite");
    const s = t.objectStore("menu_cache");
    s.clear();
    for (const p of products) s.put(p);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

export async function getCachedMenu() {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction("menu_cache", "readonly");
    const r = t.objectStore("menu_cache").getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

export async function updateCachedStock(productId, newStock) {
  const d = await db();
  return new Promise((res) => {
    const t = d.transaction("menu_cache", "readwrite");
    const s = t.objectStore("menu_cache");
    const g = s.get(productId);
    g.onsuccess = () => { const p = g.result; if (p) { p.stock = newStock; s.put(p); } };
    t.oncomplete = () => res();
    t.onerror = () => res();
  });
}

// ---------- Offline receipt numbering ----------
export function nextOfflineSeq() {
  const n = Number(localStorage.getItem("hb_offline_seq") || 0) + 1;
  localStorage.setItem("hb_offline_seq", String(n));
  return n;
}

// ---------- Sync queued sales to Supabase ----------
export async function syncPending() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  const pending = await getPending();
  let synced = 0, failed = 0;
  for (const rec of pending) {
    try {
      const { data: sale, error: e1 } = await supabase
        .from("sales").insert(rec.sale).select().single();
      if (e1) throw e1;

      if (rec.items?.length) {
        const items = rec.items.map((it) => ({ ...it, sale_id: sale.id }));
        const { error: e2 } = await supabase.from("sale_items").insert(items);
        if (e2) throw e2;
      }

      for (const sd of rec.stockDec || []) {
        const { data: prod } = await supabase
          .from("products").select("stock").eq("id", sd.product_id).single();
        if (prod && prod.stock !== null) {
          await supabase.from("products")
            .update({ stock: Math.max(0, prod.stock - sd.qty) }).eq("id", sd.product_id);
        }
      }

      await removePending(rec.localId);
      synced++;
    } catch (e) {
      failed++;
    }
  }
  return { synced, failed };
}
