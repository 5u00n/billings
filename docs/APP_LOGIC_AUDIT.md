# App logic audit — 2 November 2026

Scope: current working tree, including pre-existing edits in server/index.ts, server/worker.ts, ExpenseLogView.tsx and GoalsTrackerView.tsx. No application source or real financial data modified. This is a source review with isolated formula reproductions, not a live production penetration test or reconciliation of personal balances.

## Highest priority findings

### 1. Repayment expenses are deducted twice (high)

Evidence: server/index.ts:1627–1636 includes every expense in totalExpense. Lines 1668–1684 calculate debtPayment from those same repayment expenses, then subtract totalExpense + debtPayment. server/worker.ts:780–830 repeats this logic.

Reproduced against the actual local calculateBudgetSummary function and an in-memory SQLite database: income 10,000; one expense tagged Debt Repayment of 1,000. Expected cash before savings 9,000; overhead returned 8,000. The expense form explicitly creates paybacks with category reg and that tag (src/components/budget/ExpenseLogView.tsx:319).

Fix direction: represent principal repayment explicitly; deduct cash exactly once, decrease the associated liability exactly once. Separate interest from principal. Do not identify transaction semantics through editable tags.

### 2. Monthly, lifetime and spreadsheet totals disagree (high)

server/index.ts:1576 uses only saved summary debt payments for all-time totals, while :1668 automatically derives them for individual months. Reproduction: the same repayment is 1,000 monthly and zero all-time. Monthly breakdown at :1857 also uses manual debt payments only. Worker /api/budget/summary at :1270 returns a raw summary row, while Express returns a calculated object. Worker borrow overrides use null checks; Express uses truthiness. Explicit zero borrow override with a recorded borrow of 1,000 produces zero deployed and 1,000 locally.

Fix direction: one pure shared calculation module and one API contract. Distinguish unset overrides from explicitly entered zero. Monthly rows should reconcile with lifetime totals using consistent opening balances.

### 3. Spreadsheet invents additional debt and opening balances (high)

server/index.ts:1800 and server/worker.ts:652 hardcode opening debt 62,152 and cash 14,000. The first-month fallback also rejects an explicit zero starting debt. server/index.ts:1870 and server/worker.ts:697 add an expense/income deficit to debt even when borrowing is already recorded. Example: income 0, expense 1,000, recorded borrow 1,000 increases debt by 2,000 in the breakdown. The summary formula increases it by 1,000. Breakdown clamps negative remaining to zero; the summary retains a negative value.

Fix direction: explicit user opening balances with effective dates. A funding gap should be visible as an unreconciled gap until its funding source is known, rather than silently creating a liability. Confirm how the owner wants to handle “unknown debt.”

### 4. Savings can exceed available money (high; savings semantics need confirmation)

server/index.ts:1684–1687 and server/worker.ts:826–831 add regular and extra savings to an automatic 50% share of overhead, but do not deduct those manual savings from remaining cash or from the basis of automatic savings.

Reproduction: income 10,000, regular savings 3,000, no spending. App returns total savings 8,000 plus remaining 5,000: 13,000 allocated against 10,000 available. If savings fields describe balances rather than current-period contributions, summing them into monthly savings is instead a balance/flow error.

Fix direction: confirm whether savings are a suggestion, actual transfer, contribution, or accumulated balance. Model each distinctly and make the 50% allocation an explicit configurable rule.

### 5. Returns use maximum rather than transaction reconciliation (high)

server/index.ts:1651–1653 and server/worker.ts:807 use Math.max(income return total, borrow RETURN total). Two distinct receipts of 500 and 300 return 500, dropping 300. If both sources duplicate the same receipts, maximum still cannot reliably deduplicate partially overlapping data.

Fix direction: a single repayment-received transaction linked to the original receivable. Migrate duplicates using explicit provenance/links, not aggregate maximum. Report repayment principal separately from earned income.

### 6. Borrow lifecycle is not a reliable ledger (high)

