# Talking Objects PoC (Soundcore Mini track)

This repo contains:
1. **Expo iOS app** (`apps/mobile`) – captures mic audio, streams it to a Vercel Edge WebSocket, plays back the GPT‑4o **Realtime** audio stream through any paired Bluetooth speaker (e.g. Anker Soundcore Mini).
2. **Edge Function** (`api/realtime/index.ts`) – pure pass‑through that pipes the duplex WebSocket to OpenAI's `/v1/audio/chat/completions` endpoint.
3. **Supabase schema** – stores personas and chat transcripts.

## Prerequisites
- Node ≥ 20, pnpm ≥ 8 (`npm i -g pnpm`)
- Expo SDK 50 (`npm i -g expo-cli`)
- Xcode 15 (for Simulator + TestFlight build)
- Vercel account (Hobby)
- Supabase project (free tier)
- OpenAI API key with Realtime beta enabled

## 1 — Clone & bootstrap
```bash
pnpm install
# copy env template
cp apps/mobile/.env.example apps/mobile/.env
cp api/.env.example api/.env
```

## 2 — Run local dev
```bash
# Start Edge Function locally (vercel dev)
cd api && vercel dev &
# Start Expo app
cd ../apps/mobile && expo start --ios
```

Pair your Soundcore Mini via macOS → iPhone Simulator loses BT. Use a physical iPhone for audio loop.

## 3 — Deploy
```bash
vercel --prod        # deploy Edge
expo build:ios       # build archive → upload to TestFlight
```

## 4 — Supabase SQL
```sql
-- run in Supabase SQL Editor
create table toys (
  id uuid primary key default gen_random_uuid(),
  owner uuid,
  name text,
  persona jsonb,
  toy_img_url text,
  child_ctx jsonb,
  created_at timestamptz default now()
);
create table chats (
  id uuid primary key default gen_random_uuid(),
  toy_id uuid references toys(id),
  role text,
  content text,
  tokens int,
  ts timestamptz default now()
);
``` 