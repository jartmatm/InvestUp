# Ledger-First Accounting and Public Projections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the internal ledger the source of truth for every monetary flow while keeping `transactions`, `investments`, `repayments`, `withdraw_TEMP`, and `projects` in sync as deterministic public projections.

**Architecture:** One canonical ledger entry should be written for every money-moving action. Postgres triggers or projection helpers then fan out the exact public rows the UI already expects, so the app stops treating operational tables as competing sources of truth. The balance snapshot in `internal_account_balances` stays materialized from ledger entries only, with `available`, `locked`, `pending`, `withdrawable`, and `invested` reflecting the meanings agreed in the design review.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SQL migrations, Supabase server helpers, Privy wallet/webhook APIs, existing internal ledger service, and the current client-side app shell.

---

## File Map

- Create: `supabase/migrations/20260610_ledger_first_accounting.sql`
- Modify: `utils/internal-ledger/types.ts`
- Modify: `utils/server/internal-ledger.ts`
- Create: `utils/server/internal-ledger-events.ts`
- Create: `utils/server/internal-ledger-projections.ts`
- Create: `utils/server/privy-webhooks.ts`
- Modify: `lib/supabase-ledger-compat.ts`
- Modify: `utils/projects/funding.ts`
- Modify: `app/api/me/transactions/route.ts`
- Modify: `app/api/me/investments/route.ts`
- Modify: `app/api/me/repayments/route.ts`
- Modify: `app/api/withdrawals/route.ts`
- Modify: `app/api/withdrawals/[id]/route.ts`
- Create: `app/api/webhooks/privy/route.ts`
- Modify: `lib/investapp-context.tsx`
- Modify: `app/(protected)/home/page.tsx`
- Modify: `app/(protected)/withdraw/page.tsx`
- Modify: `components/EntrepreneurFeedDashboard.tsx`
- Modify: `components/InvestorPortfolioDashboard.tsx`
- Modify: `app/(protected)/contracts/page.tsx`
- Create: `scripts/ledger-smoke.mjs`

---

### Task 1: Lock the ledger schema and projection contract

**Files:**
- Create: `supabase/migrations/20260610_ledger_first_accounting.sql`
- Modify: `utils/internal-ledger/types.ts`
- Modify: `lib/supabase-ledger-compat.ts`
- Modify: `utils/projects/funding.ts`

- [ ] **Step 1: Add the canonical event shape in SQL**

Add a migration that expands `public.internal_ledger_entries` so a single source row can produce multiple lifecycle entries without breaking idempotency. The new columns should include:

```sql
event_key text not null,
source_table text not null,
source_id text not null,
lifecycle_stage text not null,
wallet_action_id text,
projection_payload jsonb not null default '{}'::jsonb
```

Also expand the `entry_type` constraint to cover the full ledger vocabulary:

```sql
check (entry_type in (
  'buy',
  'transfer',
  'investment',
  'repayment',
  'withdrawal_requested',
  'withdrawal_submitted',
  'withdrawal_settled',
  'withdrawal_failed',
  'funding_released',
  'reversal',
  'adjustment'
))
```

Replace the current `(reference_type, reference_id)` uniqueness with a deterministic unique key on `event_key`, so the same public record can move through `initiated`, `submitted`, `confirmed`, `failed`, and `reversed` stages without colliding.

- [ ] **Step 2: Add projection functions and triggers**

In the same migration, add SQL functions that project one ledger entry into the public tables the app already reads:

- `public.sync_transactions_from_internal_ledger(...)`
- `public.sync_investments_from_internal_ledger(...)`
- `public.sync_repayments_from_internal_ledger(...)`
- `public.sync_withdrawals_from_internal_ledger(...)`
- `public.sync_projects_from_internal_ledger(...)`

Each projection function should upsert the exact row shape the public table expects. For example, the `transactions` projection should write `user_id`, `role`, `movement_type`, `status`, `chain`, `tx_hash`, `from_wallet`, `to_wallet`, `amount_usdc`, and `metadata` from `projection_payload`.

Add an `AFTER INSERT OR UPDATE OR DELETE` trigger on `internal_ledger_entries` that:

