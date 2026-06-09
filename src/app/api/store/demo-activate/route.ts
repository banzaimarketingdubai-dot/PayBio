import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { telegram_id, username, store_name } = await request.json();

    if (!telegram_id) {
      return NextResponse.json({ error: 'Telegram ID is required' }, { status: 400 });
    }

    const tgId = Number(telegram_id);
    if (isNaN(tgId) || tgId <= 0) {
      return NextResponse.json({ error: 'Invalid Telegram ID' }, { status: 400 });
    }

    // 1. Check if user already exists or upsert them.
    // Upserting creates/loads the user profile.
    let creator = await db.getUserByTelegramId(tgId);
    if (!creator) {
      // Create user. For newly converted demo store owners, we'll initialize them
      // with a custom store name and mark onboarding_completed as false so onboarding launches.
      creator = await db.upsertUser(tgId, username || `user_${tgId}`);
    }

    // 2. Customize store profile for the new store.
    // Initialize profile_customization with the custom store name and onboarding_completed = false
    const currentCustomization = creator.profile_customization || {};
    const updatedCustomization = {
      ...currentCustomization,
      store_name: store_name || currentCustomization.store_name || `Магазин ${username || tgId}`,
      onboarding_completed: false, // Ensure onboarding triggers!
    };

    // Save the customized profile
    const updatedCreator = await db.updateUserProfile(creator.id, updatedCustomization);

    return NextResponse.json({
      success: true,
      creator: updatedCreator,
    });
  } catch (error: any) {
    console.error('Demo activation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
