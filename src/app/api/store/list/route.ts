import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const creatorTgIdParam = searchParams.get('creator_tg_id');

    if (productId) {
      const product = await db.getProductById(productId);
      if (!product) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, product });
    }

    if (creatorTgIdParam) {
      const creatorTgId = Number(creatorTgIdParam);
      if (isNaN(creatorTgId)) {
        return NextResponse.json({ error: 'Invalid creator_tg_id' }, { status: 400 });
      }

      let creator = await db.getUserByTelegramId(creatorTgId);
      if (!creator) {
        creator = await db.upsertUser(creatorTgId, `creator_${creatorTgId}`);
      }

      const products = await db.getProductsByCreatorId(creator.id);
      return NextResponse.json({ success: true, creator, products: products || [] });
    }

    // List all products
    const products = await db.getAllProducts();
    return NextResponse.json({ success: true, products: products || [] });
  } catch (error: any) {
    console.error('List products error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

