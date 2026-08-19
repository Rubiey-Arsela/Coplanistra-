/* ============================================================
   Coplanistra — Budgets list (wired)
   Live data from window.Store; functional search / filters /
   sorting-lite / pagination-lite / row actions / New Budget nav.
   ============================================================ */
(function () {
  const { useState, useEffect, useMemo } = React;

  const STATUS_OPTIONS = ['Any', 'draft', 'active', 'amendment', 'over', 'closed', 'archived', 'nearing'];
  // Label override for filter values not meant to appear as raw keys in
  // the dropdown/badge UI (closedOrArchived is set only by the "Closed"
  // summary card, not offered as its own dropdown option since it's a
  // shorthand for "closed OR archived").
  const STATUS_LABELS = { closedOrArchived: 'Closed/Archived' };
  const PAGE_SIZE = 8;

  function FilterDropdown({ label, value, options, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = React.useRef(null);
    useEffect(() => {
      if (!open) return;
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return (
      <div style={{ position: 'relative' }} ref={ref}>
        <button onClick={() => setOpen(o => !o)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '0 14px', height: 36, borderRadius: 8,
          background: '#fff', border: '1px solid var(--arsela-border-strong)',
          fontSize: 13, fontFamily: 'inherit', color: 'var(--arsela-navy)', cursor: 'pointer',
        }}>
          <span style={{ color: 'var(--arsela-text-muted)' }}>{label}:</span>
          <span style={{ fontWeight: 600 }}>{STATUS_LABELS[value] || value}</span>
          <IconChevronDown size={13} style={{ color: 'var(--arsela-text-subtle)' }}/>
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 42, left: 0, minWidth: 180, maxHeight: 260, overflowY: 'auto',
            background: '#fff', border: '1px solid var(--arsela-border)', borderRadius: 10,
            boxShadow: 'var(--arsela-shadow-elevated)', zIndex: 50, padding: 4,
          }}>
            {options.map((o) => (
              <button key={o} onClick={() => { onChange(o); setOpen(false); }} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6,
                border: 'none', background: o === value ? 'var(--arsela-blue-50)' : 'transparent',
                color: o === value ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                fontSize: 13, fontWeight: o === value ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>{o}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const BUDGET_STATUS_OPTIONS = ['draft', 'active', 'amendment', 'over', 'closed', 'archived'];

  /* ---- Manage categories / departments / budget codes ---- */
  function TaxonomyListEditor({ title, items, onAdd, onRename, onDelete }) {
    const [draft, setDraft] = useState('');
    const [editing, setEditing] = useState(null);
    const [editDraft, setEditDraft] = useState('');
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 8 }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {items.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--arsela-text-muted)' }}>None yet.</div>}
          {items.map((it) => (
            <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#FAFBFD', border: '1px solid var(--arsela-border)', borderRadius: 8 }}>
              {editing === it ? (
                <>
                  <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} style={{ ...arsFieldInputStyle, height: 30, flex: 1 }} autoFocus/>
                  <button onClick={() => { if (onRename) onRename(it, editDraft); setEditing(null); }} title="Save" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--success)' }}><IconCheck size={14}/></button>
                  <button onClick={() => setEditing(null)} title="Cancel" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)' }}><IconClose size={14}/></button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--arsela-navy)', fontWeight: 500 }}>{it}</span>
                  {onRename && <button onClick={() => { setEditing(it); setEditDraft(it); }} title="Rename" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)' }}><IconEdit size={13}/></button>}
                  <button onClick={() => onDelete(it)} title="Delete" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-danger)' }}><IconClose size={13}/></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add new…" style={{ ...arsFieldInputStyle, flex: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { onAdd(draft.trim()); setDraft(''); } }}/>
          <ArsButton size="sm" icon={<IconPlus size={13}/>} onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(''); } }}>Add</ArsButton>
        </div>
      </div>
    );
  }

  function ManageTaxonomyModal({ onClose }) {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);
    return (
      <ArsModal open onClose={onClose} title="Manage categories, departments & budget codes"
        subtitle="Shared across Budgets, Expenses and CAPEX — changes apply everywhere immediately"
        width={520}
        footer={<ArsButton onClick={onClose}>Done</ArsButton>}>
        <TaxonomyListEditor title="Departments" items={s.departments}
          onAdd={(v) => window.Store.addDepartment(v)}
          onRename={(o, n) => window.Store.renameDepartment(o, n)}
          onDelete={(v) => window.Store.deleteDepartment(v)}/>
        <TaxonomyListEditor title="Expense categories" items={s.categories}
          onAdd={(v) => window.Store.addCategory(v)}
          onRename={(o, n) => window.Store.renameCategory(o, n)}
          onDelete={(v) => window.Store.deleteCategory(v)}/>
        <TaxonomyListEditor title="Budget code prefixes" items={s.budgetCodes}
          onAdd={(v) => window.Store.addBudgetCode(v)}
          onDelete={(v) => window.Store.deleteBudgetCode(v)}/>
      </ArsModal>
    );
  }

  function EditBudgetModal({ budget, onClose }) {
    const [form, setForm] = useState(() => ({
      name: budget.name, dept: budget.dept, period: budget.period,
      allocated: budget.allocated, spent: budget.spent, status: budget.status,
    }));
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const save = () => {
      if (!form.name.trim()) { window.Store.toast('Budget name is required', 'danger'); return; }
      window.Store.updateBudget(budget.id, {
        name: form.name.trim(), dept: form.dept.trim(), period: form.period.trim(),
        allocated: Number(form.allocated) || 0, spent: Number(form.spent) || 0, status: form.status,
      });
      onClose();
    };
    return (
      <ArsModal open onClose={onClose} title={`Edit ${budget.id}`} subtitle={budget.name}
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>Save changes</ArsButton></>}>
        <ArsField label="Budget name"><input value={form.name} onChange={set('name')} style={arsFieldInputStyle}/></ArsField>
        <ArsField label="Department"><input value={form.dept} onChange={set('dept')} style={arsFieldInputStyle}/></ArsField>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Period"><input value={form.period} onChange={set('period')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Status">
            <select value={form.status} onChange={set('status')} style={arsFieldInputStyle}>
              {BUDGET_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </ArsField></div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label={`Allocated (${window.Store.getState().currency})`}><input type="number" value={form.allocated} onChange={set('allocated')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label={`Spent (${window.Store.getState().currency})`}><input type="number" value={form.spent} onChange={set('spent')} style={arsFieldInputStyle}/></ArsField></div>
        </div>
      </ArsModal>
    );
  }

  function BudgetsScreen() {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);

    const routeParams = window.Router.current().params;
    const [q, setQ] = useState(routeParams.q || '');
    const [dept, setDept] = useState(routeParams.dept || 'All');
    const [status, setStatus] = useState(routeParams.status || 'Any');
    const [view, setView] = useState('table'); // table | cards
    const [page, setPage] = useState(1);
    const [editBudget, setEditBudget] = useState(null);
    const [deleteBudget, setDeleteBudget] = useState(null);
    const [manageOpen, setManageOpen] = useState(false);

    useEffect(() => {
      // stay in sync if user navigates here again (topbar search, dashboard
      // links, status-badge clicks) while already on this screen
      const unsub = window.Router.subscribe((r) => {
        if (r.params.q !== undefined) setQ(r.params.q);
        if (r.params.dept !== undefined) setDept(r.params.dept);
        if (r.params.status !== undefined) setStatus(r.params.status);
      });
      return unsub;
    }, []);

    const budgets = s.budgets;
    const depts = useMemo(() => ['All', ...Array.from(new Set([...(s.departments || []), ...budgets.map(b => b.dept)]))], [budgets, s.departments]);

    const filtered = useMemo(() => {
      return budgets.filter((b) => {
        if (dept !== 'All' && b.dept !== dept) return false;
        if (status === 'nearing') {
          const pct = b.allocated ? (b.spent / b.allocated) * 100 : 0;
          if (!(b.status === 'active' && pct >= 80 && pct < 100)) return false;
        } else if (status === 'closedOrArchived') {
          if (b.status !== 'closed' && b.status !== 'archived') return false;
        } else if (status !== 'Any' && b.status !== status) return false;
        if (q.trim()) {
          const needle = q.trim().toLowerCase();
          const hay = `${b.name} ${b.id} ${b.owner}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      });
    }, [budgets, dept, status, q]);

    useEffect(() => { setPage(1); }, [q, dept, status]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageSafe = Math.min(page, totalPages);
    const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

    const activeCount = budgets.filter(b => b.status === 'active').length;
    const nearingCount = budgets.filter(b => {
      const pct = b.allocated ? (b.spent / b.allocated) * 100 : 0;
      return b.status === 'active' && pct >= 80 && pct < 100;
    }).length;
    const overCount = budgets.filter(b => b.status === 'over').length;
    const draftCount = budgets.filter(b => b.status === 'draft').length;
    // "Closed" here covers both 'closed' (FY Closeout lock) and 'archived'
    // (manually archived) — both mean "no longer an open working budget".
    const closedCount = budgets.filter(b => b.status === 'closed' || b.status === 'archived').length;

    const goDetail = (id) => window.Router.go('/budgets/' + id);
    const filterByStatus = (val) => { setDept('All'); setStatus(val); };
    // A budget is visually "nearing cap" when it's still active but has
    // burned 80-99% of allocation — surfaced as its own lifecycle badge
    // (distinct from the plain "Active" pill) so at-risk budgets stand
    // out in the table/card views before they actually breach 100%.
    const displayStatus = (b) => {
      if (b.status !== 'active') return b.status;
      const pct = b.allocated ? (b.spent / b.allocated) * 100 : 0;
      return (pct >= 80 && pct < 100) ? 'nearing' : 'active';
    };

    return (
      <AppFrame
        active="Budgets"
        title="Budgets"
        breadcrumb={['Arsela Resources', 'Plan', 'Budgets']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconLock size={15}/>} onClick={() => window.Router.go('/closeout')}>FY Closeout</ArsButton>
            <ArsButton variant="secondary" size="md" icon={<IconSettings size={15}/>} onClick={() => setManageOpen(true)}>Manage Categories</ArsButton>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast('Exporting budgets to CSV…', 'info')}>Export</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>
          </div>
        }
      >
        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 20 }}>
          <div onClick={() => filterByStatus('Any')} style={{ cursor: 'pointer' }} title="Show all budgets">
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>All Budgets</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8 }}>{budgets.length}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Across {depts.length - 1} departments</div>
            </ArsCard>
          </div>
          <div onClick={() => filterByStatus('active')} style={{ cursor: 'pointer' }} title="Show all active budgets">
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Active</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-success)', marginTop: 8 }}>{activeCount}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{Math.round(activeCount / budgets.length * 100)}% of all budgets</div>
            </ArsCard>
          </div>
          <div onClick={() => filterByStatus('draft')} style={{ cursor: 'pointer' }} title="Show draft budgets">
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Draft</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: '#5B6B82', marginTop: 8 }}>{draftCount}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Not yet approved</div>
            </ArsCard>
          </div>
          <div onClick={() => filterByStatus('nearing')} style={{ cursor: 'pointer' }} title="Show budgets nearing their cap">
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Nearing Cap</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: '#B4740A', marginTop: 8 }}>{nearingCount}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>80–99% utilised</div>
            </ArsCard>
          </div>
          <div onClick={() => filterByStatus('over')} style={{ cursor: 'pointer' }} title="Show over-budget items">
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Over-Budget</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-danger)', marginTop: 8 }}>{overCount}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Requires attention</div>
            </ArsCard>
          </div>
          <div onClick={() => filterByStatus('closedOrArchived')} style={{ cursor: 'pointer' }} title="Show closed / archived budgets">
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Closed</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: '#5B21B6', marginTop: 8 }}>{closedCount}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Locked at FY closeout or archived</div>
            </ArsCard>
          </div>
        </div>

        {/* Filter bar */}
        <ArsCard padded={false}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--arsela-border)', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#F4F6F8', border: '1px solid var(--arsela-border)',
              borderRadius: 8, padding: '0 12px', height: 36, width: 300,
            }}>
              <IconSearch size={15} style={{ color: 'var(--arsela-text-subtle)' }}/>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, owner…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit' }}/>
              {q && <button onClick={() => setQ('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)', display: 'flex' }}><IconClose size={13}/></button>}
            </div>

            <FilterDropdown label="Department" value={dept} options={depts} onChange={setDept}/>
            <FilterDropdown label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus}/>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setView('table')} style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: view === 'table' ? 'var(--arsela-navy)' : '#fff', color: view === 'table' ? '#fff' : 'var(--arsela-navy)', border: '1px solid var(--arsela-border-strong)' }}>Table</button>
              <button onClick={() => setView('cards')} style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: view === 'cards' ? 'var(--arsela-navy)' : '#fff', color: view === 'cards' ? '#fff' : 'var(--arsela-navy)', border: '1px solid var(--arsela-border-strong)' }}>Cards</button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 40 }}><ArsEmpty icon={<IconWallet size={22}/>} title="No budgets match your filters" body="Try clearing search or filters."/></div>
          ) : view === 'table' ? (
            <div className="coplan-scrollx">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr style={{ background: '#FAFBFD', borderBottom: '1px solid var(--arsela-border)' }}>
                  {['', 'Budget', 'Department', 'Period', 'Utilisation', 'Allocated', 'Spent', 'Status', 'Actions'].map((h, i) => (
                    <th key={i} style={{
                      textAlign: ['Allocated', 'Spent'].includes(h) ? 'right' : 'left',
                      padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)',
                      letterSpacing: 0.6, textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      {i === 0 ? <input type="checkbox" style={{ width: 14, height: 14, accentColor: 'var(--arsela-blue)' }}/> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((b, i) => {
                  const pct = b.allocated ? (b.spent / b.allocated) * 100 : 0;
                  const tone = pct >= 100 ? 'danger' : pct > 90 ? 'danger' : pct > 80 ? 'warning' : 'blue';
                  return (
                    <tr key={b.id} style={{ borderBottom: i < pageItems.length - 1 ? '1px solid var(--arsela-border)' : 'none', cursor: 'pointer' }}
                      onClick={() => goDetail(b.id)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FAFBFD'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}><input type="checkbox" style={{ width: 14, height: 14, accentColor: 'var(--arsela-blue)' }}/></td>
                      <td style={{ padding: '14px 16px', maxWidth: 320 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)', marginBottom: 2 }}>{b.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="arsela-mono">{b.id}</span>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--arsela-text-subtle)' }}/>
                          <ArsAvatar name={b.owner} size={18} tone="blue"/> {b.owner}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--arsela-navy)' }}>{b.dept}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--arsela-text-muted)' }}>{b.period}</td>
                      <td style={{ padding: '14px 16px', width: 200 }}>
                        <ArsProgress value={pct} tone={tone} showValue decimals={pct >= 100 ? 1 : 0}/>
                      </td>
                      <td className="arsela-num" style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{fmtMYR(b.allocated, { compact: true })}</td>
                      <td className="arsela-num" style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(b.spent, { compact: true })}</td>
                      <td style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); filterByStatus(displayStatus(b)); }} title={`Filter by status: ${displayStatus(b)}`}>
                        <ArsLifecycle status={displayStatus(b)}/>
                      </td>
                      <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, color: 'var(--arsela-text-subtle)' }}>
                          <button onClick={() => goDetail(b.id)} title="View" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconEye size={15}/></button>
                          <button onClick={() => setEditBudget(b)} title="Edit" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconEdit size={15}/></button>
                          <button onClick={() => (b.status === 'archived' ? window.Store.unarchiveBudget(b.id) : window.Store.archiveBudget(b.id))} title={b.status === 'archived' ? 'Restore to Active' : 'Archive'} style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconArchive size={15}/></button>
                          <button onClick={() => setDeleteBudget(b)} title="Delete" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arsela-danger)' }}><IconClose size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : (
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {pageItems.map((b) => {
                const pct = b.allocated ? (b.spent / b.allocated) * 100 : 0;
                const tone = pct >= 100 ? 'danger' : pct > 90 ? 'danger' : pct > 80 ? 'warning' : 'blue';
                return (
                  <div key={b.id} onClick={() => goDetail(b.id)} style={{
                    border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16, cursor: 'pointer', position: 'relative',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="arsela-mono" style={{ fontSize: 11, color: 'var(--arsela-text-muted)' }}>{b.id}</span>
                      <span onClick={(e) => { e.stopPropagation(); filterByStatus(displayStatus(b)); }} title={`Filter by status: ${displayStatus(b)}`} style={{ cursor: 'pointer' }}><ArsLifecycle status={displayStatus(b)}/></span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8 }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{b.dept} · {b.period}</div>
                    <div style={{ marginTop: 12 }}><ArsProgress value={pct} tone={tone} showValue decimals={pct >= 100 ? 1 : 0}/></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
                      <span style={{ color: 'var(--arsela-text-muted)' }}>Allocated <b className="arsela-num" style={{ color: 'var(--arsela-navy)' }}>{fmtMYR(b.allocated, { compact: true })}</b></span>
                      <span style={{ color: 'var(--arsela-text-muted)' }}>Spent <b className="arsela-num" style={{ color: 'var(--arsela-navy)' }}>{fmtMYR(b.spent, { compact: true })}</b></span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 12, borderTop: '1px solid var(--arsela-border)', paddingTop: 10 }} onClick={(e) => e.stopPropagation()}>
                      <ArsButton variant="secondary" size="sm" icon={<IconEdit size={13}/>} onClick={() => setEditBudget(b)}>Edit</ArsButton>
                      <ArsButton variant="secondary" size="sm" icon={<IconArchive size={13}/>} onClick={() => (b.status === 'archived' ? window.Store.unarchiveBudget(b.id) : window.Store.archiveBudget(b.id))}>{b.status === 'archived' ? 'Restore' : 'Archive'}</ArsButton>
                      <ArsButton variant="danger" size="sm" icon={<IconClose size={13}/>} onClick={() => setDeleteBudget(b)}>Delete</ArsButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer / pagination */}
          {filtered.length > 0 && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--arsela-text-muted)' }}>
              <div>Showing <b style={{ color: 'var(--arsela-navy)' }}>{(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)}</b> of <b style={{ color: 'var(--arsela-navy)' }}>{filtered.length}</b> budgets</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageSafe === 1} style={{
                  minWidth: 30, height: 30, padding: '0 8px', borderRadius: 6, background: '#fff', color: 'var(--arsela-navy)',
                  border: '1px solid var(--arsela-border-strong)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: pageSafe === 1 ? 'not-allowed' : 'pointer', opacity: pageSafe === 1 ? 0.4 : 1,
                }}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} style={{
                    minWidth: 30, height: 30, padding: '0 8px', borderRadius: 6,
                    background: p === pageSafe ? 'var(--arsela-navy)' : '#fff',
                    color: p === pageSafe ? '#fff' : 'var(--arsela-navy)',
                    border: '1px solid ' + (p === pageSafe ? 'var(--arsela-navy)' : 'var(--arsela-border-strong)'),
                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                  }}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages} style={{
                  minWidth: 30, height: 30, padding: '0 8px', borderRadius: 6, background: '#fff', color: 'var(--arsela-navy)',
                  border: '1px solid var(--arsela-border-strong)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: pageSafe === totalPages ? 'not-allowed' : 'pointer', opacity: pageSafe === totalPages ? 0.4 : 1,
                }}>›</button>
              </div>
            </div>
          )}
        </ArsCard>

        {editBudget && <EditBudgetModal budget={editBudget} onClose={() => setEditBudget(null)}/>}
        {manageOpen && <ManageTaxonomyModal onClose={() => setManageOpen(false)}/>}
        <ArsConfirmDialog
          open={!!deleteBudget}
          onClose={() => setDeleteBudget(null)}
          onConfirm={() => deleteBudget && window.Store.deleteBudget(deleteBudget.id)}
          title="Delete budget?"
          message={deleteBudget ? `This will permanently remove "${deleteBudget.name}" (${deleteBudget.id}). This cannot be undone.` : ''}
        />
      </AppFrame>
    );
  }

  Object.assign(window, { BudgetsScreen });
})();
