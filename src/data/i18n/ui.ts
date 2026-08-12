/**
 * Interface strings, both languages, one table.
 *
 * Every user-facing string that used to be hardcoded in a component lives here
 * so the chrome can switch language without touching the dataset. The Korean
 * side is transcribed from the components as they stand; the English side is
 * authored, not translated — same register, same specificity, same length.
 *
 * Rules of the table:
 *   • Keys are dot-namespaced, lowercase, and stable. A key is a contract.
 *   • `ko` and `en` carry exactly the same key set. A missing key strands a
 *     Korean string in the English UI, which is the one failure mode this file
 *     exists to prevent.
 *   • Nothing here describes a person, a result, or an event. Taxonomy and
 *     chrome only — and nothing from inside season X.
 */

import type { Category, EdgeType, XTeam } from '../types';
import type { Lang } from './types';

export const ui = {
  ko: {
    /* ── brand and wordmark ───────────────────────────────────────────── */
    'app.title': '피의 게임X',
    'app.subtitle': 'Cast Atlas',
    'app.subtitleLong': '출연진 관계도',

    /* ── top bar ──────────────────────────────────────────────────────── */
    'topbar.spoilerBadge': '시즌 X 없음',
    'topbar.spoilerTooltip': '시즌 X 내용 없음',
    'topbar.spoilerAria': '시즌 X 내용은 어디에도 없습니다. 다만 시즌 1–3의 결과는 그대로 들어 있습니다. 이 아틀라스의 범위 설명 열기',
    'topbar.modeGroupLabel': '레이아웃 모드',
    'topbar.orbitLocked': '인물을 먼저 선택하세요',
    'topbar.orbitLockedAria': '사용 불가 — 인물을 먼저 선택하세요',
    'topbar.layoutShortcutAria': '레이아웃, 단축키',
    'topbar.searchPlaceholder': '인물 검색',
    'topbar.searchTitle': '검색',
    'topbar.searchAria': '인물 검색 열기',
    'topbar.searchAriaQuery': '검색어',
    'topbar.searchAriaMatch': '일치',
    'topbar.searchAriaMatches': '일치',
    'topbar.fit': '화면에 맞추기',
    'topbar.fitAria': '화면에 맞추기, 단축키 F',
    'topbar.filters': '필터 패널',
    'topbar.filtersAria': '필터 패널 열고 닫기, 단축키 대괄호',
    'topbar.gallery': '인물 갤러리',
    'topbar.galleryAria': '인물 갤러리 열기, 단축키 G',
    'topbar.about': '안내와 범위',
    'topbar.aboutAria': '안내 및 자료 범위, 단축키 물음표',

    /* ── layout modes ─────────────────────────────────────────────────── */
    'mode.web': '관계망',
    'mode.webHint': '관계 밀도대로 자유 배치',
    'mode.seasons': '시즌별',
    'mode.seasonsHint': '시즌 1–3 출신으로 묶기',
    'mode.archetype': '직업군별',
    'mode.archetypeHint': '직업군으로 묶기',
    'mode.orbit': '인물 중심',
    'mode.orbitHint': '선택한 인물 중심으로 배치',
    'mode.orbitHintNamed': '중심으로 배치',

    /* ── filter rail ──────────────────────────────────────────────────── */
    'rail.ariaLabel': '필터 및 범례',
    'rail.title': '필터',
    'rail.close': '필터 패널 닫기',
    'rail.countLabel': '명 표시 중',
    'rail.reset': '초기화',
    'rail.emptyFlag': '데이터 없음',
    'rail.emptyBody': '명단이 아직 로드되지 않았습니다. 모든 수치는 데이터가 들어오면 채워집니다.',
    'rail.bulkAll': '전체',
    'rail.bulkNone': '없음',
    'rail.bulkAllAria': '전체 선택',
    'rail.bulkNoneAria': '선택 해제',
    'rail.secLineage': '출신',
    'rail.secLineageFoot': '시즌 1–3 출신 세 팀과 챌린저·루키 두 팀',
    'rail.lineageGroupAria': '출신 팀으로 거르기',
    'rail.onlyReturning': '프랜차이즈 경험자만',
    'rail.secArchetype': '직업군',
    'rail.archetypeBulkLabel': '직업군',
    'rail.archetypeGroupAria': '직업군으로 거르기',
    'rail.secArchetypeFoot': '점 색깔 = 그래프에서 그 사람의 링 색',
    'rail.secRelationships': '관계',
    'rail.relationshipsBulkLabel': '관계',
    'rail.relationshipsGroupAria': '관계 종류로 거르기',
    'rail.secRelationshipsFoot': '점선 = 피의 게임 밖에서의 인연',
    /* The node key.
       A disc carries several marks at once and the only place that said what
       any of them meant used to be the field guide's second tab — two actions
       away, behind a modal covering the thing being explained. The hover card
       and the dossier header now teach the marks a reader is actually pointing
       at; this is the resting copy, for a reader who never hovers.
       Kept short on purpose: the rail's text column is ~205px, and the field
       guide's own sentences wrap to two lines each there, which pushes the
       relationship legend below the fold. Four of these are byte-identical to
       the `about.tile*` strings so the two cannot drift into two grammars;
       `링 색` uses the rail's own noun for the concept (`rail.secArchetype`)
       and the sheet now uses the same word. 직업별 / 직업군 / 아키타입
       were three nouns for one concept; 아키타입 was a transliteration of the
       English term this round retires, so 직업군 is the survivor. */
    'rail.secNodeKey': '노드 읽는 법',
    'rail.nodeSize': '크기 = 연결 수',
    'rail.nodeRing': '링 색 = 직업군',
    'rail.nodeArcs': '바깥 호 = 출연한 이전 시즌',
    'rail.nodeHalo': '황동 후광 = 이전 시즌 우승',
    'rail.nodeKeyMore': '나머지 부호 — 안내서에서',
    'rail.outsideTie': '하우스 밖 인연',
    'rail.secMostConnected': '가장 얽힌 인물',
    'rail.statPeople': '인물',
    'rail.statLinks': '인연',
    'rail.noConnections': '아직 기록된 인연이 없습니다.',
    'rail.topRowAria': '연결',
    'rail.topRowAriaTail': '자세히 보기',
    'rail.scopeNote': '시즌 1–3과 다른 프로그램에서의 기록만 표시합니다.',

    /* ── dossier ──────────────────────────────────────────────────────── */
    'dossier.paneLabel': '인물 정보',
    'dossier.barLabel': '인물 파일',
    'dossier.back': '이전 인물로 돌아가기',
    'dossier.close': '닫기',
    'dossier.realName': '본명',
    'dossier.aka': '활동명',
    'dossier.birthYear': '출생',
    'dossier.pastWinner': '역대 우승자',
    'dossier.hosted': '비참가 출연',
    'dossier.unverified': '미확인',
    'dossier.unverifiedProfile': '프로필 일부가 교차 확인 전입니다.',
    'dossier.unverifiedTie': '교차 확인이 끝나지 않았거나, 두 사람이 만난 기록이 없는 관계입니다.',
    'dossier.lineup': '라인업',
    'dossier.lineupHeading': '피의 게임X 라인업',
    'dossier.team': '팀',
    'dossier.lineupNote': '공개된 라인업 정보만 담았습니다. 방영 내용·결과는 포함되지 않습니다.',
    'dossier.credentials': '이력',
    'dossier.franchiseRecord': '피의 게임 기록',
    'dossier.franchiseTotals': '프랜차이즈 통산',
    'dossier.best': '최고',
    'dossier.seasonPlayed': '개 시즌',
    'dossier.seasonsPlayed': '개 시즌',
    'dossier.onRecord': '기록',
    'dossier.finishSuffix': '최종 성적',
    'dossier.elsewhere': '다른 프로그램',
    'dossier.elsewhereRecord': '바깥에서의 기록',
    'dossier.connections': '관계',
    'dossier.sectionsNav': '이 문서의 섹션',
    'dossier.opened': '인물 파일 열림',
    'dossier.sources': '출처',
    'dossier.inHouse': '하우스 안',
    'dossier.outside': '하우스 밖',
    'dossier.emptyRecord': '피의 게임 첫 출연',
    'dossier.emptyRecordSub': '시즌 1–3 기록 없음 — 이 사람의 히스토리는 전부 바깥에서 왔습니다.',
    'dossier.emptyTies': '표시할 관계 없음',
    'dossier.emptyTiesSub': '켜 둔 관계 유형 필터에 모두 걸러졌습니다. 필터를 다시 켜 보세요.',
    'dossier.coldTitle': '아무와도 얽힌 적 없음',
    'dossier.coldSub':
      '나머지 열아홉 명과 함께 출연했거나 함께 일한 기록을 공개 자료에서 찾지 못했습니다. 같은 학교나 같은 자격을 가진 사람은 있지만, 그것만으로는 두 사람이 서로를 안다고 할 수 없어 관계로 세지 않았습니다.',
    'dossier.openFile': '인물 파일 열기',
    'dossier.seasonPrefix': '시즌',
    'dossier.outsideTag': '밖에서',
    'dossier.teamPrefix': '팀',
    'dossier.rankPrefix': '',
    'dossier.rankSuffix': '위',
    /* The denominator for a rank, for the three surfaces that build their own
       short finish out of `run.rank` instead of reading `SeasonRun.placement`:
       AboutSheet's shortFinish, Gallery's shortPlacement and the dossier's
       franchise strip. A rank without its field size is not comparable — 3위
       out of 13 and 3위 out of 18 are different results and all three of those
       surfaces print them identically — and every one of them already has
       `run.fieldSize` on the object in hand. Append this to the rank:
       `${rank}위 ${t(lang, 'record.ofField').replace('{n}', String(run.fieldSize))}`. */
    'record.ofField': '/ {n}명 중',

    /* ── the head-to-head ledger (src/data/headToHead.ts) ──────────────────
       'X는 Y를 2승 0패로 앞선다' is the first question a franchise viewer asks
       about a returning-cast season and the app could not answer it, although
       every ingredient was already in the dataset. These strings are the whole
       vocabulary the ledger needs; the numbers come from `ledgerFor(id)` and
       `careerTable`, so a surface renders and does not compute.

       'faced.duel' and 'faced.field' must stay distinguishable in the copy —
       "they played each other" and "they were both in that field and one
       finished higher" are different claims and the ledger counts them apart.

       TWO VOCABULARIES, AND EVERY KEY ADDED HERE HAS TO PICK ONE. The chip and
       the sentence were single keys printed over both kinds, so 35 of the 40
       results said 이겼다 about a match nobody played: 홍진호's file had him
       beating 서출구 twice — the man edges.ts calls his 가장 단단한 2인 페어,
       whom he has never once faced — and beating 최혜선, the partner he took a
       58:12 death match WITH. 'faced.beat' and 'faced.record' now cover DUELS
       only; 'faced.finishedAbove', 'faced.recordField' and 'faced.recordMixed'
       carry everything derived from a finishing order and say only what a
       finishing order says. The note below used to be the whole fix, and a
       footnote under a list cannot retract the sentence inside it. */
    /* The weak claim, because it is the one true of all 40 rows: they were in
       the same place at the same time. 겨뤄 본 — "have already contested" — was
       earned by 5 of them. The strong claim now lives on the 맞대결 rows, where
       it is paid for, instead of in a heading that has to cover both. */
    'faced.title': '이미 마주친 사이',
    /* Also the eyebrow over an edge card's results (components/EdgeCard.tsx),
       where the pair may have either kind or both, so it names the object and
       not the contest. */
    'faced.eyebrow': '기록된 결과',
    'faced.duel': '맞대결',
    'faced.field': '같은 판 순위',
    /* Three shapes for one pair's aggregate, chosen by what the pair actually
       holds. 승/패 is a claim about matches played, so it is spent only where
       every row is one; 순위 counts finishing orders and says so; 결과 covers
       the four pairs that carry one of each, where neither word is true of the
       whole column. Same two numbers in all three — only the noun in front of
       them changes, and it changes to the one the rows underneath support. */
    'faced.record': '{w}승 {l}패',
    'faced.recordField': '순위 {w}–{l}',
    'faced.recordMixed': '결과 {w}–{l}',
    'faced.none': '이 라인업의 누구와도 같은 판에 있었던 적이 없습니다.',
    'faced.noResult': '같은 판에 있었던 적은 있지만, 순위로 비교할 기록은 없습니다.',
    /* Printed beside a record so a "순위 1–0" cannot pass as a complete account
       of a pair who also share two appearances nobody numbered. */
    'faced.unadjudicatedOne': '순위를 매길 수 없는 동반 출연 1회',
    'faced.unadjudicated': '순위를 매길 수 없는 동반 출연 {n}회',
    /* Two names in one sentence, which means two particles, and the particle
       depends on the name — 이진형이 / 홍진호가, 윤비를 / 서출구를. This string
       shipped as '{w}가 {l}을(를) 이겼다', i.e. the exact 과(와) failure the
       helper below this table was written to end, nine lines under a comment
       condemning it. Read it with `fill`, never with `.replace`.

       'faced.beat' IS FOR DUELS ONLY — one board, two people, an adjudicated
       result. Every caller has to guard it on `m.kind === 'duel'`; there is no
       reading of a shared field finish that makes 이겼다 true. */
    'faced.beat': '{w}이/가 {l}을/를 이겼다',
    /* …and this is what the other 35 say. 높이 끝났다 is the whole of what a
       finishing order tells you: it puts the two in an order and it does not
       say either of them played the other. */
    'faced.finishedAbove': '{w}이/가 {l}보다 높이 끝났다',
    'career.title': '프랜차이즈 통산',
    'career.best': '최고 성적',
    'career.outlasted': '{n}명 중 {k}명보다 오래 남았다',
    /* The one column that makes two careers comparable: players outlasted over
       the size of the fields, summed across seasons. 3위/13 twice and 4위/18
       once are not orderable as ranks and are orderable as this. NOT "players
       faced" — `career.faced` is Σ (fieldSize − 1), everyone else who stood in
       those fields, and the English of career.outlasted said "faced" for two
       rounds. */
    'career.share': '생존률',
    'career.seasons': '출전 시즌',
    'career.titles': '우승',
    /* Printed under the ledger. It used to be the ENTIRE defence against '1승
       0패' beside '같은 판 순위' reading as "he beat him" — a footnote asked to
       retract the sentence in the row above it, which is not something a
       footnote can do. Now the rows say it themselves and this only names the
       two kinds, which is the job a legend can actually hold. */
    'faced.note':
      '맞대결은 두 사람이 일대일로 붙은 판입니다. 같은 판 순위는 같은 필드에서 한쪽이 더 높이 끝났다는 뜻이고, 두 사람이 맞붙었다는 뜻은 아닙니다.',
    'faced.scoreLabel': '스코어',

    /* ── the parallel record ──────────────────────────────────────────────
       `parallel` is the edge type invented so a non-meeting could not be
       mistaken for a meeting, and the counting surfaces then counted it: 강지후
       read '확인된 인연 1' under a legend calling every tick verified, while the
       one line he has says the two have never been in the same room. The count
       is now split, so these two strings are what the second half is called. */
    'tie.parallel': '평행 이력',
    'tie.parallelNote': '기록은 겹치지만 만난 적은 없는 관계입니다. 확인된 인연 수에는 넣지 않습니다.',

    'dossier.roleContestant': '참가자',
    /* Split by Role. Neither person these fire for hosted anything: 이상민
       sat on season 1's studio panel and 박지민 dealt in season 3's 유령
       카지노. `dossier.roleHost` is kept only so an unforeseen role cannot
       render blank. */
    'dossier.roleHost': '비참가',
    'dossier.rolePanel': '스튜디오 패널',
    'dossier.roleCrew': '진행 측',
    'dossier.focusOrbit': '인물 중심으로 보기',
    'dossier.dirBetrayal': '배신을 실행한 쪽',
    'dossier.dirRivalry': '먼저 각을 세운 쪽',
    'dossier.dirMentor': '이끌어 준 쪽',
    'dossier.dirAlliance': '동맹을 제안한 쪽',
    'dossier.dirDefault': '먼저 움직인 쪽',

    /* ── hover card ───────────────────────────────────────────────────── */
    'hover.pastWinner': '역대 우승자',
    'hover.host': '비참가 출연',
    'hover.relations': '관계',
    /* The tie count next to the "관계" eyebrow counts with common.tie /
       common.ties — the same counter the rail and the status bar use — so the
       singular is available and one noun is not counted three different ways
       across three surfaces. */
    'hover.pipsAria': '관계 유형별 수',
    'hover.noTies': '기록된 인연 없음',
    'hover.strongest': '가장 강한 인연',
    'hover.hint': '클릭하여 자세히',

    /* ── the relationship readout on the canvas ─────────────────────────── */
    'edge.readoutLabel': '인연 설명',
    'edge.pinHint': '클릭하면 이 인연이 고정됩니다',
    'edge.pinnedHint': 'Esc 해제 · E 다음 인연',
    /* The same card on a touch device, where Esc and E do not exist. Printing
       the keyboard line there is not a harmless extra — it is an instruction
       the reader cannot follow. */
    'edge.pinnedHintTouch': '다른 선을 눌러 이동 · 바깥을 눌러 닫기',
    'edge.clear': '고정 해제',
    'edge.cycleKey': '선택한 인물의 인연 넘기기',

    /* ── command palette ──────────────────────────────────────────────── */
    'palette.dialogLabel': '검색 및 명령',
    'palette.placeholder': '이름 · 별명 · 직업 · 출연작 · 시즌 성적',
    'palette.inputAria': '검색어',
    'palette.help':
      '위아래 화살표로 이동하고 엔터로 실행합니다. Esc 를 누르면 닫힙니다. 입력한 검색어는 뒤편 그래프에도 그대로 적용됩니다.',
    'palette.clear': '검색어 지우기',
    'palette.clearShort': '지우기',
    'palette.results': '결과',
    'palette.resultsAria': '검색 결과',
    'palette.resultSuffix': '개의 결과',
    'palette.resultsSuffix': '개의 결과',
    'palette.metaFiltering': '뒤편 그래프도 함께 필터링 중',
    'palette.metaPerson': '인물',
    'palette.metaPeople': '인물',
    'palette.metaKept': '닫아도 유지됩니다',
    'palette.metaRegisteredOne': '등록 인물',
    'palette.metaRegistered': '등록 인물',
    'palette.metaScope': '시즌 1–3 이력 기준',
    'palette.groupQuick': '빠른 시작',
    'palette.groupQuickNote': '연결 최다',
    'palette.groupPeople': '인물',
    'palette.groupViews': '보기',
    'palette.groupCommands': '명령',
    'palette.topOfPrefix': '상위',
    'palette.cmdReset': '필터 초기화',
    'palette.cmdResetHint': '검색어와 모든 필터를 해제',
    'palette.cmdAbout': '도움말 열기',
    'palette.cmdAboutHint': '읽는 법, 관계 기호, 자료 범위',
    'palette.cmdGalleryHint': '인물 판을 한 화면에 펼쳐 보기',
    'palette.reasonRealName': '본명',
    'palette.reasonAka': '별명',
    'palette.reasonAppeared': '출연',
    /* Head noun only. Korean names the thing and then counts it (연결 12건);
       English drops the head noun because common.ties already is the noun. */
    'palette.reasonDegree': '연결',
    'palette.reasonAppearedFallback': '출연',
    'palette.reasonProfile': '프로필에 언급',
    'palette.pipWinner': '우승',
    'palette.pipCurrent': '현재',
    'palette.emptyEyebrow': '결과 없음',
    'palette.emptyLine': '일치하는 인물도, 명령도 없습니다.',
    'palette.emptyHint':
      '이름과 별명, 직업, 함께 출연한 프로그램, 시즌 1–3 성적으로 찾을 수 있습니다. 검색어를 짧게 줄이거나, 걸어 둔 필터를 풀어 보세요.',
    'palette.emptyReset': '필터 초기화',
    'palette.footMove': '이동',
    'palette.footSelect': '선택',
    'palette.footClose': '닫기',
    'palette.footNote': '시즌 1–3 · 타 프로그램 이력만',

    /* ── cast gallery ─────────────────────────────────────────────────── */
    'gallery.dialogLabel': '출연진 갤러리',
    'gallery.close': '갤러리 닫기',
    'gallery.eyebrow': '출연진',
    'gallery.countUnitOne': '명',
    'gallery.countUnit': '명',
    /* Two versions, because `public/portraits/` may hold photographs. The app
       has to describe what is actually on screen: the first sentence of the
       original ("사진이 아니라") becomes a false statement the moment one image
       is dropped in, and a reference work that misdescribes its own figures on
       the page they are printed on has given away the only thing it sells.
       Everything after the dash is true either way — the rings are drawn from
       the record whether or not there is a face inside them.

       THE LAST SENTENCE IS AN OBLIGATION, not decoration. '테두리 눈금은 확인된
       인연의 수' was false for three plates for as long as a `parallel` record
       drew a tick, and it is now the sentence the tick rule is written against
       (Portrait.tsx, graph/build.ts). Both clauses added with it are marks the
       wall now actually shows: the parallel record, which the card prints in
       words beside the count, and the fine grey rim — about.tileNoTies, the
       same wording — which appears for the first time on the three cards whose
       only line is a non-meeting. A mark on screen that the note beside it does
       not cover is how this legend became untrue the first time.

       One added sentence per language, and no more. The note sits above the
       scroller, so every line it grows is a line off the wall: measured at
       1600 × 1000, the Korean lockup goes 109px → 147px and the English one
       76px → 117px, against a scroll region of 627px and 657px. That is two
       lines of legend bought for a legend that is true; a third would be worth
       less than the row of plates it costs. */
    'gallery.note':
      '초상은 사진이 아니라 각자의 기록으로 그린 도형입니다 — 시즌 고리의 길이는 그 시즌 성적, 구슬 점선은 순위 없이 진행·패널로 함께한 시즌, 테두리 눈금은 확인된 인연의 수입니다. 만난 적 없이 이력만 겹치는 평행 이력은 눈금으로 세지 않고, 확인된 인연이 없는 사람은 가는 회색 테두리로 표시합니다.',
    'gallery.notePhotos':
      '초상을 둘러싼 고리는 각자의 기록으로 그렸습니다 — 시즌 고리의 길이는 그 시즌 성적, 구슬 점선은 순위 없이 진행·패널로 함께한 시즌, 테두리 눈금은 확인된 인연의 수입니다. 만난 적 없이 이력만 겹치는 평행 이력은 눈금으로 세지 않고, 확인된 인연이 없는 사람은 가는 회색 테두리로 표시합니다.',
    'gallery.hosted': '플레이어가 아닌 자리로 참여',
    /* The per-card tie count is counted with common.tie / common.ties — the
       counter the rail, the status bar and the hover card already share.

       Compact forms for the per-card franchise strip. The long placement
       strings in records.ts carry both notations ('4위 · 4th'); the card line
       is 11px and prints one notation per UI language. */
    'gallery.rankUnit': '위',
    'gallery.winnerShort': '우승',
    'gallery.hostShort': '비참가',
    'gallery.filteredOut': '현재 필터에서 제외된 인물',

    /* ── about sheet: chrome ──────────────────────────────────────────── */
    'about.eyebrow': '피의 게임X · CAST ATLAS',
    'about.title': '안내서',
    'about.close': '닫기',
    'about.tablistLabel': '안내서 섹션',
    'about.tabWhat': '이 앱은',
    'about.tabRead': '읽는 법',
    'about.tabSeasons': '시즌',
    'about.tabRecord': '통산 기록',
    'about.tabGlossary': '용어',
    'about.tabFranchise': '프랜차이즈',
    'about.tabKeys': '단축키',
    'about.tabSources': '출처',

    /* ── about sheet: what this is ────────────────────────────────────── */
    'about.whatHeading': '이 앱은',
    'about.whatBody':
      '피의 게임X에 출연하는 사람들의 관계도입니다. 점 하나가 공개된 X 라인업의 한 사람이고, 점을 잇는 선은 모두 X가 시작되기 전에 이미 존재하던 관계 — 시즌 1–3에서 맺은 동맹과 배신, 다른 프로그램에서 쌓인 인연, 그리고 실제 관계 — 입니다.',
    'about.spoilerFlag': '시즌 X 없음',
    'about.spoilerBody':
      '시즌 X의 결과, 탈락, 미션, 전개는 이 앱 어디에도 없습니다. 여기 보이는 모든 기록은 시즌 1–3과 다른 프로그램에서 가져온, 방영 전에 이미 공개된 사실뿐입니다.',
    'about.nowHeading': '지금',
    'about.factNetwork': '방송사',
    'about.factPremiere': '공개일',
    'about.factEpisodes': '회차',
    'about.factPrize': '상금',
    'about.factAirDates': '방영',

    /* ── about sheet: how to read ─────────────────────────────────────── */
    'about.readHeading': '읽는 법',
    'about.readBody': '모든 부호에는 뜻이 있습니다. 색은 보조 수단이고, 크기 · 테두리 · 화살표가 함께 의미를 나릅니다.',
    'about.tileSize': '크기 = 연결 수',
    'about.tileRing': '링 색 = 직업군',
    'about.tileArcs': '바깥 호 = 출연한 이전 시즌',
    'about.tileHalo': '황동 후광 = 이전 시즌 우승',
    /* Three different dashed circles are drawn on the plates and the key used
       to cover one of them, in wording that made the other two read as their
       own inverse — the two host plates presented as franchise newcomers. Each
       ring is now named by the ring it actually is. */
    'about.tileDashedRim': '점선 시즌 고리 = 이전 시즌에 출연한 적 없음',
    'about.tileHostRing': '구슬 점선 호 = 그 시즌은 경쟁하지 않았다 (순위 없음), 바깥 실선 고리 = 플레이어가 아닌 자리로 참여한 적이 있는 사람',
    'about.tileNoTies': '가는 회색 테두리 = 확인된 인연이 아직 없음',
    'about.tileDashedLine': '점선 = 하우스 밖에서 생긴 인연',
    'about.tileArrow': '화살표 = 방향 — 누가 누구를 배신했는지',
    /* The lines answer questions now. Two rows, because holding one open is a
       different state from reading one in passing. */
    'about.tileEdgeRead': '선에 커서를 올리면 그 인연을 읽어줍니다 — 가운데 구슬이 지금 읽고 있는 선',
    'about.tileEdgePin': '구슬의 황동 테 = 클릭해서 고정해 둔 인연 (Esc로 해제)',
    'about.tileColdBand': '아래쪽 띠 = 아직 아무와도 얽히지 않은 사람들',
    'about.tilePlate': '인물 판 = 그 사람의 기록으로 그린 초상',
    /* public/portraits/ 에 사진이 있으면 이 쪽을 씁니다 — gallery.note 참고. */
    'about.tilePlatePhotos': '초상을 둘러싼 고리 = 그 사람의 기록',
    'about.tileRimTicks': '판 바깥 눈금 = 관계 하나에 하나, 색은 관계의 종류',
    'about.tileShiftClick': 'Shift + 클릭 = 두 사람 사이 최단 경로',
    'about.lineColourHeading': '선 색 = 관계의 종류',
    'about.dashedNote': '선이 점선이면 하우스 밖의 인연입니다 — 색과 관계없이.',
    'about.archetypesHeading': '직업군',
    'about.seasonArcsHeading': '시즌 색',

    /* ── about sheet: seasons, glossary, franchise ────────────────────── */
    'about.seasonsHeading': '시즌',
    'about.seasonsBody': '이 아틀라스의 모든 기록이 나온 곳. 시즌 X는 여기 없습니다.',
    'about.seasonLabel': '시즌',
    'about.factWinner': '우승',
    'about.signatureMoment': '결정적 장면',
    'about.inThisCast': 'X 출연',
    /* ── about sheet: the track record table ──────────────────────────── */
    'about.recordHeading': '통산 기록',
    'about.recordBody':
      '이 라인업에서 시즌 1–3을 이미 겪은 사람들을 한 표에 놓았습니다. 시즌 칸은 그 해의 성적이고, 진행이나 패널 자리는 순위가 없으므로 역할을 적었습니다. 열 이름을 누르면 그 열로 정렬됩니다.',
    'about.recordSpine': '연표',
    'about.spineInLineup': '지금 라인업에',
    'about.recordRest': '나머지 출연자는 이번이 피의 게임 첫 출연입니다.',
    'about.colPerson': '인물',
    'about.colSeasonsPlayed': '출연 시즌',
    'about.colBest': '최고 성적',
    /* The comparable column's head used to be 'about.colTopPct' — 상위 %, rank
       over field for the single best run. That slot now holds `career.share`,
       which is the same arithmetic carried across every ranked run, so the two
       columns would have answered one question twice and the table did not
       have the width for both (see the comment on the header in
       AboutSheet.tsx). The key is retired rather than left standing: an
       authored string with no surface is the thing this round spent itself
       closing. Its one lesson is kept — a column head is a whole heading and
       must not borrow a fragment from another namespace, which is how this
       table once came to set the palette's '상위 7 / 20' row-count prefix as a
       column title with a ' %' glued on in JSX. `career.share` is a heading. */
    'about.colTies': '확인된 인연',
    'about.sortAria': '이 열로 정렬',
    'about.recordCaption': '시즌 1–3 출연자 통산 기록',
    /* The other half of the same finding, and the app knew it and never said
       it: 스무 명 중 세 명은 이 라인업의 누구와도 같은 방에 있었던 적이 없다.
       That is a casting decision, not a hole in the research, so it is stated
       as a heading rather than left as three ghosted discs at the frame edge.
       The names come from `neverFaced`, so the block cannot drift from the
       edge data it is describing. */
    'about.coldHeading': '아무와도 겨뤄 본 적 없는 사람들',
    'about.coldBody':
      '이 세 사람은 나머지 열아홉 명과 같은 판에 있었던 적이 없습니다. 자료가 부족해서가 아니라 실제로 접점이 없어서이고, 각자 남은 한 줄은 만난 적 없는 평행 이력입니다.',

    'about.glossaryHeading': '용어',
    'about.franchiseHeading': '프랜차이즈',
    'about.premise': '전제',
    'about.lineage': '계보',
    'about.creator': '제작',
    'about.reception': '반응',

    /* ── about sheet: shortcuts and sources ───────────────────────────── */
    'about.keysHeading': '단축키',
    'about.keyboard': '키보드',
    'about.pointer': '포인터',
    'about.keyColKey': '키',
    'about.keyColAction': '동작',
    'about.keysCaption': '키보드 단축키',
    'about.pointerCaption': '마우스 조작',
    'about.sourcesHeading': '출처',
    'about.sourcesEmpty': '출처 목록이 아직 비어 있습니다.',
    'about.newTab': '새 탭에서 열림',
    'about.lastUpdated': '최종 갱신',

    /* The photographs are the one thing in this product with no citation, and
       until now the only surface that mentioned them at all was a caption
       saying the rings go around a portrait. Three strings, in the tab a
       reader opens to ask where things came from. They state what is knowable
       and refuse to state what is not: no supplier, no licence and no
       photographer is named, because none is recorded anywhere in the
       repository — see the block above `sourcesPanel` in AboutSheet.tsx. */
    'about.portraitsHeading': '초상 사진',
    'about.portraitsBody':
      '{total}명 중 {n}명의 플레이트가 실제 사진이다. 파일은 저장소의 public/portraits 폴더에서 빌드 시점에 읽어 들이고, 파일이 없는 사람은 자기 기록으로 그린 플레이트가 대신 나온다. 다만 이 앱은 그 사진들의 출처를 모른다 — 촬영자도, 원본 위치도, 사용 근거도 데이터에 적혀 있지 않고 파일 안에도 남아 있지 않다. 아래 본문의 모든 주장에는 근거 문서가 붙어 있는데 이 {n}장에는 없다는 뜻이고, 그 예외를 감추지 않기 위해 여기 적어 둔다.',
    /* The credited variant of the body above. Printed instead of it when
       dataset.meta.portraits is set — the set has a stated origin now, so the
       "출처를 모른다" paragraph would be a false statement. It still says what
       is NOT known (which file came from which of the two) and still refuses to
       call the pictures cleared, because a named source is not a licence.

       `{credit}` is followed by 에서 and never by a 은/는 · 이/가 · 으로/로
       pair. Those alternate on whether the preceding syllable ends in a
       consonant, and the value is dataset copy this file cannot see — the first
       draft wrote '{credit}으로' and rendered '나무위키으로', which is wrong for
       any vowel-final source. 에서 takes the same form either way, so the
       sentence stays correct whatever the owner puts in the field. */
    'about.portraitsCredited':
      '{total}명 중 {n}명의 플레이트가 실제 사진이다. 파일은 저장소의 public/portraits 폴더에서 빌드 시점에 읽어 들이고, 파일이 없는 사람은 자기 기록으로 그린 플레이트가 대신 나온다. 이 {n}장은 {credit}에서 가져왔다. 다만 어느 파일이 둘 중 어디에서 왔는지까지는 기록돼 있지 않아 장별로 표기하지 못하고, 파일 안에도 촬영자 정보는 남아 있지 않다.',
    'about.portraitsRights':
      '그러므로 이 사진들은 재사용이 허가된 자료가 아니다. 출처를 아는 것과 쓸 권리를 갖는 것은 다른 문제이고, 방송 스틸과 위키 이미지의 권리는 각 촬영자에게 있다. 폴더에 넣는 파일은 넣는 쪽이 쓸 권리를 가진 것이어야 하고, 권리가 없으면 비워 두면 된다 — 생성 플레이트는 자리 표시가 아니라 그 자체로 완성된 표현이다.',

    /* ── shortcut descriptions ────────────────────────────────────────── */
    'shortcut.search': '검색 열기',
    'shortcut.gallery': '출연진 갤러리 열고 닫기',
    'shortcut.layouts': '레이아웃 — 관계망 · 시즌 · 직업군 · 인물 중심',
    'shortcut.fit': '화면에 맞추기',
    'shortcut.zoom': '확대 · 축소',
    'shortcut.rail': '왼쪽 필터 레일 접기',
    'shortcut.about': '이 안내서 열고 닫기',
    /* Esc is now a ladder, and the order is the whole point: it lets go of a
       held line before it touches the selection, so reading a tie can never
       cost you the person you were reading it about. */
    'shortcut.escape': '고정한 인연 해제 → 닫기 · 선택 해제',
    'shortcut.back': '이전에 보던 인물로',
    'shortcut.keyDrag': '드래그',
    'shortcut.keyScroll': '스크롤',
    'shortcut.keyDragNode': '노드 드래그',
    'shortcut.keyShiftClick': 'Shift + 클릭',
    'shortcut.pan': '화면 이동',
    'shortcut.zoomPointer': '확대 · 축소',
    'shortcut.moveNode': '인물 위치 옮기기',
    'shortcut.tracePath': '선택한 인물과 이 인물 사이의 경로 추적',
    /* Arrow traversal and Enter were only described in the canvas's aria-label
       — i.e. to screen readers alone — while being the only keyboard route
       into the content. */
    'shortcut.moveCursor': '그래프 안에서 인물 사이 이동',
    'shortcut.openPerson': '커서가 놓인 인물 열기',
    'shortcut.traceKeyboard': '선택한 인물과 커서가 놓인 인물 사이의 경로 추적',
    'about.keysOrbitNote': '인물 중심(4번)은 인물을 먼저 선택해야 켜집니다.',

    /* ── status bar ───────────────────────────────────────────────────── */
    'status.people': '인물',
    'status.relations': '관계',
    'status.clearFilters': '필터 해제',
    'status.clearFiltersAria': '필터 해제',
    /* ── canvas ────────────────────────────────────────────────────────
       Painted by the graph itself, so it cannot use a React component. */
    'canvas.label': '출연진 관계도. 화살표 키로 인물 사이를 이동하고 엔터로 선택합니다.',
    'canvas.emptyTitle': '조건에 맞는 사람이 없습니다',
    'canvas.emptySub': 'NO ONE MATCHES THESE FILTERS',
    'canvas.emptyHint': '필터를 해제하면 {n}명이 모두 돌아옵니다',
    'canvas.coldLabel': '아직 아무와도 얽히지 않은 사람들',
    /* Latin sub under a Hangul title, matching canvas.emptySub above. Both
       plates are one idea set twice in two scripts; setting the sub in Korean
       too made the plate say the same sentence twice in the same voice. */
    'canvas.coldSub': 'NO VERIFIED TIE · {n}',
    /* Region captions for the anchored layouts. They used to be hardcoded
       Latin caps on a Korean canvas; they are copy, so they live here. */
    'canvas.seasonLabel': '시즌 {n}',
    /* The counter that turns a region caption's trailing digit into a count:
       "시즌 2 · 7명" rather than "시즌 2 · 7", which reads as a footnote
       marker. Consumed through LayoutStrings.count. */
    'canvas.regionCount': '{n}명',
    'canvas.rookieLabel': '이전 시즌 없음',
    'canvas.orbitRing1': '직접 연결',
    'canvas.orbitRing2': '한 다리 건너',
    /* Screen-reader fallback list for the canvas. */
    'canvas.srDegreeOne': '관계 {n}개',
    'canvas.srDegree': '관계 {n}개',
    'canvas.srLinked': '연결된 인물',
    'canvas.srNone': '없음',
    'status.hintIdle': '노드를 클릭해 인물 정보 · 선을 클릭해 그 인연 읽기 · 드래그로 이동 · 스크롤로 확대',
    'status.hintSelected': '선택됨',
    'status.hintSelectedTail': 'Shift+클릭으로 두 사람 사이 경로 추적 · Esc로 해제',
    'status.spoilerBadge': '시즌 X 내용 없음',
    'status.spoilerTitle':
      '이 아틀라스에는 피의 게임X 본편 내용이 없습니다. 인물과 관계는 모두 시즌 1–3, 다른 프로그램, 실제 이력 등 X 방영 이전 기록입니다.',
    'status.updated': '갱신',
    'status.srPeople': '표시 중인 인물',
    'status.srTotal': '전체',
    'status.srRelations': '표시 중인 관계',

    /* ── path card ────────────────────────────────────────────────────── */
    'path.regionLabel': '두 사람 사이의 경로',
    'path.eyebrow': '경로',
    'path.close': '경로 닫기',
    /* Was '과(와)', which is the Korean of writing "1 item(s)" — and 와/과 is a
       bound particle, so it was also printed with a space in front of it. This
       is the headline of the only screen a reader sees when a trace fails, in
       the language this dataset declares as its record.

       PathCard renders `{from} {this} {to}`, i.e. a standalone token with
       spaces around it, and no particle can be a standalone token. A middot
       can: it is the standard Korean enumeration mark and this dataset already
       sets pairs with it (시즌 1·2·3, 서출구·충주맨). '홍진호 · 최연청
       사이에는 이어지는 길이 없습니다.' is idiomatic and needs no agreement.

       The better sentence attaches the particle — see `wa()` below, which is
       exported and unused precisely so PathCard can switch to
       `{wa(unreachable.from)} {to}` and drop this key on the Korean side. */
    'path.noneJoin': '·',
    'path.noneTail': '사이에는 이어지는 길이 없습니다.',
    /* The second sentence is new, and it is the one the reader needs. A trace
       can only fail for someone in the cold band, and each of those three DOES
       carry a line on the canvas — a 평행 이력 one. Without this the card says
       "no route" while the picture shows a line, and the reader has to guess
       which of the two is lying. It states the rule rather than the pair, so it
       stays true when a filter is what emptied the route. */
    'path.noneNote':
      '검증된 관계만으로는, 다른 사람을 거쳐서도 두 사람이 이어지지 않습니다. 평행 이력은 만난 적이 없다는 기록이므로 경로로 세지 않습니다.',
    'path.degree1': '바로 아는 사이',
    'path.degree2': '한 다리 건너',
    'path.degreeNSuffix': '다리 건너',
    'path.seasonPrefix': '시즌',
    'path.outside': '하우스 밖',
    'path.hint': 'Shift + 클릭으로 다른 사람과의 경로를 찾을 수 있습니다.',

    /* ── intro ────────────────────────────────────────────────────────── */
    'intro.kicker': 'CAST ATLAS',
    /* Non-breaking through '시즌 X 이야기는 없습니다.': this line is the product's
       entire premise, and a wrap that ends line one on '시즌 X' leaves the screen
       asserting the one thing the app promises not to contain. */
    'intro.thesis': '출연자들이 서로에게 남긴 흔적 — 시즌 X 이야기는 없습니다.',
    'intro.statCast': '출연자',
    'intro.statConnections': '관계',
    'intro.statSeasons': '이전 시즌',
    'intro.enter': '들어가기',
    'intro.enterAria': '들어가기 — 아틀라스 열기',
    'intro.hintKeys': 'ENTER · SPACE · ESC · 아무 곳이나 클릭',
    'intro.hintAuto': '기다리면 저절로 열립니다',
    /* Shown instead of hintAuto when the reader has asked for reduced motion:
       the auto-advance is switched off there, so the screen must not promise
       something it is no longer going to do. */
    'intro.hintNoAuto': '저절로 넘어가지 않습니다 — 편할 때 시작하세요',

    /* ── shared vocabulary ────────────────────────────────────────────── */
    /* Korean counters do not inflect: 1명 and 20명 take the same word, so the
       singular and the plural key hold the same string here on purpose. The
       pair exists because English cannot say "1 people", and a component that
       hard-coded `n === 1 ? 'person' : 'people'` would be putting English
       morphology back into the markup this table exists to keep it out of. */
    'common.person': '명',
    'common.people': '명',
    'common.tie': '건',
    'common.ties': '건',
    'common.season': '시즌',
    'common.outsideHouse': '하우스 밖',
    'common.close': '닫기',
    'common.of': '/',
    'lang.toggle': '언어 전환',
    'lang.ko': '한국어',
    'lang.en': 'English',
    /* ── the byline ────────────────────────────────────────────────────────
       An atlas that counts its own citations to one decimal place and fails
       the build when the sourcing paragraph drifts should not be anonymous.
       One sentence per language rather than a name slotted into a template:
       Korean puts the maker after the thing, English puts them after "by", and
       a shared template gives you one natural line and one translated one. */
    'credit.by': '만든 사람 · Hyelin Lee · 피드백과 문의 환영합니다',
    'credit.linkPrefix': 'Hyelin Lee —',
  },

  en: {
    /* ── brand and wordmark ───────────────────────────────────────────── */
    'app.title': 'Bloody Game X',
    'app.subtitle': 'Cast Atlas',
    'app.subtitleLong': 'An atlas of who knew whom before season X',

    /* ── top bar ──────────────────────────────────────────────────────── */
    'topbar.spoilerBadge': 'No season X',
    'topbar.spoilerTooltip': 'No season X story',
    'topbar.spoilerAria':
      "Nothing from inside season X appears anywhere. Seasons 1–3 are shown in full, results included. Open the note on this atlas's scope",
    'topbar.modeGroupLabel': 'Layout mode',
    'topbar.orbitLocked': 'Select someone first',
    'topbar.orbitLockedAria': 'Unavailable — select someone first',
    'topbar.layoutShortcutAria': 'layout, shortcut',
    'topbar.searchPlaceholder': 'Search the cast',
    'topbar.searchTitle': 'Search',
    'topbar.searchAria': 'Open search',
    'topbar.searchAriaQuery': 'Query',
    'topbar.searchAriaMatch': 'match',
    'topbar.searchAriaMatches': 'matches',
    'topbar.fit': 'Fit to view',
    'topbar.fitAria': 'Fit to view, shortcut F',
    'topbar.filters': 'Filters',
    'topbar.filtersAria': 'Toggle the filter panel, shortcut left bracket',
    'topbar.gallery': 'Cast gallery',
    'topbar.galleryAria': 'Open the cast gallery, shortcut G',
    'topbar.about': 'About and scope',
    'topbar.aboutAria': 'About this atlas and where the material comes from, shortcut question mark',

    /* ── layout modes ─────────────────────────────────────────────────── */
    'mode.web': 'Web',
    'mode.webHint': 'Free layout, spaced by how densely people are tied together',
    'mode.seasons': 'By season',
    'mode.seasonsHint': 'Grouped by which of seasons 1–3 they came from',
    'mode.archetype': 'By background',
    'mode.archetypeHint': 'Grouped by what they do for a living',
    'mode.orbit': 'Orbit',
    'mode.orbitHint': 'Everyone arranged around the person you picked',
    'mode.orbitHintNamed': 'at the centre',

    /* ── filter rail ──────────────────────────────────────────────────── */
    'rail.ariaLabel': 'Filters and legend',
    'rail.title': 'Filters',
    'rail.close': 'Close filters',
    'rail.countLabel': 'people shown',
    'rail.reset': 'Reset',
    'rail.emptyFlag': 'No data',
    'rail.emptyBody': "The cast list isn't loaded yet — every count fills in once it is.",
    'rail.bulkAll': 'All',
    'rail.bulkNone': 'None',
    'rail.bulkAllAria': 'Select all',
    'rail.bulkNoneAria': 'Clear all',
    'rail.secLineage': 'Lineage',
    'rail.secLineageFoot': 'three blocs drawn from earlier seasons, plus challengers and rookies',
    'rail.lineageGroupAria': 'Filter by lineage',
    'rail.onlyReturning': 'Has franchise history',
    'rail.secArchetype': 'Background',
    'rail.archetypeBulkLabel': 'backgrounds',
    'rail.archetypeGroupAria': 'Filter by background',
    'rail.secArchetypeFoot': 'the dot colour is that person’s ring colour on the graph',
    'rail.secRelationships': 'Relationships',
    'rail.relationshipsBulkLabel': 'relationship types',
    'rail.relationshipsGroupAria': 'Filter by relationship',
    'rail.secRelationshipsFoot': 'dashed = history from outside the house',
    /* The node key — see the Korean entry for why these are short. */
    'rail.secNodeKey': 'Node key',
    'rail.nodeSize': 'Size = number of ties',
    'rail.nodeRing': 'Ring colour = background',
    'rail.nodeArcs': 'Outer arcs = prior seasons',
    'rail.nodeHalo': 'Brass halo = won a past season',
    'rail.nodeKeyMore': 'The rest of the marks — field guide',
    'rail.outsideTie': 'a tie from outside the house',
    'rail.secMostConnected': 'Most connected',
    'rail.statPeople': 'people',
    'rail.statLinks': 'links',
    'rail.noConnections': 'No connections recorded yet.',
    'rail.topRowAria': 'ties',
    'rail.topRowAriaTail': 'open the dossier',
    'rail.scopeNote': 'History from seasons 1–3 and other shows only.',

    /* ── dossier ──────────────────────────────────────────────────────── */
    'dossier.paneLabel': 'Person dossier',
    'dossier.barLabel': 'Dossier',
    'dossier.back': 'Back to the previous person',
    'dossier.close': 'Close',
    'dossier.realName': 'Real name',
    'dossier.aka': 'Known as',
    'dossier.birthYear': 'Born',
    'dossier.pastWinner': 'Past winner',
    'dossier.hosted': 'Non-playing role',
    'dossier.unverified': 'Unverified',
    'dossier.unverifiedProfile': 'Parts of this profile have not been cross-checked.',
    'dossier.unverifiedTie': 'Not fully cross-checked, or a pair with no recorded meeting.',
    'dossier.lineup': 'Lineup',
    'dossier.lineupHeading': 'The X lineup',
    'dossier.team': 'Team',
    'dossier.lineupNote': 'Announced lineup only — nothing from inside season X.',
    'dossier.credentials': 'Credentials',
    'dossier.franchiseRecord': 'Franchise record',
    'dossier.franchiseTotals': 'Across the franchise',
    'dossier.best': 'Best',
    'dossier.seasonPlayed': 'season',
    'dossier.seasonsPlayed': 'seasons',
    'dossier.onRecord': 'On record',
    'dossier.finishSuffix': 'finish',
    'dossier.elsewhere': 'Elsewhere',
    'dossier.elsewhereRecord': 'The record elsewhere',
    'dossier.connections': 'Connections',
    'dossier.sectionsNav': 'Sections in this file',
    'dossier.opened': 'dossier opened',
    'dossier.sources': 'Sources',
    'dossier.inHouse': 'In the house',
    'dossier.outside': 'Outside',
    'dossier.emptyRecord': 'First time in the house',
    'dossier.emptyRecordSub':
      'No record in seasons 1–3 — everything in this file was earned somewhere else.',
    'dossier.emptyTies': 'No ties to show',
    'dossier.emptyTiesSub':
      'The relationship filters currently in force have hidden every one of them. Switch a type back on.',
    'dossier.coldTitle': 'Walks in cold',
    'dossier.coldSub':
      'No shared credit and no documented working relationship with any of the other nineteen turned up in public sources. A shared school or a shared credential was not counted as a tie on its own: it does not establish that the two of them know each other.',
    'dossier.openFile': 'Open the dossier for',
    'dossier.seasonPrefix': 'Season',
    'dossier.outsideTag': 'Outside',
    'dossier.teamPrefix': 'Team',
    'dossier.rankPrefix': 'No. ',
    'dossier.rankSuffix': '',
    'record.ofField': 'of {n}',

    /* See the Korean side for why the heading takes the weaker claim: 35 of
       the 40 results are two people finishing in an order, and 'faced' is a
       thing 5 of them did. */
    'faced.title': 'Already crossed paths',
    'faced.eyebrow': 'Recorded results',
    'faced.duel': 'Duel',
    'faced.field': 'Same field',
    /* All duels / all field finishes / one of each. A bare '2–0' beside a name
       under a 'faced' heading IS the win–loss notation, so it stays where a
       win–loss is what happened and takes a noun everywhere else. */
    'faced.record': '{w}–{l}',
    'faced.recordField': 'By finish {w}–{l}',
    'faced.recordMixed': 'Results {w}–{l}',
    'faced.none': 'Has never been in a field with anyone else in this lineup.',
    'faced.noResult': 'Shared a field, but no finish on either side is numbered.',
    /* Two keys rather than one with '(s)' in it. The Korean side of this app
       had exactly that failure in 과(와) and it is not better in English. */
    'faced.unadjudicatedOne': 'One shared appearance with no comparable finish',
    'faced.unadjudicated': '{n} shared appearances with no comparable finish',
    /* Duels only — guard every call site on `m.kind === 'duel'`. */
    'faced.beat': '{w} beat {l}',
    'faced.finishedAbove': '{w} finished above {l}',
    'career.title': 'Across the franchise',
    'career.best': 'Best finish',
    /* 'players faced' was the same overclaim in miniature: `career.faced` is
       Σ (fieldSize − 1), i.e. everyone else who was in those fields, not a
       count of opponents played. Only rendered as a title and screen-reader
       text, so the longer, true phrase costs no layout. */
    'career.outlasted': 'Outlasted {k} of the {n} players in those fields',
    'career.share': 'Outlasted',
    'career.seasons': 'Seasons played',
    'career.titles': 'Titles',
    'faced.note':
      'A duel is one player against one. A same-field result means the two were in one field and one finished higher — not that they played each other.',
    'faced.scoreLabel': 'Score',
    'tie.parallel': 'Parallel record',
    'tie.parallelNote':
      'The records rhyme; the two have never been in the same room. Not counted in the verified total.',
    'dossier.roleContestant': 'Player',
    'dossier.roleHost': 'Not playing',
    'dossier.rolePanel': 'Studio panel',
    'dossier.roleCrew': 'Ran the game',
    'dossier.focusOrbit': 'Focus orbit',
    'dossier.dirBetrayal': 'made the betrayal',
    'dossier.dirRivalry': 'started the antagonism',
    'dossier.dirMentor': 'was the mentor',
    'dossier.dirAlliance': 'proposed the alliance',
    'dossier.dirDefault': 'initiated it',

    /* ── hover card ───────────────────────────────────────────────────── */
    'hover.pastWinner': 'Past winner',
    'hover.host': 'In a season, not playing',
    'hover.relations': 'Relations',
    /* See the Korean side: the count uses common.tie / common.ties. */
    'hover.pipsAria': 'Ties by type',
    'hover.noTies': 'No recorded ties',
    'hover.strongest': 'Strongest tie',
    'hover.hint': 'Click for the dossier',

    /* ── the relationship readout on the canvas ─────────────────────────── */
    'edge.readoutLabel': 'Relationship readout',
    'edge.pinHint': 'Click to hold this tie open',
    'edge.pinnedHint': 'Esc to clear · E for the next tie',
    /* See the Korean entry — Esc and E do not exist on a touch device. */
    'edge.pinnedHintTouch': 'Tap another line to move · tap outside to close',
    'edge.clear': 'Let go',
    'edge.cycleKey': 'Cycle the selected person’s ties',

    /* ── command palette ──────────────────────────────────────────────── */
    'palette.dialogLabel': 'Search and commands',
    'palette.placeholder': 'Name · handle · occupation · credits · season finish',
    'palette.inputAria': 'Search query',
    'palette.help':
      'Move with the up and down arrows, run with Enter, close with Esc. Whatever you type here also filters the graph behind this panel.',
    'palette.clear': 'Clear the query',
    'palette.clearShort': 'Clear',
    'palette.results': 'Results',
    'palette.resultsAria': 'Search results',
    'palette.resultSuffix': 'result',
    'palette.resultsSuffix': 'results',
    'palette.metaFiltering': 'Filtering the graph behind this too',
    'palette.metaPerson': 'person',
    'palette.metaPeople': 'people',
    'palette.metaKept': 'and it stays filtered after you close',
    'palette.metaRegisteredOne': 'person on file',
    'palette.metaRegistered': 'people on file',
    'palette.metaScope': 'indexed on their seasons 1–3 record',
    'palette.groupQuick': 'Quick start',
    'palette.groupQuickNote': 'Most connected',
    'palette.groupPeople': 'People',
    'palette.groupViews': 'Views',
    'palette.groupCommands': 'Commands',
    'palette.topOfPrefix': 'Top',
    'palette.cmdReset': 'Reset filters',
    'palette.cmdResetHint': 'Drop the query and every filter',
    'palette.cmdAbout': 'Open the field guide',
    'palette.cmdAboutHint': 'How to read the graph, the relationship key, what is in scope',
    'palette.cmdGalleryHint': 'Every plate on one screen',
    'palette.reasonRealName': 'Real name',
    'palette.reasonAka': 'Also known as',
    'palette.reasonAppeared': 'Appeared on',
    /* Korean-side head noun. English says "12 ties" from common.ties alone, so
       this half of the pair is never spoken here — it stays for key parity. */
    'palette.reasonDegree': 'ties',
    'palette.reasonAppearedFallback': 'appeared',
    'palette.reasonProfile': 'Mentioned in the profile',
    'palette.pipWinner': 'Winner',
    'palette.pipCurrent': 'Current',
    'palette.emptyEyebrow': 'No results',
    'palette.emptyLine': 'matches no one and no command.',
    'palette.emptyHint':
      'You can search on names and handles, on what someone does, on programmes they appeared in, and on how they finished in seasons 1–3. Try a shorter query, or release the filters you have set.',
    'palette.emptyReset': 'Reset filters',
    'palette.footMove': 'Move',
    'palette.footSelect': 'Select',
    'palette.footClose': 'Close',
    'palette.footNote': 'Seasons 1–3 and outside credits only',

    /* ── cast gallery ─────────────────────────────────────────────────── */
    'gallery.dialogLabel': 'Cast gallery',
    'gallery.close': 'Close the gallery',
    'gallery.eyebrow': 'The cast',
    'gallery.countUnitOne': 'player',
    'gallery.countUnit': 'players',
    /* See the Korean entry: the second form is used when public/portraits/
       holds at least one image, because "Nobody here was photographed" stops
       being true the moment it does. */
    /* See the Korean entry: the closing clauses are the tick rule's own
       sentence, and the two marks it now has to cover. */
    'gallery.note':
      "Nobody here was photographed. Each plate is drawn from that person's own record: the length of a season ring is how far they got that year, a beaded ring is a season they were in without competing, and every tick on the rim is one verified connection. A parallel record — two people whose histories rhyme and who have never met — gets no tick, and a fine grey rim means no verified connection at all.",
    'gallery.notePhotos':
      "The rings around each portrait are drawn from that person's own record: the length of a season ring is how far they got that year, a beaded ring is a season they were in without competing, and every tick on the rim is one verified connection. A parallel record — two people whose histories rhyme and who have never met — gets no tick, and a fine grey rim means no verified connection at all.",
    'gallery.hosted': 'In a season, not playing',
    /* The per-card tie count is counted with common.tie / common.ties. */
    /* Latin ordinals are built from the rank in the component; this is the
       suffix the Korean side needs and the two words that are not a number. */
    'gallery.rankUnit': '',
    'gallery.winnerShort': 'Winner',
    'gallery.hostShort': 'Not playing',
    'gallery.filteredOut': 'Hidden by the current filters',

    /* ── about sheet: chrome ──────────────────────────────────────────── */
    'about.eyebrow': 'BLOODY GAME X · CAST ATLAS',
    'about.title': 'Field guide',
    'about.close': 'Close',
    'about.tablistLabel': 'Field guide sections',
    'about.tabWhat': 'What this is',
    'about.tabRead': 'How to read',
    'about.tabSeasons': 'Seasons',
    'about.tabRecord': 'Track record',
    'about.tabGlossary': 'Glossary',
    'about.tabFranchise': 'The franchise',
    'about.tabKeys': 'Shortcuts',
    'about.tabSources': 'Sources',

    /* ── about sheet: what this is ────────────────────────────────────── */
    'about.whatHeading': 'What this is',
    'about.whatBody':
      "A map of the people in Bloody Game X (피의 게임X) and what already stood between them. Each node is one announced member of the lineup; every line joining two of them is a relationship that existed before the season started — alliances and betrayals struck in seasons 1–3, stages shared on other programmes, and ties from ordinary life.",
    'about.spoilerFlag': 'No season X',
    'about.spoilerBody':
      'Nothing from inside season X appears here: no results, no eliminations, no missions, no story. Everything on the graph was already public before the premiere, drawn from seasons 1–3 and from work done elsewhere.',
    'about.nowHeading': 'The season in question',
    'about.factNetwork': 'Network',
    'about.factPremiere': 'Premiere',
    'about.factEpisodes': 'Episodes',
    'about.factPrize': 'Prize',
    'about.factAirDates': 'Air dates',

    /* ── about sheet: how to read ─────────────────────────────────────── */
    'about.readHeading': 'How to read the graph',
    'about.readBody':
      'Every mark carries meaning. Colour is the secondary channel — size, rim and arrowhead carry it as well, so nothing depends on colour alone.',
    'about.tileSize': 'Node size = how connected they are',
    'about.tileRing': 'Ring colour = what they do for a living',
    'about.tileArcs': 'Arcs around a node = the prior seasons they played',
    'about.tileHalo': 'Brass halo = won a past season',
    'about.tileDashedRim': 'Dashed season ring = never played a prior season',
    'about.tileHostRing': 'Beaded arc = there that season without competing, no placing; solid outer ring = has been in a season off the board',
    'about.tileNoTies': 'Fine grey rim = no verified tie yet',
    'about.tileDashedLine': 'Dashed line = history from outside the house',
    'about.tileArrow': 'Arrowhead = direction: who did it to whom',
    'about.tileEdgeRead': 'Point at a line and it reads out — the bead marks the tie being read',
    'about.tileEdgePin': 'Brass collar on the bead = that tie is clicked open and held; Esc lets go',
    'about.tileColdBand': 'The band at the bottom: no prior tie on record',
    'about.tilePlate': 'Portrait plates are drawn from the record, not photographed',
    /* Used instead when public/portraits/ holds an image — see gallery.note. */
    'about.tilePlatePhotos': 'The rings around a portrait are drawn from that person’s record',
    'about.tileRimTicks': 'One rim tick per relationship, coloured by its type',
    'about.tileShiftClick': 'Shift-click a second person to trace the chain between them',
    'about.lineColourHeading': 'Line colour = relationship type',
    'about.dashedNote': 'A dashed line happened outside the Bloody Game house, whatever its colour.',
    'about.archetypesHeading': 'Backgrounds',
    'about.seasonArcsHeading': 'Season arcs',

    /* ── about sheet: seasons, glossary, franchise ────────────────────── */
    'about.seasonsHeading': 'Seasons',
    'about.seasonsBody': 'Where everything in this atlas comes from. Season X is not among them.',
    'about.seasonLabel': 'Season',
    'about.factWinner': 'Winner',
    'about.signatureMoment': 'Signature moment',
    'about.inThisCast': 'In this cast',
    /* ── about sheet: the track record table ──────────────────────────── */
    'about.recordHeading': 'The track record',
    'about.recordBody':
      'Everyone in this lineup who has already played seasons 1–3, in one table. Each season cell is that year’s finish; a hosting or panel seat has no placing, so the role is printed instead. Click a column head to sort by it.',
    'about.recordSpine': 'Timeline',
    'about.spineInLineup': 'in this lineup',
    'about.recordRest': 'Everyone else in the lineup is new to the franchise.',
    'about.colPerson': 'Person',
    'about.colSeasonsPlayed': 'Seasons',
    'about.colBest': 'Best finish',
    /* See the Korean entry — 3rd of 13 and 3rd of 18 print the same ordinal. */
    'about.colTies': 'Verified ties',
    'about.sortAria': 'Sort by this column',
    'about.recordCaption': 'Track record across seasons 1–3',
    'about.coldHeading': 'Walking in cold',
    'about.coldBody':
      'These three have never been in a field with any of the other nineteen. That is not a gap in the research — there is no point of contact to find, and the single line each of them carries is a parallel record between people who have never met.',

    'about.glossaryHeading': 'Glossary',
    'about.franchiseHeading': 'The franchise',
    'about.premise': 'Premise',
    'about.lineage': 'Lineage',
    'about.creator': 'Creator',
    'about.reception': 'Reception',

    /* ── about sheet: shortcuts and sources ───────────────────────────── */
    'about.keysHeading': 'Shortcuts',
    'about.keyboard': 'Keyboard',
    'about.pointer': 'Pointer',
    'about.keyColKey': 'Key',
    'about.keyColAction': 'Action',
    'about.keysCaption': 'Keyboard shortcuts',
    'about.pointerCaption': 'Pointer actions',
    'about.sourcesHeading': 'Sources',
    'about.sourcesEmpty': 'Source list not populated yet.',
    'about.newTab': 'opens in a new tab',
    'about.lastUpdated': 'Last updated',
    'about.portraitsHeading': 'The portraits',
    'about.portraitsBody':
      "{n} of the {total} plates in this atlas are photographs. The files are read out of the repository's public/portraits folder at build time, and anyone without a file gets a plate drawn from their own record instead. Where those pictures came from is not recorded: no photographer, no source, no licence in the data, and nothing left inside the files either. Every claim in the text below carries the page it was written from; these {n} images carry nothing, and this is the app saying so rather than letting you assume otherwise.",
    'about.portraitsCredited':
      "{n} of the {total} plates in this atlas are photographs. The files are read out of the repository's public/portraits folder at build time, and anyone without a file gets a plate drawn from their own record instead. These {n} images are credited to {credit}. Which file came from which of the two is not recorded, so the credit is stated for the set rather than per picture, and no photographer is named inside the files themselves.",
    'about.portraitsRights':
      'Treat them as uncleared. Knowing where a picture came from is not the same as holding the right to use it: broadcast stills and wiki images remain their photographers’ property. A file belongs in that folder only if whoever puts it there holds the right to use it, and leaving it out is a complete answer — the generated plate is a finished presentation, not a placeholder.',

    /* ── shortcut descriptions ────────────────────────────────────────── */
    'shortcut.search': 'Open search',
    'shortcut.gallery': 'Open and close the cast wall',
    'shortcut.layouts': 'Layout modes — web, by season, by background, orbit',
    'shortcut.fit': 'Fit the graph to the screen',
    'shortcut.zoom': 'Zoom in and out',
    'shortcut.rail': 'Toggle the filter rail',
    'shortcut.about': 'Open and close this panel',
    'shortcut.escape': 'Let go of a pinned tie first, then close or deselect the person',
    'shortcut.back': 'Back to the previous person',
    'shortcut.keyDrag': 'Drag',
    'shortcut.keyScroll': 'Scroll',
    'shortcut.keyDragNode': 'Drag a node',
    'shortcut.keyShiftClick': 'Shift-click',
    'shortcut.pan': 'Pan the canvas',
    'shortcut.zoomPointer': 'Zoom',
    'shortcut.moveNode': 'Reposition that person',
    'shortcut.tracePath': 'Trace the chain of relationships between the selected person and this one',
    'shortcut.moveCursor': 'Move between people in the graph',
    'shortcut.openPerson': 'Open the person under the cursor',
    'shortcut.traceKeyboard': 'Trace the chain between the selected person and the one under the cursor',
    'about.keysOrbitNote': 'Orbit (4) needs a person selected before it will turn on.',

    /* ── status bar ───────────────────────────────────────────────────── */
    'status.people': 'People',
    'status.relations': 'Ties',
    'status.clearFilters': 'clear filters',
    'status.clearFiltersAria': 'Clear filters',
    /* ── canvas ────────────────────────────────────────────────────────
       Painted by the graph itself, so it cannot use a React component. */
    'canvas.label': 'Cast relationship graph. Use the arrow keys to move between people and Enter to open one.',
    'canvas.emptyTitle': 'Nobody matches these filters',
    'canvas.emptySub': '조건에 맞는 사람이 없습니다',
    'canvas.emptyHint': 'Clear the filters to bring all {n} of them back',
    'canvas.coldLabel': 'No prior tie on record',
    'canvas.coldSub': '확인된 인연 없음 · {n}명',
    /* Region captions for the anchored layouts. They used to be hardcoded
       Latin caps on a Korean canvas; they are copy, so they live here. */
    'canvas.seasonLabel': 'Season {n}',
    /* See the Korean entry. "Season 2 · 7" reads as a footnote marker. */
    'canvas.regionCount': '{n} people',
    'canvas.rookieLabel': 'No prior season',
    'canvas.orbitRing1': 'Direct ties',
    'canvas.orbitRing2': 'One step away',
    /* Screen-reader fallback list for the canvas. */
    'canvas.srDegreeOne': '{n} connection',
    'canvas.srDegree': '{n} connections',
    'canvas.srLinked': 'Connected to',
    'canvas.srNone': 'none',
    'status.hintIdle': 'Click a node for the dossier · click a line to read the tie · drag to pan · scroll to zoom',
    'status.hintSelected': 'selected',
    'status.hintSelectedTail': 'Shift-click a second node to trace the path between them · Esc to clear',
    'status.spoilerBadge': 'No season X content',
    'status.spoilerTitle':
      'This atlas contains nothing from inside Bloody Game X. Every person and every tie shown here comes from seasons 1–3, from other programmes, or from real life — all of it on record before X aired.',
    'status.updated': 'Updated',
    'status.srPeople': 'People shown',
    'status.srTotal': 'of',
    'status.srRelations': 'Ties shown',

    /* ── path card ────────────────────────────────────────────────────── */
    'path.regionLabel': 'Path between two people',
    'path.eyebrow': 'Connection path',
    'path.close': 'Close the path',
    'path.noneJoin': 'and',
    'path.noneTail': 'are not joined by any chain at all.',
    /* Second sentence: see the Korean. The three people a trace can fail on
       each have a parallel line drawn on the canvas, so the card has to say why
       that line is not a road. */
    'path.noneNote':
      'No chain of verified relationships links these two — not even through someone else. A parallel record states that two people have never met, so a path cannot step through one.',
    'path.degree1': 'They know each other directly',
    'path.degree2': 'One person in between',
    'path.degreeNSuffix': 'people in between',
    'path.seasonPrefix': 'Season',
    'path.outside': 'Outside the house',
    'path.hint': 'Shift-click another node to trace a new path.',

    /* ── intro ────────────────────────────────────────────────────────── */
    'intro.kicker': 'CAST ATLAS',
    'intro.thesis': 'Every alliance, betrayal and shared stage that predates season X.',
    'intro.statCast': 'Cast',
    'intro.statConnections': 'Connections',
    'intro.statSeasons': 'Prior seasons',
    'intro.enter': 'Enter',
    'intro.enterAria': 'Enter the atlas',
    'intro.hintKeys': 'Enter · Space · Esc · or click anywhere',
    'intro.hintAuto': 'or wait — it opens on its own',
    'intro.hintNoAuto': 'nothing advances on its own — begin whenever you like',

    /* ── shared vocabulary ────────────────────────────────────────────── */
    /* The singular half of each counted noun. See the note on the Korean side:
       these two keys are what stops "1 people" / "1 ties" being spoken. */
    'common.person': 'person',
    'common.people': 'people',
    'common.tie': 'tie',
    'common.ties': 'ties',
    'common.season': 'Season',
    'common.outsideHouse': 'Outside the house',
    'common.close': 'Close',
    'common.of': 'of',
    'lang.toggle': 'Switch language',
    'lang.ko': 'Korean',
    'lang.en': 'English',
    /* See the Korean entry. */
    'credit.by': 'Built with love by Hyelin Lee · any feedback or inquiry welcomed',
    'credit.linkPrefix': 'Hyelin Lee on',
  },
} as const;

