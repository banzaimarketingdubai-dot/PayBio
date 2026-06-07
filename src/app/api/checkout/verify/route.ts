import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: 'Missing order_id parameter.' },
        { status: 400 }
      );
    }

    // 1. Fetch order & product details
    const order = await db.getOrderById(order_id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Idempotency: If already approved/paid, return success immediately
    if (order.status === 'PAID' || order.status === 'approved') {
      return NextResponse.json({
        success: true,
        status: 'PAID',
        message: 'Order was already approved and fulfilled.',
      });
    }

    const isPremiumOrder = order.payment_method && order.payment_method.endsWith('_premium');

    let creator = null;
    if (isPremiumOrder) {
      creator = await db.getAdminUser();
    } else {
      const product = order.product;
      if (!product) {
        return NextResponse.json({ error: 'Associated product not found.' }, { status: 404 });
      }
      creator = await db.getUserById(product.creator_id);
    }

    if (!creator) {
      return NextResponse.json({ error: 'Creator or administrator not found.' }, { status: 404 });
    }

    // 2. Update order status to PAYMENT_CLAIMED
    await db.updateOrderStatus(order_id, 'PAYMENT_CLAIMED');

    // 3. Notify Creator/Admin via Telegram Bot
    const buyer = await db.getUserByTelegramId(order.buyer_tg_id);
    const buyerName = buyer ? `@${buyer.username || 'user'}` : `ID: ${order.buyer_tg_id}`;
    
    // Simple language detection based on buyer language if available
    const isRussian = buyer?.username ? /[а-яА-Я]/.test(buyer.username) : true;

    let messageText = '';
    let replyMarkup = {};

    if (isPremiumOrder) {
      const isCrypto = order.payment_method.includes('crypto');
      messageText = isRussian
        ? `👑 *Новый запрос на покупку PREMIUM!* \n\nПокупатель *${buyerName}* утверждает, что оплатил Premium ($10) через ${isCrypto ? 'Crypto (USDT/TON)' : 'Card/P2P'}. Проверьте ваш счет/кошелек.`
        : `👑 *New PREMIUM Purchase Request!* \n\nBuyer *${buyerName}* claims they paid Premium ($10) via ${isCrypto ? 'Crypto (USDT/TON)' : 'Card/P2P'}. Please check your account/wallet.`;
      
      replyMarkup = {
        inline_keyboard: [
          [
            { text: isRussian ? '✅ Одобрить и выдать Premium' : '✅ Approve & Grant Premium', callback_data: `approve_premium_${order_id}` },
            { text: isRussian ? '❌ Отклонить запрос' : '❌ Reject Request', callback_data: `reject_premium_${order_id}` }
          ]
        ]
      };
    } else {
      const product = order.product;
      const price = product.price_fiat;
      const currency = order.payment_method === 'crypto' ? 'USDT/TON' : 'USD';
      const isProductRussian = /[а-яА-Я]/.test(product.title) || /[а-яА-Я]/.test(product.description || '');

      messageText = isProductRussian
        ? `💰 *Новый запрос на подтверждение оплаты!* \n\nПокупатель утверждает, что перевел вам ${price} ${currency} за товар *"${product.title}"*. Проверьте ваш счет/кошелек.`
        : `💰 *New Payment Confirmation Request!* \n\nBuyer claims they transferred ${price} ${currency} for *"${product.title}"*. Please check your banking app or wallet.`;

      replyMarkup = {
        inline_keyboard: [
          [
            { text: isProductRussian ? '✅ Подтвердить и выдать товар' : '✅ Approve & Deliver', callback_data: `approve_pay_${order_id}` },
            { text: isProductRussian ? '❌ Возникла проблема' : '❌ Problem with Payment', callback_data: `reject_pay_${order_id}` }
          ]
        ]
      };
    }

    await sendTelegramNotification(creator.telegram_id, messageText, replyMarkup);

    return NextResponse.json({
      success: true,
      status: 'PAYMENT_CLAIMED'
    });
  } catch (error: any) {
    console.error('Verify P2P payment claim error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
