-- Colour of the lash icons on the landing page's service cards (null = automatic). Safe to run again.
alter table settings add column if not exists icon_color text;
