/* ============================================================
   Coplanistra — Budgets list (wired)
   Live data from window.Store; functional search / filters /
   sorting-lite / pagination-lite / row actions / New Budget nav.
   ============================================================ */
(function () {
  const { useState, useEffect, useMemo } = React;

  const STATUS_OPTIONS = ['Any', 'draft', 'active', 'amendment', 'over', 'closed', 'archived'];
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
          <span style={{ fontWeight: 600 }}>{value}</span>
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

  function BudgetsScreen() {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);

    const routeParams = window.Router.current().params;
    const [q, setQ] = useState(routeParams.q || '');
    const [dept, setDept] = useState('All');
    const [status, setStatus] = useState('Any');
    const [view, setView] = useState('table'); // table | cards
    const [page, setPage] = useState(1);

    useEffect(() => {
      // stay in sync if user searches again via topbar while already on this screen
      const unsub = window.Router.subscribe((r) => {
        if (r.params.q !== undefined) setQ(r.params.q);
      });
      return unsub;
    }, []);

    const budgets = s.budgets;
    const depts = useMemo(() => ['All', ...Array.from(new Set(budgets.map(b => b.dept)))], [budgets]);

    const filtered = useMemo(() => {
      return budgets.filter((b) => {
        if (dept !== 'All' && b.dept !== dept) return false;
        if (status !== 'Any' && b.status !== status) return false;
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
      return pct >= 80 && pct < 100;
    }).length;
    const overCount = budgets.filter(b => b.status === 'over').length;

    const goDetail = (id) => window.Router.go('/budgets/' + id);

    return (
      <AppFrame
        active="Budgets"
        title="Budgets"
        breadcrumb={['Acme Holdings', 'Plan', 'Budgets']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconLock size={15}/>} onClick={() => window.Router.go('/closeout')}>FY Closeout</ArsButton>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast('Exporting budgets to CSV…', 'info')}>Export</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>
          </div>
        }
      >
        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          <ArsCard>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>All Budgets</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8 }}>{budgets.length}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Across {depts.length - 1} departments</div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Active</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-success)', marginTop: 8 }}>{activeCount}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{Math.round(activeCount / budgets.length * 100)}% of all budgets</div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Nearing Cap</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: '#B4740A', marginTop: 8 }}>{nearingCount}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>≥ 80% utilised</div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Over-Budget</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-danger)', marginTop: 8 }}>{overCount}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Requires attention</div>
          </ArsCard>
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  const pct = b.allocated ? Math.round((b.spent / b.allocated) * 100) : 0;
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
                        <ArsProgress value={Math.min(100, pct)} tone={tone} showValue/>
                      </td>
                      <td className="arsela-num" style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{fmtMYR(b.allocated, { compact: true })}</td>
                      <td className="arsela-num" style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(b.spent, { compact: true })}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <ArsLifecycle status={b.status}/>
                      </td>
                      <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, color: 'var(--arsela-text-subtle)' }}>
                          <button onClick={() => goDetail(b.id)} title="View" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconEye size={15}/></button>
                          <button onClick={() => window.Router.go('/budgets/' + b.id + '?edit=1')} title="Edit" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconEdit size={15}/></button>
                          <button onClick={() => window.Store.toast('More actions coming soon', 'info')} title="More" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconMore size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {pageItems.map((b) => {
                const pct = b.allocated ? Math.round((b.spent / b.allocated) * 100) : 0;
                const tone = pct >= 100 ? 'danger' : pct > 90 ? 'danger' : pct > 80 ? 'warning' : 'blue';
                return (
                  <div key={b.id} onClick={() => goDetail(b.id)} style={{
                    border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16, cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="arsela-mono" style={{ fontSize: 11, color: 'var(--arsela-text-muted)' }}>{b.id}</span>
                      <ArsLifecycle status={b.status}/>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8 }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{b.dept} · {b.period}</div>
                    <div style={{ marginTop: 12 }}><ArsProgress value={Math.min(100, pct)} tone={tone} showValue/></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
                      <span style={{ color: 'var(--arsela-text-muted)' }}>Allocated <b className="arsela-num" style={{ color: 'var(--arsela-navy)' }}>{fmtMYR(b.allocated, { compact: true })}</b></span>
                      <span style={{ color: 'var(--arsela-text-muted)' }}>Spent <b className="arsela-num" style={{ color: 'var(--arsela-navy)' }}>{fmtMYR(b.spent, { compact: true })}</b></span>
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
      </AppFrame>
    );
  }

  Object.assign(window, { BudgetsScreen });
})();
