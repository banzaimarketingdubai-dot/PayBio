import path from 'path';
import fs from 'fs';

// Manually parse .env.local to avoid extra package dependencies
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          let value = parts.slice(1).join('=').trim();
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.warn('Could not manually load .env.local:', e);
}

import { generateLayoutFirstPrompt } from '../src/lib/gemini';
import { generateImage } from '../src/lib/runware';
import { db } from '../src/lib/supabase';

async function runTest() {
  console.log('--- Starting Stories Banner Workstation Integration Test ---');
  console.log('REVE_API_KEY set:', !!process.env.REVE_API_KEY);
  console.log('GEMINI_API_KEY set:', !!process.env.GEMINI_API_KEY);

  try {
    // 1. Ensure we have a mock product and a premium user in mock_db
    const mockDb = require('../mock_db.json');
    let user = mockDb.users.find((u: any) => u.username === 'test_premium_creator');
    if (!user) {
      console.log('Creating mock premium user...');
      user = {
        id: 'test-creator-uuid-12345',
        telegram_id: 11223344,
        username: 'test_premium_creator',
        is_premium: true,
        premium_until: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days
        premium_source: 'paid',
        created_at: new Date().toISOString()
      };
      mockDb.users.push(user);
    }

    let product = mockDb.products.find((p: any) => p.creator_id === user.id);
    if (!product) {
      console.log('Creating mock product...');
      product = {
        id: 'test-product-uuid-12345',
        creator_id: user.id,
        title: 'Управление Разумом 101',
        description: 'Электронная книга о практической психологии и контроле эмоций в повседневной жизни.',
        price_fiat: 15.00,
        price_stars: 750,
        content_url: 'https://example.com/ebook.pdf',
        cover_url: null,
        product_type: 'DIGITAL',
        created_at: new Date().toISOString()
      };
      mockDb.products.push(product);
    }

    // Save changes to mock db file
    const fs = require('fs');
    fs.writeFileSync(path.resolve(process.cwd(), 'mock_db.json'), JSON.stringify(mockDb, null, 2), 'utf-8');

    console.log(`Using product: "${product.title}" (${product.id})`);

    // 2. Generate Layout-First prompt
    console.log('\nStep 1: Generating Layout-First prompt via Gemini...');
    const prompt = await generateLayoutFirstPrompt(
      product.title,
      product.description,
      `$${product.price_fiat}`,
      'Psychology'
    );
    console.log('Generated Layout-First Prompt:\n', prompt);

    // 3. Generate image using Reve 2.0
    console.log('\nStep 2: Calling Reve 2.0 API to generate banner...');
    const imageUrl = await generateImage(prompt);
    console.log('Result Banner URL:', imageUrl);

    if (imageUrl && !imageUrl.includes('photo-1618005182384-a83a8bd57fbe')) {
      console.log('\n✅ Reve 2.0 banner generated successfully!');
    } else {
      console.log('\n⚠️ Banner generated, but fell back to default placeholder. Check REVE_API_KEY.');
    }

    // 4. Test database update method
    console.log('\nStep 3: Updating product banner in DB...');
    const updatedProd = await db.updateProductBanner(product.id, imageUrl);
    console.log('Saved banner_url in DB:', updatedProd?.banner_url === imageUrl);

  } catch (err: any) {
    console.error('\n❌ Test failed with error:', err);
  }
}

runTest();
