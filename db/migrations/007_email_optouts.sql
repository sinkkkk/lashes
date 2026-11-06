-- Clients who asked not to get feedback (review) request emails. Safe to run again.
create table if not exists email_optouts (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table email_optouts enable row level security;
