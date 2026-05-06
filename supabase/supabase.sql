-- Destructive StopAccess sync reset.
-- Run in Supabase SQL Editor when you approve deleting old sync data.

drop table if exists public.user_nextdns cascade;
drop table if exists public.user_schedules cascade;
drop table if exists public.user_rules cascade;
drop table if exists public.usage_snapshots cascade;
drop table if exists public.sync_log cascade;
drop table if exists public.sync_state cascade;

drop function if exists public.mirror_state_to_log() cascade;
drop function if exists public.mirror_rules_to_log() cascade;
drop function if exists public.mirror_schedules_to_log() cascade;
drop function if exists public.mirror_nextdns_to_log() cascade;
drop function if exists public.prune_sync_log() cascade;

create table public.sync_state (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  profile_id  text        not null,
  entity      text        not null check (entity in ('focus')),
  device_id   text        not null,
  payload     jsonb       not null default '{}',
  ts          bigint      not null default 0,
  diff_id     text        not null default '',
  updated_at  timestamptz not null default now(),
  primary key (user_id, profile_id, entity)
);

create table public.sync_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  profile_id  text not null,
  entity      text not null,
  device_id   text not null,
  payload     jsonb not null,
  ts          bigint not null,
  diff_id     text not null,
  created_at  timestamptz not null default now()
);

create table public.user_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  package_name text not null,
  app_name text not null default '',
  type text not null check (type in ('domain', 'service', 'category')),
  custom_domain text,
  scope text,
  mode text,
  daily_limit_minutes int,
  desired_blocking_state boolean,
  max_daily_passes int,
  added_at bigint,
  updated_at bigint,
  added_by_user boolean,
  device_id text not null,
  diff_id text not null default '',
  cloud_updated_at timestamptz not null default now(),
  unique(user_id, profile_id, package_name)
);

create table public.user_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  schedule_id text not null,
  name text not null default '',
  start_time text not null default '',
  end_time text not null default '',
  days jsonb not null default '[]',
  app_names jsonb not null default '[]',
  active boolean not null default true,
  updated_at bigint,
  device_id text not null,
  diff_id text not null default '',
  cloud_updated_at timestamptz not null default now(),
  unique(user_id, profile_id, schedule_id)
);

create table public.user_nextdns (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  encrypted_profile_id text not null,
  encrypted_api_key text not null,
  device_id text not null,
  updated_at bigint not null default 0,
  diff_id text not null default '',
  cloud_updated_at timestamptz not null default now(),
  primary key(user_id, profile_id)
);

create table public.usage_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  profile_id  text not null default '',
  device_id   text not null default '',
  day         date not null,
  domain      text not null,
  time_ms     bigint not null default 0,
  sessions    int not null default 0,
  updated_at  timestamptz not null default now(),
  unique(user_id, profile_id, device_id, day, domain)
);

create index ix_sync_log_user_profile_ts on public.sync_log (user_id, profile_id, ts desc);
create index ix_usage_snapshots_user_profile_day on public.usage_snapshots (user_id, profile_id, day desc);
create index ix_user_rules_user_profile on public.user_rules (user_id, profile_id);
create index ix_user_schedules_user_profile on public.user_schedules (user_id, profile_id);

create or replace function public.prune_sync_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.sync_log where created_at < now() - interval '7 days';
  return null;
end;
$$;

create or replace function public.mirror_state_to_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and NEW.payload = OLD.payload then
    return NEW;
  end if;

  insert into public.sync_log (user_id, profile_id, entity, device_id, payload, ts, diff_id)
  values (
    NEW.user_id,
    NEW.profile_id,
    NEW.entity,
    NEW.device_id,
    jsonb_build_object(
      'event', lower(TG_OP),
      'payload_size', pg_column_size(NEW.payload),
      'payload_md5', md5(NEW.payload::text)
    ),
    NEW.ts,
    NEW.diff_id
  );
  return NEW;
end;
$$;

create or replace function public.mirror_rules_to_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare row_payload jsonb;
begin
  row_payload := to_jsonb(NEW) - 'encrypted_api_key';
  insert into public.sync_log (user_id, profile_id, entity, device_id, payload, ts, diff_id)
  values (
    NEW.user_id,
    NEW.profile_id,
    'rules',
    NEW.device_id,
    jsonb_build_object(
      'event', lower(TG_OP),
      'package_name', NEW.package_name,
      'payload_size', pg_column_size(row_payload),
      'payload_md5', md5(row_payload::text)
    ),
    coalesce(NEW.updated_at, extract(epoch from now())::bigint * 1000),
    coalesce(NEW.diff_id, '')
  );
  return NEW;
end;
$$;

create or replace function public.mirror_schedules_to_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare row_payload jsonb;
begin
  row_payload := to_jsonb(NEW);
  insert into public.sync_log (user_id, profile_id, entity, device_id, payload, ts, diff_id)
  values (
    NEW.user_id,
    NEW.profile_id,
    'schedules',
    NEW.device_id,
    jsonb_build_object(
      'event', lower(TG_OP),
      'schedule_id', NEW.schedule_id,
      'payload_size', pg_column_size(row_payload),
      'payload_md5', md5(row_payload::text)
    ),
    coalesce(NEW.updated_at, extract(epoch from now())::bigint * 1000),
    coalesce(NEW.diff_id, '')
  );
  return NEW;
end;
$$;

create or replace function public.mirror_nextdns_to_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sync_log (user_id, profile_id, entity, device_id, payload, ts, diff_id)
  values (
    NEW.user_id,
    NEW.profile_id,
    'nextdns',
    NEW.device_id,
    jsonb_build_object(
      'event', lower(TG_OP),
      'has_encrypted_profile_id', NEW.encrypted_profile_id is not null,
      'has_encrypted_api_key', NEW.encrypted_api_key is not null,
      'encrypted_profile_id_md5', case
        when NEW.encrypted_profile_id is null then null
        else md5(NEW.encrypted_profile_id)
      end,
      'encrypted_api_key_md5', case
        when NEW.encrypted_api_key is null then null
        else md5(NEW.encrypted_api_key)
      end
    ),
    coalesce(NEW.updated_at, extract(epoch from now())::bigint * 1000),
    coalesce(NEW.diff_id, '')
  );
  return NEW;
end;
$$;

create trigger trg_prune_sync_log
after insert on public.sync_log
for each statement execute function public.prune_sync_log();

create trigger trg_mirror_state
after insert or update on public.sync_state
for each row execute function public.mirror_state_to_log();

create trigger trg_mirror_rules
after insert or update on public.user_rules
for each row execute function public.mirror_rules_to_log();

create trigger trg_mirror_schedules
after insert or update on public.user_schedules
for each row execute function public.mirror_schedules_to_log();

create trigger trg_mirror_nextdns
after insert or update on public.user_nextdns
for each row execute function public.mirror_nextdns_to_log();

alter table public.sync_state enable row level security;
alter table public.sync_log enable row level security;
alter table public.user_rules enable row level security;
alter table public.user_schedules enable row level security;
alter table public.user_nextdns enable row level security;
alter table public.usage_snapshots enable row level security;

create policy sync_state_secure on public.sync_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sync_log_secure on public.sync_log
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_rules_secure on public.user_rules
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_schedules_secure on public.user_schedules
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_nextdns_secure on public.user_nextdns
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy usage_secure on public.usage_snapshots
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.sync_state;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.usage_snapshots;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_rules;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_schedules;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_nextdns;
exception when duplicate_object then null;
end $$;
