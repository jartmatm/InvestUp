import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getRoleChangeEligibility } from '@/utils/server/role-change-eligibility';

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

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  try {
    const data = await getRoleChangeEligibility(verified.userId);
    return jsonNoStore({ data }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore(
      { error: 'Could not verify role change eligibility.', details: message },
      { status: 500 }
    );
  }
}
