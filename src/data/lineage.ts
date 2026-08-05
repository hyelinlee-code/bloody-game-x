import { SEASON_INK } from '../graph/palette';
import type { Person, SeasonNumber, XTeam } from './types';

/**
 * One place that answers "where did this player come from?".
 *
 * The X lineup was announced as five blocs of four. Three of them represent an
 * earlier season of the franchise; the other two are recruited from elsewhere.
 * Every surface in the app phrases that the same way because they all call
 * through here.
 */

export const TEAM_ORDER: XTeam[] = ['season1', 'season2', 'season3', 'challenger', 'rookie'];

export const TEAM_LABEL_KO: Record<XTeam, string> = {
  season1: '시즌1 팀',
  season2: '시즌2 팀',
  season3: '시즌3 팀',
  challenger: '챌린저 팀',
  rookie: '루키 팀',
};

export const TEAM_LABEL_EN: Record<XTeam, string> = {
  season1: 'Season 1 team',
  season2: 'Season 2 team',
  season3: 'Season 3 team',
  challenger: 'Challengers',
  rookie: 'Rookies',
};

/**
 * The five lineup blocs.
 *
 * Three of them ARE seasons, so they take the season channel's readable step
 * (SEASON_INK) — a "Season 2" chip and a season-2 arc should be the same idea.
 * The other two are not seasons and must not borrow from the relationship ramp:
 * challenger used to be byte-identical to EDGE_COLOR.alliance and rookie sat in
 * the same violet as EDGE_COLOR.agency, so a filter chip and a line meant the
 * same colour. Both are now desaturated, outside that ramp, and 30+ ΔE from
 * each other and from all three seasons.
 */
export const TEAM_COLOR: Record<XTeam, string> = {
  season1: SEASON_INK[1],
  season2: SEASON_INK[2],
  season3: SEASON_INK[3],
  challenger: '#7f9bb0',
  rookie: '#a08fbe',
};

/** The season a bloc represents, or null when it isn't a season bloc. */
export const TEAM_SEASON: Record<XTeam, SeasonNumber | null> = {
  season1: 1,
  season2: 2,
  season3: 3,
  challenger: null,
  rookie: null,
};

export interface Lineage {
  team: XTeam;
  /** "시즌 2 출신" / "타 서바이벌 출신" / "첫 출연" */
  ko: string;
  /** "From season 2" / "From other survival shows" / "Franchise debut" */
  en: string;
  season: SeasonNumber | null;
  color: string;
  teamKo: string;
  teamEn: string;
}

const ORIGIN_KO: Record<XTeam, string> = {
  season1: '시즌 1 출신',
  season2: '시즌 2 출신',
  season3: '시즌 3 출신',
  challenger: '타 서바이벌 출신',
  rookie: '첫 출연',
};

const ORIGIN_EN: Record<XTeam, string> = {
  season1: 'From season 1',
  season2: 'From season 2',
  season3: 'From season 3',
  challenger: 'From other survival shows',
  rookie: 'Franchise debut',
};

export function lineageOfTeam(team: XTeam): Lineage {
  return {
    team,
    ko: ORIGIN_KO[team],
    en: ORIGIN_EN[team],
    season: TEAM_SEASON[team],
    color: TEAM_COLOR[team],
    teamKo: TEAM_LABEL_KO[team],
    teamEn: TEAM_LABEL_EN[team],
  };
}

export function lineageOf(person: Person | undefined | null): Lineage {
  return lineageOfTeam(person?.x?.team ?? 'rookie');
}
