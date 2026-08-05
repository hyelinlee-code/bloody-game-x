import fs from 'node:fs';
import path from 'node:path';

/**
 * Makes `public/portraits/` a drop-in folder.
 *
 * Put an image at `public/portraits/<person-id>.jpg` and that person's plate
 * shows the photograph — on the graph node, the gallery card, the dossier crest
 * and the hover card at once. Remove it and the generated plate comes back.
 * Nothing else to edit: no import, no manifest to maintain, no id list.
 *
 * ── why a plugin and not a fetch-and-see ────────────────────────────────────
 * The obvious version is to point an <img> at `/portraits/<id>.jpg` for all
 * twenty and let the ones that do not exist fail. That works, and it costs
 * twenty 404s on every cold load plus twenty red lines in the console — which
 * on a canvas app is indistinguishable from something actually being broken,
 * and it means the fallback path runs one network round-trip late, so every
 * plate visibly flips from photo-less to photo-less. Knowing the answer before
 * the first paint is worth forty lines of build tooling.
 *
 * ── why not src/assets + import.meta.glob ───────────────────────────────────
 * That is the idiomatic Vite answer and it would hash and fingerprint the files
 * for free. It also means the folder you drop images into is inside the source
 * tree, which is the wrong shape for content someone maintains without touching
 * the app. `public/` is where "things the site serves verbatim" belong, so the
 * plugin brings the manifest to the content rather than moving the content to
 * the manifest.
 *
 * ── the contract ───────────────────────────────────────────────────────────
 * `import { PORTRAITS } from 'virtual:portraits'` yields
 *   Record<personId, string>   // '/portraits/hong-jin-ho.jpg'
 * The key is the file's basename, which must equal the `Person.id` in
 * `src/data/people.ts`. A file whose basename matches nobody is reported at
 * startup rather than ignored — a portrait that silently does not appear
 * because of a typo in a filename is the whole failure mode this exists inside.
 */

const VIRTUAL_ID = 'virtual:portraits';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

function readManifest(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return {};
  }
  const out = {};
  for (const e of entries) {
    if (!e.isFile()) continue;
    // `_`-prefixed files are documented in the folder's README as scratch —
    // the sample tiles live there. They are not people and never will be.
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (!EXT.has(ext)) continue;
    const id = path.basename(e.name, ext);
    // Two files for one person (a .jpg and a .webp, say) is ambiguous rather
    // than an error; take the alphabetically first so the pick is at least
    // stable between machines, and say so.
    if (out[id]) continue;
    out[id] = `/portraits/${e.name}`;
  }
  return out;
}

/**
 * @param {{ publicDir?: string, knownIds?: () => string[] }} [opts]
 */
export function portraits(opts = {}) {
  let dir = '';
  let server;

  return {
    name: 'bgx:portraits',

    configResolved(config) {
      dir = path.resolve(opts.publicDir ?? config.publicDir, 'portraits');
    },

    configureServer(s) {
      server = s;
      /* Vite watches `public/` for the dev server's static middleware, but a
         new FILE there does not invalidate a virtual module that merely
         described it. Adding or deleting a portrait has to re-run the manifest
         and push it, or the drop-in folder is drop-in-then-restart. */
      const bump = (file) => {
        if (!file.startsWith(dir)) return;
        const mod = s.moduleGraph.getModuleById(RESOLVED_ID);
        if (!mod) return;
        s.moduleGraph.invalidateModule(mod);
        s.ws.send({ type: 'full-reload' });
      };
      s.watcher.add(dir);
      s.watcher.on('add', bump);
      s.watcher.on('unlink', bump);
      s.watcher.on('change', bump);
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },

    load(id) {
      if (id !== RESOLVED_ID) return null;
      const manifest = readManifest(dir);

      if (opts.knownIds) {
        const known = new Set(opts.knownIds());
        const orphans = Object.keys(manifest).filter((k) => !known.has(k));
        if (orphans.length) {
          this.warn(
            `portraits: ${orphans.length} file(s) in public/portraits/ match no person id and will not be shown — ` +
              `${orphans.join(', ')}. The filename must be the id from src/data/people.ts.`,
          );
        }
      }

      return `export const PORTRAITS = ${JSON.stringify(manifest, null, 2)};\n`;
    },
  };
}

export default portraits;
