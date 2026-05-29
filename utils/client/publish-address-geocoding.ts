'use client';

export type BusinessAddressRecord = {
  provider: string;
  provider_place_id: string;
  formatted_address: string;
  country: string;
  unit: string;
  street_address: string;
  locality: string;
  state: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
};

type GeocodingResponse<T> = {
  data: T;
  error: string | null;
};

const parseJson = async <T>(response: Response) => {
  const json = (await response.json().catch(() => null)) as GeocodingResponse<T> | null;
  return json;
};

export async function searchBusinessAddress(
  query: string,
  language = 'en'
): Promise<{ data: BusinessAddressRecord[]; error: string | null }> {
  const url = new URL('/api/geocoding', window.location.origin);
  url.searchParams.set('mode', 'search');
  url.searchParams.set('query', query);
  url.searchParams.set('lang', language);

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  });

  const json = await parseJson<BusinessAddressRecord[]>(response);
  if (!response.ok) {
    return { data: [], error: json?.error ?? 'Address lookup failed.' };
  }

  return { data: json?.data ?? [], error: json?.error ?? null };
}

export async function reverseBusinessAddress(
  latitude: number,
  longitude: number,
  language = 'en'
): Promise<{ data: BusinessAddressRecord | null; error: string | null }> {
  const url = new URL('/api/geocoding', window.location.origin);
  url.searchParams.set('mode', 'reverse');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('lang', language);

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  });

  const json = await parseJson<BusinessAddressRecord | null>(response);
  if (!response.ok) {
    return { data: null, error: json?.error ?? 'Location reverse lookup failed.' };
  }

  return { data: json?.data ?? null, error: json?.error ?? null };
}
