import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { fetchBusySlots, mergeIntervals, BusyInterval } from '@/lib/calendar';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { error: 'Missing product_id parameter.' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return NextResponse.json({ error: 'Invalid product ID format.' }, { status: 400 });
    }

    // 1. Fetch product
    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found.' },
        { status: 404 }
      );
    }

    const busySlots: BusyInterval[] = [];

    // 2. Fetch database bookings
    const dbBookings = await db.getBookingsByProductId(productId);
    const now = new Date();

    if (dbBookings && dbBookings.length > 0) {
      dbBookings.forEach((b: any) => {
        // Only consider active scheduled bookings
        if (b.status === 'SCHEDULED') {
          const start = new Date(b.slot_start_time);
          const end = new Date(b.slot_end_time);
          
          if (end > now) {
            busySlots.push({
              start: start.toISOString(),
              end: end.toISOString()
            });
          }
        }
      });
    }

    // 3. Fetch external calendar bookings if configured
    let icsUrl = '';
    if (product.creator?.payment_details?.ics_url) {
      icsUrl = product.creator.payment_details.ics_url.trim();
    } else {
      try {
        const content = JSON.parse(product.content_url);
        if (content && typeof content.ics_url === 'string') {
          icsUrl = content.ics_url.trim();
        }
      } catch {
        // Not a JSON structure, ignore external calendar
      }
    }

    if (icsUrl) {
      const extSlots = await fetchBusySlots(icsUrl);
      extSlots.forEach(slot => {
        busySlots.push(slot);
      });
    }

    // 4. Merge overlapping slots
    const mergedBusySlots = mergeIntervals(busySlots);

    return NextResponse.json({
      success: true,
      busySlots: mergedBusySlots,
      bookings: dbBookings ? dbBookings.map((b: any) => ({
        id: b.id,
        start: b.slot_start_time,
        end: b.slot_end_time,
        order_id: b.order_id,
        status: b.status
      })) : []
    });
  } catch (error: any) {
    console.error('Error fetching busy slots:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
