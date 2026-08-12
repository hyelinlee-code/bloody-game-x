import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category, Dataset, EdgeType, Person, SeasonNumber, XTeam } from '../data/types';
import { buildGraph, type BuiltGraph } from '../graph/build';
import { TEAM_ORDER } from '../data/lineage';
import type { LayoutMode } from '../graph/types';
import { personBio, personNotableFor } from '../data/i18n';
import { useWatched, type WatchedSet } from './useWatched';

export const ALL_CATEGORIES: Category[] = [
  'comedian',
  'broadcaster',
  'creator',
  'athlete',
  'esports',
  'poker',
  'musician',
  'actor',
  'professional',
  'other',
];

/**
 * The filter vocabulary. THIS LIST IS LOAD-BEARING, not documentation.
 *
 * It seeds the default `edgeTypes` set, and every edge is filtered against
 * that set before it reaches the canvas, the rail's legend, the status ledger,
 * the dossier's relation list or the path finder. A type present in `edges.ts`
 * and absent here is therefore not merely un-filterable — it is invisible
 * everywhere, while `validate-data.mjs` still reports the dataset as sound.
 *
 * That is exactly what happened to `parallel` when it was added: three ties
 * vanished, 신승용 / 강지후 / 최연청 became orphans on a graph whose subject is
 * connection, and the cold open said 44 while the ledger said 41. Four
 * independent reviewers found it, all of them by a different route.
 *
 * `tools/validate-data.mjs` now fails the build when this list and the
 * `EdgeType` union disagree, so the next one cannot ship.
 */
export const ALL_EDGE_TYPES: EdgeType[] = [
  'alliance',
  'betrayal',
  'rivalry',
  'prior-show',
  'co-season',
  'parallel',
  'friendship',
  'family',
  'agency',
  'teammate',
  'mentor',
  'collab',
];

/** The X lineup blocs, used as the primary lineage filter. */
export type RepresentFilter = XTeam;
export const ALL_REPRESENTS: RepresentFilter[] = TEAM_ORDER;

export {
  TEAM_LABEL_KO,
  TEAM_LABEL_EN,
  TEAM_COLOR,
  TEAM_SEASON,
  TEAM_ORDER,
  lineageOf,
  lineageOfTeam,
} from '../data/lineage';
export type { Lineage } from '../data/lineage';

export interface AtlasState {
  graph: BuiltGraph;
  mode: LayoutMode;
  setMode: (m: LayoutMode) => void;
  selectedId: string | null;
  select: (id: string | null) => void;
  hoverId: string | null;
  setHover: (id: string | null) => void;
  query: string;
  setQuery: (q: string) => void;
  categories: Set<Category>;
  toggleCategory: (c: Category) => void;
  /** Bulk set — used by the URL restore and the all/none controls. */
  setCategories: (c: Set<Category>) => void;
  edgeTypes: Set<EdgeType>;
  toggleEdgeType: (t: EdgeType) => void;
  setEdgeTypes: (t: Set<EdgeType>) => void;
  represents: Set<RepresentFilter>;
  toggleRepresent: (r: RepresentFilter) => void;
  setRepresents: (r: Set<RepresentFilter>) => void;
  onlyReturning: boolean;
  setOnlyReturning: (v: boolean) => void;
  resetFilters: () => void;
  filtersActive: boolean;
  /** Ids passing every filter. */
  visible: Set<string>;
  /** Ids matching the text query specifically (for search affordances). */
  matches: string[];
  history: string[];
  back: () => void;
}

