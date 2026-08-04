/* ============================================================
   Coplanistra — global app store (plain JS, framework-agnostic)
   Central source of truth so users/role, notifications, budgets,
   approvals, expenses and CAPEX stay in sync across every screen.
   ============================================================ */

(function () {
  const LS_KEY = 'coplanistra_state_v1';

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

  const seedBudgets = [
    { id: 'BUD-2601', name: 'Port Klang Terminal Ops', owner: 'Faris Hamzah', dept: 'Ports & Logistics', period: 'FY2026', allocated: 42_000_000, spent: 31_640_000, status: 'active', capex: false },
    { id: 'BUD-2602', name: 'Fleet Maintenance & Renewal', owner: 'Faris Hamzah', dept: 'Ports & Logistics', period: 'FY2026', allocated: 18_500_000, spent: 19_820_000, status: 'over', capex: false },
    { id: 'BUD-2603', name: 'Digital Core Platform', owner: 'Marcus Lim', dept: 'Digital & Data', period: 'FY2026', allocated: 12_600_000, spent: 11_420_000, status: 'active', capex: false },
    { id: 'BUD-2604', name: 'Cyberjaya Data Centre Node', owner: 'Marcus Lim', dept: 'Digital & Data', period: 'FY2026', allocated: 28_400_000, spent: 14_620_000, status: 'active', capex: true },
    { id: 'BUD-2605', name: 'Talent & Culture Programme', owner: 'Priya Nair', dept: 'People & Culture', period: 'FY2026', allocated: 18_900_000, spent: 19_280_000, status: 'amendment', capex: false },
    { id: 'BUD-2606', name: 'Solar Farm — Northern Phase II', owner: 'Zara Mahmood', dept: 'Energy & Assets', period: 'FY2026', allocated: 88_500_000, spent: 18_400_000, status: 'active', capex: true },
    { id: 'BUD-2607', name: 'Cold Chain Facility — Central', owner: 'Nurul Ain', dept: 'Property', period: 'FY2026', allocated: 38_600_000, spent: 0, status: 'draft', capex: true },
    { id: 'BUD-2608', name: 'MRO Line Checks — Fleet', owner: 'Iman Salleh', dept: 'Aviation', period: 'FY2026', allocated: 22_400_000, spent: 23_760_000, status: 'over', capex: false },
    { id: 'BUD-2609', name: 'CSR & Sustainability Fund', owner: 'Nadia Yeoh', dept: 'Sustainability', period: 'FY2026', allocated: 6_000_000, spent: 6_420_000, status: 'active', capex: false },
    { id: 'BUD-2610', name: 'Corporate IT & ERP', owner: 'Admin Arsela', dept: 'Corporate', period: 'FY2026', allocated: 28_400_000, spent: 22_140_000, status: 'active', capex: false },
  ];

  const seedApprovals = [
    { id: 'AP-9001', type: 'Expense', urgent: true, title: 'Fleet servicing — Port Klang yard', requester: 'Faris Hamzah', amount: 8_420, when: '3 min ago', dept: 'Ports & Logistics', justification: 'Scheduled maintenance for 4 container handlers ahead of Q3 peak season. Vendor: Sime Darby Motors.', status: 'pending' },
    { id: 'AP-9002', type: 'Budget amendment', urgent: false, title: 'Talent & Culture — reallocation', requester: 'Priya Nair', amount: 900_000, when: '18 min ago', dept: 'People & Culture', justification: 'Training pull-forward from FY27 to cover certification backlog before year end.', status: 'pending' },
    { id: 'AP-9003', type: 'CAPEX sanction', urgent: true, title: 'LNG Storage — Southern Phase I', requester: 'Zara Mahmood', amount: 320_000_000, when: '52 min ago', dept: 'Energy & Assets', justification: 'Board-level sanction required. Feasibility study complete; EPC tender shortlisted.', status: 'pending' },
    { id: 'AP-9004', type: 'Expense', urgent: false, title: 'ERP migration — vendor invoice #4', requester: 'Marcus Lim', amount: 214_500, when: '2 hr ago', dept: 'Digital & Data', justification: 'Milestone 4 of 6 for ERP modernisation programme, per signed SOW.', status: 'pending' },
    { id: 'AP-9005', type: 'Expense', urgent: false, title: 'MRO line-check overrun', requester: 'Iman Salleh', amount: 61_200, when: '4 hr ago', dept: 'Aviation', justification: 'Unplanned line-check volume exceeded plan by 6% this month.', status: 'pending' },
    { id: 'AP-9006', type: 'Budget amendment', urgent: false, title: 'Cold Chain — early mobilisation', requester: 'Nurul Ain', amount: 4_200_000, when: 'Yesterday', dept: 'Property', justification: 'Bring forward site mobilisation to lock in contractor rates before Q4.', status: 'pending' },
    { id: 'AP-9007', type: 'Expense', urgent: false, title: 'CSR — community solar donation', requester: 'Nadia Yeoh', amount: 420_000, when: 'Yesterday', dept: 'Sustainability', justification: 'Matches FY26 CSR commitment approved at board level in Q1.', status: 'pending' },
  ];

  const seedExpenses = [
    { id: 'EXP-2214', desc: 'Fleet servicing — Port Klang yard', amount: 8_420, dept: 'Ports & Logistics', vendor: 'Sime Darby Motors', category: 'Maintenance', status: 'pending', when: '3 min ago' },
    { id: 'EXP-2213', desc: 'Cloud hosting — Q3', amount: 42_180, dept: 'Digital & Data', vendor: 'AWS Malaysia', category: 'IT & Software', status: 'approved', when: 'Yesterday' },
    { id: 'EXP-2212', desc: 'Recruitment agency fees', amount: 18_600, dept: 'People & Culture', vendor: 'Michael Page', category: 'HR', status: 'approved', when: '2 days ago' },
    { id: 'EXP-2211', desc: 'Solar panel spares', amount: 96_400, dept: 'Energy & Assets', vendor: 'Trina Solar', category: 'Machinery', status: 'approved', when: '3 days ago' },
    { id: 'EXP-2210', desc: 'Line-check parts — inventory', amount: 61_200, dept: 'Aviation', vendor: 'SATS MRO', category: 'Maintenance', status: 'pending', when: '4 hr ago' },
    { id: 'EXP-2189', desc: 'Site survey — Cold Chain', amount: 12_400, dept: 'Property', vendor: 'Jurutera Perunding', category: 'Professional Fees', status: 'rejected', when: 'Last week' },
    { id: 'EXP-2188', desc: 'ERP migration invoice #4', amount: 214_500, dept: 'Digital & Data', vendor: 'Accenture', category: 'IT & Software', status: 'pending', when: '2 hr ago' },
  ];

  const seedCapex = [
    { code: 'CAP-2601', name: 'Port Klang Terminal 3 — Berth Expansion', category: 'Buildings', approved: 145e6, committed: 92.3e6, spent: 61.2e6, stage: 'Executing', owner: 'Faris H.', eta: 'Q4 2027' },
    { code: 'CAP-2602', name: 'Solar Farm — Northern Phase II', category: 'Machinery', approved: 88.5e6, committed: 44.8e6, spent: 18.4e6, stage: 'Executing', owner: 'Zara M.', eta: 'Q2 2027' },
    { code: 'CAP-2603', name: 'Data Centre — Cyberjaya Node', category: 'Buildings', approved: 210e6, committed: 168.2e6, spent: 94.7e6, stage: 'Executing', owner: 'Marcus L.', eta: 'Q1 2027' },
    { code: 'CAP-2604', name: 'Fleet Renewal — Container Handlers', category: 'Machinery', approved: 42e6, committed: 41.2e6, spent: 41.2e6, stage: 'Completing', owner: 'Faris H.', eta: 'Q3 2026' },
    { code: 'CAP-2605', name: 'ERP Modernisation Programme', category: 'Software', approved: 28.4e6, committed: 22.1e6, spent: 14.6e6, stage: 'Executing', owner: 'Marcus L.', eta: 'Q4 2026' },
    { code: 'CAP-2606', name: 'LNG Storage — Southern Phase I', category: 'Buildings', approved: 320e6, committed: 48e6, spent: 8.4e6, stage: 'Approved', owner: 'Zara M.', eta: 'Q3 2028' },
    { code: 'CAP-2607', name: 'Cold Chain Facility — Central', category: 'Buildings', approved: 38.6e6, committed: 4.2e6, spent: 0, stage: 'Approved', owner: 'Nurul A.', eta: 'Q2 2027' },
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

  /* Scenario comparison (Quarterly panel) — was local hardcoded
     state; lifted into Store so "New scenario" and switching the
     active scenario actually persist. */
  const seedScenarios = [
    { id: 'SC-1', n: 'Base case', v: 254_800_000, d: '+2.6% vs plan', c: 'success', active: true },
    { id: 'SC-2', n: 'Upside — Port expansion', v: 262_400_000, d: '+5.6% vs plan', c: 'blue', active: false },
    { id: 'SC-3', n: 'Downside — MYR volatility', v: 244_100_000, d: '−1.7% vs plan', c: 'warning', active: false },
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
    departments: seedDepartments,
    categories: seedCategories,
    budgetCodes: seedBudgetCodes,
    scenarios: seedScenarios,
    currency: 'MYR',
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
  if (!state.budgetCodes) state.budgetCodes = seedBudgetCodes;
  if (!state.scenarios) state.scenarios = seedScenarios;
  if (!state.currency) state.currency = 'MYR';

  const listeners = new Set();

  function persist() {
    try {
      const { toasts, notifOpen, ...rest } = state;
      localStorage.setItem(LS_KEY, JSON.stringify(rest));
    } catch (e) {}
  }

  function emit() {
    listeners.forEach((fn) => {
      try { fn(state); } catch (e) { console.error(e); }
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
    approveItem(id, note) {
      const item = state.approvals.find((a) => a.id === id);
      setState({ approvals: state.approvals.map((a) => (a.id === id ? { ...a, status: 'approved', note } : a)) });
      if (item) toast(`Approved: ${item.title}`, 'success');
    },
    rejectItem(id, note) {
      const item = state.approvals.find((a) => a.id === id);
      setState({ approvals: state.approvals.map((a) => (a.id === id ? { ...a, status: 'rejected', note } : a)) });
      if (item) toast(`Rejected: ${item.title}`, 'danger');
    },
    requestChanges(id, note) {
      const item = state.approvals.find((a) => a.id === id);
      setState({ approvals: state.approvals.map((a) => (a.id === id ? { ...a, status: 'changes_requested', note } : a)) });
      if (item) toast(`Requested changes: ${item.title}`, 'warning');
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
  };

  window.Store = Store;
})();
