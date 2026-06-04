import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function POST(request: Request) {
  try {
    const { product_id, buyer_tg_id } = await request.json();

    if (!product_id || !buyer_tg_id) {
      return NextResponse.json(
        { error: 'Missing product_id or buyer_tg_id parameter.' },
        { status: 400 }
      );
    }

    // 1. Get product details
    const product = await db.getProductById(product_id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // 2. Create a pending order
    const order = await db.createOrder(product_id, buyer_tg_id, 'stars');

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
        
        await sendTelegramNotification(
          creatorTgId,
          `🛒 *Checkout Initiated!* \n\nBuyer *${buyerName}* has initiated checkout for your product *"${product.title}"* ($${product.price_fiat} / ${product.price_stars} Stars).`
        );
      }
    }


    // 3. Request Telegram Stars Invoice Link
    // For Telegram Stars, provider_token must be empty, and currency must be "XTR"
    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`;
    const payload = {
      title: product.title.slice(0, 32), // Telegram has length constraints
      description: product.description ? product.description.slice(0, 255) : 'Digital Product',
      payload: order.id, // We pass the order_id as the payload to track it in shipping query/pre_checkout query
      provider_token: '', // Empty for Stars
      currency: 'XTR',
      prices: [
        {
          label: product.title.slice(0, 32),
          amount: Math.round(product.price_stars), // Stars must be integers
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
