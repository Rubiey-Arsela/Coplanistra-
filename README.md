# Coplanistra — Budget & Plan

A fully interactive corporate budgeting, planning, and financial-oversight web application built from a Genspark Design handoff. Client-side React SPA (no build-time bundler needed for the app code) served from a lightweight Hono backend on Cloudflare Pages.

## Project Overview
- **Name**: Coplanistra — Budget & Plan
- **Goal**: Give a Malaysian conglomerate (Acme Holdings, styled after Al Bukhary Group) a role-aware planning, expense-approval, and financial-analytics workspace — budgets, approvals, expenses, CAPEX, cash flow, KPI performance, reporting, an AI copilot, and team/access administration, all wired to a single shared client-side data store so every screen stays in sync.
- **Source of design**: Genspark Design "Build it" handoff (`designer2-bf393d34-4616-4a79-8547-26480b35ab20`), adapted from static JSX screens into a fully wired, stateful React SPA.

## Live production URL
- **Production**: https://coplanistra.pages.dev (latest deploy: https://117e2702.coplanistra.pages.dev)
- **GitHub**: https://github.com/Rubiey-Arsela/Coplanistra-
- (Sandbox preview URLs are temporary; the pages.dev link above is the permanent, short URL for the client.)

## Latest session update (2026-08-04) — full bug-report resolution pass
All items from the client's live-testing feedback were addressed and redeployed:
- **Dashboard**: real quarter/month period picker, working Export (CSV), all 4 top stat cards + all chart labels clickable/currency-aware, bell notification "view all" link fixed.
- **Create Budget**: Start/End are now real `<input type="date">` calendar pickers, wired into the saved record.
- **Quarterly Planning**: Q1–Q4 cards, QoQ chart labels, and scenario add/delete confirmed working; Escalate-overdue now pushes real notifications, Export produces a real CSV, and division-submission rows now link through to the matching department in Budgets.
- **Monthly Monitoring**: top stat cards clickable; OPEX categories are now a full Store-backed model with Add/Edit/Archive/Delete; month picker + CSV export added.
- **Expenses**: top 3 stat cards filter the table; a "Manage categories" modal supports rename/delete; Export produces a real CSV; **receipt scanning now runs real client-side OCR (Tesseract.js)** that auto-fills amount/date/vendor from a photographed receipt/invoice.
- **Approvals**: "Approve all safe" confirmed functional.
- **FY Closeout**: all 4 top stat cards filter the carry-over/reserve/archive decision table; Export produces a real CSV.
- **Currency propagation**: switching currency (RM/USD/AUD/CNY) now reformats every figure across Dashboard, Quarterly, Monthly, Expenses, Closeout, Cash Flow, Reports, Performance, Login, and the AI Copilot's canned figures — no more screens with hardcoded "RM" text.
- **Branding**: replaced the old placeholder icon with a new modern, corporate bar-chart/target mark (favicon + app icon) and a matching horizontal wordmark, generated to fit a budgeting/fintech product. This also replaced the old inline SVG `CoplanistraMark` used in the sidebar logo and the login-page wordmark, so the new icon now appears consistently everywhere (browser tab, sidebar, login screen).
- All changes are committed to GitHub (`main`) and deployed to Cloudflare Pages production.

## Features (all fully functional — click-through, not static mockups)

### Onboarding
- **Login** — demo auth: pick a role from the dropdown, sign in, land on the role-appropriate Dashboard.

### Role-aware Dashboard (4 tiers, same route, different widgets per role)
- Employee, Finance Manager, Approver, Administrator — each sees a different widget set, KPI figures, and sidebar nav, driven by `window.ROLES`. (The former separate "Executive" tier has been merged into Employee — one simplified non-admin tier instead of two overlapping ones.)
- **"View as" role switcher** in the topbar — switching role live-updates sidebar nav, dashboard widgets, user name/title/avatar, and badge counts everywhere, instantly.
- **Dashboard charts are fully labelled and clickable**: every bar/segment on the Budget vs Actual chart, the Category donut, budget-health cards, and the departments table shows its figure/% directly and links straight to the matching detail screen (Monthly, Budgets filtered by department, Expenses filtered by category).

