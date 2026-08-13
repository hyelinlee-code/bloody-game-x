/**
 * Dataset invariants.
 *
 * The first research pass shipped six mutually contradictory placements and a
 * handful of internal notes that leaked into user-facing copy. Everything that
 * went wrong then is asserted here so it cannot come back quietly.
 *
 *   node tools/validate-data.mjs
 */
import { people } from '../src/data/people.ts';
import { records } from '../src/data/records.ts';
import { edges, isMeeting } from '../src/data/edges.ts';
import { seasons, glossary } from '../src/data/seasons.ts';
import { peopleEn } from '../src/data/i18n/people.en.ts';
import { recordsEn } from '../src/data/i18n/records.en.ts';
import { edgesEn } from '../src/data/i18n/edges.en.ts';
import { glossaryEn, seasonsEn } from '../src/data/i18n/seasons.en.ts';
import { ui } from '../src/data/i18n/ui.ts';
import { ALL_EDGE_TYPES } from '../src/state/useAtlas.ts';
import { ALL_WORK_IDS, OUTCOME_FIELDS, OUTCOME_FIELDS_EN } from '../src/data/works.ts';
import { EDGE_LABEL_I18N, EDGE_GLOSS_I18N } from '../src/data/i18n/ui.ts';
import { EDGE_COLOR, EDGE_DASH } from '../src/graph/palette.ts';
import { dataset } from '../src/data/dataset.ts';
import { meetings, neverFaced, career } from '../src/data/headToHead.ts';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const problems = [];
const warnings = [];
/* Seams that are open by decision rather than by accident — see section 0a.
   Reported as a block, not as warnings, because the run has to stay clean. */
const openSeams = [];
const fail = (m) => problems.push(m);
const warn = (m) => warnings.push(m);

const ids = new Set(people.map((p) => p.id));

/* ── 0. the edge-type vocabulary reaches the UI ────────────────────────────
   A type can be added to the union, given a colour, given both legend strings,
   written onto real edges, and STILL be invisible everywhere — because every
   edge is filtered against `ALL_EDGE_TYPES` before it reaches the canvas, the
   rail, the ledger, the dossier or the path finder. When `parallel` shipped
   that way, three ties vanished, three people became orphans on a graph about
   connection, and the app displayed two different totals for the same
   quantity while this file printed "All invariants hold".

   The dataset was never the thing that was wrong, which is exactly why a
   dataset validator missed it. So the check is on the seam, not the data. */
{
  const declared = new Set(ALL_EDGE_TYPES);
  const used = new Set(edges.map((e) => e.type));
  for (const t of used) {
    if (!declared.has(t))
      fail(`edge type "${t}" is used by ${edges.filter((e) => e.type === t).length} edge(s) but is missing from ALL_EDGE_TYPES — those edges are filtered out of every surface`);
  }
  for (const t of declared) {
    if (!EDGE_COLOR[t]) fail(`edge type "${t}" is in ALL_EDGE_TYPES but has no EDGE_COLOR`);
    if (!EDGE_LABEL_I18N.ko[t] || !EDGE_LABEL_I18N.en[t])
      fail(`edge type "${t}" is in ALL_EDGE_TYPES but is missing a legend label in one language`);
    if (!EDGE_GLOSS_I18N.ko[t] || !EDGE_GLOSS_I18N.en[t])
      fail(`edge type "${t}" is in ALL_EDGE_TYPES but is missing a legend gloss in one language`);
  }
  /* Same seam, one step further out: a dash rhythm is the other half of how a
     type is told apart on the canvas, and a rhythm keyed to a type nobody
     renders is a tuned value that never reaches a pixel. */
  for (const t of Object.keys(EDGE_DASH)) {
    if (!declared.has(t)) fail(`EDGE_DASH defines a rhythm for "${t}", which is not in ALL_EDGE_TYPES`);
  }

  /* NOBODY IS AN ORPHAN. `no edge at all: 0` below reports people with nothing
     touching them, and it read 0 through the whole round in which three people
     were drawn with no line touching them — because the edges existed and the
     app dropped them. This is the same fact stated where it can actually catch
     that: the three who have never met anyone must still each carry the
     `parallel` line that says so, or the canvas has nothing to draw for them. */
  for (const id of neverFaced) {
    const mine = edges.filter((e) => e.source === id || e.target === id);
    if (mine.length === 0)
      fail(`${id} has never been in a field with anyone AND carries no edge — they will render as a bare dot`);
  }
}

/* ── 0a. the surface seam: data that was built and never wired ─────────────
   Section 0 exists because `parallel` was authored, coloured, dashed, glossed
   in two languages — and then filtered out of every surface by one array it was
   missing from, while this file printed "All invariants hold". The lesson is
   not about edge types. It is that the failure mode of this codebase is a
   COMPLETE data layer with no consumer, and a dataset validator is structurally
   blind to it: everything it looks at is correct.

   So this section looks at the other side of the seam. For each export that
   exists only in order to be rendered, it asks whether any file under
   src/components, src/graph, src/state or src/App.tsx so much as names it.
   That is a crude probe — a symbol can be imported and not drawn — but it
   catches the exact shape that has now cost three rounds, and it costs nothing.

   KNOWN_OPEN is the same device as BILINGUAL_LOCKUP further down, and for the
   same stated reason: a standing warning teaches everyone to skim the section
   where a real one would appear. An entry here is a seam that is open, on
   purpose, with the owner named — and the check runs in BOTH directions, so
   the moment a listed symbol acquires a consumer the build fails and tells you
   to delete the line. The list cannot quietly outlive the problem. */
{
  const roots = [
    'src/components',
    'src/graph',
    'src/state',
    'src/App.tsx',
    'src/main.tsx',
  ];
  const files = [];
  const walk = (p) => {
    const abs = new URL(`../${p}`, import.meta.url);
    let st;
    try {
      st = statSync(abs);
    } catch {
      return;
    }
    if (st.isDirectory()) for (const f of readdirSync(abs)) walk(`${p}/${f}`);
    else if (/\.(ts|tsx)$/.test(p)) files.push([p, readFileSync(abs, 'utf8')]);
  };
  for (const r of roots) walk(r);
  if (files.length < 20) fail(`seam check read only ${files.length} component files — the walk is broken, not the app`);
  /* A definition is not a consumer. palette.ts lives under src/graph, so
     without this the file that declares EDGE_DASH would satisfy the check for
     EDGE_DASH — the seam reporting itself closed. */
  const readsIt = (probe, home) =>
    files.some(([p, text]) => p !== home && text.includes(probe));

  /* probe → [home file, why it only means something once something draws it] */
  const SEAMS = [
    ['ledgerFor', null, "headToHead.ts — a person's record against each opponent"],
    ['careerTable', null, 'headToHead.ts — the twelve returners ranked by one comparable number'],
    ['meetingsFor', null, 'headToHead.ts — every adjudicated result involving one person'],
    ['haveFaced', null, 'headToHead.ts — has this pair ever been in a field together'],
    ['neverFaced', null, 'headToHead.ts — the three who have been in a field with nobody'],
    ['noComparableResult', null, 'headToHead.ts — met, but no finish on either side is numbered'],
    ["'faced.", null, 'ui.ts — the head-to-head vocabulary, 9 keys × 2 languages'],
    ["'career.", null, 'ui.ts — the cumulative-record vocabulary, 6 keys × 2 languages'],
    ['EDGE_DASH', 'src/graph/palette.ts', 'palette.ts — the one rhythm that separates a non-meeting from a meeting'],
  ];
  /* Open seams. Each line: probe, the file that has to change, one sentence.
     Delete a line the moment its consumer lands — the check below enforces it.

     IT IS EMPTY, and that is the point of the device rather than a sign it is
     unused. It carried eight lines for two rounds — the whole head-to-head
     ledger, both string namespaces and the two "which kind of empty" lists,
     built and correct and reaching no screen. They are spent: `ledgerFor`,
     `neverFaced` and `noComparableResult` are read by Dossier.tsx's 이미 겨뤄
     본 사이 block, `careerTable` and 'career.* by AboutSheet's track record,
     `meetingsFor` and `haveFaced` by EdgeCard's pair results. Leave the map
     here for the next one; do not leave anything in it that has a consumer. */
  const KNOWN_OPEN = new Map([]);
  for (const [probe, home, why] of SEAMS) {
    const used = readsIt(probe, home);
    const open = KNOWN_OPEN.has(probe);
    if (!used && !open) fail(`nothing under src/components|graph|state reads ${probe} — ${why}`);
    if (used && open)
      fail(`${probe} now has a consumer — delete its line from KNOWN_OPEN in tools/validate-data.mjs`);
  }
  openSeams.push(...[...KNOWN_OPEN].map(([k, v]) => `${k} → ${v}`));
}

