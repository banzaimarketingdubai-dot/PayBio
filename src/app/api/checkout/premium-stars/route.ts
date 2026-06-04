import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function POST(request: Request) {
  try {
    const { user_id } = await request.json();

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
    const payload = {
      title: 'PayBio Premium',
      description: 'Remove branding watermark, unlock custom avatars/banners, and generate AI covers instantly.',
      payload: `premium_user_id:${creator.id}`,
      provider_token: '', // Empty for Stars
      currency: 'XTR',
      prices: [
        {
          label: 'Premium Subscription (1 Month)',
          amount: 500, // 500 Stars
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
