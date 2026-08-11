import type { ProsePart, WorkId } from './works';

/**
 * Data model for the Bloody Game X cast atlas.
 *
 * SCOPE RULE — read before editing this dataset:
 *   • The NODES are the announced cast of 피의 게임X (Bloody Game X, 2026).
 *     Their identities and the official pre-premiere lineup are public info.
 *   • The EDGES and the biography are drawn exclusively from BEFORE X:
 *     seasons 1–3 of the franchise, other programmes, and real-life history.
 *   • Nothing that happens INSIDE season X may appear anywhere: no results,
 *     eliminations, standings, alliances formed in X, mission outcomes, or
 *     episode events. If you are unsure whether a fact is pre-premiere, leave
 *     it out.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `scope` — WHAT YOU MUST HAVE WATCHED FOR A CLAIM TO BE SAFE
 *
 * The rule above is a firewall against ONE season and it works by exclusion.
 * Seasons 1–3 cannot be excluded — the readers who have watched them are who
 * this atlas is for — so the second firewall is a redaction layer at display
 * time, and `scope` is what it reads.
 *
 * `scope?: WorkId[]` says: these are the works whose outcomes this record's
 * OUTCOME-BEARING FIELDS lean on. Which fields those are is declared once, per
 * interface, in `OUTCOME_FIELDS` in works.ts — not repeated here, and not left
 * to each reader of the data to decide. Everything not on that manifest is
 * structure and is always shown.
 *
 * PARTICIPATION IS NOT A SPOILER; THE OUTCOME IS. That a person was in a
 * season, that a tie exists between two people, where they met, what they do
 * for a living, what a season's format was — all kept. How they finished it,
 * which day they went out, who betrayed whom, who won — all scoped.
 *
 * OPTIONAL HERE, MANDATORY IN CI, AND THAT SPLIT IS DELIBERATE. The property is
 * `?` so that adding it could not break a build in the phase that introduced
 * it. `tools/validate-data.mjs` is what makes it required on any record with an
 * outcome-bearing field. At runtime an absent scope resolves to HIDDEN
 * (`isVisible(undefined, …) === false`), so a forgotten tag degrades to
 * over-redaction, which someone reports, rather than to a leak, which nobody
 * reports until another reader writes in. Fail closed at runtime, fail loud in
 * CI. An empty array is NOT the same as an absent one: `[]` is an author
 * asserting that nothing is at stake, and it is checkable.
 *
 * MULTIPLE IDS ARE ANDed, SO SPLIT RATHER THAN WIDEN. A record scoped
 * `['genius-1', 'genius-4']` is shown only to a reader who has seen both. Where
 * that over-redacts, split; there are three levels of it and you reach for them
 * in this order.
 *
 *   1. `scope` — the RECORD's default, and the answer for most records. A
 *      season-2 run is `['bg2']`. One tag per record, because a record is the
 *      unit an editor authors and a per-field map is a per-field opportunity to
 *      forget one.
 *
 *   2. `scopes` — PER-FIELD OVERRIDES, written only where a field differs from
 *      the default. Per-field alone is unauthorable across sixteen runs in two
 *      languages; per-record alone cannot express a panel run whose `placement`
 *      is the role label '스튜디오 패널' and gives nothing away. So both.
 *
 *      ARRAY-VALUED PROSE IS SCOPED PER ENTRY, aligned by index — `beats` and
 *      `notableFor` take `WorkId[][]`, one scope per bullet. One scope over an
 *      array hides safe bullets to protect one unsafe one, and these arrays mix
 *      freely: '「더 지니어스: 룰 브레이커」 우승' and '룰라 리더 겸 프로듀서'
 *      are two entries of the same `notableFor` and need opposite treatment.
 *
 *   3. `*Parts` — ORDERED SEGMENTS of one string, for the paragraph that
 *      changes scope halfway through. `arcParts`, `bioParts`,
 *      `descriptionParts`. See `ProsePart` in works.ts: the concatenation of
 *      the parts must equal the original string BYTE FOR BYTE, and the
 *      validator asserts it. That invariant is what makes this phase invisible
 *      by construction rather than by promise — nothing renders the parts yet,
 *      and when phase 3 does, joining all of them reproduces today's string
 *      character for character.
 *
 *      Split at sentence boundaries and only where both halves stand alone. A
 *      fragment is worse than a coarse tag; leave it whole and report it.
 *
 * The arrays were already a split surface before any of this: `priorElsewhere`,
 * `otherShows` and `outcomes` are lists, and a pair may carry two edges. 김유현
 * carries one `PriorElsewhere` per Genius season rather than one about two,
 * which is the pattern to copy when a new block is written.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Prior seasons of the franchise. X is never a value here — by design. */
