import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Invoice, UserProfile } from '../src/types';
import { formatINR, numberToIndianWords } from '../src/utils/numberToWords';

export function renderInvoiceHtml(invoice: Invoice, profile: UserProfile): string {
  const org = invoice.organization;

  const itemRowsHtml = (invoice.items || [])
    .map(
      (item, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 10px; text-align: left; vertical-align: top; color: #374151;">${idx + 1}</td>
      <td style="padding: 10px 10px; text-align: left; vertical-align: top; color: #111827;">${item.description.replace(/\n/g, '<br/>')}</td>
      <td style="padding: 10px 10px; text-align: right; vertical-align: top; color: #374151;">${item.qty.toFixed(2)}</td>
      <td style="padding: 10px 10px; text-align: right; vertical-align: top; color: #374151;">${formatINR(item.rate)}</td>
      <td style="padding: 10px 10px; text-align: right; vertical-align: top; color: #111827; font-weight: 500;">${formatINR(item.amount)}</td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${invoice.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #ffffff;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      padding: 16mm 18mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 13px;
      line-height: 1.4;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div>
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div style="display: flex; gap: 20px; align-items: flex-start;">
          <div style="width: 74px; height: 74px; border-radius: 50%; border: 3px solid #000000; display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: bold; color: #000000; flex-shrink: 0;">
            H
          </div>
          <div style="font-size: 13px; color: #111827; line-height: 1.4;">
            <div style="font-size: 18px; font-weight: bold; color: #000000; margin-bottom: 3px;">
              ${profile.name}
            </div>
            ${profile.addressLine1 ? `<div>${profile.addressLine1}</div>` : ''}
            ${profile.addressLine2 ? `<div>${profile.addressLine2}</div>` : ''}
            ${profile.cityStateZip ? `<div>${profile.cityStateZip}</div>` : ''}
            ${profile.country ? `<div>${profile.country}</div>` : ''}
            ${profile.phone ? `<div>${profile.phone}</div>` : ''}
            ${profile.email ? `<div>${profile.email}</div>` : ''}
            ${profile.website ? `<div>${profile.website}</div>` : ''}
            ${profile.showUdyamOnBill && profile.udyamNumber ? `<div style="font-weight: 600; margin-top: 2px; color: #1f2937;">Udyam Reg: ${profile.udyamNumber}</div>` : ''}
          </div>
        </div>

        <div style="text-align: right;">
          ${invoice.copy_type && invoice.copy_type !== 'NONE' ? `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 6px;">
              <span style="border: 1px solid #9ca3af; border-radius: 2px; padding: 1px 8px; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; color: #6b7280; text-transform: uppercase;">
                ${invoice.copy_type}
              </span>
            </div>
          ` : ''}
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 0.02em; color: #111827; text-transform: uppercase;">
            ${invoice.doc_type || 'BILL OF SUPPLY'}
          </div>
        </div>
      </div>

      <!-- Meta Grid -->
      <div style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 0; margin-bottom: 24px; font-size: 13px; display: grid; grid-template-columns: 130px 1fr; row-gap: 4px;">
        <div style="font-weight: 600; color: #374151;">#</div>
        <div>: ${invoice.invoice_number}</div>

        <div style="font-weight: 600; color: #374151;">Invoice Date</div>
        <div>: ${invoice.invoice_date}</div>

        <div style="font-weight: 600; color: #374151;">Terms</div>
        <div>: ${invoice.terms}</div>

        <div style="font-weight: 600; color: #374151;">Due Date</div>
        <div>: ${invoice.due_date}</div>
      </div>

      <!-- Bill To -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: bold; color: #111827; margin-bottom: 4px;">
          Bill To
        </div>
        ${org ? `
          <div style="font-size: 13px; color: #1f2937; line-height: 1.4;">
            <div style="font-weight: bold;">${org.name}</div>
            ${org.address ? `<div>${org.address}</div>` : ''}
            <div>${[org.city, org.pincode, org.state, org.country].filter(Boolean).join(' ')}</div>
            ${org.phone ? `<div>Phone: ${org.phone}</div>` : ''}
            ${org.email ? `<div>Email: ${org.email}</div>` : ''}
          </div>
        ` : `<div style="font-style: italic; color: #9ca3af;">No organization specified</div>`}
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
        <thead>
          <tr style="border-top: 1px solid #9ca3af; border-bottom: 1px solid #9ca3af; background-color: #f9fafb;">
            <th style="padding: 8px 10px; text-align: left; width: 40px; font-weight: bold; color: #111827;">#</th>
            <th style="padding: 8px 10px; text-align: left; font-weight: bold; color: #111827;">Item & Description</th>
            <th style="padding: 8px 10px; text-align: right; width: 80px; font-weight: bold; color: #111827;">Qty</th>
            <th style="padding: 8px 10px; text-align: right; width: 120px; font-weight: bold; color: #111827;">Rate</th>
            <th style="padding: 8px 10px; text-align: right; width: 120px; font-weight: bold; color: #111827;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
      </table>

      <!-- Lower Summary -->
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; border-top: 1px solid #9ca3af; padding-top: 16px; gap: 24px;">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <div style="font-size: 12px; font-weight: bold; color: #111827; margin-bottom: 2px;">
              Total In Words
            </div>
            <div style="font-size: 13px; color: #374151; font-style: italic;">
              ${numberToIndianWords(invoice.total)}
            </div>
          </div>

          ${invoice.notes ? `
            <div>
              <div style="font-size: 12px; font-weight: bold; color: #111827; margin-bottom: 2px;">
                Notes
              </div>
              <div style="font-size: 13px; color: #374151; white-space: pre-line;">
                ${invoice.notes}
              </div>
            </div>
          ` : ''}

          ${invoice.payment_options ? `
            <div>
              <div style="font-size: 12px; font-weight: bold; color: #111827; margin-bottom: 2px;">
                Payment Options
              </div>
              <div style="font-size: 13px; color: #374151; white-space: pre-line;">
                ${invoice.payment_options}
              </div>
            </div>
          ` : ''}
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-between; min-height: 160px;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; color: #374151;">
              <span>Sub Total</span>
              <span style="font-weight: 500;">${formatINR(invoice.sub_total)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; color: #111827; font-weight: bold; font-size: 14px;">
              <span>Total</span>
              <span>₹${formatINR(invoice.total)}</span>
            </div>

            ${invoice.amount_paid > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #059669; font-size: 13px;">
                <span>Amount Paid</span>
                <span>₹${formatINR(invoice.amount_paid)}</span>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; color: #111827; font-weight: bold; font-size: 15px; border-top: 1px solid #e5e7eb; padding-top: 6px;">
              <span>Balance Due</span>
              <span>₹${formatINR(invoice.balance_due)}</span>
            </div>
          </div>

          <div style="text-align: right; margin-top: 48px;">
            <div style="font-size: 13px; font-weight: 600; color: #111827;">
              ${profile.signatureText || 'Authorized Signature'}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9ca3af;">
      <div>POWERED BY SUREN BILLINGS</div>
      <div>1</div>
    </div>
  </div>
</body>
</html>`;
}

export function generateVectorPdfBuffer(invoice: Invoice, profile: UserProfile): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const id = Date.now() + Math.random().toString(36).substring(7);
    const htmlPath = path.join(tempDir, `invoice-${id}.html`);
    const pdfPath = path.join(tempDir, `invoice-${id}.pdf`);

    const html = renderInvoiceHtml(invoice, profile);
    fs.writeFileSync(htmlPath, html, 'utf-8');

    // Locate Chrome or Brave
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ];

    const binary = chromePaths.find((p) => fs.existsSync(p));

    if (!binary) {
      reject(new Error('No Chromium or Google Chrome binary found on system.'));
      return;
    }

    const cmd = `"${binary}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;

    exec(cmd, (err) => {
      try {
        if (err && !fs.existsSync(pdfPath)) {
          reject(err);
          return;
        }

        const buffer = fs.readFileSync(pdfPath);

        // Cleanup temp files
        try {
          fs.unlinkSync(htmlPath);
          fs.unlinkSync(pdfPath);
        } catch {}

        resolve(buffer);
      } catch (e) {
        reject(e);
      }
    });
  });
}
