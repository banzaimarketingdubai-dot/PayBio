import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

let cachedBotUsername: string | null = null;

async function getBotUsername(): Promise<string> {
  if (cachedBotUsername) return cachedBotUsername;
  if (!process.env.TELEGRAM_BOT_TOKEN) return 'PaybioBot';
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.result?.username) {
        cachedBotUsername = data.result.username;
        return cachedBotUsername!;
      }
    }
  } catch (err) {
    console.error('Failed to fetch bot username in API:', err);
  }
  return 'PaybioBot';
}

export async function GET(request: Request) {
  // Simple check to prevent unauthorized trigger (e.g. from browsers)
  // Vercel cron jobs send an Authorization header
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await db.getAllUsers();
    const now = new Date();
    const botUsername = await getBotUsername();
    
    let warning3dCount = 0;
    let warning1dCount = 0;
    let expiredCount = 0;
    let expired3dCount = 0;
    let expired7dCount = 0;

    for (const user of users) {
      if (!user.premium_until) continue;

      const premiumUntil = new Date(user.premium_until);
      const timeDiff = premiumUntil.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Check language preference, default to Russian if not set
      const lang = user.payment_details?.lang || 'ru'; 
      const currentPremiumUntilStr = premiumUntil.toISOString();

      // Common inline keyboard for renewal
      const renewKeyboard = {
        inline_keyboard: [
          [
            { text: lang === 'ru' ? '⭐ Пополнить звёзды' : '⭐ Top up Stars', url: 'tg://settings/stars' }
          ],
          [
            { text: lang === 'ru' ? '🏪 Настройки магазина' : '🏪 Store Settings', url: `https://t.me/${botUsername}/app` }
          ]
        ]
      };

      // 1. Three days warning: expiring in 28 to 76 hours (approx. 1 to 3 days remaining)
      if (hoursDiff > 28 && hoursDiff <= 76) {
        const warning3dSentFor = user.payment_details?.warning_3d_sent_for;
        
        if (warning3dSentFor !== currentPremiumUntilStr) {
          const text = lang === 'ru'
            ? `🔔 *Продление PayBio Premium* \n\nДо окончания вашей подписки осталось *3 дня*. \n\nНе упустите возможность получать оплаты от клиентов напрямую через Telegram! Убедитесь, что на вашем балансе Telegram Stars достаточно средств для автопродления, либо продлите подписку вручную, чтобы сохранить кастомный дизайн, ИИ-функции и активный календарь записи.`
            : `🔔 *Renew PayBio Premium* \n\nYour premium subscription ends in *3 days*. \n\nKeep receiving seamless customer payments directly in Telegram! Ensure you have enough Telegram Stars for auto-renewal, or renew manually to keep your custom styling, AI generator, and booking calendar active.`;

          await sendTelegramNotification(user.telegram_id, text, renewKeyboard);

          const updatedDetails = {
            ...(user.payment_details || {}),
            warning_3d_sent_for: currentPremiumUntilStr
          };
          await db.updateUserPaymentDetails(user.id, updatedDetails);
          warning3dCount++;
        }
      }

      // 2. One day warning: expiring in 0 to 28 hours
      if (hoursDiff > 0 && hoursDiff <= 28) {
        const lastWarningFor = user.payment_details?.last_warning_sent_for;
        
        if (lastWarningFor !== currentPremiumUntilStr) {
          const text = lang === 'ru'
            ? `⚠️ *Срочно: Подписка PayBio Premium истекает завтра!* \n\nЗавтра ваши клиенты потеряют возможность оплачивать товары и бронировать слоты. Сам каталог и товары останутся видимыми, но кнопка покупки будет заблокирована. \n\nПожалуйста, пополните баланс Звёзд (Telegram Stars) или перейдите в настройки для ручного продления.`
            : `⚠️ *Urgent: PayBio Premium expires tomorrow!* \n\nTomorrow, your customers will lose the ability to make payments or book slots. Your catalog and products will remain visible, but checkout buttons will be locked. \n\nPlease top up your Telegram Stars or open settings to renew now.`;

          await sendTelegramNotification(user.telegram_id, text, renewKeyboard);

          const updatedDetails = {
            ...(user.payment_details || {}),
            last_warning_sent_for: currentPremiumUntilStr
          };
          await db.updateUserPaymentDetails(user.id, updatedDetails);
          warning1dCount++;
        }
      }

      // 3. Expired right now: premiumUntil in the past, but user still marked as premium
      if (hoursDiff <= 0 && user.is_premium) {
        const lastExpiryFor = user.payment_details?.last_expiry_notification_sent_for;
        
        // Deactivate premium
        await db.updateUserPremium(user.id, false, null);

        if (lastExpiryFor !== currentPremiumUntilStr) {
          const text = lang === 'ru'
            ? `❌ *Ваша подписка PayBio Premium истекла!* \n\nФункции оплаты и бронирования для ваших клиентов теперь временно заблокированы. При этом витрина и товары по-прежнему доступны для просмотра. \n\n*Как вернуть клиентов к покупкам?* \n1. Пополните баланс Telegram Stars.\n2. Откройте настройки магазина в приложении.\n3. Нажмите *⚡ Активировать Premium* и выберите удобный метод оплаты.`
            : `❌ *Your PayBio Premium subscription has expired!* \n\nPayment and booking functions for your customers are now locked. However, your storefront and products remain visible. \n\n*How to resume sales:* \n1. Top up your Telegram Stars balance.\n2. Open your store settings in the app.\n3. Click *⚡ Go Premium* and select your payment method.`;

          await sendTelegramNotification(user.telegram_id, text, renewKeyboard);

          const updatedDetails = {
            ...(user.payment_details || {}),
            last_expiry_notification_sent_for: currentPremiumUntilStr,
            premium_type: 'one-time', 
            subscription_status: 'none'
          };
          await db.updateUserPaymentDetails(user.id, updatedDetails);
          expiredCount++;
        }
      }

      // 4. Three days after expiry: expired between 3 to 5 days ago (hoursDiff between -72 and -120)
      if (hoursDiff <= -72 && hoursDiff > -120) {
        const expiry3dSentFor = user.payment_details?.expiry_3d_sent_for;
        
        if (expiry3dSentFor !== currentPremiumUntilStr) {
          const text = lang === 'ru'
            ? `📉 *Вы теряете клиентов на PayBio!* \n\nПрошло 3 дня с момента окончания вашей подписки Premium. Ваша витрина и товары доступны для просмотра, но клиенты *не могут совершить покупку* или забронировать время. \n\nНе упускайте продажи — верните платежные сценарии в один клик прямо сейчас!`
            : `📉 *You are missing out on sales!* \n\nIt's been 3 days since your PayBio Premium subscription expired. Your storefront is visible, but customers *cannot checkout* or book slots. \n\nDon't lose customers — restore your checkout flow in one click now!`;

          await sendTelegramNotification(user.telegram_id, text, renewKeyboard);

          const updatedDetails = {
            ...(user.payment_details || {}),
            expiry_3d_sent_for: currentPremiumUntilStr
          };
          await db.updateUserPaymentDetails(user.id, updatedDetails);
          expired3dCount++;
        }
      }

      // 5. Seven days after expiry: expired between 7 to 9 days ago (hoursDiff between -168 and -216)
      if (hoursDiff <= -168 && hoursDiff > -216) {
        const expiry7dSentFor = user.payment_details?.expiry_7d_sent_for;
        
        if (expiry7dSentFor !== currentPremiumUntilStr) {
          const text = lang === 'ru'
            ? `🚀 *Скучаете по продажам в Telegram?* \n\nВаша витрина PayBio простаивает уже неделю без активного приема платежей. Верните полноценный функционал магазина (оплата в Telegram Stars, TON, P2P картами) всего за пару секунд. \n\nПродлите подписку в настройках и продолжайте зарабатывать!`
            : `🚀 *Miss making sales in Telegram?* \n\nYour PayBio storefront has been inactive for payments for a week. Restore full store functionality (Stars, TON, P2P card payments) in just a few seconds. \n\nRenew in settings and keep growing your business!`;

          await sendTelegramNotification(user.telegram_id, text, renewKeyboard);

          const updatedDetails = {
            ...(user.payment_details || {}),
            expiry_7d_sent_for: currentPremiumUntilStr
          };
          await db.updateUserPaymentDetails(user.id, updatedDetails);
          expired7dCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      warnings_3d_sent: warning3dCount,
      warnings_1d_sent: warning1dCount,
      expirations_processed: expiredCount,
      expired_3d_reminders_sent: expired3dCount,
      expired_7d_reminders_sent: expired7dCount
    });
  } catch (err: any) {
    console.error('Subscription cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
