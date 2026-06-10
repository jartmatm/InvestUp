# Decisions Memory

## 2026-05-13 - Desktop UI standard shell

Type: decision
Tags: desktop, layout, ui
Files: components/DesktopAppShell.tsx, components/DesktopSidebar.tsx, components/DesktopTopbar.tsx

Summary:
- Desktop protected pages should use the shared `DesktopAppShell` with standard sidebar, topbar, content spacing, and autofit behavior.

Details:
- The sidebar/topbar were normalized across pages after several screen-specific versions drifted.
- Use the Send screen/sidebar format as the normalized baseline.
- Keep content width and margins aligned with the Feed screen.

## 2026-05-13 - Desktop navigation standard

Type: decision
Tags: desktop, navigation
Files: components/DesktopSidebar.tsx

Summary:
- Primary desktop sidebar items are Home, Portfolio, Send, Feed, Profile.
- Secondary desktop sidebar items are Top up, Withdraw, Documents.

Details:
- Primary items should link to the desktop screens already created.
- Secondary profile-dependent items are intentionally limited and stable for now.

## 2026-05-13 - Web UI language

Type: decision
Tags: copy, i18n, desktop

Summary:
- The web app UI should be English unless explicitly requested otherwise.

Details:
- Spanish labels such as `Mas categorias`, `Ordenar`, `Filtrar`, `Oportunidades seleccionadas para ti`, and `Invertir en un negocio` were targeted for English normalization.
- Search placeholder should be `Search ventures, entrepreneurs or keywords...`.

## 2026-05-13 - Profile-aware topbar CTA

Type: decision
Tags: topbar, roles, business-rules
Files: components/DesktopTopbar.tsx

Summary:
- Investor profile topbar CTA should be `Invest in a business`.
- Entrepreneur profile topbar CTA should be `Publish project`.
- Publish CTA should be disabled when the entrepreneur already has a mounted project.

Details:
- Use `rolSeleccionado` from `useInvestApp()`.
- Entrepreneur project state is checked via `fetchCurrentUserProjects`.

## 2026-05-13 - Desktop fintech visual language

Type: decision
Tags: design, fintech, desktop

Summary:
- Desktop screens should feel like a premium fintech SaaS dashboard, not a generic template.

Details:
- References used across prior work: Stripe, Ramp, Mercury, Revolut, Linear, Vercel-style clarity.
- Visual defaults: `#F8F9FB` background, white cards, soft borders, subtle shadows, purple accents, green positive metrics, rounded-xl/2xl corners, generous spacing.
- Avoid decorative clutter, one-note palettes, and marketing-style hero layouts inside operational dashboards.

## 2026-05-13 - Portfolio dashboard split by role

Type: decision
Tags: portfolio, roles, data-loading
Files: app/(protected)/portfolio/page.tsx, components/InvestorPortfolioDashboard.tsx, components/EntrepreneurFeedDashboard.tsx

Summary:
- Portfolio must render role-specific dashboards without initially flashing the wrong profile's data.

Details:
- Investor portfolio and entrepreneur dashboard have different metrics and layouts.
- Preserve funding progress color/logic when updating the entrepreneur dashboard.

## 2026-05-13 - Publication detail should use app chrome

Type: decision
Tags: feed, detail, layout
Files: app/(protected)/feed/[id]/page.tsx

Summary:
- Publication detail pages should use the same sidebar/topbar desktop chrome as other protected screens.

Details:
- Any protected screen lacking sidebar/topbar should be brought into the shared desktop shell pattern.

## 2026-06-10 - On-chain balance display with ledger gating

Type: decision
Tags: ledger, balance, home, withdraw, wallet
Files: lib/investapp-context.tsx, app/(protected)/home/page.tsx, app/(protected)/withdraw/page.tsx

Summary:
- Home and Withdraw now display the live on-chain USDC wallet balance.
- Outgoing transfers still consult the internal ledger first and are blocked when locked or pending balances exist.

Details:
- The visible balance comes from the wallet balance refreshed from the blockchain, so the user sees the real funds in the wallet.
- `enviarUSDC` fails closed when the internal ledger reports locked or pending balances, and it caps outgoing amounts against the ledger's available balance before checking the chain balance.
- Withdraw continues to use `withdrawable_balance` as the primary safe limit, with the gas reserve remaining as an additional guard.
