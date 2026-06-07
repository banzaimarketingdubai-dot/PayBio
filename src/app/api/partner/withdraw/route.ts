import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partner_id, ton_address, amount_to_withdraw_usd } = body;

    if (!partner_id || !ton_address || amount_to_withdraw_usd === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters: partner_id, ton_address, amount_to_withdraw_usd.' },
        { status: 400 }
      );
    }

    const amount = Number(amount_to_withdraw_usd);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount_to_withdraw_usd.' },
        { status: 400 }
      );
    }

    // Call DB helper to check balances, save address, insert request
    const payout = await db.requestPartnerPayout(partner_id, ton_address, amount);

    // Notify administrator
    try {
      const admin = await db.getAdminUser();
      if (admin) {
        const partnerUser = await db.getUserById(partner_id);
        const partnerName = partnerUser?.username
          ? `@${partnerUser.username} (ID: ${partnerUser.telegram_id})`
          : `ID: ${partnerUser?.telegram_id || 'unknown'}`;

        const alertText = `🔔 *New Payout Request!* \n\n` +
          `Partner: *${partnerName}*\n` +
          `Amount: *$${amount.toFixed(2)} USD*\n` +
          `TON Wallet: \`${ton_address}\`\n\n` +
          `Please process the manual payout on the TON blockchain and update status / tx_hash.`;

        await sendTelegramNotification(admin.telegram_id, alertText);
      }
    } catch (notifyError) {
      console.error('Error sending payout admin notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      payout
    });
  } catch (error: any) {
    console.error('Error processing partner withdrawal:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
