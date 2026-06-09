import crypto from 'crypto';

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY || '';

/**
 * Generates an image using the Runware API.
 * Returns a fallback URL if RUNWARE_API_KEY is not configured or on failure.
 */
export async function generateImage(prompt: string): Promise<string> {
  const fallbackUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80`;

  if (!RUNWARE_API_KEY) {
    console.warn('RUNWARE_API_KEY is not set. Using fallback placeholder.');
    return fallbackUrl;
  }

  try {
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
        model: 'runware:100@1', // FLUX model on Runware
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
    
    let imageUrl = '';
    if (result && Array.isArray(result.data)) {
      const inferenceResult = result.data.find((item: any) => item.taskUUID === taskUUID);
      if (inferenceResult && inferenceResult.imageURL) {
        imageUrl = inferenceResult.imageURL;
      }
    }

    if (!imageUrl) {
      const firstInference = result.data?.find((item: any) => item.imageURL);
      if (firstInference) {
        imageUrl = firstInference.imageURL;
      }
    }

    if (!imageUrl) {
      throw new Error('No image URL returned from Runware');
    }

    return imageUrl;
  } catch (error) {
    console.error('Runware generation error:', error);
    return fallbackUrl;
  }
}
