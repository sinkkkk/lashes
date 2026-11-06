-- Deleted services that still have bookings are archived (kept for booking history,
-- hidden everywhere else). Safe to run again.
alter table services add column if not exists archived boolean not null default false;
