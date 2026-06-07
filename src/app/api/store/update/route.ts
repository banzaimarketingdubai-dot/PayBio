import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { id, title, description, price_fiat, price_stars, content_url, cover_url, product_type, sub_type } = await request.json();
    if (!id || !title) {
      return NextResponse.json({ success: false, error: 'Product ID and Title are required' }, { status: 400 });
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid product ID format.' }, { status: 400 });
    }

    const updated = await db.updateProduct(id, title, description, price_fiat, price_stars, content_url, cover_url, product_type, sub_type || null);
    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
