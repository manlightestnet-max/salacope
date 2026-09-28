-- Buyers without an account: a guest profile, held by a secret key kept in their browser
-- (only its hash is stored here). Creating an account later takes over the guest's purchases.
ALTER TABLE users ALTER COLUMN firebase_uid DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN guest_key_hash TEXT UNIQUE;
ALTER TABLE users ADD CONSTRAINT users_account_or_guest
  CHECK ((firebase_uid IS NOT NULL AND email IS NOT NULL) OR guest_key_hash IS NOT NULL);
