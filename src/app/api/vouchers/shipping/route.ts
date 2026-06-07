import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, delivery_data } = body;

    if (!order_id || !delivery_data) {
      return NextResponse.json(
        { error: 'Missing order_id or delivery_data parameter.' },
        { status: 400 }
      );
    }

    const { fullName, phone, shippingMethod, addressOrBranch } = delivery_data;
    if (!fullName || !phone || !shippingMethod || !addressOrBranch) {
      return NextResponse.json(
        { error: 'Missing required shipping fields (fullName, phone, shippingMethod, addressOrBranch).' },
        { status: 400 }
      );
    }

    // 1. Fetch order details
    const order = await db.getOrderById(order_id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const product = order.product;
    if (!product) {
      return NextResponse.json({ error: 'Associated product not found.' }, { status: 404 });
    }

    // 2. Update voucher delivery data
    let voucher = await db.getVoucherByOrderId(order_id);
    if (!voucher) {
      // If the webhook hasn't processed and created a voucher yet, let's create it now!
      // This provides fallback robustness for local testing or slow webhooks.
      const qrData = `pb_v_${Math.random().toString(36).substring(2, 15)}_${order_id.substring(0, 8)}`;
      voucher = await db.createVoucher(order_id, String(order.buyer_tg_id), qrData);
    }

    await db.updateVoucherDeliveryData(order_id, delivery_data);

    // 3. Update order status to PAID_PENDING_SHIPPING
    await db.updateOrderStatus(order_id, 'PAID_PENDING_SHIPPING');

    // 4. Notify creator via Telegram
    if (product.creator) {
      const creatorTgId = Number(product.creator.telegram_id);
      
      // Resolve buyer name/handle
      let buyerName = `ID: ${order.buyer_tg_id}`;
      try {
        const buyerUser = await db.getUserByTelegramId(Number(order.buyer_tg_id));
        if (buyerUser && buyerUser.username) {
          buyerName = `@${buyerUser.username}`;
        }
      } catch {}

      const isRussian = /[а-яА-Я]/.test(product.title) || /[а-яА-Я]/.test(product.description || '');
      
      const message = isRussian
        ? `📦 *Данные доставки получены!* \n\n` +
          `👤 *Покупатель:* ${buyerName}\n` +
          `📦 *Товар:* "${product.title}"\n` +
          `🚚 *Способ доставки:* ${shippingMethod}\n` +
          `📍 *Адрес / Пункт:* ${addressOrBranch}\n` +
          `📞 *Телефон:* ${phone}\n` +
          `👤 *ФИО получателя:* ${fullName}\n\n` +
          `Откройте панель управления, чтобы увидеть заказ и отправить его.`
        : `📦 *Shipping Details Submitted!* \n\n` +
          `👤 *Buyer:* ${buyerName}\n` +
          `📦 *Product:* "${product.title}"\n` +
          `🚚 *Shipping Method:* ${shippingMethod}\n` +
          `📍 *Address / Branch:* ${addressOrBranch}\n` +
          `📞 *Phone:* ${phone}\n` +
          `👤 *Full Name:* ${fullName}\n\n` +
          `Open the Creator Dashboard to view this order and mark it as shipped.`;

      await sendTelegramNotification(creatorTgId, message);
    }

    return NextResponse.json({
      success: true,
      status: 'PAID_PENDING_SHIPPING',
    });
  } catch (error: any) {
    console.error('Shipping submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
