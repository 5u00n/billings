# Architecture & Design System Guide: React + Vite (Billings & Expenses)

## 1. Executive Summary & Context

This project is a multi-domain financial web application comprising **Invoicing**, **Budget & Expense Tracking**, **Tax Management**, **Borrowing Accounts**, and **Multi-Organization Management**, backed by Cloudflare D1/SQLite and Express.

Currently, the frontend lives primarily under `src/components/`, where top-level pages, nested views, modal dialogs, and raw styled elements are mixed together. In addition, imports rely on fragile relative paths (`../../lib/utils`), and UI components range from shadcn-like primitives to bespoke inline Tailwind markup.

This guide outlines:
1. **The Optimal Feature-Driven (Vertical Slice) Directory Structure** for long-term scalability and clean domain boundaries.
2. **A Strict Component Governance Policy**: Restricting **all UI** exclusively to **shadcn/ui** (functional primitives) and **Aceternity UI** (motion, animated cards, visual accents).
3. **Step-by-step Setup & Migration Blueprint** tailored for React 19, Vite 8, and Tailwind CSS v4.

---

## 2. Optimal File Structure: Feature-Driven (Vertical Slice) Architecture

Rather than grouping files strictly by technical role (e.g. putting all components in `components/`, all hooks in `hooks/`, all API calls in `api/`), complex financial systems scale best using **Feature-Driven / Vertical Slice Architecture** (also known as Bulletproof React).

### 2.1 Target Directory Layout

```text
src/
├── app/                           # App initialization, routing shell, global providers
│   ├── App.tsx                    # Root layout & tab router dispatcher
│   ├── main.tsx                   # ReactDOM entrypoint
│   └── providers.tsx              # Composed providers (Auth, Theme, Router, Query)
│
├── components/                    # GLOBAL / SHARED presentation components ONLY
│   ├── ui/                        # shadcn/ui atomic primitives (Button, Dialog, Input, Table...)
│   ├── aceternity/                # Aceternity UI components (BentoGrid, Spotlight, Beams...)
│   ├── layout/                    # Layout shell (Sidebar, Navbar, MobileNav, PageHeader)
│   └── feedback/                  # Global status banners (OfflineStatusBanner, ErrorBoundary)
│
├── features/                      # DOMAIN SLICES (Vertical Slices)
│   ├── auth/                      # Authentication & session
│   │   ├── components/            # LoginForm, PasswordResetModal
│   │   ├── pages/                 # LoginPage
│   │   └── hooks/                 # useAuthActions
│   │
│   ├── invoices/                  # Invoicing domain
│   │   ├── components/            # InvoiceEditor, InvoiceList, InvoicePreview, InvoicePdfDocument
│   │   ├── hooks/                 # useInvoices, useInvoiceTotals, useUpiPayment
│   │   ├── services/              # invoiceApi.ts
│   │   ├── utils/                 # pdfExport.ts, upiQr.ts, docxExport.ts, numberToWords.ts
│   │   └── types/                 # invoice.types.ts
│   │
│   ├── budget/                    # Budgeting, Cashflow & Debt domain
│   │   ├── components/            # BudgetPacingBar, MonthlyBreakdown, IncomeView, ExpenseLogView...
│   │   ├── pages/                 # BudgetDashboard, ExpensePage, IncomePage, BorrowPage, GoalsPage...
│   │   ├── hooks/                 # useBudgetSummary, useBorrowingAccounts
│   │   ├── services/              # budgetApi.ts, borrowingApi.ts
│   │   ├── utils/                 # budgetMonth.ts, borrowingCalculations.ts
│   │   └── types/                 # budget.types.ts, borrowing.types.ts
│   │
│   ├── tax/                       # Tax, TDS, GST & Compliance domain
│   │   ├── components/            # SbiStatementParserModal, SbiPpsChequeModal, TaxDossierView...
│   │   ├── pages/                 # TaxPortal, TaxAuditPage
│   │   ├── utils/                 # taxCalculator.ts, sbiParser.ts
│   │   └── types/                 # tax.types.ts
│   │
│   ├── organizations/             # Multi-tenant organization directory
│   │   ├── components/            # OrgCard, OrgSettingsForm
│   │   ├── pages/                 # OrganizationsPage, OrganizationDetailPage
│   │   └── types/                 # organization.types.ts
│   │
│   ├── catalog/                   # Items & price inventory
│   │   ├── components/            # ItemModal, CatalogTable
│   │   └── pages/                 # ItemsCatalogPage
│   │
│   └── automations/               # Scheduled workflows & webhook triggers
│       └── pages/                 # AutomationsPage
│
├── context/                       # App-wide React contexts
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── RouterContext.tsx
│
├── hooks/                         # Global generic utilities (useMediaQuery, useDebounce, useLocalStorage)
├── lib/                           # Third-party SDK instances & shared primitives
│   ├── utils.ts                   # cn() helper (clsx + tailwind-merge)
│   ├── firebase.ts                # Firebase auth client instance
│   ├── authFetch.ts               # Authenticated API fetch wrapper
│   └── offlineCache.ts            # Local cache / IndexedDB / ServiceWorker bridge
│
├── types/                         # Cross-domain / Shared models (ApiResponses, Common)
│   └── common.types.ts
│
└── styles/
    └── index.css                  # Tailwind v4 theme, animations & root design tokens
```

