create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12),
  start_date date not null,
  end_date date not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  cover_image_url text,
  cover_image_photographer text,
  cover_image_source_url text,
  cover_image_query text
);

alter table public.trips add column if not exists cover_image_url text;
alter table public.trips add column if not exists cover_image_photographer text;
alter table public.trips add column if not exists cover_image_source_url text;
alter table public.trips add column if not exists cover_image_query text;

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  display_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  notes text,
  link_label text,
  link_url text,
  start_date date not null,
  end_date date not null,
  location text not null,
  location_to text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trip_notes (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  content text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trip_packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  is_checked boolean not null default false,
  sort_order integer not null,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists trip_members_user_id_idx on public.trip_members (user_id);
create index if not exists trip_items_trip_id_idx on public.trip_items (trip_id);
create index if not exists trips_invite_code_idx on public.trips (invite_code);
create index if not exists trip_packing_items_trip_id_idx on public.trip_packing_items (trip_id);
create index if not exists trip_packing_items_trip_sort_idx on public.trip_packing_items (trip_id, is_checked, sort_order);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_trip_item_updated_at on public.trip_items;

create trigger set_trip_item_updated_at
before update on public.trip_items
for each row
execute function public.touch_updated_at();

drop trigger if exists set_trip_note_updated_at on public.trip_notes;

create trigger set_trip_note_updated_at
before update on public.trip_notes
for each row
execute function public.touch_updated_at();

drop trigger if exists set_trip_packing_item_updated_at on public.trip_packing_items;

create trigger set_trip_packing_item_updated_at
before update on public.trip_packing_items
for each row
execute function public.touch_updated_at();

create or replace function public.ensure_trip_note_exists()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_notes (trip_id)
  values (new.id)
  on conflict (trip_id) do nothing;

  return new;
end;
$$;

drop trigger if exists ensure_trip_note_exists on public.trips;

create trigger ensure_trip_note_exists
after insert on public.trips
for each row
execute function public.ensure_trip_note_exists();

insert into public.trip_notes (trip_id)
select trips.id
from public.trips
left join public.trip_notes on trip_notes.trip_id = trips.id
where trip_notes.trip_id is null;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_items enable row level security;
alter table public.trip_notes enable row level security;
alter table public.trip_packing_items enable row level security;

create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members
    where trip_id = target_trip_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_owner(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members
    where trip_id = target_trip_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create policy "Trip members can view their trips"
on public.trips
for select
using (
  created_by = auth.uid()
  or public.is_trip_member(id)
);

create policy "Authenticated users can create trips"
on public.trips
for insert
with check (auth.uid() = created_by);

create policy "Trip owners can update their trips"
on public.trips
for update
using (
  public.is_trip_owner(id)
)
with check (
  public.is_trip_owner(id)
);

create policy "Trip members can view memberships"
on public.trip_members
for select
using (
  user_id = auth.uid()
  or public.is_trip_member(trip_id)
);

create policy "Authenticated users can join trips"
on public.trip_members
for insert
with check (user_id = auth.uid());

create policy "Members can update their own display name"
on public.trip_members
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Trip members can view trip items"
on public.trip_items
for select
using (
  public.is_trip_member(trip_id)
);

create policy "Trip members can create trip items"
on public.trip_items
for insert
with check (
  created_by = auth.uid()
  and public.is_trip_member(trip_id)
);

create policy "Trip members can update trip items"
on public.trip_items
for update
using (
  public.is_trip_member(trip_id)
)
with check (
  public.is_trip_member(trip_id)
);

create policy "Trip members can delete trip items"
on public.trip_items
for delete
using (
  public.is_trip_member(trip_id)
);

drop policy if exists "Trip members can view trip notes" on public.trip_notes;
drop policy if exists "Trip members can create trip notes" on public.trip_notes;
drop policy if exists "Trip members can update trip notes" on public.trip_notes;

create policy "Trip members can view trip notes"
on public.trip_notes
for select
using (
  public.is_trip_member(trip_id)
);

create policy "Trip members can create trip notes"
on public.trip_notes
for insert
with check (
  public.is_trip_member(trip_id)
);

create policy "Trip members can update trip notes"
on public.trip_notes
for update
using (
  public.is_trip_member(trip_id)
)
with check (
  public.is_trip_member(trip_id)
);

drop policy if exists "Trip members can view trip packing items" on public.trip_packing_items;
drop policy if exists "Trip members can create trip packing items" on public.trip_packing_items;
drop policy if exists "Trip members can update trip packing items" on public.trip_packing_items;
drop policy if exists "Trip members can delete trip packing items" on public.trip_packing_items;

create policy "Trip members can view trip packing items"
on public.trip_packing_items
for select
using (
  public.is_trip_member(trip_id)
);

create policy "Trip members can create trip packing items"
on public.trip_packing_items
for insert
with check (
  public.is_trip_member(trip_id)
);

create policy "Trip members can update trip packing items"
on public.trip_packing_items
for update
using (
  public.is_trip_member(trip_id)
)
with check (
  public.is_trip_member(trip_id)
);

create policy "Trip members can delete trip packing items"
on public.trip_packing_items
for delete
using (
  public.is_trip_member(trip_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel publication_rel
    join pg_class relation on relation.oid = publication_rel.prrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_publication publication on publication.oid = publication_rel.prpubid
    where publication.pubname = 'supabase_realtime'
      and namespace.nspname = 'public'
      and relation.relname = 'trip_items'
  ) then
    alter publication supabase_realtime add table public.trip_items;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel publication_rel
    join pg_class relation on relation.oid = publication_rel.prrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_publication publication on publication.oid = publication_rel.prpubid
    where publication.pubname = 'supabase_realtime'
      and namespace.nspname = 'public'
      and relation.relname = 'trip_members'
  ) then
    alter publication supabase_realtime add table public.trip_members;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel publication_rel
    join pg_class relation on relation.oid = publication_rel.prrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_publication publication on publication.oid = publication_rel.prpubid
    where publication.pubname = 'supabase_realtime'
      and namespace.nspname = 'public'
      and relation.relname = 'trip_notes'
  ) then
    alter publication supabase_realtime add table public.trip_notes;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel publication_rel
    join pg_class relation on relation.oid = publication_rel.prrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_publication publication on publication.oid = publication_rel.prpubid
    where publication.pubname = 'supabase_realtime'
      and namespace.nspname = 'public'
      and relation.relname = 'trip_packing_items'
  ) then
    alter publication supabase_realtime add table public.trip_packing_items;
  end if;
end
$$;

-- Lifetime access table (populated by Stripe webhook or bypass code)
create table if not exists public.access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default timezone('utc', now()),
  method text not null check (method in ('stripe', 'code'))
);

alter table public.access enable row level security;

create policy "Users can read own access"
on public.access for select
using (user_id = auth.uid());

create policy "Users can insert own access"
on public.access for insert
with check (user_id = auth.uid());
