import { NextRequest, NextResponse } from 'next/server';
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
      .select('id,metadata')
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

    const nextMetadata: Record<string, unknown> = { ...baseMetadata };
    if (status === 'failed') nextMetadata.transfer_failed = true;
    if (status === 'submitted') nextMetadata.transfer_completed = true;

    const updatePayload: Record<string, unknown> = {
      request_status: status,
      metadata: nextMetadata,
    };

    if (status === 'submitted') {
      updatePayload.onchain_tx_hash = txHash;
    }

    const { data: updated, error: updateError } = await supabase
      .from('withdraw_TEMP')
      .update(updatePayload)
      .eq('id', withdrawalId)
      .eq('user_id', verified.userId)
      .select('id')
      .maybeSingle();

    if (updateError || !updated?.id) {
      return jsonNoStore(
        { error: 'Could not update withdrawal request.', details: updateError?.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore({ id: updated.id }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Withdrawal update failed.', details: message }, { status: 500 });
  }
}
