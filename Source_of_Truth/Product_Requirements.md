\# SOURCE OF TRUTH - DOC 1: PRODUCT REQUIREMENTS DOCUMENT (PRD)



\## 1. Project Overview

\*\*Name:\*\* Paybio

\*\*Platform:\*\* Telegram Mini App (TMA)

\*\*Tech Stack:\*\* Next.js (App Router), React, Tailwind CSS, Supabase, Vercel, Telegram WebApp SDK (@twa-dev/sdk).

\*\*Core Concept:\*\* An AI-first, zero-friction storefront inside Telegram for digital products. No drag-and-drop builders. Creators send text/voice, AI generates the store.



\## 2. User Roles \& Monetization (MVP Scope)

\*\*Role 1: Creator (Seller)\*\*

\- Onboarding via Telegram ID.

\- Generates products automatically by sending product descriptions to an AI API.

\- Can input payment details (TON Wallet, or local P2P/UPI details).

\- Monetization (Premium Tier): Can upgrade to Premium ($5/mo via Telegram Stars OR \~$3.5 via TON/USDT) to remove "Powered by Paybio" watermark, unlock custom UI, and get unlimited deep links.



\*\*Role 2: Buyer\*\*

\- Opens storefront via Deep Link or Bio Link in Telegram.

\- Clicks "Buy" and pays via one of 3 methods: Telegram Stars, Crypto (TON/USDT), or Local P2P.

\- Receives digital product (PDF/Link) directly in Telegram bot instantly after payment.



\## 3. Strict Exclusions for MVP (DO NOT BUILD)

\- NO physical products, shopping carts, or delivery addresses.

\- NO complex analytics dashboards (only basic sales count).

\- NO manual store builder UI (rely strictly on AI generation).

\- NO manual receipt approval interface for sellers (must be automated via AI).