export type UiKey = keyof typeof ui.ko;

/**
 * The two tables, widened and indexable. Typing them as `Record<UiKey, string>`
 * is the parity check: drop a key from `en` and this line stops compiling.
 */
const TABLE: Record<Lang, Record<UiKey, string>> = { ko: ui.ko, en: ui.en };

/**
 * Read one string.
 *
 * Several surfaces set a Korean line against a Latin eyebrow (출처 / SOURCES).
 * That is one key, read twice — `t(lang, k)` for the line, `ui.en[k]` for the
 * eyebrow — so the pair never drifts and no key exists only to hold a caption.
 */
export function t(lang: Lang, key: UiKey): string {
  const value = TABLE[lang][key];
  return value.length > 0 || lang === 'ko' ? value : ui.ko[key];
}

/**
 * Korean particle selection, by the last jamo of the word it attaches to.
 *
 * The app printed '홍진호 과(와) 최연청 사이에는…' — two errors in one string.
 * 과(와) is the Korean of writing "1 item(s)", and 와/과 is a bound particle
 * that takes no space before it. Korean is declared to be this dataset's
 * language of record, and that sentence is the only copy a reader sees when a
 * trace fails, so it was the one string in the app that read as a machine.
 *
 * It lives here rather than in the component because it is a fact about the
 * language, the same kind of thing as the string tables above, and because
 * 은/는 and 이/가 will be wanted the moment anyone writes another sentence.
 * Names ending in a Latin letter or a digit are left on the no-batchim form:
 * guessing the reading of 'XITSUH' is a worse failure than the default.
 */
