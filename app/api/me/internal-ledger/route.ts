import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUserInternalBalance,
  getCurrentUserInternalEntries,
} from '@/utils/server/internal-ledger';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';

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

const parseLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 25;
  return Math.min(parsed, 100);
};

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  const creditId = request.nextUrl.searchParams.get('creditId');
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

  try {
    const [balance, entries] = await Promise.all([
      getCurrentUserInternalBalance(verified.userId),
      getCurrentUserInternalEntries(verified.userId, { creditId, limit }),
    ]);

    return jsonNoStore({ data: { balance, entries } }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore(
      { error: 'Internal ledger request failed.', details: message },
      { status: 500 }
    );
  }
}
