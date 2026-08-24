/* Reusable primitives — cards, buttons, badges, inputs, tables — Arsela design system */

const arsCard = ({ children, style, className = '', padded = true, onClick, id, title }) => (
  <div className={className} id={id} title={title} onClick={onClick} style={{
    background: 'var(--arsela-card)',
    border: '1px solid var(--arsela-border)',
    borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--arsela-shadow-card)',
    padding: padded ? 20 : 0,
    ...style
  }}>{children}</div>
);
const ArsCard = arsCard;

const ArsButton = ({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, style = {}, full, disabled }) => {
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13, height: 30, gap: 6 },
    md: { padding: '9px 16px', fontSize: 14, height: 38, gap: 8 },
    lg: { padding: '12px 20px', fontSize: 15, height: 46, gap: 10 },
  };
  const variants = {
    primary: {
      background: 'linear-gradient(180deg, #1E52DA 0%, #1343CB 100%)',
      color: '#fff',
      border: '1px solid #0F38B0',
      boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 1px 2px rgba(19,67,203,0.25)',
    },
    secondary: {
      background: '#fff',
      color: 'var(--arsela-navy)',
      border: '1px solid var(--arsela-border-strong)',
      boxShadow: '0 1px 2px rgba(0,31,61,0.04)',
    },
    ghost: { background: 'transparent', color: 'var(--arsela-navy)', border: '1px solid transparent' },
    teal: {
      background: 'linear-gradient(180deg, #00B8A5 0%, #00A896 100%)',
      color: '#fff',
      border: '1px solid #008E7D',
    },
    navy: { background: 'var(--arsela-navy)', color: '#fff', border: '1px solid var(--arsela-navy)' },
    danger: { background: '#fff', color: 'var(--arsela-danger)', border: '1px solid #F5C2C2' },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit', fontWeight: 600, borderRadius: 'var(--r-md)',
      cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', width: full ? '100%' : 'auto',
      opacity: disabled ? 0.6 : 1,
      ...sizes[size], ...variants[variant], ...style,
    }}>
      {icon}{children && <span>{children}</span>}{iconRight}
    </button>
  );
};

const ArsBadge = ({ children, tone = 'neutral', size = 'md', dot }) => {
  const tones = {
    neutral: { bg: '#F1F3F7', fg: '#3B4A63', dot: '#8492A6' },
    blue:    { bg: 'var(--arsela-blue-50)', fg: 'var(--arsela-blue)', dot: 'var(--arsela-blue)' },
    teal:    { bg: 'var(--arsela-teal-50)', fg: 'var(--arsela-teal-600)', dot: 'var(--arsela-teal)' },
    success: { bg: 'var(--arsela-success-50)', fg: 'var(--arsela-success)', dot: 'var(--arsela-success)' },
    warning: { bg: 'var(--arsela-warning-50)', fg: '#B4740A', dot: 'var(--arsela-warning)' },
    danger:  { bg: 'var(--arsela-danger-50)', fg: 'var(--arsela-danger)', dot: 'var(--arsela-danger)' },
    navy:    { bg: '#E7EBF3', fg: 'var(--arsela-navy)', dot: 'var(--arsela-navy)' },
  };
  const t = tones[tone] || tones.neutral;
  const isSm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: t.bg, color: t.fg,
      padding: isSm ? '2px 8px' : '4px 10px',
      borderRadius: 'var(--r-full)', fontSize: isSm ? 11 : 12,
      fontWeight: 600, letterSpacing: 0.1, lineHeight: 1.3, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot }} />}
      {children}
    </span>
  );
};

