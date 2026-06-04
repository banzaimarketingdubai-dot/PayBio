import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { user_id, customization, payment_details } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 });
    }
    let user = null;
    if (customization) {
      user = await db.updateUserProfile(user_id, customization);
    }
    if (payment_details) {
      user = await db.updateUserPaymentDetails(user_id, payment_details);
    }
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
