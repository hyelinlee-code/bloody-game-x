import type {
  Duel,
  Edge,
  ExternalShow,
  GlossaryTerm,
  Person,
  PriorElsewhere,
  SeasonMeta,
  SeasonRun,
  XBilling,
} from './types';
import type {
  EdgeEn,
  GlossaryEn,
  PersonEn,
  SeasonMetaEn,
  SeasonRunEn,
} from './i18n/types';

/**
 * The works whose ENDINGS this atlas gives away, and the vocabulary for saying
 * which ones a reader has already seen.
 *
 * WHY THIS FILE EXISTS. A reader wrote in: "I have only watched the genius. And
 * would look to peruse through this but there are lots of spoilers?" They are
 * right. The atlas prints placements, elimination days, duel scorelines,
 * betrayals and winners' names for three seasons of this franchise and for a
 * dozen programmes outside it, and there has never been a way to hold any of it
 * back. `WorkId` is the unit that makes holding it back possible: one id per
 * work whose outcome could spoil somebody, and `scope: WorkId[]` on every claim
 * that leans on one — see the note at the head of types.ts.
 *
 * THIS FILE IS VOCABULARY, NOT BEHAVIOUR. Nothing under src/components,
 * src/graph or src/state imports it yet, and phase 1 does not wire it: the
 * accessors that spend this vocabulary are phase 2, the sealed strips are phase
 * 3, and the reader's control is phase 4. Until then this is a deliberately
 * open seam, and the only consumer is the validator.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE INCLUSION TEST — apply this before adding a line to WORKS below.
 * Settled in PHASE1-CONTRACT.md §1 so that three files could not each hold a
 * different one:
 *
 *   A WORK IS SPOILABLE IF IT IS A PROGRAMME WITH A WITHHELD OUTCOME THAT A
 *   VIEWER WATCHES IN ORDER. A career, a credential, an award and a one-off
 *   event are biography, not spoilers.
 *
 * Nobody is "part-way through" somebody's poker career. They can be three
 * episodes into a season. Three consequences, because each retires a different
 * part of the ~57 distinct titles this dataset names:
 *
 *   1. A ROLE IS NOT A RESULT. 참가 / 출연 / 고정 출연 / 진행 / 게스트 / 멘토 /
 *      창단 멤버 / 수석코치 are participation, and participation is kept — see
 *      PLAN-spoilers.md §2. So 데스게임: 천만원을 걸어라 and its sequel, 복면가왕,
 *      코미디 로얄, 더 인플루언서 and 대학전쟁 시즌1 are absent: every one is a
 *      competition, and for every one this dataset says only that the person was
 *      on it. If a result is ever written onto one of those rows, the validator
 *      fails for want of an id, which is the loud half of fail-closed.
 *
 *   2. A CAREER IS NOT A PROGRAMME. An Olympic gold, a WSOP bracelet, two WPT
 *      titles, a KBL scoring record, a perfect CSAT, the bar, a pageant sash, a
 *      first prize at a gugak competition. These are titles held in the world,
 *      settled once and never again in suspense. It is why roughly a dozen
 *      `priorElsewhere` blocks state a `result` and scope to `[]`, and why
 *      현성주's '세계 포커 대회 우승 경력자로' is a SPLIT rather than a tag: the
 *      clause is structure and the death match after it is `bg2`.
 *
 *   3. NEVER-BROADCAST IS NOT WITHHELD. 프로젝트 지니어스 was shot in May 2022
 *      and never released, and four of the twenty are on its cast list. There is
 *      no outcome to withhold because there is no programme to watch, and the
 *      edges built on it say so themselves — 이 선이 말하는 것은 결과가 아니라
 *      호출이다. The cast list is participation. No id.
 *
 * WHICH WAY DOUBT RESOLVES. Doubt about whether a string is a RESULT resolves
 * toward inclusion: if you cannot tell, it is a result. Doubt about whether the
 * thing is a PROGRAMME resolves toward exclusion — the control asks the reader
 * what they have watched, so an id nobody can answer for is, under fail-closed,
 * a claim sealed permanently against every reader. That is a hole, not a
 * protection.
 *
 * GRANULARITY: ONE ID PER WORK AS THE DATASET ITSELF ROWS IT. 더 지니어스 is
 * four rows in `otherShows`, so it is four ids; 쇼미더머니 is five rows, so it
 * is five. 포커 신들의 전쟁 is ONE row covering 시즌2 and 시즌3, so it is one id
 * — splitting it here would invent a distinction the data does not make and
 * would leave one half of it with nothing to point at. Follow the rows; when
 * the rows change, change this.
 *
 * SEASON X IS NOT HERE AND NEVER WILL BE. The firewall against the unaired
 * season works by EXCLUDING the data, and `tools/validate-data.mjs` §8 fails the
 * build if X material appears anywhere. That is a hard guarantee. This file is a
 * display-time redaction layer, which is a weaker one. Modelling X as a
 * `WorkId` would quietly demote the hard guarantee to the weak one, so X is not
 * a scope, is not redactable, and is simply not in the dataset.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * One segment of a string that changes scope halfway through.
 *
 * THE INVARIANT, AND IT IS THE WHOLE DESIGN: the concatenation of a field's
 * parts must equal that field's own string BYTE FOR BYTE —
 * `parts.map((p) => p.text).join('') === arc` — with no separator inserted and
 * nothing trimmed. `tools/validate-data.mjs` asserts it.
 *
 * That is what makes this phase invisible by construction rather than by
 * promise. No renderer reads a `*Parts` field yet; when phase 3 does, joining
 * every part reproduces today's string character for character, so the only way
 * a split can change the page is by being wrong, and being wrong fails the
 * build. Splitting is therefore safe to do in bulk, ahead of any renderer.
 *
 * `scope` is REQUIRED on a part. A part exists because somebody decided where
 * the claim changes; there is no such thing as a part nobody has looked at, and
 * an optional scope here would reintroduce the silence the split was made to
 * remove. Structure parts carry `[]`.
 *
 * Split at sentence boundaries, and only where both halves stand alone. Keep
 * the separating space in one of the two parts — the invariant will tell you if
 * you dropped it. A fragment is worse than a coarse tag: leave it whole and say
 * so in the handoff.
 */
