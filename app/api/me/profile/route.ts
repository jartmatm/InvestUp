import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getRoleChangeEligibility } from '@/utils/server/role-change-eligibility';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

const ALLOWED_FIELDS = new Set([
  'email',
  'role',
  'wallet_address',
  'name',
  'surname',
  'phone_number',
  'country',
  'gender',
  'address',
  'avatar_url',
  'profile_data',
  'metadata',
  'Bank_details',
  'referral_code',
  'social_facebook',
  'social_instagram',
  'social_x',
  'social_tiktok',
  'social_linkedin',
  'social_youtube',
  'social_website',
]);

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const coerceString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

function sanitizePatchPayload(payload: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (!ALLOWED_FIELDS.has(key)) continue;

    if (key === 'role') {
      const role = coerceString(value);
      sanitized.role = role === 'investor' || role === 'entrepreneur' ? role : null;
      continue;
    }

    if (key === 'wallet_address') {
      const walletAddress = coerceString(value);
      if (!walletAddress) {
        sanitized.wallet_address = null;
      } else if (isAddress(walletAddress)) {
        sanitized.wallet_address = walletAddress;
      }
      continue;
    }

    if (key === 'profile_data' || key === 'metadata' || key === 'Bank_details') {
      sanitized[key] = isPlainObject(value) ? value : null;
      continue;
    }

    sanitized[key] = typeof value === 'string' ? value.trim() || null : value ?? null;
  }

  return sanitized;
}

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('id', verified.userId)
      .maybeSingle();

    if (queryError) {
      return jsonNoStore(
        { error: 'Could not load the user profile.', details: queryError.message },
        { status: 500 }
      );
    }

    return jsonNoStore({ data: data ?? null }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Profile request failed.', details: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const updatePayload = sanitizePatchPayload(payload);
  updatePayload.id = verified.userId;

  try {
    const supabase = getSupabaseAdminClient();
    const requestedRole =
      typeof updatePayload.role === 'string' ? updatePayload.role : null;
    let currentRole: string | null = null;

    if (requestedRole) {
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('role')
        .eq('id', verified.userId)
        .maybeSingle();

      if (currentUserError) {
        return jsonNoStore(
          { error: 'Could not verify the current user role.', details: currentUserError.message },
          { status: 500 }
        );
      }

      currentRole =
        typeof (currentUser as { role?: unknown } | null)?.role === 'string'
          ? ((currentUser as { role?: string | null }).role ?? null)
          : null;
    }

    if (requestedRole && requestedRole !== currentRole) {
      const eligibility = await getRoleChangeEligibility(verified.userId, supabase);
      if (!eligibility.canChangeRole) {
        return jsonNoStore(
          {
            error: 'Role change blocked.',
            details:
              eligibility.message ??
              'You can only change roles when your account has no investments and no published projects.',
          },
          { status: 409 }
        );
      }
    }

    const { data, error: upsertError } = await supabase
      .from('users')
      .upsert(updatePayload, { onConflict: 'id' })
      .select('*')
      .maybeSingle();

    if (upsertError) {
      return jsonNoStore(
        { error: 'Could not update the user profile.', details: upsertError.message },
        { status: 500 }
      );
    }

    return jsonNoStore({ data: data ?? null }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Profile update failed.', details: message }, { status: 500 });
  }
}
