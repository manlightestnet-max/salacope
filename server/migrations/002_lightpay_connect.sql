-- A seller connecting their LightPay wallet (OAuth code + PKCE): pending requests, one use each.
CREATE TABLE lightpay_connect_requests (
  state          TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users (id),
  code_verifier  TEXT NOT NULL,
  redirect_uri   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Last time a pending payment was checked with LightPay (sync throttling).
ALTER TABLE payment_attempts ADD COLUMN checkout_url TEXT;
ALTER TABLE payment_attempts ADD COLUMN checked_at TIMESTAMPTZ;
