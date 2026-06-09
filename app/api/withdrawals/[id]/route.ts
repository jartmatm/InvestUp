import { NextRequest, NextResponse } from 'next/server';
import { buildWithdrawalLedgerEntry } from '@/utils/server/internal-ledger-events';
import {
  recordInternalLedgerEvent,
  syncInternalLedgerForUsers,
} from '@/utils/server/internal-ledger';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WithdrawalStatus = 'failed' | 'submitted';

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};

const coerceString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);

const isTxHash = (value: string) => /^0x[0-9a-f]{64}$/iu.test(value);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const withdrawalId = coerceString(idValue);
  if (!withdrawalId || !isUuid(withdrawalId)) {
    return jsonNoStore({ error: 'Invalid withdrawal id.' }, { status: 400 });
  }

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

  const statusRaw = coerceString(payload.status).toLowerCase();
  const status: WithdrawalStatus | null =
    statusRaw === 'failed' || statusRaw === 'submitted' ? (statusRaw as WithdrawalStatus) : null;

  if (!status) {
    return jsonNoStore({ error: 'A valid status is required.' }, { status: 400 });
  }

  const txHash = coerceString(payload.txHash);
  if (status === 'submitted' && (!txHash || !isTxHash(txHash))) {
    return jsonNoStore({ error: 'A valid txHash is required when submitting.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: existing, error: existingError } = await supabase
      .from('withdraw_TEMP')
      .select('id,user_id,role,source_wallet,destination_wallet,payout_method,bank_name,bank_account_number,bank_account_type,identification_type,identification_number,phone_number,breve_key,amount_usdc,metadata')
      .eq('id', withdrawalId)
      .eq('user_id', verified.userId)
      .maybeSingle();

    if (existingError) {
      return jsonNoStore(
        { error: 'Could not load withdrawal request.', details: existingError.message },
        { status: 500 }
      );
    }

    if (!existing?.id) {
      return jsonNoStore({ error: 'Withdrawal request not found.' }, { status: 404 });
    }

    const baseMetadata =
      existing.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {};

    const nextMetadata: Record<string, unknown> = {
      ...baseMetadata,
      transfer_failed: status === 'failed' || undefined,
      transfer_completed: status === 'submitted' || undefined,
    };

    const ledgerEntry = buildWithdrawalLedgerEntry({
      amount: Number(existing.amount_usdc ?? 0),
      bankAccountType: existing.bank_account_type,
      bankName: existing.bank_name,
      currency: 'USDC',
      destinationWallet: existing.destination_wallet,
      identificationNumber: existing.identification_number,
      identificationType: existing.identification_type,
      metadata: nextMetadata,
      payoutMethod: existing.payout_method as 'bank' | 'breve',
      phoneNumber: existing.phone_number,
      breveKey: existing.breve_key,
      requestStatus: status,
      role: existing.role,
      sourceId: withdrawalId,
      sourceWallet: existing.source_wallet,
      txHash: status === 'submitted' ? txHash : null,
      userId: verified.userId,
    });

    const storedLedgerEntry = await recordInternalLedgerEvent(ledgerEntry);
    await syncInternalLedgerForUsers([verified.userId]);

    return jsonNoStore(
      { id: String(storedLedgerEntry.projection_payload.row.id ?? withdrawalId) },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Withdrawal update failed.', details: message }, { status: 500 });
  }
}
