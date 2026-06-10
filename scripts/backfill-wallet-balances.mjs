#!/usr/bin/env node

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, formatUnits, http, isAddress } from 'viem';
import { polygon } from 'viem/chains';

const ENV_FILE = '.env.local';
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

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
    '[wallet-backfill] Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const publicClient = createPublicClient({
  chain: polygon,
  transport: http('https://polygon-mainnet.infura.io/v3/002caff678d04f258bed0609c0957c82'),
});

const roundToSix = (value) => Number(Number(value).toFixed(6));

async function fetchUsers(offset) {
  const { data, error } = await supabase
    .from('users')
    .select('id,wallet_address,available_wallet_usd')
    .order('id', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function readWalletBalance(walletAddress) {
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [walletAddress],
  });

  return roundToSix(Number(formatUnits(balance, 6)));
}

async function updateUserBalance(userId, availableWalletUsd) {
  const { error } = await supabase
    .from('users')
    .update({ available_wallet_usd: availableWalletUsd })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

async function processUser(user) {
  const walletAddress = typeof user.wallet_address === 'string' ? user.wallet_address.trim() : '';
  if (!walletAddress || !isAddress(walletAddress)) {
    return { id: user.id, skipped: true, reason: 'no valid wallet address' };
  }

  const onChainBalance = await readWalletBalance(walletAddress);
  const storedBalance = roundToSix(Number(user.available_wallet_usd ?? 0));
  const changed = Math.abs(onChainBalance - storedBalance) >= 0.000001;

  if (!dryRun && changed) {
    await updateUserBalance(user.id, onChainBalance);
  }

  return {
    id: user.id,
    walletAddress,
    storedBalance,
    onChainBalance,
    changed,
    updated: !dryRun && changed,
  };
}

async function processInBatches(users) {
  const results = [];
  for (let index = 0; index < users.length; index += concurrency) {
    const batch = users.slice(index, index + concurrency);
    const batchResults = await Promise.allSettled(batch.map((user) => processUser(user)));
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
    `[wallet-backfill] Starting ${dryRun ? 'dry-run' : 'write'} backfill with pageSize=${pageSize}, concurrency=${concurrency}`
  );

  const summaries = [];
  let offset = 0;

  for (;;) {
    const users = await fetchUsers(offset);
    if (users.length === 0) break;

    const pageResults = await processInBatches(users);
    summaries.push(...pageResults);

    const updatedCount = pageResults.filter((result) => result.updated).length;
    const changedCount = pageResults.filter((result) => result.changed).length;
    console.log(
      `[wallet-backfill] page=${offset}-${offset + users.length - 1} users=${users.length} changed=${changedCount} updated=${updatedCount}`
    );

    offset += users.length;
    if (users.length < pageSize) break;
  }

  const updated = summaries.filter((result) => result.updated).length;
  const changed = summaries.filter((result) => result.changed).length;
  const skipped = summaries.filter((result) => result.skipped).length;
  const errors = summaries.filter((result) => result.error);

  console.log(
    `[wallet-backfill] done changed=${changed} updated=${updated} skipped=${skipped} errors=${errors.length}`
  );

  if (errors.length > 0) {
    console.log('[wallet-backfill] error sample:');
    console.log(JSON.stringify(errors.slice(0, 10), null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[wallet-backfill] fatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
