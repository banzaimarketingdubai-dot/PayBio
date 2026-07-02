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

    const product = order.product;
    if (!product) {
      console.error(`Fulfillment error: Product not found for order ${orderId}.`);
      return false;
    }

    const buyerTgId = order.buyer_tg_id;
    const creator = product.creator;

    // Check if gender balance is enabled
    let hasGenderBalance = false;
    let buyerGender: 'M' | 'F' | 'PAIR' | null = null;
    try {
      if (product.product_type === 'VOUCHER' || product.product_type === 'TICKET') {
        const parsed = JSON.parse(product.content_url);
        if (parsed && parsed.has_gender_balance) {
          hasGenderBalance = true;
        }
      }
    } catch {}

    if (hasGenderBalance && order.receipt_url) {
      try {
        const parsed = JSON.parse(order.receipt_url);
        if (parsed && parsed.gender) {
          buyerGender = parsed.gender;
        }
      } catch {
        if (order.receipt_url === 'M' || order.receipt_url === 'F' || order.receipt_url === 'PAIR') {
          buyerGender = order.receipt_url as any;
        }
      }
    }

    // 1. Update order status in DB
    await db.updateOrderStatus(orderId, 'PAID');

    if (hasGenderBalance) {
      await db.removeFromWaitingList(product.id, Number(buyerTgId));
      if (buyerGender && buyerGender !== 'PAIR') {
        checkAndNotifyWaitingList(product.id, buyerGender).catch(err => {
          console.error('Error in checkAndNotifyWaitingList:', err);
        });
      }
    }

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
    } else if (productType === 'VOUCHER' || productType === 'TICKET') {
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

        const isPairSelected = buyerGender === 'PAIR';

        if (isPairSelected) {
          const ticketNumber1 = ticketNumber;
          const ticketNumber2 = ticketNumber + 1;

          // Ticket 1: Male
          const qrPayloadObj1 = {
            seller: sellerName,
            ticket_no: ticketNumber1,
            product: product.title + ' (Мужской / Male)',
            order_id: orderId,
            gender: 'M',
            date: formattedDateTime
          };
          const qrData1 = JSON.stringify(qrPayloadObj1);
          await db.createVoucher(orderId, String(buyerTgId), qrData1);
          const qrUrl1 = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData1)}`;

          let ticketDetailsText1 = isRussian
            ? `🎟️ *Билет 1/2 (Мужской)* \n\n` +
              `📦 *Событие:* "${product.title}"\n` +
              `👤 *Организатор:* ${sellerName}\n` +
              `📅 *Дата и время покупки:* ${formattedDateTime}\n`
            : `🎟️ *Ticket 1/2 (Male)* \n\n` +
              `📦 *Event:* "${product.title}"\n` +
              `👤 *Organizer:* ${sellerName}\n` +
              `📅 *Purchase Date & Time:* ${formattedDateTime}\n`;
          if (maxQuantity !== null) {
            ticketDetailsText1 += isRussian
              ? `🔢 *Порядковый номер билета:* №${ticketNumber1} (из ${maxQuantity})\n`
              : `🔢 *Ticket Number:* No. ${ticketNumber1} (out of ${maxQuantity})\n`;
          }
          ticketDetailsText1 += isRussian
            ? `\nПредъявите QR-код выше организатору для сканирования и подтверждения входа (М).`
            : `\nPresent the QR code above to the organizer for scanning and entry confirmation (Male).`;

          await sendTelegramPhoto(buyerTgId, qrUrl1, ticketDetailsText1);

          // Ticket 2: Female
          const qrPayloadObj2 = {
            seller: sellerName,
            ticket_no: ticketNumber2,
            product: product.title + ' (Женский / Female)',
            order_id: orderId,
            gender: 'F',
            date: formattedDateTime
          };
          const qrData2 = JSON.stringify(qrPayloadObj2);
          await db.createVoucher(orderId, String(buyerTgId), qrData2);
          const qrUrl2 = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData2)}`;

          let ticketDetailsText2 = isRussian
            ? `🎟️ *Билет 2/2 (Женский)* \n\n` +
              `📦 *Событие:* "${product.title}"\n` +
              `👤 *Организатор:* ${sellerName}\n` +
              `📅 *Дата и время покупки:* ${formattedDateTime}\n`
            : `🎟️ *Ticket 2/2 (Female)* \n\n` +
              `📦 *Event:* "${product.title}"\n` +
              `👤 *Organizer:* ${sellerName}\n` +
              `📅 *Purchase Date & Time:* ${formattedDateTime}\n`;
          if (maxQuantity !== null) {
            ticketDetailsText2 += isRussian
              ? `🔢 *Порядковый номер билета:* №${ticketNumber2} (из ${maxQuantity})\n`
              : `🔢 *Ticket Number:* No. ${ticketNumber2} (out of ${maxQuantity})\n`;
          }
          ticketDetailsText2 += isRussian
            ? `\nПредъявите QR-код выше организатору для сканирования и подтверждения входа (Ж).`
            : `\nPresent the QR code above to the organizer for scanning and entry confirmation (Female).`;

          await sendTelegramPhoto(buyerTgId, qrUrl2, ticketDetailsText2, promoMarkup);

          // Notify Creator about Pair purchase
          if (creator) {
            const displayPriceFiat = product.price_fiat * 2;
            const displayPriceStars = product.price_stars * 2;
            let creatorVoucherTicketText = isFree
              ? (isRussian
                  ? `🎁 *Выдача бесплатного парного билета (М+Ж) подтверждена!* \n\n👤 *Получатель:* ${buyerName}\n📦 *Событие:* "${product.title}"\n📅 *Дата и время:* ${formattedDateTime}\n\n`
                  : `🎁 *Free pair ticket (M+F) request approved!* \n\n👤 *Recipient:* ${buyerName}\n📦 *Event:* "${product.title}"\n📅 *Date & Time:* ${formattedDateTime}\n\n`)
              : (paymentMethod.startsWith('ton') || paymentMethod.startsWith('stars')
                  ? `💳 *Оплата парного билета (М+Ж) получена!* \n\n👤 *Покупатель:* ${buyerName}\n📦 *Событие:* "${product.title}"\n💵 *Сумма:* $${displayPriceFiat} (~${displayPriceStars} Stars)\n📅 *Дата и время:* ${formattedDateTime}\n\n`
                  : `🎟️ *Продажа парного билета (М+Ж)!* \n\n👤 *Покупатель:* ${buyerName}\n📦 *Событие:* "${product.title}"\n💵 *Сумма:* $${displayPriceFiat} (~${displayPriceStars} Stars)\n📅 *Дата и время:* ${formattedDateTime}\n\n`);

            if (maxQuantity !== null) {
              creatorVoucherTicketText += isRussian
                ? `🔢 *Порядковые номера билетов:* №${ticketNumber1}, №${ticketNumber2} (из ${maxQuantity})\n\n`
                : `🔢 *Ticket Numbers:* No. ${ticketNumber1}, No. ${ticketNumber2} (out of ${maxQuantity})\n\n`;
            }

            creatorVoucherTicketText += isRussian
              ? `Оба ваучера успешно сгенерированы и отправлены покупателю.`
              : `Both vouchers successfully generated and sent to the buyer.`;

            await sendTelegramNotification(creator.telegram_id, creatorVoucherTicketText);
          }
        } else {
          // Normal single ticket delivery
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

async function checkAndNotifyWaitingList(productId: string, purchasedGender: 'M' | 'F') {
  try {
    const product = await db.getProductById(productId);
    if (!product) return;

    const { maleCount, femaleCount } = await db.getGenderCounts(productId);

    let unlockedGender: 'M' | 'F' | null = null;
    if (purchasedGender === 'F' && maleCount - femaleCount === 1) {
      unlockedGender = 'M';
    } else if (purchasedGender === 'M' && femaleCount - maleCount === 1) {
      unlockedGender = 'F';
    }

    if (unlockedGender) {
      const waitingList = await db.getWaitingList(productId, unlockedGender);
      if (waitingList && waitingList.length > 0) {
        const botUsername = 'PaybioBot';
        const storefrontUrl = `https://t.me/${botUsername}/app?startapp=${productId}`;

        const genderNameRu = unlockedGender === 'M' ? 'для мужчин' : 'для женщин';
        const genderNameEn = unlockedGender === 'M' ? 'for men' : 'for women';

        const textRu = `🔔 *Билеты снова доступны!* \n\nБаланс М/Ж восстановлен, и билеты ${genderNameRu} на событие *"${product.title}"* снова открыты для покупки! \n\nУспейте забронировать и приобрести билет по ссылке ниже:`;
        const textEn = `🔔 *Tickets are available again!* \n\nThe M/F balance has been restored, and tickets ${genderNameEn} for the event *"${product.title}"* are open for purchase! \n\nHurry up to check out and buy your ticket via the link below:`;

        const isRussian = /[а-яА-Я]/.test(product.title) || /[а-яА-Я]/.test(product.description || '');
        const messageText = isRussian ? textRu : textEn;

        const markup = {
          inline_keyboard: [
            [
              { text: isRussian ? '🎟️ Купить билет' : '🎟️ Buy Ticket', url: storefrontUrl }
            ]
          ]
        };

        await Promise.all(
          waitingList.map(async (entry: any) => {
            try {
              await sendTelegramNotification(entry.buyer_tg_id, messageText, markup);
            } catch (err) {
              console.error(`Failed to send waiting list notification to ${entry.buyer_tg_id}:`, err);
            }
          })
        );

        await Promise.all(
          waitingList.map(async (entry: any) => {
            try {
              await db.removeFromWaitingList(productId, entry.buyer_tg_id);
            } catch (err) {
              console.error(`Failed to remove ${entry.buyer_tg_id} from waiting list:`, err);
            }
          })
        );
      }
    }
  } catch (err) {
    console.error('Error in checkAndNotifyWaitingList:', err);
  }
}
