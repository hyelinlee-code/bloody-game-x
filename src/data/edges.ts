import type { Edge, EdgeType } from './types';

/**
 * WHAT COUNTS AS A VERIFIED CONNECTION — the rule, in one place.
 *
 * Every counting surface in the app prints its tie total under a legend that
 * calls each tick 확인된 인연 / 'one verified connection'. Three of them counted
 * `parallel` in that total, which is the one claim in the product that
 * contradicts its own schema: types.ts invented `parallel` to mean "NOT A
 * MEETING… the pair has demonstrably never shared a room", and 강지후, 신승용 and
 * 최연청 then each read as having one verified connection while the single line
 * they carry says in its own headline that the two have never met.
 *
 * So the rule is: a headline tie count counts edges that record a MEETING. A
 * parallel record is still drawn, still listed and still counted — separately,
 * under its own name (`tie.parallel`), because it is real and it is not that.
 *
 * It lives here, next to the data, rather than in whichever component happened
 * to need it first, because it is a fact about the edge vocabulary and four
 * different surfaces have to agree about it. tools/validate-data.mjs section 0c
 * fails the build for any counting surface that does not read it.
 */
export const NON_MEETING_TYPES: ReadonlySet<EdgeType> = new Set<EdgeType>(['parallel']);

/** True when this edge type asserts the two people were actually in a room. */
export const isMeeting = (type: EdgeType): boolean => !NON_MEETING_TYPES.has(type);

/** Split a list of ties into the headline number and the parallel remainder. */
export function tieCounts(list: readonly { type: EdgeType }[]): { met: number; parallel: number } {
  let met = 0;
  for (const x of list) if (isMeeting(x.type)) met++;
  return { met, parallel: list.length - met };
}

/**
 * Connections between the twenty X cast members.
 *
 * EVERY edge here predates season X. `season: 1 | 2 | 3` means it happened
 * inside that earlier season of the franchise; `season: 0` means it comes from
 * outside the house entirely — another programme, a shared career, a rivalry
 * on a basketball court.
 *
 * Editing rules learned the hard way:
 *   • One edge per pair. If two facts describe the same pair, they belong in
 *     the same description.
 *   • Descriptions describe the RELATIONSHIP. Placements, ranks and elimination
 *     order live in records.ts and are not restated here — that is where the
 *     contradictions came from.
 *   • `sources` is rendered as a link list. Bare URLs only; supporting quotes
 *     go in a // comment above the edge.
 *   • Nothing that only exists as a casting rumour for an unaired show.
 *   • IF A DESCRIPTION NAMES A PROGRAMME, AN AWARD OR A SCHOOL, THAT FACT ALSO
 *     BELONGS ON THE PERSON IT IS ABOUT. The dossier is where a reader goes to
 *     learn about a person and the edge card is where they go to learn about a
 *     pair, and the pair page used to know more biography than the person page:
 *     the 최연청 line rested on 김남희's Miss Korea year, which appeared nowhere
 *     in her own entry, and the 홍진호 poker line rested on a tournament 현성주
 *     had no `priorElsewhere` for. Promote it to `otherShows` / `priorElsewhere`
 *     / the bio — and then leave the edge describing only the pair, so the fact
 *     is stated once and the two surfaces cannot drift.
 *
 * A LINE ON A RELATIONSHIP GRAPH ASSERTS A RELATIONSHIP, so the `type` has to
 * be true of the pair and not merely convenient:
 *   • `prior-show` means they MET, outside this franchise — a shared cast list,
 *     a shared table, a shared classroom. Every line carrying it is now a
 *     meeting; the gloss says so without hedging.
 *   • `co-season` means the same season of THIS franchise AND NOTHING MORE
 *     THAN THAT. It exists because filing those pairs under `prior-show` told
 *     the reader they had "met on another programme", which was false twice
 *     over: not another programme, and not a meeting.
 *
 *     It used to be defined more narrowly — "the same season with a different
 *     seat", a panellist and a player, a dealer and a contestant — and that
 *     definition had no room for the other shape it is needed for: two PLAYERS
 *     in one season between whom nothing individual is on record. Those pairs
 *     were being typed `rivalry` on the strength of a faction diagram, which is
 *     the defect round 8 filed (see 홍진호×허성범 below). The four
 *     different-seat pairs all satisfy the wider rule, so nothing was retyped
 *     to widen it; what changed is that the type now says what it always
 *     actually meant, which is "these two were in one season and this line
 *     claims no more".
 *
 *     The gloss agrees now: `EDGE_GLOSS_I18N['co-season']` in
 *     src/data/i18n/ui.ts reads 같은 시즌에 있었다는 것까지 — 그 이상은 이 선이
 *     말하지 않는다 / 'Same season, and this line claims nothing beyond that',
 *     which is the definition above in one line and is true of all six. It had
 *     read 같은 시즌, 다른 자리 / 'Same season, different seat' for a round
 *     after the type was widened, i.e. the legend was contradicting the
 *     paragraph under it on 홍진호×허성범. If the type is ever widened again,
 *     that string moves in the same commit.
 *   • `parallel` means the opposite of a relationship: the two records rhyme
 *     and the two people have demonstrably never shared a room. Three pairs
 *     carry it — the KAIST seat two seasons apart, two Mensa cards, two
 *     dermatologists — and they keep `confidence: 'low'` so the 미확인 marker
 *     fires on every surface, and headlines that lead with 만난 적 없는 so the
 *     label alone cannot be misread. They used to sit in `prior-show`, wearing
 *     its blue and its dash, which put them in the legend beside pairs who
 *     really did meet. See EDGE_COLOR.parallel and EDGE_DASH in palette.ts.
 *
 * `outcomes` IS FOR DUELS AND NOTHING ELSE. A pair that shared a season is not
 * a head-to-head; a pair that sat across one board is. Everything derivable —
 * who finished higher in the same season, who finished higher on the same
 * outside programme — is computed in headToHead.ts from records.ts and from
 * `ExternalShow.rank`, so a finishing order is never written down twice. What
 * is authored here is the thing no table can reconstruct: 이진형 beat 서출구
 * 17:8 in the season-2 final round, 김경훈 beat 이상민 22:0 in a Death Match.
 * The winner must be one of the two endpoints, and the score is only ever the
 * one the source prints.
 *
 * ── PAIRS SEARCHED AND NOT DRAWN ─────────────────────────────────────────
 * Two people credited on the same programme is the obvious place to look for
 * a missing edge, and it is also the obvious place to invent one: a previous
 * round had to retract two lines that were assembled this way. So the dead
 * ends are written down, with what was checked, so the search is not run a
 * fourth time and so nobody reads "no edge" as "nobody looked".
 *
 *   • 이진형 × 김남희 — 뇌섹시대 문제적 남자. Both credited, four years apart:
 *     김남희 was the guest of 71회 (2016.07.24, the IQ 156 / 멘사 appearance
 *     the 최연청 parallel edge rests on); 이진형 was a 히든브레인 on the 수능
 *     만점자 특집, 221회 (2020.01.23). 150 episodes between them, neither a
 *     fixed member. NOT A MEETING, and the reason headToHead's outside match
 *     is on title AND year.
 *   • 정근우 × 하승진 — 야구대표자: 덕후들의 리그 (TVING, 2024–). 하승진 holds
 *     the kt wiz seat as a regular; 정근우 appears once, in 5화, as the stand-in
 *     for 지상렬's SSG seat. So 정근우 is not on the ten-seat cast list — he
 *     replaced somebody who is — and no source names who else was at that
 *     recording. UNRESOLVED, not refuted: an episode-5 cast list, or a still
 *     with both of them in it, closes it. Until then the pair has nothing but
 *     the programme title in common, which is what `parallel` is for and this
 *     is not even that.
 *   • 하승진 × 곽범 — 아는 형님. Already answered in the comment above the two
 *     아는 형님 edges: 464회 and 469회 are five weeks apart.
 */
