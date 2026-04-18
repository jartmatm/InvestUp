import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getCurrentUserKycSummary } from '@/utils/server/kyc-compliance';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'investor' | 'entrepreneur' | null;
type PayoutMethod = 'bank' | 'breve';

const MANUAL_WITHDRAWAL_WALLET =
  process.env.MANUAL_WITHDRAWAL_WALLET?.trim() ||
  '0xac5c740d2163a452d7d288d57e9df5496752246e';

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};

const coerceString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const coerceRole = (value: unknown): Role => {
  if (value === 'investor') return 'investor';
  if (value === 'entrepreneur') return 'entrepreneur';
  return null;
};

const parseAmount = (value: unknown) => {
  const raw = coerceString(value);
  if (!raw) return null;
  const normalized = raw.replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (!forwardedFor) return undefined;
  return forwardedFor.split(',')[0]?.trim() || undefined;
};

export async function POST(request: NextRequest) {
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

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const payoutMethodRaw = coerceString(payload.payoutMethod);
  const payoutMethod: PayoutMethod | null =
    payoutMethodRaw === 'bank' || payoutMethodRaw === 'breve' ? payoutMethodRaw : null;

  if (!payoutMethod) {
    return jsonNoStore({ error: 'A valid payoutMethod is required.' }, { status: 400 });
  }

  const sourceWallet = coerceString(payload.sourceWallet);
  if (!sourceWallet || !isAddress(sourceWallet)) {
    return jsonNoStore({ error: 'A valid sourceWallet is required.' }, { status: 400 });
  }

  const amountUsdc = parseAmount(payload.amountUsdc);
  if (amountUsdc == null) {
    return jsonNoStore({ error: 'A valid amountUsdc is required.' }, { status: 400 });
  }

  const role = coerceRole(payload.role);
  const clientIp = getClientIp(request);

  const metadata: Record<string, unknown> = {
    app: 'investapp-web',
    requested_from: 'manual-withdrawal-form',
    network: 'polygon',
    asset: 'USDC',
    processing_message: 'Your withdrawal will be processed in 1 to 2 business days.',
  };
  if (clientIp) metadata.client_ip = clientIp;

  const insertPayload: Record<string, unknown> = {
    user_id: verified.userId,
    role,
    source_wallet: sourceWallet,
    destination_wallet: MANUAL_WITHDRAWAL_WALLET,
    payout_method: payoutMethod,
    amount_usdc: amountUsdc,
    onchain_tx_hash: null,
    request_status: 'awaiting_transfer',
    metadata,
  };

  if (payoutMethod === 'bank') {
    const bankName = coerceString(payload.bankName);
    const accountNumber = coerceString(payload.accountNumber);
    const accountType = coerceString(payload.accountType);
    const identificationType = coerceString(payload.identificationType);
    const identificationNumber = coerceString(payload.identificationNumber);
    const phoneNumber = coerceString(payload.phoneNumber);

    if (
      !bankName ||
      !accountNumber ||
      (accountType !== 'ahorros' && accountType !== 'corriente') ||
      (identificationType !== 'cc' &&
        identificationType !== 'ti' &&
        identificationType !== 'te' &&
        identificationType !== 'pasaporte') ||
      !identificationNumber ||
      !phoneNumber
    ) {
      return jsonNoStore({ error: 'Missing required bank payout fields.' }, { status: 400 });
    }

    insertPayload.bank_name = bankName;
    insertPayload.bank_account_number = accountNumber;
    insertPayload.bank_account_type = accountType;
    insertPayload.identification_type = identificationType;
    insertPayload.identification_number = identificationNumber;
    insertPayload.phone_number = phoneNumber;

    metadata.payout_details = {
      bank_name: bankName,
      bank_account_number: accountNumber,
      bank_account_type: accountType,
      identification_type: identificationType,
      identification_number: identificationNumber,
      phone_number: phoneNumber,
    };
  } else {
    const breveKey = coerceString(payload.breveKey);
    if (!breveKey) {
      return jsonNoStore({ error: 'Missing required Breve payout fields.' }, { status: 400 });
    }

    insertPayload.breve_key = breveKey;
    metadata.payout_details = {
      breve_key: breveKey,
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const kycSummary = await getCurrentUserKycSummary({
      supabase,
      userId: verified.userId,
      requestedAmountUsd: amountUsdc,
    });

    if (!kycSummary.canWithdrawRequestedAmount) {
      return jsonNoStore(
        {
          error: 'Withdrawal blocked by KYC compliance.',
          details:
            kycSummary.blockingReason ??
            `Your account must complete Lvl ${kycSummary.requiredLevelForRequestedAmount} before withdrawing this amount.`,
          data: kycSummary,
        },
        { status: 409 }
      );
    }

    metadata.kyc_level = kycSummary.approvedLevel;
    metadata.kyc_required_level = kycSummary.requiredLevelForRequestedAmount;
    metadata.kyc_projected_movement_usd = kycSummary.projectedMovementUsd;

    const { data, error } = await supabase
      .from('withdraw_TEMP')
      .insert(insertPayload)
      .select('id')
      .maybeSingle();

    if (error || !data?.id) {
      return jsonNoStore(
        { error: 'Could not create withdrawal request.', details: error?.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore({ id: data.id }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Withdrawal request failed.', details: message }, { status: 500 });
  }
}
