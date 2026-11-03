import React, { useEffect, useRef, useState } from "react";
import {
  activeTransactions,
  localDate,
  type BorrowingAccount,
  type BorrowingTransaction,
  type BorrowingBill,
} from "../../lib/borrowing";
const ROOT = "/api/budget/borrowing-accounts";
const field =
  "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 text-sm";
const button =
  "rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium disabled:opacity-50";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n / 100,
  );
export async function borrowingRequest(path: string, body?: any, key?: string) {
  const res = await fetch(
    ROOT + path + (path.includes("?") ? "&" : "?") + "as_of=" + localDate(),
    body
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": key || crypto.randomUUID(),
          },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Unable to load borrowing accounts");
  return data;
}
function useAccounts() {
  const [accounts, setAccounts] = useState<BorrowingAccount[]>([]);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setAccounts(await borrowingRequest(""));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
    window.addEventListener("borrowing-changed", load);
    return () => window.removeEventListener("borrowing-changed", load);
  }, []);
  return { accounts, error, load };
}
export function announceBorrowingChange() {
  window.dispatchEvent(new Event("borrowing-changed"));
}
function NewAccount({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [type, setType] = useState("CREDIT"),
    [opening, setOpening] = useState("0"),
    [date, setDate] = useState(localDate()),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const request = useRef(crypto.randomUUID());
  const create = async () => {
    setBusy(true);
    try {
      const r = await borrowingRequest(
        "",
        {
          name,
          account_type: type,
          opening_paise: Math.round(Number(opening) * 100),
          date,
          notes,
        },
        request.current,
      );
      request.current = crypto.randomUUID();
      announceBorrowingChange();
      onCreated(r.account_id);
      setOpen(false);
      setName("");
      setNotes("");
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {!open ? (
        <button type="button" className={button} onClick={() => setOpen(true)}>
          New borrowing account
        </button>
      ) : (
        <div className="space-y-3 p-3 border rounded-xl">
          <label className="block">
            Account name
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SBI Credit Card / Slice / lender name"
            />
          </label>
          <label className="block">
            Account type
            <select
              className={field}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="CREDIT">Credit / Pay later</option>
              <option value="CASH_LOAN">Cash loan / person</option>
            </select>
          </label>
          <label className="block">
            Opening debt in ₹ (negative for credit)
            <input
              className={field}
              type="number"
              step="0.01"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </label>
          <label className="block">
            Opening date
            <input
              className={field}
              type="date"
              max={localDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block">
            Explanation
            <input
              className={field}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="New account, or explain forgotten / untracked debt"
            />
          </label>
          <p className="text-xs text-slate-500">
            For legacy migration, create a zero-balance account first. Review
            and reconcile old records from the accounts page.
          </p>
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={create}
          >
            Create account
          </button>{" "}
          <button
            type="button"
            className={button}
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
export function BorrowingAccountSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { accounts, error } = useAccounts();
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Borrowing account
        <select
          required
          className={field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select an account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ·{" "}
              {a.credit_paise
                ? `${money(a.credit_paise)} credit`
                : money(a.outstanding_paise) + " outstanding"}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <NewAccount onCreated={onChange} />
    </div>
  );
}
type Detail = BorrowingAccount & {
  transactions: BorrowingTransaction[];
  bills: BorrowingBill[];
};
export function AccountPaymentDialog({
  onClose,
  onSaved,
  initialAccount = "",
  initialKind = "PAYMENT",
}: {
  onClose: () => void;
  onSaved: () => void;
  initialAccount?: string;
  initialKind?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Record account transaction"
    >
      <div className="bg-white dark:bg-slate-950 p-5 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <TransactionForm
          initialAccount={initialAccount}
          initialKind={initialKind}
          onSaved={onSaved}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
function TransactionForm({
  initialAccount,
  initialKind,
  onSaved,
  onClose,
  correction,
}: {
  initialAccount: string;
  initialKind: string;
  onSaved: () => void;
  onClose: () => void;
  correction?: BorrowingTransaction;
}) {
  const [accountId, setAccountId] = useState(initialAccount),
    [kind, setKind] = useState(correction?.kind || initialKind),
    [amount, setAmount] = useState(
      correction ? String(correction.amount_paise / 100) : "",
    ),
    [date, setDate] = useState(correction?.date || localDate()),
    [description, setDescription] = useState(correction?.description || ""),
    [notes, setNotes] = useState(correction?.notes || ""),
    [method, setMethod] = useState(correction?.payment_method || "UPI / Bank"),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState<Detail | null>(null);
  const request = useRef(crypto.randomUUID());
  const currentAccount = useRef(accountId);
  currentAccount.current = accountId;
  useEffect(() => {
    let active = true;
    setDetail(null);
    if (accountId)
      borrowingRequest("/" + accountId)
        .then((value) => {
          if (active) setDetail(value);
        })
        .catch((e: any) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [accountId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || detail.id !== accountId) return;
    setBusy(true);
    try {
      await borrowingRequest(
        `/${accountId}/transactions${correction ? "/" + correction.id : ""}`,
        {
          kind,
          amount_paise: Math.round(Number(amount) * 100),
          date,
          description:
            description || (kind === "PAYMENT" ? "Account payment" : kind),
          payment_method: method,
          notes,
          reason,
          expected_version: detail.version,
        },
        request.current,
      );
      announceBorrowingChange();
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      if (e.message.includes("changed")) {
        request.current = crypto.randomUUID();
        borrowingRequest("/" + accountId)
          .then((value) => {
            if (currentAccount.current === accountId) setDetail(value);
          })
          .catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };
  const projected = detail
    ? detail.balance_paise +
      (kind === "PAYMENT" ? -1 : 1) * Math.round(Number(amount || 0) * 100) -
      (correction?.debt_delta_paise || 0)
    : 0;
  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <h2 className="text-lg font-bold">
        {correction
          ? "Correct account transaction"
          : "Record account transaction"}
      </h2>
      {correction ? (
        <p>{detail?.name}</p>
      ) : (
        <BorrowingAccountSelector value={accountId} onChange={setAccountId} />
      )}
      <label className="block">
        Transaction
        <select
          className={field}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="PAYMENT">Bulk repayment</option>
          <option value="CREDIT_PURCHASE">Credit purchase</option>
          <option value="CASH_BORROW">Cash borrowed</option>
          <option value="FEE">Interest / fee</option>
          <option value="ADJUSTMENT">Debt adjustment (no cash movement)</option>
        </select>
      </label>
      <label className="block">
        Amount in ₹
        <input
          required
          className={field}
          type="number"
          step="0.01"
          min={kind === "ADJUSTMENT" ? undefined : "0.01"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="block">
        Date
        <input
          required
          className={field}
          type="date"
          max={localDate()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="block">
        Description
        <input
          className={field}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="block">
        Payment method
        <select
          className={field}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option>UPI / Bank</option>
          <option>Bank Transfer</option>
          <option>Cash</option>
          <option>Debit Card</option>
          <option>Credit Card</option>
          <option>Slice Borrow</option>
          <option>Amazon Borrow</option>
        </select>
      </label>
      <label className="block">
        Notes{kind === "ADJUSTMENT" ? " (required)" : ""}
        <textarea
          className={field}
          required={kind === "ADJUSTMENT"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {correction && (
        <label className="block">
          Correction reason
          <input
            required
            className={field}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      )}
      {detail && (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
          <p>
            Current:{" "}
            {detail.credit_paise
              ? money(detail.credit_paise) + " credit"
              : money(detail.outstanding_paise) + " outstanding"}
          </p>
          <p>
            After entry: {money(Math.abs(projected))}{" "}
            {projected < 0 ? "credit" : "outstanding"}
          </p>
          {kind === "PAYMENT" && (
            <p className="text-xs mt-1">
              One payment against the account. No purchase matching; this is
              cash outflow, not another spending expense.
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <button className={button} disabled={busy || !detail}>
        Save transaction
      </button>{" "}
      <button type="button" className={button} onClick={onClose}>
        Cancel
      </button>
    </form>
  );
}
function BillForm({
  account,
  onSaved,
}: {
  account: Detail;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(""),
    [date, setDate] = useState(localDate()),
    [due, setDue] = useState(localDate()),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  return (
    <form
      className="space-y-3 border rounded-xl p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await borrowingRequest(
            `/${account.id}/bills`,
            {
              amount_paise: Math.round(Number(amount) * 100),
              as_of_date: date,
              due_date: due,
              notes,
              expected_version: account.version,
            },
            key.current,
          );
          key.current = crypto.randomUUID();
          announceBorrowingChange();
          setError("");
          setAmount("");
          onSaved();
        } catch (e: any) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-bold">Enter / replace current bill</h3>
      <p className="text-xs">
        Enter the lender’s full remaining amount due, including carried arrears.
        This replaces the previous bill and does not add debt. Include payments
        already made on the statement date; payments recorded afterwards reduce
        this bill.
      </p>
      <label className="block">
        Remaining bill amount in ₹
        <input
          required
          type="number"
          step="0.01"
          min="0"
          className={field}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="block">
        As of
        <input
          required
          type="date"
          max={localDate()}
          className={field}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="block">
        Due date
        <input
          required
          type="date"
          className={field}
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
      </label>
      <label className="block">
        Notes
        <input
          className={field}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <button className={button} disabled={busy}>
        Save bill
      </button>
    </form>
  );
}
function MigrationReview({
  account,
  onSaved,
}: {
  account: Detail;
  onSaved: () => void;
}) {
  const [records, setRecords] = useState<any[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [balance, setBalance] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    borrowingRequest("/migration")
      .then((d) => setRecords(d.records))
      .catch((e: any) => setError(e.message));
  }, [account.id]);
  return (
    <details className="border rounded-xl p-4">
      <summary className="cursor-pointer font-semibold">
        Review legacy records for this account
      </summary>
      <form
        className="space-y-3 mt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const backup = await borrowingRequest("/migration/backup");
            const backupUrl = URL.createObjectURL(
              new Blob([JSON.stringify(backup, null, 2)], {
                type: "application/json",
              }),
            );
            const download = document.createElement("a");
            download.href = backupUrl;
            download.download = `borrowing-before-migration-${localDate()}.json`;
            download.click();
            URL.revokeObjectURL(backupUrl);
            await borrowingRequest(
              `/${account.id}/migration`,
              {
                borrow_ids: selected,
                balance_paise: Math.round(Number(balance) * 100),
                date: localDate(),
                notes,
                confirmed,
                expected_version: account.version,
              },
              key.current,
            );
            announceBorrowingChange();
            onSaved();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-sm">
          Select records belonging to {account.name}. A financial snapshot is
          saved before conversion. Settled records stay in legacy history.
          Confirm the actual balance today; any difference becomes an explained
          adjustment.
        </p>
        {records.map((r) => (
          <label key={r.id} className="block border-b py-2 text-sm">
            <input
              type="checkbox"
              disabled={r.status !== "PENDING"}
              checked={selected.includes(r.id)}
              onChange={(e) =>
                setSelected((v) =>
                  e.target.checked
                    ? [...v, r.id]
                    : v.filter((id) => id !== r.id),
                )
              }
            />{" "}
            {r.person} · {r.date} · {money(Math.round(r.amount * 100))} ·{" "}
            {r.status} {r.linked_expense ? "· linked purchase" : ""}
            <span className="block text-xs text-slate-500">{r.reason}</span>
          </label>
        ))}
        <label className="block">
          Confirmed outstanding today in ₹ (negative for credit)
          <input
            required
            type="number"
            step="0.01"
            className={field}
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </label>
        <label className="block">
          Reconciliation explanation
          <input
            required
            className={field}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label className="block">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          I reviewed the selected records and confirmed the balance.
        </label>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <button className={button} disabled={busy || !selected.length}>
          Back up and convert reviewed records
        </button>
      </form>
    </details>
  );
}
export function BorrowingAccountsView({
  onRefresh,
}: {
  onRefresh?: () => void;
}) {
  const { accounts, error, load } = useAccounts();
  const [selected, setSelected] = useState(""),
    [detail, setDetail] = useState<Detail | null>(null),
    [payment, setPayment] = useState(false),
    [correction, setCorrection] = useState<BorrowingTransaction | null>(null),
    [message, setMessage] = useState("");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const refresh = async () => {
    await load();
    if (selected) {
      try {
        const value = await borrowingRequest("/" + selected);
        if (selectedRef.current === selected) {
          setDetail(value);
          setMessage("");
        }
      } catch (e: any) {
        setMessage(e.message);
      }
    }
    onRefresh?.();
  };
  useEffect(() => {
    let active = true;
    setDetail(null);
    if (selected)
      borrowingRequest("/" + selected)
        .then((value) => {
          if (active) setDetail(value);
        })
        .catch((e: any) => {
          if (active) setMessage(e.message);
        });
    return () => {
      active = false;
    };
  }, [selected]);
  useEffect(() => {
    const update = () => {
      if (selected)
        borrowingRequest("/" + selected)
          .then((value) => {
            if (selectedRef.current === selected) setDetail(value);
          })
          .catch(() => {});
    };
    window.addEventListener("borrowing-changed", update);
    return () => window.removeEventListener("borrowing-changed", update);
  }, [selected]);
  const reverse = async (t: BorrowingTransaction) => {
    const reason = prompt("Why are you reversing this transaction?");
    if (!reason || !detail) return;
    try {
      await borrowingRequest(`/${detail.id}/transactions/${t.id}`, {
        reverse_only: true,
        reason,
        expected_version: detail.version,
      });
      announceBorrowingChange();
      await refresh();
    } catch (e: any) {
      setMessage(e.message);
    }
  };
  return (
    <section className="space-y-4 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Borrowing accounts</h2>
          <p className="text-sm text-slate-500">
            Pay a lender or credit account in bulk. Balances include all months.
          </p>
        </div>
        <NewAccount onCreated={setSelected} />
      </div>
      {(error || message) && (
        <p role="alert" className="text-red-600">
          {error || message}
        </p>
      )}
      {!accounts.length && !error && (
        <p>
          Create an account to record borrowing, credit spending and payments.
          Existing records remain below in legacy history.
        </p>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelected(a.id)}
            className={`text-left rounded-xl border p-4 ${selected === a.id ? "border-blue-600" : "border-slate-300 dark:border-slate-700"}`}
          >
            <h3 className="font-bold">{a.name}</h3>
            <p className="text-lg mt-1">
              {a.credit_paise
                ? money(a.credit_paise) + " credit"
                : money(a.outstanding_paise) + " outstanding"}
            </p>
            <p className="text-sm">
              Bill due: {money(a.bill_due_paise)}
              {a.bill ? " · " + a.bill.due_date : ""}
            </p>
          </button>
        ))}
      </div>
      {detail && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-lg">{detail.name}</h3>
            <button className={button} onClick={() => setPayment(true)}>
              Record payment / borrowing
            </button>
            <button className={button} onClick={refresh}>
              Refresh
            </button>
          </div>
          <p className="text-sm">
            Outside current bill: {money(detail.not_billed_paise)} · Credit:{" "}
            {money(detail.credit_paise)}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <caption className="text-left font-semibold py-2">
                Supporting account transactions · all dates
              </caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Debt change</th>
                  <th>Cash change</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {detail.transactions.map((t) => {
                  const active = activeTransactions(detail.transactions).some(
                    (a) => a.id === t.id,
                  );
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="py-2">{t.date}</td>
                      <td>
                        {t.description}
                        <small className="block">{t.notes}</small>
                      </td>
                      <td>
                        {t.kind}
                        {!active && t.kind !== "REVERSAL" ? " (reversed)" : ""}
                      </td>
                      <td>{money(t.debt_delta_paise)}</td>
                      <td>{money(t.cash_delta_paise)}</td>
                      <td>
                        {active && t.kind !== "OPENING" && (
                          <>
                            <button
                              className={button}
                              onClick={() => setCorrection(t)}
                            >
                              Correct
                            </button>{" "}
                            <button
                              className={button}
                              onClick={() => reverse(t)}
                            >
                              Reverse
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <BillForm
            key={detail.id + ":" + detail.version}
            account={detail}
            onSaved={refresh}
          />
          <details className="border rounded-xl p-4">
            <summary>Statement history</summary>
            {detail.bills.map((b) => (
              <p key={b.id} className="py-2 text-sm">
                {b.as_of_date} · {money(b.amount_paise)} remaining when entered
                · due {b.due_date}{" "}
                {b.id === detail.bill?.id ? "· Current" : "· Archived"}{" "}
                {b.notes}
              </p>
            ))}
          </details>
          {detail.transactions.length === 0 && (
            <MigrationReview account={detail} onSaved={refresh} />
          )}
          <details className="text-sm">
            <summary>Download migration / correction snapshots</summary>
            <button
              className={button}
              onClick={async () => {
                try {
                  const data = await borrowingRequest("/backups");
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "borrowing-financial-backups.json";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e: any) {
                  setMessage(e.message);
                }
              }}
            >
              Download backup JSON
            </button>
          </details>
        </div>
      )}
      {payment && (
        <AccountPaymentDialog
          initialAccount={selected}
          onClose={() => setPayment(false)}
          onSaved={refresh}
        />
      )}
      {correction && (
        <div
          className="fixed inset-0 bg-black/50 z-50 p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Correct account transaction"
        >
          <div className="p-5 rounded-xl bg-white dark:bg-slate-950 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <TransactionForm
              initialAccount={selected}
              initialKind={correction.kind}
              correction={correction}
              onClose={() => setCorrection(null)}
              onSaved={refresh}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export function AccountCorrectionDialog({
  accountId,
  transaction,
  onClose,
  onSaved,
}: {
  accountId: string;
  transaction: BorrowingTransaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Correct credit expense"
    >
      <div className="p-5 rounded-xl bg-white dark:bg-slate-950 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <TransactionForm
          initialAccount={accountId}
          initialKind={transaction.kind}
          correction={transaction}
          onSaved={onSaved}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
