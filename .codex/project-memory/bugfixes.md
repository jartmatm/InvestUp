# Bugfix Memory

## 2026-06-13 - Transactions now mirror amount_usdc on write

Type: bugfix
Tags: ledger, transactions, supabase, backfill, sql
Files: supabase/migrations/20260613_transactions_amount_usdc_alignment.sql

Summary:
- `public.transactions.amount_usdc` was not reliably populated for some transferred-value rows, which made the table look incomplete even when the amount existed in the sibling column.

Details:
- Added a migration that backfills existing rows so `amount` and `amount_usdc` both contain the same transferred value when either side is present.
- Added a `BEFORE INSERT OR UPDATE` trigger to mirror whichever amount column is written first, so future direct writes and projection upserts stay aligned without changing existing read paths.
- Verification: `git diff --check` exits 0; the SQL was reviewed statically because the Supabase CLI was unavailable in this environment.

## 2026-06-10 - Entrepreneur publication detail now reuses investor layout in close mode

Type: bugfix
Tags: feed, detail, entrepreneur, investor, navigation, ui
Files: app/(protected)/feed/[id]/page.tsx, app/(protected)/feed/[id]/invest/page.tsx

Summary:
- The entrepreneur-facing publication detail was still using the older shared detail shell instead of the investor layout, so the two roles did not match visually.

Details:
- The entrepreneur route now redirects to the investor detail route with `mode=close`, so both roles use the same underlying detail screen.
- In `mode=close`, the investor detail page skips the public-visibility gate, changes the CTA to `Close`, and routes back to `/feed` instead of opening the investment modal.
- Verification: `npx eslint app/(protected)/feed/[id]/page.tsx app/(protected)/feed/[id]/invest/page.tsx` exits 0; `npm run build` exits 0.

## 2026-06-10 - Send recipient lookup now searches name, email, phone, and wallet

Type: bugfix
Tags: send, recipient-directory, autocomplete, wallet, phone
Files: app/(protected)/invest/wallet/page.tsx, lib/investapp-context.tsx, app/api/me/recipient-directory/route.ts, utils/client/recipient-directory.ts, utils/recipient-resolution.ts, messages/en/send.json

Summary:
- The Send screen stopped resolving recipients unless the input matched an exact email or wallet, so suggestions disappeared and full manual entries were rejected.

Details:
- Added a shared recipient-resolution helper so the screen and the send flow resolve recipients the same way.
- Recipient directory search now returns `phone_number` and can match phone digits as well as name/email/wallet text.
- The desktop and mobile Send screens now show live suggestions while typing and allow submission once a recipient is entered, with final resolution handled in the shared send helper.
- Verification: `npx eslint app/(protected)/invest/wallet/page.tsx lib/investapp-context.tsx app/api/me/recipient-directory/route.ts utils/client/recipient-directory.ts utils/recipient-resolution.ts` exits 0; `npm run build` exits 0.

## 2026-06-12 - Withdrawable balance now tracks available minus gas

Type: bugfix
Tags: ledger, withdraw, wallet, supabase, backfill
Files: app/(protected)/withdraw/page.tsx, utils/server/internal-ledger.ts, scripts/backfill-internal-account-balances.mjs, supabase/migrations/20260612_internal_account_balances_withdrawable_balance.sql

Summary:
- `internal_account_balances.withdrawable_balance` was stuck at `0.000` or otherwise stale, which made the withdraw screen ignore real spendable funds.

Details:
- Withdrawable balance now materializes as `available_balance - reserved gas`, clamped at zero.
- `available_balance` continues to come from the raw wallet cache minus locked and pending holds.
- Locked and pending remain ledger-driven; the backfill and helper now preserve those values while recalculating withdrawable correctly.

## 2026-06-11 - Internal available balance backfill from raw wallet

Type: bugfix
Tags: ledger, wallet, supabase, backfill
Files: utils/server/internal-ledger.ts, scripts/backfill-internal-account-balances.mjs, supabase/migrations/20260611_internal_account_balances_available_balance.sql

Summary:
- `internal_account_balances.available_balance` was lagging behind the raw Polygon wallet cache, so the home screen could show `0.000` even when the wallet had funds.

Details:
- The visible available balance must be derived from `users.available_wallet_usd` minus the current locked and pending holds.
- A backfill script now rewrites the live table rows using that formula.
- `syncInternalBalanceForUser` now reads the stored ledger snapshot instead of rebuilding the visible balance from a partial ledger slice.

## 2026-06-10 - Wallet balance backfill now queries Polygon

Type: bugfix
Tags: ledger, wallet, supabase, polygon
Files: scripts/backfill-wallet-balances.mjs, supabase/migrations/20260610_users_available_wallet_usd.sql

Summary:
- The `users.available_wallet_usd` column was backfilled from internal ledger snapshots by mistake, which left real wallets showing `0.000`.

Details:
- The correct source of truth is the Polygon USDC balance on the managed wallet, not `internal_account_balances`.
- A one-off admin backfill script now reads on-chain balances and writes the raw amount back to `users.available_wallet_usd`.
- A dry-run against the live DB showed 5 mismatched wallets, and the write pass updated them successfully.

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

## 2026-06-12 - Home entrepreneur edit CTA now opens publish wizard

Type: bugfix
Tags: home, entrepreneur, publish-wizard, navigation
Files: app/(protected)/home/page.tsx

Summary:
- The entrepreneur edit CTA in the web home dashboard was wired to the wrong scope after a refactor and failed the production build because it tried to use `router` inside `DesktopHomeDashboard`.

Details:
- Moved the edit handler back into `HomePage`, passed it down as `onEditProject`, and kept the CTA routing to `/publish?edit=<projectId>`.
- This preserves the existing preview-first edit wizard flow without changing the delete or open-project actions.
- Verification: `npm run build` exits 0 after the fix; `npm run lint -- "app/(protected)/home/page.tsx"` exits 0.
