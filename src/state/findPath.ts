import { NON_MEETING_TYPES, tieTypeVisible } from '../data/edges';
import type { BuiltGraph } from '../graph/build';
import type { GLink, GNode } from '../graph/types';
import type { EdgeType } from '../data/types';
import type { WatchedSet } from '../data/redact';
import { currentWatched } from './useWatched';

/**
 * "How do these two know each other?" — the question a relationship graph
 * exists to answer, and the one a plain node-link diagram makes you answer by
 * squinting.
 *
 * A PATH MAY NOT STEP THROUGH A NON-MEETING. `parallel` is the edge type the
 * schema invented to record that two people have demonstrably never been in a
 * room together, and the traversal walked straight through it: shift-clicking
 * 홍진호 → 최연청 returned "한 다리 건너 / One person in between" with its second
 * step captioned 평행 이력 · 만난 적 없는 멘사 회원 둘 — a chain the app declares
 * false at that very hop, on a canvas that seats 최연청 under a caption reading
 * NO VERIFIED TIE. A route is only as true as its weakest link, so a hop nobody
 * can vouch for is not a shorter answer, it is a wrong one.
 *
 * We EXCLUDE rather than annotate. Marking the hop would need a second
 * treatment on PathCard, and it would still hand the reader a degree count
 * ("2다리 건너") assembled partly from a non-meeting; there is no honest number
 * on the other side of that. Excluding costs nothing the data supports — the
 * three people it isolates (강지후, 신승용, 최연청) carry no other line, and the
 * remaining seventeen stay one connected component, so no real chain is lost.
 * What it buys is that `PathCard`'s `unreachable` branch finally fires, which
 * is the one screen this atlas wrote for exactly this fact.
 *
 * The membership test is NON_MEETING_TYPES, imported from data/edges.ts, for
 * the reason its own header gives: it is a fact about the edge vocabulary, four
 * surfaces have to agree about it, and the copy of it this file could have kept
 * locally would eventually have learned about a second non-meeting type alone.
 *
 * ── A SEALED TIE IS WALKED THROUGH. THE DECISION, AND WHAT IT COSTS ─────────
 *
 * The other question this traversal has to answer is the opposite one: a tie
 * the reader may not be told the NAME of — 28 of 52 at `bgx.watched='[]'`,
 * 14 alliance, 5 betrayal, 9 rivalry. Refusing to route through those was on
 * the table and is wrong, for three reasons that stack.
 *
 *   1. IT WOULD MAKE THE APP LIE, on the one screen written to be believed.
 *      Refusing routes the pair into `PathCard`'s `unreachable` branch, whose
 *      copy says these two are not connected at all. They are: the line is on
 *      the canvas, drawn between them, in INK_LOW. Withholding what a tie is
 *      called is redaction; asserting there is no tie is a false value, which
 *      PLAN-spoilers.md §3 rule 1 forbids by name — and it would fire on the
 *      exact reader the redaction exists to protect. MEASURED at the empty set:
 *      the meeting graph's components go 17,1,1,1 → 14,1,1,1,1,1,1 — 이진형,
 *      윤비 and 김남희 fall out of the mesh entirely — and 45 of the 136 pairs
 *      the atlas can currently chain, 33.1%, would newly print that copy.
 *
 *   2. IT IS THE SAME CONFUSION `parallel` EXISTS TO PREVENT, RUN BACKWARDS.
 *      Six paragraphs up, a non-meeting is excluded because the DATA SAYS THE
 *      HOP DID NOT HAPPEN — the chain would be false at that link, and no
 *      honest degree count survives it. A sealed hop is TRUE and merely
 *      unnamed. Excluding both under one rule would file "we have not told you"
 *      with "it did not happen", and the degree count stays honest here: every
 *      step is a meeting, so '2다리 건너' is the same true number for every
 *      reader.
 *
 *   3. IT WOULD MAKE THE ROUTE A FUNCTION OF THE READER — the thing
 *      PLAN-spoilers.md §5 is about. graph/build.ts keeps all 52 links for the
 *      same reason: a mesh that re-solves when the reader narrows their set is
 *      itself a statement about who is connected to whom. If a chain shortens
 *      or reroutes when a scope is unlocked, the difference between the two
 *      chains is the withheld tie, recovered by subtraction. Routing through
 *      everything structural keeps ONE chain for every reader; only the words
 *      printed on it differ. That is also why the strength sort below is left
 *      alone rather than taught to prefer readable hops: strength is structure,
 *      and a watched-set-dependent preference would re-introduce exactly this.
 *
 * WHAT IT COSTS, said plainly: a trace confirms that these two are connected
 * and how many hops apart they are, for a reader who has not unlocked the ties
 * in between. That cost is already paid — the canvas draws all 52 lines and the
 * dossier lists the neutral row — so the tracer adds no fact the atlas was
 * withholding. It is a real cost only if the canvas is later changed to drop
 * sealed lines, and then this comment is wrong and both files change together.
 *
 * ── THE FILTER RAIL IS AN ORACLE, AND THAT PART IS FIXED HERE ───────────────
 *
 * `allowedTypes` is the rail's twelve checkboxes. Applied to a sealed edge it
 * is a keyhole: at the empty set 홍진호 ↔ 하승진 traced as 바로 아는 사이, and
 * un-ticking 라이벌 alone dropped it to unreachable — the reader recovers the
 * verdict by watching which box moves the answer. GraphCanvas.tsx's
 * `passesTypeFilter` had already reached this conclusion for the stroke, the
 * hit test and the E-cycle; this traversal was the fourth caller and the one
 * that never got the memo. So a sealed tie is NOT TYPE-FILTERABLE here either:
 * its type is not a fact this reader holds, so no control keyed on the type may
 * move it.
 *
 * THAT COMPOSITION NOW EXISTS TWICE and it should exist once. `tieTypeVisible`
 * is imported rather than re-derived, but the shape it composes into —
 * `tellable ? allowed.has(type) : true` — is written both here and at
 * GraphCanvas.tsx:489, because data/edges.ts, where it belongs beside
 * `countsAsTie`, has another owner this round. HANDOFF: lift it there as
 * `passesTypeFilter(e, allowed, watched)` and have both files import it. Until
 * then the two are deliberately the same expression, word for word, so a grep
 * finds the pair.
 */

