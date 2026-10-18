import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { generateDocxBuffer } from './docxGenerator';
import { generateVectorPdfBuffer } from './pdfGenerator';
import { Invoice, Organization, UserProfile, NumberingSettings, CatalogItem } from '../src/types';

// Automatically load .env.local and .env into process.env if present
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch {}
  }
}
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

const app = express();
const PORT = process.env.PORT || 5001;

export const DEFAULT_PROFILE: UserProfile = {
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
  showUpiOnBill: false,
  showQrOnBill: false,
  defaultHideQty: false,
  defaultNotes: 'Thank you for your business.',
  defaultTerms: 'Due on Receipt',
  signatureText: 'Authorized Signatory',
  logoUrl: '',
  customQrUrl: '',
};

export const DEFAULT_NUMBERING: NumberingSettings = {
  billOfSupplyPrefix: 'BOS',
  invoicePrefix: 'INV',
  estimatePrefix: 'EST',
  receiptPrefix: 'REC',
  nextNumberBOS: 1,
  nextNumberINV: 1,
  nextNumberEST: 1,
  nextNumberREC: 1,
};

function parseJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, native client, server-to-server) or from allowed origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy for untrusted origin.'));
    },
    credentials: true,
  })
);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '15mb' }));

// ----------------- PUBLIC RUNTIME CONFIG & AUTH -----------------

