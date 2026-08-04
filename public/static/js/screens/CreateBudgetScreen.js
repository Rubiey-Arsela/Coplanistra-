/* ============================================================
   Create Budget — wizard-style form (wired)
   4 steps: Details -> Allocation -> Approvers -> Review
   Final submit calls window.Store.addBudget() and navigates
   to the new budget's detail screen.
   ============================================================ */
(function () {
  const { useState, useMemo } = React;

  const DEPTS = ['Ports & Logistics', 'Operations', 'Digital & Data', 'People & Culture', 'Energy & Assets', 'Property', 'Aviation', 'Agri & Food', 'Corporate', 'Sustainability'];
  const TYPES = ['CAPEX', 'OpEx', 'Programme'];
  const SPLIT_PRESETS = {
    'Even split': () => Array(12).fill(1 / 12),
    'Front-load': () => [0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.05, 0.04],
    'Back-load': () => [0.04, 0.05, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.14],
  };
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const StepIndicator = ({ steps, current }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? 'var(--arsela-teal)' : active ? 'var(--arsela-blue)' : '#F1F3F7',
                color: done || active ? '#fff' : 'var(--arsela-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                border: active ? '3px solid var(--arsela-blue-50)' : 'none',
              }}>
                {done ? <IconCheck size={14}/> : i + 1}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Step {i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? 'var(--arsela-navy)' : 'var(--arsela-text-muted)' }}>{s}</div>
              </div>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: done ? 'var(--arsela-teal)' : 'var(--arsela-border)', margin: '0 16px', borderRadius: 999 }}/>}
          </React.Fragment>
        );
      })}
    </div>
  );

  const AllocationBar = ({ month, planned, max, tone = 'blue' }) => {
    const pct = max ? Math.min(100, (planned / max) * 100) : 0;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px', alignItems: 'center', gap: 12, padding: '8px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5 }}>{month}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 30, background: '#F4F6F8', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: tone === 'teal' ? 'linear-gradient(90deg,#00A896,#14B8A6)' : 'linear-gradient(90deg,#1343CB,#2657DB)',
              borderRadius: 6, transition: 'width .2s',
            }}/>
          </div>
        </div>
        <div className="arsela-num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(Math.round(planned))}</div>
      </div>
    );
  };

  function CreateBudgetScreen() {
    const s = window.Store.getState();
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [dept, setDept] = useState(DEPTS[0]);
    const [type, setType] = useState(TYPES[0]);
    const [total, setTotal] = useState('5400000');
    const [startDate, setStartDate] = useState('2027-01-01');
    const [endDate, setEndDate] = useState('2027-12-31');
    const [split, setSplit] = useState('Even split');
    const [lineCats, setLineCats] = useState([
      { c: 'Civil works & foundation', pct: 0.39 },
      { c: 'Cranes & handling equipment', pct: 0.33 },
      { c: 'IT & operating systems', pct: 0.17 },
      { c: 'Consulting & PMO', pct: 0.11 },
    ]);
    const [approvers, setApprovers] = useState([
      { name: 'Nadia Yeoh', role: 'Finance Partner', tone: 'teal' },
      { name: 'Aisha Rashid', role: 'CFO Office', tone: 'blue' },
      { name: 'Keith Johnson', role: 'Group Finance Lead', tone: 'navy' },
    ]);
    const [submitting, setSubmitting] = useState(false);

    const totalNum = Number(total) || 0;
    const monthlyShares = SPLIT_PRESETS[split] ? SPLIT_PRESETS[split]() : SPLIT_PRESETS['Even split']();
    const monthlyPlanned = monthlyShares.map((p) => totalNum * p);
    const maxMonth = Math.max(...monthlyPlanned, 1);

    const steps = ['Details', 'Allocation', 'Approvers', 'Review'];

    const canNext = () => {
      if (step === 0) return name.trim().length > 0 && totalNum > 0;
      return true;
    };

    const next = () => setStep((v) => Math.min(steps.length - 1, v + 1));
    const back = () => setStep((v) => Math.max(0, v - 1));

    const submit = (asDraft) => {
      setSubmitting(true);
      const fy = 'FY' + String(new Date(startDate || '2027-01-01').getFullYear()).slice(-2);
      const record = window.Store.addBudget({
        name: name.trim(),
        owner: (window.Store.getCurrentUser() && window.Store.getCurrentUser().name) || 'Unknown',
        dept,
        period: fy,
        startDate,
        endDate,
        allocated: totalNum,
        capex: type === 'CAPEX',
        status: asDraft ? 'draft' : 'active',
      });
      setTimeout(() => window.Router.go('/budgets/' + record.id), 250);
    };

    return (
      <AppFrame
        active="Budgets"
        title="New Budget"
        breadcrumb={['Arsela Resources', 'Plan', 'Budgets', 'New']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="ghost" size="md" onClick={() => window.Router.go('/budgets')}>Cancel</ArsButton>
            <ArsButton variant="secondary" size="md" onClick={() => submit(true)}>Save draft</ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          <ArsCard style={{ padding: 24, marginBottom: 20 }}>
            <StepIndicator steps={steps} current={step}/>
          </ArsCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {step === 0 && (
                <ArsCard>
                  <ArsSectionHeader title="Basics" subtitle="Name it clearly — approvers see this first."/>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                    <label style={{ display: 'block' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Budget name</div>
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Port Klang — CAPEX Expansion Phase 3" style={{
                        width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', boxSizing: 'border-box',
                      }}/>
                    </label>
                    <ArsInput label="Budget code (auto)" value={'BUD-' + Math.floor(2700 + Math.random() * 90)} hint="Assigned on submission."/>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Department</div>
                      <select value={dept} onChange={(e) => setDept(e.target.value)} style={{
                        width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--arsela-navy)', background: '#fff',
                      }}>
                        {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Total budget (RM)</div>
                      <input value={total} onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, ''))} style={{
                        width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--arsela-navy)', boxSizing: 'border-box',
                      }}/>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Type</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {TYPES.map((t) => (
                          <button key={t} onClick={() => setType(t)} style={{
                            flex: 1, padding: '9px 8px', fontSize: 12.5, fontWeight: 600, borderRadius: 8,
                            background: type === t ? 'var(--arsela-blue-50)' : '#fff', color: type === t ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                            border: '1px solid ' + (type === t ? '#D6E1FF' : 'var(--arsela-border-strong)'),
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                    <label style={{ display: 'block' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Start</div>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{
                        width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', boxSizing: 'border-box',
                      }}/>
                    </label>
                    <label style={{ display: 'block' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>End</div>
                      <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} style={{
                        width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', boxSizing: 'border-box',
                      }}/>
                    </label>
                  </div>
                </ArsCard>
              )}

              {step === 1 && (
                <>
                  <ArsCard>
                    <ArsSectionHeader
                      title="Monthly allocation"
                      subtitle="Choose a split — totals live-update on the right"
                      action={
                        <div style={{ display: 'flex', gap: 6 }}>
                          {Object.keys(SPLIT_PRESETS).map((t) => (
                            <button key={t} onClick={() => setSplit(t)} style={{
                              padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                              background: split === t ? 'var(--arsela-navy)' : '#fff', color: split === t ? '#fff' : 'var(--arsela-navy)',
                              border: '1px solid ' + (split === t ? 'var(--arsela-navy)' : 'var(--arsela-border-strong)'),
                            }}>{t}</button>
                          ))}
                        </div>
                      }
                    />
                    <div>
                      {MONTHS.map((m, i) => (
                        <AllocationBar key={m} month={m} planned={monthlyPlanned[i]} max={maxMonth} tone={i >= 5 && i <= 8 ? 'teal' : 'blue'}/>
                      ))}
                    </div>
                  </ArsCard>

                  <ArsCard>
                    <ArsSectionHeader
                      title="Line categories"
                      subtitle="Optional — break down the plan for granular tracking"
                      action={<ArsButton variant="secondary" size="sm" icon={<IconPlus size={13}/>} onClick={() => setLineCats((cur) => [...cur, { c: 'New category', pct: 0 }])}>Add category</ArsButton>}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {lineCats.map((l, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 160px 32px', gap: 12, alignItems: 'center', padding: '10px 12px', background: '#FAFBFD', border: '1px solid var(--arsela-border)', borderRadius: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--arsela-blue-50)', color: 'var(--arsela-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconTag size={14}/></div>
                          <input value={l.c} onChange={(e) => setLineCats((cur) => cur.map((x, xi) => xi === i ? { ...x, c: e.target.value } : x))} style={{
                            border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)', fontFamily: 'inherit', outline: 'none',
                          }}/>
                          <div className="arsela-num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(Math.round(totalNum * l.pct))}</div>
                          <button onClick={() => setLineCats((cur) => cur.filter((_, xi) => xi !== i))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)', justifySelf: 'center' }}><IconClose size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </ArsCard>
                </>
              )}

              {step === 2 && (
                <ArsCard>
                  <ArsSectionHeader title="Approval chain" subtitle="Order matters — first approver is notified immediately on submission"
                    action={<ArsButton variant="secondary" size="sm" icon={<IconPlus size={13}/>} onClick={() => setApprovers((cur) => [...cur, { name: 'New approver', role: 'Reviewer', tone: 'blue' }])}>Add approver</ArsButton>}/>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {approvers.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#FAFBFD', border: '1px solid var(--arsela-border)', borderRadius: 8 }}>
                        <ArsAvatar name={a.name} size={30} tone={a.tone}/>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{a.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>{a.role}</div>
                        </div>
                        <span style={{ fontSize: 10, background: '#F1F3F7', padding: '2px 6px', borderRadius: 4, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.3 }}>#{i + 1}</span>
                        <button onClick={() => setApprovers((cur) => cur.filter((_, xi) => xi !== i))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-text-subtle)' }}><IconClose size={14}/></button>
                      </div>
                    ))}
                  </div>
                </ArsCard>
              )}

              {step === 3 && (
                <ArsCard>
                  <ArsSectionHeader title="Review & submit" subtitle="Confirm details before sending for approval"/>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Name</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 4 }}>{name || '(untitled)'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Department</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 4 }}>{dept}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Type</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 4 }}>{type}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total</div>
                      <div className="arsela-num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 4 }}>{fmtMYR(totalNum)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Period</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 4 }}>{startDate} → {endDate}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 18, padding: 14, background: 'var(--arsela-teal-50)', border: '1px solid #C8ECE6', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ color: 'var(--arsela-teal-600)', marginTop: 1 }}><IconCheck size={14}/></div>
                      <div style={{ fontSize: 12.5, color: 'var(--arsela-navy)', lineHeight: 1.5 }}>
                        <b>Ready to submit.</b> Coplanistra will notify {approvers[0]?.name || 'the first approver'} once submitted.
                      </div>
                    </div>
                  </div>
                </ArsCard>
              )}
            </div>

            {/* right rail: live summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0, height: 'fit-content' }}>
              <ArsCard>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Total budget</div>
                <div className="arsela-num" style={{ fontSize: 32, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8, letterSpacing: -0.5 }}>{fmtMYR(totalNum, { compact: true })}</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Across 12 months · avg {fmtMYR(totalNum / 12, { compact: true })}/mo</div>

                <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--arsela-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>FY27 envelope check</div>
                  <ArsProgress value={Math.min(100, Math.round((totalNum / 40_000_000) * 100))} tone="teal"/>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>
                    <span>{dept} FY27</span>
                    <span>Well within envelope</span>
                  </div>
                </div>
              </ArsCard>

              <ArsButton size="lg" full
                iconRight={step < steps.length - 1 ? <IconChevronRight size={16}/> : undefined}
                onClick={() => (step < steps.length - 1 ? (canNext() ? next() : window.Store.toast('Please fill in name and budget amount', 'danger')) : submit(false))}
                style={{ opacity: submitting ? 0.6 : 1, pointerEvents: submitting ? 'none' : 'auto' }}
              >
                {step < steps.length - 1 ? `Continue to ${steps[step + 1]}` : (submitting ? 'Submitting…' : 'Submit for approval')}
              </ArsButton>
              {step > 0 && <ArsButton variant="secondary" full onClick={back}>Back</ArsButton>}
            </div>
          </div>
        </div>
      </AppFrame>
    );
  }

  Object.assign(window, { CreateBudgetScreen });
})();
