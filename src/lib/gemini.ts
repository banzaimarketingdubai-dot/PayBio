const GEMINI_MODEL = 'gemini-2.5-flash';

interface ExtractProductResponse {
  title: string;
  description: string;
  price_fiat: number;
  price_stars: number;
}

interface VerifyReceiptResponse {
  amount: number | null;
  receiver_name: string | null;
  transaction_date: string | null;
  is_valid_receipt: boolean;
  fraud_score: number; // 0 to 1 scale, where 1 is highly fraudulent
  reason: string;
}

/**
 * Call the Gemini API with text contents and optional image inline data.
 */
async function callGemini(contents: any[], responseJson: boolean = false): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents,
    generationConfig: responseJson ? { responseMimeType: 'application/json' } : undefined,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error('Gemini API did not return text content.');
  }

  return textContent;
}

/**
 * Parses raw creator text to extract title, description, price_fiat, and price_stars.
 */
export async function extractProductFromText(rawText: string): Promise<ExtractProductResponse> {
  const prompt = `
    You are an AI assistant designed to extract digital product details from a creator's message or prompt.
    Extract the following details in JSON format:
    - title: A catchy title for the digital product.
    - description: A short, engaging description for the storefront.
    - price_fiat: The price of the product in USD (fiat). If the price is mentioned in TON, Stars, or Rubles, convert/estimate it to USD (assume 1 TON = $7.00, 1 Star = $0.02, 100 RUB = $1.10). Default to $5.00 if no price can be parsed, or 0 if it is explicitly mentioned as free, zero, or бесплатно.
    - price_stars: The price of the product in Telegram Stars. Standard rate is $1 = 50 Stars. (E.g. $10 = 500 Stars, $0 = 0 Stars).

    Creator's input: "${rawText.replace(/"/g, '\\"')}"

    Respond ONLY with the JSON object. Do not include markdown code block formatting (like \`\`\`json).
  `;

  const contents = [
    {
      parts: [
        { text: prompt }
      ]
    }
  ];

  try {
    const resultText = await callGemini(contents, true);
    // Remove potential markdown fences just in case Gemini adds them despite the prompt
    const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as ExtractProductResponse;
  } catch (error) {
    console.error('Error extracting product from text via Gemini:', error);
    // Return sensible defaults on failure
    return {
      title: 'Digital Product',
      description: rawText,
      price_fiat: 5.00,
      price_stars: 250,
    };
  }
}

/**
 * Validates a receipt image via Gemini Vision API to verify bank transfer / P2P payment.
 */
export async function verifyReceiptImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<VerifyReceiptResponse> {
  const base64Image = imageBuffer.toString('base64');
  
  const prompt = `
    You are an AI anti-fraud expert. Review the provided bank transfer screenshot or payment receipt to determine its validity.
    
    1. Extract transaction details:
       - amount: The transaction amount. Extract only the number.
       - receiver_name: The name of the person or entity who received the money, if visible.
       - transaction_date: The date and time of the transaction.
       
    2. Assess validity:
       - check if the receipt looks edited, cropped in an unusual way, contains mismatched fonts, or looks like a template/fake screenshot.
       - assign a 'fraud_score' from 0 (completely genuine) to 1 (obviously fake or edited).
       - set 'is_valid_receipt' to true only if fraud_score < 0.3.
       - provide a concise explanation in 'reason'.

    Respond ONLY with a JSON object containing these keys:
    {
      "amount": number | null,
      "receiver_name": "string" | null,
      "transaction_date": "string" | null,
      "is_valid_receipt": boolean,
      "fraud_score": number,
      "reason": "string"
    }

    Do not include markdown code block formatting.
  `;

  const contents = [
    {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Image,
          }
        }
      ]
    }
  ];

  try {
    const resultText = await callGemini(contents, true);
    const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as VerifyReceiptResponse;
  } catch (error) {
    console.error('Error verifying receipt via Gemini Vision:', error);
    return {
      amount: null,
      receiver_name: null,
      transaction_date: null,
      is_valid_receipt: false,
      fraud_score: 1.0,
      reason: 'Failed to process receipt image using AI Vision pipeline.',
    };
  }
}

