import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const creatorTgIdParam = searchParams.get('creator_tg_id');
    
    // Optional buyer details for notifications
    const buyerTgIdParam = searchParams.get('buyer_tg_id');
    const buyerUsername = searchParams.get('buyer_username');
    const buyerName = searchParams.get('buyer_name');

    if (productId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId)) {
        return NextResponse.json({ error: 'Invalid product ID format.' }, { status: 400 });
      }
      const product = await db.getProductById(productId);
      if (!product) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

      // Send telegram notification to product creator
      if (buyerTgIdParam && product.creator) {
        const buyerTgId = Number(buyerTgIdParam);
        const creatorTgId = Number(product.creator.telegram_id);
        
        // Notify only if the buyer is a real different user
        if (buyerTgId > 0 && buyerTgId !== creatorTgId) {
          const buyerInfo = buyerUsername
            ? `@${buyerUsername} (${buyerName || 'user'})`
            : `ID: ${buyerTgId}`;
          
          await sendTelegramNotification(
            creatorTgId,
            `👁️ *Product Viewed!* \n\nPotential buyer *${buyerInfo}* is currently looking at your product *"${product.title}"*.`
          );
        }
      }

      const soldCount = await db.getApprovedOrderCount(productId);
      
      let hasBought = false;
      if (buyerTgIdParam) {
        hasBought = await db.hasBoughtProduct(Number(buyerTgIdParam), productId);
      }

      return NextResponse.json({ 
        success: true, 
        product: { 
          ...product, 
          sold_count: soldCount,
          has_bought: hasBought
        } 
      });
    }

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
      return NextResponse.json({ success: true, creator, products: products || [] });
    }

    // List all products
    const products = await db.getAllProducts();
    return NextResponse.json({ success: true, products: products || [] });
  } catch (error: any) {
    console.error('List products error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

