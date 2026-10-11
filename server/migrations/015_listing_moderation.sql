-- An offer hidden by the administration (prohibited content, rights, fraud). While hidden_at is set it stays off the catalogue
-- and its seller cannot publish it again; restoring it clears both columns (the seller then publishes it themselves).
ALTER TABLE listings ADD COLUMN hidden_at TIMESTAMPTZ, ADD COLUMN hidden_reason TEXT;
