-- Messaging: receipts (received / read), ephemeral chats, buyer blocks, payment-request cards,
-- and the seller's own organisation of their sales (tags, pinned).

ALTER TABLE orders
  -- Bumped by chat-only changes (receipts, settings) so the other party's sync picks them up.
  ADD COLUMN chat_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN buyer_seen_at     TIMESTAMPTZ,
  ADD COLUMN seller_seen_at    TIMESTAMPTZ,
  ADD COLUMN buyer_read_at     TIMESTAMPTZ,
  ADD COLUMN seller_read_at    TIMESTAMPTZ,
  ADD COLUMN ephemeral         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN seller_tags       TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN seller_pinned_at  TIMESTAMPTZ;
CREATE INDEX orders_chat_at ON orders (chat_at);

ALTER TABLE order_messages
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'payment_request')),
  ADD COLUMN data JSONB;

-- A buyer stops a seller from writing to them.
CREATE TABLE user_blocks (
  blocker_id  TEXT NOT NULL REFERENCES users (id),
  blocked_id  TEXT NOT NULL REFERENCES users (id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);
