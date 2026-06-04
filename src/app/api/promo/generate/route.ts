import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { generatePromoPost } from '@/lib/gemini';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'Missing product_id parameter' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return NextResponse.json({ error: 'Invalid product ID format.' }, { status: 400 });
    }

    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const text = await generatePromoPost(product.title, product.description || '');

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error('Error generating promo post:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