const ArsInput = ({ label, value, placeholder, icon, style, type = 'text', hint, right }) => (
  <label style={{ display: 'block', ...style }}>
    {label && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>{label}</div>}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#fff', border: '1px solid var(--arsela-border-strong)',
      borderRadius: 'var(--r-md)', padding: '0 12px', height: 40,
    }}>
      {icon && <span style={{ color: 'var(--arsela-text-subtle)' }}>{icon}</span>}
      <input type={type} defaultValue={value} placeholder={placeholder} style={{
        flex: 1, border: 'none', outline: 'none', background: 'transparent',
        fontSize: 14, fontFamily: 'inherit', color: 'var(--arsela-navy)',
        minWidth: 0,
      }}/>
      {right}
    </div>
    {hint && <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', marginTop: 6 }}>{hint}</div>}
  </label>
);

// NOTE: the bar's visual WIDTH is always capped at 100% (a bar can't
// physically render past its container), but the numeric LABEL shows the
// true, un-capped value — e.g. a budget at 107.1% of allocation must show
// "107.1%" next to a full bar, never a misleading capped "100%". Callers
// should pass the real (uncapped) percentage as `value` and let this
// component do the bar-width clamping internally; do NOT pre-clamp with
// Math.min() before passing in, or the label will silently lose precision.
const ArsProgress = ({ value = 0, tone = 'blue', height = 6, showValue = false, decimals = 0 }) => {
  const colors = {
    blue: 'linear-gradient(90deg, #1343CB, #2657DB)',
    teal: 'linear-gradient(90deg, #00A896, #00C4B0)',
    warning: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
    danger: 'linear-gradient(90deg, #EF4444, #F87171)',
    success: 'linear-gradient(90deg, #16A34A, #22C55E)',
  };
  const safeValue = Number.isFinite(value) ? value : 0;
  const barPct = Math.min(100, Math.max(0, safeValue));
  const displayValue = decimals > 0 ? safeValue.toFixed(decimals) : Math.round(safeValue);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, background: '#EEF1F6', borderRadius: 'var(--r-full)', height, overflow: 'hidden' }}>
        <div style={{ width: `${barPct}%`, height: '100%', background: colors[tone], borderRadius: 'var(--r-full)' }} />
      </div>
      {showValue && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--arsela-text-muted)', minWidth: 36, textAlign: 'right' }}>{displayValue}%</span>}
    </div>
  );
};

const ArsAvatar = ({ name, size = 32, tone = 'blue' }) => {
  const bg = {
    blue: 'linear-gradient(135deg, #1343CB, #2657DB)',
    teal: 'linear-gradient(135deg, #00A896, #14B8A6)',
    navy: 'linear-gradient(135deg, #001F3D, #0B2A4D)',
    warn: 'linear-gradient(135deg, #F59E0B, #F97316)',
    purple: 'linear-gradient(135deg, #6D28D9, #4C1D95)',
  }[tone];
  const initials = name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%', background: bg, color: '#fff',
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0,
    }}>{initials}</span>
  );
};

const ArsSectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--arsela-navy)', letterSpacing: -0.1 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{subtitle}</div>}
    </div>
    {action}
  </div>
);

/* Format currency — all amounts in the app are stored in MYR (base currency).
   fmtMYR converts to the user's selected display currency (Store.state.currency:
   MYR / USD / AUD / CNY) via window.Store.convert() and formats with that
   currency's symbol + locale. Falls back to plain MYR if Store isn't ready yet
   (e.g. during initial script parse). Name kept as "fmtMYR" for the ~13 existing
   call sites — it now means "format a MYR-denominated amount for display". */
