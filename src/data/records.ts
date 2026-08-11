import type { SeasonRun } from './types';

/**
 * What each returning player actually did in seasons 1–3.
 *
 * Placements were adjudicated against the season result tables on 나무위키 and
 * the Korean Wikipedia entry, with per-day and per-episode pages used to break
 * ties. Where two sources genuinely disagree, the alternative wording is kept
 * in the placement string rather than hidden.
 *
 * Nothing here touches season X. Players with no entry simply have no
 * franchise history yet.
 *
 * PLACEMENT STRINGS CARRY THE FIELD SIZE. A rank without a denominator is not
 * a fact, it is a number: 3위 in a field of 13 and 3위 in a field of 18 are
 * different results, and the app printed both as "3위". So every contestant
 * placement is written "3위 / 18명 중 · 3rd of 18" — rank first, because the
 * surfaces that show only the head of the string (the Track record table, the
 * gallery card) split on the first " · " and must not lose the rank. Winners
 * are the exception: "우승" needs no denominator to be read, so the field size
 * goes after the dot ("우승 · 13명 중 1위") and the head stays one word.
 *
 * ELIMINATION MECHANICS LIVE HERE, NOT IN edges.ts. Two edges used to supply
 * their own account of how Park Ji-min reached her season-2 Death Match and
 * the two accounts disagreed. The sequence is written once, below, in her own
 * season-2 arc; the edges describe only their own pair.
 *
 * EVERY RUN CARRIES ITS OWN CITATIONS. The header above says these placements
 * were adjudicated against per-day and per-episode pages; until this round it
 * said so and then did not link them, so the longest and most argued-over prose
 * in the app was the only text in it with no source list. Cite the narrowest
 * page that actually carries the claim — see `SeasonRun.sources`.
 *
 * EVERY RUN ALSO CARRIES ITS OWN `scope`. This file is the densest concentration
 * of spoilable claims in the dataset, and `scope` is what a later phase reads to
 * decide whether a reader has earned them — see the note at the head of types.ts
 * and the inclusion test in works.ts. Three things are worth knowing before
 * editing a run:
 *
 *   1. A RUN'S SCOPE IS ITS OWN SEASON, AND THE PROSE SOMETIMES IS NOT. Fourteen
 *      of these sixteen runs are `['bg1']`, `['bg2']` or `['bg3']` end to end.
 *      Two are not: 홍진호's season-3 arc opens on "다시 3위" and closes on
 *      "시즌2에 이어 또 3위", and 박지민's season-3 arc has a returning player
 *      calling her by the season-1 nickname 배신의 아이콘. A sentence that names
 *      one season's outcome inside another season's arc needs BOTH ids, or it
 *      hides one and leaks the other.
 *
 *   2. TEAMS ARE SCOPED UNIFORMLY, ON PURPOSE. '저택팀' on its own looks like
 *      structure — a side, like a bloc — and three of these strings plainly are
 *      not: '저택팀 → 야생팀' is a defection, '지하팀 (8일차 지상 복귀)' names a
 *      day, '피의 저택 → 지하 감옥 → 복귀' is an elimination and a return. The
 *      temptation is to scope the arrows and leave the plain names visible, and
 *      that is exactly the subtraction PLAN-spoilers.md §5 warns about: if the
 *      innocent ones show and the interesting ones seal, a sealed team label
 *      becomes a reliable signal that something happened. So every contestant
 *      run's team takes the season's scope, including 박지민's bare '지상팀'.
 *      In season 1 that is not even a stretch — upstairs versus basement was
 *      decided by vote, so the side is a result.
 *
 *   3. `[]` MEANS "READ, AND IT IS STRUCTURE" AND IS NOT THE SAME AS ABSENT.
 *      Absent means nobody has looked, and a later phase hides it. The two runs
 *      that are not runs at the prize — 이상민 on the studio panel, 박지민 as
 *      season 3's dealer — keep their season as the run-level DEFAULT so that a
 *      field added here later fails closed, and assert `[]` field by field on
 *      what they actually carry: a role label is not a finish.
 */

/* Season indexes and result tables. */
const S1 = 'https://namu.wiki/w/피의%20게임(시즌%201)';
const S1_CAST = 'https://namu.wiki/w/피의%20게임(시즌%201)/참가자';
const S1_RESULT = 'https://namu.wiki/w/피의%20게임(시즌%201)/내용%20및%20진행%20결과';
const S2 = 'https://namu.wiki/w/피의%20게임2';
const S2_CAST = 'https://namu.wiki/w/피의%20게임2/참가자';
const S2_RESULT = 'https://namu.wiki/w/피의%20게임2/진행%20결과';
const S3 = 'https://namu.wiki/w/피의%20게임3';
const S3_CAST = 'https://namu.wiki/w/피의%20게임3/참가자';

/* Per-day pages. Season 1 is the only season broken out this way, and only
   three of its days have their own page — the three these arcs turn on. */
