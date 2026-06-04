import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { qr_data } = await request.json();
    if (!qr_data) {
      return NextResponse.json({ success: false, error: 'Missing qr_data parameter.' }, { status: 400 });
    }

    const voucher = await db.getVoucherByQrData(qr_data);
    if (!voucher) {
      return NextResponse.json({ success: false, error: 'Voucher not found.' }, { status: 404 });
    }

    if (voucher.status === 'REDEEMED') {
      return NextResponse.json({ success: false, error: 'Voucher has already been redeemed.' }, { status: 400 });
    }

    await db.redeemVoucher(qr_data);

    return NextResponse.json({
      success: true,
      message: 'Voucher Redeemed Successfully!',
      voucher: {
        ...voucher,
        status: 'REDEEMED'
      }
    });
  } catch (err: any) {
    console.error('Voucher redemption error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
