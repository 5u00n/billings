import React, { useEffect, useState } from "react";
import { formatINR } from '@/utils/numberToWords';
export function BudgetLedgerSources({
  month,
  refreshKey,
}: {
  month: string;
  refreshKey?: unknown;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    fetch(`/api/budget/month-bundle?month=${month}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load supporting records");
        return res.json();
      })
      .then((d) => {
        if (live) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [month, refreshKey]);
  return (
    <details className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900">
      <summary className="font-semibold cursor-pointer">
        Where do these numbers come from? ·{" "}
        {month === "all" ? "All months" : month}
      </summary>
      {error && <p role="alert">{error}</p>}
      {data && (
        <div className="space-y-4 mt-3 text-sm">
          <p>
            Spending includes credit purchases. Available cash deducts cash
            spending and loan payments once. Pending returns are excluded.
            Savings suggestions do not move money.
          </p>
          <dl className="grid sm:grid-cols-2 gap-2">
            <div>
              Cash spending: ₹{formatINR(data.summary?.cash_expense || 0)}
            </div>
            <div>
              Credit spending: ₹{formatINR(data.summary?.credit_expense || 0)}
            </div>
            <div>
              Debt repayments: ₹{formatINR(data.summary?.dept_payment || 0)}
            </div>
            <div>
              Recorded savings transfers: ₹
              {formatINR(data.summary?.total_savings || 0)}
            </div>
            <div>
              Available cash: ₹{formatINR(data.summary?.remaining || 0)}
            </div>
            <div>
              Suggested savings only: ₹
              {formatINR(data.summary?.overhead_savings || 0)}
            </div>
          </dl>
          <p className="text-xs text-slate-500">
            Opening cash and legacy debt come from the earliest entered monthly
            balance. Later cash balances are calculated carryovers. Review
            legacy balances before converting old accounts.
          </p>
          {[
            ["Income records", data.incomes],
            ["Spending records", data.expenses],
            ["Legacy borrowing / returns", data.borrows],
            ["Account transactions", data.account_transactions],
          ].map(([title, rows]: any) => (
            <details key={title}>
              <summary>
                {title} ({rows?.length || 0})
              </summary>
              <ul className="divide-y">
                {rows?.map((r: any) => (
                  <li key={r.id} className="py-2">
                    {r.date} · {r.description || r.source || r.person} · ₹
                    {formatINR(r.amount ?? r.amount_paise / 100)}{" "}
                    {r.kind || r.status || ""}
                    <span className="block text-xs text-slate-500">
                      {r.id}
                      {r.migrated_account_id
                        ? " · Converted to borrowing account"
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </details>
  );
}
