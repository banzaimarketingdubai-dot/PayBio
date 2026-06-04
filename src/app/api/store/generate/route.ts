import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { extractProductFromText } from '@/lib/gemini';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

async function getBotUsername(): Promise<string> {
  if (!TELEGRAM_BOT_TOKEN) {
    return 'PaybioBot'; // Fallback
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.result?.username) {
        return data.result.username;
      }
    }
  } catch (error) {
    console.error('Error fetching bot details from Telegram:', error);
  }
  return 'PaybioBot';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creator_id, raw_text, content_url } = body;

    if (!creator_id || !raw_text) {
      return NextResponse.json(
        { error: 'Missing creator_id or raw_text parameter.' },
        { status: 400 }
      );
    }

    // Call Gemini API to extract title, description, and price details
    const extracted = await extractProductFromText(raw_text);

    // Default digital product URL if none provided
    const finalContentUrl = content_url || 'https://example.com/digital-asset-placeholder.pdf';

    // Insert into database
    const product = await db.createProduct(
      creator_id,
      extracted.title,
      extracted.description,
      extracted.price_fiat,
      extracted.price_stars,
      finalContentUrl
    );

    // Dynamic bot username fetch
    const botUsername = await getBotUsername();

    // Generate deep links: one directly to the product
    const deepLink = `https://t.me/${botUsername}/app?startapp=${product.id}`;

    return NextResponse.json({
      success: true,
      product,
      deepLink,
    });
  } catch (error: any) {
    console.error('Product generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
