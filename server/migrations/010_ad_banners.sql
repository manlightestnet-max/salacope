-- Advertising slots of the storefront banner: three positions, chosen by an administrator (image, caption, link).
CREATE TABLE ad_banners (
  position   SMALLINT PRIMARY KEY CHECK (position BETWEEN 1 AND 3),
  image      TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  link       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
