import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { Invoice, UserProfile } from '../types';
import { formatINR, numberToIndianWords } from '../utils/numberToWords';

const styles = StyleSheet.create({
  page: {
    padding: '16mm 18mm',
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  monogramAndSender: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  monogram: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monogramText: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  senderName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  senderText: {
    fontSize: 8.5,
    color: '#475569',
    lineHeight: 1.35,
  },
  udyamText: {
    marginTop: 2,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: '#475569',
  },
  udyamLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  },
  udyamValue: {
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  copyBadgeContainer: {
    borderWidth: 0.8,
    borderColor: '#94a3b8',
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 1.5,
    marginBottom: 4,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBadgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  docTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  logoImage: {
    maxHeight: 48,
    maxWidth: 120,
    objectFit: 'contain',
  },
  metaContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    marginBottom: 14,
    borderRadius: 3,
  },
  metaCol: {
    flex: 1,
    padding: '6 8',
    borderRightWidth: 0.8,
    borderRightColor: '#e2e8f0',
  },
  metaColLast: {
    flex: 1,
    padding: '6 8',
  },
  metaLabel: {
    fontSize: 7,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  billToSection: {
    marginBottom: 14,
    padding: '8 10',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderLeftWidth: 3.5,
    borderLeftColor: '#0f172a',
    borderRadius: 3,
  },
  billToLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#0f172a',
    marginBottom: 3,
  },
  clientName: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  clientText: {
    fontSize: 8,
    color: '#334155',
    lineHeight: 1.35,
  },
  table: {
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
  },
  tableHeaderCol: {
    color: '#ffffff',
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    padding: '5 6',
    borderRightWidth: 0.8,
    borderRightColor: '#334155',
  },
  tableHeaderColLast: {
    color: '#ffffff',
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    padding: '5 6',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderColor: '#cbd5e1',
  },
  colIdx: { width: '6%', borderRightWidth: 0.8, borderRightColor: '#cbd5e1', padding: '5 6' },
  colDesc: { width: '54%', borderRightWidth: 0.8, borderRightColor: '#cbd5e1', padding: '5 6' },
  colDescWide: { width: '76%', borderRightWidth: 0.8, borderRightColor: '#cbd5e1', padding: '5 6' },
  colQty: { width: '12%', borderRightWidth: 0.8, borderRightColor: '#cbd5e1', padding: '5 6', textAlign: 'right' },
  colRate: { width: '14%', borderRightWidth: 0.8, borderRightColor: '#cbd5e1', padding: '5 6', textAlign: 'right' },
  colAmount: { width: '14%', padding: '5 6', textAlign: 'right' },
  colAmountWide: { width: '18%', padding: '5 6', textAlign: 'right' },
  descText: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  numText: {
    fontSize: 8,
    color: '#334155',
  },
  amountText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  lowerSection: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#cbd5e1',
    paddingTop: 10,
    gap: 14,
  },
  leftColumn: {
    flex: 1.3,
    gap: 10,
  },
  rightColumn: {
    flex: 0.9,
    justifyContent: 'space-between',
  },
  wordsBlock: {
    backgroundColor: '#f8fafc',
    padding: '6 8',
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: '#e2e8f0',
  },
  wordsLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  wordsText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: '#1e293b',
  },
  paymentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    padding: '8 10',
  },
  paymentCardHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottomWidth: 0.6,
    borderColor: '#e2e8f0',
    paddingBottom: 3,
    marginBottom: 5,
  },
  paymentDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  paymentTextLines: {
    flex: 1,
  },
  paymentLine: {
    fontSize: 8,
    color: '#334155',
    lineHeight: 1.35,
  },
  qrCodeImage: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
  },
  totalsContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '4 8',
    borderBottomWidth: 0.6,
    borderColor: '#f1f5f9',
  },
  totalsLabel: {
    fontSize: 8,
    color: '#475569',
  },
  totalsValue: {
    fontSize: 8,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
  },
  totalMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: '5 8',
    borderBottomWidth: 0.8,
    borderColor: '#e2e8f0',
  },
  totalMainLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  totalMainValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    padding: '5 8',
    borderTopWidth: 1.2,
    borderColor: '#0f172a',
  },
  balanceLabel: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  balanceValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  signatureSection: {
    alignItems: 'flex-end',
    marginTop: 28,
  },
  signatureLine: {
    width: 140,
    borderTopWidth: 0.8,
    borderColor: '#94a3b8',
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'center',
    width: 140,
  },
  footer: {
    marginTop: 20,
    paddingTop: 8,
    borderTopWidth: 0.6,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 7.5,
  },
});

