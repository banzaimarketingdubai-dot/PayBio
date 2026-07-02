import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  is_premium: boolean;
  premium_until?: string | null;
  /** How the user got premium: 'trial' = 1-day free trial, 'paid' = real payment, 'promo' = promo code */
  premium_source?: 'trial' | 'paid' | 'promo' | null;
  payment_details?: any;
  profile_customization?: any;
  created_at: string;
  referred_by?: string | null;
  partner_tier?: number;
  ton_withdrawal_address?: string | null;
}

/**
 * Returns true only if the user has PAID or PROMO premium (not a 1-day trial).
 * Use this to gate AI-powered features like Reve image generation.
 */
export function canUseAI(user: User | null | undefined): boolean {
  if (!user) return false;
  if (!user.is_premium) return false;
  // Must be paid or promo — trial is blocked
  if (user.premium_source === 'trial') return false;
  // Lifetime premium (premium_until === null) is always allowed
  if (user.premium_until === null && user.is_premium) return true;
  // Check expiry
  if (user.premium_until && new Date(user.premium_until).getTime() < Date.now()) return false;
  return user.premium_source === 'paid' || user.premium_source === 'promo';
}

export interface ReferralCommission {
  id: string;
  partner_id: string;
  referred_user_id: string | null;
  order_id: string;
  amount_usd: number;
  commission_percentage: number;
  commission_earned_usd: number;
  status: 'earned' | 'pending_payout' | 'paid';
  created_at: string;
}

export interface PartnerPayout {
  id: string;
  partner_id: string;
  amount_usd: number;
  ton_address: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
  tx_hash: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  price_fiat: number;
  price_stars: number;
  content_url: string;
  cover_url: string | null;
  banner_url?: string | null;
  product_type: string;
  sub_type?: string | null;
  created_at: string;
  creator?: User;
}

export interface Order {
  id: string;
  product_id: string | null;
  buyer_tg_id: number;
  status: string;
  payment_method: string;
  receipt_url: string | null;
  fraud_score: number;
  created_at: string;
  product?: Product & { creator?: User };
}

export interface Voucher {
  id: string;
  order_id: string;
  buyer_tg_id: string;
  qr_data: string;
  status: string;
  delivery_data?: {
    fullName: string;
    phone: string;
    shippingMethod: string;
    addressOrBranch: string;
    trackingNumber?: string;
  } | null;
  created_at: string;
  order?: Order;
}

export interface Booking {
  id: string;
  product_id: string;
  order_id: string | null;
  slot_start_time: string;
  slot_end_time: string;
  meeting_link: string | null;
  status: string;
  created_at: string;
}

