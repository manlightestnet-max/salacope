-- Each time a buyer (or the seller) opens the file of a digital order: evidence when a dispute has to be decided.
CREATE TABLE order_downloads (
  id        BIGSERIAL PRIMARY KEY,
  order_id  TEXT NOT NULL REFERENCES orders (id),
  user_id   TEXT NOT NULL REFERENCES users (id),
  at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX order_downloads_order ON order_downloads (order_id, at);
