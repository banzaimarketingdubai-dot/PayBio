import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isRealSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseServiceKey);

// Real client initialization
export const supabase = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

export const supabaseAdmin = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null as any;

// --- In-memory Mock DB (fallback for local dev without Supabase) ---
interface DatabaseSchema {
  users: any[];
  products: any[];
  orders: any[];
}

let memoryDb: DatabaseSchema = { users: [], products: [], orders: [] };

function readMockDb(): DatabaseSchema {
  return memoryDb;
}

function writeMockDb(db: DatabaseSchema) {
  memoryDb = db;
}

// Unified db interface helpers
export const db = {
  isMock: !isRealSupabaseConfigured,

  // --- Users Operations ---
  async getUserByTelegramId(tgId: number) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('telegram_id', tgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      return mockDb.users.find(u => Number(u.telegram_id) === Number(tgId)) || null;
    }
  },

  async getUserById(id: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      return mockDb.users.find(u => u.id === id) || null;
    }
  },

  async upsertUser(tgId: number, username: string | null, paymentDetails?: any) {
    const existing = await this.getUserByTelegramId(tgId);
    const defaultPayment = paymentDetails || (existing ? existing.payment_details : { type: 'p2p', value: '1234-5678-9012-3456 (John Doe)' });
    const isPremium = existing ? existing.is_premium : false;
    const customization = existing ? existing.profile_customization : null;

    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .upsert({
          telegram_id: tgId,
          username,
          payment_details: defaultPayment,
          is_premium: isPremium,
          profile_customization: customization
        }, { onConflict: 'telegram_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      let user = mockDb.users.find(u => Number(u.telegram_id) === Number(tgId));
      if (user) {
        user.username = username || user.username;
        if (paymentDetails) user.payment_details = paymentDetails;
      } else {
        user = {
          id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          telegram_id: tgId,
          username,
          is_premium: isPremium,
          payment_details: defaultPayment,
          profile_customization: customization,
          created_at: new Date().toISOString()
        };
        mockDb.users.push(user);
      }
      writeMockDb(mockDb);
      return user;
    }
  },

  async updateUserPremium(userId: string, isPremium: boolean) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ is_premium: isPremium })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const user = mockDb.users.find(u => u.id === userId);
      if (user) {
        user.is_premium = isPremium;
        writeMockDb(mockDb);
      }
      return user;
    }
  },

  async updateUserProfile(userId: string, customization: any) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ profile_customization: customization })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const user = mockDb.users.find(u => u.id === userId);
      if (user) {
        user.profile_customization = customization;
        writeMockDb(mockDb);
      }
      return user;
    }
  },

  async updateUserPaymentDetails(userId: string, paymentDetails: any) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ payment_details: paymentDetails })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const user = mockDb.users.find(u => u.id === userId);
      if (user) {
        user.payment_details = paymentDetails;
        writeMockDb(mockDb);
      }
      return user;
    }
  },

  // --- Products Operations ---
  async getProductById(id: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*, creator:creator_id(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const product = mockDb.products.find(p => p.id === id);
      if (product) {
        const creator = mockDb.users.find(u => u.id === product.creator_id);
        return { ...product, creator };
      }
      return null;
    }
  },

  async getProductsByCreatorId(creatorId: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('creator_id', creatorId);
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      return mockDb.products.filter(p => p.creator_id === creatorId);
    }
  },

  async getAllProducts() {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*');
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      return mockDb.products;
    }
  },

  async createProduct(creatorId: string, title: string, description: string, priceFiat: number, priceStars: number, contentUrl: string, coverUrl?: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .insert({
          creator_id: creatorId,
          title,
          description,
          price_fiat: priceFiat,
          price_stars: priceStars,
          content_url: contentUrl,
          cover_url: coverUrl || null
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const newProduct = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        creator_id: creatorId,
        title,
        description,
        price_fiat: priceFiat,
        price_stars: priceStars,
        content_url: contentUrl,
        cover_url: coverUrl || null,
        created_at: new Date().toISOString()
      };
      mockDb.products.push(newProduct);
      writeMockDb(mockDb);
      return newProduct;
    }
  },

  // --- Orders Operations ---
  async getOrderById(id: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*, product:product_id(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const order = mockDb.orders.find(o => o.id === id);
      if (order) {
        const product = mockDb.products.find(p => p.id === order.product_id);
        return { ...order, product };
      }
      return null;
    }
  },

  async createOrder(productId: string, buyerTgId: number, paymentMethod: string, receiptUrl?: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .insert({
          product_id: productId,
          buyer_tg_id: buyerTgId,
          payment_method: paymentMethod,
          receipt_url: receiptUrl || null,
          status: 'pending',
          fraud_score: 0
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const newOrder = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        product_id: productId,
        buyer_tg_id: buyerTgId,
        payment_method: paymentMethod,
        receipt_url: receiptUrl || null,
        status: 'pending',
        fraud_score: 0,
        created_at: new Date().toISOString()
      };
      mockDb.orders.push(newOrder);
      writeMockDb(mockDb);
      return newOrder;
    }
  },

  async updateOrderStatus(id: string, status: string, fraudScore?: number) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({
          status,
          ...(fraudScore !== undefined ? { fraud_score: fraudScore } : {})
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const order = mockDb.orders.find(o => o.id === id);
      if (order) {
        order.status = status;
        if (fraudScore !== undefined) order.fraud_score = fraudScore;
        writeMockDb(mockDb);
      }
      return order;
    }
  }
};
