import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (productId) {
      const product = await db.getProductById(productId);
      if (!product) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, product });
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

