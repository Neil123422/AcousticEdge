#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

// Detect LAN IP by running detect-ip.mjs
function getLanIP() {
  try {
    const out = execSync('node scripts/detect-ip.mjs', { encoding: 'utf8', cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

const lanIP = getLanIP();
console.log(`[DEMO] LAN IP detected: ${lanIP}`);

// Set env for all child processes
const env = {
  ...process.env,
  EXPO_PUBLIC_API_BASE_URL: `http://${lanIP}:3000`,
  REACT_NATIVE_PACKAGER_HOSTNAME: lanIP,
};

// Use cmd /c for Windows shell compatibility
const cmd = process.platform === 'win32' ? 'cmd' : 'sh';
const metroCmd = `cross-env EXPO_PUBLIC_API_BASE_URL=http://${lanIP}:3000 REACT_NATIVE_PACKAGER_HOSTNAME=${lanIP} npx expo start --web --port 8081`;
const args = process.platform === 'win32'
  ? [
      '/c', 'concurrently', '-k', '-n', 'FASTAPI,BACKEND,METRO',
      '-c', 'magenta,blue,green',
      `node scripts/start-fastapi.mjs`,
      `node dist/index.js`,
      metroCmd
    ]
  : [
      '-c', `concurrently -k -n "FASTAPI,BACKEND,METRO" -c "magenta,blue,green" "node scripts/start-fastapi.mjs" "node dist/index.js" "${metroCmd}"`
    ];

console.log(`[DEMO] Starting stack on ${lanIP}:3000 / :8000 / :8081`);

const p = spawn(cmd, args, { stdio: 'inherit', cwd: root, env });

p.on('close', (c) => process.exit(c ?? 0));
process.on('SIGINT', () => p.kill('SIGINT'));
process.on('SIGTERM', () => p.kill('SIGTERM'));
