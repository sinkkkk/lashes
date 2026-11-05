-- Example services so the site is not empty on day one. Edit them in /admin.
insert into services (name_et, name_en, description_et, description_en, duration_min, buffer_min, price_eur, sort) values
 ('Klassikalised ripsmed', 'Classic lashes', 'Üks pikendus igale ripsmele. Loomulik ja elegantne.', 'One extension per natural lash. Natural and elegant.', 120, 15, 45, 1),
 ('Hübriidripsmed', 'Hybrid lashes', 'Klassika ja volüümi segu, tekstuuriga look.', 'A mix of classic and volume for a textured look.', 150, 15, 55, 2),
 ('Volüümripsmed', 'Volume lashes', 'Kohevad kimbud, dramaatiline ja täidlane.', 'Fluffy fans for a full, dramatic look.', 180, 15, 65, 3),
 ('Hoolduse täitmine (2–3 näd)', 'Refill (2–3 weeks)', 'Olemasolevate ripsmete värskendus.', 'Freshen up your existing set.', 60, 15, 35, 4),
 ('Ripsmete eemaldus', 'Lash removal', 'Õrn ja ohutu eemaldus.', 'Gentle, safe removal.', 30, 0, 15, 5);

update settings set
 terms_et = E'1. Broneerides kinnitad, et oled tervislikult valmis protseduuriks (pole silmapõletikku ega allergiat ripsmeliimile).\n2. Palun tule kohale ilma meigita.\n3. Tühistamine või aja muutmine vähemalt 24h ette broneeringu lingi kaudu.\n4. Kui hilined üle 15 minuti, võib protseduur jääda lühemaks või tuleb aeg tühistada.\n5. Sinu andmeid (nimi, telefon, e-post) kasutatakse ainult broneeringu haldamiseks.',
 terms_en = E'1. By booking you confirm you are fit for the treatment (no eye infection and no allergy to lash glue).\n2. Please arrive without eye makeup.\n3. Cancel or reschedule at least 24h ahead using the link in your booking email.\n4. If you are more than 15 minutes late, the treatment may be shortened or cancelled.\n5. Your details (name, phone, email) are used only to manage your booking.'
where id = 1;
