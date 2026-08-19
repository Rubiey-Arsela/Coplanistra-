/* Quarterly Planning — reforecast cycle, quarter-over-quarter comparison (wired) */
(function () {
  const QuarterCard = ({ q, plan, actual, forecast, status, current }) => {
    const attain = actual != null ? (plan ? (actual / plan) * 100 : 0) : null;
    const varPct = actual != null ? (plan ? ((actual - plan) / plan) * 100 : 0) : (plan ? ((forecast - plan) / plan) * 100 : 0);
    return (
      <ArsCard onClick={() => window.Router.go('/quarterly?q=' + encodeURIComponent(q))} title={`View ${q} detail`} style={{
        borderColor: current ? 'var(--teal-brand)' : 'var(--arsela-border)',
        boxShadow: current ? '0 0 0 3px rgba(0,168,150,0.12), var(--arsela-shadow-card)' : 'var(--arsela-shadow-card)',
        position: 'relative', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700 }}>{q} · {window.Store.fyLabel(window.Store.today())}</div>
            <div style={{ fontSize: 11, color: 'var(--arsela-text-subtle)', marginTop: 3 }}>{actual != null ? 'Actual' : 'Forecast'}</div>
          </div>
          {current && <ArsBadge tone="teal" size="sm">Current</ArsBadge>}
        </div>
        <ArsFigure value={fmtMYR(actual != null ? actual : forecast, { compact: true }).replace(window.Store.getCurrencyConfig().symbol + ' ', '')} unit={window.Store.getCurrencyConfig().symbol} size={28}/>
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

  const QoQChart = ({ quarters }) => {
    const { useState } = React;
    const [hover, setHover] = useState(null); // { i, kind }
    if (!quarters || quarters.every((q) => !q.plan && !q.actual && !q.forecast)) {
      return (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArsEmpty icon={<IconChart size={22}/>} title="No budgets yet" body="Quarterly plan vs actual will appear once budgets are added." action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>}/>
        </div>
      );
    }
    const w = 660, h = 260, pad = { l: 44, r: 20, t: 20, b: 30 };
    const max = Math.max(10, Math.max(...quarters.map((q) => Math.max(q.plan || 0, q.actual || 0, q.forecast || 0))) * 1.3);
    const groupW = (w - pad.l - pad.r) / quarters.length;
    const barW = 22;
    const yFor = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
    const xFor = (i) => pad.l + groupW * i + groupW / 2;
    const goQuarter = (q) => window.Router.go('/quarterly?q=' + encodeURIComponent(q));
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="qBudget" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#B9CBFF"/><stop offset="1" stopColor="#DDE6FF"/></linearGradient>
          <linearGradient id="qActual" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1E52DA"/><stop offset="1" stopColor="#1343CB"/></linearGradient>
          <linearGradient id="qForecast" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#00A896" opacity="0.75"/><stop offset="1" stopColor="#00A896" opacity="0.35"/></linearGradient>
        </defs>
        {[0, max / 4, max / 2, (max * 3) / 4, max].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={yFor(v)} y2={yFor(v)} stroke="#EEF1F6"/>
            <text x={pad.l - 8} y={yFor(v) + 4} fontSize="10" fill="#8492A6" textAnchor="end" fontWeight="600">{curLabel(v)}</text>
          </g>
        ))}
        {quarters.map((q, i) => {
          const cx = xFor(i);
          const isHoverPlan = hover && hover.i === i && hover.kind === 'plan';
          const isHoverActual = hover && hover.i === i && hover.kind === 'actual';
          const isHoverForecast = hover && hover.i === i && hover.kind === 'forecast';
          return (
            <g key={q.q}>
              <rect x={cx - barW - 4} y={yFor(q.plan)} width={barW} height={yFor(0) - yFor(q.plan)} fill="url(#qBudget)" rx="3"
                style={{ cursor: 'pointer' }} onClick={() => goQuarter(q.q)}
                onMouseEnter={() => setHover({ i, kind: 'plan' })} onMouseLeave={() => setHover(null)}/>
              <text x={cx - barW / 2 - 4} y={yFor(q.plan) - 6} fontSize="9.5" fill="#5A6B85" fontWeight="700" textAnchor="middle" opacity={isHoverPlan ? 1 : 0.7}>{curLabel(q.plan)}</text>
              {q.actual != null && (
                <>
                  <rect x={cx + 4} y={yFor(q.actual)} width={barW} height={yFor(0) - yFor(q.actual)} fill="url(#qActual)" rx="3"
                    style={{ cursor: 'pointer' }} onClick={() => goQuarter(q.q)}
                    onMouseEnter={() => setHover({ i, kind: 'actual' })} onMouseLeave={() => setHover(null)}/>
                  <text x={cx + 4 + barW / 2} y={yFor(q.actual) - 6} fontSize="9.5" fill="#1343CB" fontWeight="700" textAnchor="middle" opacity={isHoverActual ? 1 : 0.85}>{curLabel(q.actual)}</text>
                </>
              )}
              {q.forecast != null && (
                <>
                  <rect x={cx + 4} y={yFor(q.forecast)} width={barW} height={yFor(0) - yFor(q.forecast)} fill="url(#qForecast)" rx="3" stroke="#00A896" strokeWidth="1" strokeDasharray="3 2"
                    style={{ cursor: 'pointer' }} onClick={() => goQuarter(q.q)}
                    onMouseEnter={() => setHover({ i, kind: 'forecast' })} onMouseLeave={() => setHover(null)}/>
                  {q.actual == null && <text x={cx + 4 + barW / 2} y={yFor(q.forecast) - 6} fontSize="9.5" fill="#00A896" fontWeight="700" textAnchor="middle" opacity={isHoverForecast ? 1 : 0.85}>{curLabel(q.forecast)}</text>}
                </>
              )}
              <text x={cx} y={h - 10} fontSize="12" fill="#001F3D" fontWeight="700" textAnchor="middle" style={{ cursor: 'pointer' }} onClick={() => goQuarter(q.q)}>{q.q}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  function AddScenarioModal({ onClose }) {
    const { useState } = React;
    const [n, setN] = useState('');
    const [v, setV] = useState('');
    const [d, setD] = useState('');
    const [c, setC] = useState('blue');
    const save = () => {
      if (!n.trim() || !v || Number(v) <= 0) { window.Store.toast('Enter a scenario name and value', 'danger'); return; }
      window.Store.addScenario({ n: n.trim(), v: Number(v), d: d.trim() || '—', c });
      onClose();
    };
    return (
      <ArsModal open onClose={onClose} title="New scenario" subtitle="Add a full-year projection scenario"
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>Add scenario</ArsButton></>}>
        <ArsField label="Scenario name"><input value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. Upside — new terminal" style={arsFieldInputStyle}/></ArsField>
        <ArsField label={`Full-year value (${window.Store.getState().currency})`}><input type="number" value={v} onChange={(e) => setV(e.target.value)} placeholder="254800000" style={arsFieldInputStyle}/></ArsField>
        <ArsField label="Description"><input value={d} onChange={(e) => setD(e.target.value)} placeholder="e.g. +2.6% vs plan" style={arsFieldInputStyle}/></ArsField>
        <ArsField label="Tone">
          <select value={c} onChange={(e) => setC(e.target.value)} style={arsFieldInputStyle}>
            {['success', 'blue', 'warning', 'danger', 'teal'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </ArsField>
      </ArsModal>
    );
  }

  function QuarterlyScreen() {
    const { useState, useEffect } = React;
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);
    const scenarios = s.scenarios || [];
    const [addScenarioOpen, setAddScenarioOpen] = useState(false);

    // "Submissions" was previously a hardcoded local list of fake
    // division reforecasts. There is no real quarterly-submission-status
    // data model in Store yet, so this is derived honestly from what DOES
    // exist: the configured department list, cross-referenced with
    // whether each department has any live budget entered (allocated
    // total = "prior forecast", forecastFinal total = "new forecast").
    // A department is "submitted" once it has at least one budget line
    // with a forecastFinal figure; otherwise "pending" (there is no real
    // deadline-tracking yet, so this deliberately avoids labelling
    // anything "overdue" without a real due-date data source).
    const submissions = (s.departments || []).map((dept) => {
      const deptBudgets = (s.budgets || []).filter((b) => b.dept === dept);
      const pf = deptBudgets.reduce((a, b) => a + (b.allocated || 0), 0) / 1e6;
      const hasForecast = deptBudgets.some((b) => b.forecastFinal != null);
      const nf = hasForecast ? deptBudgets.reduce((a, b) => a + (b.forecastFinal || b.spent || 0), 0) / 1e6 : null;
      const owner = (deptBudgets.find((b) => b.owner) || {}).owner || '—';
      return { d: dept, o: owner, s: hasForecast ? 'Live' : '—', pf, nf, st: hasForecast ? 'submitted' : 'pending' };
    });

    const submittedCount = submissions.filter((s) => s.st === 'submitted').length;
    const overdueCount = submissions.filter((s) => s.st === 'overdue').length;
    const pendingCount = submissions.length - submittedCount - overdueCount;

    const routeQ = window.Router.current().params.q;
    useEffect(() => {
      const unsub = window.Router.subscribe((r) => {
        if (r.params.q) {
          const el = document.getElementById('division-submissions');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      if (routeQ) {
        const el = document.getElementById('division-submissions');
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
      return unsub;
    }, []);

    const currentQLabel = window.Store.fyQuarterLabel(window.Store.today());

    const escalate = () => {
      const overdue = submissions.filter((r) => r.st === 'overdue');
      if (overdue.length === 0) {
        window.Store.toast('No overdue divisions to escalate', 'info');
        return;
      }
      overdue.forEach((r) => {
        window.Store.addNotification({
          icon: '⏰', tone: 'danger',
          title: `Escalation — ${r.d} reforecast overdue`,
          detail: `${r.o} has not submitted the ${currentQLabel} reforecast. Reminder escalated to division owner.`,
        });
      });
      window.Store.toast(`Escalation sent to ${overdue.length} overdue division(s)`, 'warning');
    };

    const exportSubmissions = () => {
      exportRowsToCSV(
        `${currentQLabel.toLowerCase().replace(/\s+/g, '-')}-division-submissions`,
        ['Division', 'Owner', 'Submitted', `Prior Forecast (${window.Store.getState().currency})`, `New Forecast (${window.Store.getState().currency})`, 'Δ %', 'Status'],
        submissions.map((r) => [
          r.d, r.o, r.s, r.pf * 1e6, r.nf != null ? r.nf * 1e6 : '', (r.nf != null && r.pf) ? (((r.nf - r.pf) / r.pf) * 100).toFixed(1) : '', r.st,
        ])
      );
    };

    const submitReforecast = () => {
      if (submissions.length === 0) { window.Store.toast('Add budgets first — there is nothing to reforecast yet', 'warning'); return; }
      window.Store.addNotification({
        icon: '✓', tone: 'success',
        title: `${currentQLabel} reforecast submitted`,
        detail: `Group consolidated ${currentQLabel} reforecast (${submittedCount}/${submissions.length} divisions) sent for approval.`,
      });
      window.Store.toast(`${currentQLabel} reforecast submitted for approval`, 'success');
    };

    // Quarterly plan/actual/forecast — there is no per-quarter actuals
    // breakdown in the data model yet (Store only holds one live pool of
    // budgets for the current fiscal year), so the annual totals are
    // split evenly across the 4 fiscal quarters: elapsed quarters show
    // actual = total reconciled spend to date ÷ elapsed quarters,
    // remaining quarters show forecast = total forecast-final ÷
    // remaining quarters. This is an even-split approximation, not a
    // real quarter-by-quarter history — it will read as more accurate
    // once quarterly actuals are tracked directly.
    const currentQNum = window.Store.fyQuarterOf(window.Store.today());
    const qTotalAllocated = (s.budgets || []).reduce((a, b) => a + (b.allocated || 0), 0) / 1e6;
    const qTotalSpent = (s.budgets || []).reduce((a, b) => a + (b.reconciled ? (b.spent || 0) : 0), 0) / 1e6;
    const qTotalForecast = (s.budgets || []).reduce((a, b) => a + (b.forecastFinal || b.spent || 0), 0) / 1e6;
    const qPlanEach = qTotalAllocated / 4;
    const qActualEach = currentQNum > 0 ? qTotalSpent / currentQNum : 0;
    const remainingQuarters = 4 - currentQNum;
    const qForecastEach = remainingQuarters > 0 ? qTotalForecast / remainingQuarters : 0;
    const quarterData = [1, 2, 3, 4].map((n) => ({
      q: `Q${n}`,
      plan: qPlanEach,
      actual: n <= currentQNum ? qActualEach : null,
      forecast: n > currentQNum ? qForecastEach : undefined,
      status: n < currentQNum ? (qActualEach >= qPlanEach ? 'success' : 'warning') : n === currentQNum ? 'warning' : 'blue',
      current: n === currentQNum,
    }));

    return (
      <AppFrame
        active="Quarterly"
        title="Quarterly Planning"
        breadcrumb={['Arsela Resources', 'Plan', 'Quarterly']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconRefresh size={15}/>} onClick={() => window.Store.toast('Copied figures from prior quarter', 'info')}>Copy from prior quarter</ArsButton>
            <ArsButton size="md" icon={<IconCheck size={15}/>} onClick={submitReforecast}>Submit {currentQLabel} reforecast</ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div className="arsela-h1" style={{ fontSize: 22, letterSpacing: -0.3 }}>{currentQLabel} reforecast</div>
              <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 4 }}>
                {submittedCount} of {submissions.length} divisions have live budget data{overdueCount > 0 ? <> · <span style={{ color: 'var(--warning)' }}>{overdueCount} overdue</span></> : pendingCount > 0 ? <> · <span style={{ color: 'var(--arsela-text-subtle)' }}>{pendingCount} pending</span></> : null}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 160 }}><ArsProgress value={submissions.length ? Math.round((submittedCount / submissions.length) * 100) : 0} tone="teal" height={8}/></div>
                <span className="arsela-num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-navy)' }}>{submissions.length ? Math.round((submittedCount / submissions.length) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
            {quarterData.map((q) => <QuarterCard key={q.q} {...q}/>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <ArsCard>
              <ArsSectionHeader
                title="Quarterly performance — Plan vs Actual"
                subtitle="Group consolidated · dashed = forecast"
                action={
                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--arsela-text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(180deg,#B9CBFF,#DDE6FF)' }}/>Plan</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(180deg,#1E52DA,#1343CB)' }}/>Actual</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(0,168,150,0.5)', border: '1px dashed #00A896' }}/>Forecast</span>
                  </div>
                }
              />
              <QoQChart quarters={quarterData}/>
            </ArsCard>

            <ArsCard>
              <ArsSectionHeader title="Scenario comparison" subtitle="Full-year projection" action={<ArsButton variant="ghost" size="sm" icon={<IconPlus size={13}/>} onClick={() => setAddScenarioOpen(true)}>New</ArsButton>}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scenarios.length === 0 && <ArsEmpty icon={<IconChart size={20}/>} title="No scenarios yet" body="Click New to add one."/>}
                {scenarios.map((sc) => (
                  <div key={sc.id} onClick={() => window.Store.setActiveScenario(sc.id)} title="Click to switch to this scenario" style={{
                    padding: 12, borderRadius: 8, cursor: 'pointer',
                    border: sc.active ? '1px solid var(--teal-brand)' : '1px solid var(--arsela-border)',
                    background: sc.active ? 'rgba(0,168,150,0.05)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{sc.n}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ArsBadge tone={sc.c} size="sm">{sc.d}</ArsBadge>
                        <button onClick={(e) => { e.stopPropagation(); window.Store.deleteScenario(sc.id); }} title="Delete scenario" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)', display: 'flex' }}><IconClose size={12}/></button>
                      </div>
                    </div>
                    <div className="arsela-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.3 }}>{fmtMYR(sc.v, { compact: true })}</div>
                  </div>
                ))}
              </div>
            </ArsCard>
          </div>

          <ArsCard padded={false} id="division-submissions">
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Division submissions · {currentQLabel} reforecast</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{submittedCount} of {submissions.length} submitted{overdueCount > 0 ? ` · ${overdueCount} overdue` : pendingCount > 0 ? ` · ${pendingCount} pending` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <ArsButton variant="secondary" size="sm" icon={<IconMail size={13}/>} onClick={escalate}>Escalate overdue</ArsButton>
                <ArsButton variant="secondary" size="sm" icon={<IconExport size={13}/>} onClick={exportSubmissions}>Export</ArsButton>
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
                  const diff = r.nf != null ? (r.pf ? ((r.nf - r.pf) / r.pf) * 100 : 0) : null;
                  return (
                    <tr key={r.d} onClick={() => window.Router.go('/budgets?dept=' + encodeURIComponent(r.d))}
                      title={`Click to view ${r.d} budgets & projects`}
                      style={{ borderBottom: i < submissions.length - 1 ? '1px solid var(--arsela-border)' : 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FAFBFD'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 20px', fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{r.d}</td>
                      <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--arsela-navy)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ArsAvatar name={r.o} size={22} tone="blue"/>{r.o}
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px', fontSize: 13, color: r.st === 'overdue' ? 'var(--danger)' : 'var(--arsela-text-muted)' }}>{r.s}</td>
                      <td className="arsela-num" style={{ padding: '13px 20px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(r.pf * 1e6, { compact: true })}</td>
                      <td className="arsela-num" style={{ padding: '13px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{r.nf != null ? fmtMYR(r.nf * 1e6, { compact: true }) : '—'}</td>
                      <td style={{ padding: '13px 20px', textAlign: 'right' }}>{diff != null ? <ArsVariance value={diff} size="sm"/> : <span style={{ color: 'var(--arsela-text-subtle)' }}>—</span>}</td>
                      <td style={{ padding: '13px 20px' }}>
                        <ArsBadge tone={r.st === 'submitted' ? 'success' : r.st === 'overdue' ? 'danger' : 'neutral'} dot size="sm">{r.st === 'submitted' ? 'Submitted' : r.st === 'overdue' ? 'Overdue' : 'Pending'}</ArsBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ArsCard>
        </div>
        {addScenarioOpen && <AddScenarioModal onClose={() => setAddScenarioOpen(false)}/>}
      </AppFrame>
    );
  }

  Object.assign(window, { QuarterlyScreen, QuarterCard, QoQChart });
})();
