import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';
import { fetchBusySlots } from '@/lib/calendar';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_id, buyer_tg_id, booking_slot, gender } = body;

    if (!product_id || !buyer_tg_id) {
      return NextResponse.json(
        { error: 'Missing product_id or buyer_tg_id parameter.' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(product_id)) {
      return NextResponse.json({ error: 'Invalid product ID format.' }, { status: 400 });
    }

    // 1. Get product details
    const product = await db.getProductById(product_id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // 1a. Validate creator's premium status
    if (!product.creator?.is_premium) {
      return NextResponse.json(
        { error: 'Оплата и бронирование временно недоступны, так как у владельца магазина не активна подписка.' },
        { status: 403 }
      );
    }

    // 1b. Validate voucher limits if product is VOUCHER
    let hasGenderBalance = false;
    if (product.product_type === 'VOUCHER' || product.product_type === 'TICKET') {
      try {
        const content = JSON.parse(product.content_url);
        if (content) {
          if (content.has_gender_balance) {
            hasGenderBalance = true;
          }
          if (typeof content.max_quantity === 'number') {
            const soldCount = await db.getApprovedOrderCount(product_id);
            if (soldCount >= content.max_quantity) {
              return NextResponse.json(
                { error: 'Извините, все билеты распроданы.' },
                { status: 400 }
              );
            }
          }
        }
      } catch (e) {
        // Ignore JSON parse errors for non-JSON content_url legacy products
      }
    }

    const isPair = gender === 'PAIR';
    if (hasGenderBalance) {
      if (!gender || (gender !== 'M' && gender !== 'F' && gender !== 'PAIR')) {
        return NextResponse.json({ error: 'Пожалуйста, выберите пол или парный билет для покупки.' }, { status: 400 });
      }

      if (!isPair) {
        const { maleCount, femaleCount } = await db.getGenderCounts(product_id);
        const newMaleCount = maleCount + (gender === 'M' ? 1 : 0);
        const newFemaleCount = femaleCount + (gender === 'F' ? 1 : 0);

        if (Math.abs(newMaleCount - newFemaleCount) > 2) {
          return NextResponse.json({
            error: 'GENDER_BALANCE_LIMIT',
            message: 'Извините, покупка билетов выбранного пола временно ограничена для удержания баланса М/Ж. Вы можете записаться в лист ожидания.'
          }, { status: 403 });
        }
      }
    }

    // 1c. Validate booking availability if product is BOOKING
    if (product.product_type === 'BOOKING') {
      if (!booking_slot || !booking_slot.start || !booking_slot.end) {
        return NextResponse.json(
          { error: 'Missing booking_slot parameter containing start and end times.' },
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
      try {
        const content = JSON.parse(product.content_url);
        if (content && typeof content.ics_url === 'string') {
          icsUrl = content.ics_url.trim();
        }
      } catch (e) {
        // Ignore
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
    const order = await db.createOrder(
      product_id,
      buyer_tg_id,
      'stars',
      gender ? JSON.stringify({ gender }) : undefined
    );

    // 2b. Handle Booking product type slot reservation
    if (product.product_type === 'BOOKING' && booking_slot) {
      await db.createBooking(product_id, order.id, booking_slot.start, booking_slot.end);
    }

    // Notify creator about checkout initiation
    if (product.creator) {
      const creatorTgId = Number(product.creator.telegram_id);
      const buyerTgId = Number(buyer_tg_id);
      // Only notify if buyer is different from creator
      if (buyerTgId > 0 && buyerTgId !== creatorTgId) {
        const buyer = await db.getUserByTelegramId(buyerTgId);
        const buyerName = buyer 
          ? `@${buyer.username || 'user'}` 
          : `ID: ${buyerTgId}`;
        
        const displayPriceFiat = product.price_fiat * (isPair ? 2 : 1);
        const displayPriceStars = product.price_stars * (isPair ? 2 : 1);
        
        await sendTelegramNotification(
          creatorTgId,
          `🛒 *Checkout Initiated!* \n\nBuyer *${buyerName}* has initiated checkout for your product *"${product.title}"*${isPair ? ' (Pair M+F)' : ''} ($${displayPriceFiat} / ${displayPriceStars} Stars).`
        );
      }
    }


    // 3. Request Telegram Stars Invoice Link
    // For Telegram Stars, provider_token must be empty, and currency must be "XTR"
    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`;
    const payload = {
      title: (product.title.slice(0, 25) + (isPair ? ' (М+Ж)' : '')).slice(0, 32), // Telegram has length constraints
      description: product.description ? product.description.slice(0, 255) : 'Digital Product',
      payload: order.id, // We pass the order_id as the payload to track it in shipping query/pre_checkout query
      provider_token: '', // Empty for Stars
      currency: 'XTR',
      prices: [
        {
          label: (product.title.slice(0, 25) + (isPair ? ' (М+Ж)' : '')).slice(0, 32),
          amount: Math.round(product.price_stars * (isPair ? 2 : 1)), // Stars must be integers
        },
      ],
    };

    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!tgRes.ok) {
      const errorText = await tgRes.text();
      console.error('Telegram Stars Invoice Error:', errorText);
      return NextResponse.json(
        { error: `Telegram invoice generation failed: ${errorText}` },
        { status: 502 }
      );
    }

    const tgData = await tgRes.json();
    if (!tgData.ok || !tgData.result) {
      console.error('Telegram Stars Invoice Error details:', tgData);
      return NextResponse.json(
        { error: 'Telegram did not return invoice link.' },
        { status: 502 }
      );
    }

    const invoiceLink = tgData.result;

    return NextResponse.json({
      success: true,
      order_id: order.id,
      invoice_link: invoiceLink,
    });
  } catch (error: any) {
    console.error('Stars Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
