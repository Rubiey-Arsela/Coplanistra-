# Coplanistra — Budget & Plan

A fully interactive corporate budgeting, planning, and financial-oversight web application built from a Genspark Design handoff. Client-side React SPA (no build-time bundler needed for the app code) served from a lightweight Hono backend on Cloudflare Pages.

## Project Overview
- **Name**: Coplanistra — Budget & Plan
- **Goal**: Give a Malaysian conglomerate (Acme Holdings, styled after Al Bukhary Group) a role-aware planning, expense-approval, and financial-analytics workspace — budgets, approvals, expenses, CAPEX, cash flow, KPI performance, reporting, an AI copilot, and team/access administration, all wired to a single shared client-side data store so every screen stays in sync.
- **Source of design**: Genspark Design "Build it" handoff (`designer2-bf393d34-4616-4a79-8547-26480b35ab20`), adapted from static JSX screens into a fully wired, stateful React SPA.

## Live production URL
- **Production**: https://coplanistra.pages.dev (latest deploy: https://9959c1d7.coplanistra.pages.dev)
- **GitHub**: https://github.com/Rubiey-Arsela/Coplanistra-

## Session update (2026-08-19) — FY/currency correctness, reconciliation-aware financials, Cash Flow & Director's Report rebuild, ArsProgress bug fix
Responding to a full production-readiness critique for Al Bukhary Group / Arsela Resources, this session made the following **verified and deployed** changes:
- **Fiscal year corrected app-wide**: Arsela's FY starts 1 July, not 1 January. `store.js` now exposes `Store.fyLabel()/fyQuarterLabel()/fyYearOf()/fyProgressPct()/today()` etc., and every screen (Dashboard, Login, shell org badge, Cash Flow, Budgets detail, Approvals, Quarterly, Closeout, CAPEX, Performance, Copilot, Reports — both the Director's Report and the Variance-analysis tab) now computes its FY/quarter/month labels from these helpers instead of hardcoded "FY26"/"FY 2026"/"Jan-Dec" strings. Settings' `fiscalYearStart` default was also corrected from "January" to "July" (was silently contradicting the rest of the app).
- **Reporting currency corrected to AUD**: `defaultState.currency` changed from MYR to AUD; all remaining hardcoded "(RM)" field labels and CSV headers (CreateBudget, Expenses, Monthly, Quarterly, Closeout) now read the live currency code from the store; Settings' currency description text no longer describes MYR as the base unit.
- **Reconciliation-aware financial data model**: Budgets, Expenses and (this session) CAPEX projects now carry explicit `reconciled`/`actualsThrough`/`committed`/`forecastFinal` fields. The core build rule — *only reconciled Xero amounts are classified as actuals; approved items remain commitments; future amounts remain forecasts* — is enforced in the Dashboard and the Director's Report computations.
- **Director's Report rebuilt** (Reports screen): now shows a Preliminary-snapshot banner, basis-labeled executive summary (Actual/Committed/Actual+Committed/Forecast), a reworked department table that flags early-year near-zero spend as a "timing gap" instead of a misleading green underspend, a 13-week cash look-ahead, and a solvency/funding status block — all pulling live from Store and the shared `computeCashFlow()` function. CSV/PDF exports updated to match.
- **Cash Flow screen corrected**: fiscal-year month ordering (Jul→Jun), solid-vs-dashed actual/forecast chart rendering, and the previously-hardcoded "9.4% vs Jan opening" badge now uses a real computed `netChangePct`.
- **ArsProgress bug fixed**: budget utilisation bars/labels were clamped to a flat "100%" even when a budget was over its cap (e.g. Fleet Maintenance & Renewal at 107.1%). The bar width still caps visually at 100%, but the numeric label now always shows the true value.
- Verified via `npm run build` and Playwright across all 13 app routes with zero console errors before each commit; pushed to GitHub (`fbc1b61`) and deployed to Cloudflare Pages.

### Still pending (tracked for a future session)
- **New Reconciliation module**: not yet built (no screen, no data model, no nav entry) — this was the 3rd item in the user's stated priority order and is the largest remaining piece of work.
- **CapexScreen.js UI**: the new exposure/commitment data fields (openCommitments, totalExposure, remainingApprovedFunding, constructionWIP, etc.) added to the CAPEX data model are not yet surfaced in the CAPEX screen's cards/table.
- **BudgetsScreen.js**: Draft/Closed status summary cards and a "Nearing cap" lifecycle badge are not yet added (draft/over/active/nearing counts exist, draft/closed do not have their own summary tiles).
- Per-screen enhancements from the original critique not yet started: Monthly Monitoring, Expenses (4-way status split UI), Approvals (precision/audit rules), Performance/KPIs, AI Copilot.
- (Sandbox preview URLs are temporary; the pages.dev link above is the permanent, short URL for the client.)