export const edges: Edge[] = [
  {
    id: 'hong-jin-ho--seo-chul-gu--alliance-s2-0',
    source: 'hong-jin-ho',
    target: 'seo-chul-gu',
    type: 'alliance',
    season: 2,
    label: '콩과 계산기, 두 시즌 파트너',
    labelEn: 'Two seasons as a duo',
    description: '피의 게임2(2023)에서 홍진호가 속한 야생팀(히든 플레이어 진영)이 3일차에 서출구를 저택에서 \'납치\'해 영입하면서 둘이 한배를 탔고, 이후 시즌 내내 핵심 2인 축으로 함께 움직였다. 서출구는 스스로를 \'홍진호의 계산기\'라 부를 만큼 홍진호의 판단을 따르는 파트너였다. 피의 게임3(2024~2025)에서도 홍진호가 축이 된 연합에 서출구가 합류해 다시 같은 편에 섰다. 관계는 방송 밖으로도 이어져, 서출구는 시즌2 이후 홍진호의 영향으로 포커를 시작했고 홍진호가 "하나부터 열까지 조목조목 짚어가며" 피드백을 해줬다고 밝혔다.',
    strength: 5,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/홍진호/피의%20게임',
      'https://namu.wiki/w/서출구',
      'https://namu.wiki/w/피의%20게임2/참가자',
      'https://namu.wiki/w/홍진호/포커%20플레이어',
    ],
  },
  {
    id: 'hong-jin-ho--hyun-seong-joo--prior-show-1',
    source: 'hong-jin-ho',
    target: 'hyun-seong-joo',
    type: 'prior-show',
    season: 0,
    label: '포신전 시즌2 같은 대회',
    labelEn: 'Same poker tournament field',
    description: '포커 무대에서 오래 겹친 사이다. 유튜브 채널 투에이스의 텍사스 홀덤 서바이벌 \'포커 신들의 전쟁\' 시즌2 인비테이셔널(2021년 8월 16일~9월 30일)에 16인 참가자로 함께 출전했고(현성주는 활동명 \'코몽\'), 이 대회는 홍진호가 우승했다. 시즌3(2022~2023)에도 홍진호는 팀 마스터로, 현성주는 참가자로 나란히 출연했다. 둘 다 WSOP 브레이슬릿 보유자다. 이 인연 덕분에 피의 게임2에서 두 사람이 만났을 때는 \'두 포커 플레이어의 맞대결\'이 초반 관전 포인트로 홍보됐지만, 정작 시즌 안에서는 서로 반대 진영에 있었을 뿐 개인적 반목이 기록된 바는 없다.',
    strength: 5,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/홍진호/포커%20플레이어',
      'https://namu.wiki/w/현성주',
      'https://namu.wiki/w/포커%20신들의%20전쟁',
      'https://namu.wiki/w/피의%20게임2/참가자',
    ],
  },
  {
    id: 'kim-kyung-hoon--lee-sang-min--betrayal-2',
    source: 'kim-kyung-hoon',
    target: 'lee-sang-min',
    type: 'betrayal',
    season: 0,
    label: '정신적 지주를 배신하다',
    labelEn: 'Betrayed his own mentor figure',
    description: '2015년 tvN <더 지니어스: 그랜드 파이널>에 두 사람 모두 참가했다. 김경훈에게 이상민은 \'정신적 지주이자 더 지니어스에서 유일한 자신의 우군\'이었고, 2회전에서 김경훈은 "나는 내가 아니다! 나는 이상민의 개다!"라며 충성을 선언했다. 그러나 곧 "그냥... 좋은 형이고!"라며 관계를 부인했고, 3회전에서는 이상민의 선택 정보를 이준석에게 흘려 이상민을 메인매치 최하위로 몰았다. 도청까지 동원해 판을 장악하는 듯했던 이상민은 결국 3화 데스매치에서 바로 그 김경훈에게 패해 탈락했다. 나무위키는 이 시점을 두고 이상민이 빠진 뒤 김경훈이 \'정말로 각성한 듯\' 성장했다고 서술하며, 김경훈은 그대로 결승까지 올라 준우승했다.',
    strength: 5,
    directed: true,
    outcomes: [
      {
        winner: 'kim-kyung-hoon',
        season: 0,
        where: '더 지니어스: 그랜드 파이널 3화 데스매치 ‘베팅 가위바위보’',
        whereEn: 'The Genius: Grand Final, the episode-3 death match at betting rock-paper-scissors',
        score: '22:0',
      },
    ],
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/김경훈(1988)/더%20지니어스',
      'https://namu.wiki/w/더%20지니어스:그랜드%20파이널',
      'https://ko.wikipedia.org/wiki/더_지니어스:_그랜드_파이널',
      /* 뉴스엔, 2015.07.11 — "'더 지니어스4' 이상민 탈락, 경훈과의 데스매치 끝
         '패배'". Contemporaneous press for the elimination itself; the 22:0
         scoreline and the "이상민의 개다" line are on the wiki pages above. */
      'https://news.nate.com/view/20150711n20983',
    ],
  },
  {
    id: 'lee-gwan-hee--choi-hye-sun--prior-show-3',
    source: 'lee-gwan-hee',
    target: 'choi-hye-sun',
    type: 'prior-show',
    season: 0,
    label: '솔로지옥3 최종 커플',
    labelEn: 'Final couple on Single\'s Inferno 3',
    /* The club was written in the present tense and named 원주 DB, which he had
       already left; the English side of this same edge scoped it to the air
       window and was therefore more accurate than the Korean, which inverts the
       file's own authority model. It is now scoped here too, and the career
       timeline is owned by his priorElsewhere alone. */
    description: '두 사람은 넷플릭스 \'솔로지옥\' 시즌3(2023년 12월~2024년 1월 공개)에 함께 출연해 최종 커플로 맺어졌다. 촬영 당시 이관희는 창원 LG 소속 프로농구 선수였고, 최혜선은 인플루언서였다. 다만 방송 후 실제 교제로 이어지지는 않았다. 이관희는 2024년 8월 웹예능 \'아침먹고 가2\'에서 장성규가 교제 여부를 묻자 "최혜선은 지금 영국에 있어서 교제는 못 했다", "그냥 밥 먹고 커피 마시고 이 정도는 했다"고 밝혔다.',
    strength: 5,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/%EC%86%94%EB%A1%9C%EC%A7%80%EC%98%A5(%EC%8B%9C%EC%A6%8C%203)',
      'https://news.mt.co.kr/mtview.php?no=2024080706041265635',
    ],
  },
  {
    id: 'lee-jin-hyung--yoon-bi--betrayal-s2-4',
    source: 'lee-jin-hyung',
    target: 'yoon-bi',
    type: 'betrayal',
    season: 2,
    label: '9일차 보복 데스매치',
    labelEn: 'A payback death match',
    description: '피의 게임2 9일차, 이진형은 머니 챌린지 \'메인컬러\'에서 윤비와 함께 홍진호·서출구 페어에 합류해 4인 연합을 이뤘다. 하지만 이는 윤비를 노리기 위한 연기였고, 앞서 윤비가 자신을 최하위로 몰았던 일을 되갚아 그를 데스매치 상대로 지목했다. 동맹이라 믿었던 상대에게 지목당한 윤비는 규칙을 끝까지 이해하지 못한 채 게임 도중 기권을 선언했고, "제 멘탈이 세다고 생각했는데 아닌가 봅니다"라며 승복했다.',
    strength: 5,
    directed: true,
    outcomes: [
      {
        winner: 'lee-jin-hyung',
        season: 2,
        where: '피의 게임2 9일차 데스매치',
        whereEn: 'Bloody Game 2, the day-9 death match',
      },
    ],
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/윤비/피의%20게임',
      'https://namu.wiki/w/피의%20게임2/참가자',
      'https://namu.wiki/w/피의%20게임2',
      /* 뉴스1, 2023.06.12 — the winner's own account, headlined "아름다운
         패배보다 추악한 승리 택해…아쉬움". It is the champion on the record
         characterising the conduct this edge documents; it does not carry the
         9일차 mechanics, which are on the wiki pages above. */
      'https://www.news1.kr/entertain/interview/5073627',
    ],
  },
  {
    id: 'lee-jin-hyung--park-ji-min--betrayal-s2-5',
    source: 'lee-jin-hyung',
    target: 'park-ji-min',
    type: 'betrayal',
    season: 2,
    label: '판도라 상자 정보 즉시 팔아넘김',
    labelEn: 'Sold out her Pandora tip',
    description: '피의 게임2에서 박지민은 덱스와 함께 최초 히든 플레이어로 선정된 뒤 야생팀 스파이로 저택팀에 잠입했다. 2일차에 이진형에게 판도라의 상자 힌트를 공유했는데, 이진형은 그 정보를 그대로 저택 쪽에 넘겨 그의 정체를 들통나게 했다. 잠입 이틀 만에 임무가 무너진 셈이고, 이후 저택 안에서 그를 향한 의심은 끝까지 풀리지 않았다. 두 사람은 7일차에 한 번 더 붙었다 — 박지민이 유령 카지노의 유령 플레이어로 재등장해 이진형을 상대했고, 이번에도 이진형이 이겼다. 이진형은 이 시즌을 우승으로 끝냈다.',
    strength: 5,
    directed: true,
    outcomes: [
      {
        winner: 'lee-jin-hyung',
        season: 2,
        where: '피의 게임2 7일차 유령 플레이어 대결',
        whereEn: 'Bloody Game 2, the day-7 ghost-player match',
      },
    ],
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/박지민(아나운서)/피의%20게임',
      'https://namu.wiki/w/피의%20게임2/참가자',
      'https://news.nate.com/view/20230531n30787',
    ],
  },
  {
    id: 'lee-sang-min--hong-jin-ho--rivalry-6',
    source: 'lee-sang-min',
    target: 'hong-jin-ho',
    type: 'rivalry',
    season: 0,
    label: '지니어스 최대 라이벌이자 절친',
    labelEn: 'Genius rivals, real-life friends',
    description: 'tvN \'더 지니어스\' 시리즈에서 세 시즌을 함께한 시리즈 최대 라이벌 구도다. 시즌1 \'게임의 법칙\'(2013)에 13인 참가자로 함께 출연해 홍진호가 최종 우승했고(가넷 79개, 상금 7,900만 원), 이상민은 11화 데스매치에서 김경란에게 패해 3위로 마쳤다. 이듬해 시즌2 \'룰 브레이커\'(2013~2014)에서는 반대로 이상민이 우승(가넷 62개, 결승에서 임요환 격파)했고 홍진호는 중반에 탈락했다. 2015년 올스타전 시즌4 \'그랜드 파이널\'에는 각각 시즌1 우승자·시즌2 우승자 자격으로 나란히 복귀했다.',
    strength: 5,
    confidence: 'high',
    sources: [
      'https://ko.wikipedia.org/wiki/%EB%8D%94_%EC%A7%80%EB%8B%88%EC%96%B4%EC%8A%A4:_%EA%B2%8C%EC%9E%84%EC%9D%98_%EB%B2%95%EC%B9%99',
      'https://ko.wikipedia.org/wiki/%EB%8D%94_%EC%A7%80%EB%8B%88%EC%96%B4%EC%8A%A4:_%EB%A3%B0_%EB%B8%8C%EB%A0%88%EC%9D%B4%EC%BB%A4',
      'https://ko.wikipedia.org/wiki/%EB%8D%94_%EC%A7%80%EB%8B%88%EC%96%B4%EC%8A%A4:_%EA%B7%B8%EB%9E%9C%EB%93%9C_%ED%8C%8C%EC%9D%B4%EB%84%90',
      'https://namu.wiki/w/이상민(룰라)',
    ],
  },
  {
    id: 'park-ji-min--jung-keun-woo--betrayal-s1-7',
    source: 'park-ji-min',
    target: 'jung-keun-woo',
    type: 'betrayal',
    season: 1,
    label: '연합 배신, 눈물의 자진탈락',
    labelEn: 'Fake tears that ended his run',
    description: 'MBC 피의 게임 시즌1(2021)의 같은 10인 참가자이자 시즌1의 두 축이었다. 정근우는 덱스·박재일과 \'정근우 연합\'을 이끌었고, 박지민은 송서현·퀸와사비와 \'여자 연합\'을 꾸려 반대편에 섰다. 초반에는 박지민이 2일차에 이태균에게서 알아낸 추가 투표권의 존재를 정근우 쪽에 곧바로 넘겨주며 협력했다. 그러나 4일차 지뢰게임에서 사전 합의를 깨고 허준영과 손잡은 뒤, 정근우 측을 향해 "너희 한 명 가! 너무 붙어 있었어!"라며 탈락을 압박했다. 정근우는 "배신은 때리되 예의는 차리자고 했잖아"라며 분노했고, 덱스와 함께 상대의 추가 투표권 구매를 막으려 버티다 여자 연합의 눈물을 보고 마음이 흔들려 결국 자진탈락을 택했다. 그 눈물은 돈을 쓰지 않고 상대를 무너뜨리기 위해 박지민이 퀸와사비와 함께 꾸민 연기였다.',
    strength: 5,
    directed: true,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/박지민(아나운서)/피의%20게임',
      'https://www.xportsnews.com/article/1503472',
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84(%EC%8B%9C%EC%A6%8C%201)/4%EC%9D%BC%EC%B0%A8',
      'https://namu.wiki/w/피의%20게임(시즌%201)',
    ],
  },
  {
    id: 'ha-seung-jin--yoon-bi--alliance-s2-8',
    source: 'ha-seung-jin',
    target: 'yoon-bi',
    type: 'alliance',
    season: 2,
    label: '수영장 3인 연합',
    labelEn: 'The poolside alliance',
    description: '피의 게임2 5일차 저녁 수영장에서 하승진·윤비·넉스가 결성한 3인 \'수영장 연합\'의 두 축이었다. 두 사람은 이후 며칠간 공조했고, 8일차에도 하승진이 윤비와 짝을 이뤄 움직였다. 그러나 이 연합은 끝내 판을 잡지 못했고, 하승진이 데스매치에서 먼저 떨어져 나가면서 윤비는 후반부를 혼자 버텨야 했다.',
    strength: 4,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/하승진/피의%20게임',
      'https://namu.wiki/w/윤비/피의%20게임',
      'https://namu.wiki/w/피의%20게임2',
    ],
  },
  {
    id: 'ha-seung-jin--lee-gwan-hee--rivalry-9',
    source: 'ha-seung-jin',
    target: 'lee-gwan-hee',
    type: 'rivalry',
    season: 0,
    label: 'KBL 맞대결, 2020 유튜브 설전',
    labelEn: 'KBL rivals, then a YouTube feud',
    description: '하승진(전주 KCC 센터, 2008 드래프트 1라운드 1순위)과 이관희(서울 삼성 가드, 2011 드래프트 2라운드 5순위)는 KBL에서 상대팀 선수로 맞붙은 사이다. 이관희의 상무 복무(2014~2016)와 하승진의 군 복무를 빼면 두 사람이 실제로 함께 뛴 시즌은 일곱 시즌이고, 하승진은 2018-19시즌을 끝으로 은퇴했다. 2020년 4월 은퇴한 하승진이 전태풍과 함께 유튜브에서 한국 농구의 문제를 지적하자, 당시 현역이던 이관희가 \'한국 농구 아직 망하지 않았다!\'라는 반박 영상을 올리며 "지금 뛰고 있는 선수들의 노력이 폄하될 수도 있는 내용이라 조금 화가 났다"고 밝혀 공개 설전이 벌어졌다. 하승진은 "형이 생각이 많이 짧았어~"라는 사과성 댓글로 논쟁을 매듭지었고, 이후 이관희가 하승진의 유튜브 코너 \'하승진톡\'에 게스트로 출연해 "사실 하승진의 주장에 200% 공감했고 현역을 대변하는 역할을 한 것"이라고 밝히며 훈훈하게 끝났다. 지금은 하승진이 이관희 경기 중계 채팅창에 나타나 응원할 만큼 사이가 좋다.',
    strength: 4,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/이관희/여담',
      'https://namu.wiki/w/하승진/생애',
      'https://www.seoul.co.kr/news/newsView.php?id=20200527017002',
    ],
  },
  {
    id: 'hong-jin-ho--kim-kyung-hoon--prior-show-10',
    source: 'hong-jin-ho',
    target: 'kim-kyung-hoon',
    type: 'prior-show',
    season: 0,
    label: '그랜드 파이널 데스매치 맞대결',
    labelEn: 'Grand Final death match duel',
    description: '더 지니어스 시즌4 \'그랜드 파이널\'(tvN, 2015) 13인 참가자로 함께 출연했다. 홍진호는 시즌1 우승자 자격으로, 김경훈은 시즌3 대표로 참가했다. 10화에서 메인매치 \'협동홀덤\'에 패한 두 사람이 데스매치 \'양면포커\'에서 1대1로 맞붙었고, 김경훈이 이겨 홍진호를 탈락시켰다. 김경훈은 데스매치를 앞두고 \'시즌1, 2 때 정말 팬이었다\'며 양면포커를 직접 하게 된 것에 감격을 드러냈다.',
    strength: 4,
    outcomes: [
      {
        winner: 'kim-kyung-hoon',
        season: 0,
        where: '더 지니어스: 그랜드 파이널 10화 데스매치 ‘양면포커’',
        whereEn: 'The Genius: Grand Final, the episode-10 death match at two-sided poker',
      },
    ],
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/김경훈(1988)/더%20지니어스',
      'https://ko.wikipedia.org/wiki/더_지니어스:_그랜드_파이널',
    ],
  },
  {
    id: 'hong-jin-ho--kim-yoo-hyun--prior-show-11',
    source: 'hong-jin-ho',
    target: 'kim-yoo-hyun',
    type: 'prior-show',
    season: 0,
    label: '지니어스 올스타전 + 포커 동종업계',
    labelEn: 'Genius all-stars, both poker pros',
    description: '2015년 tvN 「더 지니어스: 그랜드 파이널」 13인 올스타 캐스트에 함께 출연했다. 홍진호는 시즌1 우승자 자격으로, 김유현은 시즌3 \'블랙가넷\' 출신으로 합류했다. 단순 동반 출연에 그치지 않고 2화 공포 레이싱 메인매치에서 김유현이 홍진호의 \'책사\' 역할을 맡아 한 회차 동안 직접 공조했으며, 김유현의 플레이 스타일이 \'시즌1 초중반의 홍진호와 흡사하다\'는 평가를 받기도 했다. 두 사람 모두 프로 포커 플레이어로, 홍진호는 2022년 WSOP 브레이슬릿을 획득했고 김유현은 2015년 출연 당시 이미 직업이 \'프로 겜블러\'로 소개됐다.',
    strength: 4,
    confidence: 'high',
    sources: [
      'https://ko.wikipedia.org/wiki/더_지니어스:_그랜드_파이널',
      'https://namu.wiki/w/김유현',
      'https://namu.wiki/w/김유현/더%20지니어스',
    ],
  },
  {
    id: 'hong-jin-ho--park-ji-min--alliance-s2-12',
    source: 'hong-jin-ho',
    target: 'park-ji-min',
    type: 'alliance',
    season: 2,
    label: '최초 히든 플레이어 4인',
    labelEn: 'The original hidden four',
    description: '\'피의 게임2\'(2023, MBC·웨이브)에서 덱스와 박지민이 먼저 히든 플레이어로 선정된 뒤, 두 사람이 홍진호와 신현지를 지목해 최초 히든 플레이어 4인이 완성됐다. 이들은 본대보다 하루 앞서 저택 밖에서 시작해 야생팀의 코어가 됐고, 홍진호가 외부에서 판을 지휘하는 두뇌 역할을 맡았다. 박지민은 이 팀을 위해 자원해 저택에 스파이로 잠입, 안에서 충성하는 척하며 정보와 물자를 넘겼다. 다만 정보는 홍진호 개인이 아니라 야생팀 전체로 전달된 것으로, 홍진호가 그의 전담 수신자였다는 근거는 없다.',
    strength: 4,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%842/%EC%B0%B8%EA%B0%80%EC%9E%90',
      'https://enews.imbc.com/News/RetrieveNewsInfo/385049',
      'https://namu.wiki/w/%ED%99%8D%EC%A7%84%ED%98%B8/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84',
    ],
  },
  {
    id: 'kim-kyung-hoon--kim-yoo-hyun--prior-show-13',
    source: 'kim-kyung-hoon',
    target: 'kim-yoo-hyun',
    type: 'prior-show',
    season: 0,
    label: '일리노이 동문, 지니어스 두 시즌 동반',
    labelEn: 'UIUC alumni, two Genius seasons',
    description: '두 사람은 일리노이 대학교 어배너-섐페인(UIUC) 동문이다. 김경훈은 민족사관고를 거쳐 UIUC 재료공학을 졸업했고(이후 서울대 화학공학 석박사통합과정), 김유현은 UIUC 컴퓨터공학을 다니다 중퇴했다. 방송에서도 두 시즌을 함께했다 — 2014년 tvN \'더 지니어스: 블랙가넷\'에 나란히 출연해 처음 만났고, 이듬해 \'더 지니어스: 그랜드 파이널\'(2015) 13인 라인업에도 함께 이름을 올렸다. 김경훈은 지원자 3,114명이 몰린 일반인 선발전을 통해 입성했다. 다만 두 사람만의 \'숨은 연맹\'이 있었다는 서술은 확인되지 않는다.',
    strength: 4,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/김경훈(1988)/더%20지니어스',
      'https://namu.wiki/w/김유현',
      'https://namu.wiki/w/더%20지니어스:그랜드%20파이널',
    ],
  },
  {
    id: 'park-ji-min--lee-tae-gyun--betrayal-s1-14',
    source: 'park-ji-min',
    target: 'lee-tae-gyun',
    type: 'betrayal',
    season: 1,
    label: '정보 주던 사이에서 저격 대상으로',
    labelEn: 'From tipster to target',
    description: '피의 게임 시즌1(2021)에서 두 사람은 1일차부터 서로 다른 연합이었다 — 이태균은 최연승·허준영과 남성 연합, 박지민은 퀸와사비·송서현과 여성 연합. 정식 동맹을 맺은 적은 없지만 이태균은 2일차에 \'히든 메뉴판\' 정보를 박지민에게 공유하고 3일차엔 돈 양도 문제까지 조언해주며 그를 우군으로 대했고, 박지민은 그 정보를 들고 정근우 연합 쪽으로 움직였다. 3일차 밤 테라스에서 정근우 연합과 박지민이 이태균을 저격하기로 다시 정리한 뒤, 실제 투표에서 박지민은 이태균에게 표를 던졌다. 이태균은 이날 최다 8표를 받아 지목됐지만 이걸로 게임에서 빠지지는 않았고, 두 사람은 나란히 최종 4인까지 갔다.',
    strength: 4,
    directed: true,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/박지민(아나운서)/피의%20게임',
      'https://namu.wiki/w/피의%20게임(시즌%201)/내용%20및%20진행%20결과',
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84(%EC%8B%9C%EC%A6%8C%201)/3%EC%9D%BC%EC%B0%A8',
      /* iMBC 연예뉴스, 2021.11.30 — 박지민 on the record about the stretch this
         edge covers: "1라운드부터 3라운드까지 제가 판을 짰다. 친하게 지내던
         사람들이 마지막으로 저한테 인사하는 눈빛들이 너무 차가워서 상처가
         됐다." The 8표 count is on the day-3 page above. */
      'https://enews.imbc.com/Tpl/View/331883',
    ],
  },
  {
    id: 'seo-chul-gu--yoon-bi--alliance-s2-15',
    source: 'seo-chul-gu',
    target: 'yoon-bi',
    type: 'alliance',
    season: 2,
    label: '먼저 끌려간 자가 포섭에 가담',
    labelEn: 'Recruited, then recruiter',
    description: '피의 게임2에서 서출구와 윤비는 2~3일차 저녁 야생팀에 차례로 납치·포섭된 두 래퍼다. 먼저 끌려간 서출구가 "대놓고 부르면 생각보다 순종적이게 된다"고 조언해 뒤이은 윤비 포섭에 기여했다. 그러나 6일차 \'리얼 타임\'에서 윤비가 신현지·덱스에게 "배신하지 않으면 데스매치 상대로 너희를 지목하겠다"며 압박한 사실이 홍진호·서출구에게 전해지면서 둘은 완전히 척을 졌다. 윤비가 이탈한 뒤 야생팀은 홍진호·덱스·신현지와 서출구를 중심으로 재편됐다.',
    strength: 4,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/윤비/피의%20게임',
      'https://namu.wiki/w/피의%20게임2/참가자',
      'https://news.nate.com/view/20230525n28704',
    ],
  },
  {
    id: 'seo-chul-gu--ha-seung-jin--rivalry-s2-16',
    source: 'seo-chul-gu',
    target: 'ha-seung-jin',
    type: 'rivalry',
    season: 2,
    label: '\'승진이 형님 아니었으면 쳤습니다\'',
    labelEn: 'Would have hit anyone else',
    description: '피의 게임2 8일차 머니 챌린지 \'낮과 밤\' 당시, 하승진은 상대 진영의 대화를 엿듣고 차단하기, 메모·힌트 탈취, 괴성과 오페라 성량의 소음 등 노골적인 방해 전술을 야생팀 전반에 퍼부었다. 그중 주 표적이 서출구였고, 팀원과 대화조차 나누지 못할 만큼 고립됐다(웨이브 공식 클립 제목: \'팀원과의 대화까지 단절에 고립된 서출구\'). 공식 규칙 위반은 아니었지만 암묵적 룰을 깼다는 비판이 쏟아지며 인성 논란 기사까지 나왔고, 서출구는 인터뷰에서 \'승진이 형님 아니었으면 쳤습니다\'라며 강한 불쾌감을 드러냈다.',
    strength: 4,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/하승진/피의%20게임',
      'https://ko.wikipedia.org/wiki/피의_게임',
      'https://namu.wiki/w/피의%20게임2',
    ],
  },
  {
    id: 'seo-chul-gu--heo-seong-beom--rivalry-s3-17',
    source: 'seo-chul-gu',
    target: 'heo-seong-beom',
    type: 'rivalry',
    season: 3,
    label: '10일차 선과 악, 무시당했다는 말',
    labelEn: 'Day 10, and the man who felt ignored',
    /* Same correction as the 홍진호×하승진 line: the scope sentence used to be
       a denial of the type ('시즌 내내 이어진 감정 대립은 아니고'), which is the
       라이벌 gloss contradicted on its own card. One documented clash is what
       there is, and the three shared programmes that follow it are the better
       ending anyway — a clash they both kept turning up to. */
    description: '피의 게임3(2024.11~2025.01, 웨이브)에서 두 사람은 1일차부터 서로 다른 거점에 있었다 — 서출구는 피의 저택, 허성범은 피의 낙원 소속으로 출발했고, 제작진 분류상으로도 서출구는 \'올스타\', 허성범은 \'뉴스타\'로 다른 그룹으로 소개됐다. 후반에 진영이 갈리면서 서출구는 홍진호 쪽 연합의 두뇌 역할을, 허성범은 장동민 연합 쪽을 맡았다. 기록에 남은 두 사람의 정면 마찰은 10일차 \'선과 악\' 한 판이다. 허성범은 인터뷰에서 \'제 생각을 설명하려고 하긴 했는데 계속 무시당했습니다\'라며 소통이 되지 않았다고 불만을 드러냈다. 그리고 두 사람은 이후 넷플릭스 \'데스게임: 천만원을 걸어라\'(2026.01.28~04.01)와 \'데스게임2: 최후의 승자\'(2026.04.22~06.17)에도 나란히 참가자로 이름을 올려, 세 개 프로그램에서 연달아 같은 판에 앉았다.',
    strength: 3,
    confidence: 'high',
    /* The quoted line ('계속 무시당했습니다') is 허성범's own, and until now the
       only place it was cited was the wiki that transcribed it. The iMBC piece
       from the season-3 제작발표회 (2024.11.12) is him on the record about the
       same season in the same register — "몇 명은 나가면 '다시 보지 않겠다'
       다짐했는데 지금은 웃으면서 잘 보내고 있다" — with 서출구 in the room. It
       does not name this game; it attests that the falling-out was real, which
       is the half a wiki transcript cannot carry on its own. */
    sources: [
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%843/%EC%B0%B8%EA%B0%80%EC%9E%90',
      'https://namu.wiki/w/%ED%97%88%EC%84%B1%EB%B2%94/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84',
      'https://namu.wiki/w/%EB%8D%B0%EC%8A%A4%EA%B2%8C%EC%9E%84(%EB%84%B7%ED%94%8C%EB%A6%AD%EC%8A%A4%20%EC%98%88%EB%8A%A5)',
      'https://enews.imbc.com/News/RetrieveNewsInfo/436779',
    ],
  },
  {
    id: 'heo-seong-beom--choi-hye-sun--alliance-s3-33',
    source: 'heo-seong-beom',
    target: 'choi-hye-sun',
    type: 'alliance',
    season: 3,
    label: '1일차에 맺고 8일차에 갈라진 약속',
    labelEn: 'A day-one pact, broken by day eight',
    description: '피의 게임3 1일차에 두 사람은 모두 \'피의 낙원\' 소속으로 출발했다. 최혜선은 사전 인터뷰만 보고 허성범을 자기 플레이 스타일과 맞는 상대로 점찍어 먼저 신뢰를 얻으러 갔고, 그날 두 사람은 끝까지 믿고 갈 만한 아군이 되자고 합의했다. 3일차 습격의 날 이후 허성범이 잔해로 내려간 뒤에도 선은 유지돼, 5일차에는 허성범이 개인전 이후 재편될 팀에서 함께하자며 최혜선에게 제안을 건넸다 — 사실상 잔해 쪽 스파이 역할을 부탁한 것이었다. 그러나 8일차 이후 허성범은 장동민 연합으로, 최혜선은 홍진호 연합으로 갈렸고 두 사람은 시즌의 마지막까지 다른 편에 남았다. 1일차의 약속은 지켜지지 않았지만 깨진 것으로 기록되지도 않았다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/%EC%B5%9C%ED%98%9C%EC%84%A0/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84',
      'https://namu.wiki/w/%ED%97%88%EC%84%B1%EB%B2%94/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84',
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%843/%EC%B0%B8%EA%B0%80%EC%9E%90',
    ],
  },
  {
    id: 'jung-keun-woo--lee-tae-gyun--alliance-s1-34',
    source: 'jung-keun-woo',
    target: 'lee-tae-gyun',
    type: 'alliance',
    season: 1,
    label: '지하팀, 카드 22장을 다 쓴 수식',
    labelEn: 'The basement team and a 22-card equation',
    description: '시즌1에서 두 사람이 실제로 같은 편이 된 곳은 저택이 아니라 지하층이다. 이태균은 3일차에 최다 표를 받고, 정근우는 4일차에 스스로 탈락을 택하고 각각 내려갔고, 이나영·최연승과 함께 지하팀을 이뤘다. 정근우가 내려오던 날 이미 아래에 있던 인원들이 그를 가짜 규칙으로 속이기로 하는 장면이 그대로 방송을 탔다. 관계의 정점은 8일차 폐공장 수식 게임이다. 지하팀은 카드를 한 장도 남기지 않고 22장을 전부 쓴 수식으로, 16장을 쓴 지상팀을 꺾었고 그 마지막 수식을 완성한 것이 이태균이었다. 이 승리로 지하팀 전원이 지상으로 올라갔고 지상팀이 대신 내려갔다. 정근우가 게임에 남아 있던 마지막 이틀은 사실상 이태균의 계산이 벌어다 준 시간이었다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84(%EC%8B%9C%EC%A6%8C%201)/8%EC%9D%BC%EC%B0%A8',
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84(%EC%8B%9C%EC%A6%8C%201)/4%EC%9D%BC%EC%B0%A8',
      'https://namu.wiki/w/피의%20게임(시즌%201)',
    ],
  },
  {
    id: 'ha-seung-jin--lee-jin-hyung--alliance-s2-18',
    source: 'ha-seung-jin',
    target: 'lee-jin-hyung',
    type: 'alliance',
    season: 2,
    label: '몰래 정보를 대준 사이',
    labelEn: 'Secretly fed him information',
    description: '피의 게임2에서 두 사람은 3일차 \'습격의 날\' 기준 저택 내부팀으로 함께 묶여 있었다. 6일차 머니게임 \'리얼 타임\'에서 하승진은 겉으로는 시간대를 독식하려는 다수 연합에 속해 있으면서, 소수로 밀려난 이진형과 몰래 접촉해 정보를 넘겼다. 어느 쪽에서 우승자·탈락후보가 나오든 데스매치에 지목되지 않으려는 자기 보신이 동기였고, 이를 위해 공동 최하위가 될 위험까지 감수했다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/하승진/피의%20게임',
      'https://namu.wiki/w/피의%20게임2/진행%20결과',
      'https://namu.wiki/w/피의%20게임2/참가자',
    ],
  },
  // 나무위키 피의 게임2/참가자 §소속 및 연합 현황: "실질적으로는 남성 연합(하승진, 넉스,
  // 이진형, 현성주, 서출구, 윤비) + 솔로 플레이 (유리사, 후지이미나) + 왕따 (파이, 박지민)으로
  // 파벌이 나뉜 상황" / "콩가루 집안, 피켓단이라는 별명이 붙었다."
  {
    id: 'ha-seung-jin--hyun-seong-joo--alliance-s2-19',
    source: 'ha-seung-jin',
    target: 'hyun-seong-joo',
    type: 'alliance',
    season: 2,
    label: '저택 남성 연합 동료',
    labelEn: 'Mansion men\'s alliance',
    /* The fourth edge that ended by denying its own type — 동맹's gloss is
       하우스 안에서 손을 잡고 함께 굴러간 사이, and this closed on 개별적인
       지지·의리 일화는 확인되지 않는다. Being on one alliance's roster, on one
       team, and pushed out of the mansion on the same day IS that gloss; what
       is absent is a two-person anecdote, and that absence is now stated as
       what binds them rather than as a reason to doubt the line. */
    description: '피의 게임2 저택팀에서 하승진과 현성주(코몽)는 넉스·이진형·서출구·윤비와 함께 \'남성 연합\'을 이뤘다. 나무위키는 당시 저택 내 파벌을 \'남성 연합 + 솔로 플레이(유리사, 후지이미나) + 왕따(파이, 박지민)\'로 정리하고 있다. 두 사람은 저택 내부팀에 함께 속해 있다가 습격의 날 이후 저택 외부로 함께 밀려났다. 이 연합은 팀전에서 거듭 패배하며 \'콩가루 집안\', \'피켓단\'이라는 별명이 붙었다. 두 사람을 묶는 것은 둘만의 의리 일화가 아니라 그 명단과 그 명단이 함께 진 경기들이다.',
    strength: 3,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/피의%20게임2/참가자',
      'https://namu.wiki/w/하승진/피의%20게임',
    ],
  },
  {
    id: 'hong-jin-ho--ha-seung-jin--rivalry-s2-20',
    source: 'hong-jin-ho',
    target: 'ha-seung-jin',
    type: 'rivalry',
    season: 2,
    label: '8일차 더티 플레이 정면충돌',
    labelEn: 'Day 8 dirty-play showdown',
    /* The retraction is gone and the scope is not. This used to close on
       '시즌 내내 이어진 진영 대립은 아니었다' — i.e. it is not what the 라이벌
       gloss says a 라이벌 is — which left the type and the paragraph arguing on
       the same card. The fact underneath (one game, not a season) is stated as
       a scope rather than as a denial: what is on record between these two is
       one confrontation, and it is the most-replayed one in the season. */
    description: '피의 게임2 8일차 \'낮과 밤\' 게임에서 하승진이 상대 소통을 엿듣고 덩치로 가로막고 메모를 빼앗으며 큰 소리로 오페라를 불러 방해하는 이른바 \'하페라\' 더티 플레이를 벌이자, 홍진호는 "두 참가자가 개인자금 양도를 위해 투표룸에 들어갈 경우 다른 참가자는 출입할 수 없다"는 규칙을 찾아내 이를 파훼했다. 참가자 중 유일하게 욕설로 정면 대응한 것도 홍진호였고, 이 장면은 \'더티 플레이\' 논란으로 크게 회자됐다. 기록에 남은 두 사람의 정면 충돌은 이 한 게임이고, 시즌2에서 가장 많이 회자된 충돌도 이 한 게임이다.',
    strength: 3,
    confidence: 'high',
    /* WHICH SOURCE CARRIES WHICH HALF. The day-8 mechanics — the rule 홍진호
       found, the 하페라 nickname — are on the two wiki subpages and nowhere
       else. What the wiki cannot attest is that the antagonism was real and
       contemporaneous rather than a retelling, so the iMBC preview of the
       episodes either side of it (2023.05.11) is cited beside them: it is the
       외부팀-vs-내부팀 money challenge that set the two men against each other,
       and it carries 하승진 saying "제대로 한 번 부숴 버릴 거야" in his own
       words, before the game rather than after. */
    sources: [
      'https://namu.wiki/w/홍진호/피의%20게임',
      'https://namu.wiki/w/하승진/피의%20게임',
      'https://namu.wiki/w/피의%20게임',
      'https://enews.imbc.com/News/RetrieveNewsInfo/381723',
    ],
  },
  {
    id: 'hong-jin-ho--choi-hye-sun--alliance-s3-21',
    source: 'hong-jin-ho',
    target: 'choi-hye-sun',
    type: 'alliance',
    season: 3,
    label: '의심받던 최혜선을 감싸다',
    labelEn: 'He vouched for her',
    description: '피의 게임3에서 두 사람은 홍진호가 이끈 \'낙원 연합\'에 함께 속했다(스티브예·서출구·임현서·충주맨 등). 스티브예와 주언규가 최혜선을 이중 스파이로 의심하자 홍진호는 \'난 여자의 눈물은 한 번은 믿어줘\'라며 그를 감싸고 해명을 들어보자고 팀을 설득했다. 다만 연합 내 갈등이 반복되자 9일차에 홍진호는 \'야, 우리 팀 해산. 각자도생 합시다\'라며 해체를 선언했고, 이후에는 주언규와 듀오로 움직였다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/홍진호/피의%20게임',
      'https://namu.wiki/w/피의%20게임3/참가자',
      'https://namu.wiki/w/피의%20게임3',
    ],
  },
  /* WAS `rivalry`, AND ITS OWN LAST SENTENCE SAID OTHERWISE. The rail glosses
     라이벌 as 시즌 내내 정면으로 부딪친 관계 / 'sustained head-to-head
     antagonism', and this description closed with 직접적인 충돌 장면은 기록되어
     있지 않으며 — no recorded confrontation at all. Filtering to 라이벌 is the
     single most likely thing a fan does with this app, and one of the eight
     results was two men who were never filmed in the same argument.

     `co-season` is the honest type and the file's own definition stretches to
     hold it: it is the same season with no claim that the two played each
     other, which is exactly what the record supports. The faction split is not
     lost — it is the whole of what this line now says, and it says it as a
     position on the board rather than as a grudge. This is the same move the
     `parallel` type was invented for one step further in: when the vocabulary
     over-claims, change the word, not the paragraph. */
  {
    id: 'hong-jin-ho--heo-seong-beom--rivalry-s3-22',
    source: 'hong-jin-ho',
    target: 'heo-seong-beom',
    type: 'co-season',
    season: 3,
    label: '같은 낙원 출발, 갈라선 진영',
    labelEn: 'Started together, split apart',
    description: '피의 게임3에서 두 사람은 1일차에 모두 \'피의 낙원\' 소속으로 함께 출발했다. 이후 8일차에 허성범이 장동민 연합에 합류하면서, 시즌 내내 이어진 \'장동민 연합 vs 홍진호 연합\' 구도에서 홍진호의 반대편에 서게 됐다. 두 사람을 잇는 것은 여기까지다 — 같은 시즌, 갈라진 진영, 그리고 서로를 향한 직접적인 충돌 장면은 어디에도 남아 있지 않다. 진영이 갈렸다는 사실과 두 사람이 부딪쳤다는 주장은 다른 말이고, 이 선은 앞의 것만 말한다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/피의%20게임3/참가자',
      'https://namu.wiki/w/홍진호/피의%20게임',
      'https://namu.wiki/w/허성범/피의%20게임',
    ],
  },
  {
    id: 'hong-jin-ho--kim-nam-hee--alliance-23',
    source: 'hong-jin-ho',
    target: 'kim-nam-hee',
    type: 'alliance',
    season: 0,
    label: '더 타임호텔 4인 연합',
    labelEn: 'Time Hotel four-way alliance',
    description: '티빙 오리지널 \'더 타임 호텔\'(2023, 전 10인 참가) 동반 출연. 1일차 VIP였던 김남희가 황제성·존박을 먼저 포섭했고, 그 둘이 다시 홍진호를 끌어들이면서 4인 연합이 완성됐다. 홍진호는 김남희가 만든 연합의 마지막이자 간접 합류자였고, 두 사람이 실제로 같은 편이었던 기간은 하루 남짓이다. 김남희가 2일차에 탈락한 뒤 남은 세 명은 \'홍황존\' 연합으로 불리며 끝까지 분열 없이 결승에 올랐다. 참고로 이 김남희는 배우 김남희(1986년생)가 아니라 방송인 김남희(1989년생, 前 SBS스포츠 아나운서·멘사 회원)다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/%EB%8D%94%20%ED%83%80%EC%9E%84%20%ED%98%B8%ED%85%94/%EC%B0%B8%EA%B0%80%EC%9E%90',
      'https://ko.wikipedia.org/wiki/%EB%8D%94_%ED%83%80%EC%9E%84_%ED%98%B8%ED%85%94',
    ],
  },
  {
    id: 'hong-jin-ho--yoon-bi--alliance-s2-24',
    source: 'hong-jin-ho',
    target: 'yoon-bi',
    type: 'alliance',
    season: 2,
    label: '야생팀 합류 후 이탈',
    labelEn: 'Joined then left the wild team',
    description: '\'피의 게임2\'(2023)에서 홍진호는 야생(히든 플레이어) 팀의 사실상 리더였고, 윤비는 저택 내부팀으로 시작했다가 서출구에 이어 두 번째 포섭 대상으로 납치되어 야생팀으로 소속이 바뀌었다. 이후 6일차 무렵 윤비가 저택팀과 야생팀 사이에서 줄타기를 시도하다 서출구와 반목하면서 야생팀 내 신뢰를 잃었고, 홍진호도 윤비가 1등 욕심을 드러내자 거리를 뒀다.',
    strength: 3,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%842/%EC%B0%B8%EA%B0%80%EC%9E%90',
      'https://namu.wiki/w/%EC%9C%A4%EB%B9%84/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84',
      'https://namu.wiki/w/%ED%99%8D%EC%A7%84%ED%98%B8/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%84',
    ],
  },
  {
    id: 'hyun-seong-joo--seo-chul-gu--mentor-25',
    source: 'hyun-seong-joo',
    target: 'seo-chul-gu',
    /* Was `collab` with `directed: true`. The arrowhead is this app's only
       aggression marker — the legend reads "누가 누구를 배신했는지" — and it was
       pointing at a man giving another man poker advice. `mentor` was sitting
       unused in the union and describes it exactly. */
    type: 'mentor',
    season: 0,
    label: '홀덤 입문, 그리고 1:1 대결',
    labelEn: 'Poker lessons, then a duel',
    description: '두 사람은 피의 게임2(2023) 동시즌 참가자로 처음 만났다. 시즌 안에서는 둘 다 저택팀에서 시작했다가 서출구가 야생팀으로 넘어가며 반대 진영으로 갈렸다. 시즌이 끝난 뒤 서출구는 프로 포커 플레이어 현성주(닉네임 코몽)와 홍진호의 영향으로 홀덤을 시작했고 두 사람 모두에게 피드백을 구했다고 밝혔다 — 현성주는 격려 위주의 조언을, 홍진호는 세밀한 지적을 해줬다고 한다. 이후 현성주의 포커 유튜브 채널 \'아르테포커\'의 1:1 홀덤 챌린지 콘텐츠에 서출구가 대결 상대로 출연했다(임요환, 김수조 등과 함께).',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/현성주',
      'https://namu.wiki/w/서출구',
      'https://namu.wiki/w/피의%20게임2',
    ],
  },
  // 나무위키 현성주/피의 게임 §시즌2: 습격의 날 유리사 감옥행 동조, 넘버 체인지에서 넉스·이진형이
  // 팀 전략 주도, 10일차 유령 플레이어로 재등장.
  {
    id: 'lee-jin-hyung--hyun-seong-joo--alliance-s2-26',
    source: 'lee-jin-hyung',
    target: 'hyun-seong-joo',
    type: 'alliance',
    season: 2,
    label: '같은 남성 연합, 연전연패',
    labelEn: 'Same alliance, kept losing',
    description: '피의 게임2(2023) 초반 \'저택 내부팀\'에서 이진형과 현성주(코몽)는 하승진·넉스·서출구·윤비와 함께 성별로 갈린 남성 연합에 속했다. 습격의 날 직후 두 사람은 하승진과 함께 유리사를 지하감옥으로 보내는 데 동조했고, 머니 챌린지 \'넘버 체인지\'에서는 넉스와 이진형이 팀 전략을 주도하고 현성주가 이에 따르는 모습이 나왔다. 이 구)저택 팀은 습격의 날 패배와 이후 팀전 머니 챌린지 전패로 \'콩가루 집안\'이라 불릴 만큼 연전연패했다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/피의%20게임2/참가자',
      'https://namu.wiki/w/현성주/피의%20게임',
    ],
  },
  {
    id: 'lee-sang-min--kim-yoo-hyun--prior-show-27',
    source: 'lee-sang-min',
    target: 'kim-yoo-hyun',
    type: 'prior-show',
    season: 0,
    label: '그랜드 파이널 동반 출연',
    labelEn: 'Both on Genius Grand Final',
    description: '더 지니어스 시즌4 \'그랜드 파이널\'(2015, tvN)의 13인 올스타 출연진에 두 사람이 모두 포함돼 같은 시즌을 직접 치렀다. 이상민은 시즌1 \'게임의 법칙\'과 시즌2 \'룰 브레이커\'를 거친 시즌2 대표로, 김유현은 시즌3 \'블랙가넷\' 대표로 합류했으며, 두 사람의 출연 이력이 겹치는 유일한 시즌이 그랜드 파이널이다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://ko.wikipedia.org/wiki/더_지니어스:_그랜드_파이널',
      'https://namu.wiki/w/더%20지니어스/역대%20출연자',
    ],
  },
  {
    id: 'seo-chul-gu--choi-hye-sun--alliance-s3-28',
    source: 'seo-chul-gu',
    target: 'choi-hye-sun',
    type: 'alliance',
    season: 3,
    label: '필승법을 넘겨준 연합 동료',
    labelEn: 'He handed her the win',
    description: '피의 게임3(웨이브, 2024~2025)에서 두 사람은 후반부 \'낙원 연합\'에 함께 속했고, 이 연합이 \'홍진호 연합\'으로 재편된 뒤에도 같은 편에 남아 끝까지 함께 움직였다. 관계의 정점은 9일차 \'Try13\'이다. 서출구가 짜낸 필승법에 최혜선이 제대로 올라타 시즌 첫 단독 우승을 거뒀는데, 그 대가로 서출구는 자기 연합을 통째로 태워야 했다.',
    strength: 3,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/피의%20게임3/참가자',
      'https://namu.wiki/w/피의%20게임3',
    ],
  },
  {
    id: 'seo-chul-gu--lee-jin-hyung--rivalry-s2-29',
    source: 'seo-chul-gu',
    target: 'lee-jin-hyung',
    type: 'rivalry',
    season: 2,
    label: '추방했다가 파이널에서 다시',
    labelEn: 'Exiled him, met him again',
    description: '\'피의 게임2\'(2023, 웨이브)에서 서출구는 저택팀으로 시작했다가 2~3일차 저녁 야생팀에 납치·포섭돼 진영을 옮겼고, 이진형은 저택팀에 남았다. 중반에 서출구가 수식 계열 머니 챌린지를 연달아 우승해 저택의 권력자가 됐을 때 이진형을 야생으로 추방했다. 시즌의 마지막에 두 사람은 파이널 1라운드에서 다시 만났고, 이번에는 이진형이 더블 선언 전략으로 서출구를 꺾었다.',
    strength: 3,
    outcomes: [
      {
        winner: 'lee-jin-hyung',
        season: 2,
        where: '피의 게임2 파이널 1라운드',
        whereEn: 'Bloody Game 2, the first final round',
        score: '17:8',
      },
    ],
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%842/%EC%B0%B8%EA%B0%80%EC%9E%90',
      'https://namu.wiki/w/%ED%94%BC%EC%9D%98%20%EA%B2%8C%EC%9E%842',
      'https://namu.wiki/w/%EC%84%9C%EC%B6%9C%EA%B5%AC',
    ],
  },
  {
    id: 'lee-sang-min--lee-tae-gyun--co-season-s1-30',
    source: 'lee-sang-min',
    target: 'lee-tae-gyun',
    /* Was `prior-show`, which told the reader these two "met on another
       programme". It was the same programme, the same season, and not a
       meeting. `co-season` is the type for exactly this. */
    type: 'co-season',
    season: 1,
    label: '브레인 군단 수장이 지켜본 우승',
    labelEn: 'Panel chief watched him win',
    description: '이상민은 피의 게임 시즌1(MBC every1, 2021.11.01~2022.01.24)에서 스튜디오 패널 \'브레인 군단\'의 수장으로 장동민·박지윤·슈카·최예나와 함께 참가자들의 플레이를 해설했다. 이태균은 같은 시즌의 플레이어로, 초반에 지하실로 떨어졌다가 다시 올라와 시즌을 가져갔다. 다만 두 사람은 같은 시즌에 속했을 뿐 역할이 달라(스튜디오 패널 vs 플레이어), 게임 진행 중 직접 상호작용한 정황은 확인되지 않는다.',
    strength: 2,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/피의%20게임(시즌%201)',
      'https://v.daum.net/v/20220118002131798',
    ],
  },
  /* THE THREE 이상민 LINES SAY THE SAME PARAGRAPH THREE TIMES, AND ONE OF THEM
     ADMITTED IT. 이상민 has a line to each of the three season-1 players in
     this cast, and all three used to open by re-explaining the panel — the
     roster, the desk, "the roles were separate" — so a reader clicking his
     second, third and fourth line read one paragraph three times. That is the
     defect the Project Genius trio was rewritten to fix (see the note above
     those three), and it was never carried back here.

     The remedy is the same one: the frame is stated ONCE, on the 이태균 edge
     above, where the champion makes it land. These two say what the OTHER end
     was doing while he watched — 박지민's designed season, 정근우's day-4
     descent and day-8 return — and mention the panel seat in a clause instead
     of a paragraph. The facts are records.ts's; no rank or placement is
     restated here, which is that file's job. */
  {
    id: 'lee-sang-min--park-ji-min--co-season-s1-31',
    source: 'lee-sang-min',
    target: 'park-ji-min',
    type: 'co-season',
    season: 1,
    label: '패널석에서 지켜본 시즌1',
    labelEn: 'Panel chief over her season',
    description: '이상민이 해설석에서 지켜본 시즌1을 실제로 굴린 사람은 박지민(MBC 아나운서)이었다. 2일차 분배 게임에서 자신을 퀸으로 지목한 킹을 그대로 상대 연합에 팔아넘겼고, 4일차에는 눈물 연기로 정근우의 자진 탈락을 끌어냈으며, 투표로 탈락자를 정하는 시즌1 구조에서 마지막 회까지 단 한 표도 받지 않은 유일한 참가자로 남았다. \'처음부터 이 판은 내가 짰어, 그냥 따라와\'가 그 시즌에 그가 남긴 대사다. 패널석은 판에 손을 댈 수 없는 자리이므로 이상민이 그 설계에 개입한 지점은 없고, 두 사람이 판 안에서 마주친 기록도 없다. 박지민은 시즌2에도 플레이어로 나왔지만 그 시즌에는 패널석 자체가 없었다.',
    strength: 2,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/피의%20게임(시즌%201)',
      'https://namu.wiki/w/피의%20게임(시즌%201)/참가자',
      'https://namu.wiki/w/박지민(아나운서)',
    ],
  },
  {
    id: 'ha-seung-jin--park-ji-min--rivalry-s2-32',
    source: 'ha-seung-jin',
    target: 'park-ji-min',
    type: 'rivalry',
    season: 2,
    label: '성별 갈라치기 투표의 첫 표적',
    labelEn: 'He voted her into the match',
    description: '피의 게임2(2023)에서 박지민은 야생팀에서 저택으로 잠입한 스파이였고, 하승진은 처음부터 저택팀에 있던 인물이라 정면 반대 진영이었다. 하승진은 남녀 머릿수 차이를 근거로 한 \'성별 갈라치기\' 투표 논리를 저택 안에서 가장 먼저 꺼낸 인물이고, 데스매치 진출자 투표에서 실제로 박지민의 이름을 불렀다. 시즌1에서 굳어진 \'배신의 아이콘\' 이미지 탓에 초반부터 의심을 사던 사람에게, 저택에서 가장 먼저 나온 지목이 그의 입에서 나왔다는 뜻이다. 다만 하승진이 저택 남성 연합의 리더였던 것은 아니고, 나무위키는 그의 시즌2를 \'조력자\' 역할로 서술한다.',
    strength: 2,
    directed: true,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/박지민(아나운서)/피의%20게임',
      'https://namu.wiki/w/피의%20게임2/참가자',
      'https://namu.wiki/w/하승진/피의%20게임',
    ],
  },
  /* 아는 형님 is a real meeting and the two edges below were filed with the
     non-meetings by mistake. 이상민 has been a fixed member of that classroom
     since March 2016 — not 2015, which is when the show started and which both
     of these descriptions used to say — so a guest records a whole episode in
     the room with him. Thin, but a shared studio on a shared day.

     The episode numbers now sit in the copy because they answer the question a
     reader immediately asks next: 곽범 and 하승진 both guested "in 2025", so did
     THEY meet? They did not — 464회 and 469회 are five weeks apart, and that is
     why there is no third edge here. A date that rules something out is worth
     as much as one that rules something in. */
  {
    id: 'lee-sang-min--kwak-beom--prior-show-38',
    source: 'lee-sang-min',
    target: 'kwak-beom',
    type: 'prior-show',
    season: 0,
    label: '같은 교실, 고정 멤버와 게스트',
    labelEn: 'Same classroom, fixed member and guest',
    description: 'JTBC \'아는 형님\'이 유일한 접점이고, 곽범은 그 교실에 두 번 왔다. 이상민은 2016년 3월에 고정으로 합류해 지금까지 앉아 있는 멤버다. 곽범의 첫 방문은 469회(2025년 2월 15일) \'골 때리는 아는 풋살\' 특집으로, 교실이 아니라 스페셜 해설위원 자리였다. 실제로 같은 교실에 앉은 것은 513회(2026년 1월 10일) \'형님학교 드립 전쟁\'이다 — 신봉선·양상국·이선민·이재율과 함께 전학생으로 들어와 한 회차를 통째로 녹화했다. 그 이틀을 넘어가는 개인적 친분은 따로 기록돼 있지 않다. 두 사람 다 웃기는 일로 오래 버틴 이력이 있다는 점은 겹친다 — 이상민은 1990년대 가요계에서 넘어와 예능에 정착했고, 곽범은 4년을 떨어진 끝에 2012년 KBS 공채 27기로 붙었다.',
    strength: 2,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/아는%20형님',
      'https://namu.wiki/w/곽범',
      'https://namu.wiki/w/아는%20형님/방영%20목록/2025년%20상반기',
      'https://namu.wiki/w/아는%20형님/방영%20목록/2026년%20상반기',
    ],
  },
  {
    id: 'lee-sang-min--ha-seung-jin--prior-show-39',
    source: 'lee-sang-min',
    target: 'ha-seung-jin',
    type: 'prior-show',
    season: 0,
    label: '같은 교실에 하루 다녀간 사이',
    labelEn: 'One day in the same classroom',
    description: '두 사람의 유일한 접점도 JTBC \'아는 형님\'이다. 이상민은 2016년 3월부터의 고정 멤버이고, 하승진은 464회(2025년 1월 11일) \'형님학교 / 빅토리 체전\' 편에 허경환·김요한과 함께 게스트로 왔다. 은퇴한 농구 선수가 예능 고정들 사이에 한 회차를 앉았다 간 형태라 같은 방에 있었던 것은 맞지만, 두 사람 사이의 개별적인 일화는 남아 있지 않다. 그리고 이 교실을 이 라인업의 세 번째 인물도 다녀갔지만 겹치지는 않는다 — 곽범이 처음 온 것은 5주 뒤인 469회다. 하승진에게는 피의 게임2 시절의 인연이 따로 있고, 이상민에게는 시즌1 패널석의 인연이 따로 있는데, 두 사람의 접점만은 하우스 바깥에 있다.',
    strength: 2,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/아는%20형님',
      'https://namu.wiki/w/하승진',
      'https://namu.wiki/w/아는%20형님/방영%20목록/2025년%20상반기',
    ],
  },
  /* THE THREE BELOW ARE NOT MEETINGS, and they are now typed for it. Each pair
     has a parallel record and has never shared a room; each description says
     so in its own first sentence; each headline leads with 만난 적 없는; each
     carries `confidence: 'low'` so the 미확인 marker fires on the hover card,
     the edge card and the dossier. What they no longer do is borrow
     prior-show's blue and prior-show's dash, which is what used to file them,
     in the legend and in the picture, alongside pairs who actually met.

     The edge ids keep their `prior-show` slug on purpose: an id is a key, it
     is in shared links, and renaming it to match a retype would break every
     URL that already points at one of these cards. The `type` field is the
     claim; the id is just a handle.

     These three exist because three people in this lineup have no verified
     meeting with anyone in it, and a parallel record is still a fact about
     them. Searched again this round against the angles that had not been tried
     — agencies, universities, hometowns, YouTube channels, shared MCs, 환승연애
     alumni — and still found none. What was checked and came back empty, so the
     next editor does not re-spend it:

       강지후 — 대학전쟁3's KAIST four are 강지후·김재한·김지우·전지민 and its six
         squads are SNU medical, SNU engineering, KAIST, POSTECH, Yonsei and
         SKKU; nobody in this lineup is on any of them. The franchise's own
         crossover was checked at the roster level, not just this season's:
         대학전쟁1's KAIST four are 소현지·양준혁·최서연·허성범 and 대학전쟁2's are
         박지성·오형석·최유찬·황기현, so 허성범 is the ONLY name the three casts
         share with this twenty, and he is the other end of the line below.
         황인성 hosts all three seasons, so there is no shared-MC route either.
         경기북과학고 16기 조기졸업 and KAIST 수리과학과 22학번 put him at neither
         school with anyone here; the tutoring business he runs is his own.
       신승용 — 이천고, 서울대 (college unnamed), 강남 개원의, 환승연애4 from
         episode 12, and the YouTube channel 퀸승용 he runs with 곽민경. The
         환승연애4 cast was read out in full — 곽민경·김우진·박지현·박현지·성백현·
         신승용·이재형·정원규·조유식·최윤녕·홍지연 — and not one of them is in this
         lineup; the channel's documented guests (정규민, 성백현, 곽민경) are all
         outside it too. His 서울대 is the one thing that reaches this cast, and
         it reaches two people: 이진형, who is the line below, and 김경훈, whose
         SNU is a 화학생물공학 graduate school after an Illinois undergraduate
         degree. A second 'both went to a large national university' line, drawn
         to a man who was never in the same building or the same decade, is the
         filler this dataset does not carry. It is not written.
       최연청 — 국립국악고 → 단국대 국악과, agencies 이엘파크 (2020–22) and
         씨제스 스튜디오 (2023–24), unsigned since; screen work in Korea and China
         (창궐 2018, 원펀치 2019, 턴: 더 스트릿 2021, 미스 함무라비 2018, 너의
         시선이 머무는 곳에 2020/2023) and four music videos (슈퍼주니어 2015,
         Fly to the Sky 2015, 비투비 2016, Knack 2016) — no cast member on any
         call sheet, no quiz or survival credit before this, and no shared
         agency with anyone here, since no one else in the twenty has been at
         either house. Her Miss Korea year is one behind 김남희's, which is the
         line she already has.

     There is one thing that would look like a tie and is not usable: 강지후's
     channel name was suggested as a joke by 이진형, and nothing dates that
     exchange to before X. A connection this atlas cannot show to predate the
     season it refuses to describe is not a pre-premiere fact, so it stays out.
     If a source ever dates it earlier, it becomes a real second tie for him. */
  {
    id: 'heo-seong-beom--kang-ji-hoo--prior-show-35',
    source: 'heo-seong-beom',
    target: 'kang-ji-hoo',
    type: 'parallel',
    season: 0,
    label: '만난 적 없는 카이스트 계보',
    labelEn: 'The KAIST seat, never the same season',
    description: '두 사람이 같은 방에 있었던 적은 없다. 쿠팡플레이 \'대학전쟁\'의 카이스트 자리를 두 시즌 차이로 물려받은 것이 겹치는 전부다. 허성범은 2023년 시즌1에서 카이스트 팀 리더로 출연했고, 강지후는 2025~26년 시즌3에서 카이스트 팀으로 출전해 3위를 기록했다. 다만 두 사람이 같은 시즌에 함께 앉은 적은 없다 — \'대학전쟁3\'의 카이스트 팀 명단은 강지후·김재한·김지우·전지민 넷이고 거기에 허성범은 없다. 시즌3에는 전 시즌 출연자가 돌아오지도 않았고, 진행은 황인성이 맡았다. 겹치는 이력을 하나 더 세면 학교로 가는 길도 같다 — 허성범은 한국과학영재학교를 거쳐 KAIST 전산학부로, 강지후는 경기북과학고를 조기졸업하고 KAIST 수리과학과 22학번으로 들어갔다. 이 라인업에서 과학고·영재학교를 거쳐 KAIST에 간 사람은 이 둘뿐이고, 학과는 서로 다르다.',
    strength: 1,
    confidence: 'low',
    sources: [
      'https://namu.wiki/w/대학전쟁3',
      'https://namu.wiki/w/대학전쟁',
      'https://namu.wiki/w/강지후(2004)',
    ],
  },
  {
    id: 'kim-nam-hee--choi-yeon-cheong--prior-show-36',
    source: 'kim-nam-hee',
    target: 'choi-yeon-cheong',
    type: 'parallel',
    season: 0,
    label: '만난 적 없는 멘사 회원 둘',
    labelEn: 'Two Mensa cards, never in the same room',
    /* WHERE EACH HALF OF THIS LINE IS ATTESTED, because the two halves are not
       attested in the same place and the edge used to cite only the two wiki
       pages. 김남희's card is on her own page — she gave the IQ and the
       membership (대회협력이사직) on air. 최연청's is not on hers at all: it
       comes from the casting announcement, where she is billed "IQ 156 멘사
       회원이자 배우" and 김남희 "더 타임 호텔 출신의 IQ 156 멘사 회원". So the
       press release is the source for one end of this line and is now cited.
       Miss Korea likewise: 김남희's page names the year and the awards, 최연청's
       says only that she competed in 2013 at nineteen. The region came back this
       round from a different page — the pageant's own 역대 참가자 table, which
       lists both women as regional entrants — so it is stated again, cited
       there rather than to either biography.

       HER RANK IS STILL NOT STATED, and that is deliberate. The 역대 참가자
       table has her as 전북 미; contemporaneous entertainment copy has called
       her 전북 선. Both agree on the year and the region and disagree on the
       award, which is one place too many for a dataset that prints 확인된 to
       pick a side quietly. The region carries the whole point of the sentence —
       two women, two regions, two consecutive years, no overlap — so nothing is
       lost by leaving the contested figure out. 김남희's 서울 선 is uncontested
       and stays. */
    description: '두 사람이 마주친 기록은 없다. 이 라인업의 멘사 코리아 회원이 둘이고 그 둘이 이들이라는 것이 이 선의 출발점이다. 알려진 IQ도 156으로 같고, 두 사람 다 이번 캐스팅 발표에서 그 문장으로 소개됐다. 겹치는 이력은 하나 더 있다 — 미스코리아다. 최연청은 2013년 만 19세에 전북 대표로 출전했고, 김남희는 이듬해인 2014년 미스코리아 서울에서 선(善)과 우정상을 받았다. 지역도 해도 어긋나 있어서 같은 무대에 함께 선 적은 없다. 한 해 차이로 같은 관문을 통과했고 같은 협회의 회원증을 갖고 있지만, 두 사람이 같은 대회나 같은 프로그램에서 마주쳤다는 기록은 없다. 서로 아는 사이라는 근거가 아니라 나란히 놓고 보면 같은 모양이라는 뜻의 선이다.',
    strength: 1,
    confidence: 'low',
    sources: [
      'https://namu.wiki/w/최연청',
      'https://namu.wiki/w/김남희(방송인)',
      'https://namu.wiki/w/미스코리아/역대%20참가자',
      'https://www.newspim.com/news/view/20260604000984',
      'https://news.nate.com/view/20260604n23735',
    ],
  },
  {
    id: 'lee-jin-hyung--shin-seung-yong--prior-show-37',
    source: 'lee-jin-hyung',
    target: 'shin-seung-yong',
    type: 'parallel',
    season: 0,
    label: '만난 적 없는 이 집의 의사 둘',
    labelEn: 'Two doctors who have never met',
    /* CHECKED AGAIN THIS ROUND AND STILL NOT WRITTEN. 신승용's 서울대 is
       verified twice over — his 학력란 reads "이천고등학교 (졸업) / 서울대학교
       (졸업)" and the casting announcement bills him "서울대 출신 의사이자
       환승연애4 출연자" — and neither names a college. 이진형's, by contrast, is
       itemised: 서울과학고 → 서울대 자유전공학부 14학번 (중퇴) → 서울대
       의과대학 19학번 (졸업). So the shared university is now a sourced fact on
       both ends and the shared COLLEGE is still the inference the sources will
       not carry, which is why the sentence stops where it does. The gap is
       stated as 학번 rather than as age because 학번 is what is on the record. */
    description: '두 사람이 만난 기록은 어디에도 없다. 라인업의 의사가 둘이고 학교까지 겹친다는 것이 이 선의 전부다. 이진형은 서울과학고를 나와 서울대 자유전공학부에 14학번으로 들어갔다가 중퇴했고, 2019학년도 수능 만점자로 다시 들어가 서울대 의과대학 19학번으로 졸업한 뒤 청담동에서 피부과 진료를 본다. 신승용은 이천고를 나와 서울대를 졸업했고 강남에서 피부·모발 쪽 진료를 보는 개원의다. 다만 같은 단과대학이었는지는 확인되지 않는다 — 신승용의 학력에는 \'서울대학교 졸업\'까지만 적혀 있고, 두 사람의 학번은 여덟 해 가까이 떨어져 있다. 앞의 한 명은 이미 이 프랜차이즈에서 우승했고 뒤의 한 명은 이번이 첫 출연이며, 같은 프로그램이나 같은 병원에서 마주친 기록은 없다. 이 선은 아는 사이라는 뜻이 아니라 같은 자격증을 들고 같은 집에 들어간다는 뜻이다.',
    strength: 1,
    confidence: 'low',
    sources: [
      'https://namu.wiki/w/피의%20게임2/참가자',
      'https://namu.wiki/w/이진형(1995)',
      'https://namu.wiki/w/신승용',
      'https://www.newspim.com/news/view/20260604000984',
    ],
  },
  /* 이태균 had three ties and all three were season 1 — the franchise's first
     champion sat in a season-1 pocket with no line out of it, and his
     `otherShows` was an empty array. 프로젝트 지니어스 is the way out, and it
     is a real one: a documented cast list with four of this lineup on it.

     ── THE OTHER THREE PAIRS ON THIS CAST LIST — RESEARCHED, NOT YET DRAWN ──
     Four of the twenty are on the eight-name 프로젝트 지니어스 list (홍진호 ·
     김유현 · 현성주 · 이태균), which is six pairs, and only three of them carry
     an edge: this one, 홍진호×현성주 (filed under the poker) and 홍진호×김유현.
     Missing are 이태균×홍진호, 이태균×현성주 and 현성주×김유현 — including the
     most resonant pairing on the list, the franchise's first champion against
     the franchise's most-connected returner, while the less resonant pair
     below gets the line and the write-up. That is an inconsistency a careful
     reader finds in one click, and the research is done: all four carry the
     identical `otherShows` row (`Project Genius`, 2022, 촬영 후 미공개), the
     cast list is attested on the same NAMU_PROJECT_GENIUS page this edge
     cites, and the three would be `prior-show`, season 0, strength 2,
     confidence 'medium' — the same shape as this edge, with the cast-list
     narrative left here rather than restated four times.

     WHAT BLOCKS THEM, precisely: `dataset.meta.sourcing` prints '전체 인용
     287건 중 220건, 약 77%' as prose and tools/validate-data.mjs section 9
     asserts those three numbers against the live citation count. Three new
     edges carrying one source each makes it 290 / 223 / 77%, so the edges and
     that paragraph have to land in the same commit. Section 0c below keeps
     the three pairs on the build's open-seams list until they do — this is a
     measured, one-line arithmetic edit, not a research task. */
  {
    id: 'lee-tae-gyun--kim-yoo-hyun--prior-show-43',
    source: 'lee-tae-gyun',
    target: 'kim-yoo-hyun',
    type: 'prior-show',
    season: 0,
    label: '방송되지 않은 판에 같이 불려 갔다',
    labelEn: 'Called to a board that never aired',
    description: '두 사람이 같은 판에 앉은 적은 있는데, 그 판은 끝내 방송되지 않았다. 유튜브 채널 투에이스가 2022년 5월경 촬영한 두뇌 서바이벌 \'프로젝트 지니어스\'의 참가자 명단에 두 사람이 함께 올라 있다. 명단은 홍진호·이두희·최연승·김유현·공혁준·장지수·현성주·이태균 여덟 명으로, 지니어스 쪽 계보와 피의 게임 쪽 계보를 한 테이블에 앉힌 캐스팅이었다 — 최연승은 이태균과 같은 시즌1을 뛴 참가자이고, 홍진호와 현성주도 이 명단에 있다. 그러나 제작사가 2024년 활동을 중단하면서 프로그램은 공개되지 않았고, 그날 촬영장에서 무슨 일이 있었는지는 어디에도 남아 있지 않다. 이 선이 말하는 것은 결과가 아니라 호출이다 — 프랜차이즈 초대 챔피언과 지니어스 출신 프로 갬블러가 4년 전 같은 날 같은 방으로 불려 갔다는 것.',
    strength: 2,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/프로젝트%20지니어스',
      'https://namu.wiki/w/김유현',
    ],
  },
  /* The other three pairs off the same eight-name call sheet.
     The cast-list NARRATIVE stays on the edge above — it is told once, there,
     and each of these three describes only its own pair. Four of the twenty
     were on that list, which is six pairs; two of the six (홍진호–현성주,
     홍진호–김유현) already carry a stronger, later line of their own, so
     drawing a fourth "and they were also on this list" between them would
     bury a real relationship under a summons. These three had nothing.

     ── AND THEN THEY WERE THREE COPIES OF ONE PARAGRAPH ─────────────────────
     Written off one call sheet in one sitting, they came out at 211, 123 and
     109 characters against a file median of ~280 — the three shortest entries
     here — and all three restated the same non-fact: four of this twenty were
     on a list in 2022 for a programme nobody has seen. A reader clicking
     이태균's second, third and fourth line read the same paragraph three times,
     and half of the franchise champion's connection count rested on it.

     The fix is not more words about the shoot. There are none, and inventing
     some is the one thing these lines exist to refuse. It is that a summons has
     TWO ENDS and both of them are on the record: what each of these people was
     doing in May 2022, and what a casting director was looking at when those
     two names went on one list. That is different for every pair — the newest
     champion of one house against the oldest champion of another; the
     channel's own player against somebody brought in from outside; two people
     crossing between poker and television in opposite directions — and none of
     it needs a single fact about what happened in the room.

     Every fact below is already on the two people's own pages and cited there,
     which is why none of these three grew a source. `dataset.meta.sourcing`
     states this dataset's citation arithmetic in prose and validate-data
     section 9 asserts it, so an edge that quietly adds a reference fails the
     build in a file that is not this one. */
  {
    id: 'hong-jin-ho--lee-tae-gyun--prior-show-45',
    source: 'hong-jin-ho',
    target: 'lee-tae-gyun',
    type: 'prior-show',
    season: 0,
    label: '초대 챔피언 둘, 한 명단에',
    labelEn: 'Two inaugural champions, one list',
    description:
      '2022년 5월에 이 명단이 만들어질 때 두 사람이 각각 어디에 서 있었는지를 보면 왜 함께 불렸는지가 보인다. 이태균은 넉 달 전인 1월 24일에 피의 게임 시즌1 결승을 끝내고 프랜차이즈의 초대 챔피언이 된 참이었다. 홍진호는 그해 WSOP 브레이슬릿을 가져갔고, 그 전해 가을에는 이 명단을 만든 바로 그 채널 투에이스가 연 \'포커 신들의 전쟁\' 시즌2 인비테이셔널을 우승한 상태였다. 두뇌 서바이벌의 초대 우승자와 피의 게임의 초대 우승자를 한 테이블에 앉히는 캐스팅이었다. 그 테이블에서 무엇이 오갔는지는 프로그램이 공개되지 않아 남아 있지 않다.',
    strength: 2,
    confidence: 'medium',
    sources: ['https://namu.wiki/w/프로젝트%20지니어스'],
  },
  {
    id: 'hyun-seong-joo--lee-tae-gyun--prior-show-46',
    source: 'hyun-seong-joo',
    target: 'lee-tae-gyun',
    type: 'prior-show',
    season: 0,
    label: '두 사람이 같이 있었던 유일한 방',
    labelEn: 'The only room these two have shared',
    description:
      '프랜차이즈 안에서 두 사람이 같은 판에 앉은 적은 없다 — 이태균은 시즌1, 현성주는 시즌2다. 두 이름이 함께 올라간 명단은 2022년 5월의 \'프로젝트 지니어스\' 하나뿐이다. 그때 현성주는 커리어에서 가장 좋은 구간을 지나고 있었다. 그해에만 WPT 벨라지오 이벤트 #5와 PGT 하이롤러 시리즈 이벤트 #36을 우승했고, 그 전해에는 이 명단을 만든 투에이스가 연 \'포커 신들의 전쟁\' 시즌2에 나간 그 채널 쪽 플레이어였다. 이태균은 반대편에서 온 사람이었다 — 다른 하우스에서 막 우승하고 나온 참가자. 채널의 선수와 바깥에서 온 챔피언을 한 판에 앉히는 그림이었고, 그 판은 방송되지 않았다.',
    strength: 2,
    confidence: 'medium',
    sources: ['https://namu.wiki/w/프로젝트%20지니어스'],
  },
  {
    id: 'hyun-seong-joo--kim-yoo-hyun--prior-show-47',
    source: 'hyun-seong-joo',
    target: 'kim-yoo-hyun',
    type: 'prior-show',
    season: 0,
    label: '포커와 방송 사이를 반대로 건넌 둘',
    labelEn: 'Crossing the same gap in opposite directions',
    description:
      '포커와 방송 사이를 두 사람은 반대 방향으로 건넜다. 김유현은 방송을 통해 포커로 갔다 — 2014년 「더 지니어스: 블랙가넷」에 일반인 참가자로 들어가 프로 갬블러로 소개됐고, 한동안 영어강사로 전업했다가 2022년에 다시 테이블로 돌아왔다. 현성주는 포커를 통해 방송으로 왔다 — 2020년 한국인 세 번째 WSOP 브레이슬릿, 이듬해 투에이스의 \'포커 신들의 전쟁\' 시즌2 출전. 2022년 5월 두 사람이 같은 명단에 오른 것은 그 두 경로가 서로를 스쳐 지나간 지점이다. 그 판은 끝내 공개되지 않았으므로, 이 선이 말할 수 있는 것은 두 경로가 한 번 겹쳤다는 것까지다.',
    strength: 2,
    confidence: 'medium',
    sources: ['https://namu.wiki/w/프로젝트%20지니어스'],
  },
  /* Season 1's four X players are now fully connected: the panel chief has a
     line to each of the three who actually played that season. */
  {
    id: 'lee-sang-min--jung-keun-woo--co-season-s1-40',
    source: 'lee-sang-min',
    target: 'jung-keun-woo',
    type: 'co-season',
    season: 1,
    label: '해설석과 저택, 같은 시즌 다른 자리',
    labelEn: 'Same season, one desk and one house',
    description: '정근우는 이상민이 해설한 시즌1에서 저택에 들어간 10인 중 한 명이었고, 시즌 중반을 패널이 화면으로만 볼 수 있는 층에서 보냈다. 4일차, 박지민이 흘린 (사실은 연기였던) 눈물을 보고 \'다시 배신하는 건 도리가 아니다\'라며 스스로 탈락을 택해 지하층으로 내려갔고, 지하에서는 제작진이 만든 가짜 규칙과 계급 놀이까지 받아들이며 저택 시절의 평가를 뒤집은 뒤 8일차에 지상으로 복귀했다. 그 왕복은 스튜디오에서 손댈 수 있는 종류의 일이 아니었고 — 패널석은 게임에 개입할 수 없다 — 두 사람 사이에 오간 장면은 남아 있지 않다.',
    strength: 2,
    confidence: 'high',
    sources: [
      'https://namu.wiki/w/피의%20게임(시즌%201)',
      'https://namu.wiki/w/피의%20게임(시즌%201)/참가자',
    ],
  },
  /* Season 3 used to stop at its four players. 박지민 is the franchise's only
     three-season figure and she was standing inside season 3 the whole time —
     as staff, in the one location both of these two were sent to. */
  {
    id: 'park-ji-min--heo-seong-beom--co-season-s3-41',
    source: 'park-ji-min',
    target: 'heo-seong-beom',
    type: 'co-season',
    season: 3,
    label: '잔해의 딜러와 잔해로 내려온 쪽',
    labelEn: 'The dealer of the ruins, and a player sent down to it',
    description: '피의 게임3에서 박지민은 참가자가 아니라 판을 굴리는 쪽이었다 — 제작진 표기로 \'잔해 유령 카지노·연옥 담당 집사\'다. 허성범은 1일차를 피의 낙원에서 시작했고, 2일차 우승 보상으로 연 판도라의 상자에서 하필 페널티 면을 뽑아 낙원의 습격 방어 조건을 스스로 뒤집어 놓았으며, 습격의 날 이후 잔해로 내려갔다. 그때부터 그가 서 있던 구역이 박지민이 맡은 구역이다. 두 시즌을 플레이어로 뛰고 세 번째 시즌을 딜러석에서 맞은 사람과, 그 딜러석 앞으로 떠밀려 내려간 최연소 참가자가 같은 화면 안에 있었다는 뜻이다. 다만 두 사람 사이의 개별적인 일화는 기록돼 있지 않다.',
    strength: 2,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/피의%20게임3',
      'https://namu.wiki/w/피의%20게임3/참가자',
      'https://namu.wiki/w/허성범/피의%20게임',
    ],
  },
  {
    id: 'park-ji-min--choi-hye-sun--co-season-s3-42',
    source: 'park-ji-min',
    target: 'choi-hye-sun',
    type: 'co-season',
    season: 3,
    label: '1일차에 이기고도 내려간 곳',
    labelEn: 'Where winning still sent her downstairs',
    description: '최혜선은 피의 게임3 1일차 데스매치를 58칩 대 12칩으로 이기고도 규칙에 따라 잔해로 내려갔다. 이긴 쪽을 내려보내는 그 규칙이 최혜선을 박지민의 테이블 앞에 세운 셈이고, 잔해의 유령 카지노와 연옥을 맡은 집사가 박지민이었다. 시즌1과 시즌2를 플레이어로 뛰다 \'배신의 아이콘\'이라는 별명을 얻은 사람이 이번에는 남의 판을 굴려 주는 자리에 앉아 있었고, 재출연 참가자들이 그 별명을 부르는 장면까지 방송을 탔다. 최혜선은 그 앞을 지나간 참가자 중 한 명이고, 두 사람 사이의 개별적인 일화는 남아 있지 않다.',
    strength: 2,
    confidence: 'medium',
    sources: [
      'https://namu.wiki/w/피의%20게임3',
      'https://namu.wiki/w/최혜선/피의%20게임',
      'https://namu.wiki/w/박지민(아나운서)',
    ],
  },
];
