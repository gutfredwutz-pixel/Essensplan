-- Essensplan: Datenbank einrichten (einmal im Supabase SQL Editor ausführen)

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  household uuid not null references public.households(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (household, user_id)
);

create table if not exists public.docs (
  household uuid not null references public.households(id) on delete cascade,
  coll text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (household, coll, id)
);

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.docs enable row level security;

create or replace function public.is_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where household = h and user_id = auth.uid());
$$;

drop policy if exists docs_all on public.docs;
create policy docs_all on public.docs for all to authenticated
  using (public.is_member(household)) with check (public.is_member(household));

drop policy if exists members_self on public.members;
create policy members_self on public.members for select to authenticated
  using (user_id = auth.uid());

drop policy if exists households_member on public.households;
create policy households_member on public.households for select to authenticated
  using (public.is_member(id));

-- Neuen Haushalt anlegen, gibt den Code zurück
create or replace function public.create_household() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_code text; v_id uuid;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where code = v_code);
  end loop;
  insert into public.households(code) values (v_code) returning id into v_id;
  insert into public.members(household, user_id) values (v_id, auth.uid());
  return json_build_object('id', v_id, 'code', v_code);
end $$;

-- Mit Code beitreten
create or replace function public.join_household(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select id, code into v_id, v_code from public.households
    where code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  if v_id is null then raise exception 'not_found'; end if;
  insert into public.members(household, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return json_build_object('id', v_id, 'code', v_code);
end $$;

revoke all on function public.create_household() from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- Live-Updates
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
