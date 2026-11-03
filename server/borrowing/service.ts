import {
  accountView,
  accountBalance,
  activeTransactions,
  localDate,
  type BorrowingTransaction,
} from "../../src/lib/borrowing";
import type { LedgerStore, Statement } from "./store";
export class LedgerError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function fail(message: string, status = 400): never {
  throw new LedgerError(message, status);
}
function text(value: any, label: string, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) fail(`${label} is required`);
  if (result.length > 2000) fail(`${label} is too long`);
  return result;
}
function date(value: any, label = "Date", today = localDate()) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T00:00:00Z")) ||
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value
  )
    fail(`${label} must be a valid YYYY-MM-DD date`);
  if (value > today) fail(`${label} cannot be in the future`);
  return value as string;
}
function money(value: any, allowZero = false, signed = false) {
  if (
    !Number.isSafeInteger(value) ||
    (!signed && value < 0) ||
    (!allowZero && value === 0) ||
    Math.abs(value) > 1_000_000_000_000
  )
    fail("Amount must be integer paise within the supported range");
  return value as number;
}
function dueDate(value: any, asOf: string) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T00:00:00Z")) ||
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value
  )
    fail("Invalid due date");
  return value;
}
export async function ledgerData(store: LedgerStore) {
  const [accounts, transactions, bills, links, legacyLinks] = await Promise.all(
    [
      store.all("SELECT * FROM borrowing_accounts ORDER BY name"),
      store.all(
        "SELECT t.*, t.effective_order AS sequence FROM borrowing_transactions t JOIN borrowing_commands c ON c.id=t.command_id ORDER BY t.date,t.created_at,t.id",
      ),
      store.all(
        "SELECT b.*, c.expected_version AS sequence FROM borrowing_bills b JOIN borrowing_commands c ON c.id=b.command_id ORDER BY b.as_of_date,c.expected_version",
      ),
      store.all("SELECT * FROM borrowing_expense_links"),
      store.all("SELECT * FROM borrowing_legacy_links"),
    ],
  );
  return { accounts, transactions, bills, links, legacyLinks };
}
export async function handleBorrowing(
  store: LedgerStore,
  method: string,
  path: string,
  body: any = {},
  key = "",
  today = localDate(),
): Promise<{ status: number; data: any }> {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(today) ||
    !Number.isFinite(Date.parse(today + "T00:00:00Z")) ||
    Math.abs(
      Date.parse(today + "T00:00:00Z") - Date.parse(localDate() + "T00:00:00Z"),
    ) > 86400000
  )
    fail("Invalid local calendar date");
  await store.init();
  const segments = path
    .replace(/^\/api\/budget\/borrowing-accounts\/?/, "")
    .split("/")
    .filter(Boolean);
  const output = (data: any, status = 200) => ({ status, data });
  if (
    method === "GET" &&
    segments[0] === "migration" &&
    segments[1] === "backup"
  ) {
    const tables = [
      "expenses",
      "income_entries",
      "borrow_records",
      "monthly_budget_summaries",
      "financial_goals",
      "borrowing_accounts",
      "borrowing_transactions",
      "borrowing_commands",
      "borrowing_bills",
      "borrowing_expense_links",
      "borrowing_legacy_links",
    ];
    const snapshot: Record<string, any[]> = {};
    for (const table of tables)
      snapshot[table] = await store.all(`SELECT * FROM ${table}`);
    return output({
      format: "borrowing-backup-v1",
      taken_at: new Date().toISOString(),
      tables: snapshot,
    });
  }
  if (method === "GET" && segments[0] === "migration") {
    const data = await ledgerData(store);
    const [borrows, expenses] = await Promise.all([
      store.all("SELECT * FROM borrow_records ORDER BY person,date"),
      store.all("SELECT * FROM expenses ORDER BY date"),
    ]);
    const mapped = new Set(data.legacyLinks.map((x) => x.borrow_id));
    return output({
      records: borrows
        .filter((b) => b.type === "BORROW" && !mapped.has(b.id))
        .map((b) => ({
          ...b,
          linked_expense:
            expenses.find((e) => `borrow-cc-${e.id}` === b.id) || null,
        })),
      warning:
        "Review account membership and confirm today’s balance. Settled records remain legacy history; repayment dates are never inferred.",
    });
  }
  if (method === "GET" && segments[0] === "backups")
    return output(
      await store.all(
        "SELECT * FROM borrowing_backups ORDER BY created_at DESC",
      ),
    );
  if (method === "GET") {
    const data = await ledgerData(store);
    const views = data.accounts.map((a) =>
      accountView(
        a,
        data.transactions.filter((t) => t.account_id === a.id),
        data.bills.filter((b) => b.account_id === a.id),
        today,
      ),
    );
    if (!segments.length) return output(views);
    const a = views.find((a) => a.id === segments[0]);
    if (!a) fail("Borrowing account not found", 404);
    return output({
      ...a,
      transactions: data.transactions.filter((t) => t.account_id === a.id),
      bills: data.bills.filter((b) => b.account_id === a.id),
    });
  }
  if (method !== "POST") fail("Method not allowed", 405);
  if (!key || key.length > 150) fail("An Idempotency-Key is required");
  const fingerprint = JSON.stringify({ path, body });
  const cached = (
    await store.all("SELECT * FROM borrowing_commands WHERE id=?", [key])
  )[0];
  if (cached) {
    if (cached.fingerprint !== fingerprint)
      fail("This request key was already used for a different request", 409);
    return output(JSON.parse(cached.result_json));
  }
  const statements: Statement[] = [];
  let account: any;
  let accountId = segments[0];
  if (!segments.length) {
    const name = text(body.name, "Account name", true);
    const type = body.account_type;
    if (!["CREDIT", "CASH_LOAN"].includes(type))
      fail("Choose CREDIT or CASH_LOAN");
    accountId = crypto.randomUUID();
    account = { id: accountId, name, account_type: type, version: 0 };
    statements.push({
      sql: "INSERT INTO borrowing_accounts(id,name,account_type) VALUES(?,?,?)",
      args: [accountId, name, type],
    });
  } else {
    account = (
      await store.all("SELECT * FROM borrowing_accounts WHERE id=?", [
        accountId,
      ])
    )[0];
    if (!account) fail("Borrowing account not found", 404);
  }
  const result = {
    success: true,
    account_id: accountId,
    transaction_id: null as string | null,
  };
  const existing = await store.all(
    "SELECT t.*,t.effective_order AS sequence FROM borrowing_transactions t JOIN borrowing_commands c ON c.id=t.command_id WHERE t.account_id=?",
    [accountId],
  );
  const bills = await store.all(
    "SELECT b.*,c.expected_version AS sequence FROM borrowing_bills b JOIN borrowing_commands c ON c.id=b.command_id WHERE b.account_id=?",
    [accountId],
  );
  const version =
    body.expected_version === undefined
      ? account.version
      : body.expected_version;
  if (version !== account.version)
    fail("Account changed. Refresh the balance and try again.", 409);
  const command: Statement = {
    sql: "INSERT INTO borrowing_commands(id,account_id,expected_version,fingerprint,result_json) VALUES(?,?,?,?,?)",
    args: [key, accountId, version, fingerprint, ""],
  };
  statements.push(command);
  const addTx = (input: any, id = crypto.randomUUID(), reverses?: any) => {
    const kind = reverses ? "REVERSAL" : input.kind;
    if (
      ![
        "CREDIT_PURCHASE",
        "CASH_BORROW",
        "PAYMENT",
        "FEE",
        "OPENING",
        "ADJUSTMENT",
        "REVERSAL",
      ].includes(kind) ||
      (!reverses && kind === "REVERSAL")
    )
      fail("Invalid transaction kind");
    const dt = date(input.date, "Date", today);
    const amt = reverses
      ? reverses.amount_paise
      : money(
          input.amount_paise,
          kind === "OPENING",
          kind === "ADJUSTMENT" || kind === "OPENING",
        );
    const description = text(input.description, "Description", true);
    const notes = text(input.notes, "Notes");
    if (["OPENING", "ADJUSTMENT"].includes(kind) && !notes)
      fail("Opening balances and adjustments require an explanation");
    if (
      kind === "OPENING" &&
      activeTransactions(existing).some((t) => t.kind === "OPENING")
    )
      fail("Use an adjustment to correct an existing opening balance");
    const debt = reverses
      ? -reverses.debt_delta_paise
      : kind === "PAYMENT"
        ? -amt
        : amt;
    const cash = reverses
      ? -reverses.cash_delta_paise
      : kind === "PAYMENT"
        ? -amt
        : kind === "CASH_BORROW"
          ? amt
          : 0;
    let original = input.original_record_id || null;
    const method =
      text(input.payment_method, "Payment method") ||
      (kind === "CREDIT_PURCHASE" ? account.name : "UPI / Bank");
    if (
      kind === "PAYMENT" &&
      ["Credit Card", "Slice Borrow", "Amazon Borrow"].includes(method)
    )
      fail(
        "Use a cash/bank payment method; debt refinancing is not a repayment",
      );
    if (
      !reverses &&
      ["CREDIT_PURCHASE", "FEE"].includes(kind) &&
      !input.import_existing
    ) {
      const expId = `account-exp-${id}`;
      original = expId;
      const category = input.category === "reg" ? "reg" : "ext";
      statements.push({
        sql: `INSERT INTO expenses(id,date,month,category,tag,description,amount,payment_method,notes,tax_classification,business_percentage) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          expId,
          dt,
          dt.slice(0, 7),
          category,
          input.tag || (kind === "FEE" ? "Interest / Fees" : "General"),
          description,
          amt / 100,
          kind === "FEE" ? "Credit Account" : method,
          notes,
          input.tax_classification || "PERSONAL_DRAWINGS",
          input.business_percentage ?? 0,
        ],
      });
    }
    const row: BorrowingTransaction = {
      id,
      account_id: accountId,
      date: dt,
      kind,
      amount_paise: amt,
      debt_delta_paise: debt,
      cash_delta_paise: cash,
      description,
      payment_method: method,
      notes,
      original_record_id: original,
      reverses_id: reverses?.id,
    };
    statements.push({
      sql: `INSERT INTO borrowing_transactions(id,account_id,date,kind,amount_paise,debt_delta_paise,cash_delta_paise,description,payment_method,notes,original_record_id,reverses_id,effective_order,command_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id,
        accountId,
        dt,
        kind,
        amt,
        debt,
        cash,
        description,
        method,
        notes,
        original,
        reverses?.id || null,
        input.effective_order ?? version,
        key,
      ],
    });
    if (
      !reverses &&
      original &&
      (["CREDIT_PURCHASE", "FEE"].includes(kind) ||
        (input.import_existing && kind === "PAYMENT"))
    )
      statements.push({
        sql: "INSERT INTO borrowing_expense_links(expense_id,transaction_id) VALUES(?,?)",
        args: [original, id],
      });
    existing.push({ ...row, sequence: input.effective_order ?? version });
    return id;
  };
  if (!segments.length) {
    if (body.opening_paise !== undefined && body.opening_paise !== 0)
      result.transaction_id = addTx({
        kind: "OPENING",
        date: body.date,
        amount_paise: body.opening_paise,
        description: "Opening balance",
        notes: body.notes,
      });
  } else if (segments[1] === "transactions") {
    if (
      body.import_existing ||
      body.original_record_id ||
      body.effective_order !== undefined
    )
      fail("Original record links can only be assigned by migration");
    if (segments[2]) {
      const old = activeTransactions(existing).find(
        (t) => t.id === segments[2],
      );
      if (!old) fail("Transaction already reversed or not found", 409);
      if (old.kind === "OPENING")
        fail("Use an adjustment to correct an opening balance");
      const reversal = addTx(
        {
          date: old.date,
          description: `Reversal: ${old.description}`,
          notes: text(body.reason, "Correction reason", true),
        },
        crypto.randomUUID(),
        old,
      );
      const linked = (
        await store.all(
          "SELECT expense_id FROM borrowing_expense_links WHERE transaction_id=?",
          [old.id],
        )
      )[0];
      let expenseSnapshot: any;
      if (linked) {
        const snapshot = (
          await store.all("SELECT * FROM expenses WHERE id=?", [
            linked.expense_id,
          ])
        )[0];
        expenseSnapshot = snapshot;
        statements.push({
          sql: "INSERT INTO borrowing_backups(id,snapshot_json) VALUES(?,?)",
          args: [
            crypto.randomUUID(),
            JSON.stringify({ corrected_expense: snapshot, transaction: old }),
          ],
        });
        statements.push({
          sql: "DELETE FROM borrowing_expense_links WHERE expense_id=?",
          args: [linked.expense_id],
        });
        statements.push({
          sql: "DELETE FROM expenses WHERE id=?",
          args: [linked.expense_id],
        });
      }
      result.transaction_id = reversal;
      if (!body.reverse_only)
        result.transaction_id = addTx({
          ...expenseSnapshot,
          ...body,
          original_record_id: undefined,
          effective_order: body.date === old.date ? old.sequence : version,
        });
    } else result.transaction_id = addTx(body);
  } else if (segments[1] === "bills") {
    const dt = date(body.as_of_date, "Statement date", today);
    const due = dueDate(body.due_date, dt);
    const amt = money(body.amount_paise, true);
    if (amt > Math.max(0, accountBalance(existing, dt)))
      fail(
        "Bill exceeds tracked debt. Record the missing charge or adjustment first.",
      );
    const billId = crypto.randomUUID();
    // A new statement on the same day supersedes prior statements using command order.
    statements.push({
      sql: "INSERT INTO borrowing_bills(id,account_id,as_of_date,due_date,amount_paise,notes,command_id) VALUES(?,?,?,?,?,?,?)",
      args: [billId, accountId, dt, due, amt, text(body.notes, "Notes"), key],
    });
  } else if (segments[1] === "migration") {
    if (body.confirmed !== true)
      fail("Review the records and explicitly confirm reconciliation first");
    const ids = Array.isArray(body.borrow_ids) ? body.borrow_ids : [];
    if (!ids.length || ids.length > 100)
      fail("Select between 1 and 100 legacy records");
    if (existing.length)
      fail("Reconcile legacy records into a new empty account", 409);
    const [borrows, expenses, incomes, summaries] = await Promise.all([
      store.all("SELECT * FROM borrow_records"),
      store.all("SELECT * FROM expenses"),
      store.all("SELECT * FROM income_entries"),
      store.all("SELECT * FROM monthly_budget_summaries"),
    ]);
    const picked = borrows.filter((b) => ids.includes(b.id));
    if (
      picked.length !== ids.length ||
      new Set(ids).size !== ids.length ||
      picked.some((b) => b.type !== "BORROW" || b.status !== "PENDING")
    )
      fail(
        "Only reviewed pending borrow records may be converted; settled records remain legacy",
      );
    const backupId = crypto.randomUUID();
    statements.push({
      sql: "INSERT INTO borrowing_backups(id,snapshot_json) VALUES(?,?)",
      args: [
        backupId,
        JSON.stringify({ borrows, expenses, incomes, summaries, account }),
      ],
    });
    for (const b of picked) {
      const exp = expenses.find((e) => `borrow-cc-${e.id}` === b.id);
      if (exp && Math.round(exp.amount * 100) !== Math.round(b.amount * 100))
        fail(
          "Linked purchase and borrow amounts disagree; reconcile them before conversion",
        );
      addTx({
        kind: exp ? "CREDIT_PURCHASE" : "CASH_BORROW",
        amount_paise: Math.round(b.amount * 100),
        date: exp?.date || b.date,
        description: b.reason || `Legacy borrowing: ${b.person}`,
        notes: "Reviewed legacy import",
        original_record_id: exp?.id || b.id,
        import_existing: true,
      });
      statements.push({
        sql: "INSERT INTO borrowing_legacy_links(borrow_id,account_id,snapshot_json) VALUES(?,?,?)",
        args: [b.id, accountId, JSON.stringify(b)],
      });
    }
    const importedPayments = expenses.filter((e) =>
      ids.includes(e.linked_borrow_id),
    );
    for (const e of importedPayments)
      addTx({
        kind: "PAYMENT",
        amount_paise: Math.round(e.amount * 100),
        date: e.date,
        description: e.description,
        notes: e.notes || "Reviewed legacy repayment",
        payment_method: e.payment_method,
        original_record_id: e.id,
        import_existing: true,
      });
    const dt = date(body.date, "Date", today);
    const confirmed = money(body.balance_paise, true, true);
    const difference = confirmed - accountBalance(existing, dt);
    if (difference)
      addTx({
        kind: "ADJUSTMENT",
        date: dt,
        amount_paise: difference,
        description: "Legacy reconciliation",
        notes: text(body.notes, "Reconciliation explanation", true),
      });
  } else fail("Route not found", 404);
  // If a correction removes debt supporting an active bill, require a replacement statement first.
  const view = accountView(account, existing, bills, today);
  if (view.bill_due_paise > view.outstanding_paise)
    fail(
      "This correction would leave the current bill above the account balance. Update the bill first.",
    );
  command.args![4] = JSON.stringify(result);
  try {
    await store.batch(statements);
  } catch (error: any) {
    const prior = (
      await store.all("SELECT * FROM borrowing_commands WHERE id=?", [key])
    )[0];
    if (prior && prior.fingerprint === fingerprint)
      return output(JSON.parse(prior.result_json));
    if (/BORROWING_VERSION_CONFLICT|UNIQUE constraint/.test(error.message))
      fail("Account or request changed. Refresh before retrying.", 409);
    throw error;
  }
  return output(result, 201);
}
