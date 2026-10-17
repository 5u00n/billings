import React, { useState } from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Building2,
  Package,
  Settings,
  Plus,
  ShieldCheck,
  Repeat,
  Layers,
  Receipt,
  Wallet,
  ArrowLeftRight,
  Target,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  X,
  Landmark,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export type NavTab =
  | 'dashboard'
  | 'invoices'
  | 'organizations'
  | 'automations'
  | 'catalog'
  | 'budget'
  | 'expenses'
  | 'income'
  | 'borrow'
  | 'goals'
  | 'tax'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onNewInvoice: () => void;
  orgCount: number;
  invoiceCount: number;
  expenseCount?: number;
  pendingLoansCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onNewInvoice,
  orgCount,
  invoiceCount,
  expenseCount,
  pendingLoansCount,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Internal collapse state if not provided externally
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    try {
      return localStorage.getItem('billings_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (externalOnToggleCollapse) {
      externalOnToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('billings_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  const navSections = [
    {
      title: 'Overview',
      items: [
        {
          id: 'dashboard' as NavTab,
          label: 'Dashboard',
          icon: LayoutDashboard,
          color: 'text-blue-500',
        },
      ],
    },
    {
      title: 'Client Billing',
      items: [
        {
          id: 'invoices' as NavTab,
          label: 'Invoices & Bills',
          icon: ReceiptText,
          color: 'text-emerald-500',
          count: invoiceCount,
        },
        {
          id: 'organizations' as NavTab,
          label: 'Organizations',
          icon: Building2,
          color: 'text-amber-500',
          count: orgCount,
        },
        {
          id: 'automations' as NavTab,
          label: 'Automations',
          icon: Repeat,
          color: 'text-violet-400',
        },
        {
          id: 'catalog' as NavTab,
          label: 'Items & Rates',
          icon: Package,
          color: 'text-purple-500',
        },
      ],
    },
    {
      title: 'Personal Finance',
      items: [
        {
          id: 'budget' as NavTab,
          label: 'Budget & Allocations',
          icon: Layers,
          color: 'text-indigo-400',
        },
        {
          id: 'expenses' as NavTab,
          label: 'Expense Ledger',
          icon: Receipt,
          color: 'text-rose-400',
          count: expenseCount,
        },
        {
          id: 'income' as NavTab,
          label: 'Income Streams',
          icon: Wallet,
          color: 'text-emerald-400',
        },
        {
          id: 'borrow' as NavTab,
          label: 'Loans & Debts',
          icon: ArrowLeftRight,
          color: 'text-amber-400',
          count: pendingLoansCount,
        },
        {
          id: 'goals' as NavTab,
          label: 'Goals & Assets',
          icon: Target,
          color: 'text-cyan-400',
        },
      ],
    },
    {
      title: 'Indian Compliance',
      items: [
        {
          id: 'tax' as NavTab,
          label: 'Tax & Current A/C',
          icon: Landmark,
          color: 'text-amber-500',
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'settings' as NavTab,
          label: 'Profile & Setup',
          icon: Settings,
          color: 'text-slate-400',
        },
      ],
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-2xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'bg-slate-950 text-slate-300 flex flex-col justify-between h-screen shrink-0 no-print select-none border-r border-slate-800/80 transition-all duration-300 ease-in-out',
          // Desktop sizing
          isCollapsed ? 'md:w-20' : 'md:w-64',
          // Mobile responsive placement
          'fixed inset-y-0 left-0 z-50 md:static w-72',
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-800/60 flex items-center justify-between min-h-[65px] shrink-0">
            <div className={cn('flex items-center gap-3 overflow-hidden', isCollapsed && 'md:justify-center md:w-full')}>
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-xs shrink-0">
                H
              </div>
              <div className={cn('transition-opacity duration-200 overflow-hidden', isCollapsed ? 'md:hidden' : 'block')}>
                <h2 className="text-sm font-bold text-white tracking-tight truncate">Suren Billings</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">Financial Suite</span>
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={handleToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors',
                isCollapsed && 'absolute right-[-14px] top-6 bg-slate-900 border border-slate-700 shadow-md z-10 w-7 h-7 items-center justify-center rounded-full'
              )}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-300" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="p-3 shrink-0">
            <Button
              onClick={() => {
                onNewInvoice();
                if (onCloseMobile) onCloseMobile();
              }}
              title={isCollapsed ? 'Create New Bill' : undefined}
              className={cn(
                'w-full justify-center bg-blue-600 hover:bg-blue-500 text-white shadow-xs text-xs font-semibold h-9 rounded-lg transition-colors',
                isCollapsed ? 'md:px-0 md:w-10 md:h-10 md:mx-auto' : 'gap-2'
              )}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className={cn(isCollapsed ? 'md:hidden' : 'inline')}>Create New Bill</span>
            </Button>
          </div>

          {/* Navigation Section with Scroll */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 transition-opacity',
                    isCollapsed ? 'md:hidden' : 'block'
                  )}
                >
                  {sec.title}
                </div>
                <nav className="space-y-0.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                          'w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer relative',
                          isCollapsed
                            ? 'md:justify-center md:px-0 md:py-2.5 px-3 py-2 justify-between'
                            : 'px-3 py-2 justify-between',
                          isActive
                            ? 'bg-slate-800 text-white font-semibold shadow-xs'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        )}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <Icon className={cn('w-4 h-4 shrink-0 transition-transform group-hover:scale-110', item.color)} />
                          <span className={cn('truncate', isCollapsed ? 'md:hidden' : 'inline')}>
                            {item.label}
                          </span>
                        </div>

                        {item.count !== undefined && item.count > 0 && (
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0',
                              isCollapsed ? 'md:hidden' : 'inline-block',
                              isActive
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-slate-800/80 text-slate-400'
                            )}
                          >
                            {item.count}
                          </span>
                        )}

                        {/* Dot indicator when collapsed */}
                        {isCollapsed && item.count !== undefined && item.count > 0 && (
                          <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-blue-400 absolute right-2 top-2" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Footer Info & Theme Switcher */}
          <div className="p-3 border-t border-slate-800/60 bg-slate-950/60 space-y-2 shrink-0">
            {/* Theme Switcher Toggle */}
            <div
              className={cn(
                'p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs',
                isCollapsed && 'md:p-1 md:justify-center'
              )}
            >
              <div className={cn('flex items-center gap-1.5 px-1 text-[11px] font-medium text-slate-400', isCollapsed && 'md:hidden')}>
                {resolvedTheme === 'dark' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light Mode</span>
                  </>
                )}
              </div>

              {/* 3-mode switch */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800/80">
                <button
                  onClick={() => setTheme('light')}
                  title="Light Mode"
                  className={cn(
                    'p-1 rounded-md transition-colors',
                    theme === 'light' ? 'bg-slate-800 text-amber-300 shadow-2xs' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  title="Dark Mode"
                  className={cn(
                    'p-1 rounded-md transition-colors',
                    theme === 'dark' ? 'bg-slate-800 text-blue-400 shadow-2xs' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  title="System Mode"
                  className={cn(
                    'p-1 rounded-md transition-colors',
                    theme === 'system' ? 'bg-slate-800 text-slate-200 shadow-2xs' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Verification Badge */}
            <div
              className={cn(
                'flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs',
                isCollapsed && 'md:hidden'
              )}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-[11px] font-semibold text-slate-200 truncate">Udyam Verified</div>
                  <div className="text-[9px] text-slate-400 truncate">Non-GST Small Entity</div>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono shrink-0">
                Active
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
