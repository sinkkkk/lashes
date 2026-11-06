-- A colour per service, to colour-code lash types in the admin (null = accent colour). Safe to run again.
alter table services add column if not exists color text;
