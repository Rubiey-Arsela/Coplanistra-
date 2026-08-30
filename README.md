# Coplanistra — Budget & Plan

A fully interactive corporate budgeting, planning, and financial-oversight web application built from a Genspark Design handoff. Client-side React SPA (no build-time bundler needed for the app code) served from a lightweight Hono backend on Cloudflare Pages.

## Project Overview
- **Name**: Coplanistra — Budget & Plan
- **Goal**: Give a Malaysian conglomerate (Acme Holdings, styled after Al Bukhary Group) a role-aware planning, expense-approval, and financial-analytics workspace — budgets, approvals, expenses, CAPEX, cash flow, KPI performance, reporting, an AI copilot, and team/access administration, all wired to a single shared client-side data store so every screen stays in sync.
- **Source of design**: Genspark Design "Build it" handoff (`designer2-bf393d34-4616-4a79-8547-26480b35ab20`), adapted from static JSX screens into a fully wired, stateful React SPA.

## Live production URL
- **Production**: https://0aa68d99.coplanistra.pages.dev (latest deploy — Executive Summary A$0 bug fixed + Dashboard Xero sync; see session update immediately below. Also aliased at https://coplanistra.pages.dev)
- **GitHub**: https://github.com/Rubiey-Arsela/Coplanistra-
- **Deployed to**: user's own Cloudflare account (BYOK), via `wrangler pages deploy`

