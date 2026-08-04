/* Login — wired to Store.login() + Router */
(function () {
  const { useState } = React;

  const ArselaCreditLight = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--arsela-text-muted)', letterSpacing: 1.2, textTransform: 'uppercase' }}>Powered by</div>
      <img src="/static/img/logo-secondary.png" alt="Arsela Resources" style={{ height: 18, width: 'auto' }}/>
    </div>
  );

  function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = (e) => {
      e.preventDefault();
      if (!email.trim() || !password.trim()) {
        setError('Please enter your email and password.');
        return;
      }
      setSubmitting(true);
      const result = window.Store.login(email.trim(), password);
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error || 'Sign in failed. Please try again.');
        return;
      }
      setError('');
      window.Router.go('/dashboard');
    };

    return (
      <div className="arsela-app coplan-page coplan-login" style={{
        width: '100%', height: '100vh', display: 'flex', overflow: 'hidden', background: '#fff',
      }}>
        {/* Left: form */}
        <div className="coplan-login-form" style={{
          flex: '0 0 52%', display: 'flex', flexDirection: 'column',
          padding: '48px 72px', background: '#fff', position: 'relative', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CoplanistraWordmark color="var(--arsela-navy)" subColor="var(--arsela-text-muted)" />
            <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)' }}>
              New here? <a style={{ color: 'var(--arsela-blue)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }} onClick={() => window.Store.toast('Contact your workspace admin to request access', 'info')}>Request access</a>
            </div>
          </div>

          <form onSubmit={submit} style={{ marginTop: 64, maxWidth: 420 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.4, lineHeight: 1.1 }}>Welcome back</div>
            <div style={{ fontSize: 15, color: 'var(--arsela-text-muted)', marginTop: 10, lineHeight: 1.5 }}>
              Sign in to plan budgets, track spend and route approvals across your organisation.
            </div>

            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Email address</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--arsela-border-strong)', borderRadius: 8, padding: '0 12px', height: 40 }}>
                  <IconMail size={16} style={{ color: 'var(--arsela-text-subtle)' }}/>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', minWidth: 0 }}/>
                </div>
              </label>
              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>Password</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--arsela-border-strong)', borderRadius: 8, padding: '0 12px', height: 40 }}>
                  <IconLock size={16} style={{ color: 'var(--arsela-text-subtle)' }}/>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)', minWidth: 0 }}/>
                  <IconEye size={16} onClick={() => setShowPw((v) => !v)} style={{ color: 'var(--arsela-text-subtle)', cursor: 'pointer' }} />
                </div>
              </label>

              {error && (
                <div style={{
                  fontSize: 12.5, color: 'var(--danger)', fontWeight: 600,
                  background: 'var(--danger-50)', border: '1px solid #F5C2C2',
                  borderRadius: 8, padding: '9px 12px',
                }}>{error}</div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--arsela-navy)', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 15, height: 15, accentColor: 'var(--arsela-blue)' }}/>
                  Keep me signed in
                </label>
                <a style={{ fontSize: 13, color: 'var(--arsela-blue)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }} onClick={() => window.Store.toast('Password reset link sent (demo)', 'info')}>Forgot password?</a>
              </div>

              <ArsButton size="lg" full style={{ marginTop: 8 }} onClick={submit} disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</ArsButton>

              <div style={{
                marginTop: 8, fontSize: 11.5, color: 'var(--arsela-text-subtle)',
                background: 'var(--arsela-surface-alt)', border: '1px solid var(--arsela-border)',
                borderRadius: 8, padding: '10px 12px', lineHeight: 1.5,
              }}>
                Sign in with your company email address. Default password: <strong style={{ color: 'var(--arsela-text-muted)' }}>Arsela123</strong>
              </div>
            </div>
          </form>

          <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <ArselaCreditLight />
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--arsela-text-muted)' }}>
              <a style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
              <a style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
              <a style={{ color: 'inherit', textDecoration: 'none' }}>Support</a>
              <span>© 2026</span>
            </div>
          </div>
        </div>

        {/* Right: gradient panel */}
        <div className="coplan-login-hero" style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #0D3AB8 0%, #001F3D 60%, #000C1F 100%)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: 56, color: '#fff',
        }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.35 }} preserveAspectRatio="none" viewBox="0 0 800 900">
            <defs>
              <linearGradient id="line" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#00A896" stopOpacity="0.05"/><stop offset=".5" stopColor="#5B9EFF" stopOpacity="0.6"/><stop offset="1" stopColor="#00A896" stopOpacity="0.1"/></linearGradient>
            </defs>
            {[...Array(9)].map((_, i) => (
              <path key={i} d={`M -50 ${520 + i * 22} Q 200 ${420 + i * 30 + Math.sin(i) * 40} 400 ${500 + i * 20} T 900 ${480 + i * 22}`} stroke="url(#line)" strokeWidth="1" fill="none" opacity={0.4 - i * 0.03}/>
            ))}
            {[...Array(60)].map((_, i) => {
              const x = 100 + (i * 17) % 700; const y = 600 + Math.sin(i * 0.7) * 80 + (i * 3) % 80;
              return <circle key={i} cx={x} cy={y} r={((i * 37) % 16) / 10 + 0.4} fill="#8FB8FF" opacity={((i * 13) % 60) / 100 + 0.2}/>;
            })}
            <path d="M 80 620 L 180 560 L 260 590 L 360 500 L 460 540 L 560 460 L 680 420" stroke="#00D6BE" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.75"/>
            {[[80, 620], [180, 560], [260, 590], [360, 500], [460, 540], [560, 460], [680, 420]].map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#00D6BE"/>
            ))}
          </svg>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#00D6BE' }}/>
            FY 2026 · Malaysia Ringgit
          </div>

          <div style={{ position: 'relative', maxWidth: 500 }}>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.05 }}>
              From data<br/>
              <span style={{ color: '#5B9EFF' }}>to </span>
              <span style={{ color: '#00D6BE' }}>decisions.</span>
            </div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', marginTop: 22, lineHeight: 1.55, maxWidth: 440 }}>
              Coplanistra brings your organisation's budgets, expenses and approvals into one clear view — so every ringgit is planned, tracked and accountable.
            </div>

            <div style={{
              marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: 20, backdropFilter: 'blur(6px)',
            }}>
              {[['RM 248M', 'Planned FY26'], ['96%', 'On-track budgets'], ['1,240', 'Approvals routed']].map(([v, l]) => (
                <div key={l} style={{ borderLeft: l === 'Planned FY26' ? 'none' : '1px solid rgba(255,255,255,0.1)', paddingLeft: l === 'Planned FY26' ? 0 : 20 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.2 }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, maxWidth: 440 }}>
            <div style={{ fontSize: 30, lineHeight: 0.5, color: '#00D6BE', marginBottom: 6 }}>"</div>
            Coplanistra replaced eight spreadsheets and cut our monthly close from twelve days to three.
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Aisha R. — Group Controller</div>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { LoginScreen });
})();