export type SeasonNumber = 1 | 2 | 3;

/** Broad archetype used for colour-coding and filtering. */
export type Category =
  | 'comedian'
  | 'athlete'
  | 'esports'
  | 'creator'
  | 'broadcaster'
  | 'musician'
  | 'poker'
  | 'professional'
  | 'actor'
  | 'other';

/**
 * What someone was doing in a season they were not playing.
 *
 * This used to be `'contestant' | 'host'`, so anybody who was not competing
 * became a host — and neither of the two people it applied to hosted anything.
 * 이상민 sat on season 1's studio panel (브레인 군단) and never entered the
 * house; 박지민 appeared in season 3 as the 유령 카지노 dealer and 연옥 집사,
 * which namu.wiki files as 보조 출연 and which production hid as a twist until
 * episode 6. The plate drew both with the ring the field guide calls
 * "진행을 맡았던 사람 / has hosted", so the app asserted something untrue about
 * two real people, and the one who noticed was a reader.
 *
 * The distinction is not cosmetic — it decides whether they could have MET the
 * cast. A panellist watched on a monitor from another building. A dealer sat at
 * a table the players were sent to. Section 0e of the validator leans on that,
 * and so does the phrasing of every `co-season` edge.
 */
export type Role =
  /** Played for the prize. */
  | 'contestant'
  /** Commentated from the studio. Never in the house. */
  | 'panel'
  /** On screen inside the game as a non-playing figure — a dealer, a butler. */
  | 'crew';

/**
 * Was this a run at the prize?
 *
 * Every surface that prints a rank, a medal or a field size has to ask this,
 * and eight of them asked it by writing `role === 'host'` inline — which is how
 * a two-value union quietly became the assertion that a studio panellist and a
 * casino dealer both hosted a season. One predicate, imported, so widening the
 * union again cannot leave nine different answers behind.
 */
export function played(run: { role: Role }): boolean {
  return run.role === 'contestant';
}

/** Present that season without competing — the studio panel or the house's own
    non-playing figures. The inverse of `played`, named so call sites read as a
    claim rather than as a negation. */
export function watched(run: { role: Role }): boolean {
  return !played(run);
}

/**
 * The third-person pronoun set the English prose may use for a person.
 *
 * `they` is a real answer, not a fallback: for two of this cast the repo holds
 * no source establishing gender at all, and stating `they` is more honest than
 * inheriting a guess from a name.
 */
export type Pronouns = 'he' | 'she' | 'they';

/**
 * Per-field scope overrides for one `SeasonRun`. Write a key ONLY where that
 * field differs from the run's own `scope`; absent means "use the default".
 *
 * The two fields that most often need one are `placement` and `team`, and both
 * for the same reason — they hold a role label as often as a result.
 */
export interface SeasonRunScopes {
  /** `[]` for the role labels: '스튜디오 패널', '유령 카지노 딜러 · 연옥 집사'. */
  placement?: WorkId[];
  rank?: WorkId[];
  /**
   * TAKES THE SAME SCOPE AS `rank`, ALWAYS. The portrait plate draws arc length
   * as `rank / fieldSize`, which is exactly invertible: hide the rank, keep the
   * denominator public, and the arc still states the finish. PLAN-spoilers.md
   * §3 is the long version. Drawing that safely is phase 3's problem; carrying
   * the information is this phase's, and phase 3 cannot do it if phase 1 did
   * not.
   */
  fieldSize?: WorkId[];
  eliminatedEpisode?: WorkId[];
  eliminatedEpisodeEn?: WorkId[];
  /**
   * A team NAME is structure — '저택팀', '낙원'. An ARROW between two team
   * names is a plot: '저택팀 → 야생팀' is a defection, '피의 저택 → 지하 감옥 →
   * 복귀' is an elimination and a return, '지하팀 (8일차 지상 복귀)' names the
   * day, and '히든 플레이어 (저택 잠입)' is the season 2 twist stated on one of
   * the people it was a twist about. Four runs at least.
   */
  team?: WorkId[];
  teamEn?: WorkId[];
  arc?: WorkId[];
  /**
   * ALIGNED WITH `beats`, one scope per beat, in the same order. Not one scope
   * for the array: 박지민's season 3 beats are structure, bg3, structure, and an
   * array-level tag would seal two safe bullets to protect the middle one.
   */
  beats?: WorkId[][];
}

