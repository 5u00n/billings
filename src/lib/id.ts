export type EntityPrefix =
  | 'exp'   // Expense
  | 'inv'   // Invoice
  | 'itm'   // Invoice Item / Catalog Item
  | 'org'   // Organization / Client
  | 'inc'   // Income Entry
  | 'brw'   // Borrow Record
  | 'act'   // Financial / Borrowing Account
  | 'cnt'   // Contact / Lender / Payee
  | 'rpm'   // Debt Repayment
  | 'gol'   // Financial Goal
  | 'cat'   // Expense Category
  | 'rem'   // Tax Reminder
  | 'pps'   // Positive Pay Cheque
  | 'with'; // Withdrawal

/**
 * Generates a clean, collision-proof, type-prefixed UUID in browser or node.
 * Example: "exp_8f12a345-6789-4abc-def0-123456789abc"
 */
export function createEntityId(prefix: EntityPrefix): string {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
  return `${prefix}_${uuid}`;
}

export function isValidEntityId(id: string, expectedPrefix?: EntityPrefix): boolean {
  if (!id || typeof id !== 'string') return false;
  const parts = id.split('_');
  if (parts.length < 2) return false;
  if (expectedPrefix && parts[0] !== expectedPrefix) return false;
  return parts[1].length >= 8;
}

