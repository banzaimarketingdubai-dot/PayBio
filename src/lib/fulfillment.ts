import { db } from './supabase';
import { sendTelegramNotification, sendTelegramPhoto, sendTelegramDocument } from './telegram';

export async function fulfillOrder(orderId: string): Promise<boolean> {
  try {
    const order = await db.getOrderById(orderId);
    if (!order) {
      console.error(`Fulfillment error: Order ${orderId} not found.`);
      return false;
    }

    if (order.status === 'PAID' || order.status === 'approved') {
      console.warn(`Order ${orderId} is already paid/approved and fulfilled.`);
      return true;
    }

    // 1. Update order status in DB
    await db.updateOrderStatus(orderId, 'PAID');

    const product = order.product;
    if (!product) {
      console.error(`Fulfillment error: Product not found for order ${orderId}.`);
      return false;
    }

    const buyerTgId = order.buyer_tg_id;
    const creator = product.creator;

    // Resolve buyer username/handle or fallback
    let buyerName = `ID: ${buyerTgId}`;
    try {
      const buyerUser = await db.getUserByTelegramId(Number(buyerTgId));
      if (buyerUser && buyerUser.username) {
        buyerName = `@${buyerUser.username}`;
      } else {
        const { getTelegramUser } = await import('./telegram');
        const tgUser = await getTelegramUser(buyerTgId);
        if (tgUser) {
          if (tgUser.username) {
            buyerName = `@${tgUser.username}`;
          } else {
            const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
            buyerName = fullName || `ID: ${buyerTgId}`;
          }
        }
      }
    } catch (e) {
      console.error('Error resolving buyer name:', e);
    }

    // Format current date and time in Moscow timezone
    const now = new Date();
    const formattedDateTime = now.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' MSK';

    const isRussian = /[а-яА-Я]/.test(product.title) || /[а-яА-Я]/.test(product.description || '');
    const paymentMethod = order.payment_method || 'p2p';
    const tonAmount = (product.price_fiat / 7.0).toFixed(2);
    const creatorWallet = creator?.payment_details?.ton || 'No TON wallet configured';

    let buyerReceiptText = '';
    let creatorReceiptText = '';

    const isFree = paymentMethod === 'free' || Number(product.price_fiat) === 0;

    if (isFree) {
      buyerReceiptText = isRussian
        ? `🎁 *Бесплатный заказ подтвержден продавцом!*`
        : `🎁 *Free request approved by the seller!*`;
      creatorReceiptText = isRussian
        ? `🎁 *Выдача бесплатного товара подтверждена!* \n\n👤 *Получатель:* ${buyerName}\n📦 *Товар:* "${product.title}"\n📅 *Дата и время:* ${formattedDateTime}`
        : `🎁 *Free item delivery confirmed!* \n\n👤 *Recipient:* ${buyerName}\n📦 *Item:* "${product.title}"\n📅 *Date & Time:* ${formattedDateTime}`;
    } else if (paymentMethod.startsWith('ton')) {
      buyerReceiptText = `✅ *Платеж получен на кошелек.*`;
      creatorReceiptText = `Вы получили ${tonAmount} TON от ${buyerName} за продукт "${product.title}" на Ваш кошелек "${creatorWallet}"`;
    } else if (paymentMethod.startsWith('stars')) {
      buyerReceiptText = `✅ *Платеж получен на баланс Telegram.*`;
      creatorReceiptText = `Вы получили ${product.price_stars} Stars от ${buyerName} за продукт "${product.title}" на Ваш баланс Telegram`;
    } else {
      buyerReceiptText = `🎉 *Спасибо за покупку!*`;
      creatorReceiptText = `💰 *Продажа цифрового товара!* \n\n👤 *Покупатель:* ${buyerName}\n📦 *Товар:* "${product.title}"\n💵 *Сумма:* $${product.price_fiat}\n📅 *Дата и время:* ${formattedDateTime}`;
    }

    const productType = product.product_type || 'DIGITAL';
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
          `${buyerReceiptText} \n\nВы успешно приобрели книгу/файл: *"${product.title}"*.`,
          promoMarkup
        );
      } else {
        await sendTelegramNotification(
          buyerTgId,
          `${buyerReceiptText} \n\nВы успешно приобрели товар *"${product.title}"*.\n\n🔗 *Ссылка для скачивания:* ${contentUrl}`,
          promoMarkup
        );
      }

      // Notify Creator
      if (creator) {
        await sendTelegramNotification(
          creator.telegram_id,
          creatorReceiptText
        );
      }
    } else if (productType === 'VOUCHER') {
      const isPhysical = product.sub_type === 'PHYSICAL';

      if (isPhysical) {
        // Offline tickets & vouchers or Physical Goods
        const qrData = `pb_v_${Math.random().toString(36).substring(2, 15)}_${orderId.substring(0, 8)}`;
        await db.createVoucher(orderId, String(buyerTgId), qrData);

        // Notify buyer to fill delivery details
        await sendTelegramNotification(
          buyerTgId,
          `${buyerReceiptText} \n\nВы успешно оплатили товар *"${product.title}"*.\n\nПожалуйста, откройте магазин в Telegram и заполните ваши адресные данные доставки, чтобы продавец мог отправить ваш заказ.`,
          promoMarkup
        );

        // Notify Creator
        if (creator) {
          const creatorVoucherText = isFree
            ? (isRussian
                ? `🎁 *Выдача бесплатного физического товара подтверждена!* \n\n👤 *Получатель:* ${buyerName}\n📦 *Товар:* "${product.title}"\n📅 *Дата и время:* ${formattedDateTime}\n\nПолучатель сейчас заполняет адресные данные доставки в приложении.`
                : `🎁 *Free physical item request approved!* \n\n👤 *Recipient:* ${buyerName}\n📦 *Item:* "${product.title}"\n📅 *Date & Time:* ${formattedDateTime}\n\nRecipient is now filling out shipping details in the app.`)
            : (paymentMethod.startsWith('ton') || paymentMethod.startsWith('stars')
                ? creatorReceiptText
                : `📦 *Оплата физического товара!* \n\n👤 *Покупатель:* ${buyerName}\n📦 *Товар:* "${product.title}"\n💵 *Сумма:* $${product.price_fiat} (~${product.price_stars} Stars)\n📅 *Дата и время:* ${formattedDateTime}\n\nПокупатель сейчас заполняет адресные данные доставки в приложении.`);

          await sendTelegramNotification(
            creator.telegram_id,
            creatorVoucherText
          );
        }
      } else {
        // Retrieve ticket details
        const approvedCount = await db.getApprovedOrderCount(product.id);
        const ticketNumber = approvedCount;

        let maxQuantity: number | null = null;
        try {
          if (product.content_url) {
            const parsed = JSON.parse(product.content_url);
            if (parsed && typeof parsed.max_quantity === 'number') {
              maxQuantity = parsed.max_quantity;
            }
          }
        } catch (e) {
          // ignore
        }

        const sellerName = creator 
          ? (creator.username ? `@${creator.username}` : creator.profile_customization?.store_name || `ID: ${creator.telegram_id}`) 
          : 'Unknown';

        const qrPayloadObj = {
          seller: sellerName,
          ticket_no: ticketNumber,
          product: product.title,
          order_id: orderId,
          date: formattedDateTime
        };
        const qrData = JSON.stringify(qrPayloadObj);
        
        await db.createVoucher(orderId, String(buyerTgId), qrData);

        // Generate public QR code link with encoded QR payload
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

        let ticketDetailsText = isRussian
          ? `🎟️ *Ваш билет на событие/услугу* \n\n` +
            `📦 *Событие:* "${product.title}"\n` +
            `👤 *Организатор:* ${sellerName}\n` +
            `📅 *Дата и время покупки:* ${formattedDateTime}\n`
          : `🎟️ *Your Event/Service Ticket* \n\n` +
            `📦 *Event:* "${product.title}"\n` +
            `👤 *Organizer:* ${sellerName}\n` +
            `📅 *Purchase Date & Time:* ${formattedDateTime}\n`;

        if (maxQuantity !== null) {
          ticketDetailsText += isRussian
            ? `🔢 *Порядковый номер билета:* №${ticketNumber} (из ${maxQuantity})\n`
            : `🔢 *Ticket Number:* No. ${ticketNumber} (out of ${maxQuantity})\n`;
        }

        ticketDetailsText += isRussian
          ? `\nПредъявите QR-код выше организатору для сканирования и подтверждения входа.`
          : `\nPresent the QR code above to the organizer for scanning and entry confirmation.`;

        await sendTelegramPhoto(
          buyerTgId,
          qrUrl,
          ticketDetailsText,
          promoMarkup
        );

        // Notify Creator
        if (creator) {
          let creatorVoucherTicketText = isFree
            ? (isRussian
                ? `🎁 *Выдача бесплатного билета подтверждена!* \n\n👤 *Получатель:* ${buyerName}\n📦 *Событие:* "${product.title}"\n📅 *Дата и время:* ${formattedDateTime}\n\n`
                : `🎁 *Free ticket request approved!* \n\n👤 *Recipient:* ${buyerName}\n📦 *Event:* "${product.title}"\n📅 *Date & Time:* ${formattedDateTime}\n\n`)
            : (paymentMethod.startsWith('ton') || paymentMethod.startsWith('stars')
                ? creatorReceiptText
                : `🎟️ *Продажа билета!* \n\n👤 *Покупатель:* ${buyerName}\n📦 *Событие:* "${product.title}"\n💵 *Сумма:* $${product.price_fiat} (~${product.price_stars} Stars)\n📅 *Дата и время:* ${formattedDateTime}\n\n`);

          if (maxQuantity !== null) {
            creatorVoucherTicketText += isRussian
              ? `🔢 *Порядковый номер билета:* №${ticketNumber} (из ${maxQuantity})\n\n`
              : `🔢 *Ticket Number:* No. ${ticketNumber} (out of ${maxQuantity})\n\n`;
          }

          creatorVoucherTicketText += isRussian
            ? `Ваучер успешно сгенерирован и отправлен покупателю.`
            : `Voucher successfully generated and sent to the buyer.`;

          await sendTelegramNotification(
            creator.telegram_id,
            creatorVoucherTicketText
          );
        }
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
          `${buyerReceiptText}\n\nВы успешно записались на консультацию: *"${product.title}"*.\n\n⏰ *Время:* ${formattedTime}\n🔗 [Добавить в Google Календарь](${gCalUrl})\n\nОрганизатор свяжется с вами или предоставит ссылку на звонок ближе к назначенному времени.`,
          promoMarkup
        );

        if (creator) {
          const creatorBookingText = isFree
            ? (isRussian
                ? `🎁 *Бронирование бесплатной консультации подтверждено!* \n\n👤 *Получатель:* ${buyerName}\n📦 *Услуга:* "${product.title}"\n📅 *Дата и время:* ${formattedDateTime}\n⏰ *Забронированное время:* ${formattedTime}\n🔗 [Добавить в Google Календарь](${gCalUrl})`
                : `🎁 *Free booking request approved!* \n\n👤 *Recipient:* ${buyerName}\n📦 *Service:* "${product.title}"\n📅 *Date & Time:* ${formattedDateTime}\n⏰ *Booked Slot:* ${formattedTime}\n🔗 [Add to Google Calendar](${gCalUrl})`)
            : (paymentMethod.startsWith('ton') || paymentMethod.startsWith('stars')
                ? creatorReceiptText + `\n⏰ *Забронированное время:* ${formattedTime}`
                : `📅 *Новая запись на консультацию!* \n\n👤 *Покупатель:* ${buyerName}\n📦 *Услуга:* "${product.title}"\n💵 *Сумма:* $${product.price_fiat} (~${product.price_stars} Stars)\n📅 *Дата и время:* ${formattedDateTime}\n⏰ *Забронированное время:* ${formattedTime}\n🔗 [Добавить в Google Календарь](${gCalUrl})`);

          await sendTelegramNotification(
            creator.telegram_id,
            creatorBookingText
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