/** One person's run through one earlier season. */
export interface SeasonRun {
  season: SeasonNumber;
  /** Which side of the house they played on, e.g. "저택팀 → 야생팀". */
  team?: string;
  /** The same side, in English. Set whenever `team` is set. */
  teamEn?: string;
  /** Human-readable finish, e.g. "우승 · Winner" or "Ep.7 eliminated". */
  placement: string;
  /** Numeric rank when known; 1 = winner. Drives medals and sorting. */
  rank?: number;
  eliminatedEpisode?: string;
  /** The same exit line, in English. Set whenever `eliminatedEpisode` is set. */
  eliminatedEpisodeEn?: string;
  role: Role;
  /**
   * How many contestants started that season — 10, 13 and 18 for seasons 1, 2
   * and 3. A rank only means something against the size of the field it was
   * taken from, so anything that draws rank as a length (the portrait plate)
   * should normalise against this rather than a constant. Host and panel runs
   * carry no rank and must not be drawn on the rank ramp at all.
   */
  fieldSize?: number;
  /** What they actually did that season: strategy, key plays, betrayals. */
  arc: string;
  /** Two or three surgical bullets — the moments people remember. */
  beats?: string[];
  /**
   * Where this run was adjudicated from. The arcs below carry the most
   * claim-dense prose in the dataset — 58칩 대 12칩, 17:24, 상금 1억 800만 원 —
   * and they were the only long-form text in it with no citation surface:
   * `PriorElsewhere` has had `sources` since it was written, and the dossier's
   * "출처" button resolves to `Person.sources`, which is the casting
   * announcement and the franchise index page, not the per-day result table an
   * arc was actually written from. An atlas that shows a confidence field and
   * calls its lines 확인된 has to be able to answer "where does 4위 come from"
   * on the one screen where a fan will argue with it.
   *
   * Cite the narrowest page that carries the claim: the per-day page when the
   * arc turns on a day (시즌1 3/4/8일차), the person's own 피의 게임 subpage when
   * one exists, the season's 진행 결과 / 참가자 table otherwise.
   */
  sources?: string[];
  /**
   * The default for every outcome-bearing field on this run. Always the one
   * franchise season the run belongs to — `['bg2']` for a `season: 2` run —
   * because a run is wholly about one season.
   *
   * `[]` IS A REAL ANSWER HERE, for the two runs that are not runs at the
   * prize. 이상민's season 1 `placement` is '스튜디오 패널' and 박지민's season 3
   * is '유령 카지노 딜러 · 연옥 집사'; those are role labels, not finishes, and
   * a reader who has watched nothing loses nothing by seeing them. Per-field
   * `scopes` is how a run that is mostly structure keeps the one clause that
   * is not.
   */
  scope?: WorkId[];
  /** Only where a field differs from `scope`. */
  scopes?: SeasonRunScopes;
  /**
   * `arc` split at the points where its scope changes, concatenating back to
   * `arc` byte for byte.
   *
   * Most arcs need none — a run's arc is about that run's season and takes the
   * run's scope whole. The ones that do are the arcs that open on biography
   * before they reach the house: 현성주's season 2 arc begins '세계 포커 대회
   * 우승 경력자로' — a career, structure, `[]` — and then goes on to a death
   * match and a 17:24 defeat. Two parts, not one wide tag.
   */
  arcParts?: ProsePart[];
}

/**
 * One programme outside the franchise, as a row in the dossier's table.
 *
 * `rank` / `fieldSize` were added because the app already knows how to compare
 * a finish honestly — the Track record tab normalises rank against field size
 * so 3위 of 13 and 3위 of 18 stop printing as the same number — and it could do
 * that for franchise seasons only. Eight of the twenty have no franchise
 * history at all, so for eight people the comparable column was empty and the
 * card said 피의 게임 첫 출연 about a Genius runner-up. It is also what lets
 * `headToHead.ts` answer "who finished ahead of whom" for two people who shared
 * a cast list outside this franchise, without that answer being hand-copied
 * onto an edge where it would drift away from this row.
 *
 * Set them ONLY when the result string already states a numeric finish. An
 * elimination episode is not a rank: 이상민 left Grand Final in episode 3 and
 * the sources do not number it, so his row carries `result` and no `rank`, and
 * the ledger simply has nothing to say about that pair in that season.
 */
