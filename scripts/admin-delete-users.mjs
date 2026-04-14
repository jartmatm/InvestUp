#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { PrivyClient } from '@privy-io/node';

const cwd = process.cwd();
const envFilePath = path.join(cwd, '.env.local');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(envFilePath);

function parseArgs(argv) {
  const parsed = {
    execute: false,
    json: false,
    identifiers: [],
    file: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--execute') {
      parsed.execute = true;
      continue;
    }
    if (arg === '--json') {
      parsed.json = true;
      continue;
    }
    if (arg === '--identifiers' || arg === '--ids') {
      parsed.identifiers.push(argv[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (arg === '--file') {
      parsed.file = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    parsed.identifiers.push(arg);
  }

  return parsed;
}

function splitIdentifiers(value) {
  return String(value ?? '')
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    map.set(key, item);
  }
  return Array.from(map.values());
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isMissingRelationError(error) {
  const message = `${error?.message ?? ''}`.toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist');
}

function isNotFoundError(error) {
  const message = `${error?.message ?? ''}`.toLowerCase();
  return error?.status === 404 || message.includes('not found') || message.includes('404');
}

function isRateLimitError(error) {
  const message = `${error?.message ?? ''}`.toLowerCase();
  const code = `${error?.code ?? ''}`.toLowerCase();
  return error?.status === 429 || code === 'too_many_requests' || message.includes('too many requests');
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function isPrivyDid(value) {
  return /^did:privy:/u.test(value);
}

function normalizeProjectId(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function toNumericProjectIds(values) {
  return unique(
    values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .map((value) => value)
  );
}

function collectWalletAddressesFromLinkedAccount(account, collector) {
  if (!account || typeof account !== 'object') return;
  if (typeof account.address === 'string' && account.address.trim()) {
    collector.add(account.address.trim().toLowerCase());
  }

  for (const nestedKey of ['smart_wallets', 'embedded_wallets', 'wallets']) {
    const nested = account[nestedKey];
    if (!Array.isArray(nested)) continue;
    for (const item of nested) {
      if (item && typeof item === 'object' && typeof item.address === 'string' && item.address.trim()) {
        collector.add(item.address.trim().toLowerCase());
      }
    }
  }
}

function collectEmailsFromLinkedAccount(account, collector) {
  if (!account || typeof account !== 'object') return;
  if (typeof account.address === 'string' && account.type === 'email') {
    collector.add(account.address.trim().toLowerCase());
  }
  if (typeof account.email === 'string' && account.email.trim()) {
    collector.add(account.email.trim().toLowerCase());
  }
}

function buildTargetRecord(userId) {
  return {
    userId,
    inputs: new Set(),
    emails: new Set(),
    wallets: new Set(),
    privyUser: null,
    supabaseUsers: [],
  };
}

function normalizeTargetForOutput(target) {
  return {
    userId: target.userId,
    inputs: Array.from(target.inputs),
    emails: Array.from(target.emails),
    wallets: Array.from(target.wallets),
    existsInPrivy: Boolean(target.privyUser),
    existsInSupabase: target.supabaseUsers.length > 0,
  };
}

function toProjectStatusAfterFunding(currentStatus, nextAmountReceived) {
  if (nextAmountReceived > 0 && currentStatus !== 'closed') {
    return 'financing_in_progress';
  }
  if (currentStatus === 'active') return 'published';
  return currentStatus ?? 'published';
}

function printReport(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const modeLabel = report.execute ? 'EXECUTE' : 'DRY RUN';
  console.log(`\n[${modeLabel}] admin-delete-users`);
  console.log(`Targets resolved: ${report.targets.length}`);
  console.log(`Inputs unresolved: ${report.unresolved.length}`);

  if (report.targets.length > 0) {
    console.log('\nResolved targets:');
    for (const target of report.targets) {
      const label = target.emails[0] ?? target.inputs[0] ?? target.userId;
      console.log(
        `- ${label} -> ${target.userId} | privy=${target.existsInPrivy ? 'yes' : 'no'} | supabase=${target.existsInSupabase ? 'yes' : 'no'} | wallets=${target.wallets.length}`
      );
    }
  }

  if (report.unresolved.length > 0) {
    console.log('\nUnresolved inputs:');
    for (const item of report.unresolved) {
      console.log(`- ${item}`);
    }
  }

  console.log('\nRows matched:');
  for (const [table, count] of Object.entries(report.counts)) {
    console.log(`- ${table}: ${count}`);
  }

  if (report.blockers.length > 0) {
    console.log('\nBlockers:');
    for (const blocker of report.blockers) {
      console.log(`- ${blocker}`);
    }
  }

  if (report.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of report.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (report.execution) {
    console.log('\nExecution summary:');
    for (const [table, count] of Object.entries(report.execution.deleted)) {
      console.log(`- deleted ${table}: ${count}`);
    }
    if (report.execution.privyDeleted.length > 0) {
      console.log(`- deleted Privy users: ${report.execution.privyDeleted.join(', ')}`);
    }
    if (report.execution.privyFailed.length > 0) {
      console.log(`- Privy delete failed: ${report.execution.privyFailed.join(', ')}`);
    }
    if (report.execution.recomputedProjects.length > 0) {
      console.log(`- recomputed projects: ${report.execution.recomputedProjects.join(', ')}`);
    }
  }
}

function getEnvOrThrow(name, fallbackNames = []) {
  const candidates = [name, ...fallbackNames];
  for (const candidate of candidates) {
    const value = process.env[candidate];
    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }
  throw new Error(`Missing environment variable: ${candidates.join(' or ')}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const args = parseArgs(process.argv.slice(2));
const inputIdentifiers = unique([
  ...args.identifiers.flatMap(splitIdentifiers),
  ...(args.file ? splitIdentifiers(fs.readFileSync(path.resolve(cwd, args.file), 'utf8')) : []),
]);

if (inputIdentifiers.length === 0) {
  console.error(
    'Usage: node scripts/admin-delete-users.mjs --identifiers "user1@example.com,did:privy:abc" [--execute] [--json]'
  );
  process.exit(1);
}

const supabaseUrl = getEnvOrThrow('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceRoleKey = getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY');
const privyAppId = getEnvOrThrow('PRIVY_APP_ID', ['NEXT_PUBLIC_PRIVY_APP_ID']);
const privyAppSecret = getEnvOrThrow('PRIVY_APP_SECRET');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const privy = new PrivyClient({ appId: privyAppId, appSecret: privyAppSecret });

async function fetchTableByField(table, field, values) {
  if (!values.length) return [];
  const { data, error } = await supabase.from(table).select('*').in(field, values);
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(`${table}.${field}: ${error.message}`);
  }
  return asArray(data);
}

async function fetchTableByContains(table, field, value) {
  const { data, error } = await supabase.from(table).select('*').contains(field, [value]);
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(`${table}.${field}: ${error.message}`);
  }
  return asArray(data);
}

async function fetchSinglePrivyUserById(userId) {
  try {
    return await privy.users()._get(userId);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function fetchSinglePrivyUserByEmail(email) {
  try {
    return await privy.users().getByEmailAddress({ address: email });
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function resolveTargets(identifiers) {
  const targetsByUserId = new Map();
  const unresolved = [];

  for (const identifier of identifiers) {
    const normalized = identifier.trim();
    if (!normalized) continue;

    let privyUser = null;
    let supabaseMatches = [];

    if (isEmail(normalized)) {
      privyUser = await fetchSinglePrivyUserByEmail(normalized.toLowerCase());
      supabaseMatches = await fetchTableByField('users', 'email', [normalized.toLowerCase()]);
    } else {
      privyUser = await fetchSinglePrivyUserById(normalized);
      supabaseMatches = await fetchTableByField('users', 'id', [normalized]);
    }

    const candidateUserIds = unique([
      privyUser?.id ?? null,
      ...supabaseMatches.map((row) => (typeof row.id === 'string' ? row.id : null)),
    ]);

    if (candidateUserIds.length === 0) {
      unresolved.push(normalized);
      continue;
    }

    for (const userId of candidateUserIds) {
      const target = targetsByUserId.get(userId) ?? buildTargetRecord(userId);
      target.inputs.add(normalized);

      const matchingSupabaseUsers = supabaseMatches.filter((row) => row.id === userId);
      target.supabaseUsers = uniqueBy([...target.supabaseUsers, ...matchingSupabaseUsers], (row) => row.id);

      if (privyUser?.id === userId) {
        target.privyUser = privyUser;
        for (const account of asArray(privyUser.linked_accounts)) {
          collectWalletAddressesFromLinkedAccount(account, target.wallets);
          collectEmailsFromLinkedAccount(account, target.emails);
        }
      }

      for (const row of matchingSupabaseUsers) {
        if (typeof row.email === 'string' && row.email.trim()) {
          target.emails.add(row.email.trim().toLowerCase());
        }
        if (typeof row.wallet_address === 'string' && row.wallet_address.trim()) {
          target.wallets.add(row.wallet_address.trim().toLowerCase());
        }
      }

      targetsByUserId.set(userId, target);
    }
  }

  return {
    targets: Array.from(targetsByUserId.values()),
    unresolved: unique(unresolved),
  };
}

function mergeRows(...groups) {
  return uniqueBy(groups.flat(), (row) => row.id ?? row.user_id ?? row.credit_id ?? row.reference_id);
}

function summarizeCounts(dataset) {
  return {
    users: dataset.users.length,
    projects: dataset.projects.length,
    investments: dataset.investments.length,
    repayments: dataset.repayments.length,
    payment_schedule: dataset.paymentSchedules.length,
    transactions: dataset.transactions.length,
    withdraw_TEMP: dataset.withdrawals.length,
    internal_contracts: dataset.internalContracts.length,
    internal_ledger_entries: dataset.internalLedgerEntries.length,
    internal_account_balances: dataset.internalBalances.length,
  };
}

async function collectDataset(targets) {
  const targetUserIds = unique(targets.map((target) => target.userId));
  const targetEmails = unique(targets.flatMap((target) => Array.from(target.emails)));
  const targetWallets = unique(targets.flatMap((target) => Array.from(target.wallets)));

  const [
    usersById,
    usersByEmail,
    projectsByOwnerUserId,
    projectsByOwnerId,
    investmentsByInvestor,
    investmentsByEntrepreneur,
    repaymentsByEntrepreneur,
    repaymentsByInvestor,
    paymentSchedulesByInvestor,
    paymentSchedulesByEntrepreneur,
    transactionsByUser,
    withdrawalsByUser,
    internalContractsByInvestor,
    internalContractsByEntrepreneur,
    internalBalancesByUser,
    transactionsByFromWallet,
    transactionsByToWallet,
  ] = await Promise.all([
    fetchTableByField('users', 'id', targetUserIds),
    fetchTableByField('users', 'email', targetEmails),
    fetchTableByField('projects', 'owner_user_id', targetUserIds),
    fetchTableByField('projects', 'owner_id', targetUserIds),
    fetchTableByField('investments', 'investor_user_id', targetUserIds),
    fetchTableByField('investments', 'entrepreneur_user_id', targetUserIds),
    fetchTableByField('repayments', 'entrepreneur_user_id', targetUserIds),
    fetchTableByField('repayments', 'investor_user_id', targetUserIds),
    fetchTableByField('payment_schedule', 'investor_user_id', targetUserIds),
    fetchTableByField('payment_schedule', 'entrepreneur_user_id', targetUserIds),
    fetchTableByField('transactions', 'user_id', targetUserIds),
    fetchTableByField('withdraw_TEMP', 'user_id', targetUserIds),
    fetchTableByField('internal_contracts', 'investor_user_id', targetUserIds),
    fetchTableByField('internal_contracts', 'entrepreneur_user_id', targetUserIds),
    fetchTableByField('internal_account_balances', 'user_id', targetUserIds),
    fetchTableByField('transactions', 'from_wallet', targetWallets),
    fetchTableByField('transactions', 'to_wallet', targetWallets),
  ]);

  const users = mergeRows(usersById, usersByEmail);
  const projects = mergeRows(projectsByOwnerUserId, projectsByOwnerId);
  const directInvestments = mergeRows(investmentsByInvestor, investmentsByEntrepreneur);
  const directRepayments = mergeRows(repaymentsByEntrepreneur, repaymentsByInvestor);
  const directPaymentSchedules = mergeRows(paymentSchedulesByInvestor, paymentSchedulesByEntrepreneur);
  const directTransactions = mergeRows(transactionsByUser);
  const withdrawals = mergeRows(withdrawalsByUser);
  const directInternalContracts = mergeRows(internalContractsByInvestor, internalContractsByEntrepreneur);
  const internalBalances = mergeRows(internalBalancesByUser);
  const walletTransactions = mergeRows(transactionsByFromWallet, transactionsByToWallet);

  const targetProjectIds = unique(projects.map((row) => normalizeProjectId(row.id)));
  const numericTargetProjectIds = toNumericProjectIds(targetProjectIds);

  const [
    projectInvestments,
    projectRepayments,
    projectInternalContracts,
    projectInternalEntries,
    projectPaymentSchedules,
  ] = await Promise.all([
    fetchTableByField('investments', 'project_id', targetProjectIds),
    fetchTableByField('repayments', 'project_id', targetProjectIds),
    fetchTableByField('internal_contracts', 'project_id', targetProjectIds),
    fetchTableByField('internal_ledger_entries', 'project_id', targetProjectIds),
    fetchTableByField('payment_schedule', 'project_id', numericTargetProjectIds),
  ]);

  const directInternalEntryGroups = await Promise.all([
    fetchTableByField('internal_ledger_entries', 'primary_user_id', targetUserIds),
    fetchTableByField('internal_ledger_entries', 'counterparty_user_id', targetUserIds),
    ...targetUserIds.map((userId) => fetchTableByContains('internal_ledger_entries', 'affected_user_ids', userId)),
  ]);

  const investments = mergeRows(directInvestments, projectInvestments);
  const repayments = mergeRows(directRepayments, projectRepayments);
  const paymentSchedules = mergeRows(directPaymentSchedules, projectPaymentSchedules);
  const internalContracts = mergeRows(directInternalContracts, projectInternalContracts);

  const referenceIds = unique([
    ...investments.map((row) => String(row.id)),
    ...repayments.map((row) => String(row.id)),
    ...withdrawals.map((row) => String(row.id)),
  ]);

  const referencedInternalEntries = referenceIds.length
    ? await fetchTableByField('internal_ledger_entries', 'reference_id', referenceIds)
    : [];

  const internalLedgerEntries = mergeRows(
    ...directInternalEntryGroups,
    projectInternalEntries,
    referencedInternalEntries
  );

  return {
    targetUserIds,
    targetEmails,
    targetWallets,
    targetProjectIds,
    users,
    projects,
    investments,
    repayments,
    paymentSchedules,
    transactions: directTransactions,
    walletTransactions,
    withdrawals,
    internalContracts,
    internalLedgerEntries,
    internalBalances,
  };
}

function findBlockers(dataset) {
  const blockers = [];
  const warnings = [];
  const targetUserIdSet = new Set(dataset.targetUserIds);
  const targetProjectIdSet = new Set(dataset.targetProjectIds);
  const targetWalletSet = new Set(dataset.targetWallets);

  const externalInvestmentsInTargetProjects = dataset.investments.filter((row) => {
    const projectId = normalizeProjectId(row.project_id);
    const investorUserId = typeof row.investor_user_id === 'string' ? row.investor_user_id : null;
    return projectId && targetProjectIdSet.has(projectId) && investorUserId && !targetUserIdSet.has(investorUserId);
  });

  if (externalInvestmentsInTargetProjects.length > 0) {
    for (const row of externalInvestmentsInTargetProjects) {
      blockers.push(
        `Project ${row.project_id} owned by a target account has a non-target investor ${row.investor_user_id} on investment ${row.id}.`
      );
    }
  }

  const externalSchedulesInTargetProjects = dataset.paymentSchedules.filter((row) => {
    const projectId = normalizeProjectId(row.project_id);
    const investorUserId = typeof row.investor_user_id === 'string' ? row.investor_user_id : null;
    return projectId && targetProjectIdSet.has(projectId) && investorUserId && !targetUserIdSet.has(investorUserId);
  });

  if (externalSchedulesInTargetProjects.length > 0) {
    for (const row of externalSchedulesInTargetProjects) {
      blockers.push(
        `Project ${row.project_id} owned by a target account has a non-target payment schedule for investor ${row.investor_user_id}.`
      );
    }
  }

  const externalWalletTransactions = dataset.walletTransactions.filter((row) => {
    const userId = typeof row.user_id === 'string' ? row.user_id : null;
    const fromWallet = typeof row.from_wallet === 'string' ? row.from_wallet.toLowerCase() : null;
    const toWallet = typeof row.to_wallet === 'string' ? row.to_wallet.toLowerCase() : null;
    return (
      (!userId || !targetUserIdSet.has(userId)) &&
      ((fromWallet && targetWalletSet.has(fromWallet)) || (toWallet && targetWalletSet.has(toWallet)))
    );
  });

  if (externalWalletTransactions.length > 0) {
    for (const row of externalWalletTransactions) {
      warnings.push(
        `Non-target transaction ${row.id} references a target wallet (owner user_id=${row.user_id ?? 'unknown'}).`
      );
    }
  }

  return { blockers: unique(blockers), warnings: unique(warnings) };
}

async function deleteByIds(table, field, ids) {
  const values = unique(ids);
  if (!values.length) return 0;
  const { data, error } = await supabase.from(table).delete().in(field, values).select(field);
  if (error) {
    if (isMissingRelationError(error)) return 0;
    throw new Error(`delete ${table}: ${error.message}`);
  }
  return asArray(data).length;
}

async function recomputeProjectFunding(projectId) {
  const { data: projectRows, error: projectError } = await supabase
    .from('projects')
    .select('id,status')
    .eq('id', projectId)
    .limit(1);

  if (projectError) {
    throw new Error(`projects(${projectId}): ${projectError.message}`);
  }

  const project = asArray(projectRows)[0];
  if (!project) return false;

  const { data: investmentRows, error: investmentError } = await supabase
    .from('investments')
    .select('amount_usdc,amount,status')
    .eq('project_id', projectId)
    .in('status', ['submitted', 'confirmed']);

  if (investmentError) {
    throw new Error(`investments(project_id=${projectId}): ${investmentError.message}`);
  }

  const nextRaised = Number(
    asArray(investmentRows)
      .reduce((total, row) => total + Number(row.amount ?? row.amount_usdc ?? 0), 0)
      .toFixed(2)
  );

  const nextStatus = toProjectStatusAfterFunding(project.status ?? null, nextRaised);
  const { error: updateError } = await supabase
    .from('projects')
    .update({ amount_received: nextRaised, status: nextStatus })
    .eq('id', projectId);

  if (updateError) {
    throw new Error(`projects.update(${projectId}): ${updateError.message}`);
  }

  return true;
}

async function executeDeletion(targets, dataset) {
  const deleted = {
    internal_ledger_entries: 0,
    internal_contracts: 0,
    payment_schedule: 0,
    repayments: 0,
    investments: 0,
    transactions: 0,
    withdraw_TEMP: 0,
    projects: 0,
    internal_account_balances: 0,
    users: 0,
  };

  deleted.internal_ledger_entries = await deleteByIds(
    'internal_ledger_entries',
    'id',
    dataset.internalLedgerEntries.map((row) => row.id)
  );

  deleted.internal_contracts = await deleteByIds(
    'internal_contracts',
    'id',
    dataset.internalContracts.map((row) => row.id)
  );

  deleted.payment_schedule = await deleteByIds(
    'payment_schedule',
    'id',
    dataset.paymentSchedules.map((row) => row.id)
  );

  deleted.repayments = await deleteByIds(
    'repayments',
    'id',
    dataset.repayments.map((row) => row.id)
  );

  deleted.investments = await deleteByIds(
    'investments',
    'id',
    dataset.investments.map((row) => row.id)
  );

  deleted.transactions = await deleteByIds(
    'transactions',
    'id',
    dataset.transactions.map((row) => row.id)
  );

  deleted.withdraw_TEMP = await deleteByIds(
    'withdraw_TEMP',
    'id',
    dataset.withdrawals.map((row) => row.id)
  );

  const projectIds = unique(dataset.projects.map((row) => row.id));
  if (projectIds.length > 0) {
    const { error: resetError } = await supabase
      .from('projects')
      .update({ amount_received: 0, status: 'draft' })
      .in('id', projectIds);

    if (resetError) {
      throw new Error(`projects reset before delete: ${resetError.message}`);
    }
  }

  deleted.projects = await deleteByIds('projects', 'id', projectIds);

  deleted.internal_account_balances = await deleteByIds(
    'internal_account_balances',
    'user_id',
    dataset.internalBalances.map((row) => row.user_id)
  );

  deleted.users = await deleteByIds(
    'users',
    'id',
    dataset.users.map((row) => row.id)
  );

  const affectedProjectIds = unique(
    [...dataset.investments, ...dataset.repayments]
      .map((row) => normalizeProjectId(row.project_id))
      .filter((projectId) => projectId && !projectIds.includes(projectId))
  );

  const recomputedProjects = [];
  for (const projectId of affectedProjectIds) {
    const recomputed = await recomputeProjectFunding(projectId);
    if (recomputed) {
      recomputedProjects.push(projectId);
    }
  }

  const privyDeleted = [];
  const privyFailed = [];

  for (const target of targets) {
    if (!target.privyUser?.id) continue;
    try {
      await deletePrivyUserWithRetry(target.privyUser.id);
      privyDeleted.push(target.privyUser.id);
    } catch (error) {
      privyFailed.push(
        `${target.privyUser.id} (${error instanceof Error ? error.message : 'unknown error'})`
      );
    }
  }

  return { deleted, privyDeleted, privyFailed, recomputedProjects };
}

async function deletePrivyUserWithRetry(userId, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts ?? 6));
  const baseDelayMs = Math.max(250, Number(options.baseDelayMs ?? 1500));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await privy.users().delete(userId);
      return;
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }

      if (!isRateLimitError(error) || attempt === maxAttempts) {
        throw error;
      }

      await sleep(baseDelayMs * attempt);
    }
  }
}

async function main() {
  const resolution = await resolveTargets(inputIdentifiers);
  const targets = resolution.targets;

  if (targets.length === 0) {
    const emptyReport = {
      execute: false,
      targets: [],
      unresolved: resolution.unresolved,
      counts: {
        users: 0,
        projects: 0,
        investments: 0,
        repayments: 0,
        payment_schedule: 0,
        transactions: 0,
        withdraw_TEMP: 0,
        internal_contracts: 0,
        internal_ledger_entries: 0,
        internal_account_balances: 0,
      },
      blockers: [],
      warnings: [],
      execution: null,
    };
    printReport(emptyReport, args.json);
    process.exitCode = 1;
    return;
  }

  const dataset = await collectDataset(targets);
  const { blockers, warnings } = findBlockers(dataset);

  const report = {
    execute: false,
    targets: targets.map(normalizeTargetForOutput),
    unresolved: resolution.unresolved,
    counts: summarizeCounts(dataset),
    blockers,
    warnings,
    execution: null,
  };

  if (!args.execute || blockers.length > 0) {
    printReport(report, args.json);
    if (blockers.length > 0) {
      process.exitCode = 2;
    }
    return;
  }

  const execution = await executeDeletion(targets, dataset);
  report.execute = true;
  report.execution = execution;
  printReport(report, args.json);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
