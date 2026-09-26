-- GuestAtlas production launch hardening.
-- Captures policy acknowledgements and adds revocable staff invitation state.

alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_acknowledged_at timestamptz;

alter table public.hotels
  add column if not exists network_terms_version text,
  add column if not exists privacy_notice_version text;

alter table public.hotel_invites
  add column if not exists revoked_at timestamptz;

create index if not exists hotel_invites_open_idx
  on public.hotel_invites(hotel_id, expires_at)
  where accepted_at is null and revoked_at is null;

create index if not exists guest_portal_tokens_open_idx
  on public.guest_portal_tokens(source_hotel_id, guest_id, expires_at)
  where revoked_at is null;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.profiles(
    id,email,full_name,terms_version,terms_accepted_at,privacy_acknowledged_at
  ) values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'terms_version',''),
    case when coalesce(new.raw_user_meta_data->>'terms_accepted_at','') <> '' then (new.raw_user_meta_data->>'terms_accepted_at')::timestamptz else null end,
    case when coalesce(new.raw_user_meta_data->>'privacy_acknowledged_at','') <> '' then (new.raw_user_meta_data->>'privacy_acknowledged_at')::timestamptz else null end
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