const S1_D3 = 'https://namu.wiki/w/피의%20게임(시즌%201)/3일차';
const S1_D4 = 'https://namu.wiki/w/피의%20게임(시즌%201)/4일차';
const S1_D8 = 'https://namu.wiki/w/피의%20게임(시즌%201)/8일차';

/* A player's own 피의 게임 subpage, where one exists — the narrowest page for
   an arc about that player. 이상민, 정근우, 이태균 and 서출구 have none, so
   their runs cite the season result table instead. */
const P_PJM = 'https://namu.wiki/w/박지민(아나운서)/피의%20게임';
const P_HASJ = 'https://namu.wiki/w/하승진/피의%20게임';
const P_HYSJ = 'https://namu.wiki/w/현성주/피의%20게임';
const P_YB = 'https://namu.wiki/w/윤비/피의%20게임';
const P_LJH = 'https://namu.wiki/w/이진형(1995)/피의%20게임';
const P_HJH = 'https://namu.wiki/w/홍진호/피의%20게임';
const P_CHS = 'https://namu.wiki/w/최혜선/피의%20게임';
const P_HSB = 'https://namu.wiki/w/허성범/피의%20게임';
const P_SCG = 'https://namu.wiki/w/서출구';

/* Contemporaneous press, for the two runs whose most quotable lines are the
   player's own words rather than a result table.
   iMBC, 2021.11.30 — 박지민 on designing rounds 1–3 and what it cost her:
     "친하게 지내던 사람들이 마지막으로 저한테 인사하는 눈빛들이 너무 차가워서".
   뉴스1, 2023.06.12 — the interview whose headline is the sentence 이진형's
   season is remembered by: "아름다운 패배보다 추악한 승리 택해…아쉬움". */
const PRESS_PJM_S1 = 'https://enews.imbc.com/Tpl/View/331883';
const PRESS_LJH_WIN = 'https://www.news1.kr/entertain/interview/5073627';
/* iMBC, 2022.01.18 — the season-1 final, and the only non-wiki page that states
   the prize figure this arc turns on: "'우승' 이태균, 상금 1억 800만 원 획득!
   최연승 '후회 없어'". It also names the final game (러닝 퍼즐) and both
   finalists' own words. The franchise's first champion previously had the
   largest single number in the dataset resting on a wiki alone. */
const PRESS_LTG_WIN = 'https://enews.imbc.com/News/RetrieveNewsInfo/336040';

