# InvestUp Agent Guide

## Project Memory

This repo uses persistent project memory. At the start of a Codex session in this repo:

1. Read `.codex/project-memory/index.md`.
2. Read `.codex/project-memory/architecture.md` when changing app structure, routing, data flow, or shared components.
3. Read `.codex/project-memory/decisions.md` before revisiting UI, auth, payments, database, deployment, or AI-publication behavior.
4. Read `.codex/project-memory/workflows.md` before running commands, tests, commits, pushes, or deployment checks.
5. Update memory after meaningful work using `/session-summary`, `/decision`, `/bugfix`, `/architecture`, or `/remember`.

Do not store secrets, tokens, passwords, private keys, raw `.env` values, signing keys, or user-sensitive personal data in memory. Store only architecture, conventions, decisions, safe operational context, and sanitized debugging notes.

## Project Overview

InvestUp / InvestApp is a Next.js App Router fintech marketplace that connects investors with entrepreneurs. The product has investor and entrepreneur profiles, marketplace feed, project publishing, investment/send flows, withdrawals, contracts/documents, repayments, notifications, profile management, and a separate landing page in `investapp-landing/`.

Core product stance:

- Non-custodial fintech / Web3 marketplace.
- Privy handles auth and embedded wallet identity.
- Supabase stores off-chain profiles, projects, transactions, investments, repayments, withdrawals, KYC documents, and publication prompts.
- On-chain / wallet-related behavior uses Polygon-style USDC flows through `viem`, `permissionless`, Coinbase/Pimlico integrations, and app ledger compatibility utilities.
- The protected app has distinct mobile and desktop UI paths. Desktop pages use a premium fintech dashboard style.

## Stack

- Next.js 16 App Router with React 19 and TypeScript.
- Tailwind CSS v4 via PostCSS.
- Supabase JS / SSR helpers.
- Privy React Auth and Privy Node.
- Framer Motion, GSAP, Three.js for motion/visual systems where needed.
- Capacitor Android for mobile packaging.
- Coinbase CDP, `viem`, `permissionless`, and `ox` for wallet/on-chain flows.
- OpenAI prompt-based publication optimization under API routes.

## Important Structure

- `app/(protected)/`: authenticated app pages.
- `app/api/`: Next.js API routes.
- `components/DesktopAppShell.tsx`: shared desktop dashboard shell.
- `components/DesktopSidebar.tsx`: standard desktop left navigation.
- `components/DesktopTopbar.tsx`: standard desktop header, search, notifications, CTA, user menu.
- `components/DesktopUserMenu.tsx`: shared profile dropdown.
- `components/DesktopUpgradeCard.tsx`: shared premium card.
- `components/InvestorPortfolioDashboard.tsx`: investor portfolio dashboard.
- `components/EntrepreneurFeedDashboard.tsx`: entrepreneur funding dashboard.
- `components/InvestmentOpportunityDetail.tsx`: publication detail UI.
- `lib/investapp-context.tsx`: central client state/actions and wallet/business flows.
- `utils/client/`: authenticated client API wrappers.
- `utils/server/`: server-side Privy, Supabase admin, KYC, internal ledger logic.
- `supabase/migrations/`: database schema and RLS history.
- `investapp-landing/`: separate landing page app.

## UI Conventions

- Desktop protected pages should use `DesktopAppShell` unless there is a strong reason not to.
- Sidebar and topbar must be consistent across desktop pages.
- Desktop search placeholder should be English: `Search ventures, entrepreneurs or keywords...`.
- UI language for the web app should be English unless the user explicitly asks otherwise.
- Premium fintech style: light #F8F9FB background, white cards, soft borders, subtle shadows, purple accent, green positive metrics, rounded-xl/2xl corners.
- Avoid generic dashboards. Keep visual hierarchy, spacing, and polish aligned with Stripe/Ramp/Mercury-style fintech SaaS.
- Mobile designs are intentionally separate and should not be broken while changing desktop.

## Business Rules To Preserve

- Investor and entrepreneur profiles have different CTAs and page states.
- Investors see `Invest in a business`; entrepreneurs see `Publish project`.
- The publish CTA should be disabled for entrepreneurs who already have a project mounted.
- Sidebar primary nav is standard: Home, Portfolio, Send, Feed, Profile.
- Sidebar profile-specific lower nav is standard: Top up, Withdraw, Documents.
- Publication feed has premium reels and standard project grid; do not change data logic when only adjusting UI.
- Portfolio page uses profile-specific dashboard behavior; avoid showing the wrong profile data during initial render.
- Funding progress color/logic must remain intact when redesigning dashboards.

## API And Data Notes

- Authenticated API routes verify Privy access tokens with `utils/server/privy.ts`.
- Server routes use Supabase service-role access through `utils/server/supabase-admin.ts`.
- Client wrappers usually accept `getAccessToken` and return `{ data, error }`.
- Publication prompt generation uses `app/api/me/publication-prompts/route.ts`.
- Public projects are exposed through `app/api/projects/route.ts`.
- Withdrawals are under `app/api/withdrawals/` and `app/api/withdrawals/[id]/route.ts`.
- Internal ledger behavior is centralized in `utils/server/internal-ledger.ts`.
- KYC requirement calculation is centralized in `utils/server/kyc-compliance.ts`.

## Commands

- `npm run dev`: local dev server.
- `npm run build`: production build.
- `npm run lint`: lint.
- `npm run start`: Next.js production server.
- `npm run android:sync`: sync Capacitor Android.
- `npm run android:open`: open Android project.

## Safety

- Never write secrets to memory, docs, logs, screenshots, commits, or final responses.
- Treat financial state changes, KYC, withdrawals, and ledger updates as high-risk.
- Prefer server-derived financial truth over client-provided status/amounts.
- Avoid destructive git commands unless explicitly requested.

## Agent Skills

### Issue tracker

Issues and PRDs for this repo are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Engineering workflow defaults use the canonical Matt Pocock triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context documentation layout. See `docs/agents/domain.md`.
