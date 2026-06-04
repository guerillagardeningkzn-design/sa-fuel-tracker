# ✦ SA Fuel Price Tracker

**MD Works · Project 02 — Live Data Dashboard**  
Vanilla JS · Chart.js · Google Sheets (optional) · Cloudflare Pages

Tracks monthly South African fuel retail prices published by the Department of
Mineral Resources & Energy (DMRE). Shows current prices, month-on-month changes,
a 12-month trend chart, and full price history.

---

## Local Development

No build step needed. Open with VS Code Live Server, or simply:

```
open index.html
```

Or if you have Node installed:

```bash
npx serve .
```

---

## Project Structure

```
sa-fuel-tracker/
├── index.html          # Dashboard markup
├── style.css           # MD Works brand styles
├── main.js             # Data fetching, chart, table, cursor
├── data/
│   └── prices.json     # Seed data — update monthly
└── README.md
```

---

## Updating Prices Monthly

DMRE publishes new prices on the **first Wednesday of each month**.

### Option A — Edit the JSON directly (simplest)

Open `data/prices.json` and add a new entry at the bottom:

```json
{ "month": "Apr 2025", "p95i": 21.90, "p95c": 21.34, "p93i": 21.20, "d005i": 19.10, "d005c": 18.62 }
```

| Key     | Fuel type                        |
|---------|----------------------------------|
| `p95i`  | 95 ULP Inland (R/litre)          |
| `p95c`  | 95 ULP Coastal (R/litre)         |
| `p93i`  | 93 ULP Inland (R/litre)          |
| `d005i` | Diesel 0.05% sulphur Inland      |
| `d005c` | Diesel 0.05% sulphur Coastal     |

Commit and push — Cloudflare deploys in ~30 seconds.

---

### Option B — Google Sheets as live backend (no redeploy needed)

This is the recommended approach for a tool used by others.
You update the Sheet; the dashboard fetches the latest data automatically.

**Step 1 — Create the Sheet**

| month    | p95i  | p95c  | p93i  | d005i | d005c |
|----------|-------|-------|-------|-------|-------|
| Jan 2024 | 21.63 | 21.07 | 20.93 | 19.59 | 19.11 |
| Feb 2024 | ...   | ...   | ...   | ...   | ...   |

Row 1 must be the exact headers above. Copy the data from `prices.json` to get started.

**Step 2 — Publish the Sheet**

File → Share → Publish to web → Select the sheet → CSV → Publish  
Copy the URL (looks like `https://docs.google.com/spreadsheets/d/.../pub?...&output=csv`)

**Step 3 — Update `main.js`**

```js
// Line 8-9 in main.js — replace these two lines:
const DATA_URL = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?gid=0&single=true&output=csv';
const IS_CSV   = true;
```

That's it. The dashboard now fetches live from the Sheet on every page load.

---

## Deploying to Cloudflare Pages

1. Push this repo to GitHub
2. Cloudflare Pages → Create project → Connect repo
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/` (root)
4. Save and deploy

No build step. Cloudflare serves the static files directly from the root.

### Every update after that

```bash
git add data/prices.json
git commit -m "fuel prices: Mar 2025"
git push
```

---

## Where DMRE Prices Are Published

- **Official:** [sapia.org.za](https://www.sapia.org.za) — SA Petroleum Industry Association
- **Readable:** [mylpg.co.za](https://www.mylpg.co.za/stations/petrol-price/) posts the gazette summary
- Published the **first Wednesday of every month**, effective midnight

---

## What This Project Demonstrates

- `fetch()` with async/await and proper error handling
- Parsing both JSON and CSV from remote sources
- Chart.js integration — line chart with custom styling and tooltips
- DOM manipulation without a framework
- Google Sheets as a zero-cost live data backend
- Clean separation of data, markup, and logic

---

✦ MD Works · Morney Deetlefs · [Portfolio →](https://your-domain.com)
