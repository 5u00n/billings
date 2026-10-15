import React, { useState, useEffect } from 'react';
import { Invoice, Organization, AppSettings, CatalogItem } from './types';
import { Sidebar, NavTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InvoiceList } from './components/InvoiceList';
import { Organizations } from './components/Organizations';
import { Settings } from './components/Settings';
import { ItemsCatalog } from './components/ItemsCatalog';
import { InvoiceEditor } from './components/InvoiceEditor';
import { Automations } from './components/Automations';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [preselectedOrgId, setPreselectedOrgId] = useState<string | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [invRes, orgRes, setRes, catRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/organizations'),
        fetch('/api/settings'),
        fetch('/api/catalog'),
      ]);

      const [invData, orgData, setData, catData] = await Promise.all([
        invRes.json(),
        orgRes.json(),
        setRes.json(),
        catRes.json(),
      ]);

      setInvoices(invData || []);
      setOrganizations(orgData || []);
      setSettings(setData || null);
      setCatalog(catData || []);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewInvoice = (orgId?: string) => {
    setEditingInvoice(null);
    setPreselectedOrgId(orgId || null);
    setIsEditorOpen(true);
  };

  const handleSelectOrg = (orgId: string) => {
    setActiveOrgId(orgId);
    setCurrentTab('organizations');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setIsEditorOpen(true);
  };

  const handleDuplicateInvoice = async (inv: Invoice) => {
    const duplicated: Invoice = {
      ...inv,
      id: '',
      invoice_number: '',
      invoice_date: new Date().toLocaleDateString('en-GB'),
      due_date: new Date().toLocaleDateString('en-GB'),
      status: 'issued',
      amount_paid: 0,
      balance_due: inv.total,
    };
    setEditingInvoice(duplicated);
    setIsEditorOpen(true);
  };

  const handleSaveInvoice = async (invoiceData: Partial<Invoice>) => {
    try {
      if (invoiceData.id && editingInvoice && editingInvoice.id === invoiceData.id) {
        await fetch(`/api/invoices/${invoiceData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData),
        });
      } else {
        await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData),
        });
      }
      setIsEditorOpen(false);
      setEditingInvoice(null);
      await fetchAllData();
      setCurrentTab('invoices');
    } catch (err) {
      console.error('Failed to save invoice:', err);
      alert('Failed to save invoice. Please check the server logs.');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  const handleStatusChange = async (id: string, status: Invoice['status'], amountPaid?: number) => {
    try {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) return;

      const paid = amountPaid !== undefined ? amountPaid : inv.amount_paid;
      const balance = Math.max(0, inv.total - paid);

      await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inv,
          status,
          amount_paid: paid,
          balance_due: balance,
        }),
      });

      await fetchAllData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      setSettings(newSettings);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">Loading Billing Records & Profile...</p>
        </div>
      </div>
    );
  }

  const defaultProfile = settings?.profile || {
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
    defaultNotes: 'Thanks for your business.',
    defaultTerms: 'Due on Receipt',
    signatureText: 'Authorized Signature',
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      {!isEditorOpen && (
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'organizations') setActiveOrgId(null);
            setCurrentTab(tab);
          }}
          onNewInvoice={() => handleNewInvoice()}
          orgCount={organizations.length}
          invoiceCount={invoices.length}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {isEditorOpen ? (
          <InvoiceEditor
            invoice={
              editingInvoice ||
              (preselectedOrgId
                ? ({ organization_id: preselectedOrgId } as any)
                : null)
            }
            organizations={organizations}
            profile={defaultProfile}
            catalog={catalog}
            onSave={handleSaveInvoice}
            onCancel={() => {
              setIsEditorOpen(false);
              setEditingInvoice(null);
              setPreselectedOrgId(null);
            }}
            onRefreshOrgs={fetchAllData}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                invoices={invoices}
                organizations={organizations}
                profile={defaultProfile}
                onNewInvoice={() => handleNewInvoice()}
                onViewInvoices={() => setCurrentTab('invoices')}
                onViewOrganizations={() => {
                  setActiveOrgId(null);
                  setCurrentTab('organizations');
                }}
                onSelectInvoice={(inv) => {
                  setEditingInvoice(inv);
                  setIsEditorOpen(true);
                }}
                onSelectOrg={handleSelectOrg}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoiceList
                invoices={invoices}
                organizations={organizations}
                profile={defaultProfile}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onDuplicate={handleDuplicateInvoice}
                onStatusChange={handleStatusChange}
                onNewInvoice={() => handleNewInvoice()}
                onSelectOrg={handleSelectOrg}
              />
            )}

            {currentTab === 'organizations' && (
              <Organizations
                organizations={organizations}
                invoices={invoices}
                profile={defaultProfile}
                onRefresh={fetchAllData}
                onNewInvoiceForOrg={(orgId) => handleNewInvoice(orgId)}
                onEditInvoice={handleEditInvoice}
                initialOrgId={activeOrgId}
                onSelectOrgId={setActiveOrgId}
              />
            )}

            {currentTab === 'automations' && (
              <div className="p-8 max-w-7xl mx-auto">
                <Automations
                  organizations={organizations}
                  onViewInvoice={(_invId) => {
                    fetchAllData().then(() => setCurrentTab('invoices'));
                  }}
                  onRefreshInvoices={fetchAllData}
                />
              </div>
            )}

            {currentTab === 'catalog' && (
              <ItemsCatalog catalog={catalog} onRefresh={fetchAllData} />
            )}

            {currentTab === 'settings' && settings && (
              <Settings
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onRefresh={fetchAllData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
