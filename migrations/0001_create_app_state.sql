-- Single shared application-state blob (mirrors the shape previously
-- kept ONLY in browser localStorage under 'coplanistra_state_v3').
-- id is pinned to 1 because this app has one shared org-wide state,
-- not per-user rows -- consistent with the existing no-multi-tenant
-- design (every logged-in user already saw the same shared financial
-- data blob; this just moves that shared blob from "whichever browser
-- last wrote localStorage" to a real central database so it's the
-- same data no matter which device/browser opens the site).
CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
