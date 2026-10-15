import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { Invoice, UserProfile } from '../src/types';
import { numberToIndianWords, formatINR } from '../src/utils/numberToWords';

export async function generateDocxBuffer(invoice: Invoice, profile: UserProfile): Promise<Buffer> {
  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const borderThin = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  };

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: profile.name, bold: true, size: 28, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: profile.addressLine1, size: 20, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: profile.addressLine2, size: 20, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: profile.cityStateZip, size: 20, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: profile.country, size: 20, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: profile.phone, size: 20, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: profile.email, size: 20, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: profile.website, size: 20, font: 'Arial' }),
                ],
              }),
              ...(profile.showUdyamOnBill && profile.udyamNumber
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Udyam Reg: ${profile.udyamNumber}`,
                          bold: true,
                          size: 20,
                          font: 'Arial',
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: invoice.copy_type || 'ORIGINAL',
                    size: 16,
                    color: '666666',
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: invoice.doc_type || 'BILL OF SUPPLY',
                    bold: true,
                    size: 32,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: 'CCCCCC' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, size: 20, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `: ${invoice.invoice_number}`, size: 20, font: 'Arial' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: 'Invoice Date', bold: true, size: 20, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `: ${invoice.invoice_date}`, size: 20, font: 'Arial' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: 'Terms', bold: true, size: 20, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `: ${invoice.terms}`, size: 20, font: 'Arial' })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: 'Due Date', bold: true, size: 20, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `: ${invoice.due_date}`, size: 20, font: 'Arial' })] })],
          }),
        ],
      }),
    ],
  });

  const billToParagraphs = [
    new Paragraph({
      children: [new TextRun({ text: 'Bill To', bold: true, size: 22, font: 'Arial', color: '333333' })],
    }),
    new Paragraph({
      children: [new TextRun({ text: invoice.organization?.name || '', bold: true, size: 22, font: 'Arial' })],
    }),
    new Paragraph({
      children: [new TextRun({ text: invoice.organization?.address || '', size: 20, font: 'Arial' })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: [
            invoice.organization?.city,
            invoice.organization?.pincode,
            invoice.organization?.state,
            invoice.organization?.country,
          ]
            .filter(Boolean)
            .join(' '),
          size: 20,
          font: 'Arial',
        }),
      ],
    }),
  ];

  const itemsHeaderRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 5, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        width: { size: 55, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: 'Item & Description', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Qty', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Rate', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Amount', bold: true, size: 20, font: 'Arial' })] })],
      }),
    ],
  });

  const itemRows = (invoice.items || []).map((item, index) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 5, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: `${index + 1}`, size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: item.description, size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: item.qty.toFixed(2), size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatINR(item.rate), size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatINR(item.amount), size: 20, font: 'Arial' })] })],
        }),
      ],
    });
  });

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderThin,
    rows: [itemsHeaderRow, ...itemRows],
  });

  const totalsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Total In Words', bold: true, size: 20, font: 'Arial' })],
              }),
              new Paragraph({
                children: [new TextRun({ text: numberToIndianWords(invoice.total), italics: true, size: 20, font: 'Arial' })],
              }),
              new Paragraph({ text: '' }),
              new Paragraph({
                children: [new TextRun({ text: 'Notes', bold: true, size: 20, font: 'Arial' })],
              }),
              new Paragraph({
                children: [new TextRun({ text: invoice.notes || 'Thanks for your business.', size: 20, font: 'Arial' })],
              }),
              new Paragraph({ text: '' }),
              new Paragraph({
                children: [new TextRun({ text: 'Payment Options', bold: true, size: 20, font: 'Arial' })],
              }),
              new Paragraph({
                children: [new TextRun({ text: invoice.payment_options || 'Bank Transfer / UPI Accepted', size: 20, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Sub Total:  ${formatINR(invoice.sub_total)}`, size: 20, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Total:  ₹${formatINR(invoice.total)}`, bold: true, size: 22, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Balance Due:  ₹${formatINR(invoice.balance_due)}`, bold: true, size: 22, font: 'Arial' }),
                ],
              }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: '' }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: profile.signatureText || 'Authorized Signature', bold: true, size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          headerTable,
          new Paragraph({ text: '' }),
          metaTable,
          new Paragraph({ text: '' }),
          ...billToParagraphs,
          new Paragraph({ text: '' }),
          itemsTable,
          new Paragraph({ text: '' }),
          totalsTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
