/* CAPEX Portfolio — asset-level view with depreciation, approval status */
(function () {

  const CAPEX_PROJECTS = [
    { code: 'CAP-2601', p: 'Port Klang Terminal 3 — Berth Expansion', cat: 'Buildings', approved: 145e6, committed: 92.3e6, spent: 61.2e6, stage: 'Executing',  owner: 'Faris H.', eta: 'Q4 2027' },
    { code: 'CAP-2602', p: 'Solar Farm — Northern Phase II',           cat: 'Machinery', approved:  88.5e6, committed: 44.8e6, spent: 18.4e6, stage: 'Executing',  owner: 'Zara M.',   eta: 'Q2 2027' },
    { code: 'CAP-2603', p: 'Data Centre — Cyberjaya Node',              cat: 'Buildings', approved: 210e6,   committed: 168.2e6, spent: 94.7e6, stage: 'Executing',  owner: 'Marcus L.', eta: 'Q1 2027' },
    { code: 'CAP-2604', p: 'Fleet Renewal — Container Handlers',        cat: 'Machinery', approved:  42e6,   committed: 41.2e6, spent: 41.2e6, stage: 'Completing', owner: 'Faris H.', eta: 'Q3 2026' },
    { code: 'CAP-2605', p: 'ERP Modernisation Programme',               cat: 'Software',  approved:  28.4e6, committed: 22.1e6, spent: 14.6e6, stage: 'Executing',  owner: 'Marcus L.', eta: 'Q4 2026' },
    { code: 'CAP-2606', p: 'LNG Storage — Southern Phase I',            cat: 'Buildings', approved: 320e6,   committed: 48e6,   spent:  8.4e6, stage: 'Approved',   owner: 'Zara M.',   eta: 'Q3 2028' },
    { code: 'CAP-2607', p: 'Cold Chain Facility — Central',              cat: 'Buildings', approved:  38.6e6, committed:  4.2e6, spent:  0,     stage: 'Approved',   owner: 'Nurul A.', eta: 'Q2 2027' },
  ];

  const DEP_SCHEDULE = [
    { cls: 'Buildings',   life: '30 yrs', y1: 22.4, y5: 112.0, y10: 224.0 },
    { cls: 'Machinery',   life: '10 yrs', y1: 13.1, y5:  65.5, y10: 130.5 },
    { cls: 'Software',    life:  '5 yrs', y1:  5.7, y5:  28.4, y10:  28.4 },
    { cls: 'IT hardware', life:  '4 yrs', y1:  3.2, y5:  12.8, y10:  12.8 },
  ];

  const STAGE_FILTERS = ['All', 'Executing', 'Completing', 'Approved'];

  const CapexScreen = () => {
    const [stageFilter, setStageFilter] = React.useState('All');
    const [showFilterMenu, setShowFilterMenu] = React.useState(false);
    const filterRef = React.useRef(null);

    React.useEffect(() => {
      const onDoc = (e) => {
        if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const projects = React.useMemo(
      () => stageFilter === 'All' ? CAPEX_PROJECTS : CAPEX_PROJECTS.filter(p => p.stage === stageFilter),
      [stageFilter]
    );

    const totals = CAPEX_PROJECTS.reduce((a, p) => ({
      approved: a.approved + p.approved,
      committed: a.committed + p.committed,
      spent: a.spent + p.spent,
    }), { approved: 0, committed: 0, spent: 0 });

    const catTotals = {};
    CAPEX_PROJECTS.forEach(p => { catTotals[p.cat] = (catTotals[p.cat] || 0) + p.approved; });
    const catColors = { Buildings: '#1343CB', Machinery: '#00A896', Software: '#5B9EFF' };
    const catData = Object.entries(catTotals).map(([k, v]) => ({ label: k, value: v, color: catColors[k] }));

    const openProject = (p) => {
      window.Store.toast(`${p.code} · ${p.p} — ${p.stage}, ${fmtMYR(p.spent, { compact: true })} spent of ${fmtMYR(p.approved, { compact: true })}`, 'info');
    };

    return (
      <AppFrame
        active="CAPEX"
        title="CAPEX Portfolio"
        breadcrumb={['Arsela Resources', 'Financials', 'CAPEX Portfolio']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast('Exporting CAPEX portfolio…', 'info')}>Export</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => window.Store.toast('New CAPEX project intake — coming soon', 'info')}>New project</ArsButton>
          </div>
        }
      >
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Approved envelope</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(totals.approved, { compact: true })}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>{CAPEX_PROJECTS.length} active projects</div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Committed</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(totals.committed, { compact: true })}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <ArsProgress value={(totals.committed / totals.approved) * 100} tone="blue" style={{ flex: 1 }}/>
              <span className="arsela-num" style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>{((totals.committed / totals.approved) * 100).toFixed(0)}%</span>
            </div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Spent to date</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(totals.spent, { compact: true })}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <ArsProgress value={(totals.spent / totals.approved) * 100} tone="teal" style={{ flex: 1 }}/>
              <span className="arsela-num" style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>{((totals.spent / totals.approved) * 100).toFixed(0)}%</span>
            </div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Sanction pending</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--warning)', marginTop: 10, letterSpacing: -0.4 }}>RM 320M</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>LNG Storage — awaiting exec approval</div>
          </ArsCard>
        </div>

        {/* Category donut + depreciation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <ArsCard>
            <ArsSectionHeader title="Envelope by category" subtitle="Share of approved CAPEX · FY26"/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <svg width="180" height="180">
                {(() => {
                  const cx = 90, cy = 90, r = 70, sw = 24;
                  const total = catData.reduce((s, d) => s + d.value, 0);
                  const circ = 2 * Math.PI * r;
                  let acc = 0;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={r} stroke="#F1F3F7" strokeWidth={sw} fill="none"/>
                      {catData.map((d, i) => {
                        const len = (d.value / total) * circ;
                        const off = -acc;
                        acc += len;
                        return (
                          <circle key={i} cx={cx} cy={cy} r={r} stroke={d.color} strokeWidth={sw} fill="none"
                            strokeDasharray={`${len} ${circ}`} strokeDashoffset={off}
                            transform={`rotate(-90 ${cx} ${cy})`}/>
                        );
                      })}
                      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#5B6B82" fontWeight="600">Approved</text>
                      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="18" fill="#001F3D" fontWeight="700">{fmtMYR(total, { compact: true })}</text>
                    </g>
                  );
                })()}
              </svg>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {catData.map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }}/>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--arsela-navy)', fontWeight: 500 }}>{d.label}</span>
                    <span className="arsela-num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(d.value, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </div>
          </ArsCard>

          <ArsCard>
            <ArsSectionHeader title="Depreciation schedule" subtitle="Straight-line · asset class · RM millions/year"/>
            <div className="coplan-scrollx">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 420 }}>
              {DEP_SCHEDULE.map(d => (
                <div key={d.cls} className="coplan-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '110px 60px 1fr 1fr 1fr', gap: 12, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--arsela-navy)', fontWeight: 600 }}>{d.cls}</span>
                  <span style={{ color: 'var(--arsela-text-muted)', fontSize: 12 }}>{d.life}</span>
                  <span className="arsela-num" style={{ textAlign: 'right', color: 'var(--arsela-navy)' }}>{d.y1.toFixed(1)}M</span>
                  <span className="arsela-num" style={{ textAlign: 'right', color: 'var(--arsela-navy)' }}>{d.y5.toFixed(1)}M</span>
                  <span className="arsela-num" style={{ textAlign: 'right', color: 'var(--arsela-navy)', fontWeight: 600 }}>{d.y10.toFixed(1)}M</span>
                </div>
              ))}
              <div className="coplan-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '110px 60px 1fr 1fr 1fr', gap: 12, marginTop: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--arsela-text-subtle)' }}>
                <span></span><span></span>
                <span style={{ textAlign: 'right' }}>Y1</span>
                <span style={{ textAlign: 'right' }}>Y5 cum.</span>
                <span style={{ textAlign: 'right' }}>Y10 cum.</span>
              </div>
            </div>
            </div>
          </ArsCard>
        </div>

        {/* Projects table */}
        <ArsCard padded={false}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Capital projects portfolio</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Buildings · Machinery · Software · multi-stage sanctions{stageFilter !== 'All' ? ` · Filtered: ${stageFilter}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, position: 'relative' }} ref={filterRef}>
              <ArsButton variant="secondary" size="sm" icon={<IconFilter size={13}/>} onClick={() => setShowFilterMenu(v => !v)}>Filter{stageFilter !== 'All' ? `: ${stageFilter}` : ''}</ArsButton>
              {showFilterMenu && (
                <div style={{
                  position: 'absolute', top: 34, right: 0, background: '#fff',
                  border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: 'var(--arsela-shadow-card)',
                  zIndex: 20, minWidth: 160, padding: 6,
                }}>
                  {STAGE_FILTERS.map(f => (
                    <div key={f} onClick={() => { setStageFilter(f); setShowFilterMenu(false); }} style={{
                      padding: '8px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                      color: f === stageFilter ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                      fontWeight: f === stageFilter ? 700 : 500,
                      background: f === stageFilter ? 'var(--arsela-blue-50)' : 'transparent',
                    }}>{f}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ maxHeight: 360, overflow: 'auto' }} className="ars-table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--arsela-surface-alt)', borderBottom: '1px solid var(--arsela-border)' }}>
                  {['Project', 'Category', 'Stage', 'Owner', 'Approved', 'Committed', 'Spent', 'Utilisation', 'ETA'].map(h => (
                    <th key={h} style={{
                      textAlign: ['Approved','Committed','Spent'].includes(h) ? 'right' : 'left',
                      padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)',
                      letterSpacing: 0.6, textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan={9}>
                    <ArsEmpty icon={<IconFilter size={22}/>} title="No projects match this filter" body="Try a different stage filter to see more CAPEX projects."/>
                  </td></tr>
                ) : projects.map((p) => {
                  const util = (p.spent / p.approved) * 100;
                  const stageChip = p.stage === 'Completing' ? 'success' : p.stage === 'Executing' ? 'blue' : 'warning';
                  return (
                    <tr key={p.code} onClick={() => openProject(p)} style={{ cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--arsela-surface-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '13px 16px', maxWidth: 260 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{p.p}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{p.code}</div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--arsela-text-muted)' }}>{p.cat}</td>
                      <td style={{ padding: '13px 16px' }}><ArsBadge tone={stageChip} dot size="sm">{p.stage}</ArsBadge></td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ArsAvatar name={p.owner} size={22} tone="blue"/>
                          <span style={{ fontSize: 13, color: 'var(--arsela-navy)' }}>{p.owner}</span>
                        </div>
                      </td>
                      <td className="arsela-num" style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(p.approved, { compact: true })}</td>
                      <td className="arsela-num" style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(p.committed, { compact: true })}</td>
                      <td className="arsela-num" style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(p.spent, { compact: true })}</td>
                      <td style={{ padding: '13px 16px', width: 160 }}>
                        <ArsProgress value={util} tone="blue" showValue/>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--arsela-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{p.eta}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ArsCard>
      </AppFrame>
    );
  };

  Object.assign(window, { CapexScreen });
})();
