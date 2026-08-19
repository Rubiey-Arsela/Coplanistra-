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

  /* ---- Monthly Director's Report — pulls live figures straight out of
     window.Store (budgets, approvals, expenses, CAPEX, cash flow) into a
     single-page executive summary. "Export PDF" renders it with jsPDF +
     autoTable client-side (no backend — Cloudflare Pages is static),
     "Export CSV" uses the same exportRowsToCSV pattern as every other
     screen. This is a real, data-driven report, not a static template. ---- */
  const DirectorsReportScreen = ({ s }) => {
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
    const latestPL = window.Store.latestXeroImport ? window.Store.latestXeroImport('profitAndLoss') : null;
    const latestBS = window.Store.latestXeroImport ? window.Store.latestXeroImport('balanceSheet') : null;
    const latestAR = window.Store.latestXeroImport ? window.Store.latestXeroImport('agedReceivables') : null;
    const latestAP = window.Store.latestXeroImport ? window.Store.latestXeroImport('agedPayables') : null;
    const latestCFA = window.Store.latestXeroImport ? window.Store.latestXeroImport('cashFlowActuals') : null;

    const FY_PERIOD_LABEL = window.Store.fyLabel(window.Store.today());
    const cf = window.computeCashFlow ? window.computeCashFlow(FY_PERIOD_LABEL, activeScenario, budgets, capexProjects) : null;
    // 13-week (~3 month) look-ahead cash view, built from the same
    // computeCashFlow series so it never drifts from the Cash Flow screen.
    const next13WeekOutflow = cf ? Math.abs(cf.investing.slice(1, 4).reduce((a, v) => a + Math.min(0, v), 0)) : 0;
    const next13WeekInflow = cf ? cf.operating.slice(1, 4).reduce((a, v) => a + Math.max(0, v), 0) : 0;
    const solvent = cf && cf.hasData ? cf.minCash > 0 : true;
    const withinRunwayThreshold = cf && cf.hasData ? cf.minCash >= 60 : true;

    // ---- Q1: Where's the money coming from — real revenue mix from the
    // latest imported Profit & Loss (Xero), falling back to an honest
    // "no P&L imported yet" state (Coplanistra has no other revenue
    // data model — budgets/CAPEX only track spend, never income).
    const revenueBySource = latestPL && latestPL.totals ? (latestPL.totals.revenueBySource || []) : [];
    const totalRevenueYTD = latestPL && latestPL.totals ? (latestPL.totals.totalRevenueYTD || 0) : 0;

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
    const coverageMonths = (hasCoverageData && monthlyBurnUnits > 0)
      ? ((arOutstanding || 0) - (apOutstanding || 0) + (cf ? cf.closingCash * 1e6 : 0)) / monthlyBurnUnits
      : null;
    const canCoverExpenses = hasCoverageData
      ? ((arOutstanding || 0) + (cf ? cf.closingCash * 1e6 : 0)) >= (apOutstanding || 0)
      : (cf && cf.hasData ? cf.minCash > 0 : null);

    // ---- Q3: Are we solvent — real assets-vs-liabilities from the
    // latest imported Balance Sheet (the client's stated definition of
    // solvency), falling back to the cash-runway proxy (`solvent` above)
    // only when no Balance Sheet has been imported yet.
    const bsTotals = latestBS && latestBS.totals ? latestBS.totals : null;
    const realSolvent = bsTotals ? bsTotals.totalAssets >= bsTotals.totalLiabilities : null;
    const currentRatio = bsTotals ? bsTotals.currentRatio : null;
    const workingCapital = bsTotals ? bsTotals.workingCapital : null;

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
    const monthLabel = REPORT_DATE.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    const dateLabel = REPORT_DATE.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    // An incomplete month/period must be labeled a preliminary snapshot,
    // not presented as a complete closed-period report.
    const isPreliminary = unreconciledBudgets.length > 0 || fyPct < 1;

    const exportCSV = () => {
      exportRowsToCSV(
        `directors-report-${monthLabel.replace(/\s+/g, '-').toLowerCase()}`,
        ['Section', 'Metric', 'Value'],
        [
          ['Basis', `Reporting status`, isPreliminary ? `Preliminary snapshot as at ${dateLabel}` : `Reconciled — ${FY_PERIOD_LABEL}`],
          ['Basis', 'Reconciled Xero actuals through', latestActualsThrough || 'n/a'],
          ['Basis', 'Budgets pending reconciliation (count)', unreconciledBudgets.length],
          ['Basis', 'Approved expenses not yet posted in Xero (count)', unpostedExpenses.length],
          ['Summary', 'Total allocated (AUD)', totalAllocated],
          ['Summary', 'Xero actuals — reconciled only (AUD)', totalSpent],
          ['Summary', 'Open commitments (AUD)', totalCommitted],
          ['Summary', 'Actual + commitments (AUD)', totalSpent + totalCommitted],
          ['Summary', 'Forecast final cost (AUD)', totalForecastFinal],
          ['Summary', 'Burn vs total budget (%)', burnPct.toFixed(1)],
          ['Summary', `Budget to date (${Math.round(fyPct * 100)}% of ${FY_PERIOD_LABEL} elapsed) (AUD)`, Math.round(budgetToDate)],
          ['Summary', 'Actual vs budget-to-date variance (AUD)', Math.round(varianceToDate)],
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
          // Three questions (client ask, 2026-08-19) — Xero-import-backed where available
          ['Q1: Where is the money coming from', 'Total revenue YTD (AUD)', latestPL ? totalRevenueYTD : 'Not answerable — no Profit & Loss imported'],
          ...(latestPL ? [['Q1: Where is the money coming from', 'Period', latestPL.period]] : []),
          ...revenueBySource.slice(0, 5).map((r) => ['Q1: Revenue by source', r.account, r.ytd]),
          ['Q2: Enough to cover expenses', 'Status', canCoverExpenses == null ? 'Not answerable' : (canCoverExpenses ? 'Yes — covered' : 'At risk — shortfall')],
          ...(hasCoverageData ? [
            ['Q2: Enough to cover expenses', 'Receivables outstanding (AUD)', arOutstanding],
            ['Q2: Enough to cover expenses', 'Payables outstanding (AUD)', apOutstanding],
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
      doc.text('Coplanistra — Monthly Director\'s Report', 40, y);
      y += 20;
      doc.setFontSize(11); doc.setFont(undefined, 'normal'); doc.setTextColor(90);
      doc.text(`${monthLabel} · Prepared ${dateLabel} · Arsela Resources (Group)`, 40, y);
      doc.setTextColor(0);
      y += 28;

      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('1. Executive summary', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Metric', 'Value']],
        body: [
          [`Total ${FY_PERIOD_LABEL} budget allocated`, fmtMYR(totalAllocated, { compact: true })],
          ['Xero actuals — reconciled only', fmtMYR(totalSpent, { compact: true })],
          ['Open commitments (approved, not yet posted)', fmtMYR(totalCommitted, { compact: true })],
          ['Actual + commitments', fmtMYR(totalSpent + totalCommitted, { compact: true })],
          ['Forecast final cost (full year)', fmtMYR(totalForecastFinal, { compact: true })],
          ['Burn vs total annual budget', `${burnPct.toFixed(1)}%`],
          [`Budget to date (${Math.round(fyPct * 100)}% of ${FY_PERIOD_LABEL} elapsed)`, fmtMYR(budgetToDate, { compact: true })],
          ['Actual vs budget-to-date variance', `${varianceToDate >= 0 ? '+' : '−'}${fmtMYR(Math.abs(varianceToDate), { compact: true })} ${varianceToDate >= 0 ? 'over' : 'under'}`],
          ['Budgets currently over plan', `${overBudget.length} of ${budgets.length}`],
          ['Budgets pending reconciliation to Xero', `${unreconciledBudgets.length} of ${budgets.length}`],
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
      doc.text(`Q1 — Where's the money coming from: ${latestPL ? `${fmtMYR(totalRevenueYTD, { compact: true })} total revenue YTD (${latestPL.period})` : 'Not answerable — no Profit & Loss imported yet.'}`, 40, y, { maxWidth: pageW - 80 }); y += latestPL ? 14 : 14;
      if (latestPL && revenueBySource.length) {
        revenueBySource.slice(0, 3).forEach((r) => { doc.text(`   • ${r.account}: ${fmtMYR(r.ytd, { compact: true })}`, 40, y); y += 12; });
      }
      y += 6;
      doc.text(`Q2 — Enough to cover our expenses: ${canCoverExpenses == null ? 'Not answerable — add budgets/CAPEX or import Aged Receivables/Payables.' : (canCoverExpenses ? 'Yes — covered.' : 'At risk — projected shortfall.')}${hasCoverageData ? ` Receivables due ${fmtMYR(arOutstanding, { compact: true })}, payables due ${fmtMYR(apOutstanding, { compact: true })}${coverageMonths != null ? `, ≈${coverageMonths.toFixed(1)} months of burn covered.` : '.'}` : ''}`, 40, y, { maxWidth: pageW - 80 }); y += 26;
      doc.text(`Q3 — Are we solvent: ${bsTotals ? (realSolvent ? `Yes — solvent. Assets ${fmtMYR(bsTotals.totalAssets, { compact: true })} vs liabilities ${fmtMYR(bsTotals.totalLiabilities, { compact: true })}, current ratio ${currentRatio != null ? currentRatio.toFixed(2) + 'x' : 'n/a'} (Balance Sheet as at ${latestBS.period}).` : `No — liabilities exceed assets. Assets ${fmtMYR(bsTotals.totalAssets, { compact: true })} vs liabilities ${fmtMYR(bsTotals.totalLiabilities, { compact: true })} (Balance Sheet as at ${latestBS.period}).`) : `No Balance Sheet imported — cash-runway proxy only (${solvent ? (withinRunwayThreshold ? 'within comfort threshold' : 'below comfort threshold') : 'at risk'}).`}`, 40, y, { maxWidth: pageW - 80 }); y += 30;

      if (y > 640) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('6. Approvals requiring director attention', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Item', 'Type', 'Amount', 'Requester', 'Urgent']],
        body: pendingApprovals.slice(0, 10).map((a) => [a.title, a.type, fmtMYR(a.amount, { compact: true }), a.requester, a.urgent ? 'Yes' : '']),
        styles: { fontSize: 8.5 }, headStyles: { fillColor: [19, 67, 203] },
      });

      if (y > 640) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('7. Data limitations', 40, y); y += 8;
      doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
      doc.text(`This report is ${isPreliminary ? 'a PRELIMINARY SNAPSHOT — ' : ''}based on Xero actuals reconciled through ${latestActualsThrough || 'n/a'}. ${unreconciledBudgets.length} of ${budgets.length} budget lines are pending reconciliation, and ${unpostedExpenses.length} approved expense(s) are not yet posted in Xero. Figures beyond the reconciled-through date are forecasts, not actuals.`, 40, y, { maxWidth: pageW - 80 });

      doc.save(`Coplanistra-Directors-Report-${monthLabel.replace(/\s+/g, '-')}.pdf`);
      window.Store.toast('Director\'s report exported as PDF', 'success');
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div className="arsela-h1" style={{ fontSize: 20, letterSpacing: -0.3 }}>Monthly Director's Report — {monthLabel}</div>
            <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Auto-compiled from live budget, approvals, CAPEX and cash flow data · prepared {dateLabel} · {FY_PERIOD_LABEL}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={exportCSV}>Export CSV</ArsButton>
            <ArsButton size="md" icon={<IconExport size={15}/>} onClick={exportPDF}>Export PDF</ArsButton>
          </div>
        </div>

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
              Xero actuals reconciled through {latestActualsThrough || 'n/a'} · {unreconciledBudgets.length} of {budgets.length} budget line(s) pending reconciliation · {unpostedExpenses.length} approved expense(s) not yet posted in Xero.
            </div>
          </div>
        </div>

        <ArsCard style={{ marginBottom: 20 }}>
          <ArsSectionHeader title="Executive summary" subtitle={`All figures below are labelled by basis — Actual = reconciled Xero data only`}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Xero actuals (reconciled)</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(totalSpent, { compact: true })}</div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{burnPct.toFixed(1)}% of total plan</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Open commitments</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(totalCommitted, { compact: true })}</div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Approved, not yet posted</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Actual + commitments</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(totalSpent + totalCommitted, { compact: true })}</div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>vs {fmtMYR(totalAllocated, { compact: true })} allocated</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Forecast final cost</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: totalForecastFinal > totalAllocated ? 'var(--danger)' : 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(totalForecastFinal, { compact: true })}</div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Full-year projection</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, paddingTop: 14, borderTop: '1px solid var(--arsela-border)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Actual vs budget-to-date</div>
              <div className="arsela-num" style={{ fontSize: 20, fontWeight: 700, color: varianceToDate > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 6 }}>{varianceToDate >= 0 ? '+' : '−'}{fmtMYR(Math.abs(varianceToDate), { compact: true })}</div>
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
              <div className="arsela-num" style={{ fontSize: 16, fontWeight: 700, color: unreconciledBudgets.length === 0 ? 'var(--success)' : 'var(--warning)', marginTop: 6 }}>{unreconciledBudgets.length === 0 ? 'All reconciled' : `${unreconciledBudgets.length} pending`}</div>
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

            {/* Q1 — where's the money coming from */}
            <div onClick={() => window.Router.go('/dataimports')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to import or review Profit &amp; Loss">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Where's the money coming from?</div>
              {latestPL ? (
                <>
                  <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)', marginTop: 6 }}>{fmtMYR(totalRevenueYTD, { compact: true })}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Total revenue (YTD) · {latestPL.period}</div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {revenueBySource.slice(0, 3).map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--arsela-navy)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{r.account}</span>
                        <span className="arsela-num" style={{ fontWeight: 700, flexShrink: 0, color: 'var(--arsela-text-muted)' }}>{fmtMYR(r.ytd, { compact: true })}</span>
                      </div>
                    ))}
                    {revenueBySource.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>No revenue lines found in the imported P&amp;L.</div>}
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not answerable yet</ArsBadge>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Import a Profit &amp; Loss from Xero to see revenue by source here.</div>
                </div>
              )}
            </div>

            {/* Q2 — do we have enough to cover our expenses */}
            <div onClick={() => window.Router.go(hasCoverageData ? '/dataimports' : '/cashflow')} style={{ cursor: 'pointer', border: '1px solid var(--arsela-border)', borderRadius: 10, padding: 16 }} title="Click to review the underlying data">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Enough to cover our expenses?</div>
              {canCoverExpenses != null ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, color: canCoverExpenses ? 'var(--success)' : 'var(--danger)', marginTop: 6 }}>
                    {canCoverExpenses ? 'Yes — covered' : 'At risk — shortfall'}
                  </div>
                  {hasCoverageData ? (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Receivables due in</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{arOutstanding != null ? fmtMYR(arOutstanding, { compact: true }) : '—'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Payables due out</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{apOutstanding != null ? fmtMYR(apOutstanding, { compact: true }) : '—'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--arsela-border)' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Cash on hand (cash flow model)</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{cf ? curLabel(cf.closingCash) : '—'}</span></div>
                      {coverageMonths != null && <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>≈ {coverageMonths.toFixed(1)} months of burn covered</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Based on the budget-derived cash flow model (no Aged Receivables/Payables imported yet). Minimum projected balance {cf ? curLabel(cf.minCash) : '—'}.</div>
                  )}
                </>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ArsBadge tone="neutral" size="sm">Not answerable yet</ArsBadge>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.5 }}>Add budgets/CAPEX or import Aged Receivables and Aged Payables to see expense coverage here.</div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Total assets</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(bsTotals.totalAssets, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Total liabilities</span><span className="arsela-num" style={{ fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(bsTotals.totalLiabilities, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--arsela-border)' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Working capital</span><span className="arsela-num" style={{ fontWeight: 700, color: workingCapital >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtMYR(workingCapital, { compact: true })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--arsela-text-muted)' }}>Current ratio</span><span className="arsela-num" style={{ fontWeight: 700, color: currentRatio >= 1 ? 'var(--success)' : 'var(--danger)' }}>{currentRatio != null ? currentRatio.toFixed(2) + 'x' : '—'}</span></div>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', marginTop: 8 }}>Balance Sheet as at {latestBS.period}</div>
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
          <ArsCard>
            <ArsSectionHeader title="Data limitations" subtitle="What this report does not yet cover"/>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', lineHeight: 1.5 }}>
              {unreconciledBudgets.length} budget line(s) pending reconciliation to Xero. {unpostedExpenses.length} approved expense(s) not yet posted in Xero. Figures beyond {latestActualsThrough || 'the reconciled-through date'} are forecasts, not actuals.
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

    React.useEffect(() => {
      const onDoc = (e) => {
        if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
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
          activeTab === 'Director\'s report' ? null : (
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
          <DirectorsReportScreen s={s}/>
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

  Object.assign(window, { ReportsScreen, VarianceBar, TrendChart, HeatmapCell });
})();
