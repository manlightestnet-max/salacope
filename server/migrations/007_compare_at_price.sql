-- Promotion: the former price, shown struck through next to the current one (NULL = no promotion).
ALTER TABLE listings ADD COLUMN compare_at_xaf INTEGER;
