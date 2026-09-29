-- Compliance (AML/CFT policy): sellers are identified (KYC) before they can sell, accounts can be
-- blocked, stores suspended, and every administrator action is logged.

ALTER TABLE users
  ADD COLUMN blocked_at      TIMESTAMPTZ,
  ADD COLUMN blocked_reason  TEXT;

ALTER TABLE merchants
  ADD COLUMN kyc_status        TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected')),
  ADD COLUMN kyc_note          TEXT,
  ADD COLUMN risk              TEXT NOT NULL DEFAULT 'low' CHECK (risk IN ('low', 'medium', 'high')),
  ADD COLUMN suspended_at      TIMESTAMPTZ,
  ADD COLUMN suspended_reason  TEXT;

-- What the seller declared, as submitted (kept even after a later submission).
CREATE TABLE kyc_submissions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id),
  full_name    TEXT NOT NULL,
  birth_date   DATE NOT NULL,
  nationality  TEXT NOT NULL,
  id_type      TEXT NOT NULL CHECK (id_type IN ('national_id', 'passport')),
  id_number    TEXT NOT NULL,
  id_expires   DATE,
  address      TEXT NOT NULL,
  pep          BOOLEAN NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note         TEXT,
  reviewed_by  TEXT,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX kyc_submissions_user ON kyc_submissions (user_id, created_at DESC);
CREATE INDEX kyc_submissions_pending ON kyc_submissions (created_at) WHERE status = 'pending';

-- Identity document (both sides) and selfie holding it. Readable by administrators only.
CREATE TABLE kyc_documents (
  submission_id  TEXT NOT NULL REFERENCES kyc_submissions (id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('front', 'back', 'selfie')),
  mime           TEXT NOT NULL,
  data           BYTEA NOT NULL,
  PRIMARY KEY (submission_id, kind)
);

-- Append-only: who did what, to whom, when and why.
CREATE TABLE admin_audit (
  id              TEXT PRIMARY KEY,
  admin_email     TEXT NOT NULL,
  action          TEXT NOT NULL,
  target_user_id  TEXT REFERENCES users (id),
  detail          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX admin_audit_at ON admin_audit (created_at DESC);
CREATE INDEX admin_audit_target ON admin_audit (target_user_id, created_at DESC);
