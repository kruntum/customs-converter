---
name: currency-test-core
description: Core business logic, architecture, and styling rules for the Currency-Test project. Use this when you are tasked to modify anything related to transactions, treasury, database schema, or UI styling.
---

# Currency-Test Core Rules

Detailed instructions and rules for agents working on the Currency-Test project.

## When to use this skill

- Use this when modifying the database schema (`schema.prisma`).
- Use this when creating or updating UI components, especially forms and dialogues.
- Use this when touching business logic in `server/routes/` or state management in `src/stores/`.
- This is helpful for avoiding common pitfalls with Prisma Decimals and TailwindCSS styling overlaps.

## Core Business Logic (The 2-Track System)

The system handles export transactions and foreign currency reconciliation based on a **per-receipt FCY wallet** model. It NEVER pools money together for average costing.

### Track 1: Accounting (Transaction & Allocation)

- **Transactions (ใบขนสินค้า)**: Represents goods exported. Has an `exchangeRate` based on the BOT rate on the `rateDate`. Has a `thbAmount` (expected revenue).
- **Receipts (รับเงิน)**: Represents incoming foreign wire transfers. Has an `receivedBotRate` for the day the money landed.
- **Payment Allocation (ตัดชำระ)**: Links a Receipt to a Transaction.
  - **FX Layer 1 (Accounting Gain/Loss)** is calculated here: `THB Received - THB Expected`

### Track 2: Treasury (FCY Wallets & Exchange)

- **FCY Wallets**: Every `Receipt` acts as its own distinct Wallet. It tracks `receivedFcy`, `exchangedFcy`, and the remaining balance. The _cost rate_ of the wallet is strictly the `receivedBotRate` of that specific receipt.
- **Exchange (ขายเงินธนาคาร)**: When the company sells FCY to the bank, they pull from a specific `Receipt` wallet.
  - **FX Layer 2 (Realized Treasury Gain/Loss)** is calculated here: `(Actual Bank Rate - Receipt's Cost Rate) * FCY Exchanged Amount`

**CRITICAL RULE**: Do not attempt to calculate an "average cost" across all FCY holding pools. The system was explicitly refactored AWAY from this model to a per-receipt wallet model for precise P/L tracking.

## Database & Prisma Rules

- **Decimal Fields**: Financial fields (e.g., `amountFcy`, `thbAmount`, `exchangeRate`) use `Decimal` type in Prisma (`db.Decimal`).
  - **WARNING**: When fetching Decimal fields via API to the frontend, they serialization to `string` in JSON.
  - **Frontend Type Safety**: Interface types for these fields in Zustand stores MUST account for `string | number`. Do not blindly type them as `number`. Use `Number()` or `parseFloat()` safely before math operations on the frontend.
- **Prisma Constraints**: Prisma cannot compare two columns directly in a `where` clause (e.g., `receivedFcy: { gt: prisma.receipt.fields.exchangedFcy }` will throw an error). You must fetch the records and filter them in memory/JS or use `$queryRaw`.

## Authentication & Security Rules

- **Better Auth Framework**: Global authentication is managed by `better-auth`.
- **CompanyLevel RBAC (`CompanyUser`)**: Access to company data (transactions, customers, wallets) is strictly governed by the `companyUser` bridging table.
- **Middleware**: If modifying backend routes relating to company data, MUST use `requireCompanyRole(['OWNER', 'ADMIN', ...])` middleware to enforce permissions. The frontend must always pass the active `companyId` (via query, param, or header).

## UI/UX Style Guide

- **Compact UI**: The user strongly prefers compact layouts. Use `h-7`, `text-xs`, and tight padding for form elements (Inputs, Selects, DatePickers, Comboboxes).
- **Required Fields Highlight**: Required inputs should be highlighted. Pass specific classes to the input element (not the wrapper) to avoid opacity stacking overlaps.
  - Example class to use: `inputClassName="bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50"`
- **Dark Mode**: All custom styles, especially highlights and background colors, MUST be tested and defined with `.dark` variants (e.g. `dark:bg-warning/20`).
- **Inspect `index.css` First**: Before making any UI modifications, **always inspect the main [index.css](file:///d:/work/Currency-test/src/index.css) file first**. Understand the available CSS variables and Tailwind theme settings (such as `--success`, `--warning`, `--sidebar`, etc.) to ensure that you use existing theme tokens instead of creating custom hardcoded colors, ensuring robust Light/Dark mode compatibility.
- **Component Reusability & Shadcn UI (CRITICAL RULE)**: Always reuse existing components first (check `src/components/ui/`). Do not reinvent the wheel. If a Shadcn component does not exist in the project, check if it can be added via the CLI (`npx shadcn-ui@latest add <component>`) rather than building a custom implementation. Pattern match new complex components against existing ones.
- **Shadcn UI Standard Classes (CSS Variables)**: If adjusting or building UI elements, **always prioritize using Shadcn UI's standard style classes (CSS Variables)** (e.g., `bg-background`, `text-foreground`, `bg-sidebar-accent`, `text-sidebar-accent-foreground`, `border-input`, `bg-popover`) rather than hardcoding static Tailwind color classes (e.g., `bg-slate-900`, `border-slate-800`). This ensures components adapt correctly to global theme shifts (like switching between Light and Dark modes).
- **Component Normalization**: When building or refactoring UI elements, normalize components to make them modular and reusable. Avoid copy-pasting similar blocks of layout or interactive logic; extract them into clean, reusable child components or custom hooks.
