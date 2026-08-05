import type { Category, EdgeType, SeasonNumber } from '../data/types';

/* Canvas can't read CSS variables cheaply per-frame, so the palette is
   mirrored here. Keep in sync with styles/tokens.css.

   Four channels, and the channel is what a hue means:

     CATEGORY_COLOR  who someone is      — rings   — half chroma, sits back
     CATEGORY_RING   …the same ten, for a region stroke drawn at part alpha
     EDGE_COLOR      what happened       — lines   — full chroma, sits forward
     SEASON_COLOR    which season        — arcs    — deep and low-key
     BRASS           past champion       — halo    — the only bright gold ring

   CATEGORY_COLOR and EDGE_COLOR used to be the same nine values, so a mint
   ring meant "athlete" while a mint line meant "alliance" in the same frame
   and neither legend could be learned. They are now separated by channel
   rather than by hue: the archetype ramp is the relationship ramp at ~half
   saturation and ~85% lightness (min pairwise ΔE 21.8), so the two read as
   two different kinds of object even where they share a hue family.

   WHICH OF THESE IS SAFE UNDER A GLYPH. Contrast on the canvas backdrop
   (#0b0a0f), at full alpha:

     CATEGORY_COLOR   5.18 – 8.65   text-safe, all ten
     CATEGORY_RING    7.98 – 8.65   value-equalised; 3.50 – 3.71 once the
                                    renderer strokes them at alpha 0.6
     EDGE_COLOR       3.11 – 13.5   marks only; betrayal 5.4 and co-season
                                    3.1 are below AA for 11px type
     SEASON_COLOR     4.02 – 6.80   MARKS ONLY — deliberately dark so an arc
                                    never reads as the brass winner halo
     SEASON_INK       6.48 – 8.11   the same three hues, for letterforms
     INK_SUB          8.85          the default for small canvas captions
     INK_LOW          5.28          secondary canvas copy
     INK_FAINT        2.11          NEVER under a glyph: hairlines and
                                    dashed rings only

   And remember the canvas multiplies these: a caption painted at
   alpha(SEASON_COLOR[1], 0.72) under a globalAlpha of 0.85 is an effective
   0.61, which took "SEASON 1" to 2.01:1. If a hue has to carry text, take
   it from SEASON_INK / CATEGORY_COLOR at full alpha, or set the text in
   INK_SUB and put the hue in a swatch dot beside it.

   STATE ON THE CANVAS. The colour law applies here too: ACCENT is focus,
   selection, the ego ring — the marks that mean "this is the thing you are
   looking at". BLOOD is the brand mark and the betrayal edge, and nothing
   else, so an orbit "direct ties" ring is ACCENT (solid) with the one-step
   ring in INK_FAINT (dashed), never BLOOD. */

/* ESPORTS IS NO LONGER BLUE, and that is the whole of the fix for the collision
   the file used to document here as "known, not fixed". #6f87cf sat ΔE 2.9 from
   --s2 #6a83cf: the same colour, in two different channels, drawn as two
   concentric bands on 홍진호's plate — his archetype ring and his season-2 arc.
   He is the one esports player and the default landing selection, so the app
   broke its own strongest idea on the first plate anyone sees.

   Every blue this ramp could rotate to was measured and none of them work: a
   steel-teal at #5f9aa8 (the obvious candidate) lands ΔE 6.8 from --c-broadcaster
   #6da3ba, a pale periwinkle clears --s2 but only by 19.5–23 and then sits
   ΔE 12–18 from --s2-ink, and pushing --s2 itself deeper drops it under 3:1
   before it clears ΔE 20. The blue band cannot hold four marks. So esports
   leaves it: #8fae52 is 26.2 from its nearest archetype (--c-professional),
   >36 from every season value, and 7.84:1 on the backdrop — inside the ramp's
   own 5.18–8.65 band. The ramp's min pairwise ΔE is unchanged at 21.8.

   The one thing it lands near is EDGE_COLOR.teammate #a8c46a, at ΔE 8.5. That
   is a hue family shared ACROSS channels, which is what this file's opening
   note says is allowed — a ring and a line are different kinds of object — and
   `teammate` additionally has zero members in the dataset, so the rail and the
   About sheet both filter it out and the two are never drawn in one frame. */

