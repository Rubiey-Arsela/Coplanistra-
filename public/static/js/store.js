/* ============================================================
   Coplanistra — global app store (plain JS, framework-agnostic)
   Central source of truth so users/role, notifications, budgets,
   approvals, expenses and CAPEX stay in sync across every screen.
   ============================================================ */

(function () {
  // Bumped to v2: this version introduces the reconciliation-aware
  // financial data model (basis-labeled Budgets/Expenses/CAPEX fields,
  // FY2027-based periods, AUD default currency). Any state persisted
  // under the old v1 schema is deliberately NOT migrated in place —
  // it's discarded so every session starts from the corrected seed
  // data rather than mixing old and new field shapes.
  const LS_KEY = 'coplanistra_state_v2';

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
  const seedBudgets = [
    { id: 'BUD-2601', name: 'Port Klang Terminal Ops', owner: 'Faris Hamzah', dept: 'Ports & Logistics', period: 'FY2027', allocated: 42_000_000, spent: 31_640_000, committed: 3_800_000, forecastFinal: 41_100_000, status: 'active', capex: false, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2602', name: 'Fleet Maintenance & Renewal', owner: 'Faris Hamzah', dept: 'Ports & Logistics', period: 'FY2027', allocated: 18_500_000, spent: 19_820_000, committed: 620_000, forecastFinal: 20_900_000, status: 'over', capex: false, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2603', name: 'Digital Core Platform', owner: 'Marcus Lim', dept: 'Digital & Data', period: 'FY2027', allocated: 12_600_000, spent: 11_420_000, committed: 540_000, forecastFinal: 12_800_000, status: 'active', capex: false, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2604', name: 'Cyberjaya Data Centre Node', owner: 'Marcus Lim', dept: 'Digital & Data', period: 'FY2027', allocated: 28_400_000, spent: 14_620_000, committed: 9_200_000, forecastFinal: 27_600_000, status: 'active', capex: true, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2605', name: 'Talent & Culture Programme', owner: 'Priya Nair', dept: 'People & Culture', period: 'FY2027', allocated: 18_900_000, spent: 19_280_000, committed: 0, forecastFinal: 19_280_000, status: 'amendment', capex: false, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2606', name: 'Solar Farm — Northern Phase II', owner: 'Zara Mahmood', dept: 'Energy & Assets', period: 'FY2027', allocated: 88_500_000, spent: 18_400_000, committed: 26_400_000, forecastFinal: 86_100_000, status: 'active', capex: true, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2607', name: 'Cold Chain Facility — Central', owner: 'Nurul Ain', dept: 'Property', period: 'FY2027', allocated: 38_600_000, spent: 0, committed: 4_200_000, forecastFinal: 36_800_000, status: 'draft', capex: true, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2608', name: 'MRO Line Checks — Fleet', owner: 'Iman Salleh', dept: 'Aviation', period: 'FY2027', allocated: 22_400_000, spent: 23_760_000, committed: 180_000, forecastFinal: 24_100_000, status: 'over', capex: false, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2609', name: 'CSR & Sustainability Fund', owner: 'Nadia Yeoh', dept: 'Sustainability', period: 'FY2027', allocated: 6_000_000, spent: 6_420_000, committed: 0, forecastFinal: 6_420_000, status: 'active', capex: false, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
    { id: 'BUD-2610', name: 'Corporate IT & ERP', owner: 'Admin Arsela', dept: 'Corporate', period: 'FY2027', allocated: 28_400_000, spent: 22_140_000, committed: 1_900_000, forecastFinal: 27_800_000, status: 'active', capex: false, actualSource: 'Xero — Arsela Resources Sdn Bhd', actualsThrough: '2026-07-18', reconciled: true },
  ];

  const seedApprovals = [
    { id: 'AP-9001', type: 'Expense', urgent: true, title: 'Fleet servicing — Port Klang yard', requester: 'Faris Hamzah', amount: 8_420, when: '3 min ago', dept: 'Ports & Logistics', justification: 'Scheduled maintenance for 4 container handlers ahead of Q3 peak season. Vendor: Sime Darby Motors.', status: 'pending' },
    { id: 'AP-9002', type: 'Budget amendment', urgent: false, title: 'Talent & Culture — reallocation', requester: 'Priya Nair', amount: 900_000, when: '18 min ago', dept: 'People & Culture', justification: 'Training pull-forward from FY27 to cover certification backlog before year end.', status: 'pending' },
    { id: 'AP-9003', type: 'CAPEX sanction', urgent: true, title: 'LNG Storage — Southern Phase I', requester: 'Zara Mahmood', amount: 320_000_000, when: '52 min ago', dept: 'Energy & Assets', justification: 'Board-level sanction required. Feasibility study complete; EPC tender shortlisted.', status: 'pending' },
    { id: 'AP-9004', type: 'Expense', urgent: false, title: 'ERP migration — vendor invoice #4', requester: 'Marcus Lim', amount: 214_500, when: '2 hr ago', dept: 'Digital & Data', justification: 'Milestone 4 of 6 for ERP modernisation programme, per signed SOW.', status: 'pending' },
    { id: 'AP-9005', type: 'Expense', urgent: false, title: 'MRO line-check overrun', requester: 'Iman Salleh', amount: 61_200, when: '4 hr ago', dept: 'Aviation', justification: 'Unplanned line-check volume exceeded plan by 6% this month.', status: 'pending' },
    { id: 'AP-9006', type: 'Budget amendment', urgent: false, title: 'Cold Chain — early mobilisation', requester: 'Nurul Ain', amount: 4_200_000, when: 'Yesterday', dept: 'Property', justification: 'Bring forward site mobilisation to lock in contractor rates before Q4.', status: 'pending' },
    { id: 'AP-9007', type: 'Expense', urgent: false, title: 'CSR — community solar donation', requester: 'Nadia Yeoh', amount: 420_000, when: 'Yesterday', dept: 'Sustainability', justification: 'Matches FY2027 CSR commitment approved at board level in Q1.', status: 'pending' },
  ];

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
  const seedExpenses = [
    { id: 'EXP-2214', desc: 'Fleet servicing — Port Klang yard', amount: 8_420, dept: 'Ports & Logistics', vendor: 'Sime Darby Motors', category: 'Maintenance', status: 'pending', when: '3 min ago',
      approvalStatus: 'pending', xeroStatus: 'not_posted', paymentStatus: 'unpaid', reconciliation: 'unreconciled',
      entity: 'Arsela Resources Sdn Bhd', xeroTxnId: null, invoiceNo: 'INV-SD-4471', gst: 'Standard-rated 6%', paymentAccount: null, paidDate: null, xeroImportDate: null },
    { id: 'EXP-2213', desc: 'Cloud hosting — Q3', amount: 42_180, dept: 'Digital & Data', vendor: 'AWS Malaysia', category: 'IT & Software', status: 'approved', when: 'Yesterday',
      approvalStatus: 'approved', xeroStatus: 'posted', paymentStatus: 'paid', reconciliation: 'reconciled',
      entity: 'Arsela Resources Sdn Bhd', xeroTxnId: 'XERO-BILL-88231', invoiceNo: 'AWS-2607-3391', gst: 'Zero-rated (import services)', paymentAccount: 'Westpac #2077', paidDate: '2026-07-15', xeroImportDate: '2026-07-16' },
    { id: 'EXP-2212', desc: 'Recruitment agency fees', amount: 18_600, dept: 'People & Culture', vendor: 'Michael Page', category: 'HR', status: 'approved', when: '2 days ago',
      approvalStatus: 'approved', xeroStatus: 'posted', paymentStatus: 'paid', reconciliation: 'reconciled',
      entity: 'Arsela Resources Sdn Bhd', xeroTxnId: 'XERO-BILL-88190', invoiceNo: 'MP-77120', gst: 'Standard-rated 6%', paymentAccount: 'Westpac #2077', paidDate: '2026-07-13', xeroImportDate: '2026-07-14' },
    { id: 'EXP-2211', desc: 'Solar panel spares', amount: 96_400, dept: 'Energy & Assets', vendor: 'Trina Solar', category: 'Machinery', status: 'approved', when: '3 days ago',
      approvalStatus: 'approved', xeroStatus: 'posted', paymentStatus: 'unpaid', reconciliation: 'unreconciled',
      entity: 'Arsela Resources Sdn Bhd', xeroTxnId: 'XERO-BILL-88144', invoiceNo: 'TS-99201', gst: 'Standard-rated 6%', paymentAccount: null, paidDate: null, xeroImportDate: '2026-07-12' },
    { id: 'EXP-2210', desc: 'Line-check parts — inventory', amount: 61_200, dept: 'Aviation', vendor: 'SATS MRO', category: 'Maintenance', status: 'pending', when: '4 hr ago',
      approvalStatus: 'pending', xeroStatus: 'not_posted', paymentStatus: 'unpaid', reconciliation: 'unreconciled',
      entity: 'Arsela Resources Sdn Bhd', xeroTxnId: null, invoiceNo: 'SATS-6620', gst: 'Standard-rated 6%', paymentAccount: null, paidDate: null, xeroImportDate: null },
    { id: 'EXP-2189', desc: 'Site survey — Cold Chain', amount: 12_400, dept: 'Property', vendor: 'Jurutera Perunding', category: 'Professional Fees', status: 'rejected', when: 'Last week',
      approvalStatus: 'rejected', xeroStatus: 'not_posted', paymentStatus: 'unpaid', reconciliation: 'unreconciled',
      entity: 'Arsela Resources Sdn Bhd', xeroTxnId: null, invoiceNo: 'JP-3312', gst: 'Standard-rated 6%', paymentAccount: null, paidDate: null, xeroImportDate: null },
    { id: 'EXP-2188', desc: 'ERP migration invoice #4', amount: 214_500, dept: 'Digital & Data', vendor: 'Accenture', category: 'IT & Software', status: 'pending', when: '2 hr ago',
      approvalStatus: 'pending', xeroStatus: 'not_posted', paymentStatus: 'unpaid', reconciliation: 'unreconciled',
      entity: 'Arsela Resources Sdn Bhd', xeroTxnId: null, invoiceNo: 'ACN-2026-004', gst: 'Standard-rated 6%', paymentAccount: null, paidDate: null, xeroImportDate: null },
  ];

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
  const seedCapex = [
    { code: 'CAP-2601', name: 'Port Klang Terminal 3 — Berth Expansion', category: 'Buildings', approved: 145e6, committed: 92.3e6, spent: 61.2e6, stage: 'Executing', owner: 'Faris H.', eta: 'Q4 2027',
      openCommitments: 31.1e6, paidActuals: 61.2e6, totalExposure: 92.3e6, remainingApprovedFunding: 52.7e6, constructionWIP: 61.2e6, inServiceDate: '2027-10-01', xeroFixedAssetRef: 'FA-WIP-2601', reconciled: true, actualsThrough: '2026-07-18' },
    { code: 'CAP-2602', name: 'Solar Farm — Northern Phase II', category: 'Machinery', approved: 88.5e6, committed: 44.8e6, spent: 18.4e6, stage: 'Executing', owner: 'Zara M.', eta: 'Q2 2027',
      openCommitments: 26.4e6, paidActuals: 18.4e6, totalExposure: 44.8e6, remainingApprovedFunding: 43.7e6, constructionWIP: 18.4e6, inServiceDate: '2027-04-01', xeroFixedAssetRef: 'FA-WIP-2602', reconciled: true, actualsThrough: '2026-07-18' },
    { code: 'CAP-2603', name: 'Data Centre — Cyberjaya Node', category: 'Buildings', approved: 210e6, committed: 168.2e6, spent: 94.7e6, stage: 'Executing', owner: 'Marcus L.', eta: 'Q1 2027',
      openCommitments: 73.5e6, paidActuals: 94.7e6, totalExposure: 168.2e6, remainingApprovedFunding: 41.8e6, constructionWIP: 94.7e6, inServiceDate: '2027-01-01', xeroFixedAssetRef: 'FA-WIP-2603', reconciled: true, actualsThrough: '2026-07-18' },
    { code: 'CAP-2604', name: 'Fleet Renewal — Container Handlers', category: 'Machinery', approved: 42e6, committed: 41.2e6, spent: 41.2e6, stage: 'Completing', owner: 'Faris H.', eta: 'Q3 2026',
      openCommitments: 0, paidActuals: 41.2e6, totalExposure: 41.2e6, remainingApprovedFunding: 0.8e6, constructionWIP: 0, inServiceDate: '2026-09-01', xeroFixedAssetRef: 'FA-2604', reconciled: true, actualsThrough: '2026-07-18' },
    { code: 'CAP-2605', name: 'ERP Modernisation Programme', category: 'Software', approved: 28.4e6, committed: 22.1e6, spent: 14.6e6, stage: 'Executing', owner: 'Marcus L.', eta: 'Q4 2026',
      openCommitments: 7.5e6, paidActuals: 14.6e6, totalExposure: 22.1e6, remainingApprovedFunding: 6.3e6, constructionWIP: 14.6e6, inServiceDate: '2026-12-01', xeroFixedAssetRef: 'FA-WIP-2605', reconciled: true, actualsThrough: '2026-07-18' },
    { code: 'CAP-2606', name: 'LNG Storage — Southern Phase I', category: 'Buildings', approved: 320e6, committed: 48e6, spent: 8.4e6, stage: 'Approved', owner: 'Zara M.', eta: 'Q3 2028',
      openCommitments: 39.6e6, paidActuals: 8.4e6, totalExposure: 48e6, remainingApprovedFunding: 272e6, constructionWIP: 8.4e6, inServiceDate: '2028-09-01', xeroFixedAssetRef: 'FA-WIP-2606', reconciled: true, actualsThrough: '2026-07-18' },
    { code: 'CAP-2607', name: 'Cold Chain Facility — Central', category: 'Buildings', approved: 38.6e6, committed: 4.2e6, spent: 0, stage: 'Approved', owner: 'Nurul A.', eta: 'Q2 2027',
      openCommitments: 4.2e6, paidActuals: 0, totalExposure: 4.2e6, remainingApprovedFunding: 34.4e6, constructionWIP: 0, inServiceDate: '2027-04-01', xeroFixedAssetRef: null, reconciled: true, actualsThrough: '2026-07-18' },
  ];

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

  const seedReconciliations = [
    { id: 'RC-1001', source: 'Xero vs Westpac Account #2077', date: '2026-07-18', description: 'AWS Malaysia — Cloud hosting Q3', reference: 'XERO-BILL-88231', amount: 42_180, status: 'Matched', linkedExpenseId: 'EXP-2213', reviewer: 'Nadia Yeoh', reviewedAt: '2026-07-19', note: 'Bank line and Xero bill match exactly.' },
    { id: 'RC-1002', source: 'Xero vs Westpac Account #2077', date: '2026-07-13', description: 'Michael Page — Recruitment fees', reference: 'XERO-BILL-88190', amount: 18_600, status: 'Matched', linkedExpenseId: 'EXP-2212', reviewer: 'Nadia Yeoh', reviewedAt: '2026-07-14', note: 'Confirmed against bank statement line 44.' },
    { id: 'RC-1003', source: 'Xero vs Westpac Account #2077', date: '2026-07-12', description: 'Trina Solar — Solar panel spares', reference: 'XERO-BILL-88144', amount: 96_400, status: 'Timing difference', linkedExpenseId: 'EXP-2211', reviewer: null, reviewedAt: null, note: 'Posted in Xero 12 Jul but bank debit not yet cleared — expected value date 22 Jul.' },
    { id: 'RC-1004', source: 'Xero vs Westpac Account #2077', date: '2026-07-19', description: 'Unknown outbound wire — SGD 14,200', reference: 'BANK-TXN-77021', amount: 41_600, status: 'Missing in Xero', linkedExpenseId: null, reviewer: null, reviewedAt: null, note: 'Bank line has no matching Xero bill — flagged for finance follow-up.' },
    { id: 'RC-1005', source: 'SFR payment schedule vs Xero', date: '2026-07-01', description: 'SFR instalment 7 of 24 — LNG Storage EPC', reference: 'SFR-2026-07', amount: 13_333_333, status: 'Matched', linkedExpenseId: null, reviewer: 'Zara Mahmood', reviewedAt: '2026-07-02', note: 'Matches approved SFR schedule and Xero fixed-asset WIP posting.' },
    { id: 'RC-1006', source: 'SFR payment schedule vs Xero', date: '2026-08-01', description: 'SFR instalment 8 of 24 — LNG Storage EPC', reference: 'SFR-2026-08', amount: 13_333_333, status: 'Awaiting supporting document', linkedExpenseId: null, reviewer: null, reviewedAt: null, note: 'Awaiting EPC contractor progress certificate before Xero posting.' },
    { id: 'RC-1007', source: 'Costentra staff claims vs Xero', date: '2026-07-10', description: 'F. Hamzah — travel & subsistence claim', reference: 'CST-CLM-5521', amount: 2_140, status: 'Matched', linkedExpenseId: null, reviewer: 'Nadia Yeoh', reviewedAt: '2026-07-11', note: 'Reimbursement matches Costentra claim portal export.' },
    { id: 'RC-1008', source: 'Costentra staff claims vs Xero', date: '2026-07-16', description: 'P. Nair — training course claim', reference: 'CST-CLM-5540', amount: 3_800, status: 'Potential match', linkedExpenseId: null, reviewer: null, reviewedAt: null, note: 'Amount and date close to a Xero entry but payee name differs — needs confirmation.' },
    { id: 'RC-1009', source: 'Expenses paid outside Westpac vs Xero', date: '2026-07-15', description: 'Corporate card — site visit fuel & tolls', reference: 'CC-7743-0715', amount: 640, status: 'Matched', linkedExpenseId: null, reviewer: 'Admin Arsela', reviewedAt: '2026-07-17', note: 'Corporate card statement matches Xero spend-money entry.' },
    { id: 'RC-1010', source: 'Expenses paid outside Westpac vs Xero', date: '2026-07-20', description: 'Petty cash — office supplies', reference: 'PC-2026-07-20', amount: 210, status: 'Reviewed', linkedExpenseId: null, reviewer: 'Admin Arsela', reviewedAt: '2026-07-21', note: 'Below materiality threshold — reviewed and closed without full Xero trace.' },
    { id: 'RC-1011', source: 'Budgeting actuals vs Xero', date: '2026-07-18', description: 'Port Klang Terminal Ops — cumulative spend', reference: 'BUD-2601', amount: 31_640_000, status: 'Matched', linkedExpenseId: null, reviewer: 'Faris Hamzah', reviewedAt: '2026-07-19', note: 'Budget spend-to-date ties out to Xero P&L extract for the department.' },
    { id: 'RC-1012', source: 'Budgeting actuals vs Xero', date: '2026-07-18', description: 'Fleet Maintenance & Renewal — cumulative spend', reference: 'BUD-2602', amount: 19_820_000, status: 'Matched', linkedExpenseId: null, reviewer: 'Faris Hamzah', reviewedAt: '2026-07-19', note: 'Ties to Xero; over-budget position confirmed genuine, not a data error.' },
    { id: 'RC-1013', source: 'Intercompany items', date: '2026-07-14', description: 'Arsela Resources ⇄ Arsela Logistics — management fee', reference: 'IC-2026-Q1-04', amount: 1_250_000, status: 'Duplicate', linkedExpenseId: null, reviewer: null, reviewedAt: null, note: 'Appears posted twice across the two entities — needs one-sided reversal.' },
    { id: 'RC-1014', source: 'Intercompany items', date: '2026-07-08', description: 'Arsela Resources ⇄ Arsela Ports Sdn Bhd — shared services recharge', reference: 'IC-2026-Q1-02', amount: 480_000, status: 'Different entity', linkedExpenseId: null, reviewer: null, reviewedAt: null, note: 'Posted against the wrong subsidiary code in Xero — needs journal correction.' },
  ];

  const seedNotifications = [
    { id: 'N1', i: '✓', tone: 'success', t: 'Expense approved', d: 'EXP-2214 · Fleet servicing · RM 8,420', when: '3 min ago', unread: true },
    { id: 'N2', i: '⚠', tone: 'warning', t: 'Budget threshold breached', d: 'IT · +12.8% over July plan', when: '18 min ago', unread: true },
    { id: 'N3', i: '↺', tone: 'info', t: 'New approval in your queue', d: 'CAP-2606 · LNG Storage sanction · RM 320M', when: '52 min ago', unread: true },
    { id: 'N4', i: '⤿', tone: 'info', t: 'Amendment requested', d: 'BUD-2603 · +RM 1.4M reallocation', when: '2 hr ago', unread: true },
    { id: 'N5', i: '✕', tone: 'danger', t: 'Expense rejected', d: 'EXP-2189 · Awaiting revision', when: 'Yesterday', unread: false },
  ];

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
  const seedOpexCategories = [
    { id: 'OPX-1', name: 'Payroll', plan: 15.3e6, actual: 14.9e6, archived: false },
    { id: 'OPX-2', name: 'Employee Benefits', plan: 3.2e6, actual: 3.3e6, archived: false },
    { id: 'OPX-3', name: 'Information Technology', plan: 3.9e6, actual: 4.4e6, archived: false },
    { id: 'OPX-4', name: 'Software Licences', plan: 1.8e6, actual: 2.0e6, archived: false },
    { id: 'OPX-5', name: 'Marketing', plan: 2.6e6, actual: 2.3e6, archived: false },
    { id: 'OPX-6', name: 'Professional Fees', plan: 1.6e6, actual: 1.8e6, archived: false },
    { id: 'OPX-7', name: 'Utilities', plan: 1.4e6, actual: 1.5e6, archived: false },
    { id: 'OPX-8', name: 'Travel', plan: 1.1e6, actual: 0.8e6, archived: false },
    { id: 'OPX-9', name: 'Maintenance', plan: 1.2e6, actual: 1.3e6, archived: false },
    { id: 'OPX-10', name: 'Training', plan: 0.7e6, actual: 0.5e6, archived: false },
    { id: 'OPX-11', name: 'Insurance', plan: 0.9e6, actual: 0.9e6, archived: false },
    { id: 'OPX-12', name: 'Office Expenses', plan: 0.6e6, actual: 0.6e6, archived: false },
    { id: 'OPX-13', name: 'Security', plan: 0.8e6, actual: 0.8e6, archived: false },
    { id: 'OPX-14', name: 'Cleaning', plan: 0.4e6, actual: 0.4e6, archived: false },
    { id: 'OPX-15', name: 'Miscellaneous', plan: 0.5e6, actual: 0.4e6, archived: false },
  ];

  /* Performance & KPIs balanced scorecard — was a local hardcoded
     array with a non-functional "Add KPI" button; lifted into Store
     so KPIs can actually be added/edited/deleted and persist like
     every other managed list in the app. `perspective` groups KPIs
     into the three scorecard sections (financial / operational /
     sustainability). `invert` = true means a LOWER actual is better
     (e.g. downtime hours, safety incidents) — used for RAG/variance
     colour direction, matching PerformanceScreen's existing logic. */
  const seedKpis = [
    { id: 'KPI-1', perspective: 'financial', name: 'Revenue growth', owner: 'Group', target: 5.0, actual: 6.4, unit: '%', invert: false, trend: [3.2,4.1,4.8,5.2,5.8,6.1,6.4] },
    { id: 'KPI-2', perspective: 'financial', name: 'Operating margin', owner: 'Group', target: 22.0, actual: 22.8, unit: '%', invert: false, trend: [20,20.4,21.2,21.8,22.1,22.5,22.8] },
    { id: 'KPI-3', perspective: 'financial', name: 'EBITDA', owner: 'Group', target: 180, actual: 194.3, unit: 'currency_m', invert: false, trend: [140,152,163,171,180,188,194] },
    { id: 'KPI-4', perspective: 'financial', name: 'Cash conversion', owner: 'Treasury', target: 85, actual: 78, unit: '%', invert: false, trend: [88,85,82,80,79,78,78] },
    { id: 'KPI-5', perspective: 'financial', name: 'Return on capital', owner: 'Group', target: 14, actual: 15.2, unit: '%', invert: false, trend: [12,12.8,13.5,14.1,14.6,15.0,15.2] },
    { id: 'KPI-6', perspective: 'operational', name: 'Port throughput', owner: 'Ports & Logistics', target: 4.2, actual: 4.4, unit: 'TEU_m', invert: false, trend: [3.6,3.8,3.9,4.1,4.2,4.3,4.4] },
    { id: 'KPI-7', perspective: 'operational', name: 'Fleet utilisation', owner: 'Operations', target: 88, actual: 91, unit: '%', invert: false, trend: [82,84,86,87,89,90,91] },
    { id: 'KPI-8', perspective: 'operational', name: 'Downtime hours', owner: 'Operations', target: 120, actual: 142, unit: 'number', invert: true, trend: [98,105,115,124,132,138,142] },
    { id: 'KPI-9', perspective: 'operational', name: 'Safety incidents', owner: 'Ops HSE', target: 0, actual: 2, unit: 'number', invert: true, trend: [0,0,1,1,2,2,2] },
    { id: 'KPI-10', perspective: 'operational', name: 'On-time delivery', owner: 'Logistics', target: 95, actual: 94.2, unit: '%', invert: false, trend: [96,95.5,95.1,94.8,94.5,94.3,94.2] },
    { id: 'KPI-11', perspective: 'sustainability', name: 'Emissions intensity', owner: 'Sustainability', target: -8, actual: -9.4, unit: '%_yoy', invert: false, trend: [-3,-4.2,-5.5,-6.8,-7.9,-8.7,-9.4] },
    { id: 'KPI-12', perspective: 'sustainability', name: 'Renewable share', owner: 'Energy', target: 28, actual: 31, unit: '%', invert: false, trend: [22,24,26,27,29,30,31] },
    { id: 'KPI-13', perspective: 'sustainability', name: 'Water reuse', owner: 'Sustainability', target: 55, actual: 52, unit: '%', invert: false, trend: [45,47,48,50,51,51,52] },
    { id: 'KPI-14', perspective: 'sustainability', name: 'CSR spend', owner: 'CSR', target: 6, actual: 6.4, unit: 'currency_m', invert: false, trend: [3.8,4.4,4.9,5.3,5.7,6.1,6.4] },
    { id: 'KPI-15', perspective: 'sustainability', name: 'Board diversity', owner: 'Governance', target: 40, actual: 44, unit: '%', invert: false, trend: [32,35,37,40,42,43,44] },
  ];

  /* Scenario comparison (Quarterly panel) — was local hardcoded
     state; lifted into Store so "New scenario" and switching the
     active scenario actually persist. */
  const seedScenarios = [
    { id: 'SC-1', n: 'Base case', v: 258_000_000, d: '+1.3% vs plan', c: 'success', active: true },
    { id: 'SC-2', n: 'Upside — Port expansion', v: 265_600_000, d: '+4.2% vs plan', c: 'blue', active: false },
    { id: 'SC-3', n: 'Downside — MYR volatility', v: 247_300_000, d: '−2.9% vs plan', c: 'warning', active: false },
  ];

  /* Cash Flow scenario planning — "what if budget / expense / revenue
     changed, what's the impact on cash flow?" Each scenario is a set of
     % deltas applied to the base budget (CAPEX/investing), opex
     (expense) and revenue lines; CashFlowScreen recomputes the whole
     chart + runway live from whichever scenario is active. Lifted into
     Store (not local screen state) so it persists and follows the same
     add/switch/delete pattern as Quarterly's scenario comparison. */
  const seedCashFlowScenarios = [
    { id: 'CFS-1', n: 'Base case', budgetDeltaPct: 0, expenseDeltaPct: 0, revenueDeltaPct: 0, note: 'Current approved FY2027 plan — no changes applied.', active: true },
    { id: 'CFS-2', n: 'CAPEX deferred — LNG Phase I', budgetDeltaPct: -15, expenseDeltaPct: 0, revenueDeltaPct: 0, note: 'Push LNG Storage sanction back two quarters to preserve near-term cash.', active: false },
    { id: 'CFS-3', n: 'Opex savings drive', budgetDeltaPct: 0, expenseDeltaPct: -8, revenueDeltaPct: 0, note: 'Group-wide 8% discretionary opex reduction from Q4.', active: false },
    { id: 'CFS-4', n: 'Revenue downside — trade slowdown', budgetDeltaPct: 0, expenseDeltaPct: 0, revenueDeltaPct: -10, note: 'Port throughput and MRO volumes soften on regional demand.', active: false },
  ];

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