/* ── 0b. one fit rule for the plate's mark ─────────────────────────────────
   plateGeometry.ts's docblock has said since it was written that both painters
   call `fitMark` and "neither file may hardcode a radius or a span". For three
   rounds Portrait.tsx quietly did both — an inline
   `Math.min(R * 0.8, (R * 1.62) / glyphEm(glyph), …)` — so the cohort clamp
   added to the canvas never reached the cast wall, and the one screen that
   shows all twenty marks side by side set them 48% apart.

   A docblock is not an interlock. This is: the fit's private vocabulary may
   not appear outside the file that owns it. `glyphEm` is no longer exported,
   so a re-import fails tsc; this catches the other half, a re-implementation
   that never imports anything. */
{
  const OWNS_THE_FIT = 'src/graph/plateGeometry.ts';
  /* Two signals, and the second one needs both halves.
     `1.62` on its own is not evidence — layout.ts's WEB_SHAPE_MAX is 1.62 and
     has nothing to do with a mark, and the first draft of this check failed
     the build on it plus on a COMMENT in Portrait.tsx describing the literals
     it had just deleted. A guard with false positives is worse than none: it
     is the standing warning this file argues against everywhere else, and the
     first thing anyone does with it is stop reading the section.
     The width budget and the stack budget together are the fit's private pair
     and mean nothing else, so that conjunction is the signal. Comments and
     string bodies are stripped first, because describing the old rule has to
     stay legal — otherwise the check forbids its own explanation. */
  const code = (s) =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
      .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
  const WIDTH_BUDGET = /(?<![\w.])1\.62(?![\d])/;
  const STACK_BUDGET = /(?<![\w.])0\.76(?![\d])/;
  // Same walk idiom as section 0a — URLs off import.meta.url, no node:path.
  const seen = [];
  const walk = (p) => {
    const abs = new URL(`../${p}`, import.meta.url);
    let st;
    try {
      st = statSync(abs);
    } catch {
      return;
    }
    if (st.isDirectory()) for (const f of readdirSync(abs)) walk(`${p}/${f}`);
    else if (/\.(ts|tsx)$/.test(p)) seen.push([p, readFileSync(abs, 'utf8')]);
  };
  for (const r of ['src/components', 'src/graph', 'src/state']) walk(r);
  if (seen.length < 20) fail(`fit-rule check read only ${seen.length} files — the walk is broken, not the app`);
  const why =
    `the plate's fit rule lives only in ${OWNS_THE_FIT}. Call fitMark/markSet instead of ` +
    `re-deriving it — a second copy is how the cast wall and the canvas drew the same mark ` +
    `at two sizes for three rounds.`;
  for (const [rel, raw] of seen) {
    if (rel === OWNS_THE_FIT) continue;
    const src = code(raw);
    if (/\bglyphEm\s*\(/.test(src)) fail(`${rel} calls glyphEm() — ${why}`);
    if (WIDTH_BUDGET.test(src) && STACK_BUDGET.test(src))
      fail(`${rel} carries both of the fit's budget literals (1.62 and 0.76) — ${why}`);
  }
}

/* ── 0c. one rule for what counts as a verified connection ─────────────────
   The app prints a tie total on five surfaces under a legend that calls every
   tick 확인된 인연 / 'one verified connection', and three of them counted
   `parallel` in it — the edge type invented so that a NON-meeting could not be
   mistaken for a meeting. 강지후, 신승용 and 최연청 each read as having one
   verified connection while the single line they carry says in its own
   headline that the two have never been in the same room.

   The rule now lives in one place — NON_MEETING_TYPES / isMeeting / tieCounts
   in src/data/edges.ts — and this is the seam check for it, the same shape as
   section 0a: a surface that prints a tie count must read the rule rather than
   counting `edges.length` for itself. Same two-way enforcement, so a file that
   converts has to be taken off the open list. */
{
  const COUNTING_SURFACES = [
    ['src/components/Dossier.tsx', 'the header chip, the jump chip and the connections heading'],
    ['src/components/AboutSheet.tsx', "the track record's 확인된 인연 column"],
    ['src/components/Gallery.tsx', "the cast card's '1 건' and the plate's rim ticks"],
    ['src/components/HoverCard.tsx', 'the 관계 eyebrow and its pip row'],
    ['src/components/Portrait.tsx', 'one rim tick per entry in `connections`'],
    ['src/components/CommandPalette.tsx', "the result row's 'n ties' reason line"],
    ['src/components/FilterRail.tsx', 'the 가장 얽힌 인물 ranking'],
    ['src/graph/build.ts', 'GNode.degree — node radius, noTies, and every count downstream'],
  ];
  /* Not yet converted, owner named. Delete a line when its file reads the rule;
     the check below fails if a line outlives the problem.

     IT IS EMPTY, and — as with KNOWN_OPEN above — that is the device working
     rather than a sign it is unused. It carried all six of the surfaces named
     in the list above for a round: the plate's rim ticks, the wall's card
     count, the hover card's 관계 total, the palette's reason line, the rail's
     ranking, and `GNode.degree`, which is the root the other five descend
     from. They are spent. Every file in COUNTING_SURFACES now reads
     isMeeting / tieCounts, 강지후, 신승용 and 최연청 read 0 verified
     connections with their parallel record printed beside it under its own
     name, and `noTies` is true for the first time for the three people the
     canvas's cold band and dossier.coldTitle were written for.

     Leave the map here for the next surface that prints a tie total. Do not
     leave anything in it that has a consumer — the second branch below fails
     the build on that, and it is the half that keeps the list honest. */
  const COUNTING_OPEN = new Map([]);
  const RULE = /NON_MEETING_TYPES|isMeeting|tieCounts/;
  for (const [file, why] of COUNTING_SURFACES) {
    let text = '';
    try {
      text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    } catch {
      fail(`section 0c names ${file}, which does not exist — fix the list, not the check`);
      continue;
    }
    const reads = RULE.test(text);
    const open = COUNTING_OPEN.has(file);
    if (!reads && !open)
      fail(`${file} prints a tie count (${why}) and does not read isMeeting/tieCounts from data/edges.ts`);
    if (reads && open)
      fail(`${file} now reads the meeting rule — delete its line from COUNTING_OPEN in tools/validate-data.mjs`);
  }
  openSeams.push(
    ...[...COUNTING_OPEN].map(([k, v]) => `${k} counts a parallel tie as verified — ${v}`),
  );
}

/* ── 0d. a shared cast list is a candidate edge, and it has to be answered ──
   Six pairs shared an `otherShows` credit with no edge between them, three of
   them inside a clique this file's own copy enumerates by name — the 프로젝트
   지니어스 eight, of whom four are in this lineup. The file asserted the summons
   for one of those pairs and silently withheld the identical claim for three
   others drawn from the same list.

   MATCHED ON TITLE AND YEAR, the same join headToHead.ts uses and for the same
   reason: 문제적 남자 2016 and 문제적 남자 2020 are two different rooms, and a
   check that flagged them would teach everyone to ignore this section. So a hit
   here is a genuine same-room candidate, and it is a FAIL rather than a warning
   unless it is listed below with the reason it is still open. */
{
  const pairsWithEdge = new Set(edges.map((e) => [e.source, e.target].sort().join('|')));
  /* Answered, and why they are not drawn yet. See the block comment above the
     프로젝트 지니어스 edge in edges.ts: the research is done and the three land
     with the meta.sourcing citation counts, which are prose in dataset.ts and
     asserted in section 9 below. */
  const SHARED_OPEN = new Map([
    /* Empty, and that is the point: the three 프로젝트 지니어스 pairs that lived
       here for two rounds are drawn now. A pair listed here is a promise to
       come back to it, so an entry that outlives its research is worse than no
       list at all. */
  ]);
  const byShow = new Map();
  for (const p of people) {
    for (const s of p.otherShows ?? []) {
      const k = `${s.show}@${s.year ?? ''}`;
      byShow.set(k, [...(byShow.get(k) ?? []), p.id]);
    }
  }
  const seen = new Set();
  for (const [show, list] of byShow) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const k = [list[i], list[j]].sort().join('|');
        if (pairsWithEdge.has(k) || seen.has(k)) continue;
        seen.add(k);
        if (!SHARED_OPEN.has(k))
          fail(
            `${k} share "${show}" and carry no edge — draw it, or record the dead end in edges.ts and list it in SHARED_OPEN`,
          );
      }
    }
  }
  for (const k of SHARED_OPEN.keys()) {
    if (pairsWithEdge.has(k)) fail(`${k} now has an edge — delete its line from SHARED_OPEN in tools/validate-data.mjs`);
  }
  openSeams.push(...[...SHARED_OPEN].map(([k, v]) => `${k} — ${v}`));
}

