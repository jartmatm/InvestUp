-- 2026-05-02
-- Stores guided publication prompts before entrepreneurs publish a marketplace project.

create extension if not exists pgcrypto;

create table if not exists public.project_publication_prompts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id text not null,
  prompt_json jsonb not null,
  prompt_text text not null,
  optimized_publication jsonb,
  provider text,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  constraint project_publication_prompts_status_check
    check (status in ('draft', 'optimizing', 'review_ready', 'published', 'failed'))
);

create index if not exists project_publication_prompts_user_id_idx
  on public.project_publication_prompts (user_id, created_at desc);

alter table public.project_publication_prompts enable row level security;

drop policy if exists project_publication_prompts_select_own
  on public.project_publication_prompts;
create policy project_publication_prompts_select_own
  on public.project_publication_prompts
  for select
  using (user_id = auth.uid()::text);

drop policy if exists project_publication_prompts_insert_own
  on public.project_publication_prompts;
create policy project_publication_prompts_insert_own
  on public.project_publication_prompts
  for insert
  with check (user_id = auth.uid()::text);

drop policy if exists project_publication_prompts_update_own
  on public.project_publication_prompts;
create policy project_publication_prompts_update_own
  on public.project_publication_prompts
  for update
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

drop trigger if exists project_publication_prompts_set_updated_at
  on public.project_publication_prompts;
create trigger project_publication_prompts_set_updated_at
before update on public.project_publication_prompts
for each row execute function public.set_updated_at();
