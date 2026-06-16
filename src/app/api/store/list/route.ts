import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

let cachedBotUsername: string | null = null;

/** Fetch the bot username, using a module-level cache to avoid repeated Telegram API hits. */
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

/** Check if a buyer (by tg_id) already has a configured store. */
async function getBuyerHasStore(buyerTgIdParam: string | null): Promise<boolean> {
  if (!buyerTgIdParam) return false;
  const buyerTgId = Number(buyerTgIdParam);
  if (!(buyerTgId > 0)) return false;
  try {
    const buyerUser = await db.getUserByTelegramId(buyerTgId);
    if (!buyerUser) return false;
    const hasName = !!buyerUser.profile_customization?.store_name;
    if (hasName) return true;
    const buyerProds = await db.getProductsByCreatorId(buyerUser.id);
    return !!(buyerProds && buyerProds.length > 0);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const creatorTgIdParam = searchParams.get('creator_tg_id');

    // Optional buyer details for notifications
    const buyerTgIdParam = searchParams.get('buyer_tg_id');
    const buyerUsername = searchParams.get('buyer_username');
    const buyerName = searchParams.get('buyer_name');
    const referrerTgIdParam = searchParams.get('referrer_tg_id');

    // ─── Fire all independent lookups in parallel ───────────────────────────
    const [botUsername, buyerHasStore] = await Promise.all([
      getBotUsername(),
      getBuyerHasStore(buyerTgIdParam),
      // Referral attribution: fire-and-forget, does not affect response data
      (async () => {
        if (buyerTgIdParam && referrerTgIdParam) {
          const buyerTgId = Number(buyerTgIdParam);
          if (buyerTgId > 0) {
            try { await db.attributeReferral(buyerTgId, referrerTgIdParam); }
            catch (err) { console.error('Failed to attribute referral:', err); }
          }
        }
      })(),
    ]);

    // ─── Single-product fetch path ──────────────────────────────────────────
    if (productId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId)) {
        return NextResponse.json({ error: 'Invalid product ID format.' }, { status: 400 });
      }

      // Fetch product + sold count + hasBought all in parallel
      const [product, soldCount] = await Promise.all([
        db.getProductById(productId),
        db.getApprovedOrderCount(productId),
      ]);

      if (!product) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

      // hasBought can only be checked after product is known (same product_id though, so ok in parallel above)
      let hasBought = false;
      if (buyerTgIdParam) {
        hasBought = await db.hasBoughtProduct(Number(buyerTgIdParam), productId);
      }

      // Notify creator — fire-and-forget, never awaited
      if (buyerTgIdParam && product.creator) {
        const buyerTgId = Number(buyerTgIdParam);
        const creatorTgId = Number(product.creator.telegram_id);
        if (buyerTgId > 0 && buyerTgId !== creatorTgId) {
          const buyerInfo = buyerUsername
            ? `@${buyerUsername} (${buyerName || 'user'})`
            : `ID: ${buyerTgId}`;
          sendTelegramNotification(
            creatorTgId,
            `👁️ *Product Viewed!* \n\nPotential buyer *${buyerInfo}* is currently looking at your product *"${product.title}"*.`
          );
        }
      }

      return NextResponse.json({
        success: true,
        product: { ...product, sold_count: soldCount, has_bought: hasBought },
        buyer_has_store: buyerHasStore,
        bot_username: botUsername,
      });
    }

    // ─── Creator storefront list path ────────────────────────────────────────
    if (creatorTgIdParam) {
      const creatorTgId = Number(creatorTgIdParam);
      if (isNaN(creatorTgId)) {
        return NextResponse.json({ error: 'Invalid creator_tg_id' }, { status: 400 });
      }

      let creator = await db.getUserByTelegramId(creatorTgId);
      if (!creator) {
        creator = await db.upsertUser(creatorTgId, `creator_${creatorTgId}`);
      }

      const products = await db.getProductsByCreatorId(creator.id);
      return NextResponse.json({
        success: true, creator, products: products || [],
        buyer_has_store: buyerHasStore, bot_username: botUsername,
      });
    }

    // ─── Fallback: all products ───────────────────────────────────────────────
    const products = await db.getAllProducts();
    return NextResponse.json({
      success: true, products: products || [],
      buyer_has_store: buyerHasStore, bot_username: botUsername,
    });

  } catch (error: any) {
    console.error('List products error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

