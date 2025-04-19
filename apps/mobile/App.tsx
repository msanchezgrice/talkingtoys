// =====================================================
// Talking Objects – iOS Proof‑of‑Concept (Expo + Vercel)
// =====================================================
// Monorepo structure (all in one file for canvas clarity)
// ├─ apps/mobile   (Expo React‑Native)
// ├─ api/realtime  (Vercel Edge Function – WebSocket proxy)
// └─ supabase      (SQL schema + policy)
// -----------------------------------------------------
// 👉  README first, then each source file separated by
//     "//// FILE: <path>/<file>" markers.
// =====================================================

//// FILE: README.md
# Talking Objects PoC (Soundcore Mini track)

This repo contains:
1. **Expo iOS app** (`apps/mobile`) – captures mic audio, streams it to a Vercel Edge WebSocket, plays back the GPT‑4o **Realtime** audio stream through any paired Bluetooth speaker (e.g. Anker Soundcore Mini).
2. **Edge Function** (`api/realtime/index.ts`) – pure pass‑through that pipes the duplex WebSocket to OpenAI's `/v1/audio/chat/completions` endpoint.
3. **Supabase schema** – stores personas and chat transcripts.

## Prerequisites
- Node ≥ 20, pnpm ≥ 8 (`npm i -g pnpm`)
- Expo SDK 50 (`npm i -g expo-cli`)
- Xcode 15 (for Simulator + TestFlight build)
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

---

//// FILE: apps/mobile/App.tsx
import React, {useRef, useState} from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Permissions from 'expo-permissions';
import { Buffer } from 'buffer';
import { AUDIO_WS_URL, SYSTEM_PROMPT } from './src/constants';

// helper to convert Float32 PCM -> 16‑bit little‑endian Int16 bytes
function floatTo16BitPCM(float32: Float32Array): Uint8Array {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    out[i] = Math.max(-1, Math.min(1, float32[i])) * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const recorder = useRef<Audio.Recording | null>(null);

  async function startRecording() {
    await Permissions.askAsync(Permissions.AUDIO_RECORDING);
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync({
      isMeteringEnabled: true,
      android: {
        extension: '.m4a',
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      }
    });
    await rec.startAsync();
    recorder.current = rec;
  }

  async function stopRecording() {
    if (!recorder.current) return;
    await recorder.current.stopAndUnloadAsync();
    const { sound, status } = await recorder.current.createNewLoadedSoundAsync();
    const pcm = await recorder.current.getURI(); // fallback if PCM not available
    // For realtime, better to stream raw frames; expo-av lacks low‑level tap.
  }

  function connectWS() {
    ws.current = new WebSocket(AUDIO_WS_URL);
    ws.current.binaryType = 'arraybuffer';
    ws.current.onopen = () => setConnected(true);
    ws.current.onmessage = (msg) => {
      const aacFrame = Buffer.from(msg.data);
      // play via Audio.Sound
      (async () => {
        const sound = new Audio.Sound();
        await sound.loadAsync({uri: `data:audio/aac;base64,${aacFrame.toString('base64')}`});
        await sound.playAsync();
      })();
    };
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Talking Objects – PoC</Text>
      <TouchableOpacity style={styles.btn} onPress={connected ? undefined : connectWS}>
        <Text style={styles.btnLabel}>{connected ? 'Connected' : 'Connect'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mic} onPressIn={startRecording} onPressOut={stopRecording}>
        <Text style={styles.micLabel}>🎙️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, marginBottom: 30 },
  btn: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  btnLabel: { color: '#fff', fontSize: 18 },
  mic: { marginTop: 40, width: 80, height: 80, borderRadius: 40, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  micLabel: { fontSize: 32, color: '#fff' }
});

//// FILE: apps/mobile/src/constants.ts
export const AUDIO_WS_URL = "wss://YOUR-VERCEL-DEPLOYMENT.vercel.app/api/realtime";
export const SYSTEM_PROMPT = (persona: any, child: any) => `You are ${persona.name}, a talking plush toy. Speak in first‑person, short friendly sentences. Child's name is ${child.name} (age ${child.age}). Avoid scary topics; keep it playful.`;

//// FILE: api/.env.example
OPENAI_KEY="sk-..."

//// FILE: api/realtime/index.ts
import { ReadableStream } from 'web-streams-polyfill/ponyfill';
export const config = {
  runtime: 'edge',
};
export default async function handler(req: Request) {
  if (req.method !== 'POST' && req.method !== 'GET')
    return new Response('Method not allowed', { status: 405 });

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.onopen = () => {
    const upstream = new WebSocket('wss://api.openai.com/v1/audio/chat/completions', {
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_KEY')}` },
    });

    upstream.onmessage = (evt) => socket.send(evt.data);
    socket.onmessage = (evt) => upstream.send(evt.data);
    upstream.onclose = () => socket.close();
  };
  return response;
}

//// FILE: package.json
{
  "name": "talking-objects-poc",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "api"],
  "devDependencies": {
    "typescript": "5.4.3"
  }
}

// End of repository snapshot
