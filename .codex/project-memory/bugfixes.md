# Bugfix Memory

## 2026-06-10 - Entrepreneur detail closes back to feed

Type: bugfix
Tags: feed, detail, entrepreneur, navigation
Files: app/(protected)/feed/[id]/page.tsx

Summary:
- The entrepreneur publication detail CTA now uses `Close` and returns to `/feed` instead of opening the publish edit flow.

Details:
- The shared detail screen stays intact, but the role-specific primary action for entrepreneurs now matches a close-only exit path.
- Both the primary CTA and the back control route through `router.replace('/feed')` so the detail page does not remain in browser history for the entrepreneur flow.

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

## 2026-06-05 - Publish edit mobile media and owner column fallback

Type: bugfix
Tags: project-memory

Summary:
- Root cause: the previous edit media preload fix only updated the desktop media modal, while the Portfolio edit back-to-upload flow uses the mobile upload overlay, which rendered only pendingMediaItems after selecting new photos. The remote projects table also appears to be missing owner_user_id, causing project update filters and payloads that reference owner_user_id to fail. Fix: app/(protected)/publish/page.tsx now renders existing uploadedMediaItems from Supabase together with pendingMediaItems inside the mobile upload overlay and allows removing existing media. app/api/me/projects/route.ts now falls back to owner_id-only selects/filters and removes unsupported owner_user_id/minimum_investment mutation columns when the schema is older. Added supabase/migrations/20260605_projects_owner_user_id_guard.sql to add/backfill owner_user_id from owner_id. Verification: static regression checks for mobile overlay, migration, and API fallback pass; focused eslint exits 0 with warnings only; git diff --check passes. Applying the migration with Supabase CLI was attempted but this environment is not authenticated with Supabase.

## 2026-06-05 - Publish edit skips AI regeneration on media continue

Type: bugfix
Tags: publish-wizard, editing, ai-generation, media-upload
Files: app/(protected)/publish/page.tsx

Summary:
- Root cause: step 11 always called the AI publication generation path after media upload, even when the wizard was editing an existing publication.
- Fix: in edit mode, continuing from the media step now disables only the AI regeneration trigger, then continues through the normal title and description review screens with the loaded existing copy.

Details:
- This preserves the original AI-generated title, description, and optimized publication copy hydrated from Supabase metadata/project fields.
- Create mode still calls the AI generation path from the same step.
