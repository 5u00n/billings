export type BorrowingKind =
  | "CREDIT_PURCHASE"
  | "CASH_BORROW"
  | "PAYMENT"
  | "FEE"
  | "OPENING"
  | "ADJUSTMENT"
  | "REVERSAL";
export interface BorrowingTransaction {
  id: string;
  account_id: string;
  date: string;
  kind: BorrowingKind;
  amount_paise: number;
  debt_delta_paise: number;
  cash_delta_paise: number;
  description: string;
  payment_method: string;
  notes: string;
  original_record_id?: string;
  reverses_id?: string;
  created_at?: string;
  sequence?: number;
}
export interface BorrowingBill {
  id: string;
  account_id: string;
  as_of_date: string;
  due_date: string;
  amount_paise: number;
  notes: string;
  sequence?: number;
}
export interface BorrowingAccount {
  id: string;
  name: string;
  account_type: "CREDIT" | "CASH_LOAN";
  version: number;
  balance_paise: number;
  outstanding_paise: number;
  credit_paise: number;
  bill_due_paise: number;
  not_billed_paise: number;
  bill: BorrowingBill | null;
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function activeTransactions(
  rows: BorrowingTransaction[],
): BorrowingTransaction[] {
  const reversed = new Set(
    rows.filter((t) => t.reverses_id).map((t) => t.reverses_id),
  );
  return rows.filter((t) => t.kind !== "REVERSAL" && !reversed.has(t.id));
}
export function accountBalance(
  rows: BorrowingTransaction[],
  asOf = "9999-12-31",
): number {
  return activeTransactions(rows)
    .filter((t) => t.date <= asOf)
    .reduce((s, t) => s + t.debt_delta_paise, 0);
}
export function accountView(
  account: any,
  rows: BorrowingTransaction[],
  bills: BorrowingBill[],
  asOf = localDate(),
): BorrowingAccount {
  const balance = accountBalance(rows, asOf);
  // Each statement replaces the prior statement; its entered value is remaining due as of that day.
  const bill =
    bills
      .filter((b) => b.as_of_date <= asOf)
      .sort(
        (a, b) =>
          b.as_of_date.localeCompare(a.as_of_date) ||
          (b.sequence || 0) - (a.sequence || 0),
      )[0] || null;
  const payments = bill
    ? activeTransactions(rows)
        .filter(
          (t) =>
            t.kind === "PAYMENT" &&
            (t.date > bill.as_of_date ||
              (t.date === bill.as_of_date &&
                (t.sequence || 0) > (bill.sequence || 0))) &&
            t.date <= asOf,
        )
        .reduce((s, t) => s + t.amount_paise, 0)
    : 0;
  const due = bill ? Math.max(0, bill.amount_paise - payments) : 0;
  return {
    ...account,
    balance_paise: balance,
    outstanding_paise: Math.max(0, balance),
    credit_paise: Math.max(0, -balance),
    bill_due_paise: due,
    not_billed_paise: Math.max(0, balance - due),
    bill,
  };
}
