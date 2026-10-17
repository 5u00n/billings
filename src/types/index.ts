export type DocType = 'BILL OF SUPPLY' | 'INVOICE' | 'ESTIMATE' | 'PROFORMA' | 'RECEIPT';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';

export interface LineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Organization {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at?: string;
  // Stats aggregated
  total_invoiced?: number;
  total_paid?: number;
  balance_due?: number;
  invoices_count?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  doc_type: DocType;
  organization_id: string;
  organization?: Organization;
  invoice_date: string;
  terms: string;
  due_date: string;
  items: LineItem[];
  sub_total: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string;
  payment_options: string;
  status: InvoiceStatus;
  copy_type?: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' | 'NONE';
  bankName?: string;
  accountNumber?: string;
  accountType?: string;
  ifscCode?: string;
  accountHolder?: string;
  upiId?: string;
  showBankDetails?: boolean;
  showUpi?: boolean;
  showQr?: boolean;
  hide_qty?: boolean;
  created_at?: string;
}

export interface UserProfile {
  name: string;
  addressLine1: string;
  addressLine2: string;
  cityStateZip: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  udyamNumber: string;
  showUdyamOnBill: boolean;
  bankName: string;
  accountType?: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  upiId: string;
  showBankDetailsOnBill: boolean;
  showUpiOnBill: boolean;
  showQrOnBill: boolean;
  defaultHideQty?: boolean;
  defaultNotes: string;
  defaultTerms: string;
  signatureText: string;
  logoUrl?: string;
  customQrUrl?: string;
}

export interface NumberingSettings {
  billOfSupplyPrefix: string;
  invoicePrefix: string;
  estimatePrefix: string;
  receiptPrefix: string;
  nextNumberBOS: number;
  nextNumberINV: number;
  nextNumberEST: number;
  nextNumberREC: number;
}

export interface AppSettings {
  profile: UserProfile;
  numbering: NumberingSettings;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  default_rate: number;
}

export type ScheduleType = 'MONTHLY_SUBSCRIPTION' | 'MILESTONE_LIST';
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface MilestoneItem {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  invoiceId?: string;
  invoiceNumber?: string;
  generatedDate?: string;
}

export interface RecurringSchedule {
  id: string;
  name: string;
  organization_id: string;
  org_name?: string;
  schedule_type: ScheduleType;
  doc_type: DocType;
  monthly_day?: number;
  total_amount?: number;
  milestones?: MilestoneItem[];
  items: LineItem[];
  terms: string;
  notes?: string;
  status: ScheduleStatus;
  last_run_date?: string;
  next_run_date?: string;
  created_at?: string;
}

// ----------------- BUDGET & EXPENSE SYSTEM -----------------

export type TaxClassification =
  | 'BUSINESS_DEDUCTIBLE'
  | 'PERSONAL_DRAWINGS'
  | 'MIXED_APPORTIONED'
  | 'CAPITAL_ASSET'
  | 'CAPITAL_INTRODUCED';

export type ExpenseCategory = 'reg' | 'ext';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM or MMM
  category: ExpenseCategory; // reg: Regular, ext: Extra
  tag?: string; // Food, Travel, Fuel, Gadgets, etc.
  description: string;
  amount: number;
  payment_method?: string;
  notes?: string;
  tax_classification?: TaxClassification;
  business_percentage?: number; // 0 - 100 for mixed expenses
  gst_rate?: number; // 0, 5, 12, 18, 28
  gst_itc_eligible?: boolean;
  has_invoice_voucher?: boolean;
  voucher_ref?: string;
  created_at?: string;
}

// ----------------- INDIAN TAX & COMPLIANCE SYSTEM -----------------

export type TaxReminderCategory =
  | 'ADVANCE_TAX'
  | 'ITR_FILING'
  | 'GST_RETURN'
  | 'JHARKHAND_PT'
  | 'BANK_AUDIT'
  | 'CUSTOM';

export type TaxReminderPriority = 'HIGH' | 'MEDIUM' | 'NORMAL';
export type TaxReminderFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONCE';

export interface TaxReminder {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  category: TaxReminderCategory;
  is_recurring: boolean;
  frequency?: TaxReminderFrequency;
  is_completed: boolean;
  completed_at?: string;
  notify_before_days: number;
  priority: TaxReminderPriority;
  penalty_note?: string;
  action_url?: string;
  created_at?: string;
}

