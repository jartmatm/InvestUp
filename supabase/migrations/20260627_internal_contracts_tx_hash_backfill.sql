-- 2026-06-27
-- Backfill internal contract tx hashes from the latest investment transaction
-- for each project/investor pair.

with latest_investments as (
  select distinct on (project_id, investor_user_id)
    project_id::text as project_id,
    investor_user_id,
    tx_hash
  from public.investments
  where tx_hash is not null
  order by project_id, investor_user_id, created_at desc
)
update public.internal_contracts as contracts
set tx_hash = latest_investments.tx_hash
from latest_investments
where contracts.project_id::text = latest_investments.project_id
  and contracts.investor_user_id = latest_investments.investor_user_id
  and coalesce(contracts.tx_hash, '') = '';
