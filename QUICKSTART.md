# Conveyor Sentinel — Quick Start

## Run the App (One Command)

```bash
npm run demo
```

This starts:
- **FastAPI** (Python ML inference) on port 8000
- **Backend** (Express API) on port 3000
- **Metro** (production bundle) on port 8081

Then:
- **Phone:** Scan the QR code from terminal with Expo Go
- **Web:** Open http://localhost:8081 in your browser

Both phone and web connect to the same local backend, which talks to the ML service for diagnostics.

---

## Requirements

- Node.js installed ✅
- Python 3.11+ with virtual environment in `ml-training/.venv/` ✅
- Phone on same Wi-Fi as PC (for QR/Expo Go)
- Expo Go app installed on Android

---

## Troubleshooting

**"Port already in use" error:**
```bash
# Kill existing processes
npx kill-port 3000 8000 8081
# Then retry
npm run demo
```

**Python/.venv not working:**
If you see Python errors, ensure the virtual environment exists:
```bash
cd ml-training
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
cd ..
```

**Diagnostics not working after recording:**
Make sure all three services started (check terminal output for FASTAPI, BACKEND, METRO).
The FastAPI service must be running on port 8000 for diagnostics to work.

**Metro bundle taking too long:**
First compile takes ~30-60s. Subsequent reloads are instant (cached).

**QR not working:**
Make sure your phone is on the same WiFi network as this PC (192.168.52.87).

---

## Stop the App

Press `Ctrl+C` in the terminal where `npm run demo` is running. This stops all three services cleanly.
