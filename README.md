# AcousticEdge - Standalone Android Build

This repository contains the code for a standalone Android app that performs acoustic conveyor inspection using a deployed CNN model.

## Backend Deployment

The backend (FastAPI + Express) is deployed to **Render** free tier as a single Docker container,
described by `render.yaml` (Blueprint, `autoDeploy: true`). Render is the only supported deployment
target; the public base URL is `https://acousticedge.onrender.com`.

Build and run the same container locally:

```bash
docker build -t acousticedge .
docker run --rm -p 3000:3000 acousticedge
curl http://localhost:3000/api/inspect/health
```

## Android Build

Built with EAS cloud build (free tier) - install the APK directly on your device.
`eas.json` bakes `EXPO_PUBLIC_API_BASE_URL=https://acousticedge.onrender.com` into both build
profiles; override it at build time if the service is deployed under a different name:

```bash
EXPO_PUBLIC_API_BASE_URL=https://<your-service>.onrender.com npx eas build -p android --profile preview
```

## Model Weights

Inference requires `ml-training/models/classifier/best_model.pt`, `normalize.json` and
`label_map.json`. These are the only files under `ml-training/models/` that are committed;
without them `/api/inspect` returns a 502 while `/api/inspect/health` still reports the
service as up.

See LIVE_DEMO.md for usage instructions.