/** Per-field scope overrides for one `ExternalShow`. */
export interface ExternalShowScopes {
  result?: WorkId[];
  resultEn?: WorkId[];
  rank?: WorkId[];
  /** Same scope as `rank`, always — see `SeasonRunScopes.fieldSize`. */
  fieldSize?: WorkId[];
}

export interface ExternalShow {
  show: string;
  showKo?: string;
  year?: string;
  /** How they finished, in Korean — "우승", "준우승", "3차 예선 탈락". */
  result?: string;
  /**
   * The same finish in English. The Korean is the source of record, but this
   * table is the fastest-scanned block in the dossier and an English reader
   * was previously getting a column they could not read at all.
   */
  resultEn?: string;
  /** Numeric finish when the sources state one; 1 = winner. */
  rank?: number;
  /** How many started. A rank without this is a number, not a result. */
  fieldSize?: number;
  /**
   * Which works you must have seen for this row's `result` to be safe to show.
   * Normally the one id for this programme.
   *
   * `[]` IS THE RIGHT ANSWER FOR MOST OF THIS TABLE, and it has to be written
   * rather than left off. Two thirds of these rows state a role and not a
   * result — 고정 출연, 진행, 게스트, 멘토, 참가 — and a programme that has no
   * result here does not appear in works.ts at all, so there is no id to point
   * at and nothing to hide. Write `scope: []` and the check knows you looked.
   */
  scope?: WorkId[];
  /**
   * Only where a field differs from `scope`. Rare on this table: a row is one
   * programme and one line about it, so the row-level tag is normally the whole
   * answer. The case that needs it is a row whose Korean and English halves
   * claim different amounts — the two languages may carry different scopes, and
   * nothing may turn that into a parity check.
   */
  scopes?: ExternalShowScopes;
}

/**
 * A run through a programme OUTSIDE the franchise, written at the same length
 * and in the same register as a `SeasonRun.arc`.
 *
 * `otherShows` is a table — one line, one result, scanned in a second.
 * This is the prose underneath it, and it exists because eight of the twenty
 * players have no franchise history at all: their record is somewhere else,
 * and without this field the dossier had nothing to say about them. Bilingual
 * inline, the way `ExternalShow.result` / `resultEn` already is, so a paragraph
 * and its translation cannot drift apart in separate files.
 */
/** Per-field scope overrides for one `PriorElsewhere` block. */
export interface PriorElsewhereScopes {
  /**
   * THIS `show` IS NOT A PROGRAMME TITLE and that is why it can need a scope at
   * all. On `ExternalShow` it is a join key and always structure; here it is an
   * editorial headline — 'The route, not the job', '카메라 앞에 서기 전의
   * 십오 년' — and some of those headlines ARE the result: '진 경연 셋, 이긴
   * 서바이벌 하나' / 'Three cyphers lost, one survival won' states three
   * eliminations and a win in the title bar of the block. Nothing joins on it,
   * so sealing it breaks no lookup.
   */
  show?: WorkId[];
  showKo?: WorkId[];
  result?: WorkId[];
  resultEn?: WorkId[];
  arc?: WorkId[];
  arcEn?: WorkId[];
}

