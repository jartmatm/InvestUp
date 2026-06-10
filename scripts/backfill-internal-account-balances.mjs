#!/usr/bin/env node

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ENV_FILE = '.env.local';

function loadEnvFile(filename) {
  if (!fs.existsSync(filename)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filename, 'utf8')
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
      .filter(([key]) => Boolean(key))
  );
}

const fileEnv = loadEnvFile(ENV_FILE);
const env = { ...fileEnv, ...process.env };
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const parsedPageSize = Number.parseInt(env.PAGE_SIZE ?? '200', 10);
const parsedConcurrency = Number.parseInt(env.CONCURRENCY ?? '5', 10);
const pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? parsedPageSize : 200;
const concurrency = Number.isFinite(parsedConcurrency) && parsedConcurrency > 0 ? parsedConcurrency : 5;
const dryRun = ['1', 'true', 'yes'].includes(String(env.DRY_RUN ?? '').toLowerCase());

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    '[internal-balance-backfill] Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const roundToSix = (value) => Number(Number(value).toFixed(6));

async function fetchBalances(offset) {
  const { data, error } = await supabase
    .from('internal_account_balances')
    .select('user_id,available_balance,locked_balance,pending_balance')
    .order('user_id', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchUsers(userIds) {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id,available_wallet_usd')
    .in('id', userIds);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function updateAvailableBalance(userId, availableBalance) {
  const { error } = await supabase
    .from('internal_account_balances')
    .update({ available_balance: availableBalance })
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

async function processBalanceRow(balanceRow, userMap) {
  const userRow = userMap.get(balanceRow.user_id);
  if (!userRow) {
    return { user_id: balanceRow.user_id, skipped: true, reason: 'missing user row' };
  }

  const rawWalletBalance = roundToSix(Number(userRow.available_wallet_usd ?? 0));
  const lockedBalance = roundToSix(Number(balanceRow.locked_balance ?? 0));
  const pendingBalance = roundToSix(Number(balanceRow.pending_balance ?? 0));
  const targetAvailable = roundToSix(Math.max(rawWalletBalance - lockedBalance - pendingBalance, 0));
  const storedAvailable = roundToSix(Number(balanceRow.available_balance ?? 0));
  const changed = Math.abs(targetAvailable - storedAvailable) >= 0.000001;

  if (!dryRun && changed) {
    await updateAvailableBalance(balanceRow.user_id, targetAvailable);
  }

  return {
    user_id: balanceRow.user_id,
    rawWalletBalance,
    lockedBalance,
    pendingBalance,
    storedAvailable,
    targetAvailable,
    changed,
    updated: !dryRun && changed,
  };
}

async function processBatch(balanceRows) {
  const userIds = balanceRows.map((row) => row.user_id);
  const users = await fetchUsers(userIds);
  const userMap = new Map(users.map((user) => [user.id, user]));

  const results = [];
  for (let index = 0; index < balanceRows.length; index += concurrency) {
    const batch = balanceRows.slice(index, index + concurrency);
    const batchResults = await Promise.allSettled(batch.map((row) => processBalanceRow(row, userMap)));
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ error: result.reason?.message ?? String(result.reason) });
      }
    });
  }

  return results;
}

async function main() {
  console.log(
    `[internal-balance-backfill] Starting ${dryRun ? 'dry-run' : 'write'} backfill with pageSize=${pageSize}, concurrency=${concurrency}`
  );

  const summaries = [];
  let offset = 0;

  for (;;) {
    const balanceRows = await fetchBalances(offset);
    if (balanceRows.length === 0) break;

    const pageResults = await processBatch(balanceRows);
    summaries.push(...pageResults);

    const updatedCount = pageResults.filter((result) => result.updated).length;
    const changedCount = pageResults.filter((result) => result.changed).length;
    console.log(
      `[internal-balance-backfill] page=${offset}-${offset + balanceRows.length - 1} rows=${balanceRows.length} changed=${changedCount} updated=${updatedCount}`
    );

    offset += balanceRows.length;
    if (balanceRows.length < pageSize) break;
  }

  const updated = summaries.filter((result) => result.updated).length;
  const changed = summaries.filter((result) => result.changed).length;
  const skipped = summaries.filter((result) => result.skipped).length;
  const errors = summaries.filter((result) => result.error);

  console.log(
    `[internal-balance-backfill] done changed=${changed} updated=${updated} skipped=${skipped} errors=${errors.length}`
  );

  if (errors.length > 0) {
    console.log('[internal-balance-backfill] error sample:');
    console.log(JSON.stringify(errors.slice(0, 10), null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    '[internal-balance-backfill] fatal error:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