export const records: Record<string, SeasonRun[]> = {
  'lee-sang-min': [
    {
      season: 1,
      role: 'panel',
      /* The run-level default is the season he was present for, so that a field
         added here later inherits a tag rather than nothing. Every field he
         actually carries then overrides it: he never entered the house and this
         run states no result — the placement is a seat, and the arc is the
         panel's composition and its remit. The exception is the third beat,
         which is only true against a field size, and a field size is the
         denominator PLAN-spoilers.md §3 says makes a placing recoverable. */
      scope: ['bg1'],
      scopes: {
        placement: [],
        arc: [],
        beats: [[], [], ['bg1']],
      },
      placement: '스튜디오 패널 · Studio panel',
      sources: [S1, S1_CAST],
      arc: '시즌1에서는 저택에 들어가지 않았다. 코미디언 장동민, 방송인 박지윤, 경제 유튜버 슈카월드, 가수 최예나와 함께 앉은 다섯 명의 패널 중 ‘브레인 군단’의 수장으로 소개됐고, 이 패널진은 게임에 개입하지 않고 저택 상황을 관전·해설하는 역할만 했다. 판을 가장 오래 들여다봤지만 그 안에서 한 번도 당해 본 적은 없는 사람이다.',
      beats: [
        '‘브레인 군단’ 수장 자격의 스튜디오 패널 5인 중 한 명',
        '게임에는 일절 개입하지 않는 관전·해설 자리',
        '참가자로 자주 오기되지만 시즌1 참가자 10인 명단에는 없다',
      ],
    },
  ],

  'park-ji-min': [
    {
      season: 1,
      role: 'contestant',
      scope: ['bg1'],
      fieldSize: 10,
      team: '지상팀',
      teamEn: 'Upstairs team',
      rank: 4,
      placement: '4위 / 10명 중 · 4th of 10',
      sources: [P_PJM, S1_RESULT, S1_D4, PRESS_PJM_S1],
      eliminatedEpisode: '11일차 파이널 1라운드',
      eliminatedEpisodeEn: 'Day 11, the first final round',
      arc: 'MBC 아나운서로 참가해 시즌1 최대의 실세가 됐다. 2일차 분배 게임에서 킹을 맡은 참가자 최연승이 자신을 퀸으로 지목했는데도 상대 연합에 정보를 흘려 그를 7표로 지하실에 보냈고, 4일차에는 거짓 눈물 연기로 정근우의 자진 탈락을 끌어내 돈 한 푼 쓰지 않고 경쟁자를 지웠다. 이후 머니 챌린지를 연달아 우승하며 탈락 면제권을 쓸어담았고, 투표로 탈락자를 정하는 시즌1 구조에서 최종화까지 단 한 표도 받지 않은 유일한 참가자가 됐다. 파이널 1라운드에서 네 명 중 꼴찌가 되며 끝났다.',
      beats: [
        '자신을 퀸으로 지목한 킹 최연승을 그대로 팔아넘긴 2일차',
        '거짓 눈물 연기로 정근우의 자진 탈락을 유도한 4일차',
        '최종화까지 단 한 표도 받지 않은 유일한 참가자 — 별명 ‘박쥐민’',
      ],
    },
    {
      season: 2,
      role: 'contestant',
      scope: ['bg2'],
      fieldSize: 13,
      team: '히든 플레이어 (저택 잠입)',
      teamEn: 'Hidden player, embedded in the mansion',
      rank: 13,
      placement: '13위 / 13명 중 · 시즌2 첫 탈락자',
      sources: [P_PJM, S2_RESULT, S2_CAST],
      eliminatedEpisode: '습격의 날 전 데스매치',
      eliminatedEpisodeEn: 'Death Match, before the Day of the Raid',
      arc: '시즌2 최대의 반전 캐스팅이었다. 겉으로는 저택 내부팀이었지만 실제로는 덱스(前 UDT 출신 방송인)·홍진호와 함께 하루 먼저 시작한 히든 플레이어 측 스파이로, 저택 정보를 야생팀에 넘기는 역할이었다. 그러나 판도라의 상자 힌트를 이진형에게 공유했다가 그대로 배신당해 초반부터 의심을 샀고, 저택 안에서 고립되며 임무 자체에 실패했다. 데스매치 진출자를 정하는 투표에서는 남녀 머릿수를 앞세운 ‘성별 갈라치기’ 논리를 가장 먼저 꺼낸 하승진이 그를 지목했고, 이미 표가 몰린 상황에서 박지민 본인도 자신을 지목해 결국 데스매치에 나갔다. 상대는 유리사였고, 자신이 설계에 참여한 습격의 날을 보지도 못한 채 시즌2의 첫 탈락자가 됐다.',
      beats: [
        '저택 내부팀으로 위장한 히든 플레이어 측 스파이',
        '이진형에게 힌트를 건넸다가 그대로 배신당함',
        '자신이 설계한 습격의 날을 보지 못하고 첫 탈락',
      ],
    },
    {
      season: 3,
      role: 'crew',
      /* Her season-3 seat is not a run at the prize, so the 'placement' is a job
         title and gives nothing away. The arc is the split case: it opens on
         that job (structure), turns on a reveal production held to episode 6,
         and closes on a returning player calling her by the season-1 nickname
         배신의 아이콘 — a verdict on how she played season 1, four years and two
         seasons earlier. Reading the arc whole therefore needs bg1 AND bg3;
         reading it in parts needs much less. */
      scope: ['bg3'],
      scopes: {
        placement: [],
        arc: ['bg1', 'bg3'],
        beats: [[], ['bg3'], []],
      },
      placement: '유령 카지노 딜러 · 연옥 집사',
      sources: [P_PJM, S3_CAST],
      arcParts: [
        {
          text: '두 시즌을 플레이어로 뛴 뒤, 시즌3에서는 경쟁자가 아니라 판을 굴리는 쪽으로 자리를 옮겼다 — 잔해에 설치된 유령 카지노의 딜러 겸 연옥 담당 집사이고, 상금을 놓고 겨루는 참가자가 아닌 보조 출연이다. ',
          scope: [],
        },
        {
          text: '제작진이 그의 출연 사실 자체를 반전 카드로 아껴둔 탓에 첫 등장은 6화(4일차)였고, 그래서 시즌3을 본 사람도 그가 나왔다는 것 자체를 기억하지 못하는 경우가 많다. ',
          scope: ['bg3'],
        },
        {
          text: '전 시리즈를 모니터링하고 들어온 참가자들은 그의 얼굴을 알아봤다 — 장동민은 개인 인터뷰에서 “이제 뭐 피의 게임 안방마님이시네”라 했고, 시윤은 “어? 이 배신의 아이콘이 여기 왜 있지?”라며 시즌1 시절의 별명을 그대로 불렀다.',
          scope: ['bg1', 'bg3'],
        },
      ],
      arc: '두 시즌을 플레이어로 뛴 뒤, 시즌3에서는 경쟁자가 아니라 판을 굴리는 쪽으로 자리를 옮겼다 — 잔해에 설치된 유령 카지노의 딜러 겸 연옥 담당 집사이고, 상금을 놓고 겨루는 참가자가 아닌 보조 출연이다. 제작진이 그의 출연 사실 자체를 반전 카드로 아껴둔 탓에 첫 등장은 6화(4일차)였고, 그래서 시즌3을 본 사람도 그가 나왔다는 것 자체를 기억하지 못하는 경우가 많다. 전 시리즈를 모니터링하고 들어온 참가자들은 그의 얼굴을 알아봤다 — 장동민은 개인 인터뷰에서 “이제 뭐 피의 게임 안방마님이시네”라 했고, 시윤은 “어? 이 배신의 아이콘이 여기 왜 있지?”라며 시즌1 시절의 별명을 그대로 불렀다.',
      beats: [
        '참가자가 아니라 잔해 유령 카지노의 딜러 겸 연옥 집사 — 보조 출연',
        '출연 자체가 반전 카드였던 탓에 첫 등장은 6화(4일차)',
        '시즌 1·2·3에 모두 등장한 유일한 인물',
      ],
    },
  ],

  'jung-keun-woo': [
    {
      season: 1,
      role: 'contestant',
      scope: ['bg1'],
      fieldSize: 10,
      team: '지하팀 (8일차 지상 복귀)',
      teamEn: 'Basement team, back upstairs on day 8',
      rank: 7,
      placement: '7위 / 10명 중 · 7th of 10',
      sources: [S1_RESULT, S1_D4, S1_D8, S1_CAST],
      eliminatedEpisode: '9일차 지상팀 패배로 탈락',
      eliminatedEpisodeEn: 'Day 9, out when the upstairs team lost',
      arc: '저택 시절에는 게임에 시큰둥한 태도로 혹평을 받았다. 4일차에 상대가 추가 투표권을 사지 못하게 막는 페이크 전략에 가담했다가, 박지민이 흘린 (사실은 연기였던) 눈물을 보고 마음이 약해져 “다시 배신하는 건 도리가 아니다”라며 스스로 탈락을 택하고 지하실로 내려갔다. 지하층에서는 제작진이 만든 가짜 규칙과 계급 놀이까지 군말 없이 받아들이고 몸 쓰는 노동을 도맡으며 저택 시절의 평가를 통째로 뒤집었다. 8일차에 지상으로 복귀했지만 9일차 지상팀 패배로 최종 탈락했다.',
      beats: [
        '거짓 눈물에 흔들려 스스로 탈락을 선택하고 지하실행',
        '지하층에서 가짜 규칙까지 받아들이며 평가를 뒤집음',
        '9일차 지상팀 패배로 최종 탈락',
      ],
    },
  ],

  'lee-tae-gyun': [
    {
      season: 1,
      role: 'contestant',
      scope: ['bg1'],
      fieldSize: 10,
      team: '지하팀',
      teamEn: 'Basement team',
      rank: 1,
      placement: '우승 · 10명 중 1위',
      sources: [S1_RESULT, S1_D3, S1_D8, S1_CAST, PRESS_LTG_WIN],
      arc: '가장 먼저 저택에서 쫓겨난 축에 속하면서도 우승한 인물이다. 3일차에 덱스(前 UDT 출신 방송인)에게 던진 떠보기 한마디가 도청당해 배신자로 낙인찍혔고, 사실상 전원의 표를 받고 지하층으로 내려갔다. 지하실에서 금고 암호를 혼자 풀어냈고, 보일러실 통로를 맨몸으로 타고 올라가 거실 TV에 숨겨져 있던 진짜 열쇠를 찾아내 지하팀의 지상 침입 루트를 열었다. 8일차 전략 수식 게임에서는 카드를 한 장도 남기지 않는 완전 수식으로 지상팀을 꺾었고, 파이널 2라운드 ‘러닝 퍼즐’에서 완승하며 상금 1억 800만 원을 가져갔다.',
      beats: [
        '3일차, 도청당한 한마디로 낙인찍혀 지하실행',
        '보일러실 통로를 맨몸으로 올라가 TV 속 진짜 열쇠를 찾아냄',
        '파이널 ‘러닝 퍼즐’ 완승 — 상금 1억 800만 원',
      ],
    },
  ],

  'ha-seung-jin': [
    {
      season: 2,
      role: 'contestant',
      fieldSize: 13,
      team: '저택팀',
      teamEn: 'Mansion team',
      scope: ['bg2'],
      rank: 8,
      placement: '8위 / 13명 중 · 6번째 탈락자',
      sources: [P_HASJ, S2_RESULT, S2_CAST],
      eliminatedEpisode: '데스매치 ‘패턴 블록’ 4:1 패배',
      eliminatedEpisodeEn: 'Lost the ‘Pattern Block’ Death Match 4–1',
      /* Split, because the first sentence is a career and the rest is a season.
         한국인 최초 NBA 진출 is biography — it is already on his own bio line and
         in notableFor, both of which stay visible — and nobody is part-way
         through somebody's NBA career. */
      arcParts: [
        { text: '한국인 최초 NBA 진출이라는 피지컬 캐릭터로 들어왔다. ', scope: [] },
        {
          text: '습격의 날에는 큰 체구를 살려 상징물을 지키는 자리에 배치됐지만 덱스(前 UDT 출신 방송인)의 기습에 상징물이 깨졌고, 조롱당했다고 오해해 멱살을 잡고 몸싸움을 벌였다(이후 사과). 이후 래퍼 넉스, 윤비와 수영장 연합을 꾸렸고, ‘낮과 밤’에서 상대 진영의 소통을 물리적으로 방해하는 전략을 밀어붙였다가 역풍을 맞아 탈락 후보가 됐다. 데스매치 ‘패턴 블록’에서 4:1로 완패했다.',
          scope: ['bg2'],
        },
      ],
      arc: '한국인 최초 NBA 진출이라는 피지컬 캐릭터로 들어왔다. 습격의 날에는 큰 체구를 살려 상징물을 지키는 자리에 배치됐지만 덱스(前 UDT 출신 방송인)의 기습에 상징물이 깨졌고, 조롱당했다고 오해해 멱살을 잡고 몸싸움을 벌였다(이후 사과). 이후 래퍼 넉스, 윤비와 수영장 연합을 꾸렸고, ‘낮과 밤’에서 상대 진영의 소통을 물리적으로 방해하는 전략을 밀어붙였다가 역풍을 맞아 탈락 후보가 됐다. 데스매치 ‘패턴 블록’에서 4:1로 완패했다.',
      beats: [
        '습격의 날, 상징물이 깨지고 벌어진 멱살잡이',
        '넉스·윤비와 꾸린 수영장 연합',
        '데스매치 ‘패턴 블록’ 4:1 완패',
      ],
    },
  ],

  'hyun-seong-joo': [
    {
      season: 2,
      role: 'contestant',
      fieldSize: 13,
      team: '저택팀',
      teamEn: 'Mansion team',
      scope: ['bg2'],
      rank: 11,
      placement: '11위 / 13명 중 · 3번째 탈락자',
      sources: [P_HYSJ, S2_RESULT],
      eliminatedEpisode: '데스매치 ‘미스터리 넘버’ 17:24 패배',
      eliminatedEpisodeEn: 'Lost ‘Mystery Number’ 17–24',
      /* The case works.ts's inclusion test is written around. A WSOP bracelet is
         a title held in the world, not an ending somebody is waiting to watch,
         and 포커 방송에서 이미 접점이 있어 is WHERE two people met, which the
         plan keeps. So the opening sentence is structure and the four that
         follow it are a season 2 that ends 17:24. */
      arcParts: [
        {
          text: '세계 포커 대회 우승 경력자로, 홍진호와는 포커 방송에서 이미 접점이 있어 ‘두 포커 플레이어의 맞대결’이 초반 관전 포인트로 홍보됐다. ',
          scope: [],
        },
        {
          text: '1일차 머니 챌린지에서 규칙의 빈틈을 파고드는 편법 플레이로 존재감을 냈고, 저택 안에서는 스파이를 색출하는 작업에도 참여했다. 첫 데스매치 ‘시크릿 다이스’에서는 특수 아이템을 선점하고 심리전을 완전히 지배하며 살아남았지만, 이어진 ‘미스터리 넘버’에서 17:24로 패했다. 예측은 좋았고 암기가 발목을 잡았다.',
          scope: ['bg2'],
        },
      ],
      arc: '세계 포커 대회 우승 경력자로, 홍진호와는 포커 방송에서 이미 접점이 있어 ‘두 포커 플레이어의 맞대결’이 초반 관전 포인트로 홍보됐다. 1일차 머니 챌린지에서 규칙의 빈틈을 파고드는 편법 플레이로 존재감을 냈고, 저택 안에서는 스파이를 색출하는 작업에도 참여했다. 첫 데스매치 ‘시크릿 다이스’에서는 특수 아이템을 선점하고 심리전을 완전히 지배하며 살아남았지만, 이어진 ‘미스터리 넘버’에서 17:24로 패했다. 예측은 좋았고 암기가 발목을 잡았다.',
      beats: [
        '1일차, 규칙의 빈틈을 파고든 편법 플레이',
        '‘시크릿 다이스’에서 심리전을 지배하며 한 번 생존',
        '‘미스터리 넘버’ 17:24 패배 — 3번째 탈락자',
      ],
    },
  ],

  'yoon-bi': [
    {
      season: 2,
      role: 'contestant',
      fieldSize: 13,
      team: '저택팀 → 야생팀',
      teamEn: 'Mansion team → outside team',
      /* The arc opens on a different programme's ending. 생존남녀: 갈라진 세상 is
         a survival with a winner and he is the winner, so it is a work in its
         own right — see works.ts. Union-tagging the arc ['bg2',
         'survival-men-women'] would cost a season-2 viewer the whole paragraph
         to protect one clause about a show they have never heard of, and cost a
         생존남녀 viewer the clause they are entitled to. Hence the split, and
         `scopes.arc` is the union only for a reader who takes the string whole. */
      scope: ['bg2'],
      scopes: { arc: ['bg2', 'survival-men-women'] },
      rank: 7,
      placement: '7위 / 13명 중 · 데스매치 도중 기권',
      sources: [P_YB, S2_RESULT, S2],
      eliminatedEpisode: '이진형이 지목한 데스매치',
      eliminatedEpisodeEn: 'Death Match, named by Lee Jin-hyung',
      arcParts: [
        { text: '웹예능 서바이벌 우승 경력을 안고 들어왔다. ', scope: ['survival-men-women'] },
        {
          text: '저택 내부팀으로 시작했지만 습격 직전 밤에 히든 플레이어들에게 포섭돼 야생팀으로 넘어갔고, 다시 이탈해 하승진·래퍼 넉스와 수영장 연합을 꾸리는 등 소속을 여러 번 갈아탔다. 정점은 ‘낮과 밤’ 우승으로, 개인 자금과 면제권을 챙기고 저택의 권력자가 되어 서출구를 야생으로 추방했으며, 판도라의 상자를 몰래 먼저 열어 전 참가자의 자금을 균등 재분배시켰다. 그러나 동맹이라 믿었던 이진형에게 데스매치 상대로 지목당했고, 규칙을 끝까지 이해하지 못한 채 게임 도중 기권을 선언했다.',
          scope: ['bg2'],
        },
      ],
      arc: '웹예능 서바이벌 우승 경력을 안고 들어왔다. 저택 내부팀으로 시작했지만 습격 직전 밤에 히든 플레이어들에게 포섭돼 야생팀으로 넘어갔고, 다시 이탈해 하승진·래퍼 넉스와 수영장 연합을 꾸리는 등 소속을 여러 번 갈아탔다. 정점은 ‘낮과 밤’ 우승으로, 개인 자금과 면제권을 챙기고 저택의 권력자가 되어 서출구를 야생으로 추방했으며, 판도라의 상자를 몰래 먼저 열어 전 참가자의 자금을 균등 재분배시켰다. 그러나 동맹이라 믿었던 이진형에게 데스매치 상대로 지목당했고, 규칙을 끝까지 이해하지 못한 채 게임 도중 기권을 선언했다.',
      beats: [
        '‘낮과 밤’ 우승으로 권력자가 되어 서출구를 야생으로 추방',
        '판도라의 상자를 몰래 열어 전원 자금을 균등 재분배',
        '동맹이라 믿은 이진형에게 지목당해 데스매치 도중 기권',
      ],
    },
  ],

  'lee-jin-hyung': [
    {
      season: 2,
      role: 'contestant',
      fieldSize: 13,
      team: '저택팀',
      teamEn: 'Mansion team',
      scope: ['bg2'],
      rank: 1,
      placement: '우승 · 13명 중 1위',
      sources: [P_LJH, S2_RESULT, PRESS_LJH_WIN],
      arc: '초반에는 남성 연합에 속해 있었으나 패배의 책임을 지지 않는다는 이유로 축출됐고, 이후 규모가 작은 소수 연합을 꾸려 다수 연합의 틈을 파고드는 방식으로 살아남았다. 후반부에는 사실상 시즌 최대의 킬러였다 — 동맹이라 믿던 윤비를 데스매치로 제거하고, 곧이어 마지막 파트너마저 직접 떨어뜨려 자기 연합을 스스로 정리했다. 파이널 1라운드에서 서출구를 17:8로 꺾고 최종 라운드 ‘정글 메이즈’에서 우승했다. 개인 자금이 0원이었던 탓에 실수령액은 우승 상금 5,000만 원뿐이었고, “아름다운 패배보다 추악한 승리를 택했다”는 소감과 함께 호불호가 크게 갈렸다.',
      beats: [
        '남성 연합에서 축출된 뒤 소수 연합으로 재기',
        '동맹 윤비에 이어 마지막 파트너까지 직접 제거',
        '“아름다운 패배보다 추악한 승리” — 개인 자금 0원, 상금 5,000만 원',
      ],
    },
  ],

  'hong-jin-ho': [
    {
      season: 2,
      role: 'contestant',
      fieldSize: 13,
      team: '히든 플레이어 · 야생팀',
      teamEn: 'Hidden player, outside team',
      scope: ['bg2'],
      rank: 3,
      placement: '3위 / 13명 중 · 3rd of 13',
      sources: [P_HJH, S2_RESULT],
      eliminatedEpisode: '파이널 1라운드 ‘컬러턴’ 패배',
      eliminatedEpisodeEn: 'Lost the first final round, ‘Colour Turn’',
      arc: '시즌2 최연장자이자 두뇌 서바이벌의 대명사로, 덱스(前 UDT 출신 방송인)·박지민과 함께 하루 먼저 야생에서 시작한 히든 플레이어였다. 저택 인원을 밤마다 포섭해 서출구·윤비를 끌어들이며 연합의 정치적 축을 맡았다. 습격의 날에 CCTV를 확인하러 가다 어두운 계단에서 미끄러져 발목이 골절됐고, 이후 시즌 전체를 깁스와 목발로 소화했다. 세미파이널을 1위로 통과했지만 파이널 1라운드 ‘컬러턴’에서 자기 색이 아닌 아무 색으로 4목을 만들려 한 룰 오해가 결정적이어서 패했다.',
      beats: [
        '히든 플레이어로 시작해 서출구·윤비를 포섭',
        '습격의 날 계단에서 발목 골절 — 이후 깁스와 목발로 완주',
        '세미파이널 1위, 그러나 ‘컬러턴’에서 룰을 오해해 탈락',
      ],
    },
    {
      season: 3,
      role: 'contestant',
      fieldSize: 18,
      team: '낙원',
      teamEn: 'Paradise',
      /* The one arc in the file that is about two seasons at once. It opens on
         '다시 3위' and closes on '시즌2에 이어 또 3위' — both sentences state a
         season-3 result AND the season-2 result it is being measured against,
         so both need bg2 and bg3 or they hide one and leak the other. The
         middle, which is most of it, is season 3 alone. The third beat is the
         same sentence in miniature. */
      scope: ['bg3'],
      scopes: {
        arc: ['bg2', 'bg3'],
        beats: [['bg3'], ['bg3'], ['bg2', 'bg3']],
      },
      rank: 3,
      placement: '3위 / 18명 중 · 3rd of 18',
      sources: [P_HJH, S3_CAST, S3],
      eliminatedEpisode: '파이널 · 라운드 승 0',
      eliminatedEpisodeEn: 'The final — not one round won',
      arcParts: [
        { text: '올스타 성격의 시즌3에서도 다시 3위에 올랐다. ', scope: ['bg2', 'bg3'] },
        {
          text: '1일차 머니 챌린지 최하위로 데스매치에 몰렸지만 최혜선과 짝을 이뤄 상대 조를 압도적으로 꺾고 살아남았고, 최혜선을 이긴 척 위장한 채 낙원에 스파이로 복귀하는 변칙 플레이로 시즌을 열었다. 중반에는 신뢰하던 모델 출신 참가자 유리사에게 배신당해 감정 소모가 컸다. ',
          scope: ['bg3'],
        },
        {
          text: '준결승을 2위로 통과해 결승에 직행했지만 파이널에서는 단 한 라운드도 따내지 못했고, 시즌2에 이어 또 3위에 그치며 ‘2인자’ 이미지가 재확인됐다.',
          scope: ['bg2', 'bg3'],
        },
      ],
      arc: '올스타 성격의 시즌3에서도 다시 3위에 올랐다. 1일차 머니 챌린지 최하위로 데스매치에 몰렸지만 최혜선과 짝을 이뤄 상대 조를 압도적으로 꺾고 살아남았고, 최혜선을 이긴 척 위장한 채 낙원에 스파이로 복귀하는 변칙 플레이로 시즌을 열었다. 중반에는 신뢰하던 모델 출신 참가자 유리사에게 배신당해 감정 소모가 컸다. 준결승을 2위로 통과해 결승에 직행했지만 파이널에서는 단 한 라운드도 따내지 못했고, 시즌2에 이어 또 3위에 그치며 ‘2인자’ 이미지가 재확인됐다.',
      beats: [
        '1일차 데스매치 승리를 숨기고 낙원에 스파이로 복귀',
        '유리사의 배신으로 감정 소모가 컸던 중반',
        '두 시즌 연속 3위 — 파이널 라운드 승수 0',
      ],
    },
  ],

  'seo-chul-gu': [
    {
      season: 2,
      role: 'contestant',
      fieldSize: 13,
      team: '저택팀 → 야생팀',
      teamEn: 'Mansion team → outside team',
      scope: ['bg2'],
      rank: 4,
      placement: '4위 / 13명 중 · 4th of 13 (본인 문서는 홍진호와 공동 3위로 표기)',
      sources: [P_SCG, S2_RESULT, S2_CAST],
      eliminatedEpisode: '파이널 1라운드 8:17 패배',
      eliminatedEpisodeEn: 'Lost the first final round 8–17',
      arc: '저택 내부팀으로 시작했으나 습격 이전 밤에 히든 플레이어들에게 포섭돼 야생팀으로 넘어갔고, 이후 홍진호와 가장 단단한 2인 페어를 이루며 연합의 실무를 맡았다. 계산력이 강점이라 수식 계열 머니 챌린지를 지배했고, 연속 우승으로 저택의 권력자가 되면서 이진형과 윤비를 각각 야생으로 추방하는 등 판을 직접 설계했다. 파이널 1라운드에서 이진형의 더블 선언 전략에 말려 8:17로 패했다. 최종 개인 자금은 참가자 중 가장 많았지만 승자독식 구조라 실수령액은 0원이었다.',
      beats: [
        '홍진호와 이룬 가장 단단한 2인 페어',
        '권력자가 되어 이진형·윤비를 야생으로 추방',
        '잔액 1위였지만 승자독식 규칙에 상금 0원',
      ],
    },
    {
      season: 3,
      role: 'contestant',
      fieldSize: 18,
      team: '피의 저택 → 지하 감옥 → 복귀',
      teamEn: 'The mansion of blood → the underground prison → back in',
      scope: ['bg3'],
      rank: 6,
      placement: '6위 / 18명 중 · 6th of 18',
      sources: [P_SCG, S3_CAST, S3],
      arc: '순위가 가장 오해받기 쉬운 인물이다. 2일차 데스매치에서 패해 ‘탈락’ 처리됐지만 시즌3에서 그것은 완전 탈락이 아니라 지하 감옥 수감이었고, 4일차 데스매치를 1위로 통과해 게임에 복귀했다. 복귀 후에는 계산력을 앞세워 연합의 두뇌 역할을 했고, 9일차 ‘Try13’에서는 자신이 짜낸 필승법으로 자기 연합을 통째로 태워 최혜선의 단독 우승을 만들어 줬다. 필담 룰 논란 때는 제작진에게 “편집하지 말고 그대로 방송에 넣어 달라”고 요구했고 실제로 그 장면이 통째로 전파를 탔다.',
      beats: [
        '2일차 탈락 → 지하 감옥 수감 → 4일차 1위로 복귀',
        '‘Try13’ 필승법으로 자기 연합을 태워 최혜선을 우승시킴',
        '“편집하지 말고 그대로 방송해 달라”고 요구한 필담 룰 논란',
      ],
    },
  ],

  'choi-hye-sun': [
    {
      season: 3,
      role: 'contestant',
      fieldSize: 18,
      team: '낙원 → 잔해',
      teamEn: 'Paradise → the ruins',
      scope: ['bg3'],
      rank: 10,
      placement: '10위 / 18명 중 · 10th of 18',
      sources: [P_CHS, S3_CAST],
      eliminatedEpisode: '10일차 데스매치 탈락',
      eliminatedEpisodeEn: 'Day 10, out of the Death Match',
      arc: '1일차에 낙원 소속으로 홍진호와 짝을 이뤄 데스매치에 나가 상대 조를 58칩 대 12칩으로 완파했지만, 규칙에 따라 잔해로 내려가게 됐고 홍진호만 그를 이긴 척 위장하고 낙원에 남았다. 중반에는 거점이 재편될 때마다 소속이 흔들렸으나 서출구·충주맨(공무원 출신 유튜버) 연합에 붙어 생존선을 유지했다. 정점은 9일차 ‘Try13’으로, 서출구가 만든 필승법에 제대로 올라타 75점으로 시즌 첫 단독 우승을 거두며 자금 2,000만 원과 면제권 2장을 챙겼다. 그러나 바로 다음날 데스매치에서 자기 타일을 스스로 가둬 득점 경로를 막는 실수를 하며 최하위로 탈락했다.',
      beats: [
        '1일차 데스매치를 이기고도 규칙상 잔해로 내려감',
        '9일차 ‘Try13’ 75점 단독 우승 — 자금 2,000만 원 + 면제권 2장',
        '다음날 자기 타일을 가두는 실수로 최하위 탈락',
      ],
    },
  ],

  'heo-seong-beom': [
    {
      season: 3,
      role: 'contestant',
      fieldSize: 18,
      team: '피의 낙원 → 잔해 → 개인전',
      teamEn: 'The paradise of blood → the ruins → solo play',
      scope: ['bg3'],
      rank: 4,
      placement: '4위 / 18명 중 · 4th of 18',
      sources: [P_HSB, S3_CAST],
      arc: '시작 자금 500만 원, 18인 중 최저로 출발했지만 개인전 강자로 시즌을 통째로 끌어올렸다. 머니 챌린지를 네 번 우승해 시즌 최다 타이를 기록했다. 2일차 우승 보상으로 받은 판도라의 상자에서 하필 페널티 면을 열어 낙원의 습격 방어 조건 자체를 바꿔 버린 것이 시즌 중반의 큰 변수로 남았다. 준결승을 2위로 통과해 결승에 올랐지만, 파이널 1라운드에서 작품명의 한 글자를 빠뜨린 표기 실수가 결정타가 되어 라운드 승리를 하나도 챙기지 못한 채 4위로 마감했다.',
      beats: [
        '최저 자금 500만 원에서 시작해 머니 챌린지 4승',
        '판도라의 상자에서 페널티 면을 열어 낙원의 방어 조건을 뒤집음',
        '파이널 1R, 작품명 한 글자를 빠뜨린 치명적 실수',
      ],
    },
  ],
};
