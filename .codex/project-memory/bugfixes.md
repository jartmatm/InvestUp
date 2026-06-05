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

## 2026-06-04 - Mobile publish wizard swipe and media upload feedback

Type: bugfix
Tags: mobile, publish-wizard, media-upload, toast, navigation
Files: app/(protected)/publish/page.tsx, utils/client/current-user-project-media.ts

Summary:
- Mobile publish wizard now guards browser back/edge-swipe while mounted, exposes touch-friendly media reorder controls, and reports media upload progress per file with heartbeat toasts.

Details:
- Added mobile history guard to keep accidental left swipe/browser back from exiting the wizard to the feed.
- Added icon-only previous/next reorder controls for pending media because HTML drag/drop is unreliable immediately after selecting files on mobile.
- Extended project media upload progress callbacks with starting/uploading/retrying/completed phases and elapsed-time heartbeat updates so long uploads do not look frozen.

## 2026-06-05 - Publish edit media modal preloads existing photos

Type: bugfix
Tags: project-memory

Summary:
- Root cause: /publish?edit hydrated Supabase project photo_urls into uploadedMediaItems, but the desktop upload photos modal rendered only pendingMediaItems, so existing photos were invisible in the popup and could not be removed there. Fix: app/(protected)/publish/page.tsx now renders current saved media in the modal with remove/reorder support while keeping new pending media in a separate section; the modal Done button closes when there are no new files and Save media persists newly selected files. Verification: static regression repro failed before the fix and now passes; npx eslint app/(protected)/publish/page.tsx exits 0 with warnings only. Regression guard: ensure the edit media modal includes uploadedMediaItems.map, handleRemoveUploadedMedia, and handleMediaSelection.
