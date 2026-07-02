import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creator_id');
    const buyerTgId = searchParams.get('buyer_tg_id');

    if (!creatorId && !buyerTgId) {
      return NextResponse.json(
        { error: 'Missing creator_id or buyer_tg_id parameter.' },
        { status: 400 }
      );
    }

    let orders = [];
    if (creatorId) {
      orders = await db.getOrdersByCreatorId(creatorId);
    } else if (buyerTgId) {
      orders = await db.getOrdersByBuyerTgId(Number(buyerTgId));
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
    });
  } catch (error: any) {
    console.error('Fetch store orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
