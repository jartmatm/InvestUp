alter table public.projects
  drop constraint if exists projects_description_len_check;

alter table public.projects
  add constraint projects_description_len_check
  check (char_length(description) <= 5000);