interface InvoicePdfDocumentProps {
  invoice: Invoice;
  profile: UserProfile;
  qrCodeUrl?: string;
}

export const InvoicePdfDocument: React.FC<InvoicePdfDocumentProps> = ({
  invoice,
  profile,
  qrCodeUrl,
}) => {
  const org = invoice.organization;
  const hasUpi = Boolean(profile.upiId && profile.upiId.trim());
  const hasCustomQr = Boolean(profile.customQrUrl && profile.customQrUrl.trim());
  const showBank = (invoice.showBankDetails ?? profile.showBankDetailsOnBill ?? true) && Boolean(profile.bankName || profile.accountNumber);
  const showUpi = (invoice.showUpi ?? profile.showUpiOnBill ?? true) && hasUpi;
  const showQr = (invoice.showQr ?? profile.showQrOnBill ?? true) && (hasCustomQr || hasUpi) && Boolean(qrCodeUrl);

  const paymentCardTitle = showBank && (showUpi || showQr)
    ? 'Bank & UPI Payment Details'
    : showBank
    ? 'Bank Account Details'
    : 'UPI Payment Details';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.monogramAndSender}>
              {profile.logoUrl ? (
                <Image src={profile.logoUrl} style={styles.logoImage} />
              ) : (
                <View style={styles.monogram}>
                  <Text style={styles.monogramText}>
                    {profile.name ? profile.name.trim().charAt(0).toUpperCase() : 'H'}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.senderName}>{profile.name}</Text>
                {profile.addressLine1 || profile.addressLine2 ? (
                  <Text style={styles.senderText}>
                    {[profile.addressLine1, profile.addressLine2].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
                {profile.cityStateZip || profile.country ? (
                  <Text style={styles.senderText}>
                    {[profile.cityStateZip, profile.country].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
                {profile.phone || profile.email ? (
                  <Text style={styles.senderText}>
                    {[profile.phone ? `Phone: ${profile.phone}` : '', profile.email ? `Email: ${profile.email}` : ''].filter(Boolean).join('  •  ')}
                  </Text>
                ) : null}
                {profile.website || (profile.showUdyamOnBill && profile.udyamNumber) ? (
                  <Text style={styles.senderText}>
                    {[profile.website, (profile.showUdyamOnBill && profile.udyamNumber) ? `Udyam: ${profile.udyamNumber}` : ''].filter(Boolean).join('  •  ')}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.headerRight}>
              {invoice.copy_type && invoice.copy_type !== 'NONE' ? (
                <View style={styles.copyBadgeContainer}>
                  <Text style={styles.copyBadgeText}>{invoice.copy_type}</Text>
                </View>
              ) : null}
              <Text style={styles.docTitle}>{invoice.doc_type || 'BILL OF SUPPLY'}</Text>
            </View>
          </View>

          {/* Meta Grid */}
          <View style={styles.metaContainer}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Invoice Number</Text>
              <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Invoice Date</Text>
              <Text style={styles.metaValue}>{invoice.invoice_date}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Terms</Text>
              <Text style={styles.metaValue}>{invoice.terms}</Text>
            </View>
            <View style={styles.metaColLast}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>{invoice.due_date}</Text>
            </View>
          </View>

          {/* Bill To */}
          <View style={styles.billToSection}>
            <Text style={styles.billToLabel}>Bill To</Text>
            {org ? (
              <View>
                <Text style={styles.clientName}>{org.name}</Text>
                {org.address ? <Text style={styles.clientText}>{org.address}</Text> : null}
                <Text style={styles.clientText}>
                  {[org.city, org.pincode, org.state, org.country].filter(Boolean).join(' ')}
                </Text>
                {org.phone ? <Text style={styles.clientText}>Phone: {org.phone}</Text> : null}
                {org.email ? <Text style={styles.clientText}>Email: {org.email}</Text> : null}
              </View>
            ) : (
              <Text style={styles.clientText}>No client organization specified</Text>
            )}
          </View>

          {/* Line Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCol, styles.colIdx]}>#</Text>
              <Text style={[styles.tableHeaderCol, invoice.hide_qty ? styles.colDescWide : styles.colDesc]}>
                {invoice.hide_qty ? 'Description of Services' : 'Item & Description'}
              </Text>
              {!invoice.hide_qty ? (
                <>
                  <Text style={[styles.tableHeaderCol, styles.colQty]}>Qty</Text>
                  <Text style={[styles.tableHeaderCol, styles.colRate]}>Rate (INR)</Text>
                </>
              ) : null}
              <Text style={[styles.tableHeaderColLast, invoice.hide_qty ? styles.colAmountWide : styles.colAmount]}>
                Amount (INR)
              </Text>
            </View>

            {(invoice.items || []).map((item, idx) => (
              <View key={item.id || idx} style={styles.tableRow}>
                <Text style={[styles.numText, styles.colIdx]}>{idx + 1}</Text>
                <Text style={[styles.descText, invoice.hide_qty ? styles.colDescWide : styles.colDesc]}>
                  {item.description}
                </Text>
                {!invoice.hide_qty ? (
                  <>
                    <Text style={[styles.numText, styles.colQty]}>{item.qty.toFixed(2)}</Text>
                    <Text style={[styles.numText, styles.colRate]}>{formatINR(item.rate)}</Text>
                  </>
                ) : null}
                <Text style={[styles.amountText, invoice.hide_qty ? styles.colAmountWide : styles.colAmount]}>
                  {formatINR(item.amount)}
                </Text>
              </View>
            ))}
          </View>

          {/* Lower Summary */}
          <View style={styles.lowerSection}>
            {/* Left Column: Total in Words + Dedicated Bank & UPI Box */}
            <View style={styles.leftColumn}>
              <View style={styles.wordsBlock}>
                <Text style={styles.wordsLabel}>Total In Words</Text>
                <Text style={styles.wordsText}>{numberToIndianWords(invoice.total)}</Text>
              </View>

              {/* Dedicated Bank & UPI Card */}
              {(showBank || showUpi || showQr) && (
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentCardHeader}>{paymentCardTitle}</Text>
                  <View style={styles.paymentDetailsRow}>
                    <View style={styles.paymentTextLines}>
                      {showBank && (
                        <View style={{ marginBottom: 4 }}>
                          <Text style={styles.paymentLine}>Bank: {profile.bankName}</Text>
                          <Text style={[styles.paymentLine, { fontFamily: 'Helvetica-Bold' }]}>
                            A/C No: {profile.accountNumber}
                          </Text>
                          <Text style={styles.paymentLine}>IFSC: {profile.ifscCode}</Text>
                          <Text style={styles.paymentLine}>
                            A/C Name: {profile.accountHolder || profile.name}
                          </Text>
                        </View>
                      )}
                      {showUpi && profile.upiId && (
                        <View style={{ marginTop: 2 }}>
                          <Text style={[styles.paymentLine, { fontFamily: 'Helvetica-Bold', color: '#2563eb' }]}>
                            UPI ID: {profile.upiId}
                          </Text>
                        </View>
                      )}
                    </View>

                    {showQr && qrCodeUrl ? (
                      <View style={{ alignItems: 'center' }}>
                        <Image src={qrCodeUrl} style={styles.qrCodeImage} />
                        <Text style={{ fontSize: 6.5, color: '#64748b', marginTop: 2 }}>
                          Scan to Pay
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}

              {invoice.notes ? (
                <View style={{ marginTop: 2 }}>
                  <Text style={styles.wordsLabel}>Notes</Text>
                  <Text style={{ fontSize: 8, color: '#475569' }}>{invoice.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* Right Column: Totals & Signature */}
            <View style={styles.rightColumn}>
              <View style={styles.totalsContainer}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Sub Total</Text>
                  <Text style={styles.totalsValue}>INR {formatINR(invoice.sub_total)}</Text>
                </View>

                <View style={styles.totalMainRow}>
                  <Text style={styles.totalMainLabel}>Total</Text>
                  <Text style={styles.totalMainValue}>INR {formatINR(invoice.total)}</Text>
                </View>

                {invoice.amount_paid > 0 ? (
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { color: '#059669' }]}>Amount Paid</Text>
                    <Text style={[styles.totalsValue, { color: '#059669', fontFamily: 'Helvetica-Bold' }]}>
                      INR {formatINR(invoice.amount_paid)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Balance Due</Text>
                  <Text style={styles.balanceValue}>INR {formatINR(invoice.balance_due)}</Text>
                </View>
              </View>

              <View style={styles.signatureSection}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155', marginBottom: 20, textAlign: 'right' }}>
                  For {profile.name}
                </Text>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureText}>
                  {profile.signatureText || 'Authorized Signatory'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>POWERED BY SUREN BILLINGS</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
};
