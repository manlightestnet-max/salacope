-- Offers: extra images after the cover (loaded on demand, not with the catalogue).
ALTER TABLE listings ADD COLUMN gallery JSONB NOT NULL DEFAULT '[]';

-- Insights per offer and per day: page views and clicks on "Acheter / Commander".
CREATE TABLE listing_daily_stats (
  listing_id  TEXT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  day         DATE NOT NULL,
  views       INTEGER NOT NULL DEFAULT 0,
  clicks      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (listing_id, day)
);

-- Verified stores: their own address, salacope.online/@handle.
ALTER TABLE merchants ADD COLUMN handle TEXT;
CREATE UNIQUE INDEX merchants_handle ON merchants (LOWER(handle));
