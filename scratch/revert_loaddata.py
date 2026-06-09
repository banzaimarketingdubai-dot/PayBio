#!/usr/bin/env python3
"""
Revert the loadData getTWA() change back to synchronous window.Telegram read,
now that telegram.ts is restored to the original @twa-dev/sdk dynamic import.
"""
import sys

TARGET = r"c:\Sher_AI_Studio\projects\PayBio\src\app\page.tsx"

with open(TARGET, "r", encoding="utf-8") as f:
    src = f.read()

OLD_LOAD = """          // Use the cached getTWA() result — window.Telegram.WebApp may not yet be
          // available synchronously when this useEffect fires (polling in telegram.ts).
          let bTgId = String(buyerTgId);
          let bUsername = '';
          let bName = '';
          try {
            const wa = await getTWA();
            const u = wa?.initDataUnsafe?.user;
            if (u?.id) {
              bTgId = String(u.id);
              bUsername = u.username || '';
              bName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            }
          } catch (_) {
            // Fallback: synchronous read if getTWA stub has no initDataUnsafe
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
              const u = (window as any).Telegram.WebApp.initDataUnsafe.user;
              bTgId = String(u.id);
              bUsername = u.username || '';
              bName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            }
          }
          if (signal.aborted) return;
          const res = await fetch(`/api/store/list?product_id=${productId}&buyer_tg_id=${bTgId}&buyer_username=${encodeURIComponent(bUsername)}&buyer_name=${encodeURIComponent(bName)}`, { signal });"""

NEW_LOAD = """          let bTgId = String(buyerTgId);
          let bUsername = '';
          let bName = '';
          if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
            const u = (window as any).Telegram.WebApp.initDataUnsafe.user;
            bTgId = String(u.id);
            bUsername = u.username || '';
            bName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          }
          const res = await fetch(`/api/store/list?product_id=${productId}&buyer_tg_id=${bTgId}&buyer_username=${encodeURIComponent(bUsername)}&buyer_name=${encodeURIComponent(bName)}`, { signal });"""

if OLD_LOAD in src:
    src = src.replace(OLD_LOAD, NEW_LOAD, 1)
    print("[PATCH OK] Reverted loadData to synchronous window.Telegram read")
else:
    print("[PATCH SKIP] getTWA block not found (may already be reverted)")

with open(TARGET, "w", encoding="utf-8") as f:
    f.write(src)

print("Done.")
