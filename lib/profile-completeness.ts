type ProfileBlob = {
  name?: string | null;
  surname?: string | null;
  phone_number?: string | null;
  country?: string | null;
  gender?: string | null;
  address?: string | null;
  avatar_url?: string | null;
} | null;

type WithdrawProfileReadinessParams = {
  record: Record<string, unknown> | null;
  fallbackEmail?: string;
  fallbackRole?: string;
};

type RequiredField = {
  label: string;
  value: string;
};

const parseProfileBlob = (value: unknown): ProfileBlob => {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as ProfileBlob;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value as ProfileBlob;
  }

  return null;
};

const pickFirstFilledString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

export const getWithdrawProfileReadiness = ({
  record,
  fallbackEmail = '',
  fallbackRole = '',
}: WithdrawProfileReadinessParams) => {
  const profileData = parseProfileBlob(record?.profile_data ?? record?.metadata ?? null);

  const requiredFields: RequiredField[] = [
    { label: 'Photo', value: pickFirstFilledString(record?.avatar_url, profileData?.avatar_url) },
    { label: 'First name', value: pickFirstFilledString(record?.name, profileData?.name) },
    { label: 'Last name', value: pickFirstFilledString(record?.surname, profileData?.surname) },
    { label: 'Email', value: pickFirstFilledString(record?.email, fallbackEmail) },
    { label: 'Gender', value: pickFirstFilledString(record?.gender, profileData?.gender) },
    { label: 'Country', value: pickFirstFilledString(record?.country, profileData?.country) },
    { label: 'Address', value: pickFirstFilledString(record?.address, profileData?.address) },
    {
      label: 'Phone number',
      value: pickFirstFilledString(record?.phone_number, profileData?.phone_number),
    },
    { label: 'Profile type', value: pickFirstFilledString(record?.role, fallbackRole) },
  ];

  const missingFields = requiredFields
    .filter((field) => !field.value)
    .map((field) => field.label);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
};
