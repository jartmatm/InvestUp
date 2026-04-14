import { NextRequest, NextResponse } from 'next/server';
import {
  normalizePaymentScheduleRecord,
  type PaymentScheduleRecord,
} from '@/lib/payment-schedule';
import { syncInternalContractsForUser } from '@/utils/server/internal-ledger';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

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

const normalizeProjectFilter = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : value;
};

const compareDueDate = (left: PaymentScheduleRecord, right: PaymentScheduleRecord) => {
  const leftTime = left.next_due_date ? new Date(left.next_due_date).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.next_due_date ? new Date(right.next_due_date).getTime() : Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime;
};

const isMissingRelationError = (error: { code?: string | null; message?: string | null } | null) =>
  error?.code === '42P01' || error?.message?.toLowerCase().includes('does not exist') || false;

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

const PAYMENT_SCHEDULE_SELECT =
  'id,credit_id,project_id,investor_user_id,entrepreneur_user_id,annual_interest_rate,monthly_interest_rate,installment_count,current_installment_number,schedule_start_date,next_due_date,original_principal,total_paid_amount,current_installment_amount,outstanding_balance,status,tx_hash,payment_plan,metadata';

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyRequest(request);
  if (error || !verified) return error;

  const creditId = coerceString(request.nextUrl.searchParams.get('creditId'));
  const projectId = coerceString(request.nextUrl.searchParams.get('projectId'));

  try {
    const supabase = getSupabaseAdminClient();
    await syncInternalContractsForUser(verified.userId);

    const loadFromInternalContracts = async () => {
      if (creditId) {
        const { data, error: queryError } = await supabase
          .from('internal_contracts')
          .select(PAYMENT_SCHEDULE_SELECT)
          .eq('credit_id', creditId)
          .maybeSingle();

        if (queryError) {
          if (isMissingRelationError(queryError)) return null;
          throw new Error(queryError.message);
        }

        if (!data) {
          return [];
        }

        const record = normalizePaymentScheduleRecord(data as Record<string, unknown>);
        if (
          record.investor_user_id !== verified.userId &&
          record.entrepreneur_user_id !== verified.userId
        ) {
          return [];
        }

        return [record];
      }

      let query = supabase
        .from('internal_contracts')
        .select(PAYMENT_SCHEDULE_SELECT)
        .or(`investor_user_id.eq.${verified.userId},entrepreneur_user_id.eq.${verified.userId}`)
        .order('next_due_date', { ascending: true, nullsFirst: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error: queryError } = await query;
      if (queryError) {
        if (isMissingRelationError(queryError)) return null;
        throw new Error(queryError.message);
      }

      return ((data ?? []) as Array<Record<string, unknown>>)
        .map(normalizePaymentScheduleRecord)
        .sort(compareDueDate);
    };

    const internalContracts = await loadFromInternalContracts();
    if (internalContracts) {
      return jsonNoStore({ data: internalContracts }, { status: 200 });
    }

    if (creditId) {
      const { data, error: queryError } = await supabase
        .from('payment_schedule')
        .select(PAYMENT_SCHEDULE_SELECT)
        .eq('credit_id', creditId)
        .maybeSingle();

      if (queryError) {
        return jsonNoStore(
          { error: 'Could not load the payment schedule.', details: queryError.message },
          { status: 500 }
        );
      }

      if (!data) {
        return jsonNoStore({ data: [] }, { status: 200 });
      }

      const record = normalizePaymentScheduleRecord(data as Record<string, unknown>);
      if (
        record.investor_user_id !== verified.userId &&
        record.entrepreneur_user_id !== verified.userId
      ) {
        return jsonNoStore({ error: 'You do not have access to this payment schedule.' }, { status: 403 });
      }

      return jsonNoStore({ data: [record] }, { status: 200 });
    }

    const buildParticipantQuery = (participantField: 'investor_user_id' | 'entrepreneur_user_id') => {
      let query = supabase
        .from('payment_schedule')
        .select(PAYMENT_SCHEDULE_SELECT)
        .eq(participantField, verified.userId)
        .order('next_due_date', { ascending: true, nullsFirst: false });

      if (projectId) {
        query = query.eq('project_id', normalizeProjectFilter(projectId));
      }

      return query;
    };

    const [investorResult, entrepreneurResult] = await Promise.all([
      buildParticipantQuery('investor_user_id'),
      buildParticipantQuery('entrepreneur_user_id'),
    ]);

    if (investorResult.error) {
      return jsonNoStore(
        { error: 'Could not load the payment schedule.', details: investorResult.error.message },
        { status: 500 }
      );
    }

    if (entrepreneurResult.error) {
      return jsonNoStore(
        { error: 'Could not load the payment schedule.', details: entrepreneurResult.error.message },
        { status: 500 }
      );
    }

    const merged = new Map<string, PaymentScheduleRecord>();
    [...(investorResult.data ?? []), ...(entrepreneurResult.data ?? [])].forEach((row) => {
      const record = normalizePaymentScheduleRecord(row as Record<string, unknown>);
      merged.set(record.id, record);
    });

    const records = Array.from(merged.values()).sort(compareDueDate);
    return jsonNoStore({ data: records }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore(
      { error: 'Payment schedule request failed.', details: message },
      { status: 500 }
    );
  }
}
