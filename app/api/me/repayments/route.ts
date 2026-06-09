import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { buildRepaymentLedgerEntry } from '@/utils/server/internal-ledger-events';
import {
  recordInternalLedgerEvent,
  syncInternalLedgerForUsers,
} from '@/utils/server/internal-ledger';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
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
    const investorUserId = coerceString(payload.investorUserId) || null;
    const transactionId = coerceString(payload.transactionId) || coerceString(payload.transactionUuid) || null;
    const projectId = coerceString(payload.projectId) || null;
    const ledgerEntry = buildRepaymentLedgerEntry({
      amount,
      creditId: null,
      entrepreneurUserId: verified.userId,
      fromWallet,
      metadata: {
        app: 'investapp-web',
        currency: 'USDC',
        receiver_email: receiverEmail || null,
        created_from: 'direct-repayment-flow',
      },
      projectId,
      status: 'confirmed',
      toWallet,
      transactionId,
      txHash,
      userId: verified.userId,
      investorUserId,
      currency: 'USDC',
    });

    const storedLedgerEntry = await recordInternalLedgerEvent(ledgerEntry);
    await syncInternalLedgerForUsers([verified.userId, investorUserId]);

    return jsonNoStore(
      { data: { id: String(storedLedgerEntry.projection_payload.row.id ?? null) } },
      { status: 200 }
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Repayment write failed.', details: message }, { status: 500 });
  }
}