## Session update (2026-08-30) — Director's Report Executive Summary A$0 bug fixed + Dashboard now has full Xero-sync awareness
**User complaint (verbatim, with screenshot of production Director's Report)**: *"make sure dashboard and this director reports is updated and sync based on my xero import."*

**Root cause**: the previous session's fix (2026-08-26, below) correctly wired the Q1/Q2/Q3 and "Xero control checks" sections to real Xero imports — but the **Executive Summary block at the very top** of the same report (Xero Actuals, Open Commitments, Actual + Commitments, Forecast Final Cost, Actual vs Budget-to-Date) was still 100% derived from the internal **Budgets module** (`s.budgets`), which is empty by default ("start fresh"). A client who imports real Xero reports but never manually creates a Budget entry saw a contradictory report: real figures a few hundred pixels down, but a flat "A$ 0" at the top — the exact thing visible in the user's screenshot. Separately, **Dashboard had ZERO Xero-import awareness at all** (confirmed via grep — no references to the Xero-sync API anywhere in that file), and one of its stat cards ("Budget-to-Date Variance") was a **hardcoded fabricated placeholder** (`fmtMYR(2,800,000)`, fake "▲1.8% over" delta) that never reflected any real data, budget or Xero.

**Fixes**:
- **Director's Report Executive Summary** (`ReportsScreen.js`): each of the 5 top-line KPIs now prefers the Budgets-module figure when budgets exist (unchanged behaviour), and falls back to the equivalent **real imported Xero figure** when no budgets exist — Xero Actuals ← P&L Cost of Sales + Expenses; Open Commitments ← Aged Payables outstanding; Actual + Commitments ← sum of the two; Forecast Final Cost ← run-rate projection from YTD Xero actuals. Each fallback is explicitly labelled with its source (e.g. "Total expenses YTD per Xero P&L"). "Actual vs budget-to-date" has no honest Xero-only substitute (there is no plan to compare against) so it now shows a clear "No plan to compare" empty state instead of a misleading A$0.
- **Reconciliation-status contradiction** (both `ReportsScreen.js` and `DashboardScreen.js`): previously driven solely by the Budgets-module reconciliation flag, so the app could claim "All reconciled" while a real imported Bank Reconciliation report showed unreconciled bank items. Now a combined signal (budgets pending + real Bank Reconciliation unreconciled count), with a breakdown label (e.g. "2 budget line(s) + 3 bank item(s) pending").
- **Dashboard Xero-sync banner** (new): mirrors the Director's Report's banner — "N of 10 Xero report types imported", links to Data Imports, plus a shortcut to the full Director's Report.
- **Dashboard "Xero snapshot" card** (new): 4 tiles — Revenue (YTD) from Profit & Loss, Bank balance from Bank Summary, Solvency from Balance Sheet, Trial Balance status — each with an honest "Not imported" fallback, so a director scanning only the Dashboard still sees real Xero figures.
- **Fabricated "Budget-to-Date Variance" stat card fixed**: replaced the hardcoded A$2.8M/1.8% placeholder with a real time-prorated calculation (`totalAnnualPlan × % of FY elapsed` vs reconciled Xero actuals) — same basis used by `SpentVsBudgetToDate` and the Director's Report.

**Verification**: `npm run build` — clean build, no errors. Local Playwright smoke test on `/reports` with zero console errors. Deployed to production and confirmed the new deployment responds (HTTP 200).

**Not in this session's scope** (flagged for follow-up): whether Dashboard's remaining 3 budgets-only finance stat cards ("Total Annual Plan", "Xero Actuals (Reconciled)", "Actual + Commitments") should also blend in Xero fallbacks, or are acceptable as legitimate "budget tracking" figures distinct from the new "Xero snapshot" card — no decision made yet, left as-is this session.

## Session update (2026-08-26) — Director's Report now syncs ALL 10 Xero report types, not just 5
**User complaint (verbatim)**: *"WHY DIRECTOR REPORT IS NOT REFLECTED OF WHAT I HAVE UPLOADED. make sure everything is link and sync correctly. when I imported the data from xero, make sure it is recorded in all menu/panel. sync automatically please and make sure calculation is correct."*

**Root cause**: `ReportsScreen.js`'s Director's Report only ever read 5 of the 10 Xero report types (Profit & Loss, Balance Sheet, Aged Receivables, Aged Payables, Cash Flow Actuals) — wired before the other 5 types (Account Transactions, Bank Summary, Bank Reconciliation, General Ledger, Trial Balance) were added in a later session. Those 5 newer types imported fine and were visible in the Data Imports hub, but had **no downstream consumer anywhere else** — so uploading them never changed the Director's Report.

**Fix**:
- Wired all 5 missing report types into the Director's Report via the existing generic `window.Store.latestXeroImport()` / `xeroReportTypes()` API — no hardcoded "10", so it stays correct if more Xero report types are added later.
- Added a new **"Xero sync" completeness banner** at the top of the report: "N of 10 Xero report types imported and reflected below", listing exactly which types are still missing, clickable through to Data Imports.
- Added a new **"Xero control checks"** card with 4 tiles: Trial Balance (balanced/debit/credit), Bank Reconciliation (unreconciled count/difference), Bank Summary (closing balance/cash received/spent), and Ledger activity (from General Ledger or Account Transactions, whichever was imported).
- **Calculation fix, not just display**: "Enough to cover our expenses?" (Q2) previously always used the budget-derived cash-flow forecast as "cash on hand," even when a real Bank Summary was imported. It now uses the **real Xero bank closing balance** whenever a Bank Summary has been imported, falling back to the forecast only when it hasn't — this changes the actual coverage-ratio math, not just the label.
- Extended Data Limitations messaging and both CSV and PDF exports to include all the new figures and the missing-types list, so exports stay in sync with the on-screen report.

**Verification** (three layers, all passed):
1. `npm run build` — clean build, no errors.
2. Live Playwright run importing 7 of the 10 real Xero files in one session, then inspecting the Director's Report: banner correctly read "7 of 10 Xero report types imported", all 4 new control-check tiles showed correct figures, Q2 correctly showed the real Bank Summary balance ("Cash on hand (Xero bank balance): A$10.0K"), zero console errors. Confirmed on both localhost and the redeployed production URL.
3. CSV/PDF export re-verified in both empty-state (0 of 10, all types listed as missing) and populated-state (correct Trial Balance debit/credit, Bank Summary closing balance) — exports match on-screen figures exactly.

**Not in this session's scope** (flagged for follow-up): Dashboard and a few other screens still have no Xero-import awareness at all — only Reports/Reconciliations/Cash Flow were audited and fixed this session, since the Director's Report was the user's explicit complaint.

## Session update (2026-08-25, part 2) — Full 10-report-type Xero import suite: Account Transactions & Bank Summary added, Bank Reconciliation/General Ledger/Trial Balance reworked to match real Xero export layouts
The client uploaded the **full real Xero export suite** — all 8 originally-scoped report types, each in both PDF and Excel format (Account Transactions, Bank Reconciliation, Bank Summary, General Ledger Detail, Profit and Loss, Reconciliation Reports pack, Trial Balance, plus Balance Sheet already fixed) — with the instruction: *"I want to be able to upload all these... make sure I can upload, all figures reflected correctly and calculated correctly."* Inspecting these real files (via openpyxl cached-value dumps) showed several report types had a materially different real-world layout than originally coded, and two report types (Account Transactions, Bank Summary) weren't supported at all. Fixed:

- **NEW: Account Transactions** — every transaction posted per account, exported by Xero with the account name as a standalone section-header row above its transactions (not a column). Added a `fromSection: true` field flag so the account name is picked up from the nearest preceding section header rather than a column; "Opening Balance"/"Closing Balance"/"Total {account}" summary rows are correctly excluded (they carry no Description, which is the required field for row inclusion).
- **NEW: Bank Summary** — flat one-row-per-bank-account table (Opening/Closing balance, Cash received/spent); the stale "Total" row (Xero leaves cached formula totals in the export that go stale before the actual report period) is excluded automatically.
- **REWORKED: Bank Reconciliation Report Pack** — the real Xero export has 3 different sections stacked on one sheet (Totals Summary, Plus Unreconciled Statement Lines, Statement Balances recap) that would all look like valid description+amount rows if imported naively. Added a `sectionFilter` schema hook so only the real unreconciled transaction lines are pre-selected for import (the other two sections are still shown, unchecked, for transparency — the user can tick them back on if they disagree). Also added an `extractMeta` hook that scans the raw sheet for the "Balance in Xero" / "Statement balance (calculated)" labelled rows and auto-fills those two figures — previously the user had to type them in by hand.
- **REWORKED: General Ledger Detail** — same account-header-grouping structure as Account Transactions (via the same `fromSection` mechanism), plus a "Net movement" per-account summary row that is correctly excluded from the imported transaction lines (its value is still recoverable via the computed per-account breakdown).
- **REWORKED: Trial Balance** — added Account Code and Account Type columns; the prior-period comparison column is labelled with a literal, period-specific date in Xero's export (e.g. "30 June 2026") rather than a generic header, so it has no fixed alias and instead falls back to the existing fallback-column-detection mechanism — confirmed working for two different real files with different prior-period dates.
- `finalizeRow()` (the shared per-row inclusion logic in the import modal) now takes the current section name as a second argument, feeding the new `sectionFilter` hook.

**Verification** (three layers, all passed):
1. **Node.js VM simulation** — loaded the real production `primitives.js`/`DataImportsScreen.js` source into a sandboxed Node context (JSX-transpiled via esbuild) and re-ran the exact row-building logic against openpyxl-dumped real cached cell values from all 7 relevant Excel files (both standalone exports and the combined 7-sheet Reconciliation_Reports pack) — 13/13 checks passed, all computed totals matched Xero's real underlying figures exactly (e.g. Bank Reconciliation: Xero balance A$30,816.54 / statement balance A$13,782.78 / 3 unreconciled items totalling -A$17,033.76; Trial Balance: total debit = total credit = A$226,710.43, balanced).
2. **Live browser upload test** (Playwright) — logged into the real running app, uploaded all 5 new/reworked report types' actual `.xlsx` files through the real Data Imports hub UI end-to-end (file picker → preview table → totals strip → confirm import), with zero console errors and every on-screen total matching the simulation exactly (e.g. Account Transactions: 25 of 32 rows included, 10 accounts touched, total debit = total credit = A$98.4K; Bank Reconciliation: 3 of 14 rows pre-checked, the other 11 shown unchecked for transparency).
3. **Downstream screens** — after importing, the Reconciliation screen correctly showed "Bank Reconciliation Report Pack (Westpac #2027) — Last imported: As at 22 July 2026 · 3 unreconciled" and "General Ledger Detail — Last imported: July 2026 · 25 lines", confirming `ReconciliationScreen.js`'s consumption of `unreconciledCount` and `rows.length` was undisturbed by the schema rework.

**Still open / deferred** (not part of the client's original 8-report-type ask, flagged for a future session): the PDF versions of Account Transactions, General Ledger Detail and Reconciliation Reports have multi-line-wrapped cell text and repeated page headers/footers that the current PDF-parsing branch doesn't yet merge/filter — Excel is the recommended format for these three report types until that's built. The `Reconciliation_Reports.xlsx` pack's two bonus sheets (Fixed Asset Reconciliation, Journal Report) aren't mapped to any import schema yet — not one of the originally-named 8 report types, so left out pending client confirmation they're wanted.

**Files changed**: `public/static/js/screens/DataImportsScreen.js` only (`store.js` and `primitives.js` already had the supporting infrastructure — 10-entry `XERO_REPORT_TYPES`, `fromSection`-aware row mapping, `sheetHints`/`pickSheetName`, freeform section detection, dash-as-zero handling — from earlier work in this same overall task).

## Session update (2026-08-25) — Real-file bug pass: Balance Sheet Excel/PDF imports now show correct figures AND correct totals
Following the previous title-block fix, the client uploaded their **actual** Xero Balance Sheet exports (`ARSELA_RESOURCES_PTY_LTD_-_Balance_Sheet.xlsx`/`.pdf`) and reported the Excel totals all showed A$0 despite rows being detected correctly, and the PDF errored outright with *"Could not find a 'Account' column."* Direct inspection of these real files (not synthetic test fixtures) uncovered **four separate bugs**, all now fixed and verified against the real files:

1. **Amount column not detected when Xero labels it with a literal date** (e.g. "31 Jul 2026" instead of a generic header like "Balance") — Balance Sheet and other point-in-time reports label their one figure column with the report date, which matched no alias. Fixed with `detectColumnsWithFallback()` (`primitives.js`): any unmatched *numeric* field claims the next unclaimed column left-to-right.
2. **PDF Balance Sheet export has no literal header row at all** — just label + trailing numeric cells per line. Fixed with `classifyHeaderlessRow()` / `buildHeaderlessRows()` (`primitives.js`): reconstructs rows directly from line shape when no header row can be found (40%-of-rows / ≥2-rows plausibility threshold before falling back to this mode).
3. **Accounts misclassified as Asset/Liability/Equity** — the importer guessed classification from keywords in the account name (e.g. "loan"), which wrongly classified "Loan to Arus Acres PL" (an asset/receivable) as a Liability, and silently defaulted ambiguous accounts (e.g. "GST", "Current Year Earnings") to Asset. Xero's real export instead groups accounts under literal section-header rows ("Assets" / "Liabilities" / "Equity"). Fixed with `deriveSectionOverrides()` (`primitives.js`), which reads the **raw** pre-column-mapped rows for these standalone header rows and carries the correct section forward onto every account beneath it, for both the Excel and headerless-PDF paths. Verified against the real files' own printed subtotals: Total Assets A$35,295.54 / Total Liabilities A$261,871.20 / Total Equity -A$226,575.66 — now matched exactly.
4. **Balance Sheet totals shown ~3× too small on screen** (e.g. "A$11.5K" instead of "A$35.3K") — the display formatter (`fmtMYR`) always converts its input through the app's internal MYR-base-currency exchange rate before showing it, which is correct for the app's own budget/expense figures but wrong for **Xero-imported report figures**, which are already denominated in the entity's real reporting currency (AUD) and must not be converted again. Fixed by adding a dedicated `fmtAUD()` formatter (`primitives.js`) for Xero-imported totals/rows that renders the figure as-is with the "A$" symbol, and switching the Data Imports totals strip and import-history table (`DataImportsScreen.js`) to use it instead of `fmtMYR`.

**Verification**: each fix was validated three ways — (a) standalone Node.js simulation against the client's actual uploaded files; (b) a live browser-context probe calling the app's real served `parseImportFile`/`deriveSectionOverrides`/`computeTotals` functions directly; (c) a full live-browser Playwright test through the real upload modal for **both** the Excel and PDF files, confirming correct row labels/figures, correct classification (e.g. "Loan to Arus Acres PL" now shows as Asset), correct totals (A$35.3K / A$261.9K / -A$226.6K, matching Xero's own subtotals), a correct "Current ratio" tile (0.13x), and zero console errors — for the live upload preview, the confirmed/saved import, and the import-history modal. The client's real financial documents were used only for local testing and were never committed to git/GitHub (see `.gitignore`).

## Session update (2026-08-24, part 2) — Fix: Excel/PDF Xero exports with a title block above the header row now import correctly
Bug reported by the client: uploading a real Xero **Excel** or **PDF** export failed with *"Could not find a 'Account' column in this Excel file."* even though the report clearly had an Account column. Root cause: Xero's CSV export is a bare data table (header on row 1), but its **Excel and PDF exports include a title block above the table** — company name, report name, date range, a blank spacer row — so the real header row is several rows down. The importer assumed row 1 was always the header, which is correct for CSV but wrong for Excel/PDF.

**Fix**: added `findHeaderRowIndex()` (`public/static/js/primitives.js`) which scans the first 25 rows of the parsed file and picks whichever row best matches the report's expected column names (e.g. Account, Classification, Date, Gross), instead of assuming row 1. Wired into both `DataImportsScreen.js` (all 8 report types) and `ExpensesScreen.js`'s "Import from Xero" modal. CSV behaviour is unchanged (header is still found on row 1 as before); Excel/PDF now correctly skip past any title block to find the real header.

**Verification**: built realistic Excel and PDF fixtures with a 4-line Xero-style title block ("Arsela Resources Sdn Bhd" / "Profit and Loss" / "For the month ended..." / blank) above the Account/Classification/... header, then ran scripted Playwright browser tests uploading them through the live app — both now correctly report "4 rows found" and preview identical, correct data (previously this failed with the "Could not find a column" error). Also verified the same fix on the Expenses screen's Xero import with a title-blocked Excel transactions export ("3 rows found"). Zero console errors on `/dataimports` and `/expenses` after the fix.

## Session update (2026-08-24) — Xero imports now accept CSV, Excel and PDF (not just CSV)
Client request: *"make sure data imports from xero allow us to import not only csv, but also pdf and excel format. apply for all data import."* Applied to **every** Xero-import entry point in the app:
- **Data Imports hub** (`/dataimports`) — all 8 Xero report types (Profit & Loss, Balance Sheet, Statement of Cash Flows, Bank Reconciliation Report Pack, General Ledger Detail, Trial Balance, Aged Receivables Detail, Aged Payables Detail) via the shared Import modal.
- **Expenses screen** ("Import from Xero" — transactions / expense claims / bills).
- Not changed (by design): the Supporting Documents "outside Xero" register file picker (metadata-only, doesn't parse tabular data), and Reconciliation/Cash Flow screens (they only link out to `/dataimports`, no file logic of their own).

**How it works**: a new shared `parseImportFile(file)` helper (`public/static/js/primitives.js`) normalises CSV, Excel (`.xlsx`/`.xls`, via SheetJS/`xlsx` loaded from CDN), and PDF (via `pdf.js`/`pdfjs-dist` loaded from CDN) into the exact same row-array shape the app's existing column-detection/preview/totals logic already expected — so no downstream report logic had to change, only the file-reading layer. PDF parsing reconstructs rows/columns from text position (Y-clustering + X-gap column splitting): a best-effort heuristic that works well for simple text-based Xero exports but not for scanned/image-only PDFs (which show a clear error asking for a CSV/Excel export instead). CSV and Excel remain the most reliable formats; PDF is a convenience fallback.

**Verification**: (1) a standalone Node.js script re-ran the identical parsing algorithm against hand-built CSV/XLSX/PDF fixtures of the same Profit & Loss data and confirmed byte-identical header/row extraction across all three formats; (2) a scripted Playwright browser test logged in, uploaded each of the three file formats through the real running app, and confirmed the Import modal correctly previewed "4 rows found" with matching classifications and totals for all three, with zero console errors; screenshots confirmed the PDF- and Excel-sourced preview tables were visually identical.

## Session update (2026-08-19, part 6) — Xero multi-report Data Imports hub (8 report types) + Director's Report "three questions" upgrade
Client request: *"make sure all panel include import from Xero"* for 8 named Xero report types, support for logging documents outside Xero, and a Director's Report that explicitly answers **where is the money coming from, do we have enough to cover our expenses, and are we solvent**. Full scope approved by the client ("yes for all") and delivered:
- **NEW: Data Imports hub** (`/dataimports`, Finance Manager / Administrator, sidebar between CAPEX/Reconciliation-area and Cash Flow) — one screen to import all 8 requested Xero reports, each as its own dated-snapshot history:
  1. Profit and Loss — YTD revenue/expense totals + **revenue-by-source breakdown**
  2. Balance Sheet — total assets/liabilities/equity, working capital, current ratio
  3. Statement of Cash Flows (Direct) / Cash Summary — operating/investing/financing actuals
  4. Bank Reconciliation Report Pack (Westpac Account #2077) — unreconciled item count/value
  5. General Ledger Detail — full transaction listing
  6. Trial Balance — debit/credit balances
  7. Aged Receivables Detail — current/30/60/90/90+ ageing buckets + total outstanding
  8. Aged Payables Detail — current/30/60/90/90+ ageing buckets + total outstanding
  
  Each report type has its own CSV column auto-detection (with aliases, e.g. "Amount"/"Gross"/"Total"), an editable preview before confirming, and a **history view** to see/compare prior snapshots. This is the same 100%-client-side CSV pattern as the existing Expenses "Import from Xero" — **no Xero OAuth/API connection required**, works with any CSV exported from Xero's report screens.
  
  - **Documents outside Xero**: a lightweight **Supporting Documents register** on the same screen — log name, category (e.g. contract, invoice, bank statement, board minute, other), date, note and who added it. This is a **metadata-only log, not a file store**: per the approved scope, raw file bytes are not uploaded/persisted (no Cloudflare R2 binding yet) — it exists so the team has one place to record *that* a supporting document exists and where to find it, pending a future R2-backed upload.
- **Director's Report — "the three questions this report must answer"**: a new section on the Director's Report (Reports screen) directly answers, using **real imported Xero figures when available**:
  - **Q1 — Where is the money coming from?** Revenue-by-source breakdown from the latest imported Profit & Loss, with YTD total.
  - **Q2 — Do we have enough to cover our expenses?** Computed from Aged Receivables + Aged Payables + projected cash position when those reports have been imported (owed-to-us + cash vs owed-by-us); **honestly falls back** to the existing cash-runway signal (`minCash > 0`) when no AR/AP has been imported yet, and to a clear "Not answerable yet — import Aged Receivables/Payables" empty state with a direct link to Data Imports when neither is available.
  - **Q3 — Are we solvent?** Computed from the latest imported Balance Sheet (assets ≥ liabilities), showing total assets, total liabilities, working capital and current ratio; falls back to an honest "Not answerable yet — import a Balance Sheet" empty state (linking to Data Imports) rather than fabricating a solvency verdict from unrelated data.
  - All three cards link through to Data Imports (or Cash Flow for the Q2 fallback). **CSV and PDF exports updated** to include all three answers as new export sections.
- **Contextual "Import from Xero" shortcuts** added directly on the two screens most tied to specific report types, so users don't have to already know the Data Imports hub exists:
  - **Reconciliation** screen — shortcut card showing Bank Reconciliation Report Pack (Westpac #2077) and General Ledger Detail import status (latest period + count, or "Not yet imported"), with a one-click "Import from Xero" button to `/dataimports`.
  - **Cash Flow** screen — shortcut card showing Statement of Cash Flows (Direct)/Cash Summary import status, noting the chart below remains budget-derived until actuals are imported.
- Verified: `npm run build` (success), Playwright console-error sweep on `/dataimports`, `/reports`, `/reconciliations`, `/cashflow` — zero errors on any route; plus a standalone Node.js simulation of the Store data-flow (`addXeroImport` → `latestXeroImport` → totals consumed by the Director's Report) confirming the shapes match end-to-end.
- Committed (`743951a` for the Data Imports hub + Store schema; Director's Report/contextual-shortcuts follow-up commit on top) and redeployed to Cloudflare Pages (BYOK).

## Session update (2026-08-19, part 5) — "Start fresh": all demo/seed financial data removed, every screen now Store-derived with empty states
Per the client's request to remove all placeholder/demo figures before real usage, this session cleared every seeded financial record (budgets, expenses, CAPEX projects, approvals, cash-flow scenarios, reconciliation ledger items, KPIs) while keeping structural config (users, departments, expense categories, reconciliation source lanes) intact, then fixed every screen that had previously displayed hardcoded/disconnected mock data so the whole app now degrades gracefully to informative empty states on a fresh workspace instead of showing fake numbers or breaking with `NaN%`/crashes:
- **Dashboard, AI Copilot** — budget/expense/CAPEX charts and canned Copilot replies now derive entirely from live Store data with empty-state fallbacks (fixed in an earlier part of this session).
- **Reports & Analytics** — the Trend chart, the department utilisation heat-map, the "Variance vs Plan" table and the "Key insights" panel are now all computed from live budgets (grouped into a shared `deptStats` aggregation) instead of hardcoded arrays, each with an `ArsEmpty` fallback + "New Budget" call-to-action when there's no data yet. The Director's Report's cash-flow section now correctly shows "No cash flow data yet" (rather than a false "solvent" status) when neither budgets nor CAPEX projects exist.
- **Cash Flow** — `computeCashFlow()` was rewritten to honestly derive Operating (OPEX burn) and Investing (CAPEX burn) from live budget/CAPEX totals, spread evenly across the year since there is no month-by-month history in the data model; Financing is honestly shown as RM0 with a "no facility data tracked yet" note (Coplanistra has no loan/facility tracking yet); labels were updated app-wide (e.g. "Current cash at bank" → "Projected cash position") to make clear this is a budget-derived projection, not a live bank feed. Full empty state shown when there's no budget/CAPEX data at all.
- **Quarterly Planning** — the "Division submissions" table now derives status per department from whether it has a budget with a final forecast set (submitted vs pending — never fabricated as "overdue" without a real due-date data source), the Q1–Q4 cards and QoQ chart now compute an even quarterly split of the live annual budget total instead of 4 hardcoded figures, and the current-quarter label is threaded live through the escalate/export/submit-reforecast actions instead of a hardcoded "Q3".
- Fixed several latent divide-by-zero (`NaN%`) bugs surfaced by testing against a genuinely empty dataset (Reports' `VarianceBar`, Quarterly's `QuarterCard` and per-row forecast-delta calc).
- Verified with `npm run build` (success across all three files) and a Playwright console-error check on `/`, `/quarterly`, `/cash-flow`, `/reports` against the fresh empty Store — zero console errors on any screen.
- Committed (`a3c0560`, on top of the seed-clearing commit `4b1e280`), pushed to GitHub, and redeployed to Cloudflare Pages (BYOK) — production now fully reflects the "start fresh" reset.
- **Known caveat**: because the data model has no month/quarter-level historical breakdown, several visualisations (Reports' Trend chart, Quarterly's per-quarter actual/forecast split) show an approximation — a flat repeated value or an even split of the annual total — rather than genuine historical progression. This is documented inline in the code and is an honest simplification, not fabricated data; a future iteration could add real time-series tracking to remove the need for it.

## Session update (2026-08-19, part 4) — Copilot dynamic quarter fix + divide-by-zero audit, redeployed
- **AI Copilot**: the seeded conversation opener, sidebar conversation history, and the quarter-comparison fallback reply no longer show a hardcoded "Q3" — they now compute the current/prior/next quarter and date live from `Store.fyQuarterLabel()`/`fyQuarterOf()`/`today()`, so Copilot's canned demo content stays correct as the app's reference date advances.
- **Divide-by-zero audit** (codebase-wide sweep, in preparation for an eventual empty-state/"start fresh" reset): guarded three more `NaN%` risks found in Budgets ("% of all budgets" stat), Budget Detail (utilisation %), and Quarterly Planning (submission-progress %). Combined with the guards already added to Performance and Monthly Monitoring in the previous update, all screens with percentage-of-total calculations now degrade to `0%` instead of `NaN%` when their underlying arrays are empty.
- Fixed the `ApprovalsScreen.js` `currentUser` reference (was undeclared, would have thrown at runtime) and added a visible disabled-state + tooltip on the Reject/Request-changes buttons when the note field is empty, surfacing the "note required for audit trail" rule proactively instead of only via a toast after clicking.
- Verified with `npm run build` (success) and a Playwright console-error sweep across all 14 app routes (authenticated) — zero errors/warnings beyond the expected Babel-standalone dev notice.
- Committed (`8634ad8`) and redeployed to Cloudflare Pages (BYOK) — production alias confirmed serving the latest build.
- ~~Still pending: the "remove demo figures / start fresh" request~~ — done, see "Session update (2026-08-19, part 5)" above.

## Session update (2026-08-19, part 3) — Remaining screens completed
- **Performance & KPIs**: KPI data lifted into the central Store (15 seeded KPIs across Financial / Operational / Sustainability perspectives) with full working Add/Edit/Delete KPI modal — previously a non-functional button.
- **Monthly Monitoring**: calendar heatmap no longer randomises on every re-render (deterministic seeded spend), threshold alerts now derived live from real OPEX over-plan data, CAPEX "Commitments" figure now pulled from real CAPEX project data instead of a hardcoded number, month navigation is dynamic relative to today's date.
- **Approvals**: full audit trail — every approve/reject/request-changes decision now records who decided and when, sourced from the real signed-in user; Reject and Request-changes require a note (enforced in the data layer, surfaced in the UI with disabled buttons + tooltip when the note is empty).
- Fixed several `ArsProgress` style-prop bugs and divide-by-zero (`NaN%`) bugs surfaced during this work.
- Verified with `npm run build` (success) and a Playwright console-error sweep on `/approvals`, `/monthly`, `/performance` (authenticated) — zero errors.

## Session update (2026-08-19, part 2) — Reconciliation module shipped, financial-definition standardisation complete
This session's 5-item priority list (period/currency → financial definitions/totals → Reconciliation module → Cash Flow calculations → Director's Report) is now **fully complete**:
- **NEW: Reconciliation module** (`/reconciliations`) — the module flagged as "still pending" below is now built and live. Six reconciliation lanes are tracked: Xero vs Westpac Account #2077, SFR payment schedule vs Xero, Costentra staff claims vs Xero, Expenses paid outside Westpac vs Xero, Budgeting actuals vs Xero, and Intercompany items. Each ledger item carries one of 8 statuses (Matched, Potential match, Missing in Xero, Duplicate, Timing difference, Different entity, Awaiting supporting document, Reviewed). The screen shows a summary strip (% resolved, outstanding count/value, latest reviewed date), a clickable by-source breakdown grid, and a filterable split-pane ledger with a detail panel to add items, change status (auto-stamping reviewer/reviewed-at), or delete. Seeded with 14 realistic items. Reachable from the sidebar (Finance Manager / Administrator roles) between CAPEX and Cash Flow, and from the reconciliation-status banners already present on the Dashboard, CAPEX, and Reports screens (which previously linked to a 404).
- **Financial-definition standardisation completed on Budgets and CAPEX**:
  - **Budgets** — new "Draft" and "Closed" summary tiles (alongside existing All/Active/Nearing-Cap/Over-Budget), each clickable and filtering the list; a **"Closed"** tile groups both `closed` and `archived` statuses. Budgets at 80–99% utilisation now show a distinct **"Nearing Cap"** lifecycle badge (a derived, visual-only status — not a new database value) instead of a plain "Active" badge, so at-risk budgets are visible before they actually breach 100%.
  - **CAPEX Portfolio** — the exposure/commitment fields added to the data model in the previous update are now fully surfaced in the UI: KPI grid expanded to 5 cards — Approved envelope, **Total exposure (committed)** (labelled "already includes paid actuals" to remove the additive-confusion risk), **Paid actuals (reconciled)**, **Open commitments** (contracted, not yet paid/posted), and **Remaining headroom** (approved but uncommitted). A reconciliation-status banner now sits above the KPIs (mirroring the Dashboard's pattern, linking to the new Reconciliation module), "Sanction pending" moved out of the KPI grid into its own warning card, and the projects table gained "Open" and "Recon." (per-project reconciliation badge) columns.
- Verified via `npm run build` and two full Playwright sweeps (all 14 app routes, zero console/page errors) before committing. Pushed to GitHub (`da9a50a`).

### Still pending (tracked for a future session)
- Per-screen enhancements from the original critique not yet started: Monthly Monitoring, Expenses (4-way status split UI), Approvals (precision/audit rules beyond the FY-label fix), Performance/KPIs (beyond the PERIODS fix), AI Copilot deeper enhancements.
- Redeploy to Cloudflare Pages pending (code is committed/pushed to GitHub; production URL below may be behind the latest commit until the next deploy).

## Session update (2026-08-19) — FY/currency correctness, reconciliation-aware financials, Cash Flow & Director's Report rebuild, ArsProgress bug fix
Responding to a full production-readiness critique for Al Bukhary Group / Arsela Resources, this session made the following **verified and deployed** changes:
- **Fiscal year corrected app-wide**: Arsela's FY starts 1 July, not 1 January. `store.js` now exposes `Store.fyLabel()/fyQuarterLabel()/fyYearOf()/fyProgressPct()/today()` etc., and every screen (Dashboard, Login, shell org badge, Cash Flow, Budgets detail, Approvals, Quarterly, Closeout, CAPEX, Performance, Copilot, Reports — both the Director's Report and the Variance-analysis tab) now computes its FY/quarter/month labels from these helpers instead of hardcoded "FY26"/"FY 2026"/"Jan-Dec" strings. Settings' `fiscalYearStart` default was also corrected from "January" to "July" (was silently contradicting the rest of the app).
- **Reporting currency corrected to AUD**: `defaultState.currency` changed from MYR to AUD; all remaining hardcoded "(RM)" field labels and CSV headers (CreateBudget, Expenses, Monthly, Quarterly, Closeout) now read the live currency code from the store; Settings' currency description text no longer describes MYR as the base unit.
- **Reconciliation-aware financial data model**: Budgets, Expenses and (this session) CAPEX projects now carry explicit `reconciled`/`actualsThrough`/`committed`/`forecastFinal` fields. The core build rule — *only reconciled Xero amounts are classified as actuals; approved items remain commitments; future amounts remain forecasts* — is enforced in the Dashboard and the Director's Report computations.
- **Director's Report rebuilt** (Reports screen): now shows a Preliminary-snapshot banner, basis-labeled executive summary (Actual/Committed/Actual+Committed/Forecast), a reworked department table that flags early-year near-zero spend as a "timing gap" instead of a misleading green underspend, a 13-week cash look-ahead, and a solvency/funding status block — all pulling live from Store and the shared `computeCashFlow()` function. CSV/PDF exports updated to match.
- **Cash Flow screen corrected**: fiscal-year month ordering (Jul→Jun), solid-vs-dashed actual/forecast chart rendering, and the previously-hardcoded "9.4% vs Jan opening" badge now uses a real computed `netChangePct`.
- **ArsProgress bug fixed**: budget utilisation bars/labels were clamped to a flat "100%" even when a budget was over its cap (e.g. Fleet Maintenance & Renewal at 107.1%). The bar width still caps visually at 100%, but the numeric label now always shows the true value.
- Verified via `npm run build` and Playwright across all 13 app routes with zero console errors before each commit; pushed to GitHub (`fbc1b61`) and deployed to Cloudflare Pages.

### Still pending as of this update (all resolved later the same day — see "Session update (2026-08-19, part 2)" above)
- ~~New Reconciliation module~~ — done, see part 2 above.
- ~~CapexScreen.js exposure-field UI~~ — done, see part 2 above.
- ~~BudgetsScreen.js Draft/Closed/Nearing-cap tiles~~ — done, see part 2 above.
- Per-screen enhancements from the original critique not yet started: Monthly Monitoring, Expenses (4-way status split UI), Approvals (precision/audit rules), Performance/KPIs, AI Copilot.
- (Sandbox preview URLs are temporary; the pages.dev link above is the permanent, short URL for the client.)

## Bug fix (2026-08-05) — Cash Flow scenario cards not clickable / not syncing
**Reported**: clicking a scenario card on the Cash Flow screen did nothing — the rest of the panel (hero stats, chart, runway, active badge) never updated.
**Root cause**: `Store.setState()` mutates the single shared state object in place, and the store's `emit()` was passing that same mutated object reference to every subscriber. React's `useState` bails out of re-rendering when given a value that's reference-identical to the current one — so the click *did* correctly flip the active scenario in the store, but the screen never repainted to reflect it.
**Fix**: `emit()` now spreads state into a fresh object on every notification, so every screen that subscribes via `useState(window.Store.getState())` + `Store.subscribe(setS)` always receives a new reference and re-renders. This is a central-store fix (`store.js`), so it covers every screen using that pattern, not just Cash Flow. Verified end-to-end with Playwright: closing cash RM237M → RM292M, runway 5.4mo → 6.6mo, "Active" badge moved to the clicked card, switch toast fired, zero console errors.

## Latest session update (2026-08-05) — Cash Flow scenario planning, Dashboard Spent-vs-Budget-to-date, Director's Report
Client feedback addressed this session:
- **Cash Flow scenario planning** ("what if budget/expense/revenue changed, what's the impact on cashflow?"): new **Scenario Planning** card on the Cash Flow screen. `Store.cashFlowScenarios` holds 4 seeded scenarios (Base case, CAPEX deferred, Opex savings drive, Revenue downside), each with independent Budget/Expense/Revenue % deltas + a note. Click any scenario card to make it active — the whole screen (hero stats, Operating/Investing/Financing chart, running cash balance, runway, CSV export) recomputes live from that scenario via a shared `computeCashFlow()` function. Add new scenarios via a modal form; delete any non-active scenario (the active one is protected). Fully Store-backed, so it persists and stays in sync with the rest of the app.
- **Dashboard — Spent to Date vs Budget to Date**: new panel alongside the existing "burn vs total budget" figure. Prorates the FY26 annual budget by how much of the fiscal year has elapsed (vs the app's fixed reference date) and compares it to live cumulative spend from `Store.budgets` — shows Budget-to-date / Spent-to-date / Variance with a progress bar. Clickable through to Reports. Gated to non-employee roles (org-wide total, not shown on the individual-contributor Dashboard view).
- **Monthly Director's Report**: brand-new tab on the Reports screen (now the default tab) — a real, data-driven executive report, not a static mock-up. Pulls live figures from Store (budgets, approvals, CAPEX, the active Cash Flow scenario) into: an executive summary, department budget performance table, CAPEX programme summary, cash flow position, and approvals needing director attention. **Export CSV** and **Export PDF** (via jsPDF + autoTable, loaded from CDN) both produce real downloadable files built from live data. All cards click through to the matching detail screen (Budgets / Cash Flow / CAPEX / Approvals).
- **Xero integration — CSV import (shipped).** The client chose the lighter-weight path over a full OAuth connection (no Xero Developer app/credentials needed). New **"Import from Xero"** button on the Expenses screen (next to Export): upload a CSV exported from Xero (Business → Expense claims, or Reports → Transaction list → Export → CSV) and Coplanistra auto-detects the Date, Description/Reference, Contact and Gross/Amount columns, shows an editable preview table (per-row include/exclude, description, vendor, amount, department, category), then bulk-adds the selected rows as real expenses via `Store.addExpense()`. Handles Xero's quoted CSV fields, thousands separators, `dd/mm/yyyy` dates, and parenthesised credit amounts. 100% client-side (`parseCSVText` in `primitives.js`) — no backend, no OAuth, works today. Verified end-to-end with a sample Xero-style CSV (4 rows → 4 expenses imported, stat cards and table updated live, zero console errors).

## Previous session update (2026-08-04) — full bug-report resolution pass
All items from the client's live-testing feedback were addressed and redeployed:
- **Dashboard**: real quarter/month period picker, working Export (CSV), all 4 top stat cards + all chart labels clickable/currency-aware, bell notification "view all" link fixed.
- **Create Budget**: Start/End are now real `<input type="date">` calendar pickers, wired into the saved record.
- **Quarterly Planning**: Q1–Q4 cards, QoQ chart labels, and scenario add/delete confirmed working; Escalate-overdue now pushes real notifications, Export produces a real CSV, and division-submission rows now link through to the matching department in Budgets.
- **Monthly Monitoring**: top stat cards clickable; OPEX categories are now a full Store-backed model with Add/Edit/Archive/Delete; month picker + CSV export added.
- **Expenses**: top 3 stat cards filter the table; a "Manage categories" modal supports rename/delete; Export produces a real CSV; **receipt scanning now runs real client-side OCR (Tesseract.js)** that auto-fills amount/date/vendor from a photographed receipt/invoice.
- **Approvals**: "Approve all safe" confirmed functional.
- **FY Closeout**: all 4 top stat cards filter the carry-over/reserve/archive decision table; Export produces a real CSV.
- **Currency propagation**: switching currency (RM/USD/AUD/CNY) now reformats every figure across Dashboard, Quarterly, Monthly, Expenses, Closeout, Cash Flow, Reports, Performance, Login, and the AI Copilot's canned figures — no more screens with hardcoded "RM" text.
- **Branding**: replaced the old placeholder icon with a new modern, corporate bar-chart/target mark (favicon + app icon) and a matching horizontal wordmark, generated to fit a budgeting/fintech product. This also replaced the old inline SVG `CoplanistraMark` used in the sidebar logo and the login-page wordmark, so the new icon now appears consistently everywhere (browser tab, sidebar, login screen).
- **Self-service password change** (new feature): users can now change their own account password from **Settings → Change password** — requires the current password, a new password (min. 8 characters, must differ from current), and a matching confirmation. Backed by a new `Store.changePassword()` method that validates against the signed-in user's record and updates it in place (persisted to `localStorage` like the rest of the app state).
- All changes are committed to GitHub (`main`) and deployed to Cloudflare Pages production.

## Features (all fully functional — click-through, not static mockups)

### Onboarding
- **Login** — demo auth: pick a role from the dropdown, sign in, land on the role-appropriate Dashboard.

### Role-aware Dashboard (4 tiers, same route, different widgets per role)
- Employee, Finance Manager, Approver, Administrator — each sees a different widget set, KPI figures, and sidebar nav, driven by `window.ROLES`. (The former separate "Executive" tier has been merged into Employee — one simplified non-admin tier instead of two overlapping ones.)
- **"View as" role switcher** in the topbar — switching role live-updates sidebar nav, dashboard widgets, user name/title/avatar, and badge counts everywhere, instantly.
- **Dashboard charts are fully labelled and clickable**: every bar/segment on the Budget vs Actual chart, the Category donut, budget-health cards, and the departments table shows its figure/% directly and links straight to the matching detail screen (Monthly, Budgets filtered by department, Expenses filtered by category).

### Planning module
- **Budgets** — searchable/filterable list, live query-string search/filter (`#/budgets?q=...&dept=...&status=...`), row click → Budget Detail. Status badges and the 4 summary stat cards (All / Active / Nearing Cap / Over-Budget) are clickable and filter the whole list. **Archive/Restore** button per budget (table + card view). **"Manage Categories"** button opens a shared taxonomy editor for Departments, Expense Categories, and Budget Code prefixes — used consistently across Budgets, Expenses, and CAPEX.
- **Budget Detail** — burndown chart, spend history, live figures from the shared Store.
- **Create Budget wizard** — multi-step form; submitting adds a real record to the Store and routes back to the (now updated) Budgets list.
- **FY Closeout wizard** — 3-step stepper (Review → Carry-over decisions → Lock & Archive) with a segmented control per budget row; reachable from the sidebar ("FY Closeout") for Finance Manager / Admin roles.
- **Quarterly Planning** — quarter cards (clickable → division submissions), plan-vs-actual chart with RM-value labels on every bar and click-through to the submissions table, and a live **Scenario comparison** panel: "New" opens a real add-scenario form, clicking a scenario switches the active one, each has a delete control — all backed by the shared Store (`state.scenarios`), not local demo state.
- **Monthly Monitoring** — calendar heat-view + category burn-down.
- **Expenses** — quick-add form with a real, working **Date** picker, an independent **Department** dropdown (no longer just a side-effect of the Budget selector) sourced from the shared taxonomy, **Category** picker with an inline "+ New" to add categories on the fly, and a real **receipt file upload** (PDF/PNG/JPG, size-checked, shows filename + remove) — plus a **live 3-tier approval-routing preview** that updates as you type the amount:
  - `< RM25,000` → Department Manager only
  - `RM25,000 – RM250,000` → Department Manager → Finance Manager
  - `> RM250,000` → Department Manager → Finance Manager → CFO / Executive
- **Approvals** — approve / reject / request-changes on pending items; approving instantly reduces the pending count everywhere it's shown (sidebar badge, Dashboard widget, Approvals list).

### Financials module
- **CAPEX Portfolio** — project table with stage filter dropdown, category donut, depreciation schedule. KPI grid distinguishes Approved envelope / Total exposure (committed) / Paid actuals (reconciled) / Open commitments / Remaining headroom, with a reconciliation-status banner and per-project reconciliation badges.
- **Reconciliation** (`/reconciliations`, Finance Manager / Administrator) — tracks 6 source lanes (Xero vs Westpac, SFR payment schedule, Costentra staff claims, expenses paid outside Westpac, budgeting actuals, intercompany items) against 8 statuses (Matched, Potential match, Missing in Xero, Duplicate, Timing difference, Different entity, Awaiting supporting document, Reviewed). Summary strip + by-source breakdown + filterable ledger with add/status-change/delete actions. Enforces the build rule that only reconciled Xero amounts are classified as actuals.
- **Cash Flow** — period selector (FY24/25/26/27-fcst) rescales the operating/investing/financing chart and runway projection live; clicking a chart bar shows that month's breakdown.
- **Performance & KPIs** — financial / operational / sustainability scorecards with dynamically computed RAG (Red/Amber/Green) counts — not hardcoded — and a period selector.

### Insight module
- **Reports & Analytics** — variance analysis (fully wired: clickable variance bars, utilisation heatmap, insight cards that deep-link to related screens); Forecast/Cash-flow/Vendor spend/Custom tabs are placeholders for future work.
- **AI Copilot** — chat interface with canned-but-data-grounded replies: ask about pending approvals, over-budget items, or utilisation and it reads live figures from the Store to answer.

### Admin
- **Team & Access** — member directory (search, invite modal, active/inactive toggle) and expandable role-permission templates.

### Settings (net-new addition, not in the original design source)
- Workspace org settings, notification toggles, data export, demo-data reset, profile card, **change password**. Added because the shared shell already routes a `/settings` nav item for Finance/Admin roles — without this screen that link would 404.
- **Change password**: any signed-in user can update their own password from Settings — enter current password + new password + confirmation; validated client-side and against the Store's user record.

## Architecture
- **Client-side React 18 SPA**, transpiled in-browser via **Babel Standalone (pinned to v7 classic runtime)** — no webpack/vite bundling of the app JS itself, just plain `<script type="text/babel">` tags loaded in dependency order.
- **`window.Store`** — a plain-JS pub/sub state container (`public/static/js/store.js`) holding budgets, approvals, expenses, notifications, role, toasts, **departments/categories/budget-codes taxonomy, scenarios, and multi-currency config** — the single source of truth all screens subscribe to. Persists to `localStorage` (`coplanistra_state_v1`), with backward-compatible migration for older saved sessions (e.g. legacy `executive` role auto-maps to `employee`).
- **`window.Router`** — a minimal hash-based router (`public/static/js/router.js`) supporting path segments and query params.
- **`window.ROLES`** — 4 role definitions controlling sidebar nav visibility and dashboard widget layout (`public/static/js/roles.js`): Finance Manager, Approver, Employee, Administrator.
- **Multi-currency**: `fmtMYR` (in `primitives.js`) is now currency-aware — it reads `Store.getState().currency` and converts every displayed figure using `CURRENCY_CONFIG` rates. Supported currencies: **RM (default), USD, AUD, CNY**. Switch currency from the Topbar selector or Settings — the choice applies instantly across every screen.
- **`AppFrame`** — the shared shell (sidebar + topbar + notification bell + toast stack) every screen renders inside (`public/static/js/shell.js`).
- **`app.js`** — the bootstrap: maps the current route to a screen component, gates unauthenticated users to `/login`, mounts the React root, and re-renders on Router/Store change.
- **Hono backend** (`src/index.tsx`) — serves static assets (`hono/cloudflare-workers` `serveStatic`) and returns the same SPA HTML shell for every path (hash-routing means the server only ever needs to serve `/`).

## Entry points / routes
All routes are client-side hash routes (`#/...`), served by the single Hono catch-all `app.get('*', ...)`:

| Route | Screen |
|---|---|
| `/dashboard` (default) | DashboardScreen |
| `/budgets`, `/budgets?q=...` | BudgetsScreen |
| `/budgets/new` | CreateBudgetScreen |
| `/budgets/:id` | BudgetDetailScreen |
| `/quarterly` | QuarterlyScreen |
| `/monthly` | MonthlyScreen |
| `/expenses` | ExpensesScreen |
| `/approvals` | ApprovalsScreen |
| `/closeout` | CloseoutScreen |
| `/capex` | CapexScreen |
| `/cashflow` | CashFlowScreen |
| `/performance` | PerformanceScreen |
| `/reports` | ReportsScreen |
| `/dataimports` | DataImportsScreen |
| `/copilot` | CopilotScreen |
| `/admin` | AdminScreen |
| `/settings` | SettingsScreen |
| `/login` | LoginScreen (also the fallback for any route while unauthenticated) |

## Data model & storage
- All application data (budgets, approvals, expenses, notifications) is seeded in-memory and persisted to **browser `localStorage`** (key `coplanistra_state_v1`) — there is currently no server-side database. This is a working prototype; production would move this to Cloudflare D1 with real auth.
- Settings screen uses a separate localStorage key (`coplanistra_settings_v1`) for workspace preferences.

## User guide
1. Open the app — you'll land on **Login**.
2. Pick a role from the dropdown (Finance Manager is the most feature-complete) and sign in.
3. Use the sidebar to move between modules; the "View as" pill in the topbar lets you preview any other role instantly.
4. Try: approve an item on **Approvals** → watch the pending-count badge drop everywhere; create a budget on **Budgets** → it appears at the top of the list immediately; type an expense amount on **Expenses** → watch the routing preview reroute through Dept Manager → Finance Manager → CFO as the amount crosses RM25K / RM250K.

## Team & Access — current members
Includes the workspace's real members list (mirrors the client's existing user table), e.g. Admin Arsela, Keith M Symondson, Roni (`roni@maidavale.com.my`, Manager), Rubiey Suhaimi, Shammim Azad Kamruzaman, Shamsir, plus the original design-source demo members (Faris Hamzah, Marcus Lim, Priya Nair, etc.).

## Known gaps / next steps
- Reports screen: only the "Variance analysis" tab is fully wired; Forecast / Cash-flow / Vendor spend / Custom are placeholders.
- No real authentication — Login is a demo role-picker, not tied to a real identity provider.
- No server-side persistence yet (Cloudflare D1) — all data lives in `localStorage` per browser.
- Admin screen's Invite/Deactivate actions are local-only (don't send real emails or persist across browsers).
- Exchange rates in `CURRENCY_CONFIG` are static demo values, not live market rates.
- Receipt uploads are stored as filenames only (no Cloudflare R2 binding yet) — files are not actually persisted server-side.
- Xero imports are CSV-upload snapshots, not a live OAuth/API sync — each import is a manual, dated snapshot rather than continuously refreshed data.
- Supporting Documents register (`/dataimports`) is metadata-only (name/category/date/note) — raw file bytes are not uploaded/stored (no R2 binding yet).

## Deployment
- **Platform**: Cloudflare Pages (via Hono + Wrangler), deployed under the client's own Cloudflare account
- **Status**: ✅ **Live in production** at https://coplanistra.pages.dev
- **Source control**: ✅ Connected to GitHub — https://github.com/Rubiey-Arsela/Coplanistra- (`main` branch)
- **Tech Stack**: Hono (backend/static-serving) + React 18 (CDN) + Babel Standalone v7 (CDN, in-browser JSX transform) + vanilla CSS design tokens
- **Last Updated**: 2026-08-24, part 2 (fix: Excel/PDF Xero exports with a title block above the header row now import correctly, across all import entry points)
