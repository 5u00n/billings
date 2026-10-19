export interface D1Result<T = any> {
  results: T[];
  success: boolean;
  meta: any;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = any>(): Promise<D1Result<T>>;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1Result>;
}

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  DB?: D1Database;
  BACKEND_URL?: string;
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_MEASUREMENT_ID?: string;
  VITE_ALLOWED_EMAILS?: string;
}

function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      ...headers,
    },
  });
}

function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}

const DEFAULT_WORKER_PROFILE = {
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

const DEFAULT_WORKER_NUMBERING = {
  billOfSupplyPrefix: 'BOS',
  invoicePrefix: 'INV',
  estimatePrefix: 'EST',
  receiptPrefix: 'REC',
  nextNumberBOS: 1,
  nextNumberINV: 1,
  nextNumberEST: 1,
  nextNumberREC: 1,
};

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
  if (taxableIncome <= 500000) {
    tax = 0;
  }
  return Math.round(tax * 1.04);
}

function mapInvoiceRow(row: any, orgRow?: any) {
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

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function verifyFirebaseTokenClaims(payload: any, projectId: string): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return false;
  if (projectId && payload.aud !== projectId) return false;
  if (projectId && payload.iss !== `https://securetoken.google.com/${projectId}`) return false;
  if (!payload.sub) return false;
  return true;
}

let d1MigrationsExecuted = false;

