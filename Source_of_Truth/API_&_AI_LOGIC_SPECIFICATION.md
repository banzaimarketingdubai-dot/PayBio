\# SOURCE OF TRUTH - DOC 3: API \& AI LOGIC SPECIFICATION



\## Endpoint 1: POST /api/store/generate

\*\*Purpose:\*\* AI-driven product creation (Zero-friction onboarding).

\*\*Input:\*\* JSON { creator\_id, raw\_text }

\*\*Process:\*\*

1\. Pass `raw\_text` to LLM (e.g., OpenAI API).

2\. Prompt LLM to extract: `title`, `description`, `price`.

3\. Auto-generate product image/placeholder if not provided via standard image generation API.

4\. Save to `products` table in Supabase.

\*\*Output:\*\* JSON with `product\_id` and unique Telegram Deep Link to the Paybio store.



\## Endpoint 2: POST /api/checkout/verify (The Smart Fulfillment Anti-Fraud Pipeline)

\*\*Purpose:\*\* Automated fulfillment for P2P payments without seller intervention.

\*\*Input:\*\* FormData (Image file of the receipt, order\_id)

\*\*Process pipeline (STRICT ORDER):\*\*

1\. \*\*EXIF Check:\*\* Run backend script (e.g., `exif-parser`). If metadata is stripped or indicates Adobe/Web editor -> set status `manual\_review`.

2\. \*\*ELA/Fraud Check:\*\* Pass through basic compression analysis API (if configured). 

3\. \*\*Vision LLM:\*\* If technical checks pass, send image to lightweight Vision LLM (e.g., GPT-4o-mini). Prompt: "Extract amount, date, and receiver name. Return JSON."

4\. \*\*Logic Match:\*\* Compare LLM output with expected data in `orders` and `products` tables. 

&#x20;  - If exact match -> set status `approved`, trigger Telegram Bot API to send `content\_url` to `buyer\_tg\_id`.

&#x20;  - If mismatch or hallucination -> set status `manual\_review` and notify Creator.

\*\*Output:\*\* Result status.

