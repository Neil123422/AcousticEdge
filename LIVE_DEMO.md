# Conveyor Sentinel — Live Demo Runbook

How to launch the whole stack and demonstrate the acoustic inspection POC in Expo Go.

## Prerequisites

- Node 18+ and npm set up (already done)
- GitHub account (free)
- Render account (free)
- Expo account (free, for EAS builds)
- Android device with Expo Go installed (for testing) OR ability to install standalone APK
- Same Wi-Fi as this PC (for initial testing; mobile data works after cloud deploy)

## Overview

This setup creates:
1. A **standalone Android APK** (built via EAS) with the JS bundle embedded
2. A **cloud-hosted backend** (Render free tier) running Express + FastAPI in a single Docker container
3. No need for Metro, Expo Go, or local tunneling after initial build/deploy

The phone talks directly to `https://<your-app>.onrender.com/api/inspect` — no local services required.

---

## Phase 1: Prepare the Repository (Already Done)

The repo has been prepared with:
- `.gitignore` set up to ship model weights (`best_model.pt`, `normalize.json`, `label_map.json`)
  while ignoring everything else under `ml-training/models/`. The weights must actually be
  committed — without them `/api/inspect` returns 502.
- Dockerfile for single-container backend (FastAPI + Express)
- `render.yaml` for Render deployment
- `eas.json` (preview = APK, internal distribution) + `.easignore` for EAS Android builds
- `.env` configured for container localhost (`INFERENCE_URL=http://127.0.0.1:8000`)

## Phase 2: Deploy Backend to Render (Free Tier)

1. **Create GitHub repo** (if not done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<REPO-NAME>.git
   git push -u origin main
   ```

2. **Deploy to Render**:
   - Sign up at [render.com](https://render.com) (free account)
   - New → Web Service → Connect your GitHub repo
   - Settings:
     - Environment: `Docker`
     - Build Command: *leave blank*
     - Start Command: *leave blank*
     - Region: Oregon (or closest to you)
   - Click "Create Web Service"
   - Wait for build (~3-5 min due to torch wheel)
   - Note your service URL: `https://<your-service-name>.onrender.com`

3. **Verify backend health**:
   ```bash
   curl https://<your-service>.onrender.com/api/inspect/health
   # Expected: {"ok":true, "upstream":{...}}
   ```

   Test real inspection:
   ```bash
   curl -X POST https://<your-service>.onrender.com/api/inspect \
     -H "Content-Type: application/json" \
     -d '{"audioBase64":"<tiny-base64>","fileName":"test.m4a","conveyorId":"CV-01"}'
   # Expected: CNN risk JSON
   ```

## Phase 3: Build Standalone Android APK

1. **Install EAS CLI** (once):
   ```bash
   npm i -D eas-cli
   npx eas login  # free Expo account
   ```

2. **Create EAS config** (if not done):
   - `eas.json` already exists with `preview` profile
   - `.easignore` already exists to exclude heavy dirs

3. **Build the release APK**:
   ```bash
   EXPO_PUBLIC_API_BASE_URL="https://<your-service>.onrender.com" npx eas build -p android --profile preview
   ```
   - Wait for build (~5-10 min)
   - Download the `.apk` from the Expo dashboard link

4. **Install on Android**:
   - Transfer the `.apk` to your device (email, cloud, etc.)
   - Open the file → "Install" (enable "Install unknown apps" for your browser if prompted)
   - Open the app — no Metro, no QR, no PC running required!

## Phase 4: Demo Flow

- Open the installed app → Home tab.
- Select conveyor (e.g., `CV-01 · Primary line`).
- Tap **START INSPECTION** → hold phone steady at measurement point for 10–15s.
- Tap **STOP & ANALYZE** → Live Monitor shows scanning, then Result Card displays:
  - Risk (NORMAL/REVIEW/CRITICAL) + score%
  - Summary, advice, features, model
- History persists on-device (AsyncStorage) across app restarts.

## Troubleshooting

- **Build fails on Render (torch OOM)**: Render free tier has 512MB RAM. The model is tiny, but torch+librosa import may spike. If OOM:
  1. Try a free Oracle Cloud VM (always-on, 1GB RAM) — same Dockerfile works.
  2. Or upgrade to a paid Render instance type for guaranteed resources.
- **First request slow after idle**: Render free tier sleeps after ~15 min → first request takes 30-60s (cold start). Acceptable for demos; add a keep-alive ping (e.g., UptimeRobot) if needed.
- **Cannot install APK**: Enable "Install unknown apps" for your browser/file manager in Android Settings.
- **No model weights in build**: `git ls-files ml-training/models` must list `best_model.pt`,
  `normalize.json` and `label_map.json`. If it is empty the weights were never committed and
  inference will fail with `FileNotFoundError` in the container logs.

## Notes

- **Accuracy**: Hosting choice (Render, Oracle, etc.) does not change CNN math — identical weights → identical logits for identical input. Accuracy depends on pinned deps and exact model artifact (already handled via fixed `.gitignore` and `requirements.txt`).
- **No Play Store fee**: Installing the APK directly avoids the $25 one-time developer account.
- **iOS**: Skipped per your choice; Android-only build.
- **Costs**: $0/mo (Render free + GitHub free + Expo EAS free tier + no Play Store).
- **Deployment target**: Render only. `render.yaml`, `README.md` and `eas.json` all point at
  `https://acousticedge.onrender.com`; there is no Railway configuration in this repo.

You now have a truly standalone acoustic inspection app that works anywhere with mobile data — no local services, no Metro, no QR codes. Just install the APK and inspect!