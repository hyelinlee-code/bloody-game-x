/**
 * Who has a portrait and who does not.
 *
 *   npm run portraits
 *
 * Reads `public/portraits/` the same way the Vite plugin does and reports it
 * against the cast list, so adding images is a loop you can see the end of
 * rather than twenty filenames you have to get right blind. Also catches the
 * one mistake that costs the most time: a file whose name is nearly an id.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'public', 'portraits');
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'people.ts'), 'utf8');
const ids = [...src.matchAll(/^ {4}id: '([^']+)'/gm)].map((m) => m[1]);
const names = new Map(
  [...src.matchAll(/^ {4}id: '([^']+)',\s*\n\s*nameKo: '([^']+)',\s*\n\s*nameEn: '([^']+)'/gm)].map((m) => [
    m[1],
    `${m[3]} / ${m[2]}`,
  ]),
);

let files = [];
try {
  files = fs.readdirSync(DIR).filter((f) => !f.startsWith('_') && !f.startsWith('.') && EXT.has(path.extname(f).toLowerCase()));
} catch {
  console.log(`No such folder: ${DIR}\nCreate it and drop images in — see the README beside it.`);
  process.exit(0);
}

const have = new Map();
for (const f of files) have.set(path.basename(f, path.extname(f)), f);

const matched = ids.filter((id) => have.has(id));
const missing = ids.filter((id) => !have.has(id));
const orphans = [...have.keys()].filter((k) => !ids.includes(k));

/** Levenshtein, for "did you mean". Twenty ids — cost is irrelevant. */
function near(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

console.log(`\n  public/portraits/  —  ${matched.length} of ${ids.length} people have an image\n`);

if (matched.length) {
  console.log('  WITH A PORTRAIT');
  for (const id of matched) console.log(`    ✓ ${id.padEnd(20)} ${have.get(id).padEnd(26)} ${names.get(id) ?? ''}`);
  console.log('');
}

if (missing.length) {
  console.log('  STILL ON THE GENERATED PLATE — drop a file named exactly this (any image extension)');
  for (const id of missing) console.log(`    · ${id.padEnd(20)} ${names.get(id) ?? ''}`);
  console.log('');
}

if (orphans.length) {
  console.log('  ⚠ THESE FILES MATCH NOBODY AND WILL NOT BE SHOWN');
  for (const o of orphans) {
    const best = ids.map((id) => [id, near(o, id)]).sort((a, b) => a[1] - b[1])[0];
    const hint = best && best[1] <= 5 ? `   did you mean "${best[0]}"?` : '';
    console.log(`    ✗ ${have.get(o)}${hint}`);
  }
  console.log('');
}

if (!missing.length && !orphans.length) console.log('  Every person has a portrait. Nothing to do.\n');
