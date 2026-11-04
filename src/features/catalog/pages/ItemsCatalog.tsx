import React, { useState, useMemo } from 'react';
import { CatalogItem } from '@/types';
import { formatINR } from '@/utils/numberToWords';
import {
  Package,
  Plus,
  Trash2,
  X,
  FileSpreadsheet,
  Search,
  Calculator,
  Layers,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { DataImportModal, FieldDefinition } from '@/components/common/DataImportModal';
import { ExportActions } from '@/components/common/ExportActions';
import { ExportColumn, formatCurrencyForPdf } from '@/utils/dataExport';

interface ItemsCatalogProps {
  catalog: CatalogItem[];
  onRefresh: () => void;
}

const CATALOG_IMPORT_FIELDS: FieldDefinition[] = [
  {
    key: 'name',
    label: 'Item / Service Name',
    required: true,
    type: 'string',
    synonyms: ['name', 'item', 'service', 'title', 'product'],
  },
  {
    key: 'description',
    label: 'Description / Details',
    required: false,
    type: 'string',
    synonyms: ['description', 'particulars', 'narration', 'details', 'memo'],
    defaultValue: '',
  },
  {
    key: 'default_rate',
    label: 'Rate / Price (₹)',
    required: true,
    type: 'number',
    synonyms: ['rate', 'default_rate', 'price', 'amount', 'unit price', 'cost'],
  },
];

const CATALOG_SAMPLE_TEMPLATE = [
  {
    'Item Name': 'Fullstack Web App Development Milestone',
    'Description': 'Frontend & backend sprint delivery with cloud deployment',
    'Rate': 45000,
  },
  {
    'Item Name': 'Cloud Architecture Consulting (Hourly)',
    'Description': 'Infrastructure advisory and serverless scalability review',
    'Rate': 3500,
  },
];

export const ItemsCatalog: React.FC<ItemsCatalogProps> = ({ catalog, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, default_rate: rate }),
    });

    setName('');
    setDescription('');
    setRate(0);
    setShowModal(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this saved item?')) {
      await fetch(`/api/catalog/${id}`, { method: 'DELETE' });
      onRefresh();
    }
  };

  const avgRate = catalog.length
    ? catalog.reduce((s, i) => s + (i.default_rate || 0), 0) / catalog.length
    : 0;

  const maxRate = catalog.length
    ? Math.max(...catalog.map((i) => i.default_rate || 0))
    : 0;

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog;
    const q = searchQuery.toLowerCase();
    return catalog.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.default_rate?.toString().includes(q)
    );
  }, [catalog, searchQuery]);

  const catalogExportColumns: ExportColumn<CatalogItem>[] = [
    { header: 'Item / Service Name', key: 'name', width: 28, align: 'left' },
    { header: 'Description / Scope', key: 'description', width: 36, align: 'left', format: (v) => v || '-' },
    {
      header: 'Default Rate',
      key: 'default_rate',
      width: 16,
      align: 'right',
      isNumeric: true,
      formatPdf: (val) => formatCurrencyForPdf(val || 0),
    },
  ];

  const catalogExportOptions = {
    filename: `Items_Catalog_${new Date().toISOString().slice(0, 10)}`,
    title: 'Items & Services Pricing Catalog',
    subtitle: `Standard rates catalog with ${catalog.length} items`,
    sheetName: 'Catalog',
    columns: catalogExportColumns,
    data: catalog,
    summaryMetrics: [
      { label: 'Total Catalog Items', value: catalog.length },
      { label: 'Average Unit Price', value: formatCurrencyForPdf(avgRate) },
      { label: 'Highest Tier Price', value: formatCurrencyForPdf(maxRate) },
    ],
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Services & Items Catalog
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
              {catalog.length} items
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Save recurring project milestones, fees, and consulting rates for 1-click billing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportActions exportOptions={catalogExportOptions} size="default" />
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="flex-1 gap-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50 font-semibold shadow-2xs cursor-pointer text-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel / CSV</span>
          </Button>
          <Button
            onClick={() => setShowModal(true)}
            className="flex-1 gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Catalog Item</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total Catalog Items */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Saved Items & Rates
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {catalog.length}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Reusable service definitions</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/60">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Average Rate */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Average Unit Price
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                ₹{formatINR(Math.round(avgRate))}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Mean service offering rate</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/60">
              <Calculator className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Highest Tier Item */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Highest Tier Rate
              </span>
              <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono tracking-tight">
                ₹{formatINR(maxRate)}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Peak package value</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/60">
              <Tag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="Search catalog items by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-xs h-9 bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredCatalog.length}</span> of {catalog.length} items
        </div>
      </div>

      {/* Catalog Table Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
        {filteredCatalog.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {searchQuery ? 'No matching catalog items found' : 'No saved items in catalog'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No items match "${searchQuery}". Try a different keyword or clear the search.`
                : 'Add frequent line items or milestones for quick 1-click selection when drafting bills.'}
            </p>
            {searchQuery ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-4 text-xs dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Clear Search
              </Button>
            ) : (
              <Button
                onClick={() => setShowModal(true)}
                size="sm"
                className="mt-4 gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Item</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-xs border-collapse">
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <TableRow>
                  <TableHead className="py-3 px-4">Item / Service Name</TableHead>
                  <TableHead className="py-3 px-4">Description / Details</TableHead>
                  <TableHead className="py-3 px-4 text-right">Default Rate</TableHead>
                  <TableHead className="py-3 px-4 text-center w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredCatalog.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <TableCell className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </span>
                        <span className="break-words">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                      {item.description ? (
                        <span className="line-clamp-2">{item.description}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                      ₹{formatINR(item.default_rate)}
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Add Item Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                <Package className="w-4 h-4" />
              </div>
              <span>Add Service or Item</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Item Title *
              </label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Maintenance Retainer"
                className="bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details, deliverable scope or terms..."
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Rate (₹) *
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                required
                value={rate || ''}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="font-mono bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
                className="dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
              >
                Save Item
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excel / CSV Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Products & Services from Excel / CSV"
        description="Bulk import your price lists and service catalog items from spreadsheets"
        entityName="Catalog_Items"
        targetFields={CATALOG_IMPORT_FIELDS}
        sampleData={CATALOG_SAMPLE_TEMPLATE}
        apiEndpoint="/api/catalog/batch"
        onSuccess={(count) => {
          alert(`Successfully imported ${count} catalog items!`);
          onRefresh();
        }}
      />
    </div>
  );
};
