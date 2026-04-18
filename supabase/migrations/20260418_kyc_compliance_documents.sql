-- 2026-04-18
-- KYC compliance documents and secure server-side access.

create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  user_id text not null,
  role text,
  document_type text not null,
  file_name text not null,
  storage_bucket text not null default 'kyc-documents',
  storage_path text not null,
  content_type text,
  file_size_bytes bigint,
  status text not null default 'submitted',
  metadata jsonb not null default '{}'::jsonb,

  constraint kyc_documents_document_type_check
    check (document_type in ('identity_document', 'proof_of_residence')),
  constraint kyc_documents_status_check
    check (status in ('submitted', 'approved', 'rejected')),
  constraint kyc_documents_user_document_type_key
    unique (user_id, document_type)
);

create index if not exists kyc_documents_user_id_idx
  on public.kyc_documents (user_id);

create index if not exists kyc_documents_status_idx
  on public.kyc_documents (status);

create index if not exists kyc_documents_updated_at_idx
  on public.kyc_documents (updated_at desc);

alter table if exists public.kyc_documents enable row level security;

revoke all on table public.kyc_documents from public, anon, authenticated;

drop trigger if exists kyc_documents_set_updated_at on public.kyc_documents;
create trigger kyc_documents_set_updated_at
before update on public.kyc_documents
for each row execute function public.set_updated_at();