### Planning module
- **Budgets** — searchable/filterable list, live query-string search/filter (`#/budgets?q=...&dept=...&status=...`), row click → Budget Detail. Status badges and the 4 summary stat cards (All / Active / Nearing Cap / Over-Budget) are clickable and filter the whole list. **Archive/Restore** button per budget (table + card view). **"Manage Categories"** button opens a shared taxonomy editor for Departments, Expense Categories, and Budget Code prefixes — used consistently across Budgets, Expenses, and CAPEX.
- **Budget Detail** — burndown chart, spend history, live figures from the shared Store.
- **Create Budget wizard** — multi-step form; submitting adds a real record to the Store and routes back to the (now updated) Budgets list.
- **FY Closeout wizard** — 3-step stepper (Review → Carry-over decisions → Lock & Archive) with a segmented control per budget row; reachable from the sidebar ("FY Closeout") for Finance Manager / Admin roles.
- **Quarterly Planning** — quarter cards (clickable → division submissions), plan-vs-actual chart with RM-value labels on every bar and click-through to the submissions table, and a live **Scenario comparison** panel: "New" opens a real add-scenario form, clicking a scenario switches the active one, each has a delete control — all backed by the shared Store (`state.scenarios`), not local demo state.
- **Monthly Monitoring** — calendar heat-view + category burn-down.
- **Expenses** — quick-add form with a real, working **Date** picker, an independent **Department** dropdown (no longer just a side-effect of the Budget selector) sourced from the shared taxonomy, **Category** picker with an inline "+ New" to add categories on the fly, and a real **receipt file upload** (PDF/PNG/JPG, size-checked, shows filename + remove) — plus a **live 3-tier approval-routing preview** that updates as you type the amount:
  - `< RM25,000` → Department Manager only
  - `RM25,000 – RM250,000` → Department Manager → Finance Manager
  - `> RM250,000` → Department Manager → Finance Manager → CFO / Executive
- **Approvals** — approve / reject / request-changes on pending items; approving instantly reduces the pending count everywhere it's shown (sidebar badge, Dashboard widget, Approvals list).

### Financials module
- **CAPEX Portfolio** — project table with stage filter dropdown, category donut, depreciation schedule.
- **Cash Flow** — period selector (FY24/25/26/27-fcst) rescales the operating/investing/financing chart and runway projection live; clicking a chart bar shows that month's breakdown.
- **Performance & KPIs** — financial / operational / sustainability scorecards with dynamically computed RAG (Red/Amber/Green) counts — not hardcoded — and a period selector.

### Insight module
- **Reports & Analytics** — variance analysis (fully wired: clickable variance bars, utilisation heatmap, insight cards that deep-link to related screens); Forecast/Cash-flow/Vendor spend/Custom tabs are placeholders for future work.
- **AI Copilot** — chat interface with canned-but-data-grounded replies: ask about pending approvals, over-budget items, or utilisation and it reads live figures from the Store to answer.

### Admin
- **Team & Access** — member directory (search, invite modal, active/inactive toggle) and expandable role-permission templates.

### Settings (net-new addition, not in the original design source)
- Workspace org settings, notification toggles, data export, demo-data reset, profile card. Added because the shared shell already routes a `/settings` nav item for Finance/Admin roles — without this screen that link would 404.

## Architecture
- **Client-side React 18 SPA**, transpiled in-browser via **Babel Standalone (pinned to v7 classic runtime)** — no webpack/vite bundling of the app JS itself, just plain `<script type="text/babel">` tags loaded in dependency order.
- **`window.Store`** — a plain-JS pub/sub state container (`public/static/js/store.js`) holding budgets, approvals, expenses, notifications, role, toasts, **departments/categories/budget-codes taxonomy, scenarios, and multi-currency config** — the single source of truth all screens subscribe to. Persists to `localStorage` (`coplanistra_state_v1`), with backward-compatible migration for older saved sessions (e.g. legacy `executive` role auto-maps to `employee`).
- **`window.Router`** — a minimal hash-based router (`public/static/js/router.js`) supporting path segments and query params.
- **`window.ROLES`** — 4 role definitions controlling sidebar nav visibility and dashboard widget layout (`public/static/js/roles.js`): Finance Manager, Approver, Employee, Administrator.
- **Multi-currency**: `fmtMYR` (in `primitives.js`) is now currency-aware — it reads `Store.getState().currency` and converts every displayed figure using `CURRENCY_CONFIG` rates. Supported currencies: **RM (default), USD, AUD, CNY**. Switch currency from the Topbar selector or Settings — the choice applies instantly across every screen.
- **`AppFrame`** — the shared shell (sidebar + topbar + notification bell + toast stack) every screen renders inside (`public/static/js/shell.js`).
- **`app.js`** — the bootstrap: maps the current route to a screen component, gates unauthenticated users to `/login`, mounts the React root, and re-renders on Router/Store change.
- **Hono backend** (`src/index.tsx`) — serves static assets (`hono/cloudflare-workers` `serveStatic`) and returns the same SPA HTML shell for every path (hash-routing means the server only ever needs to serve `/`).

