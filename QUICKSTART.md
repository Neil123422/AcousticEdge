# Conveyor Sentinel — Quick Start

## Run the App (One Command)

```bash
npm run demo
```

This starts:
- **Backend** (Express + FastAPI) on port 3000
- **Metro** (production bundle) on port 8081

Then:
- **Phone:** Scan the QR code from terminal with Expo Go
- **Web:** Open http://localhost:8081 in your browser

Both phone and web connect to the same local backend.

---

## Requirements

- Node.js installed ✅
- Python 3.11+ with dependencies (for FastAPI backend)
- Phone on same Wi-Fi as PC (for QR/Expo Go)
- Expo Go app installed on Android

---

## Troubleshooting

**"Port already in use" error:**
```bash
# Kill existing processes
npx kill-port 3000 8081
# Then retry
npm run demo
```

**Python/FastAPI not working:**
The backend tries to start FastAPI automatically. If you see Python errors, install dependencies:
```bash
cd ml-training
pip install -r requirements.txt
cd ..
```

**Metro bundle taking too long:**
First compile takes ~30-60s. Subsequent reloads are instant (cached).

**QR not working:**
Make sure your phone is on the same WiFi network as this PC (192.168.52.87).

---

## Stop the App

Press `Ctrl+C` in the terminal where `npm run demo` is running. This stops both backend and Metro cleanly.
