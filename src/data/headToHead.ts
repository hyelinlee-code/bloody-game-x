import { edges, isMeeting } from './edges';
import { people } from './people';
import { records } from './records';
import { isVisible, pick } from './redact';
import { played } from './types';
import type { Edge, ExternalShow, SeasonNumber, SeasonRun } from './types';
import type { WatchedSet } from './works';
import { currentWatched, WATCHED_ALL } from '../state/useWatched';

/**
 * The franchise ledger: who has already faced whom, and how each of them has
 * done across every season they have played.
 *
 * WHY THIS IS DERIVED AND NOT WRITTEN. Every ingredient was already in the
 * dataset — records.ts knows that 이진형 finished 1st of 13 and 홍진호 3rd of 13
 * in the same season, people.ts knows that 김경훈 was runner-up and 김유현 9th
 * of the same Genius field, edges.ts knows about the five duels — and none of it
 * was ever put next to itself. The atlas could tell you that 홍진호 finished 3rd
 * twice and has eleven ties, and not that a man three metres away from him in
 * this lineup has knocked him out of a death match. So this file computes the
 * comparison rather than asking an editor to type it, because a finishing order
 * written down twice is a finishing order that will eventually be written down
 * differently — which is the failure records.ts's own header was created to stop.
 *
 * TWO KINDS OF RESULT, and they are not interchangeable:
 *
 *   'duel'  — they played each other, one against one. Authored on the edge as
 *             `Edge.outcomes`, because no table can reconstruct it.
 *   'field' — they were in the same field and one finished higher. Derived,
 *             from `records` inside the franchise and from `ExternalShow.rank`
 *             outside it.
 *
 * `kind` IS ON EVERY ROW SO THE COPY CAN BRANCH ON IT, and for two rounds no
 * copy did: every surface printed 'faced.beat' — "X beat Y" — over both, so 35
 * of these 40 rows asserted a match that was never played. The vocabulary is
 * split in ui.ts now ('faced.beat' / 'faced.finishedAbove'); anything reading
 * this array owes the reader that branch.
 *
 * WHAT THIS DELIBERATELY REFUSES TO ANSWER. A field result needs a numbered
 * finish at BOTH ends. 이상민 won The Genius season 2 and 홍진호 went out in the
 * middle of it, which everyone who watched it knows — but 홍진호's row for that
 * season reads 참가 and no source numbers it, so the pair is simply absent from
 * the ledger for that season rather than being adjudicated on a guess. That is
 * why `Ledger` carries `unadjudicated`: a pair with three shared appearances and
 * two results is a different claim from a pair with two shared appearances, and
 * the surface printing "1–0" has to be able to say which one it is holding.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EVERY FIGURE BELOW IS A FUNCTION OF WHAT THE READER HAS WATCHED (phase 2)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A reader wrote in: "I have only watched the genius… there are lots of
 * spoilers?" Phase 1 tagged every outcome-bearing field with the works it gives
 * away. This file is the first derived surface to spend those tags, and it is
 * the one where spending them is hardest, because everything here is a COUNT.
 *
 * A HIDDEN RESULT IS NOT COUNTED, NOT MERELY NOT SHOWN. That distinction is the
 * whole reason the ledger is in this phase. Filtering a rendered list is easy;
 * a filtered numerator over a full denominator is a lie with a decimal point on
 * it. So when a run's rank is out of a reader's scope, the run leaves `faced`
 * as well as `outlasted`, and `share` is recomputed from what is left. A reader
 * who has seen only season 2 gets 홍진호's record OVER SEASON 2, not his season-2
 * numerator against an all-seasons field. PLAN-spoilers.md §5 is the rule:
 * every derived figure is recomputed from the visible set, never filtered from
 * a constant.
 *
 * WHAT MOVES WITH THE SET, AND WHAT CANNOT:
 *
 *   moves   `meetings`, `facedPairs` / `haveFaced`, `meetingsFor`, `ledgerFor`
 *           (rows, wins, losses, duels), `career` (titles, bestRank,
 *           bestFieldSize, bestTopPct, faced, outlasted, share), `careerTable`
 *           (membership AND order), `noComparableResult`.
 *
 *   fixed   `CareerRecord.seasons` and `.presided`. They are read off `season`
 *           and `role`, and neither is an outcome field — works.ts lists
 *           `role` as deliberately absent from `OUTCOME_FIELDS.SeasonRun`, and
 *           the plan keeps participation in every profile. That a person was in
 *           season 2 is not a spoiler; how they finished it is.
 *
 *   fixed   `neverFaced`, and see the note on it below — it is read off edge
 *           TYPES, all three `parallel` edges carry `scope: []`, and a hidden
 *           type degrades to a neutral tie rather than to no tie.
 *
 *   fixed   `Ledger.unadjudicated`. This one had to be made fixed on purpose;
 *           the note on the field says why.
 *
 * PHASE 2 CHANGES NOTHING ON SCREEN. The default set is `WATCHED_ALL`, every
 * scope is satisfied, every predicate below answers true and every number is
 * the number this file printed before any of it existed. The six value-shaped
 * exports at the foot of the file are pinned to `WATCHED_ALL` outright, because
 * their call sites are `.tsx` files that no owner may touch this phase; the
 * note down there names what phase 3 has to do about it.
 */