/* POKER IS NO LONGER GOLD, for the same class of reason and one channel over.
   #c8a85b sat ΔE 10.3 from BRASS #e6c07a — measured in CIELAB, and the sole
   outlier in this ramp: the next-nearest archetype to brass is comedian at
   32.3. Brass is the one value this file reserves for a single meaning (the
   docblock above says "the only bright gold ring") and the archetype ring is
   drawn 3px inside the laurel on the same plate, so a reader scanning the
   default view for past champions counted five gold discs where there are two
   — 현성주 and 김유현 wearing an archetype hue that reads as a trophy.

   WHERE IT COULD GO, and this is why it is a clay rather than a deeper gold.
   The warm band is boxed in: brass above at L* 79, comedian #c87a5b below at
   L* 59 with C 40. Every saturated amber between them fails one of the ramp's
   own invariants — the obvious candidate #b08a55 clears brass by 20.9 but
   lands ΔE 19.9 from comedian, under the 21.8 minimum this ramp states and
   holds. A full sweep of CIELAB inside the ramp's chroma band (18–36) and its
   contrast band (5.18–8.65) returns no saturated warm value that clears both.
   So poker leaves the gold: #c19f8a is a warm clay — poker's other colour, the
   one the chips are actually made of — at ΔE 27.5 from brass, 24.5 from its
   nearest archetype (comedian), 24.1 from its nearest relationship hue
   (collab), and 8.07:1 on the backdrop. The ramp's min pairwise ΔE is
   unchanged at 21.8, still broadcaster/other. */
export const CATEGORY_COLOR: Record<Category, string> = {
  comedian: '#c87a5b',
  athlete: '#569c8b',
  esports: '#8fae52',
  creator: '#c46390',
  broadcaster: '#6da3ba',
  musician: '#a279d2',
  poker: '#c19f8a',
  professional: '#89996e',
  actor: '#d199b0',
  other: '#85818c',
};

/* The same ten hues, re-valued for the one job CATEGORY_COLOR cannot do:
   a REGION STROKE, painted at partial alpha over #0b0a0f.

   The archetype ramp is deliberately half-chroma and darkened so identity sits
   behind the relationships. That is right on a 2px medallion ring at full
   alpha, and it is fatal on a hairline at alpha 0.3, where all ten composite to
   1.46–1.75:1 — one indistinguishable grey, ten times, which is what the
   by-archetype mode has been shipping. Note that no hue can fix that on its
   own: at alpha 0.3 the brightest possible colour still composites to 1.9:1,
   so the renderer has to stroke the archetype rings at 0.55–0.65 as well
   (render.ts, drawClusters). These values are tuned for that band.

   Two properties, both measured:
     • VALUE-EQUALISED. Every one composites to 3.50–3.62:1 at alpha 0.6 —
       above the 3:1 floor this file sets for a meaningful graphic, and within
       4% of each other, so the lightest and the darkest ring no longer arrive
       as two different weights. The band was 3.50–3.71 and tightened on its
       own when poker came off gold: #c8a85b was BOTH the entry aliasing brass
       and the one ring a tenth brighter than the other nine.
     • HUE-PRESERVING. Lifted along L* only, with a* and b* held, so the
       separation survives: min pairwise ΔE 19.5 (creator/actor, the two pinks)
       against 21.8 for the base ramp. Lifting toward white instead — the
       obvious move — collapsed that pair to ΔE 4.9.

   Full-alpha contrast is 7.98–8.65, so these are also safe under the caption
   dot and the caption's own letterforms. Use CATEGORY_COLOR for anything drawn
   at full strength (the medallion ring, the rail swatch); use CATEGORY_RING
   only for the enclosure. */
export const CATEGORY_RING: Record<Category, string> = {
  comedian: '#e39171',
  athlete: '#6db3a1',
  /* Derived from the new #8fae52 the same way as every other entry: lifted
     along L* with a* and b* held (67.1 → 68.6), which lands 8.21:1 full and
     3.57:1 at alpha 0.6 — inside both bands — at ΔE 25.2 from its nearest
     neighbour here, --c-professional's ring. */
  esports: '#93b256',
  creator: '#eb87b4',
  broadcaster: '#77adc4',
  musician: '#bd92ed',
  /* No lift, and that is the derivation rather than an exception to it: the
     new clay already composites to 3.50:1 at alpha 0.6 and 8.07:1 full, i.e.
     the bottom of both bands, so lifting L* would push it out of them. `actor`
     is the same case for the same reason. */
  poker: '#c19f8a',
  professional: '#9aab7f',
  actor: '#d199b0',
  other: '#a7a3ae',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  comedian: 'Comedian',
  athlete: 'Athlete',
  esports: 'Esports',
  creator: 'Creator',
  broadcaster: 'Broadcaster',
  musician: 'Musician',
  poker: 'Poker',
  professional: 'Professional',
  actor: 'Actor',
  other: 'Other',
};

