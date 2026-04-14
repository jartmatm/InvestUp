import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';
import {
  detectTransactionsSchema,
  generateLegacyRowIds,
  loadLegacyTransactionsForUser,
  readMetaString,
  type LedgerSchemaMode,
} from '@/lib/supabase-ledger-compat';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';
import type {
  CreateCurrentUserTransactionPayload,
  CurrentUserTransaction,
  TransactionMovementType,
  TransactionStatus,
} from '@/utils/transactions/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type VerifiedRequest =
  | { error: ReturnType<typeof jsonNoStore>; verified: null }
  | {
      error: null;
      verified: Awaited<ReturnType<typeof verifyPrivyAccessToken>>;
    };

type LegacyTransactionRow = {
  id: string | number;
  uuid?: string | null;
  created_at: string;
  type: string | null;
  status: string | null;
  tx_hash: string | null;
  meta?: Record<string, unknown> | null;
  amount?: number | null;
  amount_usdc?: number | null;
};

type ModernTransactionRow = {
  id: string;
  created_at: string;
  movement_type: string | null;
  status: string | null;
  tx_hash: string | null;
  from_wallet: string | null;
  to_wallet: string | null;
  amount?: number | null;
  amount_usdc?: number | null;
};

type Role = 'investor' | 'entrepreneur' | null;

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

let cachedTransactionSchema: 'unknown' | LedgerSchemaMode = 'unknown';

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const coerceString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeSearchQuery = (value: string) => value.trim().replace(/\s+/g, ' ');

const sanitizeSearchFragment = (value: string) =>
  normalizeSearchQuery(value).replace(/[,()]/g, ' ').trim();

const parseLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 200);
};

const parseAmount = (value: unknown) => {
  const raw = coerceString(value);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(6));
};

const coerceRole = (value: unknown): Role => {
  if (value === 'investor') return 'investor';
  if (value === 'entrepreneur') return 'entrepreneur';
  return null;
};

const coerceWriteStatus = (value: unknown): TransactionStatus | null => {
  if (value === undefined || value === null || value === '') return 'submitted';
  if (value === 'submitted') return 'submitted';
  if (value === 'confirmed' || value === 'completed') return 'confirmed';
  if (value === 'failed') return 'failed';
  return null;
};

const normalizeStatus = (value: unknown): TransactionStatus => {
  if (value === 'confirmed' || value === 'completed') return 'confirmed';
  if (value === 'failed') return 'failed';
  return 'submitted';
};

const coerceMovementType = (value: unknown): TransactionMovementType | null => {
  if (
    value === 'investment' ||
    value === 'repayment' ||
    value === 'transfer' ||
    value === 'buy' ||
    value === 'withdrawal'
  ) {
    return value;
  }

  return null;
};

const normalizeMovementType = (value: unknown): TransactionMovementType => {
  return coerceMovementType(value) ?? 'transfer';
};

const normalizeLegacyTransaction = (row: LegacyTransactionRow): CurrentUserTransaction => {
  const meta = isPlainObject(row.meta) ? row.meta : {};

  return {
    id: String(row.id),
    uuid: typeof row.uuid === 'string' ? row.uuid : null,
    created_at: row.created_at,
    movement_type: normalizeMovementType(row.type),
    status: normalizeStatus(row.status),
    tx_hash: row.tx_hash ?? null,
    from_wallet: readMetaString(meta, 'from_wallet'),
    to_wallet: readMetaString(meta, 'to_wallet'),
    amount: getAmountValue(row),
  };
};

const normalizeModernTransaction = (row: ModernTransactionRow): CurrentUserTransaction => ({
  id: String(row.id),
  uuid: null,
  created_at: row.created_at,
  movement_type: normalizeMovementType(row.movement_type),
  status: normalizeStatus(row.status),
  tx_hash: row.tx_hash ?? null,
  from_wallet: row.from_wallet ?? null,
  to_wallet: row.to_wallet ?? null,
  amount: getAmountValue(row),
});

const matchesWallet = (transaction: CurrentUserTransaction, wallet: string) => {
  const normalizedWallet = wallet.toLowerCase();
  return (
    transaction.from_wallet?.toLowerCase() === normalizedWallet ||
    transaction.to_wallet?.toLowerCase() === normalizedWallet
  );
};

