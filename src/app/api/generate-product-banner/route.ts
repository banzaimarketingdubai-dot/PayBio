import { NextResponse } from 'next/server';
import { generateLayoutFirstPrompt } from '@/lib/gemini';
import { generateImage, editImage } from '@/lib/runware';
import { db, canUseAI } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_id, niche, user_tg_id, custom_prompt, banner_url } = body;

    if (!product_id || !user_tg_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: product_id, user_tg_id' },
        { status: 400 }
      );
    }

    // 1. Fetch user and verify premium/AI status
    const user = await db.getUserByTelegramId(Number(user_tg_id));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!canUseAI(user)) {
      return NextResponse.json(
        { error: 'AI banner generation is exclusive to full Premium tier. Trial users are blocked.' },
        { status: 403 }
      );
    }

    // If a custom banner_url is supplied directly, save it and skip generation
    if (banner_url) {
      await db.updateProductBanner(product_id, banner_url);
      return NextResponse.json({
        success: true,
        banner_url: banner_url,
        niche: niche || 'General'
      });
    }

    // 2. Fetch product details
    const product = await db.getProductById(product_id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const priceString = product.price_fiat
      ? `$${product.price_fiat}`
      : product.price_stars
      ? `${product.price_stars} Stars`
      : 'Free';

    // 3. Generate Layout-First prompt optimized for the niche
    let prompt = '';
    if (custom_prompt) {
      // Wrap the custom visual prompt in layout instructions using Gemini
      prompt = await generateLayoutFirstPrompt(
        product.title,
        custom_prompt,
        priceString,
        niche,
        '9:16'
      );
    } else {
      prompt = await generateLayoutFirstPrompt(
        product.title,
        product.description || '',
        priceString,
        niche,
        '9:16'
      );
    }

    // 4. Run image generation or edit depending on whether product has a banner
    let imageUrl = '';
    if (product.banner_url) {
      imageUrl = await editImage(product.banner_url, prompt, '9:16');
    } else {
      imageUrl = await generateImage(prompt, '9:16');
    }

    // 5. Update banner_url in database
    await db.updateProductBanner(product.id, imageUrl);

    return NextResponse.json({
      success: true,
      banner_url: imageUrl,
      prompt,
      niche: niche || 'General'
    });
  } catch (error: any) {
    console.error('Error generating product banner:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
