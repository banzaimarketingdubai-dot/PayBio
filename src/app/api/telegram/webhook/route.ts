import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { extractProductFromText } from '@/lib/gemini';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    set_ton_prompt: '👛 To update your TON wallet address, please send a message starting with `/ton` followed by your address.\n\nExample:\n`/ton UQBz951...`',
    set_p2p_prompt: '💳 To update your direct P2P card details, please send a message starting with `/p2p` followed by your bank & card info.\n\nExample:\n`/p2p Visa 4321-1234-5678-9012 (John D.)`',
    create_info: '🚀 *How to Create a Storefront:*\n\n1. Send me any digital file (e.g. PDF, guide, eBook, archive).\n2. I will save it as a pending asset.\n3. Send me a description and price like: *"Sell my crypto guide for $10"*.\n4. I will use AI to extract the title, description, and price and generate your storefront link!',
    welcome: '✨ *Welcome to PayBio, @{username}!* \n\nPayBio is the fastest AI-powered storefront for digital assets inside Telegram.\n\n' +
      '👛 *TON Wallet:* `{ton}`\n' +
      '💳 *Card/P2P Details:* `{p2p}`\n\n' +
      '✏️ *Customization Commands:*\n' +
      '• `/name <New Name>` - Set store name\n' +
      '• `/desc <New Description>` - Set store description\n' +
      '• `/youtube <URL>` - Add YouTube link\n' +
      '• `/instagram <URL>` - Add Instagram link\n' +
      '• `/tiktok <URL>` - Add TikTok link\n' +
      '• `/vk <URL>` - Add VKontakte link\n' +
      '• `/max <URL>` - Add Max (X) link\n\n' +
      '📸 *Images:*\n' +
      'Send any photo directly to update store visuals (Avatar, Banner, or Product Cover).\n\n' +
      'Use the options below to configure your payment details or learn how to create your storefront.',
    set_ton_btn: '👛 Set TON Wallet',
    set_p2p_btn: '💳 Set P2P Details',
    create_info_btn: '🚀 How to Create a Product',
    open_storefront_btn: '🏪 Open Web Storefront',
    no_products: '❌ You don\'t have any products yet! Send me a PDF file to get started.',
    your_products: '✨ *Your Storefront Products:*\n\n',
    ton_updated: '✅ *TON Wallet updated successfully!*\n`{wallet}`',
    p2p_updated: '✅ *P2P Card details updated successfully!*\n`{cardInfo}`',
    file_received: '📥 *File Received:* `{fileName}`\n\n' +
      'Now send me a description and price for this file to generate your storefront.\n\n' +
      '*Example:* \n"Sell my comprehensive crypto trading checklist for $9.99"',
    store_generated: '🏪 *Storefront Generated!* \n\n' +
      '🏷️ *Title:* {title}\n' +
      '📝 *Description:* {description}\n' +
      '💵 *Price:* ${priceFiat} (~{priceStars} Stars)\n\n' +
      '🔗 *Your store link:* \n{deepLink}\n\n' +
      'Put this link in your social media bio. When customers pay, their product will be delivered automatically!',
    photo_received: '📸 *Photo Received!*\n\nWhat would you like to set this image as for your store?',
    set_avatar_btn: '👤 Set as Store Avatar',
    set_banner_btn: '🖼️ Set as Store Banner',
    set_cover_btn: '📦 Set as Product Cover',
    avatar_updated: '✅ *Store avatar updated successfully!*',
    banner_updated: '✅ *Store banner updated successfully!*',
    cover_updated: '✅ *Product cover image set successfully!*\n\nThe next product card you create will use this image cover.',
    name_updated: '✅ *Store name updated successfully!*\n`{name}`',
    desc_updated: '✅ *Store description updated successfully!*\n`{desc}`',
    youtube_updated: '✅ *YouTube link updated successfully!*\n`{url}`',
    instagram_updated: '✅ *Instagram link updated successfully!*\n`{url}`',
    tiktok_updated: '✅ *TikTok link updated successfully!*\n`{url}`',
    vk_updated: '✅ *VK link updated successfully!*\n`{url}`',
    max_updated: '✅ *Max/Twitter link updated successfully!*\n`{url}`',
  },
  ru: {
    set_ton_prompt: '👛 Чтобы обновить адрес TON кошелька, отправьте сообщение, начинающееся с `/ton`, а затем укажите адрес кошелька.\n\nПример:\n`/ton UQBz951...`',
    set_p2p_prompt: '💳 Чтобы обновить реквизиты карты для прямых P2P платежей, отправьте сообщение, начинающееся с `/p2p`, а затем укажите реквизиты.\n\nПример:\n`/p2p Сбербанк 4321-1234-5678-9012 (Иван И.)`',
    create_info: '🚀 *Как создать магазин цифровых товаров:*\n\n1. Отправьте мне любой цифровой файл (например, PDF, руководство, книгу, архив).\n2. Я сохраню его как временный ресурс.\n3. Отправьте мне описание и цену: *"Продать руководство по крипте за 10$"*.\n4. Наш ИИ извлечет название, описание, цену и создаст ссылку на ваш магазин!',
    welcome: '✨ *Добро пожаловать в PayBio, @{username}!* \n\nPayBio — это самый быстрый ИИ-магазин для продажи цифровых активов прямо в Telegram.\n\n' +
      '👛 *TON Кошелек:* `{ton}`\n' +
      '💳 *Карта/P2P реквизиты:* `{p2p}`\n\n' +
      '✏️ *Команды персонализации:*\n' +
      '• `/name <Новое название>` - Задать название магазина\n' +
      '• `/desc <Новое описание>` - Задать описание магазина\n' +
      '• `/youtube <URL>` - Добавить ссылку на YouTube\n' +
      '• `/instagram <URL>` - Добавить ссылку на Instagram\n' +
      '• `/tiktok <URL>` - Добавить ссылку на TikTok\n' +
      '• `/vk <URL>` - Добавить ссылку на ВКонтакте\n' +
      '• `/max <URL>` - Добавить ссылку на Max (X)\n\n' +
      '📸 *Изображения:*\n' +
      'Отправьте любое фото напрямую, чтобы обновить аватар, баннер или задать обложку товара.\n\n' +
      'Используйте меню ниже, чтобы настроить реквизиты или узнать, как создать товар.',
    set_ton_btn: '👛 Привязать TON',
    set_p2p_btn: '💳 Привязать карту',
    create_info_btn: '🚀 Инструкция создания',
    open_storefront_btn: '🏪 Открыть веб-витрину',
    no_products: '❌ У вас пока нет созданных товаров! Отправьте мне PDF-файл, чтобы начать.',
    your_products: '✨ *Товары вашего магазина:*\n\n',
    ton_updated: '✅ *TON Кошелек успешно обновлен!*\n`{wallet}`',
    p2p_updated: '✅ *Карта/Реквизиты успешно обновлены!*\n`{cardInfo}`',
    file_received: '📥 *Файл успешно получен:* `{fileName}`\n\n' +
      'Теперь отправьте мне текстовое описание и желаемую цену, чтобы сгенерировать витрину.\n\n' +
      '*Пример:* \n"Продаю пошаговый чеклист по торговле криптой за 500 рублей"',
    store_generated: '🏪 *Витрина сгенерирована!* \n\n' +
      '🏷️ *Название:* {title}\n' +
      '📝 *Описание:* {description}\n' +
      '💵 *Цена:* ${priceFiat} (~{priceStars} Stars)\n\n' +
      '🔗 *Ссылка на ваш товар:* \n{deepLink}\n\n' +
      'Разместите эту ссылку в описании профиля соцсетей. Покупатели получат файл сразу после оплаты!',
    photo_received: '📸 *Фотография успешно получена!*\n\nКак вы хотите использовать это изображение?',
    set_avatar_btn: '👤 Сделать аватаром',
    set_banner_btn: '🖼️ Сделать баннером',
    set_cover_btn: '📦 Обложка для товара',
    avatar_updated: '✅ *Аватар магазина успешно обновлен!*',
    banner_updated: '✅ *Баннер магазина успешно обновлен!*',
    cover_updated: '✅ *Обложка товара успешно задана!*\n\nСледующий созданный вами товар будет использовать это изображение.',
    name_updated: '✅ *Название магазина успешно обновлено!*\n`{name}`',
    desc_updated: '✅ *Описание магазина успешно обновлено!*\n`{desc}`',
    youtube_updated: '✅ *Ссылка на YouTube успешно обновлена!*\n`{url}`',
    instagram_updated: '✅ *Ссылка на Instagram успешно обновлена!*\n`{url}`',
    tiktok_updated: '✅ *Ссылка на TikTok успешно обновлена!*\n`{url}`',
    vk_updated: '✅ *Ссылка на VK успешно обновлена!*\n`{url}`',
    max_updated: '✅ *Ссылка на Max/Twitter успешно обновлена!*\n`{url}`',
  }
};

