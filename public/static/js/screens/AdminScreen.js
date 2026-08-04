/* Admin & user management — wired to the REAL Store.users directory
   (the 7 actual company accounts) with working Add / Edit / Delete /
   Activate-Deactivate, all persisted through window.Store. */
(function () {
  const { useState, useEffect, useMemo } = React;

  const TITLE_OPTIONS = ['Administrator', 'Manager', 'Employee'];
  const PERMISSION_OPTIONS = [
    { value: 'admin', label: 'Administrator (full access)' },
    { value: 'finance', label: 'Manager (finance tier)' },
    { value: 'approver', label: 'Approver' },
    { value: 'employee', label: 'Employee' },
    { value: 'executive', label: 'Executive' },
  ];
  const AVATAR_TONES = ['navy', 'blue', 'teal', 'purple', 'warn'];

  function roleTone(permissionRole) {
    return { admin: 'purple', finance: 'blue', approver: 'teal', employee: 'warn', executive: 'navy' }[permissionRole] || 'blue';
  }

  function UserFormModal({ user, onClose }) {
    const isEdit = !!user;
    const [form, setForm] = useState(() => ({
      name: user?.name || '',
      email: user?.email || '',
      title: user?.title || 'Employee',
      dept: user?.dept || '',
      permissionRole: user?.permissionRole || 'employee',
      status: user?.status || 'Active',
      password: '',
    }));
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const save = () => {
      if (!form.name.trim()) { window.Store.toast('Name is required', 'danger'); return; }
      if (!form.email.trim() || !form.email.includes('@')) { window.Store.toast('A valid email is required', 'danger'); return; }

      if (isEdit) {
        const patch = {
          name: form.name.trim(), title: form.title, dept: form.dept.trim() || '—',
          permissionRole: form.permissionRole, status: form.status,
        };
        if (form.password.trim()) patch.password = form.password.trim();
        window.Store.updateUser(user.email, patch);
      } else {
        const rec = window.Store.addUser({
          name: form.name.trim(), email: form.email.trim(), title: form.title,
          dept: form.dept.trim() || '—', permissionRole: form.permissionRole, status: form.status,
          avatar: AVATAR_TONES[Math.floor(Math.random() * AVATAR_TONES.length)],
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        if (!rec) return; // duplicate email — Store already toasted the error
      }
      onClose();
    };

    return (
      <ArsModal open onClose={onClose} title={isEdit ? `Edit ${user.name}` : 'Add team member'}
        subtitle={isEdit ? user.email : 'Creates a real login for Coplanistra'}
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={save}>{isEdit ? 'Save changes' : 'Add member'}</ArsButton></>}>
        <ArsField label="Full name"><input value={form.name} onChange={set('name')} style={arsFieldInputStyle}/></ArsField>
        <ArsField label="Email address (used as login ID)" hint={isEdit ? 'Email cannot be changed after account creation' : undefined}>
          <input value={form.email} onChange={set('email')} disabled={isEdit} type="email" style={{ ...arsFieldInputStyle, ...(isEdit ? { background: '#F1F3F7', color: 'var(--arsela-text-muted)', cursor: 'not-allowed' } : {}) }}/>
        </ArsField>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Job title">
            <select value={form.title} onChange={set('title')} style={arsFieldInputStyle}>
              {TITLE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Department"><input value={form.dept} onChange={set('dept')} placeholder="e.g. Strategy" style={arsFieldInputStyle}/></ArsField></div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Access level" hint="Controls which screens & dashboard widgets this account sees">
            <select value={form.permissionRole} onChange={set('permissionRole')} style={arsFieldInputStyle}>
              {PERMISSION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Status">
            <select value={form.status} onChange={set('status')} style={arsFieldInputStyle}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </ArsField></div>
        </div>
        <ArsField label={isEdit ? 'Reset password (optional)' : 'Password'} hint={isEdit ? 'Leave blank to keep the current password' : 'Defaults to Arsela123 if left blank'}>
          <input value={form.password} onChange={set('password')} type="text" placeholder="Arsela123" style={arsFieldInputStyle}/>
        </ArsField>
      </ArsModal>
    );
  }

  const AdminScreen = () => {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);

    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [deleteUser, setDeleteUser] = useState(null);

    const users = s.users;

    const filteredUsers = useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return users;
      return users.filter((u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q) ||
        (u.dept || '').toLowerCase().includes(q)
      );
    }, [users, search]);

    const stats = useMemo(() => {
      const active = users.filter((u) => u.status === 'Active').length;
      const admins = users.filter((u) => u.permissionRole === 'admin').length;
      return { total: users.length, active, admins };
    }, [users]);

    const currentEmail = s.currentUserEmail;

    return (
      <AppFrame
        active="Team & Access"
        title="Team & Access"
        breadcrumb={['Arsela Resources', 'Manage', 'Team & Access']}
        topActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ArsButton variant="secondary" size="md" icon={<IconDownload size={15}/>} onClick={() => window.Store.toast(`Exporting ${users.length} members to CSV…`, 'info')}>Export list</ArsButton>
            <ArsButton size="md" icon={<IconPlus size={15}/>} onClick={() => setAddOpen(true)}>Add member</ArsButton>
          </div>
        }
      >
        {/* Stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
          {[
            ['Total members', stats.total, 'Real company logins', 'blue', <IconUsers size={17}/>],
            ['Active accounts', stats.active, `${users.length ? Math.round((stats.active / users.length) * 100) : 0}% of team`, 'teal', <IconTrend size={17}/>],
            ['Administrators', stats.admins, 'Full-access accounts', 'purple', <IconShield size={17}/>],
          ].map(([l, v, sub, t, ic], i) => (
            <ArsCard key={i}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{l}</div>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: t === 'teal' ? 'var(--arsela-teal-50)' : t === 'purple' ? '#EFE7FA' : 'var(--arsela-blue-50)',
                  color: t === 'teal' ? 'var(--arsela-teal-600)' : t === 'purple' ? '#5B21B6' : 'var(--arsela-blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{ic}</div>
              </div>
              <div className="arsela-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--arsela-navy)', marginTop: 10 }}>{v}</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 4 }}>{sub}</div>
            </ArsCard>
          ))}
        </div>

        {/* Members table */}
        <ArsCard padded={false}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--arsela-border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--arsela-navy)' }}>Members</div>
              <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 2 }}>Arsela Resources workspace · sign in with email + password</div>
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
          <div className="coplan-scrollx">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#FAFBFD', borderBottom: '1px solid var(--arsela-border)' }}>
                {['Member', 'Title', 'Department', 'Access level', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.6, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={6}>
                  <ArsEmpty icon={<IconSearch size={22}/>} title="No members found" body={`No members match "${search}".`}/>
                </td></tr>
              ) : filteredUsers.map((u, i) => (
                <tr key={u.email} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid var(--arsela-border)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ArsAvatar name={u.name} size={32} tone={u.avatar}/>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)' }}>{u.name}</span>
                          {u.email === currentEmail && <ArsBadge tone="blue" size="sm">You</ArsBadge>}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><ArsBadge tone={roleTone(u.permissionRole)} size="sm">{u.title}</ArsBadge></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--arsela-navy)' }}>{u.dept || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--arsela-text-muted)' }}>{(PERMISSION_OPTIONS.find((o) => o.value === u.permissionRole) || {}).label || u.permissionRole}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span onClick={() => window.Store.toggleUserStatus(u.email)} style={{ cursor: 'pointer', display: 'inline-block' }} title="Click to toggle Active/Inactive">
                      <ArsBadge tone={u.status === 'Active' ? 'success' : 'neutral'} dot size="sm">{u.status}</ArsBadge>
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, color: 'var(--arsela-text-subtle)' }}>
                      <button onClick={() => setEditUser(u)} title="Edit" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}><IconEdit size={15}/></button>
                      <button onClick={() => setDeleteUser(u)} title="Delete" disabled={u.email === currentEmail} style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, cursor: u.email === currentEmail ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: u.email === currentEmail ? 'var(--arsela-text-subtle)' : 'var(--arsela-danger)', opacity: u.email === currentEmail ? 0.4 : 1 }}><IconTrash size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </ArsCard>

        {addOpen && <UserFormModal onClose={() => setAddOpen(false)}/>}
        {editUser && <UserFormModal user={editUser} onClose={() => setEditUser(null)}/>}
        <ArsConfirmDialog
          open={!!deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={() => deleteUser && window.Store.deleteUser(deleteUser.email)}
          title="Remove member?"
          message={deleteUser ? `This will permanently remove "${deleteUser.name}" (${deleteUser.email}) and revoke their login. This cannot be undone.` : ''}
        />
      </AppFrame>
    );
  };

  Object.assign(window, { AdminScreen });
})();
