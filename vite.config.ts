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
export default defineConfig({
  plugins: [react(), portraits({ knownIds: personIds })],
})
