/* Dashboard — role-aware, wired to Store (role switch re-renders live) */
(function () {
  /* FY progress — Arsela's fiscal year starts 1 July, so these now
     delegate to store.js's single source of truth (fyProgressPct /
     fyLabel / fyQuarterLabel) instead of a locally-hardcoded
     calendar-year calculation. Re-exported below (unchanged names)
     so ReportsScreen.js and other consumers keep working. */
  const FY_REFERENCE_DATE = window.Store.today();
  function fyProgressPct() { return window.Store.fyProgressPct(); }

  /* Spent-to-date vs Budget-to-date panel — reads LIVE budgets from the
     Store (not a hardcoded snapshot), so it stays in sync the moment any
     budget is created/edited/approved elsewhere in the app. "Budget to
     date" is the annual allocation prorated by how far through the
     current fiscal year (1 Jul – 30 Jun) we are; "Xero actuals to
     date" is reconciled cumulative spend only. Clicking routes to the
     Reports variance view; the delta figure itself explains whether
     spend is running ahead of or behind the time-prorated plan. */
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
          subtitle={`Time-prorated ${window.Store.fyLabel(FY_REFERENCE_DATE)} plan (${Math.round(pct * 100)}% of year elapsed) vs reconciled Xero actuals`}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Budget to date</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(budgetToDate, { compact: true })}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 3 }}>of {fmtMYR(totalAllocated, { compact: true })} annual plan</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Xero actuals to date</div>
            <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(totalSpent, { compact: true })}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 3 }}>reconciled cumulative spend (excl. commitments)</div>
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
    const defaultPeriod = window.Store.fyQuarterLabel(window.Store.today());
    const [period, setPeriod] = useState2(window.Store.getState().period || defaultPeriod);
    const ref = useRef2(null);
    useEffect2(() => window.Store.subscribe((s) => setPeriod(s.period || defaultPeriod)), []);
    useEffect2(() => {
      if (!open) return;
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [open]);
    // Arsela's FY runs 1 Jul → 30 Jun, so Q1 = Jul-Sep, Q2 = Oct-Dec,
    // Q3 = Jan-Mar, Q4 = Apr-Jun — all within the SAME fiscal year label.
    const fyNow = window.Store.fyYearOf(window.Store.today());
    const quarters = [1, 2, 3, 4].map((q) => `Q${q} FY${fyNow}`);
    // Fiscal-year month order starting July, each tagged with its real
    // calendar year so "Jan" (which falls in the back half of the FY)
    // doesn't get mislabeled against the wrong year.
    const fyMonths = [
      { m: 'Jul', y: fyNow - 1 }, { m: 'Aug', y: fyNow - 1 }, { m: 'Sep', y: fyNow - 1 },
      { m: 'Oct', y: fyNow - 1 }, { m: 'Nov', y: fyNow - 1 }, { m: 'Dec', y: fyNow - 1 },
      { m: 'Jan', y: fyNow }, { m: 'Feb', y: fyNow }, { m: 'Mar', y: fyNow },
      { m: 'Apr', y: fyNow }, { m: 'May', y: fyNow }, { m: 'Jun', y: fyNow },
    ];
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
              {fyMonths.map(({ m, y }) => (
                <button key={m} onClick={() => choose(m + ' ' + y, false)} style={{
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

  /* Rolling 12-month Budget vs Actual chart — derived from live Store
     budgets rather than a hardcoded snapshot. With no budgets yet
     (fresh install), every bar is simply 0 so the chart renders an
     honest empty grid instead of fabricated figures. The chart shows a
     flat month-by-month view of total allocated (as budget, in $M) vs
     total reconciled spend (as actual), since Coplanistra's budget
     model doesn't yet track a month-by-month plan/actual breakdown —
     until it does, every month reflects the SAME current totals rather
     than synthetic per-month variation. */
  const BudgetChart = ({ budgets }) => {
    const [hover, setHover] = React.useState(null); // { i, kind }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const totalAllocatedM = budgets.reduce((s, b) => s + (b.allocated || 0), 0) / 1e6;
    const totalSpentM = budgets.reduce((s, b) => s + (b.reconciled ? (b.spent || 0) : 0), 0) / 1e6;
    const budget = months.map(() => totalAllocatedM);
    const actual = months.map(() => totalSpentM);
    const forecast = [totalSpentM, totalAllocatedM, totalAllocatedM, totalAllocatedM, totalAllocatedM];
    const w = 660, h = 260, pad = { l: 44, r: 20, t: 20, b: 30 };
    const max = Math.max(10, totalAllocatedM * 1.3);
    const barW = 22;
    const gap = (w - pad.l - pad.r) / months.length;
    const yFor = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
    const xFor = (i) => pad.l + gap * i + gap / 2;
    const goMonth = (m) => window.Router.go('/monthly?month=' + encodeURIComponent(m));

    if (budgets.length === 0) {
      return (
        <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArsEmpty
            icon={<IconWallet size={22}/>}
            title="No budgets yet"
            body="Add a budget to see planned vs actual spend here."
            action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>}
          />
        </div>
      );
    }

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

  const DONUT_COLORS = ['#1343CB', '#00A896', '#2657DB', '#5B9EFF', '#B9CBFF', '#F59E0B', '#D64045', '#8492A6'];

  /* Category Mix donut — grouped by department from LIVE budgets
     (share of total planned allocation), not a hardcoded snapshot.
     Shows an empty state when there are no budgets to break down. */
  const CategoryDonut = ({ budgets }) => {
    const [hover, setHover] = React.useState(null);
    const totalAllocated = budgets.reduce((s, b) => s + (b.allocated || 0), 0);
    const byDept = {};
    budgets.forEach((b) => { byDept[b.dept] = (byDept[b.dept] || 0) + (b.allocated || 0); });
    const data = Object.keys(byDept).map((dept, i) => ({
      label: dept, dept,
      value: totalAllocated ? Math.round((byDept[dept] / totalAllocated) * 100) : 0,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    })).sort((a, b) => b.value - a.value);
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const cx = 90, cy = 90, r = 70, sw = 22;
    let acc = 0;
    const circ = 2 * Math.PI * r;
    const goDept = (dept) => window.Router.go(dept === 'All' ? '/budgets' : '/budgets?dept=' + encodeURIComponent(dept));

    if (budgets.length === 0) {
      return (
        <ArsEmpty
          icon={<IconWallet size={22}/>}
          title="No budgets yet"
          body="Category mix will appear once budgets are added."
          action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>}
        />
      );
    }

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
            {hover != null ? `${data[hover].value}%` : fmtMYR(totalAllocated, { compact: true })}
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
        subtitle="Utilisation by OPEX category · colour indicates budget status"
        action={
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--arsela-text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}/>Under (&lt; 80%)</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning-500)' }}/>Near (80–100%)</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }}/>Over (&gt; 100%)</span>
          </div>
        }
      />
      {categories.length === 0 ? (
        <ArsEmpty
          icon={<IconWallet size={22}/>}
          title="No OPEX categories yet"
          body="Add categories with a plan figure in Monthly Monitoring to see budget health here."
          action={<ArsButton size="sm" onClick={() => window.Router.go('/monthly')}>Go to Monthly Monitoring</ArsButton>}
        />
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 24px' }}>
        {categories.map((c) => {
          const pct = c.budget ? Math.round((c.spent / c.budget) * 100) : 0;
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
      )}
    </ArsCard>
  );

  const roleGreetings = {
    finance: { hi: 'Good morning, Priya.', sub: "Here's how your organisation is tracking against plan · Q1 reforecast cycle closes 30 September." },
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

    /* Top-line totals for the finance/admin stat-card row — computed
       LIVE from Store, not hardcoded, and each one is a distinct,
       clearly-labeled basis so they never silently conflict with one
       another (per the "standardise financial definitions" build
       rule): Total annual plan = every budget's allocation regardless
       of status; Approved active budgets = allocation for budgets
       actually in force (excludes Draft, which hasn't been approved
       yet, and Closed/Archived, which are done); Xero actuals =
       reconciled spend only; Actual + commitments = the fuller
       exposure picture including approved-but-not-yet-posted amounts. */
    const totalAnnualPlan = s.budgets.reduce((a, b) => a + (b.allocated || 0), 0);
    const activeStatuses = ['active', 'over', 'amendment'];
    const approvedActiveBudgets = s.budgets.filter((b) => activeStatuses.includes(b.status)).reduce((a, b) => a + (b.allocated || 0), 0);
    const xeroActuals = s.budgets.reduce((a, b) => a + (b.reconciled ? (b.spent || 0) : 0), 0);
    const totalCommitted = s.budgets.reduce((a, b) => a + (b.committed || 0), 0);
    const actualPlusCommitments = xeroActuals + totalCommitted;
    const burnPct = totalAnnualPlan > 0 ? (xeroActuals / totalAnnualPlan) * 100 : 0;
    // 2026-08-30 fix: this was previously the ONLY signal behind the
    // "Reconciliation status" banner below — a client who has imported
    // real Xero reports but never created a Budget entry saw "All
    // budgets reconciled to Xero" (a false positive) while a real Bank
    // Reconciliation import showed unreconciled items. Folded together
    // with the real imported Bank Reconciliation count (bankUnreconciled
    // below) so the banner can't contradict what Data Imports actually
    // holds. Client ask: "make sure everything is link and sync
    // correctly."
    const unreconciledBudgetsCount = s.budgets.filter((b) => !b.reconciled).length;
    const latestActualsThrough = s.budgets.reduce((latest, b) => (b.actualsThrough && (!latest || b.actualsThrough > latest)) ? b.actualsThrough : latest, null);
    // 2026-08-30 fix: "Budget-to-Date Variance" below used to be a
    // hardcoded fmtMYR(2_800_000) figure that never reflected any real
    // data — now computed live from the same fyProgressPct-prorated
    // basis used everywhere else in the app (Reports' Director's Report,
    // SpentVsBudgetToDate above), so it is A$0 on a fresh/no-budgets
    // Store instead of a fabricated number, and updates correctly once
    // budgets and reconciled Xero actuals exist.
    const budgetToDateNow = totalAnnualPlan * fyProgressPct();
    const varianceToDateNow = xeroActuals - budgetToDateNow;
    const varianceToDatePct = budgetToDateNow > 0 ? (varianceToDateNow / budgetToDateNow) * 100 : 0;

    // ---- 2026-08-30 fix: Dashboard "recorded in all menu/panel" gap —
    // this screen previously had ZERO awareness of anything imported
    // via Data Imports (Xero). Pulls the same generic
    // xeroReportTypes()/latestXeroImport() API used by the Director's
    // Report so Dashboard also shows real sync status + headline Xero
    // figures, not just Reports.
    const xeroTypeList = window.Store.xeroReportTypes ? window.Store.xeroReportTypes() : [];
    const xeroStatus = xeroTypeList.map((t) => ({ ...t, latest: window.Store.latestXeroImport ? window.Store.latestXeroImport(t.key) : null }));
    const xeroImportedCount = xeroStatus.filter((t) => t.latest).length;
    const xeroMissing = xeroStatus.filter((t) => !t.latest);
    const latestPL = window.Store.latestXeroImport ? window.Store.latestXeroImport('profitAndLoss') : null;
    const latestBS = window.Store.latestXeroImport ? window.Store.latestXeroImport('balanceSheet') : null;
    const latestBSum = window.Store.latestXeroImport ? window.Store.latestXeroImport('bankSummary') : null;
    const latestBR = window.Store.latestXeroImport ? window.Store.latestXeroImport('bankReconciliation') : null;
    const latestTB = window.Store.latestXeroImport ? window.Store.latestXeroImport('trialBalance') : null;
    const plTotals = latestPL && latestPL.totals ? latestPL.totals : null;
    const bsTotals = latestBS && latestBS.totals ? latestBS.totals : null;
    const bankTotals = latestBSum && latestBSum.totals ? latestBSum.totals : null;
    const brTotals = latestBR && latestBR.totals ? latestBR.totals : null;
    const tbTotals = latestTB && latestTB.totals ? latestTB.totals : null;
    const bankUnreconciled = brTotals ? brTotals.unreconciledCount : 0;
    const unreconciledCount = unreconciledBudgetsCount + bankUnreconciled;

    /* Departments · Utilisation table — grouped LIVE from Store budgets
       by department (allocated vs reconciled spend), not a hardcoded
       snapshot. Owner shown is whichever budget owner appears first for
       that department. With no budgets yet, this is simply an empty
       array and the table shows its empty state below. */
    const deptTones = ['blue', 'teal', 'warn', 'navy'];
    const departments = (() => {
      const byDept = {};
      s.budgets.forEach((b) => {
        if (!byDept[b.dept]) byDept[b.dept] = { name: b.dept, owner: b.owner, budget: 0, spent: 0 };
        byDept[b.dept].budget += (b.allocated || 0);
        byDept[b.dept].spent += (b.reconciled ? (b.spent || 0) : 0);
      });
      return Object.values(byDept).map((d, i) => ({ ...d, tone: deptTones[i % deptTones.length] }));
    })();

    /* Budget health widget — reads live OPEX categories from Store
       (Monthly Monitoring's managed list), not a hardcoded snapshot. */
    const budgetHealthData = (s.opexCategories || [])
      .filter((c) => !c.archived)
      .map((c) => ({ name: c.name, budget: c.plan || 0, spent: c.actual || 0 }));

    /* Recent Activity feed — built from the most recent real approvals
       and expenses in Store (by decidedAt / when-ago heuristics), not a
       hardcoded snapshot. Empty when there is no activity yet. */
    const activities = (() => {
      const items = [];
      s.approvals.forEach((a) => {
        if (a.status !== 'pending') {
          items.push({
            who: a.decidedBy || a.requester, action: a.status === 'approved' ? 'approved' : a.status === 'rejected' ? 'rejected' : 'requested changes on',
            target: a.title, amount: fmtMYR(a.amount, { compact: true }), when: a.decidedAt ? new Date(a.decidedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : a.when,
            tone: a.status === 'approved' ? 'teal' : a.status === 'rejected' ? 'warn' : 'blue', sortKey: a.decidedAt || '',
          });
        } else {
          items.push({ who: a.requester, action: 'submitted', target: a.title, amount: fmtMYR(a.amount, { compact: true }), when: a.when, tone: 'blue', sortKey: '' });
        }
      });
      s.expenses.forEach((e) => {
        items.push({ who: e.vendor || e.dept, action: e.approvalStatus === 'approved' ? 'expense approved for' : e.approvalStatus === 'rejected' ? 'expense rejected for' : 'submitted expense', target: e.desc, amount: fmtMYR(e.amount, { compact: true }), when: e.when, tone: e.approvalStatus === 'approved' ? 'teal' : e.approvalStatus === 'rejected' ? 'warn' : 'navy', sortKey: '' });
      });
      return items.slice(0, 4);
    })();

    const exportDashboard = () => {
      exportRowsToCSV(
        'dashboard-overview',
        ['Department', 'Owner', 'Budget (MYR)', 'Spent (MYR)', 'Remaining (MYR)', 'Utilisation %'],
        departments.map((d) => [d.name, d.owner, d.budget, d.spent, d.budget - d.spent, d.budget ? Math.round((d.spent / d.budget) * 100) : 0])
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
                {greet.sub} · <span style={{ color: 'var(--arsela-navy)', fontWeight: 600 }}>{FY_REFERENCE_DATE.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <ArsLiveDot label="Live · updated 2 min ago"/>
          </div>

          {role !== 'employee' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', marginBottom: 20,
              borderRadius: 10, background: unreconciledCount === 0 ? 'var(--arsela-teal-50)' : 'var(--arsela-warning-50)',
              border: '1px solid ' + (unreconciledCount === 0 ? 'var(--arsela-teal-200, #BFEFE8)' : 'var(--arsela-warning-200, #F3DBA3)'),
              cursor: 'pointer',
            }} onClick={() => window.Router.go('/reconciliations')} title="Click to open the Reconciliations module">
              <span style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: unreconciledCount === 0 ? '#fff' : '#fff', color: unreconciledCount === 0 ? 'var(--arsela-teal-600)' : '#B4740A',
              }}><IconInfo size={16}/></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>
                  Reconciliation status: {unreconciledCount === 0 ? 'All reconciled' : [
                    unreconciledBudgetsCount ? `${unreconciledBudgetsCount} budget${unreconciledBudgetsCount === 1 ? '' : 's'}` : null,
                    bankUnreconciled ? `${bankUnreconciled} bank item${bankUnreconciled === 1 ? '' : 's'}` : null,
                  ].filter(Boolean).join(' + ') + ' pending reconciliation'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
                  Actuals imported from {s.budgets[0]?.actualSource || 'Xero'} through {latestActualsThrough || '—'}{latestBR ? ` · bank checked as at ${latestBR.period}` : ''} · figures marked "Live" reflect Xero data as at this date, not real-time.
                </div>
              </div>
              <ArsBadge tone={unreconciledCount === 0 ? 'success' : 'warning'} dot size="sm">{unreconciledCount === 0 ? 'Reconciled' : 'Review needed'}</ArsBadge>
            </div>
          )}

          {/* ---- 2026-08-30 fix (client ask: "make sure dashboard and
              director report is updated and sync based on my xero
              import"): Dashboard previously had zero visibility into
              what has been imported via Data Imports — this banner
              mirrors the one already on the Director's Report so both
              screens stay in sync with the same underlying data and a
              user landing on Dashboard first can immediately see
              whether their Xero import is reflected. ---- */}
          {role !== 'employee' && (
            <div onClick={() => window.Router.go('/dataimports')} title="Click to open Data Imports" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', marginBottom: 20,
              background: xeroImportedCount === xeroTypeList.length ? 'var(--arsela-success-50)' : '#EEF3FF',
              border: '1px solid ' + (xeroImportedCount === xeroTypeList.length ? 'var(--arsela-success)' : '#D6E1FF'),
            }}>
              <ArsBadge tone={xeroImportedCount === xeroTypeList.length ? 'success' : 'neutral'} dot size="sm">Xero sync</ArsBadge>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>
                  {xeroImportedCount} of {xeroTypeList.length} Xero report types imported
                </div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
                  {xeroMissing.length === 0
                    ? 'Every Xero report type has been imported at least once — see the full Director\'s Report for detail.'
                    : `Not yet imported: ${xeroMissing.map((t) => t.label).join(', ')}. Click to import from Data Imports.`}
                </div>
              </div>
              <ArsButton size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); window.Router.go('/reports'); }}>Director's Report →</ArsButton>
            </div>
          )}

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
                <StatCard label={`Total Annual Plan · ${window.Store.fyLabel(FY_REFERENCE_DATE)}`} value={fmtMYR(totalAnnualPlan, { compact: true })} delta="All budgets, any status" deltaTone="blue" sub={`${fmtMYR(approvedActiveBudgets, { compact: true })} in approved active budgets`} icon={<IconWallet size={17}/>} tone="blue" title="Click to view all budgets" onClick={() => window.Router.go('/budgets')}/>
                <StatCard label="Xero Actuals (Reconciled)" value={fmtMYR(xeroActuals, { compact: true })} delta={`${burnPct.toFixed(1)}% of plan`} deltaTone="teal" sub={latestActualsThrough ? `through ${latestActualsThrough}` : 'no actuals imported'} icon={<IconTrend size={17}/>} tone="teal" title="Click to view budgets by spend" onClick={() => window.Router.go('/budgets?status=active')}/>
                <StatCard label="Actual + Commitments" value={fmtMYR(actualPlusCommitments, { compact: true })} delta={`+${fmtMYR(totalCommitted, { compact: true })} committed`} deltaTone="navy" sub="reconciled actuals + open POs" icon={<IconFile size={17}/>} tone="navy" title="Click to view CAPEX & commitments" onClick={() => window.Router.go('/capex')}/>
                <StatCard label="Budget-to-Date Variance" value={`${varianceToDateNow >= 0 ? '+' : '−'}${fmtMYR(Math.abs(varianceToDateNow), { compact: true })}`} delta={budgetToDateNow > 0 ? `${varianceToDateNow >= 0 ? '▲' : '▼'} ${Math.abs(varianceToDatePct).toFixed(1)}% ${varianceToDateNow >= 0 ? 'over' : 'under'}` : 'no budgets yet'} deltaTone={varianceToDateNow > 0 ? 'warning' : 'success'} sub="reconciled actuals vs time-prorated plan" icon={<IconArrowUp size={17}/>} tone="warn" title="Click to view variance report" onClick={() => window.Router.go('/reports')}/>
              </>
            )}
          </div>

          {role !== 'employee' && (
            <div style={{ marginBottom: 20 }}>
              <SpentVsBudgetToDate budgets={s.budgets}/>
            </div>
          )}

          {/* ---- Xero snapshot (client ask, 2026-08-30): headline
              figures straight from the latest Xero imports, so a
              director scanning ONLY the Dashboard (not the full
              Director's Report) still sees real revenue/cash/solvency/
              control-check figures the moment something is imported —
              same underlying data/API as ReportsScreen.js's Director's
              Report, just condensed to 4 tiles. Honest empty state per
              tile until each report type has been imported at least
              once. ---- */}
          {role !== 'employee' && (
            <ArsCard style={{ marginBottom: 20 }}>
              <ArsSectionHeader title="Xero snapshot" subtitle="Headline figures from the latest imports · full detail in the Director's Report"/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 14 }} title="Click to import or review Profit &amp; Loss">
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Revenue (YTD)</div>
                  {plTotals ? (
                    <>
                      <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)', marginTop: 6 }}>{fmtMYR(plTotals.totalRevenueYTD, { compact: true })}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{latestPL.period}</div>
                    </>
                  ) : <div style={{ marginTop: 6 }}><ArsBadge tone="neutral" size="sm">Not imported</ArsBadge></div>}
                </div>
                <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 14 }} title="Click to import or review the Bank Summary">
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Bank balance</div>
                  {bankTotals ? (
                    <>
                      <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(bankTotals.totalClosing, { compact: true })}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{latestBSum.period}</div>
                    </>
                  ) : <div style={{ marginTop: 6 }}><ArsBadge tone="neutral" size="sm">Not imported</ArsBadge></div>}
                </div>
                <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 14 }} title="Click to import or review the Balance Sheet">
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Solvency</div>
                  {bsTotals ? (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 700, color: bsTotals.totalAssets >= bsTotals.totalLiabilities ? 'var(--success)' : 'var(--danger)', marginTop: 6 }}>{bsTotals.totalAssets >= bsTotals.totalLiabilities ? 'Solvent' : 'Insolvent'}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{latestBS.period}</div>
                    </>
                  ) : <div style={{ marginTop: 6 }}><ArsBadge tone="neutral" size="sm">Not imported</ArsBadge></div>}
                </div>
                <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 14 }} title="Click to import or review the Trial Balance">
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Trial Balance</div>
                  {tbTotals ? (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 700, color: tbTotals.balanced ? 'var(--success)' : 'var(--danger)', marginTop: 6 }}>{tbTotals.balanced ? 'Balanced' : 'Out of balance'}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{latestTB.period}</div>
                    </>
                  ) : <div style={{ marginTop: 6 }}><ArsBadge tone="neutral" size="sm">Not imported</ArsBadge></div>}
                </div>
              </div>
            </ArsCard>
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
              <BudgetChart budgets={s.budgets}/>
            </ArsCard>
            <ArsCard>
              <ArsSectionHeader title="Category Mix" subtitle={`Share of planned ${window.Store.fyLabel(FY_REFERENCE_DATE)}`} action={<IconMore size={16} style={{ color: 'var(--arsela-text-subtle)', cursor: 'pointer' }} onClick={() => window.Store.toast('Category breakdown exported', 'info')}/>}/>
              <CategoryDonut budgets={s.budgets}/>
            </ArsCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <ArsCard padded={false}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Departments · Utilisation</div>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Spend to date vs allocated {window.Store.fyLabel(FY_REFERENCE_DATE)} budget</div>
                </div>
                <a style={{ fontSize: 12, color: 'var(--arsela-blue)', fontWeight: 600, cursor: 'pointer' }} onClick={() => window.Router.go('/budgets')}>View all →</a>
              </div>
              {departments.length === 0 ? (
                <div style={{ padding: '32px 20px' }}>
                  <ArsEmpty icon={<IconWallet size={22}/>} title="No budgets yet" body="Departments will appear here once budgets are added." action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>}/>
                </div>
              ) : (
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
                    const pct = d.budget ? Math.round((d.spent / d.budget) * 100) : 0;
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
              )}
            </ArsCard>

            <ArsCard padded={false}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Recent Activity</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Approvals, submissions & alerts</div>
              </div>
              {activities.length === 0 ? (
                <div style={{ padding: '32px 20px' }}>
                  <ArsEmpty icon={<IconInfo size={22}/>} title="No activity yet" body="Approvals and expense actions will show up here."/>
                </div>
              ) : (
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
              )}
            </ArsCard>
          </div>
        </div>
      </AppFrame>
    );
  }

  Object.assign(window, { DashboardScreen, FY_REFERENCE_DATE, fyProgressPct });
})();
