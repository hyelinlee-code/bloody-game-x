/**
 * The drop-in portrait folder's build-time manifest.
 *
 * Produced by `tools/vite-plugin-portraits.mjs`, which reads
 * `public/portraits/` and emits one entry per file whose basename matches a
 * `Person.id`. It exists so nothing in the app has to maintain a list of who
 * has a photograph, and so the answer is known before the first paint rather
 * than after twenty 404s.
 */
declare module 'virtual:portraits' {
  /** Person id → served URL, e.g. `{ 'hong-jin-ho': '/portraits/hong-jin-ho.jpg' }`. */
  export const PORTRAITS: Record<string, string>;
}