/* ── 0e. two people in the same season of THIS franchise ────────────────────
   0d above answers "they were on the same other programme". It never asked the
   same question about the franchise the atlas is actually about, and that is
   the bigger claim by far: a season of 피의 게임 is ten to eighteen people
   sealed in one house for a fortnight, playing against each other by
   construction. Two names on one season's cast list did not merely overlap —
   they demonstrably met.

   That hole was open for twelve rounds and a reader found it before any check
   did. Seven of this lineup played season 2, all as contestants in one field of
   thirteen; five of the twenty-one pairs had no line between them, including
   이진형 and 홍진호 — the man who WON that season and the man who came third in
   it. The graph said they had never met.

   A host or panel seat still counts. 이상민 watched season 1 from the studio and
   박지민 dealt in season 3's 잔해 casino, so neither played those seasons — but
   both were THERE, the dataset already draws all five of those pairs as
   `co-season`, and the type exists to say exactly that: same season, different
   seat. Excluding them would be inventing an exemption the data does not use.

   FAIL, not warn, and for 0d's reason: this is a same-room candidate with no
   ambiguity to filter for. A pair may sit in SEASON_OPEN only with the research
   that keeps it there, and gaining an edge deletes the line — so the list
   cannot outlive the problem. */
{
  const pairsWithEdge = new Set(edges.map((e) => [e.source, e.target].sort().join('|')));
  /* Kept deliberately empty. A season pair with no edge is a factual claim that
     two people who spent a fortnight in the same house never met, and there is
     no version of that which is true — so unlike SHARED_OPEN, where a dead end
     is a real answer, an entry here can only ever mean "not written yet". */
  const SEASON_OPEN = new Map([]);

  const bySeason = new Map();
  for (const [id, runs] of Object.entries(records)) {
    for (const r of runs ?? []) {
      bySeason.set(r.season, [...(bySeason.get(r.season) ?? []), id]);
    }
  }
  const seen = new Set();
  for (const [season, list] of [...bySeason].sort((a, b) => a[0] - b[0])) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const k = [list[i], list[j]].sort().join('|');
        if (pairsWithEdge.has(k) || seen.has(k)) continue;
        seen.add(k);
        if (!SEASON_OPEN.has(k))
          fail(
            `${k} were both in season ${season} and carry no edge — two people cannot share a season of this show and not have met. Draw the line.`,
          );
      }
    }
  }
  for (const k of SEASON_OPEN.keys()) {
    if (pairsWithEdge.has(k)) fail(`${k} now has an edge — delete its line from SEASON_OPEN in tools/validate-data.mjs`);
  }
  openSeams.push(...[...SEASON_OPEN].map(([k, v]) => `${k} — ${v}`));
}

/* ── 0f. the English layer may not invent a gender ──────────────────────────
   Korean carries no third-person pronouns, so the Korean side — this file's
   declared source of truth for every fact — has nothing to say about gender.
   The English prose therefore INVENTS it, with no counterpart to check against.

   That is not hypothetical. 김유현's entire English dossier was authored on the
   premise that he is a woman: the bio, both Genius arcs, his billing line, an
   edge description and the gendered noun `alumna`. Internally consistent, from
   the initial commit, live for months. No check could see it because there was
   nothing to compare the prose to — every other invariant in this file works by
   holding two representations against each other, and this one had only one.

   `Person.pronouns` is the missing second representation. This section holds
   the prose against it.

   Scope: SINGLE-SUBJECT prose only — a bio, an arc, a billing line. Edge copy
   describes two people at once, so a pronoun there has two possible referents
   and flagging it would produce noise rather than findings; the one edge that
   carried the bug is caught anyway, because it also carried `alumna`, and
   gendered NOUNS are checked everywhere.

   The check is deliberately dumb: it looks for pronouns that cannot belong to
   this person and says so. It cannot catch a wrong `pronouns` value — nothing
   can, short of a source — but it makes the claim explicit, which is the whole
   point. A field somebody has to fill in is a field somebody has to think
   about. */
{
  const PRONOUNS = {
    he: ['he', 'him', 'his', 'himself'],
    she: ['she', 'her', 'hers', 'herself'],
    they: ['they', 'them', 'their', 'theirs', 'themselves'],
  };
  /* Gendered nouns get no pronoun set and no referent ambiguity, so they are
     checked in EVERY English string including edge copy. `alumna` sat in an
     edge for months precisely because a pronoun sweep would not have seen it. */
  const NOUNS = {
    he: ['alumnus', 'actor', 'host'],
    she: ['alumna', 'actress', 'hostess'],
  };

  /* `\\b`, not `\b`. In a template literal `\b` is U+0008, so the pattern
     becomes <backspace>he<backspace> and matches nothing — the check passes on
     every input, including the one it was written to catch. It shipped that way
     for one commit and was found by flipping a pronoun on purpose and watching
     the build stay green. A check that cannot fail is not a check. */
  const word = (hay, w) => new RegExp(`\\b${w}\\b`, 'i').test(hay);

  for (const p of people) {
    const set = p.pronouns;
    if (!set || !PRONOUNS[set]) {
      fail(`${p.id}: pronouns must be one of he | she | they`);
      continue;
    }
    const banned = Object.entries(PRONOUNS)
      .filter(([k]) => k !== set)
      .flatMap(([, v]) => v)
      /* `they` is legitimately used as a singular for anybody — "they lost the
         match" reads as neutral, not as a claim — and as a plural about two
         people in the same sentence. Only the gendered sets are exclusive. */
      .filter((w) => !PRONOUNS.they.includes(w));

    const en = peopleEn[p.id] ?? {};
    const blocks = [
      ['bio', en.bio],
      ['occupation', en.occupation],
      ...(en.notableFor ?? []).map((t, i) => [`notableFor[${i}]`, t]),
      ...(p.priorElsewhere ?? []).map((r, i) => [`priorElsewhere[${i}].arcEn`, r.arcEn]),
      ['x.billingEn', p.x?.billingEn],
      /* `beats` are excluded on purpose. They are one-line fragments whose
         subject is implied and whose object is usually another player — "staged
         tears that talked Jung Keun-woo into eliminating himself" is correct
         prose with one foreign pronoun and none of its own, so dominance has
         nothing to weigh and it flagged. Nothing is lost: the bug that prompted
         this section lived in long prose (a bio, two arcs, a billing line), and
         a one-line beat cannot carry a sustained wrong premise. */
      ...(recordsEn[p.id] ?? []).map((r, i) => [`records[${i}].arc`, r.arc]),
    ].filter(([, t]) => typeof t === 'string' && t);

    /* DOMINANCE, not presence.
       A block about one player legitimately names others: 정근우's season-1 arc
       turns on 박지민's tears, 홍진호's season-3 arc on 최혜선's win. Failing on
       the mere presence of "her" flagged all three on the first run — correct
       prose, wrong test. What actually distinguishes the bug is that 김유현's
       bio ran she×3 / he×0: when a block is ABOUT someone, their own pronouns
       win the count. A foreign set that outnumbers the declared one is the
       signal; a passing mention never does. */
    const count = (text, list) =>
      list.reduce((n, w) => n + (text.match(new RegExp(`\\b${w}\\b`, 'gi')) ?? []).length, 0);

    for (const [where, text] of blocks) {
      const mine = count(text, PRONOUNS[set]);
      for (const [other, list] of Object.entries(PRONOUNS)) {
        if (other === set || other === 'they') continue;
        const theirs = count(text, list);
        if (theirs > mine) {
          fail(
            `${p.id} declares pronouns "${set}" but ${where} uses ${other}/${list[1]} ` +
              `${theirs}× against ${mine}× of their own — either the prose is wrong or the declaration is`,
          );
        }
      }
    }
  }

  /* Gendered nouns, across every English surface including edges. */
  const nounHay = [
    ...people.flatMap((p) => [peopleEn[p.id]?.bio, p.x?.billingEn, ...(p.priorElsewhere ?? []).map((r) => r.arcEn)]),
    ...Object.values(edgesEn).map((e) => e.description),
    ...Object.values(recordsEn).flat().map((r) => r?.arc),
  ].filter((t) => typeof t === 'string');

  for (const [gender, list] of Object.entries(NOUNS)) {
    for (const n of list) {
      /* `actor` and `host` are the neutral forms this dataset deliberately
         uses for everyone — 최연청 is "An actor", never "actress" — so only the
         marked feminine forms are errors on their own. */
      if (gender === 'he') continue;
      for (const t of nounHay) {
        if (word(t, n)) {
          fail(`English copy uses the gendered noun "${n}" — this dataset uses the unmarked form for everyone`);
        }
      }
    }
  }
}

