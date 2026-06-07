import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, tracking_number } = body;

    if (!order_id || !tracking_number) {
      return NextResponse.json(
        { error: 'Missing order_id or tracking_number parameter.' },
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

    // 2. Fetch and update voucher delivery data with tracking number
    let voucher = await db.getVoucherByOrderId(order_id);
    const deliveryData = voucher?.delivery_data || {
      fullName: 'Buyer',
      phone: '',
      shippingMethod: 'Courier',
      addressOrBranch: 'Provided Address'
    };
    
    const updatedDeliveryData = {
      ...deliveryData,
      trackingNumber: tracking_number
    };

    if (!voucher) {
      // Robust fallback if no voucher was created yet
      const qrData = `pb_v_${Math.random().toString(36).substring(2, 15)}_${order_id.substring(0, 8)}`;
      voucher = await db.createVoucher(order_id, String(order.buyer_tg_id), qrData);
    }

    await db.updateVoucherDeliveryData(order_id, updatedDeliveryData);

    // 3. Update order status to SHIPPED
    await db.updateOrderStatus(order_id, 'SHIPPED');

    // 4. Notify buyer via Telegram with the tracking number
    const buyerTgId = Number(order.buyer_tg_id);
    const isRussian = /[а-яА-Я]/.test(product.title) || /[а-яА-Я]/.test(product.description || '');

    const message = isRussian
      ? `🚚 *Ваш заказ отправлен!* \n\n` +
        `📦 *Товар:* "${product.title}"\n` +
        `🚚 *Способ доставки:* ${deliveryData.shippingMethod || '—'}\n` +
        `📍 *Куда:* ${deliveryData.addressOrBranch || '—'}\n` +
        `🔢 *Трек-номер:* \`${tracking_number}\`\n\n` +
        `Вы можете отслеживать отправление по указанному трек-номеру. Спасибо за покупку!`
      : `🚚 *Your order has been shipped!* \n\n` +
        `📦 *Product:* "${product.title}"\n` +
        `🚚 *Shipping Method:* ${deliveryData.shippingMethod || '—'}\n` +
        `📍 *Destination:* ${deliveryData.addressOrBranch || '—'}\n` +
        `🔢 *Tracking Number:* \`${tracking_number}\`\n\n` +
        `You can track your package using the tracking number above. Thank you for your purchase!`;

    const promoMarkup = {
      inline_keyboard: [
        [
          {
            text: isRussian 
              ? '🤖 Начать продавать свои цифровые товары' 
              : '🤖 Start selling your own digital products',
            url: 'https://t.me/PaybioBot'
          }
        ]
      ]
    };

    await sendTelegramNotification(buyerTgId, message, promoMarkup);

    return NextResponse.json({
      success: true,
      status: 'SHIPPED',
    });
  } catch (error: any) {
    console.error('Shipping order marker error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
