const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
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
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
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
    - price_fiat: The price of the product in USD (fiat). If the price is mentioned in TON, Stars, or Rubles, convert/estimate it to USD (assume 1 TON = $7.00, 1 Star = $0.02, 100 RUB = $1.10). Default to $5.00 if no price can be parsed.
    - price_stars: The price of the product in Telegram Stars. Standard rate is $1 = 50 Stars. (E.g. $10 = 500 Stars).

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
