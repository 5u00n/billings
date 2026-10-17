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
import { BudgetDashboard } from './components/budget/BudgetDashboard';
import { ExpensePage } from './components/budget/ExpensePage';
import { IncomePage } from './components/budget/IncomePage';
import { BorrowPage } from './components/budget/BorrowPage';
import { ReturnsPage } from './components/budget/ReturnsPage';
import { SpreadsheetPage } from './components/budget/SpreadsheetPage';
import { AllocationsPage } from './components/budget/AllocationsPage';
import { GoalsPage } from './components/budget/GoalsPage';
import { TaxPortal } from './components/tax/TaxPortal';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { Menu, Sun, Moon, Plus } from 'lucide-react';
import { Button } from './components/ui/button';

export const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { route, navigate, tabToPath } = useRouter();
  const currentTab = route.tab;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Responsive Sidebar States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('billings_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Editor State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [preselectedOrgId, setPreselectedOrgId] = useState<string | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Sync route parameters with state (e.g. /invoices/new, /invoices/:id, /organizations/:id)
  useEffect(() => {
    if (route.tab === 'invoices') {
      if (route.paramId === 'new') {
        setEditingInvoice(null);
        setIsEditorOpen(true);
      } else if (route.paramId && invoices.length > 0) {
        const found = invoices.find(
          (inv) => inv.id === route.paramId || inv.invoice_number === route.paramId
        );
        if (found) {
          setEditingInvoice(found);
          setIsEditorOpen(true);
        }
      } else if (!route.paramId) {
        setIsEditorOpen(false);
        setEditingInvoice(null);
      }
    } else if (route.tab === 'organizations') {
      if (route.paramId) {
        setActiveOrgId(route.paramId);
      }
    } else {
      // If navigated away from invoices tab, close editor
      if (isEditorOpen) {
        setIsEditorOpen(false);
        setEditingInvoice(null);
      }
    }
  }, [route.tab, route.paramId, invoices]);

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
    navigate('/invoices/new');
  };

  const handleSelectOrg = (orgId: string) => {
    setActiveOrgId(orgId);
    navigate(`/organizations/${orgId}`);
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setIsEditorOpen(true);
    navigate(`/invoices/${inv.id}`);
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
    navigate('/invoices/new');
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingInvoice(null);
    setPreselectedOrgId(null);
    if (route.path.startsWith('/invoices')) {
      navigate('/invoices');
    }
  };

  const handleSaveInvoice = async (invoiceData: Partial<Invoice>) => {
    try {
      let res: Response;
      if (invoiceData.id && editingInvoice && editingInvoice.id === invoiceData.id) {
        res = await fetch(`/api/invoices/${invoiceData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData),
        });
      } else {
        res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error (${res.status})`);
      }

      setIsEditorOpen(false);
      setEditingInvoice(null);
      await fetchAllData();
      navigate('/invoices');
    } catch (err: any) {
      console.error('Failed to save invoice:', err);
      alert(`Failed to save invoice: ${err.message || 'Please check the server logs.'}`);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      await fetchAllData();
      if (route.path === `/invoices/${id}`) {
        navigate('/invoices');
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) return;

      const updated = {
        ...inv,
        status: newStatus,
        amount_paid: newStatus === 'paid' ? inv.total : inv.amount_paid,
        balance_due: newStatus === 'paid' ? 0 : inv.total,
      };

      await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      await fetchAllData();
    } catch (err) {
      console.error('Failed to update invoice status:', err);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      await fetchAllData();
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

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
    accountType: 'Current Account',
    accountNumber: '45661497562',
    ifscCode: 'SBIN0014355',
    accountHolder: 'Suren Hembram',
    upiId: '',
    showBankDetailsOnBill: true,
    showUpiOnBill: true,
    showQrOnBill: true,
    defaultNotes: 'Thanks for your business.',
    defaultTerms: 'Due on Receipt',
    signatureText: 'Authorized Signature',
  };

  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Executive Overview';
      case 'invoices':
        return 'Invoices & Billing';
      case 'organizations':
        return 'Client Organizations';
      case 'budget':
        return 'Budget Overview';
      case 'spreadsheet':
        return 'Multi-Month Spreadsheet';
      case 'returns':
        return 'Returns (Money Repaid to Me)';
      case 'allocations':
        return '100% Allocation Envelopes';
      case 'expenses':
        return 'Expense Ledger';
      case 'income':
        return 'Personal Income Streams';
      case 'borrow':
        return 'Loans & Debts';
      case 'goals':
        return 'Financial Goals';
      case 'tax':
        return 'Tax Compliance Portal';
      case 'automations':
        return 'Recurring Schedules';
      case 'catalog':
        return 'Items & Rates';
      case 'settings':
        return 'Settings & Profile';
      default:
        return 'Billings';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white text-xl shadow-lg mb-4 animate-pulse">
          H
        </div>
        <div className="text-sm font-semibold tracking-wide text-white">Suren Billings</div>
        <div className="text-xs text-slate-500 mt-1">Securing financial session...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Sidebar */}
      {!isEditorOpen && (
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'organizations') setActiveOrgId(null);
            navigate(tabToPath(tab));
          }}
          onNewInvoice={() => handleNewInvoice()}
          orgCount={organizations.length}
          invoiceCount={invoices.length}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => {
            const next = !isSidebarCollapsed;
            setIsSidebarCollapsed(next);
            try {
              localStorage.setItem('billings_sidebar_collapsed', String(next));
            } catch {}
          }}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Top Header (only visible on < md) */}
        {!isEditorOpen && (
          <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between no-print shrink-0 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-xs">
                  H
                </div>
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {getTabTitle(currentTab)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                title="Toggle Theme"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-500" />
                )}
              </button>
              <Button
                size="sm"
                onClick={() => handleNewInvoice()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bill</span>
              </Button>
            </div>
          </header>
        )}

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
              onCancel={handleCloseEditor}
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
                  onViewInvoices={() => navigate('/invoices')}
                  onViewOrganizations={() => {
                    setActiveOrgId(null);
                    navigate('/organizations');
                  }}
                  onSelectInvoice={(inv) => handleEditInvoice(inv)}
                  onSelectOrg={handleSelectOrg}
                  onNavigate={(tab) => navigate(tabToPath(tab))}
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

              {currentTab === 'budget' && (
                <BudgetDashboard profile={defaultProfile} />
              )}

              {currentTab === 'spreadsheet' && (
                <SpreadsheetPage profile={defaultProfile} />
              )}

              {currentTab === 'returns' && (
                <ReturnsPage />
              )}

              {currentTab === 'allocations' && (
                <AllocationsPage />
              )}

              {currentTab === 'expenses' && (
                <ExpensePage />
              )}

              {currentTab === 'income' && (
                <IncomePage />
              )}

              {currentTab === 'borrow' && (
                <BorrowPage />
              )}

              {currentTab === 'goals' && (
                <GoalsPage />
              )}

              {currentTab === 'tax' && (
                <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
                  <TaxPortal profile={defaultProfile} />
                </div>
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
                  onSelectOrgId={(orgId) => {
                    setActiveOrgId(orgId);
                    if (orgId) {
                      navigate(`/organizations/${orgId}`);
                    } else {
                      navigate('/organizations');
                    }
                  }}
                />
              )}

              {currentTab === 'automations' && (
                <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
                  <Automations
                    organizations={organizations}
                    onViewInvoice={(_invId) => {
                      fetchAllData().then(() => navigate('/invoices'));
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
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
