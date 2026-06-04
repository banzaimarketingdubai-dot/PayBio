# SOURCE OF TRUTH - DOC 5: VIRAL & GROWTH MECHANICS (NATIVE TELEGRAM AFFILIATE)

## 1. Passive Virality (The "Watermark" Loop)
**Concept:** Every transaction and storefront acts as an organic billboard for Paybio.
**Implementation:**
- If `users.is_premium` is FALSE, inject a prominent footer on the public product page: *"⚡️ Powered by Paybio - Create your AI store in 1 minute"*. Clicking this routes the buyer to the Paybio Bot onboarding.
- When the bot delivers the digital asset to the buyer, it MUST append an inline button to the message: `[ 🤖 Start selling your own digital products ]`.

## 2. Active Virality (Native Telegram Affiliate Program)
**Concept:** Creators invite other creators and earn a percentage of their Premium subscription payments.
**Implementation (ZERO BACKEND CODE REQUIRED):**
- DO NOT create any database tables, logic, or endpoints for referral tracking, balance calculation, or affiliate payouts.
- We will use the **Native Telegram Affiliate Program** for Bots/Mini Apps configured via BotFather.
- **UI Task:** In the Creator Dashboard, add a "Invite & Earn 10%" button. 
- This button triggers the native Telegram sharing interface, generating a standard Telegram start link. Telegram's servers will automatically track the attribution, split the Star payments (10% to the referrer), and credit the balances. Our app only needs to process standard successful invoice webhooks.

## 3. AI-Generated Promo Content
**Implementation:**
- Add an endpoint: `GET /api/promo/generate?product_id={id}`
- Prompt the LLM: "Act as a social media manager. Based on this product title and description, write a short, high-conversion Telegram post (max 3 sentences) offering this product."
- Display this text in the Creator UI with a one-click "Copy" button.
