\# SOURCE OF TRUTH - DOC 4: CODE CONVENTION \& ARCHITECTURE



\## 1. Framework Rules

\- Use Next.js App Router (`/app` directory).

\- All UI components must be styled EXCLUSIVELY with Tailwind CSS. Do not use heavy UI libraries (Material, Chakra).

\- Use TypeScript strictly. No `any` types. Generate Supabase database types and strictly type all API responses.



\## 2. Telegram Mini App Integration

\- Use `@twa-dev/sdk` for all frontend Telegram interactions.

\- Parsing Deep Links: Use `Telegram.WebApp.initDataUnsafe.start\_param` in a `useEffect` at the root layout to route buyers directly to specific `product\_id` storefronts.

\- UI constraints: Adhere to `Telegram.WebApp.themeParams` to dynamically match the user's Dark/Light mode. 



\## 3. Modularity \& Idempotency

\- Build the app in isolated functional sprints. Do not mix Payment Logic with UI generation in the same commit.

\- Idempotency is CRITICAL: All payment endpoints (`/api/checkout/...`) must check if an `order\_id` is already `approved` before fulfilling. This prevents double-spending or duplicate content delivery in case of network retries or double-clicks.

