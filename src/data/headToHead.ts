import { edges, NON_MEETING_TYPES } from './edges';
import { people } from './people';
import { records } from './records';
import type { SeasonNumber } from './types';

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

const out: Meeting[] = [];

/* ── duels, authored on the edge ─────────────────────────────────────────── */

for (const e of edges) {
  for (const d of e.outcomes ?? []) {
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
      if (r.role !== 'contestant' || r.rank === undefined) continue;
      const list = ranked.get(r.season) ?? [];
      list.push({ id, rank: r.rank, fieldSize: r.fieldSize });
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
   a rank is spelled identically wherever else it appears. */
{
  const shows = new Map<string, { id: string; rank: number; fieldSize?: number; ko: string; en: string }[]>();
  for (const p of people) {
    for (const s of p.otherShows ?? []) {
      if (s.rank === undefined) continue;
      const list = shows.get(s.show) ?? [];
      list.push({ id: p.id, rank: s.rank, fieldSize: s.fieldSize, ko: s.showKo ?? s.show, en: s.show });
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

export const meetings: readonly Meeting[] = out;

/** Every documented result involving this person, duels first. */
export function meetingsFor(id: string): Meeting[] {
  return out.filter((m) => m.winner === id || m.loser === id);
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
   */
  unadjudicated: number;
}

/* Shared appearances, adjudicable or not: franchise seasons where both have a
   run of ANY role, plus outside programmes both are credited on.

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

/** This person's record against everyone they have a documented result with. */
export function ledgerFor(id: string): Ledger[] {
  const byOpponent = new Map<string, Meeting[]>();
  for (const m of meetingsFor(id)) {
    const other = m.winner === id ? m.loser : m.winner;
    byOpponent.set(other, [...(byOpponent.get(other) ?? []), m]);
  }
  const rows: Ledger[] = [];
  for (const [opponentId, ms] of byOpponent) {
    const wins = ms.filter((m) => m.winner === id).length;
    rows.push({
      opponentId,
      wins,
      losses: ms.length - wins,
      duels: ms.filter((m) => m.kind === 'duel').length,
      meetings: ms,
      unadjudicated: Math.max(0, sharedAppearances(id, opponentId) - ms.length),
    });
  }
  /* Most-contested first: total results, then duels, then decisiveness. */
  rows.sort(
    (a, b) =>
      b.meetings.length - a.meetings.length ||
      b.duels - a.duels ||
      Math.abs(b.wins - b.losses) - Math.abs(a.wins - a.losses),
  );
  return rows;
}

/** 'a|b' for every pair with at least one documented result. */
export const facedPairs: ReadonlySet<string> = new Set(out.map((m) => key(...m.pair)));

export const haveFaced = (a: string, b: string): boolean => facedPairs.has(key(a, b));

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
 */
export interface CareerRecord {
  id: string;
  /** Seasons played, as a contestant. */
  seasons: SeasonNumber[];
  /** Seasons presided over — hosted, dealt, or sat on the panel. */
  presided: SeasonNumber[];
  titles: number;
  bestRank?: number;
  bestFieldSize?: number;
  /** Best finish as a percentile of its field; lower is better. */
  bestTopPct?: number;
  /** Others in the fields: Σ (fieldSize − 1) over ranked runs. Not opponents
   *  played — see the note above. */
  faced: number;
  /** Players outlasted: Σ (fieldSize − rank). */
  outlasted: number;
  /** outlasted / faced, 0–1. Undefined when nothing is rankable. */
  share?: number;
}

const careerOut: Record<string, CareerRecord> = {};
for (const p of people) {
  const runs = records[p.id] ?? [];
  const rec: CareerRecord = {
    id: p.id,
    seasons: runs.filter((r) => r.role === 'contestant').map((r) => r.season),
    presided: runs.filter((r) => r.role !== 'contestant').map((r) => r.season),
    titles: runs.filter((r) => r.rank === 1).length,
    faced: 0,
    outlasted: 0,
  };
  for (const r of runs) {
    if (r.rank === undefined || r.fieldSize === undefined) continue;
    rec.faced += r.fieldSize - 1;
    rec.outlasted += r.fieldSize - r.rank;
    const pct = (r.rank / r.fieldSize) * 100;
    if (rec.bestTopPct === undefined || pct < rec.bestTopPct) {
      rec.bestTopPct = pct;
      rec.bestRank = r.rank;
      rec.bestFieldSize = r.fieldSize;
    }
  }
  if (rec.faced > 0) rec.share = rec.outlasted / rec.faced;
  careerOut[p.id] = rec;
}

export const career: Readonly<Record<string, CareerRecord>> = careerOut;

/** The twelve returners, best career first. Newcomers are not in this table. */
export const careerTable: readonly CareerRecord[] = Object.values(careerOut)
  .filter((c) => c.share !== undefined)
  .sort((a, b) => (b.share ?? 0) - (a.share ?? 0) || b.faced - a.faced);

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
 * The membership test is NON_MEETING_TYPES, imported. This file used to hold
 * its own `new Set(['parallel'])` four lines from here, which was the same
 * judgement written down twice — exactly the failure the paragraph above
 * refuses for cast lists, committed against the edge list. One of the two
 * copies would eventually have learned about a second non-meeting type and the
 * other would not, and nothing on screen would have said which.
 */
export const neverFaced: readonly string[] = people
  .filter((p) => {
    const mine = edges.filter((e) => e.source === p.id || e.target === p.id);
    return mine.every((e) => NON_MEETING_TYPES.has(e.type));
  })
  .map((p) => p.id);

/** Has met someone, but no finish on either side of it is numbered. */
export const noComparableResult: readonly string[] = people
  .filter(
    (p) =>
      !neverFaced.includes(p.id) && !out.some((m) => m.winner === p.id || m.loser === p.id),
  )
  .map((p) => p.id);
