import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

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
    
    let warningCount = 0;
    let expiredCount = 0;

    for (const user of users) {
      if (!user.premium_until) continue;

      const premiumUntil = new Date(user.premium_until);
      const timeDiff = premiumUntil.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Check language preference, default to Russian if username looks cyrillic or default to ru
      const lang = user.payment_details?.lang || 'ru'; 

      // 1. One day warning: expiring in 24 to 48 hours (we use 28 hours to give some buffer/overlap protection)
      if (hoursDiff > 0 && hoursDiff <= 28) {
        const lastWarningFor = user.payment_details?.last_warning_sent_for;
        const currentPremiumUntilStr = premiumUntil.toISOString();
        
        if (lastWarningFor !== currentPremiumUntilStr) {
          // Send 1-day warning
          const text = lang === 'ru'
            ? `⚠️ *Внимание: Ваша подписка PayBio Premium истекает завтра!* \n\nПожалуйста, проверьте баланс Звёзд (Telegram Stars) на вашем аккаунте. \n\nЕсли у вас включена автоматическая подписка, убедитесь, что на вашем балансе достаточно звёзд для продления. Если звёзд не хватает или вы платили разово, вы можете пополнить баланс по ссылке ниже.`
            : `⚠️ *Warning: Your PayBio Premium subscription expires tomorrow!* \n\nPlease check your Telegram Stars balance. \n\nIf you have an active monthly subscription, make sure you have enough Stars for renewal. If you paid one-time or need to top up, you can do so via the link below.`;

          await sendTelegramNotification(user.telegram_id, text, {
            inline_keyboard: [
              [
                { text: lang === 'ru' ? '⭐ Проверить баланс звёзд' : '⭐ Check Stars Balance', url: 'tg://settings/stars' }
              ]
            ]
          });

          // Save that warning was sent
          const updatedDetails = {
            ...(user.payment_details || {}),
            last_warning_sent_for: currentPremiumUntilStr
          };
          await db.updateUserPaymentDetails(user.id, updatedDetails);
          warningCount++;
        }
      }

      // 2. Expired: premiumUntil in the past, but user still marked as premium
      if (hoursDiff <= 0 && user.is_premium) {
        const lastExpiryFor = user.payment_details?.last_expiry_notification_sent_for;
        const oldPremiumUntilStr = premiumUntil.toISOString();
        
        // Deactivate premium
        await db.updateUserPremium(user.id, false, null);

        if (lastExpiryFor !== oldPremiumUntilStr) {
          // Send expiry message with renewal instructions
          const text = lang === 'ru'
            ? `❌ *Ваша подписка PayBio Premium истекла!* \n\nВаши премиум-функции (ИИ-обложки, кастомное оформление, скрытие водяного знака) временно приостановлены. \n\n*Как восстановить подписку:* \n1. Пополните баланс Telegram Stars, если он недостаточен.\n2. Перейдите в настройки вашего магазина в приложении.\n3. Нажмите кнопку *⚡ Премиум версия* и выберите удобный способ оплаты.\n\nИспользуйте кнопку ниже, чтобы проверить баланс звёзд или открыть настройки магазина.`
            : `❌ *Your PayBio Premium subscription has expired!* \n\nYour premium features (AI covers, custom styling, watermark removal) are temporarily disabled. \n\n*How to renew:* \n1. Top up your Telegram Stars if you have insufficient balance.\n2. Go to your store settings in the app.\n3. Click the *⚡ Go Premium* button and select your payment method.\n\nUse the buttons below to check your Stars balance or open your storefront.`;

          await sendTelegramNotification(user.telegram_id, text, {
            inline_keyboard: [
              [
                { text: lang === 'ru' ? '⭐ Пополнить звёзды' : '⭐ Top up Stars', url: 'tg://settings/stars' }
              ],
              [
                { text: lang === 'ru' ? '🏪 Открыть настройки' : '🏪 Open Settings', url: `https://t.me/PaybioBot/app` }
              ]
            ]
          });

          // Save that expiry notification was sent
          const updatedDetails = {
            ...(user.payment_details || {}),
            last_expiry_notification_sent_for: oldPremiumUntilStr,
            premium_type: 'one-time', // Reset back to one-time / none
            subscription_status: 'none'
          };
          await db.updateUserPaymentDetails(user.id, updatedDetails);
          expiredCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      warnings_sent: warningCount,
      expirations_processed: expiredCount
    });
  } catch (err: any) {
    console.error('Subscription cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
