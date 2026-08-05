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

export type Role = 'contestant' | 'host';

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
}

export type Confidence = 'high' | 'medium' | 'low';

/**
 * The five blocs of the announced X lineup. This grouping came from the
 * pre-premiere casting announcement, not from anything that happens on air.
 */
export type XTeam = 'season1' | 'season2' | 'season3' | 'challenger' | 'rookie';

/** Which bloc of the X lineup they were announced under. */
export interface XBilling {
  team: XTeam;
  /** Team name as billed, e.g. "시즌1 팀" / "챌린저 팀". */
  teamLabelKo: string;
  teamLabelEn: string;
  /** One line on why this particular casting is interesting. */
  billing?: string;
  billingEn?: string;
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
}

export interface GlossaryTerm {
  termKo: string;
  termEn: string;
  meaning: string;
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
