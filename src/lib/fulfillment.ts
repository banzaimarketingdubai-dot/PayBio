import { db } from './supabase';
import { sendTelegramNotification, sendTelegramPhoto, sendTelegramDocument } from './telegram';

export async function fulfillOrder(orderId: string): Promise<boolean> {
  try {
    const order = await db.getOrderById(orderId);
    if (!order) {
      console.error(`Fulfillment error: Order ${orderId} not found.`);
      return false;
    }

    if (order.status === 'approved') {
      console.warn(`Order ${orderId} is already approved and fulfilled.`);
      return true;
    }

    // 1. Update order status in DB
    await db.updateOrderStatus(orderId, 'approved');

    const product = order.product;
    if (!product) {
      console.error(`Fulfillment error: Product not found for order ${orderId}.`);
      return false;
    }

    const buyerTgId = order.buyer_tg_id;
    const creator = product.creator;

    const productType = product.product_type || 'DIGITAL';
    const isRussian = /[а-яА-Я]/.test(product.title) || /[а-яА-Я]/.test(product.description || '');
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

    if (productType === 'DIGITAL') {
      // Baseline baseline: PDF & private links
      const contentUrl = product.content_url;
      if (contentUrl.startsWith('telegram_file_id:')) {
        const fileId = contentUrl.slice(17);
        await sendTelegramDocument(
          buyerTgId,
          fileId,
          `🎉 *Спасибо за покупку!* \n\nВы успешно приобрели книгу/файл: *"${product.title}"*.`,
          promoMarkup
        );
      } else {
        await sendTelegramNotification(
          buyerTgId,
          `🎉 *Спасибо за покупку!* \n\nВы успешно приобрели товар *"${product.title}"*.\n\n🔗 *Ссылка для скачивания:* ${contentUrl}`,
          promoMarkup
        );
      }

      // Notify Creator
      if (creator) {
        await sendTelegramNotification(
          creator.telegram_id,
          `💰 *Продажа товара!* \n\nПользователь \`${buyerTgId}\` купил ваш цифровой товар *"${product.title}"* за $${product.price_fiat}.`
        );
      }
    } else if (productType === 'VOUCHER') {
      // Offline tickets & vouchers
      const qrData = `pb_v_${Math.random().toString(36).substring(2, 15)}_${orderId.substring(0, 8)}`;
      await db.createVoucher(orderId, String(buyerTgId), qrData);

      // Generate public QR code link
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;

      await sendTelegramPhoto(
        buyerTgId,
        qrUrl,
        `🎟️ *Ваш билет готов!*\n\nВы успешно приобрели билет на услугу/событие: *"${product.title}"*.\n\nПредъявите этот QR-код организатору для сканирования и подтверждения входа.`,
        promoMarkup
      );

      // Notify Creator
      if (creator) {
        await sendTelegramNotification(
          creator.telegram_id,
          `🎟️ *Продажа билета!* \n\nПользователь \`${buyerTgId}\` купил билет *"${product.title}"* ($${product.price_fiat}). Ваучер успешно сгенерирован и отправлен покупателю.`
        );
      }
    } else if (productType === 'BOOKING') {
      // Consultation Booking slots
      // Fetch booking associated with this order
      const mockDb = db.isMock ? (global as any).memoryDb : null;
      let booking: any = null;

      if (db.isMock) {
        const memoryDb = (global as any).memoryDb || { bookings: [] };
        booking = memoryDb.bookings.find((b: any) => b.order_id === orderId);
      } else {
        const { data } = await (db as any).supabaseAdmin
          .from('bookings')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle();
        booking = data;
      }

      if (booking) {
        await db.updateBookingStatus(booking.id, 'SCHEDULED');
        
        const start = new Date(booking.slot_start_time);
        const end = new Date(booking.slot_end_time);
        const formattedTime = `${start.toLocaleDateString('ru-RU')} ${start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

        // Generate Google Calendar template link
        const startUTC = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endUTC = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(product.title)}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent('Бронирование консультации через бот PayBio.')}`;

        await sendTelegramNotification(
          buyerTgId,
          `📅 *Запись подтверждена!*\n\nВы успешно записались на консультацию: *"${product.title}"*.\n\n⏰ *Время:* ${formattedTime}\n🔗 [Добавить в Google Календарь](${gCalUrl})\n\nОрганизатор свяжется с вами или предоставит ссылку на звонок ближе к назначенному времени.`,
          promoMarkup
        );

        if (creator) {
          await sendTelegramNotification(
            creator.telegram_id,
            `📅 *Новая запись на консультацию!* \n\nПокупатель \`${buyerTgId}\` забронировал слот для *"${product.title}"*.\n\n⏰ *Время:* ${formattedTime}\n🔗 [Добавить в Google Календарь](${gCalUrl})`
          );
        }
      }
    }

    return true;
  } catch (err) {
    console.error(`Fulfillment processing error for order ${orderId}:`, err);
    return false;
  }
}