/** One adjudicated result between two members of this lineup. */
export interface Meeting {
  /** The two ids, sorted, so a pair has exactly one key. */
  pair: [string, string];
  winner: string;
  loser: string;
  kind: 'duel' | 'field';
  /** Prior franchise season; 0 = outside the franchise. */
  season: SeasonNumber | 0;
  /** Where it happened, Korean. */
  where: string;
  whereEn: string;
  /** Duels only, and only when the source prints one. */
  score?: string;
  /** Field results only. */
  winnerRank?: number;
  loserRank?: number;
  fieldSize?: number;
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const sortPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

const byId = new Map(people.map((p) => [p.id, p]));

const SEASON_TITLE: Record<SeasonNumber, [string, string]> = {
  1: ['피의 게임 시즌1', 'Bloody Game season 1'],
  2: ['피의 게임2', 'Bloody Game 2'],
  3: ['피의 게임3', 'Bloody Game 3'],
};

/* ── which tag governs which ingredient ──────────────────────────────────────
   Resolved in one place rather than at each of the six read sites, because the
   `scopes?.field ?? scope` fallback is the kind of expression that gets copied
   with one half missing. types.ts is the authority for the pairing; these five
   are the only fields this file reads that are on a manifest in works.ts.

   `rank` AND `fieldSize` ARE ASKED SEPARATELY even though types.ts requires
   them to carry the same scope ("TAKES THE SAME SCOPE AS `rank`, ALWAYS", and
   no row in the corpus currently differs). Asking once and reusing the answer
   would make this file the place where that requirement is enforced, which is
   not this file's job and would hide a violation instead of failing closed on
   it: a field size that survives its rank is the exact leak PLAN-spoilers.md §3
   is about, since the plate's arc is `rank / fieldSize` and is invertible. */
const rankScope = (r: SeasonRun) => r.scopes?.rank ?? r.scope;
const fieldSizeScope = (r: SeasonRun) => r.scopes?.fieldSize ?? r.scope;
const showRankScope = (s: ExternalShow) => s.scopes?.rank ?? s.scope;
const showFieldSizeScope = (s: ExternalShow) => s.scopes?.fieldSize ?? s.scope;
const edgeTypeScope = (e: Edge) => e.scopes?.type ?? e.scope;

/**
 * Does this edge assert that the two people were in a room together, as far as
 * THIS reader can be told?
 *
 * `isMeeting` answers it from the type, and the type is itself an outcome field
 * — works.ts lists it, because `betrayal` is a verdict about a named person.
 * So a reader who may not see the type may not be handed the type's answer
 * either, and the question becomes what a sealed type degrades TO.
 *
 * IT DEGRADES TO A MEETING, which is the safe direction and also the one the
 * plan already chose: PLAN-spoilers.md §2 says a redacted verdict "degrades to
 * a neutral tie", and a neutral tie is a line between two people who met. The
 * other direction manufactures a false claim — somebody would appear in
 * `neverFaced`, i.e. the app would state "has never been in a field with
 * anyone in this lineup" about a person who has — and rule 1 of the plan's §3
 * is that a hidden thing is never rendered as a false value.
 *
 * IN PRACTICE THIS BRANCH IS NEVER TAKEN, and that is worth knowing rather than
 * assuming: `parallel` is the only non-meeting type, all three `parallel` edges
 * carry `scope: []` with no `scopes.type` override, and `isVisible([], …)` is
 * true for every reader. So `neverFaced` is the same three names at every
 * setting. Measured, not asserted — and if a fourth parallel edge is ever
 * written with a real scope, this is the line that keeps it honest.
 */
function meetsHere(e: Edge, watched: WatchedSet): boolean {
  return isVisible(edgeTypeScope(e), watched) ? isMeeting(e.type) : true;
}

/**
 * Every adjudicated result this reader may be told about, duels first.
 *
 * Three sources, each gated by the tag that governs the number the result is
 * built out of — a duel by its own `scope` (a `Duel` is a record with a verdict
 * in every field, so it disappears whole rather than emptying out), a franchise
 * field result by each run's `rank` scope, an outside one by each row's. A
 * person whose rank is sealed is not in that field's list at all, so they are
 * not half of any pair drawn from it: the result is absent, not anonymised.
 */
function collectMeetings(watched: WatchedSet): Meeting[] {
  const out: Meeting[] = [];

  /* ── duels, authored on the edge ───────────────────────────────────────── */

  for (const e of edges) {
    for (const d of e.outcomes ?? []) {
      /* The DUEL's own scope, not the edge's. works.ts leaves `outcomes` off
         `OUTCOME_FIELDS.Edge` for exactly this: a pair with two duels in two
         different works can show one and seal the other. */
      if (!isVisible(d.scope, watched)) continue;
      const loser = d.winner === e.source ? e.target : e.source;
      out.push({
        pair: sortPair(e.source, e.target),
        winner: d.winner,
        loser,
        kind: 'duel',
        season: d.season,
        where: d.where,
        whereEn: d.whereEn,
        score: d.score,
      });
    }
  }

  /* ── field results inside the franchise, from records.ts ─────────────────── */

  {
    /* Contestant runs only. A host or a panellist is in the credits of a season,
       not in its field — records.ts already refuses them a rank for exactly this
       reason, and 박지민 is in three seasons of which only two are hers to be
       compared in. */
    const ranked = new Map<SeasonNumber, { id: string; rank: number; fieldSize?: number }[]>();
    for (const [id, runs] of Object.entries(records)) {
      for (const r of runs) {
        if (!played(r) || r.rank === undefined) continue;
        if (!isVisible(rankScope(r), watched)) continue;
        const list = ranked.get(r.season) ?? [];
        list.push({ id, rank: r.rank, fieldSize: pick(r.fieldSize, fieldSizeScope(r), watched) });
        ranked.set(r.season, list);
      }
    }
    for (const [season, list] of ranked) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const [hi, lo] = list[i].rank < list[j].rank ? [list[i], list[j]] : [list[j], list[i]];
          out.push({
            pair: sortPair(hi.id, lo.id),
            winner: hi.id,
            loser: lo.id,
            kind: 'field',
            season,
            where: SEASON_TITLE[season][0],
            whereEn: SEASON_TITLE[season][1],
            winnerRank: hi.rank,
            loserRank: lo.rank,
            fieldSize: hi.fieldSize,
          });
        }
      }
    }
  }

  /* ── field results outside it, from ExternalShow.rank ────────────────────── */

  /* Programmes are matched on the English `show` string, which is the field the
     two i18n halves of a row share. It is a join key, so it has to be spelled the
     same on both people's pages — the validator asserts that any `show` carrying
     a rank is spelled identically wherever else it appears.

     `show` IS NEVER SCOPED and must not become so — works.ts keeps it off the
     manifest and says why: sealing the join key would not hide a result, it
     would silently stop two people from being compared at all. What is scoped
     is the `rank` the comparison is made of, which is asked one line down. */
  {
    const shows = new Map<string, { id: string; rank: number; fieldSize?: number; ko: string; en: string }[]>();
    for (const p of people) {
      for (const s of p.otherShows ?? []) {
        if (s.rank === undefined) continue;
        if (!isVisible(showRankScope(s), watched)) continue;
        const list = shows.get(s.show) ?? [];
        list.push({
          id: p.id,
          rank: s.rank,
          fieldSize: pick(s.fieldSize, showFieldSizeScope(s), watched),
          ko: s.showKo ?? s.show,
          en: s.show,
        });
        shows.set(s.show, list);
      }
    }
    for (const list of shows.values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const [hi, lo] = list[i].rank < list[j].rank ? [list[i], list[j]] : [list[j], list[i]];
          out.push({
            pair: sortPair(hi.id, lo.id),
            winner: hi.id,
            loser: lo.id,
            kind: 'field',
            season: 0,
            where: hi.ko,
            whereEn: hi.en,
            winnerRank: hi.rank,
            loserRank: lo.rank,
            fieldSize: hi.fieldSize ?? lo.fieldSize,
          });
        }
      }
    }
  }

  /* Duels first, then by season, so a pair's card leads with the hard result. */
  out.sort((a, b) => (a.kind === b.kind ? a.season - b.season : a.kind === 'duel' ? -1 : 1));
  return out;
}