export interface PathStep {
  from: GNode;
  to: GNode;
  link: GLink;
}

export interface PathResult {
  from: GNode;
  to: GNode;
  steps: PathStep[];
  nodeIds: Set<string>;
  linkIds: Set<string>;
  /** 1 = they know each other directly. */
  degrees: number;
}

/**
 * Breadth-first, so the result is always a fewest-hops answer. Among equal
 * hop counts we prefer the route through stronger ties, which is what a person
 * would actually cite: "they were allies in season 2", not "they were both
 * vaguely in season 2".
 *
 * `watched` DEFAULTS to the module mirror, which is the one sanctioned position
 * for it — a default-parameter slot in a module with no JSX (state/useWatched.ts
 * says so in as many words). The usual objection does not bite here and it is
 * worth writing down why, because the objection is normally fatal: the mirror
 * carries no subscription, so a value read through it can go stale in the
 * narrowing direction, which is a leak. This call site cannot. App.tsx computes
 * the trace in a `useMemo` keyed on `graph`, `buildGraph` is itself memoised on
 * the watched-set, and `WatchedProvider` moves the mirror synchronously before
 * it re-renders — so by the time this function runs again it has a new graph
 * AND a fresh mirror, or it has not run at all. HANDOFF: App.tsx should still
 * pass `useWatched().watched` explicitly when its owner is free, so the
 * guarantee lives in the dependency array rather than in this paragraph.
 */
export function findPath(
  graph: BuiltGraph,
  fromId: string,
  toId: string,
  allowedTypes?: Set<EdgeType>,
  watched: WatchedSet = currentWatched(),
): PathResult | null {
  const from = graph.byId.get(fromId);
  const to = graph.byId.get(toId);
  if (!from || !to || fromId === toId) return null;

  /* Word for word GraphCanvas.tsx:489 — see the header. A tie whose type this
     reader may not be told is not filterable BY that type. */
  const passesTypeFilter = (l: GLink) =>
    !allowedTypes || (tieTypeVisible(l.edge, watched) ? allowedTypes.has(l.type) : true);

  const usable = (l: GLink) => !NON_MEETING_TYPES.has(l.type) && passesTypeFilter(l);

  // depth → best (fewest hops, then strongest weakest-link) predecessor
  const prev = new Map<string, { link: GLink; from: string }>();
  const depth = new Map<string, number>([[fromId, 0]]);
  const queue: string[] = [fromId];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === toId) break;
    const d = depth.get(cur)!;
    const outgoing = (graph.edgesOf.get(cur) ?? []).filter(usable);
    // Strongest first, so among equally short routes the better story wins.
    outgoing.sort((a, b) => b.edge.strength - a.edge.strength);
    for (const l of outgoing) {
      const next = l.source.id === cur ? l.target.id : l.source.id;
      if (depth.has(next)) continue;
      depth.set(next, d + 1);
      prev.set(next, { link: l, from: cur });
      queue.push(next);
    }
  }

  if (!prev.has(toId)) return null;

  const steps: PathStep[] = [];
  const nodeIds = new Set<string>([toId]);
  const linkIds = new Set<string>();
  let cursor = toId;
  while (cursor !== fromId) {
    const p = prev.get(cursor);
    if (!p) return null;
    const a = graph.byId.get(p.from)!;
    const b = graph.byId.get(cursor)!;
    steps.unshift({ from: a, to: b, link: p.link });
    linkIds.add(p.link.id);
    nodeIds.add(p.from);
    cursor = p.from;
  }

  return { from, to, steps, nodeIds, linkIds, degrees: steps.length };
}

/** Every person reachable from a starting point, for the "unreachable" copy.
 *
 * Walks `edgesOf` and not `adjacency`, because `adjacency` is an id→id map that
 * has already forgotten which type joined the two — and this function has to
 * answer the same question `findPath` answers, under the same rule. Reading it
 * off the neighbour set would have made this the one surface that still counts
 * a non-meeting as a way through, which is the drift the shared
 * NON_MEETING_TYPES exists to stop.
 *
 * NO WATCHED-SET, ON PURPOSE, and not an oversight to be tidied later. It takes
 * no `allowedTypes`, so there is no type-keyed control to turn into an oracle,
 * and a sealed tie is a way through per the header — so every input it has is
 * structure and its answer is the same for every reader. Adding a parameter it
 * would only ignore would read as a promise the body does not keep. */
export function reachableFrom(graph: BuiltGraph, id: string): Set<string> {
  const seen = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const l of graph.edgesOf.get(cur) ?? []) {
      if (NON_MEETING_TYPES.has(l.type)) continue;
      const other = l.source.id === cur ? l.target.id : l.source.id;
      if (seen.has(other)) continue;
      seen.add(other);
      queue.push(other);
    }
  }
  return seen;
}
