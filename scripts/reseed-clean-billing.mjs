import Database from 'better-sqlite3';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const schemaPath = path.resolve(process.cwd(), 'schema.sql');
const schemaSql = readFileSync(schemaPath, 'utf8');

console.log('--- 1. Resetting Local SQLite Database (data/records.sqlite) ---');
const dbPath = path.resolve(process.cwd(), 'data/records.sqlite');
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

// Drop all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all();
for (const t of tables) {
  db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
}
console.log(`Dropped ${tables.length} tables in local SQLite.`);

// Execute new relational schema
db.exec(schemaSql);
db.pragma('foreign_keys = ON');

// Insert Clean Beginning Billing Data
const insertOrg = db.prepare(`
  INSERT INTO organizations (id, name, address, city, state, pincode, country, phone, email, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertOrg.run(
  'org_irvine_school',
  'Irvine Adventist School',
  'Near Phed Office, Singh Nursing Home Road, Gopalpur',
  'Ghatshila',
  'Jharkhand',
  '832303',
  'India',
  '08987608678',
  'irvineadventistschool@gmail.com',
  'Primary educational institution client'
);

const insertCat = db.prepare(`
  INSERT INTO catalog_items (id, name, description, default_rate)
  VALUES (?, ?, ?, ?)
`);
insertCat.run(
  'cat_web_dev',
  'Website Development & Annual Maintenance',
  'School web portal design, domain, cloud hosting, and annual technical support',
  20000.0
);

const insertInv = db.prepare(`
  INSERT INTO invoices (
    id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date,
    items_json, sub_total, total, amount_paid, balance_due, notes, payment_options, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const items = [
  {
    id: 'item_1',
    description: 'Website Development & Annual Maintenance',
    qty: 1,
    rate: 20000,
    amount: 20000,
  },
];

insertInv.run(
  'inv_000001',
  'INV-000001',
  'BILL OF SUPPLY',
  'org_irvine_school',
  '2026-08-01',
  'Due on Receipt',
  '2026-08-15',
  JSON.stringify(items),
  20000.0,
  20000.0,
  20000.0,
  0.0,
  'Thank you for partnering with us.',
  'UPI / Current Account Bank Transfer',
  'paid'
);

const insertInvItem = db.prepare(`
  INSERT INTO invoice_items (id, invoice_id, catalog_item_id, description, qty, rate, amount, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
insertInvItem.run(
  'item_inv_1',
  'inv_000001',
  'cat_web_dev',
  'Website Development & Annual Maintenance',
  1,
  20000.0,
  20000.0,
  1
);

console.log('Seeded local SQLite: 1 Org, 1 Invoice (paid 20,000), 1 Catalog Item, 1 Invoice Item.');
db.close();

console.log('\n--- 2. Resetting Remote Cloudflare D1 (billings-db) ---');

// Build SQL batch file for D1
const d1CleanSql = `
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS recurring_schedules;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS catalog_items;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS borrowing_expense_links;
DROP TABLE IF EXISTS borrowing_legacy_links;
DROP TABLE IF EXISTS borrowing_bills;
DROP TABLE IF EXISTS borrowing_transactions;
DROP TABLE IF EXISTS borrowing_commands;
DROP TABLE IF EXISTS borrowing_accounts;
DROP TABLE IF EXISTS borrowing_backups;
DROP TABLE IF EXISTS debt_repayments;
DROP TABLE IF EXISTS financial_goals;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS current_account_withdrawals;
DROP TABLE IF EXISTS income_entries;
DROP TABLE IF EXISTS borrow_records;
DROP TABLE IF EXISTS monthly_budget_summaries;
DROP TABLE IF EXISTS monthly_budget_limits;
DROP TABLE IF EXISTS budget_allocation_rules;
DROP TABLE IF EXISTS tax_reminders;
DROP TABLE IF EXISTS sbi_pps_cheques;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS financial_accounts;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS settings;

${schemaSql}

INSERT INTO organizations (id, name, address, city, state, pincode, country, phone, email, notes)
VALUES (
  'org_irvine_school',
  'Irvine Adventist School',
  'Near Phed Office, Singh Nursing Home Road, Gopalpur',
  'Ghatshila',
  'Jharkhand',
  '832303',
  'India',
  '08987608678',
  'irvineadventistschool@gmail.com',
  'Primary educational institution client'
);

INSERT INTO catalog_items (id, name, description, default_rate)
VALUES (
  'cat_web_dev',
  'Website Development & Annual Maintenance',
  'School web portal design, domain, cloud hosting, and annual technical support',
  20000.0
);

INSERT INTO invoices (
  id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date,
  items_json, sub_total, total, amount_paid, balance_due, notes, payment_options, status
) VALUES (
  'inv_000001',
  'INV-000001',
  'BILL OF SUPPLY',
  'org_irvine_school',
  '2026-08-01',
  'Due on Receipt',
  '2026-08-15',
  '[{"id":"item_1","description":"Website Development & Annual Maintenance","qty":1,"rate":20000,"amount":20000}]',
  20000.0,
  20000.0,
  20000.0,
  0.0,
  'Thank you for partnering with us.',
  'UPI / Current Account Bank Transfer',
  'paid'
);

INSERT INTO invoice_items (id, invoice_id, catalog_item_id, description, qty, rate, amount, sort_order)
VALUES (
  'item_inv_1',
  'inv_000001',
  'cat_web_dev',
  'Website Development & Annual Maintenance',
  1,
  20000.0,
  20000.0,
  1
);
`;

const d1SqlPath = path.resolve(process.cwd(), 'data/d1_reseed_clean.sql');
writeFileSync(d1SqlPath, d1CleanSql, 'utf8');

console.log('Executing clean reseed script on Cloudflare D1...');
try {
  execSync(`npx wrangler d1 execute billings-db --remote --file="${d1SqlPath}" -y`, {
    stdio: 'inherit',
  });
  console.log('Successfully reseeded Cloudflare D1!');
} catch (e) {
  console.error('Failed to execute D1 reseed:', e);
}

