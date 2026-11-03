# Borrowing accounts and bulk repayments

## Use

Open **Loans / Borrowing accounts**. Create a named account (credit/pay-later or cash loan). An opening balance changes debt without pretending cash was received; notes explain forgotten or historical debt. A negative opening balance represents lender credit.

Record credit expenses through **Add Expense → payment method → borrowing account**, or directly from the account. Cash borrowing is a separate transaction that increases both cash and debt. Principal repayments decrease cash and debt once; interest and fees are separate spending charges. New account transactions use integer paise.

Enter the lender's remaining bill amount and due date manually. A statement replaces the prior statement and never creates debt. Enter the full amount remaining as of that date, including carried arrears and payments already made. Later payments reduce bill due; for payments entered on the same date, transaction order determines whether they were already included in the statement. Corrections keep their original same-day order. Future EMI installments are not scheduled automatically.

Example: debt ₹20,000; bill ₹13,000; payment ₹13,000 → debt ₹7,000; bill due ₹0. Excess payments become account credit. A later credit purchase consumes that credit before creating new debt.

Each account provides all-date transaction and statement histories. Corrections append a reversal and replacement; reversing a purchase also removes its current spending projection, while retaining a snapshot and transaction audit. Correct managed expenses through the account-aware expense action or account history. Legacy API writes cannot bypass the managed-record guard.

Budget summary, bundle, spreadsheet, expenses, allocations and month-list readers now share calculation rules in `server/borrowing/reporting.ts`. Account balances carry across months; payment totals are filtered by payment date. Credit purchases count as spending but do not withdraw cash. Pending returns are excluded. Recorded savings transfers reduce spendable cash; the 50% suggestion does not. The “Where do these numbers come from?” panel lists supporting records and distinguishes cash spending, credit spending and repayments. Legacy aggregate starting balances remain legacy inputs requiring reconciliation; they are not lender-level evidence.

## Existing data

No existing records are converted automatically. Create a zero-opening account, open **Review legacy records**, select the actual lender's pending records, and enter today's confirmed balance with an explanation. The UI downloads a pre-conversion financial JSON backup. The conversion also stores a snapshot atomically before adding ledger mappings.

Clearly linked credit purchase/borrow pairs are imported once without copying the expense. Linked partial repayments are imported once. A reconciliation adjustment bridges the reviewed balance, without inventing a repayment date or cash movement. Settled legacy records stay visible; their payment dates cannot be inferred. Unlinked historic payments must be reviewed manually. Repeating a conversion request with the same idempotency key does not import again.

The zero-opening account requirement prevents accidental merging into an already-used balance. Account membership requires explicit selection; names/tags only assist review. Legacy records and unaffected finance data remain available. The original legacy import and goal-purchase workflows remain legacy workflows; convert their records through review before treating them as managed accounts.

## API

Base: `/api/budget/borrowing-accounts`.

- `GET /`: account balances, current unpaid bill and credit.
- `POST /`: `{name, account_type: CREDIT|CASH_LOAN, opening_paise?, date?, notes?}`.
- `GET /:id`: account with transaction and statement histories.
- `POST /:id/transactions`: `{kind, amount_paise, date, description, payment_method?, notes?, expected_version?}`. Kinds: CREDIT_PURCHASE, CASH_BORROW, PAYMENT, FEE, OPENING, ADJUSTMENT. Opening/adjustments require notes; adjustments may be signed.
- `POST /:id/transactions/:transactionId`: correction fields plus `reason`, or `{reverse_only:true, reason}`. Opening balances are corrected with explicit adjustments.
- `POST /:id/bills`: `{amount_paise, as_of_date, due_date, notes?, expected_version?}`. Amount is the remaining bill balance, not a new charge. Add a missing-charge adjustment before entering a bill exceeding recorded debt.
- `GET /migration`: unconverted legacy records and linked purchases for review.
- `GET /migration/backup`: downloadable pre-conversion financial snapshot.
- `POST /:id/migration`: `{borrow_ids, confirmed:true, balance_paise, date, notes, expected_version?}`.
- `GET /backups`: retained migration/correction snapshots.

All POST writes require a stable `Idempotency-Key` per logical submission. Retries with the same body return the original result; reuse with a different body returns 409. Commands enforce account-version checks in SQLite triggers inside the same atomic batch as all dependent writes. Stale concurrent submissions return 409. Refresh before resubmitting. Optional `as_of=YYYY-MM-DD` conveys the device's local calendar date (within one day of the server), avoiding UTC midnight disagreements. Amounts must be integer paise; dates are validated.

Existing `PUT /api/budget/summary/:month` now updates actual savings contributions only, preserving opening legacy balances. Derived debt, borrowing and carryover values are read-only in the form and cannot be overwritten through that endpoint.

## Rollout

This change has not migrated or deployed production data.

1. Create an external database backup: use SQLite's backup facility for local `data/records.sqlite`; for Cloudflare use `wrangler d1 export billings-db --remote --output <private-backup-path>` and retain it outside git.
2. Apply **only** `migrations/0001_borrowing_accounts.sql` to D1 before deploying the interface: `wrangler d1 execute billings-db --remote --file migrations/0001_borrowing_accounts.sql`. Do not reapply the full `schema.sql` to production; it contains seeds. New local databases include the tables through the full schema; existing local servers initialize the additive tables on first ledger request.
3. Build and deploy the application. Existing authentication restrictions remain in force. Private multi-user isolation and signature-verification remediation are separate work; do not invite additional users with this release.
4. Verify the live empty/new account flow; then reconcile actual legacy accounts individually with the owner. Keep exported backups. No destructive historical migration is needed to roll back the UI: restore the prior application version while retaining the additive tables, and avoid legacy editing of converted records.

## Validation

- `npm run test:borrowing`: isolated in-memory SQLite, plus the D1 adapter contract. Covers bills, partial/bulk payments, excess credit, corrections/reversals, same-day statement order, backdating, concurrent writes, idempotency, migration, guarded legacy writes, month/lifetime reconciliation and informational savings.
- `npm run test:borrowing:d1`: actual isolated local Cloudflare D1 runtime. Verifies schema, triggers, batches and the ₹20,000/₹13,000 case. Requires permission to bind a localhost test socket; never connects to production.
- `npx tsc --noEmit`, `npm run build`, `npx wrangler deploy --dry-run`.

Browser verification used a disposable in-memory database and confirmed ₹7,000 debt / ₹0 bill after a ₹13,000 bulk payment. No real financial records were changed during verification.
