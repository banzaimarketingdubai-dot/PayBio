import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creator_id');
    const productIdParam = searchParams.get('product_id');

    if (!creatorId) {
      return NextResponse.json({ error: 'creator_id is required' }, { status: 400 });
    }

    let productId: string | null | undefined = undefined;
    if (productIdParam !== null) {
      productId = productIdParam === 'null' ? null : productIdParam;
    }

    const reviews = await db.getReviews(creatorId, productId);
    return NextResponse.json({ success: true, reviews });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creator_id, product_id, buyer_tg_id, buyer_name, rating, text } = body;

    // Validate presence
    if (!creator_id || !buyer_tg_id || !buyer_name || !rating || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate rating
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Validate text length
    const cleanedText = String(text).trim();
    if (cleanedText.length === 0) {
      return NextResponse.json({ error: 'Review text cannot be empty' }, { status: 400 });
    }
    if (cleanedText.length > 800) {
      return NextResponse.json({ error: 'Review text cannot exceed 800 characters' }, { status: 400 });
    }

    const buyerTgIdNum = Number(buyer_tg_id);
    const targetProductId = product_id || null;

    // Verify purchase if product review
    if (targetProductId) {
      const hasBought = await db.hasBoughtProduct(buyerTgIdNum, targetProductId);
      if (!hasBought) {
        return NextResponse.json({
          error: 'У вас должен быть завершенный заказ на этот товар, чтобы оставить отзыв.'
        }, { status: 403 });
      }
    }

    const review = await db.createReview(
      creator_id,
      targetProductId,
      buyerTgIdNum,
      buyer_name,
      ratingNum,
      cleanedText
    );

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
