import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';
import { fetchBusySlots } from '@/lib/calendar';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_id, buyer_tg_id, booking_slot, payment_method } = body;

    if (!product_id || !buyer_tg_id) {
      return NextResponse.json(
        { error: 'Missing product_id or buyer_tg_id parameter.' },
        { status: 400 }
      );
    }

    const isPremiumVirtual = product_id === 'premium_virtual';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!isPremiumVirtual && !uuidRegex.test(product_id)) {
      return NextResponse.json({ error: 'Invalid product ID format.' }, { status: 400 });
    }

    // 1. Get product details
    let product = null;
    if (isPremiumVirtual) {
      const adminUser = await db.getAdminUser();
      product = {
        id: 'premium_virtual',
        title: 'PayBio Premium',
        price_fiat: 10.00,
        price_stars: 500,
        product_type: 'DIGITAL',
        creator: adminUser,
        creator_id: adminUser?.id || ''
      };
    } else {
      product = await db.getProductById(product_id);
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // 1a. Validate creator's premium status (skip for premium virtual purchases)
    if (!isPremiumVirtual && !product.creator?.is_premium) {
      return NextResponse.json(
        { error: 'Оплата и бронирование временно недоступны, так как у владельца магазина не активна подписка.' },
        { status: 403 }
      );
    }

    // 1b. Validate voucher limits if product is VOUCHER
    if (product.product_type === 'VOUCHER') {
      try {
        const content = JSON.parse(product.content_url);
        if (content && typeof content.max_quantity === 'number') {
          const soldCount = await db.getApprovedOrderCount(product_id);
          if (soldCount >= content.max_quantity) {
            return NextResponse.json(
              { error: 'Извините, все билеты распроданы.' },
              { status: 400 }
            );
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    // 1c. Validate booking availability if product is BOOKING
    if (product.product_type === 'BOOKING') {
      if (!booking_slot || !booking_slot.start || !booking_slot.end) {
        return NextResponse.json(
          { error: 'Missing booking_slot parameter.' },
          { status: 400 }
        );
      }

      const reqStart = new Date(booking_slot.start);
      const reqEnd = new Date(booking_slot.end);

      // Check DB Bookings
      const dbBookings = await db.getBookingsByProductId(product_id);
      if (dbBookings && dbBookings.length > 0) {
        const hasDbOverlap = dbBookings.some((b: any) => {
          if (b.status !== 'SCHEDULED') return false;
          const bStart = new Date(b.slot_start_time).getTime();
          const bEnd = new Date(b.slot_end_time).getTime();
          return reqStart.getTime() < bEnd && reqEnd.getTime() > bStart;
        });

        if (hasDbOverlap) {
          return NextResponse.json(
            { error: 'Этот временной интервал уже забронирован.' },
            { status: 400 }
          );
        }
      }

      // Check External Calendar
      let icsUrl = '';
      if (product.creator?.payment_details?.ics_url) {
        icsUrl = product.creator.payment_details.ics_url.trim();
      } else {
        try {
          const content = JSON.parse(product.content_url);
          if (content && typeof content.ics_url === 'string') {
            icsUrl = content.ics_url.trim();
          }
        } catch (e) {
          // Ignore
        }
      }

      if (icsUrl) {
        const extSlots = await fetchBusySlots(icsUrl);
        const hasExtOverlap = extSlots.some((s) => {
          const sStart = new Date(s.start).getTime();
          const sEnd = new Date(s.end).getTime();
          return reqStart.getTime() < sEnd && reqEnd.getTime() > sStart;
        });

        if (hasExtOverlap) {
          return NextResponse.json(
            { error: 'Этот временной интервал занят в календаре автора.' },
            { status: 400 }
          );
        }
      }
    }

    // 2. Create a pending order
    const method = payment_method || 'p2p';
    const order = await db.createOrder(
      isPremiumVirtual ? null : product_id,
      buyer_tg_id,
      isPremiumVirtual ? `${method}_premium` : method
    );

    // 2b. Handle Booking product type slot reservation
    if (product.product_type === 'BOOKING' && booking_slot) {
      await db.createBooking(product_id, order.id, booking_slot.start, booking_slot.end);
    }

    // Notify creator about checkout initiation
    if (product.creator && !isPremiumVirtual) {
      const creatorTgId = Number(product.creator.telegram_id);
      const bTgId = Number(buyer_tg_id);
      if (bTgId > 0 && bTgId !== creatorTgId) {
        const buyer = await db.getUserByTelegramId(bTgId);
        const buyerName = buyer 
          ? `@${buyer.username || 'user'}` 
          : `ID: ${bTgId}`;
        
        const methodName = method === 'crypto' ? 'Crypto' : 'Card/P2P';
        await sendTelegramNotification(
          creatorTgId,
          `🛒 *Checkout Initiated (${methodName})!* \n\nBuyer *${buyerName}* has initiated checkout for your product *"${product.title}"* ($${product.price_fiat}).`
        );
      }
    }

    return NextResponse.json({
      success: true,
      order_id: order.id
    });
  } catch (error: any) {
    console.error('P2P Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
