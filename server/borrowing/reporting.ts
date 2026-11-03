import {
  activeTransactions,
  accountView,
  localDate,
} from "../../src/lib/borrowing";
import { ledgerData } from "./service";
import type { LedgerStore } from "./store";
const CREDIT_METHODS = new Set([
  "Credit Card",
  "Slice Borrow",
  "Amazon Borrow",
  "Credit Account",
]);
const repayment = (e: any) =>
  !!e.linked_borrow_id || /debt|payback/i.test(e.tag || "");
const sum = (rows: any[], fn: (r: any) => number) =>
  rows.reduce((s, r) => s + (Number(fn(r)) || 0), 0);
export async function readBudgetLedger(store: LedgerStore, month: string) {
  const [data, expenses, incomes, borrows, summaries, goals, rules] =
    await Promise.all([
      ledgerData(store),
      store.all("SELECT * FROM expenses ORDER BY date DESC"),
      store.all("SELECT * FROM income_entries ORDER BY date DESC"),
      store.all("SELECT * FROM borrow_records ORDER BY date DESC"),
      store.all("SELECT * FROM monthly_budget_summaries ORDER BY month"),
      store.all("SELECT * FROM financial_goals"),
      store.all("SELECT * FROM budget_allocation_rules ORDER BY display_order"),
    ]);
  const current = localDate().slice(0, 7);
  const links = new Map(
    data.links.map((x) => [x.expense_id, x.transaction_id]),
  );
  const mapped = new Set(data.legacyLinks.map((x) => x.borrow_id));
  const txs = activeTransactions(data.transactions);
  const available = Array.from(
    new Set([
      current,
      ...expenses.map((e) => e.month),
      ...incomes.map((i) => i.month),
      ...borrows.map((b) => b.month),
      ...summaries.map((s) => s.month),
      ...txs.map((t) => t.date.slice(0, 7)),
    ]),
  )
    .filter((m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m))
    .sort();
  const months = Array.from(
    new Set([...available, ...(month === "all" ? [] : [month])]),
  ).sort();
  const first = summaries[0] || {};
  const openingCash = Number(first.previous_remaining) || 0;
  let cash = Math.max(0, openingCash);
  let legacyDebt = (Number(first.starting_debt) || 0) + Math.max(0, -openingCash);
  const breakdown: any[] = [];
  for (const m of months) {
    const es = expenses.filter((e) => e.month === m);
    const ins = incomes.filter((i) => i.month === m);
    const bs = borrows.filter((b) => b.month === m && !mapped.has(b.id));
    const ts = txs.filter((t) => t.date.startsWith(m));
    const manual = summaries.find((s) => s.month === m) || {};
    const priorCash = cash;
    const beginningDebt =
      legacyDebt +
      sum(data.accounts, (a) =>
        Math.max(
          0,
          accountView(
            a,
            data.transactions.filter((t) => t.account_id === a.id),
            [],
            m + "-00",
          ).balance_paise,
        ),
      ) /
        100;
    const salary = sum(
        ins.filter((i) => i.category === "sal"),
        (i) => i.amount,
      ),
      freelance = sum(
        ins.filter((i) => i.category === "fl"),
        (i) => i.amount,
      );
    const returns =
      sum(
        ins.filter((i) => i.category === "rt"),
        (i) => i.amount,
      ) +
      sum(
        bs.filter((b) => b.type === "RETURN" && b.status === "SETTLED"),
        (b) => b.amount,
      );
    const ext = sum(
      ins.filter((i) => !["sal", "fl", "rt"].includes(i.category)),
      (i) => i.amount,
    );
    const legacyPaid = sum(
      es.filter((e) => repayment(e) && !links.has(e.id)),
      (e) => e.amount,
    );
    const payments =
      sum(
        ts.filter((t) => t.kind === "PAYMENT"),
        (t) => t.amount_paise,
      ) / 100;
    const debtPaid = legacyPaid + payments;
    const ordinary = es.filter((e) => !repayment(e));
    const cashExpense = sum(
      ordinary.filter(
        (e) => !links.has(e.id) && !CREDIT_METHODS.has(e.payment_method),
      ),
      (e) => e.amount,
    );
    const creditExpense = sum(
      ordinary.filter(
        (e) => links.has(e.id) || CREDIT_METHODS.has(e.payment_method),
      ),
      (e) => e.amount,
    );
    const reg = sum(
        ordinary.filter((e) => e.category === "reg"),
        (e) => e.amount,
      ),
      extra = sum(
        ordinary.filter((e) => e.category !== "reg"),
        (e) => e.amount,
      );
    const oldBorrows = bs.filter((b) => b.type === "BORROW");
    const oldCashBorrow = sum(
      oldBorrows.filter(
        (b) => !b.id.startsWith("borrow-cc-") && !b.id.startsWith("borrow-pb-"),
      ),
      (b) => b.amount,
    );
    const cashBorrow =
      oldCashBorrow +
      sum(
        ts.filter((t) => t.kind === "CASH_BORROW"),
        (t) => t.amount_paise,
      ) /
        100;
    const inflow = salary + freelance + returns + ext;
    const savings =
      (Number(manual.reg_savings) || 0) + (Number(manual.ext_savings) || 0);
    const cashBeforeSavings = priorCash + inflow + cashBorrow - cashExpense - debtPaid;
    const netCash = cashBeforeSavings - savings;
    const cashShortfall = Math.max(0, -netCash);
    cash = Math.max(0, netCash);
    legacyDebt += cashShortfall;
    legacyDebt +=
      sum(
        oldBorrows.filter((b) => !b.id.startsWith("borrow-pb-")),
        (b) => b.amount,
      ) - legacyPaid;
    const asOf = m === current ? localDate() : m + "-31";
    const accountViews = data.accounts.map((a) =>
      accountView(
        a,
        data.transactions.filter((t) => t.account_id === a.id),
        data.bills.filter((b) => b.account_id === a.id),
        asOf,
      ),
    );
    const managedDebt = sum(accountViews, (a) => a.outstanding_paise) / 100;
    const creditBalance = sum(accountViews, (a) => a.credit_paise) / 100;
    const overhead = Math.max(0, cashBeforeSavings);
    breakdown.push({
      month: m,
      starting_debt: beginningDebt,
      previous_remaining: priorCash,
      salary,
      freelance,
      returns,
      ext_income: ext,
      total_income_earned: salary + freelance + ext,
      total_income: priorCash + inflow,
      total_inflow: priorCash + inflow,
      reg_expense: reg,
      ext_expense: extra,
      total_expense: reg + extra,
      cash_expense: cashExpense,
      credit_expense: creditExpense,
      dept_payment: debtPaid,
      borrow_amount: cashBorrow,
      reg_savings: Number(manual.reg_savings) || 0,
      ext_savings: Number(manual.ext_savings) || 0,
      total_savings: savings,
      overhead,
      cash_shortfall: cashShortfall,
      overhead_savings: Math.max(0, Math.round(cash * 50) / 100),
      ovh_savings: Math.max(0, Math.round(cash * 50) / 100),
      remaining: cash,
      ending_debt: legacyDebt + managedDebt,
      managed_debt: managedDebt,
      legacy_debt: legacyDebt,
      account_credit: creditBalance,
      notes: manual.notes || "",
      sources: {
        expense_ids: es.map((e) => e.id),
        income_ids: ins.map((i) => i.id),
        borrow_ids: bs.map((b) => b.id),
        transaction_ids: ts.map((t) => t.id),
        opening_summary_month: first.month || null,
      },
    });
  }
  let summary = breakdown.find((r) => r.month === month);
  if (month === "all") {
    const last = breakdown[breakdown.length - 1];
    summary = {
      ...last,
      month: "all",
      starting_debt: (Number(first.starting_debt) || 0) + Math.max(0, -openingCash),
      previous_remaining: Math.max(0, openingCash),
    };
    for (const k of [
      "salary",
      "freelance",
      "returns",
      "ext_income",
      "total_income_earned",
      "reg_expense",
      "ext_expense",
      "total_expense",
      "cash_expense",
      "credit_expense",
      "dept_payment",
      "borrow_amount",
      "reg_savings",
      "ext_savings",
      "total_savings",
    ])
      summary[k] = sum(breakdown, (r) => r[k]);
    summary.total_income =
      summary.previous_remaining +
      summary.salary +
      summary.freelance +
      summary.returns +
      summary.ext_income;
    summary.total_inflow = summary.total_income;
    summary.overhead = last.overhead;
    summary.cash_shortfall = sum(breakdown, (row) => row.cash_shortfall);
    summary.sources = { months: breakdown.map((r) => r.month) };
  }
  const selected = (r: any) => month === "all" || r.month === month;
  const allocations = rules
    .map((r) => ({
      ...r,
      planned_amount: Math.round((summary?.total_inflow || 0) * r.percentage),
      actual_spent: sum(
        expenses
          .filter(selected)
          .filter(
            (e) =>
              !repayment(e) &&
              (r.category === "Essentials"
                ? e.category === "reg"
                : r.category === "Small Assets"
                  ? ["Gadgets", "Accessories"].includes(e.tag)
                  : r.category === "Business Growth"
                    ? ["Services", "Hosting", "Tools"].includes(e.tag)
                    : false),
          ),
        (e) => e.amount,
      ),
    }))
    .map((r) => ({ ...r, variance: r.planned_amount - r.actual_spent }));
  return {
    month,
    summary,
    breakdown,
    months: available.reverse(),
    expenses: expenses
      .filter(selected)
      .map((e) => ({
        ...e,
        borrowing_transaction_id: links.get(e.id) || null,
        borrowing_account_id:
          data.transactions.find((t) => t.id === links.get(e.id))?.account_id ||
          null,
      })),
    incomes: incomes.filter(selected),
    borrows: borrows
      .filter(selected)
      .map((b) => ({
        ...b,
        migrated_account_id:
          data.legacyLinks.find((l) => l.borrow_id === b.id)?.account_id ||
          null,
      })),
    account_transactions: txs.filter(
      (t) => month === "all" || t.date.startsWith(month),
    ),
    account_balances: data.accounts.map((a) =>
      accountView(
        a,
        data.transactions.filter((t) => t.account_id === a.id),
        data.bills.filter((b) => b.account_id === a.id),
      ),
    ),
    goals,
    allocations,
    total_income: summary?.total_inflow || 0,
  };
}
