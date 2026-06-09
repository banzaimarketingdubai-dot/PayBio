#!/usr/bin/env python3
"""
Two targeted patches to src/app/page.tsx:
  1. Remove the passive:false touchend listener (causes iOS Telegram "This page couldn't load")
  2. Replace synchronous window.Telegram read in loadData with await getTWA()
"""
import re
import sys

TARGET = r"c:\Sher_AI_Studio\projects\PayBio\src\app\page.tsx"

with open(TARGET, "r", encoding="utf-8") as f:
    src = f.read()

original_len = len(src)

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1: Remove passive:false touchend — keep only multi-touch pinch block
# ─────────────────────────────────────────────────────────────────────────────
OLD_TOUCH = r"""  // Viewport Zoom Lock
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    let lastTouchTime = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchTime < 300) {
        e.preventDefault();
      }
      lastTouchTime = now;
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);"""

NEW_TOUCH = r"""  // Viewport Zoom Lock — only block multi-touch pinch zoom.
  // NOTE: Do NOT add a passive:false touchend listener here.
  // iOS Telegram interprets preventDefault on touchend as blocking a navigation
  // gesture and displays "This page couldn't load".
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);"""

if OLD_TOUCH in src:
    src = src.replace(OLD_TOUCH, NEW_TOUCH, 1)
    print("[PATCH 1 OK] touchend listener removed")
else:
    print("[PATCH 1 FAIL] Could not find touchend block — check indentation/line endings")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 2: Use await getTWA() in loadData instead of synchronous window.Telegram
# ─────────────────────────────────────────────────────────────────────────────
OLD_LOAD = """          let bTgId = String(buyerTgId);
          let bUsername = '';
          let bName = '';
          if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
            const u = (window as any).Telegram.WebApp.initDataUnsafe.user;
            bTgId = String(u.id);
            bUsername = u.username || '';
            bName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          }
          const res = await fetch(`/api/store/list?product_id=${productId}&buyer_tg_id=${bTgId}&buyer_username=${encodeURIComponent(bUsername)}&buyer_name=${encodeURIComponent(bName)}`, { signal });"""

NEW_LOAD = """          // Use the cached getTWA() result — window.Telegram.WebApp may not yet be
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

if OLD_LOAD in src:
    src = src.replace(OLD_LOAD, NEW_LOAD, 1)
    print("[PATCH 2 OK] loadData now uses await getTWA()")
else:
    print("[PATCH 2 FAIL] Could not find loadData buyer block — may already be patched or indentation differs")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# Write result
# ─────────────────────────────────────────────────────────────────────────────
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(src)

new_len = len(src)
print(f"\nDone. File size: {original_len} -> {new_len} bytes (delta {new_len - original_len:+d})")