export interface ProsePart {
  text: string;
  scope: WorkId[];
}

/** One work in the registry below. */
export interface Work {
  /** Title in Korean — the dataset's language of record. */
  titleKo: string;
  /**
   * The same title in English. Where the dataset already carries the programme
   * as an `ExternalShow.show`, this is spelled EXACTLY as that field spells it:
   * `show` is headToHead.ts's join key, and two spellings of one programme is
   * the failure that file's own header exists to prevent.
   */
  titleEn: string;
  /**
   * Which axis of the reader's control this sits on, and the two axes are
   * shaped differently because viewing is shaped differently.
   *
   *   'franchise' — a season of 피의 게임 itself. ORDINAL: seasons air in order
   *                 and people watch them in order, so the control is a ladder
   *                 with four stops (none → S1 → S2 → S3).
   *   'outside'   — everything else. UNORDERED: nobody watches 대학전쟁 because
   *                 they finished 쇼미더머니, so the control is a checklist.
   */
  kind: 'franchise' | 'outside';
  /**
   * Slug shared by every season of one programme, so a checklist can collapse
   * five 쇼미더머니 rows under one heading without matching on title strings.
   * Absent for one-off works.
   *
   * IT IS NOT A SCOPE AND MUST NOT BECOME ONE. A reader who saw 대학전쟁 시즌1
   * and not 시즌3 has to be able to say so; grouping is presentation, and the
   * unit that unlocks a claim stays the season.
   */
  group?: string;
  /** Broadcast year or range, as the dataset states it. */
  year?: string;
}

/**
 * Every work whose outcome this atlas gives away.
 *
 * `WorkId` is derived from these keys rather than written out beside them, so
 * the union cannot drift from the registry and a work cannot be tagged before
 * it has a title to show in the control.
 */