function toggleIn<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Everything a person can be found by — THE THIRD SEARCH CORPUS.
 *
 * There are three haystacks in this app and for four rounds only two of them
 * had an owner. `CommandPalette.tsx` builds its own per-tier matcher, `edges.ts`
 * is joined on rather than searched, and this one — the one behind `#q=`, the
 * top bar's spoken match count, the canvas filter and the cast wall's dimming —
 * indexed the finish. Measured against the real corpus at `bgx.watched='[]'`,
 * i.e. a reader who has watched nothing: `탈락` named 현성주 / 박지민 / 하승진,
 * the three season-2 eliminations; `13위` named the one person who came last;
 * `저택팀` named the side of a house. Byte-identical at every watched-set,
 * because none of it was ever asked a question about the reader.
 *
 * A search box that answers a question no panel on the page will answer is an
 * oracle, and it is the worst kind: the reader does not have to open anything,
 * they only have to type a word they were trying to avoid. Two things close it.
 *
 * 1. THE RUN LINE CARRIES PARTICIPATION AND NOTHING ELSE. `placement` and
 *    `team` are gone; `시즌N` / `seasonN` stay, because WHICH seasons somebody
 *    played is public on every other surface — the portrait plate draws one arc
 *    per season on the cast wall, the canvas and the dossier crest. `team` goes
 *    with the placement even though it looks structural, for the reason
 *    `OUTCOME_FIELDS` lists it and `CommandPalette`'s tier 5 spells out: all 14
 *    team strings in the corpus carry their season's scope, and '저택팀 →
 *    야생팀' is a defection while '히든 플레이어 (저택 잠입)' is the season 2
 *    twist stated on one of the people it was a twist about.
 *
 * 2. THE PROSE IS READ THROUGH THE ACCESSORS, not off the record. `bio` and
 *    `notableFor` are the two indexed fields that are gated per work in
 *    `data/i18n`, and reading them raw here made the index disagree with the
 *    page: at `[]`, `우승` still returned eight people whose bios say so on
 *    surfaces that had already stopped saying it. `personNotableFor` is scoped
 *    per bullet, so a person keeps their band and loses their championship.
 *
 * KOREAN ON BOTH, DELIBERATELY. This index has only ever held `p.bio` and
 * `p.notableFor` — never `bioEn`, never the English bullets — and widening it
 * to both tables would change which people `#q=` returns at the DEFAULT
 * watched-set. That is Rule 0, and it is not this change's to spend. The
 * language-independent haystack is `CommandPalette`'s; this one is the graph
 * filter and it keeps the shape it has.
 *
 * ── RULE 0 AND THE ONE PLACE IT DOES NOT REACH ──────────────────────────────
 * Emptying a corpus changes results at the default too — `#q=탈락` returns
 * nobody now, for everybody. PHASE2-CONTRACT.md §0 ("every rendered byte is
 * identical at the default") and §3 ("strip placements from the search
 * corpora") cannot both hold over this function, and the lead has ruled: the
 * strip is an INTENDED, user-visible change, because no sealed panel can close
 * an oracle. Rule 0 still binds every other line in this file, and the accessor
 * routing in (2) satisfies it on its own — at `WATCHED_ALL` both accessors
 * return the raw strings, so only the run line moves at the default.
 */
function searchIndex(p: Person, watched: WatchedSet): string {
  return [
    p.nameKo,
    p.nameEn,
    p.realNameKo,
    ...(p.aka ?? []),
    p.occupation,
    p.occupationKo,
    p.category,
    personBio(p, 'ko', watched),
    p.x.teamLabelKo,
    p.x.teamLabelEn,
    ...personNotableFor(p, 'ko', watched),
    /* Titles and years are participation, and `show` is additionally the join
       key `headToHead.ts` uses across the two i18n halves of a row — sealing it
       would break a lookup rather than protect a claim. The four outcome fields
       on that record (`result`, `resultEn`, `rank`, `fieldSize`) were never
       indexed here and still are not. */
    ...(p.otherShows ?? []).flatMap((s) => [s.show, s.showKo ?? '']),
    ...p.priorSeasons.map((s) => `시즌${s.season} season${s.season}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function useAtlas(data: Dataset): AtlasState {
  /* THE SUBSCRIPTION, and it has to be a hook rather than `currentWatched()`.
   *
   * This is where the whole tree's exposure enters React. `buildGraph` and the
   * accessors below all take a default-parameter `watched = currentWatched()`,
   * and reading that module global here would give the right answer once, at
   * first render, and then tell React nothing — so a reader who NARROWED their
   * set would keep the previous graph and the previous index on screen. That
   * staleness is a leak, not a lag. `useWatched()` is `useContext`, so the
   * provider's `setWatched` re-renders this hook's host and everything under
   * it; see the long note on `currentWatched` in state/useWatched.ts.
   *
   * The provider is mounted in App.tsx ABOVE the component that calls this. It
   * has to be: a component cannot consume a context it renders itself. */
  const { watched } = useWatched();

  /* `watched` is in the dependency list, not merely in the body. An omitted dep
     here does not warn and does not throw — it silently keeps the previous
     reader's degrees, rim ticks, cold band and disc radii on the canvas. */
  const graph = useMemo(() => buildGraph(data, watched), [data, watched]);

  const index = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data.people) m.set(p.id, searchIndex(p, watched));
    return m;
  }, [data, watched]);

  const [mode, setMode] = useState<LayoutMode>('web');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Set<Category>>(() => new Set(ALL_CATEGORIES));
  const [edgeTypes, setEdgeTypes] = useState<Set<EdgeType>>(() => new Set(ALL_EDGE_TYPES));
  const [represents, setRepresents] = useState<Set<RepresentFilter>>(() => new Set(ALL_REPRESENTS));
  const [onlyReturning, setOnlyReturning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const select = useCallback((id: string | null) => {
    setSelectedId((prev) => {
      if (prev && prev !== id) setHistory((h) => [prev, ...h.filter((x) => x !== prev)].slice(0, 12));
      return id;
    });
  }, []);

  const back = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setSelectedId(h[0]);
      return h.slice(1);
    });
  }, []);

  // Selecting someone in orbit mode re-centres the layout on them.
  useEffect(() => {
    if (mode === 'orbit' && !selectedId) setMode('web');
  }, [mode, selectedId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = new Set<string>();
    for (const p of data.people) {
      if (!categories.has(p.category)) continue;
      if (!represents.has(p.x.team)) continue;
      if (onlyReturning && p.priorSeasons.length === 0) continue;
      if (q && !(index.get(p.id) ?? '').includes(q)) continue;
      out.add(p.id);
    }
    return out;
  }, [data.people, categories, represents, onlyReturning, query, index]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.people.filter((p) => (index.get(p.id) ?? '').includes(q)).map((p) => p.id);
  }, [data.people, query, index]);

  const filtersActive =
    categories.size !== ALL_CATEGORIES.length ||
    edgeTypes.size !== ALL_EDGE_TYPES.length ||
    represents.size !== ALL_REPRESENTS.length ||
    onlyReturning ||
    query.trim().length > 0;

  const resetFilters = useCallback(() => {
    setCategories(new Set(ALL_CATEGORIES));
    setEdgeTypes(new Set(ALL_EDGE_TYPES));
    setRepresents(new Set(ALL_REPRESENTS));
    setOnlyReturning(false);
    setQuery('');
  }, []);

  return {
    graph,
    mode,
    setMode,
    selectedId,
    select,
    hoverId,
    setHover,
    query,
    setQuery,
    categories,
    toggleCategory: useCallback((c: Category) => setCategories((s) => toggleIn(s, c)), []),
    setCategories,
    edgeTypes,
    toggleEdgeType: useCallback((t: EdgeType) => setEdgeTypes((s) => toggleIn(s, t)), []),
    setEdgeTypes,
    represents,
    toggleRepresent: useCallback((r: RepresentFilter) => setRepresents((s) => toggleIn(s, r)), []),
    setRepresents,
    onlyReturning,
    setOnlyReturning,
    resetFilters,
    filtersActive,
    visible,
    matches,
    history,
    back,
  };
}

export type { SeasonNumber };
