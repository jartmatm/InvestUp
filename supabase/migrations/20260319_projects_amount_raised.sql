-- 2026-03-19
-- Adds raised amount tracking to projects and backfills from persisted investments.

alter table if exists public.projects
  add column if not exists amount_raised numeric(14, 2) not null default 0;

update public.projects
set amount_raised = coalesce(amount_raised, 0)
where amount_raised is null;

with investment_totals as (
  select project_id, sum(amount_usdc) as total_raised
  from public.investments
  where status in ('submitted', 'confirmed')
  group by project_id
)
update public.projects as projects
set amount_raised = coalesce(investment_totals.total_raised, 0)
from investment_totals
where projects.id::text = investment_totals.project_id;
