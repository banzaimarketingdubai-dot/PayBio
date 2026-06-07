import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Missing partner_id parameter.' },
        { status: 400 }
      );
    }

    const stats = await db.getPartnerStats(partnerId);
    return NextResponse.json({
      success: true,
      ...stats
    });
  } catch (error: any) {
    console.error('Error fetching partner stats:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
