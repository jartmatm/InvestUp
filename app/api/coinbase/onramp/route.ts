import { type NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COINBASE_API_HOST = 'api.cdp.coinbase.com';
const COINBASE_API_PATH = '/platform/v2/onramp/sessions';
const COINBASE_API_URL = `https://${COINBASE_API_HOST}${COINBASE_API_PATH}`;
const DEFAULT_PURCHASE_CURRENCY = 'USDC';
const DEFAULT_DESTINATION_NETWORK = 'polygon';
const DEFAULT_PAYMENT_CURRENCY = 'USD';

const readFirstEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
};

const normalizeApiSecret = (value: string) => value.replace(/\\n/g, '\n');

const coerceOptionalString = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (!forwardedFor) return undefined;
  return forwardedFor.split(',')[0]?.trim() || undefined;
};

const buildPartnerUserRef = (rawValue: string | undefined) => {
  const baseValue = rawValue || `investapp-${Date.now()}`;
  const sandboxEnabled = readFirstEnv('COINBASE_ONRAMP_SANDBOX').toLowerCase() === 'true';
  if (!sandboxEnabled || baseValue.startsWith('sandbox-')) return baseValue;
  return `sandbox-${baseValue}`;
};

export async function POST(request: NextRequest) {
  const apiKeyId = readFirstEnv(
    'COINBASE_CDP_API_KEY_ID',
    'CDP_API_KEY_ID',
    'COINBASE_API_KEY_ID'
  );
  const apiKeySecret = readFirstEnv(
    'COINBASE_CDP_API_KEY_SECRET',
    'CDP_API_KEY_SECRET',
    'COINBASE_API_KEY_SECRET'
  );

  if (!apiKeyId || !apiKeySecret) {
    return NextResponse.json(
      {
        error: 'Coinbase onramp is not configured yet.',
        missingVariables: [
          'COINBASE_CDP_API_KEY_ID or CDP_API_KEY_ID',
          'COINBASE_CDP_API_KEY_SECRET or CDP_API_KEY_SECRET',
        ],
      },
      { status: 500 }
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const walletAddress = coerceOptionalString(payload.walletAddress);
  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json(
      { error: 'A valid Polygon wallet address is required.' },
      { status: 400 }
    );
  }

  const paymentAmount = coerceOptionalString(payload.paymentAmount);
  const purchaseAmount = coerceOptionalString(payload.purchaseAmount);
  if (paymentAmount && purchaseAmount) {
    return NextResponse.json(
      { error: 'Use either paymentAmount or purchaseAmount, not both.' },
      { status: 400 }
    );
  }

  const redirectUrl =
    coerceOptionalString(payload.redirectUrl) ||
    readFirstEnv('COINBASE_ONRAMP_REDIRECT_URL') ||
    new URL('/home', request.nextUrl.origin).toString();

  const partnerUserRef = buildPartnerUserRef(coerceOptionalString(payload.partnerUserRef));

  const requestBody: Record<string, unknown> = {
    purchaseCurrency: DEFAULT_PURCHASE_CURRENCY,
    destinationNetwork: DEFAULT_DESTINATION_NETWORK,
    destinationAddress: walletAddress,
    redirectUrl,
    partnerUserRef,
  };

  if (paymentAmount || purchaseAmount) {
    requestBody.paymentCurrency =
      coerceOptionalString(payload.paymentCurrency) || DEFAULT_PAYMENT_CURRENCY;
  }
  if (paymentAmount) requestBody.paymentAmount = paymentAmount;
  if (purchaseAmount) requestBody.purchaseAmount = purchaseAmount;

  const clientIp = getClientIp(request);
  if (clientIp) requestBody.clientIp = clientIp;

  try {
    const { getAuthHeaders } = await import('@coinbase/cdp-sdk/auth');
    const headers = await getAuthHeaders({
      apiKeyId,
      apiKeySecret: normalizeApiSecret(apiKeySecret),
      requestMethod: 'POST',
      requestHost: COINBASE_API_HOST,
      requestPath: COINBASE_API_PATH,
      requestBody,
      source: 'investapp-web',
    });

    const response = await fetch(COINBASE_API_URL, {
      method: 'POST',
      headers: {
        ...headers,
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') ?? '';
    const responsePayload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const details =
        typeof responsePayload === 'string'
          ? responsePayload
          : responsePayload?.errorMessage || responsePayload?.message || responsePayload;
      return NextResponse.json(
        {
          error: 'Coinbase returned an error while creating the onramp session.',
          details,
        },
        { status: response.status }
      );
    }

    const sessionUrl =
      typeof responsePayload === 'object' && responsePayload
        ? ((responsePayload as { session?: { onrampUrl?: string } }).session?.onrampUrl ?? null)
        : null;

    if (!sessionUrl) {
      return NextResponse.json(
        {
          error: 'Coinbase did not return a session URL.',
          details: responsePayload,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        url: sessionUrl,
        session:
          typeof responsePayload === 'object' && responsePayload
            ? (responsePayload as { session?: unknown }).session ?? null
            : null,
        quote:
          typeof responsePayload === 'object' && responsePayload
            ? (responsePayload as { quote?: unknown }).quote ?? null
            : null,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Coinbase onramp error.';
    return NextResponse.json(
      {
        error: 'Coinbase onramp request failed.',
        details: message,
      },
      { status: 500 }
    );
  }
}
