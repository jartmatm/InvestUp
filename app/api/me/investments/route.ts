import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';
import {
  detectInvestmentsSchema,
  generateLegacyRowIds,
  loadLegacyInvestmentsForInvestor,
  loadLegacyInvestmentsForProjects,
} from '@/lib/supabase-ledger-compat';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';
import type {
  CreateCurrentUserInvestmentPayload,
  CurrentUserInvestment,
  CurrentUserInvestmentStatus,
} from '@/utils/investments/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LedgerScope = 'investor' | 'entrepreneur';
type LedgerSchemaMode = 'unknown' | 'modern' | 'legacy';

type LegacyInvestmentRow = {
  id: string | number;
  created_at: string;
  investor_user_id: string | null;
  project_id: string;
  status: string | null;
  amount: number | null;
  tx_hash: string | null;
  from_wallet: string | null;
  to_wallet: string | null;
};

type ModernInvestmentRow = {
  id: string;
  created_at: string;
  project_id: string | number;
  project_title: string | null;
  investor_user_id: string | null;
  entrepreneur_user_id: string | null;
  tx_hash: string | null;
  from_wallet: string | null;
  to_wallet: string | null;
  amount?: number | null;
  amount_usdc?: number | null;
  interest_rate_ea: number | null;
  term_months: number | null;
  projected_return_usdc: number | null;
  projected_total_usdc: number | null;
  status: string | null;
};

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

let cachedInvestmentsSchema: LedgerSchemaMode = 'unknown';

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const coerceString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const parseAmount = (value: unknown) => {
  const raw = coerceString(value);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(6));
};

const coerceNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeProjectFilter = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : value;
};

const parseLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 200);
};

const parseScope = (value: string | null): LedgerScope =>
  value === 'entrepreneur' ? 'entrepreneur' : 'investor';

const parseStatuses = (value: string | null): CurrentUserInvestmentStatus[] => {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const allowed = items.filter(
    (item): item is CurrentUserInvestmentStatus =>
      item === 'submitted' || item === 'confirmed' || item === 'failed'
  );

  return allowed.length > 0 ? allowed : ['submitted', 'confirmed'];
};

const normalizeStatus = (value: string | null | undefined): CurrentUserInvestmentStatus => {
  if (value === 'confirmed') return 'confirmed';
  if (value === 'failed') return 'failed';
  return 'submitted';
};

const normalizeLegacyInvestment = (row: LegacyInvestmentRow): CurrentUserInvestment => ({
  id: String(row.id),
  created_at: row.created_at,
  project_id: String(row.project_id ?? ''),
  project_title: null,
  investor_user_id: row.investor_user_id ?? null,
  entrepreneur_user_id: null,
  tx_hash: row.tx_hash ?? null,
  from_wallet: row.from_wallet ?? null,
  to_wallet: row.to_wallet ?? null,
  amount: row.amount ?? null,
  interest_rate_ea: null,
  term_months: null,
  projected_return_usdc: null,
  projected_total_usdc: null,
  status: normalizeStatus(row.status),
});

const normalizeModernInvestment = (row: ModernInvestmentRow): CurrentUserInvestment => ({
  id: row.id,
  created_at: row.created_at,
  project_id: String(row.project_id ?? ''),
  project_title: row.project_title ?? null,
  investor_user_id: row.investor_user_id ?? null,
  entrepreneur_user_id: row.entrepreneur_user_id ?? null,
  tx_hash: row.tx_hash ?? null,
  from_wallet: row.from_wallet ?? null,
  to_wallet: row.to_wallet ?? null,
  amount: getAmountValue(row),
  interest_rate_ea: row.interest_rate_ea ?? null,
  term_months: row.term_months ?? null,
  projected_return_usdc: row.projected_return_usdc ?? null,
  projected_total_usdc: row.projected_total_usdc ?? null,
  status: normalizeStatus(row.status),
});

async function verifyRequest(request: NextRequest) {
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

async function getInvestmentsSchema() {
  if (cachedInvestmentsSchema !== 'unknown') {
    return cachedInvestmentsSchema;
  }

  cachedInvestmentsSchema = await detectInvestmentsSchema(getSupabaseAdminClient());
  return cachedInvestmentsSchema;
}

async function getOwnedProjectIds(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ id: string | number }>).map((item) => String(item.id));
}

