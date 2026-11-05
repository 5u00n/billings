PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PERSON' CHECK(type IN ('PERSON', 'MERCHANT', 'FINANCIAL_INSTITUTION')),
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE organizations (
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
INSERT INTO "organizations" ("id","name","address","city","state","pincode","country","phone","email","notes","created_at") VALUES('org_irvine_school','Irvine Adventist School','Near Phed Office, Singh Nursing Home Road, Gopalpur','Ghatshila','Jharkhand','832303','India','08987608678','irvineadventistschool@gmail.com','Primary educational institution client','2026-11-03 17:35:08');
CREATE TABLE catalog_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_rate REAL NOT NULL
);
INSERT INTO "catalog_items" ("id","name","description","default_rate") VALUES('cat_web_dev','Website Development & Annual Maintenance','School web portal design, domain, cloud hosting, and annual technical support',20000);
CREATE TABLE invoices (
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
INSERT INTO "invoices" ("id","invoice_number","doc_type","organization_id","invoice_date","terms","due_date","items_json","sub_total","total","amount_paid","balance_due","notes","payment_options","status","copy_type","hide_qty","created_at") VALUES('inv_000001','INV-000001','BILL OF SUPPLY','org_irvine_school','2026-08-01','Due on Receipt','2026-08-15','[{"id":"item_1","description":"Website Development & Annual Maintenance","qty":1,"rate":20000,"amount":20000}]',20000,20000,20000,0,'Thank you for partnering with us.','UPI / Current Account Bank Transfer','paid','ORIGINAL',0,'2026-11-03 17:35:08');
CREATE TABLE invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  catalog_item_id TEXT REFERENCES catalog_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  rate REAL NOT NULL,
  amount REAL NOT NULL,
  sort_order INTEGER DEFAULT 0
);
INSERT INTO "invoice_items" ("id","invoice_id","catalog_item_id","description","qty","rate","amount","sort_order") VALUES('item_inv_1','inv_000001','cat_web_dev','Website Development & Annual Maintenance',1,20000,20000,1);
CREATE TABLE recurring_schedules (
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
CREATE TABLE financial_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('BANK_CURRENT', 'BANK_SAVINGS', 'CREDIT_CARD', 'PAY_LATER', 'CASH')),
  account_number_mask TEXT,
  institution_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE borrowing_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('CREDIT', 'CASH_LOAN')),
  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "borrowing_accounts" ("id","name","account_type","version","created_at") VALUES('cd550f9d-f838-4bc1-9c3d-109a4c9417cd','Slice','CREDIT',1,'2026-11-04 14:25:33');
