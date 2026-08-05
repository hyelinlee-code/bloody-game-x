import { NON_MEETING_TYPES } from '../data/edges';
import type { BuiltGraph } from '../graph/build';
import type { GLink, GNode } from '../graph/types';
import type { EdgeType } from '../data/types';

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
 */
export function findPath(
  graph: BuiltGraph,
  fromId: string,
  toId: string,
  allowedTypes?: Set<EdgeType>,
): PathResult | null {
  const from = graph.byId.get(fromId);
  const to = graph.byId.get(toId);
  if (!from || !to || fromId === toId) return null;

  const usable = (l: GLink) =>
    !NON_MEETING_TYPES.has(l.type) && (!allowedTypes || allowedTypes.has(l.type));

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
 * NON_MEETING_TYPES exists to stop. */
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
