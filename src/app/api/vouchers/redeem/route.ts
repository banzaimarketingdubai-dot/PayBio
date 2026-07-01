import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification, getTelegramUser } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const { qr_data, dry_run } = await request.json();
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

    // Resolve buyer username/handle or fallback
    let visitorName = '';
    try {
      const buyerTgId = voucher.buyer_tg_id;
      const buyerUser = await db.getUserByTelegramId(Number(buyerTgId));
      if (buyerUser && buyerUser.username) {
        visitorName = `@${buyerUser.username}`;
      } else {
        const tgUser = await getTelegramUser(buyerTgId);
        if (tgUser) {
          if (tgUser.username) {
            visitorName = `@${tgUser.username}`;
          } else {
            const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
            visitorName = fullName || `ID: ${buyerTgId}`;
          }
        } else {
          visitorName = `ID: ${buyerTgId}`;
        }
      }
    } catch (e) {
      console.error('Error resolving visitor name:', e);
      visitorName = `ID: ${voucher.buyer_tg_id}`;
    }

    if (dry_run) {
      return NextResponse.json({
        success: true,
        voucher: {
          ...voucher,
          visitorName,
        }
      });
    }

    await db.redeemVoucher(qr_data);

    // Send congratulations to the guest
    try {
      const productTitle = voucher.order?.product?.title || 'Событие';
      const isRussian = /[а-яА-Я]/.test(productTitle) || /[а-яА-Я]/.test(voucher.order?.product?.description || '');
      const congratText = isRussian
        ? `🎉 Поздравляем с успешной регистрацией на мероприятие "${productTitle}"!`
        : `🎉 Congratulations! You have successfully registered for the event "${productTitle}"!`;

      await sendTelegramNotification(voucher.buyer_tg_id, congratText);
    } catch (e) {
      console.error('Error sending congratulation notification to guest:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Voucher Redeemed Successfully!',
      voucher: {
        ...voucher,
        status: 'REDEEMED',
        visitorName
      }
    });
  } catch (err: any) {
    console.error('Voucher redemption error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