export const WORKS = {
  /* ── the franchise ladder ─────────────────────────────────────────────────
     Titles are spelled as headToHead.ts's SEASON_TITLE spells them, which is
     what the ledger already prints beside a result. */

  /** Winner, four ranked runs, a prize figure, and the day-3 eviction. */
  bg1: { titleKo: '피의 게임 시즌1', titleEn: 'Bloody Game season 1', kind: 'franchise', group: 'bloody-game', year: '2021–22' },
  /** Winner, seven ranked runs, three authored duels, the raid, the payout. */
  bg2: { titleKo: '피의 게임2', titleEn: 'Bloody Game 2', kind: 'franchise', group: 'bloody-game', year: '2023' },
  /** Winner (outside this cast), four ranked runs, and the dealer reveal. */
  bg3: { titleKo: '피의 게임3', titleEn: 'Bloody Game 3', kind: 'franchise', group: 'bloody-game', year: '2024–25' },

  /* ── 더 지니어스 ──────────────────────────────────────────────────────────
     The four seasons carry every ranked non-franchise finish in the dataset:
     these are the ONLY `ExternalShow` rows with a `rank`, so they are the only
     rows headToHead.ts can build an outside-the-franchise field result from.
     They are also what the reader who wrote in has actually watched. */

  /** 홍진호 우승 (가넷 79개, 상금 7,900만 원); 이상민 3위. */
  'genius-1': { titleKo: '더 지니어스: 게임의 법칙', titleEn: 'The Genius: Rules of the Game', kind: 'outside', group: 'genius', year: '2013' },
  /** 이상민 우승 (가넷 62개, 결승에서 임요환); 홍진호 중반 탈락. */
  'genius-2': { titleKo: '더 지니어스: 룰 브레이커', titleEn: 'The Genius: Rule Breaker', kind: 'outside', group: 'genius', year: '2014' },
  /** 김유현 5위, 김경훈 12위, and both death matches that produced them. */
  'genius-3': { titleKo: '더 지니어스: 블랙가넷', titleEn: 'The Genius: Black Garnet', kind: 'outside', group: 'genius', year: '2014' },
  /** 김경훈 준우승, 홍진호 4위, 김유현 9위, 이상민 3화 탈락 — and the two
   *  authored duels in edges.ts that are not franchise duels. */
  'genius-4': { titleKo: '더 지니어스: 그랜드 파이널', titleEn: 'The Genius: Grand Final', kind: 'outside', group: 'genius', year: '2015' },

  /* ── 쇼미더머니 ───────────────────────────────────────────────────────────
     Five seasons, five rows, five eliminations-or-better. An elimination round
     is a result under the plan's own table, so these are in even though the
     genre is not the one this atlas is about. */

  /** 서출구 4차 예선 탈락. */
  'smtm-4': { titleKo: '쇼미더머니 4', titleEn: 'Show Me The Money 4', kind: 'outside', group: 'smtm', year: '2015' },
  /** 서출구 준결승 진출 — the season that made his name. */
  'smtm-5': { titleKo: '쇼미더머니 5', titleEn: 'Show Me The Money 5', kind: 'outside', group: 'smtm', year: '2016' },
  /** 윤비 3차 예선 탈락. */
  'smtm-6': { titleKo: '쇼미더머니 6', titleEn: 'Show Me The Money 6', kind: 'outside', group: 'smtm', year: '2017' },
  /** 윤비 음원 미션 탈락. */
  'smtm-777': { titleKo: '쇼미더머니 777', titleEn: 'Show Me The Money 777', kind: 'outside', group: 'smtm', year: '2018' },
  /** 윤비 크루 리벤지 배틀 탈락. */
  'smtm-8': { titleKo: '쇼미더머니 8', titleEn: 'Show Me The Money 8', kind: 'outside', group: 'smtm', year: '2019' },

  /* ── other survivals, and two dating shows ───────────────────────────────
     A dating format's ending is who ends up with whom, which is exactly what
     the two rows below state. The plan's §2 line — participation is kept, the
     outcome is not — reads the same way here as it does for a death match. */

  /** 김남희 2일차 탈락, and that the remaining 홍황존 three reached the final. */
  'time-hotel': { titleKo: '더 타임호텔', titleEn: 'The Time Hotel', kind: 'outside', group: 'time-hotel', year: '2023' },
  /** 강지후 카이스트팀 3위, plus the champion and runner-up teams and the
   *  8,000만 원 prize. 시즌1 has no result anywhere here, so it has no id. */
  'university-war-3': { titleKo: '대학전쟁3', titleEn: 'University War 3', kind: 'outside', group: 'university-war', year: '2025–26' },
  /** 윤비 우승 — the one survival outside this franchise that a member of this
   *  cast has won, and the credit the atlas leans on to explain his season 2. */
  'survival-men-women': { titleKo: '생존남녀: 갈라진 세상', titleEn: 'Survival Men and Women', kind: 'outside' },
  /** 김경훈 공동 3위. */
  'golden-spoon-war': { titleKo: '금수저 전쟁', titleEn: 'Golden Spoon War', kind: 'outside', year: '2024' },
  /** 홍진호 시즌2 인비테이셔널 우승 — stated three times over, on his own row,
   *  in 현성주's prose and on the edge between them. One id for both seasons,
   *  because the dataset rows them as one. */
  'poker-gods': { titleKo: '포커 신들의 전쟁', titleEn: 'War of the Poker Gods', kind: 'outside', year: '2021–23' },
  /** 최혜선 × 이관희 최종 커플, and that it did not survive the broadcast. */
  'singles-inferno-3': { titleKo: '솔로지옥3', titleEn: 'Single’s Inferno 3', kind: 'outside', year: '2023–24' },
  /** 신승용 × 곽민경 — a real couple, which is this format's ending. */
  'exchange-4': { titleKo: '환승연애4', titleEn: 'EXchange 4', kind: 'outside', year: '2025–26' },
} as const satisfies Record<string, Work>;

