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

// Seed statutory Indian tax compliance reminders if empty
const reminderCount = db.prepare('SELECT COUNT(*) as count FROM tax_reminders').get() as { count: number };
if (reminderCount.count === 0) {
  const insertReminder = db.prepare(`
    INSERT INTO tax_reminders (id, title, description, due_date, category, is_recurring, frequency, is_completed, notify_before_days, priority, penalty_note, action_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialTaxReminders = [
    {
      id: 'rem-adv-q1',
      title: 'Advance Tax Q1 Installment (15%)',
      description: 'Pay 15% of estimated income tax liability for FY 2026-27 under Section 208/211.',
      due_date: '2026-06-15',
      category: 'ADVANCE_TAX',
      is_recurring: 1,
      frequency: 'YEARLY',
      is_completed: 1,
      notify_before_days: 7,
      priority: 'HIGH',
      penalty_note: 'Shortfall attracts 1% monthly interest under Section 234C.',
      action_url: 'https://eportal.incometax.gov.in',
    },
    {
      id: 'rem-itr-filing',
      title: 'ITR Filing Deadline (ITR-4 / ITR-3 Non-Audit)',
      description: 'Annual Income Tax Return filing deadline for Individuals, Freelancers, and Section 44ADA/AD Presumptive filers.',
      due_date: '2026-07-31',
      category: 'ITR_FILING',
      is_recurring: 1,
      frequency: 'YEARLY',
      is_completed: 1,
      notify_before_days: 15,
      priority: 'HIGH',
      penalty_note: 'Late fee up to ₹5,000 u/s 234F plus 1% per month interest u/s 234A and loss of loss-carry-forward benefits.',
      action_url: 'https://eportal.incometax.gov.in',
    },
    {
      id: 'rem-adv-q2',
      title: 'Advance Tax Q2 Installment (45%)',
      description: 'Cumulative 45% of estimated annual tax liability to be deposited.',
      due_date: '2026-09-15',
      category: 'ADVANCE_TAX',
      is_recurring: 1,
      frequency: 'YEARLY',
      is_completed: 1,
      notify_before_days: 7,
      priority: 'HIGH',
      penalty_note: 'Interest penalty u/s 234C at 1% per month for shortfall.',
      action_url: 'https://eportal.incometax.gov.in',
    },
    {
      id: 'rem-jh-pt',
      title: 'Jharkhand Professional Tax (PT) Annual Filing',
      description: 'Annual Professional Tax payment under Jharkhand State Tax on Professions, Trades, Callings and Employments Act, 2011 (Enrolment Certificate Form I).',
      due_date: '2026-09-30',
      category: 'JHARKHAND_PT',
      is_recurring: 1,
      frequency: 'YEARLY',
      is_completed: 0,
      notify_before_days: 10,
      priority: 'HIGH',
      penalty_note: 'Interest @ 2% per month on delayed PT dues in Jharkhand.',
      action_url: 'https://jharkhandcomtax.gov.in',
    },
    {
      id: 'rem-tax-audit',
      title: 'Tax Audit Report Filing u/s 44AB (if applicable)',
      description: 'Mandatory if business turnover exceeds ₹1 Crore (or ₹10 Crore if 95%+ digital). Form 3CA/CB-3CD to be submitted by CA.',
      due_date: '2026-10-31',
      category: 'ITR_FILING',
      is_recurring: 1,
      frequency: 'YEARLY',
      is_completed: 0,
      notify_before_days: 15,
      priority: 'HIGH',
      penalty_note: 'Penalty of 0.5% of turnover or ₹1,50,000 (whichever is lower) u/s 271B.',
      action_url: 'https://eportal.incometax.gov.in',
    },
    {
      id: 'rem-adv-q3',
      title: 'Advance Tax Q3 Installment (75%)',
      description: 'Cumulative 75% of estimated annual tax liability to be deposited.',
      due_date: '2026-12-15',
      category: 'ADVANCE_TAX',
      is_recurring: 1,
      frequency: 'YEARLY',
      is_completed: 0,
      notify_before_days: 7,
      priority: 'HIGH',
      penalty_note: '1% per month simple interest on shortfall u/s 234C.',
      action_url: 'https://eportal.incometax.gov.in',
    },
    {
      id: 'rem-belated-itr',
      title: 'Belated / Revised ITR Deadline',
      description: 'Final statutory opportunity to file belated or revised return for prior Assessment Year with late fee.',
      due_date: '2026-12-31',
      category: 'ITR_FILING',
      is_recurring: 1,
      frequency: 'YEARLY',
      is_completed: 0,
      notify_before_days: 10,
      priority: 'HIGH',
      penalty_note: 'Returns cannot be filed after Dec 31 unless under Updated Return Section 139(8A) with 25%-50% additional tax.',
      action_url: 'https://eportal.incometax.gov.in',
    },
    {
      id: 'rem-adv-q4-44ada',
      title: 'Advance Tax Q4 & 100% 44ADA/AD Presumptive Tax Deadline',
      description: 'Crucial date: For Section 44ADA & 44AD presumptive taxpayers, 100% of entire tax liability is due on or before March 15 in one shot!',
      due_date: '2027-03-15',
      category: 'ADVANCE_TAX',
      is_recurring: 1,
      frequency: 'YEARLY',
      is_completed: 0,
      notify_before_days: 10,
      priority: 'HIGH',
      penalty_note: '1% per month interest under Section 234B & 234C starts accumulating.',
      action_url: 'https://eportal.incometax.gov.in',
    },
    {
      id: 'rem-sbi-ais-audit',
      title: 'Monthly SBI Current Account & AIS Reconciliation',
      description: 'Reconcile SBI Current Account transactions against Income Tax AIS (Annual Information Statement) & TIS to check SFT reports.',
      due_date: '2026-11-05',
      category: 'BANK_AUDIT',
      is_recurring: 1,
      frequency: 'MONTHLY',
      is_completed: 0,
      notify_before_days: 3,
      priority: 'MEDIUM',
      penalty_note: 'Unreconciled bank deposits lead to high-risk automated tax scrutiny notices.',
      action_url: 'https://eportal.incometax.gov.in',
    },
    {
      id: 'rem-gst-monthly',
      title: 'Monthly GST Returns (GSTR-1 & GSTR-3B)',
      description: 'GSTR-1 due on 11th, GSTR-3B summary return and net tax payment due on 20th of every month.',
      due_date: '2026-11-20',
      category: 'GST_RETURN',
      is_recurring: 1,
      frequency: 'MONTHLY',
      is_completed: 0,
      notify_before_days: 5,
      priority: 'MEDIUM',
      penalty_note: 'Late fee ₹50/day (or ₹20/day for NIL return) + 18% annual interest on delayed GST.',
      action_url: 'https://services.gst.gov.in',
    },
  ];

  initialTaxReminders.forEach((r) => {
    insertReminder.run(
      r.id,
      r.title,
      r.description,
      r.due_date,
      r.category,
      r.is_recurring,
      r.frequency,
      r.is_completed,
      r.notify_before_days,
      r.priority,
      r.penalty_note,
      r.action_url
    );
  });
}

// Seed initial profile and sample organization if empty
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

// Seed default client organization from sample invoice INV-000001
const orgCount = db.prepare('SELECT COUNT(*) as count FROM organizations').get() as { count: number };
if (orgCount.count === 0) {
  const orgId = 'org-irvine-school';
  db.prepare(`
    INSERT INTO organizations (id, name, address, city, state, pincode, country, phone, email, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orgId,
    'Irvine Adventist School',
    'Near Phed Office, Singh Nursing Home Road, Gopalpur',
    'Ghatshila',
    'Jharkhand',
    '832303',
    'India',
    '',
    '',
    'Primary educational institution client'
  );

  // Seed sample invoice INV-000001 matching the exact provided PDF
  const items = [
    {
      id: 'item-1',
      description: 'Project Acceptance / Commerncement',
      qty: 1,
      rate: 20000,
      amount: 20000,
    },
  ];

  db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date,
      items_json, sub_total, total, amount_paid, balance_due, notes, payment_options, status, copy_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'inv-000001',
    'INV-000001',
    'BILL OF SUPPLY',
    orgId,
    '15/10/2026',
    'Due on Receipt',
    '15/10/2026',
    JSON.stringify(items),
    20000,
    20000,
    0,
    20000,
    'Thanks for your business.',
    'Bank Transfer / UPI Accepted',
    'issued',
    'ORIGINAL'
  );

  // Seed catalog items
  db.prepare(`
    INSERT INTO catalog_items (id, name, description, default_rate)
    VALUES (?, ?, ?, ?)
  `).run('cat-1', 'Project Acceptance / Commencement', 'Initial project kickoff and milestone delivery', 20000);
}

