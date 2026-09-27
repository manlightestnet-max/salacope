-- Salacope marketplace. Money never lives here: payments, escrow and balances are in LightPay;
-- this database only keeps LightPay references (checkout session, hold, connection).

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  firebase_uid  TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX users_email ON users (LOWER(email));

CREATE TABLE merchants (
  user_id                 TEXT PRIMARY KEY REFERENCES users (id),
  store_name              TEXT NOT NULL,
  headline                TEXT NOT NULL DEFAULT '',
  city                    TEXT NOT NULL DEFAULT '',
  payout_channel          TEXT NOT NULL DEFAULT 'MTN_MOMO_COG',
  payout_phone            TEXT NOT NULL DEFAULT '',
  verified                BOOLEAN NOT NULL DEFAULT FALSE,
  -- LightPay Connect: the seller's wallet receives the sales.
  lightpay_connection_id  TEXT,
  activated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE listings (
  id               TEXT PRIMARY KEY,
  seller_id        TEXT NOT NULL REFERENCES users (id),
  kind             TEXT NOT NULL CHECK (kind IN ('digital', 'service')),
  category         TEXT NOT NULL,
  title            TEXT NOT NULL,
  summary          TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  features         JSONB NOT NULL DEFAULT '[]',
  price_xaf        INTEGER NOT NULL CHECK (price_xaf > 0),
  cover_image      TEXT NOT NULL DEFAULT '',
  delivery_days    INTEGER,
  revisions        INTEGER,
  brief_questions  JSONB,
  file             JSONB,
  status           TEXT NOT NULL CHECK (status IN ('published', 'draft')),
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX listings_seller ON listings (seller_id);
CREATE INDEX listings_published ON listings (published_at DESC) WHERE status = 'published';

CREATE TABLE favorites (
  user_id     TEXT NOT NULL REFERENCES users (id),
  listing_id  TEXT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE follows (
  user_id       TEXT NOT NULL REFERENCES users (id),
  seller_id     TEXT NOT NULL REFERENCES users (id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, seller_id)
);
CREATE INDEX follows_seller ON follows (seller_id);

-- One try at paying (a LightPay checkout session). The order exists only once LightPay confirms.
CREATE TABLE payment_attempts (
  id                   TEXT PRIMARY KEY,
  code                 TEXT NOT NULL UNIQUE,
  buyer_id             TEXT NOT NULL REFERENCES users (id),
  listing_id           TEXT NOT NULL REFERENCES listings (id),
  seller_id            TEXT NOT NULL REFERENCES users (id),
  channel              TEXT,
  phone                TEXT,
  amount               INTEGER NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'expired', 'cancelled')),
  failure              TEXT,
  -- What the order is made of once paid (brief answers, invoice, buyer snapshot).
  details              JSONB NOT NULL DEFAULT '{}',
  lightpay_session_id  TEXT UNIQUE,
  order_id             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX payment_attempts_buyer ON payment_attempts (buyer_id, created_at DESC);

CREATE SEQUENCE order_number_seq START 10001;

CREATE TABLE orders (
  id                TEXT PRIMARY KEY,
  number            TEXT NOT NULL UNIQUE,
  listing_id        TEXT NOT NULL REFERENCES listings (id),
  item              JSONB NOT NULL,
  seller_id         TEXT NOT NULL REFERENCES users (id),
  buyer_id          TEXT NOT NULL REFERENCES users (id),
  buyer             JSONB NOT NULL,
  invoice           JSONB,
  payment           JSONB NOT NULL,
  brief             JSONB NOT NULL DEFAULT '[]',
  amounts           JSONB NOT NULL,
  coupon_code       TEXT,
  status            TEXT NOT NULL CHECK (status IN ('paid', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed')),
  due_at            TIMESTAMPTZ,
  release_at        TIMESTAMPTZ,
  delivery          JSONB,
  revisions_used    INTEGER NOT NULL DEFAULT 0,
  extension         JSONB,
  attempt_id        TEXT UNIQUE REFERENCES payment_attempts (id),
  lightpay_hold_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX orders_buyer ON orders (buyer_id, updated_at DESC);
CREATE INDEX orders_seller ON orders (seller_id, updated_at DESC);
CREATE INDEX orders_listing ON orders (listing_id);
CREATE INDEX orders_release_due ON orders (release_at) WHERE status = 'delivered';

CREATE TABLE order_events (
  id        TEXT PRIMARY KEY,
  order_id  TEXT NOT NULL REFERENCES orders (id),
  type      TEXT NOT NULL,
  actor_id  TEXT,
  note      TEXT,
  at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX order_events_order ON order_events (order_id, at);

CREATE TABLE order_messages (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders (id),
  author_id    TEXT NOT NULL REFERENCES users (id),
  body         TEXT NOT NULL DEFAULT '',
  attachments  JSONB NOT NULL DEFAULT '[]',
  at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX order_messages_order ON order_messages (order_id, at);

CREATE TABLE reviews (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL UNIQUE REFERENCES orders (id),
  listing_id  TEXT NOT NULL REFERENCES listings (id),
  seller_id   TEXT NOT NULL REFERENCES users (id),
  buyer_id    TEXT NOT NULL REFERENCES users (id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX reviews_seller ON reviews (seller_id, created_at DESC);

CREATE SEQUENCE ticket_number_seq START 1001;

CREATE TABLE tickets (
  id          TEXT PRIMARY KEY,
  number      TEXT NOT NULL UNIQUE,
  user_id     TEXT NOT NULL REFERENCES users (id),
  topic       TEXT NOT NULL CHECK (topic IN ('payment', 'order', 'account', 'other')),
  subject     TEXT NOT NULL,
  reference   TEXT,
  status      TEXT NOT NULL CHECK (status IN ('open', 'answered', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX tickets_user ON tickets (user_id, updated_at DESC);

CREATE TABLE ticket_messages (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES tickets (id),
  -- NULL = Salacope support.
  author_id  TEXT,
  body       TEXT NOT NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ticket_messages_ticket ON ticket_messages (ticket_id, at);

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id),
  title       TEXT NOT NULL,
  body        TEXT,
  href        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notifications_user ON notifications (user_id, created_at DESC);
