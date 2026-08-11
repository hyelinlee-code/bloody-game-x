import { records } from './records';
import type { Person } from './types';

/**
 * The twenty players announced for 피의 게임X, and everything about them that
 * was true BEFORE the season started.
 *
 * SPOILER RULE: `priorSeasons` covers seasons 1–3 only. No field in this file
 * may describe anything that happens inside season X. The `x` block records
 * only the pre-premiere lineup announcement.
 */

const NAMU = 'https://namu.wiki/w/피의%20게임';
const WIKI_KO = 'https://ko.wikipedia.org/wiki/피의_게임';
const LINEUP_1 = 'https://www.newsis.com/view/NISX20260618_0003674327';
const LINEUP_2 = 'https://www.newspim.com/news/view/20260604000984';
const LINEUP_3 = 'https://www.frame-less.co.kr/news/articleView.html?idxno=3505';
const ELLE = 'https://www.elle.co.kr/article/1903789';
const NAMU_GENIUS_S3 = 'https://namu.wiki/w/더%20지니어스:블랙가넷';
const NAMU_GENIUS_S4 = 'https://namu.wiki/w/더%20지니어스:그랜드%20파이널';
const NAMU_BASEBALL_LEAGUE = 'https://namu.wiki/w/야구대표자:%20덕후들의%20리그';
const NAMU_DEATHGAME = 'https://namu.wiki/w/데스게임:%20천만원을%20걸어라';
const NAMU_GENIUS_S1 = 'https://namu.wiki/w/더%20지니어스:게임의%20법칙';
const NAMU_GENIUS_S2 = 'https://namu.wiki/w/더%20지니어스:룰%20브레이커';
const NAMU_KKH_GENIUS = 'https://namu.wiki/w/김경훈(1988)/더%20지니어스';
const NAMU_KYH_GENIUS = 'https://namu.wiki/w/김유현/더%20지니어스';
const NAMU_TIME_HOTEL = 'https://namu.wiki/w/더%20타임%20호텔/참가자';
const NAMU_UNIWAR_3 = 'https://namu.wiki/w/대학전쟁3';
const NAMU_LGH = 'https://namu.wiki/w/이관희';
const NAMU_KWAK = 'https://namu.wiki/w/곽범';
const NAMU_MADMONSTER = 'https://namu.wiki/w/매드몬스터';
const NAMU_SSY = 'https://namu.wiki/w/신승용';
const NAMU_CYC = 'https://namu.wiki/w/최연청';
const NAMU_KNH = 'https://namu.wiki/w/김남희(방송인)';
const NAMU_HSJ_POKER = 'https://namu.wiki/w/현성주';
const NAMU_HASJ = 'https://namu.wiki/w/하승진';
const NAMU_JKW = 'https://namu.wiki/w/정근우';
const NAMU_LJH = 'https://namu.wiki/w/이진형(1995)';
/* 뉴스1, 2023.06.12 — the season-2 winner's own interview, headlined with the
   sentence his season is remembered by. Also cited on his season-2 run. */
const PRESS_LJH_WIN = 'https://www.news1.kr/entertain/interview/5073627';
/* 스타투데이, 2026.03.16 — 신승용 opening the YouTube channel he runs with
   곽민경, four months before X premiered. */
const PRESS_SSY_YT = 'https://www.mk.co.kr/news/hot/issues/11989051';
/* 네이트/뉴시스, 2026.06.04 — the casting-announcement wire story. It is the
   only source that attests 최연청's Mensa membership: her own wiki page does
   not carry it, 김남희's does. */
const PRESS_CYC_MENSA = 'https://news.nate.com/view/20260604n23735';
/* An unreleased shoot, but a documented cast list — and the only thing in the
   dataset that puts 이태균 in a room with anyone outside season 1. */
const NAMU_PROJECT_GENIUS = 'https://namu.wiki/w/프로젝트%20지니어스';
/* The pageant's own entrant roll, which is the only page that carries the
   REGION for both of this lineup's two Miss Korea entrants — 최연청 for 전북 in
   2013, 김남희 for 서울 in 2014. Neither biography has it, and the region is
   what makes their non-meeting a fact rather than an assumption: different
   region, different year, so they were never on the same stage. */
const MISS_KOREA_ENTRANTS = 'https://namu.wiki/w/미스코리아/역대%20참가자';

