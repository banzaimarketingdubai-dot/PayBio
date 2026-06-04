import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const results: Record<string, any> = {};

  // Check env vars (masked)
  results.env = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ set' : '❌ missing',
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ set (' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20) + '...)' : '❌ missing',
    service: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set (' + process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 20) + '...)' : '❌ missing',
  };

  // Test users table
  try {
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
    results.users_table = error ? `❌ ${error.message}` : `✅ exists (${count} rows)`;
  } catch (e: any) {
    results.users_table = `❌ exception: ${e.message}`;
  }

  // Test products table
  try {
    const { data, error, count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true });
    results.products_table = error ? `❌ ${error.message}` : `✅ exists (${count} rows)`;
  } catch (e: any) {
    results.products_table = `❌ exception: ${e.message}`;
  }

  // Test orders table
  try {
    const { data, error, count } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });
    results.orders_table = error ? `❌ ${error.message}` : `✅ exists (${count} rows)`;
  } catch (e: any) {
    results.orders_table = `❌ exception: ${e.message}`;
  }

  // Test upsert user
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({ telegram_id: 999999999, username: 'test_diagnostic' }, { onConflict: 'telegram_id' })
      .select()
      .single();
    results.upsert_user = error ? `❌ ${error.message}` : `✅ works, id: ${data?.id}`;
    // Clean up
    if (data?.id) {
      await supabaseAdmin.from('users').delete().eq('id', data.id);
    }
  } catch (e: any) {
    results.upsert_user = `❌ exception: ${e.message}`;
  }

  return NextResponse.json(results);
}
