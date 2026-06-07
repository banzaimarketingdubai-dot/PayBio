import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const wallets = await db.getAdminWallets();
    return NextResponse.json({
      success: true,
      wallets: wallets || { ton: '', p2p: '', p2p_list: [], usdt_trc20: '', usdt_bep20: '', other: '' }
    });
  } catch (error: any) {
    console.error('Fetch admin wallets error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
