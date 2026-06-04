import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { user_id, is_premium } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }
    const user = await db.updateUserPremium(user_id, is_premium !== false);
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Update premium error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
