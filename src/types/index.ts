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
