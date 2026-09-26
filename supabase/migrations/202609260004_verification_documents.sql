-- Private property-verification documents.
create table if not exists public.hotel_verification_files (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  document_type text not null check(document_type in ('registration','business_license','property_authority','other')),
  storage_path text not null unique,
  file_name_cipher text not null,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists hotel_verification_files_hotel_idx on public.hotel_verification_files(hotel_id,created_at desc);
alter table public.hotel_verification_files enable row level security;
revoke all on public.hotel_verification_files from anon, authenticated;