export interface Review {
  id: string;
  creator_id: string;
  product_id: string | null;
  buyer_tg_id: number;
  buyer_name: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  duration_days: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface WaitingList {
  id: string;
  product_id: string;
  buyer_tg_id: number;
  gender: string;
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  products: Product[];
  orders: Order[];
  vouchers?: Voucher[];
  bookings?: Booking[];
  reviews?: Review[];
  promo_codes?: PromoCode[];
  referral_commissions?: ReferralCommission[];
  partner_payouts?: PartnerPayout[];
  waiting_lists?: WaitingList[];
}

const MOCK_DB_PATH = path.join(process.cwd(), 'mock_db.json');

function readMockDb(): DatabaseSchema {
  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      const fileContent = fs.readFileSync(MOCK_DB_PATH, 'utf-8');
      const parsed = JSON.parse(fileContent);
      
      // Initialize lists if missing
      if (!parsed.users) parsed.users = [];
      if (!parsed.products) parsed.products = [];
      if (!parsed.orders) parsed.orders = [];
      if (!parsed.vouchers) parsed.vouchers = [];
      if (!parsed.bookings) parsed.bookings = [];
      if (!parsed.reviews) parsed.reviews = [];
      if (!parsed.referral_commissions) parsed.referral_commissions = [];
      if (!parsed.partner_payouts) parsed.partner_payouts = [];
      if (!parsed.promo_codes) {
        parsed.promo_codes = [
          {
            id: 'mock-promo-1',
            code: 'PAYBIO_FREE_30',
            duration_days: 30,
            max_uses: 1000,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-promo-lifetime',
            code: 'PAYBIO_LIFETIME_2025',
            duration_days: -1,
            max_uses: 1,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
        try {
          fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {}
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading mock_db.json:', err);
  }
  
  const defaultDb: DatabaseSchema = { 
    users: [], 
    products: [], 
    orders: [], 
    vouchers: [], 
    bookings: [], 
    reviews: [],
    promo_codes: [
      {
        id: 'mock-promo-1',
        code: 'PAYBIO_FREE_30',
        duration_days: 30,
        max_uses: 1000,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-promo-lifetime',
        code: 'PAYBIO_LIFETIME_2025',
        duration_days: -1,
        max_uses: 1,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    referral_commissions: [],
    partner_payouts: []
  };
  
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing default mock_db.json:', err);
  }
  return defaultDb;
}

function writeMockDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to mock_db.json:', err);
  }
}

// Unified db interface helpers
export const db = {
  isMock: !isRealSupabaseConfigured,

  // --- Users Operations ---
  async getUserByTelegramId(tgId: number) {
    let user;
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('telegram_id', tgId)
        .maybeSingle();
      if (error) throw error;
      user = data;
    } else {
      const mockDb = readMockDb();
      user = mockDb.users.find(u => Number(u.telegram_id) === Number(tgId)) || null;
    }

    if (user && user.is_premium && user.premium_until) {
      const expired = new Date(user.premium_until).getTime() < Date.now();
      if (expired) {
        user.is_premium = false;
        user.premium_until = null;
        await this.updateUserPremium(user.id, false, null);
      }
    }
    return user;
  },

  async getUserById(id: string) {
    let user;
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      user = data;
    } else {
      const mockDb = readMockDb();
      user = mockDb.users.find(u => u.id === id) || null;
    }

    if (user && user.is_premium && user.premium_until) {
      const expired = new Date(user.premium_until).getTime() < Date.now();
      if (expired) {
        user.is_premium = false;
        user.premium_until = null;
        await this.updateUserPremium(user.id, false, null);
      }
    }
    return user;
  },

  async upsertUser(tgId: number, username: string | null, paymentDetails?: any) {
    const existing = await this.getUserByTelegramId(tgId);
    const defaultPayment = paymentDetails || (existing ? existing.payment_details : { type: 'p2p', value: '1234-5678-9012-3456 (John Doe)' });
    const isPremium = existing ? existing.is_premium : true;
    const premiumUntil = existing 
      ? existing.premium_until 
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    // New users get 'trial'; existing users keep their source
    const premiumSource: 'trial' | 'paid' | 'promo' | null = existing
      ? (existing.premium_source ?? 'trial')
      : 'trial';
    const customization = existing ? existing.profile_customization : null;

    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .upsert({
          telegram_id: tgId,
          username,
          payment_details: defaultPayment,
          is_premium: isPremium,
          premium_until: premiumUntil,
          premium_source: premiumSource,
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
          premium_until: premiumUntil,
          premium_source: premiumSource,
          payment_details: defaultPayment,
          profile_customization: customization,
          created_at: new Date().toISOString(),
          referred_by: null,
          partner_tier: 1,
          ton_withdrawal_address: null
        };
        mockDb.users.push(user);
      }
      writeMockDb(mockDb);
      return user;
    }
  },

