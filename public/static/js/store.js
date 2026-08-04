/* ============================================================
   Coplanistra — global app store (plain JS, framework-agnostic)
   Central source of truth so role, notifications, budgets,
   approvals and expenses stay in sync across every screen.
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
    { id: 'BUD-2610', name: 'Corporate IT & ERP', owner: 'Keith Johnson', dept: 'Corporate', period: 'FY2026', allocated: 28_400_000, spent: 22_140_000, status: 'active', capex: false },
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

  const seedNotifications = [
    { id: 'N1', i: '✓', tone: 'success', t: 'Expense approved', d: 'EXP-2214 · Fleet servicing · RM 8,420', when: '3 min ago', unread: true },
    { id: 'N2', i: '⚠', tone: 'warning', t: 'Budget threshold breached', d: 'IT · +12.8% over July plan', when: '18 min ago', unread: true },
    { id: 'N3', i: '↺', tone: 'info', t: 'New approval in your queue', d: 'CAP-2606 · LNG Storage sanction · RM 320M', when: '52 min ago', unread: true },
    { id: 'N4', i: '⤿', tone: 'info', t: 'Amendment requested', d: 'BUD-2603 · +RM 1.4M reallocation', when: '2 hr ago', unread: true },
    { id: 'N5', i: '✕', tone: 'danger', t: 'Expense rejected', d: 'EXP-2189 · Awaiting revision', when: 'Yesterday', unread: false },
  ];

  const defaultState = {
    authenticated: false,
    role: 'finance',
    notifOpen: false,
    notifications: seedNotifications,
    budgets: seedBudgets,
    approvals: seedApprovals,
    expenses: seedExpenses,
    toasts: [],
    copilotMessages: null, // per-screen default seeded lazily
  };

  const persisted = loadPersisted();
  const state = Object.assign({}, defaultState, persisted || {});
  // Never persist "open" UI transient state across reloads
  state.notifOpen = false;

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

  const Store = {
    getState: () => state,
    setState,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    toast,

    // ---- actions ----
    login(role) {
      setState({ authenticated: true, role: role || state.role });
      toast('Signed in successfully', 'success');
    },
    logout() {
      setState({ authenticated: false });
    },
    setRole(role) {
      setState({ role });
      toast(`Viewing as ${role.charAt(0).toUpperCase() + role.slice(1)}`, 'info');
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
    addExpense(exp) {
      const id = 'EXP-' + Math.floor(2200 + Math.random() * 90);
      const record = { id, status: 'pending', when: 'Just now', ...exp };
      setState({ expenses: [record, ...state.expenses] });
      toast(`Expense ${exp.draft ? 'saved as draft' : 'submitted'}: ${id}`, 'success');
      return record;
    },
    addBudget(b) {
      const id = 'BUD-' + Math.floor(2700 + Math.random() * 90);
      const record = { id, spent: 0, status: 'draft', ...b };
      setState({ budgets: [record, ...state.budgets] });
      toast(`Budget created: ${id}`, 'success');
      return record;
    },
    updateBudget(id, patch) {
      setState({ budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
    },
  };

  window.Store = Store;
})();
