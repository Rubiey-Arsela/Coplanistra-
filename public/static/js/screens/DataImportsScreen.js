/* ============================================================
   Data Imports — central hub for the 8 Xero report types the
   client asked to bring into Coplanistra, plus a register for
   "documents outside Xero" (bank statements, loan agreements,
   board resolutions, etc).

   No Xero OAuth/API connection exists (static Cloudflare Pages
   hosting has no backend to hold credentials) — the workflow is
   the same client-side CSV pattern already used on Expenses:
     1. Export the report from Xero as CSV.
     2. Upload it here — columns are auto-detected per report type.
     3. Review/edit the parsed preview, then confirm.
     4. window.Store.addXeroImport(type, record) stores it as a
        dated snapshot (newest first) — Xero reports are always
        "as at" or "for period" point-in-time exports.
   Figures are stored exactly as imported, in AUD (Arsela's Xero
   org currency) — no FX conversion applied on import.
   ============================================================ */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  /* ---- shared CSV helpers (local copies — same pattern as the
     Expenses "Import from Xero" modal; no shared util module for
     these in this codebase, each screen keeps its own). -------- */
  function parseAmountCell(raw) {
    if (raw == null) return 0;
    let s = String(raw).trim();
    const negative = /^\(.*\)$/.test(s);
    s = s.replace(/[(),]/g, '').replace(/[A-Za-z$]/g, '').trim();
    const n = parseFloat(s);
    if (isNaN(n)) return 0;
    return negative ? -n : n;
  }
  function parseDateCell(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    let d = null;
    if (dm) {
      let [, day, month, year] = dm;
      if (year.length === 2) year = '20' + year;
      d = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
    if (!d || isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fileKindLabel(fileName) {
    const n = String(fileName || '').toLowerCase();
    if (/\.pdf$/.test(n)) return 'PDF';
    if (/\.(xlsx|xls)$/.test(n)) return 'Excel file';
    return 'CSV';
  }
  function detectColumns(headerRow, fields) {
    const norm = headerRow.map((h) => String(h || '').trim().toLowerCase());
    const result = {};
    fields.forEach((f) => {
      if (!f.aliases || f.aliases.length === 0) { result[f.key] = -1; return; }
      let idx = norm.findIndex((h) => f.aliases.includes(h));
      if (idx === -1) idx = norm.findIndex((h) => f.aliases.some((a) => h.includes(a)));
      result[f.key] = idx;
    });
    return result;
  }

  /* ---- per-report-type schema: drives column detection, the
     editable preview table, and the totals rolled up for use
     elsewhere (Director's Report, contextual screens). --------- */
  const REPORT_SCHEMAS = {
    profitAndLoss: {
      icon: 'IconChart',
      hint: 'Reports \u2192 Profit and Loss \u2192 set the date range to current month (or FY-to-date) \u2192 Export \u2192 CSV.',
      fields: [
        { key: 'account', label: 'Account', type: 'text', aliases: ['account', 'line item', 'account name', 'name'] },
        { key: 'classification', label: 'Classification', type: 'select', options: ['Revenue', 'Other Income', 'Cost of Sales', 'Operating Expense', 'Other Expense'], aliases: [] },
        { key: 'current', label: 'Current month', type: 'number', aliases: ['current month', 'this month', 'current', 'month'] },
        { key: 'ytd', label: 'YTD actual', type: 'number', aliases: ['ytd actual', 'ytd', 'year to date'] },
        { key: 'budget', label: 'YTD budget', type: 'number', aliases: ['ytd budget', 'budget', 'annual budget'] },
      ],
      requiredKey: 'account',
      guessSelect: { classification: (row) => {
        const a = (row.account || '').toLowerCase();
        if (/other income/.test(a)) return 'Other Income';
        if (/(revenue|sales|income|fees earned)/.test(a)) return 'Revenue';
        if (/(cost of (goods|sales)|cogs)/.test(a)) return 'Cost of Sales';
        if (/other expense/.test(a)) return 'Other Expense';
        return 'Operating Expense';
      } },
      computeTotals: (rows) => {
        const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const rev = rows.filter((r) => r.classification === 'Revenue' || r.classification === 'Other Income');
        const exp = rows.filter((r) => !(r.classification === 'Revenue' || r.classification === 'Other Income'));
        const totalRevenueYTD = sum(rev, 'ytd') || sum(rev, 'current');
        const totalExpenseYTD = sum(exp, 'ytd') || sum(exp, 'current');
        return {
          totalRevenueYTD, totalExpenseYTD,
          totalRevenueCurrent: sum(rev, 'current'), totalExpenseCurrent: sum(exp, 'current'),
          netProfitYTD: totalRevenueYTD - totalExpenseYTD,
          revenueBySource: rev.map((r) => ({ account: r.account, ytd: r.ytd || r.current || 0 })).sort((a, b) => b.ytd - a.ytd),
        };
      },
      renderTotals: (t) => ([
        { label: 'Total revenue (YTD)', value: t.totalRevenueYTD, money: true, tone: 'success' },
        { label: 'Total expenses (YTD)', value: t.totalExpenseYTD, money: true, tone: 'danger' },
        { label: 'Net profit / (loss) YTD', value: t.netProfitYTD, money: true, tone: t.netProfitYTD >= 0 ? 'success' : 'danger' },
      ]),
    },
    balanceSheet: {
      icon: 'IconBuilding',
      hint: 'Reports \u2192 Balance Sheet \u2192 set date to month-end, tick "Compare with a prior period" for the previous month \u2192 Export \u2192 CSV.',
      fields: [
        { key: 'account', label: 'Account', type: 'text', aliases: ['account', 'line item', 'account name'] },
        { key: 'classification', label: 'Classification', type: 'select', options: ['Asset', 'Liability', 'Equity'], aliases: [] },
        { key: 'current', label: 'This month-end', type: 'number', aliases: ['current', 'balance', 'this month', 'ytd'] },
        { key: 'prior', label: 'Prior month-end', type: 'number', aliases: ['prior', 'previous month', 'last month'] },
      ],
      requiredKey: 'account',
      guessSelect: { classification: (row) => {
        const a = (row.account || '').toLowerCase();
        if (/(liab|payable|loan|borrowing|creditor)/.test(a)) return 'Liability';
        if (/(equity|retained earnings|capital|share)/.test(a)) return 'Equity';
        return 'Asset';
      } },
      computeTotals: (rows) => {
        const sum = (cls, k) => rows.filter((r) => r.classification === cls).reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const totalAssets = sum('Asset', 'current'), totalLiabilities = sum('Liability', 'current'), totalEquity = sum('Equity', 'current');
        return {
          totalAssets, totalLiabilities, totalEquity,
          workingCapital: totalAssets - totalLiabilities,
          currentRatio: totalLiabilities ? totalAssets / totalLiabilities : null,
          priorAssets: sum('Asset', 'prior'), priorLiabilities: sum('Liability', 'prior'),
        };
      },
      renderTotals: (t) => ([
        { label: 'Total assets', value: t.totalAssets, money: true, tone: 'navy' },
        { label: 'Total liabilities', value: t.totalLiabilities, money: true, tone: 'navy' },
        { label: 'Total equity', value: t.totalEquity, money: true, tone: 'navy' },
        { label: 'Current ratio (assets \u00f7 liabilities)', value: t.currentRatio != null ? t.currentRatio.toFixed(2) + 'x' : '\u2014', money: false, tone: t.currentRatio >= 1 ? 'success' : 'danger' },
      ]),
    },
    cashFlowActuals: {
      icon: 'IconTrend',
      hint: 'Reports \u2192 Statement of Cash Flows (or Cash Summary) \u2192 current month / FY-to-date \u2192 Export \u2192 CSV.',
      fields: [
        { key: 'activity', label: 'Activity', type: 'select', options: ['Operating', 'Investing', 'Financing'], aliases: [] },
        { key: 'description', label: 'Description', type: 'text', aliases: ['description', 'line item', 'account'] },
        { key: 'current', label: 'Current month', type: 'number', aliases: ['current month', 'this month', 'current'] },
        { key: 'ytd', label: 'YTD', type: 'number', aliases: ['ytd', 'year to date'] },
      ],
      requiredKey: 'description',
      guessSelect: { activity: (row) => {
        const d = (row.description || '').toLowerCase();
        if (/(invest|capex|asset purchase|equipment)/.test(d)) return 'Investing';
        if (/(loan|financing|dividend|share issue|borrowing)/.test(d)) return 'Financing';
        return 'Operating';
      } },
      computeTotals: (rows) => {
        const sum = (act, k) => rows.filter((r) => r.activity === act).reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const netOperatingYTD = sum('Operating', 'ytd') || sum('Operating', 'current');
        const netInvestingYTD = sum('Investing', 'ytd') || sum('Investing', 'current');
        const netFinancingYTD = sum('Financing', 'ytd') || sum('Financing', 'current');
        return { netOperatingYTD, netInvestingYTD, netFinancingYTD, netMovementYTD: netOperatingYTD + netInvestingYTD + netFinancingYTD };
      },
      renderTotals: (t) => ([
        { label: 'Net operating (YTD)', value: t.netOperatingYTD, money: true, tone: t.netOperatingYTD >= 0 ? 'success' : 'danger' },
        { label: 'Net investing (YTD)', value: t.netInvestingYTD, money: true, tone: 'navy' },
        { label: 'Net financing (YTD)', value: t.netFinancingYTD, money: true, tone: 'navy' },
        { label: 'Net cash movement (YTD)', value: t.netMovementYTD, money: true, tone: t.netMovementYTD >= 0 ? 'success' : 'danger' },
      ]),
    },
    bankReconciliation: {
      icon: 'IconReconcile',
      hint: 'Accounting \u2192 Bank accounts \u2192 Westpac #2077 \u2192 Reconciliation Reports \u2192 export the Bank Reconciliation Summary/Detail as CSV for month-end.',
      metaFields: [
        { key: 'xeroBalance', label: 'Xero bank balance (per report)', type: 'number' },
        { key: 'statementBalance', label: 'Bank statement balance', type: 'number' },
      ],
      fields: [
        { key: 'date', label: 'Date', type: 'date', aliases: ['date'] },
        { key: 'description', label: 'Description', type: 'text', aliases: ['description', 'reference', 'narrative', 'payee'] },
        { key: 'amount', label: 'Amount', type: 'number', aliases: ['amount', 'gross', 'total'] },
        { key: 'status', label: 'Status', type: 'select', options: ['Reconciled', 'Unreconciled'], aliases: [] },
      ],
      requiredKey: 'description',
      guessSelect: { status: () => 'Unreconciled' },
      computeTotals: (rows, meta) => {
        const unre = rows.filter((r) => r.status === 'Unreconciled');
        const xeroBalance = Number(meta.xeroBalance) || 0;
        const statementBalance = Number(meta.statementBalance) || 0;
        return {
          xeroBalance, statementBalance, difference: xeroBalance - statementBalance,
          unreconciledCount: unre.length,
          unreconciledTotal: unre.reduce((a, r) => a + (Number(r.amount) || 0), 0),
        };
      },
      renderTotals: (t) => ([
        { label: 'Xero bank balance', value: t.xeroBalance, money: true, tone: 'navy' },
        { label: 'Bank statement balance', value: t.statementBalance, money: true, tone: 'navy' },
        { label: 'Difference', value: t.difference, money: true, tone: Math.abs(t.difference) < 1 ? 'success' : 'danger' },
        { label: 'Unreconciled items', value: `${t.unreconciledCount} (${t.unreconciledTotal.toFixed(0)})`, money: false, tone: t.unreconciledCount > 0 ? 'warning' : 'success' },
      ]),
    },
    generalLedger: {
      icon: 'IconFile',
      hint: 'Reports \u2192 General Ledger Detail \u2192 current month, all accounts, accrual basis \u2192 Export \u2192 CSV.',
      fields: [
        { key: 'date', label: 'Date', type: 'date', aliases: ['date'] },
        { key: 'account', label: 'Account', type: 'text', aliases: ['account', 'account name'] },
        { key: 'description', label: 'Description', type: 'text', aliases: ['description', 'reference', 'narrative'] },
        { key: 'debit', label: 'Debit', type: 'number', aliases: ['debit'] },
        { key: 'credit', label: 'Credit', type: 'number', aliases: ['credit'] },
      ],
      requiredKey: 'account',
      computeTotals: (rows) => ({
        totalDebit: rows.reduce((a, r) => a + (Number(r.debit) || 0), 0),
        totalCredit: rows.reduce((a, r) => a + (Number(r.credit) || 0), 0),
        rowCount: rows.length,
      }),
      renderTotals: (t) => ([
        { label: 'Transaction lines', value: t.rowCount, money: false, tone: 'navy' },
        { label: 'Total debit', value: t.totalDebit, money: true, tone: 'navy' },
        { label: 'Total credit', value: t.totalCredit, money: true, tone: 'navy' },
      ]),
    },
    trialBalance: {
      icon: 'IconCheck',
      hint: 'Reports \u2192 Trial Balance \u2192 as at month-end \u2192 Export \u2192 CSV.',
      fields: [
        { key: 'account', label: 'Account', type: 'text', aliases: ['account', 'account name'] },
        { key: 'debit', label: 'Debit', type: 'number', aliases: ['debit'] },
        { key: 'credit', label: 'Credit', type: 'number', aliases: ['credit'] },
      ],
      requiredKey: 'account',
      computeTotals: (rows) => {
        const totalDebit = rows.reduce((a, r) => a + (Number(r.debit) || 0), 0);
        const totalCredit = rows.reduce((a, r) => a + (Number(r.credit) || 0), 0);
        return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 1 };
      },
      renderTotals: (t) => ([
        { label: 'Total debit', value: t.totalDebit, money: true, tone: 'navy' },
        { label: 'Total credit', value: t.totalCredit, money: true, tone: 'navy' },
        { label: 'Control check', value: t.balanced ? 'Balanced \u2014 agrees with Xero' : 'Out of balance', money: false, tone: t.balanced ? 'success' : 'danger' },
      ]),
    },
    agedReceivables: {
      icon: 'IconArrowDown',
      hint: 'Reports \u2192 Aged Receivables Detail \u2192 as at month-end \u2192 Export \u2192 CSV.',
      fields: [
        { key: 'customer', label: 'Customer', type: 'text', aliases: ['customer', 'contact', 'name'] },
        { key: 'current', label: 'Current', type: 'number', aliases: ['current', 'not yet due'] },
        { key: 'd30', label: '1-30 days', type: 'number', aliases: ['1-30', '30 days', '1-30 days'] },
        { key: 'd60', label: '31-60 days', type: 'number', aliases: ['31-60', '60 days', '31-60 days'] },
        { key: 'd90', label: '61-90 days', type: 'number', aliases: ['61-90', '90 days', '61-90 days'] },
        { key: 'd90plus', label: '90+ days', type: 'number', aliases: ['90+', 'older', 'over 90'] },
      ],
      requiredKey: 'customer',
      computeTotals: (rows) => {
        const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const current = sum('current'), d30 = sum('d30'), d60 = sum('d60'), d90 = sum('d90'), d90plus = sum('d90plus');
        return { totalOutstanding: current + d30 + d60 + d90 + d90plus, current, d30, d60, d90, d90plus, overdueTotal: d30 + d60 + d90 + d90plus };
      },
      renderTotals: (t) => ([
        { label: 'Total outstanding', value: t.totalOutstanding, money: true, tone: 'navy' },
        { label: 'Not yet due', value: t.current, money: true, tone: 'success' },
        { label: 'Overdue (30+ days)', value: t.overdueTotal, money: true, tone: t.overdueTotal > 0 ? 'warning' : 'success' },
        { label: '90+ days overdue', value: t.d90plus, money: true, tone: t.d90plus > 0 ? 'danger' : 'success' },
      ]),
    },
    agedPayables: {
      icon: 'IconArrowUp',
      hint: 'Reports \u2192 Aged Payables Detail \u2192 as at month-end \u2192 Export \u2192 CSV.',
      fields: [
        { key: 'supplier', label: 'Supplier', type: 'text', aliases: ['supplier', 'contact', 'name'] },
        { key: 'current', label: 'Current', type: 'number', aliases: ['current', 'not yet due'] },
        { key: 'd30', label: '1-30 days', type: 'number', aliases: ['1-30', '30 days', '1-30 days'] },
        { key: 'd60', label: '31-60 days', type: 'number', aliases: ['31-60', '60 days', '31-60 days'] },
        { key: 'd90', label: '61-90 days', type: 'number', aliases: ['61-90', '90 days', '61-90 days'] },
        { key: 'd90plus', label: '90+ days', type: 'number', aliases: ['90+', 'older', 'over 90'] },
      ],
      requiredKey: 'supplier',
      computeTotals: (rows) => {
        const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const current = sum('current'), d30 = sum('d30'), d60 = sum('d60'), d90 = sum('d90'), d90plus = sum('d90plus');
        return { totalOutstanding: current + d30 + d60 + d90 + d90plus, current, d30, d60, d90, d90plus, overdueTotal: d30 + d60 + d90 + d90plus };
      },
      renderTotals: (t) => ([
        { label: 'Total owing', value: t.totalOutstanding, money: true, tone: 'navy' },
        { label: 'Not yet due', value: t.current, money: true, tone: 'navy' },
        { label: 'Overdue (30+ days)', value: t.overdueTotal, money: true, tone: t.overdueTotal > 0 ? 'warning' : 'success' },
        { label: '90+ days overdue', value: t.d90plus, money: true, tone: t.d90plus > 0 ? 'danger' : 'success' },
      ]),
    },
  };

  const ASAT_TYPES = new Set(['balanceSheet', 'trialBalance', 'agedReceivables', 'agedPayables', 'bankReconciliation']);
  function defaultPeriodFor(key) {
    const today = window.Store.today();
    if (ASAT_TYPES.has(key)) return `As at ${today.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return today.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  }

  const TONE_COLOR = { success: 'var(--success)', danger: 'var(--danger)', warning: '#B4740A', navy: 'var(--arsela-navy)' };

  function TotalsStrip({ reportKey, totals }) {
    const schema = REPORT_SCHEMAS[reportKey];
    if (!schema || !totals) return null;
    const items = schema.renderTotals(totals);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--arsela-border)' }}>
        {items.map((it, i) => (
          <div key={i}>
            <div style={{ fontSize: 10.5, color: 'var(--arsela-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{it.label}</div>
            <div className="arsela-num" style={{ fontSize: 15, fontWeight: 700, color: TONE_COLOR[it.tone] || 'var(--arsela-navy)', marginTop: 3 }}>
              {it.money ? fmtMYR(it.value, { compact: true }) : it.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---- generic import modal — schema-driven column detection +
     editable preview table, mirroring ExpensesScreen's ImportExpensesModal ---- */
  function ImportReportModal({ reportKey, onClose }) {
    const meta = window.Store.xeroReportTypes().find((t) => t.key === reportKey);
    const schema = REPORT_SCHEMAS[reportKey];
    const [period, setPeriod] = useState(defaultPeriodFor(reportKey));
    const [metaValues, setMetaValues] = useState(() => {
      const m = {};
      (schema.metaFields || []).forEach((f) => { m[f.key] = ''; });
      return m;
    });
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    const fileRef = useRef(null);

    const [parsing, setParsing] = useState(false);

    const handleFile = (file) => {
      setError(''); setFileName(file.name); setParsing(true);
      parseImportFile(file).then((parsed) => {
        setParsing(false);
        try {
          if (parsed.length < 2) { setError(`No data rows found in this ${fileKindLabel(file.name)}.`); setRows(null); return; }
          const header = parsed[0];
          const cols = detectColumns(header, schema.fields);
          if (cols[schema.requiredKey] === -1) {
            setError(`Could not find a "${schema.fields.find((f) => f.key === schema.requiredKey).label}" column in this ${fileKindLabel(file.name)}. Check you exported the right Xero report${/\.pdf$/i.test(file.name) ? ', or try a CSV/Excel export instead \u2014 PDF table layouts vary and are not always detected cleanly' : ''}.`);
            setRows(null);
            return;
          }
          const dataRows = parsed.slice(1);
          const built = dataRows.map((r) => {
            const row = {};
            schema.fields.forEach((f) => {
              const idx = cols[f.key];
              const raw = idx !== -1 ? r[idx] : '';
              if (f.type === 'number') row[f.key] = parseAmountCell(raw);
              else if (f.type === 'date') row[f.key] = parseDateCell(raw) || period;
              else if (f.type === 'select') row[f.key] = ''; // filled by guessSelect below
              else row[f.key] = String(raw || '').trim();
            });
            if (schema.guessSelect) {
              Object.keys(schema.guessSelect).forEach((k) => { row[k] = schema.guessSelect[k](row); });
            }
            const nameVal = row[schema.requiredKey] || '';
            row.include = nameVal.length > 0 && !/^total\b|^grand total|^net (profit|income)/i.test(nameVal.trim());
            return row;
          }).filter((r) => {
            const nameVal = r[schema.requiredKey] || '';
            const hasNumber = schema.fields.some((f) => f.type === 'number' && Number(r[f.key]) !== 0);
            return nameVal.length > 0 || hasNumber;
          });
          if (built.length === 0) { setError(`No usable rows found in this ${fileKindLabel(file.name)}.`); setRows(null); return; }
          setRows(built);
        } catch (e) {
          setError(`Could not read this ${fileKindLabel(file.name)}. Please check it's a genuine Xero export and try again.`);
          setRows(null);
        }
      }).catch((e) => {
        setParsing(false);
        setError(e.message || 'Could not read this file.');
        setRows(null);
      });
    };

    const onFileChange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!/\.(csv|xlsx|xls|pdf)$/i.test(f.name)) { setError('Please choose a .csv, .xlsx, .xls or .pdf file exported from Xero.'); return; }
      handleFile(f);
    };

    const updateRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const toggleAll = (include) => setRows((rs) => rs.map((r) => ({ ...r, include })));
    const includedRows = rows ? rows.filter((r) => r.include) : [];
    const liveTotals = rows ? schema.computeTotals(includedRows, metaValues) : null;

    const reset = () => { setRows(null); setFileName(''); setError(''); if (fileRef.current) fileRef.current.value = ''; };

    const doImport = () => {
      if (!rows) return;
      if (includedRows.length === 0) { window.Store.toast('Select at least one row to import', 'danger'); return; }
      setImporting(true);
      const cleanRows = includedRows.map((r) => {
        const rest = {};
        Object.keys(r).forEach((k) => { if (k !== 'include') rest[k] = r[k]; });
        return rest;
      });
      const totals = schema.computeTotals(cleanRows, metaValues);
      window.Store.addXeroImport(reportKey, { period: period.trim() || defaultPeriodFor(reportKey), fileName, meta: metaValues, rows: cleanRows, totals });
      setImporting(false);
      onClose();
    };

    return (
      <ArsModal open onClose={onClose} title={`Import ${meta.label} from Xero`} subtitle="No Xero login needed \u2014 export from Xero as CSV, Excel or PDF and upload it here" width={rows ? 820 : 480}
        footer={rows ? (
          <>
            <ArsButton variant="secondary" onClick={reset}>Choose a different file</ArsButton>
            <ArsButton onClick={doImport} disabled={importing || includedRows.length === 0}>
              {importing ? 'Importing\u2026' : `Import ${includedRows.length} row${includedRows.length === 1 ? '' : 's'}`}
            </ArsButton>
          </>
        ) : (
          <ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton>
        )}>
        {!rows ? (
          <>
            <div style={{ background: '#EEF3FF', border: '1px solid #D6E1FF', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12.5, color: 'var(--arsela-navy)', lineHeight: 1.5 }}>
              <b>How to export from Xero:</b> {schema.hint}
            </div>
            <ArsField label="Period / as-at label" hint="Shown on the import card and in the Director's Report">
              <input value={period} onChange={(e) => setPeriod(e.target.value)} style={arsFieldInputStyle}/>
            </ArsField>
            {(schema.metaFields || []).map((f) => (
              <ArsField key={f.key} label={f.label}>
                <input type={f.type === 'number' ? 'number' : 'text'} value={metaValues[f.key]} onChange={(e) => setMetaValues((m) => ({ ...m, [f.key]: e.target.value }))} style={arsFieldInputStyle}/>
              </ArsField>
            ))}
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={onFileChange} style={{ display: 'none' }}/>
            <div style={{ border: '1.5px dashed var(--arsela-border-strong)', borderRadius: 8, padding: 24, textAlign: 'center', background: '#FAFBFD', cursor: parsing ? 'default' : 'pointer', marginTop: 6, opacity: parsing ? 0.7 : 1 }} onClick={() => !parsing && fileRef.current && fileRef.current.click()}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--arsela-blue-50)', color: 'var(--arsela-blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <IconFile size={20}/>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--arsela-navy)' }}>{parsing ? 'Reading file\u2026' : `Click to attach ${fileName || 'Xero export'}`}</div>
              <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 3 }}>CSV, Excel (.xlsx/.xls) or PDF \u2014 {meta.label}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--arsela-text-muted)', marginTop: 8, lineHeight: 1.4 }}>
              CSV/Excel give the most reliable column detection. PDF works for simple text-based Xero exports \u2014 if columns aren\u2019t detected correctly, try a CSV/Excel export of the same report instead.
            </div>
            {error && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--arsela-danger)', fontWeight: 600 }}>{error}</div>}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 12.5, color: 'var(--arsela-text-muted)' }}>
                <b style={{ color: 'var(--arsela-navy)' }}>{fileName}</b> \u2014 {rows.length} row{rows.length === 1 ? '' : 's'} found ({period})
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => toggleAll(true)} style={{ border: 'none', background: 'transparent', color: 'var(--arsela-blue)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Select all</button>
                <button onClick={() => toggleAll(false)} style={{ border: 'none', background: 'transparent', color: 'var(--arsela-text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>
              </div>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--arsela-border)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFBFD', borderBottom: '1px solid var(--arsela-border)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px 10px' }}></th>
                    {schema.fields.map((f) => (
                      <th key={f.key} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10.5, fontWeight: 700, color: 'var(--arsela-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--arsela-border)' : 'none', opacity: r.include ? 1 : 0.45 }}>
                      <td style={{ padding: '6px 10px' }}>
                        <input type="checkbox" checked={r.include} onChange={(e) => updateRow(i, { include: e.target.checked })}/>
                      </td>
                      {schema.fields.map((f) => (
                        <td key={f.key} style={{ padding: '6px 10px' }}>
                          {f.type === 'select' ? (
                            <select value={r[f.key]} onChange={(e) => updateRow(i, { [f.key]: e.target.value })} style={{ border: '1px solid var(--arsela-border)', borderRadius: 6, padding: '4px 6px', fontSize: 12, fontFamily: 'inherit', background: '#fff' }}>
                              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.type === 'number' ? (
                            <input type="number" value={r[f.key]} onChange={(e) => updateRow(i, { [f.key]: Number(e.target.value) || 0 })} style={{ width: 90, border: '1px solid var(--arsela-border)', borderRadius: 6, padding: '4px 6px', fontSize: 12, fontFamily: 'inherit' }}/>
                          ) : (
                            <input value={r[f.key]} onChange={(e) => updateRow(i, { [f.key]: e.target.value })} style={{ width: f.key === schema.requiredKey ? 160 : 120, border: '1px solid var(--arsela-border)', borderRadius: 6, padding: '4px 6px', fontSize: 12, fontFamily: 'inherit' }}/>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {liveTotals && <TotalsStrip reportKey={reportKey} totals={liveTotals}/>}
          </>
        )}
      </ArsModal>
    );
  }

  /* ---- history/detail modal — lists all snapshots for a report
     type, with the latest one's totals + a delete action per row ---- */
  function ReportHistoryModal({ reportKey, onClose }) {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);
    const meta = window.Store.xeroReportTypes().find((t) => t.key === reportKey);
    const schema = REPORT_SCHEMAS[reportKey];
    const snapshots = s[reportKey] || [];
    const [expandedId, setExpandedId] = useState(snapshots[0]?.id || null);

    return (
      <ArsModal open onClose={onClose} title={`${meta.label} \u2014 import history`} subtitle={`${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'} imported`} width={760}
        footer={<ArsButton variant="secondary" onClick={onClose}>Close</ArsButton>}>
        {snapshots.length === 0 ? (
          <ArsEmpty icon={<IconFile size={22}/>} title="No imports yet" body="Use Import from Xero to bring in a CSV export of this report."/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {snapshots.map((snap) => {
              const isOpen = expandedId === snap.id;
              return (
                <div key={snap.id} style={{ border: '1px solid var(--arsela-border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div onClick={() => setExpandedId(isOpen ? null : snap.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#FAFBFD', cursor: 'pointer' }}>
                    <IconChevronDown size={13} style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--arsela-text-muted)', flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--arsela-navy)' }}>{snap.period}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)' }}>{snap.fileName} \u2014 imported {new Date(snap.importedAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })} \u2014 {snap.rows.length} rows</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remove this ${meta.label} snapshot (${snap.period})? This cannot be undone.`)) window.Store.deleteXeroImport(reportKey, snap.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-danger)', display: 'flex', flexShrink: 0 }}><IconTrash size={14}/></button>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '12px 14px' }}>
                      <TotalsStrip reportKey={reportKey} totals={snap.totals}/>
                      <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 14, border: '1px solid var(--arsela-border)', borderRadius: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#fff', borderBottom: '1px solid var(--arsela-border)' }}>
                              {schema.fields.map((f) => <th key={f.key} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--arsela-text-muted)', textTransform: 'uppercase' }}>{f.label}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {snap.rows.map((r, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--arsela-border)' }}>
                                {schema.fields.map((f) => (
                                  <td key={f.key} style={{ padding: '5px 10px', fontSize: 12, color: 'var(--arsela-navy)' }} className={f.type === 'number' ? 'arsela-num' : ''}>
                                    {f.type === 'number' ? fmtMYR(r[f.key], { compact: true }) : r[f.key]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ArsModal>
    );
  }

  /* ---- one card per report type ---- */
  function ReportCard({ reportKey, onImport, onView }) {
    const meta = window.Store.xeroReportTypes().find((t) => t.key === reportKey);
    const schema = REPORT_SCHEMAS[reportKey];
    const latest = window.Store.latestXeroImport(reportKey);
    const IconComp = window[schema.icon] || IconFile;
    return (
      <ArsCard style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--arsela-blue-50)', color: 'var(--arsela-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconComp size={18}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)' }}>{meta.label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{meta.settings}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--arsela-text-muted)', lineHeight: 1.4 }}>{meta.purpose}</div>
        <div style={{ paddingTop: 10, borderTop: '1px solid var(--arsela-border)' }}>
          {latest ? (
            <ArsBadge tone="success" size="sm" dot>Last import: {latest.period}</ArsBadge>
          ) : (
            <ArsBadge tone="neutral" size="sm">Not yet imported</ArsBadge>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <ArsButton variant="secondary" size="sm" full onClick={() => onView(reportKey)} disabled={!latest}>View history</ArsButton>
          <ArsButton variant="primary" size="sm" full icon={<IconDownload size={13}/>} onClick={() => onImport(reportKey)}>Import</ArsButton>
        </div>
      </ArsCard>
    );
  }

  /* ---- supporting documents outside Xero (metadata only) ---- */
  const DOC_CATEGORIES = ['Bank Statement', 'Facility / Loan Agreement', 'Board Resolution', 'Audit Letter', 'Insurance Policy', 'Contract', 'Other'];
  function AddDocumentModal({ onClose }) {
    const [form, setForm] = useState({ name: '', category: DOC_CATEGORIES[0], date: window.Store.today().toISOString().slice(0, 10), note: '' });
    const fileRef = useRef(null);
    const onFilePick = (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) setForm((s) => ({ ...s, name: s.name || f.name }));
    };
    const submit = () => {
      if (!form.name.trim()) { window.Store.toast('Document name is required', 'danger'); return; }
      window.Store.addSupportingDocument({ name: form.name.trim(), category: form.category, date: form.date, note: form.note.trim() });
      onClose();
    };
    return (
      <ArsModal open onClose={onClose} title="Log a supporting document" subtitle="Outside Xero \u2014 metadata only (name, category, date, note)"
        footer={<><ArsButton variant="secondary" onClick={onClose}>Cancel</ArsButton><ArsButton onClick={submit}>Add document</ArsButton></>}>
        <div style={{ background: '#FFF8E6', border: '1px solid #F5E0A3', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: '#7A5B0A', lineHeight: 1.5 }}>
          Coplanistra is a static, backend-free app \u2014 it can log that a document exists (name, category, date, note) but cannot store the raw file itself. Keep the actual file in your usual shared drive and reference it here.
        </div>
        <ArsField label="Document name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Westpac facility agreement \u2014 renewal 2026" style={arsFieldInputStyle}/>
        </ArsField>
        <input ref={fileRef} type="file" onChange={onFilePick} style={{ display: 'none' }}/>
        <button onClick={() => fileRef.current && fileRef.current.click()} style={{ border: '1px dashed var(--arsela-border-strong)', borderRadius: 8, padding: '8px 12px', background: '#FAFBFD', fontSize: 12, color: 'var(--arsela-text-muted)', cursor: 'pointer', width: '100%', textAlign: 'left', marginBottom: 12, fontFamily: 'inherit' }}>
          <IconFile size={13} style={{ marginRight: 6, verticalAlign: 'text-bottom' }}/>Pick a file just to auto-fill the name (not uploaded/stored)
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><ArsField label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={arsFieldInputStyle}>
              {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </ArsField></div>
          <div style={{ flex: 1 }}><ArsField label="Date">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={arsFieldInputStyle}/>
          </ArsField></div>
        </div>
        <ArsField label="Note" hint="Optional \u2014 where it's actually kept, who to ask, key terms, etc.">
          <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} style={{ ...arsFieldInputStyle, height: 'auto', paddingTop: 8, paddingBottom: 8, resize: 'vertical' }}/>
        </ArsField>
      </ArsModal>
    );
  }

  function SupportingDocumentsSection({ s }) {
    const [addOpen, setAddOpen] = useState(false);
    const docs = s.supportingDocuments || [];
    return (
      <ArsCard>
        <ArsSectionHeader title="Supporting documents (outside Xero)" subtitle="Bank statements, facility agreements, board resolutions, audit letters, etc \u2014 metadata register only" action={<ArsButton size="sm" icon={<IconPlus size={14}/>} onClick={() => setAddOpen(true)}>Log document</ArsButton>}/>
        {docs.length === 0 ? (
          <ArsEmpty icon={<IconFile size={20}/>} title="No documents logged yet" body="Log board resolutions, loan agreements, bank statements or other non-Xero documents your director's report should reference."/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--arsela-border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: '#F1F3F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--arsela-text-muted)' }}><IconFile size={15}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--arsela-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--arsela-text-muted)', marginTop: 2 }}>{d.category} \u2022 {d.date} {d.addedBy ? `\u2022 logged by ${d.addedBy}` : ''}{d.note ? ` \u2014 ${d.note}` : ''}</div>
                </div>
                <button onClick={() => { if (confirm(`Remove "${d.name}" from the register?`)) window.Store.deleteSupportingDocument(d.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--arsela-danger)', display: 'flex', flexShrink: 0 }}><IconTrash size={14}/></button>
              </div>
            ))}
          </div>
        )}
        {addOpen && <AddDocumentModal onClose={() => setAddOpen(false)}/>}
      </ArsCard>
    );
  }

  function DataImportsScreen() {
    const [s, setS] = useState(window.Store.getState());
    useEffect(() => window.Store.subscribe(setS), []);
    const [importKey, setImportKey] = useState(null);
    const [historyKey, setHistoryKey] = useState(null);

    const reportTypes = window.Store.xeroReportTypes();
    const importedCount = reportTypes.filter((t) => window.Store.latestXeroImport(t.key)).length;

    return (
      <AppFrame
        active="Data Imports"
        title="Data Imports"
        breadcrumb={['Arsela Resources', 'Financials', 'Data Imports']}
      >
        <div className="coplan-page">
          <div style={{ background: '#EEF3FF', border: '1px solid #D6E1FF', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 9, background: '#fff', color: 'var(--arsela-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconDownload size={19}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--arsela-navy)' }}>{importedCount} of {reportTypes.length} Xero report types imported</div>
              <div style={{ fontSize: 12.5, color: 'var(--arsela-text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                No Xero login is stored in Coplanistra \u2014 export each report from Xero as a CSV and upload it below. Each upload is kept as a dated snapshot, so you can bring in a fresh month-end pack every reporting cycle without losing prior history.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            {reportTypes.map((t) => (
              <ReportCard key={t.key} reportKey={t.key} onImport={setImportKey} onView={setHistoryKey}/>
            ))}
          </div>

          <SupportingDocumentsSection s={s}/>
        </div>

        {importKey && <ImportReportModal reportKey={importKey} onClose={() => setImportKey(null)}/>}
        {historyKey && <ReportHistoryModal reportKey={historyKey} onClose={() => setHistoryKey(null)}/>}
      </AppFrame>
    );
  }

  Object.assign(window, { DataImportsScreen, REPORT_SCHEMAS, ImportReportModal, TotalsStrip, defaultPeriodFor });
})();