### 2.2 Why this is optimal for this application

1. **High Colocation (Locality of Behavior)**:
   - When modifying an Invoice calculation or export feature, everything needed (`invoice.types.ts`, `pdfExport.ts`, `InvoiceEditor.tsx`, `invoiceApi.ts`) is inside `src/features/invoices/`. No hopping across 5 root directories.
2. **Clear Page vs Component Separation**:
   - `pages/` represent full-view screens mounted by the router (e.g. `BudgetDashboard`, `ExpensePage`).
   - `components/` inside a feature represent domain sub-widgets (e.g. `BudgetPacingBar`, `BorrowReturnsView`).
3. **Clean Global Boundary**:
   - `src/components/` contains **strictly agnostic** UI building blocks. A developer knows immediately: if a component knows what an "Invoice" or "Tax Assessment" is, it **never** belongs in `src/components/`.

---

## 3. Strict UI Governance: shadcn/ui + Aceternity UI Only

### 3.1 Division of Responsibilities

| Role | Library | Placement | Examples |
| :--- | :--- | :--- | :--- |
| **Functional Primitives** | **shadcn/ui** | `src/components/ui/` | `Button`, `Input`, `Dialog`, `Select`, `DropdownMenu`, `Tabs`, `Table`, `Badge`, `Card`, `Sheet`, `Tooltip`, `Popover` |
| **Motion & Visual Accents** | **Aceternity UI** | `src/components/aceternity/` | `BentoGrid`, `CardSpotlight`, `HoverBorderGradient`, `BackgroundBeams`, `Sparkles`, `MovingBorder`, `AnimatedTooltip` |
| **Domain Composition** | **Feature Components** | `src/features/*/components/` | Composed exclusively from the two layers above. **No raw unstyled HTML elements.** |

### 3.2 The Golden Rules

1. **No Bare Primitives**:
   - ❌ Never write `<button className="...">` → Use `<Button variant="..." size="...">` from `src/components/ui/button`.
   - ❌ Never write `<input className="...">` → Use `<Input />` from `src/components/ui/input`.
   - ❌ Never write `<div className="rounded-xl border bg-white p-4 shadow">` → Use `<Card>`, `<CardHeader>`, `<CardContent>`.
   - ❌ Never write raw unstyled HTML dialogs or modals → Use `<Dialog>` or `<Sheet>`.
   - ❌ Never write raw `<table>` with inline borders → Use `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>`.

2. **Accessibility & Form Controls Belongs to shadcn/ui**:
   - Aceternity components should **never** be used to replicate form inputs, dropdowns, or accessible popovers. Aceternity provides **motion, card wrappers, hero banners, and background accents**. Forms, tables, and modal interactions must rely on shadcn (Radix primitives) for full ARIA, keyboard navigation, and focus traps.

3. **Motion & High-Impact Presentation Belongs to Aceternity UI**:
   - Financial dashboards can look dense and dry. Aceternity UI is utilized for:
     - **Dashboard Summary / KPI cards**: `<BentoGrid>` with `<CardSpotlight>` or `<HoverBorderGradient>`.
     - **Organization Switcher / Overview**: `<CardHoverEffect>` for org cards.
     - **Authentication / Login Screen**: `<BackgroundBeams>` or `<Vortex>` behind the login box.
     - **Primary Call-to-Actions** (e.g. "Create Invoice", "Generate Tax Dossier"): `<MovingBorder>` or `<HoverBorderGradient>`.
     - **Team / Contributor Avatars**: `<AnimatedTooltip>`.

---

## 4. Component Mapping Matrix for Billings & Expenses

