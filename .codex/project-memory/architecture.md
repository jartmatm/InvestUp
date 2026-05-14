# Architecture Memory

## Stack

- Next.js 16 App Router, React 19, TypeScript.
- Tailwind CSS v4 with PostCSS.
- Supabase JS / SSR helpers for persistence.
- Privy React Auth and Privy Node for auth, access tokens, and wallet identity.
- Coinbase CDP, `viem`, `permissionless`, and `ox` for Web3/on-chain related flows.
- Framer Motion, GSAP, Three.js, and tsparticles are available for motion/visual work.
- Capacitor Android is present for mobile packaging.

## Repo Structure

- `app/`: App Router pages and API routes.
- `app/(protected)/layout.tsx`: protected route layout.
- `app/(protected)/home/page.tsx`: authenticated home dashboard.
- `app/(protected)/feed/page.tsx`: marketplace feed.
- `app/(protected)/feed/[id]/page.tsx`: publication detail.
- `app/(protected)/portfolio/page.tsx`: investor/entrepreneur portfolio dashboard.
- `app/(protected)/invest/page.tsx`: Send screen.
- `app/(protected)/invest/wallet/page.tsx`: wallet/transfer internal page.
- `app/(protected)/invest/repayments/page.tsx`: repayments screen.
- `app/(protected)/withdraw/page.tsx`: withdrawal screen.
- `app/(protected)/contracts/page.tsx`: documents/contracts screen.
- `app/(protected)/history/page.tsx`: transaction history.
- `app/(protected)/notifications/page.tsx`: notifications.
- `app/(protected)/publish/page.tsx`: project publication wizard/workspace.
- `app/(protected)/profile/**`: profile and internal profile pages.
- `app/api/**/route.ts`: API routes.
- `components/`: shared UI and feature components.
- `lib/`: client context, math, theme, domain helpers.
- `utils/client/`: typed-ish fetch wrappers for authenticated user data.
- `utils/server/`: server-only helpers for Privy, Supabase admin, KYC, ledger.
- `supabase/migrations/`: schema, RLS, and compatibility migrations.
- `investapp-landing/`: separate landing page app.

## Shared Desktop Shell

Desktop UI should be centralized through:

- `components/DesktopAppShell.tsx`
- `components/DesktopSidebar.tsx`
- `components/DesktopSidebarIcon.tsx`
- `components/DesktopTopbar.tsx`
- `components/DesktopUserMenu.tsx`
- `components/DesktopUpgradeCard.tsx`

`DesktopAppShell` wraps the standard desktop layout:

- fixed left sidebar width `260px`
- sticky topbar
- content area with `px-5 py-5 xl:px-7 2xl:px-9`
- hidden below `lg`
- autofit class: `investapp-desktop-autofit`

## Mobile/Desktop Split

Many pages keep separate mobile and desktop branches. When changing desktop:

- preserve mobile layout and data behavior
- avoid moving mobile-only components into desktop shell unless intentional
- avoid global CSS changes that resize mobile unexpectedly

## Auth And State

- `lib/investapp-context.tsx` is central client state and action orchestration.
- `useInvestApp()` requires `InvestAppProvider`.
- Privy hooks provide `user`, `getAccessToken`, `login`, `logout`, and wallet helpers.
- Protected client wrappers accept `getAccessToken` and call `/api/me/*` routes.

## Supabase And Server API

- Server token verification: `utils/server/privy.ts`.
- Supabase service-role client: `utils/server/supabase-admin.ts`.
- Supabase env resolution: `utils/supabase/config.ts`.
- KYC rules: `utils/server/kyc-compliance.ts`.
- Internal ledger: `utils/server/internal-ledger.ts`.
- Ledger schema compatibility helpers: `lib/supabase-ledger-compat.ts`.

Important API routes:

- `app/api/projects/route.ts`
- `app/api/me/projects/route.ts`
- `app/api/me/profile/route.ts`
- `app/api/me/transactions/route.ts`
- `app/api/me/investments/route.ts`
- `app/api/me/repayments/route.ts`
- `app/api/me/internal-ledger/route.ts`
- `app/api/me/payment-schedule/route.ts`
- `app/api/me/kyc/route.ts`
- `app/api/me/kyc/documents/route.ts`
- `app/api/me/publication-prompts/route.ts`
- `app/api/withdrawals/route.ts`
- `app/api/withdrawals/[id]/route.ts`
- `app/api/coinbase/onramp/route.ts`
- `app/api/improve-description/route.ts`

## Data Model Areas

Supabase migrations define and evolve:

- profiles and transactions
- projects
- investments
- repayments
- payment schedules
- withdrawal temp table
- user bank details
- internal ledger accounting
- KYC documents
- project publication prompts
- RLS/security policies

## Landing App

`investapp-landing/` is separate from the main app. Do not mix dependencies or app assumptions unless the task explicitly touches the landing.
