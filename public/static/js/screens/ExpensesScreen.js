/* Expenses screen — wired to Store, LIVE routing preview reacts to form input in real time */
(function () {
  const { useState, useEffect, useMemo } = React;

  // Fallback list only used if Store hasn't hydrated categories yet — the live
  // list is always read from window.Store.getState().categories.
  const CATEGORIES_FALLBACK = ['Maintenance', 'IT & Software', 'HR', 'Machinery', 'Professional Fees', 'Travel', 'Other'];
  // 3-tier approval routing per design spec:
  //  < RM25K            -> Dept Manager only
  //  RM25K - RM250K      -> Dept Manager -> Finance Manager
  //  > RM250K            -> Dept Manager -> Finance Manager -> CFO / Executive
  const ROUTING_TIER1 = 25_000;
  const ROUTING_TIER2 = 250_000;

  function RoutingPreview({ amount, dept }) {
    const amt = Number(amount) || 0;
    const deptManager = { 'Ports & Logistics': 'Faris H.', 'Digital & Data': 'Marcus L.', 'People & Culture': 'Priya N.', 'Energy & Assets': 'Zara M.', Property: 'Nurul A.', Aviation: 'Iman S.', Sustainability: 'Nadia Y.', Corporate: 'Keith J.' }[dept] || 'Dept Manager';
    const needsFinance = amt >= ROUTING_TIER1;
    const needsExec = amt >= ROUTING_TIER2;
    let turnaround = '0.6 days';
    if (needsExec) turnaround = '3.2 days'; else if (needsFinance) turnaround = '1.4 days';
    return (
      <div style={{ background: '#EEF3FF', border: '1px solid #D6E1FF', borderRadius: 8, padding: 12, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <IconApproval size={14} style={{ color: 'var(--arsela-blue)' }}/>
          <span style={{ fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--arsela-blue)', fontWeight: 700 }}>This will route to</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <ArsAvatar name={deptManager} size={22} tone="blue"/>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deptManager}</div>
            <div style={{ fontSize: 10, color: 'var(--arsela-text-muted)' }}>Dept Manager</div>
          </div>
          {(needsFinance || needsExec) && <IconChevronRight size={12} style={{ color: 'var(--arsela-text-subtle)', flexShrink: 0 }}/>}
          {needsFinance ? (
            <>
              <ArsAvatar name="Priya Nair" size={22} tone="teal"/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Priya N.</div>
                <div style={{ fontSize: 10, color: 'var(--arsela-text-muted)' }}>Finance Manager</div>
              </div>
            </>
          ) : null}
          {needsExec ? (
            <>
              <IconChevronRight size={12} style={{ color: 'var(--arsela-text-subtle)', flexShrink: 0 }}/>
              <ArsAvatar name="Keith Johnson" size={22} tone="navy"/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Keith J.</div>
                <div style={{ fontSize: 10, color: 'var(--arsela-text-muted)' }}>CFO / Executive</div>
              </div>
            </>
          ) : null}
          <IconChevronRight size={12} style={{ color: 'var(--arsela-text-subtle)', flexShrink: 0 }}/>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconCheck size={13}/></div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 10, lineHeight: 1.4 }}>
          {needsExec
            ? <>Amount {fmtMYR(amt)} exceeds {fmtMYR(ROUTING_TIER2)} — routes through <b style={{ color: 'var(--arsela-navy)' }}>Finance Manager</b> then <b style={{ color: 'var(--arsela-navy)' }}>CFO / Executive</b>. Est. turnaround <b style={{ color: 'var(--arsela-navy)' }}>{turnaround}</b>.</>
            : needsFinance
            ? <>Amount {fmtMYR(amt)} is between {fmtMYR(ROUTING_TIER1)} and {fmtMYR(ROUTING_TIER2)} — routes to <b style={{ color: 'var(--arsela-navy)' }}>Finance Manager</b> after department approval. Est. turnaround <b style={{ color: 'var(--arsela-navy)' }}>{turnaround}</b>.</>
            : <>Amount {fmtMYR(amt)} is within department manager's approval limit ({fmtMYR(ROUTING_TIER1)}). Est. turnaround <b style={{ color: 'var(--arsela-navy)' }}>{turnaround}</b>.</>}
        </div>
      </div>
    );
  }

  const EXPENSE_STATUS_OPTIONS = ['pending', 'approved', 'rejected'];

  /* ---- Category management modal — rename/delete existing expense
     categories. Add-new is already handled inline in the Quick-add
     form; this surfaces edit/delete for EXISTING categories, reusing
     Store.renameCategory / Store.deleteCategory (same taxonomy used
     app-wide, so a rename here is reflected everywhere). ---- */
  function ManageCategoriesModal({ onClose }) {
    const [s2, setS2] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS2), []);
    const [renaming, setRenaming] = useState(null); // category name being renamed
    const [draft, setDraft] = useState('');
    const cats = s2.categories || CATEGORIES_FALLBACK;
    const startRename = (c) => { setRenaming(c); setDraft(c); };
    const commitRename = () => {
      if (draft.trim() && draft.trim() !== renaming) window.Store.renameCategory(renaming, draft.trim());
      setRenaming(null); setDraft('');
    };
    return (
      <ArsModal open onClose={onClose} title="Manage categories" subtitle="Rename or remove expense categories"
        footer={<ArsButton variant="secondary" onClick={onClose}>Done</ArsButton>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cats.map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--arsela-border)', borderRadius: 8 }}>
              {renaming === c ? (
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commitRename()} autoFocus
                  style={{ flex: 1, height: 32, borderRadius: 6, border: '1px solid var(--arsela-border-strong)', padding: '0 8px', fontSize: 13, fontFamily: 'inherit' }}/>
              ) : (
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{c}</span>
              )}
              {renaming === c ? (
                <ArsButton size="sm" onClick={commitRename}>Save</ArsButton>
              ) : (
                <button onClick={() => startRename(c)} title="Rename" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)', display: 'flex' }}><IconEdit size={14}/></button>
              )}
              <button onClick={() => { if (confirm(`Delete category "${c}"? Expenses using it will keep the label but it won't be selectable for new ones.`)) window.Store.deleteCategory(c); }} title="Delete" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}><IconTrash size={14}/></button>
            </div>
          ))}
          {cats.length === 0 && <ArsEmpty title="No categories yet" body="Add one from the Quick-add form."/>}
        </div>
      </ArsModal>
    );
  }

  function EditExpenseModal({ expense, onClose }) {
    const [form, setForm] = useState(() => ({
      desc: expense.desc, vendor: expense.vendor, category: expense.category,
      amount: expense.amount, status: expense.status,
    }));
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const save = () => {
      if (!form.desc.trim()) { window.Store.toast('Description is required', 'danger'); return; }
      window.Store.updateExpense(expense.id, {
        desc: form.desc.trim(), vendor: form.vendor.trim(), category: form.category,
        amount: Number(form.amount) || 0, status: form.status,
      });
      onClose();
    };
    return (
      <ArsModal open onClose={onClose} title={`Edit ${expense.id}`} subtitle={expense.desc}
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>Save changes</ArsButton></>}>
        <ArsField label="Description"><input value={form.desc} onChange={set('desc')} style={arsFieldInputStyle}/></ArsField>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Vendor"><input value={form.vendor} onChange={set('vendor')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Category">
            <select value={form.category} onChange={set('category')} style={arsFieldInputStyle}>
              {(window.Store.getState().categories || CATEGORIES_FALLBACK).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </ArsField></div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Amount (RM)"><input type="number" value={form.amount} onChange={set('amount')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Status">
            <select value={form.status} onChange={set('status')} style={arsFieldInputStyle}>
              {EXPENSE_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </ArsField></div>
        </div>
      </ArsModal>
    );
  }

  function ExpensesScreen() {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);

    const [tab, setTab] = useState('All');
    const [q, setQ] = useState('');
    const [editExpense, setEditExpense] = useState(null);
    const [deleteExpense, setDeleteExpense] = useState(null);
    const [manageCatsOpen, setManageCatsOpen] = useState(false);
    const [scanning, setScanning] = useState(false);

    // Quick-add form state — drives the LIVE routing preview
    const categories = s.categories && s.categories.length ? s.categories : CATEGORIES_FALLBACK;
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const todayISO = () => new Date().toISOString().slice(0, 10);
    const [expDate, setExpDate] = useState(todayISO());
    const [dept, setDept] = useState(s.budgets[0]?.dept || (s.departments && s.departments[0]) || 'Ports & Logistics');
    const [deptTouched, setDeptTouched] = useState(false);
    const [budgetId, setBudgetId] = useState(s.budgets[0]?.id || '');
    const [category, setCategory] = useState(categories[0]);
    const [newCategoryOpen, setNewCategoryOpen] = useState(false);
    const [newCategoryDraft, setNewCategoryDraft] = useState('');
    const [vendor, setVendor] = useState('');
    const [receiptFile, setReceiptFile] = useState(null);
    const fileInputRef = React.useRef(null);

    const expenses = s.expenses;
    const counts = useMemo(() => ({
      All: expenses.length,
      Pending: expenses.filter((e) => e.status === 'pending').length,
      Approved: expenses.filter((e) => e.status === 'approved').length,
      Rejected: expenses.filter((e) => e.status === 'rejected').length,
    }), [expenses]);

    const filtered = useMemo(() => expenses.filter((e) => {
      if (tab !== 'All' && e.status.toLowerCase() !== tab.toLowerCase()) return false;
      if (q.trim() && !e.desc.toLowerCase().includes(q.trim().toLowerCase()) && !e.vendor.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    }), [expenses, tab, q]);

    const submittedThisMonth = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingSum = expenses.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
    const approvedSum = expenses.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);

    const selectedBudget = s.budgets.find((b) => b.id === budgetId);

    const resetForm = () => {
      setDesc(''); setAmount(''); setVendor(''); setExpDate(todayISO());
      setReceiptFile(null); setDeptTouched(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const submitExpense = (draft) => {
      if (!draft && (!desc.trim() || !amount || Number(amount) <= 0)) {
        window.Store.toast('Please enter a description and amount', 'danger');
        return;
      }
      window.Store.addExpense({
        desc: desc.trim() || 'Untitled expense',
        amount: Number(amount) || 0,
        dept,
        vendor: vendor.trim() || 'Unspecified',
        category,
        when: new Date(expDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }),
        receiptName: receiptFile ? receiptFile.name : null,
        draft,
      });
      resetForm();
    };

    /* ---- Receipt OCR auto-fill --------------------------------------
       Runs Tesseract.js entirely client-side (no server upload needed —
       fits Cloudflare Pages' static-hosting constraints). Scans the
       attached image for a total amount, a date, and a vendor-looking
       line, then pre-fills the Quick-add fields so the user doesn't
       have to type them by hand. PDF receipts skip OCR (Tesseract only
       reads images) but are still attached normally. */
    const runReceiptOCR = async (file) => {
      if (!window.Tesseract || !/^image\//.test(file.type)) return;
      setScanning(true);
      try {
        const { data } = await window.Tesseract.recognize(file, 'eng');
        const text = (data && data.text) || '';
        // Amount: look for currency-prefixed or "Total"-labelled number
        const totalMatch = text.match(/(?:total|amount due|grand total)[^\d]{0,10}([\d,]+\.\d{2})/i)
          || text.match(/(?:RM|MYR|\$)\s?([\d,]+\.\d{2})/i)
          || text.match(/([\d,]{2,}\.\d{2})/);
        if (totalMatch) {
          const clean = totalMatch[1].replace(/,/g, '');
          if (Number(clean) > 0) setAmount(clean);
        }
        // Date: dd/mm/yyyy, dd-mm-yyyy, or "12 Jan 2026" style
        const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
          || text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i);
        if (dateMatch) {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) setExpDate(parsed.toISOString().slice(0, 10));
        }
        // Vendor: first non-empty line of decent length, usually the
        // header/business name on most receipts/invoices.
        const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 2 && l.length < 40 && !/^\d+$/.test(l));
        if (firstLine) setVendor(firstLine);
        // Description fallback if user hasn't typed one yet
        if (!desc.trim() && firstLine) setDesc(`Receipt — ${firstLine}`);
        window.Store.toast('Receipt scanned — details pre-filled, please review', 'success');
      } catch (err) {
        window.Store.toast('Could not auto-read receipt — please enter details manually', 'warning');
      } finally {
        setScanning(false);
      }
    };

    const handleReceiptChange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const maxBytes = 20 * 1024 * 1024;
      if (f.size > maxBytes) {
        window.Store.toast('Receipt is too large — max 20MB', 'danger');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setReceiptFile(f);
      window.Store.toast(`Receipt attached: ${f.name}`, 'success');
      runReceiptOCR(f);
    };

    const statusTone = { pending: 'warning', approved: 'success', rejected: 'danger' };

    return (
      <AppFrame
        active="Expenses"
        title="Expenses"
        breadcrumb={['Arsela Resources', 'Plan', 'Expenses']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => exportRowsToCSV(
              'expenses',
              ['ID', 'Description', 'Vendor', 'Category', 'Department', 'Amount (RM)', 'Status', 'Date'],
              filtered.map((e) => [e.id, e.desc, e.vendor, e.category, e.dept, e.amount, e.status, e.when])
            )}>Export</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => document.getElementById('quick-add-desc')?.focus()}>New Expense</ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
                {[
                  { l: 'Submitted total', v: fmtMYR(submittedThisMonth, { compact: true }), d: `${expenses.length} items`, tone: 'blue', tab: 'All' },
                  { l: 'Pending approval', v: fmtMYR(pendingSum, { compact: true }), d: `${counts.Pending} items`, tone: 'warning', tab: 'Pending' },
                  { l: 'Approved', v: fmtMYR(approvedSum, { compact: true }), d: `${counts.Approved} items`, tone: 'success', tab: 'Approved' },
                ].map((st, i) => (
                  <ArsCard key={i} onClick={() => setTab(st.tab)} title={`Click to view ${st.tab.toLowerCase()} expenses`} style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{st.l}</div>
                    <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8, letterSpacing: -0.3 }}>{st.v}</div>
                    <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{st.d}</div>
                  </ArsCard>
                ))}
              </div>

              <ArsCard padded={false}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--arsela-border)', padding: '0 20px', gap: 4 }}>
                  {['All', 'Pending', 'Approved', 'Rejected'].map((label) => (
                    <div key={label} onClick={() => setTab(label)} style={{
                      padding: '14px 14px', fontSize: 13, fontWeight: 600,
                      color: tab === label ? 'var(--arsela-navy)' : 'var(--arsela-text-muted)',
                      borderBottom: tab === label ? '2px solid var(--arsela-blue)' : '2px solid transparent',
                      marginBottom: -1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {label}
                      <span style={{ fontSize: 11, background: tab === label ? 'var(--arsela-blue-50)' : '#F1F3F7', color: tab === label ? 'var(--arsela-blue)' : 'var(--arsela-text-muted)', padding: '1px 7px', borderRadius: 999, fontWeight: 700 }}>{counts[label]}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '12px 20px', display: 'flex', gap: 8, borderBottom: '1px solid var(--arsela-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F6F8', border: '1px solid var(--arsela-border)', borderRadius: 8, padding: '0 12px', height: 34, width: 260 }}>
                    <IconSearch size={14} style={{ color: 'var(--arsela-text-subtle)' }}/>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search expenses…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit' }}/>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#FAFBFD', borderBottom: '1px solid var(--arsela-border)' }}>
                      {['ID', 'Description', 'Vendor', 'Category', 'Amount', 'Status', 'Actions'].map((h, i) => (
                        <th key={i} style={{ textAlign: h === 'Amount' ? 'right' : 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, i) => (
                      <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--arsela-border)' : 'none' }}>
                        <td className="arsela-mono" style={{ padding: '12px 14px', fontSize: 12, color: 'var(--arsela-text-muted)' }}>{e.id}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{e.desc}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{e.when} · {e.dept}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--arsela-navy)' }}>{e.vendor}</td>
                        <td style={{ padding: '12px 14px' }}><ArsBadge tone="neutral" size="sm">{e.category}</ArsBadge></td>
                        <td className="arsela-num" style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(e.amount)}</td>
                        <td style={{ padding: '12px 14px' }}><ArsBadge tone={statusTone[e.status] || 'neutral'} dot size="sm">{e.status}</ArsBadge></td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, color: 'var(--arsela-text-subtle)' }}>
                            <button onClick={() => setEditExpense(e)} title="Edit" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconEdit size={15}/></button>
                            <button onClick={() => setDeleteExpense(e)} title="Delete" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arsela-danger)' }}><IconTrash size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7}><ArsEmpty icon={<IconReceipt size={22}/>} title="No expenses found" body="Try a different tab or search term."/></td></tr>
                    )}
                  </tbody>
                </table>
              </ArsCard>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ArsCard>
                <ArsSectionHeader title="Quick add expense" subtitle="Draft in seconds — routing updates live"/>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Description</div>
                    <input id="quick-add-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Fleet servicing — Port Klang yard" style={{
                      width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', boxSizing: 'border-box',
                    }}/>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ display: 'block' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Amount (RM)</div>
                      <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" style={{
                        width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', boxSizing: 'border-box',
                      }}/>
                    </label>
                    <label style={{ display: 'block' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Date</div>
                      <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} style={{
                        width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', boxSizing: 'border-box',
                      }}/>
                    </label>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Budget</div>
                    <select value={budgetId} onChange={(e) => {
                      const b = s.budgets.find((bb) => bb.id === e.target.value);
                      setBudgetId(e.target.value);
                      if (b && !deptTouched) setDept(b.dept);
                    }} style={{
                      width: '100%', height: 42, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--arsela-navy)', background: '#fff',
                    }}>
                      {s.budgets.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.id}</option>)}
                    </select>
                    {selectedBudget && <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{fmtMYR(Math.max(0, selectedBudget.allocated - selectedBudget.spent), { compact: true })} remaining</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Department</div>
                    <select value={dept} onChange={(e) => { setDept(e.target.value); setDeptTouched(true); }} style={{
                      width: '100%', height: 42, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--arsela-navy)', background: '#fff',
                    }}>
                      {(s.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>Category</div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => setManageCatsOpen(true)} title="Manage categories" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-muted)', display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                            <IconEdit size={11}/> Manage
                          </button>
                          <button onClick={() => setNewCategoryOpen((o) => !o)} title="Add new category" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-blue)', display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                            <IconPlus size={11}/> New
                          </button>
                        </div>
                      </div>
                      {newCategoryOpen && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <input value={newCategoryDraft} onChange={(e) => setNewCategoryDraft(e.target.value)} placeholder="New category name" style={{
                            flex: 1, height: 32, borderRadius: 6, border: '1px solid var(--arsela-border-strong)', padding: '0 8px', fontSize: 12, fontFamily: 'inherit',
                          }} onKeyDown={(e) => {
                            if (e.key === 'Enter' && newCategoryDraft.trim()) {
                              window.Store.addCategory(newCategoryDraft.trim());
                              setCategory(newCategoryDraft.trim());
                              setNewCategoryDraft(''); setNewCategoryOpen(false);
                            }
                          }}/>
                          <ArsButton size="sm" onClick={() => {
                            if (newCategoryDraft.trim()) {
                              window.Store.addCategory(newCategoryDraft.trim());
                              setCategory(newCategoryDraft.trim());
                              setNewCategoryDraft(''); setNewCategoryOpen(false);
                            }
                          }}>Add</ArsButton>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {categories.map((c) => (
                          <button key={c} onClick={() => setCategory(c)} style={{
                            padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 999,
                            background: category === c ? 'var(--arsela-blue-50)' : '#fff', color: category === c ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                            border: '1px solid ' + (category === c ? '#D6E1FF' : 'var(--arsela-border-strong)'),
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}>{c}</button>
                        ))}
                      </div>
                    </div>
                    <label style={{ display: 'block' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Vendor</div>
                      <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor name" style={{
                        width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', boxSizing: 'border-box',
                      }}/>
                    </label>
                  </div>

                  <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleReceiptChange} style={{ display: 'none' }}/>
                  <div style={{
                    border: '1.5px dashed ' + (receiptFile ? 'var(--success)' : 'var(--arsela-border-strong)'), borderRadius: 8,
                    padding: 16, textAlign: 'center', background: receiptFile ? '#F0FBF6' : '#FAFBFD', cursor: 'pointer',
                  }} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: receiptFile ? 'var(--success)' : 'var(--arsela-blue-50)', color: receiptFile ? '#fff' : 'var(--arsela-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      {receiptFile ? <IconCheck size={18}/> : <IconFile size={18}/>}
                    </div>
                    {scanning ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>Scanning receipt…</div>
                        <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 3 }}>Reading amount, date & vendor</div>
                      </>
                    ) : receiptFile ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receiptFile.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 3 }}>
                          {(receiptFile.size / 1024).toFixed(0)} KB · Auto-filled from scan · <span onClick={(e) => { e.stopPropagation(); setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ color: 'var(--arsela-danger)', fontWeight: 600, cursor: 'pointer' }}>Remove</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>Click to attach receipt or invoice</div>
                        <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 3 }}>PDF, PNG, JPG · up to 20MB · auto-scans & fills details</div>
                      </>
                    )}
                  </div>

                  <RoutingPreview amount={amount} dept={dept}/>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <ArsButton variant="secondary" full onClick={() => submitExpense(true)}>Save draft</ArsButton>
                    <ArsButton full onClick={() => submitExpense(false)}>Submit</ArsButton>
                  </div>
                </div>
              </ArsCard>

              <ArsCard>
                <ArsSectionHeader title="Top vendors · MTD"/>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['ProConst Sdn Bhd', 892000, 92],
                    ['SolarVest Holdings', 612500, 63],
                    ['Amazon Web Services', 480000, 49],
                    ['Vertiv Malaysia', 428900, 44],
                  ].map(([n, v, p], i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: 'var(--arsela-navy)', fontWeight: 600 }}>{n}</span>
                        <span className="arsela-num" style={{ color: 'var(--arsela-navy)', fontWeight: 700 }}>{fmtMYR(v, { compact: true })}</span>
                      </div>
                      <ArsProgress value={p} tone="blue" height={4}/>
                    </div>
                  ))}
                </div>
              </ArsCard>
            </div>
          </div>
        </div>

        {editExpense && <EditExpenseModal expense={editExpense} onClose={() => setEditExpense(null)}/>}
        <ArsConfirmDialog
          open={!!deleteExpense}
          onClose={() => setDeleteExpense(null)}
          onConfirm={() => deleteExpense && window.Store.deleteExpense(deleteExpense.id)}
          title="Delete expense?"
          message={deleteExpense ? `This will permanently remove "${deleteExpense.desc}" (${deleteExpense.id}). This cannot be undone.` : ''}
        />
        {manageCatsOpen && <ManageCategoriesModal onClose={() => setManageCatsOpen(false)}/>}
      </AppFrame>
    );
  }

  Object.assign(window, { ExpensesScreen });
})();