server/index.ts:2170–2217 and server/worker.ts:937–975 create credit-funded debts and settle linked borrows as separate writes. Exceptions are caught without rolling back the successful expense. A linked repayment can mark an entire borrow settled without comparing the amount or maintaining principal outstanding. Partial repayments are just expenses with an optional status flag. New paybacks can create a new BORROW in the repayment month, treating historical debt as fresh funding. Expense edits do not apply the same lifecycle as creation; deletion does not reverse linked settlement. Changing a credit-card purchase to a cash payment retains its generated borrow record (:2347).

Fix direction: loans/receivables plus immutable or auditable linked transactions; outstanding = opening principal + advances − principal repayments. Apply dependent mutations atomically. Track credit purchases separately from cash borrowing: a credit purchase creates an expense and liability without depositing cash into a bank account. Reversals and corrections should preserve history.

## Other-user readiness

### 7. Authentication does not establish a trustworthy identity (critical)

server/worker.ts:162–184 decodes the JWT payload and checks claims but never verifies the signature; :253–270 trusts its email for authorization. An untrusted client can fabricate claims. Express /api/auth/verify also decodes without signature verification, and its financial routes have no server authentication middleware (only CORS and security headers appear in app.use). CORS does not authorize callers.

src/context/AuthContext.tsx permits authorization after network errors, including outside localhost. Offline interception can also cache the verification endpoint response.

Fix direction: signature and claim verification on every protected API request; deny access on verification failure. Express can use Firebase Admin; Worker needs a compatible verifier with Google's signing keys and proper cache/rotation handling. Official reference: https://firebase.google.com/docs/auth/admin/verify-id-tokens . Review the active hosting configuration to establish actual exposure; no deployed service was probed during this audit.

### 8. No private data boundary between users (critical before inviting users)

schema.sql defines global expenses, income, borrows, summaries, goals, settings and invoices without owner/workspace keys. Worker authorization is an email allowlist, not tenant isolation. Adding another allowed email would grant access to the same underlying records. Personal defaults are embedded in schema/profile seeds.

src/lib/offlineCache.ts keys financial data only by URL. Auth token cache is also not keyed by user. AuthContext sign-out does not call offlineCache.clearAll or clearAuthTokenCache. This risks showing a previous user's cached records and reusing their cached token on the same browser.

Fix direction: verified user → workspace membership → owner-scoped queries and object references for every read/write/export/import. Scope unique constraints such as invoice numbers and monthly summaries by workspace. Migrate existing data into the owner's workspace before enabling other users. Use per-user cache namespaces, clear on identity changes, and never cache authorization decisions. Shared household access, if wanted, should use explicit membership roles.

## Installable modern web app

The React/Vite app already builds successfully. index.html has no web app manifest link; no application service-worker registration or manifest assets were found. Cloudflare generated type definitions mentioning ServiceWorkerGlobalScope do not indicate an implemented browser service worker. Existing localStorage API caching cannot load the app shell offline on its own.

Add an app manifest, proper icons, standalone display/start URL/scope, secure hosting, and platform-appropriate install guidance. Use an app-shell service worker for deliberate offline support; it is not universally required for installation. Keep sensitive API data out of indiscriminate service-worker caches. Decide whether offline use is read-only; offline financial writes need idempotency, sync conflict handling, and visible pending/failed states. Official reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable .

Build passed, with a roughly 3.06 MB JavaScript chunk (945 KB gzip). Lazy-loading invoice PDF, export, chart and tax sections is a reasonable subsequent performance task. No mobile-device or accessibility audit was performed.

## Recommended sequence

1. Correct signature verification and protect all routes. Preserve existing data and create a backup before migrations.
2. Agree transaction definitions, opening balances, unknown-debt handling, and savings rules using a few owner examples.
3. Introduce a shared ledger/calculation module, integer minor-unit money, validated transactions, and reconciliation fixtures covering cash, credit, partial repayments, corrections, carryover and lifetime totals.
4. Migrate the owner's existing records with an audit trail and reconciliation report. Do not silently reinterpret history.
5. Add private user workspaces, membership checks and identity-scoped caches; validate cross-user isolation before enabling invitations.
6. Add PWA installation and mobile usability, then optional offline writes with explicit synchronization behavior.

## Questions for the owner

