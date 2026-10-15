import React, { useState, useEffect } from 'react';
import { Invoice, UserProfile } from '../types';
import { formatINR, numberToIndianWords } from '../utils/numberToWords';
import { generateUpiQrDataUrl } from '../utils/upiQr';
import { QrCode, Copy, Check, Building, CreditCard } from 'lucide-react';

interface InvoicePreviewProps {
  invoice: Invoice;
  profile: UserProfile;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice, profile }) => {
  const org = invoice.organization;
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const hasUpi = Boolean(profile.upiId && profile.upiId.trim());
  const hasCustomQr = Boolean(profile.customQrUrl && profile.customQrUrl.trim());
  const showBank = (invoice.showBankDetails ?? profile.showBankDetailsOnBill ?? true) && Boolean(profile.bankName || profile.accountNumber);
  const showUpi = (invoice.showUpi ?? profile.showUpiOnBill ?? true) && hasUpi;
  const showQr = (invoice.showQr ?? profile.showQrOnBill ?? true) && (hasCustomQr || hasUpi);

  const paymentCardTitle = showBank && (showUpi || showQr)
    ? 'Bank & UPI Payment Details'
    : showBank
    ? 'Bank Account Details'
    : 'UPI Payment Details';

  useEffect(() => {
    if (showQr) {
      if (profile.customQrUrl) {
        setQrCodeUrl(profile.customQrUrl);
      } else if (hasUpi) {
        generateUpiQrDataUrl(profile.upiId, profile.name, invoice.total, invoice.invoice_number).then(
          (url) => setQrCodeUrl(url)
        );
      } else {
        setQrCodeUrl('');
      }
    } else {
      setQrCodeUrl('');
    }
  }, [showQr, profile.customQrUrl, hasUpi, profile.upiId, profile.name, invoice.total, invoice.invoice_number]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="a4-preview-wrapper flex justify-center py-4 bg-slate-200/90 print:p-0 print:bg-white">
      <div
        id="invoice-print-container"
        className="a4-sheet font-sans bg-white text-slate-900 border border-slate-300/80 print:border-none shadow-xl print:shadow-none"
        style={{
          boxSizing: 'border-box',
          width: '210mm',
          minHeight: '297mm',
          padding: '16mm 18mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '12.5px',
          lineHeight: '1.42',
        }}
      >
        <div>
          {/* Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            {/* Left: Monogram/Logo & Profile */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              {profile.logoUrl ? (
                <div
                  style={{
                    maxHeight: '68px',
                    maxWidth: '150px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={profile.logoUrl}
                    alt={profile.name}
                    style={{
                      maxHeight: '64px',
                      maxWidth: '140px',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '2.5px solid #0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    fontWeight: 'bold',
                    fontFamily: 'Inter, sans-serif',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    flexShrink: 0,
                  }}
                >
                  {profile.name ? profile.name.trim().charAt(0).toUpperCase() : 'H'}
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.45' }}>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '2px' }}>
                  {profile.name}
                </div>
                {(profile.addressLine1 || profile.addressLine2) && (
                  <div style={{ color: '#475569' }}>
                    {[profile.addressLine1, profile.addressLine2].filter(Boolean).join(', ')}
                  </div>
                )}
                {(profile.cityStateZip || profile.country) && (
                  <div style={{ color: '#475569' }}>
                    {[profile.cityStateZip, profile.country].filter(Boolean).join(', ')}
                  </div>
                )}
                {(profile.phone || profile.email) && (
                  <div style={{ color: '#475569', marginTop: '2px' }}>
                    {profile.phone && <span>Phone: {profile.phone}</span>}
                    {profile.phone && profile.email && <span style={{ color: '#cbd5e1', margin: '0 6px' }}>•</span>}
                    {profile.email && <span>Email: {profile.email}</span>}
                  </div>
                )}
                {(profile.website || (profile.showUdyamOnBill && profile.udyamNumber)) && (
                  <div style={{ color: '#475569', marginTop: '2px', fontSize: '11px' }}>
                    {profile.website && <span style={{ color: '#2563eb' }}>{profile.website}</span>}
                    {profile.website && profile.showUdyamOnBill && profile.udyamNumber && (
                      <span style={{ color: '#cbd5e1', margin: '0 6px' }}>•</span>
                    )}
                    {profile.showUdyamOnBill && profile.udyamNumber && (
                      <span>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Udyam Reg:</span>{' '}
                        <span style={{ fontFamily: 'monospace', color: '#1e293b', fontWeight: 600 }}>{profile.udyamNumber}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Badge & Title */}
            <div style={{ textAlign: 'right' }}>
              {invoice.copy_type && invoice.copy_type !== 'NONE' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '18px',
                      padding: '0 8px',
                      paddingTop: '1px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '3px',
                      fontSize: '9px',
                      fontWeight: 700,
                      lineHeight: '1',
                      letterSpacing: '0.08em',
                      color: '#475569',
                      textTransform: 'uppercase',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    {invoice.copy_type}
                  </span>
                </div>
              )}
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  letterSpacing: '0.04em',
                  color: '#0f172a',
                  textTransform: 'uppercase',
                }}
              >
                {invoice.doc_type || 'BILL OF SUPPLY'}
              </div>
            </div>
          </div>

          {/* Meta Grid Card with Structured Borders */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1.2px solid #cbd5e1',
              borderRadius: '4px',
              marginBottom: '18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
            }}
          >
            <div style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Invoice Number
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
                {invoice.invoice_number}
              </div>
            </div>

            <div style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Invoice Date
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>
                {invoice.invoice_date}
              </div>
            </div>

            <div style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Terms
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>
                {invoice.terms}
              </div>
            </div>

            <div style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Due Date
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>
                {invoice.due_date}
              </div>
            </div>
          </div>

          {/* Bill To Card with Crisp Borders */}
          <div
            style={{
              marginBottom: '18px',
              padding: '10px 14px',
              backgroundColor: '#ffffff',
              border: '1.2px solid #cbd5e1',
              borderLeft: '4px solid #0f172a',
              borderRadius: '4px',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Bill To
            </div>
            {org ? (
              <div style={{ fontSize: '12.5px', color: '#1e293b', lineHeight: '1.4' }}>
                <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{org.name}</div>
                {org.address && <div style={{ color: '#475569' }}>{org.address}</div>}
                <div style={{ color: '#475569' }}>
                  {[org.city, org.pincode, org.state, org.country].filter(Boolean).join(' ')}
                </div>
                {org.phone && <div style={{ color: '#475569' }}>Phone: {org.phone}</div>}
                {org.email && <div style={{ color: '#475569' }}>Email: {org.email}</div>}
              </div>
            ) : (
              <div style={{ fontStyle: 'italic', color: '#94a3b8' }}>No organization specified</div>
            )}
          </div>

          {/* Line Items Table with Crisp Outer & Column Borders */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '18px',
              fontSize: '12px',
              border: '1.5px solid #0f172a',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '38px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', borderRight: '1px solid #334155' }}>
                  #
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', borderRight: invoice.hide_qty ? 'none' : '1px solid #334155' }}>
                  {invoice.hide_qty ? 'Description of Services / Work' : 'Item & Description'}
                </th>
                {!invoice.hide_qty && (
                  <>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '70px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', borderRight: '1px solid #334155' }}>
                      Qty
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '110px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', borderRight: '1px solid #334155' }}>
                      Rate (₹)
                    </th>
                  </>
                )}
                <th style={{ padding: '8px 12px', textAlign: 'right', width: invoice.hide_qty ? '140px' : '120px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', borderLeft: invoice.hide_qty ? '1px solid #334155' : 'none' }}>
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, index) => (
                  <tr
                    key={item.id || index}
                    style={{
                      borderBottom: '1px solid #cbd5e1',
                      backgroundColor: index % 2 === 1 ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '8px 10px', textAlign: 'left', verticalAlign: 'top', color: '#64748b', borderRight: '1px solid #cbd5e1' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'left', verticalAlign: 'top', color: '#0f172a', fontWeight: '500', borderRight: invoice.hide_qty ? 'none' : '1px solid #cbd5e1' }}>
                      {item.description}
                    </td>
                    {!invoice.hide_qty && (
                      <>
                        <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'top', color: '#475569', borderRight: '1px solid #cbd5e1' }}>
                          {item.qty.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', verticalAlign: 'top', color: '#475569', fontFamily: 'monospace', borderRight: '1px solid #cbd5e1' }}>
                          {formatINR(item.rate)}
                        </td>
                      </>
                    )}
                    <td style={{ padding: '8px 12px', textAlign: 'right', verticalAlign: 'top', color: '#0f172a', fontWeight: '700', fontFamily: 'monospace', borderLeft: invoice.hide_qty ? '1px solid #cbd5e1' : 'none' }}>
                      {formatINR(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={invoice.hide_qty ? 3 : 5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    No items added
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Lower Summary: Left Column (Words + Bank/UPI Card) | Right Column (Totals + Sign) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.25fr 0.85fr',
              borderTop: '1.5px solid #cbd5e1',
              paddingTop: '16px',
              gap: '24px',
            }}
          >
            {/* Left Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Total In Words Card */}
              <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Total In Words
                </div>
                <div style={{ fontSize: '12px', color: '#0f172a', fontStyle: 'italic', fontWeight: '600' }}>
                  {numberToIndianWords(invoice.total)}
                </div>
              </div>

              {/* Dedicated Bank & UPI Payment Details Card */}
              {(showBank || showUpi || showQr) && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    padding: '12px 14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {paymentCardTitle}
                    </span>
                    <span style={{ fontSize: '10px', color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                      Direct Transfer
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '11.5px', color: '#334155', lineHeight: '1.45', flex: 1 }}>
                      {showBank && (
                        <div>
                          <div>
                            <span style={{ color: '#64748b' }}>Bank:</span>{' '}
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{profile.bankName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#64748b' }}>A/C No:</span>{' '}
                            <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                              {profile.accountNumber}
                            </span>
                            <button
                              onClick={() => copyToClipboard(profile.accountNumber, 'ac')}
                              title="Copy Account Number"
                              className="no-print"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                            >
                              {copiedKey === 'ac' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                            </button>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>IFSC:</span>{' '}
                            <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                              {profile.ifscCode}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Name:</span>{' '}
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>
                              {profile.accountHolder || profile.name}
                            </span>
                          </div>
                        </div>
                      )}

                      {showUpi && profile.upiId && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#2563eb', fontWeight: '700' }}>UPI ID:</span>{' '}
                          <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                            {profile.upiId}
                          </span>
                          <button
                            onClick={() => copyToClipboard(profile.upiId, 'upi')}
                            title="Copy UPI ID"
                            className="no-print"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                          >
                            {copiedKey === 'upi' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* QR Code Container */}
                    {showQr && qrCodeUrl && (
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <img
                          src={qrCodeUrl}
                          alt="UPI QR Code"
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            padding: '2px',
                            backgroundColor: '#ffffff',
                          }}
                        />
                        <div style={{ fontSize: '9px', fontWeight: '600', color: '#64748b', marginTop: '2px' }}>
                          Scan to Pay
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                    Notes
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#334155', whiteSpace: 'pre-line' }}>
                    {invoice.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Right Block */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
              <div
                style={{
                  border: '1.2px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '12px', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Sub Total</span>
                  <span style={{ fontWeight: '600', fontFamily: 'monospace', color: '#0f172a' }}>
                    ₹{formatINR(invoice.sub_total)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#0f172a',
                    fontWeight: '700',
                    fontSize: '13px',
                    padding: '6px 10px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span>Total</span>
                  <span style={{ fontFamily: 'monospace' }}>₹{formatINR(invoice.total)}</span>
                </div>

                {invoice.amount_paid > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontSize: '12px', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Amount Paid</span>
                    <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                      ₹{formatINR(invoice.amount_paid)}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#0f172a',
                    backgroundColor: '#eff6ff',
                    padding: '8px 10px',
                    fontWeight: '800',
                    fontSize: '14.5px',
                    borderTop: '1.5px solid #0f172a',
                  }}
                >
                  <span>Balance Due</span>
                  <span style={{ fontFamily: 'monospace', color: '#1e40af' }}>₹{formatINR(invoice.balance_due)}</span>
                </div>
              </div>

              {/* Signature Line */}
              <div style={{ textAlign: 'right', marginTop: '36px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '28px', textAlign: 'right' }}>
                  For {profile.name}
                </div>
                <div
                  style={{
                    width: '160px',
                    borderTop: '1.2px solid #94a3b8',
                    marginLeft: 'auto',
                    marginBottom: '4px',
                  }}
                />
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', textAlign: 'center', width: '160px', marginLeft: 'auto' }}>
                  {profile.signatureText || 'Authorized Signatory'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#94a3b8',
            fontWeight: '500',
          }}
        >
          <div>POWERED BY SUREN BILLINGS</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
};
