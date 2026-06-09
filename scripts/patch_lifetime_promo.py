import sys

FILE = r'c:\Sher_AI_Studio\projects\PayBio\src\lib\supabase.ts'

with open(FILE, 'rb') as f:
    raw = f.read()

src = raw.decode('utf-8')

def patch(src, old, new, tag):
    # Normalize to LF for matching
    old_lf = old.replace('\r\n', '\n').replace('\r', '\n')
    # Convert src to LF for searching  
    src_lf = src.replace('\r\n', '\n').replace('\r', '\n')
    if old_lf not in src_lf:
        sys.exit("PATCH " + tag + " target not found!")
    src_lf = src_lf.replace(old_lf, new.replace('\r\n', '\n').replace('\r', '\n'), 1)
    # Restore CRLF
    return src_lf.replace('\n', '\r\n')

# PATCH 1: Add lifetime code to dynamic init promo_codes
OLD1 = """          {
            id: 'mock-promo-1',
            code: 'PAYBIO_FREE_30',
            duration_days: 30,
            max_uses: 1000,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
        try {
          fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {}"""

NEW1 = """          {
            id: 'mock-promo-1',
            code: 'PAYBIO_FREE_30',
            duration_days: 30,
            max_uses: 1000,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-promo-lifetime',
            code: 'PAYBIO_LIFETIME_2025',
            duration_days: -1,
            max_uses: 1,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
        try {
          fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {}"""

src = patch(src, OLD1, NEW1, "1")
print("[OK] Patch 1: lifetime code in dynamic init")

# PATCH 2: Add lifetime code to defaultDb
OLD2 = """    promo_codes: [
      {
        id: 'mock-promo-1',
        code: 'PAYBIO_FREE_30',
        duration_days: 30,
        max_uses: 1000,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],"""

NEW2 = """    promo_codes: [
      {
        id: 'mock-promo-1',
        code: 'PAYBIO_FREE_30',
        duration_days: 30,
        max_uses: 1000,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-promo-lifetime',
        code: 'PAYBIO_LIFETIME_2025',
        duration_days: -1,
        max_uses: 1,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],"""

src = patch(src, OLD2, NEW2, "2")
print("[OK] Patch 2: lifetime code in defaultDb")

# PATCH 3: activatePremium handles -1
OLD3 = """  async activatePremium(userId: string, durationDays: number) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    let currentPremiumUntil = user.premium_until ? new Date(user.premium_until) : new Date();
    // If user is not currently premium or has expired premium, start from now
    if (!user.is_premium || currentPremiumUntil.getTime() < Date.now()) {
      currentPremiumUntil = new Date();
    }
    
    // Add durationDays
    currentPremiumUntil.setDate(currentPremiumUntil.getDate() + durationDays);
    const newPremiumUntilStr = currentPremiumUntil.toISOString();
    
    return await this.updateUserPremium(userId, true, newPremiumUntilStr);
  },"""

NEW3 = """  async activatePremium(userId: string, durationDays: number) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    // -1 = lifetime premium (no expiry date)
    if (durationDays === -1) {
      return await this.updateUserPremium(userId, true, null);
    }

    let currentPremiumUntil = user.premium_until ? new Date(user.premium_until) : new Date();
    // If user is not currently premium or has expired premium, start from now
    if (!user.is_premium || currentPremiumUntil.getTime() < Date.now()) {
      currentPremiumUntil = new Date();
    }
    
    // Add durationDays
    currentPremiumUntil.setDate(currentPremiumUntil.getDate() + durationDays);
    const newPremiumUntilStr = currentPremiumUntil.toISOString();
    
    return await this.updateUserPremium(userId, true, newPremiumUntilStr);
  },"""

src = patch(src, OLD3, NEW3, "3")
print("[OK] Patch 3: activatePremium handles lifetime")

# PATCH 4: verifyAndApply fallback init
OLD4 = """      const mockDb = readMockDb();
      if (!mockDb.promo_codes) {
        mockDb.promo_codes = [
          {
            id: 'mock-promo-1',
            code: 'PAYBIO_FREE_30',
            duration_days: 30,
            max_uses: 1000,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
      }"""

NEW4 = """      const mockDb = readMockDb();
      if (!mockDb.promo_codes) {
        mockDb.promo_codes = [
          {
            id: 'mock-promo-1',
            code: 'PAYBIO_FREE_30',
            duration_days: 30,
            max_uses: 1000,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-promo-lifetime',
            code: 'PAYBIO_LIFETIME_2025',
            duration_days: -1,
            max_uses: 1,
            used_count: 0,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
      }"""

src = patch(src, OLD4, NEW4, "4")
print("[OK] Patch 4: verifyAndApply fallback includes lifetime code")

with open(FILE, 'wb') as f:
    f.write(src.encode('utf-8'))

print("")
print("All 4 patches applied successfully!")
