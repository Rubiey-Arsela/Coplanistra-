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
                onClick={() => window.Store.toast(`${day} Jul · RM ${(v / 1000).toFixed(0)}K spend`, isBreach ? 'danger' : 'info')}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 3,
                  background: isFuture ? '#F8F9FC' : bg,
                  border: day === today ? '2px solid #001F3D' : isFuture ? '1px dashed #E2E6F0' : 'none',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                title={`${day} Jul · RM ${(v / 1000).toFixed(0)}K`}
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

  const CategoryBurn = ({ name, plan, actual, onClick }) => {
    const burn = (actual / plan) * 100;
    const varPct = ((actual - plan) / plan) * 100;
    const status = burn > 108 ? 'danger' : burn > 100 ? 'warning' : burn > 85 ? 'blue' : 'success';
    return (
      <tr onClick={onClick} style={{ cursor: 'pointer' }}>
        <td style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{name}</div>
        </td>
        <td className="arsela-num" style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-text-muted)' }}>
          {fmtMYR(plan, { compact: true })}
        </td>
        <td className="arsela-num" style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>
          {fmtMYR(actual, { compact: true })}
        </td>
        <td style={{ padding: '12px 16px', width: 220 }}>
          <ArsProgress value={Math.min(120, burn)} tone={status} showValue />
        </td>
        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
          <ArsVariance value={varPct} invert size="sm" />
        </td>
        <td style={{ padding: '12px 16px' }}>{burn > 108 ? <ArsRAG status="R" /> : burn > 100 ? <ArsRAG status="A" /> : <ArsRAG status="G" />}</td>
      </tr>
    );
  };

  function MonthlyScreen() {
    const { useState, useMemo } = React;
    const [filterOpen, setFilterOpen] = useState(false);
    const [catFilter, setCatFilter] = useState('all');

    const opex = useMemo(
      () => [
        { name: 'Payroll', plan: 15.3e6, actual: 14.9e6 },
        { name: 'Employee Benefits', plan: 3.2e6, actual: 3.3e6 },
        { name: 'Information Technology', plan: 3.9e6, actual: 4.4e6 },
        { name: 'Software Licences', plan: 1.8e6, actual: 2.0e6 },
        { name: 'Marketing', plan: 2.6e6, actual: 2.3e6 },
        { name: 'Professional Fees', plan: 1.6e6, actual: 1.8e6 },
        { name: 'Utilities', plan: 1.4e6, actual: 1.5e6 },
        { name: 'Travel', plan: 1.1e6, actual: 0.8e6 },
        { name: 'Maintenance', plan: 1.2e6, actual: 1.3e6 },
        { name: 'Training', plan: 0.7e6, actual: 0.5e6 },
        { name: 'Insurance', plan: 0.9e6, actual: 0.9e6 },
        { name: 'Office Expenses', plan: 0.6e6, actual: 0.6e6 },
        { name: 'Security', plan: 0.8e6, actual: 0.8e6 },
        { name: 'Cleaning', plan: 0.4e6, actual: 0.4e6 },
        { name: 'Miscellaneous', plan: 0.5e6, actual: 0.4e6 },
      ],
      []
    );

    const filteredOpex = useMemo(() => {
      if (catFilter === 'all') return opex;
      return opex.filter((c) => {
        const burn = (c.actual / c.plan) * 100;
        if (catFilter === 'over') return burn > 100;
        if (catFilter === 'under') return burn <= 100;
        return true;
      });
    }, [opex, catFilter]);

    const alerts = [
      { c: 'Information Technology', d: '+12.8% over monthly plan · vendor overrun on ERP migration', when: 'Jul 21', lvl: 'R' },
      { c: 'Software Licences', d: '+9.4% over monthly plan · additional Copilot seats', when: 'Jul 20', lvl: 'A' },
      { c: 'Maintenance', d: '+8.7% over monthly plan · fleet servicing pulled forward', when: 'Jul 19', lvl: 'A' },
    ];

    const criticalCount = alerts.filter((a) => a.lvl === 'R').length;
    const warningCount = alerts.filter((a) => a.lvl === 'A').length;

    return (
      <AppFrame
        active="Monthly"
        title="Monthly Monitoring"
        breadcrumb={['Arsela Resources', 'Plan', 'Monthly Monitoring']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton
              variant="secondary"
              size="md"
              icon={<IconCalendar size={15} />}
              onClick={() => window.Store.toast('Month picker (demo) — showing Jul 2026', 'info')}
            >
              Jul 2026
            </ArsButton>
            <ArsButton
              variant="secondary"
              size="md"
              icon={<IconExport size={15} />}
              onClick={() => window.Store.toast('Exporting monthly monitoring report…', 'info')}
            >
              Export
            </ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
            <ArsCard>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Monthly plan</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>RM 36.0M</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Jul 2026 allocation</div>
            </ArsCard>
            <ArsCard>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Actual to date</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>RM 27.4M</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <ArsProgress value={76} tone="blue" style={{ flex: 1 }} />
                <span className="arsela-num" style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>76% · day 22/31</span>
              </div>
            </ArsCard>
            <ArsCard>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Commitments</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>RM 5.8M</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>POs & contracts, not invoiced</div>
            </ArsCard>
            <ArsCard>
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
          <ArsCard padded={false}>
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
                    {['Category', 'Monthly plan', 'Actual MTD', 'Burn', 'Variance', 'Status'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: ['Monthly plan', 'Actual MTD', 'Variance'].includes(h) ? 'right' : 'left',
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
                      <td colSpan={6} style={{ padding: 24 }}>
                        <ArsEmpty title="No categories match this filter" />
                      </td>
                    </tr>
                  ) : (
                    filteredOpex.map((c, i) => (
                      <CategoryBurn
                        key={i}
                        {...c}
                        onClick={() => window.Store.toast(`${c.name}: ${fmtMYR(c.actual, { compact: true })} of ${fmtMYR(c.plan, { compact: true })} plan`, 'info')}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ArsCard>
        </div>
      </AppFrame>
    );
  }

  Object.assign(window, { MonthlyScreen, MonthlyCalendar, CategoryBurn });
})();
