# TradingView AMD & Volume Profile Pine Script Studio

A React/Vite trading dashboard for XAU/USD (Gold): live candles (Binance PAXG/USDT feed,
with a synthetic fallback if that's unreachable), Order Block / OTE / BOS-CHoCH detection,
AMD (Power of 3) analysis, a Fixed Range Volume Profile with POC, a Pine Script v5 generator,
a signal journal, and a trade simulator. AI features (live analysis, self-improvement study,
Pine Script review) are powered by Google's Gemini API.

This build has been restructured from its original Express server into **Vercel serverless
functions**, so it deploys cleanly as a static Vite frontend + `/api` functions — no server to
manage.

> Educational tool only. Nothing here is financial advice, and no strategy or AI output
> guarantees trading results.

## 1. Get a free Gemini API key (optional, only needed for AI features)

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account and click "Create API key" — it's free.
3. Copy the key.

Without a key, the app still works fully (charts, Pine Script viewer, journal, simulator);
the three AI endpoints will just return a friendly "not configured" message.

## 2. Run locally

```bash
npm install
cp .env.example .env.local   # then paste your key into .env.local
npm run dev
```

This starts Vite only. The `/api/*` functions won't run under plain `vite dev` — to test them
locally too, use the Vercel CLI instead:

```bash
npm i -g vercel
vercel dev
```

## 3. Deploy to Vercel

**Option A — CLI (fastest):**
```bash
npm i -g vercel
vercel login
vercel            # deploys a preview
vercel --prod     # promotes to production
```
When prompted, set the `GEMINI_API_KEY` environment variable (or add it afterwards in the
dashboard — see below).

**Option B — Dashboard / GitHub:**
1. Push this folder to a GitHub repo.
2. In the Vercel dashboard: **Add New → Project → Import** your repo.
3. Framework preset: **Vite** (auto-detected). Build command `vite build`, output `dist`
   (already set in `vercel.json`).
4. Under **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your key (Production + Preview)
5. Deploy.

## Project structure

```
src/            React app (components, chart logic, Pine Script generator, journal)
api/            Vercel serverless functions
  gold/live.ts                 GET  /api/gold/live                live/synthetic candle data
  gold/ai-analysis.ts          POST /api/gold/ai-analysis         Gemini market analysis
  gold/ai-self-improvement.ts  POST /api/gold/ai-self-improvement Gemini journal study
  ai/analyze-script.ts         POST /api/ai/analyze-script        Gemini Pine Script review
  health.ts                    GET  /api/health
lib/gemini.ts   Shared Gemini client with automatic model fallback
vercel.json     Vercel build + SPA routing config
```