const fmtMYR = (n, opts = {}) => {
  const { compact = false, decimals } = opts;
  const store = window.Store;
  const cfg = store ? store.getCurrencyConfig() : { symbol: 'RM', rate: 1, decimals: 0 };
  const amount = store ? store.convert(n, store.getState().currency) : n;
  const dec = decimals != null ? decimals : cfg.decimals;
  const sym = cfg.symbol;
  if (compact && Math.abs(amount) >= 1_000_000) return `${sym} ${(amount / 1_000_000).toFixed(2)}M`;
  if (compact && Math.abs(amount) >= 1_000) return `${sym} ${(amount / 1_000).toFixed(1)}K`;
  return `${sym} ${amount.toLocaleString('en-MY', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
};
const fmtPct = (n, opts = {}) => {
  const { showSign = true, decimals = 1 } = opts;
  const s = n.toFixed(decimals);
  return (showSign && n > 0 ? '+' : '') + s + '%';
};

/* Currency-aware label for SVG chart axis/bar labels that are written as
   plain "millions of MYR" numbers (e.g. the literal `60` in `RM{60}M`).
   Converts through the currently selected display currency's rate and
   prefixes with that currency's symbol, so chart gridlines/bars follow
   the global currency switcher instead of staying hardcoded to RM. */
const curLabel = (millionsMYR, decimals = 0) => {
  const store = window.Store;
  const cfg = store ? store.getCurrencyConfig() : { symbol: 'RM', rate: 1 };
  const val = (Number(millionsMYR) || 0) * cfg.rate;
  return `${cfg.symbol}${val.toFixed(decimals)}M`;
};

/* -------- Variance indicator (▲▼ + color + text, colour-blind safe) -------- */
const ArsVariance = ({ value, format = 'pct', decimals = 1, size = 'md', invert = false, showArrow = true }) => {
  /* invert = true → positive value is BAD (e.g. over-budget), useful in spend contexts */
  const isPositive = value > 0;
  const good = invert ? !isPositive : isPositive;
  const neutral = value === 0;
  const color = neutral ? 'var(--arsela-text-muted)' : good ? 'var(--success)' : 'var(--danger)';
  const arrow = neutral ? '•' : isPositive ? '▲' : '▼';
  const abs = Math.abs(value);
  const text = format === 'pct'
    ? (isPositive ? '+' : value < 0 ? '−' : '') + abs.toFixed(decimals) + '%'
    : (isPositive ? '+' : value < 0 ? '−' : '') + fmtMYR(abs, { compact: true });
  const fs = size === 'sm' ? 11 : size === 'lg' ? 14 : 12.5;
  return (
    <span className="arsela-num" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      color, fontWeight: 700, fontSize: fs, lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      {showArrow && <span style={{ fontSize: fs - 2 }} aria-hidden>{arrow}</span>}
      <span>{text}</span>
    </span>
  );
};

/* -------- Financial KPI number (large tabular figure + optional variance) -------- */
const ArsFigure = ({ value, unit = 'RM', size = 32, tone = 'navy' }) => (
  <div style={{
    fontSize: size, fontWeight: 700, letterSpacing: -0.5,
    color: tone === 'navy' ? 'var(--arsela-navy)' : tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : 'var(--arsela-navy)',
    fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 6,
  }} className="arsela-num">
    {unit && <span style={{ fontSize: size * 0.42, color: 'var(--arsela-text-muted)', fontWeight: 600 }}>{unit}</span>}
    <span>{value}</span>
  </div>
);

/* -------- Tabs / sub-nav -------- */
const ArsTabs = ({ tabs, active, onSelect }) => (
  <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--arsela-border)' }} role="tablist">
    {tabs.map(t => {
      const isActive = t === active || t.id === active;
      const label = typeof t === 'string' ? t : t.label;
      const key = typeof t === 'string' ? t : t.id;
      return (
        <button
          key={key} role="tab" aria-selected={isActive}
          onClick={() => onSelect && onSelect(key)}
          style={{
            padding: '10px 16px', fontSize: 13.5, fontWeight: 600,
            color: isActive ? 'var(--arsela-navy)' : 'var(--arsela-text-muted)',
            background: 'transparent',
            border: 'none',
            borderBottom: isActive ? '2px solid var(--arsela-blue)' : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >{label}</button>
      );
    })}
  </div>
);

/* -------- Skeleton loader -------- */
const ArsSkeleton = ({ w = '100%', h = 16, radius = 4, style }) => (
  <span className="ars-skel" style={{
    width: w, height: h, borderRadius: radius,
    ...style,
  }}/>
);

/* -------- Empty state -------- */
const ArsEmpty = ({ icon, title, body, action }) => (
  <div style={{
    padding: '48px 24px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: 14,
      background: 'var(--arsela-blue-50)', color: 'var(--arsela-blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--arsela-navy)' }}>{title}</div>
    <div style={{ fontSize: 13, color: 'var(--arsela-text-muted)', maxWidth: 320 }}>{body}</div>
    {action && <div style={{ marginTop: 6 }}>{action}</div>}
  </div>
);

/* -------- RAG status pill (Red-Amber-Green, colour-blind safe with letter) -------- */
const ArsRAG = ({ status }) => {
  /* status: 'R' | 'A' | 'G' | 'ontrack' | 'atrisk' | 'offtrack' */
  const map = {
    G: { c: 'var(--success)', bg: 'var(--success-50)', letter: 'G', label: 'On track' },
    A: { c: 'var(--warning)', bg: 'var(--warning-50)', letter: 'A', label: 'At risk' },
    R: { c: 'var(--danger)',  bg: 'var(--danger-50)',  letter: 'R', label: 'Off track' },
  };
  const k = status === 'ontrack' ? 'G' : status === 'atrisk' ? 'A' : status === 'offtrack' ? 'R' : status;
  const t = map[k] || map.G;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px 3px 4px', borderRadius: 999,
      background: t.bg, color: t.c, fontSize: 12, fontWeight: 700,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%', background: t.c, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800,
      }} aria-hidden>{t.letter}</span>
      {t.label}
    </span>
  );
};

/* -------- Budget lifecycle badge (Draft / Active / Amendment Pending / Closed / Archived) -------- */
const ArsLifecycle = ({ status }) => {
  const map = {
    draft:      { bg: '#EEF1F6', fg: '#5B6B82', label: 'Draft',              dot: '#8492A6' },
    active:     { bg: '#ECFDF3', fg: '#1A8754', label: 'Active',             dot: '#1A8754' },
    amendment:  { bg: '#FFF8E6', fg: '#B4740A', label: 'Amendment Pending',  dot: '#E0A100' },
    closed:     { bg: '#E7EBF3', fg: '#001F3D', label: 'Closed',             dot: '#001F3D' },
    archived:   { bg: '#F3F0FA', fg: '#5B21B6', label: 'Archived',           dot: '#7C3AED' },
    over:       { bg: '#FEECEC', fg: '#D64045', label: 'Over Budget',        dot: '#D64045' },
    // Not a real underlying budget.status value — a derived visual flag
    // (utilisation 80-99%) that BudgetsScreen overlays on top of 'active'
    // so at-risk budgets are visible before they actually breach 100%.
    nearing:    { bg: '#FFF3E0', fg: '#B4740A', label: 'Nearing Cap',        dot: '#F59E0B' },
  };
  const t = map[status] || map.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 999, background: t.bg, color: t.fg,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.2, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot }}/>
      {t.label}
    </span>
  );
};

/* ---- ArsModal — generic centred dialog shell used by every Add/Edit
   form across the app (Budgets, Expenses, CAPEX, Team & Access). ---- */
const ArsModal = ({ open, onClose, title, subtitle, children, footer, width = 480 }) => {
  if (!open) return null;
  return (
    <div className="ars-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,15,31,0.5)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(2px)',
    }}>
      <div className="ars-modal" style={{
        width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
        background: '#fff', borderRadius: 14, boxShadow: 'var(--arsela-shadow-elevated)',
        animation: 'ars-toast-in .15s ease-out',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          padding: '18px 22px', borderBottom: '1px solid var(--arsela-border)',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--arsela-navy)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: 'var(--arsela-text-muted)', marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--arsela-border)', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--arsela-text-muted)', flexShrink: 0,
          }}><IconClose size={14}/></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
        {footer && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
            padding: '16px 22px', borderTop: '1px solid var(--arsela-border)', background: 'var(--arsela-surface-alt)',
            borderRadius: '0 0 14px 14px',
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
};

/* ---- ArsConfirmDialog — a small ArsModal preset for destructive confirms
   (Delete buttons across Budgets / Expenses / CAPEX / Team & Access). ---- */
const ArsConfirmDialog = ({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', danger = true }) => (
  <ArsModal open={open} onClose={onClose} title={title} width={400}
    footer={<>
      <ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton>
      <ArsButton variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm && onConfirm(); onClose && onClose(); }}>{confirmLabel}</ArsButton>
    </>}>
    <div style={{ fontSize: 13.5, color: 'var(--arsela-text-muted)', lineHeight: 1.6 }}>{message}</div>
  </ArsModal>
);

/* ---- Small labelled form field wrapper, used inside ArsModal forms ---- */
const ArsField = ({ label, children, hint }) => (
  <label style={{ display: 'block', marginBottom: 14 }}>
    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--arsela-navy)' }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 11, color: 'var(--arsela-text-subtle)', marginTop: 4 }}>{hint}</div>}
  </label>
);

const arsFieldInputStyle = {
  width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--arsela-border-strong)',
  padding: '0 12px', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--arsela-navy)', background: '#fff',
};

/* ---- Real CSV export — every "Export" button in the app calls this
   instead of just toasting. Builds a CSV blob client-side (no backend
   needed — Cloudflare Pages is static) and triggers a browser download,
   then confirms with a toast so the action feels complete. ---- */
function exportRowsToCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.map(esc).join(',')].concat(rows.map((r) => r.map(esc).join(',')));
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (window.Store) window.Store.toast(`Exported ${filename}.csv`, 'success');
}

/* ---- CSV import parser — the inverse of exportRowsToCSV. Used by the
   Xero CSV-import feature (Expenses screen) and any future "upload a
   CSV" workflow. Handles quoted fields (with embedded commas/newlines/
   escaped quotes) the same way exportRowsToCSV writes them, plus plain
   unquoted CSV/Excel exports. Returns an array of row-arrays (first row
   is normally the header row — callers decide how to treat it). Purely
   client-side (FileReader + string parsing) — no backend needed, fits
   Cloudflare Pages' static-hosting constraints. ---- */
function parseCSVText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = String(text || '').replace(/^\uFEFF/, ''); // strip BOM (common in Excel/Xero exports)
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // skip — \n (or end) will terminate the row
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  // flush trailing field/row (files not ending in a newline)
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // drop fully-empty trailing rows (common with trailing blank lines)
  return rows.filter((r) => r.some((v) => String(v || '').trim() !== ''));
}

/* ---- Multi-format import parser — accepts CSV, Excel (.xlsx/.xls) and
   PDF exports from Xero (or any similarly-shaped report) and normalises
   them all to the same shape parseCSVText already returns: an array of
   row-arrays, first row usually the header row. Every existing per-report
   column-detection/preview/import pipeline (Data Imports hub, Expenses
   "Import from Xero") is written against that shape, so this is the only
   place that needs to know about file *format* — callers stay unchanged
   beyond swapping their FileReader/parseCSVText call for this.
     - CSV/TXT: reuses parseCSVText.
     - Excel: parsed client-side with SheetJS (CDN, window.XLSX), first
       sheet only, formatted-text mode so numbers/dates come through as
       strings the same way a CSV export would.
     - PDF: parsed client-side with pdf.js (CDN, window.pdfjsLib). Text
       items are re-assembled into rows by clustering on Y position (same
       line) then split into cells on horizontal gaps (column boundaries).
       This is a best-effort heuristic — it works well for the simple,
       left-aligned tabular reports Xero exports, but is not a general
       PDF-table parser; scanned/image-only PDFs have no text layer at
       all and will report a clear error asking for CSV/Excel instead.
   Returns a Promise<string[][]> — callers should always .catch() and
   surface e.message to the user (all rejection paths set a human-readable
   message). ---- */
function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const name = String(file.name || '').toLowerCase();
    if (/\.(xlsx|xls)$/.test(name)) {
      if (!window.XLSX) { reject(new Error('Excel parser did not load — check your connection and try again, or use a CSV/PDF export instead.')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result);
          const wb = window.XLSX.read(data, { type: 'array' });
          const sheetName = wb.SheetNames[0];
          if (!sheetName) { reject(new Error('This Excel file has no sheets.')); return; }
          const sheet = wb.Sheets[sheetName];
          const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
          const cleaned = rows
            .map((r) => r.map((c) => (c == null ? '' : String(c))))
            .filter((r) => r.some((v) => v.trim() !== ''));
          if (cleaned.length === 0) { reject(new Error('No data found on the first sheet of this Excel file.')); return; }
          resolve(cleaned);
        } catch (e) {
          reject(new Error('Could not read this Excel file. Please check it is a valid .xlsx/.xls export and try again.'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read this file.'));
      reader.readAsArrayBuffer(file);
    } else if (/\.pdf$/.test(name)) {
      if (!window.pdfjsLib) { reject(new Error('PDF parser did not load — check your connection and try again, or use a CSV/Excel export instead.')); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = new Uint8Array(reader.result);
          const pdf = await window.pdfjsLib.getDocument({ data }).promise;
          const rows = [];
          const Y_TOLERANCE = 3;   // px — items within this are treated as the same line
          const GAP_THRESHOLD = 8; // px — a horizontal gap bigger than this starts a new cell/column
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const items = content.items
              .filter((it) => it.str && it.str.trim() !== '')
              .map((it) => ({ x: it.transform[4], y: it.transform[5], str: it.str, width: it.width || 0 }));
            // cluster into lines by Y (pdf.js returns items roughly in
            // reading order for simple single-column report layouts)
            const lines = [];
            let current = null;
            items.forEach((it) => {
              if (!current || Math.abs(it.y - current.y) > Y_TOLERANCE) {
                current = { y: it.y, items: [] };
                lines.push(current);
              }
              current.items.push(it);
            });
            // sort top-to-bottom (PDF y grows upward) then left-to-right within a line
            lines.sort((a, b) => b.y - a.y);
            lines.forEach((line) => {
              line.items.sort((a, b) => a.x - b.x);
              const cells = [];
              let cur = '';
              let prevEndX = null;
              line.items.forEach((it) => {
                if (prevEndX !== null && it.x - prevEndX > GAP_THRESHOLD) {
                  cells.push(cur.trim());
                  cur = it.str;
                } else {
                  cur += (cur ? ' ' : '') + it.str;
                }
                prevEndX = it.x + it.width;
              });
              if (cur.trim() !== '') cells.push(cur.trim());
              if (cells.some((c) => c !== '')) rows.push(cells);
            });
          }
          if (rows.length === 0) {
            reject(new Error('No readable text found in this PDF. If it\u2019s a scanned/image PDF, please export a CSV or Excel version from Xero instead.'));
            return;
          }
          resolve(rows);
        } catch (e) {
          reject(new Error('Could not read this PDF. Please check it is a text-based Xero export (not a scanned image) and try again.'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read this file.'));
      reader.readAsArrayBuffer(file);
    } else {
      // CSV / plain text
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(parseCSVText(String(reader.result || '')));
        } catch (e) {
          reject(new Error('Could not read this file as CSV.'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read this file.'));
      reader.readAsText(file);
    }
  });
}

Object.assign(window, {
  ArsCard, ArsButton, ArsBadge, ArsInput, ArsProgress, ArsAvatar, ArsSectionHeader,
  ArsVariance, ArsFigure, ArsTabs, ArsSkeleton, ArsEmpty, ArsRAG, ArsLifecycle,
  fmtMYR, fmtPct, curLabel, ArsModal, ArsConfirmDialog, ArsField, arsFieldInputStyle,
  exportRowsToCSV, parseCSVText, parseImportFile,
});
