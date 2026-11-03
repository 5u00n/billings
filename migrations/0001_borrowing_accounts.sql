-- Additive borrowing-account ledger migration. Run before enabling the new UI.
CREATE TABLE IF NOT EXISTS borrowing_accounts (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, account_type TEXT NOT NULL CHECK(account_type IN ('CREDIT','CASH_LOAN')),
 version INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS borrowing_commands (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES borrowing_accounts(id), expected_version INTEGER NOT NULL,
 fingerprint TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS borrowing_command_version BEFORE INSERT ON borrowing_commands
 BEGIN SELECT CASE WHEN NEW.expected_version != (SELECT version FROM borrowing_accounts WHERE id=NEW.account_id)
 THEN RAISE(ABORT,'BORROWING_VERSION_CONFLICT') END; END;

CREATE TRIGGER IF NOT EXISTS borrowing_command_increment AFTER INSERT ON borrowing_commands
 BEGIN UPDATE borrowing_accounts SET version=version+1 WHERE id=NEW.account_id; END;

CREATE TABLE IF NOT EXISTS borrowing_transactions (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES borrowing_accounts(id), date TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('CREDIT_PURCHASE','CASH_BORROW','PAYMENT','FEE','OPENING','ADJUSTMENT','REVERSAL')),
 amount_paise INTEGER NOT NULL, debt_delta_paise INTEGER NOT NULL, cash_delta_paise INTEGER NOT NULL,
 description TEXT NOT NULL, payment_method TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 original_record_id TEXT, reverses_id TEXT UNIQUE REFERENCES borrowing_transactions(id),
 effective_order INTEGER NOT NULL, command_id TEXT NOT NULL REFERENCES borrowing_commands(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS borrowing_transactions_account_date ON borrowing_transactions(account_id,date);

CREATE TABLE IF NOT EXISTS borrowing_bills (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES borrowing_accounts(id), as_of_date TEXT NOT NULL,
 due_date TEXT NOT NULL, amount_paise INTEGER NOT NULL CHECK(amount_paise>=0), notes TEXT NOT NULL DEFAULT '',
 command_id TEXT NOT NULL REFERENCES borrowing_commands(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS borrowing_expense_links (
 expense_id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL UNIQUE REFERENCES borrowing_transactions(id)
);

CREATE TABLE IF NOT EXISTS borrowing_legacy_links (
 borrow_id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES borrowing_accounts(id), snapshot_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS borrowing_backups (
 id TEXT PRIMARY KEY, snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
