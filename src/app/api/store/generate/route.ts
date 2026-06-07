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
    const { creator_id, raw_text, content_url, title, description, price_fiat, price_stars, cover_url, product_type, sub_type } = body;

    if (!creator_id) {
      return NextResponse.json(
        { error: 'Missing creator_id parameter.' },
        { status: 400 }
      );
    }

    let finalTitle = title;
    let finalDescription = description;
    let finalPriceFiat = price_fiat;
    let finalPriceStars = price_stars;

    if (raw_text) {
      // Call Gemini API to extract title, description, and price details
      const extracted = await extractProductFromText(raw_text);
      finalTitle = finalTitle || extracted.title;
      finalDescription = finalDescription || extracted.description;
      finalPriceFiat = finalPriceFiat !== undefined ? finalPriceFiat : extracted.price_fiat;
      finalPriceStars = finalPriceStars !== undefined ? finalPriceStars : extracted.price_stars;
    }

    if (!finalTitle || finalPriceFiat === undefined) {
      return NextResponse.json(
        { error: 'Missing product details (title, price_fiat).' },
        { status: 400 }
      );
    }

    // Default digital product URL if none provided
    const finalContentUrl = content_url || 'https://example.com/digital-asset-placeholder.pdf';

    // Calculate stars if not provided (1 USD = ~50 stars)
    const calculatedStars = finalPriceStars !== undefined ? finalPriceStars : Math.round(finalPriceFiat * 50);

    // Insert into database
    const product = await db.createProduct(
      creator_id,
      finalTitle,
      finalDescription || '',
      Number(finalPriceFiat),
      Number(calculatedStars),
      finalContentUrl,
      cover_url,
      product_type || 'DIGITAL',
      sub_type || null
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
