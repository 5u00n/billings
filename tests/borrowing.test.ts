import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { sqliteStore, d1Store } from "../server/borrowing/store";
import { borrowingRouter } from "../server/borrowing/router";
import { localDate } from "../src/lib/borrowing";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  db.exec(readFileSync("schema.sql", "utf8"));
  return {
    db,
    local: {
      prepare: (s: string) => db.prepare(s),
      exec: (s: string) => db.exec(s),
      transaction: (fn: () => any) => () => {
        db.exec("BEGIN");
        try {
          const r = fn();
          db.exec("COMMIT");
          return r;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    },
  };
}
function fakeD1(db: DatabaseSync) {
  function prepare(sql: string, args: any[] = []): any {
    return {
      bind: (...a: any[]) => prepare(sql, a),
      all: async () => ({ results: db.prepare(sql).all(...args) }),
      run: async () => db.prepare(sql).run(...args),
      sql,
      args,
    };
  }
  return {
    prepare,
    batch: async (stmts: any[]) => {
      db.exec("BEGIN");
      try {
        const result = stmts.map((s) => db.prepare(s.sql).run(...s.args));
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
const day = localDate();
for (const adapter of ["sqlite", "d1"] as const) {
  const { db, local } = database();
  const store = adapter === "sqlite" ? sqliteStore(local) : d1Store(fakeD1(db));
  let key = 0;
  async function req(
    method: string,
    path: string,
    body: any = {},
    id?: string,
  ) {
    const response = await borrowingRouter(
      store,
      method,
      new URL("http://test/api/budget/" + path),
      body,
      id || `key-${++key}`,
    );
    assert.ok(response);
    return response!;
  }
  async function post(path: string, body: any = {}, id?: string) {
    const r = await req("POST", path, body, id);
    assert.ok(r.status < 300, JSON.stringify(r));
    return r.data;
  }
  const root = "borrowing-accounts";
  const create = await post(root, { name: "SBI card", account_type: "CREDIT" });
  const id = create.account_id;
  const tx = async (kind: string, amount_paise: number, other: any = {}) =>
    post(`${root}/${id}/transactions`, {
      kind,
      amount_paise,
      date: day,
      description: kind,
      payment_method: "UPI / Bank",
      ...other,
    });
  const view = async () => (await req("GET", `${root}/${id}`)).data;
  await tx("CREDIT_PURCHASE", 2_000_000);
  await post(`${root}/${id}/bills`, {
    amount_paise: 1_300_000,
    as_of_date: day,
    due_date: "2027-01-01",
  });
  const payment = await tx("PAYMENT", 1_300_000);
  let a = await view();
  assert.equal(a.outstanding_paise, 700_000);
  assert.equal(a.bill_due_paise, 0);
  const report = (await req("GET", `summary?month=${day.slice(0, 7)}`)).data;
  assert.equal(report.credit_expense, 20000);
  assert.equal(report.cash_expense, 0);
  assert.equal(report.dept_payment, 13000);
  assert.equal(report.remaining, 0);
  assert.equal(report.overhead, 0);
  assert.equal(report.cash_shortfall, 13000);
  assert.equal(report.ending_debt, 20000);
  assert.equal(report.managed_debt, 7000);
  // New purchases do not increase the existing statement.
  await tx("CREDIT_PURCHASE", 100_000);
  assert.equal((await view()).bill_due_paise, 0);
  await post(`${root}/${id}/transactions/${payment.transaction_id}`, {
    kind: "PAYMENT",
    amount_paise: 1_000_000,
    date: day,
    description: "Corrected payment",
    reason: "Bank amount corrected",
    payment_method: "UPI / Bank",
  });
  a = await view();
  assert.equal(a.bill_due_paise, 300_000);
  assert.equal(a.outstanding_paise, 1_100_000);
  const activePayment = a.transactions.find(
    (t: any) => t.description === "Corrected payment",
  );
  await post(`${root}/${id}/transactions/${activePayment.id}`, {
    reverse_only: true,
    reason: "Not actually sent",
  });
  assert.equal((await view()).bill_due_paise, 1_300_000);
  await tx("PAYMENT", 2_500_000);
  a = await view();
  assert.equal(a.credit_paise, 400_000);
  assert.equal(a.bill_due_paise, 0);
  await tx("CREDIT_PURCHASE", 100_000);
  assert.equal((await view()).credit_paise, 300_000);
  const body = {
    kind: "FEE",
    amount_paise: 10_000,
    date: day,
    description: "Annual fee",
  };
  await post(`${root}/${id}/transactions`, body, "repeated");
  await post(`${root}/${id}/transactions`, body, "repeated");
  assert.equal((await view()).credit_paise, 290_000);
  assert.equal(
    (
      await req(
        "POST",
        `${root}/${id}/transactions`,
        { ...body, amount_paise: 20_000 },
        "repeated",
      )
    ).status,
    409,
  );
  // Atomic stale write leaves no fee expense or command behind.
  const before = db.prepare("SELECT COUNT(*) AS n FROM expenses").get()!.n;
  assert.equal(
    (
      await req("POST", `${root}/${id}/transactions`, {
        ...body,
        expected_version: 0,
      })
    ).status,
    409,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM expenses").get()!.n,
    before,
  );
  assert.equal(
    (
      await req("POST", `${root}/${id}/bills`, {
        amount_paise: 500_000,
        as_of_date: day,
        due_date: day,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req("POST", `${root}/${id}/transactions`, {
        ...body,
        amount_paise: 1.25,
      })
    ).status,
    400,
  );
  // A new bill replaces, not adds to, the prior bill.
  await tx("CASH_BORROW", 1_000_000);
  await post(`${root}/${id}/bills`, {
    amount_paise: 200_000,
    as_of_date: day,
    due_date: day,
  });
  await tx("PAYMENT", 50_000);
  assert.equal((await view()).bill_due_paise, 150_000);
  await post(`${root}/${id}/bills`, {
    amount_paise: 100_000,
    as_of_date: day,
    due_date: day,
  });
  assert.equal((await view()).bill_due_paise, 100_000);
  // Backdated payment does not reduce a later statement's entered remaining balance.
  const earlier = new Date();
  earlier.setDate(earlier.getDate() - 1);
  await tx("PAYMENT", 1000, { date: localDate(earlier) });
  assert.equal((await view()).bill_due_paise, 100_000);
  // Pending receivables do not become cash, and month/date filtering remains isolated.
  db.prepare(
    "INSERT INTO borrow_records(id,date,month,type,person,amount,status) VALUES('pending',?,?,'RETURN','Friend',500,'PENDING')",
  ).run(day, day.slice(0, 7));
  assert.equal(
    (await req("GET", `summary?month=${day.slice(0, 7)}`)).data.returns,
    0,
  );
  // Legacy migration: snapshot, explicit selection and reconciliation, no duplicate credit purchase.
  const legacy = await post(root, {
    name: "Legacy Slice",
    account_type: "CREDIT",
    opening_paise: 0,
    date: day,
    notes: "Migration",
  });
  db.prepare(
    "INSERT INTO expenses(id,date,month,category,tag,description,amount,payment_method) VALUES('old-exp',?,?,'ext','General','Old purchase',1000,'Slice Borrow')",
  ).run(day, day.slice(0, 7));
  db.prepare(
    "INSERT INTO borrow_records(id,date,month,type,person,amount,status) VALUES('borrow-cc-old-exp',?,?,'BORROW','Slice',1000,'PENDING')",
  ).run(day, day.slice(0, 7));
  const beforeMigration = (await req("GET", `summary?month=${day.slice(0, 7)}`))
    .data;
  const payload = {
    confirmed: true,
    borrow_ids: ["borrow-cc-old-exp"],
    balance_paise: 70_000,
    date: day,
    notes: "Confirmed with lender",
  };
  await post(
    `${root}/${legacy.account_id}/migration`,
    payload,
    "migration-repeat",
  );
  await post(
    `${root}/${legacy.account_id}/migration`,
    payload,
    "migration-repeat",
  );
  assert.equal(
    (await req("GET", `${root}/${legacy.account_id}`)).data.balance_paise,
    70_000,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM borrowing_legacy_links").get()!.n,
    1,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM borrowing_backups").get()!.n,
    1,
  );
  assert.equal((await req("DELETE", "expenses/old-exp")).status, 409);
  const monthly = (await req("GET", `summary?month=${day.slice(0, 7)}`)).data;
  assert.equal(monthly.total_expense, beforeMigration.total_expense);
  assert.equal(monthly.remaining, beforeMigration.remaining);
  assert.equal(monthly.ending_debt, beforeMigration.ending_debt - 300);
  const lifetime = (await req("GET", "summary?month=all")).data;
  assert.equal(monthly.dept_payment, lifetime.dept_payment);
  assert.equal(monthly.ending_debt, lifetime.ending_debt);
  // Race two independent writes against the same account version; only one may commit.
  const raceVersion = (await view()).version;
  const raceBody = {
    kind: "FEE",
    amount_paise: 100,
    date: day,
    description: "Concurrent fee",
    expected_version: raceVersion,
  };
  const race = await Promise.all([
    req("POST", `${root}/${id}/transactions`, raceBody, "race-a"),
    req("POST", `${root}/${id}/transactions`, raceBody, "race-b"),
  ]);
  assert.deepEqual(race.map((r) => r.status).sort(), [201, 409]);
  // A historical payment already included in a statement stays included when corrected later that day.
  const beforeStatement = await post(root, {
    name: "Same-day statement test",
    account_type: "CREDIT",
  });
  const sid = beforeStatement.account_id;
  await post(`${root}/${sid}/transactions`, {
    kind: "CREDIT_PURCHASE",
    amount_paise: 200000,
    date: day,
    description: "Purchase",
  });
  const pre = await post(`${root}/${sid}/transactions`, {
    kind: "PAYMENT",
    amount_paise: 50000,
    date: day,
    description: "Before statement",
  });
  await post(`${root}/${sid}/bills`, {
    amount_paise: 150000,
    as_of_date: day,
    due_date: day,
  });
  await post(`${root}/${sid}/transactions/${pre.transaction_id}`, {
    kind: "PAYMENT",
    amount_paise: 40000,
    date: day,
    description: "Corrected before-statement payment",
    reason: "Correct bank amount",
  });
  assert.equal(
    (await req("GET", `${root}/${sid}`)).data.bill_due_paise,
    150000,
  );
  // Month boundaries: an older account balance remains visible, but old payments are not current-month payments.
  const previous = new Date();
  previous.setMonth(previous.getMonth() - 1);
  previous.setDate(10);
  const oldDay = localDate(previous);
  const old = await post(root, {
    name: "Previous-month account",
    account_type: "CASH_LOAN",
  });
  await post(`${root}/${old.account_id}/transactions`, {
    kind: "CASH_BORROW",
    amount_paise: 100000,
    date: oldDay,
    description: "Earlier cash loan",
  });
  await post(`${root}/${old.account_id}/transactions`, {
    kind: "PAYMENT",
    amount_paise: 30000,
    date: oldDay,
    description: "Earlier repayment",
  });
  const prior = (await req("GET", `summary?month=${oldDay.slice(0, 7)}`)).data;
  const now = (await req("GET", `summary?month=${day.slice(0, 7)}`)).data;
  assert.equal(prior.dept_payment, 300);
  assert.ok(now.ending_debt >= 700);
  // Savings suggestions are not actual transfers and do not reduce available cash.
  db.prepare(
    "INSERT INTO income_entries(id,date,month,category,source,amount) VALUES(?,?,?,?,?,?)",
  ).run("salary", day, day.slice(0, 7), "sal", "Salary", 100000);
  const noTransfer = (await req("GET", `summary?month=${day.slice(0, 7)}`))
    .data;
  db.prepare(
    "INSERT INTO monthly_budget_summaries(month,reg_savings) VALUES(?,?)",
  ).run(day.slice(0, 7), 3000);
  const transfer = (await req("GET", `summary?month=${day.slice(0, 7)}`)).data;
  assert.equal(noTransfer.remaining - transfer.remaining, 3000);
  assert.equal(transfer.total_savings, 3000);
  assert.equal(
    transfer.overhead_savings,
    Math.max(0, Math.round(transfer.remaining * 50) / 100),
  );
  // Savings edits must not save calculated closing debt as a new opening balance.
  db.prepare(
    "UPDATE monthly_budget_summaries SET starting_debt=1234 WHERE month=?",
  ).run(day.slice(0, 7));
  assert.equal(
    (
      await req("PUT", `summary/${day.slice(0, 7)}`, {
        reg_savings: 500,
        ext_savings: 100,
      })
    ).status,
    200,
  );
  assert.equal(
    db
      .prepare(
        "SELECT starting_debt FROM monthly_budget_summaries WHERE month=?",
      )
      .get(day.slice(0, 7))!.starting_debt,
    1234,
  );
  assert.equal(
    (await req("PUT", `summary/${day.slice(0, 7)}`, { starting_debt: 99999 }))
      .status,
    400,
  );
  const snapshot = (await req("GET", `${root}/migration/backup`)).data;
  assert.ok(snapshot.tables.borrowing_transactions.length > 0);
  assert.ok(snapshot.tables.expenses.length > 0);
  console.log(
    `${adapter}: balance, statement, partial payment, correction, reversal, overpayment, credit reuse, idempotency, conflict rollback, validation, backdating, migration and reporting passed`,
  );
  db.close();
}