/**
 * Generates a short, high-conversion promo post for Telegram using Gemini.
 */
export async function generatePromoPost(title: string, description: string): Promise<string> {
  const prompt = `Act as a social media manager. Based on this product title and description, write a short, high-conversion Telegram post (max 3 sentences) offering this product.
  
  Product Title: ${title}
  Product Description: ${description}
  
  Return only the post content without other text.`;

  const contents = [
    {
      parts: [
        { text: prompt }
      ]
    }
  ];

  try {
    return await callGemini(contents, false);
  } catch (error) {
    console.error('Error generating promo post:', error);
    return `🔥 Get ${title} now! ${description ? description.slice(0, 100) : ''} - Check it out on our store!`;
  }
}

/**
 * Generates a professional, high-conversion description for a Telegram channel.
 */
export async function generateChannelDescription(topics: string): Promise<string> {
  const prompt = `Act as a professional copywriter. Write a clean, high-conversion Telegram channel description based on these topics or ideas:
  
  Topics/Ideas: "${topics.replace(/"/g, '\\"')}"
  
  The description must be engaging, clear about what the subscriber gets, and max 3 sentences. Include relevant emojis.
  Return only the description text. Do not wrap in quotes or add other introductory text.`;

  const contents = [
    {
      parts: [
        { text: prompt }
      ]
    }
  ];

  try {
    return await callGemini(contents, false);
  } catch (error) {
    console.error('Error generating channel description:', error);
    return `📢 Welcome to our channel! We publish content about ${topics}. Subscribe for updates!`;
  }
}

/**
 * Generates a Layout-First prompt for an image generator (like Reve 2.0 / Runware FLUX)
 * based on product title, description/prompt, and price.
 */