export const CATEGORY_LABEL_KO: Record<Category, string> = {
  comedian: '코미디언',
  athlete: '운동선수',
  esports: 'e스포츠',
  creator: '크리에이터',
  broadcaster: '방송인',
  musician: '뮤지션',
  poker: '포커 플레이어',
  professional: '전문직',
  actor: '배우',
  other: '기타',
};

/* Relationships are the story, so they keep the saturated ramp.
   Two pairs were indistinguishable at the 8px dot size the hover card uses:
   co-season vs collab (both mid greys) and teammate vs alliance (both greens).
   co-season is now a warm near-black neutral — a tie that is only "same
   season" should be the quietest line on the canvas — and teammate has moved
   off alliance's mint into olive. Min pairwise ΔE across the twelve: 25.4,
   still co-season against collab; `parallel`, the newest entry, clears 29.3.
   co-season was #4d4a52, which is 2.27:1 — under the 3:1 floor for a
   meaningful graphic, so its 8px legend dot was simply not there. Lifted to
   3.11:1: still by a distance the quietest line on the canvas (the next
   lowest is betrayal at 5.4) but now visible. */
export const EDGE_COLOR: Record<EdgeType, string> = {
  alliance: '#4fd1a5',
  betrayal: '#ff2f43',
  rivalry: '#ff8a5c',
  'prior-show': '#7c9cff',
  'co-season': '#615e69',
  /* The three "same record, never met" lines used to ride prior-show's blue,
     which put them in the legend beside pairs who actually met on another
     programme. Deliberately off the blue band — that band already carries
     prior-show, --s2 and --c-broadcaster — this is a deep petrol at 5.09:1,
     nearest neighbour anywhere in the four channels ΔE 29.3 (friendship) and
     ΔE 40+ from prior-show. It sits in the quiet half of the ramp on purpose:
     a non-meeting should be one of the faintest things on the canvas without
     dropping under the 3:1 floor. Colour alone does not carry it — see
     EDGE_DASH below.

     A NEW EdgeType IS NOT VISIBLE UNTIL IT IS IN ALL_EDGE_TYPES. That list, in
     src/state/useAtlas.ts, seeds the default `edgeTypes` filter set; GraphCanvas
     drops any link whose type is not in it and the rail and the About sheet both
     iterate it to build their legends. This paragraph used to describe a live
     failure — `parallel` was absent from that list, so the dataset held 44 edges
     while the status ledger read TIES 41 and the rail painted six relationship
     rows with no "평행 이력 / Parallel record" among them. It is fixed, and the
     prose that warned about it is no longer the mechanism: tools/validate-data
     section 0 now fails the build when a type used by an edge, given a colour
     here, or given a dash below is missing from that list. Prose did not hold
     it for three rounds; a failing check will. */
  parallel: '#2f8f8a',
  friendship: '#6fd8e8',
  family: '#f2679b',
  agency: '#c07dff',
  teammate: '#a8c46a',
  mentor: '#ffcf5c',
  collab: '#9aa0ab',
};

/* DASH RHYTHM, for the types where hue is not enough on its own.
   The painter's default is season-derived: `dashed = edge.season === 0`, drawn
   at [7/k, 10.5/k] — "history from outside the house", which is what the rail's
   legend footnote promises. `parallel` is outside the house too, so it inherits
   that dash and then reads as one more member of the same family, which is
   exactly the grouping the type exists to break.

   A long-dash/dot is the one rhythm nothing else in the app uses, and it says
   the right thing: two long runs of record with a gap where the meeting would
   be. Units are world units and must be divided by the view scale k at paint
   time, the same as the default.

   THIS TABLE SPENT A ROUND WITH NO IMPORTER. It was tuned, documented and
   validated for vocabulary while `grep -rn "EDGE_DASH" src/` returned hits in
   this file alone, so all three `parallel` edges were painted by drawLinks'
   default branch — `if (l.dashed) { const d = 7 / k; … }`, which fires because
   `season === 0` — and wore the same 7/10.5 rhythm as every other
   outside-the-house line. The type was separated in the legend, in the filter
   and in the ledger, and not in the picture, which left hue alone at 5.09:1 on
   a 1-strength line to carry a non-meeting.

   It is read now, in render.ts drawLinks, ahead of the season-derived fallback
   and divided by k the same way. That is a second instance of the failure the
   note above EDGE_COLOR.parallel describes, so it is checked the same way
   rather than described again: tools/validate-data section 0a walks the files
   under src/components, src/graph and src/state and fails the build if nothing
   outside this file names EDGE_DASH. A tuned value with no consumer is not a
   value, and prose has now failed to hold that twice. */
export const EDGE_DASH: Partial<Record<EdgeType, number[]>> = {
  parallel: [14, 5, 1.6, 5],
};

