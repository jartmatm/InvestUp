import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { runWithAmountColumnFallback } from '@/lib/supabase-amount';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';
import type { CreateCurrentUserRepaymentPayload } from '@/utils/client/current-user-repayments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

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

const asTextId = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const asNumericId = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const buildUniqueIdCandidates = (
  ...values: Array<string | number | null | undefined>
): Array<string | number | null> => {
  const result: Array<string | number | null> = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    const normalizedKey = value === null || value === undefined ? 'null' : `${typeof value}:${String(value)}`;
    if (seen.has(normalizedKey)) return;
    seen.add(normalizedKey);
    result.push(value ?? null);
  });

  return result;
};

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

export async function POST(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  let payload: Partial<CreateCurrentUserRepaymentPayload> = {};
  try {
    payload = (await request.json()) as Partial<CreateCurrentUserRepaymentPayload>;
  } catch {
    payload = {};
  }

  const txHash = coerceString(payload.txHash);
  const fromWallet = coerceString(payload.fromWallet);
  const toWallet = coerceString(payload.toWallet);
  const amount = parseAmount(payload.amountUsdc);
  const receiverEmail = coerceString(payload.receiverEmail);

  if (!txHash) {
    return jsonNoStore({ error: 'A valid txHash is required.' }, { status: 400 });
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
    const transactionIdCandidates = buildUniqueIdCandidates(
      asTextId(payload.transactionUuid),
      asTextId(payload.transactionId),
      null
    );
    const projectIdCandidates = buildUniqueIdCandidates(
      asTextId(payload.projectId),
      asNumericId(payload.projectId),
      null
    );
    const repaymentStatusCandidates = ['paid', 'pending', null] as const;

    let savedId: string | null = null;
    let lastError: { message?: string } | null = null;

    for (const repaymentStatus of repaymentStatusCandidates) {
      for (const projectCandidate of projectIdCandidates) {
        for (const transactionCandidate of transactionIdCandidates) {
          const { data, error: insertError } = await runWithAmountColumnFallback((amountColumn) => {
            const insertPayload: Record<string, unknown> = {
              entrepreneur_user_id: verified.userId,
              investor_user_id: asTextId(payload.investorUserId),
              tx_hash: txHash,
              from_wallet: fromWallet,
              to_wallet: toWallet,
              [amountColumn]: amount,
              metadata: {
                app: 'investapp-web',
                currency: 'USDC',
                receiver_email: receiverEmail || null,
                created_from: 'direct-repayment-flow',
              },
            };

            if (repaymentStatus !== null) insertPayload.status = repaymentStatus;
            if (projectCandidate !== null) insertPayload.project_id = projectCandidate;
            if (transactionCandidate !== null) insertPayload.transaction_id = transactionCandidate;

            return supabase.from('repayments').insert(insertPayload).select('id').maybeSingle();
          });

          if (!insertError || insertError.message?.toLowerCase().includes('duplicate')) {
            savedId = ((data as { id?: string } | null)?.id ?? null) as string | null;
            lastError = null;
            break;
          }

          lastError = insertError;
        }

        if (!lastError) break;
      }

      if (!lastError) break;
    }

    if (lastError) {
      return jsonNoStore(
        { error: 'Could not save the repayment.', details: lastError.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore({ data: { id: savedId } }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Repayment write failed.', details: message }, { status: 500 });
  }
}