/* ── 0b. the ledger seam ───────────────────────────────────────────────────
   `Edge.outcomes` is the only hand-authored half of the head-to-head ledger;
   everything else in headToHead.ts is derived. So the authored half has to be
   checked against the derived one, or a duel can name a winner who is not in
   the pair, or place itself in a season one of the two never played, and the
   ledger will print it with a straight face. */
{
  for (const e of edges) {
    for (const d of e.outcomes ?? []) {
      if (d.winner !== e.source && d.winner !== e.target)
        fail(`edge ${e.id}: outcome winner "${d.winner}" is not one of the two people on this edge`);
      if (d.season !== 0) {
        for (const id of [e.source, e.target]) {
          const played = (records[id] ?? []).some((r) => r.season === d.season && r.role === 'contestant');
          if (!played)
            fail(`edge ${e.id}: outcome is set in season ${d.season}, which ${id} did not play as a contestant`);
        }
      }
      if (!d.where?.trim() || !d.whereEn?.trim()) fail(`edge ${e.id}: outcome is missing where/whereEn`);
    }
  }
  /* A duel between two people not joined by an edge cannot exist — outcomes
     hang off edges. The derived direction can and should: a field result is
     computed from records, so every pair who shared a season is in the ledger
     whether or not anything happened between them worth an edge. That is the
     point of a ledger, so it is reported below rather than asserted. */
}

/* ── 1. referential integrity ─────────────────────────────────────────────── */

for (const e of edges) {
  if (!ids.has(e.source)) fail(`edge ${e.id}: unknown source "${e.source}"`);
  if (!ids.has(e.target)) fail(`edge ${e.id}: unknown target "${e.target}"`);
  if (e.source === e.target) fail(`edge ${e.id}: self-loop`);
}
for (const id of Object.keys(records)) {
  if (!ids.has(id)) fail(`records: "${id}" is not a person id`);
}

const seenEdgeIds = new Set();
for (const e of edges) {
  if (seenEdgeIds.has(e.id)) fail(`duplicate edge id "${e.id}"`);
  seenEdgeIds.add(e.id);
}

/* ── 2. no duplicate pairs saying the same thing ──────────────────────────── */

const pairKey = new Map();
for (const e of edges) {
  const k = [e.source, e.target].sort().join('|') + `|${e.type}|${e.season}`;
  if (pairKey.has(k)) fail(`duplicate relationship: ${e.id} restates ${pairKey.get(k)}`);
  pairKey.set(k, e.id);
}

/* A pair may legitimately carry two different kinds of tie, but more than two
   is almost always the duplication problem coming back. */
const pairCount = new Map();
for (const e of edges) {
  const k = [e.source, e.target].sort().join('|');
  pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
}
for (const [k, n] of pairCount) if (n > 2) warn(`${k} carries ${n} edges — check for restatement`);

/* ── 3. records are the single source of truth for placements ─────────────── */

const bySeason = new Map();
for (const [id, runs] of Object.entries(records)) {
  runs.forEach((r, i) => {
    if (r.role !== 'contestant' && r.rank !== undefined) {
      fail(`${id} season ${r.season}: role "${r.role}" must not carry a rank`);
    }
    if (r.rank !== undefined) {
      const key = `${r.season}#${r.rank}`;
      if (bySeason.has(key)) {
        fail(`season ${r.season}: ${id} and ${bySeason.get(key)} both claim rank ${r.rank}`);
      }
      bySeason.set(key, id);
      // A rank of 1 has to read as a win in the placement string.
      if (r.rank === 1 && !/우승|Winner/i.test(r.placement)) {
        warn(`${id} season ${r.season}: rank 1 but placement reads "${r.placement}"`);
      }
    }
    if (!r.arc || r.arc.length < 60) warn(`${id} season ${r.season}: arc is thin (${r.arc?.length ?? 0} chars)`);
    void i;
  });
}