/**
 * One id per work whose outcome could spoil somebody. Closed by construction:
 * it is the registry's own key set, so there is no second list to keep in step.
 */
export type WorkId = keyof typeof WORKS;

/** Every id, in registry order — franchise ladder first, then the checklist. */
export const ALL_WORK_IDS: readonly WorkId[] = Object.keys(WORKS) as WorkId[];

/**
 * What a reader has watched. A set rather than an array because `isVisible` is
 * called once per claim per frame and must not be a linear scan.
 */
export type WatchedSet = ReadonlySet<WorkId>;

/** The default a first-time visitor arrives on. Nothing seen, nothing shown. */
export const WATCHED_NONE: WatchedSet = new Set<WorkId>();

/**
 * May a claim carrying `scope` be shown to a reader who has watched `watched`?
 *
 * THREE ANSWERS, AND THE FIRST ONE IS THE WHOLE POINT:
 *
 *   `undefined` → NO. An untagged claim is hidden. Silence is not consent: a
 *      forgotten tag has to degrade to over-redaction, which somebody reports
 *      as annoying, rather than to a leak, which nobody reports until another
 *      reader writes in. `tools/validate-data.mjs` makes the tag mandatory on
 *      outcome-bearing fields precisely so that this branch stays theoretical —
 *      fail closed at runtime, fail loud in CI.
 *
 *   `[]` → YES. An empty array is an author's ASSERTION that nothing in this
 *      record's outcome-bearing fields is at stake, and it is deliberately a
 *      different value from `undefined`. Do not collapse the two: one is
 *      somebody having looked, the other is nobody having looked.
 *
 *   a list → yes only if the reader has seen EVERY work in it. Conjunctive, not
 *      disjunctive. A sentence that leans on two endings is safe only for
 *      someone who knows both, and where the AND over-redacts, the fix is to
 *      SPLIT the claim (see types.ts on splitting) rather than to weaken this.
 */
export function isVisible(scope: readonly WorkId[] | undefined, watched: WatchedSet): boolean {
  if (scope === undefined) return false;
  for (const id of scope) if (!watched.has(id)) return false;
  return true;
}

/**
 * The works standing between this reader and this claim.
 *
 * A sealed block has to be able to NAME its own scope — `시즌 2 기록 · 가려짐 ·
 * 보기` — because naming it is what tells the reader this is a setting they
 * chose rather than a bug, and what makes the one-click override legible. A
 * grey blob reads as broken. Returns `[]` for a visible claim, and every id for
 * an untagged one, which is the honest answer: nothing is known about what
 * would unlock it.
 */
export function missingFrom(scope: readonly WorkId[] | undefined, watched: WatchedSet): WorkId[] {
  if (scope === undefined) return [...ALL_WORK_IDS];
  return scope.filter((id) => !watched.has(id));
}

