# Eternova – Eternal Memory Layer for Indie Agents

Memory-powered. Founder-built. Let's ship.

Eternova is the dead-simple hosted memory layer so your Claude, Cursor, LangGraph, CrewAI, and other agents **never forget** your pricing, roadmap, customer notes, or founder vibe again.

Built in Nigeria by a solo vibe-coder using Grok + Lovable.dev. No SDK hell. No devops. Just upload your chaos and get a persistent brain.

Live at: https://eternova.xyz

## Features
- Upload anything: paste text, PDFs, screenshots, Notion exports, chat logs, URLs
- Extracts facts + behavioral profile (your tone, writing style, "let's ship" energy)
- Beautiful interactive knowledge graph
- Memory Playground – ask questions in natural language
- One-click API key for agents
- Freemium: 1 vault free, Pro $9/mo unlimited (Paystack – works globally, USA/UK/Canada pay in their currency)

## Quick Start (for users)
1. Go to https://eternova.xyz
2. Sign up (Google or magic link)
3. Create a vault ("My Founder Brain")
4. Upload or paste your notes, chats, PDFs
5. Ask in Memory Playground: "What is my pricing strategy?" or "Write a tweet like me"
6. Go to Integrations → copy API key
7. Paste into your agent tool (Claude Project instructions, LangGraph node, etc.)

Pro upgrade: https://paystack.shop/pay/g5hpex4o97 ($9/mo)

## For Developers & Integrations
API endpoint: POST https://eternova.xyz/functions/v1/vault-query  
Headers: `Authorization: Bearer YOUR_API_KEY`  
Body: `{ "message": "your query", "vault_id": "optional-uuid" }`  
Response: `{ "answer": "text", "memories": [...] }`

See /integrations for Zapier, n8n, Gumloop, LangGraph, CrewAI, Claude API snippets. SDK coming soon.

## Tech Stack
- Frontend: Next.js 14 (App Router)
- Backend: Supabase (auth, pgvector, storage)
- LLM: Groq (fast & cheap)
- Built with: Lovable.dev + Grok

## Running Locally
1. Clone the repo:
git clone https://github.com/zerotestlab-ctrl/eternova.git
 cd eternova

3. Install dependencies:

   npm install

4. Copy env example:

   cp .env.example .env.local

5. Fill .env.local with your keys (Supabase URL/anon key, Groq key, Paystack link).

6. Run locally:

   npm run dev

7. Open http://localhost:3000

## Contributing
Issues, PRs, feedback welcome. This is early — let's build together.

## License
MIT

Built with ❤️ in Nigeria by @ZEROTESTLAB  
If this helps your agent forget less, drop a star ⭐
