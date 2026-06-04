import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { verifyReceiptImage } from '@/lib/gemini';
import ExifParser from 'exif-parser';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

async function tgApi(method: string, body: any) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram Bot API Error (${method}):`, err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const orderId = formData.get('order_id') as string;
    const file = formData.get('file') as File;

    if (!orderId || !file) {
      return NextResponse.json(
        { error: 'Missing order_id or receipt file.' },
        { status: 400 }
      );
    }

    // 1. Fetch order & product details
    const order = await db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Idempotency: If already approved, return success immediately
    if (order.status === 'approved') {
      return NextResponse.json({
        success: true,
        status: 'approved',
        message: 'Order was already approved and fulfilled.',
      });
    }

    const product = order.product;
    if (!product) {
      return NextResponse.json({ error: 'Associated product not found.' }, { status: 404 });
    }

    const creator = await db.getUserById(product.creator_id);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // --- PIPELINE STEP 1: EXIF Metadata Check ---
    let exifFlagged = false;
    let exifReason = '';
    try {
      const parser = ExifParser.create(buffer);
      const result = parser.parse();
      const software = result.tags?.Software || '';
      if (software) {
        const editedKeywords = ['adobe', 'photoshop', 'picsart', 'canva', 'lightroom', 'gimp', 'sketch', 'figma'];
        if (editedKeywords.some(keyword => software.toLowerCase().includes(keyword))) {
          exifFlagged = true;
          exifReason = `EXIF metadata indicates editing software: ${software}`;
        }
      }
    } catch (e: any) {
      // Skip EXIF check if the file format doesn't support it (e.g. PNG)
      console.log('EXIF extraction skipped/failed:', e.message);
    }

    if (exifFlagged) {
      await db.updateOrderStatus(orderId, 'manual_review', 0.9);
      
      // Notify Creator
      await tgApi('sendMessage', {
        chat_id: creator.telegram_id,
        text: `⚠️ *Order Flagged (EXIF check)*\n\nOrder ID: \`${orderId}\`\nProduct: *${product.title}*\nReason: ${exifReason}\n\nThis order has been set to *manual_review*.`,
        parse_mode: 'Markdown',
      });

      return NextResponse.json({
        success: false,
        status: 'manual_review',
        reason: exifReason,
      });
    }

    // --- PIPELINE STEP 2 & 3: Vision LLM Analysis ---
    const mimeType = file.type || 'image/jpeg';
    const visionResult = await verifyReceiptImage(buffer, mimeType);

    console.log('Gemini Vision analysis result:', visionResult);

    // --- PIPELINE STEP 4: Logic Matching & Fulfillment ---
    let orderStatus = 'manual_review';
    let isMatch = false;

    // Check amount matches within small margin
    const expectedAmount = Number(product.price_fiat);
    const actualAmount = visionResult.amount ? Number(visionResult.amount) : 0;
    
    // We allow matching within 10% discrepancy (or exact match) or absolute difference under 1.00 for local currency conversions
    const isAmountCorrect = actualAmount > 0 && Math.abs(actualAmount - expectedAmount) < (expectedAmount * 0.1 || 1.00);

    if (visionResult.is_valid_receipt && isAmountCorrect && visionResult.fraud_score < 0.3) {
      isMatch = true;
      orderStatus = 'approved';
    }

    // Update database status
    await db.updateOrderStatus(orderId, orderStatus, visionResult.fraud_score);

    if (orderStatus === 'approved') {
      // Fulfill order! Deliver digital asset via Bot API
      const contentUrl = product.content_url;
      const buyerTgId = order.buyer_tg_id;

      if (contentUrl.startsWith('telegram_file_id:')) {
        const fileId = contentUrl.slice(17);
        await tgApi('sendDocument', {
          chat_id: buyerTgId,
          document: fileId,
          caption: `✅ *Payment Verified!*\n\nThank you for purchasing *${product.title}*. Here is your file!`,
          parse_mode: 'Markdown',
        });
      } else {
        await tgApi('sendMessage', {
          chat_id: buyerTgId,
          text: `✅ *Payment Verified!*\n\nThank you for purchasing *${product.title}*.\n\n🔗 *Access Link:* ${contentUrl}`,
          parse_mode: 'Markdown',
        });
      }

      // Notify Creator about the sale
      await tgApi('sendMessage', {
        chat_id: creator.telegram_id,
        text: `💰 *New Sale!* \n\nYou sold *${product.title}* to user \`${buyerTgId}\` for $${product.price_fiat} via P2P. Payment was verified and delivered automatically!`,
        parse_mode: 'Markdown',
      });

      return NextResponse.json({
        success: true,
        status: 'approved',
        extracted_data: visionResult,
      });
    } else {
      // Send for manual review and notify Creator
      let mismatchReason = '';
      if (!isAmountCorrect) {
        mismatchReason = `Amount mismatch (Expected $${expectedAmount}, extracted $${actualAmount}).`;
      } else {
        mismatchReason = visionResult.reason || 'Vision validation failed.';
      }

      await tgApi('sendMessage', {
        chat_id: creator.telegram_id,
        text: `⚠️ *Payment Verification Action Required*\n\nAn order for *${product.title}* requires manual review.\n\nReason: *${mismatchReason}*\nFraud Score: *${visionResult.fraud_score}*\n\nPlease inspect the receipt upload in your bank account before delivering the product.`,
        parse_mode: 'Markdown',
      });

      return NextResponse.json({
        success: false,
        status: 'manual_review',
        reason: mismatchReason,
        extracted_data: visionResult,
      });
    }
  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
