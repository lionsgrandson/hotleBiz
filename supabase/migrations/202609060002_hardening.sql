-- GuestAtlas hardening migration.
-- Keeps critical multi-row operations atomic and makes controlled audit pruning callable by the server role.

create or replace function public.create_hotel_workspace(
  p_user_id uuid,
  p_name text,
  p_slug text,
  p_legal_entity_name text,
  p_registration_number text,
  p_city text,
  p_country_code text,
  p_legal_contact_email text
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_hotel_id uuid;
begin
  if p_user_id is null or not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'user not found';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'property name required'; end if;
  if nullif(trim(p_slug), '') is null then raise exception 'property slug required'; end if;
  if nullif(trim(p_legal_entity_name), '') is null then raise exception 'legal entity required'; end if;
  if nullif(trim(p_registration_number), '') is null then raise exception 'registration number required'; end if;
  if nullif(trim(p_city), '') is null then raise exception 'city required'; end if;
  if p_country_code !~ '^[A-Z]{2}$' then raise exception 'invalid country code'; end if;
  if position('@' in p_legal_contact_email) < 2 then raise exception 'invalid legal contact email'; end if;

  insert into public.hotels(
    name, slug, legal_entity_name, registration_number, city, country_code,
    legal_contact_email, verification_status, terms_accepted_at, data_controller_confirmed_at
  ) values (
    trim(p_name), trim(p_slug), trim(p_legal_entity_name), trim(p_registration_number),
    trim(p_city), upper(p_country_code), lower(trim(p_legal_contact_email)), 'pending', now(), now()
  ) returning id into v_hotel_id;

  insert into public.hotel_memberships(hotel_id, user_id, role, status)
  values(v_hotel_id, p_user_id, 'owner', 'active');

  return v_hotel_id;
end;
$$;
revoke all on function public.create_hotel_workspace(uuid,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_hotel_workspace(uuid,text,text,text,text,text,text,text) to service_role;

create or replace function public.prune_old_audit_logs() returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  n bigint;
begin
  execute 'alter table public.audit_logs disable trigger audit_no_update';
  delete from public.audit_logs where created_at < now() - interval '24 months';
  get diagnostics n = row_count;
  execute 'alter table public.audit_logs enable trigger audit_no_update';
  return n;
exception when others then
  execute 'alter table public.audit_logs enable trigger audit_no_update';
  raise;
end;
$$;
revoke all on function public.prune_old_audit_logs() from public, anon, authenticated;
grant execute on function public.prune_old_audit_logs() to service_role;