export interface PriorElsewhere {
  /** Programme title in English, e.g. "The Genius: Grand Final". */
  show: string;
  /** The same programme in Korean, e.g. "더 지니어스: 그랜드 파이널". */
  showKo: string;
  /** Broadcast year or range, e.g. "2015" or "2024–25". */
  year: string;
  /** How they finished, in Korean — "준우승", "카이스트팀 3위". */
  result: string;
  /** The same finish in English. */
  resultEn: string;
  /** What they actually did on that programme. Korean is the source of record. */
  arc: string;
  /** The same account in English. */
  arcEn: string;
  sources?: string[];
  /**
   * Which works you must have seen for this block to be safe to show.
   *
   * THIS IS THE FIELD WHERE SPLITTING PAYS. `priorElsewhere` is an array, and
   * 김유현 already carries one block per Genius season rather than one block
   * about two — which is why his two blocks can be scoped `['genius-3']` and
   * `['genius-4']` and shown independently. 이상민's single block covers Genius
   * seasons 1, 2 and 4 in one paragraph, so as written its scope is all three
   * ANDed and it is invisible to a reader who has seen only the season it is
   * titled after. Split the paragraph, do not widen the scope.
   *
   * `[]` for the career blocks. Roughly a dozen of these are not programmes at
   * all — an NBA draft position, an Olympic medal, a bar exam, a gugak prize —
   * and a career result is not a spoilable one. See the inclusion test in
   * works.ts.
   */
  scope?: WorkId[];
  /** Only where a field differs from `scope`. */
  scopes?: PriorElsewhereScopes;
  /**
   * `arc` and `arcEn` split at the points where their scope changes, each
   * concatenating back to its own string byte for byte.
   *
   * SEPARATELY, because these two are the clearest case in the dataset of the
   * two languages making different claims: they are authored fresh rather than
   * translated, and the English side has more than once said more than the
   * Korean. Split each against what it actually says.
   */
  arcParts?: ProsePart[];
  arcEnParts?: ProsePart[];
}

export type Confidence = 'high' | 'medium' | 'low';

/**
 * The five blocs of the announced X lineup. This grouping came from the
 * pre-premiere casting announcement, not from anything that happens on air.
 */
export type XTeam = 'season1' | 'season2' | 'season3' | 'challenger' | 'rookie';

/** Per-field scope overrides for one `XBilling`. */
export interface XBillingScopes {
  billing?: WorkId[];
  billingEn?: WorkId[];
}

/** Which bloc of the X lineup they were announced under. */
export interface XBilling {
  team: XTeam;
  /** Team name as billed, e.g. "시즌1 팀" / "챌린저 팀". */
  teamLabelKo: string;
  teamLabelEn: string;
  /** One line on why this particular casting is interesting. */
  billing?: string;
  billingEn?: string;
  /**
   * Which works you must have seen for the billing line to be safe to show.
   * The bloc and its two labels are the casting announcement and are never
   * scoped; the billing line usually is, because the thing that makes a casting
   * interesting is usually a result — '첫 번째 우승자', '앞의 한 명은 우승했다',
   * '데스매치를 58대 12로 이기고도'.
   */
  scope?: WorkId[];
  /**
   * Only where a language differs from `scope`. Worth checking rather than
   * assuming: 이상민's Korean billing line says he watched from the commentary
   * desk and the English says the same, but 신승용's pair — '앞의 한 명은
   * 우승했다' / 'The first one won a season' — names a result in both, about
   * somebody else.
   */
  scopes?: XBillingScopes;
}

/** Per-field scope overrides for one `Person`. */
export interface PersonScopes {
  bio?: WorkId[];
  /**
   * ALIGNED WITH `notableFor`, one scope per bullet, in the same order.
   *
   * THIS IS THE ARRAY THE PER-ENTRY RULE EXISTS FOR. It mixes more freely than
   * anything else in the dataset: 이상민's four bullets are a Genius title, a
   * count of Genius seasons, a season 1 panel seat and being the leader of
   * Roo'Ra — a result, a result, structure and structure, in one array. An
   * array-level scope would seal his band or reveal his championship, and there
   * is no single answer that does neither.
   */
  notableFor?: WorkId[][];
}