// ----------------- SEED BUDGET DATA FROM TEMPLATE -----------------
const budgetCount = db.prepare('SELECT COUNT(*) as count FROM budget_allocation_rules').get() as { count: number };
if (budgetCount.count === 0) {
  // 1. Budget Allocation Rules
  const insertRule = db.prepare('INSERT INTO budget_allocation_rules (id, category, percentage, display_order) VALUES (?, ?, ?, ?)');
  insertRule.run('rule-1', 'Essentials', 0.50, 1);
  insertRule.run('rule-2', 'Emergency Fund', 0.10, 2);
  insertRule.run('rule-3', 'Parents Fund', 0.13, 3);
  insertRule.run('rule-4', 'Business Growth', 0.15, 4);
  insertRule.run('rule-5', 'Big Assets Fund', 0.07, 5);
  insertRule.run('rule-6', 'Small Assets', 0.05, 6);

  // 2. Financial Goals
  const insertGoal = db.prepare('INSERT INTO financial_goals (id, name, target_amount, savings_percent, saved_amount) VALUES (?, ?, ?, ?, ?)');
  insertGoal.run('goal-1', 'Dad GPU', 85000, 0.14, 12000);
  insertGoal.run('goal-2', 'Dad Camera', 64000, 0.15, 9600);
  insertGoal.run('goal-3', 'Dad Drone', 130000, 0.10, 13000);
  insertGoal.run('goal-4', 'Gold for Mom', 200000, 0.05, 15000);
  insertGoal.run('goal-5', 'iPad Pro', 110000, 0.30, 33000);
  insertGoal.run('goal-6', 'Touring Bike', 600000, 0.17, 45000);
  insertGoal.run('goal-7', 'Land Purchase', 4500000, 0.03, 135000);
  insertGoal.run('goal-8', 'Own Car', 2400000, 0.02, 50000);
  insertGoal.run('goal-9', 'New House', 10000000, 0.01, 100000);
  insertGoal.run('goal-10', 'Farmland', 10000000, 0.03, 300000);

  // 3. Monthly Budget Summaries (Aug, Sep, Oct 2026)
  const insertSummary = db.prepare(`
    INSERT INTO monthly_budget_summaries (
      month, starting_debt, previous_remaining, dept_payment, borrow_amount, reg_savings, ext_savings, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSummary.run('2026-08', 62152, 14000, 14000, 0, 0, 0, 'August budget from Excel template');
  insertSummary.run('2026-09', 123152, 0, 24000, 22000, 3000, 0, 'September budget from Excel template');
  insertSummary.run('2026-10', 121152, 4935, 52058, 15541, 0, 0, 'October budget from Excel template');

  // 4. Expenses from Expense Log
  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, date, month, category, tag, description, amount, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const initialExpenses = [
    { date: '2026-09-02', cat: 'ext', tag: 'Gadgets', desc: 'Utensil', amt: 2004 },
    { date: '2026-09-03', cat: 'ext', tag: 'Gadgets', desc: 'Gadget', amt: 2003 },
    { date: '2026-09-04', cat: 'ext', tag: 'Accessories', desc: 'Holder', amt: 554 },
    { date: '2026-09-10', cat: 'ext', tag: 'Food', desc: 'Food for home', amt: 200 },
    { date: '2026-09-10', cat: 'reg', tag: 'Fuel', desc: 'Petrol', amt: 200 },
    { date: '2026-09-10', cat: 'ext', tag: 'Drinks', desc: 'Drinks', amt: 165 },
    { date: '2026-09-10', cat: 'ext', tag: 'Transfer', desc: 'Sent money Nong', amt: 100 },
    { date: '2026-09-10', cat: 'ext', tag: 'Travel', desc: 'Train from Guwahati to Howrah', amt: 1400 },
    { date: '2026-09-10', cat: 'ext', tag: 'Travel', desc: 'Train from Howrah to Siliguri', amt: 1515 },
    { date: '2026-09-20', cat: 'ext', tag: 'Travel', desc: 'Hotel in Sikkim', amt: 2600 },
    { date: '2026-09-21', cat: 'ext', tag: 'Food', desc: 'Food in Sikkim', amt: 3424 },
    { date: '2026-09-21', cat: 'ext', tag: 'Travel', desc: 'Travel Sikkim local', amt: 2800 },
    { date: '2026-09-22', cat: 'ext', tag: 'Travel', desc: 'Travel to Meghalaya', amt: 1000 },
    { date: '2026-09-23', cat: 'ext', tag: 'Food', desc: 'Food in Meghalaya', amt: 1000 },
    { date: '2026-10-02', cat: 'reg', tag: 'Utilities', desc: 'Mobile Recharge', amt: 399 },
    { date: '2026-10-04', cat: 'ext', tag: 'Groceries', desc: 'Blinkit essentials', amt: 500 },
    { date: '2026-10-05', cat: 'reg', tag: 'Fuel', desc: 'Bike petrol', amt: 300 },
    { date: '2026-10-07', cat: 'ext', tag: 'Food', desc: 'Tibetan dinner with friends', amt: 1454 },
    { date: '2026-10-12', cat: 'reg', tag: 'Services', desc: 'Software / Hosting subscription', amt: 850 },
  ];

  initialExpenses.forEach((exp, idx) => {
    insertExpense.run(
      `exp-seed-${idx + 1}`,
      exp.date,
      exp.date.substring(0, 7),
      exp.cat,
      exp.tag,
      exp.desc,
      exp.amt,
      'UPI / Bank'
    );
  });

  // 5. Income Entries
  const insertIncome = db.prepare(`
    INSERT INTO income_entries (id, date, month, category, source, amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const initialIncomes = [
    { date: '2026-10-02', cat: 'fl', src: 'Meker Project', amt: 7000, notes: 'Freelance development' },
    { date: '2026-10-03', cat: 'ext', src: 'Dad', amt: 5000, notes: 'Extra family support' },
    { date: '2026-10-04', cat: 'ext', src: 'Dad', amt: 5000, notes: 'Family allowance' },
    { date: '2026-10-05', cat: 'ext', src: 'Dad', amt: 1000, notes: 'Allowance' },
    { date: '2026-10-06', cat: 'saving', src: 'Savings Account', amt: 3000, notes: 'Withdrawal from savings' },
  ];

  initialIncomes.forEach((inc, idx) => {
    insertIncome.run(
      `inc-seed-${idx + 1}`,
      inc.date,
      inc.date.substring(0, 7),
      inc.cat,
      inc.src,
      inc.amt,
      inc.notes
    );
  });

  // 6. Borrow & Returns
  const insertBorrow = db.prepare(`
    INSERT INTO borrow_records (id, date, month, type, person, reason, amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const initialBorrows = [
    { date: '2026-10-01', type: 'RETURN', person: 'Soso', reason: 'Settlement return', amt: 10000, status: 'SETTLED' },
    { date: '2026-10-02', type: 'RETURN', person: 'Iban Mian', reason: 'Partial return', amt: 3000, status: 'SETTLED' },
    { date: '2026-10-03', type: 'RETURN', person: 'Iban Mian', reason: 'Return', amt: 10000, status: 'SETTLED' },
    { date: '2026-10-02', type: 'BORROW', person: 'Iban', reason: 'Iban help', amt: 4000, status: 'PENDING' },
    { date: '2026-10-03', type: 'BORROW', person: 'Iban', reason: 'Iban gift', amt: 3299, status: 'PENDING' },
    { date: '2026-10-04', type: 'BORROW', person: 'Iban', reason: 'Iban cosmetics', amt: 1484, status: 'PENDING' },
    { date: '2026-10-04', type: 'BORROW', person: 'Blinkit', reason: 'Electronics blinkit', amt: 2662, status: 'PENDING' },
    { date: '2026-10-05', type: 'BORROW', person: 'Hotel', reason: 'Hotel Guwahati', amt: 2000, status: 'PENDING' },
    { date: '2026-10-11', type: 'BORROW', person: 'Iban', reason: 'For Iban funds', amt: 2096, status: 'PENDING' },
  ];

  initialBorrows.forEach((b, idx) => {
    insertBorrow.run(
      `br-seed-${idx + 1}`,
      b.date,
      b.date.substring(0, 7),
      b.type,
      b.person,
      b.reason,
      b.amt,
      b.status
    );
  });
}

