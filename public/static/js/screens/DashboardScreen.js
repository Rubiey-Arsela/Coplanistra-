/* Dashboard — role-aware, wired to Store (role switch re-renders live) */
(function () {
  /* FY progress — fraction of the fiscal year elapsed as of the app's
     reference "today" (22 July 2026), used to prorate "budget to date"
     against the full annual allocation for the Spent-vs-Budget-to-date
     panel below. */
  const FY_REFERENCE_DATE = new Date(2026, 6, 22); // 22 July 2026
  function fyProgressPct() {
    const start = new Date(FY_REFERENCE_DATE.getFullYear(), 0, 1);
    const end = new Date(FY_REFERENCE_DATE.getFullYear(), 11, 31);
    const elapsed = (FY_REFERENCE_DATE - start) / (end - start);
    return Math.min(1, Math.max(0, elapsed));
  }

  /* Spent-to-date vs Budget-to-date panel — reads LIVE budgets from the
     Store (not a hardcoded snapshot), so it stays in sync the moment any
     budget is created/edited/approved elsewhere in the app. "Budget to
     date" is the annual allocation prorated by how far through FY26 we
     are; "Spent to date" is the real cumulative spend. Clicking routes
     to the Reports variance view; the delta figure itself explains
     whether spend is running ahead of or behind the time-prorated plan. */
  const SpentVsBudgetToDate = ({ budgets }) => {
    const totalAllocated = budgets.reduce((a, b) => a + (b.allocated || 0), 0);
    const totalSpent = budgets.reduce((a, b) => a + (b.spent || 0), 0);
    const pct = fyProgressPct();
    const budgetToDate = totalAllocated * pct;
    const variance = totalSpent - budgetToDate;
    const variancePct = budgetToDate > 0 ? (variance / budgetToDate) * 100 : 0;
    const ahead = variance > 0;
    const barPct = budgetToDate > 0 ? Math.min(140, Math.round((totalSpent / budgetToDate) * 100)) : 0;

    return (
      <ArsCard
        onClick={() => window.Router.go('/reports')}
        title="Click to view full variance analysis"
        style={{ cursor: 'pointer' }}
      >
        <ArsSectionHeader
          title="Spent to Date vs Budget to Date"
          subtitle={`Time-prorated FY26 plan (${Math.round(pct * 100)}% of year elapsed) vs actual cumulative spend`}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Budget to date</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(budgetToDate, { compact: true })}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 3 }}>of {fmtMYR(totalAllocated, { compact: true })} annual plan</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Spent to date</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(totalSpent, { compact: true })}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 3 }}>actual cumulative spend</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Variance</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: ahead ? 'var(--arsela-danger)' : 'var(--arsela-success)', marginTop: 6 }}>
              {ahead ? '+' : ''}{fmtMYR(variance, { compact: true })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 3 }}>
              {ahead ? `${variancePct.toFixed(1)}% ahead of time-prorated plan` : `${Math.abs(variancePct).toFixed(1)}% behind time-prorated plan`}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ position: 'relative', height: 10, borderRadius: 999, background: '#EEF1F6', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', background: '#DDE6FF' }}/>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${Math.min(100, barPct)}%`,
              background: ahead ? 'linear-gradient(90deg, #F59E0B, #D64045)' : 'linear-gradient(90deg, #1E52DA, #00A896)',
              borderRadius: 999,
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--arsela-text-muted)' }}>
            <span>0%</span>
            <span style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{barPct}% of budget-to-date spent</span>
            <span>140%</span>
          </div>
        </div>
      </ArsCard>
    );
  };

  const StatCard = ({ label, value, delta, deltaTone, sub, icon, tone = 'blue', onClick, title }) => {
    const iconBg = {
      blue: { bg: 'var(--arsela-blue-50)', fg: 'var(--arsela-blue)' },
      teal: { bg: 'var(--arsela-teal-50)', fg: 'var(--arsela-teal-600)' },
      navy: { bg: '#E7EBF3', fg: 'var(--arsela-navy)' },
      warn: { bg: 'var(--arsela-warning-50)', fg: '#B4740A' },
    }[tone];
    return (
      <ArsCard onClick={onClick} title={title} style={onClick ? { cursor: 'pointer' } : undefined}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12.5, color: 'var(--arsela-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: iconBg.bg, color: iconBg.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{icon}</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.4, marginTop: 14, lineHeight: 1 }} className="arsela-num">{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          {delta && <ArsBadge tone={deltaTone} size="sm">{delta}</ArsBadge>}
          {sub && <span style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>{sub}</span>}
        </div>
      </ArsCard>
    );
  };

  /* Quarter/month period picker — replaces the old toast-only pill.
     Lets the user actually choose which quarter or month they want to
     view; selecting a quarter also routes into the Quarterly screen
     filtered to that quarter, and a month routes into Monthly. */
  function PeriodPicker() {
    const { useState: useState2, useRef: useRef2, useEffect: useEffect2 } = React;
    const [open, setOpen] = useState2(false);
    const [period, setPeriod] = useState2(window.Store.getState().period || 'Q3 · FY 2026');
    const ref = useRef2(null);
    useEffect2(() => window.Store.subscribe((s) => setPeriod(s.period || 'Q3 · FY 2026')), []);
    useEffect2(() => {
      if (!open) return;
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [open]);
    const quarters = ['Q1 · FY 2026', 'Q2 · FY 2026', 'Q3 · FY 2026', 'Q4 · FY 2026'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const choose = (label, isQuarter) => {
      window.Store.setPeriod(label);
      setOpen(false);
      if (isQuarter) window.Router.go('/quarterly?q=' + encodeURIComponent(label.split(' ')[0]));
      else window.Router.go('/monthly?month=' + encodeURIComponent(label));
    };
    return (
      <div style={{ position: 'relative' }} ref={ref}>
        <ArsButton variant="secondary" size="md" icon={<IconCalendar size={15}/>} onClick={() => setOpen((v) => !v)}>{period}</ArsButton>
        {open && (
          <div style={{
            position: 'absolute', top: 44, right: 0, minWidth: 240,
            background: '#fff', border: '1px solid var(--arsela-border)', borderRadius: 10,
            boxShadow: 'var(--arsela-shadow-elevated)', zIndex: 60, padding: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', padding: '2px 6px 6px' }}>Quarter</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 4, marginBottom: 8 }}>
              {quarters.map((q) => (
                <button key={q} onClick={() => choose(q, true)} style={{
                  padding: '7px 8px', fontSize: 12.5, fontWeight: 600, borderRadius: 6, textAlign: 'left',
                  background: q === period ? 'var(--arsela-blue-50)' : 'transparent', color: q === period ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}>{q}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', padding: '2px 6px 6px', borderTop: '1px solid var(--arsela-border)' }}>Month</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
              {months.map((m) => (
                <button key={m} onClick={() => choose(m + ' 2026', false)} style={{
                  padding: '6px 4px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                  background: period.startsWith(m) ? 'var(--arsela-blue-50)' : 'transparent', color: period.startsWith(m) ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}>{m}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const BudgetChart = () => {
    const [hover, setHover] = React.useState(null); // { i, kind }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const budget = [32, 34, 36, 38, 38, 40, 42];
    const actual = [28, 33, 31, 39, 36, 38, 40];
    const forecast = [42, 42, 44, 45, 46];
    const w = 660, h = 260, pad = { l: 44, r: 20, t: 20, b: 30 };
    const max = 55;
    const barW = 22;
    const gap = (w - pad.l - pad.r) / months.length;
    const yFor = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
    const xFor = (i) => pad.l + gap * i + gap / 2;
    const goMonth = (m) => window.Router.go('/monthly?month=' + encodeURIComponent(m));

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="barBudget" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#B9CBFF"/><stop offset="1" stopColor="#DDE6FF"/></linearGradient>
          <linearGradient id="barActual" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1E52DA"/><stop offset="1" stopColor="#1343CB"/></linearGradient>
        </defs>
        {[0, 15, 30, 45].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={yFor(v)} y2={yFor(v)} stroke="#EEF1F6" strokeWidth="1"/>
            <text x={pad.l - 8} y={yFor(v) + 4} fontSize="10" fill="#8492A6" textAnchor="end" fontWeight="600">{curLabel(v)}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const b = budget[i], a = actual[i];
          const isHoverB = hover && hover.i === i && hover.kind === 'b';
          const isHoverA = hover && hover.i === i && hover.kind === 'a';
          return (
            <g key={m}>
              <rect x={xFor(i) - barW - 2} y={yFor(b)} width={barW} height={yFor(0) - yFor(b)} fill="url(#barBudget)" rx="3"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover({ i, kind: 'b' })} onMouseLeave={() => setHover(null)}
                onClick={() => goMonth(m)}/>
              <rect x={xFor(i) + 2} y={yFor(a)} width={barW} height={yFor(0) - yFor(a)} fill="url(#barActual)" rx="3"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover({ i, kind: 'a' })} onMouseLeave={() => setHover(null)}
                onClick={() => goMonth(m)}/>
              {(isHoverB || true) && (
                <text x={xFor(i) - barW / 2 - 2} y={yFor(b) - 6} fontSize="9.5" fill="#5B6B82" textAnchor="middle" fontWeight="700" opacity={isHoverB ? 1 : 0.55}>{curLabel(b)}</text>
              )}
              <text x={xFor(i) + barW / 2 + 2} y={yFor(a) - 6} fontSize="9.5" fill="#1343CB" textAnchor="middle" fontWeight="700" opacity={isHoverA ? 1 : 0.85}>{curLabel(a)}</text>
              <text x={xFor(i)} y={h - 10} fontSize="11" fill="#5B6B82" textAnchor="middle" fontWeight="600" style={{ cursor: 'pointer' }} onClick={() => goMonth(m)}>{m}</text>
            </g>
          );
        })}
        <path d={`M ${xFor(6)} ${yFor(actual[6])} L ${xFor(7)} ${yFor(forecast[1])} L ${xFor(8)} ${yFor(forecast[2])} L ${xFor(9)} ${yFor(forecast[3])} L ${xFor(10)} ${yFor(forecast[4])}`} stroke="#00A896" strokeWidth="2" strokeDasharray="5 4" fill="none"/>
        <line x1={xFor(6) + 14} x2={xFor(6) + 14} y1={pad.t} y2={h - pad.b} stroke="#00A896" strokeWidth="1" strokeDasharray="2 3" opacity="0.7"/>
        <text x={xFor(6) + 18} y={pad.t + 12} fontSize="10" fill="#00A896" fontWeight="700">TODAY</text>
      </svg>
    );
  };

  const CategoryDonut = () => {
    const [hover, setHover] = React.useState(null);
    const data = [
      { label: 'Operations', dept: 'Operations', value: 38, color: '#1343CB' },
      { label: 'Logistics', dept: 'Ports & Logistics', value: 22, color: '#00A896' },
      { label: 'Digital', dept: 'Digital & Data', value: 16, color: '#2657DB' },
      { label: 'People', dept: 'People & Culture', value: 14, color: '#5B9EFF' },
      { label: 'Other', dept: 'All', value: 10, color: '#B9CBFF' },
    ];
    const total = data.reduce((s, d) => s + d.value, 0);
    const cx = 90, cy = 90, r = 70, sw = 22;
    let acc = 0;
    const circ = 2 * Math.PI * r;
    const goDept = (dept) => window.Router.go(dept === 'All' ? '/budgets' : '/budgets?dept=' + encodeURIComponent(dept));
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width="180" height="180">
          <circle cx={cx} cy={cy} r={r} stroke="#F1F3F7" strokeWidth={sw} fill="none"/>
          {data.map((d, i) => {
            const len = (d.value / total) * circ;
            const off = -acc;
            acc += len;
            const isHover = hover === i;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} stroke={d.color} strokeWidth={isHover ? sw + 3 : sw} fill="none"
                strokeDasharray={`${len} ${circ}`} strokeDashoffset={off} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt"
                style={{ cursor: 'pointer', transition: 'stroke-width .12s' }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onClick={() => goDept(d.dept)}
              >
                <title>{d.label} — {d.value}% (click to view {d.dept === 'All' ? 'all budgets' : d.dept})</title>
              </circle>
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="12" fill="#5B6B82" fontWeight="600">
            {hover != null ? data[hover].label : 'Total'}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="20" fill="#001F3D" fontWeight="700">
            {hover != null ? `${data[hover].value}%` : curLabel(248)}
          </text>
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((d, i) => (
            <div key={d.label} onClick={() => goDept(d.dept)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '3px 6px', borderRadius: 6, background: hover === i ? '#F4F6F8' : 'transparent' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }}/>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--arsela-navy)', fontWeight: 500 }}>{d.label}</span>
              <span className="arsela-num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BudgetHealthWidget = ({ categories }) => (
    <ArsCard>
      <ArsSectionHeader
        title="Budget health"
        subtitle="Utilisation by category · semantic colour is meaning"
        action={
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--arsela-text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}/>Under (&lt; 80%)</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning-500)' }}/>Near (80–100%)</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }}/>Over (&gt; 100%)</span>
          </div>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 24px' }}>
        {categories.map((c) => {
          const pct = Math.round((c.spent / c.budget) * 100);
          const tone = pct > 100 ? 'danger' : pct > 80 ? 'warning' : 'success';
          return (
            <div key={c.name} onClick={() => window.Router.go('/expenses?q=' + encodeURIComponent(c.name))} title={`Click to view ${c.name} expenses`}
              style={{ cursor: 'pointer', padding: 6, margin: -6, borderRadius: 8, transition: 'background .12s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#FAFBFD'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{c.name}</span>
                <span className="arsela-num" style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>{fmtMYR(c.spent, { compact: true })} / {fmtMYR(c.budget, { compact: true })}</span>
              </div>
              <ArsProgress value={Math.min(120, pct)} tone={tone} height={8}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
                <ArsLifecycle status={pct > 100 ? 'over' : 'active'}/>
                <span className="arsela-num" style={{ fontWeight: 700, color: tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--success)' }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </ArsCard>
  );

  const roleGreetings = {
    finance: { hi: 'Good morning, Priya.', sub: "Here's how your organisation is tracking against plan · Q3 reforecast cycle closes 31 July." },
    approver: { hi: 'Good morning, Marcus.', sub: 'You have items awaiting your review.' },
    employee: { hi: 'Good morning, Aisha.', sub: 'Your expenses and budget usage at a glance.' },
    admin: { hi: 'Good morning, Keith.', sub: 'All integrations healthy · pending user provisioning requests.' },
  };

  function DashboardScreen() {
    const [s, setS] = React.useState(window.Store.getState());
    React.useEffect(() => window.Store.subscribe(setS), []);
    const [chartView, setChartView] = React.useState('Group');
    const role = s.role;
    const greet = roleGreetings[role] || roleGreetings.finance;
    const pendingApprovals = window.Store.pendingApprovalsCount();
    const pendingExpenses = s.expenses.filter((e) => e.status === 'pending').length;

    const departments = [
      { name: 'Ports & Logistics', owner: 'Faris H.', budget: 62_400_000, spent: 41_200_000, tone: 'blue' },
      { name: 'Operations', owner: 'Aisha R.', budget: 48_000_000, spent: 44_800_000, tone: 'warn' },
      { name: 'Digital & Data', owner: 'Marcus L.', budget: 28_000_000, spent: 12_600_000, tone: 'teal' },
      { name: 'People & Culture', owner: 'Priya N.', budget: 21_000_000, spent: 18_900_000, tone: 'warn' },
      { name: 'Energy & Assets', owner: 'Zara M.', budget: 34_500_000, spent: 19_200_000, tone: 'blue' },
    ];

    const budgetHealthData = [
      { name: 'Payroll', budget: 15_300_000, spent: 14_100_000 },
      { name: 'Information Tech.', budget: 3_900_000, spent: 4_400_000 },
      { name: 'Software Licences', budget: 1_800_000, spent: 2_000_000 },
      { name: 'Marketing', budget: 2_600_000, spent: 1_820_000 },
      { name: 'Professional Fees', budget: 1_600_000, spent: 1_440_000 },
      { name: 'Travel', budget: 1_100_000, spent: 620_000 },
      { name: 'Utilities', budget: 1_400_000, spent: 1_260_000 },
      { name: 'Maintenance', budget: 1_200_000, spent: 1_120_000 },
    ];

    const activities = [
      { who: 'Faris Hamzah', action: 'submitted', target: 'Q3 CAPEX — Port Klang expansion', amount: fmtMYR(4_200_000, { compact: true }), when: '12 min ago', tone: 'blue' },
      { who: 'Aisha Rashid', action: 'approved', target: 'August operating budget · Ops', amount: fmtMYR(3_600_000, { compact: true }), when: '1 h ago', tone: 'teal' },
      { who: 'System', action: 'flagged over-spend on', target: 'People & Culture — training', amount: '+9.2%', when: '3 h ago', tone: 'warn' },
      { who: 'Marcus Lim', action: 'created', target: 'Data centre — cooling retrofit', amount: fmtMYR(1_800_000, { compact: true }), when: 'Yesterday', tone: 'navy' },
    ];

    const exportDashboard = () => {
      exportRowsToCSV(
        'dashboard-overview',
        ['Department', 'Owner', 'Budget (MYR)', 'Spent (MYR)', 'Remaining (MYR)', 'Utilisation %'],
        departments.map((d) => [d.name, d.owner, d.budget, d.spent, d.budget - d.spent, Math.round((d.spent / d.budget) * 100)])
      );
    };

    const roleActions = role === 'employee' ? (
      <div style={{ display: 'flex', gap: 8 }}>
        <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => window.Router.go('/expenses')}>Add Expense</ArsButton>
      </div>
    ) : role === 'approver' ? (
      <div style={{ display: 'flex', gap: 8 }}>
        <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={exportDashboard}>Export</ArsButton>
        <ArsButton size="md" icon={<IconCheck size={15}/>} onClick={() => window.Router.go('/approvals')}>Review Queue ({pendingApprovals})</ArsButton>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 8 }}>
        <PeriodPicker/>
        <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={exportDashboard}>Export</ArsButton>
        <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>
      </div>
    );

    return (
      <AppFrame active="Dashboard" title="Financial Overview" breadcrumb={['Arsela Resources', 'Plan', 'Dashboard']} topActions={roleActions}>
        <div className="coplan-page">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.3 }}>{greet.hi}</div>
                <ArsRoleBadge role={role}/>
              </div>
              <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 4 }}>
                {greet.sub} · <span style={{ color: 'var(--arsela-navy)', fontWeight: 600 }}>22 July 2026</span>
              </div>
            </div>
            <ArsLiveDot label="Live · updated 2 min ago"/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            {role === 'employee' ? (
              <>
                <StatCard label="My Expenses · MTD" value={fmtMYR(4_820)} delta="▲ +12% vs Jun" deltaTone="blue" sub="9 submitted" icon={<IconReceipt size={17}/>} tone="blue" title="Click to view your expenses" onClick={() => window.Router.go('/expenses')}/>
                <StatCard label="Pending Review" value={String(pendingExpenses)} delta="● with mgr" deltaTone="warning" sub="Avg 1.4 days" icon={<IconClock size={17}/>} tone="warn" title="Click to view pending expenses" onClick={() => window.Router.go('/expenses?status=pending')}/>
                <StatCard label="Approved · YTD" value={fmtMYR(38_400)} delta="18 items" deltaTone="success" sub="97% approval rate" icon={<IconCheck size={17}/>} tone="teal" title="Click to view approved expenses" onClick={() => window.Router.go('/expenses?status=approved')}/>
                <StatCard label="Team Budget Left" value={fmtMYR(4_200_000, { compact: true })} delta="● 62% used" deltaTone="warning" sub="Ops · Klang" icon={<IconWallet size={17}/>} tone="navy" title="Click to view team budget" onClick={() => window.Router.go('/budgets?dept=' + encodeURIComponent('Operations'))}/>
              </>
            ) : role === 'approver' ? (
              <>
                <StatCard label="Approval Queue" value={String(pendingApprovals)} delta="▲ urgent" deltaTone="danger" sub="Oldest: 3 days" icon={<IconApproval size={17}/>} tone="warn" title="Click to open approval queue" onClick={() => window.Router.go('/approvals')}/>
                <StatCard label="My Dept Budget" value={fmtMYR(28_000_000, { compact: true })} delta="45% burn" deltaTone="teal" sub="Digital & Data" icon={<IconWallet size={17}/>} tone="teal" title="Click to view department budget" onClick={() => window.Router.go('/budgets?dept=' + encodeURIComponent('Digital & Data'))}/>
                <StatCard label="Avg Approval Time" value="1.8 days" delta="▼ 0.4d faster" deltaTone="success" sub="last 30 days" icon={<IconClock size={17}/>} tone="navy" title="Click to open approval queue" onClick={() => window.Router.go('/approvals')}/>
                <StatCard label="Rejected This Mo." value="2" delta="of 21 items" deltaTone="blue" sub="90% approved" icon={<IconClose size={17}/>} tone="blue" title="Click to open approval queue" onClick={() => window.Router.go('/approvals?status=rejected')}/>
              </>
            ) : (
              <>
                <StatCard label="Total Budget · FY26" value={fmtMYR(248_400_000, { compact: true })} delta="▲ +4.1% YoY" deltaTone="blue" sub={`vs ${fmtMYR(238_600_000, { compact: true })} FY25`} icon={<IconWallet size={17}/>} tone="blue" title="Click to view all budgets" onClick={() => window.Router.go('/budgets')}/>
                <StatCard label="Spent to Date" value={fmtMYR(156_700_000, { compact: true })} delta="63.1% burn" deltaTone="teal" sub="of annual budget" icon={<IconTrend size={17}/>} tone="teal" title="Click to view budgets by spend" onClick={() => window.Router.go('/budgets?status=active')}/>
                <StatCard label="Committed" value={fmtMYR(41_200_000, { compact: true })} delta="● On track" deltaTone="success" sub="POs & contracts" icon={<IconFile size={17}/>} tone="navy" title="Click to view CAPEX & commitments" onClick={() => window.Router.go('/capex')}/>
                <StatCard label="Variance vs Plan" value={'+' + fmtMYR(2_800_000, { compact: true })} delta="▲ 1.8% over" deltaTone="warning" sub="drivers: Ops, People" icon={<IconArrowUp size={17}/>} tone="warn" title="Click to view variance report" onClick={() => window.Router.go('/reports')}/>
              </>
            )}
          </div>

          {role !== 'employee' && (
            <div style={{ marginBottom: 20 }}>
              <SpentVsBudgetToDate budgets={s.budgets}/>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <BudgetHealthWidget categories={budgetHealthData}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <ArsCard>
              <ArsSectionHeader
                title="Budget vs Actual — Rolling 12 months"
                subtitle="Monthly plan against realised spend · forecast in teal"
                action={
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Group', 'By Dept', 'By Cost Centre'].map((t) => (
                      <button key={t} onClick={() => { setChartView(t); if (t !== 'Group') window.Store.toast(`Showing ${t} view`, 'info'); }} style={{
                        padding: '6px 12px', fontSize: 12, fontWeight: 600,
                        borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                        background: t === chartView ? 'var(--arsela-navy)' : '#fff', color: t === chartView ? '#fff' : 'var(--arsela-navy)',
                        border: '1px solid ' + (t === chartView ? 'var(--arsela-navy)' : 'var(--arsela-border-strong)'),
                      }}>{t}</button>
                    ))}
                  </div>
                }
              />
              <div style={{ display: 'flex', gap: 20, marginBottom: 8, fontSize: 12, color: 'var(--arsela-text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(180deg,#B9CBFF,#DDE6FF)' }}/> Planned</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(180deg,#1E52DA,#1343CB)' }}/> Actual</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 20, height: 2, background: '#00A896' }}/> Forecast</span>
              </div>
              <BudgetChart/>
            </ArsCard>
            <ArsCard>
              <ArsSectionHeader title="Category Mix" subtitle="Share of planned FY26" action={<IconMore size={16} style={{ color: 'var(--arsela-text-subtle)', cursor: 'pointer' }} onClick={() => window.Store.toast('Category breakdown exported', 'info')}/>}/>
              <CategoryDonut/>
            </ArsCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <ArsCard padded={false}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Departments · Utilisation</div>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Spend to date vs allocated FY26 budget</div>
                </div>
                <a style={{ fontSize: 12, color: 'var(--arsela-blue)', fontWeight: 600, cursor: 'pointer' }} onClick={() => window.Router.go('/budgets')}>View all →</a>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFBFD', borderBottom: '1px solid var(--arsela-border)' }}>
                    {['Department', 'Owner', 'Utilisation', 'Spent', 'Remaining', 'Status'].map((h) => (
                      <th key={h} style={{ textAlign: h === 'Spent' || h === 'Remaining' ? 'right' : 'left', padding: '10px 20px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d, i) => {
                    const pct = Math.round((d.spent / d.budget) * 100);
                    const tone = pct > 90 ? 'danger' : pct > 75 ? 'warning' : 'blue';
                    const status = pct > 90 ? ['danger', 'Watch'] : pct > 75 ? ['warning', 'Nearing cap'] : ['success', 'On track'];
                    return (
                      <tr key={d.name} onClick={() => window.Router.go('/budgets?dept=' + encodeURIComponent(d.name))}
                        style={{ borderBottom: i < departments.length - 1 ? '1px solid var(--arsela-border)' : 'none', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FAFBFD'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title={`Click to view ${d.name} budgets`}
                      >
                        <td style={{ padding: '14px 20px' }}><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{d.name}</div></td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ArsAvatar name={d.owner} size={26} tone={d.tone === 'warn' ? 'warn' : d.tone}/>
                            <span style={{ fontSize: 13, color: 'var(--arsela-navy)' }}>{d.owner}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', width: 200 }}><ArsProgress value={pct} tone={tone} showValue/></td>
                        <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{fmtMYR(d.spent, { compact: true })}</td>
                        <td className="arsela-num" style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-text-muted)' }}>{fmtMYR(d.budget - d.spent, { compact: true })}</td>
                        <td style={{ padding: '14px 20px' }}><ArsBadge tone={status[0]} dot size="sm">{status[1]}</ArsBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ArsCard>

            <ArsCard padded={false}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Recent Activity</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Approvals, submissions & alerts</div>
              </div>
              <div>
                {activities.map((a, i) => (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: i < activities.length - 1 ? '1px solid var(--arsela-border)' : 'none', display: 'flex', gap: 12 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: a.tone === 'teal' ? 'var(--arsela-teal-50)' : a.tone === 'warn' ? 'var(--arsela-warning-50)' : a.tone === 'navy' ? '#E7EBF3' : 'var(--arsela-blue-50)',
                      color: a.tone === 'teal' ? 'var(--arsela-teal-600)' : a.tone === 'warn' ? '#B4740A' : a.tone === 'navy' ? 'var(--arsela-navy)' : 'var(--arsela-blue)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {a.tone === 'teal' ? <IconCheck size={16}/> : a.tone === 'warn' ? <IconInfo size={16}/> : a.tone === 'navy' ? <IconPlus size={16}/> : <IconReceipt size={16}/>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--arsela-navy)', lineHeight: 1.4 }}><b>{a.who}</b> <span style={{ color: 'var(--arsela-text-muted)' }}>{a.action}</span> {a.target}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <ArsBadge tone={a.tone === 'warn' ? 'warning' : a.tone === 'teal' ? 'teal' : 'blue'} size="sm">{a.amount}</ArsBadge>
                        <span style={{ fontSize: 11.5, color: 'var(--arsela-text-subtle)' }}>{a.when}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ArsCard>
          </div>
        </div>
      </AppFrame>
    );
  }

  Object.assign(window, { DashboardScreen });
})();
