import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category, Dataset, EdgeType, SeasonNumber, XTeam } from '../data/types';
import { buildGraph, type BuiltGraph } from '../graph/build';
import { TEAM_ORDER } from '../data/lineage';
import type { LayoutMode } from '../graph/types';

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

/** Everything a person can be found by. */
function searchIndex(p: Dataset['people'][number]): string {
  return [
    p.nameKo,
    p.nameEn,
    p.realNameKo,
    ...(p.aka ?? []),
    p.occupation,
    p.occupationKo,
    p.category,
    p.bio,
    p.x.teamLabelKo,
    p.x.teamLabelEn,
    ...(p.notableFor ?? []),
    ...(p.otherShows ?? []).flatMap((s) => [s.show, s.showKo ?? '']),
    ...p.priorSeasons.map((s) => `시즌${s.season} season${s.season} ${s.placement} ${s.team ?? ''}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function useAtlas(data: Dataset): AtlasState {
  const graph = useMemo(() => buildGraph(data), [data]);

  const index = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data.people) m.set(p.id, searchIndex(p));
    return m;
  }, [data]);

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
