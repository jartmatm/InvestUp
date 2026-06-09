#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

const REQUIRED_LEDGER_COLUMNS = [
  'id',
  'event_key',
  'source_table',
  'source_id',
  'lifecycle_stage',
  'wallet_action_id',
  'entry_type',
  'projection_payload',
];

const REQUIRED_BALANCE_COLUMNS = [
  'user_id',
  'available_balance',
  'locked_balance',
  'pending_balance',
  'withdrawable_balance',
  'invested_balance',
];

const REQUIRED_PROJECTION_TABLES = ['transactions', 'investments', 'repayments', 'withdraw_TEMP'];

function fail(message) {
  console.error(`[ledger-smoke] ${message}`);
  process.exit(1);
}

async function assertColumns(client, table, columns) {
  const { error } = await client.from(table).select(columns.join(',')).limit(1);
  if (error) {
    throw new Error(`Failed reading ${table}: ${error.message}`);
  }
}

async function readCount(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    throw new Error(`Failed counting ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this smoke check.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await assertColumns(supabase, 'internal_ledger_entries', REQUIRED_LEDGER_COLUMNS);
  await assertColumns(supabase, 'internal_account_balances', REQUIRED_BALANCE_COLUMNS);

  for (const table of REQUIRED_PROJECTION_TABLES) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      throw new Error(`Failed reading projection table ${table}: ${error.message}`);
    }
  }

  const [ledgerCount, balanceCount] = await Promise.all([
    readCount(supabase, 'internal_ledger_entries'),
    readCount(supabase, 'internal_account_balances'),
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        ledger_entries: ledgerCount,
        account_balances: balanceCount,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
