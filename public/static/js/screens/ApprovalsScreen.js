/* Approvals inbox — wired to Store.approvals, list selection + approve/reject/request changes */
(function () {
  const { useState, useEffect, useMemo } = React;

  const ApprovalCard = ({ selected, item, onClick }) => (
    <div onClick={onClick} style={{
      padding: '14px 18px', borderLeft: selected ? '3px solid var(--arsela-blue)' : '3px solid transparent',
      borderBottom: '1px solid var(--arsela-border)',
      background: selected ? 'var(--arsela-blue-50)' : '#fff', cursor: 'pointer',
      paddingLeft: selected ? 15 : 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <ArsBadge tone={item.type === 'Expense' ? 'teal' : item.type === 'CAPEX sanction' ? 'navy' : 'blue'} size="sm">{item.type}</ArsBadge>
        {item.urgent && <ArsBadge tone="danger" size="sm" dot>Urgent</ArsBadge>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--arsela-text-subtle)' }}>{item.when}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)', lineHeight: 1.35 }}>{item.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <ArsAvatar name={item.requester} size={20} tone="blue"/>
        <span style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>{item.requester}</span>
        <span style={{ marginLeft: 'auto' }} className="arsela-num">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(item.amount, { compact: true })}</span>
        </span>
      </div>
      {item.status !== 'pending' && (
        <div style={{ marginTop: 8 }}>
          <ArsBadge tone={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'} size="sm" dot>
            {item.status === 'changes_requested' ? 'Changes requested' : item.status}
          </ArsBadge>
        </div>
      )}
    </div>
  );

  function ApprovalsScreen() {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);

    const items = s.approvals;
    const [selectedId, setSelectedId] = useState(items[0]?.id || null);
    const [note, setNote] = useState('');
    const [filter, setFilter] = useState('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [withdrawTarget, setWithdrawTarget] = useState(null);
    const filterRef = React.useRef(null);
    useEffect(() => {
      if (!showFilterMenu) return;
      const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [showFilterMenu]);

    const selected = items.find((it) => it.id === selectedId) || items[0];

    const counts = useMemo(() => {
      const pending = items.filter((i) => i.status === 'pending');
      return {
        All: pending.length,
        Budgets: pending.filter((i) => i.type.toLowerCase().includes('budget')).length,
        Expenses: pending.filter((i) => i.type === 'Expense').length,
        Other: pending.filter((i) => !i.type.toLowerCase().includes('budget') && i.type !== 'Expense').length,
      };
    }, [items]);

    const pendingTotal = items.filter((i) => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);

    const visibleItems = useMemo(() => items.filter((it) => {
      if (filter === 'All') return true;
      if (filter === 'Budgets') return it.type.toLowerCase().includes('budget');
      if (filter === 'Expenses') return it.type === 'Expense';
      return !it.type.toLowerCase().includes('budget') && it.type !== 'Expense';
    }), [items, filter]);

    if (!selected) {
      return (
        <AppFrame active="Approvals" title="Approvals" breadcrumb={['Arsela Resources', 'Plan', 'Approvals']}>
          <ArsEmpty icon={<IconApproval size={22}/>} title="No approvals" body="You're all caught up."/>
        </AppFrame>
      );
    }

    const decide = (action) => {
      const map = { approve: 'approveItem', reject: 'rejectItem', changes: 'requestChanges' };
      window.Store[map[action]](selected.id, note.trim() || undefined);
      setNote('');
      // move selection to next pending item
      const nextPending = items.find((it) => it.id !== selected.id && it.status === 'pending');
      if (nextPending) setSelectedId(nextPending.id);
    };

    const approveAllSafe = () => {
      const safe = items.filter((i) => i.status === 'pending' && !i.urgent && i.amount < 100_000);
      if (safe.length === 0) {
        window.Store.toast('No safe items to auto-approve', 'info');
        return;
      }
      safe.forEach((i) => window.Store.approveItem(i.id));
    };

    const utilisationImpact = [
      ['Dept · Current', 48, 'blue'],
      ['Dept · After approval', Math.min(100, Math.round(48 + selected.amount / 5_000_000)), 'teal'],
      ['Group FY26 envelope', 71, 'navy'],
    ];

    return (
      <AppFrame
        active="Approvals"
        title="Approvals"
        breadcrumb={['Arsela Resources', 'Plan', 'Approvals']}
        topActions={
          <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={filterRef}>
            <ArsButton variant="secondary" size="md" icon={<IconFilter size={15}/>} onClick={() => setShowFilterMenu((v) => !v)}>Filter{filter !== 'All' ? `: ${filter}` : ''}</ArsButton>
            {showFilterMenu && (
              <div style={{
                position: 'absolute', top: 42, left: 0, minWidth: 160,
                background: '#fff', border: '1px solid var(--arsela-border)', borderRadius: 10,
                boxShadow: 'var(--arsela-shadow-elevated)', zIndex: 50, padding: 4,
              }}>
                {['All', 'Budgets', 'Expenses', 'Other'].map((f) => (
                  <button key={f} onClick={() => { setFilter(f); setShowFilterMenu(false); }} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6,
                    border: 'none', background: f === filter ? 'var(--arsela-blue-50)' : 'transparent',
                    color: f === filter ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                    fontSize: 13, fontWeight: f === filter ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{f}</button>
                ))}
              </div>
            )}
            <ArsButton variant="secondary" size="md" onClick={approveAllSafe}>Approve all safe</ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          <ArsCard padded={false} style={{ overflow: 'hidden' }}>
            <div className="coplan-approvals-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', height: 780 }}>
              <div style={{ borderRight: '1px solid var(--arsela-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--arsela-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Awaiting you</div>
                    <ArsBadge tone="blue">{counts.All} items · {fmtMYR(pendingTotal, { compact: true })}</ArsBadge>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                    {['All', 'Budgets', 'Expenses', 'Other'].map((t) => (
                      <button key={t} onClick={() => setFilter(t)} style={{
                        padding: '5px 10px', fontSize: 11.5, fontWeight: 600, borderRadius: 999,
                        background: filter === t ? 'var(--arsela-navy)' : '#F1F3F7',
                        color: filter === t ? '#fff' : 'var(--arsela-text-muted)',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      }}>{t} {counts[t]}</button>
                    ))}
                  </div>
                </div>
                <div className="arsela-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                  {visibleItems.map((it) => <ApprovalCard key={it.id} item={it} selected={it.id === selected.id} onClick={() => { setSelectedId(it.id); setNote(''); }}/>)}
                  {visibleItems.length === 0 && <ArsEmpty icon={<IconApproval size={20}/>} title="Nothing here" body="No items in this filter."/>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--arsela-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <ArsBadge tone="blue">{selected.type}</ArsBadge>
                    {selected.urgent && <ArsBadge tone="danger" dot size="sm">Urgent</ArsBadge>}
                    <ArsBadge tone="neutral" size="sm">{selected.dept}</ArsBadge>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--arsela-text-muted)' }}>{selected.id} · Submitted {selected.when}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.3 }}>{selected.title}</div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 13, color: 'var(--arsela-text-muted)' }}>
                    <span>Requestor: <b style={{ color: 'var(--arsela-navy)' }}>{selected.requester}</b> · {selected.dept}</span>
                    {selected.status !== 'pending' && <ArsBadge tone={selected.status === 'approved' ? 'success' : selected.status === 'rejected' ? 'danger' : 'warning'} dot>{selected.status === 'changes_requested' ? 'Changes requested' : selected.status}</ArsBadge>}
                  </div>
                </div>

                <div className="arsela-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div style={{ padding: 16, background: 'var(--arsela-blue-50)', borderRadius: 10, border: '1px solid #D6E1FF' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Requested</div>
                      <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(selected.amount, { compact: true })}</div>
                    </div>
                    <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--arsela-border)' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Department</div>
                      <div className="arsela-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{selected.dept}</div>
                    </div>
                    <div style={{ padding: 16, background: 'var(--arsela-teal-50)', borderRadius: 10, border: '1px solid #C8ECE6' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-teal-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</div>
                      <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{selected.type}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Justification</div>
                    <div style={{ fontSize: 13.5, color: 'var(--arsela-navy)', lineHeight: 1.6, background: '#FAFBFD', border: '1px solid var(--arsela-border)', borderRadius: 8, padding: 14 }}>
                      {selected.justification}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Utilisation impact</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#FAFBFD', border: '1px solid var(--arsela-border)', borderRadius: 8, padding: 16 }}>
                      {utilisationImpact.map(([l, v, t], i) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                            <span style={{ color: 'var(--arsela-navy)', fontWeight: 600 }}>{l}</span>
                            <span className="arsela-num" style={{ color: 'var(--arsela-navy)', fontWeight: 700 }}>{v}%</span>
                          </div>
                          <ArsProgress value={v} tone={t} height={7}/>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Approval trail</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {[
                        { name: selected.requester, role: selected.dept + ' · Requestor', status: 'Submitted', tone: 'blue', time: selected.when, tag: 'submit' },
                        { name: 'Nadia Yeoh', role: 'Finance Partner', status: 'Endorsed', tone: 'teal', time: 'Reviewed', tag: 'ok' },
                        { name: 'Keith Johnson', role: 'Group Finance Lead · You', status: selected.status === 'pending' ? 'Awaiting' : (selected.status === 'approved' ? 'Approved' : selected.status === 'rejected' ? 'Rejected' : 'Changes requested'), tone: selected.status === 'pending' ? 'neutral' : (selected.status === 'approved' ? 'success' : selected.status === 'rejected' ? 'danger' : 'warning'), time: selected.status === 'pending' ? '—' : 'Just now', tag: 'me' },
                      ].map((st, i, a) => (
                        <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < a.length - 1 ? 14 : 0, position: 'relative' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: st.tag === 'ok' ? 'var(--arsela-teal)' : st.tag === 'me' && selected.status !== 'pending' ? (selected.status === 'approved' ? 'var(--success)' : selected.status === 'rejected' ? 'var(--danger)' : 'var(--warning)') : st.tag === 'me' ? '#fff' : 'var(--arsela-blue)',
                              border: st.tag === 'me' && selected.status === 'pending' ? '2px dashed var(--arsela-text-subtle)' : 'none',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              {st.tag === 'ok' && <IconCheck size={14}/>}
                              {st.tag === 'submit' && <IconArrowUp size={14}/>}
                              {st.tag === 'me' && selected.status === 'pending' && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--arsela-text-subtle)' }}>3</span>}
                              {st.tag === 'me' && selected.status !== 'pending' && <IconCheck size={14}/>}
                            </div>
                            {i < a.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--arsela-border)', marginTop: 4 }}/>}
                          </div>
                          <div style={{ flex: 1, paddingBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{st.name}</span>
                              <ArsBadge tone={st.tone} size="sm">{st.status}</ArsBadge>
                              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--arsela-text-subtle)' }}>{st.time}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{st.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selected.note && (
                      <div style={{ marginTop: 12, padding: 12, background: '#FAFBFD', border: '1px solid var(--arsela-border)', borderRadius: 8, fontSize: 12.5, color: 'var(--arsela-navy)' }}>
                        <b>Note:</b> {selected.note}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--arsela-border)', background: '#FAFBFD', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input value={note} onChange={(e) => setNote(e.target.value)} disabled={selected.status !== 'pending'} placeholder="Add a note before deciding…" style={{
                    flex: 1, minWidth: 160, height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--arsela-navy)', background: selected.status !== 'pending' ? '#F1F3F7' : '#fff',
                  }}/>
                  <button onClick={() => setWithdrawTarget(selected)} title="Withdraw / delete this item" style={{
                    width: 40, height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--arsela-danger)', flexShrink: 0,
                  }}><IconTrash size={15}/></button>
                  <ArsButton variant="danger" icon={<IconClose size={14}/>} onClick={() => decide('reject')} style={{ opacity: selected.status !== 'pending' ? 0.5 : 1, pointerEvents: selected.status !== 'pending' ? 'none' : 'auto' }}>Reject</ArsButton>
                  <ArsButton variant="secondary" onClick={() => decide('changes')} style={{ opacity: selected.status !== 'pending' ? 0.5 : 1, pointerEvents: selected.status !== 'pending' ? 'none' : 'auto' }}>Request changes</ArsButton>
                  <ArsButton variant="teal" icon={<IconCheck size={14}/>} onClick={() => decide('approve')} style={{ opacity: selected.status !== 'pending' ? 0.5 : 1, pointerEvents: selected.status !== 'pending' ? 'none' : 'auto' }}>Approve · {fmtMYR(selected.amount, { compact: true })}</ArsButton>
                </div>
              </div>
            </div>
          </ArsCard>
        </div>

        <ArsConfirmDialog
          open={!!withdrawTarget}
          onClose={() => setWithdrawTarget(null)}
          onConfirm={() => {
            if (!withdrawTarget) return;
            const nextPending = items.find((it) => it.id !== withdrawTarget.id && it.status === 'pending');
            window.Store.deleteApproval(withdrawTarget.id);
            if (nextPending) setSelectedId(nextPending.id);
          }}
          title="Withdraw approval item?"
          message={withdrawTarget ? `This will permanently remove "${withdrawTarget.title}" (${withdrawTarget.id}) from the approvals queue. This cannot be undone.` : ''}
          confirmLabel="Withdraw"
        />
      </AppFrame>
    );
  }

  Object.assign(window, { ApprovalsScreen, ApprovalCard });
})();
