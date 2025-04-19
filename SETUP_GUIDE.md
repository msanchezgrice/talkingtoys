# Talking Objects Setup Guide

This guide will help you set up and run the Talking Objects project in Cursor IDE.

## 1 — Create a local workspace
1. In Cursor's sidebar click **File ▸ Open Folder…** → pick a new empty directory (e.g. `~/dev/talking-objects`).
2. Open the built‑in terminal with **⌃`** or **Terminal ▸ New Terminal**.

## 2 — Bootstrap the Expo app

```bash
# Still inside Cursor's terminal
npx create-expo-app@latest apps/mobile --template blank-typescript
```

This scaffolds an Expo SDK 50 project in apps/mobile.

## 3 — Add the Edge Function + monorepo wiring

```bash
mkdir api
cd api && pnpm init -y
```

Cursor auto‑detects pnpm scripts so you'll see them in the Run & Debug panel.

## 4 — Copy code from the repository

For each file in the repository, you'll need to:
1. Create the files with the same path structure as in the repository
2. Copy the content from the repository into each file

Key files to create:
- `apps/mobile/App.tsx` - Main app component
- `apps/mobile/src/constants.ts` - WebSocket URL and system prompt
- `api/realtime/index.ts` - Vercel Edge Function WebSocket proxy
- `package.json` - Root monorepo config
- `pnpm-workspace.yaml` - Workspace configuration
- `api/package.json` - API package config
- `.env` files in both api and apps/mobile directories

## 5 — Install dependencies

```bash
npm install -g pnpm  # if you don't have pnpm installed
pnpm install         # at repo root; will hoist deps for both workspaces
```

## 6 — Add environment files
- In `apps/mobile/.env` paste:
```
AUDIO_WS_URL=wss://<your-vercel-url>/api/realtime
```

- In `api/.env` paste your OpenAI API key:
```
OPENAI_KEY=sk-your-api-key-here
```

## 7 — Run everything from Cursor

```bash
# one terminal tab for Vercel Edge local:
cd api && npx vercel dev

# new terminal tab for Expo:
cd ../apps/mobile && npx expo start --ios   # or --tunnel for physical device
```

Expo CLI output appears right in Cursor's terminal; click the QR code if you're on a real iPhone.

## 8 — Pair the Soundcore Mini
- On your iPhone: **Settings ▸ Bluetooth ▸ Soundcore Mini**.
- In the app: tap **Connect** → hold the 🎙️ button to talk → hear the reply over the speaker.

## 9 — Deploy

1. Edge Function:
```bash
cd api && npx vercel --prod
```

2. Expo archive for TestFlight:
```bash
npx eas build -p ios --profile preview    # if using EAS
# or expo build:ios (classic)
```

## Quick sanity checklist

| What you should see | If not… |
|---|---|
| WebSocket connected log in the Expo app | Check AUDIO_WS_URL value & Vercel tunnel output |
| Blue LED on Soundcore stays solid when chat starts | Speaker not selected as audio route → open Control Center > AirPlay |
| Voice answers but cuts mid‑sentence | Increase Expo Audio.setAudioModeAsync({ staysActiveInBackground:true }) | 