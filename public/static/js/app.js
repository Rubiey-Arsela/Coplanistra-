/* ============================================================
   Coplanistra — app bootstrap
   Maps the current hash route to a screen component, gates
   unauthenticated users to /login, and mounts/re-renders the
   React tree whenever the Router or Store notify a change.
   ============================================================ */
(function () {
  const { useState, useEffect } = React;

  // Route segment[0] -> Screen component. Special-cased routes
  // (budgets/new, budgets/:id) are resolved inside resolveScreen().
  const SCREEN_MAP = {
    'dashboard': 'DashboardScreen',
    'budgets': 'BudgetsScreen',
    'quarterly': 'QuarterlyScreen',
    'monthly': 'MonthlyScreen',
    'expenses': 'ExpensesScreen',
    'approvals': 'ApprovalsScreen',
    'closeout': 'CloseoutScreen',
    'capex': 'CapexScreen',
    'cashflow': 'CashFlowScreen',
    'performance': 'PerformanceScreen',
    'reports': 'ReportsScreen',
    'copilot': 'CopilotScreen',
    'admin': 'AdminScreen',
    'settings': 'SettingsScreen',
  };

  function NotFoundScreen() {
    return (
      <AppFrame active="Dashboard" title="Not found" breadcrumb={['Coplanistra', 'Error']}>
        <ArsCard>
          <ArsEmpty
            icon={<IconInfo size={28}/>}
            title="Page not found"
            body="That route doesn't exist yet. Head back to your dashboard."
            action={<ArsButton onClick={() => window.Router.go('/dashboard')}>Go to Dashboard</ArsButton>}
          />
        </ArsCard>
      </AppFrame>
    );
  }

  function resolveScreen(route) {
    const [head, sub] = route.segments;

    if (!head || head === 'dashboard') return window.DashboardScreen;

    if (head === 'budgets') {
      if (sub === 'new') return window.CreateBudgetScreen;
      if (sub) return window.BudgetDetailScreen;
      return window.BudgetsScreen;
    }

    const key = SCREEN_MAP[head];
    if (key && window[key]) return window[key];

    return NotFoundScreen;
  }

  function Root() {
    const [authed, setAuthed] = useState(window.Store.getState().authenticated);
    const [route, setRoute] = useState(window.Router.current());

    useEffect(() => {
      const unsubStore = window.Store.subscribe((s) => setAuthed(s.authenticated));
      const unsubRouter = window.Router.subscribe((r) => setRoute(r));
      return () => { unsubStore(); unsubRouter(); };
    }, []);

    if (!authed) {
      // Any route while unauthenticated resolves to Login.
      return <window.LoginScreen/>;
    }

    if (route.path === '/login') {
      // Already authenticated — bounce away from the login route.
      window.Router.go('/dashboard');
      return null;
    }

    const Screen = resolveScreen(route);
    // Re-mount on path change (not just re-render) so per-screen
    // local state (search boxes, filters, wizard steps) resets
    // cleanly when navigating between different routes.
    return <Screen key={route.path}/>;
  }

  const rootEl = document.getElementById('root');
  const root = ReactDOM.createRoot ? ReactDOM.createRoot(rootEl) : null;
  if (root) {
    root.render(<Root/>);
  } else {
    ReactDOM.render(<Root/>, rootEl);
  }
})();
