-- Migration 0002: Domain Entity Normalization & Structural Relationships

-- 1. Contacts (Lenders, Borrowers, Vendors, Payees)
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

-- 2. Financial Accounts (Bank accounts, Credit Cards, Cash, Pay Later)
CREATE TABLE IF NOT EXISTS financial_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('BANK_CURRENT', 'BANK_SAVINGS', 'CREDIT_CARD', 'PAY_LATER', 'CASH')),
  account_number_mask TEXT,
  institution_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Expense Categories (Standardized taxonomy)
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lifestyle_bucket TEXT NOT NULL DEFAULT 'REGULAR' CHECK(lifestyle_bucket IN ('REGULAR', 'EXTRA')),
  tax_treatment TEXT DEFAULT 'BUSINESS_DEDUCTIBLE' CHECK(tax_treatment IN ('BUSINESS_DEDUCTIBLE', 'CAPITAL_ASSET', 'PERSONAL_DRAWINGS', 'MIXED_APPORTIONED')),
  icon TEXT,
  color TEXT
);

-- 4. Debt Repayments (Explicit liability principal settlements)
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

-- 5. Invoice Line Items (First-class relational line items)
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

