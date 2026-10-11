-- Forced sign-out: ID tokens whose sign-in (auth_time) is older than this moment are refused by the API.
-- The same exists for everybody at once (app_settings key "sessions").
ALTER TABLE users ADD COLUMN sessions_valid_after TIMESTAMPTZ;
