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
  vouchers?: any[];
  bookings?: any[];
  reviews?: any[];
}

let memoryDb: DatabaseSchema = { users: [], products: [], orders: [], vouchers: [], bookings: [], reviews: [] };

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

  async createProduct(creatorId: string, title: string, description: string, priceFiat: number, priceStars: number, contentUrl: string, coverUrl?: string, productType = 'DIGITAL') {
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
          product_type: productType
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
        product_type: productType,
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

  async updateProduct(id: string, title: string, description: string, priceFiat: number, priceStars: number, contentUrl: string, coverUrl?: string, productType = 'DIGITAL') {
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
          product_type: productType
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
      }
      writeMockDb(mockDb);
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
  },

  async getLatestPendingOrderByBuyer(buyerTgId: number) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*, product:product_id(*)')
        .eq('buyer_tg_id', buyerTgId)
        .eq('status', 'pending')
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
        .filter(o => Number(o.buyer_tg_id) === Number(buyerTgId) && o.status === 'pending')
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
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({ receipt_url: receiptUrl, status: status })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const order = mockDb.orders.find(o => o.id === orderId);
      if (order) {
        order.receipt_url = receiptUrl;
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
        .eq('status', 'approved');
      if (error) throw error;
      return count || 0;
    } else {
      const mockDb = readMockDb();
      return mockDb.orders.filter(o => o.product_id === productId && o.status === 'approved').length;
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
        .eq('status', 'pending')
        .eq('product.creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      const creatorProducts = mockDb.products.filter(p => p.creator_id === creatorId);
      const productIds = creatorProducts.map(p => p.id);
      return mockDb.orders
        .filter(o => o.status === 'pending' && productIds.includes(o.product_id))
        .map(o => {
          const product = creatorProducts.find(p => p.id === o.product_id);
          return { ...o, product };
        });
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

  // --- Bookings Operations ---
  async getBookingsByProductId(productId: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('product_id', productId)
        .order('slot_start_time', { ascending: true });
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.bookings) mockDb.bookings = [];
      return mockDb.bookings.filter(b => b.product_id === productId);
    }
  },

  async createBooking(productId: string, orderId: string | null, slotStartTime: string, slotEndTime: string, meetingLink?: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .insert({
          product_id: productId,
          order_id: orderId,
          slot_start_time: slotStartTime,
          slot_end_time: slotEndTime,
          meeting_link: meetingLink || null,
          status: 'SCHEDULED'
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.bookings) mockDb.bookings = [];
      const newBooking = {
        id: Math.random().toString(36).substring(2, 15),
        product_id: productId,
        order_id: orderId,
        slot_start_time: slotStartTime,
        slot_end_time: slotEndTime,
        meeting_link: meetingLink || null,
        status: 'SCHEDULED',
        created_at: new Date().toISOString()
      };
      mockDb.bookings.push(newBooking);
      writeMockDb(mockDb);
      return newBooking;
    }
  },

  async updateBookingStatus(bookingId: string, status: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.bookings) mockDb.bookings = [];
      const b = mockDb.bookings.find(x => x.id === bookingId);
      if (b) {
        b.status = status;
        writeMockDb(mockDb);
      }
      return b;
    }
  },

  async deleteBooking(bookingId: string) {
    if (isRealSupabaseConfigured) {
      const { error } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('id', bookingId);
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
  async hasBoughtProduct(buyerTgId: number, productId: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('buyer_tg_id', buyerTgId)
        .eq('product_id', productId)
        .eq('status', 'approved')
        .limit(1);
      if (error) throw error;
      return data && data.length > 0;
    } else {
      const mockDb = readMockDb();
      return mockDb.orders.some(o => Number(o.buyer_tg_id) === Number(buyerTgId) && o.product_id === productId && o.status === 'approved');
    }
  },

  async getReviews(creatorId: string, productId?: string | null) {
    if (isRealSupabaseConfigured) {
      let query = supabaseAdmin
        .from('reviews')
        .select('*')
        .eq('creator_id', creatorId);
      
      if (productId !== undefined) {
        if (productId === null) {
          query = query.is('product_id', null);
        } else {
          query = query.eq('product_id', productId);
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
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

  async createReview(creatorId: string, productId: string | null, buyerTgId: number, buyerName: string, rating: number, text: string) {
    if (isRealSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('reviews')
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
      return data;
    } else {
      const mockDb = readMockDb();
      if (!mockDb.reviews) mockDb.reviews = [];
      const newReview = {
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
  }
};