const hasBatchim = (word: string): boolean => {
  const c = word.trimEnd().charCodeAt(word.trimEnd().length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};

/** `josa('홍진호', '과', '와')` → '홍진호와'. Attaches with no space. */
export function josa(word: string, withBatchim: string, without: string): string {
  return `${word}${hasBatchim(word) ? withBatchim : without}`;
}

/** 홍진호 → '홍진호와', 서출구 → '서출구와', 김남희 → '김남희와', 곽범 → '곽범과'. */
export const wa = (word: string): string => josa(word, '과', '와');

/**
 * Substitute `{name}` slots, and select the particle when one follows.
 *
 * `.replace('{n}', …)` is fine for a number and wrong for a name, because a
 * Korean sentence written round a name has to agree with it: 이진형이 / 홍진호가,
 * 윤비를 / 서출구를. Every surface that has needed this so far has instead
 * written the escape hatch into the string — 과(와), 을(를) — which is how the
 * app came to print '홍진호 과(와) 최연청 사이에는'. So the escape hatch is gone
 * from the tables and the selection happens here, once.
 *
 * Write the pair in the template in the conventional order, WITH-batchim first:
 * `{w}이/가`, `{l}을/를`, `{p}은/는`, `{a}과/와`. The pair binds to the slot
 * immediately before it and is replaced whole, so the template still reads as a
 * Korean sentence to whoever is editing the table.
 *
 * English templates carry no pairs and fall through the same call unchanged,
 * which is the point — a caller does not branch on language to fill a string.
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(
    /\{(\w+)\}(?:([가-힣]{1,2})\/([가-힣]{1,2}))?/g,
    (whole, k: string, withB: string | undefined, without: string | undefined) => {
      const v = vars[k];
      if (v === undefined) return whole;
      const s = String(v);
      return withB ? `${s}${hasBatchim(s) ? withB : without}` : s;
    },
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Taxonomy labels. These appear on both language sides of the interface, so
   they are keyed by language rather than duplicated per component. The Korean
   values are the canonical set; where components had drifted apart (친분 vs
   친구, 합방 vs 합작, 다른 프로그램 vs 타 프로그램) this table settles it.
   ──────────────────────────────────────────────────────────────────────────── */

export const CATEGORY_LABEL_I18N: Record<Lang, Record<Category, string>> = {
  ko: {
    comedian: '코미디언',
    athlete: '운동선수',
    esports: 'e스포츠',
    creator: '크리에이터',
    broadcaster: '방송인',
    musician: '뮤지션',
    poker: '포커 플레이어',
    professional: '전문직',
    actor: '배우',
    other: '기타',
  },
  en: {
    comedian: 'Comedian',
    athlete: 'Athlete',
    esports: 'Esports',
    creator: 'Creator',
    broadcaster: 'Broadcaster',
    musician: 'Musician',
    poker: 'Poker',
    professional: 'Professional',
    actor: 'Actor',
    other: 'Other',
  },
};

/*
 * The legend is the reader's contract, so these two tables have to be true of
 * every edge that carries the type — not of the typical one.
 *
 * `prior-show` used to be called 다른 프로그램 / "Shared show" and glossed "다른
 * 프로그램에서 먼저 만난 사이 / Met on another programme first". It was false
 * for five of the thirteen lines it was drawn on: two were the same programme
 * and the same season (a studio panellist and a player, now filed as
 * `co-season`), and three are pairs the dataset itself says have never met.
 * The category is now named for what actually unites its members — a record
 * that overlaps outside this franchise — and the three pairs who never met at
 * all have moved off it onto `parallel`, which has its own hue and its own
 * dash. That was the last thing making the row untrue: `prior-show` now means
 * a meeting on every line that carries it, so the gloss can say so plainly
 * instead of hedging. The `parallel` rows still carry `confidence: 'low'`
 * edges, so the 미확인 marker fires wherever they are drawn.
 */
export const EDGE_LABEL_I18N: Record<Lang, Record<EdgeType, string>> = {
  ko: {
    alliance: '동맹',
    betrayal: '배신',
    rivalry: '라이벌',
    'prior-show': '바깥 이력',
    'co-season': '같은 시즌',
    parallel: '평행 이력',
    friendship: '친분',
    family: '가족',
    agency: '같은 소속',
    teammate: '같은 팀',
    mentor: '멘토',
    collab: '합방',
  },
  en: {
    alliance: 'Alliance',
    betrayal: 'Betrayal',
    rivalry: 'Rivalry',
    'prior-show': 'Outside record',
    'co-season': 'Same season',
    parallel: 'Parallel record',
    friendship: 'Friendship',
    family: 'Family',
    agency: 'Same agency',
    teammate: 'Teammates',
    mentor: 'Mentorship',
    collab: 'Collaboration',
  },
};

/** One line per type, so the legend explains itself without a caption.
 *
 * A gloss is read as a claim about EVERY edge of that type, so it can only say
 * what the narrowest of them supports. `co-season` used to read 같은 시즌, 다른
 * 자리 / 'Same season, different seat', which was written when the type held
 * only panellist-and-player pairs. It now also holds two PLAYERS in one season
 * with nothing individual on record — 홍진호 and 허성범 both started day one in
 * 피의 낙원 and sat the same Money Challenges — so 'different seat' and 'not a
 * shared game' were both false on that card, printed directly above a
 * paragraph that said so. edges.ts:67-88 defines the type as "the same season
 * and nothing more than that"; the gloss now says exactly that and nothing
 * further, which is true of all six. */
export const EDGE_GLOSS_I18N: Record<Lang, Record<EdgeType, string>> = {
  ko: {
    alliance: '하우스 안에서 손을 잡고 함께 굴러간 사이',
    betrayal: '카메라 앞에서 한쪽이 다른 쪽의 등에 칼을 꽂았다',
    rivalry: '시즌 내내 정면으로 부딪친 관계',
    'prior-show': '하우스 밖의 같은 프로그램에서 먼저 만난 사이',
    'co-season': '같은 시즌에 있었다는 것까지 — 그 이상은 이 선이 말하지 않는다',
    parallel: '만난 적은 없고 이력만 같다',
    friendship: '방송 밖에서 실제로 가까운 사이',
    family: '혈연 또는 혼인으로 이어진 사이',
    agency: '같은 소속사·크루·매니지먼트',
    teammate: '같은 프로팀에서 함께 뛰었다',
    mentor: '한쪽이 다른 쪽을 데려왔거나 가르쳤다',
    collab: '함께 콘텐츠를 만든 사이',
  },
  en: {
    alliance: 'Played together inside the house',
    betrayal: 'One knifed the other on camera',
    rivalry: 'Sustained head-to-head antagonism',
    'prior-show': 'Met first on another programme outside the house',
    'co-season': 'Same season, and this line claims nothing beyond that',
    parallel: 'Same record, never met',
    friendship: 'Real friendship outside the show',
    family: 'Related by blood or marriage',
    agency: 'Same label, troupe or management',
    teammate: 'Played on the same pro team',
    mentor: 'One brought the other in, or coached them',
    collab: 'Made content together',
  },
};

/** The five blocs of the announced lineup, as billed. */
export const TEAM_LABEL_I18N: Record<Lang, Record<XTeam, string>> = {
  ko: {
    season1: '시즌1 팀',
    season2: '시즌2 팀',
    season3: '시즌3 팀',
    challenger: '챌린저 팀',
    rookie: '루키 팀',
  },
  en: {
    season1: 'Season 1 team',
    season2: 'Season 2 team',
    season3: 'Season 3 team',
    challenger: 'Challengers',
    rookie: 'Rookies',
  },
};

/** Where a player came from, phrased as a person rather than as a team. */
export const LINEAGE_LABEL_I18N: Record<Lang, Record<XTeam, string>> = {
  ko: {
    season1: '시즌 1 출신',
    season2: '시즌 2 출신',
    season3: '시즌 3 출신',
    challenger: '타 서바이벌 출신',
    rookie: '첫 출연',
  },
  en: {
    season1: 'From season 1',
    season2: 'From season 2',
    season3: 'From season 3',
    challenger: 'From other survival shows',
    rookie: 'Franchise debut',
  },
};

/** Short chip form used by the filter rail, where the column is narrow. */
export const LINEAGE_CHIP_I18N: Record<Lang, Record<XTeam, string>> = {
  ko: {
    season1: '시즌 1',
    season2: '시즌 2',
    season3: '시즌 3',
    challenger: '챌린저',
    rookie: '루키',
  },
  en: {
    season1: 'Season 1',
    season2: 'Season 2',
    season3: 'Season 3',
    challenger: 'Challengers',
    rookie: 'Rookies',
  },
};