1. Recomputes `internal_account_balances`.
2. Upserts the public projection rows.
3. Preserves idempotency by using the `event_key` and `source_table/source_id` pairing.

- [ ] **Step 3: Backfill existing rows into the new ledger format**

Use the migration to backfill current `transactions`, `investments`, `repayments`, `withdraw_TEMP`, and `projects.amount_received` rows into the new ledger shape. Each backfill row should produce a stable `event_key` like:

- `transactions:<id>:submitted`
- `transactions:<id>:confirmed`
- `investments:<id>:confirmed`
- `repayments:<id>:confirmed`
- `withdrawals:<id>:requested`
- `withdrawals:<id>:submitted`
- `withdrawals:<id>:failed`
- `withdrawals:<id>:settled`
- `projects:<id>:funding_released`

The backfill must keep the public tables unchanged from the UI point of view while making the ledger the canonical source.

- [ ] **Step 4: Update the TS types that describe the new rows**

Extend `utils/internal-ledger/types.ts` so `InternalLedgerEntry` includes the new fields (`event_key`, `source_table`, `source_id`, `lifecycle_stage`, `wallet_action_id`, `projection_payload`) and add explicit types for the new entry kinds and lifecycle stages. Keep the existing bucket types, but document the new semantics in comments if needed:

- `available_balance`: liquid spendable balance
- `locked_balance`: capital raised but still blocked
- `pending_balance`: in-flight transfer/withdrawal/funding action
- `withdrawable_balance`: liquid balance eligible for withdrawal
- `invested_balance`: active capital committed by the investor

- [ ] **Step 5: Point funding helpers at the ledger projection**

Update `utils/projects/funding.ts` so `hydrateProjectsWithFundingTotals()` no longer reads `investments` directly as the source of truth. It should use the new ledger-derived projection source so `projects.amount_received` stays a public view of the ledger, not a parallel accounting system.

- [ ] **Step 6: Verify the type fallout**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Fix any TS shape mismatch that appears because the ledger entry contract grew.

- [ ] **Step 7: Commit the schema work**

Commit message:

```bash
git commit -m "feat: add ledger-first accounting schema"
```

---

### Task 2: Make the server ledger service canonical

**Files:**
- Modify: `utils/server/internal-ledger.ts`
- Create: `utils/server/internal-ledger-events.ts`
- Create: `utils/server/internal-ledger-projections.ts`

- [ ] **Step 1: Extract canonical event builders**

Move the event-shaping logic out of `utils/server/internal-ledger.ts` into `utils/server/internal-ledger-events.ts` so each monetary flow has a single builder:

- `buildBuyEntryPayload(...)`
- `buildTransferEntryPayload(...)`
- `buildInvestmentEntryPayload(...)`
- `buildRepaymentEntryPayload(...)`
- `buildWithdrawalRequestedEntryPayload(...)`
- `buildWithdrawalSubmittedEntryPayload(...)`
- `buildWithdrawalSettledEntryPayload(...)`
- `buildWithdrawalFailedEntryPayload(...)`
- `buildFundingReleaseEntryPayload(...)`
- `buildReversalEntryPayload(...)`

Each builder must return both:

1. The internal ledger delta for `available`, `locked`, `pending`, `withdrawable`, and `invested`.
2. The `projection_payload` needed to upsert the matching public table row.

- [ ] **Step 2: Make `internal-ledger.ts` a thin orchestrator**

Keep `utils/server/internal-ledger.ts` as the public server API, but make it delegate to the builder/projection modules instead of hard-coding balance math. The file should expose a small set of durable functions:

- `recordInternalLedgerEvent(...)`
- `syncInternalBalanceForUser(...)`
- `syncInternalLedgerForUsers(...)`
- `syncPublicProjectionsForUsers(...)`
- `getCurrentUserInternalBalance(...)`
- `getCurrentUserInternalEntries(...)`

The balance recomputation must read only from `internal_ledger_entries` plus the withdrawal-hold projection, not from public tables like `transactions` or `investments`.

- [ ] **Step 3: Add projection helpers for the public rows**

Implement `utils/server/internal-ledger-projections.ts` so it can upsert the public row shapes from a ledger event without re-deriving the business meaning in each route. The helper should own the row-shape details for:

- `transactions`
- `investments`
- `repayments`
- `withdraw_TEMP`
- `projects`

