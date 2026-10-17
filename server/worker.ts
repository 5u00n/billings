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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ----------------------------------------------------
    // 1. PUBLIC RUNTIME CONFIG & HEALTH
    // ----------------------------------------------------
    if (url.pathname === '/api/config') {
      return jsonResponse({
        VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY || '',
        VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || '',
        VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || '',
        VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET || '',
        VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID || '',
        VITE_ALLOWED_EMAILS: env.VITE_ALLOWED_EMAILS || '',
      });
    }

    if (url.pathname === '/api/health') {
      return jsonResponse({
        status: 'ok',
        platform: 'cloudflare-worker',
        d1_bound: Boolean(env.DB),
        timestamp: new Date().toISOString(),
      });
    }

    // ----------------------------------------------------
    // 2. D1 SQLITE API ROUTER
    // ----------------------------------------------------
    if (url.pathname.startsWith('/api/')) {
      // If external backend URL is configured, proxy request
      if (env.BACKEND_URL && !env.DB) {
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

      if (!env.DB) {
        return errorResponse(
          'Cloudflare D1 database binding (DB) is missing. Please check wrangler.jsonc or run npx wrangler d1 create billings-db',
          503
        );
      }

      const db = env.DB;
      const method = request.method.toUpperCase();

      try {
        // --- INVOICES ---
        if (url.pathname === '/api/invoices/next-number' && method === 'GET') {
          const type = url.searchParams.get('type') || 'BILL OF SUPPLY';
          const settingsRow = await db.prepare('SELECT value_json FROM settings WHERE key = ?').bind('numbering').first<any>();
          const numbering = settingsRow ? JSON.parse(settingsRow.value_json) : { prefix: 'INV', nextNumber: 1, padLength: 3 };

          const prefix = type === 'TAX INVOICE' ? 'TI' : numbering.prefix || 'INV';
          const maxRow = await db
            .prepare(
              `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY LENGTH(invoice_number) DESC, invoice_number DESC LIMIT 1`
            )
            .bind(`${prefix}-%`)
            .first<any>();

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
          const { results } = await stmt.all<any>();
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
            const row = await db.prepare('SELECT * FROM invoices WHERE id = ? OR invoice_number = ?').bind(id, id).first<any>();
            if (!row) return errorResponse('Invoice not found', 404);
            const org = row.organization_id ? await db.prepare('SELECT * FROM organizations WHERE id = ?').bind(row.organization_id).first<any>() : null;
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
            const { results } = await db.prepare('SELECT * FROM settings').all<any>();
            const settingsObj: Record<string, any> = {};
            for (const r of results) {
              try {
                settingsObj[r.key] = JSON.parse(r.value_json);
              } catch {
                settingsObj[r.key] = r.value_json;
              }
            }
            return jsonResponse(settingsObj);
          }
          if (method === 'POST') {
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

        if (url.pathname.startsWith('/api/catalog/') && method === 'DELETE') {
          const id = url.pathname.replace('/api/catalog/', '');
          await db.prepare('DELETE FROM catalog_items WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }

        // --- BUDGET: MONTHS ---
        if (url.pathname === '/api/budget/months' && method === 'GET') {
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
          const { results } = await db.prepare(q).all<any>();
          const months = results.map((r: any) => r.month).filter(Boolean);
          return jsonResponse(months);
        }

        // --- BUDGET: EXPENSES ---
        if (url.pathname === '/api/budget/expenses') {
          if (method === 'GET') {
            const m = url.searchParams.get('month');
            const stmt = m
              ? db.prepare('SELECT * FROM expenses WHERE month = ? ORDER BY date DESC').bind(m)
              : db.prepare('SELECT * FROM expenses ORDER BY date DESC');
            const { results } = await stmt.all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare(`
              INSERT INTO expenses (id, date, month, category, tag, description, amount, payment_method, notes, tax_classification, business_percentage, gst_rate, gst_itc_eligible, has_invoice_voucher, voucher_ref)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              id,
              b.date,
              b.month || b.date.slice(0, 7),
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
              b.voucher_ref || ''
            ).run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/budget/expenses/')) {
          const id = url.pathname.replace('/api/budget/expenses/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE expenses SET
                date = ?, month = ?, category = ?, tag = ?, description = ?, amount = ?,
                payment_method = ?, notes = ?, tax_classification = ?, business_percentage = ?,
                gst_rate = ?, gst_itc_eligible = ?, has_invoice_voucher = ?, voucher_ref = ?
              WHERE id = ?
            `).bind(
              b.date,
              b.month || b.date.slice(0, 7),
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
              id
            ).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- BUDGET: INCOME ---
        if (url.pathname === '/api/budget/income') {
          if (method === 'GET') {
            const m = url.searchParams.get('month');
            const stmt = m
              ? db.prepare('SELECT * FROM income_entries WHERE month = ? ORDER BY date DESC').bind(m)
              : db.prepare('SELECT * FROM income_entries ORDER BY date DESC');
            const { results } = await stmt.all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare(`
              INSERT INTO income_entries (id, date, month, category, source, amount, invoice_id, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, b.date, b.month || b.date.slice(0, 7), b.category, b.source, b.amount, b.invoice_id || null, b.notes || '').run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/budget/income/')) {
          const id = url.pathname.replace('/api/budget/income/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE income_entries SET date = ?, month = ?, category = ?, source = ?, amount = ?, invoice_id = ?, notes = ?
              WHERE id = ?
            `).bind(b.date, b.month || b.date.slice(0, 7), b.category, b.source, b.amount, b.invoice_id || null, b.notes || '', id).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM income_entries WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
          }
        }

        // --- BUDGET: BORROW ---
        if (url.pathname === '/api/budget/borrow') {
          if (method === 'GET') {
            const m = url.searchParams.get('month');
            const stmt = m
              ? db.prepare('SELECT * FROM borrow_records WHERE month = ? ORDER BY date DESC').bind(m)
              : db.prepare('SELECT * FROM borrow_records ORDER BY date DESC');
            const { results } = await stmt.all();
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare(`
              INSERT INTO borrow_records (id, date, month, type, person, reason, amount, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, b.date, b.month || b.date.slice(0, 7), b.type, b.person, b.reason || '', b.amount, b.status || 'PENDING').run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/budget/borrow/')) {
          const id = url.pathname.replace('/api/budget/borrow/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE borrow_records SET date = ?, month = ?, type = ?, person = ?, reason = ?, amount = ?, status = ?
              WHERE id = ?
            `).bind(b.date, b.month || b.date.slice(0, 7), b.type, b.person, b.reason || '', b.amount, b.status, id).run();
            return jsonResponse({ success: true });
          }
          if (method === 'DELETE') {
            await db.prepare('DELETE FROM borrow_records WHERE id = ?').bind(id).run();
            return jsonResponse({ success: true });
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
            return jsonResponse(results);
          }
          if (method === 'POST') {
            const b = (await request.json()) as any;
            const id = b.id || crypto.randomUUID();
            await db.prepare(`
              INSERT INTO financial_goals (id, name, target_amount, savings_percent, saved_amount, target_date, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, b.name, b.target_amount, b.savings_percent || 0, b.saved_amount || 0, b.target_date || null, b.status || 'IN_PROGRESS', b.notes || '').run();
            return jsonResponse({ id, success: true }, 201);
          }
        }

        if (url.pathname.startsWith('/api/budget/goals/')) {
          const id = url.pathname.replace('/api/budget/goals/', '');
          if (method === 'PUT') {
            const b = (await request.json()) as any;
            await db.prepare(`
              UPDATE financial_goals SET name = ?, target_amount = ?, savings_percent = ?, saved_amount = ?, target_date = ?, status = ?, notes = ?
              WHERE id = ?
            `).bind(b.name, b.target_amount, b.savings_percent || 0, b.saved_amount || 0, b.target_date || null, b.status, b.notes || '', id).run();
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
            const inc = await db.prepare('SELECT SUM(amount) as total FROM income_entries').first<any>();
            const withdr = await db.prepare('SELECT SUM(amount) as total FROM current_account_withdrawals').first<any>();
            const list = await db.prepare('SELECT * FROM current_account_withdrawals ORDER BY date DESC').all<any>();
            const totalIncome = inc?.total || 0;
            const totalWithdrawals = withdr?.total || 0;
            return jsonResponse({
              totalIncome,
              totalWithdrawals,
              currentBalance: totalIncome - totalWithdrawals,
              withdrawals: list.results,
            });
          }
        }

        if (url.pathname === '/api/budget/current-account/withdraw' && method === 'POST') {
          const b = (await request.json()) as any;
          const id = b.id || crypto.randomUUID();
          await db.prepare('INSERT INTO current_account_withdrawals (id, date, month, amount, notes, income_entry_id) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, b.date, b.month || b.date.slice(0, 7), b.amount, b.notes || '', b.income_entry_id || null).run();
          return jsonResponse({ id, success: true }, 201);
        }

        if (url.pathname.startsWith('/api/budget/current-account/withdraw/') && method === 'DELETE') {
          const id = url.pathname.replace('/api/budget/current-account/withdraw/', '');
          await db.prepare('DELETE FROM current_account_withdrawals WHERE id = ?').bind(id).run();
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
            db.prepare('SELECT * FROM organizations').all<any>(),
            db.prepare('SELECT * FROM invoices').all<any>(),
            db.prepare('SELECT * FROM settings').all<any>(),
            db.prepare('SELECT * FROM catalog_items').all<any>(),
            db.prepare('SELECT * FROM expenses').all<any>(),
            db.prepare('SELECT * FROM income_entries').all<any>(),
            db.prepare('SELECT * FROM borrow_records').all<any>(),
            db.prepare('SELECT * FROM monthly_budget_summaries').all<any>(),
            db.prepare('SELECT * FROM financial_goals').all<any>(),
            db.prepare('SELECT * FROM budget_allocation_rules').all<any>(),
            db.prepare('SELECT * FROM tax_reminders').all<any>(),
            db.prepare('SELECT * FROM sbi_pps_cheques').all<any>(),
            db.prepare('SELECT * FROM current_account_withdrawals').all<any>(),
            db.prepare('SELECT * FROM recurring_schedules').all<any>(),
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

        // Safely serialize runtime variables
        const runtimeEnv = {
          VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY || '',
          VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || '',
          VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || '',
          VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET || '',
          VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID || '',
          VITE_FIREBASE_MEASUREMENT_ID: env.VITE_FIREBASE_MEASUREMENT_ID || '',
          VITE_ALLOWED_EMAILS: env.VITE_ALLOWED_EMAILS || '',
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
