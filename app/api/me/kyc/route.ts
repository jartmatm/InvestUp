import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getCurrentUserKycSummary } from '@/utils/server/kyc-compliance';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};

const parseRequestedAmount = (value: string | null) => {
  if (!value) return 0;
  const normalized = value.replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export async function GET(request: NextRequest) {
  const accessToken = extractBearerToken(request.headers.get('authorization'));
  if (!accessToken) {
    return jsonNoStore({ error: 'Missing Authorization bearer token.' }, { status: 401 });
  }

  let verified;
  try {
    verified = await verifyPrivyAccessToken(accessToken);
  } catch {
    return jsonNoStore({ error: 'Invalid access token.' }, { status: 401 });
  }

  const requestedAmountUsd = parseRequestedAmount(
    request.nextUrl.searchParams.get('requestedAmountUsd')
  );

  try {
    const supabase = getSupabaseAdminClient();
    const summary = await getCurrentUserKycSummary({
      supabase,
      userId: verified.userId,
      requestedAmountUsd,
    });

    return jsonNoStore({ data: summary }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return jsonNoStore({ error: 'KYC summary request failed.', details: message }, { status: 500 });
  }
}
