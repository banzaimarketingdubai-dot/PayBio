import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// Helper to verify that the request is made by the product's creator
async function verifyCreator(productId: string, userTgId: number) {
  const product = await db.getProductById(productId);
  if (!product) {
    return { error: 'Product not found', status: 404 };
  }
  // The product has creator_id which links to the users table
  const creator = await db.getUserById(product.creator_id);
  if (!creator) {
    return { error: 'Creator not found', status: 404 };
  }
  if (Number(creator.telegram_id) !== Number(userTgId)) {
    return { error: 'Unauthorized. Only the storefront owner can perform this action.', status: 403 };
  }
  return { success: true };
}

export async function POST(request: Request) {
  try {
    const { product_id, slot_time, user_tg_id } = await request.json();

    if (!product_id || !slot_time || user_tg_id === undefined) {
      return NextResponse.json({ success: false, error: 'product_id, slot_time, and user_tg_id are required.' }, { status: 400 });
    }

    const verification = await verifyCreator(product_id, user_tg_id);
    if (verification.error) {
      return NextResponse.json({ success: false, error: verification.error }, { status: verification.status });
    }

    // Check if slot is already occupied
    const bookings = await db.getBookingsByProductId(product_id);
    const hasOverlap = bookings.some((b: any) => {
      if (b.status !== 'SCHEDULED') return false;
      const start = new Date(b.slot_start_time).getTime();
      const reqStart = new Date(slot_time).getTime();
      return start === reqStart;
    });

    if (hasOverlap) {
      return NextResponse.json({ success: false, error: 'This slot is already booked or blocked.' }, { status: 400 });
    }

    // Create a manual block slot booking (order_id is null)
    // End time is the same as start time for simplicity and consistency with the checkout flow
    await db.createBooking(product_id, null, slot_time, slot_time);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Block slot error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const slotTime = searchParams.get('slot_time');
    const userTgId = searchParams.get('user_tg_id');

    if (!productId || !slotTime || !userTgId) {
      return NextResponse.json({ success: false, error: 'product_id, slot_time, and user_tg_id parameters are required.' }, { status: 400 });
    }

    const verification = await verifyCreator(productId, Number(userTgId));
    if (verification.error) {
      return NextResponse.json({ success: false, error: verification.error }, { status: verification.status });
    }

    // Find and delete the manual block
    const bookings = await db.getBookingsByProductId(productId);
    const reqTimeMs = new Date(slotTime).getTime();
    const manualBlock = bookings.find((b: any) => {
      const start = new Date(b.slot_start_time).getTime();
      return start === reqTimeMs && b.order_id === null && b.status === 'SCHEDULED';
    });

    if (!manualBlock) {
      return NextResponse.json({ success: false, error: 'No manual block found for this slot.' }, { status: 404 });
    }

    await db.deleteBooking(manualBlock.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unblock slot error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
