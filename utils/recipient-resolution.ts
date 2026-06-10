import { isAddress } from 'viem';

export type RecipientDirectoryLike = {
  email?: string | null;
  name?: string | null;
  surname?: string | null;
  phone_number?: string | null;
  phoneNumber?: string | null;
  wallet_address?: string | null;
  walletAddress?: string | null;
};

export const normalizeRecipientIdentifier = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? '';

export const normalizeRecipientSearchText = (value: string | null | undefined) =>
  normalizeRecipientIdentifier(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

export const normalizePhoneDigits = (value: string | null | undefined) =>
  value?.replace(/\D/g, '') ?? '';

export const looksLikeEmail = (value: string | null | undefined) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value?.trim() ?? '');

export const getRecipientDisplayName = (
  target: Pick<RecipientDirectoryLike, 'name' | 'surname' | 'email'>
) => {
  const fullName = `${target.name ?? ''} ${target.surname ?? ''}`.trim();
  if (fullName) return fullName;

  const email = target.email?.trim();
  if (email) return email;

  return 'Recipient';
};

export const getRecipientContactLabel = (target: RecipientDirectoryLike) =>
  target.email?.trim() ||
  target.phone_number?.trim() ||
  target.phoneNumber?.trim() ||
  target.wallet_address?.trim() ||
  target.walletAddress?.trim() ||
  '';

export const findRecipientByIdentifier = <T extends RecipientDirectoryLike>(
  targets: T[],
  identifier: string
) => {
  const normalizedIdentifier = normalizeRecipientSearchText(identifier);
  const exactIdentifier = normalizeRecipientIdentifier(identifier);
  const identifierDigits = normalizePhoneDigits(identifier);

  if (!normalizedIdentifier && !identifierDigits) return null;

  return (
    targets.find((target) => {
      const email = normalizeRecipientIdentifier(target.email);
      const wallet = normalizeRecipientIdentifier(target.wallet_address ?? target.walletAddress);
      const fullName = normalizeRecipientSearchText(`${target.name ?? ''} ${target.surname ?? ''}`);
      const name = normalizeRecipientSearchText(target.name);
      const surname = normalizeRecipientSearchText(target.surname);
      const localPart = normalizeRecipientSearchText(target.email?.split('@')[0] ?? '');
      const phoneDigits = normalizePhoneDigits(target.phone_number ?? target.phoneNumber);

      return (
        (wallet && wallet === exactIdentifier) ||
        (email && email === exactIdentifier) ||
        (fullName && fullName === normalizedIdentifier) ||
        (name && name === normalizedIdentifier) ||
        (surname && surname === normalizedIdentifier) ||
        (localPart && localPart === normalizedIdentifier) ||
        (identifierDigits && phoneDigits === identifierDigits)
      );
    }) ?? null
  );
};

export const buildRecipientDirectorySearchQuery = (value: string) => {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  if (isAddress(normalizedValue)) {
    return { wallet: normalizedValue, limit: 8 } as const;
  }

  if (looksLikeEmail(normalizedValue)) {
    return { email: normalizedValue, limit: 8 } as const;
  }

  if (normalizedValue.length < 2) {
    return null;
  }

  return { search: normalizedValue, limit: 8 } as const;
};

export const buildPhoneSearchPattern = (value: string) => {
  const digits = normalizePhoneDigits(value);
  if (digits.length < 4) return null;

  return `%${digits.split('').join('%')}%`;
};
