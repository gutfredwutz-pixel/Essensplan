-- Essensplan: News einrichten (einmal im Supabase SQL Editor ausführen, nach supabase-push.sql)
-- Die Datenbank stößt morgens, mittags und abends die Funktion "news" an. Die holt die Meldungen,
-- lässt sie von der KI aufbereiten und legt das Ergebnis über news_save hier ab.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.news_state (
  id int primary key default 1 check (id = 1),
  url text, anon text, data jsonb, at timestamptz, tried timestamptz, error text
);
create table if not exists public.news_tokens (token text primary key, created_at timestamptz not null default now());
alter table public.news_state enable row level security;
alter table public.news_tokens enable row level security;
revoke all on public.news_state, public.news_tokens from anon, authenticated;

-- Funktion "news" anstoßen (höchstens alle 20 Minuten)
create or replace function public.news_tick(p_force boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare c record; v_token text; v_hour int := extract(hour from now() at time zone 'Europe/Berlin');
begin
  select * into c from public.news_state where id = 1;
  if c.url is null then return; end if;
  if c.tried is not null and c.tried > now() - interval '20 minutes' then return; end if;
  if not p_force and v_hour not in (6, 12, 17) and c.at is not null and c.at > now() - interval '8 hours' then return; end if;
  update public.news_state set tried = now() where id = 1;
  delete from public.news_tokens where created_at < now() - interval '15 minutes';
  v_token := replace(gen_random_uuid()::text, '-', '');
  insert into public.news_tokens(token) values (v_token);
  perform net.http_post(
    url := c.url || '/functions/v1/news',
    body := jsonb_build_object('task', 'news_build', 'token', v_token, 'url', c.url, 'anon', c.anon, 'prev', c.data),
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', c.anon, 'Authorization', 'Bearer ' || c.anon),
    timeout_milliseconds := 15000);
end $$;

-- Von der Funktion: ist der Token echt?
create or replace function public.news_check(p_token text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from public.news_tokens where token = p_token and created_at > now() - interval '15 minutes');
$$;

-- Von der Funktion: Ergebnis ablegen (Token gilt einmal)
create or replace function public.news_save(p_token text, p_data jsonb, p_error text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.news_tokens where token = p_token;
  if not found then raise exception 'bad_token'; end if;
  if p_data is not null then update public.news_state set data = p_data, at = now(), error = null where id = 1;
  else update public.news_state set error = p_error where id = 1; end if;
end $$;

-- Von der App: aktuellen Stand holen; ist er älter als 3 Stunden, wird nachgeladen
create or replace function public.news_get(p_url text, p_anon text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb; v_at timestamptz;
begin
  if not exists (select 1 from public.members where user_id = auth.uid()) then raise exception 'not_member'; end if;
  insert into public.news_state(id, url, anon) values (1, p_url, p_anon)
    on conflict (id) do update set url = coalesce(public.news_state.url, excluded.url), anon = coalesce(public.news_state.anon, excluded.anon);
  select data, at into v, v_at from public.news_state where id = 1;
  if v_at is null or v_at < now() - interval '3 hours' then perform public.news_tick(true); end if;
  return coalesce(v, '{}'::jsonb) || jsonb_build_object('loading', v_at is null or v_at < now() - interval '3 hours');
end $$;

revoke all on function public.news_tick(boolean), public.news_get(text, text) from public, anon;
grant execute on function public.news_get(text, text) to authenticated;
grant execute on function public.news_check(text), public.news_save(text, jsonb, text) to anon, authenticated;

-- jede Stunde nachsehen (news_tick entscheidet selbst, ob es Zeit ist)
select cron.schedule('news-tick', '7 * * * *', 'select public.news_tick()');
