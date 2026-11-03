import { handleBorrowing, LedgerError } from "./service";
import { readBudgetLedger } from "./reporting";
import type { LedgerStore } from "./store";
const ROOT = "/api/budget/borrowing-accounts";
export async function borrowingRouter(
  store: LedgerStore,
  method: string,
  url: URL,
  body: any = {},
  key = "",
) {
  const path = url.pathname;
  try {
    if (path === ROOT || path.startsWith(ROOT + "/"))
      return await handleBorrowing(
        store,
        method,
        path,
        body,
        key,
        url.searchParams.get("as_of") || undefined,
      );
    if (
      /^\/api\/budget\/summary\/\d{4}-(0[1-9]|1[0-2])$/.test(path) &&
      method === "PUT"
    ) {
      await store.init();
      if (
        [
          "starting_debt",
          "previous_remaining",
          "dept_payment",
          "borrow_amount",
        ].some((k) => k in body)
      )
        throw new LedgerError(
          "Debt, borrowing and carryover are derived from records. Use account transactions to change debt.",
        );
      const reg = Number(body.reg_savings ?? 0),
        ext = Number(body.ext_savings ?? 0);
      if (
        ![reg, ext].every(
          (v) =>
            Number.isFinite(v) &&
            v >= 0 &&
            Number.isSafeInteger(Math.round(v * 100)),
        )
      )
        throw new LedgerError(
          "Savings transfers must be valid non-negative amounts",
        );
      const m = path.split("/").pop()!;
      await store.batch([
        {
          sql: "INSERT INTO monthly_budget_summaries(month,reg_savings,ext_savings) VALUES(?,?,?) ON CONFLICT(month) DO UPDATE SET reg_savings=excluded.reg_savings,ext_savings=excluded.ext_savings",
          args: [m, reg, ext],
        },
      ]);
      return { status: 200, data: { success: true } };
    }
    const read =
      [
        "/api/budget/summary",
        "/api/budget/month-bundle",
        "/api/budget/monthly-breakdown",
        "/api/budget/expenses",
        "/api/budget/months",
        "/api/budget/allocations",
        "/api/budget/borrow",
      ].includes(path) && method === "GET";
    const managed = /^\/api\/budget\/(expenses|borrow)\/([^/]+)$/.exec(path);
    if (!read && !managed) return null;
    await store.init();
    if (managed && ["PUT", "DELETE"].includes(method)) {
      const link =
        managed[1] === "expenses"
          ? await store.all(
              "SELECT * FROM borrowing_expense_links WHERE expense_id=?",
              [managed[2]],
            )
          : await store.all(
              "SELECT * FROM borrowing_legacy_links WHERE borrow_id=?",
              [managed[2]],
            );
      if (link.length)
        throw new LedgerError(
          "This record belongs to a borrowing account. Correct or reverse it from that account’s transaction history.",
          409,
        );
    }
    if (!read) return null;
    const month =
      url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    if (month !== "all" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new LedgerError("Invalid month");
    const b = await readBudgetLedger(store, month);
    const data = path.endsWith("/summary")
      ? b.summary
      : path.endsWith("/monthly-breakdown")
        ? b.breakdown
        : path.endsWith("/expenses")
          ? b.expenses
          : path.endsWith("/borrow")
            ? b.borrows
            : path.endsWith("/months")
              ? b.months
              : path.endsWith("/allocations")
                ? {
                    month,
                    total_income: b.total_income,
                    allocations: b.allocations,
                  }
                : b;
    return { status: 200, data };
  } catch (e: any) {
    return {
      status: e instanceof LedgerError ? e.status : 500,
      data: {
        error:
          e instanceof LedgerError
            ? e.message
            : "Borrowing ledger operation failed",
      },
    };
  }
}
