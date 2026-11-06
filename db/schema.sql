-- Liisu Lashes database schema.
-- Run once in Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- Safe to run again: everything uses IF NOT EXISTS.

create extension if not exists btree_gist;   -- needed for the "no double booking" rule
create extension if not exists pgcrypto;     -- gen_random_uuid()

-- Lash services (Classic, Hybrid, Volume, refills ...)
create table if not exists services (
  id              uuid primary key default gen_random_uuid(),
  name_et         text not null,
  name_en         text not null,
  description_et  text not null default '',
  description_en  text not null default '',
  duration_min    int  not null check (duration_min between 15 and 600),
  buffer_min      int  not null default 0 check (buffer_min between 0 and 120),
  price_eur       numeric(8,2) not null check (price_eur >= 0),
  photo_url       text not null default '',
  sort            int  not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Free time that the owner paints in the admin week calendar
create table if not exists availability (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  check (ends_at > starts_at)
);
create index if not exists availability_range_idx on availability (starts_at, ends_at);

create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  service_id          uuid not null references services(id),
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,           -- end of the appointment
  blocked_until       timestamptz not null,           -- ends_at + cleanup buffer
  customer_name       text not null,
  phone               text not null,
  email               text not null,
  note                text not null default '',
  lang                text not null default 'et' check (lang in ('et','en')),
  status              text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  token               text not null unique,           -- secret for the cancel / review links
  terms_accepted_at   timestamptz not null,
  gcal_event_id       text,
  reminder_sent_at    timestamptz,
  review_requested_at timestamptz,
  created_at          timestamptz not null default now(),
  check (ends_at > starts_at and blocked_until >= ends_at),
  -- Two confirmed bookings can never overlap, even if two people press
  -- "Confirm" at exactly the same moment. The database refuses the second one.
  constraint bookings_no_overlap exclude using gist (
    tstzrange(starts_at, blocked_until) with &&
  ) where (status = 'confirmed')
);
create index if not exists bookings_starts_idx on bookings (starts_at);

create table if not exists reviews (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid unique references bookings(id) on delete set null,
  rating        int not null check (rating between 1 and 5),
  text          text not null default '',
  name_display  text not null,
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- One row of settings
create table if not exists settings (
  id                   int primary key default 1 check (id = 1),
  slot_step_min        int  not null default 30,
  min_notice_hours     int  not null default 12,
  max_days_ahead       int  not null default 60,
  terms_et             text not null default '',
  terms_en             text not null default '',
  google_refresh_token text
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- The site talks to the database only from the server with its own
-- connection string, so lock the tables away from Supabase's public API.
alter table services     enable row level security;
alter table availability enable row level security;
alter table bookings     enable row level security;
alter table reviews      enable row level security;
alter table settings     enable row level security;

-- Look settings (same as db/migrations/002_appearance.sql)
alter table settings add column if not exists accent_color text not null default '#a65a2e';
alter table settings add column if not exists bg_darkness int not null default 45
  check (bg_darkness between 0 and 90);

create table if not exists assets (
  key          text primary key,
  content_type text not null,
  data         bytea not null,
  updated_at   timestamptz not null default now()
);
alter table assets enable row level security;

-- Editable landing page text (same as db/migrations/003_tagline.sql)
alter table settings add column if not exists tagline_et text;
alter table settings add column if not exists tagline_en text;

-- Archived services (same as db/migrations/004_service_archive.sql)
alter table services add column if not exists archived boolean not null default false;

-- Service colours (same as db/migrations/005_service_color.sql)
alter table services add column if not exists color text;
