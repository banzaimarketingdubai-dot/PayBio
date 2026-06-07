-- ALTER USERS TABLE TO SUPPORT REFERRAL TRACKING
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_tier INT DEFAULT 1; -- 1 = 20%, 2 = 30%
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_withdrawal_address TEXT NULL;

-- CREATE REFERRAL REVENUE LOG table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_status') THEN
        CREATE TYPE commission_status AS ENUM ('earned', 'pending_payout', 'paid');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    amount_usd NUMERIC(10, 2) NOT NULL,
    commission_percentage INT NOT NULL, -- 20 or 30
    commission_earned_usd NUMERIC(10, 2) NOT NULL,
    status commission_status DEFAULT 'earned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- CREATE WITHDRAWAL REQUESTS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
        CREATE TYPE payout_status AS ENUM ('requested', 'approved', 'rejected', 'completed');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS partner_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_usd NUMERIC(10, 2) NOT NULL,
    ton_address TEXT NOT NULL,
    status payout_status DEFAULT 'requested',
    tx_hash TEXT NULL, -- On-chain hash after manual admin payout
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_ref_comm_partner ON referral_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts ON partner_payouts(partner_id);

-- Enable RLS for new tables
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow public read access to referral_commissions"
ON referral_commissions FOR SELECT
USING (true);

CREATE POLICY "Allow full access to referral_commissions for admin/system"
ON referral_commissions FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public read access to partner_payouts"
ON partner_payouts FOR SELECT
USING (true);

CREATE POLICY "Allow anyone to create partner_payouts"
ON partner_payouts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow updates to partner_payouts"
ON partner_payouts FOR UPDATE
USING (true);
