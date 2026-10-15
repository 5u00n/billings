import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from './db';
import { generateDocxBuffer } from './docxGenerator';
import { generateVectorPdfBuffer } from './pdfGenerator';
import { Invoice, Organization, UserProfile, NumberingSettings, CatalogItem } from '../src/types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

    // Update numbering setting if it matches the current sequence
    const numberingRow: any = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('numbering');
    if (numberingRow) {
      const numbering = JSON.parse(numberingRow.value_json);
      const match = body.invoice_number.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (body.doc_type === 'BILL OF SUPPLY' && num >= numbering.nextNumberBOS) {
          numbering.nextNumberBOS = num + 1;
        } else if (body.doc_type === 'INVOICE' && num >= numbering.nextNumberINV) {
          numbering.nextNumberINV = num + 1;
        } else if ((body.doc_type === 'ESTIMATE' || body.doc_type === 'PROFORMA') && num >= numbering.nextNumberEST) {
          numbering.nextNumberEST = num + 1;
        } else if (body.doc_type === 'RECEIPT' && num >= numbering.nextNumberREC) {
          numbering.nextNumberREC = num + 1;
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

  res.json({
    profile: profileRow ? JSON.parse(profileRow.value_json) : {},
    numbering: numberingRow ? JSON.parse(numberingRow.value_json) : {},
  });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const { profile, numbering } = req.body;
  if (profile) {
    db.prepare('UPDATE settings SET value_json = ? WHERE key = ?').run(JSON.stringify(profile), 'profile');
  }
  if (numbering) {
    db.prepare('UPDATE settings SET value_json = ? WHERE key = ?').run(JSON.stringify(numbering), 'numbering');
  }
  res.json({ success: true });
});

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

  // Format with 6 digits padding like INV-000001
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
  const orgs = db.prepare('SELECT * FROM organizations').all();
  const invoices = db.prepare('SELECT * FROM invoices').all();
  const settings = db.prepare('SELECT * FROM settings').all();
  const catalog = db.prepare('SELECT * FROM catalog_items').all();

  res.setHeader('Content-Disposition', `attachment; filename="billings-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    version: '1.0',
    timestamp: new Date().toISOString(),
    organizations: orgs,
    invoices,
    settings,
    catalog,
  });
});

app.post('/api/backup/restore', (req: Request, res: Response) => {
  const data = req.body;
  if (!data || !data.organizations || !data.invoices) {
    res.status(400).json({ error: 'Invalid backup format' });
    return;
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM invoices').run();
    db.prepare('DELETE FROM organizations').run();
    db.prepare('DELETE FROM catalog_items').run();

    const insertOrg = db.prepare(`
      INSERT INTO organizations (id, name, address, city, state, pincode, country, phone, email, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const org of data.organizations) {
      insertOrg.run(
        org.id,
        org.name,
        org.address,
        org.city,
        org.state,
        org.pincode,
        org.country,
        org.phone,
        org.email,
        org.notes,
        org.created_at || new Date().toISOString()
      );
    }

    const insertInv = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date,
        items_json, sub_total, total, amount_paid, balance_due, notes, payment_options, status, copy_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const inv of data.invoices) {
      insertInv.run(
        inv.id,
        inv.invoice_number,
        inv.doc_type,
        inv.organization_id,
        inv.invoice_date,
        inv.terms,
        inv.due_date,
        inv.items_json,
        inv.sub_total,
        inv.total,
        inv.amount_paid,
        inv.balance_due,
        inv.notes,
        inv.payment_options,
        inv.status,
        inv.copy_type || 'ORIGINAL',
        inv.created_at || new Date().toISOString()
      );
    }

    if (data.catalog) {
      const insertCat = db.prepare('INSERT INTO catalog_items (id, name, description, default_rate) VALUES (?, ?, ?, ?)');
      for (const item of data.catalog) {
        insertCat.run(item.id, item.name, item.description, item.default_rate);
      }
    }
  });

  try {
    transaction();
    res.json({ success: true, message: 'Database restored successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- RECURRING SCHEDULES & AUTOMATIONS -----------------

function generateNextInvoiceNumberInternal(docType: string): string {
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
    numbering.nextNumberINV = seq + 1;
  } else if (docType === 'ESTIMATE' || docType === 'PROFORMA') {
    prefix = numbering.estimatePrefix || 'EST-';
    seq = numbering.nextNumberEST || 1;
    numbering.nextNumberEST = seq + 1;
  } else if (docType === 'RECEIPT') {
    prefix = numbering.receiptPrefix || 'REC-';
    seq = numbering.nextNumberREC || 1;
    numbering.nextNumberREC = seq + 1;
  } else {
    numbering.nextNumberBOS = seq + 1;
  }

  db.prepare('UPDATE settings SET value_json = ? WHERE key = ?').run(JSON.stringify(numbering), 'numbering');
  return `${prefix}${String(seq).padStart(6, '0')}`;
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
  const d = new Date(currentDateStr);
  d.setMonth(d.getMonth() + 1);
  const year = d.getFullYear();
  const month = d.getMonth();
  const maxDays = new Date(year, month + 1, 0).getDate();
  const day = Math.min(targetDay, maxDays);
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
    evaluateAndRunDueSchedules();
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

app.listen(PORT, () => {
  console.log(`⚡ Billing API Server running on http://localhost:${PORT}`);
});

