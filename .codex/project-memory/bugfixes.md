# Bugfix Memory

## 2026-05-13 - Landing mockup responsive sizing

Type: bugfix
Tags: landing, responsive, mockup
Files: investapp-landing/components/AppMockups.tsx

Summary:
- The landing phone mockup required manual responsive sizing for mobile and desktop consistency.

Details:
- The main phone mockup is React-rendered from the PNG reference, not pasted as a raster screenshot.
- Phone borders were adjusted toward black/silver.
- Mobile sizing needed special attention so the overlaid Send phone did not become wider than the rear phone.

## 2026-05-13 - Desktop sidebar drift

Type: bugfix
Tags: desktop, sidebar, consistency
Files: components/DesktopSidebar.tsx, components/DesktopUpgradeCard.tsx

Summary:
- Desktop pages had sidebar/menu/upgrade-card drift. The sidebar format was normalized.

Details:
- Use the Send sidebar format as the current standard.
- Upgrade card should be shared via `DesktopUpgradeCard`.

## 2026-05-13 - Desktop header drift

Type: bugfix
Tags: desktop, topbar, consistency
Files: components/DesktopTopbar.tsx

Summary:
- Desktop pages had inconsistent search, notification, publish CTA, and avatar menu layouts.

Details:
- Use `DesktopTopbar` for consistent spacing and behavior.
- Search copy should be English across screens.

## 2026-05-13 - Feed card sizing

Type: bugfix
Tags: feed, desktop, cards
Files: app/(protected)/feed/page.tsx

Summary:
- Feed premium reels and standard project cards needed desktop sizing and spacing aligned to the reference.

Details:
- Preserve existing feed data logic when only adjusting visual sizes.
- Use full available width with reasonable side spacing.

## 2026-05-13 - Security verification findings

Type: bugfix
Tags: security, audit, open-risk

Summary:
- A read-only `/security-review` smoke test surfaced verified risks. These were not fixed during skill setup.

Details:
- Financial ledger routes may trust client-supplied chain events.
- KYC `submitted` documents may count as approved in level calculation.
- Android release signing key/passwords appear committed.
- Public OpenAI improve-description endpoint may allow API spend abuse.
- Treat this entry as open risk memory, not as a completed fix.
