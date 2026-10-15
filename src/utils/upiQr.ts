import QRCode from 'qrcode';

export function buildUpiUri(upiId: string, payeeName: string, amount: number, invoiceNumber: string): string {
  if (!upiId) return '';
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanInvoice = encodeURIComponent(invoiceNumber.trim());
  const cleanAmount = amount > 0 ? amount.toFixed(2) : '';

  let uri = `upi://pay?pa=${cleanUpi}&pn=${cleanName}&cu=INR&tn=Invoice-${cleanInvoice}`;
  if (cleanAmount) {
    uri += `&am=${cleanAmount}`;
  }
  return uri;
}

export async function generateUpiQrDataUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  invoiceNumber: string
): Promise<string> {
  if (!upiId) return '';
  const uri = buildUpiUri(upiId, payeeName, amount, invoiceNumber);
  try {
    return await QRCode.toDataURL(uri, {
      margin: 1,
      width: 160,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    return '';
  }
}
