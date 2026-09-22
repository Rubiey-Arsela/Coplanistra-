/* ============================================================
   ApexFin — global app store (plain JS, framework-agnostic)
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
     starts 1 July (not 1 January). All FY/quarter/period labels
     across the app must be derived from these helpers — never
     hardcoded — so a future change to the FY start month only
     needs to change it here.

     "Today" reference (client ask, 2026-08-30): previously pinned
     to a fixed demo date (22 Jul 2026) that silently went stale as
     real time passed it by (surfaced as "As at 22 July 2026" on
     imported Balance Sheet/Trial Balance cards while the real date
     was already 30 Aug 2026). Now reads the real device clock via
     a function (not a constant captured once at module load) so
     every call to Store.today() reflects the actual current date,
     including across a long-lived session that spans midnight.
     ---------------------------------------------------------- */
  const FY_START_MONTH = 6; // 0-indexed: June -> FY starts 1 July
  const APP_TODAY = () => new Date(); // live system date — see note above

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

  /** Turn a Xero import snapshot's free-text `period` label (e.g.
   *  "August 2026", "As at 31 Aug 2026", "As of 30/06/2026", or a
   *  multi-period column label like "Jul-25" from the split-import
   *  flow — see detectPeriodColumns in primitives.js) or its reliable
   *  `importedAt` ISO timestamp into a sortable "YYYY-MM" key.
   *  `period` is a free-editable text field (see DataImportsScreen's
   *  defaultPeriodFor), so it is NOT trusted blindly: the short "Mon-YY"
   *  / "Mon YY" form is checked FIRST (native `new Date('Jul-25')` does
   *  NOT fail — it silently misreads '25' as a DAY rather than a
   *  2-digit year, landing on some unrelated default year — confirmed
   *  via an end-to-end test that a multi-period P&L split-import with
   *  "Jul-25"/"Aug-25"/"Sep-25" column labels produced garbage months
   *  until this ordering was fixed), then the general date parser
   *  (stripping a leading "As at "/"As of "), and only falls back to
   *  `importedAt` if neither yields a usable date at all (e.g. "Q1
   *  FY2027", "Current month and FY-to-date" -> Invalid Date). Returns
   *  null only if nothing at all is usable. */
  function monthKeyOf(period, importedAt) {
    const toKey = (d) => (d && !isNaN(d.getTime())) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null;
    if (period && typeof period === 'string') {
      const cleaned = period.trim().replace(/^as\s+(at|of)\s+/i, '');
      const shortForm = cleaned.match(/^([A-Za-z]{3,9})[\s\-\/]+(\d{2,4})$/);
      if (shortForm) {
        const yr = shortForm[2].length === 2 ? '20' + shortForm[2] : shortForm[2];
        const key = toKey(new Date(`${shortForm[1]} 1, ${yr}`));
        if (key) return key;
      }
      const key = toKey(new Date(cleaned));
      if (key) return key;
    }
    return toKey(importedAt ? new Date(importedAt) : null);
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
     Xero multi-report imports (2026-08-19). ApexFin has no
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
    { key: 'trialBalance', label: 'Trial Balance', settings: 'As at month-end', purpose: 'Control check that ApexFin totals agree with Xero' },
    { key: 'agedReceivables', label: 'Aged Receivables Detail', settings: 'As at month-end', purpose: 'Customer amounts outstanding and expected cash receipts' },
    { key: 'agedPayables', label: 'Aged Payables Detail', settings: 'As at month-end', purpose: 'Supplier amounts due and upcoming cash payments' },
    // Added 2026-09-21 (client ask: Director's Report PDF must include
    // a "Statement of Changes in Equity" page comparing this-year-to-
    // date vs last year) — Xero calls this report "Movement in Equity".
    { key: 'equityMovement', label: 'Statement of Changes in Equity', settings: 'FY-to-date · compare with same period last year', purpose: 'Opening equity, profit for the period, contributions/distributions, closing equity' },
    // Added 2026-09-22 (client ask: "I want to import management
    // reports as well") — Xero's combined "Management Report" pack
    // includes two sheets with no home in the 11 types above: a
    // fixed-list KPI dashboard (Executive Summary) and a cash-movement
    // breakdown (Cash Summary). The pack's own Profit and Loss/Balance
    // Sheet sheets reuse the existing profitAndLoss/balanceSheet cards
    // via sheetHints (see DataImportsScreen.js REPORT_SCHEMAS) rather
    // than needing new types of their own.
    { key: 'executiveSummary', label: 'Executive Summary', settings: 'Current month · compare with previous periods', purpose: 'Cash, profitability, balance sheet, sales and performance KPIs in one dashboard' },
    { key: 'cashSummary', label: 'Cash Summary', settings: 'Current month', purpose: 'Cash movement breakdown \u2014 expenses, other cash movements, opening/closing balance' },
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
  const seedEquityMovement = [];
  const seedExecutiveSummary = [];
  const seedCashSummary = [];
  // "Documents outside Xero" — generic supporting-document register
  // (bank statements, facility/loan agreements, board resolutions, audit
  // letters, etc). No Cloudflare R2 bucket is wired up (static Pages
  // hosting) so raw file bytes are stored as a base64 data URL directly
  // inside this record (persisted to localStorage like everything else
  // in this store) rather than server-side — capped client-side at 5MB
  // per file so the register doesn't blow past the browser's per-origin
  // storage quota. This is disclosed in the UI upload dialog.
  //
  // Each record is a VERSIONED document group (added 2026-09-22, client
  // ask: "when I import another document, please keep all version. if
  // figure is similar, keep one. if figure changes, keep the updated
  // figure"): { id, name, versions: [ {versionId, category, date, note,
  // amount, fileName, fileType, fileDataUrl, importedAt, addedBy}, ... ]
  // } with versions newest-first — versions[0] is always "current" for
  // display/reconciliation. See normalizeDocument() below for the
  // migration that lifts any pre-existing flat (non-versioned) record
  // persisted before this change into the same shape.
  const seedSupportingDocuments = [];
  const DOC_AMOUNT_TOLERANCE = 0.01; // treat as "same figure" within a cent

  /** Back-compat migration: documents persisted before 2026-09-22 are
   *  flat records — { id, name, category, date, note, amount, addedAt,
   *  addedBy }, no file, no versions[]. Lifts any such record into the
   *  new { id, name, versions: [...] } shape (old fields become version
   *  1) so nothing already logged is lost or duplicated when this runs
   *  against previously-persisted state. Already-versioned records pass
   *  through unchanged. */
  function normalizeDocument(doc) {
    if (doc && Array.isArray(doc.versions)) return doc;
    const rest = doc || {};
    return {
      id: rest.id || ('DOC-' + Date.now()),
      name: rest.name || 'Untitled document',
      versions: [{
        versionId: (rest.id || 'V0') + '-v1',
        category: rest.category, date: rest.date, note: rest.note || '',
        amount: rest.amount != null ? rest.amount : null,
        fileName: rest.fileName || null, fileType: rest.fileType || null, fileDataUrl: rest.fileDataUrl || null,
        importedAt: rest.addedAt || new Date().toISOString(), addedBy: rest.addedBy || null,
      }],
    };
  }

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
    equityMovement: seedEquityMovement,
    executiveSummary: seedExecutiveSummary,
    cashSummary: seedCashSummary,
    supportingDocuments: seedSupportingDocuments,
    // Arsela Resources' reporting currency is AUD; MYR remains available
    // as a display option via the currency switcher (CURRENCY_CONFIG
    // below) but is no longer the default.
    currency: 'AUD',
    period: fyQuarterLabel(APP_TODAY()),
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
  if (!state.equityMovement) state.equityMovement = seedEquityMovement;
  if (!state.executiveSummary) state.executiveSummary = seedExecutiveSummary;
  if (!state.cashSummary) state.cashSummary = seedCashSummary;
  if (!state.supportingDocuments) state.supportingDocuments = seedSupportingDocuments;
  // Migrate any documents persisted before the 2026-09-22 versioning
  // change (flat records) into the new { id, name, versions: [...] }
  // shape so history/View/re-upload logic can assume versions[] always
  // exists.
  state.supportingDocuments = state.supportingDocuments.map(normalizeDocument);
  if (!state.currency) state.currency = 'AUD';
  // Force-correct the period label to the live current date on every
  // load (Arsela's FY starts 1 Jul, so this always reflects today's
  // real fiscal quarter rather than a stale persisted/hardcoded one).
  state.period = fyQuarterLabel(APP_TODAY());

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
    /** ---- Director's Report month selection (2026-09-21 client ask:
     *  "director report - should be able to select by month"). Every
     *  Xero import snapshot already carries a free-text `period` label
     *  (e.g. "August 2026", "As at 31 Aug 2026") plus a reliable
     *  `importedAt` timestamp — monthKeyOf() turns either into a sortable
     *  "YYYY-MM" key so a report month can be matched against whichever
     *  snapshot actually covers it, across all 10 report types. */
    monthKeyOf,
    /** Every month that has at least one Xero import across any report
     *  type, newest first, plus the current real month so the selector
     *  is never empty before anything has been imported. Each entry is
     *  { key: 'YYYY-MM', label: 'August 2026' }. */
    xeroImportMonths() {
      const keys = new Set();
      XERO_REPORT_TYPES.forEach((t) => {
        (state[t.key] || []).forEach((rec) => {
          const k = monthKeyOf(rec.period, rec.importedAt);
          if (k) keys.add(k);
        });
      });
      const now = APP_TODAY();
      keys.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      return Array.from(keys).sort().reverse().map((key) => {
        const [y, m] = key.split('-').map(Number);
        return { key, label: new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) };
      });
    },
    /** The best snapshot for a report type for a given "YYYY-MM" report
     *  month: an exact month match if one exists (isExactMonth: true),
     *  else the most recent snapshot AT OR BEFORE that month (carried
     *  forward, isExactMonth: false — e.g. viewing September with only
     *  an August import still shows August's real figures rather than
     *  nothing), else null if no snapshot exists that early at all. */
    xeroImportForMonth(type, monthKey) {
      const arr = state[type];
      if (!arr || !arr.length || !monthKey) return null;
      const withKeys = arr.map((rec) => ({ rec, key: monthKeyOf(rec.period, rec.importedAt) }));
      const exact = withKeys.find((x) => x.key === monthKey);
      if (exact) return { ...exact.rec, isExactMonth: true };
      const candidates = withKeys.filter((x) => x.key && x.key <= monthKey);
      candidates.sort((a, b) => (a.key !== b.key ? b.key.localeCompare(a.key) : new Date(b.rec.importedAt) - new Date(a.rec.importedAt)));
      return candidates.length ? { ...candidates[0].rec, isExactMonth: false } : null;
    },
    /** ---- Year-over-year lookup (2026-09-21 client ask: Director's
     *  Report PDF pages need "this year up to [month] vs LAST YEAR's
     *  figure" — a full 12-month-back comparison that `priorXeroImport`
     *  (immediately-preceding snapshot) and `balanceSheet`'s own `prior`
     *  field (prior MONTH-end) cannot supply. This assumes the client
     *  has imported the same month a year ago as its own dated Xero
     *  snapshot (e.g. imported "August 2025" P&L the same way "August
     *  2026" was imported) — there is no other source for a genuine
     *  same-period-last-year figure in this app. `monthKey` is the
     *  report month currently selected ("YYYY-MM"); this shifts it back
     *  12 months and reuses the same exact-or-carried-forward matching
     *  as `xeroImportForMonth`, so a close-but-not-exact prior-year
     *  snapshot (e.g. only "July 2025" on file when viewing "August
     *  2026") still surfaces rather than showing nothing. Returns null
     *  if no snapshot exists that far back at all. */
    xeroImportForYearAgo(type, monthKey) {
      if (!monthKey) return null;
      const [y, m] = monthKey.split('-').map(Number);
      if (!y || !m) return null;
      const yearAgoKey = `${y - 1}-${String(m).padStart(2, '0')}`;
      return Store.xeroImportForMonth(type, yearAgoKey);
    },

    // ---- supporting documents outside Xero (metadata only — see
    // seedSupportingDocuments comment; no raw file bytes persisted).
    // `amount` (2026-09-21 client ask: "make sure supporting docs
    // uploaded is reconciled with the figure in xero") is OPTIONAL —
    // older records logged before this field existed simply have no
    // amount and are treated as "not yet checked" rather than
    // "unmatched", see reconcileSupportingDocuments() below. ----
    /** Logs a document, or — if a document with the same name (trimmed,
     *  case-insensitive) already exists — treats this as a RE-UPLOAD of
     *  that same logical document (2026-09-22 client ask: "when I import
     *  another document, please keep all version. if figure is similar,
     *  keep one. if figure changes, keep the updated figure"):
     *   - no matching document yet -> creates a new group, version 1.
     *   - matching document, new amount within DOC_AMOUNT_TOLERANCE of
     *     the current version's amount (or both null/blank) -> collapses
     *     to the existing version: no duplicate entry is added, but the
     *     file/date/note on that version are refreshed with whatever was
     *     just uploaded (so re-attaching a clearer scan of the same
     *     figure still updates the file behind the View button).
     *   - matching document, amount differs -> pushes a NEW version onto
     *     the front of versions[] (so it becomes "current" for display
     *     and reconciliation) while every prior version is kept in
     *     history, unmodified.
     *  `doc` accepts: name, category, date, note, amount, and optionally
     *  fileName/fileType/fileDataUrl (the base64 data URL read from the
     *  picked file — see AddDocumentModal's readFileAsDataUrl). Returns
     *  the full updated document GROUP (not just the version). */
    addSupportingDocument(doc) {
      const currentUser = Store.getCurrentUser();
      const nowIso = window.Store.today().toISOString();
      const matchKey = String(doc.name || '').trim().toLowerCase();
      const existingIdx = state.supportingDocuments.findIndex((d) => String(d.name || '').trim().toLowerCase() === matchKey);
      const newAmount = doc.amount === '' || doc.amount == null ? null : Number(doc.amount);
      const versionPayload = {
        category: doc.category, date: doc.date, note: doc.note || '',
        amount: newAmount,
        fileName: doc.fileName || null, fileType: doc.fileType || null, fileDataUrl: doc.fileDataUrl || null,
        importedAt: nowIso, addedBy: currentUser ? currentUser.name : null,
      };
      if (existingIdx === -1) {
        const group = { id: 'DOC-' + Date.now(), name: doc.name, versions: [{ versionId: 'V' + Date.now(), ...versionPayload }] };
        setState({ supportingDocuments: [group, ...state.supportingDocuments] });
        toast(`Document logged: ${doc.name}`, 'success');
        return group;
      }
      const existing = state.supportingDocuments[existingIdx];
      const current = existing.versions[0];
      const currentAmount = current.amount == null ? null : Number(current.amount);
      const sameFigure = (currentAmount == null && newAmount == null) || (currentAmount != null && newAmount != null && Math.abs(currentAmount - newAmount) <= DOC_AMOUNT_TOLERANCE);
      let updatedGroup;
      if (sameFigure) {
        // Same figure as the current version — collapse into it instead
        // of logging a duplicate, but still refresh the file/date/note
        // in case a better copy of the same document was re-uploaded.
        const mergedCurrent = {
          ...current,
          date: doc.date || current.date, note: doc.note || current.note,
          fileName: doc.fileName || current.fileName, fileType: doc.fileType || current.fileType, fileDataUrl: doc.fileDataUrl || current.fileDataUrl,
          importedAt: nowIso, addedBy: currentUser ? currentUser.name : current.addedBy,
        };
        updatedGroup = { ...existing, versions: [mergedCurrent, ...existing.versions.slice(1)] };
        toast(`Same figure as before \u2014 kept one version of "${doc.name}"`, 'info');
      } else {
        // Figure changed since the last version — keep the old version
        // in history and make this new upload the current one.
        updatedGroup = { ...existing, versions: [{ versionId: 'V' + Date.now(), ...versionPayload }, ...existing.versions] };
        toast(`New version logged \u2014 figure updated for "${doc.name}" (${existing.versions.length + 1} versions on file)`, 'success');
      }
      const nextDocs = state.supportingDocuments.slice();
      nextDocs[existingIdx] = updatedGroup;
      setState({ supportingDocuments: nextDocs });
      return updatedGroup;
    },
    /** Removes an entire document group (all versions). */
    deleteSupportingDocument(id) {
      setState({ supportingDocuments: state.supportingDocuments.filter((d) => d.id !== id) });
      toast('Document removed', 'warning');
    },
    /** Removes a single version from a document's history. If the
     *  version removed was the current (versions[0]) one, the next
     *  newest version automatically becomes current. Removing the last
     *  remaining version removes the whole group. */
    deleteSupportingDocumentVersion(docId, versionId) {
      const doc = state.supportingDocuments.find((d) => d.id === docId);
      if (!doc) return;
      const remaining = doc.versions.filter((v) => v.versionId !== versionId);
      if (remaining.length === 0) {
        setState({ supportingDocuments: state.supportingDocuments.filter((d) => d.id !== docId) });
      } else {
        setState({ supportingDocuments: state.supportingDocuments.map((d) => d.id === docId ? { ...d, versions: remaining } : d) });
      }
      toast('Version removed', 'warning');
    },
    /** ---- Supporting-document ↔ Xero reconciliation (2026-09-21
     *  client ask: "make sure supporting docs uploaded is reconciled
     *  with the figure in xero"). Scans every transaction-level row
     *  across every dated snapshot of the three Xero import types that
     *  actually carry individual transaction amounts — Account
     *  Transactions, General Ledger Detail, Bank Reconciliation
     *  (Account Transactions/General Ledger use separate debit/credit
     *  columns rather than one signed amount, so both are summed to a
     *  single comparable magnitude per row) — and looks for one whose
     *  amount is within `AMOUNT_TOLERANCE` of the document's logged
     *  amount, optionally also requiring the dates to be close (this
     *  is a fuzzy support-level check, not a strict ledger match, since
     *  a document date and the Xero posting date are not always the
     *  same day). Returns one status per document:
     *    'unchecked'  — the document has no amount logged yet (older
     *                   records, or the user chose not to enter one)
     *    'matched'    — at least one Xero transaction within tolerance
     *                   was found (closest match returned as `match`)
     *    'unmatched'  — an amount was logged but nothing in any Xero
     *                   import lines up with it
     *  This is intentionally read-only / non-destructive — it never
     *  changes stored data, only annotates documents for display in
     *  SupportingDocumentsSection. */
    reconcileSupportingDocuments() {
      const AMOUNT_TOLERANCE = 0.5; // cents-level rounding slack only
      const candidates = [];
      ['accountTransactions', 'generalLedger', 'bankReconciliation'].forEach((type) => {
        (state[type] || []).forEach((snapshot) => {
          (snapshot.rows || []).forEach((r) => {
            let amount = null;
            if (type === 'bankReconciliation') amount = Number(r.amount) || 0;
            else amount = (Number(r.debit) || 0) || (Number(r.credit) || 0);
            if (!amount) return;
            candidates.push({
              type, period: snapshot.period, date: r.date || snapshot.period,
              description: r.description || r.account || '', amount: Math.abs(amount),
            });
          });
        });
      });
      const parseDoc = (v) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
      // NOTE (2026-09-22 versioning change): each document is now a
      // { id, name, versions: [...] } group — reconciliation checks the
      // CURRENT version (versions[0]) and flattens its fields onto the
      // returned object (category/date/note/amount/fileName/etc) so
      // existing UI code that reads doc.amount/doc.category/etc keeps
      // working unchanged; doc.versions (full history) is also passed
      // through for the version-history UI.
      return state.supportingDocuments.map((group) => {
        const current = group.versions[0];
        const doc = { ...group, ...current };
        const docAmount = Number(doc.amount);
        if (doc.amount == null || isNaN(docAmount) || docAmount === 0) {
          return { ...doc, reconcileStatus: 'unchecked', match: null };
        }
        const docDate = parseDoc(doc.date);
        let best = null, bestDateDelta = Infinity;
        candidates.forEach((c) => {
          if (Math.abs(c.amount - Math.abs(docAmount)) > AMOUNT_TOLERANCE) return;
          const cDate = parseDoc(c.date);
          const delta = (docDate && cDate) ? Math.abs(cDate - docDate) : Number.MAX_SAFE_INTEGER;
          if (!best || delta < bestDateDelta) { best = c; bestDateDelta = delta; }
        });
        return { ...doc, reconcileStatus: best ? 'matched' : 'unmatched', match: best };
      });
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
    today: () => APP_TODAY(),
    fyYearOf,
    fyQuarterOf,
    fyStartDate,
    fyEndDate,
    fyProgressPctOf,
    fyQuarterLabel,
    fyLabel,
    /** Fraction (0-1) of the CURRENT fiscal year elapsed, as of today's real date. */
    fyProgressPct: () => fyProgressPctOf(APP_TODAY()),
  };

  window.Store = Store;
})();