  async updateUserPremium(userId: string, isPremium: boolean, premiumUntil?: string | null, premiumSource?: 'trial' | 'paid' | 'promo' | null) {
    const updatePayload: any = { is_premium: isPremium };
    if (premiumUntil !== undefined) {
      updatePayload.premium_until = premiumUntil;
    }
    if (premiumSource !== undefined) {
      updatePayload.premium_source = isPremium ? premiumSource : null;
    }
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
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
        if (premiumUntil !== undefined) user.premium_until = premiumUntil;
        if (premiumSource !== undefined) user.premium_source = isPremium ? premiumSource : null;
        writeMockDb(mockDb);
      }
      return user;
    }
  },

  async activatePremium(userId: string, durationDays: number, source: 'paid' | 'promo' = 'promo') {
    const user = await this.getUserById(userId);
    if (!user) return null;

    // -1 = lifetime premium (no expiry date)
    if (durationDays === -1) {
      return await this.updateUserPremium(userId, true, null, source);
    }

    let currentPremiumUntil = user.premium_until ? new Date(user.premium_until) : new Date();
    // If user is not currently premium or has expired premium, start from now
    if (!user.is_premium || currentPremiumUntil.getTime() < Date.now()) {
      currentPremiumUntil = new Date();
    }
    
    // Add durationDays
    currentPremiumUntil.setDate(currentPremiumUntil.getDate() + durationDays);
    const newPremiumUntilStr = currentPremiumUntil.toISOString();
    
    return await this.updateUserPremium(userId, true, newPremiumUntilStr, source);
  },

  async verifyAndApplyPromoCode(userId: string, code: string) {
    const codeUpper = code.trim().toUpperCase();
    
    // Custom Promo Codes
    if (codeUpper === 'PAYBIO_7' || codeUpper === 'PREMIUM_7') {
      await this.activatePremium(userId, 7);
      return { success: true, duration_days: 7 };
    }
    
    if (codeUpper === 'DEACTIVATE' || codeUpper === 'PAYBIO_DEACTIVATE') {
      await this.updateUserPremium(userId, false, null);
      return { success: true, duration_days: 0, deactivated: true };
    }
    
    if (isRealSupabaseConfigured) {
      // 1. Fetch promo code
      const { data: promo, error: fetchErr } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', codeUpper)
        .maybeSingle();
        
      if (fetchErr) throw fetchErr;
      if (!promo) {
        throw new Error('Промокод не найден');
      }
      if (!promo.is_active) {
        throw new Error('Промокод не активен');
      }
      if (promo.used_count >= promo.max_uses) {
        throw new Error('Промокод полностью использован');
      }
      
      // 2. Increment used_count
      const { data: updatedPromo, error: updateErr } = await supabaseAdmin
        .from('promo_codes')
        .update({ used_count: promo.used_count + 1 })
        .eq('id', promo.id)
        .select()
        .single();
        
      if (updateErr) throw updateErr;
      
      // 3. Activate Premium
      await this.activatePremium(userId, promo.duration_days);
      return { success: true, duration_days: promo.duration_days };
    } else {
      // Local Mock fallback
      const mockDb = readMockDb();
      if (!mockDb.promo_codes) {
        mockDb.promo_codes = [
          {
            id: 'mock-promo-1',
            code: 'PAYBIO_FREE_30',
            duration_days: 30,
            max_uses: 1000,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-promo-lifetime',
            code: 'PAYBIO_LIFETIME_2025',
            duration_days: -1,
            max_uses: 1,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
      }
      
      const promo = mockDb.promo_codes.find(p => p.code.toUpperCase() === codeUpper);
      if (!promo) {
        throw new Error('Промокод не найден');
      }
      if (!promo.is_active) {
        throw new Error('Промокод не активен');
      }
      if (promo.used_count >= promo.max_uses) {
        throw new Error('Промокод полностью использован');
      }
      
      // Increment used_count
      promo.used_count += 1;
      writeMockDb(mockDb);
      
      await this.activatePremium(userId, promo.duration_days);
      return { success: true, duration_days: promo.duration_days };
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

  async createProduct(creatorId: string, title: string, description: string, priceFiat: number, priceStars: number, contentUrl: string, coverUrl?: string, productType = 'DIGITAL', subType: string | null = null) {
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
          cover_url: coverUrl || null,
          product_type: productType,
          sub_type: subType
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
        banner_url: null,
        product_type: productType,
        sub_type: subType,
        created_at: new Date().toISOString()
      };
      mockDb.products.push(newProduct);
      writeMockDb(mockDb);
      return newProduct;
    }
  },

  async deleteProduct(id: string) {
    if (isRealSupabaseConfigured) {
      const { error } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const mockDb = readMockDb();
      mockDb.products = mockDb.products.filter(p => p.id !== id);
      writeMockDb(mockDb);
      return true;
    }
  },

  async updateProduct(id: string, title: string, description: string, priceFiat: number, priceStars: number, contentUrl: string, coverUrl?: string, productType = 'DIGITAL', subType: string | null = null) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({
          title,
          description,
          price_fiat: priceFiat,
          price_stars: priceStars,
          content_url: contentUrl,
          cover_url: coverUrl || null,
          product_type: productType,
          sub_type: subType
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const product = mockDb.products.find(p => p.id === id);
      if (product) {
        product.title = title;
        product.description = description;
        product.price_fiat = priceFiat;
        product.price_stars = priceStars;
        product.content_url = contentUrl;
        product.cover_url = coverUrl || null;
        product.product_type = productType;
        product.sub_type = subType;
      }
      writeMockDb(mockDb);
      return product;
    }
  },

  async updateProductBanner(id: string, bannerUrl: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({ banner_url: bannerUrl })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const product = mockDb.products.find(p => p.id === id);
      if (product) {
        product.banner_url = bannerUrl;
        writeMockDb(mockDb);
      }
      return product;
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

  async createOrder(productId: string | null, buyerTgId: number, paymentMethod: string, receiptUrl?: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .insert({
          product_id: productId,
          buyer_tg_id: buyerTgId,
          payment_method: paymentMethod,
          receipt_url: receiptUrl || null,
          status: 'PENDING',
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
        status: 'PENDING',
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
  },

  async getLatestPendingOrderByBuyer(buyerTgId: number) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*, product:product_id(*)')
        .eq('buyer_tg_id', buyerTgId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      
      if (data && data.product) {
        const creator = await this.getUserById(data.product.creator_id);
        data.product.creator = creator;
      }
      return data;
    } else {
      const mockDb = readMockDb();
      const pending = mockDb.orders
        .filter(o => Number(o.buyer_tg_id) === Number(buyerTgId) && o.status === 'PENDING')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (pending.length > 0) {
        const order = pending[0];
        const product = mockDb.products.find(p => p.id === order.product_id);
        let creator = null;
        if (product) {
          creator = mockDb.users.find(u => u.id === product.creator_id);
        }
        return { ...order, product: product ? { ...product, creator } : null };
      }
      return null;
    }
  },

  async updateOrderReceiptAndStatus(orderId: string, receiptUrl: string, status: string) {
    const existing = await this.getOrderById(orderId);
    let finalReceiptUrl = receiptUrl;
    if (existing && existing.receipt_url) {
      try {
        const parsed = JSON.parse(existing.receipt_url);
        if (parsed && parsed.gender) {
          finalReceiptUrl = JSON.stringify({
            gender: parsed.gender,
            screenshot_url: receiptUrl
          });
        }
      } catch {
        if (existing.receipt_url === 'M' || existing.receipt_url === 'F') {
          finalReceiptUrl = JSON.stringify({
            gender: existing.receipt_url,
            screenshot_url: receiptUrl
          });
        }
      }
    }

    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({ receipt_url: finalReceiptUrl, status: status })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const order = mockDb.orders.find(o => o.id === orderId);
      if (order) {
        order.receipt_url = finalReceiptUrl;
        order.status = status;
        writeMockDb(mockDb);
      }
      return order;
    }
  },

  async getApprovedOrderCount(productId: string) {
    if (isRealSupabaseConfigured) {
      const { count, error } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId)
        .in('status', ['approved', 'PAID']);
      if (error) throw error;
      return count || 0;
    } else {
      const mockDb = readMockDb();
      return mockDb.orders.filter(o => o.product_id === productId && (o.status === 'approved' || o.status === 'PAID')).length;
    }
  },

  async getAllUsers() {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      return mockDb.users;
    }
  },

  async getPendingOrdersByCreatorId(creatorId: string) {
    if (isRealSupabaseConfigured) {
      // Perform inner join to filter orders of creator's products
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*, product:product_id!inner(*)')
        .eq('status', 'PENDING')
        .eq('product.creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const creatorProducts = mockDb.products.filter(p => p.creator_id === creatorId);
      const productIds = creatorProducts.map(p => p.id);
      return mockDb.orders
        .filter(o => o.status === 'PENDING' && o.product_id && productIds.includes(o.product_id))
        .map(o => {
          const product = creatorProducts.find(p => p.id === o.product_id);
          return { ...o, product };
        });
    }
  },

  async getOrdersByCreatorId(creatorId: string) {
    if (isRealSupabaseConfigured) {
      // Fetch creator's products
      const { data: products, error: prodError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('creator_id', creatorId);
      if (prodError) throw prodError;
      const productIds = (products || []).map((p: any) => p.id);

      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*, product:product_id(*)')
        .in('product_id', productIds)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch vouchers
      const { data: vouchers, error: vError } = await supabaseAdmin
        .from('vouchers')
        .select('*')
        .in('order_id', (data || []).map((o: any) => o.id));
      
      const ordersWithVouchers = (data || []).map((o: any) => {
        const voucher = (vouchers || []).find((v: any) => v.order_id === o.id);
        return { ...o, voucher };
      });
      return ordersWithVouchers;
    } else {
      const mockDb = readMockDb();
      const creatorProducts = mockDb.products.filter(p => p.creator_id === creatorId);
      const productIds = creatorProducts.map(p => p.id);
      const mockVouchers = mockDb.vouchers || [];

      return mockDb.orders
        .filter(o => o.product_id && productIds.includes(o.product_id))
        .map((o: any) => {
          const product = creatorProducts.find((p: any) => p.id === o.product_id);
          const voucher = mockVouchers.find((v: any) => v.order_id === o.id);
          return { ...o, product, voucher };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  // --- Vouchers Operations ---
  async createVoucher(orderId: string, buyerTgId: string, qrData: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('vouchers')
        .insert({
          order_id: orderId,
          buyer_tg_id: buyerTgId,
          qr_data: qrData,
          status: 'ACTIVE'
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.vouchers) mockDb.vouchers = [];
      const newVoucher = {
        id: Math.random().toString(36).substring(2, 15),
        order_id: orderId,
        buyer_tg_id: buyerTgId,
        qr_data: qrData,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      };
      mockDb.vouchers.push(newVoucher);
      writeMockDb(mockDb);
      return newVoucher;
    }
  },

  async getVoucherByQrData(qrData: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('vouchers')
        .select('*, order:order_id(*, product:product_id(*))')
        .eq('qr_data', qrData)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.vouchers) mockDb.vouchers = [];
      const v = mockDb.vouchers.find(x => x.qr_data === qrData);
      if (v) {
        const order = mockDb.orders.find(o => o.id === v.order_id);
        const product = order ? mockDb.products.find(p => p.id === order.product_id) : null;
        return { ...v, order: order ? { ...order, product } : null };
      }
      return null;
    }
  },

  async redeemVoucher(qrData: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('vouchers')
        .update({ status: 'REDEEMED' })
        .eq('qr_data', qrData)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.vouchers) mockDb.vouchers = [];
      const v = mockDb.vouchers.find(x => x.qr_data === qrData);
      if (v) {
        v.status = 'REDEEMED';
        writeMockDb(mockDb);
      }
      return v;
    }
  },

  async getVoucherByOrderId(orderId: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('vouchers')
        .select('*, order:order_id(*, product:product_id(*))')
        .eq('order_id', orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.vouchers) mockDb.vouchers = [];
      const v = mockDb.vouchers.find(x => x.order_id === orderId);
      if (v) {
        const order = mockDb.orders.find(o => o.id === v.order_id);
        const product = order ? mockDb.products.find(p => p.id === order.product_id) : null;
        return { ...v, order: order ? { ...order, product } : null };
      }
      return null;
    }
  },

  async updateVoucherDeliveryData(orderId: string, deliveryData: any) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('vouchers')
        .update({ delivery_data: deliveryData })
        .eq('order_id', orderId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.vouchers) mockDb.vouchers = [];
      const v = mockDb.vouchers.find(x => x.order_id === orderId);
      if (v) {
        v.delivery_data = deliveryData;
        writeMockDb(mockDb);
      }
      return v;
    }
  },

  // --- Bookings Operations ---
  async getBookingsByProductId(productId: string): Promise<Booking[]> {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('product_id', productId)
        .order('slot_start_time', { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      const mockDb = readMockDb();
      if (!mockDb.bookings) mockDb.bookings = [];
      return mockDb.bookings.filter(b => b.product_id === productId);
    }
  },

  async getBookingByOrderId(orderId: string): Promise<Booking | null> {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as Booking | null;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.bookings) mockDb.bookings = [];
      return mockDb.bookings.find(b => b.order_id === orderId) || null;
    }
  },

  async createBooking(productId: string, orderId: string | null, slotStartTime: string, slotEndTime: string, meetingLink?: string): Promise<Booking> {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from("bookings")
        .insert({
          product_id: productId,
          order_id: orderId,
          slot_start_time: slotStartTime,
          slot_end_time: slotEndTime,
          meeting_link: meetingLink || null,
          status: "SCHEDULED"
        })
        .select()
        .single();
      if (error) throw error;
      return data as Booking;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.bookings) mockDb.bookings = [];
      const newBooking: Booking = {
        id: Math.random().toString(36).substring(2, 15),
        product_id: productId,
        order_id: orderId,
        slot_start_time: slotStartTime,
        slot_end_time: slotEndTime,
        meeting_link: meetingLink || null,
        status: "SCHEDULED",
        created_at: new Date().toISOString()
      };
      mockDb.bookings.push(newBooking);
      writeMockDb(mockDb);
      return newBooking;
    }
  },

  async updateBookingStatus(bookingId: string, status: string): Promise<Booking | null> {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from("bookings")
        .update({ status })
        .eq("id", bookingId)
        .select()
        .single();
      if (error) throw error;
      return data as Booking | null;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.bookings) mockDb.bookings = [];
      const b = mockDb.bookings.find(x => x.id === bookingId);
      if (b) {
        b.status = status;
        writeMockDb(mockDb);
      }
      return b || null;
    }
  },

  async deleteBooking(bookingId: string): Promise<boolean> {
    if (isRealSupabaseConfigured) {
      const { error } = await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("id", bookingId);
      if (error) throw error;
      return true;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.bookings) mockDb.bookings = [];
      mockDb.bookings = mockDb.bookings.filter(b => b.id !== bookingId);
      writeMockDb(mockDb);
      return true;
    }
  },

  // --- Reviews Operations ---
  async hasBoughtProduct(buyerTgId: number, productId: string): Promise<boolean> {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("buyer_tg_id", buyerTgId)
        .eq("product_id", productId)
        .in("status", ["approved", "PAID"])
        .limit(1);
      if (error) throw error;
      return !!(data && data.length > 0);
    } else {
      const mockDb = readMockDb();
      return mockDb.orders.some(o => Number(o.buyer_tg_id) === Number(buyerTgId) && o.product_id === productId && (o.status === "approved" || o.status === "PAID"));
    }
  },

  async getReviews(creatorId: string, productId?: string | null): Promise<Review[]> {
    if (isRealSupabaseConfigured) {
      let query = supabaseAdmin
        .from("reviews")
        .select("*")
        .eq("creator_id", creatorId);
      
      if (productId !== undefined) {
        if (productId === null) {
          query = query.is("product_id", null);
        } else {
          query = query.eq("product_id", productId);
        }
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Review[];
    } else {
      const mockDb = readMockDb();
      if (!mockDb.reviews) mockDb.reviews = [];
      let list = mockDb.reviews.filter(r => r.creator_id === creatorId);
      if (productId !== undefined) {
        if (productId === null) {
          list = list.filter(r => !r.product_id);
        } else {
          list = list.filter(r => r.product_id === productId);
        }
      }
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async createReview(creatorId: string, productId: string | null, buyerTgId: number, buyerName: string, rating: number, text: string): Promise<Review> {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from("reviews")
        .insert({
          creator_id: creatorId,
          product_id: productId,
          buyer_tg_id: buyerTgId,
          buyer_name: buyerName,
          rating,
          text
        })
        .select()
        .single();
      if (error) throw error;
      return data as Review;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.reviews) mockDb.reviews = [];
      const newReview: Review = {
        id: Math.random().toString(36).substring(2, 15),
        creator_id: creatorId,
        product_id: productId,
        buyer_tg_id: buyerTgId,
        buyer_name: buyerName,
        rating,
        text,
        created_at: new Date().toISOString()
      };
      mockDb.reviews.push(newReview);
      writeMockDb(mockDb);
      return newReview;
    }
  },

  async getAdminWallets() {
    const adminSystemTgId = 999999999;
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('payment_details')
        .eq('telegram_id', adminSystemTgId)
        .maybeSingle();
      if (error) throw error;
      return data?.payment_details || null;
    } else {
      const mockDb = readMockDb();
      const adminUser = mockDb.users.find(u => Number(u.telegram_id) === adminSystemTgId);
      return adminUser?.payment_details || null;
    }
  },

  async saveAdminWallets(paymentDetails: any) {
    const adminSystemTgId = 999999999;
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .upsert({
          telegram_id: adminSystemTgId,
          username: 'paybio_admin_wallets',
          payment_details: paymentDetails,
          is_premium: true
        }, { onConflict: 'telegram_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      let adminUser = mockDb.users.find(u => Number(u.telegram_id) === adminSystemTgId);
      if (adminUser) {
        adminUser.payment_details = paymentDetails;
      } else {
        adminUser = {
          id: 'admin-system-wallets-uuid',
          telegram_id: adminSystemTgId,
          username: 'paybio_admin_wallets',
          is_premium: true,
          payment_details: paymentDetails,
          created_at: new Date().toISOString()
        };
        mockDb.users.push(adminUser);
      }
      writeMockDb(mockDb);
      return adminUser;
    }
  },

  async getAdminUser() {
    const adminIds = [123456789, 7999888, 999999999, 1780771122];
    if (isRealSupabaseConfigured) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('telegram_id', adminIds)
        .limit(1)
        .maybeSingle();
      if (data) return data;
      const { data: data2 } = await supabaseAdmin
        .from('users')
        .select('*')
        .or('username.ilike.%sher%,username.eq.shertyonok')
        .limit(1)
        .maybeSingle();
      return data2;
    } else {
      const mockDb = readMockDb();
      const user = mockDb.users.find(u => adminIds.includes(Number(u.telegram_id)));
      if (user) return user;
      const user2 = mockDb.users.find(u => u.username?.toLowerCase().includes('sher'));
      return user2 || null;
    }
  },

  async attributeReferral(buyerTgId: number, partnerRef: string): Promise<boolean> {
    const buyer = await this.getUserByTelegramId(buyerTgId);
    if (!buyer) return false;
    if (buyer.referred_by) return false;

    let partner = null;
    if (isRealSupabaseConfigured) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(partnerRef)) {
        const { data } = await supabaseAdmin.from('users').select('*').eq('id', partnerRef).maybeSingle();
        partner = data;
      } else {
        const tgIdNum = Number(partnerRef);
        if (!isNaN(tgIdNum)) {
          const { data } = await supabaseAdmin.from('users').select('*').eq('telegram_id', tgIdNum).maybeSingle();
          partner = data;
        }
      }
    } else {
      const mockDb = readMockDb();
      partner = mockDb.users.find(u => u.id === partnerRef || String(u.telegram_id) === partnerRef) || null;
    }

    if (!partner) return false;
    if (partner.id === buyer.id) return false; // self referral check

    if (isRealSupabaseConfigured) {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ referred_by: partner.id })
        .eq('id', buyer.id);
      if (error) throw error;
    } else {
      const mockDb = readMockDb();
      const b = mockDb.users.find(u => u.id === buyer.id);
      if (b) {
        b.referred_by = partner.id;
        writeMockDb(mockDb);
      }
    }
    return true;
  },

  async processPremiumCommission(buyerTgId: number, orderAmount: number, orderId: string) {
    const buyer = await this.getUserByTelegramId(buyerTgId);
    if (!buyer || !buyer.referred_by) return null;

    const partnerId = buyer.referred_by;
    const partner = await this.getUserById(partnerId);
    if (!partner) return null;

    const currentTier = partner.partner_tier || 1;
    const pct = currentTier === 2 ? 30 : 20;
    const commission = (orderAmount * pct) / 100;

    let commissionRecord;
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('referral_commissions')
        .insert({
          partner_id: partnerId,
          referred_user_id: buyer.id,
          order_id: orderId,
          amount_usd: orderAmount,
          commission_percentage: pct,
          commission_earned_usd: commission,
          status: 'earned'
        })
        .select()
        .single();
      if (error) throw error;
      commissionRecord = data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.referral_commissions) mockDb.referral_commissions = [];
      commissionRecord = {
        id: Math.random().toString(36).substring(2, 15),
        partner_id: partnerId,
        referred_user_id: buyer.id,
        order_id: orderId,
        amount_usd: orderAmount,
        commission_percentage: pct,
        commission_earned_usd: commission,
        status: 'earned' as const,
        created_at: new Date().toISOString()
      };
      mockDb.referral_commissions.push(commissionRecord);
      writeMockDb(mockDb);
    }

    // Check upgrade criteria (50+ active premium referred users)
    let activeReferralsCount = 0;
    if (isRealSupabaseConfigured) {
      const { count, error } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', partnerId)
        .eq('is_premium', true);
      if (error) throw error;
      activeReferralsCount = count || 0;
    } else {
      const mockDb = readMockDb();
      activeReferralsCount = mockDb.users.filter(u => u.referred_by === partnerId && u.is_premium === true).length;
    }

    let upgradedToTier2 = false;
    if (activeReferralsCount >= 50 && currentTier === 1) {
      if (isRealSupabaseConfigured) {
        await supabaseAdmin
          .from('users')
          .update({ partner_tier: 2 })
          .eq('id', partnerId);
      } else {
        const mockDb = readMockDb();
        const p = mockDb.users.find(u => u.id === partnerId);
        if (p) p.partner_tier = 2;
        writeMockDb(mockDb);
      }
      upgradedToTier2 = true;
    }

    return {
      partnerTelegramId: partner.telegram_id,
      commissionEarnedUsd: commission,
      upgradedToTier2
    };
  },

  async getPartnerStats(partnerId: string) {
    let partnerTier = 1;
    let tonWithdrawalAddress = null;
    let totalEarnings = 0;
    let totalPaid = 0;
    let activeReferralsCount = 0;

    if (isRealSupabaseConfigured) {
      const { data: partner } = await supabaseAdmin
        .from('users')
        .select('partner_tier, ton_withdrawal_address')
        .eq('id', partnerId)
        .maybeSingle();
      if (partner) {
        partnerTier = partner.partner_tier || 1;
        tonWithdrawalAddress = partner.ton_withdrawal_address || null;
      }
      const { data: commissions } = await supabaseAdmin
        .from('referral_commissions')
        .select('commission_earned_usd')
        .eq('partner_id', partnerId);
      if (commissions) {
        totalEarnings = commissions.reduce((sum: number, c: any) => sum + Number(c.commission_earned_usd), 0);
      }

      const { data: payouts } = await supabaseAdmin
        .from('partner_payouts')
        .select('amount_usd')
        .eq('partner_id', partnerId)
        .eq('status', 'completed');
      if (payouts) {
        totalPaid = payouts.reduce((sum: number, p: any) => sum + Number(p.amount_usd), 0);
      }

      const { count } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', partnerId)
        .eq('is_premium', true);
      activeReferralsCount = count || 0;
    } else {
      const mockDb = readMockDb();
      const partner = mockDb.users.find(u => u.id === partnerId);
      if (partner) {
        partnerTier = partner.partner_tier || 1;
        tonWithdrawalAddress = partner.ton_withdrawal_address || null;
      }

      const commissions = (mockDb.referral_commissions || []).filter(c => c.partner_id === partnerId);
      totalEarnings = commissions.reduce((sum: number, c: any) => sum + Number(c.commission_earned_usd), 0);

      const payouts = (mockDb.partner_payouts || []).filter(p => p.partner_id === partnerId && p.status === 'completed');
      totalPaid = payouts.reduce((sum: number, p: any) => sum + Number(p.amount_usd), 0);

      activeReferralsCount = mockDb.users.filter(u => u.referred_by === partnerId && u.is_premium === true).length;
    }

    return {
      total_earnings: Number(totalEarnings.toFixed(2)),
      total_paid: Number(totalPaid.toFixed(2)),
      available_balance: Number(Math.max(0, totalEarnings - totalPaid).toFixed(2)),
      active_referrals_count: activeReferralsCount,
      partner_tier: partnerTier,
      ton_withdrawal_address: tonWithdrawalAddress
    };
  },

  async requestPartnerPayout(partnerId: string, tonAddress: string, amount: number) {
    const stats = await this.getPartnerStats(partnerId);
    if (amount < 50) {
      throw new Error('Minimum withdrawal amount is $50.00 USD.');
    }
    if (stats.available_balance < amount) {
      throw new Error('Insufficient balance.');
    }

    let payout;
    if (isRealSupabaseConfigured) {
      await supabaseAdmin
        .from('users')
        .update({ ton_withdrawal_address: tonAddress })
        .eq('id', partnerId);

      const { data, error } = await supabaseAdmin
        .from('partner_payouts')
        .insert({
          partner_id: partnerId,
          amount_usd: amount,
          ton_address: tonAddress,
          status: 'requested'
        })
        .select()
        .single();
      if (error) throw error;
      payout = data;
    } else {
      const mockDb = readMockDb();
      const user = mockDb.users.find(u => u.id === partnerId);
      if (user) {
        user.ton_withdrawal_address = tonAddress;
      }
      if (!mockDb.partner_payouts) mockDb.partner_payouts = [];
      payout = {
        id: Math.random().toString(36).substring(2, 15),
        partner_id: partnerId,
        amount_usd: amount,
        ton_address: tonAddress,
        status: 'requested' as const,
        tx_hash: null,
        created_at: new Date().toISOString()
      };
      mockDb.partner_payouts.push(payout);
      writeMockDb(mockDb);
    }
    return payout;
  },

  async getGenderCounts(productId: string) {
    let approvedOrders: Order[] = [];
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('product_id', productId)
        .in('status', ['approved', 'PAID']);
      if (error) throw error;
      approvedOrders = data || [];
    } else {
      const mockDb = readMockDb();
      approvedOrders = mockDb.orders.filter(o => o.product_id === productId && (o.status === 'approved' || o.status === 'PAID'));
    }

    let maleCount = 0;
    let femaleCount = 0;
    for (const order of approvedOrders) {
      if (order.receipt_url) {
        try {
          const parsed = JSON.parse(order.receipt_url);
          if (parsed && parsed.gender === 'M') maleCount++;
          else if (parsed && parsed.gender === 'F') femaleCount++;
        } catch {
          if (order.receipt_url === 'M') maleCount++;
          else if (order.receipt_url === 'F') femaleCount++;
        }
      }
    }
    return { maleCount, femaleCount };
  },

  async addToWaitingList(productId: string, buyerTgId: number, gender: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('waiting_lists')
        .insert({
          product_id: productId,
          buyer_tg_id: buyerTgId,
          gender: gender
        })
        .select()
        .single();
      if (error) {
        console.error('Error adding to waiting list:', error);
        return null;
      }
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.waiting_lists) mockDb.waiting_lists = [];
      const exists = mockDb.waiting_lists.some(w => w.product_id === productId && w.buyer_tg_id === buyerTgId && w.gender === gender);
      if (exists) return true;

      const newEntry = {
        id: Math.random().toString(36).substring(2, 15),
        product_id: productId,
        buyer_tg_id: buyerTgId,
        gender: gender,
        created_at: new Date().toISOString()
      };
      mockDb.waiting_lists.push(newEntry);
      writeMockDb(mockDb);
      return newEntry;
    }
  },

  async getWaitingList(productId: string, gender?: string) {
    if (isRealSupabaseConfigured) {
      let query = supabaseAdmin
        .from('waiting_lists')
        .select('*')
        .eq('product_id', productId);
      if (gender) {
        query = query.eq('gender', gender);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else {
      const mockDb = readMockDb();
      if (!mockDb.waiting_lists) mockDb.waiting_lists = [];
      let list = mockDb.waiting_lists.filter(w => w.product_id === productId);
      if (gender) {
        list = list.filter(w => w.gender === gender);
      }
      return list;
    }
  },

  async removeFromWaitingList(productId: string, buyerTgId: number) {
    if (isRealSupabaseConfigured) {
      const { error } = await supabaseAdmin
        .from('waiting_lists')
        .delete()
        .eq('product_id', productId)
        .eq('buyer_tg_id', buyerTgId);
      if (error) throw error;
      return true;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.waiting_lists) mockDb.waiting_lists = [];
      mockDb.waiting_lists = mockDb.waiting_lists.filter(w => !(w.product_id === productId && w.buyer_tg_id === buyerTgId));
      writeMockDb(mockDb);
      return true;
    }
  }
};

