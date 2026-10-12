-- Dispute rooms: one conversation per disputed order, between the buyer, the seller and Salacope (author NULL).
-- It outlives the order chat (which can be ephemeral) because it is the record a decision rests on.
CREATE SEQUENCE dispute_number_seq START 1;

CREATE TABLE disputes (
  id          TEXT PRIMARY KEY,
  number      INTEGER NOT NULL UNIQUE,
  order_id    TEXT NOT NULL UNIQUE REFERENCES orders (id),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  -- Who the decision favoured once resolved.
  outcome     TEXT CHECK (outcome IN ('seller', 'buyer')),
  opened_by   TEXT REFERENCES users (id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ
);
CREATE INDEX disputes_status ON disputes (status, updated_at DESC);

CREATE TABLE dispute_messages (
  id          TEXT PRIMARY KEY,
  dispute_id  TEXT NOT NULL REFERENCES disputes (id),
  -- NULL = Salacope.
  author_id   TEXT REFERENCES users (id),
  body        TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]',
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX dispute_messages_dispute ON dispute_messages (dispute_id, at);

CREATE TABLE dispute_reads (
  dispute_id  TEXT NOT NULL REFERENCES disputes (id),
  user_id     TEXT NOT NULL REFERENCES users (id),
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dispute_id, user_id)
);

-- Disputes that already exist: one room each, with the reason the buyer gave as the first message.
INSERT INTO disputes (id, number, order_id, status, outcome, opened_by, created_at, updated_at, closed_at)
SELECT 'dsp_' || substr(md5(o.id), 1, 12), nextval('dispute_number_seq'), o.id,
       CASE WHEN o.status = 'disputed' THEN 'open' ELSE 'resolved' END,
       CASE WHEN o.status = 'completed' THEN 'seller' WHEN o.status = 'cancelled' THEN 'buyer' END,
       d.actor_id, d.at, o.updated_at, CASE WHEN o.status = 'disputed' THEN NULL ELSE o.updated_at END
FROM orders o
JOIN LATERAL (SELECT actor_id, at FROM order_events e WHERE e.order_id = o.id AND e.type = 'disputed' ORDER BY at LIMIT 1) d ON TRUE
ORDER BY d.at;

INSERT INTO dispute_messages (id, dispute_id, author_id, body, at)
SELECT 'dmg_' || substr(md5(x.id), 1, 12), x.id, o.buyer_id, COALESCE((SELECT note FROM order_events e WHERE e.order_id = o.id AND e.type = 'disputed' ORDER BY at LIMIT 1), 'Litige ouvert.'), x.created_at
FROM disputes x JOIN orders o ON o.id = x.order_id;
