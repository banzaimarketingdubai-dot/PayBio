# SOURCE OF TRUTH - DOC 1: PRODUCT REQUIREMENTS DOCUMENT (PRD) (UPDATED)

## 1. Project Overview
**Name:** Paybio
**Platform:** Telegram Mini App (TMA)
**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Supabase, Vercel, Telegram WebApp SDK (@twa-dev/sdk).
**Core Concept:** An AI-first, zero-friction storefront inside Telegram for digital products. No drag-and-drop builders. Creators send text/voice, AI generates the store.

## 2. User Roles & Monetization (MVP Scope)
**Role 1: Creator (Seller)**
- Onboarding via Telegram ID.
- Generates products automatically by sending product descriptions to an AI API.
- Can input payment details (TON Wallet, or local P2P/UPI details).
- **Monetization (B2B Premium Tier):** Creators upgrade to Premium to remove the "Powered by Paybio" watermark, unlock custom UI, and get unlimited deep links. 
- **CRITICAL:** The Premium subscription costs ~$9.99/mo and is paid **EXCLUSIVELY in Telegram Stars** using Telegram's native invoice system. No other payment methods are allowed for the Premium subscription.

**Role 2: Buyer**
- Opens storefront via Deep Link or Bio Link in Telegram.
- Clicks "Buy" and pays the Creator via any method configured by the Creator (Crypto, P2P, etc.).
- Receives digital product directly in Telegram bot instantly after payment validation.

## 3. Strict Exclusions for MVP (DO NOT BUILD)
- NO custom referral tracking or custom affiliate databases (handled natively by Telegram).
- NO physical products, shopping carts, or delivery addresses.
- NO complex analytics dashboards.
- NO manual store builder UI.
