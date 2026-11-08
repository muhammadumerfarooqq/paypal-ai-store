ALTER TABLE listings ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE listings ALTER COLUMN price_cents DROP NOT NULL;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_price_cents_check;
ALTER TABLE listings ADD CONSTRAINT listings_price_cents_check
  CHECK (price_cents IS NULL OR price_cents > 0);
