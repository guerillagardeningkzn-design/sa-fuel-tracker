/* ══════════════════════════════════════════
   SA Fuel Price Tracker · MD Works
   Project 02 — Live Data Dashboard
══════════════════════════════════════════

   DATA SOURCE
   ───────────
   Live from the SA Fuel Price API v2 (Project 05)
   https://sa-fuel-api.guerillagardeningkzn.workers.dev

   To update prices monthly, use the admin page:
   /admin.html — or call the API directly with your API key
══════════════════════════════════════════ */

const DATA_URL = 'https://sa-fuel-api.guerillagardeningkzn.workers.dev/v1/';
const IS_CSV   = false;

// ── Column keys ───────────────────────── //
const FUELS = [
  { key: 'p95i',  label: '95 ULP Inland'    },
  { key: 'p95c',  label: '95 ULP Coastal'   },
  { key: 'p93i',  label: '93 ULP Inland'    },
  { key: 'd005i', label: 'Diesel 0.05% Inland'  },
  { key: 'd005c', label: 'Diesel 0.05% Coastal' },
];

// ── State ──────────────────────────────── //
let priceData    = [];
let chart        = null;
let activeSeries = 'p95i';
let chartOffset  = 0;       // 0 = most recent window, 1 = one window back, etc.
const WINDOW     = 12;      // months visible in chart at once

// ── Normalise API response → flat shape ── //
function normalizeApiRow(row) {
  return {
    month: row.monthLabel,
    p95i:  row.prices.petrol.p95Inland,
    p95c:  row.prices.petrol.p95Coastal,
    p93i:  row.prices.petrol.p93Inland,
    d005i: row.prices.diesel.d500Inland,   // 500ppm — standard grade
    d005c: row.prices.diesel.d500Coastal,
  };
}

// ── Boot ───────────────────────────────── //
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initScrollReveal();
  loadData();
  bindChartToggle();
  bindChartNav();
});

// ── Fetch data ─────────────────────────── //
async function loadData() {
  try {
    const res  = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw  = IS_CSV ? parseCSV(await res.text()) : await res.json();
    const rows = raw.data || raw;
    priceData  = Array.isArray(rows) ? rows.map(normalizeApiRow).reverse() : rows;
    showDashboard(priceData);
    updateDataSourceChip('SA Fuel API');
  } catch (err) {
    showError(`Failed to load price data: ${err.message}`);
    console.error(err);
  }
}

// ── Parse Google Sheets CSV ──────────── //
// Expected columns (row 1 = headers):
// month, p95i, p95c, p93i, d005i, d005c
function parseCSV(text) {
  const rows = text.trim().split('\n').map(r => r.split(',').map(c => c.trim()));
  const headers = rows[0].map(h => h.toLowerCase());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = isNaN(row[i]) ? row[i] : parseFloat(row[i]);
    });
    return obj;
  });
}

// ── Render dashboard ──────────────────── //
function showDashboard(data) {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  const current  = data[data.length - 1];
  const previous = data[data.length - 2];

  // Header meta
  document.getElementById('current-month-label').textContent = current.month;
  document.getElementById('last-updated').textContent =
    `Updated: ${current.month}`;
  document.getElementById('next-review').textContent =
    `Next review: 1st Wednesday of next month`;

  // Price cards
  FUELS.forEach(fuel => {
    const price  = current[fuel.key];
    const prev   = previous ? previous[fuel.key] : null;
    const diff   = prev != null ? price - prev : null;

    document.getElementById(`price-${fuel.key}`).textContent =
      `R ${price.toFixed(2)}`;

    const changeEl = document.getElementById(`change-${fuel.key}`);
    if (diff !== null) {
      const abs = Math.abs(diff).toFixed(2);
      if (diff > 0.005) {
        changeEl.innerHTML = `▲ R${abs} from ${previous.month}`;
        changeEl.className = 'fuel-change change-up';
      } else if (diff < -0.005) {
        changeEl.innerHTML = `▼ R${abs} from ${previous.month}`;
        changeEl.className = 'fuel-change change-down';
      } else {
        changeEl.innerHTML = `— Unchanged`;
        changeEl.className = 'fuel-change change-flat';
      }
    }
  });

  buildChart(data, activeSeries);
  buildTable(data);
  initScrollReveal(); // re-run for newly visible elements
}

