/* CAPEX Portfolio — wired to window.Store.capexProjects with real
   Add / Edit / Delete, asset-level view with depreciation schedule. */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  const DEP_SCHEDULE = [
    { cls: 'Buildings',   life: '30 yrs', y1: 22.4, y5: 112.0, y10: 224.0 },
    { cls: 'Machinery',   life: '10 yrs', y1: 13.1, y5:  65.5, y10: 130.5 },
    { cls: 'Software',    life:  '5 yrs', y1:  5.7, y5:  28.4, y10:  28.4 },
    { cls: 'IT hardware', life:  '4 yrs', y1:  3.2, y5:  12.8, y10:  12.8 },
  ];

  const STAGE_FILTERS = ['All', 'Executing', 'Completing', 'Approved'];
  const STAGE_OPTIONS = ['Approved', 'Executing', 'Completing'];
  const CATEGORY_OPTIONS = ['Buildings', 'Machinery', 'Software', 'IT hardware'];

  function ProjectFormModal({ project, onClose }) {
    const isEdit = !!project;
    const [form, setForm] = useState(() => ({
      name: project?.name || '', category: project?.category || 'Buildings',
      owner: project?.owner || '', eta: project?.eta || '',
      approved: project?.approved ?? '', committed: project?.committed ?? 0,
      spent: project?.spent ?? 0, stage: project?.stage || 'Approved',
    }));
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const save = () => {
      if (!form.name.trim()) { window.Store.toast('Project name is required', 'danger'); return; }
      if (!form.approved || Number(form.approved) <= 0) { window.Store.toast('Approved envelope must be greater than 0', 'danger'); return; }
      const patch = {
        name: form.name.trim(), category: form.category, owner: form.owner.trim() || 'Unassigned',
        eta: form.eta.trim() || 'TBD', approved: Number(form.approved) || 0,
        committed: Number(form.committed) || 0, spent: Number(form.spent) || 0, stage: form.stage,
      };
      if (isEdit) window.Store.updateCapexProject(project.code, patch);
      else window.Store.addCapexProject(patch);
      onClose();
    };

    return (
      <ArsModal open onClose={onClose} title={isEdit ? `Edit ${project.code}` : 'New CAPEX project'} subtitle={isEdit ? project.name : 'Adds to the capital projects portfolio'}
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>{isEdit ? 'Save changes' : 'Create project'}</ArsButton></>}>
        <ArsField label="Project name"><input value={form.name} onChange={set('name')} style={arsFieldInputStyle}/></ArsField>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Category">
            <select value={form.category} onChange={set('category')} style={arsFieldInputStyle}>
              {CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Stage">
            <select value={form.stage} onChange={set('stage')} style={arsFieldInputStyle}>
              {STAGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </ArsField></div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Owner"><input value={form.owner} onChange={set('owner')} placeholder="e.g. Faris H." style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Target ETA"><input value={form.eta} onChange={set('eta')} placeholder="e.g. Q4 2027" style={arsFieldInputStyle}/></ArsField></div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Approved (RM)"><input type="number" value={form.approved} onChange={set('approved')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Committed (RM)"><input type="number" value={form.committed} onChange={set('committed')} style={arsFieldInputStyle}/></ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Spent (RM)"><input type="number" value={form.spent} onChange={set('spent')} style={arsFieldInputStyle}/></ArsField></div>
        </div>
      </ArsModal>
    );
  }

  const CapexScreen = () => {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);

    const [stageFilter, setStageFilter] = useState('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editProject, setEditProject] = useState(null);
    const [deleteProject, setDeleteProject] = useState(null);
    const filterRef = useRef(null);

    useEffect(() => {
      const onDoc = (e) => {
        if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const CAPEX_PROJECTS = s.capexProjects;

    const projects = useMemo(
      () => stageFilter === 'All' ? CAPEX_PROJECTS : CAPEX_PROJECTS.filter(p => p.stage === stageFilter),
      [CAPEX_PROJECTS, stageFilter]
    );

    const totals = CAPEX_PROJECTS.reduce((a, p) => ({
      approved: a.approved + p.approved,
      committed: a.committed + p.committed,
      spent: a.spent + p.spent,
    }), { approved: 0, committed: 0, spent: 0 });

    const catTotals = {};
    CAPEX_PROJECTS.forEach(p => { catTotals[p.category] = (catTotals[p.category] || 0) + p.approved; });
    const catColors = { Buildings: '#1343CB', Machinery: '#00A896', Software: '#5B9EFF', 'IT hardware': '#B4740A' };
    const catData = Object.entries(catTotals).map(([k, v]) => ({ label: k, value: v, color: catColors[k] || '#5B6B82' }));

    const pendingSanction = CAPEX_PROJECTS.filter(p => p.stage === 'Approved' && p.committed / (p.approved || 1) < 0.2);

    return (
      <AppFrame
        active="CAPEX"
        title="CAPEX Portfolio"
        breadcrumb={['Arsela Resources', 'Financials', 'CAPEX Portfolio']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconExport size={15}/>} onClick={() => window.Store.toast('Exporting CAPEX portfolio…', 'info')}>Export</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => setAddOpen(true)}>New project</ArsButton>
          </div>
        }
      >
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Approved envelope</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(totals.approved, { compact: true })}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>{CAPEX_PROJECTS.length} active projects</div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Committed</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(totals.committed, { compact: true })}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <ArsProgress value={totals.approved ? (totals.committed / totals.approved) * 100 : 0} tone="blue" style={{ flex: 1 }}/>
              <span className="arsela-num" style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>{totals.approved ? ((totals.committed / totals.approved) * 100).toFixed(0) : 0}%</span>
            </div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Spent to date</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(totals.spent, { compact: true })}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <ArsProgress value={totals.approved ? (totals.spent / totals.approved) * 100 : 0} tone="teal" style={{ flex: 1 }}/>
              <span className="arsela-num" style={{ fontSize: 11, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>{totals.approved ? ((totals.spent / totals.approved) * 100).toFixed(0) : 0}%</span>
            </div>
          </ArsCard>
          <ArsCard>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Sanction pending</div>
            <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--warning)', marginTop: 10, letterSpacing: -0.4 }}>{fmtMYR(pendingSanction.reduce((s, p) => s + p.approved, 0), { compact: true })}</div>
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>{pendingSanction[0] ? `${pendingSanction[0].name} — awaiting exec approval` : 'None outstanding'}</div>
          </ArsCard>
        </div>

        {/* Category donut + depreciation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <ArsCard>
            <ArsSectionHeader title="Envelope by category" subtitle="Share of approved CAPEX · FY26"/>
            {catData.length === 0 ? (
              <ArsEmpty icon={<IconBuilding size={22}/>} title="No CAPEX projects yet" body="Create your first project to see the breakdown."/>
            ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <svg width="180" height="180">
                {(() => {
                  const cx = 90, cy = 90, r = 70, sw = 24;
                  const total = catData.reduce((s, d) => s + d.value, 0);
                  const circ = 2 * Math.PI * r;
                  let acc = 0;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={r} stroke="#F1F3F7" strokeWidth={sw} fill="none"/>
                      {catData.map((d, i) => {
                        const len = (d.value / total) * circ;
                        const off = -acc;
                        acc += len;
                        return (
                          <circle key={i} cx={cx} cy={cy} r={r} stroke={d.color} strokeWidth={sw} fill="none"
                            strokeDasharray={`${len} ${circ}`} strokeDashoffset={off}
                            transform={`rotate(-90 ${cx} ${cy})`}/>
                        );
                      })}
                      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#5B6B82" fontWeight="600">Approved</text>
                      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="18" fill="#001F3D" fontWeight="700">{fmtMYR(total, { compact: true })}</text>
                    </g>
                  );
                })()}
              </svg>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {catData.map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }}/>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--arsela-navy)', fontWeight: 500 }}>{d.label}</span>
                    <span className="arsela-num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(d.value, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </ArsCard>

          <ArsCard>
            <ArsSectionHeader title="Depreciation schedule" subtitle="Straight-line · asset class · RM millions/year"/>
            <div className="coplan-scrollx">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 420 }}>
              {DEP_SCHEDULE.map(d => (
                <div key={d.cls} className="coplan-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '110px 60px 1fr 1fr 1fr', gap: 12, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--arsela-navy)', fontWeight: 600 }}>{d.cls}</span>
                  <span style={{ color: 'var(--arsela-text-muted)', fontSize: 12 }}>{d.life}</span>
                  <span className="arsela-num" style={{ textAlign: 'right', color: 'var(--arsela-navy)' }}>{d.y1.toFixed(1)}M</span>
                  <span className="arsela-num" style={{ textAlign: 'right', color: 'var(--arsela-navy)' }}>{d.y5.toFixed(1)}M</span>
                  <span className="arsela-num" style={{ textAlign: 'right', color: 'var(--arsela-navy)', fontWeight: 600 }}>{d.y10.toFixed(1)}M</span>
                </div>
              ))}
              <div className="coplan-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '110px 60px 1fr 1fr 1fr', gap: 12, marginTop: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--arsela-text-subtle)' }}>
                <span></span><span></span>
                <span style={{ textAlign: 'right' }}>Y1</span>
                <span style={{ textAlign: 'right' }}>Y5 cum.</span>
                <span style={{ textAlign: 'right' }}>Y10 cum.</span>
              </div>
            </div>
            </div>
          </ArsCard>
        </div>

        {/* Projects table */}
        <ArsCard padded={false}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Capital projects portfolio</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Buildings · Machinery · Software · multi-stage sanctions{stageFilter !== 'All' ? ` · Filtered: ${stageFilter}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, position: 'relative' }} ref={filterRef}>
              <ArsButton variant="secondary" size="sm" icon={<IconFilter size={13}/>} onClick={() => setShowFilterMenu(v => !v)}>Filter{stageFilter !== 'All' ? `: ${stageFilter}` : ''}</ArsButton>
              {showFilterMenu && (
                <div style={{
                  position: 'absolute', top: 34, right: 0, background: '#fff',
                  border: '1px solid var(--arsela-border)', borderRadius: 10, boxShadow: 'var(--arsela-shadow-card)',
                  zIndex: 20, minWidth: 160, padding: 6,
                }}>
                  {STAGE_FILTERS.map(f => (
                    <div key={f} onClick={() => { setStageFilter(f); setShowFilterMenu(false); }} style={{
                      padding: '8px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                      color: f === stageFilter ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                      fontWeight: f === stageFilter ? 700 : 500,
                      background: f === stageFilter ? 'var(--arsela-blue-50)' : 'transparent',
                    }}>{f}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="coplan-scrollx" style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--arsela-surface-alt)', borderBottom: '1px solid var(--arsela-border)' }}>
                  {['Project', 'Category', 'Stage', 'Owner', 'Approved', 'Committed', 'Spent', 'Utilisation', 'ETA', 'Actions'].map(h => (
                    <th key={h} style={{
                      textAlign: ['Approved','Committed','Spent'].includes(h) ? 'right' : 'left',
                      padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)',
                      letterSpacing: 0.6, textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan={10}>
                    <ArsEmpty icon={<IconFilter size={22}/>} title="No projects match this filter" body="Try a different stage filter, or create a new project."/>
                  </td></tr>
                ) : projects.map((p) => {
                  const util = p.approved ? (p.spent / p.approved) * 100 : 0;
                  const stageChip = p.stage === 'Completing' ? 'success' : p.stage === 'Executing' ? 'blue' : 'warning';
                  return (
                    <tr key={p.code} style={{ borderBottom: '1px solid var(--arsela-border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--arsela-surface-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '13px 16px', maxWidth: 260 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{p.code}</div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--arsela-text-muted)' }}>{p.category}</td>
                      <td style={{ padding: '13px 16px' }}><ArsBadge tone={stageChip} dot size="sm">{p.stage}</ArsBadge></td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ArsAvatar name={p.owner} size={22} tone="blue"/>
                          <span style={{ fontSize: 13, color: 'var(--arsela-navy)' }}>{p.owner}</span>
                        </div>
                      </td>
                      <td className="arsela-num" style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(p.approved, { compact: true })}</td>
                      <td className="arsela-num" style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13, color: 'var(--arsela-navy)' }}>{fmtMYR(p.committed, { compact: true })}</td>
                      <td className="arsela-num" style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{fmtMYR(p.spent, { compact: true })}</td>
                      <td style={{ padding: '13px 16px', width: 160 }}>
                        <ArsProgress value={util} tone="blue" showValue/>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--arsela-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{p.eta}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, color: 'var(--arsela-text-subtle)' }}>
                          <button onClick={() => setEditProject(p)} title="Edit" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconEdit size={15}/></button>
                          <button onClick={() => setDeleteProject(p)} title="Delete" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arsela-danger)' }}><IconTrash size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ArsCard>

        {addOpen && <ProjectFormModal onClose={() => setAddOpen(false)}/>}
        {editProject && <ProjectFormModal project={editProject} onClose={() => setEditProject(null)}/>}
        <ArsConfirmDialog
          open={!!deleteProject}
          onClose={() => setDeleteProject(null)}
          onConfirm={() => deleteProject && window.Store.deleteCapexProject(deleteProject.code)}
          title="Delete CAPEX project?"
          message={deleteProject ? `This will permanently remove "${deleteProject.name}" (${deleteProject.code}). This cannot be undone.` : ''}
        />
      </AppFrame>
    );
  };

  Object.assign(window, { CapexScreen });
})();
