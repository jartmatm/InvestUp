import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  path?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  [key: string]: unknown;
};

type NominatimPlace = {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
};

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const toStringSafe = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const toFloatOrNull = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickFirst = (...values: Array<unknown>) => {
  for (const value of values) {
    const normalized = toStringSafe(value);
    if (normalized) return normalized;
  }
  return '';
};

const normalizePlace = (place: NominatimPlace) => {
  const address = place.address ?? {};
  const unit = pickFirst(address.unit, address.house_number);
  const road = pickFirst(address.road, address.pedestrian, address.footway, address.path);
  const locality = pickFirst(
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.suburb,
    address.neighbourhood
  );
  const state = pickFirst(address.state, address.region, address.county);
  const country = pickFirst(address.country);
  const postcode = pickFirst(address.postcode);

  const streetAddress = [pickFirst(address.house_number), road].filter(Boolean).join(' ').trim() || road;

  return {
    provider: 'nominatim',
    provider_place_id: String(place.place_id ?? ''),
    formatted_address: pickFirst(place.display_name),
    country,
    unit,
    street_address: streetAddress,
    locality,
    state,
    postcode,
    latitude: toFloatOrNull(place.lat),
    longitude: toFloatOrNull(place.lon),
  };
};

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const REQUEST_HEADERS = {
  'User-Agent': 'InvestUp Publish Wizard/1.0 (support@investup.app)',
  Accept: 'application/json',
} as const;

const searchAddress = async (query: string, language: string) => {
  const url = new URL('/search', NOMINATIM_BASE_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');
  url.searchParams.set('accept-language', language || 'en');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: REQUEST_HEADERS,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Geocoding provider returned ${response.status}.`);
  }

  const data = (await response.json()) as NominatimPlace[];
  return data.map((item) => normalizePlace(item));
};

const reverseAddress = async (latitude: number, longitude: number, language: string) => {
  const url = new URL('/reverse', NOMINATIM_BASE_URL);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', language || 'en');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: REQUEST_HEADERS,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Geocoding provider returned ${response.status}.`);
  }

  const data = (await response.json()) as NominatimPlace;
  return normalizePlace(data);
};

export async function GET(request: NextRequest) {
  const mode = toStringSafe(request.nextUrl.searchParams.get('mode'));
  const language = toStringSafe(request.nextUrl.searchParams.get('lang')) || 'en';

  try {
    if (mode === 'search') {
      const query = toStringSafe(request.nextUrl.searchParams.get('query'));
      if (query.length < 3) {
        return jsonNoStore({ data: [], error: null }, { status: 200 });
      }

      const data = await searchAddress(query, language);
      return jsonNoStore({ data, error: null }, { status: 200 });
    }

    if (mode === 'reverse') {
      const latitude = Number(request.nextUrl.searchParams.get('lat'));
      const longitude = Number(request.nextUrl.searchParams.get('lon'));

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return jsonNoStore({ data: null, error: 'A valid latitude and longitude are required.' }, { status: 400 });
      }

      const data = await reverseAddress(latitude, longitude, language);
      return jsonNoStore({ data, error: null }, { status: 200 });
    }

    return jsonNoStore({ data: null, error: 'Unsupported geocoding mode.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown geocoding server error.';
    return jsonNoStore({ data: null, error: message }, { status: 500 });
  }
}
