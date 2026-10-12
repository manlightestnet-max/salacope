-- Disputes opened by the administration about an account's conduct (e.g. copying other people's content), not tied to an order.
--   kind 'order'    : buyer, seller and Salacope, about a disputed order (money held).
--   kind 'conduct'  : Salacope and the account concerned (subject_id), optionally about one offer.
ALTER TABLE disputes ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE disputes
  ADD COLUMN kind       TEXT NOT NULL DEFAULT 'order' CHECK (kind IN ('order', 'conduct')),
  ADD COLUMN subject_id TEXT REFERENCES users (id),
  ADD COLUMN listing_id TEXT REFERENCES listings (id) ON DELETE SET NULL,
  ADD COLUMN title      TEXT;
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_outcome_check;
ALTER TABLE disputes ADD CONSTRAINT disputes_outcome_check CHECK (outcome IN ('seller', 'buyer', 'warning', 'cleared'));
CREATE INDEX disputes_subject ON disputes (subject_id) WHERE subject_id IS NOT NULL;

-- Formal warnings given to an account.
CREATE TABLE account_warnings (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id),
  dispute_id  TEXT REFERENCES disputes (id),
  reason      TEXT NOT NULL,
  given_by    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX account_warnings_user ON account_warnings (user_id, created_at DESC);
