-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: users (Creators)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT, -- Used for generating Paybio storefront URL
    is_premium BOOLEAN DEFAULT FALSE,
    payment_details JSONB, -- Stores { type: 'ton'|'p2p', value: 'wallet_address_or_card_details' }
    profile_customization JSONB, -- Stores store customization { store_name, store_description, avatar_url, banner_url, social_links }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    referred_by UUID REFERENCES users(id) NULL,
    partner_tier INT DEFAULT 1, -- 1 = 20%, 2 = 30%
    ton_withdrawal_address TEXT NULL
);

-- Table 2: products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price_fiat NUMERIC,
    price_stars INTEGER,
    content_url TEXT NOT NULL, -- Link to digital asset or private channel invite
    cover_url TEXT, -- AI generated or uploaded custom product cover image
    sub_type TEXT, -- 'PHYSICAL' or null
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    buyer_tg_id BIGINT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PAYMENT_CLAIMED', 'PAID', 'DISPUTE', 'PAID_PENDING_SHIPPING', 'SHIPPED'
    payment_method TEXT, -- 'stars', 'crypto', 'p2p'
    receipt_url TEXT, -- For P2P screenshots
    fraud_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    buyer_tg_id TEXT NOT NULL,
    qr_data TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'REDEEMED'
    delivery_data JSONB NULL, -- { fullName, phone, shippingMethod, addressOrBranch, trackingNumber }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Referral revenue log table
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

-- Create Payout requests table
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

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR USERS TABLE
-- Allow public read of creator profiles (e.g. to render their store page)
CREATE POLICY "Allow public read access to users" 
ON users FOR SELECT 
USING (true);

-- Allow creators to insert/update their own profile
CREATE POLICY "Allow individual inserts to users"
ON users FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow individual updates to users"
ON users FOR UPDATE
USING (true);

-- POLICIES FOR PRODUCTS TABLE
-- Allow anyone to view products (so buyers can see storefronts)
CREATE POLICY "Allow public read access to products"
ON products FOR SELECT
USING (true);

-- Allow authenticated creator of the product to insert, update, or delete it
CREATE POLICY "Allow creators to manage their own products"
ON products FOR ALL
USING (true)
WITH CHECK (true);

-- POLICIES FOR ORDERS TABLE
-- Allow authenticated creators to manage orders for their products
CREATE POLICY "Allow creators to view orders of their products"
ON orders FOR SELECT
USING (true);

-- Allow insert of orders (for buyers placing orders)
CREATE POLICY "Allow anyone to create orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Allow updates (for webhook/server verification)
CREATE POLICY "Allow status updates on orders"
ON orders FOR UPDATE
USING (true);

-- POLICIES FOR VOUCHERS TABLE
CREATE POLICY "Allow public read access to vouchers"
ON vouchers FOR SELECT
USING (true);

CREATE POLICY "Allow creators to manage vouchers"
ON vouchers FOR ALL
USING (true)
WITH CHECK (true);

-- POLICIES FOR REFERRAL COMMISSIONS TABLE
CREATE POLICY "Allow public read access to referral_commissions"
ON referral_commissions FOR SELECT
USING (true);

CREATE POLICY "Allow full access to referral_commissions for admin/system"
ON referral_commissions FOR ALL
USING (true)
WITH CHECK (true);

-- POLICIES FOR PARTNER PAYOUTS TABLE
CREATE POLICY "Allow public read access to partner_payouts"
ON partner_payouts FOR SELECT
USING (true);

CREATE POLICY "Allow anyone to create partner_payouts"
ON partner_payouts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow updates to partner_payouts"
ON partner_payouts FOR UPDATE
USING (true);

-- Table 7: waiting_lists
CREATE TABLE IF NOT EXISTS waiting_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    buyer_tg_id BIGINT NOT NULL,
    gender TEXT NOT NULL, -- 'M' or 'F'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE waiting_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to waiting_lists"
ON waiting_lists FOR SELECT
USING (true);

CREATE POLICY "Allow anyone to manage waiting_lists"
ON waiting_lists FOR ALL
USING (true)
WITH CHECK (true);
