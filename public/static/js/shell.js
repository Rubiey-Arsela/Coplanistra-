/* ============================================================
   Coplanistra — interactive AppShell
   Wired version of the design's AppShell.jsx: sidebar navigation
   actually routes, notif bell actually toggles or dismisses, role
   badge/user reflect the live Store, topbar search is functional
   enough to filter budgets when relevant.
   ============================================================ */
(function () {
  const { useState, useEffect, useRef } = React;

  const NAV_ROUTES = {
    'Dashboard': '/dashboard',
    'Budgets': '/budgets',
    'Quarterly': '/quarterly',
    'Monthly': '/monthly',
    'Expenses': '/expenses',
    'Approvals': '/approvals',
    'FY Closeout': '/closeout',
    'CAPEX': '/capex',
    'Cash Flow': '/cashflow',
    'Performance': '/performance',
    'Reports': '/reports',
    'Copilot': '/copilot',
    'Team & Access': '/admin',
    'Settings': '/settings',
  };

  const CoplanistraMark = ({ size = 22, color = '#fff', accent = '#00D6BE' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="1.4"/>
      <rect x="6" y="14" width="3" height="4" rx="1" fill={color}/>
      <rect x="10.5" y="10.5" width="3" height="7.5" rx="1" fill={color}/>
      <rect x="15" y="6.5" width="3" height="11.5" rx="1" fill={accent}/>
      <path d="M5 19.5h14" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
    </svg>
  );

  const CoplanistraWordmark = ({ color = '#fff', subColor = 'rgba(255,255,255,0.55)', onClick }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onClick ? 'pointer' : 'default' }}>
      <CoplanistraMark size={26} color={color} />
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color, letterSpacing: -0.2, lineHeight: 1 }}>Coplanistra</div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: subColor, letterSpacing: 1.5, marginTop: 3, textTransform: 'uppercase' }}>Budget &amp; Plan</div>
      </div>
    </div>
  );

  const ArselaCredit = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
        Powered by
      </div>
      <img src="/static/img/logo-secondary.png" alt="Arsela Resources" style={{ height: 18, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.9 }}/>
    </div>
  );

  const SidebarItem = ({ icon, label, active, badge, onClick }) => (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', margin: '2px 10px', borderRadius: 8,
      background: active ? 'linear-gradient(90deg, rgba(19,67,203,0.35), rgba(19,67,203,0.15))' : 'transparent',
      borderLeft: active ? '3px solid #00A896' : '3px solid transparent',
      paddingLeft: active ? 9 : 12,
      color: active ? '#fff' : 'rgba(255,255,255,0.72)',
      fontSize: 13.5, fontWeight: active ? 600 : 500,
      cursor: 'pointer', transition: 'background .12s, color .12s',
    }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: active ? '#8FB8FF' : 'rgba(255,255,255,0.6)' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge !== 0 && (
        <span style={{
          background: 'var(--arsela-teal)', color: '#001F3D',
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
        }}>{badge}</span>
      )}
    </div>
  );

  const SidebarSection = ({ label, children }) => (
    <div style={{ marginTop: 20 }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6,
        color: 'rgba(255,255,255,0.35)', padding: '0 22px 8px', textTransform: 'uppercase',
      }}>{label}</div>
      {children}
    </div>
  );

  function Sidebar({ active, role, pendingApprovals, mobileOpen, onClose }) {
    const roleDef = window.ROLES[role];
    const allowed = new Set(roleDef.nav);
    const showIf = (label) => allowed.has(label);
    const navTo = (label) => { window.Router.go(NAV_ROUTES[label] || '/dashboard'); if (onClose) onClose(); };

    const planItems = [
      showIf('Dashboard') && <SidebarItem key="d" icon={<IconDashboard/>} label="Dashboard" active={active === 'Dashboard'} onClick={() => navTo('Dashboard')}/>,
      showIf('Budgets') && <SidebarItem key="b" icon={<IconWallet/>} label="Budgets" active={active === 'Budgets'} onClick={() => navTo('Budgets')}/>,
      showIf('Quarterly') && <SidebarItem key="q" icon={<IconCalendar/>} label="Quarterly" active={active === 'Quarterly'} onClick={() => navTo('Quarterly')}/>,
      showIf('Monthly') && <SidebarItem key="m" icon={<IconClock/>} label="Monthly Monitoring" active={active === 'Monthly'} onClick={() => navTo('Monthly')}/>,
      showIf('Expenses') && <SidebarItem key="e" icon={<IconReceipt/>} label="Expenses" active={active === 'Expenses'} onClick={() => navTo('Expenses')}/>,
      showIf('Approvals') && <SidebarItem key="a" icon={<IconApproval/>} label="Approvals" badge={pendingApprovals} active={active === 'Approvals'} onClick={() => navTo('Approvals')}/>,
      showIf('FY Closeout') && <SidebarItem key="fc" icon={<IconLock/>} label="FY Closeout" active={active === 'FY Closeout'} onClick={() => navTo('FY Closeout')}/>,
    ].filter(Boolean);

    const finItems = [
      showIf('CAPEX') && <SidebarItem key="c" icon={<IconBuilding/>} label="CAPEX Portfolio" active={active === 'CAPEX'} onClick={() => navTo('CAPEX')}/>,
      showIf('Cash Flow') && <SidebarItem key="cf" icon={<IconTrend/>} label="Cash Flow" active={active === 'Cash Flow'} onClick={() => navTo('Cash Flow')}/>,
      showIf('Performance') && <SidebarItem key="p" icon={<IconChart/>} label="Performance & KPIs" active={active === 'Performance'} onClick={() => navTo('Performance')}/>,
    ].filter(Boolean);

    const insItems = [
      showIf('Reports') && <SidebarItem key="r" icon={<IconFile/>} label="Reports" active={active === 'Reports'} onClick={() => navTo('Reports')}/>,
      showIf('Copilot') && <SidebarItem key="ai" icon={<IconCompass/>} label="AI Copilot" active={active === 'Copilot'} badge="AI" onClick={() => navTo('Copilot')}/>,
    ].filter(Boolean);

    const mgmtItems = [
      showIf('Team & Access') && <SidebarItem key="ta" icon={<IconUsers/>} label="Team & Access" active={active === 'Team & Access'} onClick={() => navTo('Team & Access')}/>,
      showIf('Settings') && <SidebarItem key="s" icon={<IconSettings/>} label="Settings" active={active === 'Settings'} onClick={() => navTo('Settings')}/>,
    ].filter(Boolean);

    return (
      <>
        {mobileOpen && <div className="coplan-sidebar-overlay" onClick={onClose} aria-hidden="true"/>}
        <aside className={'coplan-sidebar' + (mobileOpen ? ' is-open' : '')} style={{
          width: 248, height: '100%', background: 'var(--arsela-gradient-sidebar)',
          display: 'flex', flexDirection: 'column', color: '#fff',
          borderRight: '1px solid rgba(0,0,0,0.2)', flexShrink: 0,
        }}>
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CoplanistraWordmark onClick={() => navTo('Dashboard')} />
          <button className="coplan-sidebar-close" onClick={onClose} aria-label="Close menu" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
            color: '#fff', display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><IconClose size={14}/></button>
        </div>

        <div style={{ padding: '14px 14px 6px' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '8px 10px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
          }} aria-label="Switch organisation" onClick={() => window.Store.toast('Arsela Resources is your only workspace', 'info')}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: 'linear-gradient(135deg, #00A896, #14B8A6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#001F3D', flexShrink: 0,
            }}>AR</div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Arsela Resources</div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
              background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4,
              letterSpacing: 0.4,
            }}>FY26</span>
            <IconChevronDown size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        <div className="arsela-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 0 20px' }}>
          {planItems.length > 0 && <SidebarSection label="Plan">{planItems}</SidebarSection>}
          {finItems.length > 0 && <SidebarSection label="Financials">{finItems}</SidebarSection>}
          {insItems.length > 0 && <SidebarSection label="Analyse">{insItems}</SidebarSection>}
          {mgmtItems.length > 0 && <SidebarSection label="Manage">{mgmtItems}</SidebarSection>}
        </div>

        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <ArselaCredit />
        </div>
      </aside>
      </>
    );
  }

  function NotifBell({ count, open, events, onToggle, onMarkAllRead }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!open) return;
      const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) window.Store.closeNotif(); };
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    return (
      <div style={{ position: 'relative' }} ref={ref}>
        <button onClick={onToggle} style={{
          width: 38, height: 38, borderRadius: 8, background: '#fff', border: '1px solid var(--arsela-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arsela-navy)',
          cursor: 'pointer', position: 'relative',
        }} aria-label="Notifications">
          <IconBell size={17}/>
          {count > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999,
              background: 'var(--danger)', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff',
            }}>{count}</span>
          )}
        </button>
        {open && (
          <div className="coplan-notif-panel" style={{
            position: 'absolute', top: 46, right: 0, width: 380,
            background: '#fff', border: '1px solid var(--arsela-border)',
            borderRadius: 12, boxShadow: 'var(--arsela-shadow-elevated)',
            zIndex: 50, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)' }}>Notifications</div>
                <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{count} unread</div>
              </div>
              <button onClick={onMarkAllRead} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--arsela-blue)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Mark all read</button>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {events.map((e, i) => {
                const bg = { success: '#ECFDF3', warning: '#FFF8E6', danger: '#FEECEC', info: '#EEF3FF' }[e.tone];
                const fg = { success: '#1A8754', warning: '#B4740A', danger: '#D64045', info: '#1343CB' }[e.tone];
                return (
                  <div key={e.id || i} style={{
                    padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
                    borderBottom: i < events.length - 1 ? '1px solid var(--arsela-border)' : 'none',
                    background: e.unread ? 'rgba(19,67,203,0.02)' : 'transparent',
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{e.i}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{e.t}</span>
                        {e.unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--arsela-blue)' }}/>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 3, lineHeight: 1.4 }}>{e.d}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--arsela-text-subtle)', marginTop: 4, fontWeight: 600, letterSpacing: 0.3 }}>{e.when}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 10, borderTop: '1px solid var(--arsela-border)', background: 'var(--arsela-surface-alt)', textAlign: 'center' }}>
              <a style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-blue)', textDecoration: 'none', cursor: 'pointer' }}>View all notifications →</a>
            </div>
          </div>
        )}
      </div>
    );
  }

  const ArsLiveDot = ({ label = 'Live · updated just now' }) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--teal-text)', fontWeight: 600 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: 'var(--teal-brand)',
        boxShadow: '0 0 0 0 rgba(0,168,150,0.55)',
        animation: 'ars-live-pulse 1.8s cubic-bezier(0.25,0,0.5,1) infinite',
      }}/>
      {label}
    </div>
  );

  function RoleSwitcher({ role }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      if (!open) return;
      const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);
    const roleDef = window.ROLES[role];
    return (
      <div style={{ position: 'relative' }} ref={ref}>
        <button onClick={() => setOpen((o) => !o)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 999, background: '#F4F6F8',
          border: '1px solid var(--arsela-border)', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: 'var(--arsela-text-muted)',
        }}>
          <span style={{ letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10 }}>View as</span>
          <span style={{ color: 'var(--arsela-navy)' }}>{roleDef.label}</span>
          <IconChevronDown size={11}/>
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 40, right: 0, minWidth: 200,
            background: '#fff', border: '1px solid var(--arsela-border)', borderRadius: 10,
            boxShadow: 'var(--arsela-shadow-elevated)', zIndex: 50, padding: 4,
          }}>
            {Object.values(window.ROLES).map((r) => (
              <button key={r.id} onClick={() => { window.Store.setRole(r.id); setOpen(false); window.Router.go('/dashboard'); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6,
                  border: 'none', background: r.id === role ? 'var(--arsela-blue-50)' : 'transparent',
                  color: r.id === role ? 'var(--arsela-blue)' : 'var(--arsela-navy)',
                  fontSize: 13, fontWeight: r.id === role ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                }}>{r.label}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function Topbar({ title, breadcrumb, actions, role, notifOpen, notifCount, notifications, onOpenMenu }) {
    const roleDef = window.ROLES[role];
    const identity = window.ArsCurrentIdentity(role);
    const [q, setQ] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const submitSearch = (e) => {
      e.preventDefault();
      if (!q.trim()) return;
      window.Router.go('/budgets?q=' + encodeURIComponent(q.trim()));
      setSearchOpen(false);
    };
    return (
      <header className="coplan-topbar" style={{
        height: 64, background: '#fff', borderBottom: '1px solid var(--arsela-border)',
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0,
        position: 'relative', zIndex: 30,
      }}>
        <button className="coplan-hamburger" onClick={onOpenMenu} aria-label="Open menu" style={{
          width: 36, height: 36, borderRadius: 8, border: '1px solid var(--arsela-border)', background: '#fff',
          display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--arsela-navy)',
          flexShrink: 0,
        }}>
          <IconMenu size={18}/>
        </button>

        <div className="coplan-topbar-title" style={{ flex: 1, minWidth: 0 }}>
          {breadcrumb && (
            <div className="coplan-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--arsela-text-muted)', marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {breadcrumb.map((b, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <IconChevronRight size={12} style={{ opacity: 0.5, flexShrink: 0 }}/>}
                  <span style={{ color: i === breadcrumb.length - 1 ? 'var(--arsela-navy)' : 'inherit', fontWeight: i === breadcrumb.length - 1 ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        </div>

        <form onSubmit={submitSearch} className="coplan-search-form" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F4F6F8', border: '1px solid var(--arsela-border)',
          borderRadius: 8, padding: '0 12px', height: 38, width: 260, flexShrink: 0,
        }}>
          <IconSearch size={16} style={{ color: 'var(--arsela-text-subtle)', flexShrink: 0 }}/>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search budgets, expenses…" style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--arsela-navy)', minWidth: 0, fontFamily: 'inherit', width: '100%',
          }}/>
          <span className="coplan-search-kbd" style={{ fontSize: 10, color: 'var(--arsela-text-subtle)', fontWeight: 600, background: '#fff', border: '1px solid var(--arsela-border)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>⏎</span>
        </form>

        <button className="coplan-search-toggle" onClick={() => setSearchOpen((v) => !v)} aria-label="Search" style={{
          width: 38, height: 38, borderRadius: 8, background: '#fff', border: '1px solid var(--arsela-border)',
          display: 'none', alignItems: 'center', justifyContent: 'center', color: 'var(--arsela-navy)', cursor: 'pointer', flexShrink: 0,
        }}>
          <IconSearch size={16}/>
        </button>

        <div className="coplan-topbar-actions">{actions}</div>

        <div className="coplan-role-switcher-wrap">
          <RoleSwitcher role={role}/>
        </div>

        <NotifBell count={notifCount} open={notifOpen} events={notifications}
          onToggle={() => window.Store.toggleNotif()}
          onMarkAllRead={() => window.Store.markAllNotifsRead()}/>

        <div className="coplan-user-block" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 16, borderLeft: '1px solid var(--arsela-border)', flexShrink: 0 }}>
          <ArsAvatar name={identity.name} size={34} tone={roleDef.tone === 'warn' ? 'warn' : roleDef.tone === 'purple' ? 'purple' : 'navy'}/>
          <div className="coplan-user-text" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)', whiteSpace: 'nowrap' }}>{identity.name}</span>
              <ArsRoleBadge role={role}/>
            </div>
            <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', whiteSpace: 'nowrap' }}>{identity.title}</div>
          </div>
          <button onClick={() => { window.Store.logout(); window.Router.go('/login'); }} title="Sign out" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--arsela-border)', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--arsela-text-muted)', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          </button>
        </div>

        {searchOpen && (
          <form onSubmit={submitSearch} className="coplan-search-mobile-panel" style={{
            position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
            borderBottom: '1px solid var(--arsela-border)', padding: 12, display: 'flex', gap: 8,
            boxShadow: 'var(--arsela-shadow-elevated)', zIndex: 40,
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#F4F6F8', border: '1px solid var(--arsela-border)', borderRadius: 8, padding: '0 12px', height: 40 }}>
              <IconSearch size={16} style={{ color: 'var(--arsela-text-subtle)' }}/>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search budgets, expenses…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--arsela-navy)', fontFamily: 'inherit' }}/>
            </div>
          </form>
        )}
      </header>
    );
  }

  function ToastStack({ toasts }) {
    return (
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => {
          const colors = {
            success: { bg: '#ECFDF3', fg: '#1A8754', border: '#B7E4C7' },
            danger: { bg: '#FEECEC', fg: '#D64045', border: '#F5C2C2' },
            warning: { bg: '#FFF8E6', fg: '#B4740A', border: '#F5DE9E' },
            info: { bg: '#EEF3FF', fg: '#1343CB', border: '#C7D6FF' },
          }[t.tone] || { bg: '#EEF3FF', fg: '#1343CB', border: '#C7D6FF' };
          return (
            <div key={t.id} style={{
              background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}`,
              borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
              boxShadow: 'var(--arsela-shadow-elevated)', minWidth: 240,
              animation: 'ars-toast-in .2s ease-out',
            }}>{t.message}</div>
          );
        })}
      </div>
    );
  }

  // AppFrame — the connected shell every screen renders inside.
  function AppFrame({ children, active, title, breadcrumb, topActions, width, height }) {
    const [s, setS] = useState(window.Store.getState());
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    useEffect(() => window.Store.subscribe(setS), []);
    // Close the mobile drawer automatically whenever the active screen changes.
    useEffect(() => { setMobileMenuOpen(false); }, [active]);

    const notifCount = s.notifications.filter((n) => n.unread).length;

    return (
      <div className="arsela-app coplan-shell" style={{
        width: '100%', height: '100vh', display: 'flex', overflow: 'hidden',
        background: 'var(--arsela-bg)',
      }}>
        <Sidebar active={active} role={s.role} pendingApprovals={window.Store.pendingApprovalsCount()}
          mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}/>
        <div className="coplan-main-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar title={title} breadcrumb={breadcrumb} actions={topActions} role={s.role}
            notifOpen={s.notifOpen} notifCount={notifCount} notifications={s.notifications}
            onOpenMenu={() => setMobileMenuOpen(true)}/>
          <main className="arsela-scroll coplan-main" style={{ flex: 1, overflow: 'auto', padding: 28 }}>
            {children}
          </main>
        </div>
        <ToastStack toasts={s.toasts}/>
      </div>
    );
  }

  Object.assign(window, {
    CoplanistraMark, CoplanistraWordmark, ArselaCredit, Sidebar, Topbar, AppFrame, NotifBell, ArsLiveDot, ToastStack, NAV_ROUTES,
  });
})();