app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || '',
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || '',
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || '',
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    platform: 'express-local',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Authorization header.' });
  }

  const token = authHeader.slice(7).trim();
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload !== 'object') {
    return res.status(401).json({ error: 'Invalid or malformed authentication token.' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  const allowedList = (process.env.VITE_ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const email = (payload.email || '').toLowerCase();
  if (allowedList.length > 0) {
    if (!email || !allowedList.includes(email)) {
      return res.status(403).json({
        error: `Access restricted. Email '${email || 'Unknown'}' is not authorized. Authorized accounts: ${allowedList.join(', ')}`,
      });
    }
  }

  return res.json({
    success: true,
    authorized: true,
    email: payload.email || null,
  });
});

// Helper to map DB row to Invoice object
function mapInvoiceRow(row: any, orgRow?: any): Invoice {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    doc_type: row.doc_type,
    organization_id: row.organization_id,
    organization: orgRow
      ? {
          id: orgRow.id,
          name: orgRow.name,
          address: orgRow.address,
          city: orgRow.city,
          state: orgRow.state,
          pincode: orgRow.pincode,
          country: orgRow.country,
          phone: orgRow.phone,
          email: orgRow.email,
        }
      : undefined,
    invoice_date: row.invoice_date,
    terms: row.terms,
    due_date: row.due_date,
    items: JSON.parse(row.items_json || '[]'),
    sub_total: row.sub_total,
    total: row.total,
    amount_paid: row.amount_paid,
    balance_due: row.balance_due,
    notes: row.notes,
    payment_options: row.payment_options,
    status: row.status,
    copy_type: row.copy_type,
    hide_qty: Boolean(row.hide_qty),
    created_at: row.created_at,
  };
}

// ----------------- INVOICES API -----------------

app.get('/api/invoices', (req: Request, res: Response) => {
  const { organization_id, status, doc_type, search } = req.query;

  let query = `
    SELECT i.*, o.name as org_name, o.address as org_address, o.city as org_city,
           o.state as org_state, o.pincode as org_pincode, o.country as org_country,
           o.phone as org_phone, o.email as org_email
    FROM invoices i
    LEFT JOIN organizations o ON i.organization_id = o.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (organization_id) {
    query += ` AND i.organization_id = ?`;
    params.push(organization_id);
  }
  if (status) {
    query += ` AND i.status = ?`;
    params.push(status);
  }
  if (doc_type) {
    query += ` AND i.doc_type = ?`;
    params.push(doc_type);
  }
  if (search) {
    query += ` AND (i.invoice_number LIKE ? OR o.name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY i.created_at DESC`;

  const rows = db.prepare(query).all(...params);
  const invoices = rows.map((r: any) =>
    mapInvoiceRow(r, {
      id: r.organization_id,
      name: r.org_name,
      address: r.org_address,
      city: r.org_city,
      state: r.org_state,
      pincode: r.org_pincode,
      country: r.org_country,
      phone: r.org_phone,
      email: r.org_email,
    })
  );

  res.json(invoices);
});

app.get('/api/invoices/:id', (req: Request, res: Response) => {
  const row: any = db
    .prepare(
      `
    SELECT i.*, o.name as org_name, o.address as org_address, o.city as org_city,
           o.state as org_state, o.pincode as org_pincode, o.country as org_country,
           o.phone as org_phone, o.email as org_email
    FROM invoices i
    LEFT JOIN organizations o ON i.organization_id = o.id
    WHERE i.id = ?
  `
    )
    .get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  res.json(
    mapInvoiceRow(row, {
      id: row.organization_id,
      name: row.org_name,
      address: row.org_address,
      city: row.org_city,
      state: row.org_state,
      pincode: row.org_pincode,
      country: row.org_country,
      phone: row.org_phone,
      email: row.org_email,
    })
  );
});

app.post('/api/invoices', (req: Request, res: Response) => {
  const body = req.body;
  const id = body.id || `inv-${Date.now()}`;
  const itemsJson = JSON.stringify(body.items || []);

  try {
    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date,
        items_json, sub_total, total, amount_paid, balance_due, notes, payment_options, status, copy_type, hide_qty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.invoice_number,
      body.doc_type || 'BILL OF SUPPLY',
      body.organization_id,
      body.invoice_date,
      body.terms || 'Due on Receipt',
      body.due_date,
      itemsJson,
      body.sub_total || 0,
      body.total || 0,
      body.amount_paid || 0,
      body.balance_due || body.total || 0,
      body.notes || 'Thanks for your business.',
      body.payment_options || '',
      body.status || 'issued',
      body.copy_type || 'ORIGINAL',
      body.hide_qty ? 1 : 0
    );

    // Update numbering setting if it matches the current sequence or prefix
    const numberingRow: any = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('numbering');
    if (numberingRow) {
      const numbering = JSON.parse(numberingRow.value_json);
      const invNum = (body.invoice_number || '').trim();
      const match = invNum.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (
          (numbering.billOfSupplyPrefix && invNum.startsWith(numbering.billOfSupplyPrefix)) ||
          body.doc_type === 'BILL OF SUPPLY'
        ) {
          numbering.nextNumberBOS = Math.max(numbering.nextNumberBOS || 1, num + 1);
        }
        if (
          (numbering.invoicePrefix && invNum.startsWith(numbering.invoicePrefix)) ||
          body.doc_type === 'INVOICE'
        ) {
          numbering.nextNumberINV = Math.max(numbering.nextNumberINV || 1, num + 1);
        }
        if (
          (numbering.estimatePrefix && invNum.startsWith(numbering.estimatePrefix)) ||
          body.doc_type === 'ESTIMATE' ||
          body.doc_type === 'PROFORMA'
        ) {
          numbering.nextNumberEST = Math.max(numbering.nextNumberEST || 1, num + 1);
        }
        if (
          (numbering.receiptPrefix && invNum.startsWith(numbering.receiptPrefix)) ||
          body.doc_type === 'RECEIPT'
        ) {
          numbering.nextNumberREC = Math.max(numbering.nextNumberREC || 1, num + 1);
        }
        db.prepare('UPDATE settings SET value_json = ? WHERE key = ?').run(JSON.stringify(numbering), 'numbering');
      }
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/invoices/:id', (req: Request, res: Response) => {
  const body = req.body;
  const itemsJson = JSON.stringify(body.items || []);

  try {
    db.prepare(`
      UPDATE invoices SET
        invoice_number = ?,
        doc_type = ?,
        organization_id = ?,
        invoice_date = ?,
        terms = ?,
        due_date = ?,
        items_json = ?,
        sub_total = ?,
        total = ?,
        amount_paid = ?,
        balance_due = ?,
        notes = ?,
        payment_options = ?,
        status = ?,
        copy_type = ?,
        hide_qty = ?
      WHERE id = ?
    `).run(
      body.invoice_number,
      body.doc_type,
      body.organization_id,
      body.invoice_date,
      body.terms,
      body.due_date,
      itemsJson,
      body.sub_total,
      body.total,
      body.amount_paid,
      body.balance_due,
      body.notes,
      body.payment_options,
      body.status,
      body.copy_type || 'ORIGINAL',
      body.hide_qty ? 1 : 0,
      req.params.id
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ----------------- ORGANIZATIONS API -----------------

app.get('/api/organizations', (_req: Request, res: Response) => {
  const orgs: any[] = db.prepare('SELECT * FROM organizations ORDER BY name ASC').all();

  // Aggregate stats per organization
  const results = orgs.map((org) => {
    const stats: any = db
      .prepare(
        `
      SELECT 
        COUNT(*) as invoices_count,
        COALESCE(SUM(total), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance_due), 0) as balance_due
      FROM invoices
      WHERE organization_id = ?
    `
      )
      .get(org.id);

    return {
      ...org,
      invoices_count: stats?.invoices_count || 0,
      total_invoiced: stats?.total_invoiced || 0,
      total_paid: stats?.total_paid || 0,
      balance_due: stats?.balance_due || 0,
    };
  });

  res.json(results);
});

app.get('/api/organizations/:id', (req: Request, res: Response) => {
  const org: any = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const invoicesRows = db
    .prepare('SELECT * FROM invoices WHERE organization_id = ? ORDER BY created_at DESC')
    .all(org.id);

  const invoices = invoicesRows.map((r: any) => mapInvoiceRow(r, org));

  const stats: any = db
    .prepare(
      `
    SELECT 
      COUNT(*) as invoices_count,
      COALESCE(SUM(total), 0) as total_invoiced,
      COALESCE(SUM(amount_paid), 0) as total_paid,
      COALESCE(SUM(balance_due), 0) as balance_due
    FROM invoices
    WHERE organization_id = ?
  `
    )
    .get(org.id);

  res.json({
    ...org,
    invoices_count: stats?.invoices_count || 0,
    total_invoiced: stats?.total_invoiced || 0,
    total_paid: stats?.total_paid || 0,
    balance_due: stats?.balance_due || 0,
    invoices,
  });
});

app.post('/api/organizations', (req: Request, res: Response) => {
  const body = req.body;
  const id = body.id || `org-${Date.now()}`;

  db.prepare(`
    INSERT INTO organizations (id, name, address, city, state, pincode, country, phone, email, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.name,
    body.address || '',
    body.city || '',
    body.state || '',
    body.pincode || '',
    body.country || 'India',
    body.phone || '',
    body.email || '',
    body.notes || ''
  );

  res.json({ success: true, id });
});

app.put('/api/organizations/:id', (req: Request, res: Response) => {
  const body = req.body;

  db.prepare(`
    UPDATE organizations SET
      name = ?,
      address = ?,
      city = ?,
      state = ?,
      pincode = ?,
      country = ?,
      phone = ?,
      email = ?,
      notes = ?
    WHERE id = ?
  `).run(
    body.name,
    body.address || '',
    body.city || '',
    body.state || '',
    body.pincode || '',
    body.country || 'India',
    body.phone || '',
    body.email || '',
    body.notes || '',
    req.params.id
  );

  res.json({ success: true });
});

app.delete('/api/organizations/:id', (req: Request, res: Response) => {
  // Check if invoices exist
  const invCount: any = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE organization_id = ?').get(req.params.id);
  if (invCount?.count > 0) {
    res.status(400).json({ error: `Cannot delete organization with ${invCount.count} existing invoices.` });
    return;
  }
  db.prepare('DELETE FROM organizations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ----------------- SETTINGS & AUTO-NUMBERING -----------------

app.get('/api/settings', (_req: Request, res: Response) => {
  const profileRow: any = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('profile');
  const numberingRow: any = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('numbering');

  const profile = profileRow ? JSON.parse(profileRow.value_json) : {};
  const numbering = numberingRow ? JSON.parse(numberingRow.value_json) : {};

  res.json({
    profile: { ...DEFAULT_PROFILE, ...profile },
    numbering: { ...DEFAULT_NUMBERING, ...numbering },
  });
});

const handleSaveSettings = (req: Request, res: Response) => {
  const { profile, numbering } = req.body;
  if (profile) {
    db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json')
      .run('profile', JSON.stringify(profile));
  }
  if (numbering) {
    db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json')
      .run('numbering', JSON.stringify(numbering));
  }
  res.json({ success: true });
};

app.put('/api/settings', handleSaveSettings);
app.post('/api/settings', handleSaveSettings);

app.get('/api/next-number', (req: Request, res: Response) => {
  const docType = (req.query.type as string) || 'BILL OF SUPPLY';
  const numberingRow: any = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('numbering');
  const numbering: NumberingSettings = numberingRow
    ? JSON.parse(numberingRow.value_json)
    : {
        billOfSupplyPrefix: 'BOS-',
        invoicePrefix: 'INV-',
        estimatePrefix: 'EST-',
        receiptPrefix: 'REC-',
        nextNumberBOS: 1,
        nextNumberINV: 1,
        nextNumberEST: 1,
        nextNumberREC: 1,
      };

  let prefix = numbering.billOfSupplyPrefix || 'BOS-';
  let seq = numbering.nextNumberBOS || 1;

  if (docType === 'INVOICE') {
    prefix = numbering.invoicePrefix || 'INV-';
    seq = numbering.nextNumberINV || 1;
  } else if (docType === 'ESTIMATE' || docType === 'PROFORMA') {
    prefix = numbering.estimatePrefix || 'EST-';
    seq = numbering.nextNumberEST || 1;
  } else if (docType === 'RECEIPT') {
    prefix = numbering.receiptPrefix || 'REC-';
    seq = numbering.nextNumberREC || 1;
  }

  // Scan existing invoices in the database to guarantee seq is strictly greater than any existing invoice
  const existingInvoices = db.prepare('SELECT invoice_number, doc_type FROM invoices').all() as {
    invoice_number: string;
    doc_type: string;
  }[];

  let maxNumInDb = 0;
  for (const inv of existingInvoices) {
    const invNum = inv.invoice_number || '';
    const numMatch = invNum.match(/\d+$/);
    if (numMatch) {
      const n = parseInt(numMatch[0], 10);
      // If invoice has matching prefix or matching docType
      if (invNum.startsWith(prefix) || inv.doc_type === docType) {
        if (n > maxNumInDb) {
          maxNumInDb = n;
        }
      }
    }
  }

  if (maxNumInDb >= seq) {
    seq = maxNumInDb + 1;
  }

  // Format with 6 digits padding like INV-000001 or BOS-000001
  const formatted = `${prefix}${String(seq).padStart(6, '0')}`;
  res.json({ nextNumber: formatted, prefix, sequence: seq });
});

// ----------------- CATALOG ITEMS -----------------

app.get('/api/catalog', (_req: Request, res: Response) => {
  const items = db.prepare('SELECT * FROM catalog_items ORDER BY name ASC').all();
  res.json(items);
});

app.post('/api/catalog', (req: Request, res: Response) => {
  const id = req.body.id || `cat-${Date.now()}`;
  db.prepare('INSERT INTO catalog_items (id, name, description, default_rate) VALUES (?, ?, ?, ?)').run(
    id,
    req.body.name,
    req.body.description || '',
    req.body.default_rate || 0
  );
  res.json({ success: true, id });
});

// Bulk Import Catalog Items
app.post('/api/catalog/batch', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const insertStmt = db.prepare('INSERT INTO catalog_items (id, name, description, default_rate) VALUES (?, ?, ?, ?)');
    let importedCount = 0;
    const insertMany = db.transaction((records: any[]) => {
      for (const item of records) {
        if (!item.name && !item.description) continue;
        const id = item.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const name = String(item.name || item.description || 'Item').trim();
        const description = String(item.description || '').trim();
        const defaultRate = Number(item.default_rate || item.rate || 0);

        insertStmt.run(id, name, description, defaultRate);
        importedCount++;
      }
    });

    insertMany(items);
    res.json({ success: true, count: importedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/catalog/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM catalog_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ----------------- DOCX EXPORT ENDPOINT -----------------

app.post('/api/export-docx', async (req: Request, res: Response) => {
  try {
    const invoice: Invoice = req.body.invoice;
    const profileRow: any = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('profile');
    const profile: UserProfile = profileRow ? JSON.parse(profileRow.value_json) : {};

    const buffer = await generateDocxBuffer(invoice, profile);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number || 'bill'}.docx"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Docx export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------- VECTOR PDF EXPORT ENDPOINT -----------------

app.post('/api/export-pdf', async (req: Request, res: Response) => {
  try {
    const invoice: Invoice = req.body.invoice;
    const profileRow: any = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('profile');
    const profile: UserProfile = profileRow ? JSON.parse(profileRow.value_json) : {};

    const buffer = await generateVectorPdfBuffer(invoice, profile);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number || 'bill'}.pdf"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Vector PDF export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------- BACKUP & RESTORE -----------------

app.get('/api/backup', (_req: Request, res: Response) => {
  try {
    const orgs = db.prepare('SELECT * FROM organizations').all();
    const invoices = db.prepare('SELECT * FROM invoices').all();
    const settings = db.prepare('SELECT * FROM settings').all();
    const catalog = db.prepare('SELECT * FROM catalog_items').all();
    const expenses = db.prepare('SELECT * FROM expenses').all();
    const income = db.prepare('SELECT * FROM income_entries').all();
    const borrow = db.prepare('SELECT * FROM borrow_records').all();
    const summaries = db.prepare('SELECT * FROM monthly_budget_summaries').all();
    const goals = db.prepare('SELECT * FROM financial_goals').all();
    const allocationRules = db.prepare('SELECT * FROM budget_allocation_rules').all();
    const taxReminders = db.prepare('SELECT * FROM tax_reminders').all();
    const sbiPpsCheques = db.prepare('SELECT * FROM sbi_pps_cheques').all();
    const withdrawals = db.prepare('SELECT * FROM current_account_withdrawals').all();
    const recurring = db.prepare('SELECT * FROM recurring_schedules').all();

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="billings-full-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.json({
      version: '2.0',
      timestamp: new Date().toISOString(),
      organizations: orgs,
      invoices,
      settings,
      catalog,
      expenses,
      income,
      borrow,
      summaries,
      goals,
      allocationRules,
      taxReminders,
      sbiPpsCheques,
      withdrawals,
      recurring,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/restore', (req: Request, res: Response) => {
  const data = req.body;
  if (!data || (!data.organizations && !data.invoices && !data.expenses)) {
    res.status(400).json({ error: 'Invalid backup format. Backup must contain recognizable system data.' });
    return;
  }

  const transaction = db.transaction(() => {
    // 1. Invoices & Organizations & Catalog
    if (Array.isArray(data.invoices)) {
      db.prepare('DELETE FROM invoices').run();
    }
    if (Array.isArray(data.organizations)) {
      db.prepare('DELETE FROM organizations').run();
    }
    if (Array.isArray(data.catalog)) {
      db.prepare('DELETE FROM catalog_items').run();
    }

    if (Array.isArray(data.organizations)) {
      const insertOrg = db.prepare(`
        INSERT INTO organizations (id, name, address, city, state, pincode, country, phone, email, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const org of data.organizations) {
        insertOrg.run(
          org.id,
          org.name,
          org.address || '',
          org.city || '',
          org.state || '',
          org.pincode || '',
          org.country || 'India',
          org.phone || '',
          org.email || '',
          org.notes || '',
          org.created_at || new Date().toISOString()
        );
      }
    }

    if (Array.isArray(data.invoices)) {
      const insertInv = db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date,
          items_json, sub_total, total, amount_paid, balance_due, notes, payment_options, status, copy_type, hide_qty, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const inv of data.invoices) {
        insertInv.run(
          inv.id,
          inv.invoice_number,
          inv.doc_type || 'BILL OF SUPPLY',
          inv.organization_id,
          inv.invoice_date,
          inv.terms || 'Due on Receipt',
          inv.due_date || inv.invoice_date,
          inv.items_json || '[]',
          Number(inv.sub_total || 0),
          Number(inv.total || 0),
          Number(inv.amount_paid || 0),
          Number(inv.balance_due || 0),
          inv.notes || '',
          inv.payment_options || '',
          inv.status || 'issued',
          inv.copy_type || 'ORIGINAL',
          inv.hide_qty ? 1 : 0,
          inv.created_at || new Date().toISOString()
        );
      }
    }

    if (Array.isArray(data.catalog)) {
      const insertCat = db.prepare(
        'INSERT INTO catalog_items (id, name, description, default_rate) VALUES (?, ?, ?, ?)'
      );
      for (const item of data.catalog) {
        insertCat.run(item.id, item.name, item.description || '', Number(item.default_rate || 0));
      }
    }

    // 2. Settings
    if (Array.isArray(data.settings)) {
      const upsertSetting = db.prepare(`
        INSERT INTO settings (key, value_json) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
      `);
      for (const s of data.settings) {
        upsertSetting.run(s.key, typeof s.value_json === 'string' ? s.value_json : JSON.stringify(s.value_json));
      }
    }

    // 3. Expenses
    if (Array.isArray(data.expenses)) {
      db.prepare('DELETE FROM expenses').run();
      const insertExp = db.prepare(`
        INSERT INTO expenses (
          id, date, month, category, tag, description, amount, payment_method, notes,
          tax_classification, business_percentage, gst_rate, gst_itc_eligible, has_invoice_voucher, voucher_ref, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const exp of data.expenses) {
        insertExp.run(
          exp.id,
          exp.date,
          exp.month || exp.date.slice(0, 7),
          exp.category || 'reg',
          exp.tag || '',
          exp.description || '',
          Number(exp.amount || 0),
          exp.payment_method || 'UPI / Bank',
          exp.notes || '',
          exp.tax_classification || 'BUSINESS_DEDUCTIBLE',
          exp.business_percentage !== undefined ? Number(exp.business_percentage) : 100,
          Number(exp.gst_rate || 0),
          exp.gst_itc_eligible ? 1 : 0,
          exp.has_invoice_voucher !== undefined ? (exp.has_invoice_voucher ? 1 : 0) : 1,
          exp.voucher_ref || '',
          exp.created_at || new Date().toISOString()
        );
      }
    }

    // 4. Income entries
    if (Array.isArray(data.income)) {
      db.prepare('DELETE FROM income_entries').run();
      const insertInc = db.prepare(`
        INSERT INTO income_entries (id, date, month, category, source, amount, invoice_id, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const inc of data.income) {
        insertInc.run(
          inc.id,
          inc.date,
          inc.month || inc.date.slice(0, 7),
          inc.category || 'fl',
          inc.source || '',
          Number(inc.amount || 0),
          inc.invoice_id || null,
          inc.notes || '',
          inc.created_at || new Date().toISOString()
        );
      }
    }

    // 5. Borrow records
    if (Array.isArray(data.borrow)) {
      db.prepare('DELETE FROM borrow_records').run();
      const insertBr = db.prepare(`
        INSERT INTO borrow_records (id, date, month, type, person, reason, amount, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const br of data.borrow) {
        insertBr.run(
          br.id,
          br.date,
          br.month || br.date.slice(0, 7),
          br.type || 'BORROW',
          br.person || '',
          br.reason || '',
          Number(br.amount || 0),
          br.status || 'PENDING',
          br.created_at || new Date().toISOString()
        );
      }
    }

    // 6. Monthly budget summaries
    if (Array.isArray(data.summaries)) {
      db.prepare('DELETE FROM monthly_budget_summaries').run();
      const insertSum = db.prepare(`
        INSERT INTO monthly_budget_summaries (
          month, starting_debt, previous_remaining, dept_payment, borrow_amount, reg_savings, ext_savings, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of data.summaries) {
        insertSum.run(
          s.month,
          Number(s.starting_debt || 0),
          Number(s.previous_remaining || 0),
          Number(s.dept_payment || 0),
          Number(s.borrow_amount || 0),
          Number(s.reg_savings || 0),
          Number(s.ext_savings || 0),
          s.notes || '',
          s.updated_at || new Date().toISOString()
        );
      }
    }

    // 7. Goals
    if (Array.isArray(data.goals)) {
      db.prepare('DELETE FROM financial_goals').run();
      const insertGoal = db.prepare(`
        INSERT INTO financial_goals (id, name, target_amount, savings_percent, saved_amount, target_date, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const g of data.goals) {
        insertGoal.run(
          g.id,
          g.name,
          Number(g.target_amount || 0),
          Number(g.savings_percent || 0),
          Number(g.saved_amount || 0),
          g.target_date || '',
          g.status || 'IN_PROGRESS',
          g.notes || '',
          g.created_at || new Date().toISOString()
        );
      }
    }

    // 8. Allocation rules
    if (Array.isArray(data.allocationRules)) {
      db.prepare('DELETE FROM budget_allocation_rules').run();
      const insertRule = db.prepare(`
        INSERT INTO budget_allocation_rules (id, category, percentage, display_order)
        VALUES (?, ?, ?, ?)
      `);
      for (const r of data.allocationRules) {
        insertRule.run(r.id, r.category, Number(r.percentage || 0), Number(r.display_order || 0));
      }
    }

    // 9. Tax Reminders
    if (Array.isArray(data.taxReminders)) {
      db.prepare('DELETE FROM tax_reminders').run();
      const insertRem = db.prepare(`
        INSERT INTO tax_reminders (
          id, title, description, due_date, category, is_recurring, frequency, is_completed, completed_at, notify_before_days, priority, penalty_note, action_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const rem of data.taxReminders) {
        insertRem.run(
          rem.id,
          rem.title,
          rem.description || '',
          rem.due_date,
          rem.category || 'CUSTOM',
          rem.is_recurring ? 1 : 0,
          rem.frequency || 'ONCE',
          rem.is_completed ? 1 : 0,
          rem.completed_at || null,
          Number(rem.notify_before_days || 7),
          rem.priority || 'HIGH',
          rem.penalty_note || '',
          rem.action_url || '',
          rem.created_at || new Date().toISOString()
        );
      }
    }

    // 10. SBI PPS Cheques
    if (Array.isArray(data.sbiPpsCheques)) {
      db.prepare('DELETE FROM sbi_pps_cheques').run();
      const insertPps = db.prepare(`
        INSERT INTO sbi_pps_cheques (id, cheque_number, payee_name, amount, issue_date, account_number, pps_status, pps_reference, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of data.sbiPpsCheques) {
        insertPps.run(
          p.id,
          String(p.cheque_number),
          p.payee_name,
          Number(p.amount || 0),
          p.issue_date,
          p.account_number || '45661497562',
          p.pps_status || 'PENDING_REGISTRATION',
          p.pps_reference || null,
          p.notes || null,
          p.created_at || new Date().toISOString()
        );
      }
    }

    // 11. Current Account Withdrawals
    if (Array.isArray(data.withdrawals)) {
      db.prepare('DELETE FROM current_account_withdrawals').run();
      const insertWith = db.prepare(`
        INSERT INTO current_account_withdrawals (id, date, month, amount, notes, income_entry_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const w of data.withdrawals) {
        insertWith.run(
          w.id,
          w.date,
          w.month || w.date.slice(0, 7),
          Number(w.amount || 0),
          w.notes || null,
          w.income_entry_id || null,
          w.created_at || new Date().toISOString()
        );
      }
    }

    // 12. Recurring Schedules
    if (Array.isArray(data.recurring)) {
      db.prepare('DELETE FROM recurring_schedules').run();
      const insertSched = db.prepare(`
        INSERT INTO recurring_schedules (
          id, name, organization_id, schedule_type, doc_type, monthly_day, total_amount, milestones_json, items_json, terms, notes, status, last_run_date, next_run_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of data.recurring) {
        insertSched.run(
          r.id,
          r.name,
          r.organization_id,
          r.schedule_type || 'MONTHLY_SUBSCRIPTION',
          r.doc_type || 'BILL OF SUPPLY',
          r.monthly_day || 1,
          r.total_amount ? Number(r.total_amount) : null,
          r.milestones_json || null,
          r.items_json || null,
          r.terms || 'Due on Receipt',
          r.notes || null,
          r.status || 'ACTIVE',
          r.last_run_date || null,
          r.next_run_date || null,
          r.created_at || new Date().toISOString()
        );
      }
    }
  });

  try {
    transaction();
    res.json({ success: true, message: 'All database tables restored successfully.' });
  } catch (err: any) {
    console.error('Database restore error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------- RECURRING SCHEDULES & AUTOMATIONS -----------------

function generateNextInvoiceNumberInternal(docType: string): string {
  const getNextNumberTx = db.transaction(() => {
    const numberingRow: any = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('numbering');
    const numbering = numberingRow
      ? JSON.parse(numberingRow.value_json)
      : {
          billOfSupplyPrefix: 'BOS-',
          invoicePrefix: 'INV-',
          estimatePrefix: 'EST-',
          receiptPrefix: 'REC-',
          nextNumberBOS: 1,
          nextNumberINV: 1,
          nextNumberEST: 1,
          nextNumberREC: 1,
        };

    let prefix = numbering.billOfSupplyPrefix || 'BOS-';
    let seq = numbering.nextNumberBOS || 1;

    if (docType === 'INVOICE') {
      prefix = numbering.invoicePrefix || 'INV-';
      seq = numbering.nextNumberINV || 1;
    } else if (docType === 'ESTIMATE' || docType === 'PROFORMA') {
      prefix = numbering.estimatePrefix || 'EST-';
      seq = numbering.nextNumberEST || 1;
    } else if (docType === 'RECEIPT') {
      prefix = numbering.receiptPrefix || 'REC-';
      seq = numbering.nextNumberREC || 1;
    }

    // Scan existing invoices in the database
    const existingInvoices = db.prepare('SELECT invoice_number, doc_type FROM invoices').all() as {
      invoice_number: string;
      doc_type: string;
    }[];

    let maxNumInDb = 0;
    for (const inv of existingInvoices) {
      const invNum = inv.invoice_number || '';
      const numMatch = invNum.match(/\d+$/);
      if (numMatch) {
        const n = parseInt(numMatch[0], 10);
        if (invNum.startsWith(prefix) || inv.doc_type === docType) {
          if (n > maxNumInDb) {
            maxNumInDb = n;
          }
        }
      }
    }

    if (maxNumInDb >= seq) {
      seq = maxNumInDb + 1;
    }

    if (docType === 'INVOICE') {
      numbering.nextNumberINV = seq + 1;
    } else if (docType === 'ESTIMATE' || docType === 'PROFORMA') {
      numbering.nextNumberEST = seq + 1;
    } else if (docType === 'RECEIPT') {
      numbering.nextNumberREC = seq + 1;
    } else {
      numbering.nextNumberBOS = seq + 1;
    }

    db.prepare('UPDATE settings SET value_json = ? WHERE key = ?').run(JSON.stringify(numbering), 'numbering');
    return `${prefix}${String(seq).padStart(6, '0')}`;
  });

  return getNextNumberTx();
}

function formatDateToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-GB');
  // If YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function calculateNextMonthlyRunDate(currentDateStr: string, targetDay: number): string {
  if (!currentDateStr || isNaN(Date.parse(currentDateStr))) {
    currentDateStr = new Date().toISOString().split('T')[0];
  }
  const d = new Date(currentDateStr);
  const safeTargetDay = isNaN(targetDay) || targetDay < 1 ? 1 : Math.min(31, Math.floor(targetDay));
  d.setMonth(d.getMonth() + 1);
  const year = d.getFullYear();
  const month = d.getMonth();
  const maxDays = new Date(year, month + 1, 0).getDate();
  const day = Math.min(safeTargetDay, maxDays);
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function evaluateAndRunDueSchedules(): { generatedCount: number; generatedInvoices: string[] } {
  const today = new Date().toISOString().split('T')[0];
  const activeSchedules: any[] = db
    .prepare('SELECT * FROM recurring_schedules WHERE status = ?')
    .all('ACTIVE');

  let generatedCount = 0;
  const generatedInvoices: string[] = [];

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date,
      items_json, sub_total, total, amount_paid, balance_due, notes, payment_options, status, copy_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const schedule of activeSchedules) {
    if (schedule.schedule_type === 'MONTHLY_SUBSCRIPTION') {
      // Check if due
      if (schedule.next_run_date && schedule.next_run_date <= today) {
        const invId = `inv-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const invNumber = generateNextInvoiceNumberInternal(schedule.doc_type || 'BILL OF SUPPLY');
        const items = schedule.items_json ? JSON.parse(schedule.items_json) : [];
        const total = items.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
        const invDateDisplay = formatDateToDDMMYYYY(schedule.next_run_date);

        insertInvoice.run(
          invId,
          invNumber,
          schedule.doc_type || 'BILL OF SUPPLY',
          schedule.organization_id,
          invDateDisplay,
          schedule.terms || 'Due on Receipt',
          invDateDisplay,
          JSON.stringify(items),
          total,
          total,
          0,
          total,
          schedule.notes || 'Automated recurring monthly bill.',
          '',
          'issued',
          'ORIGINAL'
        );

        const nextRun = calculateNextMonthlyRunDate(schedule.next_run_date, schedule.monthly_day || 1);
        db.prepare(`
          UPDATE recurring_schedules
          SET last_run_date = ?, next_run_date = ?
          WHERE id = ?
        `).run(today, nextRun, schedule.id);

        generatedCount++;
        generatedInvoices.push(invNumber);
      }
    } else if (schedule.schedule_type === 'MILESTONE_LIST') {
      const milestones = schedule.milestones_json ? JSON.parse(schedule.milestones_json) : [];
      let updatedMilestones = false;

      for (const m of milestones) {
        if (!m.invoiceId && m.date && m.date <= today) {
          const invId = `inv-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const invNumber = generateNextInvoiceNumberInternal(schedule.doc_type || 'BILL OF SUPPLY');
          const mDateDisplay = formatDateToDDMMYYYY(m.date);
          const item = {
            id: 'item-1',
            description: m.description || `${schedule.name} - Milestone`,
            qty: 1,
            rate: m.amount,
            amount: m.amount,
          };

          insertInvoice.run(
            invId,
            invNumber,
            schedule.doc_type || 'BILL OF SUPPLY',
            schedule.organization_id,
            mDateDisplay,
            schedule.terms || 'Due on Receipt',
            mDateDisplay,
            JSON.stringify([item]),
            m.amount,
            m.amount,
            0,
            m.amount,
            schedule.notes || `Milestone payment: ${m.description}`,
            '',
            'issued',
            'ORIGINAL'
          );

          m.invoiceId = invId;
          m.invoiceNumber = invNumber;
          m.generatedDate = today;
          updatedMilestones = true;
          generatedCount++;
          generatedInvoices.push(invNumber);
        }
      }

      if (updatedMilestones) {
        const remaining = milestones.filter((m: any) => !m.invoiceId);
        let nextRun: string | null = null;
        let newStatus = schedule.status;

        if (remaining.length > 0) {
          remaining.sort((a: any, b: any) => a.date.localeCompare(b.date));
          nextRun = remaining[0].date;
        } else {
          newStatus = 'COMPLETED';
        }

        db.prepare(`
          UPDATE recurring_schedules
          SET milestones_json = ?, last_run_date = ?, next_run_date = ?, status = ?
          WHERE id = ?
        `).run(JSON.stringify(milestones), today, nextRun, newStatus, schedule.id);
      }
    }
  }

  return { generatedCount, generatedInvoices };
}

// Auto-run on startup
try {
  evaluateAndRunDueSchedules();
} catch (e) {
  console.error('Error in initial automation schedule check:', e);
}

app.get('/api/recurring', (_req: Request, res: Response) => {
  try {
    const rows: any[] = db
      .prepare(`
        SELECT r.*, o.name as org_name
        FROM recurring_schedules r
        LEFT JOIN organizations o ON r.organization_id = o.id
        ORDER BY r.created_at DESC
      `)
      .all();

    const formatted = rows.map((r) => ({
      ...r,
      milestones: r.milestones_json ? JSON.parse(r.milestones_json) : [],
      items: r.items_json ? JSON.parse(r.items_json) : [],
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recurring', (req: Request, res: Response) => {
  const body = req.body;
  const id = body.id || `sched-${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];

  let nextRunDate = body.next_run_date;
  if (!nextRunDate) {
    if (body.schedule_type === 'MONTHLY_SUBSCRIPTION') {
      const targetDay = Number(body.monthly_day) || 1;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const candidateDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
      if (candidateDate >= today) {
        nextRunDate = candidateDate;
      } else {
        nextRunDate = calculateNextMonthlyRunDate(candidateDate, targetDay);
      }
    } else if (body.schedule_type === 'MILESTONE_LIST' && body.milestones && body.milestones.length > 0) {
      const ungenerated = body.milestones.filter((m: any) => !m.invoiceId);
      if (ungenerated.length > 0) {
        ungenerated.sort((a: any, b: any) => a.date.localeCompare(b.date));
        nextRunDate = ungenerated[0].date;
      }
    }
  }

  try {
    db.prepare(`
      INSERT INTO recurring_schedules (
        id, name, organization_id, schedule_type, doc_type, monthly_day,
        total_amount, milestones_json, items_json, terms, notes, status, next_run_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.name,
      body.organization_id,
      body.schedule_type,
      body.doc_type || 'BILL OF SUPPLY',
      body.monthly_day || null,
      body.total_amount || null,
      JSON.stringify(body.milestones || []),
      JSON.stringify(body.items || []),
      body.terms || 'Due on Receipt',
      body.notes || '',
      body.status || 'ACTIVE',
      nextRunDate || null
    );

    // Immediately run check in case the start date is today
    const runResult = evaluateAndRunDueSchedules();

    res.json({ success: true, id, runResult });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/recurring/:id', (req: Request, res: Response) => {
  const body = req.body;
  try {
    db.prepare(`
      UPDATE recurring_schedules SET
        name = ?,
        organization_id = ?,
        schedule_type = ?,
        doc_type = ?,
        monthly_day = ?,
        total_amount = ?,
        milestones_json = ?,
        items_json = ?,
        terms = ?,
        notes = ?,
        status = ?,
        next_run_date = ?
      WHERE id = ?
    `).run(
      body.name,
      body.organization_id,
      body.schedule_type,
      body.doc_type || 'BILL OF SUPPLY',
      body.monthly_day || null,
      body.total_amount || null,
      JSON.stringify(body.milestones || []),
      JSON.stringify(body.items || []),
      body.terms || 'Due on Receipt',
      body.notes || '',
      body.status || 'ACTIVE',
      body.next_run_date || null,
      req.params.id
    );

    evaluateAndRunDueSchedules();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/recurring/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM recurring_schedules WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recurring/run-due', (_req: Request, res: Response) => {
  try {
    const result = evaluateAndRunDueSchedules();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- BUDGET & EXPENSE SYSTEM API -----------------

// Get all active / available months
function getAvailableMonths(): string[] {
  const expMonths = db.prepare('SELECT DISTINCT month FROM expenses').all() as { month: string }[];
  const incMonths = db.prepare('SELECT DISTINCT month FROM income_entries').all() as { month: string }[];
  const sumMonths = db.prepare('SELECT DISTINCT month FROM monthly_budget_summaries').all() as { month: string }[];

  const monthSet = new Set<string>();
  expMonths.forEach((m) => m.month && monthSet.add(m.month));
  incMonths.forEach((m) => m.month && monthSet.add(m.month));
  sumMonths.forEach((m) => m.month && monthSet.add(m.month));

  // Ensure current month is always present
  const currentMonth = new Date().toISOString().substring(0, 7);
  monthSet.add(currentMonth);

  return Array.from(monthSet).sort().reverse();
}

app.get('/api/budget/months', (_req: Request, res: Response) => {
  try {
    const sorted = getAvailableMonths();
    res.json(sorted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function calculateBudgetSummary(month: string) {
  if (month === 'all') {
    // Aggregate across all months for lifetime overview
    const earliestSummary: any = db.prepare('SELECT starting_debt, previous_remaining FROM monthly_budget_summaries ORDER BY month ASC LIMIT 1').get();
    const startingDebt = earliestSummary?.starting_debt || 0;
    const previousRemaining = earliestSummary?.previous_remaining || 0;

    const sumTotals: any = db.prepare(`
      SELECT 
        SUM(dept_payment) as total_debt_paid,
        SUM(borrow_amount) as total_borrow_summary,
        SUM(reg_savings) as total_reg_savings,
        SUM(ext_savings) as total_ext_savings
      FROM monthly_budget_summaries
    `).get();

    // Aggregate all expenses
    const expRows: any[] = db.prepare('SELECT category, SUM(amount) as total FROM expenses GROUP BY category').all();
    let regExpense = 0;
    let extExpense = 0;
    expRows.forEach((r) => {
      if (r.category === 'reg') regExpense = r.total || 0;
      else extExpense += r.total || 0;
    });
    const totalExpense = regExpense + extExpense;

    // Aggregate all income
    const incRows: any[] = db.prepare('SELECT category, SUM(amount) as total FROM income_entries GROUP BY category').all();
    let salary = 0;
    let freelance = 0;
    let returns = 0;
    let extIncome = 0;
    incRows.forEach((r) => {
      if (r.category === 'sal') salary = r.total || 0;
      else if (r.category === 'fl') freelance = r.total || 0;
      else if (r.category === 'rt') returns = r.total || 0;
      else extIncome += r.total || 0;
    });

    const borrowRetRow: any = db.prepare('SELECT SUM(amount) as total FROM borrow_records WHERE type = ?').get('RETURN');
    if (borrowRetRow && borrowRetRow.total) {
      returns = Math.max(returns, borrowRetRow.total);
    }

    const borrowRow: any = db.prepare('SELECT SUM(amount) as total FROM borrow_records WHERE type = ?').get('BORROW');
    const autoBorrow = borrowRow && borrowRow.total ? borrowRow.total : 0;
    const finalBorrow = sumTotals?.total_borrow_summary || autoBorrow;

    const totalIncomeEarned = salary + freelance + returns + extIncome;
    const totalInflow = previousRemaining + totalIncomeEarned;
    const debtPayment = sumTotals?.total_debt_paid || 0;

    const overhead = (totalInflow + finalBorrow) - (totalExpense + debtPayment);
    const overheadSavings = overhead > 0 ? Math.round(overhead / 2) : 0;
    const totalSavings = (sumTotals?.total_reg_savings || 0) + (sumTotals?.total_ext_savings || 0) + overheadSavings;
    const remaining = overhead - overheadSavings;
    const endingDebt = startingDebt + finalBorrow - debtPayment;

    return {
      month: 'all',
      starting_debt: startingDebt,
      previous_remaining: previousRemaining,
      salary,
      freelance,
      returns,
      ext_income: extIncome,
      total_income_earned: totalIncomeEarned,
      total_income: totalInflow,
      total_inflow: totalInflow,
      reg_savings: sumTotals?.total_reg_savings || 0,
      ext_savings: sumTotals?.total_ext_savings || 0,
      reg_expense: regExpense,
      ext_expense: extExpense,
      total_expense: totalExpense,
      dept_payment: debtPayment,
      borrow_amount: finalBorrow,
      overhead,
      overhead_savings: overheadSavings,
      total_savings: totalSavings,
      remaining,
      ending_debt: endingDebt,
      notes: 'All-time lifetime aggregated summary',
    };
  }

  // 1. Get or create manual summary record
  let summary: any = db.prepare('SELECT * FROM monthly_budget_summaries WHERE month = ?').get(month);
  if (!summary) {
    summary = {
      month,
      starting_debt: 0,
      previous_remaining: 0,
      dept_payment: 0,
      borrow_amount: 0,
      reg_savings: 0,
      ext_savings: 0,
      notes: '',
    };
  }

  // 2. Aggregate expenses
  const expRows: any[] = db.prepare('SELECT category, SUM(amount) as total FROM expenses WHERE month = ? GROUP BY category').all(month);
  let regExpense = 0;
  let extExpense = 0;
  expRows.forEach((r) => {
    if (r.category === 'reg') regExpense = r.total || 0;
    else extExpense += r.total || 0;
  });
  const totalExpense = regExpense + extExpense;

  // 3. Aggregate income
  const incRows: any[] = db.prepare('SELECT category, SUM(amount) as total FROM income_entries WHERE month = ? GROUP BY category').all(month);
  let salary = 0;
  let freelance = 0;
  let returns = 0;
  let extIncome = 0;
  incRows.forEach((r) => {
    if (r.category === 'sal') salary = r.total || 0;
    else if (r.category === 'fl') freelance = r.total || 0;
    else if (r.category === 'rt') returns = r.total || 0;
    else extIncome += r.total || 0;
  });

  // Also include Returns from borrow_records if any
  const borrowRetRow: any = db
    .prepare('SELECT SUM(amount) as total FROM borrow_records WHERE month = ? AND type = ?')
    .get(month, 'RETURN');
  if (borrowRetRow && borrowRetRow.total) {
    returns = Math.max(returns, borrowRetRow.total);
  }

  // Also check new borrow amount from borrow_records
  const borrowRow: any = db
    .prepare('SELECT SUM(amount) as total FROM borrow_records WHERE month = ? AND type = ?')
    .get(month, 'BORROW');
  const autoBorrow = borrowRow && borrowRow.total ? borrowRow.total : 0;
  const finalBorrow = summary.borrow_amount || autoBorrow;

  const previousRemaining = summary.previous_remaining || 0;
  const totalIncomeEarned = salary + freelance + returns + extIncome;
  const totalInflow = previousRemaining + totalIncomeEarned;
  const debtPayment = summary.dept_payment || 0;

  // Excel formula: Overhead = (Total Inflow + Borrow) - (Total Outflow + Debt Paid)
  const overhead = (totalInflow + finalBorrow) - (totalExpense + debtPayment);
  const overheadSavings = overhead > 0 ? Math.round(overhead / 2) : 0;
  const totalSavings = (summary.reg_savings || 0) + (summary.ext_savings || 0) + overheadSavings;
  const remaining = overhead - overheadSavings;
  const endingDebt = (summary.starting_debt || 0) + finalBorrow - debtPayment;

  return {
    month,
    starting_debt: summary.starting_debt || 0,
    previous_remaining: previousRemaining,
    salary,
    freelance,
    returns,
    ext_income: extIncome,
    total_income_earned: totalIncomeEarned,
    total_income: totalInflow,
    total_inflow: totalInflow,
    reg_savings: summary.reg_savings || 0,
    ext_savings: summary.ext_savings || 0,
    overhead_savings: overheadSavings,
    total_savings: totalSavings,
    reg_expense: regExpense,
    ext_expense: extExpense,
    total_expense: totalExpense,
    dept_payment: debtPayment,
    borrow_amount: finalBorrow,
    overhead,
    remaining,
    ending_debt: endingDebt,
    notes: summary.notes || '',
  };
}

// Get monthly aggregated cashflow summary
app.get('/api/budget/summary', (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
  try {
    const summary = calculateBudgetSummary(month);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update summary parameters for a month (e.g. debt payment, starting debt)
app.put('/api/budget/summary/:month', (req: Request, res: Response) => {
  const month = req.params.month;
  const body = req.body;

  try {
    const existing = db.prepare('SELECT month FROM monthly_budget_summaries WHERE month = ?').get(month);
    if (existing) {
      db.prepare(`
        UPDATE monthly_budget_summaries SET
          starting_debt = ?,
          previous_remaining = ?,
          dept_payment = ?,
          borrow_amount = ?,
          reg_savings = ?,
          ext_savings = ?,
          notes = ?
        WHERE month = ?
      `).run(
        body.starting_debt || 0,
        body.previous_remaining || 0,
        body.dept_payment || 0,
        body.borrow_amount || 0,
        body.reg_savings || 0,
        body.ext_savings || 0,
        body.notes || '',
        month
      );
    } else {
      db.prepare(`
        INSERT INTO monthly_budget_summaries (
          month, starting_debt, previous_remaining, dept_payment, borrow_amount, reg_savings, ext_savings, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        month,
        body.starting_debt || 0,
        body.previous_remaining || 0,
        body.dept_payment || 0,
        body.borrow_amount || 0,
        body.reg_savings || 0,
        body.ext_savings || 0,
        body.notes || ''
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full Multi-Month Breakdown Ledger (Excel Income Tracker Table)
app.get('/api/budget/monthly-breakdown', (_req: Request, res: Response) => {
  try {
    // 1. Gather all unique months across all budget tables
    const monthSet = new Set<string>();
    const sumMonths: any[] = db.prepare('SELECT DISTINCT month FROM monthly_budget_summaries').all();
    const expMonths: any[] = db.prepare('SELECT DISTINCT month FROM expenses').all();
    const incMonths: any[] = db.prepare('SELECT DISTINCT month FROM income_entries').all();
    const brMonths: any[] = db.prepare('SELECT DISTINCT month FROM borrow_records').all();

    [...sumMonths, ...expMonths, ...incMonths, ...brMonths].forEach((r) => {
      if (r && r.month && r.month.length === 7) monthSet.add(r.month);
    });

    // Ensure default sequence (Aug, Sep, Oct 2026) exists
    ['2026-08', '2026-09', '2026-10'].forEach((m) => monthSet.add(m));

    const sortedMonths = Array.from(monthSet).sort();

    // 2. Sequential calculation with carryovers (Aug -> Sep -> Oct -> etc.)
    const breakdown: any[] = [];
    let carryEndingDebt = 62152;
    let carryRemaining = 14000;

    sortedMonths.forEach((m, idx) => {
      const summary: any = db.prepare('SELECT * FROM monthly_budget_summaries WHERE month = ?').get(m) || {};

      // If first month, use manual or seed starting debt/prev remaining. Else carry over if not set.
      const startingDebt = summary.starting_debt !== undefined && summary.starting_debt !== null && summary.starting_debt !== 0
        ? summary.starting_debt
        : (idx === 0 ? 62152 : carryEndingDebt);

      const previousRemaining = summary.previous_remaining !== undefined && summary.previous_remaining !== null
        ? summary.previous_remaining
        : (idx === 0 ? 14000 : carryRemaining);

      // Expenses
      const expRows: any[] = db.prepare('SELECT category, SUM(amount) as total FROM expenses WHERE month = ? GROUP BY category').all(m);
      let regExpense = 0;
      let extExpense = 0;
      expRows.forEach((r) => {
        if (r.category === 'reg') regExpense = r.total || 0;
        else extExpense += r.total || 0;
      });
      const totalExpense = regExpense + extExpense;

      // Incomes
      const incRows: any[] = db.prepare('SELECT category, SUM(amount) as total FROM income_entries WHERE month = ? GROUP BY category').all(m);
      let salary = 0;
      let freelance = 0;
      let returns = 0;
      let extIncome = 0;
      incRows.forEach((r) => {
        if (r.category === 'sal') salary = r.total || 0;
        else if (r.category === 'fl') freelance = r.total || 0;
        else if (r.category === 'rt') returns = r.total || 0;
        else extIncome += r.total || 0;
      });

      // Returns from borrow_records (type = 'RETURN')
      const borrowRetRow: any = db.prepare('SELECT SUM(amount) as total FROM borrow_records WHERE month = ? AND type = ?').get(m, 'RETURN');
      if (borrowRetRow && borrowRetRow.total) {
        returns = Math.max(returns, borrowRetRow.total);
      }

      // Borrows from borrow_records (type = 'BORROW')
      const borrowRow: any = db.prepare('SELECT SUM(amount) as total FROM borrow_records WHERE month = ? AND type = ?').get(m, 'BORROW');
      const autoBorrow = borrowRow && borrowRow.total ? borrowRow.total : 0;
      const finalBorrow = summary.borrow_amount || autoBorrow;

      // Inflow
      const totalIncome = previousRemaining + salary + freelance + returns + extIncome;

      // Savings
      const regSavings = summary.reg_savings || 0;
      const extSavings = summary.ext_savings || 0;

      // Dept Payment
      const deptPayment = summary.dept_payment || 0;

      // Overhead = Total Income + Borrow - (Total Expense + Debt Payment)
      const overhead = (totalIncome + finalBorrow) - (totalExpense + deptPayment);
      const ovhSavings = overhead > 0 ? Math.round(overhead / 2) : 0;
      const totalSavings = regSavings + extSavings + ovhSavings;
      const remaining = overhead > 0 ? (overhead - ovhSavings) : 0;

      // Deficit if expenses exceeded income
      const deficit = totalExpense > totalIncome ? totalExpense - totalIncome : 0;
      const endingDebt = (startingDebt - deptPayment) + finalBorrow + deficit;

      // Update carryovers for next iteration
      carryEndingDebt = endingDebt;
      carryRemaining = remaining;

      breakdown.push({
        month: m,
        starting_debt: startingDebt,
        previous_remaining: previousRemaining,
        salary,
        freelance,
        returns,
        ext_income: extIncome,
        total_income: totalIncome,
        reg_savings: regSavings,
        ext_savings: extSavings,
        total_savings: totalSavings,
        reg_expense: regExpense,
        ext_expense: extExpense,
        total_expense: totalExpense,
        dept_payment: deptPayment,
        borrow_amount: finalBorrow,
        overhead,
        ovh_savings: ovhSavings,
        remaining,
        ending_debt: endingDebt,
        notes: summary.notes || '',
      });
    });

    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add new month to tracker
app.post('/api/budget/months', (req: Request, res: Response) => {
  const { month } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'Valid YYYY-MM month string is required' });
    return;
  }
  try {
    const existing = db.prepare('SELECT month FROM monthly_budget_summaries WHERE month = ?').get(month);
    if (!existing) {
      db.prepare(`
        INSERT INTO monthly_budget_summaries (month, starting_debt, previous_remaining, dept_payment, borrow_amount, reg_savings, ext_savings, notes)
        VALUES (?, 0, 0, 0, 0, 0, 0, 'New Planning Month')
      `).run(month);
    }
    res.json({ success: true, month });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- BUSINESS CURRENT ACCOUNT & WITHDRAWALS API -----------------

app.get('/api/budget/current-account', (_req: Request, res: Response) => {
  try {
    const invoices: any[] = db.prepare(`
      SELECT i.*, o.name as org_name
      FROM invoices i
      LEFT JOIN organizations o ON i.organization_id = o.id
      ORDER BY i.invoice_date DESC, i.created_at DESC
    `).all();

    let totalRevenuePaid = 0;
    let unpaidReceivables = 0;

    const paidInvoices: any[] = [];
    const unpaidInvoices: any[] = [];

    for (const inv of invoices) {
      const isStatusPaid = (inv.status || '').toUpperCase() === 'PAID';
      const amtPaid = Number(inv.amount_paid) || 0;
      const totalAmt = Number(inv.total) || 0;
      const effectivePaid = isStatusPaid ? (amtPaid > 0 ? amtPaid : totalAmt) : amtPaid;
      const balanceDue = isStatusPaid ? 0 : (Number(inv.balance_due) > 0 ? Number(inv.balance_due) : Math.max(0, totalAmt - effectivePaid));

      if (effectivePaid > 0) {
        totalRevenuePaid += effectivePaid;
        paidInvoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          date: inv.invoice_date,
          org_name: inv.org_name || 'Client',
          amount_paid: effectivePaid,
          total: totalAmt,
          status: inv.status,
        });
      }

      if (balanceDue > 0) {
        unpaidReceivables += balanceDue;
        unpaidInvoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          date: inv.invoice_date,
          org_name: inv.org_name || 'Client',
          balance_due: balanceDue,
          total: totalAmt,
          status: inv.status,
        });
      }
    }

    const withdrawals: any[] = db.prepare(`
      SELECT * FROM current_account_withdrawals
      ORDER BY date DESC, created_at DESC
    `).all();

    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const availableBalance = Math.max(0, totalRevenuePaid - totalWithdrawn);

    res.json({
      total_revenue_paid: totalRevenuePaid,
      total_withdrawn: totalWithdrawn,
      available_balance: availableBalance,
      unpaid_receivables: unpaidReceivables,
      paid_invoices: paidInvoices,
      unpaid_invoices: unpaidInvoices,
      withdrawals,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Withdraw funds from Current Account into Personal Freelance Income
app.post('/api/budget/current-account/withdraw', (req: Request, res: Response) => {
  const { date, amount, source, notes } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    res.status(400).json({ error: 'Withdrawal amount must be greater than ₹0.' });
    return;
  }

  const withdrawDate = date || new Date().toISOString().substring(0, 10);
  const withdrawMonth = withdrawDate.substring(0, 7);

  try {
    // 1. Calculate available balance
    const invoices: any[] = db.prepare(`SELECT status, amount_paid, total FROM invoices`).all();
    let totalRevenuePaid = 0;
    for (const inv of invoices) {
      const isStatusPaid = (inv.status || '').toUpperCase() === 'PAID';
      const amtPaid = Number(inv.amount_paid) || 0;
      const totalAmt = Number(inv.total) || 0;
      const effectivePaid = isStatusPaid ? (amtPaid > 0 ? amtPaid : totalAmt) : amtPaid;
      totalRevenuePaid += effectivePaid;
    }

    const totalWithdrawnRow: any = db.prepare(`SELECT SUM(amount) as sum FROM current_account_withdrawals`).get();
    const currentTotalWithdrawn = totalWithdrawnRow?.sum || 0;
    const availableBalance = Math.max(0, totalRevenuePaid - currentTotalWithdrawn);

    if (numAmount > availableBalance) {
      res.status(400).json({
        error: `Cannot withdraw ₹${numAmount.toLocaleString('en-IN')}. Current Account available balance is ₹${availableBalance.toLocaleString('en-IN')}. Unpaid invoices cannot be withdrawn.`,
      });
      return;
    }

    const withdrawalId = `with-${Date.now()}`;
    const incomeId = `inc-with-${Date.now()}`;
    const incomeSource = source?.trim() || 'Current Account (Owner Draw)';
    const withdrawalNotes = notes?.trim() || 'Owner draw from Current Account to freelance income';

    const tx = db.transaction(() => {
      // Record in current_account_withdrawals
      db.prepare(`
        INSERT INTO current_account_withdrawals (id, date, month, amount, notes, income_entry_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(withdrawalId, withdrawDate, withdrawMonth, numAmount, withdrawalNotes, incomeId);

      // Record in income_entries as freelance income ('fl')
      db.prepare(`
        INSERT INTO income_entries (id, date, month, category, source, amount, notes)
        VALUES (?, ?, ?, 'fl', ?, ?, ?)
      `).run(incomeId, withdrawDate, withdrawMonth, incomeSource, numAmount, withdrawalNotes);
    });

    tx();

    res.json({
      success: true,
      withdrawalId,
      incomeId,
      amount: numAmount,
      available_balance: availableBalance - numAmount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a withdrawal (refunds back to Current Account balance)
app.delete('/api/budget/current-account/withdraw/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const row: any = db.prepare('SELECT * FROM current_account_withdrawals WHERE id = ?').get(id);
    if (!row) {
      res.status(404).json({ error: 'Withdrawal record not found.' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM current_account_withdrawals WHERE id = ?').run(id);
      if (row.income_entry_id) {
        db.prepare('DELETE FROM income_entries WHERE id = ?').run(row.income_entry_id);
      }
    });

    tx();
    res.json({ success: true, message: 'Withdrawal deleted and balance returned to Current Account.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- EXPENSES API -----------------

app.get('/api/budget/expenses', (req: Request, res: Response) => {
  const { month, category, search } = req.query;
  try {
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];

    if (month && month !== 'all') {
      query += ' AND month = ?';
      params.push(month);
    }
    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (description LIKE ? OR tag LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY date DESC, created_at DESC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budget/expenses', (req: Request, res: Response) => {
  const body = req.body;
  const id = body.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const date = (body.date && typeof body.date === 'string' && body.date.trim())
    ? body.date.trim()
    : new Date().toISOString().split('T')[0];
  const month = body.month || date.substring(0, 7);

  if (!body.description || !body.description.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }
  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid positive amount is required' });
  }

  try {
    const taxClass = body.tax_classification || (
      ['Food', 'Groceries', 'Personal', 'Shopping', 'Cosmetics'].includes(body.tag)
        ? 'PERSONAL_DRAWINGS'
        : ['Gadgets', 'Equipment'].includes(body.tag)
        ? 'CAPITAL_ASSET'
        : ['Fuel', 'Travel', 'Recharge', 'Internet'].includes(body.tag)
        ? 'MIXED_APPORTIONED'
        : 'BUSINESS_DEDUCTIBLE'
    );
    const busPct = body.business_percentage !== undefined ? Number(body.business_percentage) : (taxClass === 'MIXED_APPORTIONED' ? 70 : 100);

    db.prepare(`
      INSERT INTO expenses (id, date, month, category, tag, description, amount, payment_method, notes, tax_classification, business_percentage, gst_rate, gst_itc_eligible, has_invoice_voucher, voucher_ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      date,
      month,
      body.category || 'ext',
      body.tag || 'General',
      body.description.trim(),
      amount,
      body.payment_method || 'UPI / Bank',
      body.notes || '',
      taxClass,
      busPct,
      Number(body.gst_rate) || 0,
      body.gst_itc_eligible ? 1 : 0,
      body.has_invoice_voucher !== undefined ? (body.has_invoice_voucher ? 1 : 0) : 1,
      body.voucher_ref || ''
    );
    res.json({ success: true, id, month });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk Import Expenses
app.post('/api/budget/expenses/batch', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const insertStmt = db.prepare(`
      INSERT INTO expenses (id, date, month, category, tag, description, amount, payment_method, notes, tax_classification, business_percentage, gst_rate, gst_itc_eligible, has_invoice_voucher, voucher_ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const insertMany = db.transaction((records: any[]) => {
      for (const b of records) {
        const date = (b.date && typeof b.date === 'string' && b.date.trim())
          ? b.date.trim().substring(0, 10)
          : new Date().toISOString().split('T')[0];
        const month = b.month || date.substring(0, 7);
        const id = b.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const amount = Number(b.amount) || 0;
        if (amount <= 0 || !b.description) continue;

        const taxClass = b.tax_classification || (
          ['Food', 'Groceries', 'Personal', 'Shopping', 'Cosmetics'].includes(b.tag)
            ? 'PERSONAL_DRAWINGS'
            : ['Gadgets', 'Equipment'].includes(b.tag)
            ? 'CAPITAL_ASSET'
            : ['Fuel', 'Travel', 'Recharge', 'Internet'].includes(b.tag)
            ? 'MIXED_APPORTIONED'
            : 'BUSINESS_DEDUCTIBLE'
        );
        const busPct = b.business_percentage !== undefined ? Number(b.business_percentage) : (taxClass === 'MIXED_APPORTIONED' ? 70 : 100);

        insertStmt.run(
          id,
          date,
          month,
          b.category === 'reg' ? 'reg' : 'ext',
          b.tag || 'General',
          String(b.description).trim(),
          amount,
          b.payment_method || 'UPI / Bank',
          b.notes || '',
          taxClass,
          busPct,
          Number(b.gst_rate) || 0,
          b.gst_itc_eligible ? 1 : 0,
          b.has_invoice_voucher !== undefined ? (b.has_invoice_voucher ? 1 : 0) : 1,
          b.voucher_ref || ''
        );
        importedCount++;
      }
    });

    insertMany(items);
    res.json({ success: true, count: importedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/budget/expenses/:id', (req: Request, res: Response) => {
  const body = req.body;
  const date = body.date || new Date().toISOString().split('T')[0];
  const month = body.month || date.substring(0, 7);

  try {
    db.prepare(`
      UPDATE expenses SET
        date = ?,
        month = ?,
        category = ?,
        tag = ?,
        description = ?,
        amount = ?,
        payment_method = ?,
        notes = ?,
        tax_classification = COALESCE(?, tax_classification),
        business_percentage = COALESCE(?, business_percentage),
        gst_rate = COALESCE(?, gst_rate),
        gst_itc_eligible = COALESCE(?, gst_itc_eligible),
        has_invoice_voucher = COALESCE(?, has_invoice_voucher),
        voucher_ref = COALESCE(?, voucher_ref)
      WHERE id = ?
    `).run(
      date,
      month,
      body.category || 'ext',
      body.tag || 'General',
      body.description,
      Number(body.amount) || 0,
      body.payment_method || 'UPI / Bank',
      body.notes || '',
      body.tax_classification,
      body.business_percentage !== undefined ? Number(body.business_percentage) : null,
      body.gst_rate !== undefined ? Number(body.gst_rate) : null,
      body.gst_itc_eligible !== undefined ? (body.gst_itc_eligible ? 1 : 0) : null,
      body.has_invoice_voucher !== undefined ? (body.has_invoice_voucher ? 1 : 0) : null,
      body.voucher_ref !== undefined ? body.voucher_ref : null,
      req.params.id
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/budget/expenses/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- INCOME ENTRIES API -----------------

app.get('/api/budget/income', (req: Request, res: Response) => {
  const { month } = req.query;
  try {
    let query = 'SELECT * FROM income_entries WHERE 1=1';
    const params: any[] = [];
    if (month && month !== 'all') {
      query += ' AND month = ?';
      params.push(month);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budget/income', (req: Request, res: Response) => {
  const body = req.body;
  const id = body.id || `inc-${Date.now()}`;
  const date = body.date || new Date().toISOString().split('T')[0];
  const month = body.month || date.substring(0, 7);

  try {
    db.prepare(`
      INSERT INTO income_entries (id, date, month, category, source, amount, invoice_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      date,
      month,
      body.category || 'fl',
      body.source || 'Client',
      Number(body.amount) || 0,
      body.invoice_id || null,
      body.notes || ''
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk Import Income
app.post('/api/budget/income/batch', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const insertStmt = db.prepare(`
      INSERT INTO income_entries (id, date, month, category, source, amount, invoice_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const insertMany = db.transaction((records: any[]) => {
      for (const b of records) {
        const date = (b.date && typeof b.date === 'string' && b.date.trim())
          ? b.date.trim().substring(0, 10)
          : new Date().toISOString().split('T')[0];
        const month = b.month || date.substring(0, 7);
        const id = b.id || `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const amount = Number(b.amount) || 0;
        if (amount <= 0 || !b.source) continue;

        insertStmt.run(
          id,
          date,
          month,
          b.category || 'fl',
          String(b.source).trim(),
          amount,
          b.invoice_id || null,
          b.notes || ''
        );
        importedCount++;
      }
    });

    insertMany(items);
    res.json({ success: true, count: importedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/budget/income/:id', (req: Request, res: Response) => {
  const body = req.body;
  try {
    const existing: any = db.prepare('SELECT * FROM income_entries WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Income entry not found' });
    }
    const date = body.date || existing.date;
    const month = body.month || (date ? date.substring(0, 7) : existing.month);
    const category = body.category || existing.category;
    const source = body.source !== undefined ? body.source.trim() : existing.source;
    const amount = body.amount !== undefined ? Number(body.amount) : existing.amount;
    const notes = body.notes !== undefined ? body.notes.trim() : existing.notes;

    db.prepare(`
      UPDATE income_entries SET
        date = ?,
        month = ?,
        category = ?,
        source = ?,
        amount = ?,
        notes = ?
      WHERE id = ?
    `).run(
      date,
      month,
      category,
      source,
      amount,
      notes || '',
      req.params.id
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/budget/income/:id', (req: Request, res: Response) => {
  try {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM current_account_withdrawals WHERE income_entry_id = ?').run(req.params.id);
      db.prepare('DELETE FROM income_entries WHERE id = ?').run(req.params.id);
    });
    tx();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- BORROW & RETURNS API -----------------

app.get('/api/budget/borrow', (req: Request, res: Response) => {
  const { month } = req.query;
  try {
    let query = 'SELECT * FROM borrow_records WHERE 1=1';
    const params: any[] = [];
    if (month && month !== 'all') {
      query += ' AND month = ?';
      params.push(month);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budget/borrow', (req: Request, res: Response) => {
  const body = req.body;
  const amount = Number(body.amount);
  const person = body.person ? String(body.person).trim() : '';
  if (!person || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Person and a valid amount greater than 0 are required' });
  }

  const id = body.id || `br-${Date.now()}`;
  const date = (body.date && typeof body.date === 'string' && body.date.trim())
    ? body.date.trim().substring(0, 10)
    : new Date().toISOString().split('T')[0];
  const month = body.month || date.substring(0, 7);

  try {
    db.prepare(`
      INSERT INTO borrow_records (id, date, month, type, person, reason, amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      date,
      month,
      body.type || 'BORROW',
      person,
      body.reason ? String(body.reason).trim() : '',
      amount,
      body.status || 'PENDING'
    );
    res.status(201).json({ success: true, id, month });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk Import Borrow & Return Records
app.post('/api/budget/borrow/batch', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const insertStmt = db.prepare(`
      INSERT INTO borrow_records (id, date, month, type, person, reason, amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const insertMany = db.transaction((records: any[]) => {
      for (const b of records) {
        const date = (b.date && typeof b.date === 'string' && b.date.trim())
          ? b.date.trim().substring(0, 10)
          : new Date().toISOString().split('T')[0];
        const month = b.month || date.substring(0, 7);
        const id = b.id || `br-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const amount = Number(b.amount) || 0;
        if (amount <= 0 || !b.person) continue;

        insertStmt.run(
          id,
          date,
          month,
          b.type || 'BORROW',
          String(b.person).trim(),
          b.reason || '',
          amount,
          b.status || 'PENDING'
        );
        importedCount++;
      }
    });

    insertMany(items);
    res.json({ success: true, count: importedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/budget/borrow/:id', (req: Request, res: Response) => {
  const body = req.body;
  try {
    const existing: any = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Borrow record not found' });
    }
    const date = body.date || existing.date;
    const month = body.month || (date ? date.substring(0, 7) : existing.month);
    const type = body.type || existing.type;
    const person = body.person !== undefined ? body.person.trim() : existing.person;
    const reason = body.reason !== undefined ? body.reason.trim() : existing.reason;
    const amount = body.amount !== undefined ? Number(body.amount) : existing.amount;
    const status = body.status !== undefined ? body.status : existing.status;

    db.prepare(`
      UPDATE borrow_records SET
        date = ?,
        month = ?,
        type = ?,
        person = ?,
        reason = ?,
        amount = ?,
        status = ?
      WHERE id = ?
    `).run(
      date,
      month,
      type,
      person,
      reason || '',
      amount,
      status,
      req.params.id
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/budget/borrow/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM borrow_records WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- FINANCIAL GOALS API -----------------

app.get('/api/budget/goals', (_req: Request, res: Response) => {
  try {
    const rows: any[] = db.prepare('SELECT * FROM financial_goals ORDER BY target_amount ASC').all();
    const formatted = rows.map((g) => ({
      ...g,
      remaining: Math.max(0, g.target_amount - g.saved_amount),
      progress_percent: g.target_amount > 0 ? Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100)) : 0,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budget/goals', (req: Request, res: Response) => {
  const body = req.body;
  const id = body.id || `goal-${Date.now()}`;
  try {
    db.prepare(`
      INSERT INTO financial_goals (id, name, target_amount, savings_percent, saved_amount, target_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.name,
      Number(body.target_amount) || 0,
      Number(body.savings_percent) || 0,
      Number(body.saved_amount) || 0,
      body.target_date || null,
      body.status || 'IN_PROGRESS',
      body.notes || ''
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/budget/goals/:id', (req: Request, res: Response) => {
  const body = req.body;
  try {
    db.prepare(`
      UPDATE financial_goals SET
        name = ?,
        target_amount = ?,
        savings_percent = ?,
        saved_amount = ?,
        target_date = ?,
        status = ?,
        notes = ?
      WHERE id = ?
    `).run(
      body.name,
      Number(body.target_amount) || 0,
      Number(body.savings_percent) || 0,
      Number(body.saved_amount) || 0,
      body.target_date || null,
      body.status || 'IN_PROGRESS',
      body.notes || '',
      req.params.id
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/budget/goals/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM financial_goals WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function calculateBudgetAllocations(month: string) {
  const isAll = month === 'all';
  // Get total income for month consistent with summary
  const incQuery = isAll
    ? 'SELECT category, SUM(amount) as total FROM income_entries GROUP BY category'
    : 'SELECT category, SUM(amount) as total FROM income_entries WHERE month = ? GROUP BY category';
  const incParams = isAll ? [] : [month];
  const incRows: any[] = db.prepare(incQuery).all(...incParams);

  let incSum = 0;
  let rtFromInc = 0;
  incRows.forEach((r) => {
    incSum += r.total || 0;
    if (r.category === 'rt') rtFromInc = r.total || 0;
  });

  const borrowRetQuery = isAll
    ? 'SELECT SUM(amount) as total FROM borrow_records WHERE type = ?'
    : 'SELECT SUM(amount) as total FROM borrow_records WHERE month = ? AND type = ?';
  const borrowRetParams = isAll ? ['RETURN'] : [month, 'RETURN'];
  const borrowRetRow: any = db.prepare(borrowRetQuery).get(...borrowRetParams);
  const rtFromBorrow = borrowRetRow?.total || 0;
  const returnsToAdd = Math.max(0, rtFromBorrow - rtFromInc);

  const totalIncomeEarned = incSum + returnsToAdd;
  let previousRemaining = 0;
  if (isAll) {
    const earliestSummary: any = db.prepare('SELECT previous_remaining FROM monthly_budget_summaries ORDER BY month ASC LIMIT 1').get();
    previousRemaining = earliestSummary?.previous_remaining || 0;
  } else {
    const sumRow: any = db.prepare('SELECT previous_remaining FROM monthly_budget_summaries WHERE month = ?').get(month);
    previousRemaining = sumRow?.previous_remaining || 0;
  }
  const totalIncome = totalIncomeEarned + previousRemaining;

  const rules: any[] = db.prepare('SELECT * FROM budget_allocation_rules ORDER BY display_order ASC').all();
  const expQuery = isAll
    ? 'SELECT tag, category, SUM(amount) as spent FROM expenses GROUP BY tag, category'
    : 'SELECT tag, category, SUM(amount) as spent FROM expenses WHERE month = ? GROUP BY tag, category';
  const expParams = isAll ? [] : [month];
  const expenses: any[] = db.prepare(expQuery).all(...expParams);

  // Map rules to actual spending
  const allocations = rules.map((r) => {
    const planned = Math.round(totalIncome * r.percentage);
    let actual = 0;

    if (r.category === 'Essentials') {
      const match = expenses.find((e) => e.category === 'reg');
      actual = match ? match.spent : 0;
    } else if (r.category === 'Small Assets') {
      const match = expenses.find((e) => e.tag === 'Gadgets' || e.tag === 'Accessories');
      actual = match ? match.spent : 0;
    } else if (r.category === 'Business Growth') {
      const match = expenses.find((e) => e.tag === 'Services' || e.tag === 'Hosting' || e.tag === 'Tools');
      actual = match ? match.spent : 0;
    }

    return {
      ...r,
      planned_amount: planned,
      actual_spent: actual,
      variance: planned - actual,
    };
  });

  return {
    month,
    total_income: totalIncome,
    allocations,
  };
}

// ----------------- CONSOLIDATED MONTH BUNDLE (Single Roundtrip) -----------------
app.get('/api/budget/month-bundle', (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
  try {
    const isAll = month === 'all';
    const summary = calculateBudgetSummary(month);
    const expenses = isAll
      ? db.prepare('SELECT * FROM expenses ORDER BY date DESC').all()
      : db.prepare('SELECT * FROM expenses WHERE month = ? ORDER BY date DESC').all(month);
    const incomes = isAll
      ? db.prepare('SELECT * FROM income_entries ORDER BY date DESC').all()
      : db.prepare('SELECT * FROM income_entries WHERE month = ? ORDER BY date DESC').all(month);
    const borrows = isAll
      ? db.prepare('SELECT * FROM borrow_records ORDER BY date DESC').all()
      : db.prepare('SELECT * FROM borrow_records WHERE month = ? ORDER BY date DESC').all(month);
    const goals = db.prepare('SELECT * FROM financial_goals ORDER BY target_amount DESC').all();
    const allocResult = calculateBudgetAllocations(month);
    const months = getAvailableMonths();

    res.json({
      month,
      summary,
      expenses,
      incomes,
      borrows,
      goals,
      allocations: allocResult.allocations,
      total_income: allocResult.total_income,
      months,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- BUDGET ALLOCATIONS (Planned vs Actual) -----------------

app.get('/api/budget/allocations', (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
  try {
    const allocResult = calculateBudgetAllocations(month);
    res.json(allocResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- INDIAN TAX & COMPLIANCE APIS -----------------

function calculateNewRegimeTax(taxableIncome: number): number {
  if (taxableIncome <= 300000) return 0;
  let tax = 0;
  if (taxableIncome <= 700000) {
    tax = (taxableIncome - 300000) * 0.05;
  } else if (taxableIncome <= 1000000) {
    tax = 20000 + (taxableIncome - 700000) * 0.10;
  } else if (taxableIncome <= 1200000) {
    tax = 50000 + (taxableIncome - 1000000) * 0.15;
  } else if (taxableIncome <= 1500000) {
    tax = 80000 + (taxableIncome - 1200000) * 0.20;
  } else {
    tax = 140000 + (taxableIncome - 1500000) * 0.30;
  }
  // Section 87A rebate for net taxable income <= ₹7,00,000 (FY 2024-25/25-26)
  if (taxableIncome <= 700000) {
    tax = 0;
  }
  return Math.round(tax * 1.04);
}

function calculateOldRegimeTax(taxableIncome: number): number {
  if (taxableIncome <= 250000) return 0;
  let tax = 0;
  if (taxableIncome <= 500000) {
    tax = (taxableIncome - 250000) * 0.05;
  } else if (taxableIncome <= 1000000) {
    tax = 12500 + (taxableIncome - 500000) * 0.20;
  } else {
    tax = 112500 + (taxableIncome - 1000000) * 0.30;
  }
  // Section 87A rebate up to ₹5,00,000
  if (taxableIncome <= 500000) {
    tax = 0;
  }
  return Math.round(tax * 1.04);
}

// GET Tax Summary
app.get('/api/tax/summary', (_req: Request, res: Response) => {
  try {
    // 1. Turnover from Invoices & Income
    const invStats: any = db.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as gross_turnover,
        COALESCE(SUM(amount_paid), 0) as total_collections,
        COUNT(*) as invoices_count
      FROM invoices 
      WHERE status != 'cancelled'
    `).get();

    const incStats: any = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_income
      FROM income_entries
      WHERE category IN ('fl', 'sal', 'ext')
    `).get();

    // Use max of invoices total and recorded income to prevent under-reporting
    const grossTurnover = Math.max(invStats.gross_turnover || 0, incStats.total_income || 0);
    const totalCollections = invStats.total_collections || 0;
    const totalInvoicesCount = invStats.invoices_count || 0;

    // 2. Expenses breakdown
    const expenses: any[] = db.prepare('SELECT * FROM expenses').all();

    let businessDeductibleExpenses = 0;
    let personalDrawings = 0;
    let mixedExpensesTotal = 0;
    let mixedExpensesDeductible = 0;
    let capitalAssetsTotal = 0;
    let capitalIntroduced = 0;
    let bankChargesDeductible = 0;
    let totalCashWithdrawals = 0;

    const violations: any[] = [];

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const isCash = (e.payment_method || '').toLowerCase().includes('cash');

      if (isCash) {
        totalCashWithdrawals += amt;
      }

      // Check Section 40A(3) Cash Disallowance (> ₹10,000 cash in a single payment)
      if (isCash && amt > 10000 && e.tax_classification === 'BUSINESS_DEDUCTIBLE') {
        violations.push({
          id: `viol-40a3-${e.id}`,
          date: e.date,
          description: e.description,
          amount: amt,
          ruleCode: 'SEC_40A3',
          ruleTitle: 'Section 40A(3) Cash Payment Limit Violation',
          severity: 'DANGER',
          suggestion: `Payment of ₹${amt.toLocaleString('en-IN')} was made in cash exceeding the statutory ₹10,000 threshold. Under Income Tax Section 40A(3), this entire expense is 100% disallowed from business deductions. Switch to UPI, NEFT, or account payee cheque.`,
        });
      }

      // Check Section 17(5) Blocked ITC
      const isBlockedTag = ['Food', 'Dining', 'Personal', 'Fuel', 'Cosmetics', 'Entertainment'].includes(e.tag);
      if (Boolean(e.gst_itc_eligible) && isBlockedTag) {
        violations.push({
          id: `viol-17-5-${e.id}`,
          date: e.date,
          description: e.description,
          amount: amt,
          ruleCode: 'SEC_17_5',
          ruleTitle: 'Section 17(5) Blocked Input Tax Credit (ITC)',
          severity: 'DANGER',
          suggestion: `Input Tax Credit claimed on "${e.tag || e.description}". Section 17(5) of CGST Act strictly blocks ITC on food, catering, motor fuel, club memberships, and personal goods. Claiming this invites GST audit notices.`,
        });
      }

      // Check Drawings misclassified as Business Expense
      if (['Food', 'Groceries', 'Cosmetics', 'Personal', 'Shopping'].includes(e.tag) && e.tax_classification === 'BUSINESS_DEDUCTIBLE') {
        violations.push({
          id: `viol-draw-${e.id}`,
          date: e.date,
          description: e.description,
          amount: amt,
          ruleCode: 'DRAWINGS_AS_EXPENSE',
          ruleTitle: 'Personal Drawings Claimed as Business Expense',
          severity: 'WARNING',
          suggestion: `"${e.description}" appears to be a personal lifestyle expense. Claiming personal spending as business deduction violates Section 37(1) (Wholly & Exclusively rule) and invites Section 270A penalties (up to 200% of tax evaded). Reclassify as "Personal Drawings".`,
        });
      }

      // Check Missing Voucher on larger business expenses
      if (amt >= 2000 && !e.has_invoice_voucher && e.tax_classification === 'BUSINESS_DEDUCTIBLE') {
        violations.push({
          id: `viol-vouch-${e.id}`,
          date: e.date,
          description: e.description,
          amount: amt,
          ruleCode: 'MISSING_VOUCHER',
          ruleTitle: 'Missing Tax Invoice / Proof Voucher',
          severity: 'WARNING',
          suggestion: `Business deduction of ₹${amt.toLocaleString('en-IN')} lacks a supporting invoice/voucher. In case of scrutiny under Section 143(3), unvouched expenses are routinely disallowed.`,
        });
      }

      // Calculate totals based on classification
      if (e.tax_classification === 'BUSINESS_DEDUCTIBLE') {
        businessDeductibleExpenses += amt;
        const desc = (e.description || '').toLowerCase();
        const tag = (e.tag || '').toLowerCase();
        if (['bank', 'sbi', 'mab', 'charge', 'fee', 'amc', 'sms'].some(k => desc.includes(k) || tag.includes(k))) {
          bankChargesDeductible += amt;
        }
      } else if (e.tax_classification === 'PERSONAL_DRAWINGS') {
        personalDrawings += amt;
      } else if (e.tax_classification === 'CAPITAL_INTRODUCED') {
        capitalIntroduced += amt;
      } else if (e.tax_classification === 'MIXED_APPORTIONED') {
        mixedExpensesTotal += amt;
        const busPct = e.business_percentage !== undefined ? Number(e.business_percentage) : 70;
        const deductiblePart = (amt * busPct) / 100;
        mixedExpensesDeductible += deductiblePart;
        personalDrawings += (amt - deductiblePart); // Non-business part becomes drawings
      } else if (e.tax_classification === 'CAPITAL_ASSET') {
        capitalAssetsTotal += amt;
      } else {
        // Default treat as business deductible
        businessDeductibleExpenses += amt;
      }
    });

    // 40% depreciation allowed on IT equipment / computers under Section 32
    const capitalAssetDepreciation = capitalAssetsTotal * 0.40;
    const totalDeductionsAllowed = Math.round(businessDeductibleExpenses + mixedExpensesDeductible + capitalAssetDepreciation);
    const netActualProfit = Math.max(0, grossTurnover - totalDeductionsAllowed);
    const profitMarginActual = grossTurnover > 0 ? Math.round((netActualProfit / grossTurnover) * 100) : 0;

    // Presumptive Profit Calculations
    // Section 44ADA: 50% deemed profit for specified professionals / software freelancers
    const presumptive44ADAProfit = Math.round(grossTurnover * 0.50);
    // Section 44AD: 6% deemed profit for digital business receipts
    const presumptive44ADProfit = Math.round(grossTurnover * 0.06);

    // SFT Cash Limits
    const cashIncomeRow: any = db.prepare("SELECT COALESCE(SUM(amount), 0) as cash_in FROM income_entries WHERE notes LIKE '%cash%' OR source LIKE '%cash%'").get();
    const totalCashDeposits = cashIncomeRow.cash_in || 0;
    const sftLimitCurrentAccount = 5000000; // ₹50 Lakhs limit for current accounts under Rule 114E
    const sftCashUtilizationPercent = Math.min(100, Math.round(((totalCashDeposits + totalCashWithdrawals) / sftLimitCurrentAccount) * 100));

    if ((totalCashDeposits + totalCashWithdrawals) > 1000000) {
      violations.push({
        id: 'viol-sft-threshold',
        date: new Date().toISOString().split('T')[0],
        description: `Aggregate cash turnover: ₹${(totalCashDeposits + totalCashWithdrawals).toLocaleString('en-IN')}`,
        amount: totalCashDeposits + totalCashWithdrawals,
        ruleCode: 'SFT_CASH',
        ruleTitle: 'High Cash Velocity in Current Account',
        severity: (totalCashDeposits + totalCashWithdrawals) >= 4000000 ? 'DANGER' : 'WARNING',
        suggestion: `Your SBI Current Account cash volume is tracked by the IT Department's AIS (Annual Information Statement). Aggregate cash deposits/withdrawals exceeding ₹50,00,000 are mandatorily reported under SFT-005. Maintain strict digital payment hygiene.`,
      });
    }

    // Tax Health / Compliance Score
    let score = 100;
    violations.forEach((v) => {
      if (v.severity === 'DANGER') score -= 15;
      else score -= 8;
    });
    const complianceScore = Math.max(25, Math.min(100, score));

    // Tax calculations (comparing actual profit vs 44ADA profit)
    const taxableBase = presumptive44ADAProfit > 0 ? presumptive44ADAProfit : netActualProfit;
    const taxLiabilityNewRegime = calculateNewRegimeTax(taxableBase);
    const taxLiabilityOldRegime = calculateOldRegimeTax(taxableBase);

    // Advance Tax Installment Schedule
    const taxToPay = taxLiabilityNewRegime;
    const advanceTaxSchedule = [
      {
        quarter: 'Q1 (15%)',
        dueDate: '15 June',
        percentage: 15,
        amountDue: Math.round(taxToPay * 0.15),
        status: 'PAID' as const,
        description: 'First installment under Section 208/211 (Exempt if opting for Section 44ADA)',
      },
      {
        quarter: 'Q2 (45%)',
        dueDate: '15 September',
        percentage: 45,
        amountDue: Math.round(taxToPay * 0.45),
        status: 'PAID' as const,
        description: 'Cumulative 45% of estimated annual tax liability',
      },
      {
        quarter: 'Q3 (75%)',
        dueDate: '15 December',
        percentage: 75,
        amountDue: Math.round(taxToPay * 0.75),
        status: 'UPCOMING' as const,
        description: 'Cumulative 75% of estimated tax liability',
      },
      {
        quarter: 'Q4 (100% / 44ADA)',
        dueDate: '15 March',
        percentage: 100,
        amountDue: taxToPay,
        status: 'UPCOMING' as const,
        description: 'Full 100% tax liability due. Single installment deadline for Section 44ADA / 44AD filers!',
      },
    ];

    res.json({
      financialYear: '2026-27 (FY)',
      assessmentYear: '2027-28 (AY)',
      grossTurnover,
      totalInvoicesCount,
      totalCollections,
      businessDeductibleExpenses,
      personalDrawings,
      mixedExpensesTotal,
      mixedExpensesDeductible,
      capitalAssetsTotal,
      capitalIntroduced,
      bankChargesDeductible,
      sbiMabRequired: 5000,
      sbiMabStatus: 'COMPLIANT' as const,
      totalDeductionsAllowed,
      netActualProfit,
      profitMarginActual,
      presumptive44ADAProfit,
      presumptive44ADProfit,
      totalCashDeposits,
      totalCashWithdrawals,
      sftLimitCurrentAccount,
      sftCashUtilizationPercent,
      violations,
      complianceScore,
      taxLiabilityNewRegime,
      taxLiabilityOldRegime,
      advanceTaxSchedule,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- TAX REMINDERS APIS -----------------

app.get('/api/tax/reminders', (_req: Request, res: Response) => {
  try {
    const reminders = db.prepare('SELECT * FROM tax_reminders ORDER BY due_date ASC').all();
    res.json(
      reminders.map((r: any) => ({
        ...r,
        is_recurring: Boolean(r.is_recurring),
        is_completed: Boolean(r.is_completed),
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tax/reminders', (req: Request, res: Response) => {
  const body = req.body;
  const id = body.id || `rem-${Date.now()}`;
  try {
    db.prepare(`
      INSERT INTO tax_reminders (id, title, description, due_date, category, is_recurring, frequency, is_completed, notify_before_days, priority, penalty_note, action_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.title,
      body.description || '',
      body.due_date,
      body.category || 'CUSTOM',
      body.is_recurring ? 1 : 0,
      body.frequency || 'ONCE',
      body.is_completed ? 1 : 0,
      body.notify_before_days || 7,
      body.priority || 'HIGH',
      body.penalty_note || '',
      body.action_url || ''
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/tax/reminders/:id', (req: Request, res: Response) => {
  const body = req.body;
  try {
    const completedAt = body.is_completed ? new Date().toISOString() : null;
    db.prepare(`
      UPDATE tax_reminders SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        due_date = COALESCE(?, due_date),
        category = COALESCE(?, category),
        is_recurring = COALESCE(?, is_recurring),
        frequency = COALESCE(?, frequency),
        is_completed = COALESCE(?, is_completed),
        completed_at = ?,
        notify_before_days = COALESCE(?, notify_before_days),
        priority = COALESCE(?, priority),
        penalty_note = COALESCE(?, penalty_note),
        action_url = COALESCE(?, action_url)
      WHERE id = ?
    `).run(
      body.title,
      body.description,
      body.due_date,
      body.category,
      body.is_recurring !== undefined ? (body.is_recurring ? 1 : 0) : null,
      body.frequency,
      body.is_completed !== undefined ? (body.is_completed ? 1 : 0) : null,
      completedAt,
      body.notify_before_days,
      body.priority,
      body.penalty_note,
      body.action_url,
      req.params.id
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/tax/reminders/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM tax_reminders WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single expense classify endpoint
app.post('/api/tax/expenses/:id/classify', (req: Request, res: Response) => {
  const { tax_classification, business_percentage, gst_rate, gst_itc_eligible, has_invoice_voucher, voucher_ref } = req.body;
  try {
    db.prepare(`
      UPDATE expenses SET
        tax_classification = COALESCE(?, tax_classification),
        business_percentage = COALESCE(?, business_percentage),
        gst_rate = COALESCE(?, gst_rate),
        gst_itc_eligible = COALESCE(?, gst_itc_eligible),
        has_invoice_voucher = COALESCE(?, has_invoice_voucher),
        voucher_ref = COALESCE(?, voucher_ref)
      WHERE id = ?
    `).run(
      tax_classification,
      business_percentage !== undefined ? Number(business_percentage) : null,
      gst_rate !== undefined ? Number(gst_rate) : null,
      gst_itc_eligible !== undefined ? (gst_itc_eligible ? 1 : 0) : null,
      has_invoice_voucher !== undefined ? (has_invoice_voucher ? 1 : 0) : null,
      voucher_ref !== undefined ? voucher_ref : null,
      req.params.id
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk auto-classify expenses based on intelligent heuristics
app.post('/api/tax/expenses/auto-classify', (_req: Request, res: Response) => {
  try {
    const expenses: any[] = db.prepare('SELECT id, tag, description, payment_method, amount FROM expenses').all();
    let updatedCount = 0;

    const updateStmt = db.prepare(`
      UPDATE expenses SET
        tax_classification = ?,
        business_percentage = ?,
        gst_itc_eligible = ?
      WHERE id = ?
    `);

    expenses.forEach((e) => {
      let classification = 'BUSINESS_DEDUCTIBLE';
      let busPct = 100;
      let itcEligible = 0;

      const desc = (e.description || '').toLowerCase();
      const tag = (e.tag || '').toLowerCase();

      if (['capital', 'funds transfer', 'savings to current', 'owner equity', 'self transfer', 'personal savings'].some(k => tag.includes(k) || desc.includes(k))) {
        classification = 'CAPITAL_INTRODUCED';
        busPct = 0;
        itcEligible = 0;
      } else if (['bank charge', 'sbi fee', 'mab', 'sms alert', 'debit card amc', 'cheque'].some(k => tag.includes(k) || desc.includes(k))) {
        classification = 'BUSINESS_DEDUCTIBLE';
        busPct = 100;
        itcEligible = 0;
      } else if (['food', 'dining', 'groceries', 'cinema', 'personal', 'cosmetics', 'shopping', 'medicine'].some(k => tag.includes(k) || desc.includes(k))) {
        classification = 'PERSONAL_DRAWINGS';
        busPct = 0;
        itcEligible = 0;
      } else if (['fuel', 'travel', 'recharge', 'internet', 'mobile', 'broadband', 'wifi'].some(k => tag.includes(k) || desc.includes(k))) {
        classification = 'MIXED_APPORTIONED';
        busPct = 70;
        itcEligible = 0;
      } else if (['gadget', 'laptop', 'hardware', 'equipment', 'phone', 'computer'].some(k => tag.includes(k) || desc.includes(k))) {
        classification = 'CAPITAL_ASSET';
        busPct = 100;
        itcEligible = 1;
      } else {
        classification = 'BUSINESS_DEDUCTIBLE';
        busPct = 100;
        itcEligible = 1;
      }

      updateStmt.run(classification, busPct, itcEligible, e.id);
      updatedCount++;
    });

    res.json({ success: true, count: updatedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- SBI CURRENT ACCOUNT ENHANCEMENTS -----------------

// SBI PPS Cheques: List
app.get('/api/tax/sbi/pps-cheques', (_req: Request, res: Response) => {
  try {
    const cheques = db.prepare('SELECT * FROM sbi_pps_cheques ORDER BY issue_date DESC, created_at DESC').all();
    res.json(cheques);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SBI PPS Cheques: Add
app.post('/api/tax/sbi/pps-cheques', (req: Request, res: Response) => {
  const { cheque_number, payee_name, amount, issue_date, notes } = req.body;
  if (!cheque_number || !payee_name || !amount || !issue_date) {
    res.status(400).json({ error: 'cheque_number, payee_name, amount, and issue_date are required' });
    return;
  }
  const id = `pps-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  try {
    db.prepare(`
      INSERT INTO sbi_pps_cheques (id, cheque_number, payee_name, amount, issue_date, account_number, pps_status, notes)
      VALUES (?, ?, ?, ?, ?, '45661497562', 'PENDING_REGISTRATION', ?)
    `).run(id, String(cheque_number), payee_name, Number(amount), issue_date, notes || null);
    const created = db.prepare('SELECT * FROM sbi_pps_cheques WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SBI PPS Cheques: Update Status / Ref
app.put('/api/tax/sbi/pps-cheques/:id', (req: Request, res: Response) => {
  const { pps_status, pps_reference, notes } = req.body;
  try {
    db.prepare(`
      UPDATE sbi_pps_cheques SET
        pps_status = COALESCE(?, pps_status),
        pps_reference = COALESCE(?, pps_reference),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(pps_status, pps_reference, notes, req.params.id);
    const updated = db.prepare('SELECT * FROM sbi_pps_cheques WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SBI PPS Cheques: Delete
app.delete('/api/tax/sbi/pps-cheques/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM sbi_pps_cheques WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quick-Log SBI Bank Charges (100% Tax Deductible u/s 37(1))
app.post('/api/tax/sbi/quick-bank-charge', (req: Request, res: Response) => {
  const { chargeType, customAmount, notes } = req.body;
  
  let desc = 'SBI Bank Service Charges';
  let amt = 0;

  switch (chargeType) {
    case 'DEBIT_CARD_AMC':
      desc = 'SBI Pride Business Debit Card AMC (₹350 + 18% GST)';
      amt = customAmount ? Number(customAmount) : 413;
      break;
    case 'SMS_ALERT':
      desc = 'SBI Current Account Quarterly SMS Alert Fee (₹15 + 18% GST)';
      amt = customAmount ? Number(customAmount) : 17.70;
      break;
    case 'MAB_SHORTFALL':
      desc = 'SBI Semi-Urban MAB Non-Maintenance Fee (₹500 + 18% GST)';
      amt = customAmount ? Number(customAmount) : 590;
      break;
    case 'CHEQUE_BOOK':
      desc = 'SBI Current Account Cheque Book Charges (25 Leaves + GST)';
      amt = customAmount ? Number(customAmount) : 177;
      break;
    default:
      desc = notes || 'SBI Current Account Charges u/s 37(1)';
      amt = Number(customAmount || 100);
      break;
  }

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const id = `exp-sbi-${Date.now()}`;

  try {
    db.prepare(`
      INSERT INTO expenses (
        id, date, month, category, tag, description, amount, payment_method,
        tax_classification, business_percentage, gst_rate, gst_itc_eligible,
        has_invoice_voucher, voucher_ref, notes
      ) VALUES (?, ?, ?, 'reg', 'Bank Charges', ?, ?, 'SBI Current Account', 'BUSINESS_DEDUCTIBLE', 100, 18, 0, 1, 'SBI-CHAKULIA-DEBIT', ?)
    `).run(id, today, month, desc, amt, notes || 'Auto-logged SBI statutory bank charges - 100% deductible under Section 37(1)');

    res.json({ success: true, id, description: desc, amount: amt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch Import SBI Statement Items (Expenses & Capital Introduced)
app.post('/api/tax/sbi/batch-import', (req: Request, res: Response) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    res.status(400).json({ error: 'transactions array is required' });
    return;
  }

  let importedExpenses = 0;
  let importedIncomes = 0;

  const insertExp = db.prepare(`
    INSERT INTO expenses (
      id, date, month, category, tag, description, amount, payment_method,
      tax_classification, business_percentage, gst_rate, gst_itc_eligible,
      has_invoice_voucher, voucher_ref, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SBI Current Account', ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertInc = db.prepare(`
    INSERT INTO income_entries (
      id, date, month, category, source, amount, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const item of transactions) {
      const date = item.date || new Date().toISOString().slice(0, 10);
      const month = date.slice(0, 7);
      const amt = Number(item.amount) || 0;
      if (amt <= 0) continue;

      if (item.type === 'DEBIT') {
        const id = `exp-sbi-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        insertExp.run(
          id,
          date,
          month,
          item.category || 'reg',
          item.tag || 'Bank Debit',
          item.description || 'SBI Bank Debit',
          amt,
          item.tax_classification || 'BUSINESS_DEDUCTIBLE',
          item.business_percentage !== undefined ? item.business_percentage : 100,
          item.gst_rate || 0,
          item.gst_itc_eligible ? 1 : 0,
          item.ref_no || 'SBI-CSV-IMPORT',
          item.notes || 'Imported from SBI Statement'
        );
        importedExpenses++;
      } else if (item.type === 'CREDIT') {
        const id = `inc-sbi-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const isCapital = item.tax_classification === 'CAPITAL_INTRODUCED';
        insertInc.run(
          id,
          date,
          month,
          isCapital ? 'saving' : 'fl',
          isCapital ? 'Personal Savings (Capital Introduced)' : (item.source || 'Client Revenue'),
          amt,
          isCapital
            ? 'Capital introduced from Personal Savings - Excluded from Taxable Turnover'
            : (item.notes || 'Imported from SBI Statement')
        );
        importedIncomes++;
      }
    }
  });

  try {
    tx();
    res.json({ success: true, importedExpenses, importedIncomes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static client assets in production if dist exists
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req: Request, res: Response, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`⚡ Billing API Server running on http://localhost:${PORT}`);
});


