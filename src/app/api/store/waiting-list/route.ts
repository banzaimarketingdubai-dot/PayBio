import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_id, buyer_tg_id, gender } = body;

    if (!product_id || !buyer_tg_id || !gender) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const success = await db.addToWaitingList(product_id, Number(buyer_tg_id), gender);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to add to waiting list' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Waiting list error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
