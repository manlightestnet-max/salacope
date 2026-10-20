-- Visits, counted honestly: one per visitor, per page and per day, and the store page counts too.
--   visit_seen        who was already counted today (a hash of address + browser + day: nothing that identifies a person,
--                     dropped after two days). `kind`: view / click (an offer) / store.
--   store_daily_stats visits of a store's own page, per day.
CREATE TABLE visit_seen (
  kind    TEXT NOT NULL,
  target  TEXT NOT NULL,
  visitor TEXT NOT NULL,
  day     DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (kind, target, visitor, day)
);
CREATE INDEX visit_seen_day ON visit_seen (day);

CREATE TABLE store_daily_stats (
  seller_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day       DATE NOT NULL,
  views     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (seller_id, day)
);