export interface Person {
  /** Stable slug id, ascii, kebab-case. */
  id: string;
  nameKo: string;
  nameEn: string;
  /** Legal name when they compete under a handle. */
  realNameKo?: string;
  aka?: string[];
  occupation: string;
  occupationKo?: string;
  category: Category;
  birthYear?: string;
  /**
   * Which third-person pronouns the English prose about this person may use.
   *
   * Korean carries no pronouns, so the Korean side — this dataset's declared
   * source of truth — has nothing to say here. Gender is therefore a fact the
   * ENGLISH LAYER INVENTS, with no counterpart to check it against. That gap
   * is not hypothetical: 김유현's entire English dossier was authored on the
   * premise that he is a woman, consistently, from the initial commit — bio,
   * two show arcs, his billing line, an edge description and the gendered noun
   * `alumna` — and it stayed live until a reader reported it.
   *
   * Declaring it makes the invention explicit and checkable. Validator section
   * 0f asserts that no English block about a person uses a pronoun outside
   * their declared set, so the next occurrence fails the build instead of
   * reaching the page.
   *
   * Required, deliberately. An optional field would be omitted for exactly the
   * people nobody thought hard about, which is the population the check exists
   * to protect. Where the repo genuinely cannot establish it, `they` is the
   * honest answer and is not a placeholder.
   */
  pronouns: Pronouns;
  /** 2–3 sentences, factual, pre-X only. */
  bio: string;
  notableFor?: string[];
  otherShows?: ExternalShow[];
  /**
   * Optional licensed photograph. Left empty on purpose: press and broadcast
   * stills of the cast are third-party copyright, so the app draws generated
   * portrait plates from each person's own record instead. Drop a URL here and
   * it renders inside the same frame.
   */
  portraitUrl?: string;
  /** Record in seasons 1–3. Empty for franchise newcomers. */
  priorSeasons: SeasonRun[];
  /**
   * Long-form record from outside the franchise. Set for everyone whose
   * non-franchise history carries a real story — which is all eight of the
   * players with no `priorSeasons`, and a few of the returning twelve.
   */
  priorElsewhere?: PriorElsewhere[];
  x: XBilling;
  confidence: Confidence;
  sources?: string[];
  /**
   * Which works you must have seen for `bio` and `notableFor` to be safe.
   *
   * NOTHING ELSE ON THIS RECORD IS SCOPED BY IT. The name, the occupation, the
   * category, the pronouns, the birth year and the photograph are who they are,
   * not how they finished, and the nested records carry their own scope.
   *
   * These two fields are where a dossier states a result before any table gets
   * the chance — '피의 게임 시즌1의 최종 우승자' is the second sentence of
   * 이태균's bio, and `notableFor` opens with 우승 for four people.
   */
  scope?: WorkId[];
  /** Only where a field differs from `scope`. `notableFor` is per bullet. */
  scopes?: PersonScopes;
  /**
   * `bio` split at the points where its scope changes, concatenating back to
   * `bio` byte for byte.
   *
   * THIS IS WHERE THE SPLIT EARNS ITS KEEP. A bio is two or three sentences and
   * typically only one of them is a result: 이태균's opens on the police
   * university and the bar, and then says he won season 1. Scoping the whole
   * string to `['bg1']` would seal his occupation, his education and his name
   * for a reader who has watched nothing — the dossier's opening paragraph, on
   * a page the plan says must still be worth reading redacted. Two parts.
   */
  bioParts?: ProsePart[];
}

export type EdgeType =
  | 'alliance'
  | 'betrayal'
  | 'rivalry'
  | 'prior-show'
  | 'co-season'
  /**
   * NOT A MEETING. Two records that rhyme — the KAIST seat two seasons apart,
   * two Mensa cards, two dermatologists — where the pair has demonstrably
   * never shared a room. It is its own type because a line on a relationship
   * graph asserts a relationship, and these three assert the opposite: they
   * used to ride `prior-show`'s colour and dash, so the legend grouped them
   * with pairs who really did meet on another programme.
   */
  | 'parallel'
  | 'friendship'
  | 'family'
  | 'agency'
  | 'teammate'
  | 'mentor'
  | 'collab';

/**
 * A documented 1v1 between the two people on an edge — a Death Match, a final
 * round played head to head, a duel with a printed score.
 *
 * ONLY DUELS GO HERE. "Both were in season 2 and one finished higher" is not
 * authored: it is derived in headToHead.ts from `records` (for franchise
 * seasons) and from `ExternalShow.rank` (for everything else), because a
 * finishing order that is already written down twice will eventually be written
 * down differently. What cannot be derived is that two named people sat across
 * one board and one of them won, so that is what this field carries.
 */
export interface Duel {
  /** Person id of the winner. Must be one endpoint of the edge; the other lost. */
  winner: string;
  /** Prior franchise season it happened in; 0 = outside the franchise. */
  season: SeasonNumber | 0;
  /** Where, in Korean — "피의 게임2 9일차 데스매치". */
  where: string;
  /** The same, in English. */
  whereEn: string;
  /** Printed result when one exists — "17:8", "22:0". Never invented. */
  score?: string;
  /**
   * Which works you must have seen for this duel to be safe to show.
   *
   * A duel is a verdict end to end, so every field of it is outcome-bearing and
   * a redacted duel disappears as a RECORD rather than being emptied field by
   * field — an edge that still says "one duel, details withheld" has told the
   * reader that one of these two beat the other, which is the claim.
   *
   * `season: 0` means outside the franchise and does NOT mean unscoped: both
   * such duels here are 더 지니어스: 그랜드 파이널 and scope to `['genius-4']`.
   */
  scope?: WorkId[];
}

