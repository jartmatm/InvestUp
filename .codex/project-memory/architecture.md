# Architecture Memory

## 2026-06-12 - Withdrawable balance is derived from available balance

Type: architecture
Tags: ledger, withdraw, wallet, supabase
Files: app/(protected)/withdraw/page.tsx, utils/server/internal-ledger.ts, scripts/backfill-internal-account-balances.mjs, supabase/migrations/20260612_internal_account_balances_withdrawable_balance.sql

Summary:
- `internal_account_balances.withdrawable_balance` is a materialized value derived from `available_balance` minus the gas reserve used by the withdraw flow.

Details:
- The withdraw screen should treat `available_balance` as the base effective wallet amount and then subtract the reserved gas buffer before enabling withdrawal.
- `locked_balance` and `pending_balance` remain ledger-derived and feed into `available_balance`.
- Database refresh helpers and backfills should recompute `withdrawable_balance` whenever `available_balance` changes so the UI and data stay aligned.

## 2026-06-11 - Internal available balance follows raw wallet cache

Type: architecture
Tags: ledger, wallet, supabase, sync
Files: utils/server/internal-ledger.ts, scripts/backfill-internal-account-balances.mjs, supabase/migrations/20260611_internal_account_balances_available_balance.sql

Summary:
- `internal_account_balances.available_balance` is now derived from the private raw wallet cache in `users.available_wallet_usd` minus the current locked and pending holds.

Details:
- The raw wallet cache remains the private on-chain source of truth for wallet funds.
- Home and other visible balance surfaces should read the internal ledger snapshot, not the raw cache directly.
- A backfill script exists for live data corrections, and a migration records the same formula for fresh database setups.

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

## 2026-06-04 - Publication editing uses publish wizard preview

Type: architecture
Tags: publish-wizard, portfolio, editing, mobile
Files: app/(protected)/portfolio/page.tsx, app/(protected)/publish/page.tsx, app/(protected)/feed/page.tsx, app/(protected)/feed/[id]/page.tsx, app/(protected)/home/page.tsx

Summary:
- Existing publication editing now routes through `/publish?edit=<projectId>` instead of the legacy Portfolio inline form.

Details:
- Portfolio mobile keeps the project card/actions and entrepreneur dashboard; it no longer mounts the old venture details form.
- The publish wizard hydrates editable projects from `metadata.publication_form_fields` with column fallbacks, jumps to the review step, and saves via PATCH while amount received is zero.
- Edit entry points in Feed, detail, Home, and Portfolio point to the publish wizard edit mode.

## 2026-06-10 - Private wallet balance sync feeds internal balance snapshots

Type: architecture
Tags: ledger, wallet, supabase, sync
Files: app/api/me/wallet-balance/route.ts, utils/server/wallet-balance.ts, utils/server/internal-ledger.ts, app/(protected)/home/page.tsx

Summary:
- `users.available_wallet_usd` is the private cache of the raw Polygon USDC wallet balance and is refreshed from a server-side sync endpoint.

Details:
- The sync endpoint verifies the Privy access token, reads the managed wallet from `users.wallet_address`, queries Polygon USDC on-chain, and upserts the raw balance back into `users.available_wallet_usd`.
- `syncInternalBalanceForUser` now derives the visible `available_balance` from that raw cache minus the ledger's locked and pending holds.
- Home trusts the internal ledger snapshot for the visible available balance, while the raw wallet balance remains an internal/private cache rather than a user-editable field.

## 2026-06-10 - Wallet backfill is application-side, not SQL-side

Type: architecture
Tags: ledger, wallet, migration, script
Files: scripts/backfill-wallet-balances.mjs, supabase/migrations/20260610_users_available_wallet_usd.sql

Summary:
- Existing `users.available_wallet_usd` rows must be backfilled from an application-side script that queries Polygon directly.

Details:
- SQL migrations can add the private cache column, but they cannot compute the raw wallet balance because the source lives on-chain.
- The repo now includes a reusable backfill script for one-time or future admin reruns.
