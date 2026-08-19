/* Role definitions — controls sidebar filtering + dashboard widget defaults.
   Small and readable so it's easy to audit which role sees what.

   These are internal PERMISSION TIERS, not people. The real signed-in
   person (name/title/email) comes from window.Store.getCurrentUser() —
   each of the 7 real company accounts (see store.js seedUsers) maps onto
   one of these tiers via its `permissionRole` field. The `user` fallback
   below is only used before anyone has logged in / for the (admin-only)
   "Preview as" role switcher, where there is no single real person tied
   to a tier being previewed.

   Note: the "executive" tier was merged into "employee" — they had
   near-identical scope in this build and no real seeded account used
   executive, so it was retired to keep the permission model simple
   (finance / approver / employee / admin). Any state persisted from
   before the merge is migrated automatically in store.js. */

const ROLES = {
  finance: {
    id: 'finance',
    label: 'Manager',
    tone: 'blue',
    user: { name: 'Manager (preview)', title: 'Manager' },
    nav: ['Dashboard', 'Budgets', 'Quarterly', 'Monthly', 'Expenses', 'Approvals', 'FY Closeout', 'CAPEX', 'Reconciliations', 'Cash Flow', 'Performance', 'Reports', 'Copilot', 'Team & Access', 'Settings'],
    dashboard: ['budget-health', 'pending-approvals', 'variance-alerts', 'monthly-burn'],
  },
  approver: {
    id: 'approver',
    label: 'Approver',
    tone: 'teal',
    user: { name: 'Approver (preview)', title: 'Dept. Manager' },
    nav: ['Dashboard', 'Approvals', 'Budgets', 'Expenses', 'Reports'],
    dashboard: ['approval-queue', 'my-dept-budgets', 'pending-metrics', 'variance-alerts'],
  },
  employee: {
    id: 'employee',
    label: 'Employee',
    tone: 'warn',
    user: { name: 'Employee (preview)', title: 'Employee' },
    nav: ['Dashboard', 'Expenses'],
    dashboard: ['my-expenses', 'my-submissions', 'my-budget-usage', 'my-team'],
  },
  admin: {
    id: 'admin',
    label: 'Administrator',
    tone: 'purple',
    user: { name: 'Administrator (preview)', title: 'Workspace Admin' },
    nav: ['Dashboard', 'Budgets', 'Quarterly', 'Monthly', 'Expenses', 'Approvals', 'FY Closeout', 'CAPEX', 'Reconciliations', 'Cash Flow', 'Performance', 'Reports', 'Copilot', 'Team & Access', 'Settings'],
    dashboard: ['org-kpis', 'system-health', 'audit-events', 'user-activity'],
  },
};

/* Resolve the display identity for the topbar/avatar/etc: prefer the real
   signed-in user (name + real title e.g. "Manager", "Administrator",
   "Employee"); fall back to the role's generic preview identity only if
   nobody is signed in yet (shouldn't normally happen post-login). */
function ArsCurrentIdentity(role) {
  const u = window.Store && window.Store.getCurrentUser && window.Store.getCurrentUser();
  if (u) return { name: u.name, title: u.title, email: u.email };
  const r = ROLES[role] || ROLES.finance;
  return { name: r.user.name, title: r.user.title, email: '' };
}

/* Role badge — small pill next to avatar */
const ArsRoleBadge = ({ role }) => {
  const r = ROLES[role] || ROLES.finance;
  const bg = {
    navy: '#E7EBF3',   fg: '#001F3D',
    blue: '#EEF3FF',   fgBlue: '#1343CB',
    teal: '#E6F7F4',   fgTeal: '#007A6E',
    warn: '#FFF8E6',   fgWarn: '#B4740A',
    purple: '#EFE7FA', fgPurple: '#5B21B6',
  };
  const map = {
    navy:   { bg: '#E7EBF3', fg: '#001F3D' },
    blue:   { bg: '#EEF3FF', fg: '#1343CB' },
    teal:   { bg: '#E6F7F4', fg: '#007A6E' },
    warn:   { bg: '#FFF8E6', fg: '#B4740A' },
    purple: { bg: '#EFE7FA', fg: '#5B21B6' },
  };
  const t = map[r.tone] || map.blue;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: t.bg, color: t.fg,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.2,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.fg }}/>
      {r.label}
    </span>
  );
};

/* Role switcher pill — for the prototype only */
const ArsRoleSwitcher = ({ role, onChange }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 2,
    padding: 3, background: '#EEF1F6', borderRadius: 999,
  }}>
    <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--arsela-text-muted)', fontWeight: 700, padding: '0 8px' }}>View as</span>
    {Object.values(ROLES).map(r => (
      <button
        key={r.id}
        onClick={() => onChange && onChange(r.id)}
        style={{
          padding: '5px 10px', borderRadius: 999,
          background: role === r.id ? 'var(--arsela-navy)' : 'transparent',
          color: role === r.id ? '#fff' : 'var(--arsela-text-muted)',
          border: 'none', cursor: 'pointer',
          fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
        }}
      >{r.label}</button>
    ))}
  </div>
);

Object.assign(window, { ROLES, ArsRoleBadge, ArsRoleSwitcher, ArsCurrentIdentity });
