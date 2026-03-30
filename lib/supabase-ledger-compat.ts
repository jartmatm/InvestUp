import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { getAmountValue } from '@/lib/supabase-amount';

export type LedgerSchemaMode = 'modern' | 'legacy';

type UnknownSupabaseClient = SupabaseClient;

type LegacyTransactionRow = {
  id: string | number;
  created_at: string;
  user_id: string | null;
  type: string | null;
  status: string | null;
  tx_hash: string | null;
  amount?: number | null;
  amount_usdc?: number | null;
  meta?: Record<string, unknown> | null;
};

type LegacyInvestmentRow = {
  id: string | number;
  created_at: string;
  investor_id: string | null;
  project_id: string | number | null;
  transaction_id: string | number | null;
  status: string | null;
  amount?: number | null;
  amount_usdc?: number | null;
};

export type LegacyTransactionRecord = {
  id: string;
  created_at: string;
  user_id: string | null;
  movement_type: string;
  status: 'submitted' | 'confirmed' | 'failed';
  tx_hash: string | null;
  amount: number | null;
  from_wallet: string | null;
  to_wallet: string | null;
  meta: Record<string, unknown>;
};

export type LegacyInvestmentRecord = {
  id: string;
  created_at: string;
  investor_user_id: string | null;
  project_id: string;
  transaction_id: string | null;
  status: 'submitted' | 'confirmed' | 'failed';
  amount: number | null;
  tx_hash: string | null;
  from_wallet: string | null;
  to_wallet: string | null;
};

const getErrorText = (error: PostgrestError | null) =>
  `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();

export const isMissingColumnError = (error: PostgrestError | null, columns: string[]) => {
  if (!error) return false;
  const text = getErrorText(error);
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (text.includes('column') && columns.some((column) => text.includes(column.toLowerCase()))) ||
    (text.includes('schema cache') && columns.some((column) => text.includes(column.toLowerCase())))
  );
};

const normalizeLedgerStatus = (value: string | null | undefined): 'submitted' | 'confirmed' | 'failed' => {
  if (value === 'confirmed') return 'confirmed';
  if (value === 'failed') return 'failed';
  return 'submitted';
};

const readMetaObject = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const readMetaString = (meta: Record<string, unknown>, key: string) => {
  const value = meta[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

export const detectTransactionsSchema = async (supabase: UnknownSupabaseClient): Promise<LedgerSchemaMode> => {
  const { error } = await supabase
    .from('transactions')
    .select('id,movement_type,metadata,from_wallet,to_wallet')
    .limit(1);

  return isMissingColumnError(error, ['movement_type', 'metadata', 'from_wallet', 'to_wallet'])
    ? 'legacy'
    : 'modern';
};

export const detectInvestmentsSchema = async (supabase: UnknownSupabaseClient): Promise<LedgerSchemaMode> => {
  const { error } = await supabase
    .from('investments')
    .select('id,investor_user_id,project_title,from_wallet,interest_rate_ea')
    .limit(1);

  return isMissingColumnError(error, [
    'investor_user_id',
    'project_title',
    'from_wallet',
    'interest_rate_ea',
  ])
    ? 'legacy'
    : 'modern';
};

export const generateLegacyRowIds = () => ({
  id: `${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`,
  uuid:
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`,
});

export const loadLegacyTransactionsForUser = async (
  supabase: UnknownSupabaseClient,
  userId: string,
  limit = 12
) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('id,created_at,user_id,type,status,tx_hash,meta,amount,amount_usdc')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [] as LegacyTransactionRecord[], error };
  }

  const rows = ((data ?? []) as LegacyTransactionRow[]).map((row) => {
    const meta = readMetaObject(row.meta);
    return {
      id: String(row.id),
      created_at: row.created_at,
      user_id: row.user_id ?? null,
      movement_type: row.type ?? 'transfer',
      status: normalizeLedgerStatus(row.status),
      tx_hash: row.tx_hash ?? null,
      amount: getAmountValue(row),
      from_wallet: readMetaString(meta, 'from_wallet'),
      to_wallet: readMetaString(meta, 'to_wallet'),
      meta,
    };
  });

  return { data: rows, error: null };
};

