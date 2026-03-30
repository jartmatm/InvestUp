-- 2026-03-31
-- Adds minimum investment controls to entrepreneur projects.

alter table if exists public.projects
  add column if not exists minimum_investment numeric(20, 6);

update public.projects
set minimum_investment = 50
where minimum_investment is null
   or minimum_investment <= 0;

alter table if exists public.projects
  alter column minimum_investment set default 50;

alter table if exists public.projects
  drop constraint if exists projects_minimum_investment_check;

alter table if exists public.projects
  add constraint projects_minimum_investment_check
    check (minimum_investment > 0);
