-- Push notifications (Firebase Cloud Messaging): the phones where the Salacope app is signed in (or a guest's phone).
CREATE TABLE IF NOT EXISTS push_devices (
  token        TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  platform     TEXT NOT NULL DEFAULT 'android',
  label        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_devices_user ON push_devices (user_id);

-- Each notification says whether it goes to the phones (set by its message template), and when it was pushed (once).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event TEXT;
CREATE INDEX IF NOT EXISTS notifications_unpushed ON notifications (created_at) WHERE push AND pushed_at IS NULL;
