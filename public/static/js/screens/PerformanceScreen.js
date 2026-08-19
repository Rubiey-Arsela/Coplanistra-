/* Performance & KPIs — balanced scorecard, RAG indicators, wired to Store.kpis (add/edit/delete) */
(function () {

  const Sparkline = ({ points, tone = 'blue' }) => {
    const w = 100, h = 32;
    if (!points || points.length === 0) return <svg width={w} height={h}/>;
    const min = Math.min(...points), max = Math.max(...points);
    const rng = max - min || 1;
    const step = points.length > 1 ? w / (points.length - 1) : 0;
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / rng) * (h - 4) - 2}`).join(' ');
    const color = tone === 'success' ? '#1A8754' : tone === 'warning' ? '#B4740A' : tone === 'danger' ? '#D64045' : '#1343CB';
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <path d={d} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={(points.length - 1) * step} cy={h - ((points[points.length-1] - min) / rng) * (h - 4) - 2} r="2.5" fill={color}/>
      </svg>
    );
  };

  /* Format a raw target/actual number according to the KPI's unit type.
     Currency-figures ("currency_m") route through fmtMYR/curLabel so
     they stay live-currency-aware, matching the rest of the app. */
  function formatKpiValue(value, unit) {
    if (unit === 'currency_m') return curLabel(value, 1);
    if (unit === '%' || unit === '%_yoy') return `${value}%${unit === '%_yoy' ? ' YoY' : ''}`;
    if (unit === 'TEU_m') return `${value}M TEU`;
    return `${value}`;
  }

  const KpiRow = ({ kpi, onClick, onEdit, onDelete }) => {
    const rag = kpi.invert
      ? (kpi.actual > kpi.target * 1.05 ? 'R' : kpi.actual > kpi.target ? 'A' : 'G')
      : (kpi.actual >= kpi.target ? 'G' : kpi.actual >= kpi.target * 0.9 ? 'A' : 'R');
    const varPct = kpi.target ? ((kpi.actual - kpi.target) / kpi.target) * 100 : 0;
    return (
      <div className="coplan-grid-fixed" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 100px 90px 110px 60px 60px',
        alignItems: 'center', gap: 12,
        padding: '14px 20px',
        borderBottom: '1px solid var(--arsela-border)',
        minWidth: 700,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--arsela-surface-alt)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{kpi.name}</div>
          {kpi.owner && <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{kpi.owner}</div>}
        </div>
        <div className="arsela-num" style={{ fontSize: 13, color: 'var(--arsela-text-muted)', textAlign: 'right' }}>{formatKpiValue(kpi.target, kpi.unit)}</div>
        <div className="arsela-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)', textAlign: 'right' }}>{formatKpiValue(kpi.actual, kpi.unit)}</div>
        <div style={{ textAlign: 'right' }}>
          <ArsVariance value={varPct} invert={kpi.invert} size="sm"/>
        </div>
        <div style={{ height: 32 }}>
          <Sparkline points={kpi.trend} tone={rag === 'G' ? 'success' : rag === 'A' ? 'warning' : 'danger'}/>
        </div>
        <div style={{ textAlign: 'right' }}>
          <ArsRAG status={rag}/>
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} title="Edit" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)', display: 'flex', padding: 4 }}><IconEdit size={13}/></button>
          <button onClick={onDelete} title="Delete" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 4 }}><IconClose size={13}/></button>
        </div>
      </div>
    );
  };

  const ScorecardCard = ({ title, perspective, kpis, onKpiClick, onEdit, onDelete }) => (
    <ArsCard padded={false}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{kpis.length} KPI{kpis.length !== 1 ? 's' : ''}</div>
        </div>
        <ArsBadge tone="navy" size="sm">{kpis.length} KPIs</ArsBadge>
      </div>
      {kpis.length === 0 ? (
        <div style={{ padding: 24 }}><ArsEmpty title="No KPIs in this perspective yet" body="Add one with the button above." /></div>
      ) : (
        <div className="coplan-scrollx">
        <div className="coplan-grid-fixed" style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 110px 60px 60px', gap: 12,
          padding: '10px 20px', background: 'var(--arsela-surface-alt)',
          fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--arsela-text-muted)',
          borderBottom: '1px solid var(--arsela-border)',
          minWidth: 700,
        }}>
          <span>KPI</span>
          <span style={{ textAlign: 'right' }}>Target</span>
          <span style={{ textAlign: 'right' }}>Actual</span>
          <span style={{ textAlign: 'right' }}>Δ</span>
          <span>Trend</span>
          <span style={{ textAlign: 'right' }}>RAG</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>
        {kpis.map((k) => (
          <KpiRow key={k.id} kpi={k}
            onClick={onKpiClick ? () => onKpiClick(k) : undefined}
            onEdit={() => onEdit(k)}
            onDelete={() => onDelete(k)}
          />
        ))}
        </div>
      )}
    </ArsCard>
  );

  function KpiModal({ initial, onClose }) {
    const { useState: uS } = React;
    const [name, setName] = uS(initial ? initial.name : '');
    const [perspective, setPerspective] = uS(initial ? initial.perspective : 'financial');
    const [owner, setOwner] = uS(initial ? (initial.owner || '') : '');
    const [target, setTarget] = uS(initial ? String(initial.target) : '');
    const [actual, setActual] = uS(initial ? String(initial.actual) : '');
    const [unit, setUnit] = uS(initial ? (initial.unit || 'number') : '%');
    const [invert, setInvert] = uS(initial ? !!initial.invert : false);
    const save = () => {
      if (!name.trim()) { window.Store.toast('Enter a KPI name', 'danger'); return; }
      if (initial) {
        window.Store.updateKpi(initial.id, {
          name: name.trim(), perspective, owner: owner.trim(), unit, invert,
          target: Number(target) || 0, actual: Number(actual) || 0,
          trend: [...(initial.trend || []).slice(-6), Number(actual) || 0],
        });
      } else {
        window.Store.addKpi({ name: name.trim(), perspective, owner: owner.trim(), target: Number(target) || 0, actual: Number(actual) || 0, unit, invert });
      }
      onClose();
    };
    return (
      <ArsModal open onClose={onClose} title={initial ? 'Edit KPI' : 'Add KPI'} subtitle="Balanced scorecard entry — target vs actual"
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>{initial ? 'Save changes' : 'Add KPI'}</ArsButton></>}>
        <ArsField label="KPI name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Customer satisfaction" style={arsFieldInputStyle}/></ArsField>
        <ArsField label="Perspective">
          <select value={perspective} onChange={(e) => setPerspective(e.target.value)} style={arsFieldInputStyle}>
            <option value="financial">Financial</option>
            <option value="operational">Operational</option>
            <option value="sustainability">Sustainability &amp; Governance</option>
          </select>
        </ArsField>
        <ArsField label="Owner"><input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Group, Operations" style={arsFieldInputStyle}/></ArsField>
        <ArsField label="Unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={arsFieldInputStyle}>
            <option value="%">Percentage (%)</option>
            <option value="%_yoy">Percentage YoY</option>
            <option value="currency_m">Currency (millions)</option>
            <option value="TEU_m">TEU (millions)</option>
            <option value="number">Plain number</option>
          </select>
        </ArsField>
        <ArsField label="Target"><input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" style={arsFieldInputStyle}/></ArsField>
        <ArsField label="Actual"><input type="number" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="0" style={arsFieldInputStyle}/></ArsField>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--arsela-navy)', marginTop: 4 }}>
          <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
          Lower is better (e.g. downtime, incidents)
        </label>
      </ArsModal>
    );
  }

  const PerformanceScreen = () => {
    const { useState, useEffect, useMemo, useRef } = React;
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);

    const fyLbl = window.Store.fyLabel(window.Store.today());
    const todayLbl = window.Store.today().toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
    const [period, setPeriod] = useState(`YTD ${todayLbl}`);
    const [showPeriodMenu, setShowPeriodMenu] = useState(false);
    const [kpiModal, setKpiModal] = useState(null); // null | 'new' | kpi record
    const [deleteTarget, setDeleteTarget] = useState(null);
    const periodRef = useRef(null);
    const PERIODS = [`YTD ${todayLbl}`, 'Prior quarter', `${fyLbl} to date`, `${fyLbl} (fcst)`];

    useEffect(() => {
      const onDoc = (e) => {
        if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const allKpis = s.kpis || [];
    const financial = allKpis.filter(k => k.perspective === 'financial');
    const operational = allKpis.filter(k => k.perspective === 'operational');
    const sustainability = allKpis.filter(k => k.perspective === 'sustainability');
    const perspectiveCount = [financial, operational, sustainability].filter(g => g.length > 0).length;

    const ragOf = (kpi) => kpi.invert
      ? (kpi.actual > kpi.target * 1.05 ? 'R' : kpi.actual > kpi.target ? 'A' : 'G')
      : (kpi.actual >= kpi.target ? 'G' : kpi.actual >= kpi.target * 0.9 ? 'A' : 'R');

    const ragCounts = allKpis.reduce((acc, kpi) => {
      const rag = ragOf(kpi);
      acc[rag] = (acc[rag] || 0) + 1;
      return acc;
    }, {});
    const total = allKpis.length;
    const onTrack = ragCounts.G || 0, atRisk = ragCounts.A || 0, offTrack = ragCounts.R || 0;

    const onKpiClick = (kpi) => {
      const rag = ragOf(kpi);
      const ragLabel = rag === 'G' ? 'On track' : rag === 'A' ? 'At risk' : 'Off track';
      window.Store.toast(`${kpi.name} (${kpi.owner || 'Group'}): target ${formatKpiValue(kpi.target, kpi.unit)}, actual ${formatKpiValue(kpi.actual, kpi.unit)} — ${ragLabel}`, rag === 'G' ? 'success' : rag === 'A' ? 'warning' : 'danger');
    };

    const exportScorecard = () => {
      exportRowsToCSV(
        `performance-scorecard-${period.replace(/\s+/g, '-')}`,
        ['Perspective', 'KPI', 'Owner', 'Target', 'Actual', 'Variance %', 'RAG'],
        allKpis.map((k) => [
          k.perspective, k.name, k.owner || '', k.target, k.actual,
          k.target ? (((k.actual - k.target) / k.target) * 100).toFixed(1) : '0.0',
          ragOf(k) === 'G' ? 'On track' : ragOf(k) === 'A' ? 'At risk' : 'Off track',
        ])
      );
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
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={exportScorecard}>Export scorecard</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => setKpiModal('new')}>Add KPI</ArsButton>
          </div>
        }
      >
        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Total KPIs tracked</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{total}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Across {perspectiveCount} perspective{perspectiveCount !== 1 ? 's' : ''}</div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>On track</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--success)', letterSpacing: -0.4 }}>{onTrack}</div>
              <span style={{ fontSize: 13, color: 'var(--arsela-text-muted)' }}>· {total ? Math.round(onTrack/total*100) : 0}%</span>
            </div>
            <div style={{ marginTop: 8 }}><ArsProgress value={total ? Math.round(onTrack/total*100) : 0} tone="success"/></div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>At risk</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--warning)', letterSpacing: -0.4 }}>{atRisk}</div>
              <span style={{ fontSize: 13, color: 'var(--arsela-text-muted)' }}>· {total ? Math.round(atRisk/total*100) : 0}%</span>
            </div>
            <div style={{ marginTop: 8 }}><ArsProgress value={total ? Math.round(atRisk/total*100) : 0} tone="warning"/></div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Off track</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--danger)', letterSpacing: -0.4 }}>{offTrack}</div>
              <span style={{ fontSize: 13, color: 'var(--arsela-text-muted)' }}>· {total ? Math.round(offTrack/total*100) : 0}%</span>
            </div>
            <div style={{ marginTop: 8 }}><ArsProgress value={total ? Math.round(offTrack/total*100) : 0} tone="danger"/></div>
          </ArsCard>
        </div>

        {/* Scorecards */}
        {total === 0 ? (
          <ArsCard>
            <ArsEmpty title="No KPIs tracked yet" body="Add your first KPI with the button above to start building the balanced scorecard." />
          </ArsCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ScorecardCard title="Financial perspective"        perspective="financial"      kpis={financial}      onKpiClick={onKpiClick} onEdit={setKpiModal} onDelete={setDeleteTarget}/>
            <ScorecardCard title="Operational perspective"      perspective="operational"    kpis={operational}    onKpiClick={onKpiClick} onEdit={setKpiModal} onDelete={setDeleteTarget}/>
            <ScorecardCard title="Sustainability & Governance"  perspective="sustainability" kpis={sustainability} onKpiClick={onKpiClick} onEdit={setKpiModal} onDelete={setDeleteTarget}/>
          </div>
        )}

        {kpiModal && <KpiModal initial={kpiModal === 'new' ? null : kpiModal} onClose={() => setKpiModal(null)}/>}
        <ArsConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => { if (deleteTarget) window.Store.deleteKpi(deleteTarget.id); }}
          title="Delete KPI?"
          message={deleteTarget ? `This will permanently remove "${deleteTarget.name}" from the scorecard. This cannot be undone.` : ''}
          confirmLabel="Delete"
        />
      </AppFrame>
    );
  };

  Object.assign(window, { PerformanceScreen, KpiRow, ScorecardCard, Sparkline, formatKpiValue });
})();
