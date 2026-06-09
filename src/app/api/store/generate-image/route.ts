import { NextResponse } from 'next/server';
import { generateLayoutFirstPrompt } from '@/lib/gemini';
import { generateImage } from '@/lib/runware';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { prompt, title, description, price } = body;

    // Use Layout-First prompting if title is provided
    if (title) {
      try {
        prompt = await generateLayoutFirstPrompt(
          title,
          description || prompt || '',
          price ? (String(price).startsWith('$') ? String(price) : `$${price}`) : 'Free'
        );
      } catch (err) {
        console.error('Failed to generate Layout-First prompt via Gemini, falling back to original prompt', err);
      }
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt, or title parameter' }, { status: 400 });
    }

    const imageUrl = await generateImage(prompt);

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      is_layout_first: !!title
    });
  } catch (error: any) {
    console.error('Runware generation endpoint error:', error);
    const fallbackUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80`;
    return NextResponse.json({
      success: true,
      image_url: fallbackUrl,
      is_mock: true,
      error: error.message || 'Runware API Error'
    });
  }
}

