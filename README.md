# ☕ HEBREWS 11:1 — POS, Receipt & Inventory System

[![E2E Tests](https://github.com/yapanits111/hebrews-pos/actions/workflows/e2e.yml/badge.svg)](https://github.com/yapanits111/hebrews-pos/actions/workflows/e2e.yml)

**🔗 Live demo:** https://hebrews-pos-libmanan.netlify.app
&nbsp;·&nbsp; **🧪 CI / tests:** [GitHub Actions](https://github.com/yapanits111/hebrews-pos/actions/workflows/e2e.yml)

A full-stack, **offline-first** coffee-shop point-of-sale with **receipt generator +
inventory + sales analytics**, built with vanilla JS + **Supabase (PostgreSQL)**, deployed
on **Netlify**, and covered by a **Playwright E2E suite running in GitHub Actions CI**.

- 🛒 **Order (POS):** tap a product, review, check out, print a 58mm receipt
- 📦 **Inventory & promos:** products, ingredients, prices, low-stock alerts, reusable discounts
- 📊 **Analytics & sales:** revenue, daily trends, peak hours, top products; daily reports
- 📴 **Offline-first PWA:** make sales offline → auto-syncs when back online
- 👥 **Roles:** `superadmin` / `admin` / `server`, with superadmin-only account creation

> Replace `yapanits111/hebrews-pos` in the badge/links above with your actual repo path if
> it differs. The app UI is in English; the printed receipt stays in Taglish (configurable).

> The app UI is in English. The printed receipt stays in Taglish (Filipino) since it's
> customer-facing — you can change this any time in `js/config.js` and `js/receipt.js`.

---

## 🌐 Live site

Already deployed on Netlify:

**https://hebrews-pos-libmanan.netlify.app**

Log in with a user created in Supabase (see step 3 below). The same database backs both
the live site and the local copy.

---

## Local development

The codebase lives in this folder. Open it in VSCode (`File → Open Folder`).

**Easiest way to run locally (in VSCode):**
1. Install the VSCode extension **"Live Server"** (by Ritwick Dey)
2. Right-click `index.html` → **"Open with Live Server"**
3. It opens in your browser → log in

> ⚠️ Don't just double-click `index.html` (file://). Use Live Server or a local server,
> because the app uses JavaScript modules.

**Alternative (if you have Python):** in this folder, run:
```bash
python -m http.server 5500
```
Then open `http://localhost:5500` in your browser.

---

## Setup reference (already done, kept for re-deploys)

### 1) Supabase project
1. Go to **https://supabase.com** → create a project (region: Singapore is closest)
2. Save the database password somewhere safe

### 2) Database schema
1. In Supabase: **SQL Editor** → **New query**
2. Open `sql/schema.sql`, copy everything, paste it, and click **Run**
3. *(Optional)* repeat with `sql/seed.sql` for sample products/ingredients

### 3) Users (login)
1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**
2. Enter an email + password, and check **Auto Confirm User**
3. To make the owner an **admin**: **Table Editor** → `profiles` table → find the user →
   change `role` from `server` to `admin` → Save.
   - Users left as `server` only see the **Order** tab.

### 4) API keys
The URL and anon public key are already set in `js/config.js`. If you ever rotate them:
1. Supabase → **Project Settings** → **API**
2. Copy **Project URL** and the **anon public** key into `js/config.js`

---

## Re-deploying to Netlify

After changing any files, redeploy with the Netlify CLI:
```bash
netlify deploy --prod --dir . --site afb78460-6912-4609-9ce6-4227bcf6237f
```
(Run `netlify login` once, or set the `NETLIFY_AUTH_TOKEN` environment variable.)

You can also drag-and-drop this folder onto https://app.netlify.com for a manual deploy.

---

## 🖨️ About the receipt printer (58mm)

- The receipt is designed for a **58mm thermal printer**.
- Install the printer's driver in Windows first.
- In the app, click **🖨️ Print** → in the print dialog, choose the thermal printer,
  set paper size to **58mm** (or "Receipt"), and set margins to **0 / None**.
- You can also print to a normal printer for testing.

## (Optional) Docker — for self-hosting only

> You don't need this if you use Live Server or Netlify. It's only for hosting on your
> own VPS or server (containerized deployment).

Make sure the Supabase keys are set in `js/config.js`, then in this folder:
```bash
docker compose up -d --build
```
Open `http://localhost:8080`. To stop: `docker compose down`.

> Note: this only serves the static files (nginx). The database still lives in Supabase
> cloud — there's no need to Docker the database for a small shop.

---

## 💡 Tips

- **Coffee stock:** if it's made-to-order (like brewed coffee), leave **stock blank** — it
  won't be tracked. If it's a countable item (pastry/bottled), set a number — it will
  automatically **decrease** with each sale.
- **Discount:** the admin or server can enter it on the Order screen per transaction.
- **Backup:** Supabase → Table Editor → you can export CSV any time.

## 📁 Project structure

```
hebrews-pos/
├── index.html              ← app shell (open this)
├── sw.js                   ← service worker (offline app shell)
├── manifest.webmanifest    ← PWA manifest
├── favicon.svg / icon.svg
├── css/styles.css
├── js/
│   ├── config.js           ← Supabase keys + shop info
│   ├── db.js               ← Supabase client (local lib, offline-safe)
│   ├── auth.js             ← login / roles
│   ├── util.js             ← helpers + role checks
│   ├── menu.js             ← public read-only menu (no login)
│   ├── pos.js              ← Order screen + checkout
│   ├── inventory.js        ← products + ingredients
│   ├── sales.js            ← sales report
│   ├── analytics.js        ← analytics dashboard
│   ├── staff.js            ← staff & role management
│   ├── offline.js          ← IndexedDB queue + auto-sync
│   ├── receipt.js          ← receipt design (58mm)
│   ├── app.js              ← main / navigation
│   └── vendor/supabase.js  ← vendored Supabase JS (for offline)
├── e2e/                    ← Playwright end-to-end tests
│   ├── helpers.ts          ← Supabase mocking + login helper
│   ├── *.spec.ts           ← auth, order, discount, analytics, offline
│   └── smoke/live.spec.ts  ← live test vs the deployed site
├── supabase/functions/
│   └── create-user/        ← Edge Function (superadmin-only account creation)
├── sql/
│   ├── schema.sql          ← run in Supabase (creates the tables)
│   ├── seed.sql            ← sample data (optional)
│   ├── migration_roles.sql ← superadmin role + secure role RPC
│   └── migration_public_menu.sql
├── .github/workflows/e2e.yml  ← CI (runs the test suite)
└── playwright.config.ts
```

## 🧪 Testing (Playwright E2E)

End-to-end tests are written in **TypeScript** with **Playwright**, using a **hybrid**
strategy:

- **Mocked suite** (`npm run test:e2e`) — Supabase auth + REST are stubbed with Playwright
  route interception. The tests are hermetic: fast, deterministic, need no credentials, and
  never write to the real database — ideal for CI.
- **Live smoke** (`npm run test:live`) — runs against the real deployed site
  (`https://hebrews-pos-libmanan.netlify.app`) to confirm the public surface is up. No
  credentials, no data writes.

### Covered flows
| Spec | What it verifies |
|------|------------------|
| `auth.spec.ts` | Public menu loads, staff login succeeds, bad credentials show an error |
| `order.spec.ts` | Completing a cash sale shows a receipt; change is computed correctly |
| `discount.spec.ts` | Applying a discount updates the total; discount caps at the subtotal |
| `analytics.spec.ts` | Dashboard renders KPIs and charts with the expected revenue |
| `offline.spec.ts` | An order made **offline** is queued in IndexedDB, then **auto-syncs** when back online |
| `smoke/live.spec.ts` | The deployed app serves the public menu and reachable login |

### Running locally
```bash
npm install
npx playwright install --with-deps chromium
npm run test:e2e      # mocked, hermetic suite
npm run test:live     # live smoke vs deployed site
npm run test:report   # open the HTML report
```

### Continuous integration
`.github/workflows/e2e.yml` runs the **mocked suite on every push and pull request**
(the green gate), and the **live smoke test nightly / on demand** so PR runs stay
reliable. The HTML report is uploaded as a build artifact.

> Design note: the suite is mocked for CI so it never depends on external network or a
> live database, while a separate live smoke test preserves real integration confidence —
> a deliberate trade-off between deterministic CI and end-to-end realism.

## 🔒 About security

Supabase Row Level Security is enabled: **only logged-in users** can access the data.
For an internal shop with 1–3 trusted staff, this is enough. If your team grows and you
want stricter separation (e.g. a server shouldn't be able to delete products from the
database), the RLS policies can be tightened further — just ask.
