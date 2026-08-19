/* Budget detail — deep-dive on one budget, wired to Store + route param */
(function () {
  const { useState, useEffect, useMemo } = React;

  const BurndownChart = ({ allocated }) => {
    const w = 640, h = 200, pad = { l: 40, r: 20, t: 16, b: 26 };
    const scale = allocated / 24_800_000; // scale demo curve shape to this budget's size
    const plannedBase = [0, 2.0, 3.9, 5.8, 7.5, 9.4, 11.0, 12.8, 14.6, 16.5, 18.0, 20.0, 24.8];
    const actualBase = [0, 1.6, 3.4, 5.6, 7.9, 9.8, 12.4];
    const planned = plannedBase.map((v) => v * scale);
    const actual = actualBase.map((v) => v * scale);
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total'];
    const max = 26 * scale;
    const xFor = (i) => pad.l + (w - pad.l - pad.r) * (i / (labels.length - 1));
    const yFor = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
    const line = (pts) => pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`).join(' ');
    const area = (pts) => `M ${xFor(0)} ${yFor(0)} ${pts.map((v, i) => `L ${xFor(i)} ${yFor(v)}`).join(' ')} L ${xFor(pts.length - 1)} ${yFor(0)} Z`;
    const gridVals = [0, max * 0.27, max * 0.54, max * 0.81].map((v) => Math.round(v));

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="actualFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1343CB" stopOpacity="0.24"/><stop offset="1" stopColor="#1343CB" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={yFor(v)} y2={yFor(v)} stroke="#EEF1F6"/>
            <text x={pad.l - 8} y={yFor(v) + 4} fontSize="10" fill="#8492A6" textAnchor="end" fontWeight="600">{v.toFixed(1)}M</text>
          </g>
        ))}
        <path d={area(actual)} fill="url(#actualFill)"/>
        <path d={line(planned)} stroke="#B9CBFF" strokeWidth="2" fill="none" strokeDasharray="5 4"/>
        <path d={line(actual)} stroke="#1343CB" strokeWidth="2.4" fill="none"/>
        {actual.map((v, i) => (<circle key={i} cx={xFor(i)} cy={yFor(v)} r="3.5" fill="#fff" stroke="#1343CB" strokeWidth="2"/>))}
        <line x1={xFor(6)} x2={xFor(6)} y1={pad.t} y2={h - pad.b} stroke="#00A896" strokeDasharray="2 3"/>
        <text x={xFor(6) + 4} y={pad.t + 10} fontSize="9.5" fill="#00A896" fontWeight="700">TODAY</text>
        {labels.map((m, i) => (<text key={i} x={xFor(i)} y={h - 8} fontSize="10" fill="#5B6B82" textAnchor="middle" fontWeight="600">{m}</text>))}
      </svg>
    );
  };

  const demoLineItemTemplate = [
    { cat: 'Civil works & foundation', vendor: 'ProConst Sdn Bhd', share: 0.33, tone: 'blue' },
    { cat: 'Cranes & handling equipment', vendor: 'Marintek Systems', share: 0.26, tone: 'blue' },
    { cat: 'IT & operating systems', vendor: 'Digital Arsela', share: 0.15, tone: 'teal' },
    { cat: 'Consulting & PMO', vendor: 'BCG Malaysia', share: 0.09, tone: 'navy' },
    { cat: 'Contingency reserve', vendor: '—', share: 0.10, tone: 'warn' },
    { cat: 'Training & mobilisation', vendor: 'Internal', share: 0.07, tone: 'warn' },
  ];

  const BUDGET_STATUS_OPTIONS = ['draft', 'active', 'amendment', 'over', 'closed', 'archived'];

  function EditBudgetDetailModal({ budget, onClose }) {
    const [form, setForm] = useState(() => ({
      name: budget.name, dept: budget.dept, period: budget.period,
      allocated: budget.allocated, spent: budget.spent, status: budget.status,
    }));
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const save = () => {
      if (!form.name.trim()) { window.Store.toast('Budget name is required', 'danger'); return; }
      window.Store.updateBudget(budget.id, {
        name: form.name.trim(), dept: form.dept.trim(), period: form.period.trim(),
        allocated: Number(form.allocated) || 0, spent: Number(form.spent) || 0, status: form.status,
      });
      onClose();
    };
    return (
      <ArsModal open onClose={onClose} title={`Edit ${budget.id}`} subtitle={budget.name}
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>Save changes</ArsButton></>}>
        <ArsField label="Budget name"><input value={form.name} onChange={set('name')} style={arsFieldInputStyle}/></ArsField>
        <ArsField label="Department"><input value={form.dept} onChange={set('dept')} style={arsFieldInputStyle}/></ArsField>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Period"><input value={form.period} onChange={set('period')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Status">
            <select value={form.status} onChange={set('status')} style={arsFieldInputStyle}>
              {BUDGET_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </ArsField></div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Allocated (RM)"><input type="number" value={form.allocated} onChange={set('allocated')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Spent (RM)"><input type="number" value={form.spent} onChange={set('spent')} style={arsFieldInputStyle}/></ArsField></div>
        </div>
      </ArsModal>
    );
  }

  function AddLineModal({ onClose, onAdd }) {
    const [form, setForm] = useState({ cat: '', vendor: '', planned: '', committed: '', actual: '' });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const save = () => {
      if (!form.cat.trim()) { window.Store.toast('Category name is required', 'danger'); return; }
      onAdd({
        cat: form.cat.trim(),
        vendor: form.vendor.trim() || '—',
        planned: Number(form.planned) || 0,
        committed: Number(form.committed) || 0,
        actual: Number(form.actual) || 0,
        tone: 'blue',
      });
      onClose();
    };
    return (
      <ArsModal open onClose={onClose} title="Add line item" subtitle="New budget category"
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>Add line</ArsButton></>}>
        <ArsField label="Category name"><input value={form.cat} onChange={set('cat')} style={arsFieldInputStyle} placeholder="e.g. Site security"/></ArsField>
        <ArsField label="Vendor"><input value={form.vendor} onChange={set('vendor')} style={arsFieldInputStyle} placeholder="e.g. Internal"/></ArsField>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Planned (RM)"><input type="number" value={form.planned} onChange={set('planned')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Committed (RM)"><input type="number" value={form.committed} onChange={set('committed')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Actual (RM)"><input type="number" value={form.actual} onChange={set('actual')} style={arsFieldInputStyle}/></ArsField></div>
        </div>
      </ArsModal>
    );
  }

  function BudgetDetailScreen() {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [extraLines, setExtraLines] = useState([]);
    const [addLineOpen, setAddLineOpen] = useState(false);
    const [catFilter, setCatFilter] = useState('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const filterRef = React.useRef(null);
    useEffect(() => {
      if (!showFilterMenu) return;
      const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [showFilterMenu]);

    const { segments } = window.Router.current();
    const id = segments[1]; // /budgets/:id
    const budget = s.budgets.find((b) => b.id === id);

    if (!budget) {
      return (
        <AppFrame active="Budgets" title="Budget not found" breadcrumb={['Arsela Resources', 'Plan', 'Budgets']}>
          <ArsEmpty icon={<IconWallet size={22}/>} title="Budget not found" body={`No budget matches "${id}".`}
            action={<ArsButton onClick={() => window.Router.go('/budgets')}>Back to Budgets</ArsButton>}/>
        </AppFrame>
      );
    }

    const committedRatio = budget.status === 'draft' ? 0 : 0.7;
    const committed = Math.round(budget.allocated * committedRatio);
    const remaining = Math.max(0, budget.allocated - budget.spent);
    const utilisation = Math.round((budget.spent / budget.allocated) * 100);

    const allLineItems = useMemo(() => {
      const base = demoLineItemTemplate.map((t) => {
        const planned = Math.round(budget.allocated * t.share);
        const actual = Math.round(budget.spent * t.share);
        const committedLine = Math.round(committed * t.share);
        return { ...t, planned, committed: committedLine, actual };
      });
      return [...base, ...extraLines];
    }, [budget, extraLines]);

    const lineCategories = useMemo(() => ['All', ...Array.from(new Set(allLineItems.map((l) => l.cat)))], [allLineItems]);
    const lineItems = useMemo(() => catFilter === 'All' ? allLineItems : allLineItems.filter((l) => l.cat === catFilter), [allLineItems, catFilter]);

    const total = lineItems.reduce((s, l) => ({ p: s.p + l.planned, c: s.c + l.committed, a: s.a + l.actual }), { p: 0, c: 0, a: 0 });
    const totalPct = total.p ? Math.round((total.a / total.p) * 100) : 0;
    const variance = budget.allocated - budget.spent;
    const variancePct = budget.allocated ? ((variance / budget.allocated) * 100) : 0;

    return (
      <AppFrame
        active="Budgets"
        title={budget.name}
        breadcrumb={['Arsela Resources', 'Plan', 'Budgets', budget.id]}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast('Exporting budget detail…', 'info')}>Export</ArsButton>
            <ArsButton variant="secondary" size="md" icon={<IconEdit size={15}/>} onClick={() => setEditOpen(true)}>Edit</ArsButton>
            <ArsButton variant="danger" size="md" icon={<IconTrash size={15}/>} onClick={() => setDeleteOpen(true)}>Delete</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => window.Router.go('/expenses')}>Add Expense</ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          <ArsCard style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: 'linear-gradient(135deg, #1343CB, #001F3D)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}>
                <IconWallet size={26}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="arsela-mono" style={{ fontSize: 12, background: '#F1F3F7', padding: '2px 8px', borderRadius: 4, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>{budget.id}</span>
                  <ArsLifecycle status={budget.status}/>
                  {budget.capex && <ArsBadge tone="blue">CAPEX</ArsBadge>}
                  <ArsBadge tone="navy">{budget.period}</ArsBadge>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 8, letterSpacing: -0.2 }}>{budget.name}</div>
                <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 4 }}>
                  {budget.dept} · Timeline {budget.period}
                </div>
              </div>
              <div style={{ textAlign: 'right', paddingRight: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Owner</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <ArsAvatar name={budget.owner} size={28} tone="blue"/>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{budget.owner}</div>
                    <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)' }}>{budget.dept}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--arsela-border)' }}>
              {[
                ['Allocated', fmtMYR(budget.allocated, { compact: true }), 'blue'],
                ['Committed', fmtMYR(committed, { compact: true }), 'navy'],
                ['Spent to date', fmtMYR(budget.spent, { compact: true }), 'teal'],
                ['Remaining', fmtMYR(remaining, { compact: true }), 'success'],
                ['Utilisation', utilisation + '%', 'warning'],
              ].map(([l, v, c], i) => (
                <div key={i} style={{ borderLeft: i > 0 ? '1px solid var(--arsela-border)' : 'none', paddingLeft: i > 0 ? 24 : 0 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</div>
                  <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6, letterSpacing: -0.3 }}>
                    {l === 'Spent to date' ? <span className="ars-flash">{v}</span> : v}
                  </div>
                  {i === 4 && <ArsProgress value={Math.min(100, utilisation)} tone={utilisation > 100 ? 'danger' : utilisation > 80 ? 'warning' : 'blue'} height={5}/>}
                </div>
              ))}
            </div>
          </ArsCard>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <ArsCard style={{ background: variance >= 0 ? 'linear-gradient(180deg, #ECFDF3 0%, #fff 100%)' : 'linear-gradient(180deg, #FEECEC 0%, #fff 100%)', border: `1px solid ${variance >= 0 ? 'rgba(26,135,84,0.24)' : 'rgba(214,64,69,0.24)'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: variance >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>Variance vs plan · YTD</div>
                    <ArsLiveDot label="Live"/>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10 }}>
                    <div className="arsela-num ars-flash" style={{ fontSize: 42, fontWeight: 700, color: variance >= 0 ? 'var(--success)' : 'var(--danger)', letterSpacing: -0.8, lineHeight: 1 }}>
                      {variance >= 0 ? '−' : '+'}{fmtMYR(Math.abs(variance), { compact: true })}
                    </div>
                    <ArsVariance value={variancePct} invert size="lg"/>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5, maxWidth: 480 }}>
                    {variance >= 0
                      ? <>Under plan by <b style={{ color: 'var(--success)' }}>{fmtMYR(variance, { compact: true })}</b> through this period.</>
                      : <>Over plan by <b style={{ color: 'var(--danger)' }}>{fmtMYR(-variance, { compact: true })}</b> — requires attention.</>}
                  </div>
                </div>
              </div>
            </ArsCard>

            <ArsCard>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700 }}>Forecast to complete</div>
              <div className="arsela-num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(Math.round(budget.allocated * 0.96), { compact: true })}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <ArsVariance value={-3.6} invert size="sm"/>
                <span style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>vs allocated</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>Confidence <b style={{ color: 'var(--arsela-navy)' }}>82%</b> based on run-rate.</div>
            </ArsCard>

            <ArsCard>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700 }}>Recent update</div>
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--arsela-navy)', lineHeight: 1.5 }}>
                Latest expense activity reflected in Spent to date figure above.
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--teal-text)', fontWeight: 600 }}>
                <IconCheck size={13}/> Figures update live
              </div>
            </ArsCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <ArsCard>
              <ArsSectionHeader title={`Burn-down · ${window.Store.fyLabel(window.Store.today())}`} subtitle="Actual spend against planned monthly burn"/>
              <div style={{ display: 'flex', gap: 20, marginBottom: 6, fontSize: 12, color: 'var(--arsela-text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 20, height: 2, borderTop: '2px dashed #B9CBFF' }}/> Planned</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 20, height: 2, background: '#1343CB' }}/> Actual</span>
              </div>
              <BurndownChart allocated={budget.allocated}/>
            </ArsCard>

            <ArsCard>
              <ArsSectionHeader title="Approvers & Team" action={<a style={{ fontSize: 12, color: 'var(--arsela-blue)', fontWeight: 600, cursor: 'pointer' }} onClick={() => window.Router.go('/approvals')}>Manage</a>}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { name: 'Keith Johnson', role: 'Group Finance Lead', tag: 'Final Approver', tone: 'navy' },
                  { name: 'Aisha Rashid', role: 'CFO Office', tag: 'Reviewer', tone: 'blue' },
                  { name: budget.owner, role: 'Budget Owner', tag: 'Owner', tone: 'teal' },
                  { name: 'Nadia Yeoh', role: 'Finance Partner', tag: 'Preparer', tone: 'purple' },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ArsAvatar name={p.name} size={32} tone={p.tone}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>{p.role}</div>
                    </div>
                    <ArsBadge tone={p.tag === 'Final Approver' ? 'navy' : p.tag === 'Reviewer' ? 'blue' : p.tag === 'Owner' ? 'teal' : 'neutral'} size="sm">{p.tag}</ArsBadge>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: 14, background: 'var(--arsela-blue-50)', borderRadius: 8, border: '1px solid #D6E1FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--arsela-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  <IconClock size={14}/> Next milestone
                </div>
                <div style={{ fontSize: 13, color: 'var(--arsela-navy)', marginTop: 6, lineHeight: 1.4 }}>
                  Q3 forecast reconciliation due <b>08 Aug 2026</b>
                </div>
              </div>
            </ArsCard>
          </div>

          <ArsCard padded={false}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Line Items</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{lineItems.length} categories · variance shown against plan</div>
              </div>
              <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={filterRef}>
                <ArsButton variant="secondary" size="sm" icon={<IconFilter size={14}/>} onClick={() => setShowFilterMenu((v) => !v)}>Filter{catFilter !== 'All' ? `: ${catFilter}` : ''}</ArsButton>
                {showFilterMenu && (
                  <div style={{ position: 'absolute', top: '110%', right: 90, background: '#fff', border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,60,0.14)', minWidth: 200, zIndex: 20, padding: 6 }}>
                    {lineCategories.map((c) => (
                      <button key={c} onClick={() => { setCatFilter(c); setShowFilterMenu(false); }} style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 13,
                        background: c === catFilter ? 'var(--arsela-blue-50)' : 'transparent', color: 'var(--arsela-navy)',
                        border: 'none', borderRadius: 6, cursor: 'pointer',
                      }}>{c}</button>
                    ))}
                  </div>
                )}
                <ArsButton variant="secondary" size="sm" icon={<IconPlus size={14}/>} onClick={() => setAddLineOpen(true)}>Add line</ArsButton>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFD', borderBottom: '1px solid var(--arsela-border)' }}>
                  {['Category', 'Vendor', 'Planned', 'Committed', 'Actual', 'Variance', 'Utilisation'].map((h, i) => (
                    <th key={h} style={{ textAlign: i >= 2 && i <= 5 ? 'right' : 'left', padding: '10px 20px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((l, i) => {
                  const varAmt = l.planned - l.actual;
                  const varPct = l.planned ? ((varAmt / l.planned) * 100).toFixed(1) : '0.0';
                  const u = l.planned ? Math.round((l.actual / l.planned) * 100) : 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--arsela-border)' }}>
                      <td style={{ padding: '14px 20px', fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{l.cat}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--arsela-text-muted)' }}>{l.vendor}</td>
                      <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(l.planned)}</td>
                      <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(l.committed)}</td>
                      <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{fmtMYR(l.actual)}</td>
                      <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: varAmt >= 0 ? 'var(--arsela-success)' : 'var(--arsela-danger)' }}>
                        {varAmt >= 0 ? '+' : ''}{fmtMYR(varAmt)}<div style={{ fontSize: 11, fontWeight: 500, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{varPct}%</div>
                      </td>
                      <td style={{ padding: '14px 20px', width: 180 }}>
                        <ArsProgress value={u} tone={u > 100 ? 'danger' : u > 85 ? 'warning' : 'blue'} showValue/>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#FAFBFD' }}>
                  <td colSpan="2" style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>Total</td>
                  <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(total.p)}</td>
                  <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(total.c)}</td>
                  <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(total.a)}</td>
                  <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: total.p >= total.a ? 'var(--arsela-success)' : 'var(--arsela-danger)' }}>{total.p >= total.a ? '+' : ''}{fmtMYR(total.p - total.a)}</td>
                  <td style={{ padding: '14px 20px' }}><ArsProgress value={totalPct} tone="blue" showValue/></td>
                </tr>
              </tbody>
            </table>
          </ArsCard>
        </div>
        {editOpen && <EditBudgetDetailModal budget={budget} onClose={() => setEditOpen(false)}/>}
        {addLineOpen && <AddLineModal onClose={() => setAddLineOpen(false)} onAdd={(line) => setExtraLines((prev) => [...prev, line])}/>}
        <ArsConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => { window.Store.deleteBudget(budget.id); window.Router.go('/budgets'); }}
          title="Delete budget?"
          message={`This will permanently remove "${budget.name}" (${budget.id}). This cannot be undone.`}
          confirmLabel="Delete"
          danger
        />
      </AppFrame>
    );
  }

  Object.assign(window, { BudgetDetailScreen, BurndownChart });
})();
