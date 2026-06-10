import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { buildPhoneSearchPattern } from '@/utils/recipient-resolution';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

const DIRECTORY_SELECT = 'id,email,name,surname,phone_number,avatar_url,country,role,wallet_address';
const ALLOWED_ROLES = new Set(['investor', 'entrepreneur']);

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const coerceString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const coerceLimit = (value: string | null) => {
  const parsed = Number(value ?? '');
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
};

const parseWallets = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => isAddress(entry));

const parseIds = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const sanitizeSearchFragment = (value: string) =>
  value
    .trim()
    .replace(/[,()]/g, ' ')
    .replace(/\s+/g, ' ');

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
    const supabase = getSupabaseAdminClient();
    const roleParam = coerceString(request.nextUrl.searchParams.get('role')).toLowerCase();
    const role = ALLOWED_ROLES.has(roleParam) ? roleParam : '';
    const email = coerceString(request.nextUrl.searchParams.get('email'));
    const search = sanitizeSearchFragment(coerceString(request.nextUrl.searchParams.get('search')));
    const wallet = coerceString(request.nextUrl.searchParams.get('wallet'));
    const wallets = parseWallets(request.nextUrl.searchParams.get('wallets'));
    const ids = parseIds(request.nextUrl.searchParams.get('ids'));
    const limit = coerceLimit(request.nextUrl.searchParams.get('limit'));
    const phoneSearchPattern = search ? buildPhoneSearchPattern(search) : null;

    let query = supabase
      .from('users')
      .select(DIRECTORY_SELECT)
      .not('wallet_address', 'is', null)
      .neq('id', verified.userId);

    if (role) {
      query = query.eq('role', role);
    }

    if (ids.length > 0) {
      query = query.in('id', ids).limit(Math.min(ids.length, limit));
    } else if (email) {
      query = query.ilike('email', email).limit(1);
    } else if (wallet && isAddress(wallet)) {
      query = query.ilike('wallet_address', wallet).limit(1);
    } else if (wallets.length === 1) {
      query = query.ilike('wallet_address', wallets[0]).limit(1);
    } else if (wallets.length > 1) {
      query = query
        .or(wallets.map((entry) => `wallet_address.ilike.${entry}`).join(','))
        .limit(Math.min(wallets.length, limit));
    } else if (search) {
      const wildcardTerm = `%${search.replace(/\s+/g, '%')}%`;
      const searchFragments = [
        `name.ilike.${wildcardTerm}`,
        `surname.ilike.${wildcardTerm}`,
        `email.ilike.${wildcardTerm}`,
        `id.ilike.${wildcardTerm}`,
        `wallet_address.ilike.${wildcardTerm}`,
      ];

      if (phoneSearchPattern) {
        searchFragments.push(`phone_number.ilike.${phoneSearchPattern}`);
      }

      query = query.or(searchFragments.join(',')).limit(limit);
    } else {
      query = query.limit(limit);
    }

    const { data, error: queryError } = await query.order('name', {
      ascending: true,
      nullsFirst: false,
    });

    if (queryError) {
      return jsonNoStore(
        { error: 'Could not load the recipient directory.', details: queryError.message },
        { status: 500 }
      );
    }

    return jsonNoStore({ data: data ?? [] }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Recipient directory request failed.', details: message }, { status: 500 });
  }
}