/** One person's record against one opponent. */
export interface Ledger {
  opponentId: string;
  wins: number;
  losses: number;
  duels: number;
  meetings: Meeting[];
  /**
   * Appearances the two share that carry no comparable finish — a season one of
   * them presided over rather than played, or a field where one finish is not
   * numbered anywhere. A "1–0" printed without this is an overclaim.
   *
   * IT IS COUNTED AGAINST THE FULL LEDGER, NOT THE VISIBLE ONE, and that is a
   * redaction decision rather than an oversight. PLAN-spoilers.md §5 names this
   * exact field as the worst subtraction channel in the app: it is
   * `sharedAppearances − meetings`, shared appearances are participation and
   * therefore never hidden, so if the subtrahend shrank as results were sealed
   * this number would INFLATE by exactly one per withheld result — a precise,
   * per-pair counter of what is being kept from the reader, printed on the card
   * that is keeping it.
   *
   * Subtracting every result the pair has, visible or not, makes the figure
   * invariant under the watched-set. It also makes it truer: a shared season
   * whose result is sealed is a season that HAS a comparable finish, so calling
   * it unadjudicated would be a false value about the sources — the thing §3
   * rule 1 forbids — as well as a leak.
   *
   * The cost, stated rather than buried: a pair whose every result is hidden
   * has no row at all (no visible meetings, nothing to attach the count to), so
   * their shared appearances go unstated instead of being restated as
   * unadjudicated. That is a hole in the ledger's coverage and it is phase 3's
   * to fill, with a sealed row that names its own scope. It is not a leak.
   */
  unadjudicated: number;
}

