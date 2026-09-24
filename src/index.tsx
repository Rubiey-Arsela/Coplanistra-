import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/static/*', serveStatic({ root: './public' }))

// ----------------------------------------------------------------
// Central app-state API (Cloudflare D1) — replaces browser-only
// localStorage as the source of truth so imported Xero data and
// every other bit of app state is the SAME for every user, on every
// device/browser, instead of being trapped in whichever single
// browser happened to click "Import" (root cause of "I imported it
// but it still says not imported" when checked from a different
// browser/device). The frontend (store.js) now reads this on load
// and writes to it on every state change, while ALSO still writing
// to localStorage as an instant-response cache/offline fallback.
// One shared row (id=1) — this app has no multi-tenant/per-user
// state; every signed-in user already saw the same financial data.
app.get('/api/state', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT data FROM app_state WHERE id = 1').first<{ data: string }>()
    if (!row) return c.json({ data: null })
    return c.json({ data: JSON.parse(row.data) })
  } catch (e: any) {
    return c.json({ error: e?.message || 'Failed to load state' }, 500)
  }
})

app.put('/api/state', async (c) => {
  try {
    const body = await c.req.json()
    const json = JSON.stringify(body)
    await c.env.DB.prepare(
      `INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    ).bind(json).run()
    return c.json({ ok: true })
  } catch (e: any) {
    return c.json({ error: e?.message || 'Failed to save state' }, 500)
  }
})

const SCRIPTS = [
  '/static/js/store.js',
  '/static/js/router.js',
  '/static/js/icons.js',
  '/static/js/primitives.js',
  '/static/js/roles.js',
  '/static/js/shell.js',
  '/static/js/screens/LoginScreen.js',
  '/static/js/screens/DashboardScreen.js',
  '/static/js/screens/BudgetsScreen.js',
  '/static/js/screens/BudgetDetailScreen.js',
  '/static/js/screens/CreateBudgetScreen.js',
  '/static/js/screens/CloseoutScreen.js',
  '/static/js/screens/ExpensesScreen.js',
  '/static/js/screens/ApprovalsScreen.js',
  '/static/js/screens/QuarterlyScreen.js',
  '/static/js/screens/MonthlyScreen.js',
  '/static/js/screens/CapexScreen.js',
  '/static/js/screens/ReconciliationScreen.js',
  '/static/js/screens/CashFlowScreen.js',
  '/static/js/screens/PerformanceScreen.js',
  '/static/js/screens/ReportsScreen.js',
  '/static/js/screens/CopilotScreen.js',
  '/static/js/screens/DataImportsScreen.js',
  '/static/js/screens/AdminScreen.js',
  '/static/js/screens/SettingsScreen.js',
  '/static/js/app.js',
]

function shellHtml() {
  const scriptTags = SCRIPTS.map(
    (src) => `    <script type="text/babel" data-presets="react" src="${src}"></script>`
  ).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ApexFin — Budget &amp; Plan</title>
  <link rel="icon" type="image/png" href="/static/img/logo-icon-new.png" />
  <link rel="apple-touch-icon" href="/static/img/logo-icon-new.png" />
  <link href="/static/css/tokens.css" rel="stylesheet" />
  <link href="/static/css/app.css" rel="stylesheet" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
  <script>
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    }
  </script>
</head>
<body>
  <div id="root">
    <div class="coplan-splash">
      <div>Loading ApexFin…</div>
    </div>
  </div>
${scriptTags}
</body>
</html>`
}

// Serve the SPA shell for every non-static route (hash routing means the
// server only ever sees GET / — but we also cover a few common paths in
// case of direct navigation / refresh on a sub-path).
app.get('*', (c) => c.html(shellHtml()))

export default app
