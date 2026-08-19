/* Reconciliation module — the single source of truth for "has Xero
   actually been reconciled". Mirrors Arsela's real six-lane process:
   Xero vs Westpac #2077, SFR schedule vs Xero, Costentra staff claims
   vs Xero, expenses paid outside Westpac vs Xero, budgeting actuals vs
   Xero, and intercompany items. Every line here can be filtered,
   status-changed, added or removed — window.Store.reconSummary() feeds
   the Dashboard banner and the Director's Report reconciliation card,
   so anything resolved/added here is reflected there immediately.

   Build rule this module exists to support: "Only reconciled Xero
   amounts are classified as actuals. Approved items remain commitments,
   and future amounts remain forecasts." */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  const STATUS_TONE = {
    'Matched': 'success',
    'Reviewed': 'success',
    'Potential match': 'blue',
    'Timing difference': 'warning',
    'Awaiting supporting document': 'warning',
    'Missing in Xero': 'danger',
    'Duplicate': 'danger',
    'Different entity': 'danger',
  };
  const isResolvedStatus = (status) => status === 'Matched' || status === 'Reviewed';

  const ReconRow = ({ item, selected, onClick }) => (
    <div onClick={onClick} style={{
      padding: '14px 18px', borderLeft: selected ? '3px solid var(--arsela-blue)' : '3px solid transparent',
      borderBottom: '1px solid var(--arsela-border)',
      background: selected ? 'var(--arsela-blue-50)' : '#fff', cursor: 'pointer',
      paddingLeft: selected ? 15 : 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <ArsBadge tone={STATUS_TONE[item.status] || 'neutral'} size="sm" dot>{item.status}</ArsBadge>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--arsela-text-subtle)' }}>{item.date}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)', lineHeight: 1.35 }}>{item.description}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source}</span>
        <span style={{ marginLeft: 'auto' }} className="arsela-num">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(item.amount, { compact: true })}</span>
        </span>
      </div>
    </div>
  );

  function ReconciliationScreen() {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);

    const items = s.reconciliations;
    const sources = window.Store.reconSources();
    const statuses = window.Store.reconStatuses();
    const summary = window.Store.reconSummary();

    const [selectedId, setSelectedId] = useState(items[0]?.id || null);
    const [sourceFilter, setSourceFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [note, setNote] = useState('');
    const [showSourceMenu, setShowSourceMenu] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const sourceRef = useRef(null);
    const statusRef = useRef(null);

    useEffect(() => {
      const h = (e) => {
        if (sourceRef.current && !sourceRef.current.contains(e.target)) setShowSourceMenu(false);
        if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusMenu(false);
      };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, []);

    const visibleItems = useMemo(() => items.filter((it) => {
      if (sourceFilter !== 'All' && it.source !== sourceFilter) return false;
      if (statusFilter !== 'All' && it.status !== statusFilter) return false;
      return true;
    }), [items, sourceFilter, statusFilter]);

    useEffect(() => {
      if (!visibleItems.find((it) => it.id === selectedId)) {
        setSelectedId(visibleItems[0]?.id || null);
      }
    }, [visibleItems]);

    const selected = items.find((it) => it.id === selectedId) || visibleItems[0];

    const [form, setForm] = useState({ source: sources[0], description: '', reference: '', amount: '', date: window.Store.today().toISOString().slice(0, 10) });
    const resetForm = () => setForm({ source: sources[0], description: '', reference: '', amount: '', date: window.Store.today().toISOString().slice(0, 10) });

    const submitAdd = () => {
      if (!form.description.trim() || !form.amount) {
        window.Store.toast('Description and amount are required', 'danger');
        return;
      }
      const rec = window.Store.addReconItem({
        source: form.source,
        description: form.description.trim(),
        reference: form.reference.trim() || '—',
        amount: Number(form.amount) || 0,
        date: form.date,
        note: '',
      });
      setSelectedId(rec.id);
      setAddOpen(false);
      resetForm();
    };

    const decide = (status) => {
      if (!selected) return;
      window.Store.setReconStatus(selected.id, status);
      if (note.trim()) window.Store.updateReconItem(selected.id, { note: note.trim() });
      setNote('');
    };

    return (
      <AppFrame
        active="Reconciliations"
        title="Reconciliations"
        breadcrumb={['Arsela Resources', 'Financials', 'Reconciliations']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" icon={<IconPlus size={15}/>} onClick={() => { resetForm(); setAddOpen(true); }}>Add item</ArsButton>
          </div>
        }
      >
        <div className="coplan-page">
          {/* ---- summary strip — the single source of truth also shown on Dashboard / Director's Report ---- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Reconciliation progress</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{summary.pctResolved.toFixed(0)}%</div>
              <div style={{ marginTop: 8 }}><ArsProgress value={summary.pctResolved} tone={summary.pctResolved >= 90 ? 'teal' : summary.pctResolved >= 60 ? 'blue' : 'warning'} height={6}/></div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>{summary.resolved} of {summary.total} items resolved</div>
            </ArsCard>
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Outstanding items</div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: summary.outstanding > 0 ? '#B4740A' : 'var(--arsela-navy)', marginTop: 6 }}>{summary.outstanding}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Not yet Matched / Reviewed</div>
            </ArsCard>
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Outstanding value</div>
              <div className="arsela-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(summary.outstandingValue, { compact: true })}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Sum of unresolved line amounts</div>
            </ArsCard>
            <ArsCard>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Last reviewed</div>
              <div className="arsela-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{summary.latestReviewed || '—'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>Most recent Matched/Reviewed date</div>
            </ArsCard>
          </div>

          {/* ---- by-source breakdown — the 6 lanes ---- */}
          <ArsCard style={{ marginBottom: 20 }}>
            <ArsSectionHeader title="By reconciliation source" subtitle="Each lane compares one Arsela source of truth against Xero"/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {summary.bySource.map((row) => (
                <div key={row.source} onClick={() => { setSourceFilter(row.source); setStatusFilter('All'); }} style={{
                  padding: 12, borderRadius: 8, border: '1px solid var(--arsela-border)',
                  background: sourceFilter === row.source ? 'var(--arsela-blue-50)' : '#FAFBFD', cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 6, lineHeight: 1.3 }}>{row.source}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ArsBadge tone={row.outstanding === 0 ? 'success' : 'warning'} size="sm">{row.resolved}/{row.total} resolved</ArsBadge>
                    {row.outstanding > 0 && <span style={{ fontSize: 11, color: '#B4740A', fontWeight: 600 }}>{row.outstanding} open</span>}
                  </div>
                </div>
              ))}
            </div>
          </ArsCard>

          <ArsCard padded={false} style={{ overflow: 'hidden' }}>
            <div className="coplan-approvals-grid" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', height: 720 }}>
              <div style={{ borderRight: '1px solid var(--arsela-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--arsela-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Ledger items</div>
                    <ArsBadge tone="blue">{visibleItems.length} shown</ArsBadge>
                  </div>
                  <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                    <div ref={sourceRef} style={{ position: 'relative', flex: 1 }}>
                      <ArsButton variant="secondary" size="sm" full icon={<IconFilter size={13}/>} onClick={() => setShowSourceMenu((v) => !v)}>
                        {sourceFilter === 'All' ? 'Source' : sourceFilter.length > 18 ? sourceFilter.slice(0, 16) + '…' : sourceFilter}
                      </ArsButton>
                      {showSourceMenu && (
                        <div style={{
                          position: 'absolute', top: 34, left: 0, minWidth: 260,
                          background: '#fff', border: '1px solid var(--arsela-border)', borderRadius: 10,
                          boxShadow: 'var(--arsela-shadow-elevated)', zIndex: 50, padding: 4,
                        }}>
                          {['All', ...sources].map((f) => (
                            <button key={f} onClick={() => { setSourceFilter(f); setShowSourceMenu(false); }} style={{
                              display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6,
                              border: 'none', background: f === sourceFilter ? 'var(--arsela-blue-50)' : 'transparent',
                              color: f === sourceFilter ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                              fontSize: 12.5, fontWeight: f === sourceFilter ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                            }}>{f}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div ref={statusRef} style={{ position: 'relative', flex: 1 }}>
                      <ArsButton variant="secondary" size="sm" full icon={<IconFilter size={13}/>} onClick={() => setShowStatusMenu((v) => !v)}>
                        {statusFilter === 'All' ? 'Status' : statusFilter}
                      </ArsButton>
                      {showStatusMenu && (
                        <div style={{
                          position: 'absolute', top: 34, left: 0, minWidth: 220,
                          background: '#fff', border: '1px solid var(--arsela-border)', borderRadius: 10,
                          boxShadow: 'var(--arsela-shadow-elevated)', zIndex: 50, padding: 4,
                        }}>
                          {['All', ...statuses].map((f) => (
                            <button key={f} onClick={() => { setStatusFilter(f); setShowStatusMenu(false); }} style={{
                              display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6,
                              border: 'none', background: f === statusFilter ? 'var(--arsela-blue-50)' : 'transparent',
                              color: f === statusFilter ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                              fontSize: 12.5, fontWeight: f === statusFilter ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                            }}>{f}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="arsela-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                  {visibleItems.map((it) => <ReconRow key={it.id} item={it} selected={selected && it.id === selected.id} onClick={() => { setSelectedId(it.id); setNote(''); }}/>)}
                  {visibleItems.length === 0 && <ArsEmpty icon={<IconReconcile size={20}/>} title="Nothing here" body="No items match this filter."/>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selected ? (
                  <ArsEmpty icon={<IconReconcile size={22}/>} title="No reconciliation items" body="Add an item to get started."/>
                ) : (
                  <>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--arsela-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <ArsBadge tone={STATUS_TONE[selected.status] || 'neutral'} dot>{selected.status}</ArsBadge>
                        <ArsBadge tone="neutral" size="sm">{selected.source}</ArsBadge>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--arsela-text-muted)' }}>{selected.id} · {selected.date}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.3 }}>{selected.description}</div>
                      <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 13, color: 'var(--arsela-text-muted)' }}>
                        <span>Reference: <b style={{ color: 'var(--arsela-navy)' }}>{selected.reference}</b></span>
                        {selected.linkedExpenseId && <span>Linked to: <b style={{ color: 'var(--arsela-navy)' }}>{selected.linkedExpenseId}</b></span>}
                      </div>
                    </div>

                    <div className="arsela-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div style={{ padding: 16, background: 'var(--arsela-blue-50)', borderRadius: 10, border: '1px solid #D6E1FF' }}>
                          <div style={{ fontSize: 11.5, color: 'var(--arsela-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</div>
                          <div className="arsela-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{fmtMYR(selected.amount, { compact: true })}</div>
                        </div>
                        <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--arsela-border)' }}>
                          <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Reviewer</div>
                          <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{selected.reviewer || 'Unassigned'}</div>
                        </div>
                        <div style={{ padding: 16, background: 'var(--arsela-teal-50)', borderRadius: 10, border: '1px solid #C8ECE6' }}>
                          <div style={{ fontSize: 11.5, color: 'var(--arsela-teal-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Reviewed</div>
                          <div className="arsela-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 6 }}>{selected.reviewedAt || 'Not yet'}</div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Note</div>
                        <div style={{ fontSize: 13.5, color: 'var(--arsela-navy)', lineHeight: 1.6, background: '#FAFBFD', border: '1px solid var(--arsela-border)', borderRadius: 8, padding: 14 }}>
                          {selected.note || 'No note recorded.'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Set status</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {statuses.map((st) => (
                            <button key={st} onClick={() => decide(st)} style={{
                              padding: '7px 12px', fontSize: 12, fontWeight: 600, borderRadius: 999,
                              background: selected.status === st ? 'var(--arsela-navy)' : '#F1F3F7',
                              color: selected.status === st ? '#fff' : 'var(--arsela-text-muted)',
                              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}>{st}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--arsela-border)', background: '#FAFBFD', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (saved with next status change)…" style={{
                        flex: 1, minWidth: 160, height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', padding: '0 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--arsela-navy)', background: '#fff',
                      }}/>
                      <button onClick={() => setDeleteTarget(selected)} title="Remove this item" style={{
                        width: 40, height: 40, borderRadius: 8, border: '1px solid var(--arsela-border-strong)', background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--arsela-danger)', flexShrink: 0,
                      }}><IconTrash size={15}/></button>
                      <ArsButton variant="teal" icon={<IconCheck size={14}/>} onClick={() => decide('Matched')} style={{ opacity: isResolvedStatus(selected.status) ? 0.5 : 1 }}>Mark matched</ArsButton>
                    </div>
                  </>
                )}
              </div>
            </div>
          </ArsCard>
        </div>

        <ArsModal open={addOpen} onClose={() => setAddOpen(false)} title="Add reconciliation item" subtitle="Log a new line for one of the six reconciliation sources"
          footer={<>
            <ArsButton variant="secondary" onClick={() => setAddOpen(false)}>Cancel</ArsButton>
            <ArsButton variant="primary" onClick={submitAdd}>Add item</ArsButton>
          </>}>
          <ArsField label="Source">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={arsFieldInputStyle}>
              {sources.map((src) => <option key={src} value={src}>{src}</option>)}
            </select>
          </ArsField>
          <ArsField label="Description">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. AWS Malaysia — Cloud hosting" style={arsFieldInputStyle}/>
          </ArsField>
          <ArsField label="Reference">
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. XERO-BILL-88231" style={arsFieldInputStyle}/>
          </ArsField>
          <ArsField label={`Amount (${window.Store.getState().currency})`}>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" style={arsFieldInputStyle}/>
          </ArsField>
          <ArsField label="Date">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={arsFieldInputStyle}/>
          </ArsField>
        </ArsModal>

        <ArsConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (!deleteTarget) return;
            const nextItem = visibleItems.find((it) => it.id !== deleteTarget.id);
            window.Store.deleteReconItem(deleteTarget.id);
            setSelectedId(nextItem ? nextItem.id : null);
          }}
          title="Remove reconciliation item?"
          message={deleteTarget ? `This will permanently remove "${deleteTarget.description}" (${deleteTarget.id}). This cannot be undone.` : ''}
          confirmLabel="Remove"
        />
      </AppFrame>
    );
  }

  Object.assign(window, { ReconciliationScreen, ReconRow });
})();
