-- Editable landing page text (empty = the built-in text). Safe to run again.
alter table settings add column if not exists tagline_et text;
alter table settings add column if not exists tagline_en text;
