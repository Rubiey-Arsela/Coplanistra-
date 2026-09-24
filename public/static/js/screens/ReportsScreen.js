/* Reports & Analytics */
(function () {

  const VarianceBar = ({ label, planned, actual, onClick }) => {
    const variance = actual - planned;
    const pct = planned ? ((variance/planned)*100).toFixed(1) : '0.0';
    const over = variance > 0;
    const maxSpan = 40;
    const barPct = Math.min(maxSpan, Math.abs(parseFloat(pct)));
    return (
      <div onClick={onClick} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', gap: 12, alignItems: 'center', padding: '8px 0', cursor: onClick ? 'pointer' : 'default' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ position: 'relative', height: 18 }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--arsela-border-strong)' }}/>
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: over ? '50%' : `${50 - barPct}%`,
            width: `${barPct}%`,
            background: over ? 'linear-gradient(90deg, #EF4444, #F87171)' : 'linear-gradient(90deg, #16A34A, #22C55E)',
            borderRadius: 4,
          }}/>
        </div>
        <div className="arsela-num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: over ? 'var(--arsela-danger)' : 'var(--arsela-success)' }}>
          {over ? '+' : ''}{pct}%
        </div>
      </div>
    );
  };

  const TrendChart = ({ budgets }) => {
    const w = 660, h = 220, pad = { l: 44, r: 20, t: 20, b: 30 };
    const labels = (() => {
      const all = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
      const idx = all.indexOf(window.Store.today().toLocaleDateString('en-AU', { month: 'short' }));
      const end = idx === -1 ? all.length - 1 : idx;
      const start = Math.max(0, end - 6);
      return all.slice(start, end + 1);
    })();
    if (!budgets || budgets.length === 0) {
      return (
        <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArsEmpty icon={<IconChart size={22}/>} title="No spend data yet" body="Add budgets to see the actual vs forecast trend here." action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>}/>
        </div>
      );
    }
    // No month-by-month history exists in the data model yet, so the
    // trend is shown as a flat line at the current live total — it will
    // start showing real month-to-month movement once actuals accrue
    // across multiple periods.
    const totalAllocatedM = budgets.reduce((a, b) => a + (b.allocated || 0), 0) / 1e6;
    const totalSpentM = budgets.reduce((a, b) => a + (b.reconciled ? (b.spent || 0) : 0), 0) / 1e6;
    const totalForecastM = budgets.reduce((a, b) => a + (b.forecastFinal || b.spent || 0), 0) / 1e6;
    const s1 = labels.map(() => totalSpentM);
    const s2 = labels.map(() => totalForecastM || totalAllocatedM);
    const max = Math.max(10, Math.max(totalAllocatedM, totalForecastM, totalSpentM) * 1.3);
    const ticks = [0, max / 3, (max * 2) / 3, max];
    const xFor = i => pad.l + (w - pad.l - pad.r) * (i / (labels.length - 1));
    const yFor = v => pad.t + (h - pad.t - pad.b) * (1 - v/max);
    const line = pts => pts.map((v,i)=>`${i===0?'M':'L'} ${xFor(i)} ${yFor(v)}`).join(' ');
    const area = pts => `M ${xFor(0)} ${yFor(0)} ${pts.map((v,i)=>`L ${xFor(i)} ${yFor(v)}`).join(' ')} L ${xFor(pts.length-1)} ${yFor(0)} Z`;
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="tealArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#00A896" stopOpacity="0.22"/><stop offset="1" stopColor="#00A896" stopOpacity="0"/></linearGradient>
          <linearGradient id="blueArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1343CB" stopOpacity="0.22"/><stop offset="1" stopColor="#1343CB" stopOpacity="0"/></linearGradient>
        </defs>
        {ticks.map(v=>(
          <g key={v}>
            <line x1={pad.l} x2={w-pad.r} y1={yFor(v)} y2={yFor(v)} stroke="#EEF1F6"/>
            <text x={pad.l-8} y={yFor(v)+4} fontSize="10" fill="#8492A6" textAnchor="end" fontWeight="600">{curLabel(v)}</text>
          </g>
        ))}
        <path d={area(s1)} fill="url(#blueArea)"/>
        <path d={line(s1)} stroke="#1343CB" strokeWidth="2.4" fill="none"/>
        <path d={line(s2)} stroke="#00A896" strokeWidth="2.4" fill="none" strokeDasharray="0"/>
        {s1.map((v,i)=><circle key={i} cx={xFor(i)} cy={yFor(v)} r="3.5" fill="#fff" stroke="#1343CB" strokeWidth="2"/>)}
        {s2.map((v,i)=><circle key={i} cx={xFor(i)} cy={yFor(v)} r="3.5" fill="#fff" stroke="#00A896" strokeWidth="2"/>)}
        {labels.map((m,i)=><text key={i} x={xFor(i)} y={h-10} fontSize="10.5" fill="#5B6B82" textAnchor="middle" fontWeight="600">{m}</text>)}
      </svg>
    );
  };

  const HeatmapCell = ({ v, onClick }) => {
    const c = v >= 100 ? '#EF4444' : v >= 90 ? '#F59E0B' : v >= 75 ? '#5B9EFF' : v >= 50 ? '#B9CBFF' : '#EEF1F6';
    const fg = v >= 75 ? '#fff' : v >= 50 ? '#001F3D' : '#8492A6';
    return (
      <div onClick={onClick} style={{
        background: c, color: fg, height: 34, borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11.5, fontWeight: 700, cursor: onClick ? 'pointer' : 'default',
      }}>{v}%</div>
    );
  };

  /* ---- Task #14/#15 shared helpers (client ask, 2026-09-21): "import 1
     year details or ranging 4 months... organise the numbers by months
     and years and make comparisons" + the 5-page structured Director's
     Report PDF spec. All pure functions of window.Store, so they can be
     called from both the on-screen comparison table and the PDF export
     without duplicating logic. ---- */

  /** ---- Director feedback 2026-09-24, Item 2 (Critical): "The page is
   *  labelled September, but figures come from July or August, and the
   *  bank reconciliation is dated 22 July... Put an 'as at' date beside
   *  every figure. Do not show old figures as September results."
   *  Root cause: xero(type)/xeroImportForMonth already returns
   *  isExactMonth (true/false) per report type, but the ONLY place that
   *  was ever surfaced was one aggregate "some figures carried forward"
   *  banner — a director looking at any single number (e.g. the bank
   *  balance tile) had no way to tell whether THAT figure was actually
   *  September's or a stale carry-forward. asAtLabel(rec) returns a
   *  short, always-present string ("as at Sept 2026" or "as at Aug 2026
   *  — carried forward, no Sept import on file") to render directly next
   *  to every Xero-backed figure, both on-screen and in the PDF. */
  function asAtLabel(rec) {
    if (!rec) return null;
    const period = rec.period || 'unknown date';
    return rec.isExactMonth === false ? `as at ${period} — carried forward` : `as at ${period}`;
  }
  /** Short inline badge-style tone for asAtLabel — 'warning' whenever
   *  the figure is a carried-forward (non-exact-month) snapshot, so a
   *  stale figure is visually flagged everywhere it appears, not just
   *  inside the one aggregate banner. */
  function asAtTone(rec) {
    return (rec && rec.isExactMonth === false) ? 'var(--arsela-warning, #B4740A)' : 'var(--arsela-text-muted)';
  }

  /** "YYYY-07" for the first month of the fiscal year containing
   *  `monthKey` ("YYYY-MM") — Arsela's FY starts 1 July, via the single
   *  source of truth window.Store.fyStartDate (never hardcoded here). */
  function fyStartKeyForMonthKey(monthKey) {
    if (!monthKey) return null;
    const [y, m] = monthKey.split('-').map(Number);
    if (!y || !m) return null;
    const fyStart = window.Store.fyStartDate(new Date(y, m - 1, 1));
    return `${fyStart.getFullYear()}-07`;
  }
  /** Every month (ascending, oldest first) that has an EXACT Xero import
   *  snapshot for `type` — deliberately excludes carried-forward months
   *  (xeroImportForMonth's isExactMonth: false) so a comparison table
   *  never repeats the same figure across several months just because
   *  only one of them was actually imported. */
  function exactMonthlySeries(type) {
    const months = window.Store.xeroImportMonths ? window.Store.xeroImportMonths() : [];
    const asc = [...months].sort((a, b) => a.key.localeCompare(b.key));
    return asc.map((m) => {
      const rec = window.Store.xeroImportForMonth(type, m.key);
      return (rec && rec.isExactMonth) ? { key: m.key, label: m.label, rec } : null;
    }).filter(Boolean);
  }
  /** Subset of exactMonthlySeries scoped to the current fiscal year, from
   *  July through the selected `monthKey` — feeds Page 3 of the 5-page
   *  Director's Report PDF ("Monthly period comparisons... starting
   *  from July"). */
  function fyMonthlySeries(type, monthKey) {
    const fyStartKey = fyStartKeyForMonthKey(monthKey);
    if (!fyStartKey) return [];
    return exactMonthlySeries(type).filter((m) => m.key >= fyStartKey && (!monthKey || m.key <= monthKey));
  }
  /** Builds a two-column (this-period vs comparison-period) account-level
   *  statement table for P&L/Balance Sheet-shaped schemas: groups rows by
   *  `classifications` (in the given order) with a bold section header
   *  and a bold subtotal row per group, matching prior-period rows by
   *  account name. Returns { rows, boldIdx } ready for jsPDF-autoTable's
   *  body + didParseCell bolding. Used by both Page 2 (P&L) and Page 5
   *  (Balance Sheet) of the structured PDF. */
  function buildStatementRows(curRec, priorRec, classifications, valueField) {
    const curRows = (curRec && curRec.rows) || [];
    const priorRows = (priorRec && priorRec.rows) || [];
    const priorByKey = {};
    priorRows.forEach((r) => { priorByKey[(r.account || '').trim().toLowerCase()] = r; });
    const rows = [];
    const boldIdx = [];
    classifications.forEach((cls) => {
      const rowsForCls = curRows.filter((r) => r.classification === cls);
      if (!rowsForCls.length) return;
      boldIdx.push(rows.length);
      rows.push({ account: cls.toUpperCase(), current: null, prior: null, isHeader: true });
      let curSum = 0, priorSum = 0, anyPrior = false;
      rowsForCls.forEach((r) => {
        const p = priorByKey[(r.account || '').trim().toLowerCase()];
        const curVal = Number(r[valueField]) || 0;
        const priorVal = p ? (Number(p[valueField]) || 0) : null;
        curSum += curVal;
        if (priorVal != null) { priorSum += priorVal; anyPrior = true; }
        rows.push({ account: '   ' + r.account, current: curVal, prior: priorVal });
      });
      boldIdx.push(rows.length);
      rows.push({ account: `Total ${cls}`, current: curSum, prior: anyPrior ? priorSum : null });
    });
    return { rows, boldIdx };
  }

  /** ---- Director feedback 2026-09-24, Item 6 (High): "'Enough to cover
   *  our expenses? Yes' appears to rely on the A$30.8K July bank
   *  balance... Compare current cash plus confirmed funding against
   *  dated upcoming payroll, super, tax and other payments. Show the
   *  funding gap and the date cash runs short."
   *
   *  Root cause: the old `canCoverExpenses` was a single point-in-time
   *  snapshot comparison (cash > 0, or AR+cash >= AP) with no dates and
   *  no forward projection — it could be "Yes" purely because a bank
   *  balance imported weeks ago happened to be positive that day, with
   *  no visibility into payroll/super/tax due before the NEXT bank
   *  import. This builds a real week-by-week cash projection over the
   *  next ~13 weeks from: opening cash (latest Bank Summary), confirmed
   *  funding (Aged Receivables + any known financing inflow), and DATED
   *  committed outflows (payroll/super drawn from the latest P&L's
   *  monthly run-rate, spread across paydates + Aged Payables due
   *  dates when available). Returns null (not answerable) only when
   *  there's no cash figure to start from at all. */
  function buildFundingGapProjection({ latestBSum, latestPL, latestAP, latestAR, reportMonthDate }) {
    const openingCash = latestBSum && latestBSum.totals ? latestBSum.totals.totalClosing : null;
    if (openingCash == null) return null;
    const asOfDate = latestBSum && latestBSum.period ? latestBSum.period : null;
    const wagesLine = latestPL ? (latestPL.rows || []).find((r) => /wages|salaries/i.test(r.account || '')) : null;
    const superLine = latestPL ? (latestPL.rows || []).find((r) => /superannuation/i.test(r.account || '')) : null;
    const monthlyWages = wagesLine ? Number(wagesLine.ytd) || 0 : 0;
    const monthlySuper = superLine ? Number(superLine.ytd) || 0 : 0;
    // Weekly committed outflow — payroll is typically weekly/fortnightly
    // in practice, but the only figure this app actually holds is a
    // MONTHLY P&L line, so it is spread evenly across ~4.33 weeks/month.
    // This is explicitly labelled as an estimate, never presented as a
    // real payroll-system schedule.
    const weeklyPayroll = monthlyWages / 4.33;
    const weeklySuper = monthlySuper / 4.33;
    // Aged Payables (confirmed amount already owed, not yet paid) is
    // due IMMEDIATELY (week 0) rather than spread — it's a real,
    // already-incurred obligation, not a run-rate estimate.
    const apDueNow = latestAP && latestAP.totals ? (latestAP.totals.totalOutstanding || 0) : 0;
    // Confirmed funding: Aged Receivables (money owed TO Arsela,
    // expected to convert to cash) — spread evenly across the ~13-week
    // window as a simple assumption, clearly labelled.
    const arExpected = latestAR && latestAR.totals ? (latestAR.totals.totalOutstanding || 0) : 0;
    const weeklyReceipts = arExpected / 13;
    const weeks = [];
    let running = openingCash;
    let lowPointWeek = 0, lowPoint = openingCash, shortfallWeek = null;
    for (let w = 1; w <= 13; w++) {
      const outflow = weeklyPayroll + weeklySuper + (w === 1 ? apDueNow : 0);
      const inflow = weeklyReceipts;
      running = running + inflow - outflow;
      weeks.push({ week: w, cash: running, outflow, inflow });
      if (running < lowPoint) { lowPoint = running; lowPointWeek = w; }
      if (running < 0 && shortfallWeek == null) shortfallWeek = w;
    }
    const weekDate = (w) => {
      const base = reportMonthDate ? new Date(reportMonthDate) : new Date();
      const d = new Date(base);
      d.setDate(d.getDate() + w * 7);
      return d;
    };
    const fmtWeekDate = (w) => weekDate(w).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      openingCash, asOfDate, weeks,
      lowPoint, lowPointDate: fmtWeekDate(lowPointWeek), lowPointWeek,
      shortfallDate: shortfallWeek != null ? fmtWeekDate(shortfallWeek) : null, shortfallWeek,
      weeklyPayroll, weeklySuper, apDueNow, weeklyReceipts,
      hasPayrollData: monthlyWages > 0 || monthlySuper > 0,
      hasFundingInputs: latestPL != null,
    };
  }

  /** ---- Month-by-month comparison (client ask, 2026-09-21): "organise
   *  the numbers by months and years and make comparisons as well" — a
   *  standalone card on the Director's Report screen showing every month
   *  that has an exact Xero import on file for Profit & Loss and Balance
   *  Sheet, side by side, oldest to newest. Independent of the month
   *  picker (it always shows every available month, not just the one
   *  currently selected) so a director can see the trend at a glance. ---- */
  const MonthlyTrendSection = () => {
    const plSeries = exactMonthlySeries('profitAndLoss');
    const bsSeries = exactMonthlySeries('balanceSheet');
    const plMetrics = [
      ['Revenue', (t) => t.totalRevenueYTD || 0, false],
      ['Cost of Sales', (t) => t.totalCostOfSalesYTD || 0, false],
      ['Gross Profit', (t) => t.grossProfitYTD || 0, true],
      ['Total Expenses', (t) => t.totalExpenseYTD || 0, false],
      ['Net Profit / (Loss)', (t) => t.netProfitYTD || 0, true],
    ];
    const bsMetrics = [
      ['Total Assets', (t) => t.totalAssets || 0, false],
      ['Total Liabilities', (t) => t.totalLiabilities || 0, false],
      ['Total Equity', (t) => t.totalEquity || 0, false],
      ['Working Capital', (t) => t.workingCapital || 0, true],
    ];
    const renderTable = (series, metrics, emptyBody) => {
      if (series.length < 2) {
        return (
          <ArsEmpty icon={<IconTrend size={20}/>} title="Not enough months to compare yet" body={emptyBody}
            action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/dataimports')}>Import a report</ArsButton>}
          />
        );
      }
      return (
        <div className="coplan-scrollx">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 480 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--arsela-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                <th style={{ padding: '8px 12px' }}>Metric</th>
                {series.map((m) => <th key={m.key} style={{ padding: '8px 12px', textAlign: 'right' }}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {metrics.map(([label, fn, bold]) => (
                <tr key={label} style={{ borderTop: '1px solid var(--arsela-border)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: bold ? 700 : 500, color: 'var(--arsela-navy)' }}>{label}</td>
                  {series.map((m) => {
                    const v = fn(m.rec.totals || {});
                    return <td key={m.key} className="arsela-num" style={{ padding: '8px 12px', textAlign: 'right', fontWeight: bold ? 700 : 500, color: bold && v < 0 ? 'var(--danger)' : 'var(--arsela-navy)' }}>{fmtAUD(v, { compact: true })}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };
    return (
      <ArsCard style={{ marginBottom: 20 }}>
        <ArsSectionHeader title="Month-by-month comparison" subtitle={'Every month with an exact Xero import on file, oldest to newest ' + '\u2014' + ' import a multi-month export from Data Imports to fill in more months'}/>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 8 }}>Profit &amp; Loss</div>
          {renderTable(plSeries, plMetrics, 'Import Profit & Loss for at least two different months (or a Xero "compare with previous periods" export) to see a trend here.')}
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 8 }}>Balance Sheet</div>
          {renderTable(bsSeries, bsMetrics, 'Import a Balance Sheet for at least two different months to see a trend here.')}
        </div>
      </ArsCard>
    );
  };

  /* ---- Monthly Director's Report — pulls live figures straight out of
     window.Store (budgets, approvals, expenses, CAPEX, cash flow) into a
     single-page executive summary. "Export PDF" renders it with jsPDF +
     autoTable client-side (no backend — Cloudflare Pages is static),
     "Export CSV" uses the same exportRowsToCSV pattern as every other
     screen. This is a real, data-driven report, not a static template. ---- */
  const DirectorsReportScreen = ({ s, monthKey }) => {
    // Holds { url, fileName } for the in-app Management Accounts PDF
    // preview (see exportManagementAccountsPDF below) — null when no
    // preview is open. The director must be able to view the report
    // before it ever downloads to disk.
    const [mgmtPdfPreview, setMgmtPdfPreview] = React.useState(null);
    // ---- Client ask (2026-09-21): "director report - should be able to
    // select by month". Every Xero-import-backed figure in this report
    // (the three questions, Xero control checks, ledger activity) is
    // pulled through `xero(type)` below instead of calling
    // window.Store.latestXeroImport(type) directly, so the WHOLE report
    // can be pointed at any month that has Xero data via the month
    // picker in the parent ReportsScreen's top bar. When `monthKey` is
    // the current/latest month (the default) this behaves exactly as
    // before. When an EXACT snapshot for the selected month doesn't
    // exist, the most recent PRIOR snapshot is carried forward
    // (isExactMonth: false) — same convention Xero itself uses for a
    // month with no new close — and the UI below flags this so a
    // director never mistakes a carried-forward figure for a fresh one.
    // NOTE: budgets/approvals/CAPEX/cash-flow-scenario sections further
    // down are intentionally NOT month-filtered — the Budgets module
    // has no per-month history in its data model (it tracks a single
    // live "as of now" position per line), so those sections always
    // show the current live position regardless of the month selected.
    const xero = (type) => (window.Store.xeroImportForMonth ? window.Store.xeroImportForMonth(type, monthKey) : (window.Store.latestXeroImport ? window.Store.latestXeroImport(type) : null));
    const budgets = s.budgets || [];
    const approvals = s.approvals || [];
    const expenses = s.expenses || [];
    const capexProjects = s.capexProjects || [];
    const cashFlowScenarios = s.cashFlowScenarios || [];
    const activeScenario = cashFlowScenarios.find((sc) => sc.active) || {};

    const totalAllocated = budgets.reduce((a, b) => a + (b.allocated || 0), 0);
    // "Spent" here is deliberately RECONCILED Xero actuals only, per the
    // build rule: "Only reconciled Xero amounts are classified as
    // actuals." Committed (approved-but-unposted) is tracked separately
    // so the two bases are never silently combined.
    const totalSpent = budgets.reduce((a, b) => a + (b.reconciled ? (b.spent || 0) : 0), 0);
    const totalCommitted = budgets.reduce((a, b) => a + (b.committed || 0), 0);
    const totalForecastFinal = budgets.reduce((a, b) => a + (b.forecastFinal || b.spent || 0), 0);
    const burnPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
    const fyPct = window.Store.fyProgressPct();
    const budgetToDate = totalAllocated * fyPct;
    const varianceToDate = totalSpent - budgetToDate;
    const unreconciledBudgets = budgets.filter((b) => !b.reconciled);
    const latestActualsThrough = budgets.reduce((latest, b) => (b.actualsThrough && (!latest || b.actualsThrough > latest)) ? b.actualsThrough : latest, null);

    // ---- 2026-08-30 fix: `unreconciledBudgets`/`latestActualsThrough`
    // above are purely INTERNAL-BUDGET-MODULE signals — a client who
    // has imported real Xero reports but never created a Budget entry
    // sees "0 of 0 pending" here while the Bank Reconciliation control
    // check further down correctly shows real unreconciled items. That
    // is a genuine sync gap the client flagged ("make sure everything
    // is link and sync correctly"), so the preliminary banner and the
    // Executive Summary's reconciliation tile below now ALSO fold in
    // the real imported Bank Reconciliation figure (computed from
    // `latestBR`/`brTotals`, declared further below) so the two never
    // contradict each other. Declared here as `let` and assigned after
    // `brTotals` exists.
    const overBudget = budgets.filter((b) => b.status === 'over');
    const pendingApprovals = approvals.filter((a) => a.status === 'pending');
    const urgentApprovals = pendingApprovals.filter((a) => a.urgent);
    const pendingApprovalValue = pendingApprovals.reduce((a, b) => a + b.amount, 0);
    const pendingExpenses = expenses.filter((e) => e.status === 'pending');
    // Unposted expenses: approved by a manager but not yet posted in Xero
    // (so not in "Spent" above) — a data-limitation the report must flag.
    const unpostedExpenses = expenses.filter((e) => e.approvalStatus === 'approved' && e.xeroStatus !== 'posted');

    // CAPEX exposure — `committed` is the total contracted value and
    // ALREADY INCLUDES `spent` (see store.js seedCapex comment), so total
    // exposure against approval is `committed`, never committed + spent.
    const capexApproved = capexProjects.reduce((a, c) => a + c.approved, 0);
    const capexCommitted = capexProjects.reduce((a, c) => a + c.committed, 0);
    const capexSpent = capexProjects.reduce((a, c) => a + (c.paidActuals != null ? c.paidActuals : c.spent), 0);

    // ---- Client ask (2026-08-19): the Director's Report must explicitly
    // and clearly answer three questions using REAL imported Xero data
    // where available, not the budget/CAPEX proxy alone:
    //   1. Where's the money coming from (revenue/funding sources)
    //   2. Do we have enough to cover our expenses (liquidity/coverage)
    //   3. Are we solvent (assets vs liabilities)
    // Each pulls from the latest Xero Data Imports snapshot for its
    // report type and shows an honest empty state until that report has
    // been imported at least once — no fabricated numbers.
    const latestPL = xero('profitAndLoss');
    const latestBS = xero('balanceSheet');
    const latestAR = xero('agedReceivables');
    const latestAP = xero('agedPayables');
    const latestCFA = xero('cashFlowActuals');
    // ---- 2026-08-26 fix: the report above only ever read 5 of the 10
    // Xero report types the Data Imports hub actually supports, so
    // anything imported as Account Transactions / Bank Summary / Bank
    // Reconciliation / General Ledger / Trial Balance never showed up
    // anywhere outside the hub itself — the direct cause of "why isn't
    // my import reflected in the Director's Report". These five extra
    // pulls, plus the completeness banner and activity cards further
    // below, close that gap so every imported Xero report is surfaced
    // here automatically, with no re-entry required.
    const latestAT = xero('accountTransactions');
    const latestBSum = xero('bankSummary');
    const latestBR = xero('bankReconciliation');
    const latestGL = xero('generalLedger');
    const latestTB = xero('trialBalance');
    // Item 7 (director feedback, 2026-09-24): Arsela is funded by
    // shareholder/group loans, not trading revenue, so it has no
    // customer/supplier ledger balances — Aged Receivables/Payables
    // will legitimately NEVER be imported. When flagged as a cost
    // centre, those two report types are excluded from the "missing
    // Xero imports" completeness banner entirely (so the app stops
    // repeatedly asking for them) and every AR/AP figure below renders
    // "Not applicable" instead of "Not imported" wherever it's shown.
    const isCostCentre = window.Store.isCostCentre ? window.Store.isCostCentre() : false;
    const arApNotApplicableLabel = 'Not applicable (cost centre)';
    const xeroTypeList = (window.Store.xeroReportTypes ? window.Store.xeroReportTypes() : [])
      .filter((t) => !(isCostCentre && (t.key === 'agedReceivables' || t.key === 'agedPayables')));
    const xeroStatus = xeroTypeList.map((t) => ({ ...t, latest: xero(t.key) }));
    // True if ANY Xero-backed figure shown above was carried forward
    // from a prior month rather than being an exact match for the
    // selected month — drives the "carried forward" banner in the JSX.
    const anyCarriedForward = [latestPL, latestBS, latestAR, latestAP, latestCFA, latestAT, latestBSum, latestBR, latestGL, latestTB]
      .some((rec) => rec && rec.isExactMonth === false);
    const xeroImportedCount = xeroStatus.filter((t) => t.latest).length;
    const xeroMissing = xeroStatus.filter((t) => !t.latest);
    // Real bank cash position (Bank Summary) — when available this
    // REPLACES the budget-derived cash-flow-model proxy for "cash on
    // hand" in Q2 below, since it is the client's actual Xero bank
    // balance rather than a forecast.
    const bankTotalClosing = latestBSum && latestBSum.totals ? latestBSum.totals.totalClosing : null;
    const hasBankSummary = bankTotalClosing != null;
    // Trial Balance control check — surfaced next to Q3 (solvency) as an
    // independent cross-check that ApexFin's figures agree with Xero.
    const tbTotals = latestTB && latestTB.totals ? latestTB.totals : null;
    // Bank Reconciliation status — already shown on the Reconciliations
    // screen; repeated here so the Director's Report doesn't require a
    // separate visit to confirm the bank account itself reconciles.
    const brTotals = latestBR && latestBR.totals ? latestBR.totals : null;
    // General Ledger / Account Transactions activity — prefer General
    // Ledger (fuller export) but fall back to Account Transactions so
    // the card still populates if only one of the two was imported.
    const ledgerSource = latestGL || latestAT;
    const ledgerTotals = ledgerSource && ledgerSource.totals ? ledgerSource.totals : null;
    const ledgerLabel = latestGL ? 'General Ledger' : latestAT ? 'Account Transactions' : null;

    // ---- 2026-08-30 fix: combined reconciliation status — folds the
    // internal Budgets-module reconciliation flag together with the
    // REAL imported Bank Reconciliation unreconciled-item count, so the
    // preliminary/reconciled banner at the top of this report and the
    // "Reconciliation status" tile in the Executive Summary never say
    // "0 pending" while the Xero control check further down correctly
    // shows real unreconciled bank items. Either source alone can now
    // drive the "still pending" state, and the sublabel says which.
    const bankUnreconciledCount = brTotals ? brTotals.unreconciledCount : 0;
    const combinedPendingCount = unreconciledBudgets.length + bankUnreconciledCount;
    const combinedReconLabel = combinedPendingCount === 0
      ? (brTotals ? 'All reconciled (incl. bank)' : 'All reconciled')
      : [
          unreconciledBudgets.length ? `${unreconciledBudgets.length} budget line(s)` : null,
          bankUnreconciledCount ? `${bankUnreconciledCount} bank item(s)` : null,
        ].filter(Boolean).join(' + ') + ' pending';

    const FY_PERIOD_LABEL = window.Store.fyLabel(window.Store.today());
    const cf = window.computeCashFlow ? window.computeCashFlow(FY_PERIOD_LABEL, activeScenario, budgets, capexProjects) : null;
    // 13-week (~3 month) look-ahead cash view, built from the same
    // computeCashFlow series so it never drifts from the Cash Flow screen.
    const next13WeekOutflow = cf ? Math.abs(cf.investing.slice(1, 4).reduce((a, v) => a + Math.min(0, v), 0)) : 0;
    const next13WeekInflow = cf ? cf.operating.slice(1, 4).reduce((a, v) => a + Math.max(0, v), 0) : 0;
    const solvent = cf && cf.hasData ? cf.minCash > 0 : true;
    const withinRunwayThreshold = cf && cf.hasData ? cf.minCash >= 60 : true;

    // ---- Q1: Where's the money coming from — client feedback
    // (2026-08-30): Arsela is more of a cost centre than a trading
    // business, so "money coming from" is NOT always trading revenue —
    // it can be shareholder/parent capital injections, intercompany
    // funding, or loans drawn to cover the cost base. Trading revenue
    // alone (P&L) would forever show A$0 for a pure cost-centre entity
    // even while it is being actively funded. Now pulls from BOTH real
    // imported Xero reports (never budgets/CAPEX, which are spend-only
    // and have no income data model):
    //   - Revenue (P&L revenueBySource) — genuine trading income.
    //   - Financing inflows (Cash Flow Actuals, Financing activity
    //     lines with a positive YTD/current total) — capital
    //     injections, shareholder/parent funding, loans drawn. This
    //     report type has been part of the Data Imports hub since the
    //     8-report-type build but was previously read into `latestCFA`
    //     and never actually used anywhere in this report.
    // The two are always shown as SEPARATE labelled lines (never
    // merged into one figure) so a director can see whether the
    // business is earning its own way or being funded externally.
    const revenueBySource = latestPL && latestPL.totals ? (latestPL.totals.revenueBySource || []) : [];
    const totalRevenueYTD = latestPL && latestPL.totals ? (latestPL.totals.totalRevenueYTD || 0) : 0;
    const cfaTotals = latestCFA && latestCFA.totals ? latestCFA.totals : null;
    // Financing lines individually, positive (inflow) ones only — a
    // financing OUTFLOW (e.g. a dividend paid, loan repaid) is not a
    // "money coming from" source and is deliberately excluded here.
    const financingInflowLines = (latestCFA && Array.isArray(latestCFA.rows) ? latestCFA.rows : [])
      .filter((r) => r.activity === 'Financing' && ((r.ytd || r.current || 0) > 0))
      .map((r) => ({ description: r.description, amount: r.ytd || r.current || 0 }))
      .sort((a, b) => b.amount - a.amount);
    const totalFinancingInflowYTD = cfaTotals ? Math.max(0, cfaTotals.netFinancingYTD || 0) : 0;
    const hasFinancingData = cfaTotals != null;
    const hasMoneySourceData = latestPL != null || hasFinancingData;
    // Combined total across both real sources, for the headline figure.
    const totalMoneyInYTD = totalRevenueYTD + totalFinancingInflowYTD;
    // Cost-centre framing: revenue is negligible/zero but financing
    // inflows are the actual funding source — call this out explicitly
    // rather than implying the business earns nothing.
    const isCostCentreFunded = hasFinancingData && totalFinancingInflowYTD > 0 && totalRevenueYTD <= 0;

    // ---- Q2: Do we have enough to cover our expenses — a real coverage
    // ratio when a Balance Sheet and/or Aged Receivables/Payables have
    // been imported (cash+receivables due vs payables+ongoing burn),
    // else falls back to the existing budget-derived runway view so the
    // section is never blank on a Store that only has budgets/CAPEX.
    const arOutstanding = latestAR && latestAR.totals ? (latestAR.totals.totalOutstanding || 0) : null;
    const apOutstanding = latestAP && latestAP.totals ? (latestAP.totals.totalOutstanding || 0) : null;
    const hasCoverageData = arOutstanding != null || apOutstanding != null;
    // Monthly burn re-used from the existing cash-flow model (AUD, in
    // millions -> convert to whole units for comparison with AR/AP).
    const monthlyBurnUnits = cf ? (cf.monthlyBurn || 0) * 1e6 : 0;
    // "Cash on hand" prefers the REAL Xero bank balance (Bank Summary
    // import) over the budget-derived cash-flow-model forecast — a
    // Bank Summary import always reflects actual money in the bank as
    // at its report date, whereas the cash-flow model is a projection.
    // Falls back to the forecast only when no Bank Summary is imported.
    const cashOnHandUnits = hasBankSummary ? bankTotalClosing : (cf ? cf.closingCash * 1e6 : 0);
    const cashOnHandSource = hasBankSummary ? `Bank Summary as at ${latestBSum.period}` : 'cash flow model (forecast)';
    const coverageMonths = (hasCoverageData && monthlyBurnUnits > 0)
      ? ((arOutstanding || 0) - (apOutstanding || 0) + cashOnHandUnits) / monthlyBurnUnits
      : null;
    // ---- Director feedback 2026-09-24, Item 6 (High): "'Enough to
    // cover our expenses? Yes' appears to rely on the A$30.8K July bank
    // balance... Compare current cash plus confirmed funding against
    // dated upcoming payroll, super, tax and other payments. Show the
    // funding gap and the date cash runs short." canCoverExpenses is
    // now driven by a real dated 13-week cash projection
    // (buildFundingGapProjection, defined above the component) instead
    // of a single point-in-time balance check — "Yes" now specifically
    // means "cash does not go negative in the projection", and the UI/
    // PDF surface the projected low point AND its date, not just a
    // yes/no. Falls back to the old simpler AR/AP/bank check only when
    // there isn't enough data (no Bank Summary at all) to run a
    // projection, so the section is never blank.
    const [fgY, fgM] = (monthKey || '').split('-').map(Number);
    const fundingGapReportDate = (fgY && fgM) ? new Date(fgY, fgM - 1, 1) : window.Store.today();
    const fundingGapProjection = buildFundingGapProjection({ latestBSum, latestPL, latestAP, latestAR, reportMonthDate: fundingGapReportDate });
    const canCoverExpenses = fundingGapProjection
      ? fundingGapProjection.shortfallDate == null
      : (hasCoverageData
        ? ((arOutstanding || 0) + cashOnHandUnits) >= (apOutstanding || 0)
        : (hasBankSummary ? cashOnHandUnits > 0 : (cf && cf.hasData ? cf.minCash > 0 : null)));

    // ---- Q3: Are we solvent — real assets-vs-liabilities from the
    // latest imported Balance Sheet (the client's stated definition of
    // solvency), falling back to the cash-runway proxy (`solvent` above)
    // only when no Balance Sheet has been imported yet.
    const bsTotals = latestBS && latestBS.totals ? latestBS.totals : null;
    const realSolvent = bsTotals ? bsTotals.totalAssets >= bsTotals.totalLiabilities : null;
    const currentRatio = bsTotals ? bsTotals.currentRatio : null;
    const workingCapital = bsTotals ? bsTotals.workingCapital : null;

    // ---- 2026-08-30 fix (THE primary bug from the client's screenshot):
    // the Executive Summary's top-line KPIs (Xero Actuals / Open
    // Commitments / Actual+Commitments / Forecast Final Cost / Actual vs
    // Budget-to-Date) were 100% derived from the internal Budgets module
    // (`s.budgets`), which is empty on a fresh Store — a client who
    // imports real Xero reports but never creates a Budget entry saw
    // every one of these tiles as a flat "A$ 0", even though the exact
    // same screen's Q1/Q2/Q3 and Xero control checks sections (a few
    // hundred pixels lower) correctly showed real imported figures. That
    // contradiction is the direct cause of "why isn't my Xero import
    // reflected" — fixed with the SAME pattern already used for Q2's
    // cash-on-hand: prefer the Budget-tracking figures when budgets
    // exist (unchanged behaviour for clients who use the Budgets
    // module), and fall back to the equivalent REAL imported Xero figure
    // when no budgets exist, so this block is never silently
    // disconnected from what was actually imported. Each fallback is
    // explicitly labelled so the basis is never ambiguous.
    const hasBudgets = budgets.length > 0;
    // Xero P&L's Cost of Sales + Operating/Other Expense lines = the
    // real reconciled "money spent" figure per Xero, independent of the
    // Budgets module.
    const xeroExpenseYTD = latestPL && latestPL.totals
      ? (latestPL.totals.totalCostOfSalesYTD || 0) + (latestPL.totals.totalExpenseYTD || 0)
      : null;
    const xeroActualsBasis = hasBudgets ? totalSpent : xeroExpenseYTD;
    const xeroActualsSourceLabel = hasBudgets
      ? `${burnPct.toFixed(1)}% of total plan`
      : (latestPL ? `Total expenses YTD per Xero P&L (${latestPL.period})` : null);
    // Aged Payables outstanding = a real, imported "amount owed but not
    // yet paid" figure — the closest Xero-backed equivalent to "open
    // commitments" when no internal Budget commitments exist.
    const openCommitmentsBasis = hasBudgets ? totalCommitted : apOutstanding;
    const openCommitmentsSourceLabel = hasBudgets
      ? 'Approved, not yet posted'
      : (apOutstanding != null ? `Payables outstanding (Aged Payables, ${latestAP.period})` : null);
    const actualPlusCommitmentsBasis = (xeroActualsBasis != null || openCommitmentsBasis != null)
      ? (xeroActualsBasis || 0) + (openCommitmentsBasis || 0) : null;
    // ---- Director feedback 2026-09-24, Item 5 (High): "'Forecast final
    // cost A$203.5K' is projected from July expenses alone... Hide this
    // until the full year-to-date P&L and a usable budget or cost
    // forecast are loaded." Root cause: the old fallback (no budgets)
    // took whatever SINGLE P&L snapshot happened to be latest and
    // divided by % of year elapsed — if that snapshot was really just
    // one month's figures (as Xero's real monthly export columns are —
    // confirmed against the client's actual multi-month P&L exports,
    // each column is that MONTH's actuals, not a running total), the
    // projection silently extrapolated a whole year from one month.
    // Fix: the naive run-rate fallback is removed entirely. Forecast
    // Final Cost now only shows when BOTH conditions the client asked
    // for are met: (1) a usable Budget/cost-forecast plan exists
    // (hasBudgets — the same real forecastFinal figures the Budgets
    // module already tracks), AND (2) the underlying Xero P&L actually
    // covers every month of this FY-to-date (hasFullYTDPL below) rather
    // than a single carried-forward month standing in for the whole
    // year. Otherwise it is hidden with an explicit reason, never
    // silently substituted.
    const fyStartKeyForForecast = fyStartKeyForMonthKey(monthKey);
    const monthsElapsedInFY = (() => {
      if (!fyStartKeyForForecast || !monthKey) return 0;
      const [sy, sm] = fyStartKeyForForecast.split('-').map(Number);
      const [ey, em] = monthKey.split('-').map(Number);
      if (!sy || !ey) return 0;
      return (ey - sy) * 12 + (em - sm) + 1;
    })();
    const fyPLMonthsOnFile = fyMonthlySeries('profitAndLoss', monthKey).length;
    const hasFullYTDPL = monthsElapsedInFY > 0 && fyPLMonthsOnFile >= monthsElapsedInFY;
    const forecastFinalBasis = (hasBudgets && hasFullYTDPL) ? totalForecastFinal : null;
    const forecastFinalSourceLabel = forecastFinalBasis != null ? 'Full-year projection (full FY-to-date P&L on file)' : null;
    const forecastFinalHiddenReason = hasBudgets
      ? (!hasFullYTDPL ? `Hidden — only ${fyPLMonthsOnFile} of ${monthsElapsedInFY} FY-to-date month(s) of Profit & Loss are on file. Import every month from July to see a reliable forecast.` : null)
      : 'Hidden — add a Budget/cost-forecast plan and import every FY-to-date month of Profit & Loss to see a reliable forecast.';
    // "Actual vs budget-to-date" is a comparison AGAINST A PLAN — with no
    // Budgets module entries there genuinely is no plan to compare
    // against, so this stays an honest empty state rather than a
    // fabricated or misleading substitute.
    const budgetToDateBasis = hasBudgets ? budgetToDate : null;
    const varianceToDateBasis = hasBudgets ? varianceToDate : null;

    // Department rollup — carries ALL bases (actual/committed/forecast)
    // so a near-zero-spend department against a large allocation is never
    // shown as a flat "green" underspend without the fuller picture.
    const deptRollup = {};
    budgets.forEach((b) => {
      if (!deptRollup[b.dept]) deptRollup[b.dept] = { allocated: 0, spent: 0, committed: 0, forecastFinal: 0 };
      deptRollup[b.dept].allocated += b.allocated;
      deptRollup[b.dept].spent += (b.reconciled ? (b.spent || 0) : 0);
      deptRollup[b.dept].committed += (b.committed || 0);
      deptRollup[b.dept].forecastFinal += (b.forecastFinal || b.spent || 0);
    });
    const deptRows = Object.entries(deptRollup)
      .map(([dept, v]) => {
        const budgetToDateDept = v.allocated * fyPct;
        const actualVsBudgetToDate = v.spent - budgetToDateDept;
        const actualPlusCommitted = v.spent + v.committed;
        const forecastVariance = v.forecastFinal - v.allocated;
        // A department showing near-zero spend against a large allocation
        // this early in the year is a TIMING gap, not a genuine saving —
        // flag it explicitly instead of coloring it green.
        const isTimingGap = v.spent < v.allocated * 0.05 && fyPct > 0.05;
        return {
          dept, ...v, budgetToDateDept, actualVsBudgetToDate, actualPlusCommitted, forecastVariance, isTimingGap,
          action: forecastVariance > v.allocated * 0.03 ? 'Reforecast / seek top-up' : isTimingGap ? 'Confirm spend timing with dept owner' : forecastVariance < -v.allocated * 0.1 ? 'Review for reallocation' : 'Monitor',
        };
      })
      .sort((a, b) => Math.abs(b.forecastVariance) - Math.abs(a.forecastVariance));

    const REPORT_DATE = window.Store.today();
    // "Report month" (what this report is ABOUT) vs. "prepared" date
    // (when it was generated — always today, since the app always
    // compiles the report on demand). Viewing a past month via the
    // picker changes monthLabel/isCurrentMonth but never dateLabel —
    // a director should always see when a snapshot was actually pulled.
    const [reportMonthY, reportMonthM] = (monthKey || '').split('-').map(Number);
    const reportMonthDate = (reportMonthY && reportMonthM) ? new Date(reportMonthY, reportMonthM - 1, 1) : REPORT_DATE;
    const monthLabel = reportMonthDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    const dateLabel = REPORT_DATE.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const isCurrentMonth = !monthKey || monthKey === `${REPORT_DATE.getFullYear()}-${String(REPORT_DATE.getMonth() + 1).padStart(2, '0')}`;
    // An incomplete month/period must be labeled a preliminary snapshot,
    // not presented as a complete closed-period report. Now also folds
    // in real imported bank-reconciliation items (see combinedPendingCount
    // above) so this can't say "Reconciled" while a real Xero import
    // shows unreconciled bank lines. A past month being VIEWED is never
    // "preliminary" in the fyPct-incomplete sense (that only applies to
    // the current, still-in-progress month) — only its own reconciliation
    // state matters.
    const isPreliminary = combinedPendingCount > 0 || (isCurrentMonth && fyPct < 1);

    const exportCSV = () => {
      exportRowsToCSV(
        `directors-report-${monthLabel.replace(/\s+/g, '-').toLowerCase()}`,
        ['Section', 'Metric', 'Value'],
        [
          ['Basis', `Reporting status`, isPreliminary ? `Preliminary snapshot as at ${dateLabel}` : `Reconciled — ${FY_PERIOD_LABEL}`],
          ['Basis', 'Reconciled Xero actuals through', latestActualsThrough || 'n/a'],
          ['Basis', 'Budgets pending reconciliation (count)', unreconciledBudgets.length],
          ['Basis', 'Bank items unreconciled (from latest Bank Reconciliation import)', brTotals ? bankUnreconciledCount : 'Not imported'],
          ['Basis', 'Approved expenses not yet posted in Xero (count)', unpostedExpenses.length],
          // 2026-08-30: uses the same hasBudgets-aware basis variables as
          // the on-screen Executive Summary (xeroActualsBasis etc.) so a
          // no-budgets client's export matches what the screen shows,
          // instead of falling back to the raw budgets-only totals (which
          // are always 0 when s.budgets is empty).
          ['Summary', 'Total allocated (AUD)', hasBudgets ? totalAllocated : 'n/a — no Budgets module entries'],
          // NOTE: these Summary rows are RAW numbers (not run through
          // fmtMYR/fmtAUD) so the CSV always carries the true underlying
          // value regardless of basis — no currency-conversion risk here.
          ['Summary', 'Xero actuals — reconciled only (AUD)', xeroActualsBasis != null ? Math.round(xeroActualsBasis) : 'Not answerable — no budgets or Profit & Loss imported'],
          ['Summary', 'Xero actuals basis', xeroActualsSourceLabel || 'n/a'],
          ['Summary', 'Open commitments (AUD)', openCommitmentsBasis != null ? Math.round(openCommitmentsBasis) : 'Not answerable — no budgets or Aged Payables imported'],
          ['Summary', 'Open commitments basis', openCommitmentsSourceLabel || 'n/a'],
          ['Summary', 'Actual + commitments (AUD)', actualPlusCommitmentsBasis != null ? Math.round(actualPlusCommitmentsBasis) : 'Not answerable'],
          ['Summary', 'Forecast final cost (AUD)', forecastFinalBasis != null ? Math.round(forecastFinalBasis) : forecastFinalHiddenReason],
          ['Summary', 'Forecast final cost basis', forecastFinalSourceLabel || 'n/a'],
          ['Summary', 'Burn vs total budget (%)', hasBudgets ? burnPct.toFixed(1) : 'n/a — no Budgets module entries'],
          ['Summary', `Budget to date (${Math.round(fyPct * 100)}% of ${FY_PERIOD_LABEL} elapsed) (AUD)`, budgetToDateBasis != null ? Math.round(budgetToDateBasis) : 'No plan to compare'],
          ['Summary', 'Actual vs budget-to-date variance (AUD)', varianceToDateBasis != null ? Math.round(varianceToDateBasis) : 'No plan to compare — add budgets to see a plan-vs-actual variance'],
          ['Approvals', 'Pending approvals (count)', pendingApprovals.length],
          ['Approvals', 'Pending approvals (AUD)', pendingApprovalValue],
          ['Approvals', 'Urgent approvals (count)', urgentApprovals.length],
          ['CAPEX', 'Approved (AUD)', capexApproved],
          ['CAPEX', 'Committed / total exposure (AUD)', capexCommitted],
          ['CAPEX', 'Paid actuals (AUD)', capexSpent],
          ...(cf ? [
            ['Cash Flow', `Active scenario`, activeScenario.n || 'Base case'],
            [`Cash Flow`, `Closing cash ${FY_PERIOD_LABEL} (AUD M)`, cf.closingCash],
            ['Cash Flow', 'Runway (months)', cf.runwayMonths || 'n/a'],
            ['Cash Flow', 'Monthly burn (AUD M)', cf.monthlyBurn],
            ['Cash Flow', 'Minimum projected cash balance (AUD M)', cf.minCash],
            ['Cash Flow', 'Next 13-week forecast inflow (AUD M)', next13WeekInflow.toFixed(1)],
            ['Cash Flow', 'Next 13-week forecast outflow (AUD M)', next13WeekOutflow.toFixed(1)],
            ['Cash Flow', 'Solvency status', solvent ? (withinRunwayThreshold ? 'Solvent — within threshold' : 'Solvent — below comfort threshold') : 'At risk — projected negative balance'],
          ] : []),
          // Three questions (client ask, 2026-08-19) — Xero-import-backed where available.
          // Q1 combines trading revenue (P&L) and financing inflows
          // (Cash Flow Actuals — shareholder/parent funding, loans) as
          // two separate lines (client ask, 2026-08-30 — Arsela is a
          // cost centre, so revenue alone would misrepresent funding).
          ['Q1: Where is the money coming from', 'Total revenue + financing inflows YTD (AUD)', hasMoneySourceData ? totalMoneyInYTD : 'Not answerable — no Profit & Loss or Cash Flow Actuals imported'],
          ['Q1: Where is the money coming from', 'Trading revenue YTD (AUD)', latestPL ? totalRevenueYTD : 'Not imported'],
          ...(latestPL ? [['Q1: Where is the money coming from', 'Revenue period', latestPL.period]] : []),
          ...revenueBySource.slice(0, 5).map((r) => ['Q1: Revenue by source', r.account, r.ytd]),
          ['Q1: Where is the money coming from', 'Financing inflows YTD (AUD)', hasFinancingData ? totalFinancingInflowYTD : 'Not imported'],
          ...(hasFinancingData ? [['Q1: Where is the money coming from', 'Financing period', latestCFA.period]] : []),
          ...financingInflowLines.slice(0, 5).map((r) => ['Q1: Financing inflow by line', r.description, r.amount]),
          ['Q1: Where is the money coming from', 'Cost-centre funded (no/negligible trading revenue)', isCostCentreFunded ? 'Yes' : 'No'],
          ['Q2: Enough to cover expenses', 'Status', canCoverExpenses == null ? 'Not answerable' : (canCoverExpenses ? 'Yes — covered' : 'At risk — shortfall')],
          ...(hasCoverageData ? [
            ['Q2: Enough to cover expenses', 'Receivables outstanding (AUD)', arOutstanding],
            ['Q2: Enough to cover expenses', 'Payables outstanding (AUD)', apOutstanding],
            ['Q2: Enough to cover expenses', 'Cash on hand (AUD)', cashOnHandUnits],
            ['Q2: Enough to cover expenses', 'Cash on hand source', cashOnHandSource],
            ['Q2: Enough to cover expenses', 'Months of burn covered', coverageMonths != null ? coverageMonths.toFixed(1) : 'n/a'],
          ] : []),
          ['Q3: Are we solvent', 'Status', bsTotals ? (realSolvent ? 'Solvent' : 'Insolvent — liabilities exceed assets') : `Proxy only (cash runway) — ${solvent ? 'within/below threshold, no Balance Sheet imported' : 'at risk'}`],
          ...(bsTotals ? [
            ['Q3: Are we solvent', 'Total assets (AUD)', bsTotals.totalAssets],
            ['Q3: Are we solvent', 'Total liabilities (AUD)', bsTotals.totalLiabilities],
            ['Q3: Are we solvent', 'Working capital (AUD)', workingCapital],
            ['Q3: Are we solvent', 'Current ratio', currentRatio != null ? currentRatio.toFixed(2) : 'n/a'],
            ['Q3: Are we solvent', 'Balance Sheet as at', latestBS.period],
          ] : []),
          // Xero control checks (client ask, 2026-08-26) — Trial Balance,
          // Bank Reconciliation, Bank Summary and ledger activity, the
          // five report types that previously had no downstream consumer.
          ['Xero control checks', 'Trial Balance status', tbTotals ? (tbTotals.balanced ? 'Balanced' : 'Out of balance') : 'Not imported'],
          ...(tbTotals ? [['Xero control checks', 'Trial Balance debit/credit (AUD)', `${tbTotals.totalDebit} / ${tbTotals.totalCredit}`]] : []),
          ['Xero control checks', 'Bank Reconciliation status', brTotals ? `${brTotals.unreconciledCount} unreconciled item(s), difference ${brTotals.difference}` : 'Not imported'],
          ['Xero control checks', 'Bank Summary total closing balance (AUD)', hasBankSummary ? bankTotalClosing : 'Not imported'],
          ['Xero control checks', `${ledgerLabel || 'Ledger activity'}`, ledgerTotals ? `${ledgerTotals.rowCount} lines across ${ledgerTotals.accountCount} account(s)` : 'Not imported'],
          ['Xero sync', 'Report types imported', `${xeroImportedCount} of ${xeroTypeList.length}`],
          ...(xeroMissing.length ? [['Xero sync', 'Not yet imported', xeroMissing.map((t) => t.label).join('; ')]] : []),
          ...deptRows.map((d) => [`Department — ${d.dept}`, 'Allocated / Actual (reconciled) / Committed / Forecast final (AUD)', `${d.allocated} / ${d.spent} / ${d.committed} / ${d.forecastFinal}`]),
        ]
      );
    };

    const exportPDF = () => {
      if (!window.jspdf) { window.Store.toast('PDF library still loading — try again in a moment', 'warning'); return; }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 50;

      doc.setFontSize(18); doc.setFont(undefined, 'bold');
      doc.text('ApexFin — Monthly Director\'s Report', 40, y);
      y += 20;
      doc.setFontSize(11); doc.setFont(undefined, 'normal'); doc.setTextColor(90);
      doc.text(`${monthLabel} · Prepared ${dateLabel} · Arsela Resources`, 40, y);
      doc.setTextColor(0);
      y += 28;

      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('1. Executive summary', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Metric', 'Value']],
        body: [
          // 2026-08-30: same hasBudgets-aware basis variables as the
          // on-screen Executive Summary, so the PDF export matches what
          // the screen shows for a no-budgets client instead of always
          // printing A$0.
          [`Total ${FY_PERIOD_LABEL} budget allocated`, hasBudgets ? fmtMYR(totalAllocated, { compact: true }) : 'n/a — no Budgets module entries'],
          // 2026-08-30: real Xero figures are AUD and must use fmtAUD (no
          // conversion) — fmtMYR would silently shrink them by the
          // MYR->AUD display rate. Budget-basis figures stay on fmtMYR.
          ['Xero actuals — reconciled only', xeroActualsBasis != null ? `${hasBudgets ? fmtMYR(xeroActualsBasis, { compact: true }) : fmtAUD(xeroActualsBasis, { compact: true })} (${xeroActualsSourceLabel})` : 'Not answerable — no budgets or Profit & Loss imported'],
          ['Open commitments', openCommitmentsBasis != null ? `${hasBudgets ? fmtMYR(openCommitmentsBasis, { compact: true }) : fmtAUD(openCommitmentsBasis, { compact: true })} (${openCommitmentsSourceLabel})` : 'Not answerable — no budgets or Aged Payables imported'],
          ['Actual + commitments', actualPlusCommitmentsBasis != null ? (hasBudgets ? fmtMYR(actualPlusCommitmentsBasis, { compact: true }) : fmtAUD(actualPlusCommitmentsBasis, { compact: true })) : 'Not answerable'],
          ['Forecast final cost (full year)', forecastFinalBasis != null ? `${hasBudgets ? fmtMYR(forecastFinalBasis, { compact: true }) : fmtAUD(forecastFinalBasis, { compact: true })} (${forecastFinalSourceLabel})` : forecastFinalHiddenReason],
          ['Burn vs total annual budget', hasBudgets ? `${burnPct.toFixed(1)}%` : 'n/a — no Budgets module entries'],
          [`Budget to date (${Math.round(fyPct * 100)}% of ${FY_PERIOD_LABEL} elapsed)`, budgetToDateBasis != null ? fmtMYR(budgetToDateBasis, { compact: true }) : 'No plan to compare'],
          ['Actual vs budget-to-date variance', varianceToDateBasis != null ? `${varianceToDateBasis >= 0 ? '+' : '−'}${hasBudgets ? fmtMYR(Math.abs(varianceToDateBasis), { compact: true }) : fmtAUD(Math.abs(varianceToDateBasis), { compact: true })} ${varianceToDateBasis >= 0 ? 'over' : 'under'}` : 'No plan to compare — add budgets to see a plan-vs-actual variance'],
          ['Budgets currently over plan', hasBudgets ? `${overBudget.length} of ${budgets.length}` : 'n/a — no Budgets module entries'],
          ['Budgets pending reconciliation to Xero', hasBudgets ? `${unreconciledBudgets.length} of ${budgets.length}` : 'n/a — no Budgets module entries'],
          ['Bank items unreconciled (Bank Reconciliation import)', brTotals ? String(bankUnreconciledCount) : 'Not imported'],
          ['Approved expenses not yet posted in Xero', `${unpostedExpenses.length}`],
          ['Pending approvals', `${pendingApprovals.length} (${fmtMYR(pendingApprovalValue, { compact: true })}), ${urgentApprovals.length} urgent`],
          ['Reporting status', isPreliminary ? `Preliminary snapshot as at ${dateLabel}` : 'Reconciled'],
        ],
        styles: { fontSize: 9.5 }, headStyles: { fillColor: [19, 67, 203] },
      });
      y = doc.lastAutoTable.finalY + 24;

      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('2. Department budget performance', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Department', 'Allocated', 'Actual (reconciled)', 'Committed', 'Forecast variance', 'Action']],
        body: deptRows.map((d) => [
          d.dept, fmtMYR(d.allocated, { compact: true }), fmtMYR(d.spent, { compact: true }), fmtMYR(d.committed, { compact: true }),
          `${d.forecastVariance >= 0 ? '+' : '−'}${fmtMYR(Math.abs(d.forecastVariance), { compact: true })}`,
          d.action,
        ]),
        styles: { fontSize: 8.5 }, headStyles: { fillColor: [19, 67, 203] },
      });
      y = doc.lastAutoTable.finalY + 24;

      if (y > 620) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('3. CAPEX programme', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Project', 'Approved', 'Committed (total exposure)', 'Paid actuals', 'Stage']],
        body: capexProjects.map((c) => [c.name, fmtMYR(c.approved, { compact: true }), fmtMYR(c.committed, { compact: true }), fmtMYR(c.paidActuals != null ? c.paidActuals : c.spent, { compact: true }), c.stage]),
        styles: { fontSize: 8.5 }, headStyles: { fillColor: [19, 67, 203] },
      });
      y = doc.lastAutoTable.finalY + 24;

      if (y > 620) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('4. Cash flow position', 40, y); y += 8;
      doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
      if (cf) {
        doc.text(`Active scenario: ${activeScenario.n || 'Base case'} — ${activeScenario.note || `Current approved ${FY_PERIOD_LABEL} plan.`}`, 40, y); y += 14;
        doc.text(`Closing cash (${FY_PERIOD_LABEL}): ${curLabel(cf.closingCash)} · Runway: ${cf.runwayMonths ? cf.runwayMonths + ' months' : 'n/a'} · Monthly burn: ${curLabel(cf.monthlyBurn)}`, 40, y); y += 14;
        doc.text(`Minimum projected cash balance: ${curLabel(cf.minCash)} · Next 13-week inflow: ${curLabel(next13WeekInflow)} · outflow: ${curLabel(next13WeekOutflow)}`, 40, y); y += 14;
        doc.text(`Solvency status: ${solvent ? (withinRunwayThreshold ? 'Solvent — within comfort threshold' : 'Solvent — below comfort threshold, monitor closely') : 'At risk — projected balance may go negative'}`, 40, y); y += 20;
      }

      if (y > 600) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('5. The three questions this report must answer', 40, y); y += 8;
      doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
      doc.text(`Q1 — Where's the money coming from: ${hasMoneySourceData ? `${fmtAUD(totalMoneyInYTD, { compact: true })} total ${isCostCentreFunded ? '(funded by financing, not trading revenue)' : 'revenue + financing inflows YTD'}. Trading revenue: ${latestPL ? fmtAUD(totalRevenueYTD, { compact: true }) + ` (${latestPL.period})` : 'not imported'}. Financing inflows: ${hasFinancingData ? fmtAUD(totalFinancingInflowYTD, { compact: true }) + ` (${latestCFA.period})` : 'not imported'}.` : 'Not answerable — no Profit & Loss or Cash Flow Actuals imported yet.'}`, 40, y, { maxWidth: pageW - 80 }); y += 14;
      if (latestPL && revenueBySource.length) {
        revenueBySource.slice(0, 3).forEach((r) => { doc.text(`   • ${r.account}: ${fmtAUD(r.ytd, { compact: true })}`, 40, y); y += 12; });
      }
      if (hasFinancingData && financingInflowLines.length) {
        financingInflowLines.slice(0, 3).forEach((r) => { doc.text(`   • ${r.description}: ${fmtAUD(r.amount, { compact: true })}`, 40, y); y += 12; });
      }
      y += 6;
      doc.text(`Q2 — Enough to cover our expenses: ${canCoverExpenses == null ? 'Not answerable — import Bank Summary and Profit & Loss.' : (canCoverExpenses ? 'Yes — covered over the next 13 weeks.' : 'At risk — funding gap projected.')}${fundingGapProjection ? ` Cash today ${fmtAUD(fundingGapProjection.openingCash, { compact: true })} (${asAtLabel(latestBSum)}), projected low point ${fmtAUD(fundingGapProjection.lowPoint, { compact: true })} around ${fundingGapProjection.lowPointDate}${fundingGapProjection.shortfallDate ? `, cash runs short around ${fundingGapProjection.shortfallDate}` : ''}.` : ''}`, 40, y, { maxWidth: pageW - 80 }); y += 26;
      doc.text(`Q3 — Are we solvent: ${bsTotals ? (realSolvent ? `Yes — solvent. Assets ${fmtAUD(bsTotals.totalAssets, { compact: true })} vs liabilities ${fmtAUD(bsTotals.totalLiabilities, { compact: true })}, current ratio ${currentRatio != null ? currentRatio.toFixed(2) + 'x' : 'n/a'} (Balance Sheet as at ${latestBS.period}).` : `No — liabilities exceed assets. Assets ${fmtAUD(bsTotals.totalAssets, { compact: true })} vs liabilities ${fmtAUD(bsTotals.totalLiabilities, { compact: true })} (Balance Sheet as at ${latestBS.period}).`) : `No Balance Sheet imported — cash-runway proxy only (${solvent ? (withinRunwayThreshold ? 'within comfort threshold' : 'below comfort threshold') : 'at risk'}).`}`, 40, y, { maxWidth: pageW - 80 }); y += 30;

      if (y > 620) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('6. Xero control checks', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Report', 'Status', 'Detail', 'Period']],
        body: [
          ['Trial Balance', tbTotals ? (tbTotals.balanced ? 'Balanced' : 'Out of balance') : 'Not imported', tbTotals ? `Debit ${fmtAUD(tbTotals.totalDebit, { compact: true })} / Credit ${fmtAUD(tbTotals.totalCredit, { compact: true })}` : '—', latestTB ? latestTB.period : '—'],
          ['Bank Reconciliation', brTotals ? (brTotals.unreconciledCount === 0 ? 'Fully reconciled' : `${brTotals.unreconciledCount} unreconciled`) : 'Not imported', brTotals ? `Difference ${fmtAUD(brTotals.difference, { compact: true })}` : '—', latestBR ? latestBR.period : '—'],
          ['Bank Summary', hasBankSummary ? 'Imported' : 'Not imported', hasBankSummary ? `Closing balance ${fmtAUD(bankTotalClosing, { compact: true })}` : '—', latestBSum ? latestBSum.period : '—'],
          [ledgerLabel || 'General Ledger / Account Transactions', ledgerTotals ? 'Imported' : 'Not imported', ledgerTotals ? `${ledgerTotals.rowCount} lines, ${ledgerTotals.accountCount} account(s)` : '—', ledgerSource ? ledgerSource.period : '—'],
        ],
        styles: { fontSize: 8.5 }, headStyles: { fillColor: [19, 67, 203] },
      });
      y = doc.lastAutoTable.finalY + 24;

      if (y > 640) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('7. Approvals requiring director attention', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Item', 'Type', 'Amount', 'Requester', 'Urgent']],
        body: pendingApprovals.slice(0, 10).map((a) => [a.title, a.type, fmtMYR(a.amount, { compact: true }), a.requester, a.urgent ? 'Yes' : '']),
        styles: { fontSize: 8.5 }, headStyles: { fillColor: [19, 67, 203] },
      });

      if (y > 640) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('8. Data limitations', 40, y); y += 8;
      doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
      doc.text(`This report is ${isPreliminary ? 'a PRELIMINARY SNAPSHOT — ' : ''}based on Xero actuals reconciled through ${latestActualsThrough || 'n/a'}. ${unreconciledBudgets.length} of ${budgets.length} budget lines are pending reconciliation${brTotals ? `, and ${bankUnreconciledCount} bank item(s) are unreconciled per the latest Bank Reconciliation import (${latestBR.period})` : ''}, and ${unpostedExpenses.length} approved expense(s) are not yet posted in Xero. Figures beyond the reconciled-through date are forecasts, not actuals. Xero report types imported: ${xeroImportedCount} of ${xeroTypeList.length}.${xeroMissing.length ? ` Not yet imported: ${xeroMissing.map((t) => t.label).join(', ')}.` : ''}`, 40, y, { maxWidth: pageW - 80 });

      doc.save(`ApexFin-Directors-Report-${monthLabel.replace(/\s+/g, '-')}.pdf`);
      window.Store.toast('Director\'s report exported as PDF', 'success');
    };

    /* ---- Task #16 (client spec, 2026-09-24, verbatim structure — a
       genuine corporate "management account" pack, cost-centre aware):
         1. Short director summary — closing bank balance, monthly loss,
            major cash received, payments needing attention; vs last month.
         2. Profit and Loss — this month's result AND FY-to-date, vs the
            same month/YTD last year; explain major expense movements.
         3. Cash movement — opening + received − paid = closing, with
            shareholder/financing funding split out from trading revenue
            (Arsela is a cost centre, not a trading business); vs previous
            month and vs July (FY start).
         4. Balance Sheet — cash, amounts owed TO Arsela, unpaid
            obligations, shareholder loans and equity; this month-end vs
            the prior FY-year-end (30 June), exactly as Xero shows it.
         5. Next 1–3 months — expected receipts, payroll/tax/super/other
            committed payments, and any funding gap; forecast vs available
            cash.
         6. Items for directors — decisions needed, overdue payments,
            missing records and reconciliation issues; status since last
            report.
       Replaces the earlier 5-page "P&L/Equity/Balance Sheet only" pack
       (Task #15) — that structure never surfaced cash, financing funding
       or open items, all three of which the client explicitly asked to
       see. The report-ending date is ALWAYS the month selected via the
       Task #11 month picker (monthLabel/monthKey) — never hardcoded. ---- */
    // ---- Director feedback (2026-09-24, client ask): "make sure I CAN
    // VIEW MANAGEMENT ACCOUNT BEFORE DOWNLOAD" — exportManagementAccountsPDF
    // used to call doc.save() directly, which forces an immediate file
    // download with no way to check the report first. mode='preview'
    // (the button's new default) builds the exact same 7-page PDF but
    // renders it in an in-app modal (via doc.output('bloburl') in an
    // <iframe>) with an explicit "Download PDF" action in the footer;
    // mode='download' (used by that footer button) keeps the original
    // one-step doc.save() behaviour. Nothing about the PDF CONTENT
    // changes between the two modes — same jsPDF doc either way.
    const exportManagementAccountsPDF = (mode = 'preview') => {
      if (!window.jspdf) { window.Store.toast('PDF library still loading — try again in a moment', 'warning'); return; }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const COMPANY_NAME = 'Arsela Resources';
      const TOTAL_PAGES = 7; // cover + 6 sections
      // Client spec: the report-ending date is always the LAST calendar
      // day of the selected month (reportMonthDate itself is the 1st,
      // used elsewhere for label/FY-year math), not the 1st.
      const periodEndDate = new Date(reportMonthDate.getFullYear(), reportMonthDate.getMonth() + 1, 0);
      const periodEndLabel = periodEndDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
      const priorYearPL = window.Store.xeroImportForYearAgo('profitAndLoss', monthKey);
      const priorYearBS = window.Store.xeroImportForYearAgo('balanceSheet', monthKey);
      const fyLabelStr = window.Store.fyLabel(reportMonthDate);

      // Prior calendar month's key/label (Section 1/3's "vs last month").
      const [rmY, rmM] = (monthKey || '').split('-').map(Number);
      const priorMonthDate = (rmY && rmM) ? new Date(rmY, rmM - 2, 1) : null;
      const priorMonthKey = priorMonthDate ? `${priorMonthDate.getFullYear()}-${String(priorMonthDate.getMonth() + 1).padStart(2, '0')}` : null;
      const priorMonthPL = priorMonthKey ? window.Store.xeroImportForMonth('profitAndLoss', priorMonthKey) : null;
      const priorMonthBSum = priorMonthKey ? window.Store.xeroImportForMonth('bankSummary', priorMonthKey) : null;
      const priorMonthCFA = priorMonthKey ? window.Store.xeroImportForMonth('cashFlowActuals', priorMonthKey) : null;
      // July (FY start) snapshot — Section 3's second comparison column.
      const fyStartKey = fyStartKeyForMonthKey(monthKey);
      const julyCFA = fyStartKey ? window.Store.xeroImportForMonth('cashFlowActuals', fyStartKey) : null;
      const julyBSum = fyStartKey ? window.Store.xeroImportForMonth('bankSummary', fyStartKey) : null;

      const pageFooter = (pageNum) => {
        doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(150);
        doc.text(`${COMPANY_NAME} — Management Accounts for the period ending ${periodEndLabel}`, 40, pageH - 24);
        doc.text(`Page ${pageNum} of ${TOTAL_PAGES}`, pageW - 40, pageH - 24, { align: 'right' });
        doc.setTextColor(0);
      };
      const sectionHead = (title, subtitle) => {
        doc.setFontSize(15); doc.setFont(undefined, 'bold');
        doc.text(title, 40, 50);
        doc.setFontSize(10.5); doc.setFont(undefined, 'normal'); doc.setTextColor(90);
        doc.text(subtitle, 40, 64);
        doc.setTextColor(0);
        return 84;
      };
      const noDataLine = (msg, y) => {
        doc.setFontSize(10.5); doc.setFont(undefined, 'normal');
        doc.text(msg, 40, y, { maxWidth: pageW - 80 });
      };
      const twoColHead = (thisLabel, lastLabel) => [['Account', thisLabel, lastLabel]];
      const twoColRow = (r) => [
        r.account,
        r.isHeader ? '' : (r.current == null ? '—' : fmtAUD(r.current, { compact: true })),
        r.isHeader ? '' : (r.prior == null ? 'Not on file' : fmtAUD(r.prior, { compact: true })),
      ];
      const didParseBold = (boldIdx) => (data) => {
        if (data.section === 'body' && boldIdx.includes(data.row.index)) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [238, 243, 255];
        }
      };
      const amt = (v) => (v == null ? '—' : fmtAUD(v, { compact: true }));
      const changeVs = (cur, prev) => {
        if (cur == null || prev == null) return null;
        return cur - prev;
      };

      /* ---- Page 1: cover ---- */
      let y = 140;
      doc.setFontSize(22); doc.setFont(undefined, 'bold'); doc.setTextColor(19, 67, 203);
      doc.text(COMPANY_NAME, pageW / 2, y, { align: 'center' }); doc.setTextColor(0);
      y += 40;
      doc.setFontSize(16); doc.setFont(undefined, 'bold');
      doc.text('Management Accounts', pageW / 2, y, { align: 'center' });
      y += 30;
      doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.setTextColor(90);
      const coverLines = [
        '1. Director\u2019s Summary', '2. Profit and Loss',
        '3. Cash Movement', '4. Balance Sheet',
        '5. Next 1\u20133 Months', '6. Items for Directors',
      ];
      coverLines.forEach((l) => { doc.text(l, pageW / 2, y, { align: 'center' }); y += 18; });
      doc.setTextColor(0);
      y += 26;
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text(`For the period ending: ${periodEndLabel}`, pageW / 2, y, { align: 'center' });
      y += 22;
      doc.setFontSize(10.5); doc.setFont(undefined, 'normal'); doc.setTextColor(120);
      doc.text(`Prepared ${dateLabel} · ${fyLabelStr}${isPreliminary ? ' · Preliminary snapshot' : ' · Reconciled'}`, pageW / 2, y, { align: 'center' });
      doc.setTextColor(0);
      pageFooter(1);

      /* ================================================================
         Section 1 — Short director summary: closing bank balance,
         monthly loss, major cash received, payments needing attention —
         each with the change from last month. ================ */
      doc.addPage();
      y = sectionHead('1. Director\u2019s Summary', `For the month ended ${periodEndLabel} — compared with last month`);
      const curBSumTotals = latestBSum && latestBSum.totals ? latestBSum.totals : null;
      const closingBank = curBSumTotals ? curBSumTotals.totalClosing : (hasBankSummary ? bankTotalClosing : null);
      const priorClosingBank = priorMonthBSum && priorMonthBSum.totals ? priorMonthBSum.totals.totalClosing : null;
      const monthlyCashReceived = curBSumTotals ? curBSumTotals.totalReceived : null;
      const priorCashReceived = priorMonthBSum && priorMonthBSum.totals ? priorMonthBSum.totals.totalReceived : null;
      const plT = latestPL && latestPL.totals ? latestPL.totals : null;
      const monthlyNetResult = plT ? plT.netProfitYTD : null;
      const priorMonthNetResult = priorMonthPL && priorMonthPL.totals ? priorMonthPL.totals.netProfitYTD : null;
      // "Payments needing attention" = amounts owed by Arsela that are
      // overdue (Aged Payables 30+ days) — the real Xero-backed proxy
      // for "needs attention" a director can act on.
      const apOverdueSummary = latestAP && latestAP.totals ? latestAP.totals.overdueTotal : null;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Metric', monthLabel, 'Change vs last month']],
        body: [
          ['Closing bank balance', closingBank != null ? amt(closingBank) : (latestBSum === null ? 'Not imported' : 'Not on file'), changeVs(closingBank, priorClosingBank) != null ? `${changeVs(closingBank, priorClosingBank) >= 0 ? '+' : ''}${amt(changeVs(closingBank, priorClosingBank))}` : '\u2014'],
          ['Net result for the month (P&L)', monthlyNetResult != null ? amt(monthlyNetResult) : 'Not imported', changeVs(monthlyNetResult, priorMonthNetResult) != null ? `${changeVs(monthlyNetResult, priorMonthNetResult) >= 0 ? '+' : ''}${amt(changeVs(monthlyNetResult, priorMonthNetResult))}` : '\u2014'],
          ['Cash received in the month', monthlyCashReceived != null ? amt(monthlyCashReceived) : 'Not imported', changeVs(monthlyCashReceived, priorCashReceived) != null ? `${changeVs(monthlyCashReceived, priorCashReceived) >= 0 ? '+' : ''}${amt(changeVs(monthlyCashReceived, priorCashReceived))}` : '\u2014'],
          ['Payments needing attention (payables 30+ days overdue)', apOverdueSummary != null ? amt(apOverdueSummary) : 'Not imported', '\u2014'],
        ],
        styles: { fontSize: 9.5 }, headStyles: { fillColor: [19, 67, 203], fontSize: 9 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      });
      y = doc.lastAutoTable.finalY + 18;
      doc.setFontSize(11); doc.setFont(undefined, 'bold');
      doc.text('Commentary', 40, y); y += 14;
      doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
      const summaryLines = [];
      if (monthlyNetResult != null) {
        summaryLines.push(monthlyNetResult < 0
          ? `The business recorded a loss of ${amt(Math.abs(monthlyNetResult))} for ${monthLabel}, consistent with its status as a cost centre funded by shareholder/related-party financing rather than trading revenue.`
          : `The business recorded a profit of ${amt(monthlyNetResult)} for ${monthLabel}.`);
      }
      if (closingBank != null && priorClosingBank != null) {
        const delta = closingBank - priorClosingBank;
        summaryLines.push(`The bank balance ${delta >= 0 ? 'increased' : 'decreased'} by ${amt(Math.abs(delta))} during the month to close at ${amt(closingBank)}.`);
      }
      if (apOverdueSummary) {
        summaryLines.push(`${amt(apOverdueSummary)} of payables are 30+ days overdue and require director attention — see Section 6.`);
      }
      if (!summaryLines.length) summaryLines.push('Import Profit & Loss, Bank Summary and Aged Payables from Data Imports to populate this commentary.');
      summaryLines.forEach((l) => { doc.text('\u2022 ' + l, 40, y, { maxWidth: pageW - 80 }); y += 16; });
      pageFooter(2);

      /* ================================================================
         Section 2 — Profit and Loss: this month's result AND FY-to-date,
         vs the same month / YTD last year; major expense movements. */
      doc.addPage();
      y = sectionHead('2. Profit and Loss', `${monthLabel} and ${fyLabelStr} year to date, compared with the same period last year`);
      if (latestPL) {
        const { rows: plRows, boldIdx: plBold } = buildStatementRows(
          latestPL, priorYearPL, ['Revenue', 'Other Income', 'Cost of Sales', 'Operating Expense', 'Other Expense'], 'ytd'
        );
        doc.autoTable({
          startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
          head: twoColHead(`This year to date\n(${latestPL.period})`, `Last year\n(${priorYearPL ? priorYearPL.period : 'not on file'})`),
          body: plRows.map(twoColRow),
          styles: { fontSize: 9 }, headStyles: { fillColor: [19, 67, 203], fontSize: 8.5 },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
          didParseCell: didParseBold(plBold),
        });
        y = doc.lastAutoTable.finalY + 14;
        const t = latestPL.totals || {};
        const pt = (priorYearPL && priorYearPL.totals) || null;
        doc.autoTable({
          startY: y, margin: { left: 40, right: 40 }, theme: 'plain',
          body: [
            ['Gross Profit', amt(t.grossProfitYTD || 0), pt ? amt(pt.grossProfitYTD || 0) : 'Not on file'],
            ['Net Profit / (Loss)', amt(t.netProfitYTD || 0), pt ? amt(pt.netProfitYTD || 0) : 'Not on file'],
          ],
          styles: { fontSize: 10, fontStyle: 'bold', fillColor: [238, 243, 255] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        });
        y = doc.lastAutoTable.finalY + 18;
        // "Explain major expense movements" — the largest month-on-month
        // dollar swings in expense line items, biggest first.
        if (priorMonthPL) {
          const curByAcc = {}; (latestPL.rows || []).forEach((r) => { if (r.classification === 'Operating Expense' || r.classification === 'Other Expense') curByAcc[(r.account || '').trim().toLowerCase()] = { account: r.account, v: Number(r.ytd) || 0 }; });
          const priorByAcc = {}; (priorMonthPL.rows || []).forEach((r) => { priorByAcc[(r.account || '').trim().toLowerCase()] = Number(r.ytd) || 0; });
          const movements = Object.values(curByAcc).map((c) => ({ account: c.account, movement: c.v - (priorByAcc[(c.account || '').trim().toLowerCase()] || 0) }))
            .filter((m) => Math.abs(m.movement) > 0.5).sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement)).slice(0, 5);
          if (movements.length) {
            doc.setFontSize(11); doc.setFont(undefined, 'bold');
            doc.text(`Major expense movements vs ${priorMonthPL.period}`, 40, y); y += 6;
            doc.autoTable({
              startY: y + 6, margin: { left: 40, right: 40 }, theme: 'plain',
              body: movements.map((m) => [m.account, `${m.movement >= 0 ? '+' : ''}${amt(m.movement)}`]),
              styles: { fontSize: 9 }, columnStyles: { 1: { halign: 'right', textColor: [180, 40, 40] } },
            });
            y = doc.lastAutoTable.finalY + 10;
          }
        } else {
          doc.setFontSize(9); doc.setFont(undefined, 'italic'); doc.setTextColor(140);
          doc.text('Import last month\u2019s Profit & Loss to see major expense movements here.', 40, y, { maxWidth: pageW - 80 });
          doc.setTextColor(0); doc.setFont(undefined, 'normal'); y += 16;
        }
      } else {
        noDataLine('No Profit & Loss has been imported for this period — import one from Data Imports to populate this section.', y);
      }
      pageFooter(3);

      /* ================================================================
         Section 3 — Cash movement: opening + received − paid = closing,
         with shareholder/financing funding split from trading revenue
         (Arsela is a cost centre, not a trading business) — vs previous
         month and vs July (FY start). */
      doc.addPage();
      y = sectionHead('3. Cash Movement', `${monthLabel} — compared with the previous month and with ${fyStartKey ? window.Store.fyLabel(reportMonthDate) + ' opening (July)' : 'July'}`);
      if (latestCFA) {
        const cfaT = latestCFA.totals || {};
        const openingCash = curBSumTotals ? curBSumTotals.totalOpening : null;
        const closingCashFig = curBSumTotals ? curBSumTotals.totalClosing : null;
        const receivedFig = curBSumTotals ? curBSumTotals.totalReceived : null;
        const paidFig = curBSumTotals ? curBSumTotals.totalSpent : null;
        doc.autoTable({
          startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
          head: [['', monthLabel, priorMonthPL || priorMonthCFA || priorMonthBSum ? (priorMonthKey || 'Prior month') : 'Prior month', fyStartKey ? 'July (FY open)' : 'July']],
          body: [
            ['Opening bank balance', amt(openingCash), amt(priorMonthBSum && priorMonthBSum.totals ? priorMonthBSum.totals.totalOpening : null), amt(julyBSum && julyBSum.totals ? julyBSum.totals.totalOpening : null)],
            ['Cash received', amt(receivedFig), amt(priorMonthBSum && priorMonthBSum.totals ? priorMonthBSum.totals.totalReceived : null), amt(julyBSum && julyBSum.totals ? julyBSum.totals.totalReceived : null)],
            ['Cash paid', amt(paidFig != null ? -paidFig : null), amt(priorMonthBSum && priorMonthBSum.totals ? -priorMonthBSum.totals.totalSpent : null), amt(julyBSum && julyBSum.totals ? -julyBSum.totals.totalSpent : null)],
            ['Closing bank balance', amt(closingCashFig), amt(priorMonthBSum && priorMonthBSum.totals ? priorMonthBSum.totals.totalClosing : null), amt(julyBSum && julyBSum.totals ? julyBSum.totals.totalClosing : null)],
          ],
          styles: { fontSize: 9.5 }, headStyles: { fillColor: [19, 67, 203], fontSize: 8.5 },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
          didParseCell: (data) => { if (data.section === 'body' && data.row.index === 3) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [238, 243, 255]; } },
        });
        y = doc.lastAutoTable.finalY + 20;
        // Financing (shareholder funding) vs Operating — kept as
        // SEPARATE lines, never merged, per the client's explicit
        // instruction that Arsela is a cost centre so shareholder
        // funding must not be conflated with trading revenue.
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.text('Source of funds — shareholder financing vs trading activity', 40, y); y += 6;
        const financingNow = cfaT.netFinancingYTD || 0;
        const operatingNow = cfaT.netOperatingYTD || 0;
        const priorFinancing = priorMonthCFA && priorMonthCFA.totals ? priorMonthCFA.totals.netFinancingYTD || 0 : null;
        const julyFinancing = julyCFA && julyCFA.totals ? julyCFA.totals.netFinancingYTD || 0 : null;
        doc.autoTable({
          startY: y + 6, margin: { left: 40, right: 40 }, theme: 'grid',
          head: [['Activity', monthLabel, priorMonthKey || 'Prior month', 'July (FY open)']],
          body: [
            ['Net financing activities (shareholder loans / funding)', amt(financingNow), amt(priorFinancing), amt(julyFinancing)],
            ['Net operating activities (trading cash flow)', amt(operatingNow), amt(priorMonthCFA && priorMonthCFA.totals ? priorMonthCFA.totals.netOperatingYTD || 0 : null), amt(julyCFA && julyCFA.totals ? julyCFA.totals.netOperatingYTD || 0 : null)],
          ],
          styles: { fontSize: 9.5 }, headStyles: { fillColor: [19, 67, 203], fontSize: 8.5 },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        });
        y = doc.lastAutoTable.finalY + 16;
        doc.setFontSize(9.5); doc.setFont(undefined, 'italic'); doc.setTextColor(120);
        doc.text(`Arsela is a cost centre: its cash inflow is funded by shareholder loans/financing (${amt(financingNow)} this month), not by trading revenue. This is expected and should not be read as a sign of financial distress on its own.`, 40, y, { maxWidth: pageW - 80 });
        doc.setTextColor(0); doc.setFont(undefined, 'normal');
      } else {
        noDataLine('No Statement of Cash Flows / Cash Summary has been imported for this period — import one from Data Imports to populate this section.', y);
      }
      pageFooter(4);

      /* ================================================================
         Section 4 — Balance Sheet: cash, amounts owed to Arsela, unpaid
         obligations, shareholder loans and equity — this month-end vs
         30 June (prior FY year-end), as Xero shows it. */
      doc.addPage();
      const juneKey = `${(fyStartKey || monthKey || '').split('-')[0]}-06`;
      const juneBS = window.Store.xeroImportForMonth('balanceSheet', juneKey);
      y = sectionHead('4. Balance Sheet', `As at ${periodEndLabel} — compared with 30 June ${juneKey.split('-')[0]} (start of financial year)`);
      if (latestBS) {
        const { rows: bsRows, boldIdx: bsBold } = buildStatementRows(
          latestBS, juneBS || priorYearBS, ['Asset', 'Liability', 'Equity'], 'current'
        );
        doc.autoTable({
          startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
          head: twoColHead(`As at ${latestBS.period}`, `As at ${juneBS ? juneBS.period : (priorYearBS ? priorYearBS.period + ' (last year)' : 'not on file')}`),
          body: bsRows.map(twoColRow),
          styles: { fontSize: 9 }, headStyles: { fillColor: [19, 67, 203], fontSize: 8.5 },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
          didParseCell: didParseBold(bsBold),
        });
        y = doc.lastAutoTable.finalY + 16;
        // Directors care most about four figures on this statement —
        // called out explicitly per the client's spec wording.
        const findRow = (re) => (latestBS.rows || []).find((r) => re.test((r.account || '')));
        const shareholderLoan = findRow(/shareholder/i);
        const cashRow = (latestBS.rows || []).filter((r) => /bank|cash/i.test(r.account || '')).reduce((a, r) => a + (Number(r.current) || 0), 0);
        const owedToArsela = (latestBS.rows || []).filter((r) => /loan to /i.test(r.account || '')).reduce((a, r) => a + (Number(r.current) || 0), 0);
        const unpaidObligations = (latestBS.rows || []).filter((r) => r.classification === 'Liability' && /payable|payg|gst/i.test(r.account || '')).reduce((a, r) => a + (Number(r.current) || 0), 0);
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.text('Key balances for directors', 40, y); y += 6;
        doc.autoTable({
          startY: y + 6, margin: { left: 40, right: 40 }, theme: 'plain',
          body: [
            ['Cash at bank', amt(cashRow)],
            ['Amounts owed TO Arsela (related-party loans receivable)', amt(owedToArsela)],
            ['Unpaid obligations (PAYG / super / wages / GST payable)', amt(unpaidObligations)],
            ['Shareholder loan (owed BY Arsela)', shareholderLoan ? amt(Number(shareholderLoan.current) || 0) : 'Not on file'],
          ],
          styles: { fontSize: 9.5 }, columnStyles: { 1: { halign: 'right' } },
        });
      } else {
        noDataLine('No Balance Sheet has been imported for this period — import one from Data Imports to populate this section.', y);
      }
      pageFooter(5);

      /* ================================================================
         Section 5 — Next 1–3 months: expected receipts, payroll/tax/
         super/other committed payments, funding gap; forecast vs
         available cash. */
      doc.addPage();
      y = sectionHead('5. Next 1\u20133 Months', 'Expected cash receipts and committed payments, forecast against available cash');
      const availableCash = closingBank != null ? closingBank : (hasBankSummary ? bankTotalClosing : null);
      const expectedReceipts = arOutstanding;
      const payrollMonthly = plT && plT.totalExpenseYTD ? null : null; // no direct payroll-only breakout available
      const wagesLine = latestPL ? (latestPL.rows || []).find((r) => /wages|salaries/i.test(r.account || '')) : null;
      const superLine = latestPL ? (latestPL.rows || []).find((r) => /superannuation/i.test(r.account || '')) : null;
      const monthlyWages = wagesLine ? Number(wagesLine.ytd) || 0 : null;
      const monthlySuper = superLine ? Number(superLine.ytd) || 0 : null;
      const monthlyOtherCommitted = apOutstanding;
      const totalCommittedNext = [monthlyWages, monthlySuper, monthlyOtherCommitted].some((v) => v != null)
        ? [monthlyWages, monthlySuper, monthlyOtherCommitted].reduce((a, v) => a + (v || 0), 0) * 3
        : null;
      const fundingGap = (availableCash != null && totalCommittedNext != null)
        ? (availableCash + (expectedReceipts || 0)) - totalCommittedNext
        : null;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Item', 'Basis', 'Next ~3 months (AUD)']],
        body: [
          ['Available cash today', closingBank != null ? `Bank Summary (${latestBSum ? latestBSum.period : monthLabel})` : 'Not imported', amt(availableCash)],
          ['Expected cash receipts', arOutstanding != null ? `Aged Receivables (${latestAR ? latestAR.period : monthLabel})` : (isCostCentre ? arApNotApplicableLabel : 'Not imported'), amt(expectedReceipts)],
          ['Payroll (est., 3 \u00d7 latest month)', monthlyWages != null ? `Latest P&L wages line \u00d7 3` : 'Not imported', monthlyWages != null ? amt(monthlyWages * 3) : 'Not imported'],
          ['Superannuation (est., 3 \u00d7 latest month)', monthlySuper != null ? 'Latest P&L super line \u00d7 3' : 'Not imported', monthlySuper != null ? amt(monthlySuper * 3) : 'Not imported'],
          ['Other committed payments (payables outstanding)', apOutstanding != null ? `Aged Payables (${latestAP ? latestAP.period : monthLabel})` : (isCostCentre ? arApNotApplicableLabel : 'Not imported'), amt(monthlyOtherCommitted)],
        ],
        styles: { fontSize: 9 }, headStyles: { fillColor: [19, 67, 203], fontSize: 8.5 },
        columnStyles: { 2: { halign: 'right' } },
      });
      y = doc.lastAutoTable.finalY + 18;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'plain',
        body: [['Projected funding gap / (surplus) over the next ~3 months', fundingGap != null ? amt(-fundingGap) : 'Not answerable \u2014 import Bank Summary, Aged Receivables/Payables and Profit & Loss to calculate']],
        styles: { fontSize: 10.5, fontStyle: 'bold', fillColor: fundingGap != null && fundingGap < 0 ? [255, 235, 235] : [238, 243, 255] },
        columnStyles: { 1: { halign: 'right' } },
      });
      y = doc.lastAutoTable.finalY + 16;
      doc.setFontSize(9); doc.setFont(undefined, 'italic'); doc.setTextColor(130);
      doc.text('Payroll/super figures are a simple 3\u00d7-latest-month estimate, not a payroll-system forecast \u2014 treat as indicative. Given Arsela is a cost centre, any shortfall above is expected to be met by further shareholder funding rather than trading income.', 40, y, { maxWidth: pageW - 80 });
      doc.setTextColor(0); doc.setFont(undefined, 'normal');
      pageFooter(6);

      /* ================================================================
         Section 6 — Items for directors: decisions needed, overdue
         payments, missing records and reconciliation issues; status
         since last report. */
      doc.addPage();
      y = sectionHead('6. Items for Directors', 'Decisions needed, overdue items and data gaps \u2014 status since last report');
      const items = [];
      if (apOverdueSummary) items.push({ label: 'Overdue payables (30+ days)', detail: `${amt(apOverdueSummary)} owing \u2014 review supplier payment priorities.`, tone: 'danger' });
      if (latestAP && latestAP.totals && latestAP.totals.d90plus) items.push({ label: 'Severely overdue payables (90+ days)', detail: `${amt(latestAP.totals.d90plus)} outstanding 90+ days \u2014 needs urgent decision.`, tone: 'danger' });
      if (brTotals && brTotals.unreconciledCount) items.push({ label: 'Unreconciled bank items', detail: `${brTotals.unreconciledCount} item(s) per the latest Bank Reconciliation (${latestBR.period}) \u2014 difference of ${amt(brTotals.difference)}.`, tone: 'warning' });
      if (unpostedExpenses.length) items.push({ label: 'Approved expenses not yet posted in Xero', detail: `${unpostedExpenses.length} expense(s) approved but not posted \u2014 follow up with Finance.`, tone: 'warning' });
      if (xeroMissing.length) items.push({ label: 'Missing records', detail: `Not yet imported this period: ${xeroMissing.map((t) => t.label).join(', ')}.`, tone: 'neutral' });
      if (anyCarriedForward) items.push({ label: 'Carried-forward figures', detail: 'One or more sections above use the most recent prior snapshot on file rather than an exact match for this month \u2014 confirm before distributing externally.', tone: 'neutral' });
      if (!hasBankSummary) items.push({ label: 'Bank Summary not imported', detail: 'Closing bank balance in Section 1/3 could not be confirmed against Xero\u2019s own Bank Summary report.', tone: 'neutral' });
      if (!items.length) items.push({ label: 'No open items identified', detail: 'All available Xero reports for this period reconcile with no overdue or missing items detected.', tone: 'success' });
      const toneColor = { danger: [178, 34, 34], warning: [180, 120, 0], neutral: [90, 90, 90], success: [22, 130, 80] };
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Item', 'Detail']],
        body: items.map((i) => [i.label, i.detail]),
        styles: { fontSize: 9.5, cellPadding: 6 }, headStyles: { fillColor: [19, 67, 203], fontSize: 9 },
        columnStyles: { 0: { cellWidth: 150, fontStyle: 'bold' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const tone = items[data.row.index] ? items[data.row.index].tone : 'neutral';
            data.cell.styles.textColor = toneColor[tone] || toneColor.neutral;
          }
        },
      });
      pageFooter(7);

      const pdfFileName = `${COMPANY_NAME.replace(/[^A-Za-z0-9]+/g, '-')}-Management-Accounts-${monthLabel.replace(/\s+/g, '-')}.pdf`;
      if (mode === 'download') {
        doc.save(pdfFileName);
        window.Store.toast('7-page Management Accounts PDF exported', 'success');
      } else {
        // Preview mode: show the rendered PDF in-app first — the
        // director must be able to review every page before a file
        // ever hits their downloads folder.
        const blobUrl = doc.output('bloburl');
        setMgmtPdfPreview({ url: blobUrl, fileName: pdfFileName });
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div className="arsela-h1" style={{ fontSize: 20, letterSpacing: -0.3, display: 'flex', alignItems: 'center', gap: 10 }}>Monthly Director's Report — {monthLabel}{!isCurrentMonth && <ArsBadge tone="neutral" size="sm">Viewing past month</ArsBadge>}</div>
            <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Auto-compiled from live budget, approvals, CAPEX and cash flow data · prepared {dateLabel} · {FY_PERIOD_LABEL}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={exportCSV}>Export CSV</ArsButton>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={exportPDF}>Export PDF (summary)</ArsButton>
            <ArsButton size="md" icon={<IconFile size={15}/>} onClick={() => exportManagementAccountsPDF('preview')}>Management Accounts PDF</ArsButton>
          </div>
        </div>

        {/* ---- Month-selector context banner (client ask, 2026-09-21):
            "director report - should be able to select by month". Only
            the Xero-import-backed sections below (three questions, Xero
            control checks, ledger activity) actually change with the
            month picker in the top bar — Budgets/Approvals/CAPEX/Cash
            Flow have no per-month history in their data model and
            always show the current live position, so that split is
            called out explicitly here to avoid any ambiguity. ---- */}
        {!isCurrentMonth && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, marginBottom: 20,
            background: '#EEF3FF', border: '1px solid #D6E1FF',
          }}>
            <ArsBadge tone="neutral" dot size="sm">Historical view</ArsBadge>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>
                Viewing Xero data for {monthLabel}{anyCarriedForward ? ' (some figures carried forward from the last import before this month)' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
                The three questions, Xero control checks and ledger activity below reflect {monthLabel}. Budgets, approvals, CAPEX and cash flow sections always show the current live position — those have no month-by-month history yet.
              </div>
            </div>
          </div>
        )}

        <div onClick={() => window.Router.go('/reconciliations')} title="Click to open the Reconciliations module" style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', marginBottom: 20,
          background: isPreliminary ? 'var(--arsela-warning-50)' : 'var(--arsela-success-50)',
          border: '1px solid ' + (isPreliminary ? 'var(--arsela-warning)' : 'var(--arsela-success)'),
        }}>
          <ArsBadge tone={isPreliminary ? 'warning' : 'success'} dot size="sm">{isPreliminary ? 'Preliminary' : 'Reconciled'}</ArsBadge>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>
              {isPreliminary ? `Preliminary snapshot as at ${dateLabel} — not a closed-period report` : `Reconciled report for ${FY_PERIOD_LABEL}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
              Xero actuals reconciled through {latestActualsThrough || 'n/a'} · {unreconciledBudgets.length} of {budgets.length} budget line(s) pending reconciliation
              {brTotals && <> · {bankUnreconciledCount} bank item(s) unreconciled ({latestBR.period})</>} · {unpostedExpenses.length} approved expense(s) not yet posted in Xero.
            </div>
          </div>
        </div>

        {/* ---- Xero import sync/completeness banner (client ask,
            2026-08-26): "make sure it is recorded in all menu/panel,
            sync automatically" — every report imported via Data
            Imports flows into this screen automatically (no manual
            re-entry), but a report that has never been imported still
            cannot show real figures. This banner makes that visible
            and links straight to the hub for whatever is missing. ---- */}
        <div onClick={() => window.Router.go('/dataimports')} title="Click to open Data Imports" style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', marginBottom: 20,
          background: xeroImportedCount === xeroTypeList.length ? 'var(--arsela-success-50)' : '#EEF3FF',
          border: '1px solid ' + (xeroImportedCount === xeroTypeList.length ? 'var(--arsela-success)' : '#D6E1FF'),
        }}>
          <ArsBadge tone={xeroImportedCount === xeroTypeList.length ? 'success' : 'neutral'} dot size="sm">Xero sync</ArsBadge>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>
              {xeroImportedCount} of {xeroTypeList.length} Xero report types imported and reflected below
            </div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
              {xeroMissing.length === 0
                ? 'Every Xero report type has been imported at least once — all sections below are live.'
                : `Not yet imported: ${xeroMissing.map((t) => t.label).join(', ')}. Import from Data Imports to populate the matching section(s) here.`}
            </div>
          </div>
        </div>

        <ArsCard style={{ marginBottom: 20 }}>
          <ArsSectionHeader title="Executive summary" subtitle={hasBudgets ? `All figures below are labelled by basis — Actual = reconciled Xero data only` : `No Budgets module entries yet — figures below are sourced directly from the latest imported Xero reports instead`}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Xero actuals (reconciled)</div>
              {xeroActualsBasis != null ? (
                <>
                  {/* 2026-08-30: real Xero figures are AUD and must use
                      fmtAUD (no conversion) — fmtMYR would silently shrink
                      them by the MYR->AUD display rate. hasBudgets=true
                      keeps fmtMYR since that basis is the internal Budget
                      module (MYR-denominated). */}
                  <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{hasBudgets ? fmtMYR(xeroActualsBasis, { compact: true }) : fmtAUD(xeroActualsBasis, { compact: true })}</div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{xeroActualsSourceLabel}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not answerable yet</ArsBadge>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Add budgets or import a Profit &amp; Loss.</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Open commitments</div>
              {openCommitmentsBasis != null ? (
                <>
                  <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{hasBudgets ? fmtMYR(openCommitmentsBasis, { compact: true }) : fmtAUD(openCommitmentsBasis, { compact: true })}</div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{openCommitmentsSourceLabel}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not answerable yet</ArsBadge>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Add budgets or import Aged Payables.</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Actual + commitments</div>
              {actualPlusCommitmentsBasis != null ? (
                <>
                  <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{hasBudgets ? fmtMYR(actualPlusCommitmentsBasis, { compact: true }) : fmtAUD(actualPlusCommitmentsBasis, { compact: true })}</div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{hasBudgets ? `vs ${fmtMYR(totalAllocated, { compact: true })} allocated` : 'Xero actuals + payables (no budget plan to compare against)'}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not answerable yet</ArsBadge>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Add budgets or import P&amp;L / Aged Payables.</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Forecast final cost</div>
              {forecastFinalBasis != null ? (
                <>
                  <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: hasBudgets && totalForecastFinal > totalAllocated ? 'var(--danger)' : 'var(--arsela-navy)', marginTop: 6 }}>{hasBudgets ? fmtMYR(forecastFinalBasis, { compact: true }) : fmtAUD(forecastFinalBasis, { compact: true })}</div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{forecastFinalSourceLabel}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Hidden</ArsBadge>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>{forecastFinalHiddenReason}</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, paddingTop: 14, borderTop: '1px solid var(--arsela-border)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Actual vs budget-to-date</div>
              {varianceToDateBasis != null ? (
                <div className="arsela-num" style={{ fontSize: 20, fontWeight: 700, color: varianceToDateBasis > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 6 }}>{varianceToDateBasis >= 0 ? '+' : '−'}{hasBudgets ? fmtMYR(Math.abs(varianceToDateBasis), { compact: true }) : fmtAUD(Math.abs(varianceToDateBasis), { compact: true })}</div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">No plan to compare</ArsBadge>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Add budgets to see a plan-vs-actual variance here.</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Pending approvals</div>
              <div className="arsela-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{pendingApprovals.length}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--arsela-text-muted)' }}> ({fmtMYR(pendingApprovalValue, { compact: true })})</span></div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Cash flow scenario</div>
              <div className="arsela-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{activeScenario.n || 'Base case'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Reconciliation status</div>
              <div className="arsela-num" style={{ fontSize: 16, fontWeight: 700, color: combinedPendingCount === 0 ? 'var(--success)' : 'var(--warning)', marginTop: 6 }}>{combinedReconLabel}</div>
            </div>
          </div>
        </ArsCard>

        {/* ---- The three questions the director's report must answer
            (client ask, 2026-08-19): where the money is coming from, do
            we have enough to cover expenses, and are we solvent. Each
            card pulls from the latest imported Xero report where one
            exists, and shows an honest "import to see this" empty state
            otherwise — never a fabricated number. ---- */}
        <ArsCard style={{ marginBottom: 20 }}>
          <ArsSectionHeader title="The three questions this report must answer" subtitle="Money source · expense coverage · solvency — each backed by the latest imported Xero report"/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

            {/* Q1 — where's the money coming from. Client feedback
                (2026-08-30): for a cost-centre entity, revenue alone
                is the wrong lens — this now also surfaces financing
                inflows (shareholder/parent injections, intercompany
                funding, loans drawn) from the imported Cash Flow
                Actuals report, kept as a clearly separate line from
                trading revenue. */}
            <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to import or review Profit &amp; Loss / Cash Flow Actuals">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Where's the money coming from?</div>
              {hasMoneySourceData ? (
                <>
                  <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)', marginTop: 6 }}>{fmtAUD(totalMoneyInYTD, { compact: true })}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
                    {isCostCentreFunded ? 'Total funding (YTD) — funded by financing, not trading revenue' : 'Total revenue + financing inflows (YTD)'}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Trading revenue{latestPL ? ` (${latestPL.period})` : ''}</span>
                      <span className="arsela-num" style={{ fontWeight: 700, flexShrink: 0, color: 'var(--arsela-navy)' }}>{latestPL ? fmtAUD(totalRevenueYTD, { compact: true }) : 'Not imported'}</span>
                    </div>
                    {revenueBySource.slice(0, 2).map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, paddingLeft: 10 }}>
                        <span style={{ color: 'var(--arsela-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{r.account}</span>
                        <span className="arsela-num" style={{ flexShrink: 0, color: 'var(--arsela-text-muted)' }}>{fmtAUD(r.ytd, { compact: true })}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 6, borderTop: '1px solid var(--arsela-border)' }}>
                      <span style={{ color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Financing inflows{hasFinancingData ? ` (${latestCFA.period})` : ''}</span>
                      <span className="arsela-num" style={{ fontWeight: 700, flexShrink: 0, color: 'var(--arsela-navy)' }}>{hasFinancingData ? fmtAUD(totalFinancingInflowYTD, { compact: true }) : 'Not imported'}</span>
                    </div>
                    {financingInflowLines.slice(0, 2).map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, paddingLeft: 10 }}>
                        <span style={{ color: 'var(--arsela-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{r.description}</span>
                        <span className="arsela-num" style={{ flexShrink: 0, color: 'var(--arsela-text-muted)' }}>{fmtAUD(r.amount, { compact: true })}</span>
                      </div>
                    ))}
                    {hasFinancingData && financingInflowLines.length === 0 && <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', paddingLeft: 10 }}>No financing inflow lines in the imported Cash Flow Actuals.</div>}
                    {!latestPL && !hasFinancingData && <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>No revenue lines found and no financing data imported.</div>}
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not answerable yet</ArsBadge>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Import a Profit &amp; Loss (trading revenue) and/or Cash Flow Actuals (financing inflows — shareholder/parent funding, loans) from Xero to see where the money is coming from.</div>
                </div>
              )}
            </div>

            {/* Q2 — do we have enough to cover our expenses. Item 6 fix:
                now a DATED 13-week cash projection (opening cash +
                confirmed funding vs payroll/super/payables due),
                showing the projected low point and, if it goes
                negative, the exact date — not a single point-in-time
                balance check. */}
            <div onClick={() => window.Router.go(fundingGapProjection ? '/dataimports' : '/cashflow')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to review the underlying data">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Enough to cover our expenses?</div>
              {canCoverExpenses != null ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, color: canCoverExpenses ? 'var(--success)' : 'var(--danger)', marginTop: 6 }}>
                    {canCoverExpenses ? 'Yes — covered over next 13 weeks' : 'At risk — funding gap ahead'}
                  </div>
                  {fundingGapProjection ? (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Cash today ({asAtLabel(latestBSum)})</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtAUD(fundingGapProjection.openingCash, { compact: true })}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Payables due now (Aged Payables)</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{latestAP ? fmtAUD(fundingGapProjection.apDueNow, { compact: true }) : (isCostCentre ? arApNotApplicableLabel : 'Not imported')}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Est. weekly payroll + super</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fundingGapProjection.hasPayrollData ? fmtAUD(fundingGapProjection.weeklyPayroll + fundingGapProjection.weeklySuper, { compact: true }) : 'Not imported'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--arsela-border)' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Projected low point (next 13 wks)</span><span className="arsela-num" style={{ fontWeight: 700, color: fundingGapProjection.lowPoint >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtAUD(fundingGapProjection.lowPoint, { compact: true })}</span></div>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>
                        {fundingGapProjection.shortfallDate
                          ? `Cash is projected to run short around ${fundingGapProjection.shortfallDate}.`
                          : `Projected low point around ${fundingGapProjection.lowPointDate}.`}
                        {!fundingGapProjection.hasPayrollData && ' Payroll/super estimate not available — import a Profit & Loss to refine this.'}
                        {!latestAR && (isCostCentre ? ' Aged Receivables not applicable (cost centre) — confirmed funding tracked via shareholder/group loans instead.' : ' No Aged Receivables imported — confirmed funding not included.')}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Based on the budget-derived cash flow model (no Bank Summary imported yet). Minimum projected balance {cf ? curLabel(cf.minCash) : '—'}.</div>
                  )}
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not answerable yet</ArsBadge>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Import a Bank Summary (cash on hand) and Profit &amp; Loss (payroll/super) to see a dated funding-gap projection here.</div>
                </div>
              )}
            </div>

            {/* Q3 — are we solvent */}
            <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to import or review the Balance Sheet">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Are we solvent?</div>
              {bsTotals ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, color: realSolvent ? 'var(--success)' : 'var(--danger)', marginTop: 6 }}>
                    {realSolvent ? 'Solvent' : 'Insolvent — liabilities exceed assets'}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Total assets</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtAUD(bsTotals.totalAssets, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Total liabilities</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtAUD(bsTotals.totalLiabilities, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--arsela-border)' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Working capital</span><span className="arsela-num" style={{ fontWeight: 700, color: workingCapital >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtAUD(workingCapital, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Current ratio</span><span className="arsela-num" style={{ fontWeight: 700, color: currentRatio >= 1 ? 'var(--success)' : 'var(--danger)' }}>{currentRatio != null ? currentRatio.toFixed(2) + 'x' : '—'}</span></div>
                  </div>
                  {/* Item 2 fix: flags carried-forward Balance Sheet
                      data explicitly instead of just naming the period. */}
                  <div style={{ fontSize: 10.5, color: asAtTone(latestBS), fontWeight: latestBS.isExactMonth === false ? 700 : 400, marginTop: 8 }}>Balance Sheet {asAtLabel(latestBS)}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone={solvent ? 'warning' : 'danger'} size="sm">{solvent ? 'Proxy only — not confirmed' : 'At risk (proxy)'}</ArsBadge>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>No Balance Sheet imported yet — showing the cash-runway proxy only ({!solvent ? 'projected balance may go negative' : withinRunwayThreshold ? 'within comfort threshold' : 'below comfort threshold'}). Import a Balance Sheet for a real assets-vs-liabilities answer.</div>
                </div>
              )}
            </div>
          </div>
        </ArsCard>

        {/* ---- Xero control checks (client ask, 2026-08-26): Trial
            Balance, Bank Reconciliation, Bank Summary and General
            Ledger/Account Transactions activity — the five report
            types that previously had NO Director's Report presence at
            all despite being fully importable in Data Imports. ---- */}
        <ArsCard style={{ marginBottom: 20 }}>
          <ArsSectionHeader title="Xero control checks" subtitle="Trial Balance · Bank Reconciliation · Bank Summary · ledger activity — each from the latest import"/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>

            {/* Trial Balance control check */}
            <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to import or review the Trial Balance">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Trial Balance</div>
              {tbTotals ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: tbTotals.balanced ? 'var(--success)' : 'var(--danger)', marginTop: 6 }}>
                    {tbTotals.balanced ? 'Balanced' : 'Out of balance'}
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Debit</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtAUD(tbTotals.totalDebit, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Credit</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtAUD(tbTotals.totalCredit, { compact: true })}</span></div>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 8 }}>{latestTB.period}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not imported</ArsBadge>
                  <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Import a Trial Balance to confirm ApexFin agrees with Xero.</div>
                </div>
              )}
            </div>

            {/* Bank Reconciliation status */}
            <div onClick={() => window.Router.go(brTotals ? '/reconciliations' : '/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to open Reconciliations">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Bank Reconciliation</div>
              {brTotals ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: brTotals.unreconciledCount === 0 ? 'var(--success)' : 'var(--warning)', marginTop: 6 }}>
                    {brTotals.unreconciledCount === 0 ? 'Fully reconciled' : `${brTotals.unreconciledCount} unreconciled`}
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Xero balance</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtAUD(brTotals.xeroBalance, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Difference</span><span className="arsela-num" style={{ fontWeight: 700, color: Math.abs(brTotals.difference) < 1 ? 'var(--success)' : 'var(--danger)' }}>{fmtAUD(brTotals.difference, { compact: true })}</span></div>
                  </div>
                  {/* Item 2 fix: explicit "as at" date on this figure,
                      flagged if it's a carried-forward (non-exact-month)
                      snapshot rather than an exact match for the month
                      selected in the report header \u2014 this is the exact
                      "bank reconciliation is dated 22 July" scenario the
                      director flagged when viewing a September report. */}
                  <div style={{ fontSize: 10.5, color: asAtTone(latestBR), fontWeight: latestBR.isExactMonth === false ? 700 : 400, marginTop: 8 }}>{asAtLabel(latestBR)}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not imported</ArsBadge>
                  <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Import a Bank Reconciliation report to confirm the bank account balance.</div>
                </div>
              )}
            </div>

            {/* Bank Summary */}
            <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to import or review the Bank Summary">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Bank Summary</div>
              {latestBSum && latestBSum.totals ? (
                <>
                  <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtAUD(latestBSum.totals.totalClosing, { compact: true })}</div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Total closing balance · {latestBSum.totals.accountCount} account(s)</div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Cash received</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--success)' }}>{fmtAUD(latestBSum.totals.totalReceived, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Cash spent</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmtAUD(latestBSum.totals.totalSpent, { compact: true })}</span></div>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 8 }}>{latestBSum.period}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not imported</ArsBadge>
                  <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Import a Bank Summary for the real cash position (used in Q2 above).</div>
                </div>
              )}
            </div>

            {/* General Ledger / Account Transactions activity */}
            <div onClick={() => window.Router.go(latestGL ? '/reconciliations' : '/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to review ledger activity">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{ledgerLabel || 'Ledger activity'}</div>
              {ledgerTotals ? (
                <>
                  <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{ledgerTotals.rowCount} lines</div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{ledgerTotals.accountCount} account(s) touched</div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Total debit</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtAUD(ledgerTotals.totalDebit, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Total credit</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtAUD(ledgerTotals.totalCredit, { compact: true })}</span></div>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 8 }}>{ledgerSource.period}</div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not imported</ArsBadge>
                  <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Import General Ledger Detail or Account Transactions for transaction-level activity.</div>
                </div>
              )}
            </div>
          </div>
        </ArsCard>

        <MonthlyTrendSection/>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 20 }}>
          <ArsCard padded={false}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--arsela-border)' }}>
              <ArsSectionHeader title="Department budget performance" subtitle="Click a row to open that department's budget"/>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--arsela-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    <th style={{ padding: '8px 20px' }}>Department</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actual (recon.)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>+ Committed</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Fcst variance</th>
                    <th style={{ padding: '8px 20px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deptRows.map((d) => (
                    <tr key={d.dept} onClick={() => window.Router.go('/budgets')} style={{ cursor: 'pointer', borderTop: '1px solid var(--arsela-border)' }}>
                      <td style={{ padding: '10px 20px', fontWeight: 600, color: 'var(--arsela-navy)' }}>
                        {d.dept}
                        {d.isTimingGap && <div style={{ fontSize: 10.5, color: 'var(--warning)', fontWeight: 600 }}>Timing gap, not underspend</div>}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }} className="arsela-num">{fmtMYR(d.spent, { compact: true })}<div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', fontWeight: 500 }}>of {fmtMYR(d.budgetToDateDept, { compact: true })} to date</div></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }} className="arsela-num">{fmtMYR(d.actualPlusCommitted, { compact: true })}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: d.forecastVariance > 0 ? 'var(--danger)' : 'var(--success)' }} className="arsela-num">{d.forecastVariance >= 0 ? '+' : '−'}{fmtMYR(Math.abs(d.forecastVariance), { compact: true })}</td>
                      <td style={{ padding: '10px 20px', fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>{d.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ArsCard>

          <ArsCard onClick={() => window.Router.go('/cashflow')} style={{ cursor: 'pointer' }} title="Click to open Cash Flow Planning">
            <ArsSectionHeader title="Cash flow position" subtitle={`${FY_PERIOD_LABEL} · ${activeScenario.n || 'Base case'}`}/>
            {cf && cf.hasData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Closing cash</div>
                  <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 4 }}>{curLabel(cf.closingCash)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Runway</div>
                    <div className="arsela-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>{cf.runwayMonths || '—'} mo</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Monthly burn</div>
                    <div className="arsela-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--arsela-navy)' }}>{curLabel(cf.monthlyBurn)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 10, borderTop: '1px solid var(--arsela-border)' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Min. projected balance</div>
                    <div className="arsela-num" style={{ fontSize: 14, fontWeight: 700, color: cf.minCash < 60 ? 'var(--danger)' : 'var(--arsela-navy)' }}>{curLabel(cf.minCash)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Solvency status</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: !solvent ? 'var(--danger)' : !withinRunwayThreshold ? 'var(--warning)' : 'var(--success)' }}>{!solvent ? 'At risk' : !withinRunwayThreshold ? 'Below threshold' : 'Solvent'}</div>
                  </div>
                </div>
                {activeScenario.n && (
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', lineHeight: 1.45, paddingTop: 10, borderTop: '1px solid var(--arsela-border)' }}>{activeScenario.note}</div>
                )}
              </div>
            ) : <ArsEmpty icon={<IconChart size={20}/>} title="No cash flow data yet" body="Add budgets or CAPEX projects to see a cash flow projection here."/>}
          </ArsCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <ArsCard onClick={() => window.Router.go('/cashflow')} style={{ cursor: 'pointer' }} title="Next 13 weeks, from the Cash Flow module's forecast series">
            <ArsSectionHeader title="Next 13-week cash view" subtitle="Payments/receivables due, from current forecast"/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Forecast inflow</div>
                <div className="arsela-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>{curLabel(next13WeekInflow)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Forecast outflow</div>
                <div className="arsela-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)' }}>{curLabel(next13WeekOutflow)}</div>
              </div>
            </div>
          </ArsCard>
          <ArsCard>
            <ArsSectionHeader title="Solvency & funding" subtitle="Basis: minimum projected cash balance across the forecast"/>
            <div style={{ fontSize: 13, fontWeight: 700, color: !solvent ? 'var(--danger)' : !withinRunwayThreshold ? 'var(--warning)' : 'var(--success)' }}>
              {!solvent ? 'At risk — projected balance may go negative' : !withinRunwayThreshold ? 'Solvent, below comfort threshold' : 'Solvent — within comfort threshold'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Lowest forecast balance {cf ? curLabel(cf.minCash) : '—'}{cf && CF_MONTHS && cf.minCashMonthIdx != null ? ` in ${CF_MONTHS[cf.minCashMonthIdx]}` : ''}.</div>
          </ArsCard>
          <ArsCard onClick={() => window.Router.go('/dataimports')} style={{ cursor: xeroMissing.length ? 'pointer' : 'default' }} title={xeroMissing.length ? 'Click to open Data Imports' : undefined}>
            <ArsSectionHeader title="Data limitations" subtitle="What this report does not yet cover"/>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', lineHeight: 1.5 }}>
              {unreconciledBudgets.length} budget line(s) pending reconciliation to Xero{brTotals && <> · {bankUnreconciledCount} bank item(s) unreconciled per {latestBR.period}</>}. {unpostedExpenses.length} approved expense(s) not yet posted in Xero. Figures beyond {latestActualsThrough || 'the reconciled-through date'} are forecasts, not actuals.
              {xeroMissing.length > 0 && <> Not yet imported from Xero: {xeroMissing.map((t) => t.label).join(', ')} — sections above relying on these show a proxy or empty state until imported.</>}
            </div>
          </ArsCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ArsCard onClick={() => window.Router.go('/capex')} style={{ cursor: 'pointer' }} title="Click to open CAPEX">
            <ArsSectionHeader title="CAPEX programme" subtitle={`${capexProjects.length} active projects`}/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Approved</div>
                <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(capexApproved, { compact: true })}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Committed</div>
                <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(capexCommitted, { compact: true })}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>Spent</div>
                <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(capexSpent, { compact: true })}</div>
              </div>
            </div>
          </ArsCard>

          <ArsCard onClick={() => window.Router.go('/approvals')} style={{ cursor: 'pointer' }} title="Click to open Approvals">
            <ArsSectionHeader title="Approvals requiring attention" subtitle={`${urgentApprovals.length} urgent of ${pendingApprovals.length} pending`}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingApprovals.slice(0, 4).map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--arsela-navy)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>{a.urgent ? '⚠ ' : ''}{a.title}</span>
                  <span className="arsela-num" style={{ fontWeight: 700, flexShrink: 0 }}>{fmtMYR(a.amount, { compact: true })}</span>
                </div>
              ))}
              {pendingApprovals.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--arsela-text-muted)' }}>No approvals pending.</div>}
            </div>
          </ArsCard>
        </div>

        {/* Management Accounts PDF preview modal (director ask,
            2026-09-24: "make sure I CAN VIEW MANAGEMENT ACCOUNT BEFORE
            DOWNLOAD") — renders the exact same 7-page PDF in an iframe
            so it can be reviewed before it ever touches disk; the
            footer's Download button is the only thing that actually
            calls doc.save(). */}
        <ArsModal
          open={!!mgmtPdfPreview}
          onClose={() => setMgmtPdfPreview(null)}
          title="Management Accounts — preview"
          subtitle={mgmtPdfPreview ? mgmtPdfPreview.fileName : ''}
          width={880}
          footer={
            <>
              <ArsButton variant="secondary" onClick={() => setMgmtPdfPreview(null)}>Close without downloading</ArsButton>
              <ArsButton icon={<IconExport size={15}/>} onClick={() => exportManagementAccountsPDF('download')}>Download PDF</ArsButton>
            </>
          }
        >
          {mgmtPdfPreview && (
            <iframe
              src={mgmtPdfPreview.url}
              title="Management Accounts PDF preview"
              style={{ width: '100%', height: '70vh', border: '1px solid var(--arsela-border)', borderRadius: 8 }}
            />
          )}
        </ArsModal>
      </div>
    );
  };

  const REPORT_TABS = ['Director\'s report','Variance analysis','Forecast','Cash-flow','Vendor spend','Custom'];
  const REPORTS_FY_LABEL = window.Store.fyLabel(window.Store.today());
  const REPORTS_PRIOR_FY_LABEL = window.Store.fyLabel(new Date(window.Store.today().getFullYear() - 1, window.Store.today().getMonth(), 1));
  const PERIODS = [
    `${window.Store.fyQuarterLabel(window.Store.today())} to date (Jul–` + window.Store.today().toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) + ')',
    'Prior quarter',
    `${REPORTS_PRIOR_FY_LABEL} (full year)`,
    `${REPORTS_FY_LABEL} (fcst)`,
  ];

  const ReportsScreen = () => {
    const [s, setS] = React.useState(window.Store.getState());
    React.useEffect(() => window.Store.subscribe(setS), []);
    const [activeTab, setActiveTab] = React.useState('Director\'s report');
    const [period, setPeriod] = React.useState(PERIODS[0]);
    const [showPeriodMenu, setShowPeriodMenu] = React.useState(false);
    const periodRef = React.useRef(null);

    // ---- Director's Report month picker (client ask, 2026-09-21):
    // "director report - should be able to select by month". Options
    // come from window.Store.xeroImportMonths() — every month that has
    // at least one Xero import across any of the 10 report types, plus
    // the current real month so the list is never empty. Defaults to
    // the newest (current) month, matching the report's prior always-
    // latest behaviour until a director actively picks a past month.
    const xeroMonths = window.Store.xeroImportMonths ? window.Store.xeroImportMonths() : [];
    const [reportMonthKey, setReportMonthKey] = React.useState(xeroMonths[0] ? xeroMonths[0].key : null);
    const [showMonthMenu, setShowMonthMenu] = React.useState(false);
    const monthRef = React.useRef(null);
    // If a new (newer) month becomes available — e.g. the director just
    // imported this month's Xero reports for the first time — track the
    // newest key so the picker's default keeps pace, but never override
    // a month the user has deliberately selected.
    const newestMonthKey = xeroMonths[0] ? xeroMonths[0].key : null;
    const reportMonthKeyRef = React.useRef(reportMonthKey);
    React.useEffect(() => {
      if (reportMonthKeyRef.current == null && newestMonthKey) setReportMonthKey(newestMonthKey);
    }, [newestMonthKey]);
    React.useEffect(() => { reportMonthKeyRef.current = reportMonthKey; }, [reportMonthKey]);
    const selectedMonthLabel = (xeroMonths.find((m) => m.key === reportMonthKey) || {}).label || 'Select month';

    React.useEffect(() => {
      const onDoc = (e) => {
        if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
        if (monthRef.current && !monthRef.current.contains(e.target)) setShowMonthMenu(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    // Rolling 7-month window ending at the current fiscal month, in
    // fiscal-year order (Arsela's FY runs 1 Jul \u2013 30 Jun).
    const heatMonths = (() => {
      const all = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
      const idx = all.indexOf(window.Store.today().toLocaleDateString('en-AU', { month: 'short' }));
      const end = idx === -1 ? all.length - 1 : idx;
      const start = Math.max(0, end - 6);
      return all.slice(start, end + 1);
    })();
    // Department rollup — no month-by-month history exists in the data
    // model yet, so the heat-map shows a flat row (current live
    // utilisation % repeated across the window) rather than a fabricated
    // trend; the "Variance vs Plan" list uses the live totals directly.
    const deptStats = (() => {
      const byDept = {};
      (s.budgets || []).forEach((b) => {
        if (!byDept[b.dept]) byDept[b.dept] = { dept: b.dept, allocated: 0, spent: 0 };
        byDept[b.dept].allocated += (b.allocated || 0);
        byDept[b.dept].spent += (b.reconciled ? (b.spent || 0) : 0);
      });
      return Object.values(byDept)
        .map((d) => ({ ...d, pct: d.allocated ? Math.round((d.spent / d.allocated) * 100) : 0, variance: d.spent - d.allocated }))
        .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    })();

    const heatData = deptStats.map((d) => [d.dept, heatMonths.map(() => d.pct)]);

    const varianceRows = deptStats.map((d) => [d.dept, d.allocated, d.spent]);

    const insights = (() => {
      if (deptStats.length === 0) return [];
      const overBudget = deptStats.filter((d) => d.pct >= 100).sort((a, b) => b.pct - a.pct);
      const underBudget = deptStats.filter((d) => d.pct < 100).sort((a, b) => a.pct - b.pct);
      const list = [];
      overBudget.slice(0, 2).forEach((d) => list.push({
        tone: d.pct >= 110 ? 'danger' : 'warning',
        h: `${d.dept} trending ${d.pct}% of plan`,
        b: `${fmtMYR(Math.abs(d.variance), { compact: true })} over allocation — review for top-up or reallocation.`,
        route: '/budgets',
      }));
      underBudget.slice(0, 2).forEach((d) => list.push({
        tone: d.pct <= 50 ? 'success' : 'blue',
        h: `${d.dept} at ${d.pct}% of plan`,
        b: `${fmtMYR(Math.abs(d.variance), { compact: true })} of headroom remaining this year.`,
        route: '/budgets',
      }));
      return list.slice(0, 4);
    })();

    const onVarianceClick = (label, planned, actual) => {
      const variance = actual - planned;
      const pct = planned ? ((variance/planned)*100).toFixed(1) : '0.0';
      window.Store.toast(`${label}: ${fmtMYR(actual, {compact:true})} actual vs ${fmtMYR(planned, {compact:true})} planned (${variance > 0 ? '+' : ''}${pct}%)`, variance > 0 ? 'warning' : 'success');
    };

    const onHeatCellClick = (dept, month, v) => {
      window.Store.toast(`${dept} · ${month}: ${v}% of plan spent`, v >= 100 ? 'danger' : v >= 90 ? 'warning' : 'info');
    };

    return (
      <AppFrame
        active="Reports"
        title="Reports & Analytics"
        breadcrumb={['Arsela Resources','Analyse','Reports']}
        topActions={
          activeTab === 'Director\'s report' ? (
            // ---- Month picker (client ask, 2026-09-21): "director
            // report - should be able to select by month" — lets a
            // director view the report for any month that has Xero
            // data imported, not just the latest one. Distinct from
            // the quarter/FY PERIODS picker used by the other tabs
            // (this one is grained to actual Xero-import months).
            <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={monthRef}>
              <ArsButton variant="secondary" size="md" icon={<IconCalendar size={15}/>} onClick={() => setShowMonthMenu(v => !v)}>{selectedMonthLabel}</ArsButton>
              {showMonthMenu && (
                <div style={{
                  position: 'absolute', top: 42, right: 0, background: '#fff',
                  border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: 'var(--arsela-shadow-card)',
                  zIndex: 20, minWidth: 200, maxHeight: 320, overflowY: 'auto', padding: 6,
                }}>
                  {xeroMonths.length === 0 && (
                    <div style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--arsela-text-muted)' }}>No months available yet</div>
                  )}
                  {xeroMonths.map((m) => (
                    <div key={m.key} onClick={() => { setReportMonthKey(m.key); setShowMonthMenu(false); }} style={{
                      padding: '8px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                      color: m.key === reportMonthKey ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                      fontWeight: m.key === reportMonthKey ? 700 : 500,
                      background: m.key === reportMonthKey ? 'var(--arsela-blue-50)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    }}>
                      {m.label}
                      {m.key === newestMonthKey && <span style={{ fontSize: 10, color: 'var(--arsela-text-muted)', fontWeight: 500 }}>Latest</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={periodRef}>
              <ArsButton variant="secondary" size="md" icon={<IconCalendar size={15}/>} onClick={() => setShowPeriodMenu(v => !v)}>{period}</ArsButton>
              {showPeriodMenu && (
                <div style={{
                  position: 'absolute', top: 42, left: 0, background: '#fff',
                  border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: 'var(--arsela-shadow-card)',
                  zIndex: 20, minWidth: 190, padding: 6,
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
              <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast('Exporting report as PDF…', 'info')}>Export PDF</ArsButton>
              <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => window.Store.toast('New custom report builder — coming soon', 'info')}>New report</ArsButton>
            </div>
          )
        }
      >
        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--arsela-border)', marginBottom: 20 }}>
          {REPORT_TABS.map((t) => (
            <div key={t} onClick={() => setActiveTab(t)} style={{
              padding: '10px 16px', fontSize: 13.5, fontWeight: 600,
              color: t === activeTab ? 'var(--arsela-navy)' : 'var(--arsela-text-muted)',
              borderBottom: t === activeTab ? '2px solid var(--arsela-blue)' : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer',
            }}>{t}</div>
          ))}
        </div>

        {activeTab === 'Director\'s report' ? (
          <DirectorsReportScreen s={s} monthKey={reportMonthKey}/>
        ) : activeTab !== 'Variance analysis' ? (
          <ArsCard>
            <ArsEmpty
              icon={<IconChart size={22}/>}
              title={`${activeTab} report`}
              body={`The ${activeTab.toLowerCase()} report view is being built. Switch back to Variance analysis for the fully wired reporting view.`}
              action={<ArsButton size="sm" onClick={() => setActiveTab('Variance analysis')}>Back to Variance analysis</ArsButton>}
            />
          </ArsCard>
        ) : (
          <>
            {/* Row 1: Trend + Variance list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 20 }}>
              <ArsCard>
                <ArsSectionHeader
                  title="Actual vs Forecast · Group"
                  subtitle="Rolling 7-month spend trend"
                  action={
                    <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--arsela-text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 2, background: '#1343CB' }}/> Actual</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 2, background: '#00A896' }}/> Forecast (Jan)</span>
                    </div>
                  }
                />
                <TrendChart budgets={s.budgets}/>
              </ArsCard>

              <ArsCard>
                <ArsSectionHeader title="Variance vs Plan" subtitle="Departments · YTD · click for detail"/>
                {varianceRows.length === 0 ? (
                  <ArsEmpty icon={<IconChart size={20}/>} title="No budgets yet" body="Variance vs plan will appear once budgets are added." action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>}/>
                ) : (
                <div>
                  {varianceRows.map(([l,p,a])=>
                    <VarianceBar key={l} label={l} planned={p} actual={a} onClick={() => onVarianceClick(l, p, a)}/>
                  )}
                </div>
                )}
              </ArsCard>
            </div>

            {/* Row 2: Heatmap + summary blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
              <ArsCard>
                <ArsSectionHeader
                  title="Utilisation heat-map"
                  subtitle="Monthly % of plan spent · red = over-budget · click a cell for detail"
                />
                {heatData.length === 0 ? (
                  <ArsEmpty icon={<IconChart size={20}/>} title="No budgets yet" body="The utilisation heat-map will populate once budgets are added." action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>}/>
                ) : (
                <>
                <div className="coplan-scrollx">
                <div className="coplan-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '170px repeat(7, 1fr)', gap: 4, alignItems: 'center', minWidth: 560 }}>
                  <div/>
                  {heatMonths.map(m=>(<div key={m} style={{ fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', textAlign: 'center', letterSpacing: 0.5 }}>{m.toUpperCase()}</div>))}
                  {heatData.map(([label, vals])=>(
                    <React.Fragment key={label}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{label}</div>
                      {vals.map((v,i)=><HeatmapCell key={i} v={v} onClick={() => onHeatCellClick(label, heatMonths[i], v)}/>)}
                    </React.Fragment>
                  ))}
                </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, fontSize: 11, color: 'var(--arsela-text-muted)' }}>
                  <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>SCALE</span>
                  {[['<50%','#EEF1F6'],['50–74%','#B9CBFF'],['75–89%','#5B9EFF'],['90–99%','#F59E0B'],['≥100%','#EF4444']].map(([l,c])=>(
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 12, height: 12, background: c, borderRadius: 2 }}/> {l}
                    </span>
                  ))}
                </div>
                </>
                )}
              </ArsCard>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ArsCard>
                  <ArsSectionHeader title="Key insights"/>
                  {insights.length === 0 ? (
                    <ArsEmpty icon={<IconInfo size={20}/>} title="No insights yet" body="Automated insights appear once budgets have plan and actual figures to compare." action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => window.Router.go('/budgets/new')}>New Budget</ArsButton>}/>
                  ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {insights.map((n,i)=>(
                      <div key={i} onClick={() => window.Router.go(n.route)} style={{
                        padding: 12, borderRadius: 8, cursor: 'pointer',
                        background: n.tone==='danger'?'var(--arsela-danger-50)':n.tone==='warning'?'var(--arsela-warning-50)':n.tone==='success'?'var(--arsela-success-50)':'var(--arsela-blue-50)',
                        borderLeft: '3px solid ' + (n.tone==='danger'?'var(--arsela-danger)':n.tone==='warning'?'var(--arsela-warning)':n.tone==='success'?'var(--arsela-success)':'var(--arsela-blue)'),
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{n.h}</div>
                        <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 3, lineHeight: 1.45 }}>{n.b}</div>
                      </div>
                    ))}
                  </div>
                  )}
                </ArsCard>
              </div>
            </div>
          </>
        )}
      </AppFrame>
    );
  };

  Object.assign(window, { ReportsScreen, VarianceBar, TrendChart, HeatmapCell, MonthlyTrendSection });
})();