/* Shared appearances, adjudicable or not: franchise seasons where both have a
   run of ANY role, plus outside programmes both are credited on.

   NOT SCOPED, and deliberately: every ingredient is participation. A run's
   `season` and `role` and a show's `show`/`year` are structure under works.ts's
   manifest, the plan keeps all of them, and there is nothing here to hide.

   THE OUTSIDE MATCH IS ON TITLE **AND** YEAR, and that is not fussiness. On
   title alone, 최연청 (미스코리아 2013) and 김남희 (미스코리아 2014) come out as
   having shared a field — which is the precise claim the `parallel` edge
   between them was created to deny, arriving through a side door in a derived
   count. Two people on the same long-running programme in different years have
   not met, and an overcount here would put a number on that non-meeting. */
function sharedAppearances(a: string, b: string): number {
  let n = 0;
  const seasonsOf = (id: string) => new Set((records[id] ?? []).map((r) => r.season));
  const sa = seasonsOf(a);
  for (const s of seasonsOf(b)) if (sa.has(s)) n++;
  const showsOf = (id: string) =>
    new Set((byId.get(id)?.otherShows ?? []).map((s) => `${s.show}@${s.year ?? ''}`));
  const xa = showsOf(a);
  for (const s of showsOf(b)) if (xa.has(s)) n++;
  return n;
}

/**
 * One person's cumulative franchise record.
 *
 * `share` is the number that finally makes two franchise careers comparable.
 * Rank alone cannot: 3위 of 13 and 4위 of 18 are not orderable, and neither are
 * two seasons against one. Counting the players each person actually outlasted
 * against the size of the fields they stood in is orderable, it is additive
 * across seasons, and it is exactly the arithmetic the Track record tab's Top %
 * column already does for a single run — carried up to a career. 홍진호 outlasted
 * 25 of the 29 other players in his two seasons; 허성범 outlasted 14 of 17 in
 * one. Those are now on the same axis.
 *
 * `faced` IS A FIELD SIZE, NOT AN OPPONENT COUNT, and the name has fooled the
 * copy once already: ui.ts printed 'Outlasted 25 of the 29 players faced',
 * which reads as 29 people he played and is 29 people who were in the room.
 * Anything rendering it has to say "in those fields", never "faced".
 *
 * THE NUMBERS ARE THE READER'S, NOT THE DATASET'S. Every field below except
 * `seasons` and `presided` is summed over the runs whose rank this reader may
 * see, so both sides of every ratio move together: seal season 3 and 홍진호's
 * `faced` loses that field's 17 as well as its 14 outlasted, and `share` stays
 * a season-2 answer to a season-2 question. `seasons` and `presided` do not
 * move, because a season somebody was in is not a season they finished — see
 * the header.
 */
