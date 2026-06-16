import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return new NextResponse('Missing product_id', { status: 400 });
    }

    const product = await db.getProductById(productId);
    if (!product || !product.banner_url) {
      // Return a default fallback placeholder image if no banner exists
      const fallbackUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
      return NextResponse.redirect(fallbackUrl);
    }

    const bannerUrl = product.banner_url;

    if (bannerUrl.startsWith('data:image')) {
      // It is a base64 image, parse it and serve directly
      const matches = bannerUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        return new NextResponse('Invalid base64 image data', { status: 500 });
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Otherwise, redirect to the public URL (e.g. Reve API CDN URL)
    return NextResponse.redirect(bannerUrl);
  } catch (error: any) {
    console.error('Error serving product story image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
