import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification, sendTelegramPhoto } from '@/lib/telegram';

async function verifyTonTransaction(walletAddress: string, orderId: string, expectedNanotons: number): Promise<boolean> {
  try {
    const response = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(walletAddress)}&limit=20`);
    if (!response.ok) {
      console.warn(`TON API returned status ${response.status}`);
      return false;
    }
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.result)) {
      console.warn('Invalid TON API response:', data);
      return false;
    }

    const txs = data.result;
    for (const tx of txs) {
      const inMsg = tx.in_msg;
      if (!inMsg) continue;

      if (inMsg.destination !== walletAddress) continue;

      let comment = inMsg.message || '';
      if (!comment && inMsg.msg_data?.text) {
        comment = inMsg.msg_data.text;
      }

      if (comment.trim() === orderId.trim()) {
        const val = Number(inMsg.value || 0);
        if (val >= expectedNanotons * 0.9) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error fetching TON transactions:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, receipt_url } = body;

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

    const buyer = await db.getUserByTelegramId(order.buyer_tg_id);

    const isTon = order.payment_method && order.payment_method.startsWith('ton');
    if (isTon) {
      const walletAddress = creator.payment_details?.ton;
      if (!walletAddress) {
        return NextResponse.json({ error: 'Seller TON wallet address is not configured.' }, { status: 400 });
      }

      const expectedTon = order.product ? (order.product.price_fiat / 7.0) : 0;
      const expectedNanotons = Math.round(expectedTon * 1e9);

      const isDemo = walletAddress.includes('demo') || walletAddress === 'No TON wallet configured' || db.isMock;
      let verified = false;

      if (isDemo) {
        verified = true;
      } else {
        verified = await verifyTonTransaction(walletAddress, order.id, expectedNanotons);
      }

      if (verified) {
        const { fulfillOrder } = await import('@/lib/fulfillment');
        await fulfillOrder(order_id);

        return NextResponse.json({
          success: true,
          status: 'PAID',
          message: 'TON transaction verified and order fulfilled.'
        });
      } else {
        const langCode = (buyer?.payment_details as any)?.lang || 'ru';
        return NextResponse.json({
          success: false,
          reason: langCode === 'en'
            ? 'Transaction not found on the blockchain yet. Please make sure you sent the transfer with the correct order ID comment.'
            : 'Транзакция пока не найдена в блокчейне. Пожалуйста, убедитесь, что вы отправили перевод с правильным комментарием (ID заказа).'
        });
      }
    }

    // 2. Update order status to PAYMENT_CLAIMED
    if (receipt_url) {
      await db.updateOrderReceiptAndStatus(order_id, receipt_url, 'PAYMENT_CLAIMED');
    } else {
      await db.updateOrderStatus(order_id, 'PAYMENT_CLAIMED');
    }

    // 3. Notify Creator/Admin via Telegram Bot
    const buyerName = buyer ? `@${buyer.username || 'user'}` : `ID: ${order.buyer_tg_id}`;
    
    // Simple language detection based on buyer language if available
    const isRussian = (buyer?.payment_details as any)?.lang === 'en' ? false : true;

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

      const isFree = Number(price) === 0;

      if (isFree) {
        messageText = isProductRussian
          ? `🎁 *Запрос на выдачу бесплатного товара/услуги!* \n\nПокупатель *${buyerName}* хочет получить товар/услугу *"${product.title}"* бесплатно. Подтвердите выдачу товара.`
          : `🎁 *Free Item/Service Request!* \n\nBuyer *${buyerName}* wants to receive *"${product.title}"* for free. Please approve and deliver.`;

        replyMarkup = {
          inline_keyboard: [
            [
              { text: isProductRussian ? '✅ Выдать бесплатно' : '✅ Approve & Deliver', callback_data: `approve_pay_${order_id}` },
              { text: isProductRussian ? '❌ Отклонить запрос' : '❌ Reject Request', callback_data: `reject_pay_${order_id}` }
            ]
          ]
        };
      } else {
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
    }

    if (receipt_url && receipt_url.startsWith('data:image')) {
      await sendTelegramPhoto(creator.telegram_id, receipt_url, messageText, replyMarkup);
    } else {
      await sendTelegramNotification(creator.telegram_id, messageText, replyMarkup);
    }

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
