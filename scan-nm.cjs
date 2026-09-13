const gfs = require("graceful-fs");
const fs = require("fs");
const path = require("path");

const root = "F:\\conveyor-acoustic-poc\\node_modules";
const failures = [];
let count = 0;
const t0 = Date.now();

function walk(dir, depth) {
  if (failures.length > 0 || depth > 4) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (failures.length > 0) return;
    if (e.name === ".cache" || e.name === ".bin") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full, depth + 1); continue; }
    if (e.isSymbolicLink()) continue;
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|css|map)$/.test(e.name)) continue;
    count++;
    try {
      const buf = gfs.readFileSync(full);
      if (buf.length === 0 && depth > 0) {}
    } catch (err) {
      failures.push({ file: full, code: err.code, message: err.message, syscall: err.syscall });
      console.log("FAIL:", full, "->", err.code, err.message);
      return;
    }
  }
}

walk(root, 0);
console.log("\nScanned", count, "files in", ((Date.now() - t0) / 1000).toFixed(1) + "s,", failures.length, "failures");
if (failures.length) console.log("Failure detail:", JSON.stringify(failures[0], null, 2));