import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { runDiagnostics, executeRepair } from '../server/admin/diagnostics';
import { createEntityId, isValidEntityId } from '../server/utils/id';

function createTestDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(readFileSync('schema.sql', 'utf8'));

  // Insert sample test data
  db.exec(`
    INSERT INTO organizations (id, name, address) VALUES ('org_12345678', 'Test Client', 'Test Address');
    INSERT INTO invoices (id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date, items_json, sub_total, total, balance_due)
    VALUES ('inv_12345678', 'INV-001', 'TAX INVOICE', 'org_12345678', '2026-11-01', 'Due on Receipt', '2026-11-01', '[]', 5000, 5000, 5000);
    INSERT INTO expenses (id, date, month, category, tag, description, amount)
    VALUES ('exp_12345678', '2026-11-01', '2026-11', 'reg', 'Fuel', 'Petrol', 500);
    INSERT INTO borrow_records (id, date, month, type, person, amount)
    VALUES ('brw_12345678', '2026-11-01', '2026-11', 'BORROW', 'Friend', 2000);
  `);

  return db;
}

// 1. Test ID Utility
console.log('Testing ID Generation & Validation...');
const expId = createEntityId('exp');
const invId = createEntityId('inv');
assert.ok(expId.startsWith('exp_'), `Expected exp_ prefix, got ${expId}`);
assert.ok(invId.startsWith('inv_'), `Expected inv_ prefix, got ${invId}`);
assert.ok(isValidEntityId(expId, 'exp'));
assert.ok(isValidEntityId(invId, 'inv'));
assert.ok(!isValidEntityId('invalid-string', 'exp'));

// 2. Test Diagnostics Report
console.log('Testing Diagnostics Engine...');
const db = createTestDatabase();
const report = await runDiagnostics(db);
assert.equal(typeof report.tableCounts, 'object');
assert.equal(report.tableCounts.invoices, 1);
assert.equal(report.tableCounts.organizations, 1);
assert.equal(report.tableCounts.expenses, 1);
assert.equal(report.tableCounts.borrow_records, 1);

// 3. Test Selective Expense Reset (Option 2)
console.log('Testing Selective Expense Reset...');
const resetResult = await executeRepair(db, 'reset_expense_data', false);
assert.ok(resetResult.success);

const postResetReport = await runDiagnostics(db);
// Expenses and borrows must be ZERO
assert.equal(postResetReport.tableCounts.expenses, 0, 'Expenses should be 0 after reset');
assert.equal(postResetReport.tableCounts.borrow_records, 0, 'Borrows should be 0 after reset');
// Invoices and Organizations must be completely INTACT!
assert.equal(postResetReport.tableCounts.invoices, 1, 'Invoices must remain intact');
assert.equal(postResetReport.tableCounts.organizations, 1, 'Organizations must remain intact');

console.log('All Diagnostics & ID tests passed successfully!');

