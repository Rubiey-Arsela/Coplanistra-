# Coplanistra — Budget & Plan

A fully interactive corporate budgeting, planning, and financial-oversight web application built from a Genspark Design handoff. Client-side React SPA (no build-time bundler needed for the app code) served from a lightweight Hono backend on Cloudflare Pages.

## Project Overview
- **Name**: Coplanistra — Budget & Plan
- **Goal**: Give a Malaysian conglomerate (Acme Holdings, styled after Al Bukhary Group) a role-aware planning, expense-approval, and financial-analytics workspace — budgets, approvals, expenses, CAPEX, cash flow, KPI performance, reporting, an AI copilot, and team/access administration, all wired to a single shared client-side data store so every screen stays in sync.
- **Source of design**: Genspark Design "Build it" handoff (`designer2-bf393d34-4616-4a79-8547-26480b35ab20`), adapted from static JSX screens into a fully wired, stateful React SPA.

## Live sandbox preview
- **Preview URL**: https://3000-i849cs9u89hcjixobdpvi-b237eb32.sandbox.novita.ai/
- (This sandbox preview URL is temporary — see Deployment section for taking this to a permanent Cloudflare Pages URL.)

## Features (all fully functional — click-through, not static mockups)

### Onboarding
- **Login** — demo auth: pick a role from the dropdown, sign in, land on the role-appropriate Dashboard.

### Role-aware Dashboard (5 variants, same route, different widgets per role)
- Executive, Finance Manager, Approver, Employee, Administrator — each sees a different widget set, KPI figures, and sidebar nav, driven by `window.ROLES`.
- **"View as" role switcher** in the topbar — switching role live-updates sidebar nav, dashboard widgets, user name/title/avatar, and badge counts everywhere, instantly.

### Planning module
- **Budgets** — searchable/filterable list, live query-string search (`#/budgets?q=...`), row click → Budget Detail.
- **Budget Detail** — burndown chart, spend history, live figures from the shared Store.
- **Create Budget wizard** — multi-step form; submitting adds a real record to the Store and routes back to the (now updated) Budgets list.
- **FY Closeout wizard** — 3-step stepper (Review → Carry-over decisions → Lock & Archive) with a segmented control per budget row; reachable from the sidebar ("FY Closeout") for Finance Manager / Admin roles.
- **Quarterly Planning** — quarter cards, plan-vs-actual chart, reforecast scenarios.
- **Monthly Monitoring** — calendar heat-view + category burn-down.
- **Expenses** — quick-add form with a **live 3-tier approval-routing preview** that updates as you type the amount:
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
- **`window.Store`** — a plain-JS pub/sub state container (`public/static/js/store.js`) holding budgets, approvals, expenses, notifications, role, and toasts — the single source of truth all screens subscribe to. Persists to `localStorage` (`coplanistra_state_v1`).
- **`window.Router`** — a minimal hash-based router (`public/static/js/router.js`) supporting path segments and query params.
- **`window.ROLES`** — 5 role definitions controlling sidebar nav visibility and dashboard widget layout (`public/static/js/roles.js`).
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

## Deployment
- **Platform**: Cloudflare Pages (via Hono + Wrangler)
- **Status**: ✅ Running in sandbox preview; **not yet deployed to a permanent Cloudflare Pages URL** — deployment has not been requested yet.
- **Tech Stack**: Hono (backend/static-serving) + React 18 (CDN) + Babel Standalone v7 (CDN, in-browser JSX transform) + vanilla CSS design tokens
- **Last Updated**: 2026-08-04
