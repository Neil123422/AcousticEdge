# Conveyor Sentinel — Live Demo Runbook

How to launch the whole stack and demonstrate the acoustic inspection POC in Expo Go.

## Prerequisites

- Node 18+ and npm set up (already done)
- Phone with Expo Go installed (App Store / Play Store) — same Wi-Fi as this PC
- FastAPI + the deployed CNN model in `ml-training` (BENCHMARK-CNN-v1)

## 1. Start the inference service (FastAPI)

```bash
cd ml-training
.venv\Scripts\activate          # Windows (PowerShell); or: source .venv/bin/activate
python -m uvicorn src.inference:app --host 127.0.0.1 --port 8100
```

Verify: `curl.exe --connect-timeout 5 --max-time 15 http://127.0.0.1:8100/health`

## 2. Start the Express API proxy

```bash
npm run build          # esbuild -> dist/index.js
node dist/index.js     # reads .env (INFERENCE_URL, PORT)
```

Verify: `curl.exe --connect-timeout 5 --max-time 15 http://127.0.0.1:3000/api/health`

## 3. Start the Cloudflare tunnel (optional but recommended for phone on mobile data)

```bash
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:3000
```

Note the printed `https://<random>.trycloudflare.com` URL — use it as `EXPO_PUBLIC_API_BASE_URL` in step 4.

## 4. Start Metro (Expo Go bundler) — writes the QR

```bash
rm -rf .expo
EXPO_PUBLIC_API_BASE_URL="https://yourself-crown-applying-refurbished.trycloudflare.com" \
EXPO_USE_FALLBACK_WATCHER=1 \
npx expo start -c
```

- `EXPO_PUBLIC_API_BASE_URL` is baked in at bundle time → must point at the live tunnel (or `http://<pc-lan-ip>:3000` if only LAN).
- `EXPO_USE_FALLBACK_WATCHER=1` + `-c` avoid the Windows Metro `EINVAL` watcher crash.
- On startup Expo prints a **QR code**; scan it with Expo Go. Fallback: type `exp://192.168.1.3:8081` into Expo Go.

## 5. Demo flow (Home tab)

1. Target: `CV-01 · Primary line` (or any).
2. Tap **START INSPECTION** → hold phone steady at the measurement point for 10–15 s.
3. Tap **STOP & ANALYZE** → Live Monitor shows scanning, then a fault prediction block.
4. Result card shows risk (NORMAL / REVIEW / CRITICAL), score %, summary, advice, features.

Full walk-through: open `architecture.tsx` tab to narrate capture → validate → log-mel features → CNN → risk.

## Troubleshooting

- **Metro `EINVAL: invalid argument, read: node:fs`** → stop Metro, `rm -rf .expo`, restart with the fallback watcher + `-c` as above.
- **Expo Go can’t reach Metro** → same Wi-Fi required; use LAN IP (192.168.1.3), not localhost; re-run the QR script (`npm run qr -- <exp://url>` / `node scripts/generate_qr.mjs "<url>"`) and scan again.
- **Tunnel URL changed** → copy the new URL, restart Metro with the updated `EXPO_PUBLIC_API_BASE_URL` (rebundle needed), rescan.
- **FastAPI says model not loaded** → start uvicorn from inside `ml-training` so relative model paths resolve (duplicate instance on 8100 → kill the stray, wait a second).
- **Icons/code references not found** → `npx expo export --platform android` still bundles OK; if not, `npm run check` (tsc) first.
- **History empty** → results save to AsyncStorage on-device; they persist across restarts while the app stays installed.

## Helper commands

```bash
npm run check        # tsc --noEmit — 0 errors expected
npm run build        # esbuild → dist/index.js for Express
node scripts/generate_qr.mjs "exp://192.168.1.3:8081"   # writes expo-qr-code.png
```

Scanning `expo-qr-code.png` requires the Metro server from step 4 running — encode the same host:port as the printed QR.