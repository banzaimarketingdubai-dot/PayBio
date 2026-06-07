import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { user_id, action, code, is_premium } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    if (action === 'promo') {
      if (!code) {
        return NextResponse.json({ error: 'Missing promo code' }, { status: 400 });
      }
      const result = await db.verifyAndApplyPromoCode(user_id, code);
      const user = await db.getUserById(user_id);
      return NextResponse.json({ user, ...result });
    } else if (action === 'stars') {
      // Direct premium activation via stars (fallback or administrative checkout confirmation)
      const user = await db.activatePremium(user_id, 30);
      return NextResponse.json({ success: true, user });
    } else if (action === 'activate') {
      const user = await db.updateUserPremium(user_id, is_premium !== false);
      return NextResponse.json({ success: true, user });
    } else {
      // Default to toggle/activation
      const user = await db.updateUserPremium(user_id, is_premium !== false);
      return NextResponse.json({ success: true, user });
    }
  } catch (error: any) {
    console.error('Update premium error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