export interface CareerRecord {
  id: string;
  /** Seasons played, as a contestant. Participation: never redacted. */
  seasons: SeasonNumber[];
  /** Seasons presided over — hosted, dealt, or sat on the panel. Never redacted. */
  presided: SeasonNumber[];
  titles: number;
  bestRank?: number;
  bestFieldSize?: number;
  /** Best finish as a percentile of its field; lower is better. */
  bestTopPct?: number;
  /** Others in the fields: Σ (fieldSize − 1) over the runs this reader may see.
   *  Not opponents played — see the note above. */
  faced: number;
  /** Players outlasted: Σ (fieldSize − rank), over the same runs. */
  outlasted: number;
  /** outlasted / faced, 0–1. Undefined when nothing rankable is visible. */
  share?: number;
}

function buildCareer(watched: WatchedSet): Record<string, CareerRecord> {
  const careerOut: Record<string, CareerRecord> = {};
  for (const p of people) {
    const runs = records[p.id] ?? [];
    const rec: CareerRecord = {
      id: p.id,
      seasons: runs.filter((r) => played(r)).map((r) => r.season),
      presided: runs.filter((r) => !played(r)).map((r) => r.season),
      titles: runs.filter((r) => r.rank === 1 && isVisible(rankScope(r), watched)).length,
      faced: 0,
      outlasted: 0,
    };
    for (const r of runs) {
      if (r.rank === undefined || !isVisible(rankScope(r), watched)) continue;
      /* Asked through the gate rather than inherited from the rank check above.
         A rank with no visible denominator is not half a result, it is no
         result: `faced` would take a term it cannot size and `share` would come
         out of a sum with a hole in it. */
      const fieldSize = pick(r.fieldSize, fieldSizeScope(r), watched);
      if (fieldSize === undefined) continue;
      rec.faced += fieldSize - 1;
      rec.outlasted += fieldSize - r.rank;
      const pct = (r.rank / fieldSize) * 100;
      if (rec.bestTopPct === undefined || pct < rec.bestTopPct) {
        rec.bestTopPct = pct;
        rec.bestRank = r.rank;
        rec.bestFieldSize = fieldSize;
      }
    }
    if (rec.faced > 0) rec.share = rec.outlasted / rec.faced;
    careerOut[p.id] = rec;
  }
  return careerOut;
}

/* ── memoisation ─────────────────────────────────────────────────────────────
 *
 * Everything above is recomputed per watched-set, and every function below is
 * called inside a render — `career[id]` once per dossier, `ledgerFor` once per
 * person, `haveFaced` once per edge card. So the set gets ONE derived bundle,
 * built on first ask and kept.
 *
 * A WeakMap KEYED ON THE SET, not a one-entry cache, for three reasons in
 * descending weight:
 *
 *   · Two sets are alive at once in the phases this is being built for. Phase
 *     3's harness renders a redacted panel beside an unredacted one to prove
 *     the difference, and phase 4's picker wants to show what a candidate set
 *     would do without committing to it. A one-entry cache turns each of those
 *     into a rebuild per call and reads as a memoisation bug rather than as the
 *     thrash it is.
 *   · The entry dies with the set. A set the reader has moved off is
 *     unreachable, and its bundle — twenty career records, forty meetings and
 *     every ledger row — goes with it, without this file keeping a list of what
 *     to evict.
 *   · A one-entry cache would need an eviction policy, and there is no honest
 *     one: "the last set asked for" is a guess about a call order this file
 *     cannot see.
 *
 * IT IS KEYED ON IDENTITY, NOT CONTENTS. Two sets with the same members are two
 * entries. That is why useWatched.ts's `setWatched` preserves the identity it
 * is handed and says so in its own docblock; if that ever changes, this
 * degrades to "recompute every frame" — slower, never wrong.
 */