/* ── 3b. a rank is only a fact next to its field ──────────────────────────── */
{
  /* The field a season was played in is one number, and it is written on every
     run in that season. When two of them disagree, Top % — the only honest way
     the app compares 3위 of 13 with 3위 of 18 — is computed against two
     different denominators inside one season and nothing looks wrong. */
  const field = new Map();
  for (const [id, runs] of Object.entries(records)) {
    for (const r of runs) {
      if (r.fieldSize === undefined) continue;
      const seen = field.get(r.season);
      if (seen && seen.size !== r.fieldSize)
        fail(`season ${r.season}: ${id} says the field was ${r.fieldSize}, ${seen.id} says ${seen.size}`);
      if (!seen) field.set(r.season, { size: r.fieldSize, id });
      if (r.rank !== undefined && r.rank > r.fieldSize)
        fail(`${id} season ${r.season}: rank ${r.rank} in a field of ${r.fieldSize}`);
    }
    /* Every run carries the pages it was adjudicated from. This is the one
       long-form block in the dataset that shipped without a citation surface. */
    for (const r of runs) {
      if (!(r.sources ?? []).length) fail(`records ${id} s${r.season}: no sources`);
      for (const s of r.sources ?? [])
        if (!/^https?:\/\/\S+$/.test(s)) fail(`records ${id} s${r.season}: source is not a bare URL — "${s.slice(0, 60)}…"`);
    }
  }
  /* `ExternalShow.show` became a JOIN KEY the moment headToHead.ts started
     pairing people on it. Two spellings of one programme is not a typo any
     more — it silently drops a pair out of the ledger, with nothing on screen
     to show that it happened. Same failure shape as the missing edge type:
     the data is right and the surface is wrong. */
  const koForEn = new Map();
  const enForKo = new Map();
  for (const p of people) {
    for (const s of p.otherShows ?? []) {
      const ko = s.showKo ?? s.show;
      if (koForEn.has(s.show) && koForEn.get(s.show).ko !== ko)
        fail(`otherShows: "${s.show}" is "${koForEn.get(s.show).ko}" on ${koForEn.get(s.show).id} and "${ko}" on ${p.id} — the ledger joins on this string`);
      koForEn.set(s.show, { ko, id: p.id });
      if (enForKo.has(ko) && enForKo.get(ko).en !== s.show)
        fail(`otherShows: "${ko}" is "${enForKo.get(ko).en}" on ${enForKo.get(ko).id} and "${s.show}" on ${p.id}`);
      enForKo.set(ko, { en: s.show, id: p.id });
      if (s.rank !== undefined && s.fieldSize !== undefined && s.rank > s.fieldSize)
        fail(`${p.id} / ${s.show}: rank ${s.rank} in a field of ${s.fieldSize}`);
      if (s.fieldSize !== undefined && s.rank === undefined)
        warn(`${p.id} / ${s.show}: field size with no rank — nothing can be compared against it`);
    }
  }
}

/* ── 3c. the parallel edges keep saying they are not meetings ─────────────── */
for (const e of edges.filter((x) => x.type === 'parallel')) {
  if (e.confidence !== 'low')
    fail(`edge ${e.id}: a parallel record must stay confidence 'low' so the 미확인 marker fires on every surface`);
  if (!e.label.includes('만난 적 없는'))
    fail(`edge ${e.id}: a parallel label must lead with 만난 적 없는 — the label is read alone on the hover card`);
  if (!/never/i.test(e.labelEn ?? ''))
    fail(`edge ${e.id}: the English parallel label must say "never" for the same reason`);
}

/* ── 4. no internal notes in user-facing copy ─────────────────────────────── */

/* ── 3d. no machine particles in the language of record ───────────────────
   과(와) is the Korean of writing "1 item(s)", and this app printed one in the
   headline of the only screen a reader sees when a trace fails. It came back a
   second time, in `faced.beat`, nine lines under the comment condemning it —
   because the fix was a string edit and string edits do not generalise. ui.ts
   now carries `josa`/`fill`, so a template writes the pair (`{w}이/가`) and the
   selection happens at render. This is the check that stops the third one.

   The bracket forms are only wrong in generated copy: a sentence about the
   forms themselves has to be able to quote them, which is why this scans the
   string tables and the dataset's prose and not the comments around them. */
{
  const MACHINE_JOSA = /(과\(와\)|와\(과\)|을\(를\)|를\(을\)|이\(가\)|가\(이\)|은\(는\)|는\(은\)|\(으\)로)/;
  const koStrings = [
    ...Object.entries(ui.ko).map(([k, v]) => [`ui.ko["${k}"]`, v]),
    ...people.map((p) => [`person ${p.id}.bio`, p.bio]),
    ...edges.flatMap((e) => [
      [`edge ${e.id}.label`, e.label],
      [`edge ${e.id}.description`, e.description],
    ]),
    ...Object.entries(records).flatMap(([id, runs]) =>
      runs.map((r) => [`records ${id} s${r.season}.arc`, r.arc]),
    ),
  ];
  for (const [where, v] of koStrings) {
    const m = String(v).match(MACHINE_JOSA);
    if (m) fail(`${where}: machine particle "${m[0]}" — write the pair (예: {w}이/가) and read it with fill()`);
  }
  /* And the other half: a slot followed by a bare particle is worse than the
     bracket form, because it is silently wrong for half the cast rather than
     visibly wrong for all of it. '{w}가' is right for 홍진호 and wrong for
     이진형. Only the pair form is correct, so only the pair form is allowed. */
  for (const [k, v] of Object.entries(ui.ko)) {
    const m = String(v).match(/\{\w+\}(이|가|을|를|은|는|과|와)(?![가-힣/])/);
    if (m) fail(`ui.ko["${k}"]: "{…}${m[1]}" agrees with only half the names — write "${m[1]}/…" as a pair`);
  }
}

const NOTES = [
  ['헤드라인 수정', 'editorial instruction'],
  ['교차 검증 자료 없음', 'sourcing caveat — use the confidence field'],
  ['원 설명', 'reference to a draft the reader never saw'],
  ['(EN)', 'inline translation'],
  ['확인 필요', 'research to-do'],
  ['TODO', 'to-do'],
  ['verbatim:', 'research quote'],
];
const scan = (where, text) => {
  if (typeof text !== 'string') return;
  for (const [needle, why] of NOTES) {
    if (text.includes(needle)) fail(`${where}: contains "${needle}" (${why})`);
  }
};
for (const e of edges) {
  scan(`edge ${e.id}.description`, e.description);
  scan(`edge ${e.id}.label`, e.label);
  for (const s of e.sources ?? []) {
    if (!/^https?:\/\/\S+$/.test(s)) fail(`edge ${e.id}: source is not a bare URL — "${s.slice(0, 60)}…"`);
  }
}
for (const p of people) {
  scan(`person ${p.id}.bio`, p.bio);
  for (const s of p.sources ?? []) {
    if (!/^https?:\/\/\S+$/.test(s)) fail(`person ${p.id}: source is not a bare URL — "${s.slice(0, 60)}…"`);
  }
}
for (const [id, runs] of Object.entries(records)) {
  for (const r of runs) {
    scan(`records ${id} s${r.season}.arc`, r.arc);
    for (const b of r.beats ?? []) scan(`records ${id} s${r.season}.beat`, b);
  }
}

/* ── 5. no placeholders left in season metadata ───────────────────────────── */

for (const s of seasons) {
  for (const field of ['episodes', 'airDates', 'prize', 'format', 'hook']) {
    const v = s[field];
    if (!v || String(v).trim().length < 4) fail(`season ${s.season}.${field} is empty or a stub ("${v}")`);
  }
  if (/^시즌\s*\d+$/.test(String(s.episodes))) fail(`season ${s.season}.episodes is a placeholder ("${s.episodes}")`);
  if (!s.winnerNameKo) warn(`season ${s.season} has no winner named`);
  if (!s.signatureMoment) warn(`season ${s.season} has no signature moment`);
}

/* ── 6. every edge carries an English headline ────────────────────────────── */

for (const e of edges) {
  if (!e.labelEn || !e.labelEn.trim()) fail(`edge ${e.id}: missing labelEn`);
}

/* ── 7. the English side covers the Korean side ───────────────────────────── */

for (const p of people) {
  if (!peopleEn[p.id]) fail(`i18n: no English entry for person "${p.id}"`);
}
for (const [id, runs] of Object.entries(records)) {
  const en = recordsEn[id];
  if (!en) {
    fail(`i18n: no English records for "${id}"`);
    continue;
  }
  if (en.length !== runs.length) {
    fail(`i18n: "${id}" has ${runs.length} Korean runs but ${en.length} English`);
    continue;
  }
  runs.forEach((r, i) => {
    if (en[i].season !== r.season) {
      fail(`i18n: "${id}" run ${i} is season ${r.season} in Korean and ${en[i].season} in English`);
    }
  });
}

