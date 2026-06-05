-- Defensive alignment for older projects tables that were created before owner_user_id existed.
alter table if exists public.projects
  add column if not exists owner_user_id text;

update public.projects
set owner_user_id = coalesce(owner_user_id, owner_id)
where owner_user_id is null
  and owner_id is not null;

create index if not exists projects_owner_user_id_idx on public.projects (owner_user_id);
