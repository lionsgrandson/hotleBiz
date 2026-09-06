create extension if not exists pgcrypto;

create type public.hotel_role as enum ('owner','admin','manager','reviewer','viewer');
create type public.membership_status as enum ('active','suspended','revoked');
create type public.guest_record_status as enum ('active','restricted','pseudonymized');
create type public.stay_status as enum ('booked','checked_in','completed','cancelled');
create type public.feedback_status as enum ('draft','published','under_review','withdrawn');
create type public.incident_status as enum ('draft','pending_review','published','under_review','removed');
create type public.dispute_status as enum ('pending','reviewing','resolved','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text,
  country_code char(2),
  legal_contact_email text not null,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  plan text not null default 'network',
  legal_entity_name text,
  registration_number text,
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected','suspended')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verification_notes text,
  feedback_retention_months int not null default 36 check (feedback_retention_months between 6 and 120),
  incident_retention_months int not null default 60 check (incident_retention_months between 12 and 180),
  identity_retention_months int not null default 60 check (identity_retention_months between 12 and 180),
  terms_accepted_at timestamptz,
  data_controller_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hotel_memberships (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.hotel_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hotel_id,user_id)
);

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.hotel_invites (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  email text not null,
  role public.hotel_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  legal_name_cipher text not null,
  dob_cipher text not null,
  email_cipher text,
  phone_cipher text,
  country_code char(2),
  record_status public.guest_record_status not null default 'active',
  created_by_hotel_id uuid references public.hotels(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guest_identifiers (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  identifier_type text not null check(identifier_type in ('passport','national_id','email','phone','name_dob')),
  identifier_hmac text not null,
  masked_value text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index guest_identifiers_hash_idx on public.guest_identifiers(identifier_hmac);
create index guest_identifiers_guest_idx on public.guest_identifiers(guest_id);
create unique index guest_document_unique on public.guest_identifiers(identifier_hmac) where identifier_type in ('passport','national_id');

create table public.guest_hotel_links (
  guest_id uuid not null references public.guests(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  relationship_status text not null default 'active' check(relationship_status in ('active','historical','blocked_locally')),
  first_stay_at timestamptz,
  last_stay_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(guest_id,hotel_id)
);


create table public.guest_access_grants (
  guest_id uuid not null references public.guests(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(guest_id,hotel_id,user_id)
);
create index guest_access_grants_expiry_idx on public.guest_access_grants(user_id,hotel_id,expires_at);

create table public.stays (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  reservation_ref_cipher text,
  room_ref_cipher text,
  check_in date not null,
  check_out date not null,
  status public.stay_status not null default 'completed',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(check_out >= check_in)
);
create index stays_guest_idx on public.stays(guest_id,check_in desc);
create index stays_hotel_idx on public.stays(hotel_id,check_in desc);

create table public.stay_feedback (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null unique references public.stays(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  cleanliness smallint not null check(cleanliness between 1 and 5),
  property_care smallint not null check(property_care between 1 and 5),
  staff_respect smallint not null check(staff_respect between 1 and 5),
  noise smallint not null check(noise between 1 and 5),
  payment smallint not null check(payment between 1 and 5),
  policy_compliance smallint not null check(policy_compliance between 1 and 5),
  overall_score numeric(3,2) not null check(overall_score between 1 and 5),
  would_host_again boolean,
  summary_cipher text,
  status public.feedback_status not null default 'published',
  dispute_status text not null default 'none' check(dispute_status in ('none','open','resolved','rejected')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feedback_guest_idx on public.stay_feedback(guest_id,published_at desc);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  stay_id uuid references public.stays(id) on delete set null,
  category text not null check(category in ('property_damage','threats_violence','theft_report','harassment','noise_disturbance','smoking','unauthorized_guests','payment_dispute','fraud_suspicion','security_intervention','other')),
  severity smallint not null check(severity between 1 and 4),
  evidence_level text not null check(evidence_level in ('observed','documented','reported')),
  title_cipher text not null,
  description_cipher text not null,
  external_ref_cipher text,
  occurred_at timestamptz not null,
  status public.incident_status not null default 'draft',
  dispute_status text not null default 'none' check(dispute_status in ('none','open','resolved','rejected')),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index incidents_guest_idx on public.incidents(guest_id,occurred_at desc);
create index incidents_review_idx on public.incidents(hotel_id,status,created_at);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  storage_path text not null unique,
  file_name_cipher text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.guest_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  source_hotel_id uuid not null references public.hotels(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  source_hotel_id uuid not null references public.hotels(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete set null,
  feedback_id uuid references public.stay_feedback(id) on delete set null,
  request_type text not null,
  message_cipher text not null,
  status public.dispute_status not null default 'pending',
  response_cipher text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check(num_nonnulls(incident_id,feedback_id) = 1)
);
create index disputes_hotel_status_idx on public.disputes(source_hotel_id,status,created_at);
create unique index disputes_one_open_incident_idx on public.disputes(incident_id) where incident_id is not null and status in ('pending','reviewing');
create unique index disputes_one_open_feedback_idx on public.disputes(feedback_id) where feedback_id is not null and status in ('pending','reviewing');

create table public.record_revisions (
  id bigint generated always as identity primary key,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  target_type text not null check(target_type in ('incident','stay_feedback')),
  target_id uuid not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text not null,
  old_data jsonb not null default '{}'::jsonb,
  new_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index revisions_target_idx on public.record_revisions(target_type,target_id,created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  hotel_id uuid references public.hotels(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  purpose text,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);
create index audit_hotel_time_idx on public.audit_logs(hotel_id,created_at desc);
create index audit_user_time_idx on public.audit_logs(user_id,created_at desc);

create table public.retention_queue (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  eligible_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','approved','deferred','completed')),
  created_at timestamptz not null default now(),
  unique(target_type,target_id)
);


-- Cross-table consistency guards. The server key is privileged, so invariants are also enforced in Postgres.
create or replace function public.enforce_feedback_consistency() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.stays s where s.id=new.stay_id and s.hotel_id=new.hotel_id and s.guest_id=new.guest_id) then
    raise exception 'feedback stay/hotel/guest mismatch';
  end if;
  return new;
end; $$;
revoke all on function public.enforce_feedback_consistency() from public, anon, authenticated;
create trigger feedback_consistency before insert or update on public.stay_feedback for each row execute procedure public.enforce_feedback_consistency();

create or replace function public.enforce_incident_consistency() returns trigger language plpgsql set search_path='' as $$
begin
  if new.stay_id is not null and not exists(select 1 from public.stays s where s.id=new.stay_id and s.hotel_id=new.hotel_id and s.guest_id=new.guest_id) then
    raise exception 'incident stay/hotel/guest mismatch';
  end if;
  return new;
end; $$;
revoke all on function public.enforce_incident_consistency() from public, anon, authenticated;
create trigger incident_consistency before insert or update on public.incidents for each row execute procedure public.enforce_incident_consistency();

create or replace function public.enforce_evidence_consistency() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.incidents i where i.id=new.incident_id and i.hotel_id=new.hotel_id) then
    raise exception 'evidence incident/property mismatch';
  end if;
  return new;
end; $$;
revoke all on function public.enforce_evidence_consistency() from public, anon, authenticated;
create trigger evidence_consistency before insert or update on public.evidence_files for each row execute procedure public.enforce_evidence_consistency();

create or replace function public.enforce_dispute_consistency() returns trigger language plpgsql set search_path='' as $$
begin
  if new.incident_id is not null and not exists(select 1 from public.incidents i where i.id=new.incident_id and i.hotel_id=new.source_hotel_id and i.guest_id=new.guest_id) then
    raise exception 'dispute incident/source/guest mismatch';
  end if;
  if new.feedback_id is not null and not exists(select 1 from public.stay_feedback f where f.id=new.feedback_id and f.hotel_id=new.source_hotel_id and f.guest_id=new.guest_id) then
    raise exception 'dispute feedback/source/guest mismatch';
  end if;
  return new;
end; $$;
revoke all on function public.enforce_dispute_consistency() from public, anon, authenticated;
create trigger dispute_consistency before insert or update on public.disputes for each row execute procedure public.enforce_dispute_consistency();


-- Atomic hotel-side dispute resolution. Keeps correction, revision history and dispute state in one transaction.
create or replace function public.resolve_guest_dispute(
  p_dispute_id uuid,
  p_hotel_id uuid,
  p_user_id uuid,
  p_decision text,
  p_response_cipher text,
  p_replacement_cipher text default null
) returns void language plpgsql set search_path='' as $$
declare
  d public.disputes%rowtype;
  old_row jsonb;
begin
  if p_decision not in ('accepted','rejected') then raise exception 'invalid dispute decision'; end if;
  select * into d from public.disputes where id=p_dispute_id and source_hotel_id=p_hotel_id for update;
  if not found then raise exception 'dispute not found'; end if;
  if d.status not in ('pending','reviewing') then raise exception 'dispute already resolved'; end if;

  if d.incident_id is not null then
    select to_jsonb(i) into old_row from public.incidents i where i.id=d.incident_id and i.hotel_id=p_hotel_id for update;
    if old_row is null then raise exception 'incident missing'; end if;
    if p_decision='accepted' then
      if p_replacement_cipher is not null then
        update public.incidents set description_cipher=p_replacement_cipher,status='published',dispute_status='resolved' where id=d.incident_id;
      else
        update public.incidents set status='removed',dispute_status='resolved' where id=d.incident_id;
      end if;
    else
      update public.incidents set status='published',dispute_status='rejected' where id=d.incident_id;
    end if;
    insert into public.record_revisions(hotel_id,target_type,target_id,changed_by,reason,old_data,new_data)
    values(p_hotel_id,'incident',d.incident_id,p_user_id,'guest dispute '||p_decision,old_row,jsonb_build_object('decision',p_decision,'replacement',p_replacement_cipher is not null));
  end if;

  if d.feedback_id is not null then
    select to_jsonb(f) into old_row from public.stay_feedback f where f.id=d.feedback_id and f.hotel_id=p_hotel_id for update;
    if old_row is null then raise exception 'feedback missing'; end if;
    if p_decision='accepted' then
      if p_replacement_cipher is not null then
        update public.stay_feedback set summary_cipher=p_replacement_cipher,status='published',dispute_status='resolved' where id=d.feedback_id;
      else
        update public.stay_feedback set status='withdrawn',dispute_status='resolved' where id=d.feedback_id;
      end if;
    else
      update public.stay_feedback set status='published',dispute_status='rejected' where id=d.feedback_id;
    end if;
    insert into public.record_revisions(hotel_id,target_type,target_id,changed_by,reason,old_data,new_data)
    values(p_hotel_id,'stay_feedback',d.feedback_id,p_user_id,'guest dispute '||p_decision,old_row,jsonb_build_object('decision',p_decision,'replacement',p_replacement_cipher is not null));
  end if;

  update public.disputes
    set status=case when p_decision='accepted' then 'resolved'::public.dispute_status else 'rejected'::public.dispute_status end,
        response_cipher=p_response_cipher,resolved_by=p_user_id,resolved_at=now()
    where id=p_dispute_id;
end; $$;
revoke all on function public.resolve_guest_dispute(uuid,uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.resolve_guest_dispute(uuid,uuid,uuid,text,text,text) to service_role;


-- Atomic guest-side dispute submission. Challenged records are withheld from network consumers while reviewed.
create or replace function public.submit_guest_dispute(
  p_guest_id uuid,
  p_incident_id uuid,
  p_feedback_id uuid,
  p_message_cipher text
) returns uuid language plpgsql set search_path='' as $$
declare
  v_hotel_id uuid;
  v_dispute_id uuid;
begin
  if num_nonnulls(p_incident_id,p_feedback_id) <> 1 then raise exception 'select exactly one record'; end if;
  if p_message_cipher is null or length(p_message_cipher)=0 then raise exception 'message required'; end if;

  if p_incident_id is not null then
    select i.hotel_id into v_hotel_id
      from public.incidents i
      where i.id=p_incident_id and i.guest_id=p_guest_id and i.status in ('published','under_review')
      for update;
    if not found then raise exception 'incident not found'; end if;
    update public.incidents set status='under_review',dispute_status='open' where id=p_incident_id;
  else
    select f.hotel_id into v_hotel_id
      from public.stay_feedback f
      where f.id=p_feedback_id and f.guest_id=p_guest_id and f.status in ('published','under_review')
      for update;
    if not found then raise exception 'feedback not found'; end if;
    update public.stay_feedback set status='under_review',dispute_status='open' where id=p_feedback_id;
  end if;

  insert into public.disputes(guest_id,source_hotel_id,incident_id,feedback_id,request_type,message_cipher,status)
  values(p_guest_id,v_hotel_id,p_incident_id,p_feedback_id,'correction_or_dispute',p_message_cipher,'pending')
  returning id into v_dispute_id;
  return v_dispute_id;
end; $$;
revoke all on function public.submit_guest_dispute(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.submit_guest_dispute(uuid,uuid,uuid,text) to service_role;

-- Server-only data boundary. Browser clients use Supabase only for Auth.
alter table public.profiles enable row level security;
alter table public.hotels enable row level security;
alter table public.hotel_memberships enable row level security;
alter table public.platform_admins enable row level security;
alter table public.hotel_invites enable row level security;
alter table public.guests enable row level security;
alter table public.guest_identifiers enable row level security;
alter table public.guest_hotel_links enable row level security;
alter table public.guest_access_grants enable row level security;
alter table public.stays enable row level security;
alter table public.stay_feedback enable row level security;
alter table public.incidents enable row level security;
alter table public.evidence_files enable row level security;
alter table public.guest_portal_tokens enable row level security;
alter table public.disputes enable row level security;
alter table public.record_revisions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.retention_queue enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
revoke all on function public.set_updated_at() from public, anon, authenticated;
create trigger hotels_updated before update on public.hotels for each row execute procedure public.set_updated_at();
create trigger memberships_updated before update on public.hotel_memberships for each row execute procedure public.set_updated_at();
create trigger guests_updated before update on public.guests for each row execute procedure public.set_updated_at();
create trigger guest_links_updated before update on public.guest_hotel_links for each row execute procedure public.set_updated_at();
create trigger stays_updated before update on public.stays for each row execute procedure public.set_updated_at();
create trigger feedback_updated before update on public.stay_feedback for each row execute procedure public.set_updated_at();
create trigger incidents_updated before update on public.incidents for each row execute procedure public.set_updated_at();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('incident-evidence','incident-evidence',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- No public/authenticated Storage policies: only the server secret client handles evidence.

-- Immutability guard for audit records outside privileged maintenance.
create or replace function public.prevent_audit_mutation() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'audit logs are append-only'; end; $$;
revoke all on function public.prevent_audit_mutation() from public, anon, authenticated;
create trigger audit_no_update before update or delete on public.audit_logs for each row execute procedure public.prevent_audit_mutation();

-- Retention queueing. Core records are queued for human/legal review rather than silently erased.
create or replace function public.queue_retention_candidates() returns void language plpgsql set search_path='' as $$
begin
  insert into public.retention_queue(hotel_id,target_type,target_id,reason,eligible_at)
  select f.hotel_id,'stay_feedback',f.id,'Feedback exceeded property retention period',f.created_at + make_interval(months=>h.feedback_retention_months)
  from public.stay_feedback f join public.hotels h on h.id=f.hotel_id
  where f.created_at + make_interval(months=>h.feedback_retention_months) < now()
  on conflict(target_type,target_id) do nothing;
  insert into public.retention_queue(hotel_id,target_type,target_id,reason,eligible_at)
  select i.hotel_id,'incident',i.id,'Incident exceeded property retention period',i.created_at + make_interval(months=>h.incident_retention_months)
  from public.incidents i join public.hotels h on h.id=i.hotel_id
  where i.created_at + make_interval(months=>h.incident_retention_months) < now()
  on conflict(target_type,target_id) do nothing;
end; $$;
revoke all on function public.queue_retention_candidates() from public, anon, authenticated;
grant execute on function public.queue_retention_candidates() to service_role;

-- Audit/security logs retained for 24 months by default. This function is deliberately not auto-scheduled;
-- schedule it only after counsel confirms the retention rule for your deployment.
create or replace function public.prune_old_audit_logs() returns bigint language plpgsql set search_path='' as $$
declare n bigint; begin
  -- Temporarily disable immutability trigger only for controlled DB-owner maintenance.
  execute 'alter table public.audit_logs disable trigger audit_no_update';
  delete from public.audit_logs where created_at < now() - interval '24 months';
  get diagnostics n = row_count;
  execute 'alter table public.audit_logs enable trigger audit_no_update';
  return n;
exception when others then
  execute 'alter table public.audit_logs enable trigger audit_no_update';
  raise;
end; $$;
revoke all on function public.prune_old_audit_logs() from public, anon, authenticated;
grant execute on function public.prune_old_audit_logs() to service_role;