/**
 * One segment of a paragraph that changes scope halfway through.
 *
 * THE INVARIANT IS BYTE IDENTITY: for any field `f` with a `fParts`, the parts
 * concatenated with no separator must equal `f` exactly —
 * `parts.map(p => p.text).join('') === f`. `tools/validate-data.mjs` asserts it.
 *
 * That single rule is what makes this phase invisible BY CONSTRUCTION rather
 * than by promise. Nothing renders parts yet; the plain string is still the only
 * thing on screen. When phase 3 starts rendering them, a reader who has watched
 * everything gets every part joined back, and joining them reproduces today's
 * paragraph character for character — including its spaces, its ellipses and
 * its em dashes, which is why the join takes no separator and why a part may
 * legitimately begin or end with a space.
 *
 * WHY SPLIT AT ALL, when a union of scopes is one line of authoring and this is
 * several. Because the union is not free. 윤비's season 2 arc opens on the
 * 생존남녀 win he arrived with; unioned, a reader who watched season 2 and not
 * 생존남녀 loses the entire season 2 account to protect one clause about a
 * different programme. Over-redaction is the right side to fail toward when
 * hiding and leaking are the only two options. It is not something to accept
 * when a third option costs a sentence boundary.
 *
 * SPLIT AT SENTENCE BOUNDARIES, AND ONLY WHERE BOTH SIDES STAND ALONE. A
 * fragment that reads as a broken clause is worse than a coarse tag: it makes
 * the app look broken rather than careful. Leave those whole and report them.
 *
 * `scope` is REQUIRED on a part, not optional. A part is written by somebody who
 * has just decided where the scope changes, so there is no such thing as a part
 * whose scope nobody has looked at.
 */
export interface ProsePart {
  text: string;
  scope: WorkId[];
}

/**
 * WHICH FIELDS ARE OUTCOMES — the manifest the validator and, later, the
 * accessors read instead of each keeping their own list.
 *
 * The record carries a default `scope`, a `scopes` map overrides it per field,
 * and `*Parts` splits one string into segments. None of those three say WHICH
 * fields are at stake in the first place. This does, once, so that "an outcome
 * field with no scope" is a decidable condition a check can run rather than a
 * judgement somebody has to make 168 times by hand.
 *
 * IT IS TYPE-CHECKED AGAINST THE INTERFACES ON PURPOSE. Rename a field in
 * types.ts and this file stops compiling, which is the interlock a docblock
 * cannot be. Everything NOT listed here is structure and is always shown:
 * names, occupations, categories, blocs, air dates, formats, premises, hooks,
 * episode counts, strength, confidence, citations, `Edge.source`/`target`/
 * `season`, and the plain fact that a person appeared in a season at all.
 *
 * THE SCOPE FIELDS THEMSELVES ARE NEVER LISTED. `scope`, `scopes` and `*Parts`
 * are the machinery, not the claim.
 */
type FieldsOf<T> = readonly (keyof T)[];