/**
 * Per-field scope overrides for one `Edge`.
 *
 * `outcomes` is absent on purpose: a `Duel` is its own record and carries its
 * own `scope`, so a pair with two duels in different works can show one and
 * seal the other without an index-aligned array here.
 */
export interface EdgeScopes {
  /**
   * THE TYPE IS ITSELF A CLAIM, and this is the field most likely to be missed
   * because it does not look like prose. `betrayal` is a verdict about a named
   * real person, `rivalry` is a milder one, and `directed` points it — the
   * arrowhead is the app's only aggression marker. Scoping the description and
   * leaving the type unscoped redacts the sentence and keeps the accusation.
   */
  type?: WorkId[];
  directed?: WorkId[];
  label?: WorkId[];
  labelEn?: WorkId[];
  description?: WorkId[];
}

export interface Edge {
  id: string;
  /** Person ids. For directed types, source is the actor. */
  source: string;
  target: string;
  type: EdgeType;
  /** Prior Bloody Game season it happened in; 0 = outside the franchise. */
  season: SeasonNumber | 0;
  /** Short Korean headline for the tie. */
  label: string;
  /** The same headline in English. */
  labelEn?: string;
  description: string;
  /** 1–5 significance, drives edge weight in the graph. */
  strength: number;
  /** Betrayals and rivalries read better as arrows. */
  directed?: boolean;
  /** Every documented head-to-head this pair has played. Usually absent. */
  outcomes?: Duel[];
  confidence: Confidence;
  sources?: string[];
  /**
   * Which works you must have seen for this tie's TYPE, headline and account to
   * be safe to show. `source`, `target` and `season` are never scoped: a line
   * between two people is structure, and the plan keeps it.
   *
   * THE TYPE IS PART OF WHAT THIS PROTECTS. `betrayal` is a verdict and
   * `directed` is a verdict with a direction, and both degrade to a neutral tie
   * rather than to no tie. So `scope: []` on a `betrayal`, a `rivalry` or any
   * directed edge is a contradiction — the type alone is the claim — and the
   * validator should refuse it.
   *
   * `[]` IS RIGHT FOR THE THREE `parallel` EDGES. Their whole content is that
   * the pair has demonstrably never been in a room together: a shared
   * university, two Mensa cards, the KAIST seat two seasons apart. That is the
   * part of the atlas that survives full redaction, and sealing it would cost a
   * reader the product while protecting nothing — as long as the description
   * says nothing else, which for 최연청 × 김남희 currently means the pageant
   * placing in it stays a placing and not a scope.
   */
  scope?: WorkId[];
  /** Only where a field differs from `scope`. */
  scopes?: EdgeScopes;
  /**
   * `description` split at the points where its scope changes, concatenating
   * back to `description` byte for byte.
   *
   * EDGE DESCRIPTIONS ARE THE LONGEST MIXED PROSE IN THE DATASET and several
   * of them span works: the 이태균 × 홍진호 line opens on an unreleased shoot
   * (structure — nothing was ever broadcast, so there is nothing to spoil),
   * then dates it against 'the franchise's first champion' and a 포커 신들의
   * 전쟁 title. Three parts, three scopes, one string.
   */
  descriptionParts?: ProsePart[];
}

/** Per-field scope overrides for one `SeasonMeta`. */
export interface SeasonMetaScopes {
  winnerId?: WorkId[];
  winnerNameKo?: WorkId[];
  winnerNameEn?: WorkId[];
  signatureMoment?: WorkId[];
  /**
   * THE THREE SEASONS NEED THREE DIFFERENT ANSWERS HERE, which is the whole
   * reason this override exists. Season 1's '우승자 상금 약 1억 800만 원' is what
   * the winner actually took home and is a result. Season 2's '최대 3억 원' is
   * the maximum on the table before a card is dealt, which is format — `[]`.
   * Season 3's '우승 상금 액수 비공개' says the figure was never published, which
   * gives away nothing at all — `[]`. One scope over the field would get two of
   * the three wrong in whichever direction it was set.
   */
  prize?: WorkId[];
}