INSERT INTO "borrowing_accounts" ("id","name","account_type","version","created_at") VALUES('4861dd20-0450-49a5-bf6e-535ce6c3abee','HDFC Credit Card','CREDIT',1,'2026-11-04 14:26:38');
INSERT INTO "borrowing_accounts" ("id","name","account_type","version","created_at") VALUES('df5114c8-87f6-4a18-9602-235fd4b1a453','Amazon Pay Later','CREDIT',1,'2026-11-04 14:27:15');
CREATE TABLE borrowing_commands (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES borrowing_accounts(id) ON DELETE CASCADE,
  expected_version INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "borrowing_commands" ("id","account_id","expected_version","fingerprint","result_json","created_at") VALUES('ac2321cd-3a9b-4455-ac24-ceb4231220c8','cd550f9d-f838-4bc1-9c3d-109a4c9417cd',0,'{"path":"/api/budget/borrowing-accounts","body":{"name":"Slice","account_type":"CREDIT","opening_paise":6300000,"date":"2026-08-04","notes":"Borrow account"}}','{"success":true,"account_id":"cd550f9d-f838-4bc1-9c3d-109a4c9417cd","transaction_id":"85daa7cd-16f1-4fe0-af3b-12413eaf5dbd"}','2026-11-04 14:25:33');
INSERT INTO "borrowing_commands" ("id","account_id","expected_version","fingerprint","result_json","created_at") VALUES('9e072a17-daf1-4395-86eb-a783a33029eb','4861dd20-0450-49a5-bf6e-535ce6c3abee',0,'{"path":"/api/budget/borrowing-accounts","body":{"name":"HDFC Credit Card","account_type":"CREDIT","opening_paise":0,"date":"2026-08-04","notes":""}}','{"success":true,"account_id":"4861dd20-0450-49a5-bf6e-535ce6c3abee","transaction_id":null}','2026-11-04 14:26:38');
INSERT INTO "borrowing_commands" ("id","account_id","expected_version","fingerprint","result_json","created_at") VALUES('98ba8b3d-2ee1-4f10-a62d-64a20969c746','df5114c8-87f6-4a18-9602-235fd4b1a453',0,'{"path":"/api/budget/borrowing-accounts","body":{"name":"Amazon Pay Later","account_type":"CREDIT","opening_paise":0,"date":"2026-08-04","notes":""}}','{"success":true,"account_id":"df5114c8-87f6-4a18-9602-235fd4b1a453","transaction_id":null}','2026-11-04 14:27:15');
CREATE TABLE borrow_records (
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
CREATE TABLE debt_repayments (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  borrow_id TEXT REFERENCES borrow_records(id) ON DELETE CASCADE,
  from_account_id TEXT REFERENCES financial_accounts(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE income_entries (
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
INSERT INTO "income_entries" ("id","date","month","category","source","amount","invoice_id","notes","created_at") VALUES('inc_ace638ed-598e-42d7-b8eb-9d3de9111f8d','2026-10-02','2026-10','fl','Meker Project',7000,NULL,'','2026-11-04 15:24:43');
INSERT INTO "income_entries" ("id","date","month","category","source","amount","invoice_id","notes","created_at") VALUES('inc_d18b712c-9d70-4683-b4c0-6ee0cfd3e2b4','2026-10-03','2026-10','ext','Dad',5000,NULL,'','2026-11-04 15:25:55');
INSERT INTO "income_entries" ("id","date","month","category","source","amount","invoice_id","notes","created_at") VALUES('inc_bc6b9838-5d90-4f74-b4e4-c24cdc315759','2026-10-04','2026-10','ext','Dad',6000,NULL,'','2026-11-04 15:26:20');
INSERT INTO "income_entries" ("id","date","month","category","source","amount","invoice_id","notes","created_at") VALUES('inc_d9050587-70c0-4eee-93f2-f93693e9ad2b','2026-10-06','2026-10','saving','Kotak Savings',3000,NULL,'','2026-11-04 15:26:50');
INSERT INTO "income_entries" ("id","date","month","category","source","amount","invoice_id","notes","created_at") VALUES('inc_a997a532-3bcf-4917-b533-849e34dedcbd','2026-11-01','2026-11','sal','Edusofthub Salary',45000,NULL,'Monthly Salary','2026-11-04 15:42:01');
INSERT INTO "income_entries" ("id","date","month","category","source","amount","invoice_id","notes","created_at") VALUES('inc-with-1793806962062','2026-11-01','2026-11','fl','Current Account (Owner Draw)',5000,NULL,'Freelance income draw from SBI Current Account','2026-11-04 15:42:42');
CREATE TABLE current_account_withdrawals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  income_entry_id TEXT REFERENCES income_entries(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "current_account_withdrawals" ("id","date","month","amount","notes","income_entry_id","created_at") VALUES('with-1793806962062','2026-11-01','2026-11',5000,'Freelance income draw from SBI Current Account','inc-with-1793806962062','2026-11-04 15:42:42');
CREATE TABLE expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lifestyle_bucket TEXT NOT NULL DEFAULT 'REGULAR' CHECK(lifestyle_bucket IN ('REGULAR', 'EXTRA')),
  tax_treatment TEXT DEFAULT 'BUSINESS_DEDUCTIBLE' CHECK(tax_treatment IN ('BUSINESS_DEDUCTIBLE', 'CAPITAL_ASSET', 'PERSONAL_DRAWINGS', 'MIXED_APPORTIONED')),
  icon TEXT,
  color TEXT
);
CREATE TABLE expenses (
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
INSERT INTO "expenses" ("id","date","month","category","tag","description","amount","payment_method","notes","tax_classification","business_percentage","gst_rate","gst_itc_eligible","has_invoice_voucher","voucher_ref","linked_borrow_id","borrowing_account_id","created_at") VALUES('exp_fb5116a4-0359-476d-ab94-7c22c5bacb21','2026-09-19','2026-09','ext','Travel','Sikkim Trip',2600,'UPI / Bank','Sikkim Trip Hotel','BUSINESS_DEDUCTIBLE',100,0,0,0,'',NULL,NULL,'2026-11-03 19:16:32');
CREATE TABLE borrowing_transactions (
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
INSERT INTO "borrowing_transactions" ("id","account_id","date","kind","amount_paise","debt_delta_paise","cash_delta_paise","description","payment_method","notes","original_record_id","reverses_id","effective_order","command_id","created_at") VALUES('85daa7cd-16f1-4fe0-af3b-12413eaf5dbd','cd550f9d-f838-4bc1-9c3d-109a4c9417cd','2026-08-04','OPENING',6300000,6300000,0,'Opening balance','UPI / Bank','Borrow account',NULL,NULL,0,'ac2321cd-3a9b-4455-ac24-ceb4231220c8','2026-11-04 14:25:33');
CREATE TABLE borrowing_bills (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES borrowing_accounts(id) ON DELETE CASCADE,
  as_of_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
  notes TEXT NOT NULL DEFAULT '',
  command_id TEXT NOT NULL REFERENCES borrowing_commands(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE borrowing_expense_links (
  expense_id TEXT PRIMARY KEY REFERENCES expenses(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL UNIQUE REFERENCES borrowing_transactions(id) ON DELETE CASCADE
);
CREATE TABLE borrowing_legacy_links (
  borrow_id TEXT PRIMARY KEY REFERENCES borrow_records(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES borrowing_accounts(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL
);
CREATE TABLE borrowing_backups (
  id TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE financial_goals (
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
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_3f5069e1-1cbf-4ca5-ae06-62dcfb771685','Dad GPU',100000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:36:49');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_cb819fa8-6da9-4470-95ee-3e6c70aa1977','Camera',85000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:37:17');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_d1d15780-521a-4353-afa3-86538a4daf97','Drone',130000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:37:51');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_b8969731-c8f2-495e-a3de-ee17db5f7823','Gold For Mom',200000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:38:35');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_f2d074e6-dbfe-4111-97b8-3ee70465173c','iPad Pro',120000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:39:00');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_d30e0cb2-c591-4614-ba16-1810a88fdb7b','Touring Bike',600000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:39:27');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_a32f5f84-d6fb-4917-af27-04a8c0b09c55','Land Purchase',4500000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:40:16');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_fd78ac9f-0fed-489d-9866-f9be670af9d8','Own Car',2400000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:40:59');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_746c6530-1738-4ac7-9511-b68dfc2ca559','New Own House',10000000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:41:34');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_7c623100-1784-41d0-9782-2cb713853096','Farm Land',10000000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:41:46');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_3e546f09-ccf9-4127-bd60-3cf645e412f2','Farmland in Meghalaya',10000000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:42:09');
INSERT INTO "financial_goals" ("id","name","target_amount","savings_percent","saved_amount","target_date","status","spent_amount","completed_date","linked_expense_id","notes","created_at") VALUES('gol_e3b7beee-9389-42cb-864e-39e4dd146167','Bike for Dad',400000,0.05,0,NULL,'IN_PROGRESS',0,NULL,NULL,'','2026-11-03 17:42:46');
CREATE TABLE monthly_budget_summaries (
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
CREATE TABLE budget_allocation_rules (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  percentage REAL NOT NULL,
  display_order INTEGER DEFAULT 0
);
CREATE TABLE monthly_budget_limits (
  month TEXT PRIMARY KEY,
  regular_budget REAL DEFAULT 0,
  extra_budget REAL DEFAULT 0,
  total_budget REAL DEFAULT 0,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE tax_reminders (
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
CREATE TABLE sbi_pps_cheques (
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
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
INSERT INTO "settings" ("key","value_json") VALUES('profile','{"name":"Suren Hembram","addressLine1":"Kanimahuli","addressLine2":"P.O. Bend , P.S. Chakulia","cityStateZip":"Chakulia Jharkhand 832301","country":"India","phone":"08987608678","email":"surenhembram97@gmail.com","website":"suren-site.vercel.app","udyamNumber":"UDYAM-JH-06-0090498-01-0004921","showUdyamOnBill":true,"bankName":"State Bank of India","accountType":"Current Account","accountNumber":"45661497562","ifscCode":"SBIN0014355","accountHolder":"Suren Hembram","upiId":"","customQrUrl":"","logoUrl":""}');
INSERT INTO "settings" ("key","value_json") VALUES('numbering','{"billOfSupplyPrefix":"BOS","invoicePrefix":"INV","estimatePrefix":"EST","receiptPrefix":"REC","nextNumberBOS":1,"nextNumberINV":2,"nextNumberEST":1,"nextNumberREC":1}');
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_borrow_records_month ON borrow_records(month);
CREATE INDEX idx_debt_repayments_month ON debt_repayments(month);
CREATE INDEX idx_income_entries_month ON income_entries(month);
CREATE INDEX idx_withdrawals_month ON current_account_withdrawals(month);
CREATE INDEX idx_expenses_month ON expenses(month);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_borrowing_transactions_account_date ON borrowing_transactions(account_id, date);
CREATE INDEX borrowing_transactions_account_date ON borrowing_transactions(account_id,date);
CREATE TRIGGER borrowing_command_version BEFORE INSERT ON borrowing_commands
  BEGIN SELECT CASE WHEN NEW.expected_version != (SELECT version FROM borrowing_accounts WHERE id=NEW.account_id)
  THEN RAISE(ABORT, 'BORROWING_VERSION_CONFLICT') END; END;
CREATE TRIGGER borrowing_command_increment AFTER INSERT ON borrowing_commands
  BEGIN UPDATE borrowing_accounts SET version=version+1 WHERE id=NEW.account_id; END;