- Does “unknown debt” mean historical debt without details, an unexplained balance difference, or something else?
- Are other users independent/private, or should shared households also exist?
- Are regular/extra savings transfers made this month, cumulative balances, or planned allocations? Should the app always reserve 50% of leftover money?
- Do Returns represent repayment of money you previously lent? Where is the original lending recorded?
- Give one actual expense entry and expected result if possible; anonymized numbers are enough.

## Validation and graph limits

Four isolated reproductions execute the extracted current summary function against in-memory SQLite; no live database is opened. Run from the project root: node graphify-out/audit-repro.cjs . Results are in graphify-out/audit-repro-results.jsonl . npm run build passes; it does not type-check or validate financial correctness. No automated test command exists in package.json.

Graph: 2,246 nodes, 2,875 edges, 165 communities. Generated worker declarations dominate many communities and suggested questions. Health diagnostic: 158 dangling endpoint edges, one self-loop, 107 same-endpoint collapses. The graph is a navigation aid, not proof of financial behavior or a complete call graph. Source review and reproducible formulas substantiate the findings above. Token counters from the semantic subagent are unavailable, not zero measured usage. Benchmark's 2.6× reduction is a tool estimate, not observed session savings.

## Owner clarification and follow-up findings

Owner confirmed: unknown debt means obligations not tracked or potentially forgotten. Other users must have private accounts. Reported symptoms: old returns in monthly breakdown, ledger totals lacking supporting records, active month not selected automatically.

### Active month is fixed to October 2026

BudgetDashboard.tsx:89, SpreadsheetPage.tsx:13, ReturnsPage.tsx:7, AllocationsPage.tsx:7, BorrowPage.tsx:7, ExpensePage.tsx:8 and IncomePage.tsx:7 initialize selectedMonth to '2026-10'. Their month-loading logic preserves that selection if October exists. PrintableMonthlyReport.tsx:54 also uses October as fallback. Use the current local calendar month by default, include it even when empty, and preserve deliberate navigation to historical months. Avoid UTC month derivation around local midnight/month boundaries. On a long-running tab, distinguish a user-selected historical month from an automatically selected active month.

### Pending returns are counted as received cash

ReturnsTrackerView.tsx supports PENDING and SETTLED states and defaults new receipts to SETTLED. Summary and breakdown aggregate every RETURN without a status condition: server/index.ts:1650 and :1839, worker.ts:615 and :804. Reproduction: one PENDING return of 1,500 produces 1,500 available returns despite no money received. Confirm with owner that pending receivables must remain separate from cash receipts. Changing this calculation requires reconciling legacy status meanings.

### Stored month and date can disagree

server/index.ts:2554 trusts body.month instead of requiring agreement with date. Queries filter that stored month, not the displayed date. The same pattern appears in import paths. Reproduction: a September-dated return with stored month November is included in November. This is a plausible mechanism for the reported old returns, not proof that the owner's actual records contain this mismatch. Inspect only return IDs, date, month and status to establish it; do not rewrite history blindly. An old loan's repayment received now should still count now, so distinguish loan origination date from receipt date.

### Empty historical months are synthesized and carry-forward is misleading

server/index.ts:1794 and worker.ts:606 insert August–October 2026 without data. Combined with hardcoded opening balances and automatic savings splitting, the spreadsheet can show nonzero figures for periods with no supporting transactions. It lacks an explicit source/provenance view distinguishing entered transactions, opening balances, overrides and calculated allocations.

MonthlyBreakdownTableView.tsx:331 sums total_income across rows, even though each row includes previous_remaining. That counts carried cash again as period inflow. For example, 1,000 earned in month one and 500 carried to month two becomes 1,500 aggregate inflow without any new receipts. Lifetime receipts should sum transactions, while opening and closing balances should use boundary values.

### Proposed clearer ledger behavior

Default to the current month. Show received income, actual spending, principal repayments, borrowing, transfers and closing cash as distinct figures. Let every total open the exact supporting entries with dates and amounts, and show opening balances/manual adjustments separately. Show unknown debt as an owner-entered, explicitly uncertain obligation with a note, date and later reconciliation to a known lender; do not infer a real debt from overspending alone. For new private users, all opening balances start from their own setup.

Remaining accounting questions: meaning of savings fields and the 50% rule; whether PENDING Returns are expected receipts. Application source is unchanged pending agreement on the accounting model.
