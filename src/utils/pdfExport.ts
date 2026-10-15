import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { Invoice, UserProfile } from '../types';
import { InvoicePdfDocument } from '../components/InvoicePdfDocument';
import { generateUpiQrDataUrl } from './upiQr';

export function printInvoice(): void {
  window.print();
}

/**
 * Generates and downloads a pure vector PDF using @react-pdf/renderer.
 */
export async function downloadInvoicePdf(invoice: Invoice, profile?: UserProfile): Promise<void> {
  try {
    const prof = profile || {
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
      accountNumber: '45661497562',
      ifscCode: 'SBIN0014355',
      accountHolder: 'Suren Hembram',
      upiId: 'surenhembram@okaxis',
      showBankDetailsOnBill: true,
      showUpiOnBill: true,
      showQrOnBill: true,
      defaultNotes: 'Thanks for your business.',
      defaultTerms: 'Due on Receipt',
      signatureText: 'Authorized Signature',
    };

    let qrCodeUrl = '';
    if (prof.showQrOnBill) {
      if (prof.customQrUrl) {
        qrCodeUrl = prof.customQrUrl;
      } else if (prof.upiId) {
        try {
          qrCodeUrl = await generateUpiQrDataUrl(prof.upiId, prof.name, invoice.total, invoice.invoice_number);
        } catch (e) {
          console.warn('QR code generation failed, proceeding without QR:', e);
        }
      }
    }

    // Render React-PDF document to blob
    const docElement = React.createElement(InvoicePdfDocument, {
      invoice,
      profile: prof,
      qrCodeUrl,
    });

    const blob = await pdf(docElement).toBlob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number || 'bill'}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('@react-pdf/renderer generation error, falling back to window.print():', err);
    printInvoice();
  }
}