The goal is that application routes only say “record this event”, and the projection helper handles the exact row writes the UI needs.

- [ ] **Step 4: Recompute balances from the new event model**

Update the balance recomputation so the new semantics hold:

- `investment` moves investor funds into `invested_balance` and entrepreneur funds into `locked_balance`.
- `funding_released` moves entrepreneur funds from `locked_balance` to `available_balance`.
- `buy`, `transfer`, and `withdrawal_*` use `pending_balance` for in-flight state only.
- `repayment` reduces outstanding exposure on the investor side and increases liquid balance when settled.

Keep the existing trigger-driven refresh of `internal_account_balances`, but make sure the snapshot is derived from the new event kinds and lifecycle stages.

- [ ] **Step 5: Verify the refactor with lint and typecheck**

Run:

```bash
npx tsc --noEmit
npm run lint
```

The code should compile without any file still depending on the old “public table first” balance math.

- [ ] **Step 6: Commit the service refactor**

Commit message:

```bash
git commit -m "feat: make internal ledger the canonical accounting service"
```

---

### Task 3: Route every money-moving API through the ledger

**Files:**
- Modify: `app/api/me/transactions/route.ts`
- Modify: `app/api/me/investments/route.ts`
- Modify: `app/api/me/repayments/route.ts`
- Modify: `app/api/withdrawals/route.ts`
- Modify: `app/api/withdrawals/[id]/route.ts`
- Create: `app/api/webhooks/privy/route.ts`
- Create: `utils/server/privy-webhooks.ts`

- [ ] **Step 1: Make `/api/me/transactions` ledger-first**

Change the transactions route so the POST path creates the canonical ledger event first and lets the projection helper write the public `transactions` row from `projection_payload`. The route should support the full `movementType` set (`buy`, `transfer`, `investment`, `repayment`, `withdrawal`) and return the projected public row id plus the ledger event id.

- [ ] **Step 2: Make investments and repayments use the same entry pipeline**

Update `app/api/me/investments/route.ts` and `app/api/me/repayments/route.ts` so they no longer duplicate the balance math. Both routes should:

1. Build the canonical ledger event.
2. Persist it with a deterministic `event_key`.
3. Let the projection helper write `investments`, `repayments`, `transactions`, and any derived project funding state.

That keeps the investor dashboard, entrepreneur dashboard, and transaction history reading from the same event source.

- [ ] **Step 3: Turn withdrawals into a lifecycle, not a one-off insert**

Update `app/api/withdrawals/route.ts` and `app/api/withdrawals/[id]/route.ts` so withdrawal requests are ledger events with explicit lifecycle stages:

- `withdrawal_requested` when the form is created
- `withdrawal_submitted` when the external transfer is broadcast
- `withdrawal_failed` when the provider or chain flow fails
- `withdrawal_settled` when the transfer is finally confirmed

The withdrawal request row in `withdraw_TEMP` should remain the public operational view, but the ledger must be the source of truth for the balance movement.

- [ ] **Step 4: Add a Privy webhook consumer for async settlement**

Create `app/api/webhooks/privy/route.ts` plus `utils/server/privy-webhooks.ts` so the backend can settle pending wallet actions after broadcast. The webhook handler should:

1. Verify the incoming signature.
2. Normalize the payload into a ledger event lookup.
3. Settle or reverse the matching ledger event by `transaction_id`, `transaction_hash`, or `reference_id`.
4. Re-run the public projections for the affected users and project.

This is the missing piece that makes top-ups, transfers, and withdrawals trustworthy even when the external provider confirms later than the client.

- [ ] **Step 5: Verify the route responses still match the client contract**

Make sure each route still returns the row identifiers the client code expects:

- `transactions` returns the transaction row id/uuid
- `investments` returns the investment row id
- `repayments` returns the repayment row id
- `withdrawals` returns the withdrawal request id

Run:

```bash
npm run lint
```

- [ ] **Step 6: Commit the route work**

Commit message:

```bash
git commit -m "feat: route money flows through the internal ledger"
```

---

### Task 4: Repoint the UI and dashboards to the ledger snapshot

