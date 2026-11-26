-- Essensplan: Mitteilungen einrichten (einmal im Supabase SQL Editor ausführen, nach supabase-setup.sql)
-- Jede Minute schaut die Datenbank nach, ob eine Erinnerung oder ein Anstupser fällig ist,
-- und gibt das an die Funktion "push" weiter, die es ans iPhone schickt.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Nur die Datenbank selbst kommt hier dran (keine Regeln für die App = kein Zugriff von außen)
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  url text, anon text, site text, pub text, priv jsonb
);
create table if not exists public.push_log (
  sub text not null, key text not null, kind text, sent_at timestamptz not null default now(),
  primary key (sub, key)
);
create table if not exists public.push_tokens (token text primary key, created_at timestamptz not null default now());
alter table public.push_config enable row level security;
alter table public.push_log enable row level security;
alter table public.push_tokens enable row level security;
revoke all on public.push_config, public.push_log, public.push_tokens from anon, authenticated;

-- Von der App beim Einschalten aufgerufen: merkt sich Adresse und Schlüssel, gibt den öffentlichen Schlüssel zurück
create or replace function public.push_setup(p_url text, p_anon text, p_site text, p_pub text, p_priv jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_pub text;
begin
  if not exists (select 1 from public.members where user_id = auth.uid()) then raise exception 'not_member'; end if;
  insert into public.push_config(id, url, anon, site, pub, priv) values (1, p_url, p_anon, p_site, p_pub, p_priv)
    on conflict (id) do update set url = excluded.url, anon = excluded.anon, site = excluded.site,
      pub = coalesce(public.push_config.pub, excluded.pub), priv = coalesce(public.push_config.priv, excluded.priv);
  select pub into v_pub from public.push_config where id = 1;
  return v_pub;
end $$;

-- Jede Minute: fällige Sachen an die Funktion "push" geben (p_test: Probe-Mitteilung an ein Gerät)
create or replace function public.push_tick(p_test text default null) returns void
language plpgsql security definer set search_path = public as $$
declare c record; v_subs jsonb; v_token text;
begin
  select * into c from public.push_config where id = 1;
  if c.url is null or c.priv is null then return; end if;
  delete from public.push_tokens where created_at < now() - interval '10 minutes';
  delete from public.push_log where sent_at < now() - interval '3 days';
  select jsonb_agg(jsonb_build_object(
      'id', s.id, 'sub', s.data->'sub', 'tz', coalesce(s.data->>'tz', 'Europe/Berlin'), 'nudge', coalesce((s.data->>'nudge')::boolean, true),
      'todos', coalesce((select jsonb_agg(t.data || jsonb_build_object('id', t.id)) from public.docs t
        where t.household = s.household and t.coll = 'todos' and t.data->>'who' = s.data->>'who'
          and (coalesce(t.data->>'repeat', '') <> '' or coalesce((t.data->>'done')::boolean, false) = false)), '[]'::jsonb),
      'goals', coalesce((select jsonb_agg(g.data || jsonb_build_object('id', g.id)) from public.docs g
        where g.household = s.household and g.coll = 'goals' and g.data->>'who' = s.data->>'who'), '[]'::jsonb),
      'sent', coalesce((select jsonb_agg(jsonb_build_object('key', l.key, 'kind', l.kind, 'at', l.sent_at)) from public.push_log l
        where l.sub = s.id and l.sent_at > now() - interval '26 hours'), '[]'::jsonb)))
    into v_subs from public.docs s where s.coll = 'push' and (p_test is null or s.id = p_test);
  if v_subs is null then return; end if;
  v_token := replace(gen_random_uuid()::text, '-', '');
  insert into public.push_tokens(token) values (v_token);
  perform net.http_post(
    url := c.url || '/functions/v1/push',
    body := jsonb_build_object('task', 'push_tick', 'token', v_token, 'url', c.url, 'anon', c.anon, 'site', c.site,
      'pub', c.pub, 'priv', c.priv, 'test', p_test, 'subs', v_subs),
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', c.anon),
    timeout_milliseconds := 20000);
end $$;

-- Probe-Mitteilung aus den Einstellungen der App
create or replace function public.push_test(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.docs d join public.members m on m.household = d.household
    where d.coll = 'push' and d.id = p_id and m.user_id = auth.uid()) then raise exception 'not_found'; end if;
  perform public.push_tick(p_id);
end $$;

-- Rückmeldung der Funktion: was verschickt wurde, welche Geräte nicht mehr erreichbar sind
create or replace function public.push_mark(p_token text, p_sent jsonb, p_gone jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_tokens where token = p_token;
  if not found then raise exception 'bad_token'; end if;
  insert into public.push_log(sub, key, kind)
    select x->>'sub', x->>'key', x->>'kind' from jsonb_array_elements(coalesce(p_sent, '[]'::jsonb)) x
    on conflict do nothing;
  delete from public.docs where coll = 'push' and id in (select jsonb_array_elements_text(coalesce(p_gone, '[]'::jsonb)));
end $$;

revoke all on function public.push_setup(text, text, text, text, jsonb) from public, anon;
revoke all on function public.push_tick(text) from public, anon, authenticated;
revoke all on function public.push_test(text) from public, anon;
revoke all on function public.push_mark(text, jsonb, jsonb) from public;
grant execute on function public.push_setup(text, text, text, text, jsonb) to authenticated;
grant execute on function public.push_test(text) to authenticated;
grant execute on function public.push_mark(text, jsonb, jsonb) to anon, authenticated;

-- Zeitplan: jede Minute
do $$ begin perform cron.unschedule('push-tick'); exception when others then null; end $$;
select cron.schedule('push-tick', '* * * * *', 'select public.push_tick()');