## Entry points / routes
All routes are client-side hash routes (`#/...`), served by the single Hono catch-all `app.get('*', ...)`:

| Route | Screen |
|---|---|
| `/dashboard` (default) | DashboardScreen |
| `/budgets`, `/budgets?q=...` | BudgetsScreen |
| `/budgets/new` | CreateBudgetScreen |
| `/budgets/:id` | BudgetDetailScreen |
| `/quarterly` | QuarterlyScreen |
| `/monthly` | MonthlyScreen |
| `/expenses` | ExpensesScreen |
| `/approvals` | ApprovalsScreen |
| `/closeout` | CloseoutScreen |
| `/capex` | CapexScreen |
| `/cashflow` | CashFlowScreen |
| `/performance` | PerformanceScreen |
| `/reports` | ReportsScreen |
| `/copilot` | CopilotScreen |
| `/admin` | AdminScreen |
| `/settings` | SettingsScreen |
| `/login` | LoginScreen (also the fallback for any route while unauthenticated) |

## Data model & storage
- All application data (budgets, approvals, expenses, notifications) is seeded in-memory and persisted to **browser `localStorage`** (key `coplanistra_state_v1`) — there is currently no server-side database. This is a working prototype; production would move this to Cloudflare D1 with real auth.
- Settings screen uses a separate localStorage key (`coplanistra_settings_v1`) for workspace preferences.

## User guide
1. Open the app — you'll land on **Login**.
2. Pick a role from the dropdown (Finance Manager is the most feature-complete) and sign in.
3. Use the sidebar to move between modules; the "View as" pill in the topbar lets you preview any other role instantly.
4. Try: approve an item on **Approvals** → watch the pending-count badge drop everywhere; create a budget on **Budgets** → it appears at the top of the list immediately; type an expense amount on **Expenses** → watch the routing preview reroute through Dept Manager → Finance Manager → CFO as the amount crosses RM25K / RM250K.

## Team & Access — current members
Includes the workspace's real members list (mirrors the client's existing user table), e.g. Admin Arsela, Keith M Symondson, Roni (`roni@maidavale.com.my`, Manager), Rubiey Suhaimi, Shammim Azad Kamruzaman, Shamsir, plus the original design-source demo members (Faris Hamzah, Marcus Lim, Priya Nair, etc.).

## Known gaps / next steps
- Reports screen: only the "Variance analysis" tab is fully wired; Forecast / Cash-flow / Vendor spend / Custom are placeholders.
- No real authentication — Login is a demo role-picker, not tied to a real identity provider.
- No server-side persistence yet (Cloudflare D1) — all data lives in `localStorage` per browser.
- Admin screen's Invite/Deactivate actions are local-only (don't send real emails or persist across browsers).
- Exchange rates in `CURRENCY_CONFIG` are static demo values, not live market rates.
- Receipt uploads are stored as filenames only (no Cloudflare R2 binding yet) — files are not actually persisted server-side.

## Deployment
- **Platform**: Cloudflare Pages (via Hono + Wrangler), deployed under the client's own Cloudflare account
- **Status**: ✅ **Live in production** at https://coplanistra.pages.dev
- **Source control**: ✅ Connected to GitHub — https://github.com/Rubiey-Arsela/Coplanistra- (`main` branch)
- **Tech Stack**: Hono (backend/static-serving) + React 18 (CDN) + Babel Standalone v7 (CDN, in-browser JSX transform) + vanilla CSS design tokens
- **Last Updated**: 2026-08-04