export const loadLegacyInvestmentsForInvestor = async (
  supabase: UnknownSupabaseClient,
  investorUserId: string
) => {
  const transactionsResult = await loadLegacyTransactionsForUser(supabase, investorUserId, 100);
  if (transactionsResult.error) return { data: [] as LegacyInvestmentRecord[], error: transactionsResult.error };

  const investmentTransactions = transactionsResult.data.filter(
    (transaction) => transaction.movement_type === 'investment'
  );

  if (investmentTransactions.length === 0) {
    return { data: [] as LegacyInvestmentRecord[], error: null };
  }

  const transactionMap = new Map(
    investmentTransactions.map((transaction) => [transaction.id, transaction])
  );
  const transactionIds = investmentTransactions.map((transaction) => transaction.id);

  const { data, error } = await supabase
    .from('investments')
    .select('id,created_at,investor_id,project_id,transaction_id,status,amount,amount_usdc')
    .in('transaction_id', transactionIds)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [] as LegacyInvestmentRecord[], error };
  }

  const rows = ((data ?? []) as LegacyInvestmentRow[]).map((row) => {
    const transaction = transactionMap.get(String(row.transaction_id ?? ''));
    return {
      id: String(row.id),
      created_at: row.created_at,
      investor_user_id: row.investor_id ?? transaction?.user_id ?? investorUserId,
      project_id: String(row.project_id ?? ''),
      transaction_id: row.transaction_id != null ? String(row.transaction_id) : null,
      status: normalizeLedgerStatus(row.status ?? transaction?.status),
      amount: getAmountValue(row) ?? transaction?.amount ?? null,
      tx_hash: transaction?.tx_hash ?? null,
      from_wallet: transaction?.from_wallet ?? null,
      to_wallet: transaction?.to_wallet ?? null,
    };
  });

  return { data: rows, error: null };
};

export const loadLegacyInvestmentsForProjects = async (
  supabase: UnknownSupabaseClient,
  projectIds: string[]
) => {
  if (projectIds.length === 0) {
    return { data: [] as LegacyInvestmentRecord[], error: null };
  }

  const normalizedProjectIds = projectIds
    .map((projectId) => Number(projectId))
    .filter((projectId) => Number.isFinite(projectId));

  if (normalizedProjectIds.length === 0) {
    return { data: [] as LegacyInvestmentRecord[], error: null };
  }

  const { data, error } = await supabase
    .from('investments')
    .select('id,created_at,investor_id,project_id,transaction_id,status,amount,amount_usdc')
    .in('project_id', normalizedProjectIds)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [] as LegacyInvestmentRecord[], error };
  }

  const investmentRows = (data ?? []) as LegacyInvestmentRow[];
  const transactionIds = Array.from(
    new Set(
      investmentRows
        .map((row) => row.transaction_id)
        .filter((transactionId): transactionId is string | number => transactionId != null)
        .map((transactionId) => String(transactionId))
    )
  );

  const transactionMap = new Map<string, LegacyTransactionRecord>();
  if (transactionIds.length > 0) {
    const transactionsResult = await supabase
      .from('transactions')
      .select('id,created_at,user_id,type,status,tx_hash,meta,amount,amount_usdc')
      .in('id', transactionIds);

    if (transactionsResult.error) {
      return { data: [] as LegacyInvestmentRecord[], error: transactionsResult.error };
    }

    ((transactionsResult.data ?? []) as LegacyTransactionRow[]).forEach((row) => {
      const meta = readMetaObject(row.meta);
      transactionMap.set(String(row.id), {
        id: String(row.id),
        created_at: row.created_at,
        user_id: row.user_id ?? null,
        movement_type: row.type ?? 'investment',
        status: normalizeLedgerStatus(row.status),
        tx_hash: row.tx_hash ?? null,
        amount: getAmountValue(row),
        from_wallet: readMetaString(meta, 'from_wallet'),
        to_wallet: readMetaString(meta, 'to_wallet'),
        meta,
      });
    });
  }

  const rows = investmentRows.map((row) => {
    const transaction = row.transaction_id != null ? transactionMap.get(String(row.transaction_id)) : null;
    return {
      id: String(row.id),
      created_at: row.created_at,
      investor_user_id: row.investor_id ?? transaction?.user_id ?? null,
      project_id: String(row.project_id ?? ''),
      transaction_id: row.transaction_id != null ? String(row.transaction_id) : null,
      status: normalizeLedgerStatus(row.status ?? transaction?.status),
      amount: getAmountValue(row) ?? transaction?.amount ?? null,
      tx_hash: transaction?.tx_hash ?? null,
      from_wallet: transaction?.from_wallet ?? null,
      to_wallet: transaction?.to_wallet ?? null,
    };
  });

  return { data: rows, error: null };
};