interface Derived {
  meetings: readonly Meeting[];
  facedPairs: ReadonlySet<string>;
  byPerson: ReadonlyMap<string, Meeting[]>;
  ledgers: ReadonlyMap<string, Ledger[]>;
  career: Readonly<Record<string, CareerRecord>>;
  careerTable: readonly CareerRecord[];
  neverFaced: readonly string[];
  noComparableResult: readonly string[];
}

/* The unredacted ledger, computed once, for one purpose: the per-pair result
   totals `unadjudicated` is subtracted from. See the note on that field — the
   count has to be the full one or the figure becomes a counter of withheld
   results. It doubles as the bundle for `WATCHED_ALL`, which is the set every
   caller uses this phase, so the full ledger is built exactly once. */
const FULL_LEDGER: readonly Meeting[] = collectMeetings(WATCHED_ALL);

const RESULTS_IN_FULL: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  for (const meeting of FULL_LEDGER) {
    const k = key(...meeting.pair);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
})();

function build(watched: WatchedSet): Derived {
  const ms = watched === WATCHED_ALL ? FULL_LEDGER : collectMeetings(watched);

  const byPerson = new Map<string, Meeting[]>();
  for (const m of ms) {
    for (const id of [m.winner, m.loser]) {
      const list = byPerson.get(id);
      if (list) list.push(m);
      else byPerson.set(id, [m]);
    }
  }

  const ledgers = new Map<string, Ledger[]>();
  for (const [id, mine] of byPerson) {
    const byOpponent = new Map<string, Meeting[]>();
    for (const m of mine) {
      const other = m.winner === id ? m.loser : m.winner;
      byOpponent.set(other, [...(byOpponent.get(other) ?? []), m]);
    }
    const rows: Ledger[] = [];
    for (const [opponentId, list] of byOpponent) {
      const wins = list.filter((m) => m.winner === id).length;
      rows.push({
        opponentId,
        wins,
        losses: list.length - wins,
        duels: list.filter((m) => m.kind === 'duel').length,
        meetings: list,
        unadjudicated: Math.max(
          0,
          sharedAppearances(id, opponentId) - (RESULTS_IN_FULL.get(key(id, opponentId)) ?? 0),
        ),
      });
    }
    /* Most-contested first: total results, then duels, then decisiveness. */
    rows.sort(
      (a, b) =>
        b.meetings.length - a.meetings.length ||
        b.duels - a.duels ||
        Math.abs(b.wins - b.losses) - Math.abs(a.wins - a.losses),
    );
    ledgers.set(id, rows);
  }

  const career = buildCareer(watched);

  const neverFaced = people
    .filter((p) => {
      const mine = edges.filter((e) => e.source === p.id || e.target === p.id);
      return !mine.some((e) => meetsHere(e, watched));
    })
    .map((p) => p.id);

  return {
    meetings: ms,
    facedPairs: new Set(ms.map((m) => key(...m.pair))),
    byPerson,
    ledgers,
    career,
    /* Best career first. Membership is everyone with something rankable LEFT,
       so it shortens as scopes seal — which is the recomputation §5 demands and
       is also, on its own, the subtraction §5 warns about: a name that vanishes
       from a table the reader has seen before is a name they have learned
       something about. Recomputing is this file's half of the answer; saying
       out loud that the table is partial is phase 3's, in the copy above it. */
    careerTable: Object.values(career)
      .filter((c) => c.share !== undefined)
      .sort((a, b) => (b.share ?? 0) - (a.share ?? 0) || b.faced - a.faced),
    neverFaced,
    noComparableResult: people
      .filter((p) => !neverFaced.includes(p.id) && !byPerson.has(p.id))
      .map((p) => p.id),
  };
}

const cache = new WeakMap<WatchedSet, Derived>();

function derive(watched: WatchedSet): Derived {
  const hit = cache.get(watched);
  if (hit) return hit;
  const made = build(watched);
  cache.set(watched, made);
  return made;
}

