import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log("Checking products table columns...");
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')
    .limit(1);

  if (productsError) {
    console.error("Error fetching products:", productsError.message);
  } else {
    console.log("Products table structure is available.");
    const sample = productsData[0] || {};
    console.log("Sample product keys:", Object.keys(sample));
    console.log("Does sub_type exist?", 'sub_type' in sample);
  }

  console.log("\nChecking vouchers table...");
  const { data: vouchersData, error: vouchersError } = await supabase
    .from('vouchers')
    .select('*')
    .limit(1);

  if (vouchersError) {
    console.error("Error fetching vouchers:", vouchersError.message);
  } else {
    console.log("Vouchers table exists. Sample keys:", Object.keys(vouchersData[0] || {}));
  }
}

checkSchema().catch(console.error);
