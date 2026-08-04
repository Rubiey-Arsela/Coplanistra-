/* Quarterly Planning — reforecast cycle, quarter-over-quarter comparison (wired) */
(function () {
  const QuarterCard = ({ q, plan, actual, forecast, status, current }) => {
    const attain = actual != null ? (actual / plan) * 100 : null;
    const varPct = actual != null ? ((actual - plan) / plan) * 100 : ((forecast - plan) / plan) * 100;
    return (
      <ArsCard style={{
        borderColor: current ? 'var(--teal-brand)' : 'var(--arsela-border)',
        boxShadow: current ? '0 0 0 3px rgba(0,168,150,0.12), var(--arsela-shadow-card)' : 'var(--arsela-shadow-card)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700 }}>{q} · FY 2026</div>
            <div style={{ fontSize: 11, color: 'var(--arsela-text-subtle)', marginTop: 3 }}>{actual != null ? 'Actual' : 'Forecast'}</div>
          </div>
          {current && <ArsBadge tone="teal" size="sm">Current</ArsBadge>}
        </div>
        <ArsFigure value={fmtMYR(actual != null ? actual : forecast, { compact: true }).replace('RM ', '')} unit="RM" size={28}/>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ArsVariance value={varPct}/>
          <span style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>vs plan {fmtMYR(plan, { compact: true })}</span>
        </div>
        {attain != null && (
          <div style={{ marginTop: 12 }}>
            <ArsProgress value={Math.min(120, attain)} tone={status} height={5}/>
          </div>
        )}
      </ArsCard>
    );
  };

  const QoQChart = () => {
    const quarters = [
      { q: 'Q1', plan: 60, actual: 62 },
      { q: 'Q2', plan: 62, actual: 64 },
      { q: 'Q3', plan: 63, actual: 43, forecast: 66 },
      { q: 'Q4', plan: 63, forecast: 66 },
    ];
    const w = 660, h = 240, pad = { l: 44, r: 20, t: 20, b: 30 };
    const max = 80;
    const groupW = (w - pad.l - pad.r) / quarters.length;
    const barW = 22;
    const yFor = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
    const xFor = (i) => pad.l + groupW * i + groupW / 2;
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="qBudget" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#B9CBFF"/><stop offset="1" stopColor="#DDE6FF"/></linearGradient>
          <linearGradient id="qActual" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1E52DA"/><stop offset="1" stopColor="#1343CB"/></linearGradient>
          <linearGradient id="qForecast" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#00A896" opacity="0.75"/><stop offset="1" stopColor="#00A896" opacity="0.35"/></linearGradient>
        </defs>
        {[0, 20, 40, 60, 80].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={yFor(v)} y2={yFor(v)} stroke="#EEF1F6"/>
            <text x={pad.l - 8} y={yFor(v) + 4} fontSize="10" fill="#8492A6" textAnchor="end" fontWeight="600">RM{v}M</text>
          </g>
        ))}
        {quarters.map((q, i) => {
          const cx = xFor(i);
          return (
            <g key={q.q}>
              <rect x={cx - barW - 4} y={yFor(q.plan)} width={barW} height={yFor(0) - yFor(q.plan)} fill="url(#qBudget)" rx="3"/>
              {q.actual != null && <rect x={cx + 4} y={yFor(q.actual)} width={barW} height={yFor(0) - yFor(q.actual)} fill="url(#qActual)" rx="3"/>}
              {q.forecast != null && <rect x={cx + 4} y={yFor(q.forecast)} width={barW} height={yFor(0) - yFor(q.forecast)} fill="url(#qForecast)" rx="3" stroke="#00A896" strokeWidth="1" strokeDasharray="3 2"/>}
              <text x={cx} y={h - 10} fontSize="12" fill="#001F3D" fontWeight="700" textAnchor="middle">{q.q}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  function QuarterlyScreen() {
    const { useState } = React;
    const [submissions, setSubmissions] = useState([
      { d: 'Ports & Logistics', o: 'Faris Hamzah', s: '18 Jul', pf: 32.0, nf: 32.5, st: 'submitted' },
      { d: 'Operations', o: 'Aisha Rashid', s: '19 Jul', pf: 27.0, nf: 28.2, st: 'submitted' },
      { d: 'Digital & Data', o: 'Marcus Lim', s: '20 Jul', pf: 9.3, nf: 9.7, st: 'submitted' },
      { d: 'Agri & Food', o: 'Nurul Aini', s: '20 Jul', pf: 13.1, nf: 12.6, st: 'submitted' },
      { d: 'Property', o: 'Adib Rahman', s: '—', pf: 9.8, nf: null, st: 'overdue' },
      { d: 'Aviation', o: 'Iman Salleh', s: '—', pf: 5.5, nf: null, st: 'overdue' },
      { d: 'Energy & Assets', o: 'Zara Mahmood', s: '15 Jul', pf: 12.6, nf: 13.4, st: 'submitted' },
      { d: 'People & Culture', o: 'Priya Nair', s: '17 Jul', pf: 5.8, nf: 6.1, st: 'submitted' },
    ]);

    const scenarios = [
      { n: 'Base case', v: 'RM 254.8M', d: '+2.6% vs plan', c: 'success', active: true },
      { n: 'Upside — Port expansion', v: 'RM 262.4M', d: '+5.6% vs plan', c: 'blue' },
      { n: 'Downside — MYR volatility', v: 'RM 244.1M', d: '−1.7% vs plan', c: 'warning' },
    ];

    const submittedCount = submissions.filter((s) => s.st === 'submitted').length;
    const overdueCount = submissions.length - submittedCount;

    const escalate = () => {
      window.Store.toast(`Escalation sent to ${overdueCount} overdue division(s)`, 'warning');
    };

    const submitReforecast = () => {
      window.Store.toast('Q3 reforecast submitted for approval', 'success');
    };

    return (
      <AppFrame
        active="Quarterly"
        title="Quarterly Planning"
        breadcrumb={['Arsela Resources', 'Plan', 'Quarterly']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconRefresh size={15}/>} onClick={() => window.Store.toast('Copied figures from Q2', 'info')}>Copy from Q2</ArsButton>
            <ArsButton size="md" icon={<IconCheck size={15}/>} onClick={submitReforecast}>Submit Q3 reforecast</ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div className="arsela-h1" style={{ fontSize: 22, letterSpacing: -0.3 }}>Q3 FY2026 reforecast</div>
              <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 4 }}>
                Cycle closes <b style={{ color: 'var(--arsela-navy)' }}>31 July 2026</b> · {submittedCount} of {submissions.length} divisions submitted · <span style={{ color: 'var(--warning)' }}>{overdueCount} overdue</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 160 }}><ArsProgress value={Math.round((submittedCount / submissions.length) * 100)} tone="teal" height={8}/></div>
                <span className="arsela-num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-navy)' }}>{Math.round((submittedCount / submissions.length) * 100)}%</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
            <QuarterCard q="Q1" plan={60} actual={62} status="success"/>
            <QuarterCard q="Q2" plan={62} actual={64} status="success"/>
            <QuarterCard q="Q3" plan={63} actual={43} forecast={66} status="warning" current/>
            <QuarterCard q="Q4" plan={63} forecast={66} status="blue"/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <ArsCard>
              <ArsSectionHeader
                title="Quarterly performance — Plan vs Actual"
                subtitle="Group consolidated · RM millions · dashed = forecast"
                action={
                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--arsela-text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(180deg,#B9CBFF,#DDE6FF)' }}/>Plan</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(180deg,#1E52DA,#1343CB)' }}/>Actual</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(0,168,150,0.5)', border: '1px dashed #00A896' }}/>Forecast</span>
                  </div>
                }
              />
              <QoQChart/>
            </ArsCard>

            <ArsCard>
              <ArsSectionHeader title="Scenario comparison" subtitle="Full-year projection" action={<ArsButton variant="ghost" size="sm" icon={<IconPlus size={13}/>} onClick={() => window.Store.toast('New scenario (demo)', 'info')}>New</ArsButton>}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scenarios.map((s, i) => (
                  <div key={i} onClick={() => window.Store.toast(`Switched to scenario: ${s.n}`, 'info')} style={{
                    padding: 12, borderRadius: 8, cursor: 'pointer',
                    border: s.active ? '1px solid var(--teal-brand)' : '1px solid var(--arsela-border)',
                    background: s.active ? 'rgba(0,168,150,0.05)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{s.n}</span>
                      <ArsBadge tone={s.c} size="sm">{s.d}</ArsBadge>
                    </div>
                    <div className="arsela-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.3 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </ArsCard>
          </div>

          <ArsCard padded={false}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Division submissions · Q3 reforecast</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{submittedCount} of {submissions.length} submitted · escalation sent to {overdueCount} overdue</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <ArsButton variant="secondary" size="sm" icon={<IconMail size={13}/>} onClick={escalate}>Escalate overdue</ArsButton>
                <ArsButton variant="secondary" size="sm" icon={<IconExport size={13}/>} onClick={() => window.Store.toast('Export started', 'info')}>Export</ArsButton>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--arsela-surface-alt)', borderBottom: '1px solid var(--arsela-border)' }}>
                  {['Division', 'Owner', 'Submitted', 'Prior forecast', 'New forecast', 'Δ', 'Status'].map((h) => (
                    <th key={h} style={{
                      textAlign: ['Prior forecast', 'New forecast', 'Δ'].includes(h) ? 'right' : 'left',
                      padding: '11px 20px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)',
                      letterSpacing: 0.6, textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((r, i) => {
                  const diff = r.nf != null ? ((r.nf - r.pf) / r.pf) * 100 : null;
                  return (
                    <tr key={r.d} style={{ borderBottom: i < submissions.length - 1 ? '1px solid var(--arsela-border)' : 'none' }}>
                      <td style={{ padding: '13px 20px', fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{r.d}</td>
                      <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--arsela-navy)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ArsAvatar name={r.o} size={22} tone="blue"/>{r.o}
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px', fontSize: 13, color: r.s === '—' ? 'var(--danger)' : 'var(--arsela-text-muted)' }}>{r.s}</td>
                      <td className="arsela-num" style={{ padding: '13px 20px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(r.pf * 1e6, { compact: true })}</td>
                      <td className="arsela-num" style={{ padding: '13px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{r.nf != null ? fmtMYR(r.nf * 1e6, { compact: true }) : '—'}</td>
                      <td style={{ padding: '13px 20px', textAlign: 'right' }}>{diff != null ? <ArsVariance value={diff} size="sm"/> : <span style={{ color: 'var(--arsela-text-subtle)' }}>—</span>}</td>
                      <td style={{ padding: '13px 20px' }}>
                        <ArsBadge tone={r.st === 'submitted' ? 'success' : 'danger'} dot size="sm">{r.st === 'submitted' ? 'Submitted' : 'Overdue'}</ArsBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ArsCard>
        </div>
      </AppFrame>
    );
  }

  Object.assign(window, { QuarterlyScreen, QuarterCard, QoQChart });
})();
