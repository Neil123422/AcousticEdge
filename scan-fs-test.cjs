const gfs = require("graceful-fs");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const root = "F:\\conveyor-acoustic-poc";
const scanDirs = ["app", "components", "lib", "hooks", "constants", "public", "styles"];
const failures = [];
let count = 0;

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { console.log("SKIP readdir:", dir, e.code); return; }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!/\.(ts|tsx|js|jsx|json|css|svg)$/.test(e.name)) continue;
    count++;
    try {
      const buf = gfs.readFileSync(full);
      crypto.createHash("sha1").update(buf).digest("hex");
    } catch (err) {
      failures.push({ file: full, code: err.code, message: err.message });
      console.log("FAIL:", full, "->", err.code);
    }
  }
}
for (const d of scanDirs) { walk(path.join(root, d)); }
// also entry files
for (const f of ["app.json", "app.config.js", "app.config.ts", "metro.config.js", "global.css"]) {
  const full = path.join(root, f);
  if (!fs.existsSync(full)) continue;
  count++;
  try { const buf = gfs.readFileSync(full); crypto.createHash("sha1").update(buf).digest("hex"); }
  catch (err) { console.log("FAIL:", f, "->", err.code); failures.push({ file: full, code: err.code }); }
}
console.log("\nScanned", count, "files,", failures.length, "failures");
if (failures.length) console.log("Failures:", JSON.stringify(failures, null, 2));