/* Reports & Analytics */
(function () {

  const VarianceBar = ({ label, planned, actual, onClick }) => {
    const variance = actual - planned;
    const pct = ((variance/planned)*100).toFixed(1);
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

  const TrendChart = () => {
    const w = 660, h = 220, pad = { l: 44, r: 20, t: 20, b: 30 };
    const s1 = [12, 14, 15, 18, 20, 21, 24];
    const s2 = [10, 12, 14, 16, 17, 19, 22];
    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul'];
    const max = 30;
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
        {[0,10,20,30].map(v=>(
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
    const totalSpent = budgets.reduce((a, b) => a + (b.spent || 0), 0);
    const burnPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
    const fyPct = window.fyProgressPct ? window.fyProgressPct() : 0.55;
    const budgetToDate = totalAllocated * fyPct;
    const varianceToDate = totalSpent - budgetToDate;

    const overBudget = budgets.filter((b) => b.status === 'over');
    const pendingApprovals = approvals.filter((a) => a.status === 'pending');
    const urgentApprovals = pendingApprovals.filter((a) => a.urgent);
    const pendingApprovalValue = pendingApprovals.reduce((a, b) => a + b.amount, 0);
    const pendingExpenses = expenses.filter((e) => e.status === 'pending');

    const capexApproved = capexProjects.reduce((a, c) => a + c.approved, 0);
    const capexCommitted = capexProjects.reduce((a, c) => a + c.committed, 0);
    const capexSpent = capexProjects.reduce((a, c) => a + c.spent, 0);

    const cf = window.computeCashFlow ? window.computeCashFlow('FY 2026', activeScenario) : null;

    const deptRollup = {};
    budgets.forEach((b) => {
      if (!deptRollup[b.dept]) deptRollup[b.dept] = { allocated: 0, spent: 0 };
      deptRollup[b.dept].allocated += b.allocated;
      deptRollup[b.dept].spent += b.spent;
    });
    const deptRows = Object.entries(deptRollup)
      .map(([dept, v]) => ({ dept, ...v, variance: v.spent - v.allocated }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    const REPORT_DATE = window.FY_REFERENCE_DATE || new Date(2026, 6, 22);
    const monthLabel = REPORT_DATE.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    const dateLabel = REPORT_DATE.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });

    const exportCSV = () => {
      exportRowsToCSV(
        `directors-report-${monthLabel.replace(/\s+/g, '-').toLowerCase()}`,
        ['Section', 'Metric', 'Value'],
        [
          ['Summary', 'Total allocated (RM)', totalAllocated],
          ['Summary', 'Total spent (RM)', totalSpent],
          ['Summary', 'Burn vs total budget (%)', burnPct.toFixed(1)],
          ['Summary', 'Budget to date (RM)', Math.round(budgetToDate)],
          ['Summary', 'Spent to date (RM)', totalSpent],
          ['Summary', 'Variance to date (RM)', Math.round(varianceToDate)],
          ['Approvals', 'Pending approvals (count)', pendingApprovals.length],
          ['Approvals', 'Pending approvals (RM)', pendingApprovalValue],
          ['Approvals', 'Urgent approvals (count)', urgentApprovals.length],
          ['CAPEX', 'Approved (RM)', capexApproved],
          ['CAPEX', 'Committed (RM)', capexCommitted],
          ['CAPEX', 'Spent (RM)', capexSpent],
          ...(cf ? [
            ['Cash Flow', `Active scenario`, activeScenario.n || 'Base case'],
            ['Cash Flow', 'Closing cash FY26 (RM M)', cf.closingCash],
            ['Cash Flow', 'Runway (months)', cf.runwayMonths || 'n/a'],
            ['Cash Flow', 'Monthly burn (RM M)', cf.monthlyBurn],
          ] : []),
          ...deptRows.map((d) => [`Department — ${d.dept}`, 'Allocated / Spent (RM)', `${d.allocated} / ${d.spent}`]),
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
          ['Total FY2026 budget allocated', fmtMYR(totalAllocated, { compact: true })],
          ['Total spent to date', fmtMYR(totalSpent, { compact: true })],
          ['Burn vs total annual budget', `${burnPct.toFixed(1)}%`],
          [`Budget to date (${Math.round(fyPct * 100)}% of FY elapsed)`, fmtMYR(budgetToDate, { compact: true })],
          ['Spent to date vs budget to date', `${varianceToDate >= 0 ? '+' : '−'}${fmtMYR(Math.abs(varianceToDate), { compact: true })} ${varianceToDate >= 0 ? 'over' : 'under'}`],
          ['Budgets currently over plan', `${overBudget.length} of ${budgets.length}`],
          ['Pending approvals', `${pendingApprovals.length} (${fmtMYR(pendingApprovalValue, { compact: true })}), ${urgentApprovals.length} urgent`],
        ],
        styles: { fontSize: 9.5 }, headStyles: { fillColor: [19, 67, 203] },
      });
      y = doc.lastAutoTable.finalY + 24;

      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('2. Department budget performance', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Department', 'Allocated', 'Spent', 'Variance']],
        body: deptRows.map((d) => [
          d.dept, fmtMYR(d.allocated, { compact: true }), fmtMYR(d.spent, { compact: true }),
          `${d.variance >= 0 ? '+' : '−'}${fmtMYR(Math.abs(d.variance), { compact: true })}`,
        ]),
        styles: { fontSize: 9.5 }, headStyles: { fillColor: [19, 67, 203] },
      });
      y = doc.lastAutoTable.finalY + 24;

      if (y > 620) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('3. CAPEX programme', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Project', 'Approved', 'Committed', 'Spent', 'Stage']],
        body: capexProjects.map((c) => [c.name, fmtMYR(c.approved, { compact: true }), fmtMYR(c.committed, { compact: true }), fmtMYR(c.spent, { compact: true }), c.stage]),
        styles: { fontSize: 8.5 }, headStyles: { fillColor: [19, 67, 203] },
      });
      y = doc.lastAutoTable.finalY + 24;

      if (y > 620) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('4. Cash flow position', 40, y); y += 8;
      doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
      if (cf) {
        doc.text(`Active scenario: ${activeScenario.n || 'Base case'} — ${activeScenario.note || 'Current approved FY26 plan.'}`, 40, y); y += 14;
        doc.text(`Closing cash (FY2026): ${curLabel(cf.closingCash)} · Runway: ${cf.runwayMonths ? cf.runwayMonths + ' months' : 'n/a'} · Monthly burn: ${curLabel(cf.monthlyBurn)}`, 40, y); y += 20;
      }

      if (y > 640) { doc.addPage(); y = 50; }
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('5. Approvals requiring director attention', 40, y); y += 8;
      doc.autoTable({
        startY: y, margin: { left: 40, right: 40 }, theme: 'grid',
        head: [['Item', 'Type', 'Amount', 'Requester', 'Urgent']],
        body: pendingApprovals.slice(0, 10).map((a) => [a.title, a.type, fmtMYR(a.amount, { compact: true }), a.requester, a.urgent ? 'Yes' : '']),
        styles: { fontSize: 8.5 }, headStyles: { fillColor: [19, 67, 203] },
      });

      doc.save(`Coplanistra-Directors-Report-${monthLabel.replace(/\s+/g, '-')}.pdf`);
      window.Store.toast('Director\'s report exported as PDF', 'success');
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="arsela-h1" style={{ fontSize: 20, letterSpacing: -0.3 }}>Monthly Director's Report — {monthLabel}</div>
            <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 4 }}>Auto-compiled from live budget, approvals, CAPEX and cash flow data · prepared {dateLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={exportCSV}>Export CSV</ArsButton>
            <ArsButton size="md" icon={<IconExport size={15}/>} onClick={exportPDF}>Export PDF</ArsButton>
          </div>
        </div>

        <ArsCard style={{ marginBottom: 20 }}>
          <ArsSectionHeader title="Executive summary"/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Burn vs total budget</div>
              <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: burnPct > 100 ? 'var(--danger)' : 'var(--arsela-navy)', marginTop: 6 }}>{burnPct.toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Spent vs budget to date</div>
              <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: varianceToDate > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 6 }}>{varianceToDate >= 0 ? '+' : '−'}{fmtMYR(Math.abs(varianceToDate), { compact: true })}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Pending approvals</div>
              <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{pendingApprovals.length}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--arsela-text-muted)' }}> ({fmtMYR(pendingApprovalValue, { compact: true })})</span></div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Cash flow scenario</div>
              <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{activeScenario.n || 'Base case'}</div>
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
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Allocated</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Spent</th>
                    <th style={{ padding: '8px 20px', textAlign: 'right' }}>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {deptRows.map((d) => (
                    <tr key={d.dept} onClick={() => window.Router.go('/budgets')} style={{ cursor: 'pointer', borderTop: '1px solid var(--arsela-border)' }}>
                      <td style={{ padding: '10px 20px', fontWeight: 600, color: 'var(--arsela-navy)' }}>{d.dept}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }} className="arsela-num">{fmtMYR(d.allocated, { compact: true })}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }} className="arsela-num">{fmtMYR(d.spent, { compact: true })}</td>
                      <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: d.variance > 0 ? 'var(--danger)' : 'var(--success)' }} className="arsela-num">{d.variance >= 0 ? '+' : '−'}{fmtMYR(Math.abs(d.variance), { compact: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ArsCard>

          <ArsCard onClick={() => window.Router.go('/cashflow')} style={{ cursor: 'pointer' }} title="Click to open Cash Flow Planning">
            <ArsSectionHeader title="Cash flow position" subtitle={`FY2026 · ${activeScenario.n || 'Base case'}`}/>
            {cf ? (
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
                {activeScenario.n && (
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', lineHeight: 1.45, paddingTop: 10, borderTop: '1px solid var(--arsela-border)' }}>{activeScenario.note}</div>
                )}
              </div>
            ) : <ArsEmpty icon={<IconChart size={20}/>} title="Cash flow module loading…" body=""/>}
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
  const PERIODS = ['Jan – Jul 2026', 'Apr – Jun 2026', 'FY2025 (full year)', 'FY2026 (fcst)'];

  const ReportsScreen = () => {
    const [s, setS] = React.useState(window.Store.getState());
    React.useEffect(() => window.Store.subscribe(setS), []);
    const [activeTab, setActiveTab] = React.useState('Director\'s report');
    const [period, setPeriod] = React.useState('Jan – Jul 2026');
    const [showPeriodMenu, setShowPeriodMenu] = React.useState(false);
    const periodRef = React.useRef(null);

    React.useEffect(() => {
      const onDoc = (e) => {
        if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const heatMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul'];
    const heatData = [
      ['Ports & Logistics', [62, 58, 65, 71, 74, 82, 88]],
      ['Operations',        [78, 82, 85, 88, 91, 93, 96]],
      ['Digital & Data',    [22, 30, 34, 38, 42, 45, 45]],
      ['People & Culture',  [65, 71, 78, 85, 91, 95, 102]],
      ['Energy & Assets',   [15, 18, 22, 26, 30, 32, 33]],
      ['Property',          [42, 48, 50, 52, 55, 58, 61]],
      ['Aviation',          [72, 80, 85, 92, 96, 102, 106]],
    ];

    const varianceRows = [
      ['Ports & Logistics', 41_200_000, 39_800_000],
      ['Operations', 44_800_000, 46_100_000],
      ['Digital & Data', 12_600_000, 11_400_000],
      ['People & Culture', 18_900_000, 20_600_000],
      ['Energy & Assets', 19_200_000, 18_400_000],
      ['Aviation', 8_900_000, 10_400_000],
    ];

    const onVarianceClick = (label, planned, actual) => {
      const variance = actual - planned;
      const pct = ((variance/planned)*100).toFixed(1);
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
                <TrendChart/>
              </ArsCard>

              <ArsCard>
                <ArsSectionHeader title="Variance vs Plan" subtitle="Departments · YTD · click for detail"/>
                <div>
                  {varianceRows.map(([l,p,a])=>
                    <VarianceBar key={l} label={l} planned={p} actual={a} onClick={() => onVarianceClick(l, p, a)}/>
                  )}
                </div>
              </ArsCard>
            </div>

            {/* Row 2: Heatmap + summary blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
              <ArsCard>
                <ArsSectionHeader
                  title="Utilisation heat-map"
                  subtitle="Monthly % of plan spent · red = over-budget · click a cell for detail"
                />
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
              </ArsCard>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ArsCard>
                  <ArsSectionHeader title="Key insights"/>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { tone: 'danger',  h: 'Aviation MRO trending 6% over',   b: 'Line-check volumes exceeded plan; recommend Q4 top-up or vendor renegotiation.', route: '/monthly' },
                      { tone: 'warning', h: 'People & Culture at 102% YTD',    b: `Training pull-forward. Move ${fmtMYR(900000, { compact: true })} from FY27 or cap remaining spend.`, route: '/budgets' },
                      { tone: 'success', h: 'Energy & Assets 41% under plan',  b: `Solar rollout delayed to Q4; free capacity of ${fmtMYR(15300000, { compact: true })} to reallocate.`, route: '/budgets' },
                      { tone: 'blue',    h: 'Digital & Data healthy at 45%',   b: 'DC top-up in pipeline; watch for reallocation once approved.', route: '/capex' },
                    ].map((n,i)=>(
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
