-- Add premium_until column to users table
ALTER TABLE users ADD COLUMN premium_until TIMESTAMP WITH TIME ZONE;

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default promocode
INSERT INTO promo_codes (code, duration_days, max_uses)
VALUES ('PAYBIO_FREE_30', 30, 1000)
ON CONFLICT (code) DO NOTHING;
