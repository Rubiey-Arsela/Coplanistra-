/* Performance & KPIs — balanced scorecard, RAG indicators */
(function () {

  const Sparkline = ({ points, tone = 'blue' }) => {
    const w = 100, h = 32;
    const min = Math.min(...points), max = Math.max(...points);
    const rng = max - min || 1;
    const step = w / (points.length - 1);
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / rng) * (h - 4) - 2}`).join(' ');
    const color = tone === 'success' ? '#1A8754' : tone === 'warning' ? '#B4740A' : tone === 'danger' ? '#D64045' : '#1343CB';
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <path d={d} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={(points.length - 1) * step} cy={h - ((points[points.length-1] - min) / rng) * (h - 4) - 2} r="2.5" fill={color}/>
      </svg>
    );
  };

  const KpiRow = ({ kpi, onClick }) => {
    const rag = kpi.invert
      ? (kpi.actual > kpi.target * 1.05 ? 'R' : kpi.actual > kpi.target ? 'A' : 'G')
      : (kpi.actual >= kpi.target ? 'G' : kpi.actual >= kpi.target * 0.9 ? 'A' : 'R');
    const varPct = ((kpi.actual - kpi.target) / kpi.target) * 100;
    return (
      <div onClick={onClick} className="coplan-grid-fixed" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 100px 90px 110px 60px',
        alignItems: 'center', gap: 12,
        padding: '14px 20px',
        borderBottom: '1px solid var(--arsela-border)',
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 640,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = 'var(--arsela-surface-alt)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = 'transparent')}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{kpi.name}</div>
          {kpi.owner && <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{kpi.owner}</div>}
        </div>
        <div className="arsela-num" style={{ fontSize: 13, color: 'var(--arsela-text-muted)', textAlign: 'right' }}>{kpi.targetLabel}</div>
        <div className="arsela-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)', textAlign: 'right' }}>{kpi.actualLabel}</div>
        <div style={{ textAlign: 'right' }}>
          <ArsVariance value={varPct} invert={kpi.invert} size="sm"/>
        </div>
        <div style={{ height: 32 }}>
          <Sparkline points={kpi.trend} tone={rag === 'G' ? 'success' : rag === 'A' ? 'warning' : 'danger'}/>
        </div>
        <div style={{ textAlign: 'right' }}>
          <ArsRAG status={rag}/>
        </div>
      </div>
    );
  };

  const ScorecardCard = ({ title, kpis, count, onKpiClick }) => (
    <ArsCard padded={false}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{count} KPIs · YTD Jul 2026</div>
        </div>
        <ArsBadge tone="navy" size="sm">{count} KPIs</ArsBadge>
      </div>
      <div className="coplan-scrollx">
      <div className="coplan-grid-fixed" style={{
        display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 110px 60px', gap: 12,
        padding: '10px 20px', background: 'var(--arsela-surface-alt)',
        fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--arsela-text-muted)',
        borderBottom: '1px solid var(--arsela-border)',
        minWidth: 640,
      }}>
        <span>KPI</span>
        <span style={{ textAlign: 'right' }}>Target</span>
        <span style={{ textAlign: 'right' }}>Actual</span>
        <span style={{ textAlign: 'right' }}>Δ</span>
        <span>Trend</span>
        <span style={{ textAlign: 'right' }}>RAG</span>
      </div>
      {kpis.map((k, i) => <KpiRow key={i} kpi={k} onClick={onKpiClick ? () => onKpiClick(k) : undefined}/>)}
      </div>
    </ArsCard>
  );

  const PerformanceScreen = () => {
    const fyLbl = window.Store.fyLabel(window.Store.today());
    const todayLbl = window.Store.today().toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
    const [period, setPeriod] = React.useState(`YTD ${todayLbl}`);
    const [showPeriodMenu, setShowPeriodMenu] = React.useState(false);
    const periodRef = React.useRef(null);
    const PERIODS = [`YTD ${todayLbl}`, 'Prior quarter', `${fyLbl} to date`, `${fyLbl} (fcst)`];

    React.useEffect(() => {
      const onDoc = (e) => {
        if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const financial = [
      { name: 'Revenue growth',       owner: 'Group', target: 5.0, actual: 6.4, targetLabel: '5.0%',    actualLabel: '+6.4%',  trend: [3.2,4.1,4.8,5.2,5.8,6.1,6.4] },
      { name: 'Operating margin',     owner: 'Group', target: 22.0, actual: 22.8, targetLabel: '22.0%',  actualLabel: '22.8%',  trend: [20,20.4,21.2,21.8,22.1,22.5,22.8] },
      { name: 'EBITDA',               owner: 'Group', target: 180, actual: 194.3, targetLabel: curLabel(180), actualLabel: curLabel(194.3, 1), trend: [140,152,163,171,180,188,194] },
      { name: 'Cash conversion',      owner: 'Treasury', target: 85, actual: 78, targetLabel: '85%',     actualLabel: '78%',    trend: [88,85,82,80,79,78,78] },
      { name: 'Return on capital',    owner: 'Group', target: 14, actual: 15.2, targetLabel: '14.0%',    actualLabel: '15.2%',   trend: [12,12.8,13.5,14.1,14.6,15.0,15.2] },
    ];
    const operational = [
      { name: 'Port throughput',       owner: 'Ports & Logistics', target: 4.2, actual: 4.4, targetLabel: '4.2M TEU',  actualLabel: '4.4M TEU', trend: [3.6,3.8,3.9,4.1,4.2,4.3,4.4] },
      { name: 'Fleet utilisation',     owner: 'Operations',        target: 88, actual: 91,   targetLabel: '88%',        actualLabel: '91%',      trend: [82,84,86,87,89,90,91] },
      { name: 'Downtime hours',        owner: 'Operations',        target: 120, actual: 142, targetLabel: '< 120',      actualLabel: '142',      invert: true, trend: [98,105,115,124,132,138,142] },
      { name: 'Safety incidents',      owner: 'Ops HSE',           target: 0, actual: 2,     targetLabel: '0',          actualLabel: '2',        invert: true, trend: [0,0,1,1,2,2,2] },
      { name: 'On-time delivery',      owner: 'Logistics',         target: 95, actual: 94.2, targetLabel: '95%',        actualLabel: '94.2%',   trend: [96,95.5,95.1,94.8,94.5,94.3,94.2] },
    ];
    const sustainability = [
      { name: 'Emissions intensity',   owner: 'Sustainability', target: -8, actual: -9.4, targetLabel: '−8% YoY', actualLabel: '−9.4% YoY', trend: [-3,-4.2,-5.5,-6.8,-7.9,-8.7,-9.4] },
      { name: 'Renewable share',       owner: 'Energy',        target: 28, actual: 31,   targetLabel: '28%',    actualLabel: '31%',      trend: [22,24,26,27,29,30,31] },
      { name: 'Water reuse',           owner: 'Sustainability', target: 55, actual: 52, targetLabel: '55%',    actualLabel: '52%',      trend: [45,47,48,50,51,51,52] },
      { name: 'CSR spend',             owner: 'CSR',           target: 6, actual: 6.4,   targetLabel: curLabel(6, 1), actualLabel: curLabel(6.4, 1), trend: [3.8,4.4,4.9,5.3,5.7,6.1,6.4] },
      { name: 'Board diversity',       owner: 'Governance',    target: 40, actual: 44,   targetLabel: '40%',    actualLabel: '44%',      trend: [32,35,37,40,42,43,44] },
    ];

    const allKpis = [...financial, ...operational, ...sustainability];
    const ragCounts = allKpis.reduce((acc, kpi) => {
      const rag = kpi.invert
        ? (kpi.actual > kpi.target * 1.05 ? 'R' : kpi.actual > kpi.target ? 'A' : 'G')
        : (kpi.actual >= kpi.target ? 'G' : kpi.actual >= kpi.target * 0.9 ? 'A' : 'R');
      acc[rag] = (acc[rag] || 0) + 1;
      return acc;
    }, {});
    const total = allKpis.length;
    const onTrack = ragCounts.G || 0, atRisk = ragCounts.A || 0, offTrack = ragCounts.R || 0;

    const onKpiClick = (kpi) => {
      const rag = kpi.invert
        ? (kpi.actual > kpi.target * 1.05 ? 'Off track' : kpi.actual > kpi.target ? 'At risk' : 'On track')
        : (kpi.actual >= kpi.target ? 'On track' : kpi.actual >= kpi.target * 0.9 ? 'At risk' : 'Off track');
      window.Store.toast(`${kpi.name} (${kpi.owner || 'Group'}): target ${kpi.targetLabel}, actual ${kpi.actualLabel} — ${rag}`, rag === 'On track' ? 'success' : rag === 'At risk' ? 'warning' : 'danger');
    };

    return (
      <AppFrame
        active="Performance"
        title="Performance & KPIs"
        breadcrumb={['Arsela Resources', 'Financials', 'Performance & KPIs']}
        topActions={
          <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={periodRef}>
            <ArsButton variant="secondary" size="md" icon={<IconCalendar size={15}/>} onClick={() => setShowPeriodMenu(v => !v)}>{period}</ArsButton>
            {showPeriodMenu && (
              <div style={{
                position: 'absolute', top: 42, left: 0, background: '#fff',
                border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: 'var(--arsela-shadow-card)',
                zIndex: 20, minWidth: 180, padding: 6,
              }}>
                {PERIODS.map(p => (
                  <div key={p} onClick={() => { setPeriod(p); setShowPeriodMenu(false); }} style={{
                    padding: '8px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                    color: p === period ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                    fontWeight: p === period ? 700 : 500,
                    background: p === period ? 'var(--arsela-blue-50)' : 'transparent',
                  }}>{p}</div>
                ))}
              </div>
            )}
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast(`Exporting balanced scorecard — ${period}…`, 'info')}>Export scorecard</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => window.Store.toast('Add KPI — coming soon', 'info')}>Add KPI</ArsButton>
          </div>
        }
      >
        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Total KPIs tracked</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{total}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Across 3 perspectives</div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>On track</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--success)', letterSpacing: -0.4 }}>{onTrack}</div>
              <span style={{ fontSize: 13, color: 'var(--arsela-text-muted)' }}>· {Math.round(onTrack/total*100)}%</span>
            </div>
            <ArsProgress value={Math.round(onTrack/total*100)} tone="success" style={{ marginTop: 8 }}/>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>At risk</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--warning)', letterSpacing: -0.4 }}>{atRisk}</div>
              <span style={{ fontSize: 13, color: 'var(--arsela-text-muted)' }}>· {Math.round(atRisk/total*100)}%</span>
            </div>
            <ArsProgress value={Math.round(atRisk/total*100)} tone="warning" style={{ marginTop: 8 }}/>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Off track</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--danger)', letterSpacing: -0.4 }}>{offTrack}</div>
              <span style={{ fontSize: 13, color: 'var(--arsela-text-muted)' }}>· {Math.round(offTrack/total*100)}%</span>
            </div>
            <ArsProgress value={Math.round(offTrack/total*100)} tone="danger" style={{ marginTop: 8 }}/>
          </ArsCard>
        </div>

        {/* Scorecards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ScorecardCard title="Financial perspective"        count={financial.length}      kpis={financial}      onKpiClick={onKpiClick}/>
          <ScorecardCard title="Operational perspective"      count={operational.length}    kpis={operational}    onKpiClick={onKpiClick}/>
          <ScorecardCard title="Sustainability & Governance"  count={sustainability.length} kpis={sustainability} onKpiClick={onKpiClick}/>
        </div>
      </AppFrame>
    );
  };

  Object.assign(window, { PerformanceScreen, KpiRow, ScorecardCard, Sparkline });
})();
