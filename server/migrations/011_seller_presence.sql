-- "En ligne": the last time a seller's app talked to the server (refreshed at most once a minute).
ALTER TABLE merchants ADD COLUMN last_seen_at TIMESTAMPTZ;
