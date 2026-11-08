// npm run build -- --manifest, then node scripts/measure-initial-js.mjs
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';

const manifest = JSON.parse(fs.readFileSync('dist/.vite/manifest.json', 'utf8'));
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entry) throw new Error('Build manifest has no entry');
const seen = new Set();
function visit(key) {
  if (seen.has(key)) return;
  seen.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
visit(entry);
// Lazy route imports are excluded; count every eager shared chunk, not only index.js.
const files = [...new Set([...seen].map((key) => manifest[key].file).filter((file) => file.endsWith('.js')))];
console.log(JSON.stringify({
  initial_js_bytes: files.reduce((sum, file) => sum + fs.statSync(`dist/${file}`).size, 0),
  initial_js_gzip_bytes: files.reduce((sum, file) => sum + gzipSync(fs.readFileSync(`dist/${file}`)).length, 0),
  initial_js_requests: files.length,
  eager_admin_pages: [...seen].filter((key) => key.includes('pages/admin')),
}, null, 2));
