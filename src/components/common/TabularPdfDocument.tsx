import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { UserProfile } from '../../types';

export interface TabularPdfColumn {
  header: string;
  key: string;
  width?: number; // relative flex proportion (default: 1)
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: any) => string;
}

export interface TabularPdfSummaryMetric {
  label: string;
  value: string;
}

export interface TabularPdfDocumentProps {
  title: string;
  subtitle?: string;
  columns: TabularPdfColumn[];
  data: any[];
  summaryMetrics?: TabularPdfSummaryMetric[];
  profile?: UserProfile | null;
  orientation?: 'portrait' | 'landscape';
}

const styles = StyleSheet.create({
  page: {
    padding: '12mm 14mm',
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    lineHeight: 1.35,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 8,
  },
  senderBlock: {
    maxWidth: '55%',
  },
  senderName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  senderDetail: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.3,
  },
  reportMetaBlock: {
    alignItems: 'flex-end',
    maxWidth: '45%',
  },
  reportTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportSubtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  generatedDate: {
    fontSize: 7.5,
    color: '#94a3b8',
    marginTop: 3,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 90,
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 1,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 7.5,
    color: '#1e293b',
  },
  footer: {
    position: 'absolute',
    bottom: '8mm',
    left: '14mm',
    right: '14mm',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
});

export const TabularPdfDocument: React.FC<TabularPdfDocumentProps> = ({
  title,
  subtitle,
  columns,
  data,
  summaryMetrics,
  profile,
  orientation = 'portrait',
}) => {
  const senderName = profile?.name || 'Suren Hembram';
  const senderAddress = [
    profile?.addressLine1,
    profile?.addressLine2,
    profile?.cityStateZip,
    profile?.country,
  ]
    .filter(Boolean)
    .join(', ');

  const totalFlex = columns.reduce((acc, col) => acc + (col.width || 1), 0);

  return (
    <Document>
      <Page size="A4" orientation={orientation} style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.senderBlock}>
            <Text style={styles.senderName}>{senderName}</Text>
            {senderAddress && <Text style={styles.senderDetail}>{senderAddress}</Text>}
            {profile?.email && <Text style={styles.senderDetail}>Email: {profile.email}</Text>}
            {profile?.phone && <Text style={styles.senderDetail}>Phone: {profile.phone}</Text>}
            {profile?.udyamNumber && (
              <Text style={styles.senderDetail}>UDYAM: {profile.udyamNumber}</Text>
            )}
          </View>
          <View style={styles.reportMetaBlock}>
            <Text style={styles.reportTitle}>{title}</Text>
            {subtitle && <Text style={styles.reportSubtitle}>{subtitle}</Text>}
            <Text style={styles.generatedDate}>
              Exported: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </View>
        </View>

        {/* Summary Metrics */}
        {summaryMetrics && summaryMetrics.length > 0 && (
          <View style={styles.summaryGrid}>
            {summaryMetrics.map((metric, idx) => (
              <View key={idx} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{metric.label}</Text>
                <Text style={styles.summaryValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Data Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            {columns.map((col, idx) => {
              const widthPct = `${((col.width || 1) / totalFlex) * 100}%`;
              const align = col.align || 'left';
              return (
                <Text
                  key={idx}
                  style={[
                    styles.tableHeaderCell,
                    {
                      width: widthPct as any,
                      textAlign: align,
                    },
                  ]}
                >
                  {col.header}
                </Text>
              );
            })}
          </View>

          {/* Body Rows */}
          {data.length === 0 ? (
            <View style={[styles.tableRow, { justifyContent: 'center', paddingVertical: 12 }]}>
              <Text style={{ fontSize: 8, color: '#94a3b8', fontStyle: 'italic' }}>
                No records found matching current criteria.
              </Text>
            </View>
          ) : (
            data.map((row, rowIdx) => {
              const isEven = rowIdx % 2 === 1;
              return (
                <View
                  key={rowIdx}
                  style={[styles.tableRow, isEven ? styles.tableRowEven : undefined]}
                  wrap={false}
                >
                  {columns.map((col, colIdx) => {
                    const widthPct = `${((col.width || 1) / totalFlex) * 100}%`;
                    const align = col.align || 'left';
                    const rawVal = row[col.key];
                    const formatted = col.format ? col.format(rawVal, row) : rawVal ?? '-';
                    return (
                      <Text
                        key={colIdx}
                        style={[
                          styles.tableCell,
                          {
                            width: widthPct as any,
                            textAlign: align,
                          },
                        ]}
                      >
                        {String(formatted)}
                      </Text>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>

        {/* Footer with Page Numbers */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated by Suren Billings & Expense Ledger • Confidential Report
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

