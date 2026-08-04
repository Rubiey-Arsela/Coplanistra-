/* ============================================================
   Fiscal Year Closeout wizard — wired
   Step 1: Review FY -> Step 2: Carry-over decisions (functional
   segmented control per row) -> Step 3: Lock & Archive.
   Uses live Store budgets so totals reflect current data.
   ============================================================ */
(function () {
  const { useState, useMemo } = React;

  const CloseoutStep = ({ n, label, active, done }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: done ? 'var(--success)' : active ? 'var(--arsela-navy)' : '#fff',
        color: done || active ? '#fff' : 'var(--arsela-text-muted)',
        border: done || active ? 'none' : '1px solid var(--arsela-border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
      }}>
        {done ? <IconCheck size={16}/> : n}
      </div>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: done || active ? 'var(--arsela-navy)' : 'var(--arsela-text-muted)', fontWeight: 700 }}>Step {n}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: done || active ? 'var(--arsela-navy)' : 'var(--arsela-text-muted)' }}>{label}</div>
      </div>
    </div>
  );

  const CloseoutStepper = ({ step }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '18px 24px', background: '#fff',
      borderRadius: 12, border: '1px solid var(--arsela-border)',
      marginBottom: 20,
    }}>
      <CloseoutStep n={1} label="Review FY" done={step > 0} active={step === 0}/>
      <div style={{ flex: 1, height: 2, background: step > 0 ? 'var(--success)' : 'var(--arsela-border)', margin: '0 6px', borderRadius: 1 }}/>
      <CloseoutStep n={2} label="Carry-over decisions" done={step > 1} active={step === 1}/>
      <div style={{ flex: 1, height: 2, background: step > 1 ? 'var(--success)' : 'var(--arsela-border)', margin: '0 6px', borderRadius: 1 }}/>
      <CloseoutStep n={3} label="Lock & Archive" active={step === 2}/>
    </div>
  );

  const DECISION_OPTS = [
    { k: 'carry', l: 'Carry-over', c: '#1A8754' },
    { k: 'release', l: 'Release', c: '#5B6B82' },
    { k: 'archive', l: 'Archive', c: '#5B21B6' },
  ];

  const CarryoverRow = ({ b, onChange }) => {
    const remaining = b.allocated - b.spent;
    return (
      <tr>
        <td style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{b.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
            <span className="arsela-mono">{b.id}</span> · {b.dept}
          </div>
        </td>
        <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(b.allocated, { compact: true })}</td>
        <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(b.spent, { compact: true })}</td>
        <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: remaining > 0 ? 'var(--success)' : 'var(--danger)' }}>
          {remaining >= 0 ? '+' : ''}{fmtMYR(remaining, { compact: true })}
        </td>
        <td style={{ padding: '14px 20px' }}>
          <div style={{ display: 'inline-flex', background: '#EEF1F6', borderRadius: 8, padding: 3, gap: 2 }}>
            {DECISION_OPTS.map((o) => (
              <button key={o.k} onClick={() => onChange(o.k)} style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                background: b.closeoutDecision === o.k ? '#fff' : 'transparent',
                color: b.closeoutDecision === o.k ? o.c : 'var(--arsela-text-muted)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: b.closeoutDecision === o.k ? '0 1px 2px rgba(0,31,61,0.06)' : 'none',
              }}>{o.l}</button>
            ))}
          </div>
        </td>
        <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--arsela-text-muted)' }}>{b.closeoutNote}</td>
      </tr>
    );
  };

  function defaultDecision(b) {
    const remaining = b.allocated - b.spent;
    const ratio = b.allocated ? remaining / b.allocated : 0;
    if (b.status === 'over') return { decision: 'archive', note: 'Over-spend logged in exception report' };
    if (ratio > 0.25) return { decision: 'carry', note: 'Multi-period programme — carry-over auto-recommended' };
    if (ratio < 0.03) return { decision: 'release', note: 'Fully consumed — no carry-over' };
    return { decision: 'carry', note: 'Balance recommended to carry forward' };
  }

  function CloseoutScreen() {
    const s = window.Store.getState();
    const [step, setStep] = useState(1); // start at step 2 (carry-over) per original design default
    const [decisions, setDecisions] = useState(() => {
      const m = {};
      s.budgets.forEach((b) => { m[b.id] = defaultDecision(b); });
      return m;
    });
    const [decisionFilter, setDecisionFilter] = useState('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const filterRef = React.useRef(null);
    React.useEffect(() => {
      if (!showFilterMenu) return;
      const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [showFilterMenu]);

    const allRows = s.budgets.map((b) => ({ ...b, closeoutDecision: decisions[b.id]?.decision, closeoutNote: decisions[b.id]?.note }));
    const rows = decisionFilter === 'All' ? allRows : allRows.filter((b) => b.closeoutDecision === decisionFilter);

    const carry = allRows.filter((b) => b.closeoutDecision === 'carry');
    const release = allRows.filter((b) => b.closeoutDecision === 'release');
    const archive = allRows.filter((b) => b.closeoutDecision === 'archive');
    const carrySum = carry.reduce((sum, b) => sum + Math.max(0, b.allocated - b.spent), 0);
    const releaseSum = release.reduce((sum, b) => sum + Math.max(0, b.allocated - b.spent), 0);
    const totalBudget = allRows.reduce((sum, b) => sum + b.allocated, 0);

    const setDecision = (id, decision) => setDecisions((cur) => ({ ...cur, [id]: { decision, note: 'Manually set' } }));

    const applyAiDefaults = () => {
      const m = {};
      s.budgets.forEach((b) => { m[b.id] = defaultDecision(b); });
      setDecisions(m);
      window.Store.toast('AI-recommended defaults applied', 'info');
    };

    const lock = () => {
      window.Store.toast(`FY2026 locked — ${carry.length} carried over, ${release.length} released, ${archive.length} archived`, 'success');
      window.Router.go('/budgets');
    };

    return (
      <AppFrame
        active="FY Closeout"
        title="Fiscal Year Closeout · FY 2026"
        breadcrumb={['Arsela Resources', 'Plan', 'Budgets', 'FY Closeout']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast('Exporting closeout report…', 'info')}>Export report</ArsButton>
            <ArsButton size="md" icon={<IconArrowRight size={15}/>} onClick={() => (step < 2 ? setStep(step + 1) : lock())}>{step < 2 ? 'Continue' : 'Continue to Lock'}</ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          <CloseoutStepper step={step}/>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>FY26 total budget</div>
              <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8, letterSpacing: -0.3 }}>{fmtMYR(totalBudget, { compact: true })}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{rows.length} active budgets to close</div>
            </ArsCard>
            <ArsCard style={{ borderColor: 'rgba(26,135,84,0.24)', background: '#F6FDF8' }}>
              <div style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Recommended carry-over</div>
              <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)', marginTop: 8, letterSpacing: -0.3 }}>{fmtMYR(carrySum, { compact: true })}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{carry.length} budgets → FY27</div>
            </ArsCard>
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Released to reserves</div>
              <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8, letterSpacing: -0.3 }}>{fmtMYR(releaseSum, { compact: true })}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{release.length} budgets closed out</div>
            </ArsCard>
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>To archive</div>
              <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: '#5B21B6', marginTop: 8, letterSpacing: -0.3 }}>{archive.length}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Read-only after Step 3</div>
            </ArsCard>
          </div>

          <ArsCard padded={false}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Carry-over decisions · per budget</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Each budget must be one of: Carry-over · Release · Archive. Defaults are AI-recommended.</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ArsButton variant="secondary" size="sm" icon={<IconRefresh size={13}/>} onClick={applyAiDefaults}>Apply AI defaults</ArsButton>
                <div style={{ position: 'relative' }} ref={filterRef}>
                  <ArsButton variant="secondary" size="sm" icon={<IconFilter size={13}/>} onClick={() => setShowFilterMenu((v) => !v)}>Filter{decisionFilter !== 'All' ? `: ${decisionFilter}` : ''}</ArsButton>
                  {showFilterMenu && (
                    <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,60,0.14)', minWidth: 180, zIndex: 20, padding: 6 }}>
                      {['All', 'carry', 'release', 'archive'].map((f) => (
                        <button key={f} onClick={() => { setDecisionFilter(f); setShowFilterMenu(false); }} style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 13,
                          background: f === decisionFilter ? 'var(--arsela-blue-50)' : 'transparent', color: 'var(--arsela-navy)',
                          border: 'none', borderRadius: 6, cursor: 'pointer', textTransform: 'capitalize',
                        }}>{f}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--arsela-surface-alt)', borderBottom: '1px solid var(--arsela-border)' }}>
                  {['Budget', 'Allocated', 'Spent', 'Remaining', 'Decision', 'Note'].map((h) => (
                    <th key={h} style={{
                      textAlign: ['Allocated', 'Spent', 'Remaining'].includes(h) ? 'right' : 'left',
                      padding: '11px 20px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)',
                      letterSpacing: 0.6, textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => <CarryoverRow key={b.id} b={b} onChange={(d) => setDecision(b.id, d)}/>)}
              </tbody>
            </table>
            <div style={{
              padding: '16px 20px', borderTop: '1px solid var(--arsela-border)',
              background: 'var(--arsela-surface-alt)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>
                <b style={{ color: 'var(--arsela-navy)' }}>{rows.length} of {rows.length}</b> budgets decisions made · ready for lock
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ArsButton variant="secondary" size="md" onClick={() => setStep(0)}>Back: Review</ArsButton>
                <ArsButton size="md" icon={<IconLock size={14}/>} onClick={lock}>Continue to Lock →</ArsButton>
              </div>
            </div>
          </ArsCard>
        </div>
      </AppFrame>
    );
  }

  Object.assign(window, { CloseoutScreen });
})();