for (const e of edges) {
  if (!edgesEn[e.id]) fail(`i18n: no English entry for edge "${e.id}"`);
}
for (const s of seasons) {
  if (!seasonsEn[s.season]) fail(`i18n: no English entry for season ${s.season}`);
}
for (const g of glossary) {
  if (!glossaryEn[g.termKo]) fail(`i18n: no English meaning for glossary term "${g.termKo}"`);
}

/* The two string tables must carry identical key sets — a one-sided key
   strands a Korean string in the English interface, which is the whole failure
   mode the table exists to prevent. */
{
  const ko = Object.keys(ui.ko);
  const en = new Set(Object.keys(ui.en));
  for (const k of ko) if (!en.has(k)) fail(`i18n: ui key "${k}" exists in ko but not en`);
  const koSet = new Set(ko);
  for (const k of en) if (!koSet.has(k)) fail(`i18n: ui key "${k}" exists in en but not ko`);
  // Hangul inside parentheses is a deliberate gloss — "Bloody Game X (피의 게임X)".
  // Hangul anywhere else in an English string is a missed translation.
  //
  // Except on the canvas empty/cold plates, which are a two-line lockup: the
  // title states it in the reading language and the sub restates it in the
  // other script, so the plate reads as the same idea twice rather than as one
  // sentence stuttering. That inversion is the design — the KO plate carries a
  // Latin sub for exactly the same reason — so these two keys are listed here
  // by name. A standing warning is worse than no warning: it teaches everyone
  // to skim past the section where a real missed translation would appear.
  const BILINGUAL_LOCKUP = new Set(['canvas.emptySub', 'canvas.coldSub']);
  for (const [k, v] of Object.entries(ui.en)) {
    if (BILINGUAL_LOCKUP.has(k)) continue;
    const stripped = String(v).replace(/\([^)]*\)/g, '');
    if (/[가-힣]/.test(stripped)) warn(`i18n: English string for "${k}" contains untranslated Hangul — "${v}"`);
  }
  // …and the inversion has to actually invert: a lockup key whose two tables
  // hold the same string is not a gloss, it is a forgotten translation wearing
  // the exemption. Round 4 shipped canvas.coldSub identical in both.
  for (const k of BILINGUAL_LOCKUP) {
    if (ui.en[k] === ui.ko[k]) fail(`i18n: "${k}" is exempt as a bilingual lockup but ko and en hold the same string`);
    if (/[가-힣]/.test(String(ui.ko[k]))) fail(`i18n: "${k}" is a bilingual lockup, so the ko side must carry the Latin gloss`);
  }
}

/* ── 8. the spoiler firewall ──────────────────────────────────────────────── */

const FORBIDDEN = [
  /피의\s*게임\s*X\s*(?:에서|에선)/,
  /시즌\s*X\s*(?:에서|에선|\d+화)/,
  /X\s*\d+화/,
];
const allText = [
  ...people.map((p) => p.bio),
  ...edges.map((e) => `${e.label} ${e.description}`),
  ...Object.values(records).flatMap((rs) => rs.map((r) => `${r.arc} ${(r.beats ?? []).join(' ')}`)),
  ...seasons.map((s) => `${s.format} ${s.signatureMoment ?? ''}`),
  ...glossary.map((g) => g.meaning),
  // the English side gets the same treatment
  ...Object.values(peopleEn).map((p) => p.bio),
  ...Object.values(recordsEn).flatMap((rs) => rs.map((r) => `${r.arc} ${(r.beats ?? []).join(' ')}`)),
  ...Object.values(edgesEn).map((e) => e.description),
  ...Object.values(seasonsEn).map((s) => `${s.format} ${s.signatureMoment ?? ''}`),
].join('\n');

/* English needs its own probes — the Korean patterns will not catch
   "in season X he" or "X's winner". */
const FORBIDDEN_EN = [
  /\bin season X\b/i,
  /\bseason X('s)? (results?|winner|elimination|standings|episode)/i,
  /\bduring (season )?X\b/i,
];
for (const re of FORBIDDEN_EN) {
  const m = allText.match(re);
  if (m) fail(`SPOILER FIREWALL (en): text matches ${re} — "${m[0]}"`);
}

for (const re of FORBIDDEN) {
  const m = allText.match(re);
  if (m) fail(`SPOILER FIREWALL: dataset text matches ${re} — "${m[0]}"`);
}

/* ── 9. the evidence, and the paragraph that describes it ─────────────────── */

const hostOf = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, '');
  } catch {
    return '(unparseable)';
  }
};
const allRefs = [];
for (const e of edges) allRefs.push(...(e.sources ?? []));
for (const p of people) {
  allRefs.push(...(p.sources ?? []));
  for (const pe of p.priorElsewhere ?? []) allRefs.push(...(pe.sources ?? []));
}
for (const runs of Object.values(records)) for (const r of runs) allRefs.push(...(r.sources ?? []));

const hostCount = new Map();
for (const u of allRefs) hostCount.set(hostOf(u), (hostCount.get(hostOf(u)) ?? 0) + 1);
const namuCount = hostCount.get('namu.wiki') ?? 0;

/* The five betrayals are the heaviest claims this dataset makes about named
   real people — that one of them knifed another on camera, that one is called
   배신의 아이콘. Those cannot rest on a wiki alone, and 'we should source them
   better' in a comment is not a mechanism; this is. */
for (const e of edges.filter((x) => x.type === 'betrayal')) {
  const refs = e.sources ?? [];
  if (!refs.some((u) => hostOf(u) !== 'namu.wiki'))
    fail(`edge ${e.id}: a betrayal is cited to namu.wiki alone — pair it with contemporaneous press or the person's own interview`);
}

/* The betrayal rule above is a floor, and a floor is not a direction. The real
   finding was that 77% of every citation in this dataset is one crowd-editable
   wiki, and that the edges making adjudicable claims — a quoted line of on-air
   dialogue, a scoreline, a named play — are largely standing on it alone. That
   is not a defect one commit closes; it is a research backlog, and a backlog
   with no mechanism is a backlog that sits at the same number for six rounds,
   which is what the depth score has done.

   So it is a ratchet. The number below is measured, not chosen. Adding an edge
   at confidence 'high' with only a wiki behind it fails the build; sourcing one
   properly fails it too, and tells you to write the smaller number down. The
   count can only go one way, and the file records where it has got to. */
{
  const HIGH_WIKI_ONLY = 15;
  const isWiki = (u) => /(^|\.)namu\.wiki$/.test(hostOf(u));
  const stranded = edges.filter(
    (e) => e.confidence === 'high' && (e.sources ?? []).length > 0 && (e.sources ?? []).every(isWiki),
  );
  if (stranded.length > HIGH_WIKI_ONLY)
    fail(
      `${stranded.length} 'high' edges cite namu.wiki alone, up from ${HIGH_WIKI_ONLY} — pair the new one with press or an interview: ${stranded
        .map((e) => e.id)
        .slice(-4)
        .join(', ')}`,
    );
  if (stranded.length < HIGH_WIKI_ONLY)
    fail(
      `only ${stranded.length} 'high' edges are wiki-only now, not ${HIGH_WIKI_ONLY} — lower HIGH_WIKI_ONLY in tools/validate-data.mjs so the ratchet holds the new floor`,
    );
  openSeams.push(
    `${stranded.length} 'high' edges still cite namu.wiki alone → edges.ts, pair each with press or an interview`,
  );
}

