/* Monthly Monitoring — calendar/period spend tracking with threshold alerts (wired) */
(function () {
  const MonthlyCalendar = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const today = 22;
    // Fake daily spend: heavier weekdays, light weekends
    const daily = days.map((d) => {
      const dow = (d + 2) % 7; // arbitrary starting weekday
      if (dow === 0 || dow === 6) return Math.random() * 40000 + 20000;
      return Math.random() * 220000 + 140000;
    });
    const maxD = Math.max(...daily);
    const cellSize = 18;
    const cellGap = 3;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>July 2026</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--arsela-text-muted)' }}>
            {[['#EEF1F6', 'No spend'], ['#B9CBFF', 'Low'], ['#5B9EFF', 'Medium'], ['#1343CB', 'High'], ['#D64045', 'Threshold breach']].map(([c, l]) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, background: c, borderRadius: 2 }} /> {l}
              </span>
            ))}
          </div>
        </div>
        <div className="coplan-scrollx">
        <div className="coplan-grid-fixed" style={{ display: 'grid', gridTemplateColumns: `repeat(31, ${cellSize}px)`, gap: cellGap }}>
          {daily.map((v, i) => {
            const day = i + 1;
            const isBreach = day === 8 || day === 15 || day === 21;
            const bg = isBreach
              ? '#D64045'
              : v < 40000
              ? '#EEF1F6'
              : v < maxD * 0.4
              ? '#B9CBFF'
              : v < maxD * 0.75
              ? '#5B9EFF'
              : '#1343CB';
            const isFuture = day > today;
            return (
              <div
                key={i}
                onClick={() => window.Store.toast(`${day} Jul · ${fmtMYR(v, { compact: true })} spend`, isBreach ? 'danger' : 'info')}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 3,
                  background: isFuture ? '#F8F9FC' : bg,
                  border: day === today ? '2px solid #001F3D' : isFuture ? '1px dashed #E2E6F0' : 'none',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                title={`${day} Jul · ${fmtMYR(v, { compact: true })}`}
              />
            );
          })}
        </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--arsela-text-subtle)' }}>
          <span>1</span>
          <span>Today · 22 Jul</span>
          <span>31</span>
        </div>
      </div>
    );
  };

  const CategoryBurn = ({ name, plan, actual, onClick, onEdit, onArchive, onDelete, archived }) => {
    const burn = (actual / plan) * 100;
    const varPct = ((actual - plan) / plan) * 100;
    const status = burn > 108 ? 'danger' : burn > 100 ? 'warning' : burn > 85 ? 'blue' : 'success';
    return (
      <tr onClick={onClick} style={{ cursor: 'pointer', opacity: archived ? 0.5 : 1 }}>
        <td style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{name}{archived ? ' · Archived' : ''}</div>
        </td>
        <td className="arsela-num" style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-text-muted)' }}>
          {fmtMYR(plan, { compact: true })}
        </td>
        <td className="arsela-num" style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>
          {fmtMYR(actual, { compact: true })}
        </td>
        <td style={{ padding: '12px 16px', width: 200 }}>
          <ArsProgress value={Math.min(120, burn)} tone={status} showValue />
        </td>
        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
          <ArsVariance value={varPct} invert size="sm" />
        </td>
        <td style={{ padding: '12px 16px' }}>{burn > 108 ? <ArsRAG status="R" /> : burn > 100 ? <ArsRAG status="A" /> : <ArsRAG status="G" />}</td>
        <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <button onClick={onEdit} title="Edit" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)', display: 'flex', padding: 4 }}><IconEdit size={13}/></button>
            <button onClick={onArchive} title={archived ? 'Restore' : 'Archive'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)', display: 'flex', padding: 4 }}><IconArchive size={13}/></button>
            <button onClick={onDelete} title="Delete" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 4 }}><IconClose size={13}/></button>
          </div>
        </td>
      </tr>
    );
  };

  function OpexCategoryModal({ initial, onClose }) {
    const { useState: uS } = React;
    const [name, setName] = uS(initial ? initial.name : '');
    const [plan, setPlan] = uS(initial ? String(initial.plan) : '');
    const [actual, setActual] = uS(initial ? String(initial.actual) : '');
    const save = () => {
      if (!name.trim() || !plan) { window.Store.toast('Enter a category name and monthly plan amount', 'danger'); return; }
      if (initial) {
        window.Store.updateOpexCategory(initial.id, { name: name.trim(), plan: Number(plan) || 0, actual: Number(actual) || 0 });
      } else {
        window.Store.addOpexCategory({ name: name.trim(), plan: Number(plan) || 0, actual: Number(actual) || 0 });
      }
      onClose();
    };
    return (
      <ArsModal open onClose={onClose} title={initial ? 'Edit OPEX category' : 'Add OPEX category'} subtitle="Monthly plan vs actual burn"
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>{initial ? 'Save changes' : 'Add category'}</ArsButton></>}>
        <ArsField label="Category name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Consulting Fees" style={arsFieldInputStyle}/></ArsField>
        <ArsField label={`Monthly plan (${window.Store.getState().currency})`}><input type="number" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="1000000" style={arsFieldInputStyle}/></ArsField>
        <ArsField label={`Actual MTD (${window.Store.getState().currency})`}><input type="number" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="900000" style={arsFieldInputStyle}/></ArsField>
      </ArsModal>
    );
  }

  function MonthlyScreen() {
    const { useState, useMemo, useEffect } = React;
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);
    const [filterOpen, setFilterOpen] = useState(false);
    const [catFilter, setCatFilter] = useState('all');
    const [opexModal, setOpexModal] = useState(null); // null | 'new' | category record

    const opex = (s.opexCategories || []).filter((c) => !c.archived);

    const filteredOpex = useMemo(() => {
      if (catFilter === 'all') return opex;
      return opex.filter((c) => {
        const burn = (c.actual / c.plan) * 100;
        if (catFilter === 'over') return burn > 100;
        if (catFilter === 'under') return burn <= 100;
        return true;
      });
    }, [opex, catFilter]);

    const monthlyPlanTotal = opex.reduce((sum, c) => sum + c.plan, 0);
    const actualToDateTotal = opex.reduce((sum, c) => sum + c.actual, 0);

    const alerts = [
      { c: 'Information Technology', d: '+12.8% over monthly plan · vendor overrun on ERP migration', when: 'Jul 21', lvl: 'R' },
      { c: 'Software Licences', d: '+9.4% over monthly plan · additional Copilot seats', when: 'Jul 20', lvl: 'A' },
      { c: 'Maintenance', d: '+8.7% over monthly plan · fleet servicing pulled forward', when: 'Jul 19', lvl: 'A' },
    ];

    const criticalCount = alerts.filter((a) => a.lvl === 'R').length;
    const warningCount = alerts.filter((a) => a.lvl === 'A').length;

    const [monthOpen, setMonthOpen] = useState(false);
    const [month, setMonth] = useState('Jul 2026');
    const months = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'];
    const chooseMonth = (m) => { setMonth(m); setMonthOpen(false); window.Store.setPeriod(m); };

    const exportMonthly = () => {
      exportRowsToCSV(
        `monthly-monitoring-${month.replace(' ', '-')}`,
        ['Category', `Monthly Plan (${window.Store.getState().currency})`, `Actual MTD (${window.Store.getState().currency})`, 'Burn %', 'Variance %'],
        opex.map((c) => [c.name, c.plan, c.actual, ((c.actual / c.plan) * 100).toFixed(1), (((c.actual - c.plan) / c.plan) * 100).toFixed(1)])
      );
    };

    return (
      <AppFrame
        active="Monthly"
        title="Monthly Monitoring"
        breadcrumb={['Arsela Resources', 'Plan', 'Monthly Monitoring']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <ArsButton
                variant="secondary"
                size="md"
                icon={<IconCalendar size={15} />}
                onClick={() => setMonthOpen((v) => !v)}
              >
                {month}
              </ArsButton>
              {monthOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0, minWidth: 180, background: '#fff',
                  border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: 'var(--arsela-shadow-elevated)',
                  zIndex: 60, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4,
                }}>
                  {months.map((m) => (
                    <button key={m} onClick={() => chooseMonth(m)} style={{
                      padding: '6px 4px', fontSize: 11.5, fontWeight: 600, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                      background: m === month ? 'var(--arsela-blue-50)' : 'transparent', color: m === month ? 'var(--arsela-blue)' : 'var(--arsela-navy)', border: 'none',
                    }}>{m.split(' ')[0]}</button>
                  ))}
                </div>
              )}
            </div>
            <ArsButton
              variant="secondary"
              size="md"
              icon={<IconExport size={15} />}
              onClick={exportMonthly}
            >
              Export
            </ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
            <ArsCard onClick={() => { setCatFilter('all'); document.getElementById('opex-categories') && document.getElementById('opex-categories').scrollIntoView({ behavior: 'smooth' }); }}
              title="Click to view all OPEX categories" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Monthly plan</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(monthlyPlanTotal, { compact: true })}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>{month} allocation</div>
            </ArsCard>
            <ArsCard onClick={() => { setCatFilter('all'); document.getElementById('opex-categories') && document.getElementById('opex-categories').scrollIntoView({ behavior: 'smooth' }); }}
              title="Click to view actual spend breakdown" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Actual to date</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(actualToDateTotal, { compact: true })}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <ArsProgress value={Math.round((actualToDateTotal / monthlyPlanTotal) * 100)} tone="blue" style={{ flex: 1 }} />
                <span className="arsela-num" style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>{Math.round((actualToDateTotal / monthlyPlanTotal) * 100)}% · day 22/31</span>
              </div>
            </ArsCard>
            <ArsCard onClick={() => window.Router.go('/capex')} title="Click to view CAPEX & commitments" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Commitments</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(5_800_000, { compact: true })}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>POs & contracts, not invoiced</div>
            </ArsCard>
            <ArsCard onClick={() => setCatFilter('over')} title="Click to view categories over plan" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Threshold breaches</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
                <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--danger)', letterSpacing: -0.4 }}>{alerts.length}</div>
                <span style={{ fontSize: 13, color: 'var(--arsela-text-muted)' }}>this month</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <ArsBadge tone="danger" size="sm">{criticalCount} critical</ArsBadge>
                <ArsBadge tone="warning" size="sm">{warningCount} warning</ArsBadge>
              </div>
            </ArsCard>
          </div>

          {/* Calendar + alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <ArsCard>
              <ArsSectionHeader title="Daily spend calendar" subtitle="Heat map of daily burn · weekends muted · today outlined · click a day for detail" />
              <MonthlyCalendar />
            </ArsCard>
            <ArsCard>
              <ArsSectionHeader title="Threshold alerts" subtitle="Auto-triggered when > 100% of monthly plan" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    onClick={() => setCatFilter(catFilter === 'over' ? 'all' : 'over')}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: a.lvl === 'R' ? 'var(--danger-50)' : 'var(--warning-50)',
                      borderLeft: '3px solid ' + (a.lvl === 'R' ? 'var(--danger)' : 'var(--warning)'),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{a.c}</span>
                      <ArsRAG status={a.lvl} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', lineHeight: 1.5 }}>{a.d}</div>
                    <div style={{ fontSize: 11, color: 'var(--arsela-text-subtle)', marginTop: 6 }}>Triggered {a.when}</div>
                  </div>
                ))}
              </div>
            </ArsCard>
          </div>

          {/* OPEX categories table */}
          <ArsCard padded={false} id="opex-categories">
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>OPEX categories · monthly burn</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
                  {filteredOpex.length} of {opex.length} categories{catFilter !== 'all' ? ` · filtered: ${catFilter === 'over' ? 'over plan' : 'under plan'}` : ''} · plan vs actual · variance in spend terms (over = red)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {catFilter !== 'all' && (
                  <ArsButton variant="ghost" size="sm" icon={<IconClose size={13} />} onClick={() => setCatFilter('all')}>
                    Clear filter
                  </ArsButton>
                )}
                <ArsButton variant="secondary" size="sm" icon={<IconFilter size={13} />} onClick={() => setFilterOpen((v) => !v)}>
                  Filter
                </ArsButton>
                <ArsButton size="sm" icon={<IconPlus size={13} />} onClick={() => setOpexModal('new')}>
                  Add category
                </ArsButton>
              </div>
            </div>
            {filterOpen && (
              <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', gap: 8 }}>
                {[
                  ['all', 'All'],
                  ['over', 'Over plan'],
                  ['under', 'Under / on plan'],
                ].map(([v, l]) => (
                  <ArsButton key={v} size="sm" variant={catFilter === v ? 'primary' : 'secondary'} onClick={() => setCatFilter(v)}>
                    {l}
                  </ArsButton>
                ))}
              </div>
            )}
            <div style={{ maxHeight: 380, overflow: 'auto' }} className="ars-table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--arsela-surface-alt)', borderBottom: '1px solid var(--arsela-border)' }}>
                    {['Category', 'Monthly plan', 'Actual MTD', 'Burn', 'Variance', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: ['Monthly plan', 'Actual MTD', 'Variance', 'Actions'].includes(h) ? 'right' : 'left',
                          padding: '11px 16px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--arsela-text-muted)',
                          letterSpacing: 0.6,
                          textTransform: 'uppercase',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOpex.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 24 }}>
                        <ArsEmpty title="No categories match this filter" />
                      </td>
                    </tr>
                  ) : (
                    filteredOpex.map((c) => (
                      <CategoryBurn
                        key={c.id}
                        {...c}
                        onClick={() => window.Router.go('/expenses?q=' + encodeURIComponent(c.name))}
                        onEdit={() => setOpexModal(c)}
                        onArchive={() => window.Store.archiveOpexCategory(c.id, true)}
                        onDelete={() => { if (confirm(`Delete OPEX category "${c.name}"?`)) window.Store.deleteOpexCategory(c.id); }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ArsCard>
        </div>
        {opexModal && <OpexCategoryModal initial={opexModal === 'new' ? null : opexModal} onClose={() => setOpexModal(null)}/>}
      </AppFrame>
    );
  }

  Object.assign(window, { MonthlyScreen, MonthlyCalendar, CategoryBurn });
})();
