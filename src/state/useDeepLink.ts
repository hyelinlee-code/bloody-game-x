import { useEffect, useRef } from 'react';
import type { Category, EdgeType } from '../data/types';
import type { Lang } from '../data/i18n/types';
import type { LayoutMode } from '../graph/types';
import type { RepresentFilter } from './useAtlas';

/**
 * Two-way sync between the URL and the current view, so any state a reader
 * lands on is a link they can send to someone else.
 *
 *   #p=hong-jin-ho&m=orbit&q=포커&l=season1,season2&a=none&e=alliance,betrayal
 *     &r=1&path=hong-jin-ho,kwak-beom&tie=hong-jin-ho~ha-seung-jin~betrayal
 *     &lang=en
 *
 * Selections, mode changes, traces and pinned lines are pushed, because they
 * are navigations and the Back button should undo them. Typing in the search
 * box is replaced, because nobody wants eleven history entries for "홍진호".
 *
 * ── WHAT AN ADDRESS HAS TO CARRY ──────────────────────────────────────────
 * This is a reference work about twenty people, and its social value is one
 * person sending another a link. Four things used to fall out of that link,
 * and each of them was the interesting half of what was on screen:
 *
 *   1. THE LANGUAGE. `lang` was read on boot by useLang and never written, so
 *      an English session copied out of the address bar opened in Korean for
 *      anyone whose browser reports ko-KR. It is now always serialised — see
 *      the note on `hasDeepLink` for why that does not cost the cold open.
 *   2. A CLEARED FILTER SET. `partial()` returned '' for an empty set, which
 *      round-tripped through parseSet as falsy → undefined → "restore
 *      everything", so a link that said "show me nobody" restored all twenty.
 *      An empty set is now an explicit `none`.
 *   3. THE TRACED PATH. Shift-clicking two people is the app's single most
 *      interesting output — "look at the chain between Hong Jin-ho and Kwak
 *      Beom" — and the hash sat unchanged at `#p=hong-jin-ho`. It is now a
 *      `path=a,b` pair, and findPath is a pure function of the two ids, so
 *      rehydrating it is re-running it.
 *   4. THE PINNED RELATIONSHIP. Clicking a line opens a full EdgeCard — the
 *      headline, the season chips, the cited paragraph — and the hash stayed
 *      at `#lang=ko`. The edge was the only object in the app with no address,
 *      on a product whose subject is relationships rather than people: the
 *      thing a reader actually wants to send is "look what 홍진호 did to 하승진
 *      on day 8", and it could not be sent. It is now `tie=a~b~type`, and
 *      because the card is a navigation the Back button dismisses it.
 */

const MODES: LayoutMode[] = ['web', 'seasons', 'archetype', 'orbit'];
const LANGS: Lang[] = ['ko', 'en'];

/** The two ends of a traced chain, in the order they were asked for. */
export interface PathRequest {
  from: string;
  to: string;
}

/**
 * A pinned relationship, as an address.
 *
 * The pair plus the type rather than the edge id, for two reasons. The id is
 * `hong-jin-ho--seo-chul-gu--alliance-s2-0` — a pair, a type and a serial
 * number that exists only to keep the file's keys unique, and pinning a link
 * to that serial makes every shared URL a hostage to an edge being renumbered.
 * And a pair may legitimately carry two ties (the validator allows exactly
 * two), so the pair alone does not identify a line; the type is what tells
 * them apart, and it is the thing the reader can see in the card's own chip.
 *
 * RESOLUTION IS ORDER-INSENSITIVE. A hand-written `tie=b~a~rivalry` names the
 * same line as `tie=a~b~rivalry`; direction is a property of the edge, not of
 * the address, and a link that fails because the two ids were typed the other
 * way round would be the kind of brittleness `path=` already refuses.
 */
export interface TieRequest {
  a: string;
  b: string;
  type: EdgeType;
}