/* And the About sheet's sourcing note quotes these counts in prose. A number
   in a paragraph is a number that rots; this makes the paragraph a claim the
   build checks. Update the note when the count moves — do not delete this. */
{
  const claimed = dataset.meta.sourcing.match(/전체 인용 (\d+)건 중 (\d+)건, 약 (\d+)%/);
  if (!claimed) {
    fail('meta.sourcing no longer states its citation counts in the form the validator checks');
  } else {
    const [, total, namu, pct] = claimed.map(Number);
    if (total !== allRefs.length) fail(`meta.sourcing claims ${total} citations; there are ${allRefs.length}`);
    if (namu !== namuCount) fail(`meta.sourcing claims ${namu} from namu.wiki; there are ${namuCount}`);
    const real = Math.round((namuCount / allRefs.length) * 100);
    if (Math.abs(pct - real) > 1) fail(`meta.sourcing claims about ${pct}%; it is ${real}%`);
  }
  const en = dataset.meta.sourcingEn.match(/(\d+) of (\d+) citations, about (\d+)%/);
  if (!en) fail('meta.sourcingEn no longer states its citation counts in the form the validator checks');
  else if (Number(en[1]) !== namuCount || Number(en[2]) !== allRefs.length)
    fail(`meta.sourcingEn says ${en[1]}/${en[2]}; it is ${namuCount}/${allRefs.length}`);
}

/* ── report ───────────────────────────────────────────────────────────────── */

/* TWO EMPTINESSES, PRINTED APART, because this file spent a round printing one
   number under the other one's name. `iso` is nobody-touches-them, which is
   what the check in section 0 is about and what would render as a bare dot.
   `cold` is the app's headline claim — no VERIFIED connection — and it is 3,
   not 0, for exactly as long as 강지후, 신승용 and 최연청 carry only a parallel
   record. A run that printed "no verified tie: 0" while three people had none
   is the same conflation section 0c exists to keep out of the interface. */
const iso = people.filter((p) => !edges.some((e) => e.source === p.id || e.target === p.id));
const cold = people.filter((p) =>
  !edges.some((e) => (e.source === p.id || e.target === p.id) && isMeeting(e.type)),
);

console.log(`people ${people.length}  edges ${edges.length}  seasons ${seasons.length}  glossary ${glossary.length}`);
console.log(
  `english: ${Object.keys(peopleEn).length} people, ${Object.values(recordsEn).flat().length} season runs, ` +
    `${Object.keys(edgesEn).length} edges, ${Object.keys(glossaryEn).length} glossary, ` +
    `${Object.keys(ui.ko).length} ui strings`,
);
console.log(`no edge at all: ${iso.length}${iso.length ? ` (${iso.map((p) => p.nameKo).join(', ')})` : ''}`);
console.log(
  `no verified tie: ${cold.length}${cold.length ? ` (${cold.map((p) => p.nameKo).join(', ')})` : ''}`,
);

const nameOf = (id) => people.find((p) => p.id === id)?.nameKo ?? id;
const duels = meetings.filter((m) => m.kind === 'duel').length;
const pairs = new Set(meetings.map((m) => m.pair.join('|'))).size;
console.log(
  `ledger: ${meetings.length} results over ${pairs} pairs (${duels} duels, ${meetings.length - duels} field finishes); ` +
    `${Object.values(career).filter((c) => c.share !== undefined).length} careers rankable`,
);
console.log(`never in a field with anyone: ${neverFaced.map(nameOf).join(', ') || '(none)'}`);
console.log(
  `citations: ${allRefs.length} refs, ${new Set(allRefs).size} unique, ${hostCount.size} hosts, ` +
    `namu.wiki ${namuCount} (${((namuCount / allRefs.length) * 100).toFixed(1)}%)`,
);

if (openSeams.length) {
  console.log(`\n${openSeams.length} data surface(s) built and not yet wired:`);
  for (const s of openSeams) console.log('  ·', s);
}
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log('  ~', w);
}

