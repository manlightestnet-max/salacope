-- A guest leaves an e-mail at checkout: the download link and Salacope's messages (dispute, decision) reach them there.
-- Never shown to the seller.
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Notifications already sent by e-mail (guests only): each one is sent once.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS mailed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS notifications_unmailed ON notifications (created_at) WHERE mailed_at IS NULL;

-- A private store never shows in the catalogue, the Explorer or the search: only its own link opens it.
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS private_store BOOLEAN NOT NULL DEFAULT FALSE;