// ── Chart ─────────────────────────────── //
function buildChart(data, seriesKey) {
  // Calculate window based on offset
  const end        = data.length - (chartOffset * WINDOW);
  const start      = Math.max(0, end - WINDOW);
  const windowData = data.slice(start, end);
  const labels     = windowData.map(d => d.month);
  const values     = windowData.map(d => d[seriesKey]);
  const label      = FUELS.find(f => f.key === seriesKey)?.label ?? seriesKey;

  // Update nav controls
  const rangeEl = document.getElementById('chart-range');
  if (rangeEl && windowData.length) {
    rangeEl.textContent = `${windowData[0].month} — ${windowData[windowData.length - 1].month}`;
  }
  const btnPrev = document.getElementById('chart-prev');
  const btnNext = document.getElementById('chart-next');
  if (btnPrev) btnPrev.disabled = start <= 0;
  if (btnNext) btnNext.disabled = chartOffset <= 0;

  const ctx = document.getElementById('priceChart').getContext('2d');
  if (chart) chart.destroy();

  const grad = ctx.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, 'rgba(201,148,60,.3)');
  grad.addColorStop(1, 'rgba(201,148,60,0)');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: '#c9943c',
        borderWidth: 2,
        pointBackgroundColor: '#c9943c',
        pointRadius: 4,
        pointHoverRadius: 7,
        fill: true,
        backgroundColor: grad,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#211c14',
          borderColor: '#3d3526',
          borderWidth: 1,
          titleColor: '#e8c87a',
          bodyColor: '#f0e6ce',
          titleFont: { family: 'Cinzel, serif', size: 12 },
          bodyFont:  { family: 'Syne Mono, monospace', size: 11 },
          callbacks: {
            label: ctx => ` R ${ctx.parsed.y.toFixed(2)} / litre`,
          }
        },
      },
      scales: {
        x: {
          grid:   { color: 'rgba(61,53,38,.5)', drawBorder: false },
          ticks:  { color: '#7a6d58', font: { family: 'Syne Mono, monospace', size: 10 } },
        },
        y: {
          grid:   { color: 'rgba(61,53,38,.5)', drawBorder: false },
          ticks:  {
            color: '#7a6d58',
            font: { family: 'Syne Mono, monospace', size: 10 },
            callback: v => `R${v.toFixed(0)}`,
          },
        },
      },
    }
  });
}

// ── Table ─────────────────────────────── //
function buildTable(data) {
  const tbody   = document.getElementById('table-body');
  const current = data[data.length - 1].month;

  tbody.innerHTML = [...data].reverse().map(row => `
    <tr class="${row.month === current ? 'current-row' : ''}">
      <td>${row.month}</td>
      <td>R ${row.p95i.toFixed(2)}</td>
      <td>R ${row.p95c.toFixed(2)}</td>
      <td>R ${row.p93i.toFixed(2)}</td>
      <td>R ${row.d005i.toFixed(2)}</td>
      <td>R ${row.d005c.toFixed(2)}</td>
    </tr>
  `).join('');
}

// ── Chart toggle buttons ───────────────── //
function bindChartToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSeries = btn.dataset.series;
      if (priceData.length) buildChart(priceData, activeSeries);
    });
  });
}

// ── Chart navigation ───────────────────── //
function bindChartNav() {
  document.getElementById('chart-prev')?.addEventListener('click', () => {
    const maxOffset = Math.ceil(priceData.length / WINDOW) - 1;
    if (chartOffset < maxOffset) { chartOffset++; buildChart(priceData, activeSeries); }
  });
  document.getElementById('chart-next')?.addEventListener('click', () => {
    if (chartOffset > 0) { chartOffset--; buildChart(priceData, activeSeries); }
  });
}

// ── Helpers ────────────────────────────── //
function showError(msg) {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('error-msg').textContent = msg;
}

function updateDataSourceChip(label) {
  document.getElementById('data-source-chip').textContent = `Data: ${label}`;
}

// ── Scroll reveal ──────────────────────── //
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
}

// ── Gold cursor ────────────────────────── //
function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

  (function loop() {
    rx += (mx - rx) * .12;
    ry += (my - ry) * .12;
    dot.style.left  = mx + 'px'; dot.style.top  = my + 'px';
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(loop);
  })();
}
