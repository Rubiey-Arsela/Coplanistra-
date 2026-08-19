/* Monthly Monitoring — calendar/period spend tracking with threshold alerts (wired to Store) */
(function () {
  /* Deterministic pseudo-random daily spend generator, seeded by
     (year, month, day) so the calendar doesn't re-randomise on every
     re-render (was Math.random() called fresh each render, which
     also meant clicking a day showed a DIFFERENT figure than the
     cell that rendered). Purely a display heuristic — there is no
     real daily transaction feed wired in yet. */
  function seededDailySpend(year, month, day, monthlyPlanTotal) {
    const seed = year * 10000 + month * 100 + day;
    let x = Math.sin(seed) * 10000;
    x = x - Math.floor(x);
    const dow = new Date(year, month, day).getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dow === 0 || dow === 6;
    const dailyBudget = monthlyPlanTotal / 30.4;
    if (isWeekend) return x * dailyBudget * 0.35;
    return dailyBudget * (0.55 + x * 0.9);
  }

  const MonthlyCalendar = ({ monthDate, monthlyPlanTotal, breachDays, onDayClick }) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const today = window.Store.today();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = isCurrentMonth ? today.getDate() : null;
    const monthLabel = monthDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

    const daily = days.map((d) => seededDailySpend(year, month, d, monthlyPlanTotal));
    const maxD = Math.max(...daily, 1);
    const cellSize = 18;
    const cellGap = 3;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{monthLabel}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--arsela-text-muted)' }}>
            {[['#EEF1F6', 'No spend'], ['#B9CBFF', 'Low'], ['#5B9EFF', 'Medium'], ['#1343CB', 'High'], ['#D64045', 'Threshold breach']].map(([c, l]) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, background: c, borderRadius: 2 }} /> {l}
              </span>
            ))}
          </div>
        </div>
        <div className="coplan-scrollx">
        <div className="coplan-grid-fixed" style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInMonth}, ${cellSize}px)`, gap: cellGap }}>
          {daily.map((v, i) => {
            const day = i + 1;
            const isBreach = breachDays.includes(day);
            const bg = isBreach
              ? '#D64045'
              : v < maxD * 0.15
              ? '#EEF1F6'
              : v < maxD * 0.4
              ? '#B9CBFF'
              : v < maxD * 0.75
              ? '#5B9EFF'
              : '#1343CB';
            const isFuture = isCurrentMonth ? day > todayDate : monthDate > today;
            return (
              <div
                key={i}
                onClick={() => onDayClick && onDayClick(day, v, isBreach)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 3,
                  background: isFuture ? '#F8F9FC' : bg,
                  border: day === todayDate ? '2px solid #001F3D' : isFuture ? '1px dashed #E2E6F0' : 'none',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                title={`${day} ${monthDate.toLocaleDateString('en-AU', { month: 'short' })} · ${fmtMYR(v, { compact: true })}`}
              />
            );
          })}
        </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--arsela-text-subtle)' }}>
          <span>1</span>
          {isCurrentMonth ? <span>Today · {todayDate} {monthDate.toLocaleDateString('en-AU', { month: 'short' })}</span> : <span>&nbsp;</span>}
          <span>{daysInMonth}</span>
        </div>
      </div>
    );
  };

  const CategoryBurn = ({ name, plan, actual, onClick, onEdit, onArchive, onDelete, archived }) => {
    const burn = plan ? (actual / plan) * 100 : 0;
    const varPct = plan ? ((actual - plan) / plan) * 100 : 0;
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

    const today = window.Store.today();
    const opex = (s.opexCategories || []).filter((c) => !c.archived);

    const filteredOpex = useMemo(() => {
      if (catFilter === 'all') return opex;
      return opex.filter((c) => {
        const burn = c.plan ? (c.actual / c.plan) * 100 : 0;
        if (catFilter === 'over') return burn > 100;
        if (catFilter === 'under') return burn <= 100;
        return true;
      });
    }, [opex, catFilter]);

    const monthlyPlanTotal = opex.reduce((sum, c) => sum + c.plan, 0);
    const actualToDateTotal = opex.reduce((sum, c) => sum + c.actual, 0);

    // Threshold alerts derived live from real OPEX category burn — no
    // longer a hardcoded fake list. Any category over 100% of its
    // monthly plan surfaces here, worst offenders first.
    const alerts = useMemo(() => {
      return opex
        .filter((c) => c.plan > 0 && c.actual > c.plan)
        .map((c) => {
          const overPct = ((c.actual - c.plan) / c.plan) * 100;
          return {
            c: c.name,
            d: `+${overPct.toFixed(1)}% over monthly plan · ${fmtMYR(c.actual - c.plan, { compact: true })} above budget`,
            lvl: overPct > 8 ? 'R' : 'A',
            overPct,
          };
        })
        .sort((a, b) => b.overPct - a.overPct);
    }, [opex]);

    const criticalCount = alerts.filter((a) => a.lvl === 'R').length;
    const warningCount = alerts.filter((a) => a.lvl === 'A').length;

    // Open CAPEX commitments (POs & contracts not yet invoiced) — pulled
    // live from the CAPEX module instead of a hardcoded RM 5.8M figure
    // that never matched the actual CAPEX portfolio.
    const capexProjects = s.capexProjects || [];
    const openCommitments = capexProjects.reduce((sum, p) => sum + (p.openCommitments ?? Math.max(0, p.committed - p.spent)), 0);

    const [monthOffset, setMonthOffset] = useState(0); // 0 = current fiscal-today month
    const [monthOpen, setMonthOpen] = useState(false);
    const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const monthLabel = monthDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - 6 + i, 1);
      return { offset: i - 6, label: d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }), short: d.toLocaleDateString('en-AU', { month: 'short' }) };
    });
    const chooseMonth = (offset, label) => { setMonthOffset(offset); setMonthOpen(false); window.Store.setPeriod(label); };

    const isCurrentMonth = monthOffset === 0;
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const dayProgressLabel = isCurrentMonth ? `day ${dayOfMonth}/${daysInMonth}` : monthOffset < 0 ? 'month closed' : 'upcoming month';

    // Breach days: derive from actual threshold-alert categories, mapped
    // onto a few representative days in the displayed month (illustrative
    // until a real daily transaction feed exists).
    const breachDays = useMemo(() => {
      if (!isCurrentMonth || alerts.length === 0) return [];
      return alerts.slice(0, 3).map((_, i) => Math.max(1, dayOfMonth - (i + 1) * 2)).filter((d) => d <= daysInMonth);
    }, [alerts, isCurrentMonth, dayOfMonth, daysInMonth]);

    const exportMonthly = () => {
      exportRowsToCSV(
        `monthly-monitoring-${monthLabel.replace(' ', '-')}`,
        ['Category', `Monthly Plan (${window.Store.getState().currency})`, `Actual MTD (${window.Store.getState().currency})`, 'Burn %', 'Variance %'],
        opex.map((c) => [c.name, c.plan, c.actual, (c.plan ? (c.actual / c.plan) * 100 : 0).toFixed(1), (c.plan ? ((c.actual - c.plan) / c.plan) * 100 : 0).toFixed(1)])
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
                {monthLabel}
              </ArsButton>
              {monthOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0, minWidth: 180, background: '#fff',
                  border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: 'var(--arsela-shadow-elevated)',
                  zIndex: 60, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4,
                }}>
                  {monthOptions.map((m) => (
                    <button key={m.offset} onClick={() => chooseMonth(m.offset, m.label)} style={{
                      padding: '6px 4px', fontSize: 11.5, fontWeight: 600, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                      background: m.offset === monthOffset ? 'var(--arsela-blue-50)' : 'transparent', color: m.offset === monthOffset ? 'var(--arsela-blue)' : 'var(--arsela-navy)', border: 'none',
                    }}>{m.short}</button>
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
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>{monthLabel} allocation</div>
            </ArsCard>
            <ArsCard onClick={() => { setCatFilter('all'); document.getElementById('opex-categories') && document.getElementById('opex-categories').scrollIntoView({ behavior: 'smooth' }); }}
              title="Click to view actual spend breakdown" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Actual to date</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(actualToDateTotal, { compact: true })}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <div style={{ flex: 1 }}><ArsProgress value={monthlyPlanTotal ? Math.round((actualToDateTotal / monthlyPlanTotal) * 100) : 0} tone="blue" /></div>
                <span className="arsela-num" style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>{monthlyPlanTotal ? Math.round((actualToDateTotal / monthlyPlanTotal) * 100) : 0}% · {dayProgressLabel}</span>
              </div>
            </ArsCard>
            <ArsCard onClick={() => window.Router.go('/capex')} title="Click to view CAPEX & commitments" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Commitments</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(openCommitments, { compact: true })}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>POs & contracts, not invoiced</div>
            </ArsCard>
            <ArsCard onClick={() => setCatFilter('over')} title="Click to view categories over plan" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Threshold breaches</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
                <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: alerts.length ? 'var(--danger)' : 'var(--success)', letterSpacing: -0.4 }}>{alerts.length}</div>
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
              <ArsSectionHeader title="Daily spend calendar" subtitle="Illustrative heat map of daily burn (no live daily feed yet) · weekends muted · today outlined · click a day for detail" />
              <MonthlyCalendar
                monthDate={monthDate}
                monthlyPlanTotal={monthlyPlanTotal}
                breachDays={breachDays}
                onDayClick={(day, v, isBreach) => window.Store.toast(`${day} ${monthDate.toLocaleDateString('en-AU', { month: 'short' })} · ${fmtMYR(v, { compact: true })} spend`, isBreach ? 'danger' : 'info')}
              />
            </ArsCard>
            <ArsCard>
              <ArsSectionHeader title="Threshold alerts" subtitle="Auto-triggered when > 100% of monthly plan" />
              {alerts.length === 0 ? (
                <ArsEmpty title="No threshold breaches" body="All OPEX categories are within their monthly plan." />
              ) : (
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
                    </div>
                  ))}
                </div>
              )}
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