/* ── the accessors ───────────────────────────────────────────────────────────
 *
 * Each takes the reader's set LAST, defaulting to `currentWatched()`. That
 * default is the one sanctioned use of the module mirror — a default-parameter
 * slot in a file with no JSX in it — and useWatched.ts's own docblock names
 * this file as one of exactly three allowed to hold one. A COMPONENT MUST NOT
 * call `currentWatched()` itself: it carries no subscription, so it renders
 * once with the right answer and then keeps painting it after the reader
 * narrows their set, which is a leak rather than a lag.
 *
 * The corollary for anything memoising a call to these: THE SET GOES IN THE
 * DEPENDENCY LIST. `useMemo(() => ledgerFor(p.id), [p.id])` in Dossier.tsx is
 * correct today only because nothing changes the set this phase; the same line
 * in phase 4 is a stale ledger. It needs `[p.id, watched]` and the set from the
 * hook, in the commit that gives it one.
 *
 * THE ARRAYS AND MAPS COME OUT OF THE CACHE, so they are shared and must be
 * treated as read-only. `meetingsFor` and `ledgerFor` used to hand back a fresh
 * `filter()` result per call and now hand back the memoised one — which is the
 * point, and is also why an in-place `.sort()` or `.push()` on a returned array
 * would corrupt every later caller instead of one. Copy first (`[...rows]`) if
 * you need to reorder. Measured at the time of writing: no call site mutates
 * one — EdgeCard filters and slices, Dossier maps.
 */

/** Every adjudicated result this reader may be told about, duels first. */
export function meetingsSeenBy(watched: WatchedSet = currentWatched()): readonly Meeting[] {
  return derive(watched).meetings;
}

/** Every documented result involving this person, duels first. */
export function meetingsFor(id: string, watched: WatchedSet = currentWatched()): Meeting[] {
  return derive(watched).byPerson.get(id) ?? [];
}

/** 'a|b' for every pair with at least one result this reader may be told about. */
export function facedPairsSeenBy(watched: WatchedSet = currentWatched()): ReadonlySet<string> {
  return derive(watched).facedPairs;
}

/**
 * Is there a result between these two that this reader may be told about?
 *
 * NOT "have these two ever met" — that is `neverFaced`, and the two answer
 * different questions on purpose. This one shrinks as scopes seal, because a
 * surface gated on it (EdgeCard's pair results) must not print a heading over
 * an empty list.
 */
export function haveFaced(a: string, b: string, watched: WatchedSet = currentWatched()): boolean {
  return derive(watched).facedPairs.has(key(a, b));
}

/** This person's record against everyone they have a visible result with. */
export function ledgerFor(id: string, watched: WatchedSet = currentWatched()): Ledger[] {
  return derive(watched).ledgers.get(id) ?? [];
}

/** Every person's cumulative franchise record, over what this reader may see. */
export function careerSeenBy(
  watched: WatchedSet = currentWatched(),
): Readonly<Record<string, CareerRecord>> {
  return derive(watched).career;
}

/** The returners with a rankable career LEFT, best first. Newcomers are not in
 *  this table, and neither is anyone whose every ranked run is out of scope. */
export function careerTableSeenBy(watched: WatchedSet = currentWatched()): readonly CareerRecord[] {
  return derive(watched).careerTable;
}

/**
 * People who have never been in a field with anyone else in this lineup —
 * no shared season, no shared cast list, nothing to adjudicate. This is a fact
 * about them, not a gap in the data, and it is the same three the `parallel`
 * edges exist for.
 *
 * IT IS NOT THE SAME AS "no result in the ledger", which is why both exist.
 * 김남희 and 홍진호 were two of ten players in the same house on 더 타임 호텔;
 * neither finish is numbered anywhere, so the ledger has nothing to print about
 * them — but saying they have never faced each other would be false. A surface
 * that renders an empty ledger has to be able to tell those two states apart.
 *
 * It is read off the edge types rather than off a title match, because whether
 * two people were ever in a room together is an editorial judgement that has
 * already been made once, per pair, in edges.ts: `parallel` means "demonstrably
 * never shared a room" and every other type means they did. Re-deriving it from
 * cast lists would be a second, weaker answer to a question that is already
 * answered, and the two would drift.
 *
 * The membership test is `isMeeting`, imported from data/edges.ts. This file
 * used to hold its own `new Set(['parallel'])` four lines from here, which was
 * the same judgement written down twice — exactly the failure the paragraph
 * above refuses for cast lists, committed against the edge list. One of the two
 * copies would eventually have learned about a second non-meeting type and the
 * other would not, and nothing on screen would have said which.
 *
 * IT TAKES A WATCHED-SET AND DOES NOT MOVE WITH IT, today. See `meetsHere`: the
 * type is an outcome field, a sealed one degrades to a neutral tie rather than
 * to no tie, and all three `parallel` edges are `scope: []` anyway. The
 * parameter is here because the answer is a function of the reader in
 * principle, and the day a scoped non-meeting is authored the machinery is
 * already in place rather than being remembered.
 */
