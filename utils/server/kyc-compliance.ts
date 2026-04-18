import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';
import {
  KYC_DOCUMENT_LABELS,
  KYC_LEVEL_LIMITS,
  type CurrentUserKycSummary,
  type EligibleKycLevel,
  type KycDocumentStatus,
  type KycDocumentSummary,
  type KycDocumentType,
  type KycLevel,
  type KycRequirementKey,
} from '@/utils/kyc/shared';

type UnknownSupabaseClient = SupabaseClient;

type UserRecord = Record<string, unknown> | null;

type KycDocumentRow = {
  document_type: KycDocumentType;
  file_name: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type TransactionMovementRow = {
  amount?: number | null;
  amount_usdc?: number | null;
};

type ResolvedProfile = {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  country: string;
  gender: string;
  address: string;
  avatar_url: string;
};

const STATIC_KYC_EXEMPT_USER_IDS = ['did:privy:cmnys0jok002d0bl1cpy2wqy7'];

const KYC_DOCUMENT_TYPES: KycDocumentType[] = ['identity_document', 'proof_of_residence'];

const KYC_LEVEL_REQUIREMENTS: Record<EligibleKycLevel, KycRequirementKey[]> = {
  1: ['email', 'first_name'],
  2: ['email', 'first_name', 'last_name', 'phone_number'],
  3: ['email', 'first_name', 'last_name', 'phone_number', 'country', 'gender', 'address', 'avatar_url'],
  4: [
    'email',
    'first_name',
    'last_name',
    'phone_number',
    'country',
    'gender',
    'address',
    'avatar_url',
    'identity_document',
    'proof_of_residence',
  ],
};

const KYC_REQUIREMENT_LABELS: Record<KycRequirementKey, string> = {
  email: 'Email',
  first_name: 'First name',
  last_name: 'Last name',
  phone_number: 'Phone number',
  country: 'Country',
  gender: 'Gender',
  address: 'Address',
  avatar_url: 'Profile photo',
  identity_document: 'Identity document',
  proof_of_residence: 'Proof of residence',
};

const getErrorText = (error: PostgrestError | null) =>
  `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();

const isMissingRelationError = (error: PostgrestError | null) => {
  if (!error) return false;
  return error.code === '42P01' || getErrorText(error).includes('does not exist');
};

const parseCsvList = (value: string | undefined) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const pickFirstFilledString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const parseProfileBlob = (value: unknown) => {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const roundUsd = (value: number) => Number(value.toFixed(6));

const resolveProfile = (record: UserRecord): ResolvedProfile => {
  const profileData = parseProfileBlob(record?.profile_data ?? record?.metadata ?? null);

  return {
    email: pickFirstFilledString(record?.email, profileData?.email),
    first_name: pickFirstFilledString(record?.name, profileData?.name),
    last_name: pickFirstFilledString(record?.surname, profileData?.surname),
    phone_number: pickFirstFilledString(record?.phone_number, profileData?.phone_number),
    country: pickFirstFilledString(record?.country, profileData?.country),
    gender: pickFirstFilledString(record?.gender, profileData?.gender),
    address: pickFirstFilledString(record?.address, profileData?.address),
    avatar_url: pickFirstFilledString(record?.avatar_url, profileData?.avatar_url),
  };
};

const normalizeDocumentStatus = (value: string | null | undefined): KycDocumentStatus => {
  if (value === 'approved') return 'approved';
  if (value === 'rejected') return 'rejected';
  if (value === 'submitted') return 'submitted';
  return 'missing';
};

const createEmptyDocumentSummary = (
  documentType: KycDocumentType
): KycDocumentSummary => ({
  type: documentType,
  label: KYC_DOCUMENT_LABELS[documentType],
  fileName: null,
  status: 'missing',
  uploadedAt: null,
});

const createDocumentMap = (rows: KycDocumentRow[]) =>
  KYC_DOCUMENT_TYPES.reduce<Record<KycDocumentType, KycDocumentSummary>>((acc, documentType) => {
    const row = rows.find((item) => item.document_type === documentType);
    acc[documentType] = row
      ? {
          type: documentType,
          label: KYC_DOCUMENT_LABELS[documentType],
          fileName: row.file_name ?? null,
          status: normalizeDocumentStatus(row.status),
          uploadedAt: row.updated_at ?? row.created_at ?? null,
        }
      : createEmptyDocumentSummary(documentType);
    return acc;
  }, {
    identity_document: createEmptyDocumentSummary('identity_document'),
    proof_of_residence: createEmptyDocumentSummary('proof_of_residence'),
  });

const getMissingRequirements = (
  level: EligibleKycLevel,
  profile: ResolvedProfile,
  documents: Record<KycDocumentType, KycDocumentSummary>
) =>
  KYC_LEVEL_REQUIREMENTS[level]
    .filter((requirement) => {
      if (requirement === 'identity_document') {
        return documents.identity_document.status === 'missing' || documents.identity_document.status === 'rejected';
      }

      if (requirement === 'proof_of_residence') {
        return (
          documents.proof_of_residence.status === 'missing' ||
          documents.proof_of_residence.status === 'rejected'
        );
      }

      return !profile[requirement];
    })
    .map((requirement) => KYC_REQUIREMENT_LABELS[requirement]);

const getApprovedLevel = (
  profile: ResolvedProfile,
  documents: Record<KycDocumentType, KycDocumentSummary>,
  exempt: boolean
): KycLevel => {
  if (exempt) return 4;

  if (getMissingRequirements(1, profile, documents).length > 0) return 0;
  if (getMissingRequirements(2, profile, documents).length > 0) return 1;
  if (getMissingRequirements(3, profile, documents).length > 0) return 2;
  if (getMissingRequirements(4, profile, documents).length > 0) return 3;
  return 4;
};

const getRequiredLevelForMovement = (movementUsd: number): EligibleKycLevel => {
  if (movementUsd <= 200) return 1;
  if (movementUsd <= 1000) return 2;
  if (movementUsd <= 5000) return 3;
  return 4;
};

const getNextLevel = (level: KycLevel): EligibleKycLevel | null => {
  if (level <= 0) return 1;
  if (level === 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 4;
  return null;
};

const loadMovementUsd = async (supabase: UnknownSupabaseClient, userId: string) => {
  const pageSize = 1000;
  let from = 0;
  let total = 0;

  while (true) {
    const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
      supabase
        .from('transactions')
        .select(`${amountColumn},amount_usdc`)
        .eq('user_id', userId)
        .neq('status', 'failed')
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1)
    );

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as TransactionMovementRow[];
    total += rows.reduce((sum, row) => sum + Math.abs(Number(getAmountValue(row) ?? 0)), 0);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return roundUsd(total);
};

const loadKycDocuments = async (supabase: UnknownSupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from('kyc_documents')
    .select('document_type,file_name,status,created_at,updated_at')
    .eq('user_id', userId);

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as KycDocumentRow[];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as KycDocumentRow[];
};

export const getKycExemptUserIds = () =>
  new Set([
    ...STATIC_KYC_EXEMPT_USER_IDS,
    ...parseCsvList(process.env.KYC_EXEMPT_USER_IDS),
  ]);

export async function getCurrentUserKycSummary({
  supabase,
  userId,
  requestedAmountUsd = 0,
}: {
  supabase: UnknownSupabaseClient;
  userId: string;
  requestedAmountUsd?: number;
}): Promise<CurrentUserKycSummary> {
  const normalizedRequestedAmount = Number.isFinite(requestedAmountUsd) && requestedAmountUsd > 0
    ? roundUsd(requestedAmountUsd)
    : 0;

  const exempt = getKycExemptUserIds().has(userId);

  const [{ data: userRecord, error: userError }, documentRows, movementUsd] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    loadKycDocuments(supabase, userId),
    loadMovementUsd(supabase, userId),
  ]);

  if (userError) {
    throw new Error(userError.message);
  }

  const documents = createDocumentMap(documentRows);
  const profile = resolveProfile((userRecord as UserRecord) ?? null);
  const approvedLevel = getApprovedLevel(profile, documents, exempt);
  const requiredLevelNow = getRequiredLevelForMovement(movementUsd);
  const projectedMovementUsd = roundUsd(movementUsd + normalizedRequestedAmount);
  const requiredLevelForRequestedAmount = getRequiredLevelForMovement(projectedMovementUsd);
  const currentLevelLimitUsd = approvedLevel > 0 ? KYC_LEVEL_LIMITS[approvedLevel as EligibleKycLevel] : 0;
  const nextLevel = getNextLevel(approvedLevel);
  const nextLevelLimitUsd = nextLevel ? KYC_LEVEL_LIMITS[nextLevel] : null;
  const missingForCurrentLevel = exempt ? [] : getMissingRequirements(requiredLevelNow, profile, documents);
  const missingForRequestedLevel = exempt
    ? []
    : getMissingRequirements(requiredLevelForRequestedAmount, profile, documents);
  const canAccessWithdraw = exempt || approvedLevel >= requiredLevelNow;
  const canWithdrawRequestedAmount = exempt || approvedLevel >= requiredLevelForRequestedAmount;

  let blockingReason: string | null = null;
  if (!canWithdrawRequestedAmount) {
    const levelLabel = `Lvl ${requiredLevelForRequestedAmount}`;
    blockingReason =
      missingForRequestedLevel.length > 0
        ? `Withdrawals above your current compliance limit require ${levelLabel}. Missing: ${missingForRequestedLevel.join(', ')}.`
        : `Withdrawals above your current compliance limit require ${levelLabel}.`;
  }

  return {
    exempt,
    approvedLevel,
    requiredLevelNow,
    requiredLevelForRequestedAmount,
    movementUsd,
    requestedAmountUsd: normalizedRequestedAmount,
    projectedMovementUsd,
    currentLevelLimitUsd,
    nextLevel,
    nextLevelLimitUsd,
    canAccessWithdraw,
    canWithdrawRequestedAmount,
    blockingReason,
    missingForCurrentLevel,
    missingForRequestedLevel,
    documents,
  };
}
