import React, { useState } from 'react';
import { CatalogItem } from '../types';
import { formatINR } from '../utils/numberToWords';
import { Package, Plus, Trash2, X, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DataImportModal, FieldDefinition } from './common/DataImportModal';

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

  return (
    <div className="p-8  space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Services & Items Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Save recurring project milestones, fees, and consulting rates for 1-click billing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="gap-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 font-semibold shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel / CSV</span>
          </Button>
          <Button
            onClick={() => setShowModal(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Catalog Item</span>
          </Button>
        </div>
      </div>

      <Card className="shadow-2xs overflow-hidden">
        {catalog.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">No saved items in catalog.</p>
            <p className="text-xs text-slate-400 mt-0.5">Add frequent line items for quick selection when creating bills.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Default Rate</th>
                  <th className="py-3 px-4 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalog.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.description || '-'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                      ₹{formatINR(item.default_rate)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add Service or Item</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Title *</label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Website Maintenance Retainer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details or terms..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Rate (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Save Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
