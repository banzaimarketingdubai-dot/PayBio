import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { extractProductFromText } from '@/lib/gemini';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

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

    if (!update.message) {
      // Check for callback query (button clicks)
      if (update.callback_query) {
        const cb = update.callback_query;
        const chatId = cb.message.chat.id;
        const data = cb.data;

        if (data === 'set_ton') {
          await tgApi('sendMessage', {
            chat_id: chatId,
            text: '👛 To update your TON wallet address, please send a message starting with `/ton` followed by your address.\n\nExample:\n`/ton UQBz951...`',
            parse_mode: 'Markdown',
          });
        } else if (data === 'set_p2p') {
          await tgApi('sendMessage', {
            chat_id: chatId,
            text: '💳 To update your direct P2P card details, please send a message starting with `/p2p` followed by your bank & card info.\n\nExample:\n`/p2p Visa 4321-1234-5678-9012 (John D.)`',
            parse_mode: 'Markdown',
          });
        } else if (data === 'create_info') {
          await tgApi('sendMessage', {
            chat_id: chatId,
            text: '🚀 *How to Create a Storefront:*\n\n1. Send me any digital file (e.g. PDF, guide, eBook, archive).\n2. I will save it as a pending asset.\n3. Send me a description and price like: *"Sell my crypto guide for $10"*.\n4. I will use AI to extract the title, description, and price and generate your storefront link!',
            parse_mode: 'Markdown',
          });
        }
        
        await tgApi('answerCallbackQuery', { callback_query_id: cb.id });
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || null;
    const text = message.text;

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

      const welcomeMsg = `✨ *Welcome to PayBio, @${username || 'creator'}!* \n\nPayBio is the fastest AI-powered storefront for digital assets inside Telegram.\n\n` +
        `👛 *TON Wallet:* \`${creator.payment_details?.ton || 'Not set'}\`\n` +
        `💳 *Card/P2P Details:* \`${creator.payment_details?.p2p || 'Not set'}\`\n\n` +
        `Use the options below to configure your payment details or learn how to create your storefront.`;

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: welcomeMsg,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👛 Set TON Wallet', callback_data: 'set_ton' },
              { text: '💳 Set P2P Details', callback_data: 'set_p2p' }
            ],
            [
              { text: '🚀 How to Create a Product', callback_data: 'create_info' }
            ],
            [
              { text: '🏪 Open Web Storefront', url: `https://t.me/${botUser}/app` }
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
          text: '❌ You don\'t have any products yet! Send me a PDF file to get started.',
        });
        return NextResponse.json({ ok: true });
      }

      let storeText = '✨ *Your Storefront Products:*\n\n';
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

    // 2. Handle configuration messages
    if (text?.startsWith('/ton ')) {
      const wallet = text.slice(5).trim();
      const currentDetails = creator.payment_details || {};
      const newDetails = { ...currentDetails, ton: wallet };
      await db.upsertUser(userId, username, newDetails);
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `✅ *TON Wallet updated successfully!*\n\`${wallet}\``,
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
        text: `✅ *P2P Card details updated successfully!*\n\`${cardInfo}\``,
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    // 3. Handle document upload (PDF, etc.)
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

      const responseText = `📥 *File Received:* \`${fileName}\`\n\n` +
        `Now send me a description and price for this file to generate your storefront.\n\n` +
        `*Example:* \n"Sell my comprehensive crypto trading checklist for $9.99"`;

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown',
      });
      return NextResponse.json({ ok: true });
    }

    // 4. Handle storefront generation text description
    if (text) {
      await tgApi('sendChatAction', { chat_id: chatId, action: 'typing' });

      // Check if user has a pending file uploaded
      const pendingFileId = creator.payment_details?.pending_file_id;
      const contentUrl = pendingFileId ? `telegram_file_id:${pendingFileId}` : 'https://example.com/digital-asset-placeholder.pdf';

      // Parse with Gemini
      const extracted = await extractProductFromText(text);

      // Create product in database
      const product = await db.createProduct(
        creator.id,
        extracted.title,
        extracted.description,
        extracted.price_fiat,
        extracted.price_stars,
        contentUrl
      );

      // Clear pending file from user metadata
      const currentDetails = creator.payment_details || {};
      const newDetails = { ...currentDetails };
      delete newDetails.pending_file_id;
      delete newDetails.pending_file_name;
      await db.upsertUser(userId, username, newDetails);

      const getMe = await tgApi('getMe', {});
      const botUser = getMe?.result?.username || 'PaybioBot';
      const deepLink = `https://t.me/${botUser}/app?startapp=${product.id}`;

      const responseText = `🏪 *Storefront Generated!* \n\n` +
        `🏷️ *Title:* ${product.title}\n` +
        `📝 *Description:* ${product.description}\n` +
        `💵 *Price:* $${product.price_fiat} (~${product.price_stars} Stars)\n\n` +
        `🔗 *Your store link:* \n${deepLink}\n\n` +
        `Put this link in your social media bio. When customers pay, their product will be delivered automatically!`;

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🏪 Open Web Storefront', url: deepLink }
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