export async function generateLayoutFirstPrompt(
  title: string,
  description: string,
  price: string,
  selectedNiche?: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> {
  const analysisPrompt = `
    Ты — AI-дизайнер системы Paybio. Твоя задача: на основе данных о товаре (Название, Описание, Цена) составить структуру запроса для API Reve 2.0.

    ПРАВИЛА ГЕНЕРАЦИИ:
    1. Текстовая иерархия: Название товара всегда в центре/верхней части (крупный шрифт, высокий контраст). Цена — в нижней части, выделена отдельным блоком.
    2. Контраст: Если фон светлый, текст — черный/темно-серый. Если фон темный, текст — белый.
    3. Читаемость: Использовать только "clean sans-serif typography". Никаких рукописных шрифтов.
    4. Структура промпта: [Описание стиля + Описание объекта] | [Инструкции по тексту: Текст, Позиция, Шрифт, Цвет].

    Product details:
    - Title: "${title.replace(/"/g, '\\"')}"
    - Description: "${description.replace(/"/g, '\\"')}"
    - Price: "${price.replace(/"/g, '\\"')}"
    ${selectedNiche ? `- Selected Niche: "${selectedNiche}"` : ''}
    
    1. Identify the Niche (e.g., "Psychology", "Finance", "Crypto", "Fitness", "Education", "Art", "Tech", "General"). If Selected Niche is provided, use it.
    2. Choose a style preset for the background and text contrast (e.g., "soft pastel tones, deep focus, warm ambient light" for Psychology, "dark mode sleek neon accents, ultra modern, tech" for Crypto, "aggressive contrast, high energy, bold shadows" for Fitness, etc.).
    3. Determine the best high-contrast text color based on the chosen background style (e.g. "White" or "Black").
    4. Generate a short, highly-visual description of the background illustration/scene/objects suited for image generation, translated to English (e.g. if the product is about online finance, describe a clean desk with a laptop showing a chart, and golden highlights). Do not include text overlays or abstract non-visual phrases. If the Description looks like a custom image prompt already, preserve it and refine it slightly.
    
    Return ONLY a JSON object containing these keys:
    {
      "niche": "string",
      "stylePreset": "string",
      "textColor": "string",
      "visualPrompt": "string"
    }
    
    Do not include markdown code block formatting.
  `;

  const contents = [
    {
      parts: [
        { text: analysisPrompt }
      ]
    }
  ];

  try {
    const resultText = await callGemini(contents, true);
    const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    const niche = selectedNiche || parsed.niche || 'General';
    const stylePreset = parsed.stylePreset || 'Minimalist, clean, studio lighting';
    const textColor = parsed.textColor || 'White';
    const visualPrompt = parsed.visualPrompt || title;
    
    // Package into layout-first prompt contract
    if (aspectRatio === '9:16') {
      return `A professional, high-end vertical commercial product banner for Telegram Stories. 
Subject: ${visualPrompt} (Niche: ${niche}). 
Style: ${stylePreset}, minimalist, clean, high-contrast, studio lighting. 
Background: Soft-focus, relevant to the product niche to ensure text readability.

TEXT_OVERLAY_INSTRUCTIONS:
- Headline: '${title}' (Position: Upper-Center, Font: Bold Sans-Serif, Color: ${textColor}, wrapped to multiple short lines, with substantial left/right safe zone padding so it never cuts off)
- Subline: 'Price: ${price}' (Position: Lower-Center, Font: Medium Sans-Serif, Color: ${textColor === 'White' ? 'White with subtle shadow' : 'Dark Gray'} for readability)

CONSTRAINTS:
- No text blurring.
- Sharp edges for typography.
- Maximum readability score.
- Aspect ratio: 9:16.
- Extreme side margins: Keep all text strictly within the middle 70% width of the image to prevent side clipping on mobile screens.
- Keep top 15% and bottom 15% clear of text to prevent overlap with Stories UI.`;
    }

    return `A professional, high-end commercial product banner for Telegram. 
Subject: ${visualPrompt} (Niche: ${niche}). 
Style: ${stylePreset}, minimalist, clean, high-contrast, studio lighting. 
Background: Soft-focus, relevant to the product niche to ensure text readability.

TEXT_OVERLAY_INSTRUCTIONS:
- Headline: '${title}' (Position: Center, Font: Bold Sans-Serif, Color: ${textColor})
- Subline: 'Price: ${price}' (Position: Bottom-Right, Font: Medium Sans-Serif, Color: ${textColor === 'White' ? 'White with subtle shadow' : 'Dark Gray'} for readability)

CONSTRAINTS:
- No text blurring.
- Sharp edges for typography.
- Maximum readability score.
- Aspect ratio: 16:9.`;

  } catch (error) {
    console.error('Error generating Layout-First prompt:', error);
    // Fallback prompt layout
    if (aspectRatio === '9:16') {
      return `A professional, high-end vertical commercial product banner for Telegram Stories. 
Subject: ${description || title}. 
Style: Minimalist, clean, high-contrast, studio lighting. 
Background: Soft-focus, relevant to the product niche to ensure text readability.

TEXT_OVERLAY_INSTRUCTIONS:
- Headline: '${title}' (Position: Upper-Center, Font: Bold Sans-Serif, Color: High-Contrast, wrapped to multiple short lines, with substantial left/right safe zone padding so it never cuts off)
- Subline: 'Price: ${price}' (Position: Lower-Center, Font: Medium Sans-Serif, Color: White with subtle shadow for readability)

CONSTRAINTS:
- No text blurring.
- Sharp edges for typography.
- Maximum readability score.
- Aspect ratio: 9:16.
- Extreme side margins: Keep all text strictly within the middle 70% width of the image to prevent side clipping on mobile screens.
- Keep top 15% and bottom 15% clear of text to prevent overlap with Stories UI.`;
    }

    return `A professional, high-end commercial product banner for Telegram. 
Subject: ${description || title}. 
Style: Minimalist, clean, high-contrast, studio lighting. 
Background: Soft-focus, relevant to the product niche to ensure text readability.

TEXT_OVERLAY_INSTRUCTIONS:
- Headline: '${title}' (Position: Center, Font: Bold Sans-Serif, Color: High-Contrast)
- Subline: 'Price: ${price}' (Position: Bottom-Right, Font: Medium Sans-Serif, Color: White with subtle shadow for readability)

CONSTRAINTS:
- No text blurring.
- Sharp edges for typography.
- Maximum readability score.
- Aspect ratio: 16:9.`;
  }
}


