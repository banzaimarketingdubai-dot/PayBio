\# SOURCE OF TRUTH - DOC 2: DATABASE ARCHITECTURE (SUPABASE)



\-- TABLE 1: users (Creators)

CREATE TABLE users (

&#x20; id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

&#x20; telegram\_id BIGINT UNIQUE NOT NULL,

&#x20; username TEXT, -- Used for generating Paybio storefront URL

&#x20; is\_premium BOOLEAN DEFAULT FALSE,

&#x20; payment\_details JSONB, -- Stores { type: 'ton'|'p2p', value: 'wallet\_address\_or\_card\_details' }

&#x20; created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



\-- TABLE 2: products

CREATE TABLE products (

&#x20; id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

&#x20; creator\_id UUID REFERENCES users(id) ON DELETE CASCADE,

&#x20; title TEXT NOT NULL,

&#x20; description TEXT,

&#x20; price\_fiat NUMERIC,

&#x20; price\_stars INTEGER,

&#x20; content\_url TEXT NOT NULL, -- Link to digital asset or private channel invite

&#x20; created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



\-- TABLE 3: orders

CREATE TABLE orders (

&#x20; id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

&#x20; product\_id UUID REFERENCES products(id),

&#x20; buyer\_tg\_id BIGINT NOT NULL,

&#x20; status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'manual\_review', 'rejected'

&#x20; payment\_method TEXT, -- 'stars', 'crypto', 'p2p'

&#x20; receipt\_url TEXT, -- For P2P screenshots

&#x20; fraud\_score NUMERIC DEFAULT 0,

&#x20; created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);



\-- ROW LEVEL SECURITY (RLS) INSTRUCTIONS:

\-- Agents must enforce strict RLS policies. `products` and `orders` can only be mutated by the authenticated `creator\_id` (using auth.uid()) or via secure server-side API routes.

