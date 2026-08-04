/* Cash Flow — inflow/outflow chart, runway indicator */
(function () {

  const CF_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const PERIODS = ['FY 2024', 'FY 2025', 'FY 2026', 'FY 2027 (fcst)'];

  const CashFlowChart = ({ operating, investing, financing, onBarClick }) => {
    const months = CF_MONTHS;
    const w = 700, h = 300, pad = { l: 44, r: 20, t: 20, b: 34 };
    const max = 80, min = -80;
    const range = max - min;
    const chartH = h - pad.t - pad.b;
    const groupW = (w - pad.l - pad.r) / months.length;
    const barW = 6;

    const yFor = v => pad.t + chartH * (1 - (v - min) / range);
    const xFor = i => pad.l + groupW * i + groupW / 2;
    const zeroY = yFor(0);

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        {[-60, -30, 0, 30, 60].map(v => (
          <g key={v}>
            <line x1={pad.l} x2={w-pad.r} y1={yFor(v)} y2={yFor(v)} stroke={v === 0 ? '#CED4E0' : '#EEF1F6'} strokeWidth={v === 0 ? 1.2 : 1}/>
            <text x={pad.l-8} y={yFor(v)+4} fontSize="10" fill="#8492A6" textAnchor="end" fontWeight="600">RM{v}M</text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = xFor(i);
          return (
            <g key={m} style={{ cursor: 'pointer' }}
               onClick={() => onBarClick && onBarClick(m, i)}>
              <rect x={pad.l + groupW * i} y={pad.t} width={groupW} height={chartH} fill="transparent"/>
              <rect x={cx - barW * 1.5 - 2} y={operating[i] >= 0 ? yFor(operating[i]) : zeroY}
                    width={barW} height={Math.abs(yFor(operating[i]) - zeroY)}
                    fill="#1A8754" rx="1.5"/>
              <rect x={cx - barW/2} y={investing[i] >= 0 ? yFor(investing[i]) : zeroY}
                    width={barW} height={Math.abs(yFor(investing[i]) - zeroY)}
                    fill="#D64045" rx="1.5"/>
              <rect x={cx + barW/2 + 2} y={financing[i] >= 0 ? yFor(financing[i]) : zeroY}
                    width={barW} height={Math.abs(yFor(financing[i]) - zeroY)}
                    fill="#1343CB" rx="1.5"/>
              <text x={cx} y={h - 14} fontSize="10.5" fill="#5B6B82" textAnchor="middle" fontWeight="600">{m}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const RunwayChart = ({ cash }) => {
    const months = CF_MONTHS;
    const w = 700, h = 200, pad = { l: 44, r: 20, t: 20, b: 30 };
    const max = 250, min = 0;
    const chartH = h - pad.t - pad.b;
    const xFor = i => pad.l + (w - pad.l - pad.r) * (i / (months.length - 1));
    const yFor = v => pad.t + chartH * (1 - (v - min) / (max - min));

    const line = cash.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`).join(' ');
    const area = `M ${xFor(0)} ${yFor(0)} ${cash.map((v, i) => `L ${xFor(i)} ${yFor(v)}`).join(' ')} L ${xFor(cash.length-1)} ${yFor(0)} Z`;

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="cashArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#00A896" stopOpacity="0.28"/>
            <stop offset="1" stopColor="#00A896" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 100, 200].map(v => (
          <g key={v}>
            <line x1={pad.l} x2={w-pad.r} y1={yFor(v)} y2={yFor(v)} stroke="#EEF1F6"/>
            <text x={pad.l-8} y={yFor(v)+4} fontSize="10" fill="#8492A6" textAnchor="end" fontWeight="600">RM{v}M</text>
          </g>
        ))}
        <line x1={pad.l} x2={w-pad.r} y1={yFor(60)} y2={yFor(60)} stroke="#D64045" strokeDasharray="4 3" strokeWidth="1"/>
        <text x={w-pad.r} y={yFor(60)-4} fontSize="10" fill="#D64045" textAnchor="end" fontWeight="700">Min. runway threshold</text>
        <path d={area} fill="url(#cashArea)"/>
        <path d={line} stroke="#007A6E" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        {cash.map((v, i) => <circle key={i} cx={xFor(i)} cy={yFor(v)} r="3.5" fill="#fff" stroke="#007A6E" strokeWidth="2"/>)}
        {months.map((m, i) => <text key={m} x={xFor(i)} y={h-10} fontSize="10.5" fill="#5B6B82" textAnchor="middle" fontWeight="600">{m}</text>)}
      </svg>
    );
  };

  const CashFlowScreen = () => {
    const [period, setPeriod] = React.useState('FY 2026');
    const [showPeriodMenu, setShowPeriodMenu] = React.useState(false);
    const periodRef = React.useRef(null);

    React.useEffect(() => {
      const onDoc = (e) => {
        if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    // Base FY26 series; scale slightly per selected period so switching feels live.
    const scale = period === 'FY 2024' ? 0.72 : period === 'FY 2025' ? 0.86 : period === 'FY 2027 (fcst)' ? 1.12 : 1;
    const operating = [42, 48, 51, 46, 52, 58, 61, 55, 62, 67, 71, 74].map(v => Math.round(v * scale));
    const investing = [-28, -32, -35, -30, -38, -42, -48, -44, -52, -55, -58, -62].map(v => Math.round(v * scale));
    const financing = [8, -4, -6, 12, -8, -6, -4, 14, -6, -8, -4, -12].map(v => Math.round(v * scale));
    const cash = [98, 110, 120, 148, 154, 164, 173, 198, 202, 206, 215, 215].map(v => Math.round(v * scale));

    const opTotal = operating.reduce((a, b) => a + b, 0);
    const invTotal = investing.reduce((a, b) => a + b, 0);
    const finTotal = financing.reduce((a, b) => a + b, 0);
    const closingCash = cash[cash.length - 1];
    const monthlyBurn = Math.abs(Math.round(investing.reduce((a, b) => a + Math.min(0, b), 0) / 12));
    const runwayMonths = monthlyBurn > 0 ? (closingCash / monthlyBurn).toFixed(1) : '—';

    const onBarClick = (month) => {
      const idx = CF_MONTHS.indexOf(month);
      window.Store.toast(`${month} ${period}: Operating RM${operating[idx]}M · Investing RM${investing[idx]}M · Financing RM${financing[idx]}M`, 'info');
    };

    return (
      <AppFrame
        active="Cash Flow"
        title="Cash Flow Planning"
        breadcrumb={['Arsela Resources', 'Financials', 'Cash Flow']}
        topActions={
          <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={periodRef}>
            <ArsButton variant="secondary" size="md" icon={<IconCalendar size={15}/>} onClick={() => setShowPeriodMenu(v => !v)}>{period}</ArsButton>
            {showPeriodMenu && (
              <div style={{
                position: 'absolute', top: 42, left: 0, background: '#fff',
                border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: 'var(--arsela-shadow-card)',
                zIndex: 20, minWidth: 170, padding: 6,
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
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast(`Exporting cash flow model — ${period}…`, 'info')}>Export</ArsButton>
          </div>
        }
      >
        {/* Runway hero */}
        <ArsCard style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', background: 'linear-gradient(180deg, #FAFBFD, #fff)' }}>
            <div style={{ padding: '24px 24px', borderRight: '1px solid var(--arsela-border)' }}>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700 }}>Closing cash · {period}</div>
              <div className="arsela-num" style={{ fontSize: 32, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.5 }}>RM {closingCash}M</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArsVariance value={9.4} />
                <span style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>vs Jan opening</span>
              </div>
            </div>
            <div style={{ padding: '24px 24px', borderRight: '1px solid var(--arsela-border)' }}>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700 }}>Runway</div>
              <div className="arsela-num" style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)', marginTop: 10, letterSpacing: -0.5 }}>{runwayMonths} mo</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--arsela-text-muted)' }}>at current burn rate</div>
            </div>
            <div style={{ padding: '24px 24px', borderRight: '1px solid var(--arsela-border)' }}>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700 }}>Monthly burn</div>
              <div className="arsela-num" style={{ fontSize: 32, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.5 }}>RM {monthlyBurn}M</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArsVariance value={-3.2} invert/>
                <span style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>vs 6-mo avg</span>
              </div>
            </div>
            <div style={{ padding: '24px 24px' }}>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700 }}>Net change · YTD</div>
              <div className="arsela-num" style={{ fontSize: 32, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.5 }}>{(opTotal+invTotal+finTotal) >= 0 ? '+' : '−'}RM {Math.abs(opTotal+invTotal+finTotal)}M</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--arsela-text-muted)' }}>Operating + Investing + Financing</div>
            </div>
          </div>
        </ArsCard>

        {/* Flows chart */}
        <ArsCard style={{ marginBottom: 20 }}>
          <ArsSectionHeader
            title={`Cash flow model — ${period}`}
            subtitle="Monthly Operating · Investing · Financing (RM millions) · click a month for detail"
            action={
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--arsela-text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#1A8754', borderRadius: 2 }}/>Operating</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#D64045', borderRadius: 2 }}/>Investing</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#1343CB', borderRadius: 2 }}/>Financing</span>
              </div>
            }
          />
          <CashFlowChart operating={operating} investing={investing} financing={financing} onBarClick={onBarClick}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--arsela-border)' }}>
            {[
              { l: `Operating cash · ${period}`, v: opTotal, tone: 'success', d: 'Strong operating performance' },
              { l: `Investing cash · ${period}`, v: invTotal, tone: 'danger',  d: 'CAPEX-driven outflows' },
              { l: `Financing cash · ${period}`, v: finTotal, tone: 'blue',    d: 'Net loan repayments' },
            ].map(m => (
              <div key={m.l}>
                <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{m.l}</div>
                <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: m.tone === 'success' ? 'var(--success)' : m.tone === 'danger' ? 'var(--danger)' : 'var(--arsela-navy)', marginTop: 6, letterSpacing: -0.3 }}>
                  {m.v >= 0 ? '+' : '−'}RM {Math.abs(m.v)}M
                </div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 3 }}>{m.d}</div>
              </div>
            ))}
          </div>
        </ArsCard>

        {/* Cash position over time */}
        <ArsCard>
          <ArsSectionHeader
            title="Closing cash position · projection"
            subtitle="Cumulative · red line = minimum runway threshold"
          />
          <RunwayChart cash={cash}/>
        </ArsCard>
      </AppFrame>
    );
  };

  Object.assign(window, { CashFlowScreen, CashFlowChart, RunwayChart });
})();