export const OUTCOME_FIELDS = {
  /** A run is wholly about one season, so its scope is that one season's id. */
  SeasonRun: [
    'placement',
    'rank',
    /* The denominator, and therefore the calibration that turns the portrait
       plate's arc length back into a placing. Withholding the rank and keeping
       this still leaks the finish; see PLAN-spoilers.md §3. */
    'fieldSize',
    'eliminatedEpisode',
    'eliminatedEpisodeEn',
    'arc',
    'beats',
    /* JUDGEMENT CALL. A team name looks structural and is not: '저택팀 → 야생팀'
       is a defection written as an arrow, and '히든 플레이어 (저택 잠입)' is the
       season 2 twist stated on the person it was a twist about. */
    'team',
    'teamEn',
    /* `role` is deliberately absent. The plan's third arc state exists so that a
       redacted contestant is not drawn with the beaded mark that means
       "present, not competing" — which requires the painters to still know
       which of the three a run is. Sealing `role` would take that away and make
       the app assert that 이태균 was a panellist. The cost is named in the
       handoff: 박지민's season 3 crew seat was a production twist held back to
       episode 6, and it survives in `role` after `placement` and `arc` are
       sealed. */
  ] as const satisfies FieldsOf<SeasonRun>,

  /** `show` / `showKo` / `year` stay visible: they are participation, and
   *  `show` is headToHead.ts's join key across the two i18n halves of a row. */
  ExternalShow: ['result', 'resultEn', 'rank', 'fieldSize'] as const satisfies FieldsOf<ExternalShow>,

  PriorElsewhere: [
    'result',
    'resultEn',
    'arc',
    'arcEn',
    /* JUDGEMENT CALL, and the opposite of the ExternalShow line above. This
       `show` is not a programme title, it is an editorial headline — 'The route,
       not the job', '카메라 앞에 서기 전의 십오 년' — and some of those headlines
       ARE the outcome: '진 경연 셋, 이긴 서바이벌 하나' / 'Three cyphers lost,
       one survival won' states three eliminations and a win in the title bar.
       Nothing joins on this field, so it can be sealed without breaking a
       lookup. */
    'show',
    'showKo',
  ] as const satisfies FieldsOf<PriorElsewhere>,

  /** A duel is a verdict end to end — who won, where, by how much — so every
   *  field is listed and a redacted duel is suppressed as a record rather than
   *  emptied out field by field. `season` is included for the same reason: on a
   *  pair with exactly one duel, naming the season names the verdict's venue. */
  Duel: ['winner', 'season', 'where', 'whereEn', 'score'] as const satisfies FieldsOf<Duel>,

  Edge: [
    /* A line between two people is structure. `betrayal` is a verdict and
       `directed` is a verdict with a direction — both degrade to a neutral tie,
       which is why the type itself is listed and `source`/`target`/`season`
       are not. */
    'type',
    'directed',
    'label',
    'labelEn',
    'description',
    /* `outcomes` is NOT listed, and that is not an oversight. A `Duel` is its
       own record with its own scope, so a pair with two duels in two different
       works can show one and seal the other. Listing it here would put the
       whole array behind the edge's tag and lose that. */
  ] as const satisfies FieldsOf<Edge>,

  /** Premise, format, hook, network, air dates and episode counts are kept —
   *  they are the season, not its ending. `prize` is here because season 1's
   *  string is what the winner actually took home. */
  SeasonMeta: [
    'winnerId',
    'winnerNameKo',
    'winnerNameEn',
    'signatureMoment',
    'prize',
  ] as const satisfies FieldsOf<SeasonMeta>,

  /** The billing line is a one-sentence tease and it is usually the tease of a
   *  result — '첫 번째 우승자', '앞의 한 명은 우승했다'. The bloc and its labels
   *  are the pre-premiere casting announcement and stay. */
  XBilling: ['billing', 'billingEn'] as const satisfies FieldsOf<XBilling>,

  /** `bio` and `notableFor` are where a dossier states a franchise result
   *  before any table does — '피의 게임 시즌1의 최종 우승자'. The nested records
   *  (`priorSeasons`, `otherShows`, `priorElsewhere`, `x`) carry their own. */
  Person: ['bio', 'notableFor'] as const satisfies FieldsOf<Person>,

  /** The glossary looks like format vocabulary and three of its entries are not:
   *  상금, 개인 자금 and 승자독식 reconcile the prize against named people and
   *  their finishes. */
  GlossaryTerm: ['meaning'] as const satisfies FieldsOf<GlossaryTerm>,
};

/**
 * The same manifest for the English layer in `i18n/types.ts`.
 *
 * IT IS A SEPARATE LIST BECAUSE THE ENGLISH LAYER IS SEPARATE PROSE. These
 * blocks are authored rather than translated and have more than once said more
 * than the Korean — 김유현's entire English dossier was written on a false
 * premise about him and stayed live until a reader reported it. So the English
 * side gets its own fields checked for their own scopes.
 *
 * A VALIDATOR MAY NOT COMPARE THE TWO SIDES' SCOPE VALUES. Each side must carry
 * a scope wherever that side needs one; whether the values match is not a
 * defect, it is the point. 박지민's season 3 beats are `[structure, bg3,
 * structure]` in Korean and `[structure, bg1+bg3, structure]` in English,
 * because the English bullet reaches back to season 1 and the Korean one does
 * not. A parity check would look like rigour and would force one of the two to
 * lie — toward the coarser tag, which is the leak.
 *
 * `PersonEn.occupation`, `aka` and `realName` are absent for the same reason
 * their Korean counterparts are: what somebody does and what they are called is
 * not how they finished. `FranchiseEn` is absent because premise, lineage and
 * reception describe a genre and name no result.
 */
