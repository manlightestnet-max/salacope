-- Promotions with a countdown. price_xaf is the promotional price while the promotion runs, compare_at_xaf the regular one,
-- which applies again from promo_ends_at (no end date = a lasting reduction, as before).
ALTER TABLE listings ADD COLUMN promo_starts_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN promo_ends_at   TIMESTAMPTZ;