/* ── 10. the scope spine ───────────────────────────────────────────────────
   Phase 1 tagged roughly 250 records with the works whose outcomes they give
   away, and nothing checked any of it — three authors tagged in parallel while
   this file did not read the word "scope" once. The guarantee was three
   people's diligence rather than a property of the build.

   It has to be checked rather than trusted for a reason specific to this
   design: AN ABSENT SCOPE IS INDISTINGUISHABLE FROM ONE NOBODY HAS WRITTEN
   YET. Both resolve to hidden at runtime, which is the safe direction — and it
   is also why a lost tag is silent. That is not hypothetical: during Phase 1 a
   concurrent write removed the scope from a run mid-pass, and every consumer
   downstream would have carried on happily over-redacting one field forever.

   The asymmetry orders these checks. An over-tagged safe fact costs a reader
   one click; a missed outcome is permanent for somebody who asked not to be
   spoiled. So the untagged sweep FAILS and the over-tagging observations are
   only reported. */
{
  const scopeOf = (o) => (Array.isArray(o?.scope) ? o.scope : null);
  const known = new Set(ALL_WORK_IDS);

  /* Every id used anywhere has to exist. TypeScript closes the union for
     hand-written source; this also covers anything merged or generated. */
  const seenIds = new Set();
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return void o.forEach(walk);
    for (const [k, v] of Object.entries(o)) {
      if (k === 'scope' && Array.isArray(v)) v.forEach((id) => seenIds.add(id));
      else if (k === 'scopes' && v && typeof v === 'object') {
        for (const arr of Object.values(v)) {
          if (Array.isArray(arr)) arr.flat().forEach((id) => typeof id === 'string' && seenIds.add(id));
        }
      } else walk(v);
    }
  };
  walk({ people, records, edges, seasons, glossary, peopleEn, recordsEn, edgesEn, seasonsEn, glossaryEn });
  for (const id of seenIds) {
    if (!known.has(id)) fail('scope names "' + id + '", which is not a WorkId in works.ts');
  }

  /* 10a-bis. THE RETIRED GENRES. works.ts's inclusion test §3 takes 쇼미더머니
     out of the registry by the owner's call: this atlas is a map of a brain
     survival house, and nobody guards a 2015 rap contest's preliminary rounds
     the way they guard a season they are part-way through. The rule turns on
     GENRE, which is the one thing in that test a future author cannot re-derive
     from the shape of a claim — so it is checked here rather than left to a
     docblock somebody has to have read. Restoring the ids would put five
     sections' worth of eliminations back behind a tick nobody wants; if that is
     the intent, delete this list in the same commit and say why. */
  const RETIRED = [
    ['smtm', '쇼미더머니 — a music competition, not this atlas\'s subject (works.ts inclusion test §3)'],
  ];
  for (const [prefix, why] of RETIRED) {
    for (const id of ALL_WORK_IDS) {
      if (id === prefix || id.startsWith(prefix + '-')) {
        fail('works.ts carries a retired work id "' + id + '": ' + why);
      }
    }
  }

  /* 10a. THE BYTE-IDENTITY INVARIANT — what makes phase 1 invisible by
     construction rather than by promise. A split may not alter one character
     of what renders today. */
  const PART_FIELDS = [
    ['arcParts', 'arc'],
    ['arcEnParts', 'arcEn'],
    ['bioParts', 'bio'],
    ['descriptionParts', 'description'],
    ['meaningParts', 'meaning'],
  ];
  let splits = 0;
  const checkParts = (obj, where) => {
    for (const [pf, orig] of PART_FIELDS) {
      const parts = obj[pf];
      if (!Array.isArray(parts)) continue;
      splits++;
      if (parts.map((x) => (x && x.text) || '').join('') !== obj[orig]) {
        fail(where + ': ' + pf + ' does not reconstruct ' + orig + ' byte for byte — a split changed what renders');
      }
      for (const part of parts) {
        if (!Array.isArray(part && part.scope)) fail(where + ': a ' + pf + ' entry carries no scope');
      }
      /* A part may not reveal a work the whole-string tag omits. Without this a
         split can widen what a field gives away while the field's own scope
         still looks right — a leak the join check cannot see. */
      const fieldScope = (obj.scopes && obj.scopes[orig]) || obj.scope;
      if (Array.isArray(fieldScope)) {
        const outside = [...new Set(parts.flatMap((x) => (x && x.scope) || []))].filter((id) => !fieldScope.includes(id));
        if (outside.length) {
          fail(where + ': ' + pf + ' names ' + outside.join(', ') + " but " + orig + "'s own scope does not — the split widens the claim");
        }
      }
    }
  };

  /* 10b. A per-entry scope array has to line up with the prose it scopes. */
  const checkAligned = (obj, where) => {
    for (const f of ['beats', 'notableFor']) {
      const sc = obj.scopes && obj.scopes[f];
      if (!Array.isArray(sc)) continue;
      const arr = obj[f];
      const n = Array.isArray(arr) ? arr.length : 0;
      if (sc.length !== n) {
        fail(where + ': scopes.' + f + ' has ' + sc.length + ' entries for ' + n + ' ' + f + ' — they must align one to one');
      }
    }
  };

  /* 10c. THE UNTAGGED-OUTCOME SWEEP — the leak list, and it fails. */
  const untagged = [];
  const sweep = (obj, kind, where, manifest) => {
    if (!obj || typeof obj !== 'object') return;
    checkParts(obj, where);
    checkAligned(obj, where);
    const fields = manifest[kind];
    if (!fields) return;
    const present = fields.filter((f) => {
      const v = obj[f];
      return v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0);
    });
    if (!present.length) return;
    for (const f of present) {
      const own = obj.scopes && obj.scopes[f];
      if (own === undefined && scopeOf(obj) === null) {
        untagged.push(where + '.' + f + ' is outcome-bearing and carries no scope');
      }
    }
  };

  for (const [id, runs] of Object.entries(records)) {
    (runs || []).forEach((r, i) => sweep(r, 'SeasonRun', 'records.' + id + '[' + i + ']', OUTCOME_FIELDS));
  }
  for (const [id, runs] of Object.entries(recordsEn)) {
    (runs || []).forEach((r, i) => sweep(r, 'SeasonRunEn', 'recordsEn.' + id + '[' + i + ']', OUTCOME_FIELDS_EN));
  }
  for (const p of people) {
    sweep(p, 'Person', 'people.' + p.id, OUTCOME_FIELDS);
    (p.priorElsewhere || []).forEach((b, i) => sweep(b, 'PriorElsewhere', 'people.' + p.id + '.priorElsewhere[' + i + ']', OUTCOME_FIELDS));
    if (p.x) sweep(p.x, 'XBilling', 'people.' + p.id + '.x', OUTCOME_FIELDS);
  }
  for (const [id, v] of Object.entries(peopleEn)) sweep(v, 'PersonEn', 'peopleEn.' + id, OUTCOME_FIELDS_EN);
  for (const e of edges) sweep(e, 'Edge', 'edge ' + e.id, OUTCOME_FIELDS);
  for (const [id, v] of Object.entries(edgesEn)) sweep(v, 'EdgeEn', 'edgesEn.' + id, OUTCOME_FIELDS_EN);

  /* The four kinds the first cut of this sweep forgot. works.ts declares twelve
     manifests; §10c called eight of them, so seasons.ts and the glossary — which
     carry every season's winner, prize and signature moment, and the payout
     reconciliation — were never asked for a scope and passed green anyway.
     ExternalShow and Duel happened to be fully tagged, which made them latent
     rather than live. A manifest that is imported and never swept is worse than
     no manifest: it reads as coverage. */
  for (const m of seasons) {
    sweep(m, 'SeasonMeta', 'seasons[' + m.season + ']', OUTCOME_FIELDS);
    for (const d of m.duels || []) sweep(d, 'Duel', 'seasons[' + m.season + '].duel', OUTCOME_FIELDS);
  }
  for (const [k, v] of Object.entries(seasonsEn)) sweep(v, 'SeasonMetaEn', 'seasonsEn.' + k, OUTCOME_FIELDS_EN);
  for (const g of glossary) sweep(g, 'GlossaryTerm', 'glossary.' + g.termKo, OUTCOME_FIELDS);
  for (const [k, v] of Object.entries(glossaryEn)) sweep(v, 'GlossaryEn', 'glossaryEn.' + k, OUTCOME_FIELDS_EN);
  for (const p of people) {
    (p.otherShows || []).forEach((r, i) => sweep(r, 'ExternalShow', 'people.' + p.id + '.otherShows[' + i + ']', OUTCOME_FIELDS));
  }
  for (const e of edges) {
    (e.outcomes || []).forEach((d, i) => sweep(d, 'Duel', 'edge ' + e.id + '.outcomes[' + i + ']', OUTCOME_FIELDS));
  }

  for (const u of untagged) fail('scope: ' + u);

  /* 10d. THE DENOMINATOR. A rank hidden behind a visible field size is not
     hidden — the plate draws an arc at rank/fieldSize, so the denominator and
     the picture give the numerator back. PLAN-spoilers.md §3. */
  for (const [id, runs] of Object.entries(records)) {
    (runs || []).forEach((r, i) => {
      if (r.rank === undefined || r.fieldSize === undefined) return;
      const a = JSON.stringify((r.scopes && r.scopes.rank) || r.scope || null);
      const b = JSON.stringify((r.scopes && r.scopes.fieldSize) || r.scope || null);
      if (a !== b) {
        fail('records.' + id + '[' + i + ']: fieldSize scope ' + b + ' differs from rank scope ' + a + ' — the denominator inverts the arc');
      }
    });
  }

  /* 10e. A VERDICT THAT CAME FROM A WORK MUST NAME THE WORK.
     Narrower than "every betrayal and rivalry", deliberately. The rule is about
     verdicts a reader could still be walking toward — an in-house betrayal, a
     directed accusation. It cannot cover verdicts that came from life: 하승진
     and 이관희 fell out in a 2020 YouTube argument, and there is no work anyone
     could watch to reach it, so a non-empty scope would seal that line against
     every reader forever rather than protect anybody. Both Phase 1 authors
     reached scope [] there independently, working blind of each other. */
  const VERDICT = new Set(['betrayal', 'rivalry']);
  for (const e of edges) {
    if (!VERDICT.has(e.type)) continue;
    const fromAWork = e.season !== 0;
    const accuses = Boolean(e.directed) || e.type === 'betrayal';
    const sc = (e.scopes && e.scopes.description) || e.scope;
    if ((fromAWork || accuses) && Array.isArray(sc) && sc.length === 0) {
      fail('edge ' + e.id + ' is a ' + e.type + ' from inside a work and scoped [] — a verdict from a work must name it');
    }
  }

  /* 10f. Reported, never enforced as parity. Both languages must be TAGGED;
     their VALUES may legitimately differ, because they are different prose
     making different claims — 박지민's English season-3 arc states two exits the
     Korean does not. Do not "tidy" this into an equality check. */
  let bothTagged = 0;
  let runsTotal = 0;
  for (const [id, runs] of Object.entries(records)) {
    const en = recordsEn[id] || [];
    (runs || []).forEach((r, i) => {
      runsTotal++;
      if (scopeOf(r) && scopeOf(en[i])) bothTagged++;
    });
  }

  console.log(
    'scope: ' + seenIds.size + ' of ' + ALL_WORK_IDS.length + ' works referenced, ' +
      splits + ' prose splits reconstruct exactly, ' +
      bothTagged + '/' + runsTotal + ' runs tagged on both sides',
  );
}

if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  for (const p of problems) console.log('  ✗', p);
  process.exit(1);
}
console.log('\nAll invariants hold.');
