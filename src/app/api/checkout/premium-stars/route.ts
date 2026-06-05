import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function POST(request: Request) {
  try {
    const { user_id, is_subscription } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id parameter.' },
        { status: 400 }
      );
    }

    const creator = await db.getUserById(user_id);
    if (!creator) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Request Telegram Stars Invoice Link for Premium Subscription (500 Stars)
    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`;
    const payload: any = {
      title: 'PayBio Premium',
      description: is_subscription
        ? 'Monthly subscription: Remove watermark, unlock custom designs, and generate AI covers.'
        : '1 Month Premium: Remove watermark, unlock custom designs, and generate AI covers.',
      payload: is_subscription
        ? `premium_subscription_user_id:${creator.id}`
        : `premium_user_id:${creator.id}`,
      provider_token: '', // Empty for Stars
      currency: 'XTR',
      prices: [
        {
          label: is_subscription ? 'Premium Subscription (Monthly)' : 'Premium (1 Month)',
          amount: 500, // 500 Stars
        },
      ],
    };

    if (is_subscription) {
      payload.subscription_period = 2592000; // 30 days
    }

    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!tgRes.ok) {
      const errorText = await tgRes.text();
      console.error('Telegram Stars Premium Invoice Error:', errorText);
      return NextResponse.json(
        { error: `Telegram invoice generation failed: ${errorText}` },
        { status: 502 }
      );
    }

    const tgData = await tgRes.json();
    if (!tgData.ok || !tgData.result) {
      console.error('Telegram Stars Premium Invoice Error details:', tgData);
      return NextResponse.json(
        { error: 'Telegram did not return invoice link.' },
        { status: 502 }
      );
    }

    const invoiceLink = tgData.result;

    return NextResponse.json({
      success: true,
      invoice_link: invoiceLink,
    });
  } catch (error: any) {
    console.error('Premium Stars Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
