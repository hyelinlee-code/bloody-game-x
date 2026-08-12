import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import { portraits } from './tools/vite-plugin-portraits.mjs'

/* The person ids, read straight out of the dataset rather than duplicated, so
   the plugin can tell you that `public/portraits/hong-jinho.jpg` will never
   appear because the id is `hong-jin-ho`. Parsed with a regex rather than
   imported: this runs inside the Vite config, before any TypeScript pipeline
   exists, and the only thing it needs is the list of `id:` literals. */
function personIds(): string[] {
  try {
    const src = fs.readFileSync(new URL('./src/data/people.ts', import.meta.url), 'utf8')
    return [...src.matchAll(/^\s{4}id:\s*'([^']+)'/gm)].map((m) => m[1])
  } catch {
    return []
  }
}

// https://vite.dev/config/
/* The atlas prints "UPDATED <date>" in its status bar. That was a hand-typed
   string in dataset.ts, so it said 2026.07.31 through a fortnight of edits — a
   freshness claim that goes stale is worse than none, because a reader uses it
   to decide whether to trust the rest. Stamped at build time instead: Vercel
   rebuilds on every push, so the date is the deploy's date by construction and
   nobody can forget to bump it. */
const BUILD_DATE = new Date().toISOString().slice(0, 10).replace(/-/g, '.')

export default defineConfig({
  define: { __BUILD_DATE__: JSON.stringify(BUILD_DATE) },
  plugins: [react(), portraits({ knownIds: personIds })],
})
