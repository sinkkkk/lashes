-- Adds the "Välimus" (Look) settings: accent colour, background darkness and
-- an uploaded background photo. Run once in Supabase → SQL Editor. Safe to run again.
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