async function verifyRequest(request: NextRequest): Promise<VerifiedRequest> {
  const accessToken = extractBearerToken(request.headers.get('authorization'));
  if (!accessToken) {
    return {
      error: jsonNoStore({ error: 'Missing Authorization bearer token.' }, { status: 401 }),
      verified: null,
    };
  }

  try {
    const verified = await verifyPrivyAccessToken(accessToken);
    return { error: null, verified };
  } catch {
    return {
      error: jsonNoStore({ error: 'Invalid access token.' }, { status: 401 }),
      verified: null,
    };
  }
}

async function getTransactionSchema() {
  if (cachedTransactionSchema !== 'unknown') {
    return cachedTransactionSchema;
  }

  const supabase = getSupabaseAdminClient();
  cachedTransactionSchema = await detectTransactionsSchema(supabase);
  return cachedTransactionSchema;
}

async function fetchExistingTransactionByHash(
  userId: string,
  txHash: string
): Promise<CurrentUserTransaction | null> {
  const supabase = getSupabaseAdminClient();
  const transactionSchema = await getTransactionSchema();

  if (transactionSchema === 'legacy') {
    const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
      supabase
        .from('transactions')
        .select(`id,uuid,created_at,type,status,tx_hash,meta,${amountColumn},amount_usdc`)
        .eq('user_id', userId)
        .eq('tx_hash', txHash)
        .maybeSingle()
    );

    if (error || !data) {
      return null;
    }

    return normalizeLegacyTransaction(data as LegacyTransactionRow);
  }

  const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
    supabase
      .from('transactions')
      .select(`id,created_at,movement_type,status,tx_hash,from_wallet,to_wallet,${amountColumn},amount_usdc`)
      .eq('user_id', userId)
      .eq('tx_hash', txHash)
      .maybeSingle()
  );

  if (error || !data) {
    return null;
  }

  return normalizeModernTransaction(data as ModernTransactionRow);
}

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  const search = sanitizeSearchFragment(request.nextUrl.searchParams.get('search') ?? '');
  const wallet = coerceString(request.nextUrl.searchParams.get('wallet'));
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

  if (wallet && !isAddress(wallet)) {
    return jsonNoStore({ error: 'Invalid wallet parameter.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const transactionSchema = await getTransactionSchema();

    if (transactionSchema === 'legacy') {
      let rows: CurrentUserTransaction[] = [];

      if (search) {
        const wildcardTerm = `%${search.replace(/\s+/g, '%')}%`;
        const { data, error: queryError } = await runWithAmountColumnFallback((amountColumn) =>
          supabase
            .from('transactions')
            .select(`id,uuid,created_at,type,status,tx_hash,meta,${amountColumn},amount_usdc`)
            .eq('user_id', verified.userId)
            .or(`tx_hash.ilike.${wildcardTerm},id.ilike.${wildcardTerm}`)
            .order('created_at', { ascending: false })
            .limit(limit)
        );

        if (queryError) {
          return jsonNoStore(
            { error: 'Could not load your transactions.', details: queryError.message },
            { status: 500 }
          );
        }

        rows = ((data ?? []) as LegacyTransactionRow[]).map(normalizeLegacyTransaction);
      } else {
        const { data, error: queryError } = await loadLegacyTransactionsForUser(
          supabase,
          verified.userId,
          limit
        );

        if (queryError) {
          return jsonNoStore(
            { error: 'Could not load your transactions.', details: queryError.message },
            { status: 500 }
          );
        }

        rows = data.map((transaction) => ({
          id: transaction.id,
          uuid: null,
          created_at: transaction.created_at,
          movement_type: normalizeMovementType(transaction.movement_type),
          status: normalizeStatus(transaction.status),
          tx_hash: transaction.tx_hash,
          from_wallet: transaction.from_wallet,
          to_wallet: transaction.to_wallet,
          amount: transaction.amount,
        }));
      }

      if (wallet) {
        rows = rows.filter((transaction) => matchesWallet(transaction, wallet));
      }

      return jsonNoStore({ data: rows.slice(0, limit) }, { status: 200 });
    }

    const { data, error: queryError } = await runWithAmountColumnFallback((amountColumn) => {
      let query = supabase
        .from('transactions')
        .select(`id,created_at,movement_type,status,tx_hash,from_wallet,to_wallet,${amountColumn},amount_usdc`)
        .eq('user_id', verified.userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (search) {
        const wildcardTerm = `%${search.replace(/\s+/g, '%')}%`;
        query = query.or(`tx_hash.ilike.${wildcardTerm},id.ilike.${wildcardTerm}`);
      } else if (wallet) {
        query = query.or(`from_wallet.eq.${wallet},to_wallet.eq.${wallet}`);
      }

      return query;
    });

    if (queryError) {
      return jsonNoStore(
        { error: 'Could not load your transactions.', details: queryError.message },
        { status: 500 }
      );
    }

    let rows = ((data ?? []) as ModernTransactionRow[]).map(normalizeModernTransaction);
    if (wallet && search) {
      rows = rows.filter((transaction) => matchesWallet(transaction, wallet));
    }

    return jsonNoStore({ data: rows }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Transactions request failed.', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  let payload: Partial<CreateCurrentUserTransactionPayload> = {};
  try {
    payload = (await request.json()) as Partial<CreateCurrentUserTransactionPayload>;
  } catch {
    payload = {};
  }

  const txHash = coerceString(payload.txHash);
  const fromWallet = coerceString(payload.fromWallet);
  const toWallet = coerceString(payload.toWallet);
  const amount = parseAmount(payload.amountUsdc);
  const movementType = coerceMovementType(payload.movementType);
  const status = coerceWriteStatus(payload.status);
  const role = coerceRole(payload.role);
  const metadata = isPlainObject(payload.metadata) ? payload.metadata : {};

  if (!txHash) {
    return jsonNoStore({ error: 'A valid txHash is required.' }, { status: 400 });
  }

  if (!movementType) {
    return jsonNoStore({ error: 'A valid movementType is required.' }, { status: 400 });
  }

  if (!status) {
    return jsonNoStore({ error: 'A valid status is required.' }, { status: 400 });
  }

  if (!fromWallet || !isAddress(fromWallet)) {
    return jsonNoStore({ error: 'A valid fromWallet is required.' }, { status: 400 });
  }

  if (!toWallet || !isAddress(toWallet)) {
    return jsonNoStore({ error: 'A valid toWallet is required.' }, { status: 400 });
  }

  if (amount == null) {
    return jsonNoStore({ error: 'A valid amountUsdc is required.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const transactionSchema = await getTransactionSchema();

    if (transactionSchema === 'legacy') {
      const legacyIds = generateLegacyRowIds();
      const { data, error: insertError } = await runWithAmountColumnFallback((amountColumn) =>
        supabase
          .from('transactions')
          .insert({
            id: legacyIds.id,
            uuid: legacyIds.uuid,
            user_id: verified.userId,
            type: movementType,
            status,
            currency: 'USDC',
            tx_hash: txHash,
            meta: {
              app: 'investapp-web',
              role,
              chain: 'polygon',
              from_wallet: fromWallet,
              to_wallet: toWallet,
              ...metadata,
            },
            [amountColumn]: amount,
          })
          .select(`id,uuid,created_at,type,status,tx_hash,meta,${amountColumn},amount_usdc`)
          .maybeSingle()
      );

      if (insertError) {
        const existing = insertError.message?.toLowerCase().includes('duplicate')
          ? await fetchExistingTransactionByHash(verified.userId, txHash)
          : null;

        if (existing) {
          return jsonNoStore({ data: existing }, { status: 200 });
        }

        return jsonNoStore(
          { error: 'Could not save the transaction.', details: insertError.message },
          { status: 500 }
        );
      }

      return jsonNoStore(
        { data: normalizeLegacyTransaction(data as LegacyTransactionRow) },
        { status: 200 }
      );
    }

    const { data, error: insertError } = await runWithAmountColumnFallback((amountColumn) =>
      supabase
        .from('transactions')
        .insert({
          user_id: verified.userId,
          role,
          movement_type: movementType,
          status,
          chain: 'polygon',
          tx_hash: txHash,
          from_wallet: fromWallet,
          to_wallet: toWallet,
          metadata: {
            app: 'investapp-web',
            currency: 'USDC',
            ...metadata,
          },
          [amountColumn]: amount,
        })
        .select(`id,created_at,movement_type,status,tx_hash,from_wallet,to_wallet,${amountColumn},amount_usdc`)
        .maybeSingle()
    );

    if (insertError) {
      const existing = insertError.message?.toLowerCase().includes('duplicate')
        ? await fetchExistingTransactionByHash(verified.userId, txHash)
        : null;

      if (existing) {
        return jsonNoStore({ data: existing }, { status: 200 });
      }

      return jsonNoStore(
        { error: 'Could not save the transaction.', details: insertError.message },
        { status: 500 }
      );
    }

    return jsonNoStore(
      { data: normalizeModernTransaction(data as ModernTransactionRow) },
      { status: 200 }
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Transaction write failed.', details: message }, { status: 500 });
  }
}
