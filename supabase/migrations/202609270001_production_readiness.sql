-- Production-readiness lifecycle controls for GuestAtlas.
-- Data-rights requests are workflow records only: destructive actions remain manual
-- until the operator's counsel-approved retention/erasure policy is implemented.

create table public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  source_hotel_id uuid not null references public.hotels(id) on delete cascade,
  request_type text not null check (request_type in ('access','export','rectification','erasure','restriction','objection','other')),
  message_cipher text,
  status text not null default 'pending' check (status in ('pending','identity_verified','in_progress','completed','partially_completed','rejected')),
  identity_verified_at timestamptz,
  internal_target_at timestamptz not null default (now() + interval '30 days'),
  response_cipher text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index data_rights_hotel_status_idx on public.data_rights_requests(source_hotel_id,status,created_at);
create index data_rights_guest_idx on public.data_rights_requests(guest_id,created_at desc);

create table public.hotel_compliance_profiles (
  hotel_id uuid primary key references public.hotels(id) on delete cascade,
  privacy_contact_email text,
  dpo_name text,
  dpo_email text,
  dpo_requirement_reviewed boolean not null default false,
  lawful_basis_notes text,
  international_transfer_notes text,
  breach_contact_email text,
  privacy_notice_version text,
  terms_version text,
  last_legal_review_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.policy_acceptances (
  id bigint generated always as identity primary key,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_type text not null check (policy_type in ('terms','privacy','acceptable_use','data_handling')),
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  unique(hotel_id,user_id,policy_type,policy_version)
);

create table public.security_events (
  id bigint generated always as identity primary key,
  hotel_id uuid references public.hotels(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index security_events_hotel_time_idx on public.security_events(hotel_id,created_at desc);

alter table public.guest_portal_tokens
  add column if not exists first_accessed_at timestamptz,
  add column if not exists last_accessed_at timestamptz,
  add column if not exists access_count integer not null default 0 check(access_count >= 0);

alter table public.data_rights_requests enable row level security;
alter table public.hotel_compliance_profiles enable row level security;
alter table public.policy_acceptances enable row level security;
alter table public.security_events enable row level security;

revoke all on public.data_rights_requests from anon, authenticated;
revoke all on public.hotel_compliance_profiles from anon, authenticated;
revoke all on public.policy_acceptances from anon, authenticated;
revoke all on public.security_events from anon, authenticated;

grant select,insert,update,delete on public.data_rights_requests to service_role;
grant select,insert,update,delete on public.hotel_compliance_profiles to service_role;
grant select,insert,update,delete on public.policy_acceptances to service_role;
grant select,insert,update,delete on public.security_events to service_role;
grant usage,select on all sequences in schema public to service_role;

create or replace function public.touch_updated_at() returns trigger
language plpgsql
set search_path=''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

create trigger data_rights_touch before update on public.data_rights_requests
for each row execute procedure public.touch_updated_at();

create trigger hotel_compliance_touch before update on public.hotel_compliance_profiles
for each row execute procedure public.touch_updated_at();
