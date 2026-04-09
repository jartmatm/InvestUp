'use client';

const getWishlistKeys = (userId: string) =>
  [`investapp_wishlist_${userId}`, `investup_wishlist_${userId}`] as const;

const normalizeWishlist = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

export const readWishlist = (userId: string | null | undefined) => {
  if (typeof window === 'undefined' || !userId) return [] as string[];

  for (const key of getWishlistKeys(userId)) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      return normalizeWishlist(JSON.parse(raw) as unknown);
    } catch {
      continue;
    }
  }

  return [] as string[];
};

export const writeWishlist = (userId: string | null | undefined, wishlist: string[]) => {
  if (typeof window === 'undefined' || !userId) return;

  const serialized = JSON.stringify(normalizeWishlist(wishlist));
  getWishlistKeys(userId).forEach((key) => {
    window.localStorage.setItem(key, serialized);
  });
};
