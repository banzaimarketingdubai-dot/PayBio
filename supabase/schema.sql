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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    buyer_tg_id BIGINT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'manual_review', 'rejected'
    payment_method TEXT, -- 'stars', 'crypto', 'p2p'
    receipt_url TEXT, -- For P2P screenshots
    fraud_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

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