**Files:**
- Modify: `lib/investapp-context.tsx`
- Modify: `app/(protected)/home/page.tsx`
- Modify: `app/(protected)/withdraw/page.tsx`
- Modify: `components/EntrepreneurFeedDashboard.tsx`
- Modify: `components/InvestorPortfolioDashboard.tsx`
- Modify: `app/(protected)/contracts/page.tsx`

- [ ] **Step 1: Make the client flows use the ledger-backed APIs**

Update `lib/investapp-context.tsx` so:

- top-ups record a `buy` ledger event when the provider finishes successfully
- transfers record a `transfer` ledger event, not just a generic transaction row
- investment and repayment flows keep using the ledger-backed endpoints and consume the returned ledger ids for receipts and notifications

The client should stop treating a local wallet hash as the final accounting record.

- [ ] **Step 2: Make Home read the snapshot semantics**

Update `app/(protected)/home/page.tsx` so the balances shown on the home card match the new ledger meanings:

- the large home balance reads `internalBalance.available_balance`
- the entrepreneur’s “capital raised” chip uses `internalBalance.locked_balance`
- the history/notifications feed continues to use the transaction history, but the balance badge no longer implies that all on-chain funds are immediately withdrawable

Keep the current desktop shell and premium fintech styling unchanged.

- [ ] **Step 3: Make Withdraw cap the amount from withdrawable balance**

Update `app/(protected)/withdraw/page.tsx` so the safe amount limit comes from `internalBalance.withdrawable_balance`, not from `balanceUSDC - MIN_GAS_RESERVE_USDC` alone. Keep the gas reserve check as an additional guard, but make the ledger the primary cap.

- [ ] **Step 4: Update the entrepreneur and investor dashboards**

Update `components/EntrepreneurFeedDashboard.tsx` and `components/InvestorPortfolioDashboard.tsx` so the role-specific summaries read the ledger snapshot directly:

- entrepreneur dashboard: show `locked_balance` as the capital currently raised and still blocked from withdrawal
- investor dashboard: show `invested_balance` as the active capital committed to the portfolio

Keep `projects.amount_received` as the public funding-progress metric used by lists and gauges, but stop using it as the source of truth for internal liquidity.

- [ ] **Step 5: Keep the contracts page aligned with the new buckets**

Update `app/(protected)/contracts/page.tsx` so the balance cards explicitly mirror the new semantics:

- `available_balance`
- `withdrawable_balance`
- `invested_balance`
- `pending_balance`

The page should continue to be the canonical reader for the user’s internal ledger history.

- [ ] **Step 6: Run the full app verification**

Run:

```bash
npm run lint
npm run build
```

If either command fails, fix the offending call sites before moving on.

- [ ] **Step 7: Commit the UI/data-consumer updates**

Commit message:

```bash
git commit -m "feat: consume ledger-first balances in the UI"
```

---

### Task 5: Add a smoke test and validate the backfill

**Files:**
- Create: `scripts/ledger-smoke.mjs`

- [ ] **Step 1: Write a small smoke script for the accounting invariants**

Create a tiny Node script that exercises the pure ledger helpers with four scenarios:

1. `investment` moves funds from `available_balance` into `invested_balance` and `locked_balance`.
2. `repayment` returns liquid balance and reduces active exposure.
3. `withdrawal_requested` parks money in `pending_balance` until settlement.
4. `transfer` is zero-sum across sender and recipient once confirmed.

The script should exit non-zero if any bucket math is wrong.

- [ ] **Step 2: Run the smoke script**

Run:

```bash
node scripts/ledger-smoke.mjs
```

Expected: exit code `0`.

- [ ] **Step 3: Verify the migration and projections against a staging database**

Apply `supabase/migrations/20260610_ledger_first_accounting.sql` to a staging or local Supabase database and inspect:

- one ledger event per movement
- one matching public row in `transactions`, `investments`, `repayments`, or `withdraw_TEMP`
- `projects.amount_received` updated from the ledger projection
- `internal_account_balances` reflecting the new bucket meanings

- [ ] **Step 4: Re-run the app checks after any fixes**

Run:

```bash
npm run lint
npm run build
```

- [ ] **Step 5: Commit the validation artifacts**

Commit message:

```bash
git commit -m "test: validate ledger-first accounting invariants"
```
