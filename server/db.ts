import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'records.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode for high performance
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    pincode TEXT,
    country TEXT DEFAULT 'India',
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    doc_type TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    terms TEXT NOT NULL,
    due_date TEXT NOT NULL,
    items_json TEXT NOT NULL,
    sub_total REAL NOT NULL,
    total REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    balance_due REAL NOT NULL,
    notes TEXT,
    payment_options TEXT,
    status TEXT DEFAULT 'issued',
    copy_type TEXT DEFAULT 'ORIGINAL',
    hide_qty INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(organization_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
  );
`);

try {
  db.exec('ALTER TABLE invoices ADD COLUMN hide_qty INTEGER DEFAULT 0');
} catch (e) {
  // column already exists
}

db.exec(`
  CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    default_rate REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recurring_schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'BILL OF SUPPLY',
    monthly_day INTEGER,
    total_amount REAL,
    milestones_json TEXT,
    items_json TEXT,
    terms TEXT DEFAULT 'Due on Receipt',
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE',
    last_run_date TEXT,
    next_run_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(organization_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    category TEXT NOT NULL,
    tag TEXT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'UPI / Bank',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS income_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    category TEXT NOT NULL,
    source TEXT NOT NULL,
    amount REAL NOT NULL,
    invoice_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS borrow_records (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    type TEXT NOT NULL,
    person TEXT NOT NULL,
    reason TEXT,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS monthly_budget_summaries (
    month TEXT PRIMARY KEY,
    starting_debt REAL DEFAULT 0,
    previous_remaining REAL DEFAULT 0,
    dept_payment REAL DEFAULT 0,
    borrow_amount REAL DEFAULT 0,
    reg_savings REAL DEFAULT 0,
    ext_savings REAL DEFAULT 0,
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS financial_goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    savings_percent REAL DEFAULT 0,
    saved_amount REAL DEFAULT 0,
    target_date TEXT,
    status TEXT DEFAULT 'IN_PROGRESS',
    spent_amount REAL DEFAULT 0,
    completed_date TEXT,
    linked_expense_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS budget_allocation_rules (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    percentage REAL NOT NULL,
    display_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tax_reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT NOT NULL,
    category TEXT NOT NULL,
    is_recurring INTEGER DEFAULT 0,
    frequency TEXT DEFAULT 'ONCE',
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT,
    notify_before_days INTEGER DEFAULT 7,
    priority TEXT DEFAULT 'HIGH',
    penalty_note TEXT,
    action_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sbi_pps_cheques (
    id TEXT PRIMARY KEY,
    cheque_number TEXT NOT NULL,
    payee_name TEXT NOT NULL,
    amount REAL NOT NULL,
    issue_date TEXT NOT NULL,
    account_number TEXT DEFAULT '45661497562',
    pps_status TEXT DEFAULT 'PENDING_REGISTRATION',
    pps_reference TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS current_account_withdrawals (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    amount REAL NOT NULL,
    notes TEXT,
    income_entry_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'PERSON' CHECK(type IN ('PERSON', 'MERCHANT', 'FINANCIAL_INSTITUTION')),
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);

  CREATE TABLE IF NOT EXISTS financial_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('BANK_CURRENT', 'BANK_SAVINGS', 'CREDIT_CARD', 'PAY_LATER', 'CASH')),
    account_number_mask TEXT,
    institution_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lifestyle_bucket TEXT NOT NULL DEFAULT 'REGULAR' CHECK(lifestyle_bucket IN ('REGULAR', 'EXTRA')),
    tax_treatment TEXT DEFAULT 'BUSINESS_DEDUCTIBLE' CHECK(tax_treatment IN ('BUSINESS_DEDUCTIBLE', 'CAPITAL_ASSET', 'PERSONAL_DRAWINGS', 'MIXED_APPORTIONED')),
    icon TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS debt_repayments (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    borrow_id TEXT REFERENCES borrow_records(id) ON DELETE SET NULL,
    from_account_id TEXT REFERENCES financial_accounts(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_debt_repayments_month ON debt_repayments(month);

  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    catalog_item_id TEXT REFERENCES catalog_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
`);

// Safe column migrations for expenses table
try {
  db.exec("ALTER TABLE expenses ADD COLUMN tax_classification TEXT DEFAULT 'BUSINESS_DEDUCTIBLE'");
} catch (e) {}
try {
  db.exec('ALTER TABLE expenses ADD COLUMN business_percentage INTEGER DEFAULT 100');
} catch (e) {}
try {
  db.exec('ALTER TABLE expenses ADD COLUMN gst_rate REAL DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE expenses ADD COLUMN gst_itc_eligible INTEGER DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE expenses ADD COLUMN has_invoice_voucher INTEGER DEFAULT 1');
} catch (e) {}
try {
  db.exec('ALTER TABLE expenses ADD COLUMN voucher_ref TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE expenses ADD COLUMN linked_borrow_id TEXT');
} catch (e) {}

// Safe column migrations for financial_goals table
try {
  db.exec('ALTER TABLE financial_goals ADD COLUMN spent_amount REAL DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE financial_goals ADD COLUMN completed_date TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE financial_goals ADD COLUMN linked_expense_id TEXT');
} catch (e) {}

// Initial profile and settings if empty
const profileRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('profile');
if (!profileRow) {
  const defaultProfile = {
    name: 'Suren Hembram',
    addressLine1: 'Kanimahuli',
    addressLine2: 'P.O. Bend , P.S. Chakulia',
    cityStateZip: 'Chakulia Jharkhand 832301',
    country: 'India',
    phone: '08987608678',
    email: 'surenhembram97@gmail.com',
    website: 'suren-site.vercel.app',
    udyamNumber: 'UDYAM-JH-06-0090498-01-0004921',
    showUdyamOnBill: true,
    bankName: 'State Bank of India',
    accountType: 'Current Account',
    accountNumber: '45661497562',
    ifscCode: 'SBIN0014355',
    accountHolder: 'Suren Hembram',
    upiId: '',
    showBankDetailsOnBill: true,
    showUpiOnBill: true,
    showQrOnBill: true,
    defaultNotes: 'Thanks for your business.',
    defaultTerms: 'Due on Receipt',
    signatureText: 'Authorized Signature',
  };
  db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?)').run('profile', JSON.stringify(defaultProfile));
} else {
  // Ensure new fields exist in existing profile
  const existing = JSON.parse((profileRow as any).value_json as string);
  let changed = false;
  if (!existing.accountType) {
    existing.accountType = 'Current Account';
    changed = true;
  }
  if (existing.showBankDetailsOnBill === undefined) {
    existing.showBankDetailsOnBill = true;
    changed = true;
  }
  if (existing.showUpiOnBill === undefined) {
    existing.showUpiOnBill = true;
    changed = true;
  }
  if (existing.showQrOnBill === undefined) {
    existing.showQrOnBill = true;
    changed = true;
  }
  if (changed) {
    db.prepare('UPDATE settings SET value_json = ? WHERE key = ?').run(JSON.stringify(existing), 'profile');
  }
}

const numberingRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('numbering');
if (!numberingRow) {
  const defaultNumbering = {
    billOfSupplyPrefix: 'BOS-',
    invoicePrefix: 'INV-',
    estimatePrefix: 'EST-',
    receiptPrefix: 'REC-',
    nextNumberBOS: 1,
    nextNumberINV: 2,
    nextNumberEST: 1,
    nextNumberREC: 1,
  };
  db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?)').run('numbering', JSON.stringify(defaultNumbering));
}

