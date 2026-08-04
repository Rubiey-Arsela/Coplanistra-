/* ============================================================
   Coplanistra — minimal hash router
   ============================================================ */
(function () {
  const listeners = new Set();

  function parse() {
    const raw = (location.hash || '#/dashboard').slice(1); // strip '#'
    const [path, query] = raw.split('?');
    const segments = path.split('/').filter(Boolean);
    const params = {};
    if (query) {
      query.split('&').forEach((kv) => {
        const [k, v] = kv.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path: '/' + segments.join('/'), segments, params };
  }

  function current() {
    return parse();
  }

  function go(path) {
    if (!path.startsWith('#')) path = '#' + path;
    if (location.hash === path) {
      // force re-render even if same hash
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      location.hash = path;
    }
  }

  window.addEventListener('hashchange', () => {
    const r = current();
    listeners.forEach((fn) => fn(r));
  });

  window.Router = {
    current,
    go,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
