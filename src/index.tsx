import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './public' }))

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
  '/static/js/screens/CashFlowScreen.js',
  '/static/js/screens/PerformanceScreen.js',
  '/static/js/screens/ReportsScreen.js',
  '/static/js/screens/CopilotScreen.js',
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
  <title>Coplanistra — Budget &amp; Plan</title>
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
</head>
<body>
  <div id="root">
    <div class="coplan-splash">
      <div>Loading Coplanistra…</div>
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
