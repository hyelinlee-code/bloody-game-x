/* Turn the verified research output into src/data/edges.ts. */
import fs from 'node:fs';

const SRC = process.argv[2];
const NAME_TO_ID = {
  이상민: 'lee-sang-min',
  박지민: 'park-ji-min',
  정근우: 'jung-keun-woo',
  이태균: 'lee-tae-gyun',
  하승진: 'ha-seung-jin',
  현성주: 'hyun-seong-joo',
  윤비: 'yoon-bi',
  이진형: 'lee-jin-hyung',
  홍진호: 'hong-jin-ho',
  서출구: 'seo-chul-gu',
  최혜선: 'choi-hye-sun',
  허성범: 'heo-seong-beom',
  김경훈: 'kim-kyung-hoon',
  김유현: 'kim-yoo-hyun',
  김남희: 'kim-nam-hee',
  강지후: 'kang-ji-hoo',
  곽범: 'kwak-beom',
  이관희: 'lee-gwan-hee',
  신승용: 'shin-seung-yong',
  최연청: 'choi-yeon-cheong',
};

const VALID = new Set([
  'alliance', 'betrayal', 'rivalry', 'prior-show', 'co-season',
  'friendship', 'family', 'agency', 'teammate', 'mentor', 'collab',
]);

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const cleaned = [];
for (const e of raw) {
  const source = NAME_TO_ID[e.a];
  const target = NAME_TO_ID[e.b];
  if (!source || !target || source === target) {
    console.warn('  ! dropped, unknown name:', e.a, e.b);
    continue;
  }
  let type = VALID.has(e.type) ? e.type : 'collab';
  const season = Number(e.season) || 0;
  // "co-season" only means anything inside the franchise; outside the house it
  // is really just a shared programme.
  if (season === 0 && type === 'co-season') type = 'prior-show';
  cleaned.push({ ...e, source, target, type, season });
}

// Merge exact duplicates (the verify pass can retype an edge into a collision).
const byKey = new Map();
for (const e of cleaned) {
  const key = [e.source, e.target].sort().join('|') + '|' + e.type + '|' + e.season;
  const prev = byKey.get(key);
  if (!prev || (e.description || '').length > (prev.description || '').length) byKey.set(key, e);
}
let merged = [...byKey.values()];

// A generic "same season" line adds nothing when a specific relationship
// between the same two people in the same season is already drawn.
const richPairs = new Set(
  merged
    .filter((e) => e.type !== 'co-season')
    .map((e) => [e.source, e.target].sort().join('|') + '|' + e.season),
);
const before = merged.length;
merged = merged.filter(
  (e) => e.type !== 'co-season' || !richPairs.has([e.source, e.target].sort().join('|') + '|' + e.season),
);
console.log(`  dropped ${before - merged.length} redundant co-season lines`);

// Directed types read as arrows; make the direction explicit and consistent.
const DIRECTED = new Set(['betrayal', 'mentor']);

merged.sort((a, b) => b.strength - a.strength || a.source.localeCompare(b.source));

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ').trim();

const body = merged
  .map((e, i) => {
    const id = `${e.source}--${e.target}--${e.type}${e.season ? `-s${e.season}` : ''}-${i}`;
    const srcs = (e.sources || [])
      .filter((s) => /^https?:\/\//.test(s))
      .slice(0, 3)
      .map((s) => `'${esc(s)}'`)
      .join(', ');
    return `  {
    id: '${id}',
    source: '${e.source}',
    target: '${e.target}',
    type: '${e.type}',
    season: ${e.season},
    label: '${esc(e.labelKo)}',
    labelEn: '${esc(e.labelEn)}',
    description: '${esc(e.description)}',
    strength: ${Math.max(1, Math.min(5, Math.round(e.strength)))},${
      DIRECTED.has(e.type) || e.directed ? '\n    directed: true,' : ''
    }
    confidence: '${esc(e.confidence) || 'medium'}',${srcs ? `\n    sources: [${srcs}],` : ''}
  },`;
  })
  .join('\n');

const out = `import type { Edge } from './types';

/**
 * Connections between the twenty X cast members.
 *
 * EVERY edge here predates season X. \`season: 1 | 2 | 3\` means it happened
 * inside that earlier season of the franchise; \`season: 0\` means it comes from
 * outside the house entirely — another programme, a shared career, a rivalry
 * on a basketball court.
 *
 * Each tie was found by an independent multi-angle research pass and then put
 * through an adversarial pass whose explicit job was to refute it. Eight
 * candidate ties were killed there — including two that turned out to be
 * fabricated — and are deliberately absent rather than softened.
 */
export const edges: Edge[] = [
${body}
];
`;

fs.writeFileSync('src/data/edges.ts', out);
console.log(`wrote ${merged.length} edges`);
const byType = {};
for (const e of merged) byType[e.type] = (byType[e.type] || 0) + 1;
console.log(byType);
const degree = {};
for (const e of merged) {
  degree[e.source] = (degree[e.source] || 0) + 1;
  degree[e.target] = (degree[e.target] || 0) + 1;
}
const isolated = Object.values(NAME_TO_ID).filter((id) => !degree[id]);
console.log('isolated:', isolated.length ? isolated.join(', ') : 'none');