export function neverFacedSeenBy(watched: WatchedSet = currentWatched()): readonly string[] {
  return derive(watched).neverFaced;
}

/**
 * Has met someone, but no finish on either side of it is numbered — as far as
 * this reader may be told.
 *
 * This list GROWS as scopes seal, and that is the honest recomputation rather
 * than a defect: for a reader who has not seen season 2, 이진형 and 서출구 have
 * shared a house and have nothing comparable on record, which is exactly what
 * the string this list selects ('faced.noResult') says. The alternative —
 * keeping them off it because a hidden result exists — would print the wrong
 * one of the two empty-ledger explanations, which Dossier.tsx's own comment
 * calls worse than printing none.
 */
export function noComparableResultSeenBy(
  watched: WatchedSet = currentWatched(),
): readonly string[] {
  return derive(watched).noComparableResult;
}

/* ── the six value-shaped exports, pinned to the full atlas ──────────────────
 *
 * READ THIS BEFORE USING ANY OF THEM. These are `careerSeenBy(WATCHED_ALL)` and
 * friends, frozen at import: the whole dataset, no redaction, for every reader.
 *
 * WHY THEY STILL EXIST. `career[p.id]`, `careerTable.map(…)`,
 * `neverFaced.includes(…)` and `noComparableResult.includes(…)` are read from
 * Dossier.tsx and AboutSheet.tsx; `meetings` and `career` are read from
 * tools/validate-data.mjs. Turning those names into functions is a call-site
 * change in files that PHASE2-CONTRACT.md §3 assigns to nobody this phase, so
 * the names stay bound to a value and the function each of them should become
 * is named beside it above. The three that were ALREADY functions —
 * `ledgerFor`, `meetingsFor`, `haveFaced` — took the parameter instead and are
 * live. (`facedPairs` has no importer at all today; it is kept only so the
 * value-shaped and function-shaped views of the ledger stay symmetrical, and it
 * goes in the same deletion.)
 *
 * WHY `WATCHED_ALL` AND NOT `currentWatched()`. A snapshot of the mirror taken
 * at import time would be live exactly once and stale forever after, and stale
 * in the leak direction: a reader who narrows their set would keep the wide
 * career table. Pinning to the full atlas is the other option PLAN-spoilers.md
 * §5 allows — "pinned to the full dataset and explicitly labelled as such" —
 * and it is the one that cannot mislead by half-working. It also keeps phase
 * 2's rule 0 unconditional: these four render byte for byte what they rendered
 * before this file was touched, for everybody, under every setting.
 *
 * WHAT PHASE 3 OWES. Delete all six. In the same commit, Dossier.tsx and
 * AboutSheet.tsx take the set from `useWatched()` and call the functions above,
 * with the set in their `useMemo` dependency lists. Until that lands the app
 * has a SPLIT LEDGER — `ledgerFor` and `haveFaced` follow the reader, the
 * career table and the two empty-state lists do not — which is invisible at the
 * phase-2 default and is a leak the moment a set is stored. It is the one thing
 * in this file that is plumbing without being connected, and it is named here
 * rather than left for an auditor to find.
 */

/** @deprecated Pinned to the full atlas. Use `meetingsSeenBy(watched)`. */
export const meetings: readonly Meeting[] = meetingsSeenBy(WATCHED_ALL);

/** @deprecated Pinned to the full atlas. Use `facedPairsSeenBy(watched)`. */
export const facedPairs: ReadonlySet<string> = facedPairsSeenBy(WATCHED_ALL);

/** @deprecated Pinned to the full atlas. Use `careerSeenBy(watched)`. */
export const career: Readonly<Record<string, CareerRecord>> = careerSeenBy(WATCHED_ALL);

/** @deprecated Pinned to the full atlas. Use `careerTableSeenBy(watched)`. */
export const careerTable: readonly CareerRecord[] = careerTableSeenBy(WATCHED_ALL);

/** @deprecated Pinned to the full atlas. Use `neverFacedSeenBy(watched)`. */
export const neverFaced: readonly string[] = neverFacedSeenBy(WATCHED_ALL);

/** @deprecated Pinned to the full atlas. Use `noComparableResultSeenBy(watched)`. */
export const noComparableResult: readonly string[] = noComparableResultSeenBy(WATCHED_ALL);