/** Does this address name that line, in either order? */
export function tieMatches(tie: TieRequest, source: string, target: string, type: EdgeType): boolean {
  if (tie.type !== type) return false;
  return (tie.a === source && tie.b === target) || (tie.a === target && tie.b === source);
}

export interface DeepLinkState {
  personId: string | null;
  mode: LayoutMode;
  query: string;
  /** Always serialised. A bilingual document's address names its language. */
  lang: Lang;
  path: PathRequest | null;
  /**
   * The relationship held open on the canvas, if one is.
   *
   * Required, like every other view parameter. It was optional for exactly one
   * round, while the pinned link was still private state inside GraphCanvas and
   * this hook could read `tie=` off an address without ever being handed one —
   * a read-only parameter, which is to say half a feature: the address a reader
   * copied out of the bar never mentioned the card they were looking at.
   * `pinnedLinkId` now lives in App alongside `tracePair`, so the field is
   * declared the way it is meant to be read, and a caller that forgets it no
   * longer compiles.
   */
  tie: TieRequest | null;
  /** Omitted from the URL when a set is complete — the default is silence. */
  represents?: Set<RepresentFilter>;
  categories?: Set<Category>;
  edgeTypes?: Set<EdgeType>;
  onlyReturning?: boolean;
}

export interface DeepLinkOptions {
  allRepresents: readonly RepresentFilter[];
  allCategories: readonly Category[];
  allEdgeTypes: readonly EdgeType[];
}

/**
 * The sentinel for "this filter group is switched entirely off".
 *
 * It has to be a token that no member of any of the three vocabularies could
 * ever be, because it shares their slot: `a=none` means zero archetypes, not
 * the archetype called none. The three unions are checked — categories end at
 * 'other', edge types at 'collab', lineage at 'rookie' — and if a future value
 * is ever literally 'none', this is the line that breaks and this is the
 * comment that says so.
 */
const EMPTY_SET = 'none';

/**
 * Which parameters describe a VIEW, as opposed to how it is being read.
 *
 * `lang` is deliberately absent. Because the language is now always written,
 * every visit ends up with a hash within one commit of loading, and a naive
 * "is there a hash?" test would then skip the cold open on every reload — the
 * app's most designed screen, discarded as a side effect of a share feature.
 * A language is not a destination; a person, a layout, a filter set or a
 * traced chain is.
 */
const VIEW_PARAMS = ['p', 'm', 'q', 'l', 'a', 'e', 'r', 'path', 'tie'] as const;

function parseSet<T extends string>(raw: string | null, valid: readonly T[]): Set<T> | undefined {
  if (raw === null || raw === '') return undefined;
  if (raw === EMPTY_SET) return new Set<T>();
  const allowed = new Set<string>(valid);
  const picked = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => allowed.has(s)) as T[];
  return picked.length ? new Set(picked) : undefined;
}

function parsePath(raw: string | null): PathRequest | null {
  if (!raw) return null;
  const [from, to] = raw.split(',').map((s) => s.trim());
  // Two distinct ends or nothing; whether the ids exist is the graph's call.
  if (!from || !to || from === to) return null;
  return { from, to };
}

/** `a~b~type`. The same tolerance as `path=`: shape is checked here, existence
 *  is the graph's call, and an unknown id degrades to no pinned line rather
 *  than to a throw. The type IS checked against the vocabulary, because it is a
 *  closed set and a typo in it would otherwise pin nothing with no clue why. */
function parseTie(raw: string | null, valid: readonly EdgeType[]): TieRequest | null {
  if (!raw) return null;
  const [a, b, type] = raw.split('~').map((s) => s.trim());
  if (!a || !b || !type || a === b) return null;
  if (!(valid as readonly string[]).includes(type)) return null;
  return { a, b, type: type as EdgeType };
}

