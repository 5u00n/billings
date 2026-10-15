import { Invoice, UserProfile } from '../types';

export async function exportInvoiceDocx(invoice: Invoice, profile?: UserProfile): Promise<void> {
  try {
    const response = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice, profile }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number || 'bill'}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Failed to export DOCX:', err);
    alert('Failed to export DOCX. Please ensure the server is running.');
  }
}