export interface SeasonMeta {
  season: SeasonNumber;
  titleKo: string;
  titleEn: string;
  network: string;
  airDates: string;
  year: string;
  episodes: string;
  prize: string;
  /** 3–5 sentences on the rules and the twist that defined the season. */
  format: string;
  /** One line: what makes this season structurally different. */
  hook: string;
  /** Set only when the winner is also a node in this cast. */
  winnerId?: string;
  /** Winner's name as plain text, so a winner outside the X cast can still be named. */
  winnerNameKo?: string;
  winnerNameEn?: string;
  signatureMoment?: string;
  accent: string;
  /**
   * Which works you must have seen for the winner, the signature moment and the
   * prize figure to be safe. Always this season's own id — `['bg1']` for
   * `season: 1`.
   *
   * `format`, `hook`, `premise`, `network`, `airDates` and `episodes` are NOT
   * covered and are never hidden: the plan keeps the premise and the format,
   * because a season people have not watched is still a season they can be told
   * the shape of. That puts an obligation on those fields — a format paragraph
   * may describe the twist, and may not narrate who it happened to.
   *
   * `prize` is covered because season 1's string is what the winner actually
   * took home, not what was on the table — and because seasons 2 and 3 override
   * it back to `[]`, which is what `scopes` is for.
   */
  scope?: WorkId[];
  /** Only where a field differs from `scope`. */
  scopes?: SeasonMetaScopes;
}

export interface GlossaryTerm {
  termKo: string;
  termEn: string;
  meaning: string;
  /**
   * Which works you must have seen for this definition to be safe.
   *
   * Most of the glossary is format vocabulary and scopes to `[]`. Three entries
   * are not: 상금, 개인 자금 and 승자독식 reconcile the prize against named
   * people and their finishes, so the definitions of this franchise's money
   * rules are, as written, season 1 and season 2 results.
   */
  scope?: WorkId[];
  /**
   * `meaning` split at the points where its scope changes, concatenating back
   * to `meaning` byte for byte. No `scopes` object: there is only one field
   * here to scope.
   *
   * The three money entries all have the same shape — a rule, then a worked
   * example that names people and their finishes. 승자독식 defines winner-takes-
   * all in one clause and then reconciles 서출구's balance against his 0원. The
   * rule is the glossary's job and is structure; the example is a season 2
   * result. Split at the full stop and the definition survives redaction.
   */
  meaningParts?: ProsePart[];
}

export interface Dataset {
  people: Person[];
  edges: Edge[];
  seasons: SeasonMeta[];
  glossary: GlossaryTerm[];
  franchise: {
    premise: string;
    lineage: string;
    creator?: string;
    reception?: string;
  };
  /** Pre-premiere public facts about X. Never in-season content. */
  currentSeason: {
    titleKo: string;
    titleEn: string;
    network: string;
    premiereDate: string;
    episodes: string;
    episodesEn?: string;
    prize?: string;
    /** Officially announced premise only. */
    premise: string;
    premiseEn?: string;
  };
  meta: {
    spoilerPolicy: string;
    spoilerPolicyEn?: string;
    lastUpdated: string;
    sources: string[];
    /**
     * How the evidence was assembled, and what it rests on. An app that prints
     * 확인된 인연 and a per-tie confidence field is making an evidentiary
     * promise, and a reader who checks finds that most of the citations are one
     * crowd-editable wiki. Saying so is not a disclaimer — it is the difference
     * between a reference work and a fan page that looks like one.
     */
    sourcing: string;
    sourcingEn: string;
    /**
     * Where the photographs in `public/portraits/` came from.
     *
     * The files carry nothing — measured, every one of the twenty is a bare
     * `VP8 ` chunk with no EXIF, no XMP and no ICCP — so this is the only place
     * their origin can be stated, and until it existed the About sheet printed
     * an apology instead of a credit.
     *
     * `credit` is a SET-LEVEL statement and deliberately not per-image: the
     * owner supplied the set with two named origins and no mapping from file to
     * origin, and inventing that mapping would be the exact failure the
     * paragraph it replaces exists to avoid. If a per-image line is ever
     * recorded, add `per?: Record<string, { credit: string; source?: string }>`
     * here and print it beside this.
     *
     * `licence` is optional and is NOT set: a named origin is not a grant.
     * `about.portraitsRights` keeps saying so, and the copy must keep the two
     * apart — "we know where these came from" and "we are allowed to use them"
     * are different claims and only the first one is true.
     */
    portraits?: {
      credit: string;
      creditEn?: string;
      licence?: string;
    };
  };
}
