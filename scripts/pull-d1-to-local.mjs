import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import { readFileSync, copyFileSync, existsSync } from 'fs';
import path from 'path';

console.log('🔄 [Cloudflare D1 -> Local SQLite Sync Engine]');
console.log('Fetching live database snapshot from Cloudflare D1 (billings-db)...');

const dumpSqlPath = path.resolve(process.cwd(), 'data/remote_d1_dump.sql');
const localDbPath = path.resolve(process.cwd(), 'data/records.sqlite');
const backupDbPath = path.resolve(process.cwd(), 'data/records.sqlite.bak');

try {
  // 1. Export remote D1 to SQL dump
  execSync(`npx wrangler d1 export billings-db --remote --output "${dumpSqlPath}" -y`, {
    stdio: 'inherit',
  });

  // 2. Backup existing local SQLite
  if (existsSync(localDbPath)) {
    copyFileSync(localDbPath, backupDbPath);
    console.log(`Backed up existing local DB to: data/records.sqlite.bak`);
  }

  // 3. Re-create local DB from the remote D1 SQL dump
  const dumpSql = readFileSync(dumpSqlPath, 'utf8');

  // Open fresh database connection
  const db = new Database(localDbPath);
  db.pragma('foreign_keys = OFF');

  // Drop existing tables
  const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all();
  for (const t of existingTables) {
    db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
  }

  // Execute dump
  db.exec(dumpSql);
  db.pragma('foreign_keys = ON');

  console.log('\n✅ Successfully loaded Cloudflare D1 into local SQLite (data/records.sqlite)!');

  // 4. Verification Table Summary
  console.log('\n📊 [Local SQLite Data Verification]:');
  const tables = [
    'organizations',
    'invoices',
    'invoice_items',
    'catalog_items',
    'expenses',
    'income_entries',
    'borrow_records',
    'financial_goals',
    'borrowing_accounts',
    'borrowing_transactions',
    'settings',
  ];

  const results = [];
  for (const t of tables) {
    try {
      const row = db.prepare(`SELECT count(*) as count FROM ${t}`).get();
      results.push({ Table: t, 'Row Count': row.count });
    } catch {
      results.push({ Table: t, 'Row Count': 'Table not found' });
    }
  }
  console.table(results);

  // Show organization & invoice details
  const org = db.prepare('SELECT id, name, phone, email FROM organizations LIMIT 1').get();
  if (org) {
    console.log('🏢 Organization in local DB:', org);
  }

  const inv = db.prepare('SELECT invoice_number, total, amount_paid, status FROM invoices LIMIT 1').get();
  if (inv) {
    console.log('🧾 Invoice in local DB:', inv);
  }

  db.close();
} catch (err) {
  console.error('❌ Failed to pull Cloudflare D1 to local:', err);
  process.exit(1);
}

