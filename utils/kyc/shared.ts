export type KycLevel = 0 | 1 | 2 | 3 | 4;

export type EligibleKycLevel = 1 | 2 | 3 | 4;

export type KycDocumentType = 'identity_document' | 'proof_of_residence';

export type KycDocumentStatus = 'missing' | 'submitted' | 'approved' | 'rejected';

export type KycRequirementKey =
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'phone_number'
  | 'country'
  | 'gender'
  | 'address'
  | 'avatar_url'
  | 'identity_document'
  | 'proof_of_residence';

export type KycDocumentSummary = {
  type: KycDocumentType;
  label: string;
  fileName: string | null;
  status: KycDocumentStatus;
  uploadedAt: string | null;
};

export type CurrentUserKycSummary = {
  exempt: boolean;
  approvedLevel: KycLevel;
  requiredLevelNow: EligibleKycLevel;
  requiredLevelForRequestedAmount: EligibleKycLevel;
  movementUsd: number;
  requestedAmountUsd: number;
  projectedMovementUsd: number;
  currentLevelLimitUsd: number | null;
  nextLevel: EligibleKycLevel | null;
  nextLevelLimitUsd: number | null;
  canAccessWithdraw: boolean;
  canWithdrawRequestedAmount: boolean;
  blockingReason: string | null;
  missingForCurrentLevel: string[];
  missingForRequestedLevel: string[];
  documents: Record<KycDocumentType, KycDocumentSummary>;
};

export const KYC_LEVEL_LIMITS: Record<EligibleKycLevel, number | null> = {
  1: 200,
  2: 1000,
  3: 5000,
  4: null,
};

export const KYC_DOCUMENT_LABELS: Record<KycDocumentType, string> = {
  identity_document: 'Identity document',
  proof_of_residence: 'Proof of residence',
};

export const KYC_ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const KYC_ALLOWED_DOCUMENT_ACCEPT = '.pdf,image/jpeg,image/png,image/webp';

export const KYC_MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const getKycLevelBadgeLabel = (level: KycLevel) =>
  level > 0 ? `Lvl ${level}` : 'KYC pending';

export const formatKycLevelLimit = (limitUsd: number | null) =>
  limitUsd == null ? 'No limit' : limitUsd <= 0 ? 'No movement enabled yet' : `Up to ${limitUsd.toFixed(0)} USD`;