export const people: Person[] = [
  /* ───────────────────────── 시즌1 팀 ───────────────────────── */
  {
    id: 'lee-sang-min',
    nameKo: '이상민',
    nameEn: 'Lee Sang-min',
    aka: ['룰라 이상민'],
    occupation: 'Broadcaster · former producer and leader of Roo\'Ra',
    occupationKo: '방송인 · 前 룰라 리더/프로듀서',
    category: 'broadcaster',
    birthYear: '1973',
    pronouns: 'he',
    bio: '1990년대 그룹 룰라의 리더이자 프로듀서로 출발해 지금은 예능 고정 출연자로 자리 잡은 방송인이다. JTBC 「아는 형님」에 오래 몸담았고, 두뇌 서바이벌 장르에서는 「더 지니어스」 시즌2 우승자로 기억된다. 피의 게임 시즌1에서는 플레이어가 아니라 스튜디오 패널석에 앉아 참가자들을 지켜보던 쪽이었다.',
    notableFor: [
      '「더 지니어스: 룰 브레이커」 우승',
      '「더 지니어스」 4개 시즌 중 3개 시즌 출연',
      '피의 게임 시즌1 스튜디오 패널',
      '룰라 리더 겸 프로듀서',
    ],
    otherShows: [
      { show: 'The Genius: Rules of the Game', showKo: '더 지니어스: 게임의 법칙 (시즌1)', year: '2013', result: '3위', resultEn: '3rd', rank: 3, fieldSize: 13 },
      { show: 'The Genius: Rule Breaker', showKo: '더 지니어스: 룰 브레이커 (시즌2)', year: '2014', result: '우승', resultEn: 'Winner', rank: 1 },
      { show: 'The Genius: Grand Final', showKo: '더 지니어스: 그랜드 파이널 (시즌4)', year: '2015', result: '3화 데스매치 탈락', resultEn: 'Out in the round-three death match' },
      { show: 'Knowing Bros', showKo: '아는 형님', year: '2016–', result: '고정 출연', resultEn: 'Series regular' },
    ],
    priorSeasons: records['lee-sang-min'] ?? [],
    priorElsewhere: [
      {
        show: 'The Genius: Rule Breaker (season 2)',
        showKo: '더 지니어스: 룰 브레이커 (시즌2)',
        year: '2013–2014',
        result: '우승',
        resultEn: 'Winner',
        arc: '시즌1 「게임의 법칙」(2013)에서는 11화 데스매치에서 김경란에게 패해 3위로 끝났다. 이듬해 시즌2 「룰 브레이커」에서는 가넷 62개를 모아 결승에서 프로게이머 출신 임요환을 꺾고 우승했고, 이 시즌으로 그는 예능인이 아니라 플레이어로 다시 분류됐다. 2015년 올스타전 「그랜드 파이널」에는 시즌2 우승자 자격으로 복귀했지만, 자신을 정신적 지주라 부르며 따라다니던 김경훈에게 3화 데스매치 베팅 가위바위보로 패해 일찍 짐을 쌌다. 네 시즌 중 세 시즌에 나와 우승 한 번, 3위 한 번, 그리고 자기 편에게 당한 탈락 한 번을 남겼다.',
        arcEn:
          "In season 1, Rules of the Game (게임의 법칙, 2013), he lost the episode-eleven Death Match to the broadcaster Kim Kyung-ran and finished third. The following year he took season 2, Rule Breaker (룰 브레이커), on 62 garnets, beating the former StarCraft professional Lim Yo-hwan in the final — the season that reclassified him from variety regular to player. He came back for the 2015 all-star season, Grand Final, as season 2's champion, and went out early: Kim Kyung-hoon, who had spent the season calling him his anchor, beat him in the episode-three Death Match at betting rock-paper-scissors. Three of the show's four seasons, one win, one third place, and one elimination at the hands of his own ally.",
        sources: [NAMU_GENIUS_S1, NAMU_GENIUS_S2, NAMU_GENIUS_S4],
      },
    ],
    x: {
      team: 'season1',
      teamLabelKo: '시즌1 팀',
      teamLabelEn: 'Season 1 team',
      billing: '해설석에 앉아 있던 사람이 처음으로 판 안으로 들어온다.',
      billingEn: "The man who watched from the commentary desk finally steps onto the board.",
    },
    confidence: 'high',
    sources: [WIKI_KO, ELLE, LINEUP_1],
  },
  {
    id: 'park-ji-min',
    nameKo: '박지민',
    nameEn: 'Park Ji-min',
    occupation: 'MBC announcer',
    occupationKo: 'MBC 아나운서',
    category: 'broadcaster',
    birthYear: '1991',
    pronouns: 'she',
    bio: 'MBC 아나운서로 뉴스와 예능을 오가며 활동해 왔다. 「어서와 한국은 처음이지?」와 「오은영 리포트 – 결혼지옥」 등을 진행했다. 피의 게임 프랜차이즈에 가장 깊이 관여한 인물로, 시즌1과 시즌2에서는 참가자로 뛰었고, 시즌3에서는 경쟁하는 쪽이 아니라 잔해 유령 카지노의 딜러 겸 연옥 담당 집사로 나왔다 — 진행자가 아니라 보조 출연이고, 제작진이 출연 사실 자체를 반전으로 아끼둔 탓에 6화에야 처음 등장했다.',
    notableFor: [
      '피의 게임 시즌1·2 참가자, 시즌3 유령 카지노 딜러',
      '프랜차이즈에서 유일하게 세 시즌을 모두 거친 인물',
      '방송 진행상 수상 이력',
      'MBC 아나운서',
    ],
    otherShows: [
      { show: 'Welcome, First Time in Korea?', showKo: '어서와~ 한국은 처음이지?', result: '진행', resultEn: 'Host' },
      { show: 'Oh Eun-young Report: Marriage Hell', showKo: '오은영 리포트 – 결혼지옥', result: '진행', resultEn: 'Host' },
      { show: 'MBC News Today', showKo: 'MBC 뉴스투데이', result: '진행', resultEn: 'Anchor' },
    ],
    priorSeasons: records['park-ji-min'] ?? [],
    /* Short on purpose: the franchise's only three-season figure has most of
       her record inside `priorSeasons`, and this block exists to say the one
       thing that block cannot — that the seat she keeps coming back to is her
       day job. */
    priorElsewhere: [
      {
        show: 'The day job the franchise keeps borrowing',
        showKo: 'MBC 아나운서라는 본업',
        year: '',
        result: '「MBC 뉴스투데이」 앵커 · 「어서와~ 한국은 처음이지?」 · 「오은영 리포트 – 결혼지옥」',
        resultEn: 'Anchor on MBC News Today; host of two long-running formats',
        arc: '프랜차이즈 안에서의 이력이 길어서 가려지는 사실이 하나 있다 — 본업은 방송 진행이고, 피의 게임은 그 본업의 일부다. MBC 아나운서로 「뉴스투데이」 앵커석에 앉았고, 「어서와~ 한국은 처음이지?」와 「오은영 리포트 – 결혼지옥」을 진행했다. 뉴스 데스크와 예능 진행석을 함께 쓰는 이력이 시즌1·2를 참가자로 뛰고 시즌3을 진행자로 맞은 유일한 사람이 나올 수 있었던 조건이다: 판 안으로 들어갈 수도, 판을 굴릴 수도 있는 자격증을 처음부터 갖고 있었다.',
        arcEn:
          "One fact gets buried under how long her franchise record is: presenting is the day job, and Bloody Game is part of it. As an MBC announcer she has anchored MBC News Today (뉴스투데이) and hosted Welcome, First Time in Korea? (어서와~ 한국은 처음이지?) and Oh Eun-young Report: Marriage Hell (오은영 리포트 – 결혼지옥). A record that covers both a news desk and a variety host's chair is the condition that produced the only person to play seasons 1 and 2 and then preside over season 3: she already held both qualifications — to be inside the board, and to run it.",
      },
    ],
    x: {
      team: 'season1',
      teamLabelKo: '시즌1 팀',
      teamLabelEn: 'Season 1 team',
      billing: '참가자였다가 딜러였다가, 다시 참가자석으로.',
      billingEn: "Player, then dealer, and now back in a player’s seat.",
    },
    confidence: 'high',
    sources: [WIKI_KO, `${NAMU}3`, LINEUP_1],
  },
  {
    id: 'jung-keun-woo',
    nameKo: '정근우',
    nameEn: 'Jung Keun-woo',
    occupation: 'Former KBO second baseman · baseball commentator',
    occupationKo: '前 프로야구 선수 · 야구 해설위원',
    category: 'athlete',
    birthYear: '1982',
    pronouns: 'he',
    bio: 'SK 와이번스와 한화 이글스 등에서 뛴 KBO 리그의 대표적인 2루수 출신이다. 2008 베이징 올림픽 야구 금메달 멤버이며 골든글러브를 여러 차례 받았다. 은퇴 후에는 야구 해설위원으로 활동 중이다.',
    notableFor: ['2008 베이징 올림픽 야구 금메달', 'KBO 골든글러브 수상 2루수', 'SK·한화·LG 주전 내야수'],
    /* Three of his four ties are season 1 and the fourth is the panel desk, so
       everything a reader could learn about him here came out of one fortnight
       in 2021. His actual post-retirement record is a baseball franchise of its
       own and none of it was on the page. */
    otherShows: [
      { show: 'Baseball Representatives: League of Nerds', showKo: '야구대표자: 덕후들의 리그', year: '2024', result: 'SSG 대표 대타 게스트 (5화)', resultEn: 'Stand-in for the SSG seat, episode 5' },
      { show: 'The Strongest Baseball', showKo: '최강야구 (JTBC)', year: '2022–', result: '최강 몬스터즈 창단 멤버', resultEn: 'Founding member of the Monsters' },
      { show: 'Fireball Baseball', showKo: '불꽃야구', year: '2025–', result: '고정 출연', resultEn: 'Series regular' },
      { show: 'Ping-Pong Nation', showKo: '올 탁구나!', year: '2022–', result: '전설의 강호팀 고정', resultEn: 'Regular, the veterans’ side' },
      { show: 'Youth Baseball Team: Not Out Yet', showKo: '청춘야구단: 아직은 낫아웃 (KBS)', year: '2022', result: '수석코치', resultEn: 'Head coach' },
    ],
    priorSeasons: records['jung-keun-woo'] ?? [],
    /* The comment above `otherShows` named this gap two rounds ago — 'his
       actual post-retirement record is a baseball franchise of its own and
       none of it was on the page' — and then closed it with five bare rows and
       no prose. Five rows is a credits list; this is the account. */
    priorElsewhere: [
      {
        show: 'A career made in a league, not on television',
        showKo: '리그에서 만들어진 이력',
        year: '',
        result: '2008 베이징 올림픽 야구 금메달 · KBO 골든글러브 다수',
        resultEn: 'Olympic gold in Beijing 2008, and Golden Gloves at second base',
        arc: '스무 명 가운데 방송이 아니라 리그에서 만들어진 이력은 이 사람 것뿐이다. SK 와이번스와 한화 이글스, LG를 거친 KBO의 대표적인 2루수였고, 2008년 베이징 올림픽 야구 금메달 멤버이며, 골든글러브를 여러 차례 받았다. 은퇴한 뒤에도 자리만 옮겼을 뿐 종목은 그대로다 — 2022년 「최강야구」 최강 몬스터즈의 창단 멤버, 2025년부터 「불꽃야구」 고정, 같은 2022년 KBS 「청춘야구단: 아직은 낫아웃」의 수석코치, 2024년 「야구대표자: 덕후들의 리그」 5화에서는 지상렬의 SSG 자리를 대신 채운 게스트였다. 야구 바깥으로 나간 것은 「올 탁구나!」의 전설의 강호팀 고정 정도다. 피의 게임 시즌1의 저택에 들어간 것은 예능으로 커리어를 시작한 사람이 아니라 프로 무대에서 은퇴하고 온 선수였다.',
        arcEn:
          "He is the only one of the twenty whose record was made in a league rather than on television: a defining KBO second baseman across SK Wyverns, Hanwha Eagles and LG, a member of the gold-medal baseball squad at Beijing 2008, and a repeat Golden Glove winner. Retirement moved his seat and not his sport — founding member of the Monsters on The Strongest Baseball (최강야구) in 2022, a regular on Fireball Baseball (불꽃야구) from 2025, head coach on KBS's Youth Baseball Team: Not Out Yet (청춘야구단) the same year as the Monsters, and, in 2024, the guest who filled the SSG seat for Ji Sang-ryeol in episode five of Baseball Representatives: League of Nerds. The one credit off the diamond is a regular slot with the veterans' side on Ping-Pong Nation (올 탁구나!). What walked into the season 1 house was not somebody who had built a career in variety, but a player who had come straight off a professional one.",
      },
    ],
    x: {
      team: 'season1',
      teamLabelKo: '시즌1 팀',
      teamLabelEn: 'Season 1 team',
      billing: '올림픽 금메달리스트가 다시 저택으로.',
      billingEn: "An Olympic gold medallist returns to the house.",
    },
    confidence: 'high',
    sources: [WIKI_KO, LINEUP_2, NAMU_BASEBALL_LEAGUE, NAMU_JKW],
  },
  {
    id: 'lee-tae-gyun',
    nameKo: '이태균',
    nameEn: 'Lee Tae-gyun',
    occupation: 'Police officer · qualified lawyer',
    occupationKo: '경찰관 · 변호사',
    category: 'professional',
    birthYear: '1995',
    pronouns: 'he',
    bio: '경찰대학을 졸업한 현직 경찰관으로, 이후 로스쿨을 거쳐 변호사 자격까지 취득했다. 피의 게임 시즌1의 최종 우승자이며, 프랜차이즈 첫 번째 챔피언이라는 자리를 갖고 있다.',
    notableFor: ['피의 게임 시즌1 우승 (프랜차이즈 초대 챔피언)', '경찰대 출신 현직 경찰관', '변호사시험 합격'],
    /* Was an empty array, which made the franchise's first champion the one
       player whose page had nothing outside his own season to say. */
    otherShows: [
      { show: 'Project Genius', showKo: '프로젝트 지니어스 (투에이스)', year: '2022', result: '촬영 후 미공개', resultEn: 'Shot, never released' },
    ],
    priorSeasons: records['lee-tae-gyun'] ?? [],
    /* SIX OF THE TWELVE RETURNERS HAD NO 바깥에서의 기록 BLOCK AND ALL EIGHT
       NEWCOMERS DID, which inverted against stature: 최연청, a rookie, carried
       two full accounts while the man who won season 1 carried none, and a
       reader who opened the champion's dossier after a rookie's concluded the
       app did not know much about him. It knew; it had not written it down.
       This is the first of the six (이태균, 정근우, 서출구, 최혜선, 윤비,
       박지민); each is written from what that person's own entry and its cited
       pages already carry.

       SOURCES PENDING, DELIBERATELY. `PriorElsewhere.sources` is where the
       narrow citation belongs, and `dataset.meta.sourcing` prints this
       dataset's citation totals as prose that validate-data section 9 asserts
       — so adding references here and not editing dataset.ts in the same
       commit fails the build. dataset.ts is not this file's to edit; the exact
       URLs and the exact new arithmetic are in the handoff. Nothing below
       makes a claim that is not already carried by this person's own cited
       biography, which is what the dossier's own 출처 button resolves to. */
    priorElsewhere: [
      {
        show: 'The route, not the job',
        showKo: '경찰대에서 변호사시험까지',
        year: '',
        result: '경찰대 졸업 → 경찰관 → 로스쿨 → 변호사시험 합격',
        resultEn: 'Police university, a warrant card, law school, the bar',
        arc: '방송 밖에서 이 사람에 대해 확인되는 것은 직업 하나가 아니라 직업의 순서다. 경찰대학을 졸업해 경찰관이 됐고, 그다음에 로스쿨을 거쳐 변호사시험에 합격했다 — 시험을 통과해 들어간 자리에서 다시 시험을 봐서 다음 자리로 옮긴 이력이고, 이 스무 명 중 누구와도 겹치지 않는 경로다. 프랜차이즈의 초대 챔피언인데 바깥 이력이 짧은 것은 자료가 없어서가 아니다. 그는 방송을 직업으로 삼지 않았고, 시즌1 이후 이름이 오른 촬영은 2022년 투에이스의 \'프로젝트 지니어스\' 한 건뿐이며 그마저 공개되지 않았다. 판을 이기고 돌아간 곳이 스튜디오가 아니라 원래 직장인 사람이다.',
        arcEn:
          "What the record outside television gives on this man is not one job but the order of them. He graduated from the National Police University and became a serving officer; then he went through law school and passed the bar. It is a route made of examinations — a seat won by one exam, left for another exam, and a second seat taken with it — and nobody else in this twenty has walked it. The reason the franchise's first champion has so little history outside his own season is not that the material is missing. He did not take television as a job: the only other shoot his name is attached to since season 1 is TwoAces' Project Genius (프로젝트 지니어스) in 2022, and that was never released. He won the house and went back to work.",
      },
    ],
    x: {
      team: 'season1',
      teamLabelKo: '시즌1 팀',
      teamLabelEn: 'Season 1 team',
      billing: '첫 번째 우승자. 이제 모두가 그의 플레이를 봤다.',
      billingEn: "The first champion — and by now everyone has watched how he plays.",
    },
    confidence: 'high',
    sources: [WIKI_KO, `${NAMU}(시즌%201)`, LINEUP_3, NAMU_PROJECT_GENIUS],
  },

  /* ───────────────────────── 시즌2 팀 ───────────────────────── */
  {
    id: 'ha-seung-jin',
    nameKo: '하승진',
    nameEn: 'Ha Seung-jin',
    occupation: 'Former NBA and KBL centre · YouTuber',
    occupationKo: '前 프로농구 선수 · 유튜버',
    category: 'athlete',
    birthYear: '1985',
    pronouns: 'he',
    bio: '2004년 NBA 드래프트에서 포틀랜드 트레일블레이저스에 지명돼 한국인 최초로 NBA 코트를 밟은 221cm 센터다. 이후 KBL 전주 KCC에서 뛰다 2019년 은퇴했고, 지금은 유튜버 겸 방송인으로 활동한다.',
    notableFor: ['한국인 최초 NBA 진출 선수', '한국 농구 역대 최장신 221cm', 'KBL 전주 KCC 센터 출신'],
    otherShows: [
      { show: 'Baseball Representatives: League of Nerds', showKo: '야구대표자: 덕후들의 리그', year: '2024–25', result: 'kt wiz 대표 고정', resultEn: 'Regular, the kt wiz seat' },
      { show: 'Knowing Bros', showKo: '아는 형님', year: '2025', result: '464회 게스트', resultEn: 'Guest, episode 464' },
      { show: 'Kim Soo-mi’s Side Dishes', showKo: '수미네 반찬', year: '2020', result: '고정 출연', resultEn: 'Series regular' },
      { show: 'Ha Seung-jin Talk', showKo: '하승진톡 (유튜브)', year: '2020–', result: '진행', resultEn: 'Host' },
    ],
    priorSeasons: records['ha-seung-jin'] ?? [],
    /* The 이관희 rivalry is the longest thing written about him anywhere in
       the dataset and every fact underpinning it — the draft position, the
       retirement year, the channel he ran the feud on — lived on 이관희's page
       and not on his. 이관희 got a priorElsewhere for the same career; this is
       the other half of it. */
    priorElsewhere: [
      {
        show: 'NBA and KBL career',
        showKo: 'NBA·KBL 커리어',
        year: '2004–2019',
        result: '한국인 최초 NBA · KBL 드래프트 전체 1순위',
        resultEn: 'The first Korean in the NBA, and a number-one KBL pick',
        arc: '2004년 NBA 드래프트에서 포틀랜드 트레일블레이저스에 지명돼 한국인 최초로 NBA 코트를 밟았다. 국내로 돌아와 2008년 KBL 드래프트 1라운드 1순위로 전주 KCC에 입단했고, 221cm의 신장을 그대로 커리어로 바꿔 2018-19시즌을 끝으로 은퇴했다. 은퇴 다음 해인 2020년 4월, 전태풍과 함께 유튜브에서 한국 농구의 문제를 짚었다가 당시 현역이던 이관희의 반박 영상을 불러 공개 설전이 됐다. 논쟁은 하승진의 사과성 댓글로 정리됐고, 이후 이관희가 그의 유튜브 코너 \'하승진톡\'에 게스트로 나와 서로의 입장을 확인하며 끝났다. 은퇴 선수가 예능으로 넘어오는 흔한 경로 대신, 그는 자기 채널에서 현역들과 말싸움을 하다 방송으로 들어온 쪽이다.',
        arcEn:
          "The Portland Trail Blazers took him in the 2004 NBA draft, making him the first Korean to play on an NBA court. Back home, he went first overall in the first round of the 2008 KBL draft to Jeonju KCC, converted 221cm directly into a career, and retired after the 2018-19 season. In April 2020, the year after retiring, he went on YouTube with the naturalised guard Jeon Tae-poong to lay out what was wrong with Korean basketball, which drew a rebuttal video from Lee Gwan-hee — then still playing — and turned into a public row. Ha closed it with a half-apology in the comments, and it ended with Lee appearing as a guest on Ha's own segment, 'Ha Seung-jin Talk' (하승진톡), where the two set out where each of them had actually stood. Instead of the usual route from retirement into variety television, he argued his way in from his own channel.",
        sources: [NAMU_HASJ, 'https://namu.wiki/w/하승진/생애', NAMU_LGH],
      },
    ],
    x: {
      team: 'season2',
      teamLabelKo: '시즌2 팀',
      teamLabelEn: 'Season 2 team',
      billing: '지키라고 맡긴 상징물이 눈앞에서 깨졌다. 그 저택으로 다시 들어간다.',
      billingEn: 'The totem he was posted to guard broke in front of him. He is going back into that house.',
    },
    confidence: 'high',
    sources: [WIKI_KO, `${NAMU}2`, LINEUP_1, NAMU_HASJ, NAMU_BASEBALL_LEAGUE, 'https://namu.wiki/w/하승진/생애'],
  },
  {
    id: 'hyun-seong-joo',
    nameKo: '현성주',
    nameEn: 'Hyun Seong-joo',
    aka: ['코몽', 'Koreanmonkey'],
    occupation: 'Professional poker player',
    occupationKo: '프로 포커 플레이어',
    category: 'poker',
    birthYear: '1990',
    pronouns: 'he',
    bio: "활동명 '코몽'으로 알려진 프로 포커 플레이어다. 2020년 WSOP 온라인 이벤트에서 우승해 한국인으로는 세 번째로 골드 브레이슬릿을 손에 넣었고, WPT 챔피언십 타이틀도 갖고 있다. 한국외국어대학교를 나왔다.",
    notableFor: ['한국인 3번째 WSOP 골드 브레이슬릿 (2020)', 'WPT 챔피언십 우승', '한국외대 졸업', "활동명 '코몽'"],
    otherShows: [
      { show: 'War of the Poker Gods', showKo: '포커 신들의 전쟁 (시즌2·3)', year: '2021–23', result: '참가', resultEn: 'Contestant' },
      { show: 'Project Genius', showKo: '프로젝트 지니어스 (투에이스)', year: '2022', result: '촬영 후 미공개', resultEn: 'Shot, never released' },
    ],
    priorSeasons: records['hyun-seong-joo'] ?? [],
    /* Of the four poker players in this lineup he was the only one with no
       priorElsewhere, while two edges — the 홍진호 tournament line and the
       서출구 mentorship — were built almost entirely out of his record. The
       pair pages knew more about him than his own page did. */
    priorElsewhere: [
      {
        show: 'The poker circuit',
        showKo: '포커 커리어',
        year: '2020–',
        result: 'WSOP 브레이슬릿 · WPT 2회 우승',
        resultEn: 'A WSOP bracelet and two WPT titles',
        arc: '고등학교 축제 부스에서 포커를 처음 만났고, 2019년에 크게 무너진 적이 있다. 2020년 WSOP 온라인 GG포커 이벤트 #46을 우승해 한국인으로는 세 번째로 골드 브레이슬릿을 가져갔고, 이듬해 WPT 딥스택 이벤트 #18과 윈 스프링 클래식 NLH 챔피언십을, 2022년에는 WPT 벨라지오 이벤트 #5와 PGT 하이롤러 시리즈 이벤트 #36을 연달아 우승했다. 방송으로 넘어온 것은 유튜브 채널 투에이스의 홀덤 서바이벌 \'포커 신들의 전쟁\'이다 — 2021년 8월 16일부터 9월 30일까지 열린 시즌2 인비테이셔널에 16인 중 한 명으로 출전했고(이 대회는 홍진호가 우승했다), 시즌3에도 참가자로 나왔다. 본인 채널 \'아르테포커\'에서는 1:1 홀덤 챌린지를 굴리며 임요환·김수조·서출구를 상대로 앉혔다. 2025년 11월부터는 CHEEZEE 팀 프로다.',
        arcEn:
          "He met poker at a booth at a high-school festival, and came apart financially in 2019. In 2020 he won WSOP Online GGPoker Event #46 to become the third Korean ever to take a gold bracelet; the following year he took WPT DeepStacks Event #18 and the Wynn Spring Classic NLH Championship, and in 2022 WPT Bellagio Event #5 and PGT High Roller Series Event #36. Television came through War of the Poker Gods (포커 신들의 전쟁), the hold'em survival series run by the YouTube channel TwoAces (투에이스): he was one of sixteen in the season 2 invitational, 16 August to 30 September 2021 — the tournament Hong Jin-ho won — and came back as a player for season 3. On his own channel, Arte Poker (아르테포커), he runs a one-on-one hold'em challenge and has sat the StarCraft professional Lim Yo-hwan, the poker player Kim Su-jo and XITSUH down opposite him. He has been a CHEEZEE team pro since November 2025.",
        sources: [NAMU_HSJ_POKER, 'https://namu.wiki/w/포커%20신들의%20전쟁'],
      },
    ],
    x: {
      team: 'season2',
      teamLabelKo: '시즌2 팀',
      teamLabelEn: 'Season 2 team',
      billing: '홍진호와의 맞대결은 판이 시작되기도 전에 팔렸다.',
      billingEn: 'His duel with Hong Jin-ho was sold before either of them had played a hand.',
    },
    confidence: 'high',
    sources: [`${NAMU}2`, LINEUP_1, NAMU_HSJ_POKER, 'https://namu.wiki/w/포커%20신들의%20전쟁', NAMU_PROJECT_GENIUS],
  },
  {
    id: 'yoon-bi',
    nameKo: '윤비',
    nameEn: 'Yoon Bi',
    realNameKo: '명윤백',
    aka: ['YunB'],
    occupation: 'Rapper',
    occupationKo: '래퍼',
    category: 'musician',
    birthYear: '1992',
    pronouns: 'he',
    bio: '하이라이트 레코즈 소속 래퍼로 뉴욕대학교 철학과를 졸업했다. 태권도 주니어 올림픽 금메달 이력도 있다. 「쇼미더머니」 6·777·8에 출연했고, 카카오TV 웹예능 「생존남녀」에서 우승하며 서바이벌 예능에도 이름을 올렸다.',
    notableFor: ['뉴욕대 철학과 졸업', "웹예능 「생존남녀」 우승", '태권도 주니어 올림픽 금메달', '하이라이트 레코즈'],
    otherShows: [
      { show: 'Show Me The Money 6', showKo: '쇼미더머니 6', year: '2017', result: '3차 예선 탈락', resultEn: 'Out in the third preliminary' },
      { show: 'Show Me The Money 777', showKo: '쇼미더머니 777', year: '2018', result: '음원 미션 탈락', resultEn: 'Out at the track mission' },
      { show: 'Show Me The Money 8', showKo: '쇼미더머니 8', year: '2019', result: '크루 리벤지 배틀 탈락', resultEn: 'Out in the crew revenge battle' },
      { show: 'Survival Men and Women', showKo: '생존남녀: 갈라진 세상', result: '우승', resultEn: 'Winner' },
    ],
    priorSeasons: records['yoon-bi'] ?? [],
    /* Shorter than the four above, because the record is shorter — but 생존남녀
       is a survival show he WON, directly on this atlas's topic, and it was
       shipping as a bare row with no year on it. */
    priorElsewhere: [
      {
        show: 'Three cyphers lost, one survival won',
        showKo: '진 경연 셋, 이긴 서바이벌 하나',
        year: '2017–',
        result: '쇼미더머니 6·777·8 전부 탈락 · 「생존남녀」 우승',
        resultEn: 'Out of Show Me The Money three times; won Survival Men and Women',
        arc: '래퍼로서의 방송 이력은 세 번의 탈락으로 되어 있다 — 2017년 「쇼미더머니6」 3차 예선, 2018년 「쇼미더머니777」 음원 미션, 2019년 「쇼미더머니8」 크루 리벤지 배틀. 정작 그가 우승한 프로그램은 랩 경연이 아니라 서바이벌이다: 카카오TV 웹예능 「생존남녀: 갈라진 세상」에서 우승했다. 피의 게임 바깥의 서바이벌을 이겨 본 적이 있는 사람은 이 스무 명 중 많지 않고, 시즌2에서 저택을 통째로 가져간 플레이를 미리 설명해 주는 것도 쇼미더머니 쪽 이력이 아니라 이쪽이다. 하이라이트 레코즈 소속이고, 뉴욕대학교 철학과를 나왔으며, 태권도 주니어 올림픽 금메달도 갖고 있다.',
        arcEn:
          "His record as a rapper on television is three eliminations: the third preliminary of Show Me The Money 6 (쇼미더머니6) in 2017, the track mission of Show Me The Money 777 in 2018, the crew revenge battle of Show Me The Money 8 in 2019. The programme he actually won was not a rap contest but a survival — Survival Men and Women: A World Divided (생존남녀: 갈라진 세상), the Kakao TV web series. Not many of the twenty have won a survival show outside this franchise, and it is that credit rather than the Show Me The Money ones that explains the season 2 run in which he took the entire mansion. He records for Highlight Records, read philosophy at New York University, and holds a junior Olympic gold in taekwondo.",
      },
    ],
    x: {
      team: 'season2',
      teamLabelKo: '시즌2 팀',
      teamLabelEn: 'Season 2 team',
      billing: '저택을 손에 넣었고, 데스매치는 끝내지 못했다.',
      billingEn: 'He took the whole mansion, and never finished his Death Match.',
    },
    confidence: 'high',
    sources: [`${NAMU}2`, 'https://ko.wikipedia.org/wiki/윤비', LINEUP_1],
  },
  {
    id: 'lee-jin-hyung',
    nameKo: '이진형',
    nameEn: 'Lee Jin-hyung',
    occupation: 'Physician',
    occupationKo: '의사 · 피부과',
    category: 'professional',
    birthYear: '1995',
    /* The franchise's second champion had otherShows: [], no priorElsewhere and
       the shortest bio in the file — so the man who won a season rendered with
       no 바깥에서의 기록 section at all, while a student with no franchise
       history carried a full one. The same gap was closed for 이태균 a round
       earlier (see the note on his entry); this is the other half of it. What
       he is publicly known for outside the house is the route to the seat: an
       SNU intake he walked away from, and a second one he sat the exam again
       for. All of it is on his own 학력 line and none of it was in the app. */
    pronouns: 'he',
    bio: '서울과학고를 나와 서울대 자유전공학부에 14학번으로 입학했다가 중퇴했고, 2019학년도 수능 만점자로 서울대 의과대학에 19학번으로 다시 들어가 졸업했다. 지금은 청담동의 피부과에서 진료를 본다. 피의 게임 시즌2에 의대생 신분으로 참가해 최종 우승했다.',
    notableFor: ['피의 게임 시즌2 우승', '2019학년도 수능 만점자', '서울대 의대 졸업 · 피부과 의사', '「문제적 남자」 출연'],
    otherShows: [
      { show: 'Problematic Men', showKo: '뇌섹시대 – 문제적 남자', year: '2020', result: '게스트', resultEn: 'Guest' },
    ],
    priorSeasons: records['lee-jin-hyung'] ?? [],
    priorElsewhere: [
      {
        show: 'The route to the seat',
        showKo: '수능 만점과 서울대 의대',
        year: '2014–2019',
        result: '2019학년도 수능 만점 · 서울대 의대 19학번',
        resultEn: 'A perfect CSAT in 2019, and a second SNU intake',
        arc: '이 사람의 이력에서 눈에 띄는 것은 만점이 아니라 만점을 받은 시점이다. 서울과학고를 졸업하고 2014년 서울대 자유전공학부에 입학했지만 중퇴했고, 이미 서울대생이었던 사람이 몇 해 뒤 수능을 다시 치러 2019학년도 만점자가 됐다. 그리고 그 점수로 고른 곳이 같은 학교의 의과대학이었다 — 19학번으로 들어가 졸업했고, 지금은 청담동에서 피부과 진료를 본다. 만점자 자격으로 2020년 tvN 「문제적 남자」에 게스트로 나온 것이 방송의 시작이었고, 3년 뒤 피의 게임 시즌2에는 의대생 신분으로 들어가 우승했다. 한 번 들어간 학교를 나와서 다시 시험을 보고 같은 학교로 돌아가는 사람과, 아름다운 패배보다 추악한 승리를 택했다고 말하는 사람은 같은 사람이다.',
        arcEn:
          "The striking thing in this record is not the perfect score but when it was taken. He finished Seoul Science High School, entered Seoul National University's Liberal Studies programme with the 2014 intake, and left it — and then a man who was already an SNU student sat the national exam again and posted a perfect score for 2019. What he spent it on was the medical school of the same university: he entered with the 2019 intake, graduated, and now practises dermatology in Cheongdam. Television started with the score, as a guest on tvN's Problematic Men (문제적 남자) in 2020; three years later he walked into Bloody Game 2 as a medical student and won it. The man who left one seat, re-sat the exam and took another at the same university is the same man who said he had chosen an ugly victory over a beautiful defeat.",
        sources: [NAMU_LJH, PRESS_LJH_WIN],
      },
    ],
    x: {
      team: 'season2',
      teamLabelKo: '시즌2 팀',
      teamLabelEn: 'Season 2 team',
      billing: '수능 만점자 출신 의사, 그리고 시즌2의 챔피언.',
      billingEn: "A perfect-score student turned doctor, and season 2’s champion.",
    },
    confidence: 'high',
    sources: [`${NAMU}2`, LINEUP_1, NAMU_LJH],
  },

  /* ───────────────────────── 시즌3 팀 ───────────────────────── */
  {
    id: 'hong-jin-ho',
    nameKo: '홍진호',
    nameEn: 'Hong Jin-ho',
    aka: ['콩', '폭풍저그'],
    occupation: 'Former StarCraft pro gamer · professional poker player',
    occupationKo: '前 프로게이머 · 프로 포커 플레이어',
    category: 'esports',
    birthYear: '1982',
    pronouns: 'he',
    bio: "'폭풍저그'로 불린 전설적인 스타크래프트 프로게이머 출신이다. 은퇴 후 포커로 전향해 2022년 WSOP 브레이슬릿을 획득했고, 「더 지니어스」 초대 우승자로 한국 두뇌 서바이벌 장르의 상징적 인물이 됐다. 피의 게임에는 시즌2와 시즌3에 연달아 출연했다.",
    notableFor: [
      '「더 지니어스: 게임의 법칙」 초대 우승',
      '2022 WSOP 브레이슬릿 획득',
      "스타크래프트 레전드 '폭풍저그'",
      '피의 게임 시즌2·3 연속 상위권',
    ],
    otherShows: [
      { show: 'The Genius: Rules of the Game', showKo: '더 지니어스: 게임의 법칙 (시즌1)', year: '2013', result: '우승', resultEn: 'Winner', rank: 1, fieldSize: 13 },
      { show: 'The Genius: Rule Breaker', showKo: '더 지니어스: 룰 브레이커 (시즌2)', year: '2014', result: '참가', resultEn: 'Contestant' },
      { show: 'The Genius: Grand Final', showKo: '더 지니어스: 그랜드 파이널 (시즌4)', year: '2015', result: '4위', resultEn: '4th', rank: 4, fieldSize: 13 },
      { show: 'The Time Hotel', showKo: '더 타임호텔', year: '2023', result: '참가', resultEn: 'Contestant' },
      { show: 'War of the Poker Gods', showKo: '포커 신들의 전쟁 (시즌2·3)', year: '2021–23', result: '시즌2 인비테이셔널 우승 · 시즌3 팀 마스터', resultEn: 'Won the season 2 invitational; team master in season 3' },
      { show: 'Project Genius', showKo: '프로젝트 지니어스 (투에이스)', year: '2022', result: '촬영 후 미공개', resultEn: 'Shot, never released' },
    ],
    priorSeasons: records['hong-jin-ho'] ?? [],
    priorElsewhere: [
      {
        show: 'The Genius: Rules of the Game (season 1)',
        showKo: '더 지니어스: 게임의 법칙 (시즌1)',
        year: '2013',
        result: '우승 · 가넷 79개',
        resultEn: 'Winner, on 79 garnets',
        arc: '13인 참가자 중 한 명으로 들어와 시리즈의 초대 우승자가 됐다. 가넷 79개를 모아 상금 7,900만 원을 가져갔고, 이 한 시즌으로 스타크래프트 은퇴 뒤의 그를 두뇌 게임 플레이어로 다시 세웠다 — 이후 한국 서바이벌 예능이 계속 그를 부르는 이유가 여기서 만들어졌다. 이듬해 시즌2 「룰 브레이커」에서는 중반에 탈락했고, 2015년 올스타전 「그랜드 파이널」에는 시즌1 우승자 자격으로 복귀했지만 10화 데스매치 양면포커에서 김경훈에게 지며 4위로 마쳤다.',
        arcEn:
          "He came in as one of thirteen players and left as the series' inaugural champion, banking 79 garnets and a prize of 79 million won. That single season re-cast him — the retired StarCraft professional became a brain-game player, which is the reason Korean survival television has kept calling ever since. He went out mid-season in season 2, Rule Breaker (룰 브레이커), the following year, and returned for the 2015 all-star season, Grand Final, as season 1's champion, where he lost the episode-ten Death Match at double-sided poker to Kim Kyung-hoon and finished fourth.",
        sources: [NAMU_GENIUS_S1, NAMU_GENIUS_S4],
      },
    ],
    x: {
      team: 'season3',
      teamLabelKo: '시즌3 팀',
      teamLabelEn: 'Season 3 team',
      billing: '두 시즌 연속 최상위권. 두 번 다 정상은 아니었다.',
      billingEn: "Top three in two consecutive seasons. Neither time was the top.",
    },
    confidence: 'high',
    sources: [`${NAMU}2`, `${NAMU}3`, LINEUP_1, 'https://namu.wiki/w/홍진호/포커%20플레이어', NAMU_PROJECT_GENIUS],
  },
  {
    id: 'seo-chul-gu',
    nameKo: '서출구',
    /* His STAGE NAME, not a romanisation of 서출구 — the bio two lines down has
       always said 활동명 XITSUH, and the English build was the only surface
       still calling him by a transliteration nobody uses. The romanisation moves
       to `aka` rather than being deleted: a reader who knows him as 서출구 will
       type "Seo Chul-gu", and search has to keep answering that. */
    nameEn: 'XITSUH',
    realNameKo: '서해랑',
    aka: ['Seo Chul-gu', 'Mr.Note'],
    occupation: 'Rapper · internet broadcaster',
    occupationKo: '래퍼 · 인터넷 방송인',
    category: 'musician',
    birthYear: '1992',
    pronouns: 'he',
    bio: '활동명 XITSUH로 활동하는 래퍼 겸 인터넷 방송인이다. 미국 브리검영대학교에 진학했다 중퇴했고, Mnet 「쇼미더머니5」로 이름을 알렸다. 피의 게임에는 시즌2와 시즌3에 연달아 출연했다.',
    notableFor: ['피의 게임 시즌2·3 연속 출연', "기록으로 판을 읽는 '메모광' 플레이", '「쇼미더머니5」 출연'],
    otherShows: [
      { show: 'Show Me The Money 4', showKo: '쇼미더머니 4', year: '2015', result: '4차 예선 탈락', resultEn: 'Out in the fourth preliminary' },
      { show: 'Show Me The Money 5', showKo: '쇼미더머니 5', year: '2016', result: '준결승 진출', resultEn: 'Reached the semi-final' },
      { show: 'High School Rapper', showKo: '고등래퍼', year: '2017', result: '멘토', resultEn: 'Mentor' },
      /* Three edges lean on facts that were only ever on the other person's
         page: the Netflix run he shares with 허성범, and the hold'em he took
         up after season 2 under 홍진호 and 현성주. */
      { show: 'Death Game: Bet Ten Million', showKo: '데스게임: 천만원을 걸어라 (넷플릭스)', year: '2026', result: '참가', resultEn: 'Contestant' },
      { show: 'Death Game 2: The Last Winner', showKo: '데스게임2: 최후의 승자 (넷플릭스)', year: '2026', result: '참가', resultEn: 'Contestant' },
      { show: 'Arte Poker 1:1 hold’em challenge', showKo: '아르테포커 1:1 홀덤 챌린지', result: '도전자', resultEn: 'Challenger' },
    ],
    priorSeasons: records['seo-chul-gu'] ?? [],
    /* Two franchise seasons, two Netflix series, a 쇼미더머니 semi-final and a
       고등래퍼 mentorship, all of it as bare rows — and three edges leaning on
       facts that were only legible on somebody else's page. */
    priorElsewhere: [
      {
        show: 'Show Me The Money, and the notebook',
        showKo: '쇼미더머니, 그리고 메모장',
        year: '2015–',
        result: '쇼미더머니4 4차 예선 탈락 → 쇼미더머니5 준결승 → 고등래퍼 멘토',
        resultEn: 'Out in the fourth prelim, then a semi-final, then a mentor',
        arc: '방송 이력은 두 번의 예선 성적 사이에 있다. 2015년 「쇼미더머니4」에서는 4차 예선에서 떨어졌고, 이듬해 「쇼미더머니5」에서는 준결승까지 올라갔다 — 이름을 알린 것은 이 한 시즌이다. 2017년 「고등래퍼」에서는 참가자가 아니라 멘토석에 앉았다. 활동명 XITSUH 옆에 붙은 또 하나의 이름이 Mr.Note이고, 피의 게임에서 그를 설명하는 것도 랩이 아니라 이쪽이다: 기록으로 판을 읽는 이른바 메모광 플레이. 하우스 바깥에서도 판은 이어져서, 2026년 넷플릭스 「데스게임: 천만원을 걸어라」와 후속작 「데스게임2: 최후의 승자」에 연달아 참가자로 나갔고, 현성주의 아르테포커 1:1 홀덤 챌린지에는 도전자로 앉았다. 이 모든 것보다 앞에 미국 브리검영대학교 진학과 중퇴가 있다.',
        arcEn:
          "His television record sits between two preliminary results. He went out in the fourth preliminary of Show Me The Money 4 (쇼미더머니4) in 2015 and reached the semi-final of Show Me The Money 5 the following year — that one season is what made his name. By 2017 he was on High School Rapper (고등래퍼) in the mentor's chair rather than the contestant's. Beside the stage name XITSUH sits a second one, Mr.Note, and it is the second that explains him in this house rather than the rap: reading a board by writing it down. The board kept going outside the house too — he was a contestant on Netflix's Death Game: Bet Ten Million Won (데스게임: 천만원을 걸어라) in 2026 and its sequel Death Game 2: The Last Winner, and sat down as the challenger in Hyun Seong-joo's Arte Poker one-on-one hold'em challenge. Before all of it, an American university, Brigham Young, entered and left.",
      },
    ],
    x: {
      team: 'season3',
      teamLabelKo: '시즌3 팀',
      teamLabelEn: 'Season 3 team',
      billing: '두 시즌 내내 남의 계산기였다. 상금은 한 번도 그의 것이 아니었다.',
      billingEn: "Two seasons spent as somebody else's calculator, and the prize was never his.",
    },
    confidence: 'high',
    sources: [`${NAMU}2`, `${NAMU}3`, LINEUP_1, 'https://namu.wiki/w/서출구', NAMU_DEATHGAME, NAMU_HSJ_POKER],
  },
  {
    id: 'choi-hye-sun',
    nameKo: '최혜선',
    nameEn: 'Choi Hye-sun',
    occupation: 'Influencer · life-sciences researcher',
    occupationKo: '인플루언서 · 연구원',
    category: 'creator',
    birthYear: '1998',
    pronouns: 'she',
    bio: '이화여자대학교에서 생명과학을 전공하고 영국 더럼대학교에서 석사를 마쳤다. 런던의 대학병원에서 근무한 이력이 있으며 인플루언서로도 활동한다. 넷플릭스 「솔로지옥3」 출연으로 대중에게 알려진 뒤 피의 게임 시즌3에 참가했다.',
    notableFor: ['넷플릭스 「솔로지옥3」 출연', '이화여대 생명과학 → 더럼대 석사', '런던 대학병원 근무 이력'],
    otherShows: [{ show: 'Single’s Inferno 3', showKo: '솔로지옥3', year: '2023–24', result: '출연', resultEn: 'Cast member' }],
    priorSeasons: records['choi-hye-sun'] ?? [],
    /* 솔로지옥3 was a one-line row on her own page while the same programme got
       a full paragraph on the edge it anchors — the exact inversion the note at
       the head of edges.ts was written to forbid, running the wrong way. */
    priorElsewhere: [
      {
        show: 'Ewha, Durham, a London hospital, and then a dating show',
        showKo: '이화여대에서 더럼, 런던의 병원, 그다음이 방송',
        year: '',
        result: '생명과학 학사 → 더럼대 석사 → 런던 대학병원 → 「솔로지옥3」',
        resultEn: "Life sciences, a Durham MSc, a London teaching hospital, then Single's Inferno 3",
        arc: '스무 명 가운데 가장 낯선 경로를 지나온 사람이다. 이화여자대학교에서 생명과학을 전공하고 영국 더럼대학교에서 석사를 마쳤으며, 런던의 대학병원에서 근무한 이력이 있다. 대중에게 이름이 알려진 것은 그 다음이다 — 2023~24년 넷플릭스 「솔로지옥3」 출연자로. 연구실과 병원에서 연애 리얼리티로, 거기서 다시 두뇌 서바이벌로 옮겨 온 순서이고, 여기 있는 나머지 열아홉 명 중 이 순서를 지나온 사람은 없다. 피의 게임3에 들어갔을 때 그의 방송 이력은 그 한 편이 전부였다.',
        arcEn:
          "Hers is the strangest route of the twenty. She read life sciences at Ewha Womans University, took a master's at Durham in England, and worked at a London teaching hospital. Public recognition came after all of that — as a cast member on Netflix's Single's Inferno 3 (솔로지옥3), 2023–24. Laboratory and hospital, then a dating reality show, then a brain survival: none of the other nineteen has taken that order. When she walked into Bloody Game 3, that one credit was the whole of her television record.",
      },
    ],
    x: {
      team: 'season3',
      teamLabelKo: '시즌3 팀',
      teamLabelEn: 'Season 3 team',
      billing: '데스매치를 58대 12로 이기고도 잔해로 내려갔던 사람.',
      billingEn: 'She won her Death Match 58 chips to 12 and was sent down to the ruins anyway.',
    },
    confidence: 'high',
    sources: [`${NAMU}3`, LINEUP_1],
  },
  {
    id: 'heo-seong-beom',
    nameKo: '허성범',
    nameEn: 'Heo Seong-beom',
    occupation: 'AI researcher (KAIST) · model',
    occupationKo: 'AI 연구자 (KAIST) · 모델',
    category: 'professional',
    birthYear: '2000',
    pronouns: 'he',
    bio: '한국과학영재학교를 거쳐 KAIST 전산학부를 졸업하고 김재철AI대학원 석사 과정을 밟고 있는 AI 연구자다. 쿠팡플레이 「대학전쟁」에서 카이스트팀 리더로 출연하며 이름을 알렸고, 캘빈클라인·LG 그램 모델로도 활동했다.',
    notableFor: ['KAIST 전산학부 → 김재철AI대학원', '「대학전쟁」 카이스트팀 리더', '피의 게임 시즌3 최연소 참가자'],
    otherShows: [
      { show: 'University War', showKo: '대학전쟁 (쿠팡플레이)', year: '2023', result: '카이스트팀 리더', resultEn: 'KAIST team leader' },
      { show: 'The Influencer', showKo: '더 인플루언서 (넷플릭스)', year: '2024', result: '참가', resultEn: 'Contestant' },
      { show: 'Death Game: Bet Ten Million', showKo: '데스게임: 천만원을 걸어라 (넷플릭스)', year: '2026', result: '참가', resultEn: 'Contestant' },
      { show: 'Death Game 2: The Last Winner', showKo: '데스게임2: 최후의 승자 (넷플릭스)', year: '2026', result: '참가', resultEn: 'Contestant' },
    ],
    priorSeasons: records['heo-seong-beom'] ?? [],
    /* The seventh. The review counted six returners with no block; the file
       held seven, and a returner with a KAIST team leadership and two Netflix
       series behind him is not a person the atlas has nothing to say about.
       With this one the split is 20 of 20 and the section stops meaning
       'somebody we could not find anything on'. */
    priorElsewhere: [
      {
        show: 'The KAIST seat, and what it kept getting him cast in',
        showKo: '카이스트 자리, 그리고 그 자리가 부른 것들',
        year: '2023–',
        result: '「대학전쟁」 카이스트팀 리더 → 「더 인플루언서」 → 넷플릭스 데스게임 2편',
        resultEn: 'KAIST team leader on University War, then The Influencer, then two Death Games',
        arc: '한국과학영재학교를 거쳐 KAIST 전산학부를 졸업하고 김재철AI대학원 석사 과정을 밟고 있는 AI 연구자다 — 이 목록에서 학교가 곧 캐스팅 사유였던 유일한 경우다. 2023년 쿠팡플레이 「대학전쟁」에 카이스트팀 리더로 나오면서 이름이 알려졌고, 그 뒤로 판이 계속 이어졌다: 2024년 넷플릭스 「더 인플루언서」 참가자, 2026년 「데스게임: 천만원을 걸어라」와 「데스게임2: 최후의 승자」 참가자. 캘빈클라인과 LG 그램 모델로도 섰다. 피의 게임3에 들어갈 때 그는 시즌 최연소였고, 이미 다른 서바이벌에서 팀을 이끌어 본 최연소이기도 했다.',
        arcEn:
          "He came through the Korea Science Academy, graduated from KAIST's School of Computing and is taking a master's at its Kim Jaechul Graduate School of AI — the one person here whose school was itself the reason he kept getting cast. University War (대학전쟁, Coupang Play, 2023) put him on television as the KAIST team's leader, and the boards did not stop: contestant on Netflix's The Influencer (더 인플루언서) in 2024, then on Death Game: Bet Ten Million Won (데스게임: 천만원을 걸어라) and Death Game 2: The Last Winner in 2026. He has also modelled for Calvin Klein and LG Gram. He entered Bloody Game 3 as the youngest player in the season, and as the youngest who had already led a team on a survival show.",
      },
    ],
    x: {
      team: 'season3',
      teamLabelKo: '시즌3 팀',
      teamLabelEn: 'Season 3 team',
      billing: '18명 중 가장 적은 돈으로 시작해 머니 챌린지를 네 번 이겼다.',
      billingEn: 'He started on the smallest bank of the eighteen and won four Money Challenges.',
    },
    confidence: 'high',
    sources: [`${NAMU}3`, LINEUP_1, NAMU_DEATHGAME],
  },

  /* ───────────────────────── 챌린저 팀 ───────────────────────── */
  {
    id: 'kim-kyung-hoon',
    nameKo: '김경훈',
    nameEn: 'Kim Kyung-hoon',
    occupation: 'Entrepreneur · founder of a consumer-goods brand',
    occupationKo: '사업가 · 브랜드 대표',
    category: 'professional',
    birthYear: '1988',
    pronouns: 'he',
    bio: '일리노이대 어바나-샴페인에서 재료공학을 전공하고 서울대 대학원에서 화학생물공학을 수학한 뒤 창업했다. 2023년 무카페인 대체커피 브랜드를 론칭했다. 두뇌 서바이벌 팬층에는 tvN 「더 지니어스: 그랜드 파이널」 준우승자로 잘 알려져 있다.',
    notableFor: ['「더 지니어스: 그랜드 파이널」 준우승', '「더 지니어스」 시즌3·4 연속 출연', '대체커피 브랜드 창업'],
    otherShows: [
      { show: 'The Genius: Black Garnet', showKo: '더 지니어스: 블랙가넷 (시즌3)', year: '2014', result: '12위', resultEn: '12th', rank: 12 },
      { show: 'The Genius: Grand Final', showKo: '더 지니어스: 그랜드 파이널 (시즌4)', year: '2015', result: '준우승', resultEn: 'Runner-up', rank: 2, fieldSize: 13 },
      { show: 'Society Game spinoffs / 금수저 전쟁', showKo: '금수저 전쟁', year: '2024', result: '공동 3위', resultEn: 'Joint 3rd' },
    ],
    priorSeasons: records['kim-kyung-hoon'] ?? [],
    priorElsewhere: [
      {
        show: 'The Genius: Grand Final (season 4)',
        showKo: '더 지니어스: 그랜드 파이널 (시즌4)',
        year: '2015',
        result: '준우승',
        resultEn: 'Runner-up',
        arc: '지원자 3,114명이 몰린 일반인 선발전을 뚫고 시즌3 「블랙가넷」에 들어왔지만, 1화 메인매치 과일가게에서 배신으로 가넷 2개를 챙기며 단독 우승한 것이 곧바로 표적이 됐고 2화 데스매치 베팅 가위바위보에서 강용석에게 패해 12위로 끝났다. 이듬해 올스타전 「그랜드 파이널」은 완전히 다른 시즌이었다. 가넷 0개에서 시작해 초반 세 회차 동안 일부러 어긋난 수를 두며 짜인 연합들을 무너뜨렸고, 3화 데스매치에서는 자신이 정신적 지주라 부르던 이상민을 베팅 가위바위보 22대 0으로 완파했다. 6화에서는 이준석의 편인 척하며 반대편을 도와 5인 공동 우승을 만들었고, 7화 데스매치에서 최정문을 같은 그림 찾기로 꺾었으며, 10화 데스매치 양면포커에서는 시즌1 우승자 홍진호를 이겨 탈락시켰고, 11화 하우머치에서는 권혁수의 지출 패턴을 계산해 단독 우승했다. 결승 숫자장기에서 장동민에게 지며 준우승으로 마감했다. 데스매치 세 번을 모두 이겼고 그중 둘은 그 시즌 최고 인지도의 두 사람이었다.',
        arcEn:
          "He came through an open selection that drew 3,114 applicants to reach season 3, Black Garnet (블랙가넷), and it ended fast: a solo win in the episode-one main match, the fruit shop, taken by betrayal for two garnets, marked him immediately, and he lost the episode-two Death Match at betting rock-paper-scissors to the lawyer Kang Yong-seok, finishing twelfth. The following year's all-star season, Grand Final, was a different animal. Starting from zero garnets, he spent the first three episodes playing deliberately wrong moves that collapsed the coordinated alliances around him, and in the episode-three Death Match he took apart Lee Sang-min — the man he had been calling his anchor — 22 to nil at betting rock-paper-scissors. In episode six he passed as an ally of the politician Lee Jun-seok while quietly working for the other side, engineering a five-way joint win; in episode seven he beat Choi Jung-moon at matching pairs; in the episode-ten Death Match, at Two-Sided Poker, he put out Hong Jin-ho, the champion of season 1; and in episode eleven he read the comedian Kwon Hyuk-soo's spending pattern and won How Much outright. He lost the final to Jang Dong-min at number chess and finished runner-up. He won all three of his Death Matches, and two of them were against the best-known players in the season.",
        sources: [NAMU_KKH_GENIUS, NAMU_GENIUS_S3, NAMU_GENIUS_S4],
      },
    ],
    x: {
      team: 'challenger',
      teamLabelKo: '챌린저 팀',
      teamLabelEn: 'Challengers',
      billing: '「더 지니어스」 마지막 시즌의 준우승자.',
      billingEn: "Runner-up of the final season of The Genius.",
    },
    confidence: 'high',
    sources: [LINEUP_2, LINEUP_3],
  },
  {
    id: 'kim-yoo-hyun',
    nameKo: '김유현',
    nameEn: 'Kim Yoo-hyun',
    occupation: 'Professional poker player · former English instructor',
    occupationKo: '프로 포커 플레이어 · 前 영어강사',
    category: 'poker',
    birthYear: '1988',
    /* The 김경훈 edge is built on the shared UIUC degree and this bio used to
       say only "미국에서 수학" — the premise of the line was legible on
       김경훈's page and invisible on 김유현's. */
    pronouns: 'he',
    bio: '홍콩·중국 국제학교를 거쳐 일리노이 대학교 어배너-섐페인(UIUC) 컴퓨터공학과를 다니다 중퇴했다. tvN 「더 지니어스: 블랙가넷」에 일반인 참가자로 출연해 이름을 알렸고, 이어 「그랜드 파이널」에도 참가했다. 한때 영어강사로 전업했다가 2022년 포커 플레이어로 복귀했고 2023년 APL 사이드이벤트에서 우승했다.',
    notableFor: ['「더 지니어스」 시즌3·4 연속 출연', 'UIUC 컴퓨터공학 중퇴', '2023 APL 미스터리 바운티 우승', '일반인 참가자로 시작해 프로 전향'],
    otherShows: [
      { show: 'The Genius: Black Garnet', showKo: '더 지니어스: 블랙가넷 (시즌3)', year: '2014', result: '5위', resultEn: '5th', rank: 5 },
      { show: 'The Genius: Grand Final', showKo: '더 지니어스: 그랜드 파이널 (시즌4)', year: '2015', result: '9위', resultEn: '9th', rank: 9, fieldSize: 13 },
      { show: 'Project Genius', showKo: '프로젝트 지니어스 (투에이스)', year: '2022', result: '촬영 후 미공개', resultEn: 'Shot, never released' },
    ],
    priorSeasons: records['kim-yoo-hyun'] ?? [],
    priorElsewhere: [
      {
        show: 'The Genius: Black Garnet (season 3)',
        showKo: '더 지니어스: 블랙가넷 (시즌3)',
        year: '2014',
        result: '5위',
        resultEn: '5th',
        arc: '일반인 선발전을 통해 들어온 참가자였고, 직업은 프로 갬블러로 소개됐다. 2화에서는 “이렇게 된 이상 저희 모여보죠”라며 범죄자 편을 직접 묶어냈고, 4화 검과 방패에서는 있지도 않은 쌍검을 있는 것처럼 밀어붙이는 블러핑으로 판을 가져갔다 — 포커 테이블에서 하던 일을 그대로 보드로 옮겨온 플레이였다. 8화 데스매치를 이기고 살아남았지만, 9화 기억의 미로 데스매치에서 하연주에게 기억력으로 밀려 5위로 마쳤다.',
        arcEn:
          "He arrived through the open selection, introduced on air as a professional gambler. In episode two he pulled the criminals' side together himself — if this is where we are, he said, let us at least get organised — and in episode four's Sword and Shield he carried the board on a bluff, pushing a pair of swords he did not hold as though he did: his table game, moved intact onto a board. He survived the episode-eight Death Match and then lost the episode-nine one, Memory Maze, to the actor Ha Yeon-joo on pure recall, finishing fifth.",
        sources: [NAMU_KYH_GENIUS, NAMU_GENIUS_S3],
      },
      {
        show: 'The Genius: Grand Final (season 4)',
        showKo: '더 지니어스: 그랜드 파이널 (시즌4)',
        year: '2015',
        result: '9위',
        resultEn: '9th',
        arc: '13인 올스타 라인업에 시즌3 대표로 합류했다. 4화 메인매치 생선가게에서는 308원 차이로 우승을 놓쳤고, 5화 충신과 역적에서 데스매치에 몰려 김경란과 인디언 포커로 맞붙었다. 프로 갬블러로 소개된 참가자가 정작 카운팅 전략을 너무 일찍 드러낸 것이 패인이었고, 그 회차의 결론은 팀을 위해 헌신한 쪽이 죽고 배신한 쪽이 살아남았다는 문장으로 정리됐다.',
        arcEn:
          "He joined the thirteen-player all-star line-up as season 3's representative. In the episode-four main match, the fish shop, he missed the win by 308 won, and in episode five, Loyal Subject and Traitor, he was pushed into the Death Match against the broadcaster Kim Kyung-ran at Indian poker. The professional gambler lost it by showing his counting strategy too early, and the episode closed on the line that the one who gave everything for the team died and the one who betrayed it lived.",
        sources: [NAMU_KYH_GENIUS, NAMU_GENIUS_S4],
      },
    ],
    x: {
      team: 'challenger',
      teamLabelKo: '챌린저 팀',
      teamLabelEn: 'Challengers',
      billing: '일반인 참가자로 시작해 프로 포커 플레이어가 되어 돌아왔다.',
      billingEn: 'He arrived on television as an amateur and has come back a professional.',
    },
    confidence: 'high',
    sources: [LINEUP_2, LINEUP_3, NAMU_GENIUS_S3, NAMU_GENIUS_S4, NAMU_KYH_GENIUS, NAMU_PROJECT_GENIUS],
  },
  {
    id: 'kim-nam-hee',
    nameKo: '김남희',
    nameEn: 'Kim Nam-hee',
    occupation: 'Broadcaster · former sports announcer',
    occupationKo: '방송인 · 前 SBS스포츠 아나운서',
    category: 'broadcaster',
    birthYear: '1989',
    pronouns: 'she',
    bio: '숙명여대를 졸업하고 2015년 SBS스포츠 아나운서로 입사한 방송인이다. IQ 156의 멘사 코리아 회원으로 tvN 「뇌섹시대 – 문제적 남자」 등에 출연하며 두뇌형 방송인으로 알려졌다. 서바이벌 예능 「더 타임호텔」에도 출연했다.',
    notableFor: ['IQ 156 멘사 코리아 회원', '2014 미스 서울 선(善)', '「더 타임호텔」 출연', '前 SBS스포츠 아나운서'],
    otherShows: [
      { show: 'The Time Hotel', showKo: '더 타임호텔', result: '참가', resultEn: 'Contestant' },
      { show: 'Problematic Men', showKo: '뇌섹시대 – 문제적 남자', year: '2016', result: '출연', resultEn: 'Guest' },
      /* The 최연청 edge rests on this and it was visible on only one end of
         it — 최연청's Miss Korea year is in her own otherShows, this one was
         nowhere on this page. 선(善) is the regional runner-up placing. */
      { show: 'Miss Korea', showKo: '미스코리아', year: '2014', result: '서울 선(善)·친선상', resultEn: 'Miss Seoul, Seon (2nd) and the congeniality award' },
    ],
    priorSeasons: records['kim-nam-hee'] ?? [],
    priorElsewhere: [
      {
        show: 'The Time Hotel',
        showKo: '더 타임 호텔 (TVING)',
        year: '2023',
        result: '2일차 탈락',
        resultEn: 'Out on day two',
        arc: '10인 참가자 중 1일차 VIP를 맡았고, 그 자리를 그대로 판을 짜는 데 썼다. 황제성과 존박을 먼저 포섭했고 그 둘이 다시 홍진호를 끌어들이면서 4인 연합이 완성됐다. 문제는 그 연합이 완성된 다음이다. 본인은 2일차에 탈락했고, 남은 세 명은 끝까지 한 번도 갈라지지 않은 채 홍황존이라 불리며 나란히 결승에 올랐다. 시즌에서 가장 오래 버틴 연합을 만든 사람이 그 연합의 첫 이탈자가 된 셈이다.',
        arcEn:
          "She held the day-one VIP position among ten players and spent it building the board. She recruited the comedian Hwang Je-sung and the singer John Park first; those two brought in Hong Jin-ho, and the four-way alliance was complete. What happened next is the story: she went out on day two, and the remaining three never split once, running to the final together under the nickname Hong-Hwang-John. The person who assembled the longest-standing alliance of the season was the first to leave it.",
        sources: [NAMU_TIME_HOTEL, 'https://ko.wikipedia.org/wiki/%EB%8D%94_%ED%83%80%EC%9E%84_%ED%98%B8%ED%85%94'],
      },
    ],
    x: {
      team: 'challenger',
      teamLabelKo: '챌린저 팀',
      teamLabelEn: 'Challengers',
      billing: '스포츠 중계석에서 나온 멘사 회원. 서바이벌은 「더 타임호텔」에서 이미 한 번 겪었다.',
      billingEn: 'A Mensa member out of the sports desk, who has already been through one survival house on The Time Hotel.',
    },
    confidence: 'high',
    sources: [LINEUP_2, LINEUP_3, NAMU_KNH],
  },
  {
    id: 'kang-ji-hoo',
    nameKo: '강지후',
    nameEn: 'Kang Ji-hoo',
    occupation: 'KAIST mathematics undergraduate',
    occupationKo: 'KAIST 수리과학과 재학생',
    category: 'other',
    birthYear: '2004',
    pronouns: 'he',
    bio: '경기북과학고를 조기졸업하고 KAIST 수리과학과에 22학번으로 입학한 학생으로, 쿠팡플레이 두뇌 서바이벌 「대학전쟁3」에 카이스트 팀으로 출전해 3위를 기록했다. 이번 라인업에서 유일한 현역 학생 참가자이자 가장 어린 참가자다.',
    notableFor: ['「대학전쟁3」 3위', '경기북과학고 조기졸업 · KAIST 수리과학과 22학번', '라인업 내 유일한 현역 학생'],
    otherShows: [{ show: 'University War 3', showKo: '대학전쟁3 (쿠팡플레이)', year: '2025–26', result: '카이스트팀 3위', resultEn: 'KAIST team, 3rd' }],
    priorSeasons: records['kang-ji-hoo'] ?? [],
    priorElsewhere: [
      {
        show: 'University War 3',
        showKo: '대학전쟁3 (쿠팡플레이)',
        year: '2025–26',
        result: '카이스트팀 3위',
        resultEn: 'KAIST team, 3rd',
        arc: '쿠팡플레이 「대학전쟁3」(2025.12.12~2026.01.23, 8부작)에 카이스트 대표로 출전했다. 김재한·김지우·전지민과 넷이서 한 팀을 이뤄 서울대 메디컬·서울대 이공계·포스텍·연세대·성균관대와 겨뤘고, 준결승까지 올라간 뒤 7라운드에서 탈락해 3위로 마쳤다. 우승은 상금 8,000만 원을 가져간 서울대 메디컬 팀이었고, 준우승은 성균관대 메디컬 팀이었다. 이 라인업에서 그의 이력서는 가장 짧지만, 두뇌 서바이벌을 실제로 끝까지 치러 본 경험은 여기서 나온다.',
        arcEn:
          "He represented KAIST on Coupang Play's University War 3 (대학전쟁3, 12 December 2025 – 23 January 2026, eight episodes). He played as one of a four-person team with Kim Jae-han, Kim Ji-woo and Jeon Ji-min against Seoul National University's medical and engineering squads, POSTECH, Yonsei and Sungkyunkwan; they reached the semi-finals and went out in round seven, finishing third. Seoul National's medical team took the championship and the 80-million-won prize, with Sungkyunkwan's medical team runner-up. His is the shortest résumé in this lineup, but this is where the experience of actually playing a brain-survival series to the end comes from.",
        sources: [NAMU_UNIWAR_3],
      },
    ],
    x: {
      team: 'challenger',
      teamLabelKo: '챌린저 팀',
      teamLabelEn: 'Challengers',
      billing: '이 라인업에서 유일하게 아직 학교에 다니는 사람.',
      billingEn: 'The only person in this lineup still enrolled in anything.',
    },
    confidence: 'medium',
    sources: [LINEUP_2, LINEUP_3, 'https://namu.wiki/w/대학전쟁3'],
  },

  /* ───────────────────────── 루키 팀 ───────────────────────── */
  {
    id: 'kwak-beom',
    nameKo: '곽범',
    nameEn: 'Kwak Beom',
    aka: ['매드몬스터 탄'],
    occupation: 'Comedian',
    occupationKo: '개그맨',
    category: 'comedian',
    birthYear: '1986',
    pronouns: 'he',
    bio: '4년간 도전한 끝에 2012년 KBS 공채 27기 개그맨이 됐고 「개그콘서트」 코너로 얼굴을 알렸다. 현재는 메타코미디 소속으로, 이창호와 함께 유튜브 채널 「빵송국」을 운영하며 가상 아이돌 그룹 「매드몬스터」를 만들어 큰 화제를 모았다.',
    notableFor: ['KBS 공채 27기 개그맨', '유튜브 「빵송국」 공동 운영', "가상 아이돌 '매드몬스터' 기획·출연"],
    otherShows: [
      { show: 'Gag Concert', showKo: '개그콘서트', year: '2012–2020', result: '고정 출연', resultEn: 'Series regular' },
      /* The 이상민 edge turns on the year — a fixed member since March 2016 and
         a guest in 2025 — and the year was missing from this end of it. */
      { show: 'Knowing Bros', showKo: '아는 형님', year: '2025–26', result: '469회 해설위원 · 513회 게스트', resultEn: 'Commentator on ep. 469, guest on ep. 513' },
      { show: 'King of Mask Singer', showKo: '복면가왕', year: '2021, 2025', result: '출연', resultEn: 'Contestant' },
      { show: 'Comedy Royale', showKo: '코미디 로얄 (넷플릭스)', year: '2023', result: '참가', resultEn: 'Contestant' },
    ],
    priorSeasons: records['kwak-beom'] ?? [],
    priorElsewhere: [
      {
        show: 'Bbangsongguk / Mad Monster',
        showKo: '빵송국 · 매드몬스터',
        year: '2020–',
        result: '기획·출연 — 음원차트 진입',
        resultEn: 'Created it, performs in it — and charted',
        arc: '2020년 5월 19일 이창호와 유튜브 채널 「빵송국」을 열었다. 「검사 드라마에 무조건 나오는 장면」 시리즈가 터지며 채널이 빠르게 커졌고, 여기서 만들어진 가상 아이돌 「매드몬스터」의 탄 역을 그가 맡았다. 채널 개설 1년 만에 이 B급 스케치 캐릭터는 스케치 밖으로 걸어나갔다 — 2021년 4월 28일 발표한 「내 루돌프」가 멜론 76위, 지니 82위, 벅스 23위까지 오르며 실제 음원차트에 진입했고, 데뷔 기자회견과 안무 논란, 얼굴 보정 의혹까지 실제 아이돌이 겪는 절차를 그대로 밟았다. 개그맨이 만든 농담 하나가 산업의 형식을 통째로 빌려 쓴 사례다.',
        arcEn:
          "He opened the YouTube channel Bbangsongguk (빵송국) with Lee Chang-ho on 19 May 2020. The series Scenes That Are Always in a Prosecutor Drama took off and the channel grew fast, and out of it came the virtual idol duo Mad Monster (매드몬스터), with Kwak Beom playing Tan. Within a year of the channel opening, the B-grade sketch character walked out of the sketch: I Rudolf (내 루돌프), released on 28 April 2021, charted for real at 76 on Melon, 82 on Genie and 23 on Bugs, and the act went through the whole apparatus a real idol goes through — debut press conference, a choreography dispute, allegations of retouched faces. A comedian's joke borrowed an industry's entire format and kept it.",
        sources: [NAMU_KWAK, NAMU_MADMONSTER],
      },
    ],
    x: {
      team: 'rookie',
      teamLabelKo: '루키 팀',
      teamLabelEn: 'Rookies',
      billing: '4년을 떨어지고 붙은 공채 개그맨. 가짜 아이돌 하나를 진짜로 만들었다.',
      billingEn: 'Four years of failed auditions before KBS took him, and one fake idol group he made real.',
    },
    confidence: 'high',
    sources: [LINEUP_2, LINEUP_3, NAMU_KWAK, 'https://namu.wiki/w/아는%20형님/방영%20목록/2026년%20상반기'],
  },
  {
    id: 'lee-gwan-hee',
    nameKo: '이관희',
    nameEn: 'Lee Gwan-hee',
    occupation: 'KBL basketball player',
    occupationKo: '프로농구 선수 (KBL)',
    category: 'athlete',
    birthYear: '1988',
    /* The bio used to stop at 원주 DB, which let the 솔로지옥 edge and this page
       disagree about where he plays. The career timeline is owned by the
       priorElsewhere below; the bio names only the club he is at now. */
    pronouns: 'he',
    bio: '연세대 출신 프로농구 슈팅가드로, 2011년 KBL 드래프트로 서울 삼성 썬더스에 입단한 뒤 창원 LG와 원주 DB를 거쳐 2025년 삼성으로 돌아왔다. 자유투 성공률 리그 1위를 두 차례 기록했다. 넷플릭스 「솔로지옥3」 출연으로 예능 인지도도 얻었다.',
    notableFor: ['KBL 프로농구 선수', '자유투 성공률 리그 1위 2회', '넷플릭스 「솔로지옥3」 출연'],
    otherShows: [
      { show: 'Single’s Inferno 3', showKo: '솔로지옥3', year: '2023–24', result: '출연', resultEn: 'Cast member' },
      /* Where he said on the record that nothing came of the final couple —
         the sentence the 최혜선 edge is built on. */
      { show: 'Eat Breakfast Before You Go 2', showKo: '아침먹고 가2', year: '2024', result: '게스트', resultEn: 'Guest' },
    ],
    priorSeasons: records['lee-gwan-hee'] ?? [],
    priorElsewhere: [
      {
        show: 'KBL career',
        showKo: 'KBL 프로농구',
        year: '2011–',
        result: '통산 628경기 5,880점',
        resultEn: '5,880 points in 628 games',
        arc: '2011년 KBL 드래프트 2라운드 5순위로 서울 삼성 썬더스에 지명됐다 — 1라운드가 아니라 2라운드였다는 사실이 이후 그의 커리어를 설명하는 숫자가 된다. 삼성에서 열 시즌(2011~2021)을 뛴 뒤 창원 LG(2021~2024)와 원주 DB(2024~2025)를 거쳐 2025년 삼성으로 돌아왔다. 통산 628경기에서 5,880점, 야투 46.49%, 3점 33.66%, 자유투 80.87%를 기록했고, 자유투 성공률은 2018-19시즌 82.0%와 2021-22시즌 85.9%로 두 차례 리그 1위에 올랐다. 2022년 올스타전 3점슛 콘테스트 우승자이며, 2025년 2월 13일에는 2라운드 출신 선수 통산 최다 득점 기록이던 5,200점을 처음으로 넘어섰다. 이 라인업에서 아직 현역인 유일한 운동선수다.',
        arcEn:
          "He was taken 5th in the second round of the 2011 KBL draft by the Seoul Samsung Thunders — the fact that it was the second round and not the first is the number that explains the career that followed. Ten seasons at Samsung (2011–2021), then Changwon LG (2021–2024), Wonju DB (2024–2025), and back to Samsung in 2025. Across 628 games he has scored 5,880 points, shooting 46.49% from the field, 33.66% from three and 80.87% from the line, and he led the league in free-throw percentage twice, at 82.0% in 2018-19 and 85.9% in 2021-22. He won the three-point contest at the 2022 All-Star Game, and on 13 February 2025 he passed 5,200 career points — the standing record for a second-round pick, and the first time anyone drafted in that round had gone by it. He is the only athlete in this lineup still playing.",
        sources: [NAMU_LGH],
      },
    ],
    x: {
      team: 'rookie',
      teamLabelKo: '루키 팀',
      teamLabelEn: 'Rookies',
      billing: '라인업에서 유일하게 아직 코트에 서 있는 운동선수.',
      billingEn: 'The only athlete in this lineup who is still playing.',
    },
    confidence: 'high',
    sources: [LINEUP_2, LINEUP_3, 'https://namu.wiki/w/이관희'],
  },
  {
    id: 'shin-seung-yong',
    nameKo: '신승용',
    nameEn: 'Shin Seung-yong',
    occupation: 'Physician',
    occupationKo: '의사 · 피부·미용',
    category: 'professional',
    birthYear: '1992',
    /* 서울대 is on the record; 서울대 의대 is not. His 학력 reads 이천고등학교
       졸업 / 서울대학교 졸업 and names no college, so the bio stops there — the
       inference from "doctor + SNU" to "SNU medicine" is the one an editor
       most wants to make here and the one the source will not carry. It still
       sharpens the 이진형 line, which is now a shared university rather than
       a shared profession alone. */
    pronouns: 'he',
    bio: '이천고등학교를 거쳐 서울대학교를 졸업한 의사로, 지금은 강남의 피부과 의원 원장으로 피부·모발 쪽 진료를 본다. 인플루언서로도 활동한다. TVING 「환승연애4」에 12화부터 합류하며 대중에게 알려졌고, 피의 게임 시리즈에는 이번이 첫 출연이다.',
    notableFor: ['TVING 「환승연애4」 출연', '서울대학교 졸업', '강남 피부과 의원 원장', '유튜브 「퀸승용」 운영'],
    otherShows: [
      { show: 'EXchange 4', showKo: '환승연애4 (TVING)', year: '2025–26', result: '12화 합류', resultEn: 'Joined in episode 12' },
      { show: 'Queen Seung-yong (YouTube)', showKo: '퀸승용 (유튜브)', year: '2026–', result: '곽민경과 공동 운영', resultEn: 'Runs it with Gwak Min-kyung' },
    ],
    priorSeasons: records['shin-seung-yong'] ?? [],
    priorElsewhere: [
      {
        show: 'EXchange 4',
        showKo: '환승연애4 (TVING)',
        year: '2025–26',
        result: '곽민경과 실제 연인',
        resultEn: 'A real couple with Gwak Min-kyung',
        arc: '헤어진 연인들을 한집에 모아 놓는 TVING 「환승연애」의 네 번째 시즌에 출연했다. 이 시리즈에서 방송이 끝난 뒤 실제 연인으로 이어진 사례로 꼽히는데, 상대 출연자 곽민경과는 방송이 나가기도 전에 이미 사귀고 있었다고 본인들이 밝혔다. 두 사람은 2026년 3월 「퀸승용」이라는 이름의 유튜브 채널을 함께 열었다. 그가 실제로 통과해 본 리얼리티는 감정을 다루는 쪽이었고, 이번이 그의 첫 두뇌 서바이벌이다.',
        arcEn:
          "He appeared on the fourth season of TVING's EXchange (환승연애), the series that puts former couples back under one roof. It is cited as the case in the franchise that turned into a relationship after broadcast: he and his fellow cast member Gwak Min-kyung have said they were already together before the season aired. In March 2026 the two opened a YouTube channel together under the name Queen Seung-yong (퀸승용). The reality format he has actually been through is the one about feelings; a brain-survival house is new to him.",
        sources: [NAMU_SSY, PRESS_SSY_YT],
      },
    ],
    x: {
      team: 'rookie',
      teamLabelKo: '루키 팀',
      teamLabelEn: 'Rookies',
      billing: '이 라인업의 두 번째 의사. 앞의 한 명은 우승했다.',
      billingEn: 'The second doctor in this lineup. The first one won a season.',
    },
    confidence: 'medium',
    sources: [LINEUP_2, LINEUP_3, NAMU_SSY, PRESS_SSY_YT],
  },
  {
    id: 'choi-yeon-cheong',
    nameKo: '최연청',
    nameEn: 'Choi Yeon-cheong',
    realNameKo: '최규리',
    occupation: 'Actor',
    occupationKo: '배우',
    category: 'actor',
    birthYear: '1993',
    /* 전라북도 came out of this bio once because her own page does not carry it,
       and it is back because the pageant's own 역대 참가자 table does — where
       both she and 김남희 are listed as regional entrants. It matters that it
       came back rather than staying out: the English bio had gone on saying
       'the Jeollabuk-do regional final' the whole time, so the declared source
       of record was the vaguer of the two, which is the same inversion the
       이관희 club line was corrected for. The RANK the table gives (전북 미) is
       still not stated anywhere — press has called it 선 — and the note on the
       김남희 edge explains why a contested award is left off rather than picked.
       The Mensa card is attested by the casting wire (PRESS_CYC_MENSA) and not
       by her page, which is worth knowing because the 김남희 line rests on it. */
    pronouns: 'she',
    bio: '국립국악고등학교와 단국대학교 국악과를 나온 배우로, 2013년 만 19세에 미스코리아 전북 대표로 출전한 뒤 2014년 모델로 데뷔했다. IQ 156의 멘사 코리아 회원이며, 드라마 「미스 함무라비」와 영화 등에 출연하며 한국과 중국을 오가며 활동해 왔다.',
    notableFor: [
      'IQ 156 멘사 코리아 회원',
      '국립국악고 · 단국대 국악과 출신 배우',
      '2012 부천복사골국악대회 명인부 최우수상',
      '드라마 「미스 함무라비」 출연',
    ],
    otherShows: [
      { show: 'Miss Hammurabi', showKo: '미스 함무라비 (JTBC)', year: '2018', result: '출연', resultEn: 'Cast member' },
      { show: 'Miss Korea', showKo: '미스코리아', year: '2013', result: '출전 (만 19세)', resultEn: 'Competed, at nineteen' },
    ],
    priorSeasons: records['choi-yeon-cheong'] ?? [],
    priorElsewhere: [
      {
        show: 'Acting career, Korea and China',
        showKo: '배우 활동 (한국·중국)',
        year: '2016–2023',
        result: '드라마·영화 다수 · 중국 광고 최다 출연 기록',
        resultEn: 'Screen work in both countries, and an advertising record in China',
        arc: '2016년 SBS 「고호의 별이 빛나는 밤에」로 화면에 처음 얼굴을 비쳤고, 소속사는 이엘파크(2020~2022)와 씨제스 스튜디오(2023~2024)를 거쳐 지금은 무소속이다. 2018년 JTBC 「미스 함무라비」에 조연으로 출연했다. 영화로는 「창궐」(2018)의 단역을 거쳐 「원펀치」(2019)와 「턴: 더 스트릿」(2021)에서 주연을 맡았고, 웹드라마 「너의 시선이 머무는 곳에」(2020)에서는 혜미 역이었다. 활동의 절반은 중국에 있다 — 한국 배우로는 처음으로 현지 대형 기획사 얼동판싱과 계약했고, 2018~2019년에는 한국인 최다 중국 광고 출연 기록을 세웠다. 두 나라에서 배역을 따내며 십 년 가까이 버틴 이력이 그가 이 집에 들고 들어오는 전부다.',
        arcEn:
          "She first appeared on screen in SBS's Gogh, The Starry Night (고호의 별이 빛나는 밤에) in 2016 and took a supporting role in JTBC's Miss Hammurabi (미스 함무라비) in 2018; she was managed by ELPark (이엘파크) from 2020 to 2022 and by C-JeS Studio (씨제스 스튜디오) from 2023 to 2024, and is unsigned now. On film she went from a bit part in Rampant (창궐, 2018) to leads in One Punch (원펀치, 2019) and Turn: The Street (턴: 더 스트릿, 2021), and played Hye-mi in the 2020 web drama Where Your Eyes Linger (너의 시선이 머무는 곳에). Half the career is in China: she was the first Korean actor signed by the major agency Erdong Fanxing, and across 2018–2019 held the record for the most advertising work in China by a Korean. Close to a decade of winning parts in two countries is what she brings into this house.",
        sources: [NAMU_CYC],
      },
      /* Her page had one block and it was the acting CV — which made the one
         person here with no franchise history, no brain-survival history and a
         single parallel tie read as someone about whom there is only a filmog-
         raphy. There is a whole earlier career under it, with two dated prizes
         in it, and it is the answer to what she is actually trained to do.

         Every figure below is quoted from her page rather than characterised:
         '2000년 전국피아노콩쿨대회 최연소 1위 특상 수상', '2012년 부천복사골
         국악대회 명인부 최우수상 수상', '서울대학교 국악과에 진학하고 싶어서
         국립국악고등학교에 진학하게 됐다'. The 명인부 is the open division —
         the one you enter against career players — which is why the year and
         the division are both in the sentence and neither is glossed as 'a
         prize'. The SNU line is stated as the aim it was and not as anything
         else: she went to 단국대. It is worth having exactly because two other
         people in this lineup did go to 서울대 and one of them is the other end
         of a parallel edge; an ambition is not an alumni tie and the sentence
         has to be unable to be read as one. */
      {
        show: 'Gayageum, and the years before the camera',
        showKo: '카메라 앞에 서기 전의 십오 년',
        year: '1999–2016',
        result: '전국피아노콩쿨대회 최연소 1위 특상 · 부천복사골국악대회 명인부 최우수상',
        resultEn: 'A youngest-ever piano prize, and a top award in an open gugak division',
        arc: '연기는 두 번째 직업이다. 여섯 살에 피아노와 가야금을 동시에 시작했고, 가야금은 본인이 고른 것이 아니라 어머니와 함께 배우기 시작한 쪽이었다. 2000년 전국피아노콩쿨대회에서 최연소로 1위 특상을 받았고, 2012년 부천복사골국악대회에서는 명인부 — 경력 연주자들과 같은 부문 — 최우수상을 받았다. 학교도 그 길로 갔다. 서울대학교 국악과에 가고 싶어서 국립국악고등학교에 진학했고, 결국 단국대학교 국악과를 졸업했다. 이 라인업에서 악기를 전공으로 배운 사람은 그가 유일하고, 열다섯 해를 들인 그 훈련이 화면에 처음 쓰인 것은 2015년 뮤직비디오였다.',
        arcEn:
          "Acting is the second career. She started piano and gayageum at six — the gayageum was not her choice but something she took up alongside her mother — and in 2000 took the youngest-ever first-place special prize at the national piano competition. In 2012 she won the top award in the 명인부, the open division of the Bucheon Boksagol gugak competition, the one entered against career performers. Her schooling followed the instrument: she went to the National Gugak High School because she wanted a place in Seoul National University's gugak department, and graduated from Dankook University's instead. She is the only person in this lineup trained on an instrument as a discipline, and the first thing fifteen years of it was used for on screen was a music video in 2015.",
        sources: [NAMU_CYC],
      },
    ],
    x: {
      team: 'rookie',
      teamLabelKo: '루키 팀',
      teamLabelEn: 'Rookies',
      billing: '라인업에 멘사 회원은 둘. 그중 연기로 먹고사는 쪽이다.',
      billingEn: 'Two Mensa members in this lineup; she is the one who acts for a living.',
    },
    confidence: 'medium',
    sources: [LINEUP_2, LINEUP_3, NAMU_CYC, PRESS_CYC_MENSA, MISS_KOREA_ENTRANTS],
  },
];