async function ensureD1Migrations(db: D1Database): Promise<void> {
  if (d1MigrationsExecuted) return;
  const migrations = [
    'ALTER TABLE invoices ADD COLUMN hide_qty INTEGER DEFAULT 0',
    "ALTER TABLE expenses ADD COLUMN tax_classification TEXT DEFAULT 'BUSINESS_DEDUCTIBLE'",
    'ALTER TABLE expenses ADD COLUMN business_percentage INTEGER DEFAULT 100',
    'ALTER TABLE expenses ADD COLUMN gst_rate REAL DEFAULT 0',
    'ALTER TABLE expenses ADD COLUMN gst_itc_eligible INTEGER DEFAULT 0',
    'ALTER TABLE expenses ADD COLUMN has_invoice_voucher INTEGER DEFAULT 1',
    'ALTER TABLE expenses ADD COLUMN voucher_ref TEXT',
    'ALTER TABLE expenses ADD COLUMN linked_borrow_id TEXT',
    'ALTER TABLE financial_goals ADD COLUMN spent_amount REAL DEFAULT 0',
    'ALTER TABLE financial_goals ADD COLUMN completed_date TEXT',
    'ALTER TABLE financial_goals ADD COLUMN linked_expense_id TEXT',
  ];

  for (const sql of migrations) {
    try {
      await db.exec(sql);
    } catch {
      // Column or table alteration already applied
    }
  }
  d1MigrationsExecuted = true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ----------------------------------------------------
    // 1. PUBLIC RUNTIME CONFIG & HEALTH
    // ----------------------------------------------------
    if (url.pathname === '/api/config') {
      // Return public Firebase Web App credentials only (NEVER private email lists)
      return jsonResponse({
        VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY || '',
        VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || '',
        VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || '',
        VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET || '',
        VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID || '',
      });
    }

    const db = env.DB || (env as any).billings_db;

    if (url.pathname === '/api/health') {
      return jsonResponse({
        status: 'ok',
        platform: 'cloudflare-worker',
        d1_bound: Boolean(db),
        timestamp: new Date().toISOString(),
      });
    }

    // ----------------------------------------------------
    // 2. D1 SQLITE API ROUTER (PROTECTED)
    // ----------------------------------------------------
    if (url.pathname.startsWith('/api/')) {
      // Authenticate all protected API routes
      const authHeader = request.headers.get('Authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return errorResponse('Authentication required. Missing Authorization header.', 401);
      }

      const token = authHeader.slice(7).trim();
      const payload = parseJwtPayload(token);
      const projectId = env.VITE_FIREBASE_PROJECT_ID || 'suren-billings-app';

      if (!verifyFirebaseTokenClaims(payload, projectId)) {
        return errorResponse('Invalid or expired authentication session. Please sign in again.', 401);
      }

      // Enforce email authorization on the server
      const allowedList = (env.VITE_ALLOWED_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (allowedList.length > 0) {
        const userEmail = (payload.email || '').toLowerCase();
        if (!userEmail || !allowedList.includes(userEmail)) {
          return errorResponse('Access restricted. User is not an authorized administrator.', 403);
        }
      }

      // If external backend URL is configured, proxy request
      if (env.BACKEND_URL && !db) {
        const backendOrigin = env.BACKEND_URL.replace(/\/+$/, '');
        const targetUrl = new URL(url.pathname + url.search, backendOrigin);
        const headers = new Headers(request.headers);
        headers.set('X-Forwarded-Host', url.host);
        return fetch(targetUrl.toString(), {
          method: request.method,
          headers,
          body: request.body,
        });
      }

      if (!db) {
        return errorResponse(
          'Cloudflare D1 database binding (DB / billings_db) is missing. Please check wrangler.jsonc or run npx wrangler d1 create billings-db',
          503
        );
      }

      await ensureD1Migrations(db);

      const method = request.method.toUpperCase();

      try {
        // --- AUTH VERIFICATION ---
        if (url.pathname === '/api/auth/verify' && method === 'GET') {
          return jsonResponse({
            success: true,
            authorized: true,
            email: payload?.email || null,
          });
        }

        // --- INVOICES ---
        if (url.pathname === '/api/invoices/next-number' && method === 'GET') {
          const type = url.searchParams.get('type') || 'BILL OF SUPPLY';
          const settingsRow = await db.prepare('SELECT value_json FROM settings WHERE key = ?').bind('numbering').first();
          const numbering = settingsRow ? JSON.parse(settingsRow.value_json) : { prefix: 'INV', nextNumber: 1, padLength: 3 };

          const prefix = type === 'TAX INVOICE' ? 'TI' : numbering.prefix || 'INV';
          const maxRow = await db
            .prepare(
              `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY LENGTH(invoice_number) DESC, invoice_number DESC LIMIT 1`
            )
            .bind(`${prefix}-%`)
            .first();

          let nextNum = numbering.nextNumber || 1;
          if (maxRow && maxRow.invoice_number) {
            const parts = maxRow.invoice_number.split('-');
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum) && lastNum >= nextNum) {
              nextNum = lastNum + 1;
            }
          }
          const padded = String(nextNum).padStart(numbering.padLength || 3, '0');
          return jsonResponse({ nextNumber: `${prefix}-${padded}`, rawNumber: nextNum });
        }

        if (url.pathname === '/api/invoices' && method === 'GET') {
          const orgId = url.searchParams.get('organization_id');
          const status = url.searchParams.get('status');
          const docType = url.searchParams.get('doc_type');
          const search = url.searchParams.get('search');

          let query = `
            SELECT i.*, o.name as org_name, o.address as org_address, o.city as org_city,
                   o.state as org_state, o.pincode as org_pincode, o.country as org_country,
                   o.phone as org_phone, o.email as org_email
            FROM invoices i
            LEFT JOIN organizations o ON i.organization_id = o.id
            WHERE 1=1
          `;
          const params: any[] = [];
          if (orgId) {
            query += ` AND i.organization_id = ?`;
            params.push(orgId);
          }
          if (status) {
            query += ` AND i.status = ?`;
            params.push(status);
          }
          if (docType) {
            query += ` AND i.doc_type = ?`;
            params.push(docType);
          }
          if (search) {
            query += ` AND (i.invoice_number LIKE ? OR o.name LIKE ? OR i.notes LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          }
          query += ` ORDER BY i.created_at DESC`;

          const stmt = params.length > 0 ? db.prepare(query).bind(...params) : db.prepare(query);
          const { results } = await stmt.all();
          const mapped = results.map((row: any) =>
            mapInvoiceRow(row, row.org_name ? { id: row.organization_id, name: row.org_name, address: row.org_address, city: row.org_city, state: row.org_state, pincode: row.org_pincode, country: row.org_country, phone: row.org_phone, email: row.org_email } : undefined)
          );
          return jsonResponse(mapped);
        }

        if (url.pathname === '/api/invoices' && method === 'POST') {
          const b = (await request.json()) as any;
          const id = b.id || crypto.randomUUID();
          await db.prepare(`
            INSERT INTO invoices (
              id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date,
              items_json, sub_total, total, amount_paid, balance_due, notes, payment_options,
              status, copy_type, hide_qty
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            b.invoice_number,
            b.doc_type || 'BILL OF SUPPLY',
            b.organization_id,
            b.invoice_date,
            b.terms,
            b.due_date,
            JSON.stringify(b.items || []),
            b.sub_total,
            b.total,
            b.amount_paid || 0,
            b.balance_due,
            b.notes || '',
            b.payment_options || '',
            b.status || 'issued',
            b.copy_type || 'ORIGINAL',
            b.hide_qty ? 1 : 0
          ).run();
          return jsonResponse({ id, success: true }, 201);
        }

        if (url.pathname.startsWith('/api/invoices/')) {
          const id = url.pathname.replace('/api/invoices/', '');
          if (method === 'GET') {
            const row = await db.prepare('SELECT * FROM invoices WHERE id = ? OR invoice_number = ?').bind(id, id).first();
            if (!row) return errorResponse('Invoice not found', 404);
            const org = row.organization_id ? await db.prepare('SELECT * FROM organizations WHERE id = ?').bind(row.organization_id).first() : null;
            return jsonResponse(mapInvoiceRow(row, org));
          }
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE invoices SET
                doc_type = ?, organization_id = ?, invoice_date = ?, terms = ?, due_date = ?,
                items_json = ?, sub_total = ?, total = ?, amount_paid = ?, balance_due = ?,
                notes = ?, payment_options = ?, status = ?, copy_type = ?, hide_qty = ?
              WHERE id = ?
            `).bind(
              b.doc_type,
              b.organization_id,
              b.invoice_date,
              b.terms,
              b.due_date,
              JSON.stringify(b.items || []),
              b.sub_total,
              b.total,
              b.amount_paid,
              b.balance_due,
              b.notes || '',
              b.payment_options || '',
              b.status,
              b.copy_type || 'ORIGINAL',
              b.hide_qty ? 1 : 0,
              id
            ).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM invoices WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- ORGANIZATIONS ---
        if (url.pathname === '/api/organizations') {
          if (method === 'GET') {
            const { results } = await db.prepare('SELECT * FROM organizations ORDER BY name ASC').all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare(`
              INSERT INTO organizations (id, name, address, city, state, pincode, country, phone, email, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, b.name, b.address, b.city || '', b.state || '', b.pincode || '', b.country || 'India', b.phone || '', b.email || '', b.notes || '').run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/organizations/')) {
          const id = url.pathname.replace('/api/organizations/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE organizations SET name = ?, address = ?, city = ?, state = ?, pincode = ?, country = ?, phone = ?, email = ?, notes = ?
              WHERE id = ?
            `).bind(b.name, b.address, b.city || '', b.state || '', b.pincode || '', b.country || 'India', b.phone || '', b.email || '', b.notes || '', id).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM organizations WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- SETTINGS ---
        if (url.pathname === '/api/settings') {
          if (method === 'GET') {
            const { results } = await db.prepare('SELECT * FROM settings').all();
            const settingsObj: Record<string, any> = {
              profile: DEFAULT_WORKER_PROFILE,
              numbering: DEFAULT_WORKER_NUMBERING,
            };
            for (const r of results) {
              try {
                settingsObj[r.key] = JSON.parse(r.value_json);
              } catch {
                settingsObj[r.key] = r.value_json;
              }
            }
            settingsObj.profile = { ...DEFAULT_WORKER_PROFILE, ...(settingsObj.profile || {}) };
            settingsObj.numbering = { ...DEFAULT_WORKER_NUMBERING, ...(settingsObj.numbering || {}) };
            return jsonResponse(settingsObj);
          }
          if (method === 'POST' || method === 'PUT') {
            const b = (await request.json()) as any;
            const stmts = Object.entries(b).map(([k, v]) =>
              db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json')
                .bind(k, JSON.stringify(v))
            );
            await db.batch(stmts);
            return jsonResponse({ success: true });
          }
        }

        // --- CATALOG ---
        if (url.pathname === '/api/catalog') {
          if (method === 'GET') {
            const { results } = await db.prepare('SELECT * FROM catalog_items ORDER BY name ASC').all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare('INSERT INTO catalog_items (id, name, description, default_rate) VALUES (?, ?, ?, ?)').bind(id, b.name, b.description || '', b.default_rate).run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname === '/api/catalog/batch' && method === 'POST') {
          const { items } = (await request.json()) as any;
          if (!Array.isArray(items)) return errorResponse('Items array required', 400);
          let count = 0;
          for (const it of items) {
            if (!it.name && !it.description) continue;
            const id = it.id || crypto.randomUUID();
            const name = String(it.name || it.description || 'Item').trim();
            const desc = String(it.description || '').trim();
            const rate = Number(it.default_rate || it.rate || 0);
            await db.prepare('INSERT INTO catalog_items (id, name, description, default_rate) VALUES (?, ?, ?, ?)').bind(id, name, desc, rate).run();
            count++;
          }
          return jsonResponse({ success: true, count });
        }

        if (url.pathname.startsWith('/api/catalog/') && method === 'DELETE') {
          const id = url.pathname.replace('/api/catalog/', '');
          await db.prepare('DELETE FROM catalog_items WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }

        // --- BUDGET: MONTHS ---
        if (url.pathname === '/api/budget/months') {
          if (method === 'GET') {
            const q = `
              SELECT DISTINCT month FROM expenses
              UNION
              SELECT DISTINCT month FROM income_entries
              UNION
              SELECT DISTINCT month FROM borrow_records
              UNION
              SELECT month FROM monthly_budget_summaries
              ORDER BY month DESC
            `;
            const { results } = await db.prepare(q).all();
            const currentMonth = new Date().toISOString().substring(0, 7);
            const months = Array.from(new Set([...results.map((r: any) => r.month).filter(Boolean), currentMonth])).sort().reverse();
            return jsonResponse(months);
          }
          if (method === 'POST') {
            try {
              const { month } = (await request.json()) as any;
              if (!month || !/^\d{4}-\d{2}$/.test(month)) {
                return errorResponse('Valid YYYY-MM month string is required', 400);
              }
              const existing = await db.prepare('SELECT month FROM monthly_budget_summaries WHERE month = ?').bind(month).first();
              if (!existing) {
                await db.prepare(`
                  INSERT INTO monthly_budget_summaries (month, starting_debt, previous_remaining, dept_payment, borrow_amount, reg_savings, ext_savings, notes)
                  VALUES (?, 0, 0, 0, 0, 0, 0, '')
                `).bind(month).run();
              }
              return jsonResponse({ success: true, month }, 201);
            } catch (err: any) {
              return errorResponse(err.message || 'Failed to add month', 500);
            }
          }
        }

        // --- BUDGET: MULTI-MONTH BREAKDOWN (Monthly Breakdown Ledger) ---
        if (url.pathname === '/api/budget/monthly-breakdown' && method === 'GET') {
          try {
            // 1. Gather all unique months across all budget tables
            const qMonths = `
              SELECT DISTINCT month FROM expenses
              UNION
              SELECT DISTINCT month FROM income_entries
              UNION
              SELECT DISTINCT month FROM borrow_records
              UNION
              SELECT month FROM monthly_budget_summaries
              ORDER BY month ASC
            `;
            const { results: mResults } = await db.prepare(qMonths).all();
            const monthSet = new Set<string>();
            (mResults || []).forEach((r: any) => {
              if (r && r.month && r.month.length === 7) monthSet.add(r.month);
            });

            // Ensure baseline months (2026-08, 2026-09, 2026-10) exist
            ['2026-08', '2026-09', '2026-10'].forEach((m) => monthSet.add(m));
            const sortedMonths = Array.from(monthSet).sort();

            // 2. Fetch all data in batch to avoid N+1 queries
            const [allSummariesRes, allExpensesRes, allIncomesRes, allBorrowsRes] = await Promise.all([
              db.prepare('SELECT * FROM monthly_budget_summaries').all(),
              db.prepare('SELECT month, category, SUM(amount) as total FROM expenses GROUP BY month, category').all(),
              db.prepare('SELECT month, category, SUM(amount) as total FROM income_entries GROUP BY month, category').all(),
              db.prepare('SELECT month, type, SUM(amount) as total FROM borrow_records GROUP BY month, type').all(),
            ]);

            const summariesByMonth = new Map<string, any>();
            (allSummariesRes.results || []).forEach((s: any) => summariesByMonth.set(s.month, s));

            const expensesByMonth = new Map<string, { reg: number; ext: number; total: number }>();
            (allExpensesRes.results || []).forEach((e: any) => {
              const cur = expensesByMonth.get(e.month) || { reg: 0, ext: 0, total: 0 };
              const amt = Number(e.total) || 0;
              if (e.category === 'reg') cur.reg += amt;
              else cur.ext += amt;
              cur.total += amt;
              expensesByMonth.set(e.month, cur);
            });

            const incomesByMonth = new Map<string, { sal: number; fl: number; rt: number; ext: number }>();
            (allIncomesRes.results || []).forEach((i: any) => {
              const cur = incomesByMonth.get(i.month) || { sal: 0, fl: 0, rt: 0, ext: 0 };
              const amt = Number(i.total) || 0;
              if (i.category === 'sal') cur.sal += amt;
              else if (i.category === 'fl') cur.fl += amt;
              else if (i.category === 'rt') cur.rt += amt;
              else cur.ext += amt;
              incomesByMonth.set(i.month, cur);
            });

            const borrowsByMonth = new Map<string, { borrow: number; return: number }>();
            (allBorrowsRes.results || []).forEach((b: any) => {
              const cur = borrowsByMonth.get(b.month) || { borrow: 0, return: 0 };
              const amt = Number(b.total) || 0;
              if (b.type === 'BORROW') cur.borrow += amt;
              else if (b.type === 'RETURN') cur.return += amt;
              borrowsByMonth.set(b.month, cur);
            });

            // 3. Sequential carryover calculation
            const breakdown: any[] = [];
            let carryEndingDebt = 62152;
            let carryRemaining = 14000;

            sortedMonths.forEach((m, idx) => {
              const summary = summariesByMonth.get(m) || {};

              const startingDebt = summary.starting_debt !== undefined && summary.starting_debt !== null && Number(summary.starting_debt) !== 0
                ? Number(summary.starting_debt)
                : (idx === 0 ? 62152 : carryEndingDebt);

              const previousRemaining = summary.previous_remaining !== undefined && summary.previous_remaining !== null
                ? Number(summary.previous_remaining)
                : (idx === 0 ? 14000 : carryRemaining);

              const exp = expensesByMonth.get(m) || { reg: 0, ext: 0, total: 0 };
              const inc = incomesByMonth.get(m) || { sal: 0, fl: 0, rt: 0, ext: 0 };
              const br = borrowsByMonth.get(m) || { borrow: 0, return: 0 };

              const salary = inc.sal;
              const freelance = inc.fl;
              const returns = Math.max(inc.rt, br.return);
              const extIncome = inc.ext;

              const regExpense = exp.reg;
              const extExpense = exp.ext;
              const totalExpense = exp.total;

              const autoBorrow = br.borrow;
              const finalBorrow = summary.borrow_amount !== undefined && summary.borrow_amount !== null
                ? Number(summary.borrow_amount)
                : autoBorrow;

              const totalIncome = previousRemaining + salary + freelance + returns + extIncome;
              const regSavings = Number(summary.reg_savings) || 0;
              const extSavings = Number(summary.ext_savings) || 0;
              const deptPayment = Number(summary.dept_payment) || 0;

              const overhead = (totalIncome + finalBorrow) - (totalExpense + deptPayment);
              const ovhSavings = overhead > 0 ? Math.round(overhead / 2) : 0;
              const totalSavings = regSavings + extSavings + ovhSavings;
              const remaining = overhead > 0 ? (overhead - ovhSavings) : 0;

              const deficit = totalExpense > totalIncome ? totalExpense - totalIncome : 0;
              const endingDebt = (startingDebt - deptPayment) + finalBorrow + deficit;

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

            return jsonResponse(breakdown);
          } catch (err: any) {
            return errorResponse(err.message || 'Failed to calculate monthly breakdown', 500);
          }
        }

        // --- BUDGET: CONSOLIDATED MONTH BUNDLE (Single Roundtrip) ---
        if (url.pathname === '/api/budget/month-bundle' && method === 'GET') {
          const m = url.searchParams.get('month') || new Date().toISOString().substring(0, 7);
          const isAll = m === 'all';

          // 1. Fetch available months
          const qMonths = `
            SELECT DISTINCT month FROM expenses
            UNION
            SELECT DISTINCT month FROM income_entries
            UNION
            SELECT DISTINCT month FROM borrow_records
            UNION
            SELECT month FROM monthly_budget_summaries
            ORDER BY month DESC
          `;
          const { results: mResults } = await db.prepare(qMonths).all();
          const months = mResults.map((r: any) => r.month).filter(Boolean);
          const currentM = new Date().toISOString().substring(0, 7);
          if (!months.includes(currentM)) months.unshift(currentM);

          // 2. Fetch expenses, income, borrow, goals, rules, and summary
          const expQuery = isAll
            ? 'SELECT * FROM expenses ORDER BY date DESC'
            : 'SELECT * FROM expenses WHERE month = ? ORDER BY date DESC';
          const incQuery = isAll
            ? 'SELECT * FROM income_entries ORDER BY date DESC'
            : 'SELECT * FROM income_entries WHERE month = ? ORDER BY date DESC';
          const brQuery = isAll
            ? 'SELECT * FROM borrow_records ORDER BY date DESC'
            : 'SELECT * FROM borrow_records WHERE month = ? ORDER BY date DESC';

          const [expRes, incRes, brRes, goalsRes, rulesRes, summaryRow] = await Promise.all([
            isAll ? db.prepare(expQuery).all() : db.prepare(expQuery).bind(m).all(),
            isAll ? db.prepare(incQuery).all() : db.prepare(incQuery).bind(m).all(),
            isAll ? db.prepare(brQuery).all() : db.prepare(brQuery).bind(m).all(),
            db.prepare('SELECT * FROM financial_goals ORDER BY target_amount DESC').all(),
            db.prepare('SELECT * FROM budget_allocation_rules ORDER BY display_order ASC').all(),
            isAll
              ? db.prepare('SELECT starting_debt, previous_remaining FROM monthly_budget_summaries ORDER BY month ASC LIMIT 1').first()
              : db.prepare('SELECT * FROM monthly_budget_summaries WHERE month = ?').bind(m).first(),
          ]);

          const expenses = expRes.results || [];
          const incomes = incRes.results || [];
          const borrows = brRes.results || [];
          const goals = goalsRes.results || [];
          const rules = rulesRes.results || [];

          // Compute summary calculations
          let regExpense = 0;
          let extExpense = 0;
          expenses.forEach((e: any) => {
            if (e.category === 'reg') regExpense += Number(e.amount) || 0;
            else extExpense += Number(e.amount) || 0;
          });
          const totalExpense = regExpense + extExpense;

          let salary = 0;
          let freelance = 0;
          let returns = 0;
          let extIncome = 0;
          incomes.forEach((i: any) => {
            if (i.category === 'sal') salary += Number(i.amount) || 0;
            else if (i.category === 'fl') freelance += Number(i.amount) || 0;
            else if (i.category === 'rt') returns += Number(i.amount) || 0;
            else extIncome += Number(i.amount) || 0;
          });

          // Returns and borrows
          let borrowReturns = 0;
          let autoBorrow = 0;
          borrows.forEach((b: any) => {
            if (b.type === 'RETURN') borrowReturns += Number(b.amount) || 0;
            else if (b.type === 'BORROW') autoBorrow += Number(b.amount) || 0;
          });
          returns = Math.max(returns, borrowReturns);

          const rawSummary = summaryRow as any;
          const startingDebt = Number(rawSummary?.starting_debt) || 0;
          const previousRemaining = Number(rawSummary?.previous_remaining) || 0;
          let debtPayment = Number(rawSummary?.dept_payment) || 0;
          if (!debtPayment) {
            try {
              const expDebtRow: any = await db.prepare("SELECT SUM(amount) as total FROM expenses WHERE month = ? AND (tag = 'Debt Repayment' OR tag LIKE '%Payback%' OR linked_borrow_id IS NOT NULL)").bind(m).first();
              if (expDebtRow && expDebtRow.total) {
                debtPayment = Number(expDebtRow.total) || 0;
              }
            } catch (e) {}
          }
          const finalBorrow = rawSummary?.borrow_amount !== undefined && rawSummary?.borrow_amount !== null ? Number(rawSummary.borrow_amount) : autoBorrow;
          const regSavings = Number(rawSummary?.reg_savings) || 0;
          const extSavings = Number(rawSummary?.ext_savings) || 0;

          const totalIncomeEarned = salary + freelance + returns + extIncome;
          const totalInflow = previousRemaining + totalIncomeEarned;
          const overhead = (totalInflow + finalBorrow) - (totalExpense + debtPayment);
          const overheadSavings = overhead > 0 ? Math.round(overhead / 2) : 0;
          const totalSavings = regSavings + extSavings + overheadSavings;
          const remaining = overhead - overheadSavings;
          const endingDebt = startingDebt + finalBorrow - debtPayment;

          const summary = {
            month: m,
            starting_debt: startingDebt,
            previous_remaining: previousRemaining,
            salary,
            freelance,
            returns,
            ext_income: extIncome,
            total_income_earned: totalIncomeEarned,
            total_income: totalInflow,
            total_inflow: totalInflow,
            reg_savings: regSavings,
            ext_savings: extSavings,
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
            notes: rawSummary?.notes || '',
          };

          // Compute planned vs actual allocations
          const allocations = rules.map((r: any) => {
            const planned = Math.round(totalInflow * Number(r.percentage));
            let actual = 0;
            if (r.category === 'Essentials') {
              actual = regExpense;
            } else if (r.category === 'Small Assets') {
              expenses.forEach((e: any) => {
                if (e.tag === 'Gadgets' || e.tag === 'Accessories') actual += Number(e.amount) || 0;
              });
            } else if (r.category === 'Business Growth') {
              expenses.forEach((e: any) => {
                if (e.tag === 'Services' || e.tag === 'Hosting' || e.tag === 'Tools') actual += Number(e.amount) || 0;
              });
            }
            return {
              ...r,
              planned_amount: planned,
              actual_spent: actual,
              variance: planned - actual,
            };
          });

          return jsonResponse({
            month: m,
            summary,
            expenses,
            incomes,
            borrows,
            goals,
            allocations,
            total_income: totalInflow,
            months,
          });
        }

        // --- BUDGET: EXPENSES ---
        if (url.pathname === '/api/budget/expenses') {
          if (method === 'GET') {
            const m = url.searchParams.get('month');
            const stmt = m && m !== 'all'
              ? db.prepare('SELECT * FROM expenses WHERE month = ? ORDER BY date DESC').bind(m)
              : db.prepare('SELECT * FROM expenses ORDER BY date DESC');
            const { results } = await stmt.all();
            return jsonResponse(results || []);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            const date = (b.date && typeof b.date === 'string' && b.date.trim())
              ? b.date.trim()
              : new Date().toISOString().split('T')[0];
            const month = b.month || date.substring(0, 7);
            const amount = Number(b.amount) || 0;

            await db.prepare(`
              INSERT INTO expenses (id, date, month, category, tag, description, amount, payment_method, notes, tax_classification, business_percentage, gst_rate, gst_itc_eligible, has_invoice_voucher, voucher_ref, linked_borrow_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              id,
              date,
              month,
              b.category === 'reg' ? 'reg' : 'ext',
              b.tag || 'General',
              String(b.description || 'Expense').trim(),
              amount,
              b.payment_method || 'UPI / Bank',
              b.notes || '',
              b.tax_classification || 'BUSINESS_DEDUCTIBLE',
              b.business_percentage ?? 100,
              b.gst_rate ?? 0,
              b.gst_itc_eligible ? 1 : 0,
              b.has_invoice_voucher ? 1 : 0,
              b.voucher_ref || '',
              b.linked_borrow_id || null
            ).run();

            // Auto-create borrow record if Credit Card
            if (b.payment_method === 'Credit Card' && b.create_borrow !== false) {
              try {
                const borrowId = `borrow-cc-${id}`;
                const personName = (b.borrow_entity && String(b.borrow_entity).trim()) || 'Credit Card';
                await db.prepare(`
                  INSERT OR REPLACE INTO borrow_records (id, date, month, type, person, reason, amount, status)
                  VALUES (?, ?, ?, 'BORROW', ?, ?, ?, 'PENDING')
                `).bind(
                  borrowId,
                  date,
                  month,
                  personName,
                  `Credit Card: ${String(b.description || '').trim()}`,
                  amount
                ).run();
              } catch (e) {}
            }

            // Settle existing borrow if linked
            if (b.linked_borrow_id && b.settle_borrow !== false) {
              try {
                await db.prepare("UPDATE borrow_records SET status = 'SETTLED' WHERE id = ?").bind(b.linked_borrow_id).run();
              } catch (e) {}
            } else if (b.is_new_borrow_payback && b.payback_person) {
              try {
                const newBorrowId = `borrow-pb-${id}`;
                await db.prepare(`
                  INSERT OR REPLACE INTO borrow_records (id, date, month, type, person, reason, amount, status)
                  VALUES (?, ?, ?, 'BORROW', ?, ?, ?, 'SETTLED')
                `).bind(
                  newBorrowId,
                  date,
                  month,
                  String(b.payback_person).trim(),
                  `Payback: ${String(b.description || '').trim()}`,
                  amount
                ).run();
              } catch (e) {}
            }

            return jsonResponse({ id, month, success: true }, 201);
          }
        }

        if (url.pathname === '/api/budget/expenses/batch' && method === 'POST') {
          const { items } = (await request.json()) as any;
          if (!Array.isArray(items)) return errorResponse('Items array required', 400);
          let count = 0;
          for (const b of items) {
            const amount = Number(b.amount) || 0;
            if (amount <= 0 || !b.description) continue;
            const date = (b.date && typeof b.date === 'string' && b.date.trim())
              ? b.date.trim().substring(0, 10)
              : new Date().toISOString().split('T')[0];
            const month = b.month || date.substring(0, 7);
            const id = b.id || crypto.randomUUID();

            await db.prepare(`
              INSERT INTO expenses (id, date, month, category, tag, description, amount, payment_method, notes, tax_classification, business_percentage, gst_rate, gst_itc_eligible, has_invoice_voucher, voucher_ref, linked_borrow_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              id,
              date,
              month,
              b.category === 'reg' ? 'reg' : 'ext',
              b.tag || 'General',
              String(b.description).trim(),
              amount,
              b.payment_method || 'UPI / Bank',
              b.notes || '',
              b.tax_classification || 'BUSINESS_DEDUCTIBLE',
              b.business_percentage ?? 100,
              b.gst_rate ?? 0,
              b.gst_itc_eligible ? 1 : 0,
              b.has_invoice_voucher !== undefined ? (b.has_invoice_voucher ? 1 : 0) : 1,
              b.voucher_ref || '',
              b.linked_borrow_id || null
            ).run();

            if (b.payment_method === 'Credit Card') {
              try {
                await db.prepare(`
                  INSERT OR REPLACE INTO borrow_records (id, date, month, type, person, reason, amount, status)
                  VALUES (?, ?, ?, 'BORROW', ?, ?, ?, 'PENDING')
                `).bind(
                  `borrow-cc-${id}`,
                  date,
                  month,
                  'Credit Card',
                  `Credit Card: ${String(b.description).trim()}`,
                  amount
                ).run();
              } catch (e) {}
            }
            count++;
          }
          return jsonResponse({ success: true, count });
        }

        if (url.pathname.startsWith('/api/budget/expenses/')) {
          const id = url.pathname.replace('/api/budget/expenses/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            const date = (b.date && typeof b.date === 'string' && b.date.trim())
              ? b.date.trim()
              : new Date().toISOString().split('T')[0];
            const month = b.month || date.substring(0, 7);
            await db.prepare(`
              UPDATE expenses SET
                date = ?, month = ?, category = ?, tag = ?, description = ?, amount = ?,
                payment_method = ?, notes = ?, tax_classification = ?, business_percentage = ?,
                gst_rate = ?, gst_itc_eligible = ?, has_invoice_voucher = ?, voucher_ref = ?,
                linked_borrow_id = COALESCE(?, linked_borrow_id)
              WHERE id = ?
            `).bind(
              date,
              month,
              b.category,
              b.tag || '',
              b.description,
              b.amount,
              b.payment_method || 'UPI / Bank',
              b.notes || '',
              b.tax_classification || 'BUSINESS_DEDUCTIBLE',
              b.business_percentage ?? 100,
              b.gst_rate ?? 0,
              b.gst_itc_eligible ? 1 : 0,
              b.has_invoice_voucher ? 1 : 0,
              b.voucher_ref || '',
              b.linked_borrow_id || null,
              id
            ).run();

            try {
              const ccBorrow: any = await db.prepare('SELECT id FROM borrow_records WHERE id = ?').bind(`borrow-cc-${id}`).first();
              if (ccBorrow) {
                await db.prepare(`
                  UPDATE borrow_records SET date = ?, month = ?, amount = ?, reason = ?
                  WHERE id = ?
                `).bind(date, month, Number(b.amount) || 0, `Credit Card: ${String(b.description).trim()}`, ccBorrow.id).run();
              }
            } catch (e) {}

            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            try {
              await db.prepare("DELETE FROM borrow_records WHERE id = ? AND status = 'PENDING'").bind(`borrow-cc-${id}`).run();
            } catch (e) {}

            await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- BUDGET: INCOME ---
        if (url.pathname === '/api/budget/income') {
          if (method === 'GET') {
            const m = url.searchParams.get('month');
            const stmt = m && m !== 'all'
              ? db.prepare('SELECT * FROM income_entries WHERE month = ? ORDER BY date DESC').bind(m)
              : db.prepare('SELECT * FROM income_entries ORDER BY date DESC');
            const { results } = await stmt.all();
            return jsonResponse(results || []);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            const date = (b.date && typeof b.date === 'string' && b.date.trim())
              ? b.date.trim()
              : new Date().toISOString().split('T')[0];
            const month = b.month || date.substring(0, 7);
            await db.prepare(`
              INSERT INTO income_entries (id, date, month, category, source, amount, invoice_id, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, date, month, b.category || 'fl', b.source || 'Client', b.amount || 0, b.invoice_id || null, b.notes || '').run();
            return jsonResponse({ id, month, success: true }, 201);
          }
        }

        if (url.pathname === '/api/budget/income/batch' && method === 'POST') {
          const { items } = (await request.json()) as any;
          if (!Array.isArray(items)) return errorResponse('Items array required', 400);
          let count = 0;
          for (const b of items) {
            const amount = Number(b.amount) || 0;
            if (amount <= 0 || !b.source) continue;
            const date = (b.date && typeof b.date === 'string' && b.date.trim())
              ? b.date.trim().substring(0, 10)
              : new Date().toISOString().split('T')[0];
            const month = b.month || date.substring(0, 7);
            const id = b.id || crypto.randomUUID();

            await db.prepare(`
              INSERT INTO income_entries (id, date, month, category, source, amount, invoice_id, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, date, month, b.category || 'fl', String(b.source).trim(), amount, b.invoice_id || null, b.notes || '').run();
            count++;
          }
          return jsonResponse({ success: true, count });
        }

        if (url.pathname.startsWith('/api/budget/income/')) {
          const id = url.pathname.replace('/api/budget/income/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            const date = (b.date && typeof b.date === 'string' && b.date.trim())
              ? b.date.trim()
              : new Date().toISOString().split('T')[0];
            const month = b.month || date.substring(0, 7);
            await db.prepare(`
              UPDATE income_entries SET date = ?, month = ?, category = ?, source = ?, amount = ?, invoice_id = ?, notes = ?
              WHERE id = ?
            `).bind(date, month, b.category, b.source, b.amount, b.invoice_id || null, b.notes || '', id).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.batch([
              db.prepare('DELETE FROM current_account_withdrawals WHERE income_entry_id = ?').bind(id),
              db.prepare('DELETE FROM income_entries WHERE id = ?').bind(id),
            ]);
            return jsonResponse({ success: true });
          }
        }

        // --- BUDGET: BORROW ---
        if (url.pathname === '/api/budget/borrow') {
          if (method === 'GET') {
            const m = url.searchParams.get('month');
            const stmt = m && m !== 'all'
              ? db.prepare('SELECT * FROM borrow_records WHERE month = ? ORDER BY date DESC').bind(m)
              : db.prepare('SELECT * FROM borrow_records ORDER BY date DESC');
            const { results } = await stmt.all();
            return jsonResponse(results || []);
          }
          if (method === 'POST') {
            try {
              const b = (await request.json()) as any;
              const amount = Number(b.amount);
              const person = b.person ? String(b.person).trim() : '';
              if (!person || isNaN(amount) || amount <= 0) {
                return errorResponse('Person and a valid amount greater than 0 are required', 400);
              }
              const id = b.id || crypto.randomUUID();
              const date = (b.date && typeof b.date === 'string' && b.date.trim())
                ? b.date.trim().substring(0, 10)
                : new Date().toISOString().split('T')[0];
              const month = b.month || date.substring(0, 7);
              const type = b.type || 'BORROW';
              const reason = b.reason ? String(b.reason).trim() : '';
              const status = b.status || 'PENDING';

              await db.prepare(`
                INSERT INTO borrow_records (id, date, month, type, person, reason, amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(id, date, month, type, person, reason, amount, status).run();
              return jsonResponse({ id, month, success: true }, 201);
            } catch (err: any) {
              return errorResponse(err.message || 'Failed to save borrow record', 500);
            }
          }
        }

        if (url.pathname === '/api/budget/borrow/batch' && method === 'POST') {
          try {
            const { items } = (await request.json()) as any;
            if (!Array.isArray(items)) return errorResponse('Items array required', 400);
            let count = 0;
            for (const b of items) {
              const amount = Number(b.amount) || 0;
              const person = b.person ? String(b.person).trim() : '';
              if (amount <= 0 || !person) continue;
              const date = (b.date && typeof b.date === 'string' && b.date.trim())
                ? b.date.trim().substring(0, 10)
                : new Date().toISOString().split('T')[0];
              const month = b.month || date.substring(0, 7);
              const id = b.id || crypto.randomUUID();
              const type = b.type || 'BORROW';
              const reason = b.reason ? String(b.reason).trim() : '';
              const status = b.status || 'PENDING';

              await db.prepare(`
                INSERT INTO borrow_records (id, date, month, type, person, reason, amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(id, date, month, type, person, reason, amount, status).run();
              count++;
            }
            return jsonResponse({ success: true, count });
          } catch (err: any) {
            return errorResponse(err.message || 'Failed to batch import borrow records', 500);
          }
        }

        if (url.pathname.startsWith('/api/budget/borrow/')) {
          const id = url.pathname.replace('/api/budget/borrow/', '');
          if (method === 'PUT') {
            try {
              const b = (await request.json()) as any;
              const existing: any = await db.prepare('SELECT * FROM borrow_records WHERE id = ?').bind(id).first();
              if (!existing) {
                return errorResponse('Borrow record not found', 404);
              }
              const date = (b.date && typeof b.date === 'string' && b.date.trim())
                ? b.date.trim().substring(0, 10)
                : existing.date;
              const month = b.month || date.substring(0, 7);
              const type = b.type || existing.type || 'BORROW';
              const person = b.person !== undefined && b.person !== null ? String(b.person).trim() : existing.person;
              const reason = b.reason !== undefined && b.reason !== null ? String(b.reason).trim() : (existing.reason || '');
              const amount = b.amount !== undefined && b.amount !== null ? Number(b.amount) : existing.amount;
              const status = b.status || existing.status || 'PENDING';

              await db.prepare(`
                UPDATE borrow_records SET date = ?, month = ?, type = ?, person = ?, reason = ?, amount = ?, status = ?
                WHERE id = ?
              `).bind(date, month, type, person, reason, amount, status, id).run();
              return jsonResponse({ success: true, id, month });
            } catch (err: any) {
              return errorResponse(err.message || 'Failed to update borrow record', 500);
            }
          }
          if (method === 'DELETE') {
            try {
              await db.prepare('DELETE FROM borrow_records WHERE id = ?').bind(id).run();
              return jsonResponse({ success: true });
            } catch (err: any) {
              return errorResponse(err.message || 'Failed to delete borrow record', 500);
            }
          }
        }

        // --- BUDGET: SUMMARY ---
        if (url.pathname === '/api/budget/summary') {
          const m = url.searchParams.get('month');
          if (!m) return errorResponse('Month parameter required', 400);
          const row = await db.prepare('SELECT * FROM monthly_budget_summaries WHERE month = ?').bind(m).first();
          return jsonResponse(row || null);
        }

        if (url.pathname.startsWith('/api/budget/summary/')) {
          const m = url.pathname.replace('/api/budget/summary/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              INSERT INTO monthly_budget_summaries (month, starting_debt, previous_remaining, dept_payment, borrow_amount, reg_savings, ext_savings, notes, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(month) DO UPDATE SET
                starting_debt = excluded.starting_debt,
                previous_remaining = excluded.previous_remaining,
                dept_payment = excluded.dept_payment,
                borrow_amount = excluded.borrow_amount,
                reg_savings = excluded.reg_savings,
                ext_savings = excluded.ext_savings,
                notes = excluded.notes,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              m,
              b.starting_debt || 0,
              b.previous_remaining || 0,
              b.dept_payment || 0,
              b.borrow_amount || 0,
              b.reg_savings || 0,
              b.ext_savings || 0,
              b.notes || ''
            ).run();
            return jsonResponse({ success: true });
          }
        }

        // --- BUDGET: GOALS ---
        if (url.pathname === '/api/budget/goals') {
          if (method === 'GET') {
            const { results } = await db.prepare('SELECT * FROM financial_goals ORDER BY target_amount DESC').all();
            const formatted = (results || []).map((g: any) => ({
              ...g,
              spent_amount: Number(g.spent_amount) || 0,
              completed_date: g.completed_date || null,
              linked_expense_id: g.linked_expense_id || null,
              remaining: Math.max(0, (g.target_amount || 0) - (g.saved_amount || 0)),
              progress_percent: g.status === 'COMPLETED'
                ? 100
                : g.target_amount > 0 ? Math.min(100, Math.round(((g.saved_amount || 0) / g.target_amount) * 100)) : 0,
            }));
            return jsonResponse(formatted);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare(`
              INSERT INTO financial_goals (id, name, target_amount, savings_percent, saved_amount, target_date, status, spent_amount, completed_date, linked_expense_id, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              id,
              b.name,
              b.target_amount,
              b.savings_percent || 0,
              b.saved_amount || 0,
              b.target_date || null,
              b.status || 'IN_PROGRESS',
              b.spent_amount || 0,
              b.completed_date || null,
              b.linked_expense_id || null,
              b.notes || ''
            ).run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/budget/goals/')) {
          const subPath = url.pathname.replace('/api/budget/goals/', '');
          
          if (subPath.endsWith('/complete') && method === 'POST') {
            const goalId = subPath.replace('/complete', '');
            const b = (await request.json()) as any;
            const goal: any = await db.prepare('SELECT * FROM financial_goals WHERE id = ?').bind(goalId).first();
            if (!goal) return jsonResponse({ error: 'Financial goal not found' }, 404);

            const finalSpent = Number(b.spent_amount) || goal.target_amount;
            const finalDate = b.completed_date || new Date().toISOString().substring(0, 10);
            const finalMonth = finalDate.substring(0, 7);
            let createdExpenseId: string | null = null;

            if (b.log_expense) {
              createdExpenseId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
              const expMethod = b.payment_method || 'UPI';
              const desc = `Purchased: ${goal.name}`;

              await db.prepare(`
                INSERT INTO expenses (id, date, month, category, tag, description, amount, payment_method, notes)
                VALUES (?, ?, ?, 'ext', 'Asset Purchase', ?, ?, ?, ?)
              `).bind(
                createdExpenseId,
                finalDate,
                finalMonth,
                desc,
                finalSpent,
                expMethod,
                b.notes || `Asset acquired / Financial Goal completed: ${goal.name}`
              ).run();

              if (expMethod === 'Credit Card') {
                try {
                  await db.prepare(`
                    INSERT INTO borrow_records (id, date, month, type, person, reason, amount, status)
                    VALUES (?, ?, ?, 'BORROW', 'Credit Card', ?, ?, 'PENDING')
                  `).bind(`borrow-cc-${createdExpenseId}`, finalDate, finalMonth, `Credit Card: ${desc}`, finalSpent).run();
                } catch {}
              }
            }

            await db.prepare(`
              UPDATE financial_goals SET
                status = 'COMPLETED',
                spent_amount = ?,
                completed_date = ?,
                linked_expense_id = ?,
                notes = COALESCE(?, notes)
              WHERE id = ?
            `).bind(
              finalSpent,
              finalDate,
              createdExpenseId || goal.linked_expense_id || null,
              b.notes || goal.notes || null,
              goalId
            ).run();

            return jsonResponse({
              success: true,
              status: 'COMPLETED',
              spent_amount: finalSpent,
              completed_date: finalDate,
              linked_expense_id: createdExpenseId,
            });
          }

          if (subPath.endsWith('/reopen') && method === 'POST') {
            const goalId = subPath.replace('/reopen', '');
            const b = (await request.json()) as any;
            const goal: any = await db.prepare('SELECT * FROM financial_goals WHERE id = ?').bind(goalId).first();
            if (!goal) return jsonResponse({ error: 'Financial goal not found' }, 404);

            if (b.delete_linked_expense && goal.linked_expense_id) {
              const expId = goal.linked_expense_id;
              await db.prepare('DELETE FROM expenses WHERE id = ?').bind(expId).run();
              await db.prepare('DELETE FROM borrow_records WHERE id = ?').bind(`borrow-cc-${expId}`).run();
            }

            await db.prepare(`
              UPDATE financial_goals SET
                status = 'IN_PROGRESS',
                spent_amount = 0,
                completed_date = NULL,
                linked_expense_id = NULL
              WHERE id = ?
            `).bind(goalId).run();

            return jsonResponse({ success: true, status: 'IN_PROGRESS' });
          }

          const id = subPath;
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE financial_goals SET
                name = ?,
                target_amount = ?,
                savings_percent = ?,
                saved_amount = ?,
                target_date = ?,
                status = ?,
                spent_amount = ?,
                completed_date = ?,
                linked_expense_id = ?,
                notes = ?
              WHERE id = ?
            `).bind(
              b.name,
              b.target_amount,
              b.savings_percent || 0,
              b.saved_amount || 0,
              b.target_date || null,
              b.status || 'IN_PROGRESS',
              b.spent_amount || 0,
              b.completed_date || null,
              b.linked_expense_id || null,
              b.notes || '',
              id
            ).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM financial_goals WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- BUDGET: ALLOCATIONS ---
        if (url.pathname === '/api/budget/allocations') {
          if (method === 'GET') {
            const { results } = await db.prepare('SELECT * FROM budget_allocation_rules ORDER BY display_order ASC').all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            await db.prepare('DELETE FROM budget_allocation_rules').run();
            if (Array.isArray(b.rules)) {
              const stmts = b.rules.map((r: any, idx: number) =>
                db.prepare('INSERT INTO budget_allocation_rules (id, category, percentage, display_order) VALUES (?, ?, ?, ?)').bind(r.id || crypto.randomUUID(), r.category, r.percentage, idx)
              );
              await db.batch(stmts);
            }
            return jsonResponse({ success: true });
          }
        }

        // --- BUDGET: CURRENT ACCOUNT ---
        if (url.pathname === '/api/budget/current-account') {
          if (method === 'GET') {
            const { results: invoices } = await db.prepare(`
              SELECT i.*, o.name as org_name
              FROM invoices i
              LEFT JOIN organizations o ON i.organization_id = o.id
              ORDER BY i.invoice_date DESC, i.created_at DESC
            `).all();

            let totalRevenuePaid = 0;
            let unpaidReceivables = 0;

            const paidInvoices: any[] = [];
            const unpaidInvoices: any[] = [];

            for (const inv of ((invoices as any[]) || [])) {
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

            const { results: withdrawals } = await db.prepare(`
              SELECT * FROM current_account_withdrawals
              ORDER BY date DESC, created_at DESC
            `).all();

            const totalWithdrawn = ((withdrawals as any[]) || []).reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0);
            const availableBalance = Math.max(0, totalRevenuePaid - totalWithdrawn);

            return jsonResponse({
              total_revenue_paid: totalRevenuePaid,
              total_withdrawn: totalWithdrawn,
              available_balance: availableBalance,
              unpaid_receivables: unpaidReceivables,
              paid_invoices: paidInvoices,
              unpaid_invoices: unpaidInvoices,
              withdrawals: withdrawals || [],
              totalIncome: totalRevenuePaid,
              totalWithdrawals: totalWithdrawn,
              currentBalance: availableBalance,
            });
          }
        }

        if (url.pathname === '/api/budget/current-account/withdraw' && method === 'POST') {
          const b = (await request.json()) as any;
          const numAmount = Number(b.amount);
          if (!numAmount || numAmount <= 0) {
            return jsonResponse({ error: 'Withdrawal amount must be greater than ₹0.' }, 400);
          }

          const withdrawDate = b.date || new Date().toISOString().substring(0, 10);
          const withdrawMonth = withdrawDate.substring(0, 7);

          // Calculate available balance
          const { results: invoices } = await db.prepare('SELECT status, amount_paid, total FROM invoices').all();
          let totalRevenuePaid = 0;
          for (const inv of ((invoices as any[]) || [])) {
            const isStatusPaid = (inv.status || '').toUpperCase() === 'PAID';
            const amtPaid = Number(inv.amount_paid) || 0;
            const totalAmt = Number(inv.total) || 0;
            const effectivePaid = isStatusPaid ? (amtPaid > 0 ? amtPaid : totalAmt) : amtPaid;
            totalRevenuePaid += effectivePaid;
          }

          const withdrRow = await db.prepare('SELECT SUM(amount) as sum FROM current_account_withdrawals').first();
          const currentTotalWithdrawn = Number((withdrRow as any)?.sum) || 0;
          const availableBalance = Math.max(0, totalRevenuePaid - currentTotalWithdrawn);

          if (numAmount > availableBalance) {
            return jsonResponse({
              error: `Cannot withdraw ₹${numAmount.toLocaleString('en-IN')}. Current Account available balance is ₹${availableBalance.toLocaleString('en-IN')}. Unpaid invoices cannot be withdrawn.`,
            }, 400);
          }

          const withdrawalId = b.id || `with-${Date.now()}`;
          const incomeId = `inc-with-${Date.now()}`;
          const incomeSource = b.source?.trim() || 'Current Account (Owner Draw)';
          const withdrawalNotes = b.notes?.trim() || 'Owner draw from Current Account to freelance income';

          await db.batch([
            db.prepare(`
              INSERT INTO current_account_withdrawals (id, date, month, amount, notes, income_entry_id)
              VALUES (?, ?, ?, ?, ?, ?)
            `).bind(withdrawalId, withdrawDate, withdrawMonth, numAmount, withdrawalNotes, incomeId),
            db.prepare(`
              INSERT INTO income_entries (id, date, month, category, source, amount, notes)
              VALUES (?, ?, ?, 'fl', ?, ?, ?)
            `).bind(incomeId, withdrawDate, withdrawMonth, incomeSource, numAmount, withdrawalNotes),
          ]);

          return jsonResponse({
            success: true,
            withdrawalId,
            incomeId,
            amount: numAmount,
            available_balance: availableBalance - numAmount,
          }, 201);
        }

        if (url.pathname.startsWith('/api/budget/current-account/withdraw/') && method === 'DELETE') {
          const id = url.pathname.replace('/api/budget/current-account/withdraw/', '');
          const row = await db.prepare('SELECT * FROM current_account_withdrawals WHERE id = ?').bind(id).first();
          if (!row) {
            return jsonResponse({ error: 'Withdrawal record not found.' }, 404);
          }
          const batch = [
            db.prepare('DELETE FROM current_account_withdrawals WHERE id = ?').bind(id),
          ];
          if ((row as any).income_entry_id) {
            batch.push(
              db.prepare('DELETE FROM income_entries WHERE id = ?').bind((row as any).income_entry_id)
            );
          }
          await db.batch(batch);
          return jsonResponse({ success: true });
        }

        // --- TAX REMINDERS & SUMMARY ---
        if (url.pathname === '/api/tax/reminders') {
          if (method === 'GET') {
            const { results } = await db.prepare('SELECT * FROM tax_reminders ORDER BY due_date ASC').all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare(`
              INSERT INTO tax_reminders (id, title, description, due_date, category, is_recurring, frequency, is_completed, notify_before_days, priority, penalty_note, action_url)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, b.title, b.description || '', b.due_date, b.category, b.is_recurring ? 1 : 0, b.frequency || 'ONCE', b.is_completed ? 1 : 0, b.notify_before_days || 7, b.priority || 'HIGH', b.penalty_note || '', b.action_url || '').run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/tax/reminders/')) {
          const id = url.pathname.replace('/api/tax/reminders/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE tax_reminders SET
                title = ?, description = ?, due_date = ?, category = ?, is_recurring = ?,
                frequency = ?, is_completed = ?, completed_at = ?, notify_before_days = ?,
                priority = ?, penalty_note = ?, action_url = ?
              WHERE id = ?
            `).bind(
              b.title,
              b.description || '',
              b.due_date,
              b.category,
              b.is_recurring ? 1 : 0,
              b.frequency || 'ONCE',
              b.is_completed ? 1 : 0,
              b.is_completed ? (b.completed_at || new Date().toISOString()) : null,
              b.notify_before_days || 7,
              b.priority || 'HIGH',
              b.penalty_note || '',
              b.action_url || '',
              id
            ).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM tax_reminders WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- TAX SUMMARY ---
        if (url.pathname === '/api/tax/summary' && method === 'GET') {
          // 1. Turnover from Invoices & Income
          const invStats: any = await db.prepare(`
            SELECT 
              COALESCE(SUM(total), 0) as gross_turnover,
              COALESCE(SUM(amount_paid), 0) as total_collections,
              COUNT(*) as invoices_count
            FROM invoices 
            WHERE status != 'cancelled'
          `).first();

          const incStats: any = await db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total_income
            FROM income_entries
            WHERE category IN ('fl', 'sal', 'ext')
          `).first();

          const grossTurnover = Math.max(invStats?.gross_turnover || 0, incStats?.total_income || 0);
          const totalCollections = invStats?.total_collections || 0;
          const totalInvoicesCount = invStats?.invoices_count || 0;

          // 2. Expenses breakdown
          const { results: expenses } = await db.prepare('SELECT * FROM expenses').all();

          let businessDeductibleExpenses = 0;
          let personalDrawings = 0;
          let mixedExpensesTotal = 0;
          let mixedExpensesDeductible = 0;
          let capitalAssetsTotal = 0;
          let capitalIntroduced = 0;
          let bankChargesDeductible = 0;
          let totalCashWithdrawals = 0;

          const violations: any[] = [];

          (expenses || []).forEach((e: any) => {
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
              if (['bank', 'sbi', 'mab', 'charge', 'fee', 'amc', 'sms'].some((k) => desc.includes(k) || tag.includes(k))) {
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
              personalDrawings += (amt - deductiblePart);
            } else if (e.tax_classification === 'CAPITAL_ASSET') {
              capitalAssetsTotal += amt;
            } else {
              businessDeductibleExpenses += amt;
            }
          });

          // 40% depreciation allowed on IT equipment / computers under Section 32
          const capitalAssetDepreciation = capitalAssetsTotal * 0.40;
          const totalDeductionsAllowed = Math.round(businessDeductibleExpenses + mixedExpensesDeductible + capitalAssetDepreciation);
          const netActualProfit = Math.max(0, grossTurnover - totalDeductionsAllowed);
          const profitMarginActual = grossTurnover > 0 ? Math.round((netActualProfit / grossTurnover) * 100) : 0;

          // Presumptive Profit Calculations
          const presumptive44ADAProfit = Math.round(grossTurnover * 0.50);
          const presumptive44ADProfit = Math.round(grossTurnover * 0.06);

          // SFT Cash Limits
          const cashIncomeRow: any = await db.prepare("SELECT COALESCE(SUM(amount), 0) as cash_in FROM income_entries WHERE notes LIKE '%cash%' OR source LIKE '%cash%'").first();
          const totalCashDeposits = cashIncomeRow?.cash_in || 0;
          const sftLimitCurrentAccount = 5000000;
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

          let score = 100;
          violations.forEach((v) => {
            if (v.severity === 'DANGER') score -= 15;
            else score -= 8;
          });
          const complianceScore = Math.max(25, Math.min(100, score));

          const taxableBase = presumptive44ADAProfit > 0 ? presumptive44ADAProfit : netActualProfit;
          const taxLiabilityNewRegime = calculateNewRegimeTax(taxableBase);
          const taxLiabilityOldRegime = calculateOldRegimeTax(taxableBase);

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

          return jsonResponse({
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
        }

        // Single expense classify endpoint
        if (url.pathname.startsWith('/api/tax/expenses/') && url.pathname.endsWith('/classify') && method === 'POST') {
          const id = url.pathname.replace('/api/tax/expenses/', '').replace('/classify', '');
          const b = (await request.json()) as any;
          await db.prepare(`
            UPDATE expenses SET
              tax_classification = COALESCE(?, tax_classification),
              business_percentage = COALESCE(?, business_percentage),
              gst_rate = COALESCE(?, gst_rate),
              gst_itc_eligible = COALESCE(?, gst_itc_eligible),
              has_invoice_voucher = COALESCE(?, has_invoice_voucher),
              voucher_ref = COALESCE(?, voucher_ref)
            WHERE id = ?
          `).bind(
            b.tax_classification,
            b.business_percentage !== undefined ? Number(b.business_percentage) : null,
            b.gst_rate !== undefined ? Number(b.gst_rate) : null,
            b.gst_itc_eligible !== undefined ? (b.gst_itc_eligible ? 1 : 0) : null,
            b.has_invoice_voucher !== undefined ? (b.has_invoice_voucher ? 1 : 0) : null,
            b.voucher_ref !== undefined ? b.voucher_ref : null,
            id
          ).run();
          return jsonResponse({ success: true });
        }

        // Bulk auto-classify expenses based on intelligent heuristics
        if (url.pathname === '/api/tax/expenses/auto-classify' && method === 'POST') {
          const { results: expenses } = await db.prepare('SELECT id, tag, description, payment_method, amount FROM expenses').all();
          let updatedCount = 0;
          const stmts: D1PreparedStatement[] = [];

          (expenses || []).forEach((e: any) => {
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

            stmts.push(
              db.prepare('UPDATE expenses SET tax_classification = ?, business_percentage = ?, gst_itc_eligible = ? WHERE id = ?')
                .bind(classification, busPct, itcEligible, e.id)
            );
            updatedCount++;
          });

          if (stmts.length > 0) {
            await db.batch(stmts);
          }
          return jsonResponse({ success: true, count: updatedCount });
        }

        // Quick-Log SBI Bank Charges (100% Tax Deductible u/s 37(1))
        if (url.pathname === '/api/tax/sbi/quick-bank-charge' && method === 'POST') {
          const b = (await request.json()) as any;
          const { chargeType, customAmount, notes } = b;

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

          await db.prepare(`
            INSERT INTO expenses (
              id, date, month, category, tag, description, amount, payment_method,
              tax_classification, business_percentage, gst_rate, gst_itc_eligible,
              has_invoice_voucher, voucher_ref, notes
            ) VALUES (?, ?, ?, 'reg', 'Bank Charges', ?, ?, 'SBI Current Account', 'BUSINESS_DEDUCTIBLE', 100, 18, 0, 1, 'SBI-CHAKULIA-DEBIT', ?)
          `).bind(id, today, month, desc, amt, notes || 'Auto-logged SBI statutory bank charges - 100% deductible under Section 37(1)').run();

          return jsonResponse({ success: true, id, description: desc, amount: amt });
        }

        // Batch Import SBI Statement Items (Expenses & Capital Introduced)
        if (url.pathname === '/api/tax/sbi/batch-import' && method === 'POST') {
          const b = (await request.json()) as any;
          const { transactions } = b;
          if (!Array.isArray(transactions) || transactions.length === 0) {
            return errorResponse('transactions array is required', 400);
          }

          let importedExpenses = 0;
          let importedIncomes = 0;
          const stmts: D1PreparedStatement[] = [];

          for (const item of transactions) {
            const date = item.date || new Date().toISOString().slice(0, 10);
            const month = date.slice(0, 7);
            const amt = Number(item.amount) || 0;
            if (amt <= 0) continue;

            const isCredit = (item.type || '').toUpperCase() === 'CREDIT' || (item.cr_dr || '').toUpperCase() === 'CR';
            const desc = (item.description || item.narration || 'SBI Bank Transaction').trim();
            const id = `sbi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

            if (isCredit) {
              stmts.push(
                db.prepare(`
                  INSERT INTO income_entries (id, date, month, category, source, amount, notes)
                  VALUES (?, ?, ?, 'ext', 'SBI Bank Transfer', ?, ?)
                `).bind(id, date, month, amt, `Auto-imported SBI credit: ${desc}`)
              );
              importedIncomes++;
            } else {
              stmts.push(
                db.prepare(`
                  INSERT INTO expenses (
                    id, date, month, category, tag, description, amount, payment_method,
                    tax_classification, business_percentage, gst_rate, gst_itc_eligible,
                    has_invoice_voucher, voucher_ref, notes
                  ) VALUES (?, ?, ?, 'reg', 'Bank Statement', ?, ?, 'SBI Current Account', 'BUSINESS_DEDUCTIBLE', 100, 0, 0, 1, 'SBI-IMPORT', ?)
                `).bind(id, date, month, desc, amt, `Auto-imported SBI debit: ${desc}`)
              );
              importedExpenses++;
            }
          }

          if (stmts.length > 0) {
            await db.batch(stmts);
          }
          return jsonResponse({ success: true, importedExpenses, importedIncomes });
        }

        // --- SBI PPS CHEQUES ---
        if (url.pathname === '/api/tax/sbi/pps-cheques') {
          if (method === 'GET') {
            const { results } = await db.prepare('SELECT * FROM sbi_pps_cheques ORDER BY issue_date DESC').all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare('INSERT INTO sbi_pps_cheques (id, cheque_number, payee_name, amount, issue_date, account_number, pps_status, pps_reference, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind(id, b.cheque_number, b.payee_name, b.amount, b.issue_date, b.account_number || '45661497562', b.pps_status || 'PENDING_REGISTRATION', b.pps_reference || '', b.notes || '').run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/tax/sbi/pps-cheques/')) {
          const id = url.pathname.replace('/api/tax/sbi/pps-cheques/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare('UPDATE sbi_pps_cheques SET cheque_number = ?, payee_name = ?, amount = ?, issue_date = ?, pps_status = ?, pps_reference = ?, notes = ? WHERE id = ?')
              .bind(b.cheque_number, b.payee_name, b.amount, b.issue_date, b.pps_status, b.pps_reference || '', b.notes || '', id).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM sbi_pps_cheques WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- RECURRING SCHEDULES ---
        if (url.pathname === '/api/recurring') {
          if (method === 'GET') {
            const { results } = await db.prepare('SELECT * FROM recurring_schedules ORDER BY created_at DESC').all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare(`
              INSERT INTO recurring_schedules (id, name, organization_id, schedule_type, doc_type, monthly_day, total_amount, milestones_json, items_json, terms, notes, status, last_run_date, next_run_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              id,
              b.name,
              b.organization_id,
              b.schedule_type,
              b.doc_type || 'BILL OF SUPPLY',
              b.monthly_day || 1,
              b.total_amount || 0,
              JSON.stringify(b.milestones || []),
              JSON.stringify(b.items || []),
              b.terms || 'Due on Receipt',
              b.notes || '',
              b.status || 'ACTIVE',
              b.last_run_date || null,
              b.next_run_date || null
            ).run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/recurring/')) {
          const id = url.pathname.replace('/api/recurring/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE recurring_schedules SET
                name = ?, organization_id = ?, schedule_type = ?, doc_type = ?, monthly_day = ?,
                total_amount = ?, milestones_json = ?, items_json = ?, terms = ?, notes = ?,
                status = ?, last_run_date = ?, next_run_date = ?
              WHERE id = ?
            `).bind(
              b.name,
              b.organization_id,
              b.schedule_type,
              b.doc_type,
              b.monthly_day,
              b.total_amount,
              JSON.stringify(b.milestones || []),
              JSON.stringify(b.items || []),
              b.terms,
              b.notes || '',
              b.status,
              b.last_run_date,
              b.next_run_date,
              id
            ).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM recurring_schedules WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- BACKUP & RESTORE ---
        if (url.pathname === '/api/backup' && method === 'GET') {
          const [orgs, invs, sets, cats, exps, incs, bors, sums, goals, rules, rems, pps, withs, recs] = await Promise.all([
            db.prepare('SELECT * FROM organizations').all(),
            db.prepare('SELECT * FROM invoices').all(),
            db.prepare('SELECT * FROM settings').all(),
            db.prepare('SELECT * FROM catalog_items').all(),
            db.prepare('SELECT * FROM expenses').all(),
            db.prepare('SELECT * FROM income_entries').all(),
            db.prepare('SELECT * FROM borrow_records').all(),
            db.prepare('SELECT * FROM monthly_budget_summaries').all(),
            db.prepare('SELECT * FROM financial_goals').all(),
            db.prepare('SELECT * FROM budget_allocation_rules').all(),
            db.prepare('SELECT * FROM tax_reminders').all(),
            db.prepare('SELECT * FROM sbi_pps_cheques').all(),
            db.prepare('SELECT * FROM current_account_withdrawals').all(),
            db.prepare('SELECT * FROM recurring_schedules').all(),
          ]);

          return jsonResponse({
            version: '2.0',
            timestamp: new Date().toISOString(),
            organizations: orgs.results,
            invoices: invs.results,
            settings: sets.results,
            catalog: cats.results,
            expenses: exps.results,
            income: incs.results,
            borrow: bors.results,
            summaries: sums.results,
            goals: goals.results,
            allocationRules: rules.results,
            taxReminders: rems.results,
            sbiPpsCheques: pps.results,
            withdrawals: withs.results,
            recurring: recs.results,
          });
        }

        if (url.pathname === '/api/backup/restore' && method === 'POST') {
          const data = (await request.json()) as any;
          if (!data || (!data.organizations && !data.invoices && !data.expenses)) {
            return errorResponse('Invalid backup payload format', 400);
          }

          const stmts: D1PreparedStatement[] = [];
          if (Array.isArray(data.invoices)) {
            stmts.push(db.prepare('DELETE FROM invoices'));
            for (const i of data.invoices) {
              stmts.push(
                db.prepare(`
                  INSERT INTO invoices (id, invoice_number, doc_type, organization_id, invoice_date, terms, due_date, items_json, sub_total, total, amount_paid, balance_due, notes, payment_options, status, copy_type, hide_qty, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(i.id, i.invoice_number, i.doc_type, i.organization_id, i.invoice_date, i.terms, i.due_date, i.items_json, i.sub_total, i.total, i.amount_paid, i.balance_due, i.notes, i.payment_options, i.status, i.copy_type, i.hide_qty, i.created_at)
              );
            }
          }
          if (Array.isArray(data.organizations)) {
            stmts.push(db.prepare('DELETE FROM organizations'));
            for (const o of data.organizations) {
              stmts.push(
                db.prepare('INSERT INTO organizations (id, name, address, city, state, pincode, country, phone, email, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                  .bind(o.id, o.name, o.address, o.city, o.state, o.pincode, o.country, o.phone, o.email, o.notes, o.created_at)
              );
            }
          }
          if (Array.isArray(data.expenses)) {
            stmts.push(db.prepare('DELETE FROM expenses'));
            for (const e of data.expenses) {
              stmts.push(
                db.prepare('INSERT INTO expenses (id, date, month, category, tag, description, amount, payment_method, notes, tax_classification, business_percentage, gst_rate, gst_itc_eligible, has_invoice_voucher, voucher_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                  .bind(e.id, e.date, e.month, e.category, e.tag, e.description, e.amount, e.payment_method, e.notes, e.tax_classification, e.business_percentage, e.gst_rate, e.gst_itc_eligible, e.has_invoice_voucher, e.voucher_ref, e.created_at)
              );
            }
          }

          if (stmts.length > 0) {
            await db.batch(stmts);
          }
          return jsonResponse({ success: true, message: 'Data restored successfully' });
        }

        return errorResponse(`Endpoint ${method} ${url.pathname} not found in D1 API`, 404);
      } catch (err: any) {
        return errorResponse(err.message || 'Internal server error in Cloudflare D1 handler', 500);
      }
    }

    // ----------------------------------------------------
    // 3. DYNAMIC HTML INJECTION & STATIC ASSETS
    // ----------------------------------------------------
    const isHtmlRequest =
      request.headers.get('accept')?.includes('text/html') ||
      url.pathname === '/' ||
      url.pathname === '/index.html' ||
      !url.pathname.includes('.');

    if (isHtmlRequest) {
      // Fetch index.html from static assets
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.headers.get('content-type')?.includes('text/html')) {
        let html = await assetResponse.text();

        // Safely serialize runtime variables (only non-sensitive public client keys)
        const runtimeEnv = {
          VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY || '',
          VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || '',
          VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || '',
          VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET || '',
          VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID || '',
          VITE_FIREBASE_MEASUREMENT_ID: env.VITE_FIREBASE_MEASUREMENT_ID || '',
        };

        const envScript = `<script>window.__ENV__ = ${JSON.stringify(runtimeEnv)};</script>`;
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>${envScript}`);
        } else {
          html = envScript + html;
        }

        return new Response(html, {
          status: assetResponse.status,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
          },
        });
      }
      return assetResponse;
    }

    // For all other static assets (JS, CSS, images, fonts)
    return env.ASSETS.fetch(request);
  },
};
