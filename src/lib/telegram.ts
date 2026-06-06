const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function sendTelegramNotification(chatId: number | string, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN is not set. Cannot send notification.');
    return null;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error(`Error sending Telegram notification to ${chatId}:`, err);
    return null;
  }
}

export async function sendTelegramPhoto(chatId: number | string, photo: string, caption?: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        caption,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error(`Error sending Telegram photo to ${chatId}:`, err);
    return null;
  }
}

export async function sendTelegramDocument(chatId: number | string, document: string, caption?: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        document,
        caption,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error(`Error sending Telegram document to ${chatId}:`, err);
    return null;
  }
}

export async function getTelegramUser(chatId: number | string) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${chatId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.ok && data.result) {
      return data.result;
    }
  } catch (err) {
    console.error(`Error fetching Telegram user ${chatId}:`, err);
  }
  return null;
}
