import type { Category, Edge, EdgeType, Person, SeasonNumber } from '../data/types';
import type { PlateSpec } from './plate';

/** A person, plus everything the renderer needs, plus live physics state. */
export interface GNode {
  id: string;
  person: Person;

  /** Display — both scripts, so the canvas can follow the UI language. */
  label: string;
  labelEn: string;
  sublabel: string;
  sublabelEn: string;
  initials: string;
  initialsEn: string;
  category: Category;
  color: string;
  /** 1 for the winner of any season, else undefined. */
  isWinner: boolean;
  isHost: boolean;
  seasons: SeasonNumber[];
  /** Weighted importance 0..1 — drives radius. */
  weight: number;
  radius: number;
  degree: number;

  /** Physics (mutated by d3-force) */
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;

  /** Layout anchors (target position for non-free layouts) */
  ax: number;
  ay: number;
  /** How strongly this node obeys its anchor, 0..1. */
  anchorW: number;

  /** No verified relationship to anyone else in the cast. */
  noTies: boolean;

  /**
   * Everything the portrait plate needs, resolved once at build time.
   *
   * The graph paints twenty of these per frame, so the painter must not be
   * walking `person.priorSeasons` or the adjacency map while it draws. Filled
   * in by `buildGraph`; see `graph/plate.ts` for what each field means.
   */
  plate: PlateSpec;

  /** Render state, eased every frame */
  focus: number; // 0..1 highlight
  dim: number; // 0..1 de-emphasis
  appear: number; // 0..1 entrance
  pulse: number; // 0..1 decaying ping
}

export interface GLink {
  id: string;
  edge: Edge;
  source: GNode;
  target: GNode;
  type: EdgeType;
  color: string;
  /** Rendered curvature offset; siblings between the same pair fan out. */
  curve: number;
  width: number;
  dashed: boolean;
  directed: boolean;

  focus: number;
  dim: number;
  /** 0..1 draw-on progress for the entrance animation. */
  draw: number;
  /** marching-ants offset for highlighted links */
  flow: number;
}

export type LayoutMode = 'web' | 'seasons' | 'archetype' | 'orbit';

export interface Viewport {
  x: number;
  y: number;
  k: number;
}

export interface GraphFilters {
  seasons: Set<SeasonNumber>;
  categories: Set<Category>;
  edgeTypes: Set<EdgeType>;
  /** Lower-cased search string. */
  query: string;
  /** Hide people who end up with no visible connections. */
  hideIsolated: boolean;
}