| Feature Screen | UI Requirements | Recommended shadcn/ui Components | Recommended Aceternity UI Components |
| :--- | :--- | :--- | :--- |
| **Dashboard** | Metrics, Quick Actions, Recent Invoices, Cashflow Pacing | `Card`, `Badge`, `Table`, `Button`, `Tabs` | `BentoGrid`, `BentoGridItem`, `CardSpotlight` |
| **Invoices** | Editor, Status filters, Item table, PDF export, Payment QR | `Dialog`, `Table`, `Input`, `Select`, `DropdownMenu`, `Badge`, `Button` | `HoverBorderGradient` (Export CTA) |
| **Budget & Borrowing** | Month tabs, Account balances, Ledger, Add Expense modal | `Tabs`, `Dialog`, `Input`, `Select`, `Table`, `Card`, `Badge`, `Progress` | `CardSpotlight` (for Debt Accounts), `BackgroundGradient` |
| **Tax Portal** | Document parser modal, Cheque checklist, Dossier export | `Dialog`, `Tabs`, `Table`, `Checkbox`, `Alert`, `Accordion`, `Button` | `HoverBorderGradient`, `Spotlight` |
| **Organizations** | Org cards, Client selector, GST info | `Card`, `Avatar`, `Button`, `DropdownMenu`, `Dialog` | `CardHoverEffect` |
| **Auth / Login** | Login form, Google Auth, Reset password | `Card`, `Input`, `Label`, `Button` | `BackgroundBeams` or `SparklesCore` |

---

## 5. Technical Implementation Details (React 19 + Tailwind v4 + Vite)

### 5.1 Required Dependencies

To support shadcn/ui (Radix primitives) and Aceternity UI (Framer Motion), add the following packages:

```bash
npm install framer-motion @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-slot class-variance-authority
```

### 5.2 Configure Path Aliases (`@/*`)

To eliminate fragile relative paths like `../../lib/utils`, configure `@/*` pointing to `src/*`.

#### In `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### In `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
```

### 5.3 Tailwind CSS v4 Theme & Aceternity Animations (`src/index.css`)

Tailwind v4 handles keyframes and utilities via `@theme` directly in CSS. Aceternity UI components require custom animation declarations:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Aceternity UI Animations */
  --animate-spotlight: spotlight 2s ease .75s 1 forwards;
  --animate-shimmer: shimmer 2s linear infinite;
  --animate-border-beam: border-beam calc(var(--duration)*1s) infinite linear;

  @keyframes spotlight {
    0% {
      opacity: 0;
      transform: translate(-72%, -62%) scale(0.5);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -40%) scale(1);
    }
  }

  @keyframes shimmer {
    from {
      background-position: 0 0;
    }
    to {
      background-position: -200% 0;
    }
  }
}
```

---

## 6. Component Directory Standards

### 6.1 `src/components/ui/` (shadcn primitives)
Every file in this folder:
- Is completely domain-agnostic.
- Exports standard variants via `cva` or structured Tailwind classes.
- Uses `cn()` from `@/lib/utils`.
- Example list to maintain:
  - `button.tsx`
  - `input.tsx`
  - `card.tsx`
  - `dialog.tsx`
  - `select.tsx`
  - `table.tsx`
  - `tabs.tsx`
  - `badge.tsx`
  - `dropdown-menu.tsx`
  - `tooltip.tsx`
  - `sheet.tsx`

### 6.2 `src/components/aceternity/` (Visual & Motion components)
Every file in this folder:
- Uses `framer-motion` for fluid GPU-accelerated motion.
- Is self-contained and accepts children or content arrays.
- Respects `dark:` mode and prefers reduced motion.
- Example list to maintain:
  - `bento-grid.tsx`
  - `card-spotlight.tsx`
  - `hover-border-gradient.tsx`
  - `background-beams.tsx`
  - `card-hover-effect.tsx`
  - `moving-border.tsx`

---

## 7. Migration Roadmap

To migrate safely without breaking the production application:

1. **Phase 1: Tooling & Aliases (Zero Risk)**
   - Update `vite.config.ts` and `tsconfig.json` with `@/*`.
   - Install `framer-motion`, `@radix-ui/react-slot`, `class-variance-authority`.
   - Add Aceternity keyframes to `src/index.css`.

2. **Phase 2: Establish the UI Layer (`src/components/ui` & `src/components/aceternity`)**
   - Place required shadcn primitives (`table.tsx`, `dialog.tsx`, `select.tsx`, `tabs.tsx`).
   - Add target Aceternity components (`bento-grid.tsx`, `card-spotlight.tsx`, `hover-border-gradient.tsx`).

3. **Phase 3: Domain Restructuring (Incremental by Feature)**
   - Move `budget/` into `src/features/budget/` (colocate utils and types).
   - Move `tax/` into `src/features/tax/`.
   - Move `Invoice*.tsx` into `src/features/invoices/`.
   - Replace any inline raw HTML buttons/inputs with the standardized `@/components/ui` primitives.

4. **Phase 4: Visual Polish with Aceternity**
   - Wrap the `Dashboard.tsx` key cards in `<BentoGrid>` & `<CardSpotlight>`.
   - Wrap the `LoginPage.tsx` in `<BackgroundBeams>`.
   - Use `<HoverBorderGradient>` on primary invoice creation and report download actions.