export function readHash(opts: DeepLinkOptions): Partial<DeepLinkState> {
  if (typeof location === 'undefined') return {};
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return {};
  const p = new URLSearchParams(raw);
  const out: Partial<DeepLinkState> = {};

  if (p.get('p')) out.personId = p.get('p');
  const mode = p.get('m');
  if (mode && (MODES as string[]).includes(mode)) out.mode = mode as LayoutMode;
  if (p.get('q')) out.query = p.get('q') ?? '';
  const lang = p.get('lang');
  if (lang && (LANGS as string[]).includes(lang)) out.lang = lang as Lang;
  const path = parsePath(p.get('path'));
  if (path) out.path = path;
  const tie = parseTie(p.get('tie'), opts.allEdgeTypes);
  if (tie) out.tie = tie;

  const l = parseSet(p.get('l'), opts.allRepresents);
  if (l) out.represents = l;
  const a = parseSet(p.get('a'), opts.allCategories);
  if (a) out.categories = a;
  const e = parseSet(p.get('e'), opts.allEdgeTypes);
  if (e) out.edgeTypes = e;
  if (p.get('r') === '1') out.onlyReturning = true;

  return out;
}

function buildHash(s: DeepLinkState, opts: DeepLinkOptions): string {
  const p = new URLSearchParams();
  if (s.personId) p.set('p', s.personId);
  if (s.mode !== 'web') p.set('m', s.mode);
  if (s.query.trim()) p.set('q', s.query.trim());
  if (s.path) p.set('path', `${s.path.from},${s.path.to}`);
  if (s.tie) p.set('tie', `${s.tie.a}~${s.tie.b}~${s.tie.type}`);

  /* Only serialise a filter that is actually doing something — but "switched
     entirely off" IS something, and it is the state a reader is most likely to
     want to show someone ("watch what happens when you turn every relationship
     off"). Silence means complete; the sentinel means empty. */
  const partial = <T extends string>(set: Set<T> | undefined, all: readonly T[]): string | null => {
    if (!set || set.size === all.length) return null;
    if (set.size === 0) return EMPTY_SET;
    return all.filter((v) => set.has(v)).join(',');
  };

  const l = partial(s.represents, opts.allRepresents);
  if (l !== null) p.set('l', l);
  const a = partial(s.categories, opts.allCategories);
  if (a !== null) p.set('a', a);
  const e = partial(s.edgeTypes, opts.allEdgeTypes);
  if (e !== null) p.set('e', e);
  if (s.onlyReturning) p.set('r', '1');

  /* Last, and unconditional. The alternative — write it only when it differs
     from what this browser would have detected — reads well and does not work:
     an English reader whose own browser reports en-US produces a link with no
     language in it, which is precisely the reader whose Korean-speaking
     recipient gets the wrong atlas. The default is not a property of the
     sender's machine. */
  p.set('lang', s.lang);

  /* URLSearchParams percent-encodes the separator, so a shared link read
     `l=season1%2Cseason2&path=hong-jin-ho%2Ckwak-beom`. A comma is a legal
     sub-delimiter inside a fragment (RFC 3986 §3.5) and no id or filter value
     in this app contains one, so it is put back — this is a string a person
     pastes into a message, and it should look like the example at the top of
     this file rather than like a form submission.

     `~` gets the same treatment and needs it more: it is unreserved in RFC
     3986 §2.3 and legal anywhere in a fragment, but the urlencoded serialiser
     URLSearchParams implements only passes `*-._` through, so it writes
     `tie=hong-jin-ho%7Eha-seung-jin%7Ebetrayal` — measured, not assumed. It
     reads back correctly either way. `~` rather than a comma is deliberate:
     `path=a,b` and `tie=a~b~type` are different objects and should not look
     alike in an address bar. */
  return p.toString().replace(/%2C/g, ',').replace(/%7E/g, '~');
}

/** True when the page was opened on a link that already names a view. */
export function hasDeepLink(): boolean {
  if (typeof location === 'undefined') return false;
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return false;
  const p = new URLSearchParams(raw);
  return VIEW_PARAMS.some((k) => p.get(k) !== null);
}

