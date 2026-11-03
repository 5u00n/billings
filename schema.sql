-- Cloudflare D1 SQLite Schema for Suren Billings & Expense Suite
-- Fully Relational Schema with explicit FOREIGN KEY constraints connecting all domain entities

PRAGMA foreign_keys = ON;

-- 1. Core Contacts & Organizations
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

-- 2. Items & Services Catalog
CREATE TABLE IF NOT EXISTS catalog_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_rate REAL NOT NULL
);

-- 3. Invoices & Billing Records
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  doc_type TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);

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

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Financial Accounts & Borrowing Accounts
CREATE TABLE IF NOT EXISTS financial_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('BANK_CURRENT', 'BANK_SAVINGS', 'CREDIT_CARD', 'PAY_LATER', 'CASH')),
  account_number_mask TEXT,
  institution_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS borrowing_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('CREDIT', 'CASH_LOAN')),
  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS borrowing_commands (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES borrowing_accounts(id) ON DELETE CASCADE,
  expected_version INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS borrowing_command_version BEFORE INSERT ON borrowing_commands
  BEGIN SELECT CASE WHEN NEW.expected_version != (SELECT version FROM borrowing_accounts WHERE id=NEW.account_id)
  THEN RAISE(ABORT, 'BORROWING_VERSION_CONFLICT') END; END;

CREATE TRIGGER IF NOT EXISTS borrowing_command_increment AFTER INSERT ON borrowing_commands
  BEGIN UPDATE borrowing_accounts SET version=version+1 WHERE id=NEW.account_id; END;

-- 5. Borrow & Lent Records (P2P loans)
CREATE TABLE IF NOT EXISTS borrow_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  type TEXT NOT NULL,
  person TEXT NOT NULL,
  reason TEXT,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'PENDING',
  settled_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_borrow_records_month ON borrow_records(month);

CREATE TABLE IF NOT EXISTS debt_repayments (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  borrow_id TEXT REFERENCES borrow_records(id) ON DELETE CASCADE,
  from_account_id TEXT REFERENCES financial_accounts(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_debt_repayments_month ON debt_repayments(month);

-- 6. Income Entries & Current Account Owner Withdrawals
CREATE TABLE IF NOT EXISTS income_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  amount REAL NOT NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_income_entries_month ON income_entries(month);

CREATE TABLE IF NOT EXISTS current_account_withdrawals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  income_entry_id TEXT REFERENCES income_entries(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_month ON current_account_withdrawals(month);

-- 7. Expense Categories & Expenses Ledger
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lifestyle_bucket TEXT NOT NULL DEFAULT 'REGULAR' CHECK(lifestyle_bucket IN ('REGULAR', 'EXTRA')),
  tax_treatment TEXT DEFAULT 'BUSINESS_DEDUCTIBLE' CHECK(tax_treatment IN ('BUSINESS_DEDUCTIBLE', 'CAPITAL_ASSET', 'PERSONAL_DRAWINGS', 'MIXED_APPORTIONED')),
  icon TEXT,
  color TEXT
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
  tax_classification TEXT DEFAULT 'BUSINESS_DEDUCTIBLE',
  business_percentage INTEGER DEFAULT 100,
  gst_rate REAL DEFAULT 0,
  gst_itc_eligible INTEGER DEFAULT 0,
  has_invoice_voucher INTEGER DEFAULT 1,
  voucher_ref TEXT,
  linked_borrow_id TEXT REFERENCES borrow_records(id) ON DELETE SET NULL,
  borrowing_account_id TEXT REFERENCES borrowing_accounts(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- 8. Borrowing Transactions & Account Bills
CREATE TABLE IF NOT EXISTS borrowing_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES borrowing_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('CREDIT_PURCHASE', 'CASH_BORROW', 'PAYMENT', 'FEE', 'OPENING', 'ADJUSTMENT', 'REVERSAL')),
  amount_paise INTEGER NOT NULL,
  debt_delta_paise INTEGER NOT NULL,
  cash_delta_paise INTEGER NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  original_record_id TEXT,
  reverses_id TEXT UNIQUE REFERENCES borrowing_transactions(id),
  effective_order INTEGER NOT NULL,
  command_id TEXT NOT NULL REFERENCES borrowing_commands(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_borrowing_transactions_account_date ON borrowing_transactions(account_id, date);

CREATE TABLE IF NOT EXISTS borrowing_bills (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES borrowing_accounts(id) ON DELETE CASCADE,
  as_of_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
  notes TEXT NOT NULL DEFAULT '',
  command_id TEXT NOT NULL REFERENCES borrowing_commands(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS borrowing_expense_links (
  expense_id TEXT PRIMARY KEY REFERENCES expenses(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL UNIQUE REFERENCES borrowing_transactions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS borrowing_legacy_links (
  borrow_id TEXT PRIMARY KEY REFERENCES borrow_records(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES borrowing_accounts(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS borrowing_backups (
  id TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Financial Goals (Linked to purchasing expenses)
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
  linked_expense_id TEXT REFERENCES expenses(id) ON DELETE SET NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Budget Summaries & Envelopes
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

CREATE TABLE IF NOT EXISTS budget_allocation_rules (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  percentage REAL NOT NULL,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS monthly_budget_limits (
  month TEXT PRIMARY KEY,
  regular_budget REAL DEFAULT 0,
  extra_budget REAL DEFAULT 0,
  total_budget REAL DEFAULT 0,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tax Compliance, Reminders & Banking
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

-- 12. Settings Key-Value Store
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

-- Default Settings: User Profile
INSERT OR IGNORE INTO settings (key, value_json)
VALUES (
  'profile',
  '{"name":"Suren Hembram","addressLine1":"Kanimahuli","addressLine2":"P.O. Bend , P.S. Chakulia","cityStateZip":"Chakulia Jharkhand 832301","country":"India","phone":"08987608678","email":"surenhembram97@gmail.com","website":"suren-site.vercel.app","udyamNumber":"UDYAM-JH-06-0090498-01-0004921","showUdyamOnBill":true,"bankName":"State Bank of India","accountType":"Current Account","accountNumber":"45661497562","ifscCode":"SBIN0014355","accountHolder":"Suren Hembram","upiId":"","customQrUrl":"","logoUrl":""}'
);

-- Default Settings: Invoice Sequence Numbering
INSERT OR IGNORE INTO settings (key, value_json)
VALUES (
  'numbering',
  '{"billOfSupplyPrefix":"BOS","invoicePrefix":"INV","estimatePrefix":"EST","receiptPrefix":"REC","nextNumberBOS":1,"nextNumberINV":2,"nextNumberEST":1,"nextNumberREC":1}'
);
