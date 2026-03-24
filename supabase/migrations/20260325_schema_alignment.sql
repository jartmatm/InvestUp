-- 2026-03-25
-- Aligns local migrations with the live English schema used by the app.
-- Keeps compatibility with older environments that still use amount_usdc.

alter table if exists public.transactions
  add column if not exists amount numeric(20, 6);

update public.transactions
set amount = coalesce(amount, amount_usdc)
where amount is null
  and amount_usdc is not null;

create index if not exists transactions_amount_idx on public.transactions (amount);

alter table if exists public.investments
  add column if not exists amount numeric(20, 6);

update public.investments
set amount = coalesce(amount, amount_usdc)
where amount is null
  and amount_usdc is not null;

create index if not exists investments_amount_idx on public.investments (amount);

alter table if exists public.projects
  add column if not exists owner_id text,
  add column if not exists title text,
  add column if not exists sector text,
  add column if not exists amount_requested numeric(14, 2),
  add column if not exists amount_received numeric(14, 2) not null default 0,
  add column if not exists currency text,
  add column if not exists term_months integer,
  add column if not exists interest_rate numeric(6, 2);

update public.projects
set owner_id = coalesce(owner_id, owner_user_id),
    title = coalesce(nullif(title, ''), business_name),
    amount_requested = coalesce(amount_requested, target_amount_usd),
    amount_received = coalesce(amount_received, 0),
    currency = coalesce(currency, 'USD'),
    interest_rate = coalesce(interest_rate, interest_rate_ea)
where owner_id is null
   or title is null
   or amount_requested is null
   or amount_received is null
   or currency is null
   or interest_rate is null;

update public.projects
set term_months = greatest(
      1,
      ceil(
        extract(epoch from (publication_end_date::timestamp - coalesce(created_at, now())))
        / (60 * 60 * 24 * 30)
      )::integer
    )
where term_months is null
  and publication_end_date is not null;