async function tgApi(method: string, body: any) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram Bot API Error (${method}):`, err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const update = await request.json();
    console.log('Received Telegram update:', JSON.stringify(update));

    // Handle Pre Checkout Query (required for Telegram Stars payments to complete)
    if (update.pre_checkout_query) {
      const pq = update.pre_checkout_query;
      await tgApi('answerPreCheckoutQuery', {
        pre_checkout_query_id: pq.id,
        ok: true
      });
      return NextResponse.json({ ok: true });
    }

    // Handle Callback Query (inline buttons)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;
      const userId = cb.from.id;
      const langCode = cb.from.language_code?.toLowerCase() || 'en';
      const lang = langCode.startsWith('ru') ? 'ru' : 'en';
      const t = TRANSLATIONS[lang];

      let creator = await db.getUserByTelegramId(userId);
      if (!creator) {
        creator = await db.upsertUser(userId, cb.from.username || null);
      }

      if (data === 'set_ton') {
        await tgApi('sendMessage', {
          chat_id: chatId,
          text: t.set_ton_prompt,
          parse_mode: 'Markdown',
        });
      } else if (data === 'set_p2p') {
        await tgApi('sendMessage', {
          chat_id: chatId,
          text: t.set_p2p_prompt,
          parse_mode: 'Markdown',
        });
      } else if (data === 'create_info') {
        await tgApi('sendMessage', {
          chat_id: chatId,
          text: t.create_info,
          parse_mode: 'Markdown',
        });
      } else if (data.startsWith('set_avatar:')) {
        const fileId = data.split(':')[1];
        const currentCustom = creator.profile_customization || {};
        const updatedCustom = { ...currentCustom, avatar_url: `/api/telegram/file?file_id=${fileId}` };
        await db.updateUserProfile(creator.id, updatedCustom);

        await tgApi('sendMessage', {
          chat_id: chatId,
          text: t.avatar_updated,
          parse_mode: 'Markdown',
        });
      } else if (data.startsWith('set_banner:')) {
        const fileId = data.split(':')[1];
        const currentCustom = creator.profile_customization || {};
        const updatedCustom = { ...currentCustom, banner_url: `/api/telegram/file?file_id=${fileId}` };
        await db.updateUserProfile(creator.id, updatedCustom);

        await tgApi('sendMessage', {
          chat_id: chatId,
          text: t.banner_updated,
          parse_mode: 'Markdown',
        });
      } else if (data.startsWith('set_cover:')) {
        const fileId = data.split(':')[1];
        const currentDetails = creator.payment_details || {};
        const newDetails = { ...currentDetails, pending_cover_id: fileId };
        await db.upsertUser(userId, cb.from.username || null, newDetails);

        await tgApi('sendMessage', {
          chat_id: chatId,
          text: t.cover_updated,
          parse_mode: 'Markdown',
        });
      }

      await tgApi('answerCallbackQuery', { callback_query_id: cb.id });
      return NextResponse.json({ ok: true });
    }

    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || null;
    const text = message.text;
    const langCode = message.from.language_code?.toLowerCase() || 'en';
    const lang = langCode.startsWith('ru') ? 'ru' : 'en';
    const t = TRANSLATIONS[lang];

    // Handle Successful Payment
    if (message.successful_payment) {
      const sp = message.successful_payment;
      const payload = sp.invoice_payload;
      console.log('Received successful payment for payload:', payload);

      if (payload.startsWith('premium_user_id:')) {
        const premiumUserId = payload.split(':')[1];
        await db.updateUserPremium(premiumUserId, true);
        await tgApi('sendMessage', {
          chat_id: chatId,
          text: lang === 'ru' 
            ? '⭐ *Поздравляем! Ваш статус Premium успешно активирован!* \n\nТеперь вам доступны: \n- Своё оформление аватара и баннера\n- Удаление водяного знака\n- ИИ-генерация обложек товаров\n- Добавление нескольких карт и TON кошельков в настройках оплаты!'
            : '⭐ *Congratulations! Your Premium status is active!* \n\nNow you can:\n- Use custom avatars & banners\n- Remove the storefront watermark\n- Generate AI cover images instantly\n- Configure multiple cards & TON wallets in payment settings!',
          parse_mode: 'Markdown',
        });
      } else {
        // Product payment, payload is order ID (UUID)
        try {
          const order = await db.getOrderById(payload);
          if (order) {
            await db.updateOrderStatus(payload, 'approved');
            const product = order.product;
            if (product) {
              if (product.content_url.startsWith('telegram_file_id:')) {
                const fileId = product.content_url.replace('telegram_file_id:', '');
                await tgApi('sendDocument', {
                  chat_id: chatId,
                  document: fileId,
                  caption: lang === 'ru'
                    ? `🎉 Спасибо за покупку товара "${product.title}"!`
                    : `🎉 Thank you for purchasing "${product.title}"!`,
                });
              } else {
                await tgApi('sendMessage', {
                  chat_id: chatId,
                  text: lang === 'ru'
                    ? `🎉 Спасибо за покупку товара "${product.title}"!\n\nСкачать файл: ${product.content_url}`
                    : `🎉 Thank you for purchasing "${product.title}"!\n\nDownload file: ${product.content_url}`,
                });
              }
            }
          }
        } catch (err) {
          console.error('Webhook product payment fulfillment error:', err);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Check if user exists, or create them
    let creator = await db.getUserByTelegramId(userId);
    if (!creator) {
      creator = await db.upsertUser(userId, username);
    } else if (username && creator.username !== username) {
      // Sync username
      creator = await db.upsertUser(userId, username, creator.payment_details);
    }

    // 1. Handle commands
    if (text?.startsWith('/start')) {
      const getMe = await tgApi('getMe', {});
      const botUser = getMe?.result?.username || 'PaybioBot';

      const customName = creator.profile_customization?.store_name || username || 'creator';
      const welcomeMsg = t.welcome
        .replace('{username}', customName)
        .replace('{ton}', creator.payment_details?.ton || (lang === 'ru' ? 'Не установлено' : 'Not set'))
        .replace('{p2p}', creator.payment_details?.p2p || (lang === 'ru' ? 'Не установлена' : 'Not set'));

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: welcomeMsg,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: t.set_ton_btn, callback_data: 'set_ton' },
              { text: t.set_p2p_btn, callback_data: 'set_p2p' }
            ],
            [
              { text: t.create_info_btn, callback_data: 'create_info' }
            ],
            [
              { text: t.open_storefront_btn, url: `https://t.me/${botUser}/app` }
            ]
          ]
        }
      });
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/my_store')) {
      const products = await db.getProductsByCreatorId(creator.id);
      const getMe = await tgApi('getMe', {});
      const botUser = getMe?.result?.username || 'PaybioBot';

      if (!products || products.length === 0) {
        await tgApi('sendMessage', {
          chat_id: chatId,
          text: t.no_products,
        });
        return NextResponse.json({ ok: true });
      }

      let storeText = t.your_products;
      products.forEach((p: any, idx: number) => {
        storeText += `${idx + 1}. *${p.title}* - $${p.price_fiat} (${p.price_stars} Stars)\n`;
        storeText += `👉 Link: https://t.me/${botUser}/app?startapp=${p.id}\n\n`;
      });

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: storeText,
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    // 2. Handle payment details updates
    if (text?.startsWith('/ton ')) {
      const wallet = text.slice(5).trim();
      const currentDetails = creator.payment_details || {};
      const newDetails = { ...currentDetails, ton: wallet };
      await db.upsertUser(userId, username, newDetails);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.ton_updated.replace('{wallet}', wallet),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/p2p ')) {
      const cardInfo = text.slice(5).trim();
      const currentDetails = creator.payment_details || {};
      const newDetails = { ...currentDetails, p2p: cardInfo };
      await db.upsertUser(userId, username, newDetails);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.p2p_updated.replace('{cardInfo}', cardInfo),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    // 3. Handle Storefront Customization Commands
    if (text?.startsWith('/name ')) {
      const name = text.slice(6).trim();
      const currentCustom = creator.profile_customization || {};
      const updatedCustom = { ...currentCustom, store_name: name };
      await db.updateUserProfile(creator.id, updatedCustom);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.name_updated.replace('{name}', name),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/desc ')) {
      const desc = text.slice(6).trim();
      const currentCustom = creator.profile_customization || {};
      const updatedCustom = { ...currentCustom, store_description: desc };
      await db.updateUserProfile(creator.id, updatedCustom);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.desc_updated.replace('{desc}', desc),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/youtube ')) {
      const url = text.slice(9).trim();
      const currentCustom = creator.profile_customization || {};
      const currentSocials = currentCustom.social_links || {};
      const updatedSocials = { ...currentSocials, youtube: url };
      const updatedCustom = { ...currentCustom, social_links: updatedSocials };
      await db.updateUserProfile(creator.id, updatedCustom);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.youtube_updated.replace('{url}', url),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/instagram ')) {
      const url = text.slice(11).trim();
      const currentCustom = creator.profile_customization || {};
      const currentSocials = currentCustom.social_links || {};
      const updatedSocials = { ...currentSocials, instagram: url };
      const updatedCustom = { ...currentCustom, social_links: updatedSocials };
      await db.updateUserProfile(creator.id, updatedCustom);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.instagram_updated.replace('{url}', url),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/tiktok ')) {
      const url = text.slice(8).trim();
      const currentCustom = creator.profile_customization || {};
      const currentSocials = currentCustom.social_links || {};
      const updatedSocials = { ...currentSocials, tiktok: url };
      const updatedCustom = { ...currentCustom, social_links: updatedSocials };
      await db.updateUserProfile(creator.id, updatedCustom);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.tiktok_updated.replace('{url}', url),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/vk ')) {
      const url = text.slice(4).trim();
      const currentCustom = creator.profile_customization || {};
      const currentSocials = currentCustom.social_links || {};
      const updatedSocials = { ...currentSocials, vk: url };
      const updatedCustom = { ...currentCustom, social_links: updatedSocials };
      await db.updateUserProfile(creator.id, updatedCustom);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.vk_updated.replace('{url}', url),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/max ') || text?.startsWith('/twitter ')) {
      const prefixLen = text.startsWith('/max ') ? 5 : 9;
      const url = text.slice(prefixLen).trim();
      const currentCustom = creator.profile_customization || {};
      const currentSocials = currentCustom.social_links || {};
      const updatedSocials = { ...currentSocials, max: url };
      const updatedCustom = { ...currentCustom, social_links: updatedSocials };
      await db.updateUserProfile(creator.id, updatedCustom);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.max_updated.replace('{url}', url),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    // 4. Handle photos upload
    if (message.photo) {
      const photoArray = message.photo;
      const largestPhoto = photoArray[photoArray.length - 1];
      const fileId = largestPhoto.file_id;

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.photo_received,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: t.set_avatar_btn, callback_data: `set_avatar:${fileId}` },
              { text: t.set_banner_btn, callback_data: `set_banner:${fileId}` }
            ],
            [
              { text: t.set_cover_btn, callback_data: `set_cover:${fileId}` }
            ]
          ]
        }
      });
      return NextResponse.json({ ok: true });
    }

    // 5. Handle document upload (PDF, etc.)
    if (message.document) {
      const doc = message.document;
      const fileId = doc.file_id;
      const fileName = doc.file_name || 'digital_product.pdf';

      const currentDetails = creator.payment_details || {};
      const newDetails = { 
        ...currentDetails, 
        pending_file_id: fileId,
        pending_file_name: fileName
      };

      await db.upsertUser(userId, username, newDetails);

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: t.file_received.replace('{fileName}', fileName),
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    // 6. Handle storefront generation text description
    if (text) {
      await tgApi('sendChatAction', { chat_id: chatId, action: 'typing' });

      // Check if user has a pending file uploaded
      const pendingFileId = creator.payment_details?.pending_file_id;
      const contentUrl = pendingFileId ? `telegram_file_id:${pendingFileId}` : 'https://example.com/digital-asset-placeholder.pdf';

      // Check if user has a pending product cover uploaded
      const pendingCoverId = creator.payment_details?.pending_cover_id;
      const coverUrl = pendingCoverId ? `/api/telegram/file?file_id=${pendingCoverId}` : undefined;

      // Parse with Gemini
      const extracted = await extractProductFromText(text);

      // Create product in database
      const product = await db.createProduct(
        creator.id,
        extracted.title,
        extracted.description,
        extracted.price_fiat,
        extracted.price_stars,
        contentUrl,
        coverUrl
      );

      // Clear pending file and pending cover from user metadata
      const currentDetails = creator.payment_details || {};
      const newDetails = { ...currentDetails };
      delete newDetails.pending_file_id;
      delete newDetails.pending_file_name;
      delete newDetails.pending_cover_id;
      await db.upsertUser(userId, username, newDetails);

      const getMe = await tgApi('getMe', {});
      const botUser = getMe?.result?.username || 'PaybioBot';
      const deepLink = `https://t.me/${botUser}/app?startapp=${product.id}`;

      const responseText = t.store_generated
        .replace('{title}', product.title)
        .replace('{description}', product.description || '')
        .replace('{priceFiat}', String(product.price_fiat))
        .replace('{priceStars}', String(product.price_stars))
        .replace('{deepLink}', deepLink);

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: t.open_storefront_btn, url: deepLink }
            ]
          ]
        }
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
