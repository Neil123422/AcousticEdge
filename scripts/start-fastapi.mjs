#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const mlTrainingDir = join(projectRoot, 'ml-training');
const pythonPath = join(mlTrainingDir, '.venv', 'Scripts', 'python.exe');

console.log('[FASTAPI] Starting Python inference service...');

const proc = spawn(pythonPath, ['-m', 'uvicorn', 'src.inference:app', '--host', '0.0.0.0', '--port', '8000'], {
  cwd: mlTrainingDir,
  stdio: 'inherit',
  shell: false
});

proc.on('error', (err) => {
  console.error('[FASTAPI] Failed to start:', err);
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGTERM', () => {
  proc.kill('SIGTERM');
});

process.on('SIGINT', () => {
  proc.kill('SIGINT');
});
