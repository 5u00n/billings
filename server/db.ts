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
`);

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
  const existing = JSON.parse(profileRow.value_json as string);
  let changed = false;
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
