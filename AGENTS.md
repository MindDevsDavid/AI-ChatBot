# AGENTS.md

## Project Overview
WhatsApp chatbot for INFIBAGUE (public entity, Ibagué, Colombia). Uses Groq AI (Llama 3.3 70B) to handle citizen PQRSD (petitions/complaints) and general queries.

## Commands
```bash
npm start   # Run the bot (node src/index.js)
```

## Requirements
- Node.js v18+
- Groq API key in `.env` as `GROQ_API_KEY`
- WhatsApp linked via QR code shown in terminal on first run
- `assets/politica-datos.pdf` must exist (sent during registration flow)

## Architecture
- **Entry point:** `src/index.js` — orchestrates WhatsApp events, AI calls, and flow responses
- **`src/whatsapp.js`** — WhatsApp client setup (uses `LocalAuth` for session persistence)
- **`src/flow.js`** — conversation state machine; sessions stored in-memory Map keyed by userId
- **`src/ai.js`** — Groq API calls: `getAIResponse()` for general Q&A, `classifyPQRSD()` for PQRSD classification
- **`src/config.js`** — system prompts (`systemPrompt` for Q&A, `pqrsdPrompt` for classification), model config (`llama-3.3-70b-versatile`)

## Session Flow (per user)
1. `greeting` → sends PDF policy, waits for "SI"/"NO"
2. `ask_name` → `ask_email` → `ask_phone` → `menu`
3. `menu`: option 1 → PQRSD flow; option 2 → AI consultas; option 3 → contact info
4. PQRSD: user describes → AI classifies → user confirms → radicado generated
5. Consultas: free-form AI response, "MENU" returns to menu

## Key Patterns
- AI responses capped at 700 chars (`config.maxResponseLength`)
- `classifyPQRSD` uses `response_format: { type: "json_object" }` and expects JSON parse
- `handleFlow` returns `{ response, sendPolicy, useAI }`; `index.js` routes based on `useAI`
- `setPQRSDClassification` is called from `index.js` after AI returns (advances step to `pqrsd_confirm`)
- `POLICY_PDF_PATH` resolved relative to `__dirname` pointing to `assets/politica-datos.pdf`

## WhatsApp Filters
- Ignores: group messages, status broadcasts, own messages, non-text messages
- Session stored in `.wwebjs_auth/` (gitignored)

## Gotchas
- `.wwebjs_auth/` and `.wwebjs_cache/` are gitignored — WhatsApp session is device-specific
- `.env` is gitignored — contains `GROQ_API_KEY`
- `assets/politica-datos.pdf` is NOT gitignored — committed to repo
- No tests, no linter, no type checker defined
- No codegen or migrations