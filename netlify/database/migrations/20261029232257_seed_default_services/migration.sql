INSERT INTO "services" ("slug", "name", "description", "sort_order") VALUES
  ('general-repairs', 'General Repairs', 'From sticking doors and loose fittings to small household jobs that keep a home working properly, we handle the practical tasks that matter most.', 1),
  ('lighting', 'Lighting', 'We install and replace lighting, upgrade fixtures and help improve the look and practicality of your home with straightforward solutions.', 2),
  ('plumbing', 'Minor Plumbing', 'We take care of common plumbing tasks including leaking taps, toilet issues, minor pipe leaks and small fittings repairs.', 3),
  ('doors-locks', 'Doors & Locks', 'We fit, adjust, repair and improve doors and locks so they work properly, feel secure and look right.', 4),
  ('assembly', 'Furniture Assembly', 'Flat-pack furniture, shelves and simple home fittings can be assembled properly and efficiently, with no avoidable stress.', 5),
  ('decorating', 'Decorating', 'From touch-ups to painting and finishing details, we help refresh and improve your home with neat, practical results.', 6),
  ('garden-maintenance', 'Garden Cleaning & Maintenance', 'We help keep outdoor spaces tidy, manageable and ready to enjoy, from clearing general mess to routine garden upkeep.', 7)
ON CONFLICT ("slug") DO NOTHING;
