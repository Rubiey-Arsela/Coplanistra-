/* Admin & user management — mirrors guideline pattern */
(function () {

  const SEED_USERS = [
    { name: 'Keith Johnson',  email: 'keith.johnson@albukhary.com',  role: 'Group Finance Lead', dept: 'Corporate', last: '2 min ago',  status: 'Active',  tone: 'success', avatar: 'navy' },
    { name: 'Aisha Rashid',   email: 'aisha.r@albukhary.com',        role: 'CFO Office',         dept: 'Operations', last: '17 min ago', status: 'Active',  tone: 'success', avatar: 'blue' },
    { name: 'Faris Hamzah',   email: 'faris.h@albukhary.com',        role: 'Budget Owner',       dept: 'Ports & Logistics', last: '1 h ago',    status: 'Active',  tone: 'success', avatar: 'teal' },
    { name: 'Marcus Lim',     email: 'marcus.l@albukhary.com',       role: 'Budget Owner',       dept: 'Digital & Data', last: '4 h ago',    status: 'Active',  tone: 'success', avatar: 'blue' },
    { name: 'Priya Nair',     email: 'priya.n@albukhary.com',        role: 'Preparer',           dept: 'People & Culture', last: 'Yesterday',  status: 'Active',  tone: 'success', avatar: 'purple' },
    { name: 'Zara Mahmood',   email: 'zara.m@albukhary.com',         role: 'Budget Owner',       dept: 'Energy & Assets', last: 'Yesterday',  status: 'Active',  tone: 'success', avatar: 'teal' },
    { name: 'Nadia Yeoh',     email: 'nadia.y@albukhary.com',        role: 'Finance Partner',    dept: 'Digital & Data', last: '3 days ago', status: 'Active',  tone: 'success', avatar: 'warn' },
    { name: 'Iman Salleh',    email: 'iman.s@albukhary.com',         role: 'Budget Owner',       dept: 'Aviation', last: '2 weeks ago',status: 'Inactive',tone: 'neutral', avatar: 'blue' },
    { name: 'Danial Yusof',   email: 'danial.y@albukhary.com',       role: 'Viewer',             dept: 'Corporate', last: 'Never',      status: 'Invited', tone: 'warning', avatar: 'purple' },
    { name: 'Roni',           email: 'roni@maidavale.com.my',        role: 'Manager',            dept: '—', last: 'Just now',   status: 'Active',  tone: 'success', avatar: 'teal' },
  ];

  const ROLE_TEMPLATES = [
    { name: 'Admin',          desc: 'Full access · billing · users', users: 3,  perms: ['All budgets','All expenses','User management','Billing','Audit logs'] },
    { name: 'Finance Lead',   desc: 'Approve & set policy',          users: 5,  perms: ['All budgets (read)','Approve ≤ RM 5M','Reports','Set approval rules'] },
    { name: 'Budget Owner',   desc: 'Manage own department',         users: 18, perms: ['Own budgets','Submit expenses','Approve ≤ RM 250K'] },
    { name: 'Preparer',       desc: 'Draft submissions',             users: 24, perms: ['Draft budgets','Submit expenses'] },
    { name: 'Viewer',         desc: 'Read-only insight',             users: 42, perms: ['Read budgets','Read reports'] },
  ];

  const AdminScreen = () => {
    const [users, setUsers] = React.useState(SEED_USERS);
    const [search, setSearch] = React.useState('');
    const [expandedRole, setExpandedRole] = React.useState(null);
    const [showInvite, setShowInvite] = React.useState(false);
    const [inviteEmail, setInviteEmail] = React.useState('');
    const [inviteRole, setInviteRole] = React.useState('Viewer');

    const filteredUsers = React.useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return users;
      return users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.dept.toLowerCase().includes(q)
      );
    }, [users, search]);

    const stats = React.useMemo(() => {
      const active = users.filter(u => u.status === 'Active').length;
      const pending = users.filter(u => u.status === 'Invited').length;
      return { total: users.length, active, pending };
    }, [users]);

    const sendInvite = () => {
      const email = inviteEmail.trim();
      if (!email || !email.includes('@')) {
        window.Store.toast('Enter a valid email address', 'danger');
        return;
      }
      const name = email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      const rec = {
        name, email, role: inviteRole, dept: 'Corporate', last: 'Never',
        status: 'Invited', tone: 'warning', avatar: 'blue',
      };
      setUsers(u => [rec, ...u]);
      window.Store.toast(`Invitation sent to ${email}`, 'success');
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('Viewer');
    };

    const toggleUserStatus = (email) => {
      setUsers(us => us.map(u => {
        if (u.email !== email) return u;
        if (u.status === 'Active') { window.Store.toast(`${u.name} deactivated`, 'warning'); return { ...u, status: 'Inactive', tone: 'neutral' }; }
        window.Store.toast(`${u.name} activated`, 'success');
        return { ...u, status: 'Active', tone: 'success' };
      }));
    };

    return (
      <AppFrame
        active="Team & Access"
        title="Team & Access"
        breadcrumb={['Acme Holdings','Manage','Team & Access']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconDownload size={15}/>} onClick={() => window.Store.toast(`Exporting ${users.length} members to CSV…`, 'info')}>Export list</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => setShowInvite(true)}>Invite user</ArsButton>
          </div>
        }
      >
        {/* Stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          {[
            ['Total members', stats.total, '+4 this month', 'blue', <IconUsers size={17}/>],
            ['Active in last 30d', stats.active, `${Math.round((stats.active/stats.total)*100)}% adoption`, 'teal', <IconTrend size={17}/>],
            ['Pending invites', stats.pending, stats.pending > 0 ? 'Awaiting response' : 'None outstanding', 'warning', <IconMail size={17}/>],
            ['Roles', ROLE_TEMPLATES.length, 'Custom + default', 'navy', <IconShield size={17}/>],
          ].map(([l,v,s,t,ic],i)=>(
            <ArsCard key={i}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{l}</div>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: t==='teal'?'var(--arsela-teal-50)':t==='warning'?'var(--arsela-warning-50)':t==='navy'?'#E7EBF3':'var(--arsela-blue-50)',
                  color: t==='teal'?'var(--arsela-teal-600)':t==='warning'?'#B4740A':t==='navy'?'var(--arsela-navy)':'var(--arsela-blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{ic}</div>
              </div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10 }}>{v}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{s}</div>
            </ArsCard>
          ))}
        </div>

        {/* Two-column: users + roles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
          <ArsCard padded={false}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Members</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Enterprise workspace</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: '#F4F6F8', border: '1px solid var(--arsela-border)', borderRadius: 8, padding: '0 12px', height: 34, width: 220 }}>
                <IconSearch size={14} style={{ color: 'var(--arsela-text-subtle)' }}/>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members…"
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit' }}
                />
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFD', borderBottom: '1px solid var(--arsela-border)' }}>
                  {['Member','Role','Department','Last active','Status',''].map((h,i)=>(
                    <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6}>
                    <ArsEmpty icon={<IconSearch size={22}/>} title="No members found" body={`No members match "${search}".`}/>
                  </td></tr>
                ) : filteredUsers.map((u,i)=>(
                  <tr key={u.email} style={{ borderBottom: i < filteredUsers.length-1 ? '1px solid var(--arsela-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ArsAvatar name={u.name} size={32} tone={u.avatar}/>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><ArsBadge tone={u.role.includes('Lead')||u.role.includes('CFO')?'navy':u.role.includes('Owner')?'blue':u.role.includes('Partner')||u.role==='Manager'?'teal':'neutral'} size="sm">{u.role}</ArsBadge></td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--arsela-navy)' }}>{u.dept}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--arsela-text-muted)' }}>{u.last}</td>
                    <td style={{ padding: '12px 16px' }}><ArsBadge tone={u.tone} dot size="sm">{u.status}</ArsBadge></td>
                    <td style={{ padding: '12px 16px' }}>
                      <IconMore
                        size={16}
                        style={{ color: 'var(--arsela-text-subtle)', cursor: 'pointer' }}
                        onClick={() => toggleUserStatus(u.email)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ArsCard>

          <ArsCard padded={false}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Roles & Permissions</div>
                <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{ROLE_TEMPLATES.length} role templates</div>
              </div>
              <ArsButton variant="secondary" size="sm" icon={<IconPlus size={13}/>} onClick={() => window.Store.toast('Custom role builder — coming soon', 'info')}>New role</ArsButton>
            </div>
            <div>
              {ROLE_TEMPLATES.map((r,i)=>{
                const isOpen = expandedRole === r.name;
                return (
                  <div key={r.name} style={{ padding: '16px 20px', borderBottom: i < ROLE_TEMPLATES.length-1 ? '1px solid var(--arsela-border)' : 'none' }}>
                    <div onClick={() => setExpandedRole(isOpen ? null : r.name)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: 'var(--arsela-blue-50)', color: 'var(--arsela-blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><IconShield size={16}/></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--arsela-navy)' }}>{r.name}</span>
                          <ArsBadge tone="neutral" size="sm">{r.users} users</ArsBadge>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{r.desc}</div>
                      </div>
                      <IconChevronRight size={14} style={{ color: 'var(--arsela-text-subtle)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}/>
                    </div>
                    {isOpen && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10, marginLeft: 44 }}>
                        {r.perms.map(p=>(
                          <span key={p} style={{
                            fontSize: 11, background: '#F1F3F7', color: 'var(--arsela-text-muted)',
                            padding: '3px 8px', borderRadius: 4, fontWeight: 500,
                          }}>{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ArsCard>
        </div>

        {/* Invite user modal */}
        {showInvite && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,31,61,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }} onClick={() => setShowInvite(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: '#fff', borderRadius: 14, padding: 24, width: 380,
              boxShadow: '0 20px 60px rgba(0,31,61,0.25)',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--arsela-navy)', marginBottom: 4 }}>Invite a new member</div>
              <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginBottom: 16 }}>They'll receive an email invitation to join the workspace.</div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Email address</div>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@albukhary.com"
                  style={{
                    width: '100%', height: 40, border: '1px solid var(--arsela-border-strong)',
                    borderRadius: 8, padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Role</div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: '100%', height: 40, border: '1px solid var(--arsela-border-strong)',
                    borderRadius: 8, padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff',
                  }}
                >
                  {ROLE_TEMPLATES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <ArsButton variant="secondary" size="md" onClick={() => setShowInvite(false)}>Cancel</ArsButton>
                <ArsButton size="md" onClick={sendInvite}>Send invite</ArsButton>
              </div>
            </div>
          </div>
        )}
      </AppFrame>
    );
  };

  Object.assign(window, { AdminScreen });
})();
