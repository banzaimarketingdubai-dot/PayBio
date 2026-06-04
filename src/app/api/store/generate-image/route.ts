import { NextResponse } from 'next/server';
import crypto from 'crypto';

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY || '';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt parameter' }, { status: 400 });
    }

    // Fallback if no API key is configured
    if (!RUNWARE_API_KEY) {
      console.warn('RUNWARE_API_KEY is not set. Using beautiful fallback placeholder.');
      // Return a beautiful dynamic gradient placeholder url
      const fallbackUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80`;
      return NextResponse.json({
        success: true,
        image_url: fallbackUrl,
        is_mock: true,
        message: 'Using mock fallback image because RUNWARE_API_KEY is not configured in .env.local'
      });
    }

    const taskUUID = crypto.randomUUID();
    const payload = [
      {
        taskType: 'authentication',
        apiKey: RUNWARE_API_KEY
      },
      {
        taskType: 'imageInference',
        taskUUID: taskUUID,
        positivePrompt: prompt,
        model: 'runware:100@1', // FLUX model or similar on Runware
        width: 512,
        height: 512,
        numberResults: 1
      }
    ];

    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Runware API returned status ${response.status}`);
    }

    const result = await response.json();
    
    // Parse the response to find our imageURL
    let imageUrl = '';
    if (result && Array.isArray(result.data)) {
      const inferenceResult = result.data.find((item: any) => item.taskUUID === taskUUID);
      if (inferenceResult && inferenceResult.imageURL) {
        imageUrl = inferenceResult.imageURL;
      }
    }

    if (!imageUrl) {
      // Look at the first element if taskUUID matching failed
      const firstInference = result.data?.find((item: any) => item.imageURL);
      if (firstInference) {
        imageUrl = firstInference.imageURL;
      }
    }

    if (!imageUrl) {
      throw new Error('No image URL returned from Runware');
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl
    });
  } catch (error: any) {
    console.error('Runware generation error:', error);
    // Graceful fallback to prevent frontend crashes
    const fallbackUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80`;
    return NextResponse.json({
      success: true,
      image_url: fallbackUrl,
      is_mock: true,
      error: error.message || 'Runware API Error'
    });
  }
}
