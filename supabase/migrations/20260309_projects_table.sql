-- 2026-03-09
-- Projects published by entrepreneurs for feed visibility.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  owner_user_id text not null,
  owner_wallet text,

  business_name text not null,
  legal_representative text not null,
  nit text,
  opening_date date,
  address text,
  phone text,
  city text,
  country text,
  description text not null,

  target_amount_usd numeric(14, 2) not null,
  publication_end_date date not null,
  interest_rate_ea numeric(6, 2) not null,

  photo_urls jsonb not null default '[]'::jsonb,
  video_url text,
  status text not null default 'published',
  metadata jsonb not null default '{}'::jsonb,

  constraint projects_description_len_check check (char_length(description) <= 2500),
  constraint projects_status_check check (status in ('draft', 'published', 'closed'))
);

alter table if exists public.projects
  add column if not exists owner_user_id text,
  add column if not exists owner_wallet text,
  add column if not exists business_name text,
  add column if not exists legal_representative text,
  add column if not exists nit text,
  add column if not exists opening_date date,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists description text,
  add column if not exists target_amount_usd numeric(14, 2),
  add column if not exists publication_end_date date,
  add column if not exists interest_rate_ea numeric(6, 2),
  add column if not exists photo_urls jsonb default '[]'::jsonb,
  add column if not exists video_url text,
  add column if not exists status text default 'published',
  add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists projects_owner_user_id_idx on public.projects (owner_user_id);
create index if not exists projects_created_at_idx on public.projects (created_at desc);
create index if not exists projects_status_idx on public.projects (status);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();
