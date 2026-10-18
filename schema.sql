-- Cloudflare D1 SQLite Schema for Suren Billings & Expense Suite

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
  tax_classification TEXT DEFAULT 'BUSINESS_DEDUCTIBLE',
  business_percentage INTEGER DEFAULT 100,
  gst_rate REAL DEFAULT 0,
  gst_itc_eligible INTEGER DEFAULT 0,
  has_invoice_voucher INTEGER DEFAULT 1,
  voucher_ref TEXT,
  linked_borrow_id TEXT,
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

-- Seed default application profile if not exists
INSERT OR IGNORE INTO settings (key, value_json)
VALUES (
  'profile',
  '{"name":"Suren Hembram","addressLine1":"Kanimahuli","addressLine2":"P.O. Bend , P.S. Chakulia","cityStateZip":"Chakulia Jharkhand 832301","country":"India","phone":"08987608678","email":"surenhembram97@gmail.com","website":"suren-site.vercel.app","udyamNumber":"UDYAM-JH-06-0090498-01-0004921","showUdyamOnBill":true,"bankName":"State Bank of India","accountType":"Current Account","accountNumber":"45661497562","ifscCode":"SBIN0014355","accountHolder":"Suren Hembram","upiId":"","customQrUrl":"","logoUrl":""}'
);

-- Seed default invoice numbering sequence if not exists
INSERT OR IGNORE INTO settings (key, value_json)
VALUES (
  'numbering',
  '{"billOfSupplyPrefix":"BOS","invoicePrefix":"INV","estimatePrefix":"EST","receiptPrefix":"REC","nextNumberBOS":1,"nextNumberINV":1,"nextNumberEST":1,"nextNumberREC":1}'
);

-- Seed statutory Indian tax compliance reminders
INSERT OR IGNORE INTO tax_reminders (id, title, description, due_date, category, is_recurring, frequency, is_completed, notify_before_days, priority, penalty_note, action_url)
VALUES
('rem-adv-q1', 'Advance Tax Q1 Installment (15%)', 'Pay 15% of estimated income tax liability for FY 2026-27 under Section 208/211.', '2026-06-15', 'ADVANCE_TAX', 1, 'YEARLY', 1, 7, 'HIGH', 'Shortfall attracts 1% monthly interest under Section 234C.', 'https://eportal.incometax.gov.in'),
('rem-itr-filing', 'ITR Filing Deadline (ITR-4 / ITR-3 Non-Audit)', 'Annual Income Tax Return filing deadline for Individuals, Freelancers, and Section 44ADA/AD Presumptive filers.', '2026-07-31', 'ITR_FILING', 1, 'YEARLY', 1, 15, 'HIGH', 'Late fee up to ₹5,000 u/s 234F plus 1% per month interest u/s 234A.', 'https://eportal.incometax.gov.in'),
('rem-adv-q2', 'Advance Tax Q2 Installment (45%)', 'Cumulative 45% of estimated annual tax liability to be deposited.', '2026-09-15', 'ADVANCE_TAX', 1, 'YEARLY', 1, 7, 'HIGH', 'Interest penalty u/s 234C at 1% per month for shortfall.', 'https://eportal.incometax.gov.in'),
('rem-jh-pt', 'Jharkhand Professional Tax (PT) Annual Filing', 'Annual Professional Tax payment under Jharkhand State Tax on Professions, Trades, Callings and Employments Act, 2011.', '2026-09-30', 'JHARKHAND_PT', 1, 'YEARLY', 0, 10, 'HIGH', 'Interest @ 2% per month on delayed PT dues in Jharkhand.', 'https://jharkhandcomtax.gov.in'),
('rem-adv-q3', 'Advance Tax Q3 Installment (75%)', 'Cumulative 75% of estimated annual tax liability to be deposited.', '2026-12-15', 'ADVANCE_TAX', 1, 'YEARLY', 0, 7, 'HIGH', '1% per month simple interest on shortfall u/s 234C.', 'https://eportal.incometax.gov.in'),
('rem-belated-itr', 'Belated / Revised ITR Deadline', 'Final statutory opportunity to file belated or revised return for prior Assessment Year with late fee.', '2026-12-31', 'ITR_FILING', 1, 'YEARLY', 0, 10, 'HIGH', 'Returns cannot be filed after Dec 31 unless under Updated Return Section 139(8A).', 'https://eportal.incometax.gov.in'),
('rem-adv-q4-44ada', 'Advance Tax Q4 & 100% 44ADA/AD Presumptive Tax Deadline', 'Crucial date: For Section 44ADA & 44AD presumptive taxpayers, 100% of entire tax liability is due on or before March 15 in one shot!', '2027-03-15', 'ADVANCE_TAX', 1, 'YEARLY', 0, 10, 'HIGH', '1% per month interest under Section 234B & 234C starts accumulating.', 'https://eportal.incometax.gov.in'),
('rem-sbi-ais-audit', 'Monthly SBI Current Account & AIS Reconciliation', 'Reconcile SBI Current Account transactions against Income Tax AIS (Annual Information Statement) & TIS.', '2026-11-05', 'BANK_AUDIT', 1, 'MONTHLY', 0, 3, 'MEDIUM', 'Unreconciled bank deposits lead to high-risk automated tax scrutiny notices.', 'https://eportal.incometax.gov.in'),
('rem-gst-monthly', 'Monthly GST Returns (GSTR-1 & GSTR-3B)', 'GSTR-1 due on 11th, GSTR-3B summary return and net tax payment due on 20th of every month.', '2026-11-20', 'GST_RETURN', 1, 'MONTHLY', 0, 5, 'MEDIUM', 'Late fee ₹50/day (or ₹20/day for NIL return) + 18% annual interest on delayed GST.', 'https://services.gst.gov.in');
