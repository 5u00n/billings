import React from 'react';
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
  Sun,
  Moon,
  Laptop,
  LogOut,
  PieChart,
  BarChart3,
  HandCoins,
  FileSpreadsheet,
  Landmark,
} from 'lucide-react';
import {
  Sidebar as ShadcnSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'invoices'
  | 'organizations'
  | 'automations'
  | 'catalog'
  | 'budget'
  | 'spreadsheet'
  | 'income'
  | 'returns'
  | 'expenses'
  | 'borrow'
  | 'allocations'
  | 'compare'
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
  onCloseMobile,
}) => {
  const { theme, setTheme } = useTheme();
  const { user, signOutUser } = useAuth();
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar();

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (isMobile) {
      setOpenMobile(false);
    }
    if (onCloseMobile) {
      onCloseMobile();
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
          color: 'text-violet-500',
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
          label: 'Budget Overview',
          icon: PieChart,
          color: 'text-indigo-500',
        },
        {
          id: 'spreadsheet' as NavTab,
          label: 'Excel Spreadsheet',
          icon: FileSpreadsheet,
          color: 'text-blue-500',
        },
        {
          id: 'income' as NavTab,
          label: 'Income Streams',
          icon: Wallet,
          color: 'text-emerald-500',
        },
        {
          id: 'returns' as NavTab,
          label: 'Returns (Repaid)',
          icon: HandCoins,
          color: 'text-teal-500',
        },
        {
          id: 'expenses' as NavTab,
          label: 'Expense Ledger',
          icon: Receipt,
          color: 'text-rose-500',
          count: expenseCount,
        },
        {
          id: 'borrow' as NavTab,
          label: 'Loans & Debts',
          icon: ArrowLeftRight,
          color: 'text-amber-500',
          count: pendingLoansCount,
        },
        {
          id: 'allocations' as NavTab,
          label: 'Allocation Envelopes',
          icon: Layers,
          color: 'text-purple-500',
        },
        {
          id: 'compare' as NavTab,
          label: 'Period Comparison',
          icon: BarChart3,
          color: 'text-sky-500',
        },
        {
          id: 'goals' as NavTab,
          label: 'Goals & Assets',
          icon: Target,
          color: 'text-cyan-500',
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

  return (
    <ShadcnSidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar transition-colors">
      {/* Sidebar Header */}
      <SidebarHeader className="p-3 border-b border-sidebar-border space-y-2.5">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2.5 overflow-hidden group-data-[collapsible=icon]:hidden">
            <img
              src="/icons/finance.svg"
              alt="Billings logo"
              className="w-8 h-8 rounded-lg shadow-xs shrink-0 object-contain"
            />
            <div className="flex flex-col overflow-hidden select-none">
              <span className="font-extrabold text-sm text-sidebar-foreground tracking-tight leading-tight truncate">
                Billings & Expenses
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-medium truncate">
                Financial Operations Console
              </span>
            </div>
          </div>
          {/* <SidebarTrigger
            className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg cursor-pointer transition-colors"
            title="Toggle Sidebar (Ctrl+B)"
          /> */}
        </div>

        {/* Quick Action: New Bill */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="default"
              tooltip="Create New Bill"
              onClick={() => {
                onNewInvoice();
                if (isMobile) setOpenMobile(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-2 group-data-[collapsible=icon]:justify-center cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Create New Bill</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Sidebar Navigation Groups */}
      <SidebarContent className="px-1.5 py-2">
        {navSections.map((group) => (
          <SidebarGroup key={group.title} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none group-data-[collapsible=icon]:hidden">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = currentTab === item.id;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        onClick={() => handleNavClick(item.id)}
                        className={cn(
                          'cursor-pointer text-xs font-medium rounded-lg transition-colors',
                          isActive
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border-l-2 border-blue-600 dark:border-blue-400 pl-2'
                            : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
                        )}
                      >
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-600 dark:text-blue-400' : item.color)} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.count !== undefined && item.count > 0 && (
                        <SidebarMenuBadge className="text-[10px] font-mono group-data-[collapsible=icon]:hidden">
                          {item.count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-2">
        {/* Collapsed view footer icons with native shadcn tooltips */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-1.5 w-full">
          {user && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={`User: ${user.email}`}
                  className="w-8 h-8 p-0 justify-center rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                    {(user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={`Theme: ${theme} (click to toggle)`}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-8 h-8 p-0 justify-center rounded-lg text-muted-foreground hover:text-sidebar-foreground cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-blue-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Udyam Verified Active"
                className="w-8 h-8 p-0 justify-center rounded-lg text-emerald-600 dark:text-emerald-400"
              >
                <ShieldCheck className="w-4 h-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {user && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sign Out"
                  onClick={signOutUser}
                  className="w-8 h-8 p-0 justify-center rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </div>

        {/* Expanded view footer */}
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
          {/* User Status Bar */}
          {user && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                  {(user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sidebar-foreground truncate text-[11px]">
                    {user.email || 'User'}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    Single-User Pro
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={signOutUser}
                title="Sign Out"
                className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Theme Switcher Segmented Control */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-sidebar-accent/50 border border-sidebar-border text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground pl-1">
              {theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dark</span>
                </>
              ) : theme === 'system' ? (
                <>
                  <Laptop className="w-3.5 h-3.5 text-slate-500" />
                  <span>System</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-0.5 bg-sidebar p-0.5 rounded border border-sidebar-border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTheme('light')}
                title="Light Mode"
                className={cn(
                  'h-5 w-5 p-0 rounded cursor-pointer',
                  theme === 'light' ? 'bg-amber-100 text-amber-700 font-bold' : 'text-muted-foreground hover:text-sidebar-foreground'
                )}
              >
                <Sun className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTheme('dark')}
                title="Dark Mode"
                className={cn(
                  'h-5 w-5 p-0 rounded cursor-pointer',
                  theme === 'dark' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-muted-foreground hover:text-sidebar-foreground'
                )}
              >
                <Moon className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTheme('system')}
                title="System Mode"
                className={cn(
                  'h-5 w-5 p-0 rounded cursor-pointer',
                  theme === 'system' ? 'bg-accent text-accent-foreground font-bold' : 'text-muted-foreground hover:text-sidebar-foreground'
                )}
              >
                <Laptop className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Udyam Badge */}
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 text-xs">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 truncate">
                Udyam Verified
              </span>
            </div>
            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded font-mono font-medium shrink-0">
              Active
            </span>
          </div>
        </div>
      </SidebarFooter>

      {/* Official shadcn SidebarRail */}
      <SidebarRail />
    </ShadcnSidebar>
  );
};
