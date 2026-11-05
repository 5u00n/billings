import React, { useEffect, useRef, useState } from "react";
import {
  activeTransactions,
  localDate,
  type BorrowingAccount,
  type BorrowingTransaction,
  type BorrowingBill,
} from '@/lib/borrowing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CardSpotlight } from '@/components/aceternity/card-spotlight';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          New borrowing account
        </Button>
      ) : (
        <div className="space-y-3 p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
          <label className="block text-sm font-medium">
            Account name
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SBI Credit Card / Slice / lender name"
            />
          </label>
          <div className="text-sm font-medium space-y-1">
            <span>Account type</span>
            <Select value={type} onValueChange={(val) => setType(val)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREDIT">Credit / Pay later</SelectItem>
                <SelectItem value="CASH_LOAN">Cash loan / person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="block text-sm font-medium">
            Opening debt in ₹ (negative for credit)
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Opening date
            <Input
              className="mt-1"
              type="date"
              max={localDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Explanation
            <Input
              className="mt-1"
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
            <p role="alert" className="text-red-600 text-sm">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              disabled={busy}
              onClick={create}
            >
              Create account
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
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
    <div className="space-y-1">
      <span className="block text-sm font-medium">Borrowing account</span>
      <Select value={value} onValueChange={(val) => onChange(val)}>
        <SelectTrigger className="h-10 text-sm">
          <SelectValue placeholder="Select an account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name} · {a.credit_paise ? `${money(a.credit_paise)} credit` : money(a.outstanding_paise) + " outstanding"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-5 max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <DialogTitle className="sr-only">Record account transaction</DialogTitle>
        <DialogDescription className="sr-only">Record or modify a borrowing account transaction</DialogDescription>
        <TransactionForm
          initialAccount={initialAccount}
          initialKind={initialKind}
          onSaved={onSaved}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
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
      <div className="text-sm font-medium space-y-1">
        <span>Transaction</span>
        <Select value={kind} onValueChange={(val) => setKind(val)}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Transaction type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PAYMENT">Bulk repayment</SelectItem>
            <SelectItem value="CREDIT_PURCHASE">Credit purchase</SelectItem>
            <SelectItem value="CASH_BORROW">Cash borrowed</SelectItem>
            <SelectItem value="FEE">Interest / fee</SelectItem>
            <SelectItem value="ADJUSTMENT">Debt adjustment (no cash movement)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="block text-sm font-medium">
        Amount in ₹
        <Input
          required
          className="mt-1"
          type="number"
          step="0.01"
          min={kind === "ADJUSTMENT" ? undefined : "0.01"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Date
        <Input
          required
          className="mt-1"
          type="date"
          max={localDate()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Description
        <Input
          className="mt-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="text-sm font-medium space-y-1">
        <span>Payment method</span>
        <Select value={method} onValueChange={(val) => setMethod(val)}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UPI / Bank">UPI / Bank</SelectItem>
            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="Debit Card">Debit Card</SelectItem>
            <SelectItem value="Credit Card">Credit Card</SelectItem>
            <SelectItem value="Slice Borrow">Slice Borrow</SelectItem>
            <SelectItem value="Amazon Borrow">Amazon Borrow</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="block text-sm font-medium">
        Notes{kind === "ADJUSTMENT" ? " (required)" : ""}
        <textarea
          className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 text-sm"
          required={kind === "ADJUSTMENT"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {correction && (
        <label className="block text-sm font-medium">
          Correction reason
          <Input
            required
            className="mt-1"
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
            <p className="text-xs mt-1 text-slate-500">
              One payment against the account. No purchase matching; this is
              cash outflow, not another spending expense.
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-2">
        <Button disabled={busy || !detail}>
          Save transaction
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
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
      <label className="block text-sm font-medium">
        Remaining bill amount in ₹
        <Input
          required
          type="number"
          step="0.01"
          min="0"
          className="mt-1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        As of
        <Input
          required
          type="date"
          max={localDate()}
          className="mt-1"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Due date
        <Input
          required
          type="date"
          className="mt-1"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Notes
        <Input
          className="mt-1"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}
      <Button disabled={busy}>
        Save bill
      </Button>
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
        <label className="block text-sm font-medium">
          Confirmed outstanding today in ₹ (negative for credit)
          <Input
            required
            type="number"
            step="0.01"
            className="mt-1"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Reconciliation explanation
          <Input
            required
            className="mt-1"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I reviewed the selected records and confirmed the balance.
        </label>
        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}
        <Button disabled={busy || !selected.length}>
          Back up and convert reviewed records
        </Button>
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
          <CardSpotlight
            key={a.id}
            color={selected === a.id ? "rgba(59, 130, 246, 0.25)" : "rgba(148, 163, 184, 0.15)"}
            onClick={() => setSelected(a.id)}
            className={`text-left rounded-xl p-4 cursor-pointer transition-all duration-200 ${
              selected === a.id
                ? "border-blue-600 ring-2 ring-blue-500/20 shadow-md"
                : "border-slate-200/90 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">{a.name}</h3>
              <Badge variant={a.credit_paise ? "success" : "secondary"}>
                {a.account_type === "CREDIT" ? "Credit" : "Cash Loan"}
              </Badge>
            </div>
            <p className="text-lg font-bold font-mono mt-2 text-slate-900 dark:text-slate-100">
              {a.credit_paise
                ? money(a.credit_paise) + " credit"
                : money(a.outstanding_paise) + " outstanding"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bill due: <span className="font-semibold text-slate-700 dark:text-slate-300">{money(a.bill_due_paise)}</span>
              {a.bill ? " · Due " + a.bill.due_date : ""}
            </p>
          </CardSpotlight>
        ))}
      </div>
      {detail && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-lg">{detail.name}</h3>
            <Button size="sm" onClick={() => setPayment(true)}>
              Record payment / borrowing
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              Refresh
            </Button>
          </div>
          <p className="text-sm">
            Outside current bill: {money(detail.not_billed_paise)} · Credit:{" "}
            {money(detail.credit_paise)}
          </p>
          <div className="overflow-x-auto">
            <Table className="w-full text-sm text-left">
              <caption className="text-left font-semibold py-2">
                Supporting account transactions · all dates
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Debt change</TableHead>
                  <TableHead>Cash change</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.transactions.map((t) => {
                  const active = activeTransactions(detail.transactions).some(
                    (a) => a.id === t.id,
                  );
                  return (
                    <TableRow key={t.id} className="border-t">
                      <TableCell className="py-2">{t.date}</TableCell>
                      <TableCell>
                        {t.description}
                        <small className="block text-slate-500">{t.notes}</small>
                      </TableCell>
                      <TableCell>
                        {t.kind}
                        {!active && t.kind !== "REVERSAL" ? " (reversed)" : ""}
                      </TableCell>
                      <TableCell>{money(t.debt_delta_paise)}</TableCell>
                      <TableCell>{money(t.cash_delta_paise)}</TableCell>
                      <TableCell>
                        {active && t.kind !== "OPENING" && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => setCorrection(t)}
                            >
                              Correct
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => reverse(t)}
                            >
                              Reverse
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
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
            </Button>
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
        <Dialog open onOpenChange={(open) => !open && setCorrection(null)}>
          <DialogContent className="p-5 max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
            <DialogTitle className="sr-only">Correct account transaction</DialogTitle>
            <DialogDescription className="sr-only">Update an existing transaction record for this borrowing account</DialogDescription>
            <TransactionForm
              initialAccount={selected}
              initialKind={correction.kind}
              correction={correction}
              onClose={() => setCorrection(null)}
              onSaved={refresh}
            />
          </DialogContent>
        </Dialog>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-5 max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <DialogTitle className="sr-only">Correct credit expense</DialogTitle>
        <DialogDescription className="sr-only">Update and correct credit expense transaction details</DialogDescription>
        <TransactionForm
          initialAccount={accountId}
          initialKind={transaction.kind}
          correction={transaction}
          onSaved={onSaved}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