export function useDeepLink(
  state: DeepLinkState,
  apply: (s: Partial<DeepLinkState>) => void,
  ready: boolean,
  opts: DeepLinkOptions,
): void {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const hydrated = useRef(false);
  const lastHash = useRef('');
  /* Set while we are the ones changing the hash, so our own write does not
     come back through the popstate/hashchange listener as a navigation. */
  const selfWrite = useRef(false);

  useEffect(() => {
    if (!ready || hydrated.current) return;
    hydrated.current = true;
    const initial = readHash(optsRef.current);
    lastHash.current = location.hash.replace(/^#/, '');
    if (Object.keys(initial).length) applyRef.current(initial);
  }, [ready]);

  useEffect(() => {
    if (!hydrated.current) return;
    const next = buildHash(state, optsRef.current);
    if (next === lastHash.current) return;

    /* A different person, a different layout or a different traced chain is a
       navigation; everything else is a refinement of the current one.

       The language is deliberately a refinement. It changes the register, not
       the destination — nothing about WHAT you are looking at moves — and this
       file already argues the same case against giving the search box eleven
       entries for 홍진호. The consequence is worth stating plainly rather than
       discovering: entries created before a language switch still carry the
       language they were created with, so a reader who browses in Korean,
       switches to English and then presses Back twice lands on Korean again.
       That is the URL being the source of truth, which is the whole point of
       the parameter; the alternative — Back restoring everything in the
       address except the language — is the half-measure this round removed. */
    const prev = new URLSearchParams(lastHash.current);
    /* Pinning a line is a navigation for the same reason opening a person is:
       it puts a full readout on screen, and Back has to be able to take it
       away again. Before this it was not in history at all, so Back from an
       open edge card either did nothing or jumped past the card to whatever
       the reader was looking at two selections ago. */
    const isNav =
      prev.get('p') !== (state.personId ?? null) ||
      prev.get('m') !== (state.mode === 'web' ? null : state.mode) ||
      prev.get('path') !== (state.path ? `${state.path.from},${state.path.to}` : null) ||
      prev.get('tie') !== (state.tie ? `${state.tie.a}~${state.tie.b}~${state.tie.type}` : null);

    lastHash.current = next;
    selfWrite.current = true;
    const url = next ? `#${next}` : location.pathname + location.search;
    if (isNav) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
    // The hashchange event fires asynchronously after our write.
    window.setTimeout(() => {
      selfWrite.current = false;
    }, 0);
  }, [state]);

  useEffect(() => {
    const onNav = () => {
      if (selfWrite.current) return;
      const raw = location.hash.replace(/^#/, '');
      if (raw === lastHash.current) return;
      lastHash.current = raw;
      const next = readHash(optsRef.current);
      const o = optsRef.current;
      /* Everything absent from the hash is restored to its default, because
         Back has to be able to undo a filter as well as apply one. `lang` is
         the exception and is passed through as-is — possibly undefined: a
         hand-written link with no language should be read in whatever language
         the reader is already in rather than snapping them somewhere they did
         not ask to go. A hash that DOES name a language is obeyed, including
         on Back; see the note in the write effect above. */
      applyRef.current({
        personId: next.personId ?? null,
        mode: next.mode ?? 'web',
        query: next.query ?? '',
        lang: next.lang,
        path: next.path ?? null,
        tie: next.tie ?? null,
        represents: next.represents ?? new Set(o.allRepresents),
        categories: next.categories ?? new Set(o.allCategories),
        edgeTypes: next.edgeTypes ?? new Set(o.allEdgeTypes),
        onlyReturning: next.onlyReturning ?? false,
      });
    };
    window.addEventListener('popstate', onNav);
    window.addEventListener('hashchange', onNav);
    return () => {
      window.removeEventListener('popstate', onNav);
      window.removeEventListener('hashchange', onNav);
    };
  }, []);
}