## Bug fix (2026-08-05) — Cash Flow scenario cards not clickable / not syncing
**Reported**: clicking a scenario card on the Cash Flow screen did nothing — the rest of the panel (hero stats, chart, runway, active badge) never updated.
**Root cause**: `Store.setState()` mutates the single shared state object in place, and the store's `emit()` was passing that same mutated object reference to every subscriber. React's `useState` bails out of re-rendering when given a value that's reference-identical to the current one — so the click *did* correctly flip the active scenario in the store, but the screen never repainted to reflect it.
**Fix**: `emit()` now spreads state into a fresh object on every notification, so every screen that subscribes via `useState(window.Store.getState())` + `Store.subscribe(setS)` always receives a new reference and re-renders. This is a central-store fix (`store.js`), so it covers every screen using that pattern, not just Cash Flow. Verified end-to-end with Playwright: closing cash RM237M → RM292M, runway 5.4mo → 6.6mo, "Active" badge moved to the clicked card, switch toast fired, zero console errors.

## Latest session update (2026-08-05) — Cash Flow scenario planning, Dashboard Spent-vs-Budget-to-date, Director's Report
Client feedback addressed this session:
- **Cash Flow scenario planning** ("what if budget/expense/revenue changed, what's the impact on cashflow?"): new **Scenario Planning** card on the Cash Flow screen. `Store.cashFlowScenarios` holds 4 seeded scenarios (Base case, CAPEX deferred, Opex savings drive, Revenue downside), each with independent Budget/Expense/Revenue % deltas + a note. Click any scenario card to make it active — the whole screen (hero stats, Operating/Investing/Financing chart, running cash balance, runway, CSV export) recomputes live from that scenario via a shared `computeCashFlow()` function. Add new scenarios via a modal form; delete any non-active scenario (the active one is protected). Fully Store-backed, so it persists and stays in sync with the rest of the app.
- **Dashboard — Spent to Date vs Budget to Date**: new panel alongside the existing "burn vs total budget" figure. Prorates the FY26 annual budget by how much of the fiscal year has elapsed (vs the app's fixed reference date) and compares it to live cumulative spend from `Store.budgets` — shows Budget-to-date / Spent-to-date / Variance with a progress bar. Clickable through to Reports. Gated to non-employee roles (org-wide total, not shown on the individual-contributor Dashboard view).
- **Monthly Director's Report**: brand-new tab on the Reports screen (now the default tab) — a real, data-driven executive report, not a static mock-up. Pulls live figures from Store (budgets, approvals, CAPEX, the active Cash Flow scenario) into: an executive summary, department budget performance table, CAPEX programme summary, cash flow position, and approvals needing director attention. **Export CSV** and **Export PDF** (via jsPDF + autoTable, loaded from CDN) both produce real downloadable files built from live data. All cards click through to the matching detail screen (Budgets / Cash Flow / CAPEX / Approvals).
- **Xero integration — CSV import (shipped).** The client chose the lighter-weight path over a full OAuth connection (no Xero Developer app/credentials needed). New **"Import from Xero"** button on the Expenses screen (next to Export): upload a CSV exported from Xero (Business → Expense claims, or Reports → Transaction list → Export → CSV) and Coplanistra auto-detects the Date, Description/Reference, Contact and Gross/Amount columns, shows an editable preview table (per-row include/exclude, description, vendor, amount, department, category), then bulk-adds the selected rows as real expenses via `Store.addExpense()`. Handles Xero's quoted CSV fields, thousands separators, `dd/mm/yyyy` dates, and parenthesised credit amounts. 100% client-side (`parseCSVText` in `primitives.js`) — no backend, no OAuth, works today. Verified end-to-end with a sample Xero-style CSV (4 rows → 4 expenses imported, stat cards and table updated live, zero console errors).

## Previous session update (2026-08-04) — full bug-report resolution pass
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
- **Self-service password change** (new feature): users can now change their own account password from **Settings → Change password** — requires the current password, a new password (min. 8 characters, must differ from current), and a matching confirmation. Backed by a new `Store.changePassword()` method that validates against the signed-in user's record and updates it in place (persisted to `localStorage` like the rest of the app state).
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
- Workspace org settings, notification toggles, data export, demo-data reset, profile card, **change password**. Added because the shared shell already routes a `/settings` nav item for Finance/Admin roles — without this screen that link would 404.
- **Change password**: any signed-in user can update their own password from Settings — enter current password + new password + confirmation; validated client-side and against the Store's user record.

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