async function fetchExistingModernInvestment(
  userId: string,
  txHash: string
): Promise<CurrentUserInvestment | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
    supabase
      .from('investments')
      .select(
        `id,created_at,project_id,project_title,investor_user_id,entrepreneur_user_id,tx_hash,from_wallet,to_wallet,${amountColumn},amount_usdc,interest_rate_ea,term_months,projected_return_usdc,projected_total_usdc,status`
      )
      .eq('investor_user_id', userId)
      .eq('tx_hash', txHash)
      .maybeSingle()
  );

  if (error || !data) {
    return null;
  }

  return normalizeModernInvestment(data as ModernInvestmentRow);
}

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  const scope = parseScope(request.nextUrl.searchParams.get('scope'));
  const projectId = coerceString(request.nextUrl.searchParams.get('projectId'));
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
  const statuses = parseStatuses(request.nextUrl.searchParams.get('statuses'));

  try {
    const supabase = getSupabaseAdminClient();
    const schema = await getInvestmentsSchema();

    if (schema === 'legacy') {
      let items: CurrentUserInvestment[] = [];

      if (scope === 'entrepreneur') {
        const ownedProjectIds = await getOwnedProjectIds(verified.userId);
        const filteredProjectIds = projectId
          ? ownedProjectIds.filter((item) => item === projectId)
          : ownedProjectIds;

        const { data, error: queryError } = await loadLegacyInvestmentsForProjects(
          supabase,
          filteredProjectIds
        );

        if (queryError) {
          return jsonNoStore(
            { error: 'Could not load your investments.', details: queryError.message },
            { status: 500 }
          );
        }

        items = data
          .map((item) =>
            normalizeLegacyInvestment({
              id: item.id,
              created_at: item.created_at,
              investor_user_id: item.investor_user_id,
              project_id: item.project_id,
              status: item.status,
              amount: item.amount,
              tx_hash: item.tx_hash,
              from_wallet: item.from_wallet,
              to_wallet: item.to_wallet,
            })
          )
          .filter((item) => statuses.includes(item.status));
      } else {
        const { data, error: queryError } = await loadLegacyInvestmentsForInvestor(
          supabase,
          verified.userId
        );

        if (queryError) {
          return jsonNoStore(
            { error: 'Could not load your investments.', details: queryError.message },
            { status: 500 }
          );
        }

        items = data
          .map((item) =>
            normalizeLegacyInvestment({
              id: item.id,
              created_at: item.created_at,
              investor_user_id: item.investor_user_id,
              project_id: item.project_id,
              status: item.status,
              amount: item.amount,
              tx_hash: item.tx_hash,
              from_wallet: item.from_wallet,
              to_wallet: item.to_wallet,
            })
          )
          .filter((item) => (projectId ? item.project_id === projectId : true))
          .filter((item) => statuses.includes(item.status));
      }

      return jsonNoStore({ data: items.slice(0, limit) }, { status: 200 });
    }

    const { data, error: queryError } = await runWithAmountColumnFallback((amountColumn) => {
      let query = supabase
        .from('investments')
        .select(
          `id,created_at,project_id,project_title,investor_user_id,entrepreneur_user_id,tx_hash,from_wallet,to_wallet,${amountColumn},amount_usdc,interest_rate_ea,term_months,projected_return_usdc,projected_total_usdc,status`
        )
        .in('status', statuses)
        .order('created_at', { ascending: false })
        .limit(limit);

      query =
        scope === 'entrepreneur'
          ? query.eq('entrepreneur_user_id', verified.userId)
          : query.eq('investor_user_id', verified.userId);

      if (projectId) {
        query = query.eq('project_id', normalizeProjectFilter(projectId));
      }

      return query;
    });

    if (queryError) {
      return jsonNoStore(
        { error: 'Could not load your investments.', details: queryError.message },
        { status: 500 }
      );
    }

    return jsonNoStore(
      { data: ((data ?? []) as ModernInvestmentRow[]).map(normalizeModernInvestment) },
      { status: 200 }
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Investments request failed.', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  let payload: Partial<CreateCurrentUserInvestmentPayload> = {};
  try {
    payload = (await request.json()) as Partial<CreateCurrentUserInvestmentPayload>;
  } catch {
    payload = {};
  }

  const txHash = coerceString(payload.txHash);
  const fromWallet = coerceString(payload.fromWallet);
  const toWallet = coerceString(payload.toWallet);
  const projectId = coerceString(payload.projectId);
  const projectTitle = coerceString(payload.projectTitle);
  const amount = parseAmount(payload.amountUsdc);
  const transactionId = coerceString(payload.transactionId);
  const entrepreneurUserId = coerceString(payload.entrepreneurUserId) || null;
  const entrepreneurName = coerceString(payload.entrepreneurName) || null;
  const currency = coerceString(payload.currency) || 'USDC';
  const interestRateEa = coerceNumber(payload.interestRateEa);
  const termMonths = coerceNumber(payload.termMonths);
  const projectedReturnUsdc = coerceNumber(payload.projectedReturnUsdc);
  const projectedTotalUsdc = coerceNumber(payload.projectedTotalUsdc);

  if (!txHash) {
    return jsonNoStore({ error: 'A valid txHash is required.' }, { status: 400 });
  }

  if (!fromWallet || !isAddress(fromWallet)) {
    return jsonNoStore({ error: 'A valid fromWallet is required.' }, { status: 400 });
  }

  if (!toWallet || !isAddress(toWallet)) {
    return jsonNoStore({ error: 'A valid toWallet is required.' }, { status: 400 });
  }

  if (!projectId) {
    return jsonNoStore({ error: 'A valid projectId is required.' }, { status: 400 });
  }

  if (!projectTitle) {
    return jsonNoStore({ error: 'A valid projectTitle is required.' }, { status: 400 });
  }

  if (amount == null) {
    return jsonNoStore({ error: 'A valid amountUsdc is required.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const schema = await getInvestmentsSchema();

    if (schema === 'legacy') {
      const legacyProjectId = Number(projectId);
      if (!Number.isFinite(legacyProjectId)) {
        return jsonNoStore(
          { error: 'Legacy investments table requires a numeric project id.' },
          { status: 400 }
        );
      }

      const legacyTransactionId =
        transactionId && Number.isFinite(Number(transactionId)) ? Number(transactionId) : null;
      const legacyIds = generateLegacyRowIds();
      const { data, error: insertError } = await runWithAmountColumnFallback((amountColumn) =>
        supabase
          .from('investments')
          .insert({
            id: legacyIds.id,
            uuid: legacyIds.uuid,
            investor_id: verified.userId,
            project_id: legacyProjectId,
            transaction_id: legacyTransactionId,
            status: 'confirmed',
            [amountColumn]: amount,
          })
          .select('id,created_at,investor_id,project_id,transaction_id,status,amount,amount_usdc')
          .maybeSingle()
      );

      if (insertError) {
        return jsonNoStore(
          { error: 'Could not save the investment.', details: insertError.message },
          { status: 500 }
        );
      }

      return jsonNoStore(
        {
          data: normalizeLegacyInvestment({
            id: (data as LegacyInvestmentRow | null)?.id ?? legacyIds.id,
            created_at:
              (data as LegacyInvestmentRow | null)?.created_at ?? new Date().toISOString(),
            investor_user_id: verified.userId,
            project_id: projectId,
            status: (data as LegacyInvestmentRow | null)?.status ?? 'confirmed',
            amount,
            tx_hash: txHash,
            from_wallet: fromWallet,
            to_wallet: toWallet,
          }),
        },
        { status: 200 }
      );
    }

    const { data, error: insertError } = await runWithAmountColumnFallback((amountColumn) =>
      supabase
        .from('investments')
        .insert({
          transaction_id: transactionId || null,
          investor_user_id: verified.userId,
          entrepreneur_user_id: entrepreneurUserId,
          project_id: normalizeProjectFilter(projectId),
          project_title: projectTitle,
          tx_hash: txHash,
          from_wallet: fromWallet,
          to_wallet: toWallet,
          interest_rate_ea: interestRateEa,
          term_months: termMonths,
          projected_return_usdc: projectedReturnUsdc,
          projected_total_usdc: projectedTotalUsdc,
          status: 'confirmed',
          metadata: {
            app: 'investapp-web',
            currency,
            entrepreneur_name: entrepreneurName,
            created_from: 'project-investment-flow',
          },
          [amountColumn]: amount,
        })
        .select(
          `id,created_at,project_id,project_title,investor_user_id,entrepreneur_user_id,tx_hash,from_wallet,to_wallet,${amountColumn},amount_usdc,interest_rate_ea,term_months,projected_return_usdc,projected_total_usdc,status`
        )
        .maybeSingle()
    );

    if (insertError) {
      const existing = insertError.message?.toLowerCase().includes('duplicate')
        ? await fetchExistingModernInvestment(verified.userId, txHash)
        : null;

      if (existing) {
        return jsonNoStore({ data: existing }, { status: 200 });
      }

      return jsonNoStore(
        { error: 'Could not save the investment.', details: insertError.message },
        { status: 500 }
      );
    }

    return jsonNoStore(
      { data: normalizeModernInvestment(data as ModernInvestmentRow) },
      { status: 200 }
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Investment write failed.', details: message }, { status: 500 });
  }
}
