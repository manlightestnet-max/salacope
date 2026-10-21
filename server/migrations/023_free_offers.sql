-- Free offers: a price of 0 is allowed (the first schema required price_xaf > 0, which made saving a free offer fail with an
-- error 500). The minimum price and whether free offers are allowed are business rules, checked in the code from the
-- administration's settings.
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_price_xaf_check;
ALTER TABLE listings ADD CONSTRAINT listings_price_xaf_check CHECK (price_xaf >= 0);
