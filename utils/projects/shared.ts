import { getMinimumInvestmentValue } from '@/lib/supabase-minimum-investment';

export type ProjectRecord = {
  id: string;
  created_at: string;
  updated_at: string | null;
  owner_user_id: string | null;
  owner_id: string | null;
  owner_wallet: string | null;
  status: string | null;
  title: string | null;
  business_name: string | null;
  sector: string | null;
  legal_representative: string | null;
  nit: string | null;
  opening_date: string | null;
  address: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  amount_requested: number | null;
  minimum_investment: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  installment_count: number | null;
  interest_rate: number | null;
  publication_end_date: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
  metadata: Record<string, unknown> | null;
};

export type ProjectMutationPayload = {
  title?: string;
  business_name?: string;
  sector?: string;
  legal_representative?: string;
  nit?: string | null;
  opening_date?: string;
  address?: string;
  phone?: string;
  city?: string;
  country?: string;
  description?: string;
  amount_requested?: number;
  minimum_investment?: number;
  currency?: string;
  publication_end_date?: string;
  term_months?: number;
  installment_count?: number;
  interest_rate?: number;
  photo_urls?: string[];
  video_url?: string | null;
  owner_wallet?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: string;
};

export const PROJECT_SELECT_WITH_MINIMUM_INVESTMENT =
  'id,created_at,updated_at,owner_user_id,owner_id,owner_wallet,status,title,business_name,sector,legal_representative,nit,opening_date,address,phone,city,country,description,amount_requested,minimum_investment,amount_received,currency,term_months,installment_count,interest_rate,publication_end_date,photo_urls,video_url,metadata';

export const PROJECT_SELECT_WITHOUT_MINIMUM_INVESTMENT =
  'id,created_at,updated_at,owner_user_id,owner_id,owner_wallet,status,title,business_name,sector,legal_representative,nit,opening_date,address,phone,city,country,description,amount_requested,amount_received,currency,term_months,installment_count,interest_rate,publication_end_date,photo_urls,video_url,metadata';

export const normalizeProjectFilter = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : value;
};

export const parseCsvValues = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const normalizeProjectRow = (row: Record<string, unknown>): ProjectRecord => ({
  id: String(row.id ?? ''),
  created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  owner_user_id: typeof row.owner_user_id === 'string' ? row.owner_user_id : null,
  owner_id: typeof row.owner_id === 'string' ? row.owner_id : null,
  owner_wallet: typeof row.owner_wallet === 'string' ? row.owner_wallet : null,
  status: typeof row.status === 'string' ? row.status : null,
  title: typeof row.title === 'string' ? row.title : null,
  business_name: typeof row.business_name === 'string' ? row.business_name : null,
  sector: typeof row.sector === 'string' ? row.sector : null,
  legal_representative:
    typeof row.legal_representative === 'string' ? row.legal_representative : null,
  nit: typeof row.nit === 'string' ? row.nit : null,
  opening_date: typeof row.opening_date === 'string' ? row.opening_date : null,
  address: typeof row.address === 'string' ? row.address : null,
  phone: typeof row.phone === 'string' ? row.phone : null,
  city: typeof row.city === 'string' ? row.city : null,
  country: typeof row.country === 'string' ? row.country : null,
  description: typeof row.description === 'string' ? row.description : null,
  amount_requested: typeof row.amount_requested === 'number' ? row.amount_requested : Number(row.amount_requested ?? 0) || null,
  minimum_investment: getMinimumInvestmentValue(row, 50),
  amount_received: typeof row.amount_received === 'number' ? row.amount_received : Number(row.amount_received ?? 0) || 0,
  currency: typeof row.currency === 'string' ? row.currency : null,
  term_months: typeof row.term_months === 'number' ? row.term_months : Number(row.term_months ?? 0) || null,
  installment_count:
    typeof row.installment_count === 'number'
      ? row.installment_count
      : Number(row.installment_count ?? 0) || null,
  interest_rate:
    typeof row.interest_rate === 'number' ? row.interest_rate : Number(row.interest_rate ?? 0) || null,
  publication_end_date:
    typeof row.publication_end_date === 'string' ? row.publication_end_date : null,
  photo_urls: Array.isArray(row.photo_urls)
    ? row.photo_urls.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    : [],
  video_url: typeof row.video_url === 'string' ? row.video_url : null,
  metadata:
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null,
});

export const buildProjectsSearchPattern = (value: string) =>
  `%${value.replace(/\s+/g, '%').replace(/,/g, ' ').trim()}%`;
