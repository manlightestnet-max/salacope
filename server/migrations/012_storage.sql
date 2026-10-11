-- Settings kept in the database. Secrets (storage keys…) are encrypted with SALACOPE_SETTINGS_KEY before they are stored.
CREATE TABLE app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every file kept in object storage (Cloudflare R2): whose quota it counts in, what it is for, where it sits.
--   purpose: image (public pictures) | product (the file a buyer receives) | chat (attachments of conversations and deliveries) | kyc
CREATE TABLE stored_files (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL,
  bucket     TEXT NOT NULL,
  object_key TEXT NOT NULL,
  name       TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       BIGINT NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
  ref        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX stored_files_owner ON stored_files (owner_id, status);

-- Identity documents may live in storage instead of the database.
ALTER TABLE kyc_documents ADD COLUMN file_id TEXT;
ALTER TABLE kyc_documents ALTER COLUMN data DROP NOT NULL;
