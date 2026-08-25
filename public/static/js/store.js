/* ============================================================
   Coplanistra — global app store (plain JS, framework-agnostic)
   Central source of truth so users/role, notifications, budgets,
   approvals, expenses and CAPEX stay in sync across every screen.
   ============================================================ */

(function () {
  // Bumped to v3: "start fresh" reset — all demo/seed financial records
  // (budgets, expenses, CAPEX, approvals, reconciliations, KPIs,
  // scenarios, cash flow scenarios, notifications) were cleared to
  // empty so the app launches with zero figures, ready for the real
  // Arsela/Al Bukhary team to enter live data via the UI. Config data
  // (users, departments, categories, budget codes, reconciliation
  // source lanes) is retained. Any state persisted under the old v2
  // schema is deliberately NOT migrated in place — it's discarded so
  // every session starts from the empty seed data rather than mixing
  // in old demo figures.
  const LS_KEY = 'coplanistra_state_v3';

  /* ----------------------------------------------------------
     Fiscal year configuration — Arsela Resources' financial year
     starts 1 July (not 1 January). So 1 Jul 2026 begins FY2027,
     and the app's "today" reference date of 22 Jul 2026 falls in
     FY2027 Q1 (22 days into the year), NOT "Q3 FY2026" as earlier
     hardcoded labels assumed. All FY/quarter/period labels across
     the app must be derived from these helpers — never hardcoded —
     so a future change to the reference date or FY start month
     only needs to change it here.
     ---------------------------------------------------------- */
  const FY_START_MONTH = 6; // 0-indexed: June -> FY starts 1 July
  const APP_TODAY = new Date(2026, 6, 22); // 22 July 2026 — demo "today"

  /** Given any JS Date, return the fiscal year NUMBER it falls in.
   *  Arsela convention: FYnnnn covers 1 Jul (nnnn-1) -> 30 Jun nnnn.
   *  So 1 Jul 2026 -> FY2027; 30 Jun 2026 -> FY2026. */
  function fyYearOf(date) {
    const y = date.getFullYear();
    const m = date.getMonth(); // 0-11
    return m >= FY_START_MONTH ? y + 1 : y;
  }
  /** Fiscal quarter (1-4) for a given date, Q1 = Jul-Sep, Q2 = Oct-Dec,
   *  Q3 = Jan-Mar, Q4 = Apr-Jun. */
  function fyQuarterOf(date) {
    const m = date.getMonth(); // 0-11
    const shifted = (m - FY_START_MONTH + 12) % 12; // 0 = Jul
    return Math.floor(shifted / 3) + 1;
  }
  /** First calendar date of the fiscal year containing `date`. */
  function fyStartDate(date) {
    const fy = fyYearOf(date);
    return new Date(fy - 1, FY_START_MONTH, 1);
  }
  /** Last calendar date of the fiscal year containing `date`. */
  function fyEndDate(date) {
    const fy = fyYearOf(date);
    return new Date(fy, FY_START_MONTH, 0); // day 0 of next FY's start month = last day of prior month
  }
  /** Fraction (0-1) of the current fiscal year elapsed as of `date`. */
  function fyProgressPctOf(date) {
    const start = fyStartDate(date);
    const end = fyEndDate(date);
    const elapsed = (date - start) / (end - start);
    return Math.min(1, Math.max(0, elapsed));
  }
  /** Human label, e.g. "Q1 FY2027". */
  function fyQuarterLabel(date) {
    return `Q${fyQuarterOf(date)} FY${fyYearOf(date)}`;
  }
  /** Human label, e.g. "FY2027". */
  function fyLabel(date) {
    return `FY${fyYearOf(date)}`;
  }

  function loadPersisted() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  /* ----------------------------------------------------------
     Real company users (client-provided list). Every account
     shares the demo password "Arsela123". `permissionRole` maps
     each real person onto one of the internal nav/permission
     tiers defined in roles.js (executive/finance/approver/
     employee/admin) so sidebar + dashboard widgets stay wired,
     while `title` holds the REAL role label shown in the UI
     (Administrator / Manager / Employee).
     ---------------------------------------------------------- */
  const DEFAULT_PASSWORD = 'Arsela123';

  const seedUsers = [
    { email: 'admin@arselaresources.com', name: 'Admin Arsela', title: 'Administrator', dept: 'Technology', status: 'Active', permissionRole: 'admin', avatar: 'purple', password: DEFAULT_PASSWORD },
    { email: 'keithsymondson@arselaresources.com.au', name: 'Keith M Symondson', title: 'Administrator', dept: 'Operational Excellence', status: 'Active', permissionRole: 'admin', avatar: 'navy', password: DEFAULT_PASSWORD },
    { email: 'keithsymondson@gmail.com', name: 'Keith Symondson', title: 'Employee', dept: '—', status: 'Inactive', permissionRole: 'employee', avatar: 'blue', password: DEFAULT_PASSWORD },
    { email: 'roni@maidavale.com.my', name: 'Roni', title: 'Manager', dept: '—', status: 'Active', permissionRole: 'finance', avatar: 'teal', password: DEFAULT_PASSWORD },
    { email: 'rubieysuhaimi@arselaresources.com.au', name: 'Rubiey Suhaimi', title: 'Administrator', dept: 'Management', status: 'Active', permissionRole: 'admin', avatar: 'navy', password: DEFAULT_PASSWORD },
    { email: 'shammim@maidavale.com.my', name: 'Shammim Azad Kamruzaman', title: 'Manager', dept: 'Strategy', status: 'Active', permissionRole: 'finance', avatar: 'teal', password: DEFAULT_PASSWORD },
    { email: 'sham@arselaresources.com', name: 'Shamsir', title: 'Manager', dept: 'Strategy', status: 'Active', permissionRole: 'finance', avatar: 'teal', password: DEFAULT_PASSWORD },
  ];

  /* Budget records — IMPORTANT reconciliation semantics (per Arsela's
     stated build rule): "spent" holds ONLY reconciled Xero-sourced
     accounting actuals. `committed` is separate — approved requests /
     POs not yet posted in Xero. `forecastFinal` is the projected
     full-year outturn (actual + committed + expected future spend).
     `reconciled: true` means the actuals-to-date figure has been
     matched against Xero/bank in the Reconciliations module; `false`
     means the figure is provisional/unreconciled and screens should
     flag it as such. `actualsThrough` is the date actuals were last
     imported/reconciled from Xero. */
  // Cleared for "start fresh" (2026-08-19): no demo budgets. Real
  // budgets should be added by the team via the Budgets screen UI.
  const seedBudgets = [];

  // Cleared for "start fresh" (2026-08-19): no demo approvals queue.
  const seedApprovals = [];

  /* Expense records — `status` is kept for backward-compat (mirrors
     `approvalStatus`) but the app now tracks four INDEPENDENT
     lifecycle fields, per the build rule that approval, Xero posting,
     payment and bank reconciliation are separate facts about the same
     expense:
       approvalStatus: 'pending' | 'approved' | 'rejected'
       xeroStatus:     'not_posted' | 'posted' | 'posting_exception'
       paymentStatus:  'unpaid' | 'paid'
       reconciliation: 'unreconciled' | 'reconciled'
     Only expenses with xeroStatus 'posted' AND reconciliation
     'reconciled' should ever be counted as a reconciled actual. */
  // Cleared for "start fresh" (2026-08-19): no demo expenses.
  const seedExpenses = [];

  /* CAPEX semantics — clarified per Arsela build rule to avoid the
     "exposure exceeds approval" confusion: `committed` is the TOTAL
     contracted/PO value for the project and ALREADY INCLUDES amounts
     paid out (`spent` is a subset of `committed`, not additional to
     it). So total exposure against the approved envelope = `committed`
     (never committed + spent). `openCommitments` = committed - spent
     is the contracted-but-not-yet-paid balance still to flow through
     Xero as actuals. `remainingApprovedFunding` = approved - committed
     is genuine uncommitted headroom left in the sanction. `spent` is
     ONLY reconciled Xero-sourced cash actually paid (paidActuals is
     the same figure, named for card labels). `constructionWIP` is the
     capitalised-but-not-yet-in-service balance sitting in the Xero
     fixed-asset WIP account (0 once the asset is in service and fully
     capitalised, matching the depreciation schedule). */
  // Cleared for "start fresh" (2026-08-19): no demo CAPEX projects.
  const seedCapex = [];

  /* ----------------------------------------------------------
     Reconciliation module — tracks whether Xero has actually been
     matched against each of Arsela's real source-of-truth ledgers.
     This is the missing link the rest of the app's "Actual" figures
     depend on: a budget/expense/CAPEX line can only be counted as a
     reconciled actual once its underlying Xero transaction has been
     matched here. Six reconciliation "lanes" per the client's real
     process, each holding its own line items:
       1. Xero vs Westpac Account #2077 (main operating bank account)
       2. SFR payment schedule vs Xero
       3. Costentra staff claims vs Xero
       4. Expenses paid outside Westpac vs Xero
       5. Budgeting actuals vs Xero
       6. Intercompany items
     statusOptions: Matched / Potential match / Missing in Xero /
     Duplicate / Timing difference / Different entity / Awaiting
     supporting document / Reviewed. ---------------------------- */
  const RECON_SOURCES = [
    'Xero vs Westpac Account #2077',
    'SFR payment schedule vs Xero',
    'Costentra staff claims vs Xero',
    'Expenses paid outside Westpac vs Xero',
    'Budgeting actuals vs Xero',
    'Intercompany items',
  ];
  const RECON_STATUSES = ['Matched', 'Potential match', 'Missing in Xero', 'Duplicate', 'Timing difference', 'Different entity', 'Awaiting supporting document', 'Reviewed'];

  // Cleared for "start fresh" (2026-08-19): no demo reconciliation line
  // items. The lane list itself (RECON_SOURCES above) is config and is
  // retained so the by-source tabs still render correctly when empty.
  const seedReconciliations = [];

  // Cleared for "start fresh" (2026-08-19): no demo notifications —
  // these referenced demo expense/budget/CAPEX IDs that no longer exist.
  const seedNotifications = [];

  /* ----------------------------------------------------------
     Managed taxonomy — departments, expense categories and
     budget-code prefixes. Screens that used to hardcode these
     lists (CreateBudgetScreen's DEPTS, ExpensesScreen's
     CATEGORIES) now read from here via Store, and Budgets has
     an "Manage categories" UI to add/edit/remove them.
     ---------------------------------------------------------- */
  const seedDepartments = ['Ports & Logistics', 'Operations', 'Digital & Data', 'People & Culture', 'Energy & Assets', 'Property', 'Aviation', 'Agri & Food', 'Corporate', 'Sustainability'];
  const seedCategories = ['Maintenance', 'IT & Software', 'HR', 'Machinery', 'Professional Fees', 'Travel', 'Other'];
  const seedBudgetCodes = ['BUD', 'CAP', 'OPX', 'PRG'];

  /* Monthly Monitoring's OPEX category burn table — was a hardcoded
     local useMemo array with no CRUD; lifted into Store so categories
     can be added / edited / archived and the change is visible (and
     persists) app-wide, consistent with the rest of the taxonomy. */
  // Cleared for "start fresh" (2026-08-19): no demo plan/actual figures.
  // Real OPEX categories (with real plan/actual $) should be added by
  // the team via Monthly Monitoring's category management UI.
  const seedOpexCategories = [];

  /* Performance & KPIs balanced scorecard — was a local hardcoded
     array with a non-functional "Add KPI" button; lifted into Store
     so KPIs can actually be added/edited/deleted and persist like
     every other managed list in the app. `perspective` groups KPIs
     into the three scorecard sections (financial / operational /
     sustainability). `invert` = true means a LOWER actual is better
     (e.g. downtime hours, safety incidents) — used for RAG/variance
     colour direction, matching PerformanceScreen's existing logic. */
  // Cleared for "start fresh" (2026-08-19): no demo KPIs. Real KPIs
  // should be added by the team via the Performance screen UI.
  const seedKpis = [];

  /* Scenario comparison (Quarterly panel) — was local hardcoded
     state; lifted into Store so "New scenario" and switching the
     active scenario actually persist. */
  // Cleared for "start fresh" (2026-08-19): no demo scenarios.
  const seedScenarios = [];

  /* Cash Flow scenario planning — "what if budget / expense / revenue
     changed, what's the impact on cash flow?" Each scenario is a set of
     % deltas applied to the base budget (CAPEX/investing), opex
     (expense) and revenue lines; CashFlowScreen recomputes the whole
     chart + runway live from whichever scenario is active. Lifted into
     Store (not local screen state) so it persists and follows the same
     add/switch/delete pattern as Quarterly's scenario comparison. */
  // Cleared for "start fresh" (2026-08-19): no demo cash flow scenarios.
  // A "Base case" scenario with zero deltas is seeded so CashFlowScreen
  // always has an active scenario to reference (0% deltas = no-op).
  const seedCashFlowScenarios = [
    { id: 'CFS-1', n: 'Base case', budgetDeltaPct: 0, expenseDeltaPct: 0, revenueDeltaPct: 0, note: 'No scenario adjustments applied — reflects live Store data as entered.', active: true },
  ];

  /* ----------------------------------------------------------
     Xero multi-report imports (2026-08-19). Coplanistra has no
     Xero API/OAuth connection (static Cloudflare Pages hosting
     has no backend to hold credentials) — instead, the user
     exports each of these reports from Xero as a CSV and uploads
     it via the "Data Imports" screen, mirroring the existing
     Expenses "Import from Xero" pattern. Each import is stored as
     a dated SNAPSHOT (Xero reports are always "as at" or "for
     period" point-in-time exports), newest first. All figures are
     stored in the report's native currency (AUD, per Arsela's
     Xero org) exactly as imported — no FX conversion applied here.
     XERO_REPORT_TYPES is the single source of truth for the 10
     report types the client asked to import (the original 8 plus
     Account Transactions and Bank Summary, added 2026-08-25 to match
     the client's real full Xero export suite), consumed by the Data
     Imports screen to render one card + CRUD per type. ---- */
  const XERO_REPORT_TYPES = [
    { key: 'profitAndLoss', label: 'Profit and Loss', settings: 'Current month and FY-to-date · accrual basis · monthly columns', purpose: 'Revenue, expenses and budget-versus-actual' },
    { key: 'balanceSheet', label: 'Balance Sheet', settings: 'As at month-end · compare with previous month-end', purpose: 'Assets, liabilities, equity and solvency indicators' },
    { key: 'cashFlowActuals', label: 'Statement of Cash Flows (Direct) / Cash Summary', settings: 'Current month and FY-to-date', purpose: 'Where cash came from and where it went' },
    { key: 'accountTransactions', label: 'Account Transactions', settings: 'Current period · all accounts', purpose: 'Every transaction posted per account, grouped by account, for detailed tracing' },
    { key: 'bankReconciliation', label: 'Bank Reconciliation Report Pack', settings: 'Westpac Account #2077 · as at month-end', purpose: "Confirms Xero's bank balance and unreconciled items" },
    { key: 'bankSummary', label: 'Bank Summary', settings: 'Current period · all bank accounts', purpose: 'Opening/closing balances and cash received/spent per bank account' },
    { key: 'generalLedger', label: 'General Ledger Detail', settings: 'Current month · all accounts · accrual basis', purpose: 'Transaction-level matching, account mapping and duplicate checks' },
    { key: 'trialBalance', label: 'Trial Balance', settings: 'As at month-end', purpose: 'Control check that Coplanistra totals agree with Xero' },
    { key: 'agedReceivables', label: 'Aged Receivables Detail', settings: 'As at month-end', purpose: 'Customer amounts outstanding and expected cash receipts' },
    { key: 'agedPayables', label: 'Aged Payables Detail', settings: 'As at month-end', purpose: 'Supplier amounts due and upcoming cash payments' },
  ];
  // Every seed array below starts empty ("start fresh" principle — no
  // fabricated Xero data). The team imports real exports via the UI.
  const seedProfitAndLoss = [];
  const seedBalanceSheet = [];
  const seedCashFlowActuals = [];
  const seedAccountTransactions = [];
  const seedBankReconciliation = [];
  const seedBankSummary = [];
  const seedGeneralLedger = [];
  const seedTrialBalance = [];
  const seedAgedReceivables = [];
  const seedAgedPayables = [];
  // "Documents outside Xero" — generic supporting-document register
  // (bank statements, facility/loan agreements, board resolutions, audit
  // letters, etc). Static hosting stores METADATA only (name, category,
  // note, date, who attached it) — no backend/R2 wired up yet to persist
  // raw file bytes, so the browser File object itself is not retained
  // across reloads. This is disclosed in the UI upload dialog.
  const seedSupportingDocuments = [];

  /* ----------------------------------------------------------
     Multi-currency support. RM (MYR) is the base/default unit
     that every seeded figure is stored in. Rates below convert
     FROM MYR into the selected display currency — indicative
     fixed rates for demo purposes (not live FX). ----------- */
  const CURRENCY_CONFIG = {
    MYR: { symbol: 'RM', rate: 1, decimals: 0, name: 'Malaysian Ringgit' },
    USD: { symbol: '$', rate: 0.21, decimals: 0, name: 'US Dollar' },
    AUD: { symbol: 'A$', rate: 0.325, decimals: 0, name: 'Australian Dollar' },
    CNY: { symbol: '¥', rate: 1.53, decimals: 0, name: 'Chinese Yuan' },
  };

  const defaultState = {
    authenticated: false,
    currentUserEmail: null,
    role: 'finance',
    notifOpen: false,
    notifications: seedNotifications,
    users: seedUsers,
    budgets: seedBudgets,
    approvals: seedApprovals,
    expenses: seedExpenses,
    capexProjects: seedCapex,
    reconciliations: seedReconciliations,
    departments: seedDepartments,
    categories: seedCategories,
    opexCategories: seedOpexCategories,
    budgetCodes: seedBudgetCodes,
    scenarios: seedScenarios,
    cashFlowScenarios: seedCashFlowScenarios,
    kpis: seedKpis,
    // Xero multi-report imports + supporting documents (2026-08-19)
    profitAndLoss: seedProfitAndLoss,
    balanceSheet: seedBalanceSheet,
    cashFlowActuals: seedCashFlowActuals,
    accountTransactions: seedAccountTransactions,
    bankReconciliation: seedBankReconciliation,
    bankSummary: seedBankSummary,
    generalLedger: seedGeneralLedger,
    trialBalance: seedTrialBalance,
    agedReceivables: seedAgedReceivables,
    agedPayables: seedAgedPayables,
    supportingDocuments: seedSupportingDocuments,
    // Arsela Resources' reporting currency is AUD; MYR remains available
    // as a display option via the currency switcher (CURRENCY_CONFIG
    // below) but is no longer the default.
    currency: 'AUD',
    period: fyQuarterLabel(APP_TODAY),
    toasts: [],
    copilotMessages: null, // per-screen default seeded lazily
  };

  const persisted = loadPersisted();
  const state = Object.assign({}, defaultState, persisted || {});
  // Always trust the freshly-deployed seed user directory over anything
  // that was persisted from an older build (e.g. the previous fictional
  // seed list) so real company logins always work after a redeploy.
  state.users = seedUsers;
  // Never persist "open" UI transient state across reloads
  state.notifOpen = false;
  // Migration: the "executive" permission tier was merged into "employee"
  // (they had near-identical scope and no real seeded account used
  // executive). Any state persisted before this merge — a previewed role,
  // or a user record with the old permissionRole — is normalised here so
  // nothing gets stranded on a tier that no longer exists in roles.js.
  if (state.role === 'executive') state.role = 'employee';
  state.users = state.users.map((u) => u.permissionRole === 'executive' ? { ...u, permissionRole: 'employee' } : u);
  // Backfill managed taxonomy / scenarios / currency for state persisted
  // before these fields existed.
  if (!state.departments) state.departments = seedDepartments;
  if (!state.categories) state.categories = seedCategories;
  if (!state.opexCategories) state.opexCategories = seedOpexCategories;
  if (!state.budgetCodes) state.budgetCodes = seedBudgetCodes;
  if (!state.scenarios) state.scenarios = seedScenarios;
  if (!state.cashFlowScenarios) state.cashFlowScenarios = seedCashFlowScenarios;
  if (!state.reconciliations) state.reconciliations = seedReconciliations;
  if (!state.kpis) state.kpis = seedKpis;
  if (!state.profitAndLoss) state.profitAndLoss = seedProfitAndLoss;
  if (!state.balanceSheet) state.balanceSheet = seedBalanceSheet;
  if (!state.cashFlowActuals) state.cashFlowActuals = seedCashFlowActuals;
  if (!state.bankReconciliation) state.bankReconciliation = seedBankReconciliation;
  if (!state.generalLedger) state.generalLedger = seedGeneralLedger;
  if (!state.trialBalance) state.trialBalance = seedTrialBalance;
  if (!state.agedReceivables) state.agedReceivables = seedAgedReceivables;
  if (!state.agedPayables) state.agedPayables = seedAgedPayables;
  if (!state.supportingDocuments) state.supportingDocuments = seedSupportingDocuments;
  if (!state.currency) state.currency = 'AUD';
  // Force-correct the period label for any state persisted before the
  // FY-start-month fix (Arsela's FY starts 1 Jul, so 22 Jul 2026 is
  // Q1 FY2027, not "Q3 · FY 2026").
  state.period = fyQuarterLabel(APP_TODAY);

  const listeners = new Set();

  function persist() {
    try {
      const { toasts, notifOpen, ...rest } = state;
      localStorage.setItem(LS_KEY, JSON.stringify(rest));
    } catch (e) {}
  }

  function emit() {
    // IMPORTANT: pass a NEW object reference to subscribers, not the
    // mutated `state` object itself. React's useState bails out of
    // re-rendering when setS() is called with a value that is
    // reference-equal to current state — since setState() below mutates
    // `state` in place (Object.assign), handing subscribers that same
    // object would make every change invisible to any screen whose only
    // update path is useState(subscribe) (e.g. clicking a Cash Flow
    // scenario updates the data but the panel never repaints). Spreading
    // into a fresh object on every emit guarantees each screen sees a
    // new reference and re-renders.
    const snapshot = { ...state };
    listeners.forEach((fn) => {
      try { fn(snapshot); } catch (e) { console.error(e); }
    });
  }

  function setState(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    Object.assign(state, next);
    persist();
    emit();
  }

  let toastId = 1;
  function toast(message, tone = 'success') {
    const id = toastId++;
    state.toasts = [...state.toasts, { id, message, tone }];
    emit();
    setTimeout(() => {
      state.toasts = state.toasts.filter((t) => t.id !== id);
      emit();
    }, 3200);
  }

  function findUser(email) {
    const needle = (email || '').trim().toLowerCase();
    return state.users.find((u) => u.email.toLowerCase() === needle);
  }

  const Store = {
    getState: () => state,
    setState,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    toast,

    // ---- current user helpers ----
    getCurrentUser() {
      return findUser(state.currentUserEmail) || null;
    },

    // ---- auth actions ----
    /** Validate email + password against the real company user directory. */
    login(email, password) {
      const user = findUser(email);
      if (!user) {
        toast('No account found for that email address', 'danger');
        return { ok: false, error: 'Account not found. Check your email address.' };
      }
      if (user.status === 'Inactive') {
        toast(`${user.name}'s account is inactive`, 'danger');
        return { ok: false, error: 'This account is inactive. Contact your administrator.' };
      }
      if ((password || '') !== user.password) {
        toast('Incorrect password', 'danger');
        return { ok: false, error: 'Incorrect password. Please try again.' };
      }
      setState({ authenticated: true, currentUserEmail: user.email, role: user.permissionRole });
      toast(`Welcome back, ${user.name.split(' ')[0]}`, 'success');
      return { ok: true, user };
    },
    logout() {
      setState({ authenticated: false, currentUserEmail: null });
    },
    /** Admin-only "view as" preview — changes nav/dashboard tier without changing identity. */
    setRole(role) {
      setState({ role });
      const label = { finance: 'Finance Manager', approver: 'Approver', employee: 'Employee', admin: 'Administrator' }[role] || role;
      toast(`Previewing as ${label}`, 'info');
    },
    toggleNotif() {
      setState({ notifOpen: !state.notifOpen });
    },
    closeNotif() {
      if (state.notifOpen) setState({ notifOpen: false });
    },
    markAllNotifsRead() {
      setState({ notifications: state.notifications.map((n) => ({ ...n, unread: false })) });
    },
    pendingApprovalsCount() {
      return state.approvals.filter((a) => a.status === 'pending').length;
    },
    /* Reject / request-changes REQUIRE a note — an audit-trail rule:
       a decision that sends work back to the requester must explain
       why, both for the requester and for anyone reviewing the trail
       later. Approve does not require a note (silent approval of a
       compliant request is a normal, auditable action on its own —
       the decider identity + timestamp below is the audit record). */
    approveItem(id, note) {
      const item = state.approvals.find((a) => a.id === id);
      const decider = Store.getCurrentUser();
      setState({ approvals: state.approvals.map((a) => (a.id === id ? {
        ...a, status: 'approved', note,
        decidedBy: decider ? decider.name : null,
        decidedByEmail: decider ? decider.email : null,
        decidedAt: new Date().toISOString(),
      } : a)) });
      if (item) toast(`Approved: ${item.title}`, 'success');
      return { ok: true };
    },
    rejectItem(id, note) {
      if (!(note || '').trim()) {
        toast('A note is required when rejecting an item — explain why for the audit trail', 'danger');
        return { ok: false, error: 'Note required' };
      }
      const item = state.approvals.find((a) => a.id === id);
      const decider = Store.getCurrentUser();
      setState({ approvals: state.approvals.map((a) => (a.id === id ? {
        ...a, status: 'rejected', note,
        decidedBy: decider ? decider.name : null,
        decidedByEmail: decider ? decider.email : null,
        decidedAt: new Date().toISOString(),
      } : a)) });
      if (item) toast(`Rejected: ${item.title}`, 'danger');
      return { ok: true };
    },
    requestChanges(id, note) {
      if (!(note || '').trim()) {
        toast('A note is required when requesting changes — tell the requester what to fix', 'danger');
        return { ok: false, error: 'Note required' };
      }
      const item = state.approvals.find((a) => a.id === id);
      const decider = Store.getCurrentUser();
      setState({ approvals: state.approvals.map((a) => (a.id === id ? {
        ...a, status: 'changes_requested', note,
        decidedBy: decider ? decider.name : null,
        decidedByEmail: decider ? decider.email : null,
        decidedAt: new Date().toISOString(),
      } : a)) });
      if (item) toast(`Requested changes: ${item.title}`, 'warning');
      return { ok: true };
    },
    deleteApproval(id) {
      const item = state.approvals.find((a) => a.id === id);
      setState({ approvals: state.approvals.filter((a) => a.id !== id) });
      if (item) toast(`Withdrawn: ${item.title}`, 'warning');
    },

    // ---- expenses ----
    addExpense(exp) {
      const id = 'EXP-' + Math.floor(2200 + Math.random() * 90);
      const record = { id, status: 'pending', when: 'Just now', ...exp };
      setState({ expenses: [record, ...state.expenses] });
      toast(`Expense ${exp.draft ? 'saved as draft' : 'submitted'}: ${id}`, 'success');
      return record;
    },
    updateExpense(id, patch) {
      setState({ expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
      toast(`Expense ${id} updated`, 'success');
    },
    deleteExpense(id) {
      setState({ expenses: state.expenses.filter((e) => e.id !== id) });
      toast(`Expense ${id} deleted`, 'warning');
    },

    // ---- budgets ----
    addBudget(b) {
      const id = 'BUD-' + Math.floor(2700 + Math.random() * 90);
      const record = { id, spent: 0, status: 'draft', ...b };
      setState({ budgets: [record, ...state.budgets] });
      toast(`Budget created: ${id}`, 'success');
      return record;
    },
    updateBudget(id, patch) {
      setState({ budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
      toast(`Budget ${id} updated`, 'success');
    },
    deleteBudget(id) {
      setState({ budgets: state.budgets.filter((b) => b.id !== id) });
      toast(`Budget ${id} deleted`, 'warning');
    },
    archiveBudget(id) {
      const b = state.budgets.find((x) => x.id === id);
      setState({ budgets: state.budgets.map((x) => (x.id === id ? { ...x, status: 'archived' } : x)) });
      if (b) toast(`Budget archived: ${b.name} (${id})`, 'warning');
    },
    unarchiveBudget(id) {
      const b = state.budgets.find((x) => x.id === id);
      setState({ budgets: state.budgets.map((x) => (x.id === id ? { ...x, status: 'active' } : x)) });
      if (b) toast(`Budget restored to Active: ${b.name} (${id})`, 'success');
    },

    // ---- reconciliation module ----
    reconSources() { return RECON_SOURCES; },
    reconStatuses() { return RECON_STATUSES; },
    addReconItem(item) {
      const id = 'RC-' + Math.floor(2000 + Math.random() * 8000);
      const record = { id, status: 'Potential match', linkedExpenseId: null, reviewer: null, reviewedAt: null, note: '', ...item };
      setState({ reconciliations: [record, ...state.reconciliations] });
      toast(`Reconciliation item added: ${id}`, 'success');
      return record;
    },
    updateReconItem(id, patch) {
      setState({ reconciliations: state.reconciliations.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
    },
    setReconStatus(id, status, reviewer) {
      const item = state.reconciliations.find((r) => r.id === id);
      const isResolved = status === 'Matched' || status === 'Reviewed';
      setState({
        reconciliations: state.reconciliations.map((r) => (r.id === id ? {
          ...r, status,
          reviewer: isResolved ? (reviewer || (window.Store.getCurrentUser() || {}).name || r.reviewer) : r.reviewer,
          reviewedAt: isResolved ? window.Store.today().toISOString().slice(0, 10) : r.reviewedAt,
        } : r)),
      });
      if (item) toast(`${item.description} → ${status}`, isResolved ? 'success' : 'info');
    },
    deleteReconItem(id) {
      const item = state.reconciliations.find((r) => r.id === id);
      setState({ reconciliations: state.reconciliations.filter((r) => r.id !== id) });
      if (item) toast(`Reconciliation item removed: ${id}`, 'warning');
    },
    // Summary used by the Dashboard banner / Director's Report — a
    // single source of truth for "is Arsela's data actually reconciled".
    reconSummary() {
      const items = state.reconciliations;
      const resolved = items.filter((r) => r.status === 'Matched' || r.status === 'Reviewed');
      const outstanding = items.filter((r) => r.status !== 'Matched' && r.status !== 'Reviewed');
      const latestReviewed = items.reduce((latest, r) => (r.reviewedAt && (!latest || r.reviewedAt > latest)) ? r.reviewedAt : latest, null);
      return {
        total: items.length,
        resolved: resolved.length,
        outstanding: outstanding.length,
        outstandingValue: outstanding.reduce((a, r) => a + (r.amount || 0), 0),
        pctResolved: items.length ? (resolved.length / items.length) * 100 : 100,
        latestReviewed,
        bySource: RECON_SOURCES.map((source) => {
          const rows = items.filter((r) => r.source === source);
          const rowsResolved = rows.filter((r) => r.status === 'Matched' || r.status === 'Reviewed');
          return { source, total: rows.length, resolved: rowsResolved.length, outstanding: rows.length - rowsResolved.length };
        }),
      };
    },

    // ---- Xero multi-report imports (2026-08-19) ----
    // Config: the 8 report types the client wants to import from Xero,
    // shared by the Data Imports screen and any contextual shortcuts.
    xeroReportTypes() { return XERO_REPORT_TYPES; },
    /** Generic add — stores a new dated snapshot for the given report
     *  type (newest first). `type` is one of XERO_REPORT_TYPES[].key. */
    addXeroImport(type, record) {
      if (!state[type]) { console.error('Unknown Xero import type', type); return null; }
      const id = type.toUpperCase().slice(0, 3) + '-' + Date.now();
      const full = { id, importedAt: window.Store.today().toISOString(), ...record };
      setState({ [type]: [full, ...state[type]] });
      const label = (XERO_REPORT_TYPES.find((t) => t.key === type) || {}).label || type;
      toast(`${label} imported: ${record.period || id}`, 'success');
      return full;
    },
    deleteXeroImport(type, id) {
      if (!state[type]) return;
      setState({ [type]: state[type].filter((r) => r.id !== id) });
      toast('Import removed', 'warning');
    },
    /** Most recent snapshot for a report type, or null. */
    latestXeroImport(type) {
      const arr = state[type];
      return arr && arr.length ? arr[0] : null;
    },
    /** Snapshot immediately before the latest one (for "compare to
     *  previous month-end" — used by Balance Sheet). */
    priorXeroImport(type) {
      const arr = state[type];
      return arr && arr.length > 1 ? arr[1] : null;
    },

    // ---- supporting documents outside Xero (metadata only — see
    // seedSupportingDocuments comment; no raw file bytes persisted) ----
    addSupportingDocument(doc) {
      const id = 'DOC-' + Date.now();
      const currentUser = Store.getCurrentUser();
      const record = { id, addedAt: window.Store.today().toISOString(), addedBy: currentUser ? currentUser.name : null, ...doc };
      setState({ supportingDocuments: [record, ...state.supportingDocuments] });
      toast(`Document logged: ${doc.name}`, 'success');
      return record;
    },
    deleteSupportingDocument(id) {
      setState({ supportingDocuments: state.supportingDocuments.filter((d) => d.id !== id) });
      toast('Document removed', 'warning');
    },

    // ---- taxonomy management: departments / categories / budget codes ----
    addDepartment(name) {
      const v = (name || '').trim();
      if (!v) return;
      if (state.departments.includes(v)) { toast('That department already exists', 'danger'); return; }
      setState({ departments: [...state.departments, v] });
      toast(`Department added: ${v}`, 'success');
    },
    renameDepartment(oldName, newName) {
      const v = (newName || '').trim();
      if (!v || v === oldName) return;
      setState({
        departments: state.departments.map((d) => (d === oldName ? v : d)),
        budgets: state.budgets.map((b) => (b.dept === oldName ? { ...b, dept: v } : b)),
        expenses: state.expenses.map((e) => (e.dept === oldName ? { ...e, dept: v } : e)),
      });
      toast(`Department renamed to ${v}`, 'success');
    },
    deleteDepartment(name) {
      setState({ departments: state.departments.filter((d) => d !== name) });
      toast(`Department removed: ${name}`, 'warning');
    },
    addCategory(name) {
      const v = (name || '').trim();
      if (!v) return;
      if (state.categories.includes(v)) { toast('That category already exists', 'danger'); return; }
      setState({ categories: [...state.categories, v] });
      toast(`Category added: ${v}`, 'success');
    },
    renameCategory(oldName, newName) {
      const v = (newName || '').trim();
      if (!v || v === oldName) return;
      setState({
        categories: state.categories.map((c) => (c === oldName ? v : c)),
        expenses: state.expenses.map((e) => (e.category === oldName ? { ...e, category: v } : e)),
      });
      toast(`Category renamed to ${v}`, 'success');
    },
    deleteCategory(name) {
      setState({ categories: state.categories.filter((c) => c !== name) });
      toast(`Category removed: ${name}`, 'warning');
    },
    // ---- Monthly Monitoring OPEX category CRUD (add/edit/delete/archive) ----
    addOpexCategory({ name, plan, actual }) {
      const v = (name || '').trim();
      if (!v) { toast('Enter a category name', 'danger'); return; }
      const rec = { id: 'OPX-' + Date.now(), name: v, plan: Number(plan) || 0, actual: Number(actual) || 0, archived: false };
      setState({ opexCategories: [...state.opexCategories, rec] });
      toast(`OPEX category added: ${v}`, 'success');
      return rec;
    },
    updateOpexCategory(id, patch) {
      setState({ opexCategories: state.opexCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
      toast('OPEX category updated', 'success');
    },
    deleteOpexCategory(id) {
      const c = state.opexCategories.find((x) => x.id === id);
      setState({ opexCategories: state.opexCategories.filter((x) => x.id !== id) });
      if (c) toast(`OPEX category removed: ${c.name}`, 'warning');
    },
    archiveOpexCategory(id, archived = true) {
      const c = state.opexCategories.find((x) => x.id === id);
      setState({ opexCategories: state.opexCategories.map((x) => (x.id === id ? { ...x, archived } : x)) });
      if (c) toast(`${c.name} ${archived ? 'archived' : 'restored'}`, 'info');
    },
    addBudgetCode(prefix) {
      const v = (prefix || '').trim().toUpperCase();
      if (!v) return;
      if (state.budgetCodes.includes(v)) { toast('That budget code prefix already exists', 'danger'); return; }
      setState({ budgetCodes: [...state.budgetCodes, v] });
      toast(`Budget code prefix added: ${v}`, 'success');
    },
    deleteBudgetCode(prefix) {
      setState({ budgetCodes: state.budgetCodes.filter((c) => c !== prefix) });
      toast(`Budget code prefix removed: ${prefix}`, 'warning');
    },

    // ---- Performance & KPIs balanced scorecard CRUD ----
    addKpi({ perspective, name, owner, target, actual, unit, invert }) {
      const v = (name || '').trim();
      if (!v) { toast('Enter a KPI name', 'danger'); return; }
      const rec = {
        id: 'KPI-' + Date.now(),
        perspective: perspective || 'financial',
        name: v,
        owner: owner || '',
        target: Number(target) || 0,
        actual: Number(actual) || 0,
        unit: unit || 'number',
        invert: !!invert,
        trend: [Number(actual) || 0],
      };
      setState({ kpis: [...state.kpis, rec] });
      toast(`KPI added: ${v}`, 'success');
      return rec;
    },
    updateKpi(id, patch) {
      setState({ kpis: state.kpis.map((k) => (k.id === id ? { ...k, ...patch } : k)) });
      toast('KPI updated', 'success');
    },
    deleteKpi(id) {
      const k = state.kpis.find((x) => x.id === id);
      setState({ kpis: state.kpis.filter((x) => x.id !== id) });
      if (k) toast(`KPI removed: ${k.name}`, 'warning');
    },

    // ---- scenario comparison (Quarterly panel) ----
    addScenario(s) {
      const id = 'SC-' + Math.floor(100 + Math.random() * 900);
      const record = { id, active: false, c: 'blue', ...s };
      setState({ scenarios: [...state.scenarios, record] });
      toast(`Scenario added: ${record.n}`, 'success');
      return record;
    },
    setActiveScenario(id) {
      const sc = state.scenarios.find((s) => s.id === id);
      setState({ scenarios: state.scenarios.map((s) => ({ ...s, active: s.id === id })) });
      if (sc) toast(`Switched to scenario: ${sc.n}`, 'info');
    },
    deleteScenario(id) {
      setState({ scenarios: state.scenarios.filter((s) => s.id !== id) });
      toast('Scenario removed', 'warning');
    },

    // ---- cash flow scenario planning ----
    addCashFlowScenario(s) {
      const id = 'CFS-' + Math.floor(100 + Math.random() * 900);
      const record = {
        id, active: false, budgetDeltaPct: 0, expenseDeltaPct: 0, revenueDeltaPct: 0, note: '',
        ...s,
      };
      setState({ cashFlowScenarios: [...state.cashFlowScenarios, record] });
      toast(`Scenario added: ${record.n}`, 'success');
      return record;
    },
    updateCashFlowScenario(id, patch) {
      setState({ cashFlowScenarios: state.cashFlowScenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
      toast('Scenario updated', 'success');
    },
    setActiveCashFlowScenario(id) {
      const sc = state.cashFlowScenarios.find((s) => s.id === id);
      setState({ cashFlowScenarios: state.cashFlowScenarios.map((s) => ({ ...s, active: s.id === id })) });
      if (sc) toast(`Cash flow scenario switched: ${sc.n}`, 'info');
    },
    deleteCashFlowScenario(id) {
      const sc = state.cashFlowScenarios.find((s) => s.id === id);
      if (sc && sc.active) {
        toast("Can't delete the active scenario — switch to another first", 'danger');
        return;
      }
      setState({ cashFlowScenarios: state.cashFlowScenarios.filter((s) => s.id !== id) });
      toast('Scenario removed', 'warning');
    },

    // ---- multi-currency ----
    getCurrencyConfig(code) {
      return CURRENCY_CONFIG[code || state.currency] || CURRENCY_CONFIG.MYR;
    },
    listCurrencies() {
      return Object.keys(CURRENCY_CONFIG).map((code) => ({ code, ...CURRENCY_CONFIG[code] }));
    },
    setCurrency(code) {
      if (!CURRENCY_CONFIG[code]) return;
      setState({ currency: code });
      toast(`Display currency set to ${code}`, 'info');
    },
    /** Convert a MYR-denominated amount into the currently selected display currency. */
    convert(amountMYR, code) {
      const cfg = CURRENCY_CONFIG[code || state.currency] || CURRENCY_CONFIG.MYR;
      return (Number(amountMYR) || 0) * cfg.rate;
    },

    // ---- CAPEX ----
    addCapexProject(p) {
      const code = 'CAP-' + Math.floor(2700 + Math.random() * 90);
      const record = { code, committed: 0, spent: 0, stage: 'Approved', ...p };
      setState({ capexProjects: [record, ...state.capexProjects] });
      toast(`CAPEX project created: ${code}`, 'success');
      return record;
    },
    updateCapexProject(code, patch) {
      setState({ capexProjects: state.capexProjects.map((p) => (p.code === code ? { ...p, ...patch } : p)) });
      toast(`${code} updated`, 'success');
    },
    deleteCapexProject(code) {
      setState({ capexProjects: state.capexProjects.filter((p) => p.code !== code) });
      toast(`${code} deleted`, 'warning');
    },

    // ---- user / team management ----
    addUser(u) {
      if (findUser(u.email)) {
        toast('A user with that email already exists', 'danger');
        return null;
      }
      const record = {
        password: DEFAULT_PASSWORD, status: 'Active', avatar: 'blue', dept: 'Corporate',
        permissionRole: 'employee', title: 'Employee', ...u,
      };
      setState({ users: [record, ...state.users] });
      toast(`User added: ${record.name} (${record.email})`, 'success');
      return record;
    },
    updateUser(email, patch) {
      setState({ users: state.users.map((u) => (u.email === email ? { ...u, ...patch } : u)) });
      toast(`User updated: ${email}`, 'success');
    },
    /** Self-service password change for the currently signed-in user. */
    changePassword(currentPassword, newPassword) {
      const user = findUser(state.currentUserEmail);
      if (!user) {
        toast('You must be signed in to change your password', 'danger');
        return { ok: false, error: 'Not signed in.' };
      }
      if ((currentPassword || '') !== user.password) {
        toast('Current password is incorrect', 'danger');
        return { ok: false, error: 'Current password is incorrect.' };
      }
      if (!newPassword || newPassword.length < 8) {
        toast('New password must be at least 8 characters', 'danger');
        return { ok: false, error: 'New password must be at least 8 characters.' };
      }
      if (newPassword === currentPassword) {
        toast('New password must be different from your current password', 'danger');
        return { ok: false, error: 'New password must be different from your current password.' };
      }
      setState({ users: state.users.map((u) => (u.email === user.email ? { ...u, password: newPassword } : u)) });
      toast('Password changed successfully', 'success');
      return { ok: true };
    },
    deleteUser(email) {
      if (email === state.currentUserEmail) {
        toast("You can't delete the account you're currently signed in with", 'danger');
        return;
      }
      setState({ users: state.users.filter((u) => u.email !== email) });
      toast(`User removed: ${email}`, 'warning');
    },
    toggleUserStatus(email) {
      const u = findUser(email);
      if (!u) return;
      const nextStatus = u.status === 'Active' ? 'Inactive' : 'Active';
      setState({ users: state.users.map((x) => (x.email === email ? { ...x, status: nextStatus } : x)) });
      toast(`${u.name} ${nextStatus === 'Active' ? 'activated' : 'deactivated'}`, nextStatus === 'Active' ? 'success' : 'warning');
    },

    // ---- live notification bell — pushed to by real actions across the
    // app (approvals, expenses, escalations, threshold breaches) so the
    // bell badge/panel reflects what's actually happening, not just the
    // static seed list. ----
    addNotification({ icon = '↺', tone = 'info', title, detail }) {
      const n = { id: 'N' + Date.now() + Math.floor(Math.random() * 999), i: icon, tone, t: title, d: detail || '', when: 'Just now', unread: true };
      setState({ notifications: [n, ...state.notifications] });
    },

    // ---- current reporting period (quarter/month picker on Dashboard) ----
    setPeriod(period) {
      setState({ period });
      toast(`Period set to ${period}`, 'info');
    },

    // ---- fiscal-year helpers (single source of truth — Arsela's FY
    // starts 1 July). Every screen should call these instead of
    // hardcoding FY/quarter labels or calendar-year assumptions. ----
    today: () => APP_TODAY,
    fyYearOf,
    fyQuarterOf,
    fyStartDate,
    fyEndDate,
    fyProgressPctOf,
    fyQuarterLabel,
    fyLabel,
    /** Fraction (0-1) of the CURRENT fiscal year elapsed, as of APP_TODAY. */
    fyProgressPct: () => fyProgressPctOf(APP_TODAY),
  };

  window.Store = Store;
})();
