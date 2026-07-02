import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'Missing product_id' }, { status: 400 });
    }

    const { maleCount, femaleCount } = await db.getGenderCounts(productId);
    return NextResponse.json({ success: true, maleCount, femaleCount });
  } catch (err: any) {
    console.error('Gender counts error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