/* Lineage sits in its own register: deeper and richer than either ramp
   above, so a season arc never competes with a relationship line.

   SEASON 1 IS OFF THE CRIMSON HUE ENTIRELY. The previous value was an oxblood
   #c2354a, chosen so that "season 1" would not read as "betrayal" — and it
   did not work, because oxblood and --blood are the same hue family separated
   only by chroma: measured, #c2354a sits ΔE 16.4 from --blood-deep and 18.7
   from --blood-hot, which is inside the distance the ramps above hold between
   two colours that mean *different* things. On a single medallion the reader
   got a 2.6px season-1 arc and a betrayal edge landing on it in what is
   perceptibly one red, and a "Season 1" chip in the command palette read as an
   error badge. A season hue only has to be distinct from the other two seasons
   and from the relationship ramp; it does not have to be thematic. This is a
   deep pine — 4.02:1 on the base, nearest neighbour anywhere in the four
   channels ΔE 26.7 (--c-professional), and ΔE 55+ from every red in the file.
   Season 3 stays bronze rather than brass, so the arc and the winner halo
   drawn 5.5px outside it are two colours (ΔE 19.8) instead of the same one.

   THE SEASON BLUES DID NOT MOVE. --s2 #6a83cf used to sit ΔE 2.9 from the
   archetype ramp's esports entry, and that pair was fixed by rotating the
   archetype — see the note above CATEGORY_COLOR for why the blue band could
   not absorb a fourth mark and why the smaller, more fixed vocabulary (three
   seasons, learned once and used everywhere) was the wrong one to disturb.
   --s2 is now ΔE 36+ from every archetype value. */
export const SEASON_COLOR: Record<SeasonNumber, string> = {
  1: '#367f45',
  2: '#6a83cf',
  3: '#c08f3e',
};

/** The same three hues lifted to carry letterforms: 6.48 / 6.98 / 8.11 on
    the canvas backdrop, against 4.02 / 5.41 / 6.80 for the mark colours
    above. Use these — at full alpha — for a season caption, a season chip
    label, a "SEASON 2" heading. SEASON_COLOR stays on the arcs and swatches.
    SEASON_INK[3] is held 22 ΔE off BRASS so a season-3 label still cannot be
    mistaken for a trophy. Mirrored as --s1-ink / --s2-ink / --s3-ink. */
export const SEASON_INK: Record<SeasonNumber, string> = {
  1: '#4fa563',
  2: '#8098db',
  3: '#d99a3c',
};

export const BLOOD = '#ff2f43';
export const BLOOD_HOT = '#ff5566';
/** Winner halo. Exclusive to past champions now that season 3 is bronze. */
export const BRASS = '#e6c07a';
/** Warm bone, 12.9:1. Focus / selection / active state / the orbit ego ring
    — never crimson. This is the canvas half of the --accent-* channel. */
export const ACCENT = '#dcd0b6';
/** The bone of the wordmark and the portrait plates' highlight, 16.0:1.
    Mirrors --bone; SVG components should read it from here rather than
    hardcoding #efe6da, so the plates and the canvas stay in step. */
export const BONE = '#efe6da';
export const INK_HI = '#f4efe9';
/** Between INK_HI and INK_MID: 8.85:1 on the base. For 10–11px canvas text,
    which needs ~5:1 after the focus-alpha ramp knocks it down. */
export const INK_SUB = '#b5aca7';
export const INK_MID = '#9c938f';
/** 5.28:1. The floor for anything with a glyph in it. The retired value was
    #6d6570 (3.52:1) — if you find that hex anywhere, it is a bug. */
export const INK_LOW = '#8a8190';
/** 2.11:1. Hairlines, dashed rings, the one-step-away orbit ring. Never
    under a glyph — mirrors --ink-faint, which carries the same warning. */
export const INK_FAINT = '#4a4453';

/** #rrggbb + alpha → rgba() string. Hot path: memoised. */
const rgbaCache = new Map<string, string>();
export function alpha(hex: string, a: number): string {
  const key = hex + (a = Math.max(0, Math.min(1, a))).toFixed(3);
  const hit = rgbaCache.get(key);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  const out = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  if (rgbaCache.size < 4096) rgbaCache.set(key, out);
  return out;
}

/** Blend two hex colours; t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const r = Math.round(((na >> 16) & 255) * (1 - t) + ((nb >> 16) & 255) * t);
  const g = Math.round(((na >> 8) & 255) * (1 - t) + ((nb >> 8) & 255) * t);
  const bl = Math.round((na & 255) * (1 - t) + (nb & 255) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}
