/* AI Copilot — conversational budget assistant with distinct visual treatment */
(function () {

  const SparkleIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="currentColor"/>
      <path d="M19 15l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="currentColor" opacity="0.7"/>
      <path d="M5 4l0.7 1.8L7.5 6.5l-1.8 0.7L5 9l-0.7-1.8L2.5 6.5l1.8-0.7z" fill="currentColor" opacity="0.5"/>
    </svg>
  );

  const AiChart = () => (
    <svg viewBox="0 0 400 120" style={{ width: '100%', height: 120 }}>
      <defs>
        <linearGradient id="aiChartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#00A896" stopOpacity="0.3"/>
          <stop offset="1" stopColor="#00A896" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 30, 60, 90].map(y => <line key={y} x1="0" x2="400" y1={y+10} y2={y+10} stroke="#DDE6DD" strokeDasharray="2 3"/>)}
      <path d="M 10 90 L 60 82 L 110 78 L 160 65 L 210 55 L 260 42 L 310 30 L 390 22 L 390 110 L 10 110 Z" fill="url(#aiChartFill)"/>
      <path d="M 10 90 L 60 82 L 110 78 L 160 65 L 210 55 L 260 42 L 310 30 L 390 22" stroke="#007A6E" strokeWidth="2" fill="none"/>
      {[[10,90],[60,82],[110,78],[160,65],[210,55],[260,42],[310,30],[390,22]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#fff" stroke="#007A6E" strokeWidth="1.6"/>
      ))}
    </svg>
  );

  const CopilotMessage = ({ role, children, chips, chart, cite, onChipClick }) => {
    const isAi = role === 'ai';
    const s = window.Store.getState();
    const currentUser = window.Store.getCurrentUser();
    const userName = (currentUser && currentUser.name) || 'You';
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
        {isAi ? (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--arsela-gradient-ai)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,122,110,0.24)',
          }}>
            <SparkleIcon size={18}/>
          </div>
        ) : (
          <ArsAvatar name={userName} size={32} tone="blue"/>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', marginBottom: 4 }}>
            {isAi ? 'Copilot' : 'You'}
            {isAi && <span style={{ marginLeft: 8, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--teal-text)', fontWeight: 700 }}>AI-generated</span>}
          </div>
          <div style={{
            background: isAi ? 'linear-gradient(180deg, #F0FDFA, #E6F7F4)' : '#fff',
            border: '1px solid ' + (isAi ? 'rgba(0,168,150,0.22)' : 'var(--arsela-border)'),
            borderRadius: 12, padding: 16,
            fontSize: 14, lineHeight: 1.55, color: 'var(--arsela-navy)',
          }}>
            {children}
            {chart && <div style={{ marginTop: 12 }}>{chart}</div>}
            {cite && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,168,150,0.18)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--teal-text)', fontWeight: 600 }}>
                <IconFile size={12}/> Sourced from {cite}
              </div>
            )}
            {chips && (
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {chips.map(c => (
                  <button key={c} onClick={() => onChipClick && onChipClick(c)} style={{
                    padding: '6px 12px', borderRadius: 999,
                    background: '#fff', border: '1px solid rgba(0,168,150,0.35)',
                    fontSize: 12, fontWeight: 600, color: 'var(--teal-text)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>{c}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Current quarter/date context, computed live from Store's fiscal-year
  // helpers so the seeded conversation never shows a stale hardcoded
  // quarter (e.g. "Q3") once APP_TODAY advances or the app is redeployed.
  function currentFyContext() {
    const today = window.Store.today();
    const qLabel = window.Store.fyQuarterLabel(today); // e.g. "Q1 FY2027"
    const qShort = 'Q' + window.Store.fyQuarterOf(today); // e.g. "Q1"
    const dateLabel = today.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
    const priorQShort = 'Q' + (window.Store.fyQuarterOf(today) === 1 ? 4 : window.Store.fyQuarterOf(today) - 1);
    const nextQShort = 'Q' + (window.Store.fyQuarterOf(today) === 4 ? 1 : window.Store.fyQuarterOf(today) + 1);
    return { qLabel, qShort, dateLabel, priorQShort, nextQShort };
  }

  function getInitialMessages() {
    const { qLabel, qShort, dateLabel, nextQShort } = currentFyContext();
    return [
      { role: 'user', text: `Why is ${qShort} tracking behind plan, and which divisions are driving it?` },
      {
        role: 'ai',
        cite: `${qShort} reforecast · Monthly monitoring · 6 division submissions`,
        body: (
          <React.Fragment>
            <div>{qLabel} is tracking <b>{curLabel(20)} behind plan</b> ({curLabel(43)} actual vs {curLabel(63)} planned through {dateLabel}). Three factors explain most of the shortfall:</div>
            <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 20, lineHeight: 1.7 }}>
              <li><b style={{ color: 'var(--danger)' }}>IT overspend ({curLabel(5.6, 1)})</b> — vendor overrun on ERP migration; classified as non-recurring.</li>
              <li><b style={{ color: 'var(--warning)' }}>Property & Aviation overdue submissions</b> — {curLabel(15.3, 1)} of forecast still uncommitted.</li>
              <li><b style={{ color: 'var(--success)' }}>Solar rollout delayed</b> — freed {curLabel(3.2, 1)} vs plan; recommend reallocation to LNG Phase I.</li>
            </ul>
          </React.Fragment>
        ),
      },
      { role: 'user', text: 'Show me the trend and forecast for the rest of the year.' },
      {
        role: 'ai',
        cite: 'Monthly monitoring · Quarterly planning · 12-month rolling forecast',
        chart: true,
        chips: ['Draft board narrative', 'Compare to prior-year quarter', 'Explain by category', 'Recommend actions'],
        body: (
          <React.Fragment>
            <div>Based on actuals to date plus current commitments, the model projects <b>full-year spend of {curLabel(254.8, 1)} (base case)</b>, {curLabel(6.4, 1)} above plan. The chart shows monthly cumulative burn trending back within tolerance from {nextQShort} onwards once the ERP migration completes.</div>
            <div style={{ marginTop: 10 }}>Confidence: <b>78%</b> based on 3 comparable quarters. Suggested next steps below.</div>
          </React.Fragment>
        ),
      },
    ];
  }

  function getInitialConversations() {
    const { qShort } = currentFyContext();
    return [
      { t: `${qShort} variance explanation`, when: 'Just now', active: true },
      { t: 'Draft board narrative — H1', when: 'Yesterday' },
      { t: 'CAPEX runway scenarios',    when: '2 days ago' },
      { t: 'IT overspend root cause',   when: '3 days ago' },
      { t: 'Reforecast impact',         when: 'Last week' },
      { t: 'Payroll uplift modelling',  when: 'Last week' },
    ];
  }

  const CAPABILITIES = [
    { i: '✎', t: 'Executive commentary',   d: 'Draft board & audit narratives from live data' },
    { i: '⚠', t: 'Variance explanation',    d: 'Auto-explain over/underspend by driver' },
    { i: '↗', t: 'Trend identification',    d: 'Spot momentum in revenue, cost, headcount' },
    { i: '⚕', t: 'Anomaly detection',       d: 'Flag unusual line items before month-close' },
    { i: '⚖', t: 'Scenario comparison',     d: 'Model upside/downside on any assumption' },
    { i: '☑', t: 'Planning recommendations', d: 'Reallocation suggestions with impact preview' },
  ];

  const SUGGESTIONS = ['Draft board narrative', 'Explain a variance', 'Compare quarters', 'Suggest scenarios', 'Detect anomalies'];

  // Very simple keyword-driven canned response generator, grounded in live Store data.
  function generateAiReply(userText) {
    const s = window.Store.getState();
    const q = userText.toLowerCase();

    if (q.includes('board') || q.includes('narrative')) {
      const overBudget = s.budgets.filter(b => b.status === 'over');
      return {
        cite: 'Live budgets · Store snapshot',
        body: (
          <React.Fragment>
            <div>Draft board narrative:</div>
            <div style={{ marginTop: 8 }}>
              "Group spend YTD remains within tolerance across most divisions. {overBudget.length} budget line{overBudget.length !== 1 ? 's are' : ' is'} currently over-plan
              ({overBudget.map(b => b.name).join(', ') || 'none'}), representing a manageable variance that Finance is monitoring closely.
              Capital deployment continues on schedule, with cash runway comfortably above the board-mandated minimum threshold."
            </div>
          </React.Fragment>
        ),
      };
    }
    if (q.includes('anomal')) {
      return {
        cite: 'Expenses ledger · Store snapshot',
        body: <div>Scanning recent expenses for anomalies: no single transaction this period exceeds 3× its category's rolling average. The largest single line remains the ERP migration invoice ({fmtMYR(214500)}), which is expected per the signed SOW milestone schedule.</div>,
      };
    }
    if (q.includes('scenario') || q.includes('upside') || q.includes('downside')) {
      return {
        cite: 'Quarterly planning · scenario model',
        chart: true,
        body: <div>Base case projects full-year spend of {curLabel(254.8, 1)}. Upside scenario (delayed CAPEX, tighter opex controls) brings this to {curLabel(241.2, 1)}; downside scenario (ERP overrun continues, MRO volumes stay elevated) pushes to {curLabel(268.5, 1)}. Recommend planning against the base case with a downside contingency buffer.</div>,
      };
    }
    if (q.includes('over') && (q.includes('budget') || q.includes('spend'))) {
      const overBudget = s.budgets.filter(b => b.status === 'over');
      return {
        cite: 'Live budgets · Store snapshot',
        body: (
          <React.Fragment>
            <div>Currently <b>{overBudget.length}</b> budget{overBudget.length !== 1 ? 's are' : ' is'} over-plan:</div>
            <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 20, lineHeight: 1.7 }}>
              {overBudget.map(b => (
                <li key={b.id}><b>{b.name}</b> ({b.dept}) — {fmtMYR(b.spent, {compact:true})} spent of {fmtMYR(b.allocated, {compact:true})} allocated.</li>
              ))}
              {overBudget.length === 0 && <li>No budgets are currently over-plan.</li>}
            </ul>
          </React.Fragment>
        ),
      };
    }
    if (q.includes('approval') || q.includes('pending')) {
      const pending = s.approvals.filter(a => a.status === 'pending');
      return {
        cite: 'Approvals queue · Store snapshot',
        body: (
          <React.Fragment>
            <div>There are currently <b>{pending.length}</b> item{pending.length !== 1 ? 's' : ''} pending approval, totalling {fmtMYR(pending.reduce((s,a)=>s+a.amount,0), {compact:true})}.</div>
            {pending.length > 0 && <div style={{ marginTop: 8 }}>The largest is <b>{pending[0].title}</b> ({fmtMYR(pending[0].amount, {compact:true})}), requested by {pending[0].requester}.</div>}
          </React.Fragment>
        ),
        chips: ['View Approvals'],
      };
    }
    if (q.includes('quarter')) {
      const { qShort, priorQShort } = currentFyContext();
      return {
        cite: 'Quarterly planning · division submissions',
        chart: true,
        body: <div>Comparing quarter-over-quarter, {qShort} divisional submissions show broadly stable performance versus {priorQShort}, with Ports & Logistics and Operations tracking ahead of plan while People & Culture and Aviation remain the two divisions to watch.</div>,
      };
    }
    // Generic fallback grounded in current data
    const totalAllocated = s.budgets.reduce((sum,b)=>sum+b.allocated,0);
    const totalSpent = s.budgets.reduce((sum,b)=>sum+b.spent,0);
    return {
      cite: 'Live budgets · Store snapshot',
      body: (
        <React.Fragment>
          <div>Based on your current portfolio: {fmtMYR(totalSpent, {compact:true})} spent of {fmtMYR(totalAllocated, {compact:true})} allocated across {s.budgets.length} budgets ({((totalSpent/totalAllocated)*100).toFixed(1)}% utilisation).</div>
          <div style={{ marginTop: 8 }}>Ask me about variance, forecasts, specific budgets, pending approvals, or request a board narrative draft.</div>
        </React.Fragment>
      ),
      chips: ['Draft board narrative', 'Explain a variance', 'Detect anomalies'],
    };
  }

  const CopilotScreen = () => {
    const [conversations, setConversations] = React.useState(getInitialConversations);
    const [messages, setMessages] = React.useState(getInitialMessages);
    const [draft, setDraft] = React.useState('');
    const [thinking, setThinking] = React.useState(false);
    const scrollRef = React.useRef(null);

    React.useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, thinking]);

    const sendMessage = (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed || thinking) return;
      setMessages(m => [...m, { role: 'user', text: trimmed }]);
      setDraft('');
      setThinking(true);
      setTimeout(() => {
        const reply = generateAiReply(trimmed);
        setMessages(m => [...m, { role: 'ai', ...reply }]);
        setThinking(false);
      }, 700);
    };

    const onChipClick = (chip) => {
      if (chip === 'View Approvals') { window.Router.go('/approvals'); return; }
      sendMessage(chip);
    };

    const newChat = () => {
      setMessages([]);
      setConversations(c => [{ t: 'New conversation', when: 'Just now', active: true }, ...c.map(x => ({ ...x, active: false }))]);
      window.Store.toast('Started new conversation', 'info');
    };

    const saveTranscript = () => {
      window.Store.toast(`Transcript saved (${messages.length} messages)`, 'success');
    };

    const onComposerKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(draft);
      }
    };

    return (
      <AppFrame
        active="Copilot"
        title="AI Copilot"
        breadcrumb={['Arsela Resources', 'Analyse', 'AI Copilot']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconRefresh size={15}/>} onClick={newChat}>New conversation</ArsButton>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={saveTranscript}>Save transcript</ArsButton>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 16, height: 'calc(100% - 20px)' }}>
          {/* Left: history */}
          <ArsCard padded={false} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', marginBottom: 12 }}>Recent conversations</div>
              {conversations.map((c, i) => (
                <div key={i} onClick={() => setConversations(cs => cs.map((x,xi) => ({ ...x, active: xi === i })))} style={{
                  padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                  background: c.active ? 'var(--arsela-teal-50)' : 'transparent',
                  borderLeft: c.active ? '2px solid var(--teal-brand)' : '2px solid transparent',
                  marginBottom: 2,
                }}>
                  <div style={{ fontSize: 13, fontWeight: c.active ? 600 : 500, color: 'var(--arsela-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.t}</div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-subtle)', marginTop: 2 }}>{c.when}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--arsela-border)' }}>
              <ArsButton variant="secondary" size="sm" full icon={<IconPlus size={13}/>} onClick={newChat}>New chat</ArsButton>
            </div>
          </ArsCard>

          {/* Center: conversation */}
          <ArsCard padded={false} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--arsela-gradient-ai)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}><SparkleIcon size={15}/></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)' }}>{(conversations.find(c=>c.active)||{}).t || 'New conversation'}</div>
                  <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)' }}>{messages.length} messages · grounded in your live budgets, approvals & expenses</div>
                </div>
              </div>
              <ArsBadge tone="teal" dot size="sm">Live · sourced from your data</ArsBadge>
            </div>

            <div ref={scrollRef} className="arsela-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {messages.length === 0 && (
                <ArsEmpty icon={<SparkleIcon size={22}/>} title="Start a new conversation" body="Ask Copilot about your budgets, variance, forecasts, or approvals."/>
              )}
              {messages.map((m, i) => (
                <CopilotMessage
                  key={i}
                  role={m.role}
                  cite={m.cite}
                  chart={m.chart ? <AiChart/> : undefined}
                  chips={m.chips}
                  onChipClick={onChipClick}
                >
                  {m.role === 'user' ? m.text : m.body}
                </CopilotMessage>
              ))}
              {thinking && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--arsela-gradient-ai)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', flexShrink: 0,
                  }}><SparkleIcon size={18}/></div>
                  <div style={{
                    background: 'linear-gradient(180deg, #F0FDFA, #E6F7F4)',
                    border: '1px solid rgba(0,168,150,0.22)',
                    borderRadius: 12, padding: 16, fontSize: 13, color: 'var(--arsela-text-muted)',
                  }}>Copilot is thinking…</div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div style={{ padding: 16, borderTop: '1px solid var(--arsela-border)', background: 'var(--arsela-surface-alt)' }}>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 8,
                background: '#fff', border: '1px solid var(--arsela-border-strong)',
                borderRadius: 12, padding: '10px 12px',
              }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Ask Copilot about your budgets, variance, forecasts…"
                  rows={1}
                  style={{
                    flex: 1, fontSize: 14, color: 'var(--arsela-navy)', border: 'none', outline: 'none',
                    resize: 'none', fontFamily: 'inherit', background: 'transparent', maxHeight: 80,
                  }}
                />
                <button onClick={() => sendMessage(draft)} disabled={!draft.trim() || thinking} style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--arsela-gradient-ai)', color: '#fff',
                  border: 'none', cursor: (!draft.trim() || thinking) ? 'not-allowed' : 'pointer',
                  opacity: (!draft.trim() || thinking) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} aria-label="Send">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l14-8-6 16-2-7z"/></svg>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{
                    padding: '5px 10px', fontSize: 11.5, borderRadius: 999,
                    background: '#fff', border: '1px solid var(--arsela-border-strong)',
                    color: 'var(--arsela-navy)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </ArsCard>

          {/* Right: capabilities panel */}
          <ArsCard padded={false} style={{ background: 'linear-gradient(180deg, #14375E 0%, #001F3D 100%)', color: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <SparkleIcon size={20}/>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>What Copilot can do</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>
                Grounded on your ledger, budgets, forecasts and workflow — never generic.
              </div>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CAPABILITIES.map((c, i) => (
                <div key={i} onClick={() => sendMessage(c.t)} style={{
                  display: 'flex', gap: 10, padding: 10, cursor: 'pointer',
                  borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    background: 'rgba(0,168,150,0.3)', color: '#00D6BE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                  }}>{c.i}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{c.t}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, lineHeight: 1.4 }}>{c.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              Copilot is <b style={{ color: '#00D6BE' }}>read-only</b>. All actions still route through your standard approval workflow.
            </div>
          </ArsCard>
        </div>
      </AppFrame>
    );
  };

  Object.assign(window, { CopilotScreen, CopilotMessage, SparkleIcon, AiChart });
})();
