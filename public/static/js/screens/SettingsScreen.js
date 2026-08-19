/* Settings — workspace preferences, wired to Store + localStorage */
(function () {

  // Bumped v1 -> v2: Arsela's fiscal year starts 1 July, not January —
  // discard any stale cached settings that still carry the old default.
  const SETTINGS_LS_KEY = 'coplanistra_settings_v2';

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      orgName: 'Arsela Resources',
      fiscalYearStart: 'July',
      emailDigest: true,
      approvalAlerts: true,
      budgetBreachAlerts: true,
      weeklyReport: false,
    };
  }

  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  const Toggle = ({ checked, onChange }) => (
    <div onClick={() => onChange(!checked)} style={{
      width: 40, height: 22, borderRadius: 999, cursor: 'pointer', position: 'relative',
      background: checked ? 'var(--arsela-blue)' : '#CED4E0', transition: 'background 0.15s', flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute',
        top: 2, left: checked ? 20 : 2, transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}/>
    </div>
  );

  const SettingRow = ({ title, desc, control }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--arsela-border)' }}>
      <div style={{ flex: 1, marginRight: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{title}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      {control}
    </div>
  );

  const ChangePasswordCard = () => {
    const [currentPw, setCurrentPw] = React.useState('');
    const [newPw, setNewPw] = React.useState('');
    const [confirmPw, setConfirmPw] = React.useState('');
    const [showCurrent, setShowCurrent] = React.useState(false);
    const [showNew, setShowNew] = React.useState(false);
    const [error, setError] = React.useState('');

    const fieldStyle = {
      width: '100%', height: 40, border: '1px solid var(--arsela-border-strong)',
      borderRadius: 8, padding: '0 38px 0 12px', fontSize: 14, fontFamily: 'inherit',
      outline: 'none', boxSizing: 'border-box',
    };

    const submit = (e) => {
      e.preventDefault();
      setError('');
      if (!currentPw || !newPw || !confirmPw) {
        setError('Please fill in all three fields.');
        return;
      }
      if (newPw !== confirmPw) {
        setError('New password and confirmation do not match.');
        return;
      }
      const res = window.Store.changePassword(currentPw, newPw);
      if (res && res.ok) {
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setShowCurrent(false); setShowNew(false);
      } else if (res) {
        setError(res.error || 'Could not change password.');
      }
    };

    return (
      <ArsCard>
        <ArsSectionHeader title="Change password" subtitle="Update the password for your account"/>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'block' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Current password</div>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                autoComplete="current-password"
                onChange={(e) => setCurrentPw(e.target.value)}
                style={fieldStyle}
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} style={{
                position: 'absolute', right: 8, top: 0, bottom: 0, border: 'none', background: 'none',
                cursor: 'pointer', color: 'var(--arsela-text-muted)', display: 'flex', alignItems: 'center',
              }}>
                <IconEye size={16}/>
              </button>
            </div>
          </label>
          <label style={{ display: 'block' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>New password</div>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                autoComplete="new-password"
                onChange={(e) => setNewPw(e.target.value)}
                style={fieldStyle}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} style={{
                position: 'absolute', right: 8, top: 0, bottom: 0, border: 'none', background: 'none',
                cursor: 'pointer', color: 'var(--arsela-text-muted)', display: 'flex', alignItems: 'center',
              }}>
                <IconEye size={16}/>
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>At least 8 characters, different from your current password.</div>
          </label>
          <label style={{ display: 'block' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Confirm new password</div>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPw}
              autoComplete="new-password"
              onChange={(e) => setConfirmPw(e.target.value)}
              style={{ ...fieldStyle, padding: '0 12px' }}
            />
          </label>
          {error && (
            <div style={{ fontSize: 12.5, color: 'var(--arsela-danger)', background: 'var(--arsela-danger-50)', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}
          <ArsButton type="submit" size="sm" icon={<IconLock size={13}/>}>Update password</ArsButton>
        </form>
      </ArsCard>
    );
  };

  const SettingsScreen = () => {
    const [settings, setSettings] = React.useState(loadSettings());
    const [orgNameDraft, setOrgNameDraft] = React.useState(settings.orgName);
    const [dirty, setDirty] = React.useState(false);
    const [storeState, setStoreState] = React.useState(window.Store.getState());
    React.useEffect(() => window.Store.subscribe(setStoreState), []);
    const currencies = window.Store.listCurrencies();

    const patch = (p) => {
      setSettings(s => {
        const next = { ...s, ...p };
        saveSettings(next);
        return next;
      });
    };

    const saveOrgSettings = () => {
      patch({ orgName: orgNameDraft });
      setDirty(false);
      window.Store.toast('Workspace settings saved', 'success');
    };

    const exportAllData = () => {
      const s = window.Store.getState();
      const blob = { budgets: s.budgets, approvals: s.approvals, expenses: s.expenses };
      window.Store.toast(`Prepared export of ${s.budgets.length} budgets, ${s.approvals.length} approvals, ${s.expenses.length} expenses`, 'info');
      console.log('Coplanistra data export', blob);
    };

    const resetDemoData = () => {
      try { localStorage.removeItem('coplanistra_state_v1'); } catch (e) {}
      window.Store.toast('Demo data reset — reloading…', 'warning');
      setTimeout(() => window.location.reload(), 900);
    };

    return (
      <AppFrame
        active="Settings"
        title="Settings"
        breadcrumb={['Arsela Resources', 'Manage', 'Settings']}
        topActions={
          <ArsButton size="md" icon={<IconCheck size={15}/>} onClick={saveOrgSettings} style={{ opacity: dirty ? 1 : 0.6 }}>Save changes</ArsButton>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Workspace */}
            <ArsCard>
              <ArsSectionHeader title="Workspace" subtitle="General organisation settings"/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'block' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Organisation name</div>
                  <input
                    value={orgNameDraft}
                    onChange={(e) => { setOrgNameDraft(e.target.value); setDirty(true); }}
                    style={{
                      width: '100%', height: 40, border: '1px solid var(--arsela-border-strong)',
                      borderRadius: 8, padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Fiscal year start</div>
                    <select
                      value={settings.fiscalYearStart}
                      onChange={(e) => patch({ fiscalYearStart: e.target.value })}
                      style={{ width: '100%', height: 40, border: '1px solid var(--arsela-border-strong)', borderRadius: 8, padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                    >
                      {['July','January','April','October'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>
                      Arsela Resources' fiscal year runs 1 July – 30 June — {window.Store.fyLabel(window.Store.today())} started 1 July {window.Store.fyYearOf(window.Store.today()) - 1}.
                    </div>
                  </label>
                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Reporting currency</div>
                    <select
                      value={storeState.currency}
                      onChange={(e) => window.Store.setCurrency(e.target.value)}
                      style={{ width: '100%', height: 40, border: '1px solid var(--arsela-border-strong)', borderRadius: 8, padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                    >
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>)}
                    </select>
                    <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 6 }}>
                      Arsela Resources' reporting currency is AUD (the default above). Underlying figures are held in a base unit and live-converted for display in any currency you select here.
                    </div>
                  </label>
                </div>
              </div>
            </ArsCard>

            {/* Notifications */}
            <ArsCard>
              <ArsSectionHeader title="Notifications" subtitle="Control what you get alerted about"/>
              <SettingRow
                title="Email digest"
                desc="Daily summary of budget activity"
                control={<Toggle checked={settings.emailDigest} onChange={(v) => patch({ emailDigest: v })}/>}
              />
              <SettingRow
                title="Approval alerts"
                desc="Notify me when new items need my approval"
                control={<Toggle checked={settings.approvalAlerts} onChange={(v) => patch({ approvalAlerts: v })}/>}
              />
              <SettingRow
                title="Budget breach alerts"
                desc="Notify me when a budget exceeds its plan"
                control={<Toggle checked={settings.budgetBreachAlerts} onChange={(v) => patch({ budgetBreachAlerts: v })}/>}
              />
              <SettingRow
                title="Weekly report email"
                desc="Send a weekly performance summary every Monday"
                control={<Toggle checked={settings.weeklyReport} onChange={(v) => patch({ weeklyReport: v })}/>}
              />
            </ArsCard>

            {/* Danger zone */}
            <ArsCard style={{ border: '1px solid var(--arsela-danger-50)' }}>
              <ArsSectionHeader title="Danger zone" subtitle="Irreversible actions — use with care"/>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>Reset demo data</div>
                  <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Restore all budgets, approvals and expenses to their original seed values.</div>
                </div>
                <ArsButton variant="danger" size="sm" onClick={resetDemoData}>Reset data</ArsButton>
              </div>
            </ArsCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ArsCard>
              <ArsSectionHeader title="Your profile"/>
              {(() => {
                const s = window.Store.getState();
                const identity = window.ArsCurrentIdentity(s.role);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ArsAvatar name={identity.name} size={44} tone="blue"/>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)' }}>{identity.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>{identity.title}</div>
                      {identity.email && <div style={{ fontSize: 11.5, color: 'var(--arsela-text-subtle)', marginTop: 1 }}>{identity.email}</div>}
                      <div style={{ marginTop: 6 }}><ArsRoleBadge role={s.role}/></div>
                    </div>
                  </div>
                );
              })()}
            </ArsCard>

            <ChangePasswordCard/>

            <ArsCard>
              <ArsSectionHeader title="Data & export"/>
              <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                Export a snapshot of your budgets, approvals and expenses for backup or analysis.
              </div>
              <ArsButton variant="secondary" size="sm" full icon={<IconDownload size={13}/>} onClick={exportAllData}>Export workspace data</ArsButton>
            </ArsCard>

            <ArsCard>
              <ArsSectionHeader title="About"/>
              <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', lineHeight: 1.6 }}>
                <div><b style={{ color: 'var(--arsela-navy)' }}>Coplanistra</b> — Budget & Plan</div>
                <div style={{ marginTop: 4 }}>Version 1.0.0</div>
                <div style={{ marginTop: 4 }}>Powered by Arsela Resources</div>
              </div>
            </ArsCard>
          </div>
        </div>
      </AppFrame>
    );
  };

  Object.assign(window, { SettingsScreen });
})();