export const OUTCOME_FIELDS_EN = {
  PersonEn: ['bio', 'notableFor'] as const satisfies FieldsOf<PersonEn>,
  SeasonRunEn: ['placement', 'arc', 'beats'] as const satisfies FieldsOf<SeasonRunEn>,
  EdgeEn: ['label', 'description'] as const satisfies FieldsOf<EdgeEn>,
  /** `hook`, `format` and `episodes` are the season's shape, not its ending. */
  SeasonMetaEn: ['prize', 'signatureMoment'] as const satisfies FieldsOf<SeasonMetaEn>,
  GlossaryEn: ['meaning'] as const satisfies FieldsOf<GlossaryEn>,
};

/* ── the interlock ──────────────────────────────────────────────────────────
 *
 * Two lists now describe the same set of fields: the manifests above, which the
 * validator reads at runtime, and the `scopes` shape on each interface, which is
 * what an author actually types into. A field added to one and forgotten in the
 * other is the failure this repo has shipped three times in other forms — a
 * complete data layer with no consumer, an edge type with no filter entry, a fit
 * rule copied into a second painter — and in this one it is worse than cosmetic:
 * a field with a `scopes` slot and no manifest entry is a field the validator
 * will never demand a scope for, which is a silent hole in fail-closed.
 *
 * `satisfies FieldsOf<…>` above already catches a manifest entry that is not a
 * field. This catches the other two directions at once, in both languages.
 * Resolve any error here by editing the pair, never by editing this.
 *
 * `Duel`, `GlossaryTerm` and `GlossaryEn` are absent on purpose: each is a
 * single-scope record with no `scopes` object, because a duel is a verdict end
 * to end and a glossary entry has exactly one field worth scoping.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Fails to instantiate, with the offending key names in the error, unless T is `never`. */
type MustBeNever<T extends never> = T;
/** The `scopes` keys an interface actually offers an author. */
type ScopesOf<T extends { scopes?: unknown }> = keyof NonNullable<T['scopes']>;
type Listed<K extends keyof typeof OUTCOME_FIELDS> = (typeof OUTCOME_FIELDS)[K][number];
type ListedEn<K extends keyof typeof OUTCOME_FIELDS_EN> = (typeof OUTCOME_FIELDS_EN)[K][number];
/** Keys on one side and not the other, in either direction. */
type Drift<L extends PropertyKey, O extends PropertyKey> = Exclude<L, O> | Exclude<O, L>;

/**
 * Must be `never`. Exported so `noUnusedLocals` keeps it, and so a reader can
 * hover it to see which side is missing what.
 */
export type ScopeManifestDrift =
  | MustBeNever<Drift<Listed<'SeasonRun'>, ScopesOf<SeasonRun>>>
  | MustBeNever<Drift<Listed<'ExternalShow'>, ScopesOf<ExternalShow>>>
  | MustBeNever<Drift<Listed<'PriorElsewhere'>, ScopesOf<PriorElsewhere>>>
  | MustBeNever<Drift<Listed<'Edge'>, ScopesOf<Edge>>>
  | MustBeNever<Drift<Listed<'SeasonMeta'>, ScopesOf<SeasonMeta>>>
  | MustBeNever<Drift<Listed<'XBilling'>, ScopesOf<XBilling>>>
  | MustBeNever<Drift<Listed<'Person'>, ScopesOf<Person>>>
  | MustBeNever<Drift<ListedEn<'PersonEn'>, ScopesOf<PersonEn>>>
  | MustBeNever<Drift<ListedEn<'SeasonRunEn'>, ScopesOf<SeasonRunEn>>>
  | MustBeNever<Drift<ListedEn<'EdgeEn'>, ScopesOf<EdgeEn>>>
  | MustBeNever<Drift<ListedEn<'SeasonMetaEn'>, ScopesOf<SeasonMetaEn>>>;