export interface TaxAuditViolation {
  id: string;
  date: string;
  description: string;
  amount: number;
  ruleCode: 'SEC_40A3' | 'SEC_17_5' | 'SFT_CASH' | 'DRAWINGS_AS_EXPENSE' | 'MISSING_VOUCHER';
  ruleTitle: string;
  severity: 'DANGER' | 'WARNING';
  suggestion: string;
}

export interface TaxAuditSummary {
  financialYear: string;
  assessmentYear: string;
  grossTurnover: number;
  totalInvoicesCount: number;
  totalCollections: number;
  businessDeductibleExpenses: number;
  personalDrawings: number;
  mixedExpensesTotal: number;
  mixedExpensesDeductible: number;
  capitalAssetsTotal: number;
  capitalIntroduced: number;
  bankChargesDeductible: number;
  sbiMabRequired: number;
  sbiMabStatus: 'COMPLIANT' | 'BELOW_MAB_RISK';
  totalDeductionsAllowed: number;
  netActualProfit: number;
  profitMarginActual: number;
  presumptive44ADAProfit: number;
  presumptive44ADProfit: number;
  totalCashDeposits: number;
  totalCashWithdrawals: number;
  sftLimitCurrentAccount: number;
  sftCashUtilizationPercent: number;
  violations: TaxAuditViolation[];
  complianceScore: number;
  taxLiabilityNewRegime: number;
  taxLiabilityOldRegime: number;
  advanceTaxSchedule: Array<{
    quarter: string;
    dueDate: string;
    percentage: number;
    amountDue: number;
    status: 'PAID' | 'DUE' | 'UPCOMING';
    description: string;
  }>;
}

export type SbiPpsStatus = 'PENDING_REGISTRATION' | 'CONFIRMED_IN_SBI_PPS' | 'CLEARED' | 'CANCELLED';

export interface SbiPpsCheque {
  id: string;
  cheque_number: string;
  payee_name: string;
  amount: number;
  issue_date: string;
  account_number: string;
  pps_status: SbiPpsStatus;
  pps_reference?: string;
  notes?: string;
  created_at?: string;
}

export interface SbiParsedTransaction {
  id: string;
  date: string;
  value_date?: string;
  description: string;
  ref_no?: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance?: number;
  suggested_classification: TaxClassification;
  suggested_category: string;
  suggested_bus_pct: number;
  selected: boolean;
}

export type IncomeCategory = 'fl' | 'sal' | 'ext' | 'saving' | 'rt';

export interface IncomeEntry {
  id: string;
  date: string;
  month: string;
  category: IncomeCategory;
  source: string;
  amount: number;
  invoice_id?: string;
  notes?: string;
  created_at?: string;
}

export interface CurrentAccountWithdrawal {
  id: string;
  date: string;
  month: string;
  amount: number;
  notes?: string;
  income_entry_id?: string;
  created_at?: string;
}

export interface CurrentAccountStatus {
  total_revenue_paid: number;
  total_withdrawn: number;
  available_balance: number;
  unpaid_receivables: number;
  paid_invoices: Array<{
    id: string;
    invoice_number: string;
    date: string;
    org_name: string;
    amount_paid: number;
    total: number;
    status: string;
  }>;
  unpaid_invoices: Array<{
    id: string;
    invoice_number: string;
    date: string;
    org_name: string;
    balance_due: number;
    total: number;
    status: string;
  }>;
  withdrawals: CurrentAccountWithdrawal[];
}

export type BorrowType = 'BORROW' | 'RETURN' | 'LENT';

export interface BorrowRecord {
  id: string;
  date: string;
  month: string;
  type: BorrowType;
  person: string;
  reason?: string;
  amount: number;
  status: 'PENDING' | 'SETTLED';
  created_at?: string;
}

export interface MonthlyBudgetSummary {
  month: string; // e.g. '2026-10' or 'Oct'
  starting_debt: number;
  previous_remaining: number;
  salary: number;
  freelance: number;
  returns: number;
  ext_income: number;
  total_income: number;
  total_inflow?: number;
  reg_savings: number;
  ext_savings: number;
  overhead_savings?: number;
  total_savings: number;
  reg_expense: number;
  ext_expense: number;
  total_expense: number;
  dept_payment: number;
  borrow_amount: number;
  overhead: number;
  remaining: number;
  ending_debt: number;
  notes?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  target_amount: number;
  savings_percent: number;
  saved_amount: number;
  target_date?: string;
  status: 'IN_PROGRESS' | 'REACHED';
  notes?: string;
  created_at?: string;
}

export interface BudgetAllocationRule {
  id: string;
  category: string;
  percentage: number;
  display_order: number;
  planned_amount?: number;
  actual_spent?: number;
  variance?: number;
}

