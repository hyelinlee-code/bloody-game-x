import type { Dataset } from './types';
import { people } from './people';
import { edges } from './edges';
import { franchise, glossary, seasons } from './seasons';

export const dataset: Dataset = {
  people,
  edges,
  seasons,
  glossary,
  franchise,
  currentSeason: {
    titleKo: '피의 게임X',
    titleEn: 'Bloody Game X',
    network: 'Wavve',
    premiereDate: '2026.07.03',
    episodes: '주간 공개',
    episodesEn: 'Weekly',
    premise:
      '프랜차이즈 사상 처음으로 팀전으로 돌아온 시즌. 시즌1·2·3을 대표하는 세 팀에, 다른 서바이벌 프로그램 출신들로 꾸린 챌린저 팀과 피의 게임이 처음인 루키 팀까지 다섯 팀 스무 명이 모였다. 이 앱은 그 스무 명이 서로에 대해 이미 알고 있는 것만 다룬다.',
    premiseEn:
      "The first season in the franchise's history to run as a team format. Three teams representing seasons 1, 2 and 3 are joined by a challenger team drawn from other survival shows and a rookie team for whom Bloody Game is new — five teams, twenty players. This atlas covers only what those twenty already knew about each other going in.",
  },
  meta: {
    spoilerPolicy:
      '이 앱의 노드는 피의 게임X의 공개된 출연 라인업이고, 그 외 모든 내용 — 약력, 성적, 동맹, 배신 — 은 전부 시즌 X 이전의 것이다. 시즌 1·2·3과 다른 프로그램, 그리고 실제 이력에서만 가져왔다. 시즌 X 안에서 벌어지는 일은 결과도, 탈락도, 순위도, 전개도 어디에도 없다.',
    spoilerPolicyEn:
      "The nodes in this app are the announced lineup for Bloody Game X. Everything else — the biographies, the placements, the alliances, the betrayals — predates season X, drawn only from seasons 1, 2 and 3, from other programmes, and from real life. Nothing that happens inside season X appears anywhere: no results, no eliminations, no standings, no story.",
    /* MEASURED, not estimated: run tools/validate-data.mjs, which prints the
       host histogram this paragraph quotes and fails if the betrayal edges slip
       back to wiki-only citations. Re-measure before editing these numbers.

       THE LAST SENTENCE OF THIS PARAGRAPH WAS WRONG, and wrong in the one way
       this paragraph cannot afford. It read "남은 몫은 세어 두었다 —
       '확인됨'으로 표시된 관계 중 열다섯 개가 아직 위키 인용만으로 서 있고" /
       "What is left has been counted rather than waved at: fifteen ties marked
       확인됨 still stand on wiki citations alone." Two faults, both measured:

       1. FIFTEEN IS NOT THE REMAINDER. It is the count for ONE confidence
          band. Measured across data/edges.ts: of the 47 ties, 27 cite
          namu.wiki and nothing else — 15 of the 32 at confidence 'high',
          11 of the 12 at 'medium', 1 of the 3 parallel records. A sentence
          whose whole job is "we counted rather than waved at" that quietly
          reports 15 where the number is 27 is not a disclosure, it is the
          thing a disclosure exists to prevent. The 15 is still here, because
          it is the number the build ratchets — but it is now named as the
          band it belongs to and printed beside the total.

       2. 확인됨 IS NOT A LABEL THIS APP PRINTS. `grep -rn 확인됨 src/` returned
          this file and nothing else. The product's vocabulary is 확인된 인연 —
          the rim ticks and the per-person tie count, which explicitly EXCLUDE
          parallel records — and 미확인 / Unverified, which the dossier and the
          edge card stamp on anything below confidence 'high'. So a reader who
          went looking for the fifteen found no such marking anywhere, and the
          only 확인 phrase they could find counted a different set (44 ties, not
          32). The paragraph now names the marker the app actually paints. */
    sourcing:
      '순위와 탈락 순서는 각 시즌의 진행 결과 표를 기준으로 정리했고, 하루 단위로 갈리는 대목은 해당 일차 문서까지 내려가 확인했다. 시즌 기록 하나하나에 그 기록을 쓴 근거 문서가 붙어 있다. 다만 근거의 대부분은 한 곳에서 나온다 — 전체 인용 309건 중 241건, 약 78%가 나무위키다. 나무위키는 누구나 고칠 수 있는 위키이고 시즌 문서는 계속 바뀐다. 그래서 실명 인물에게 가장 무거운 주장을 하는 다섯 개의 배신 관계는 전부 위키가 아닌 출처를 하나 이상 함께 달았고, 방송 당시 기사나 본인 인터뷰가 있으면 그쪽을 우선했다. 남은 몫은 반올림하지 않고 세어 둔다 — 관계선 52개 가운데 31개가 아직 나무위키 인용만으로 서 있다. 그중 열다섯은 \'미확인\' 표시가 붙지 않는 마흔아홉 개, 즉 이 앱이 가장 세게 주장하는 쪽에 속한다. 그 열다섯이라는 숫자는 빌드 검사에 박혀 있어서 늘어나면 통과하지 못하고, 줄어들면 검사에 적힌 숫자도 함께 내려야 한다. 한 방향으로만 움직인다는 뜻이다.',
    sourcingEn:
      "Placements and elimination order were settled against each season's own result table, and anything that turns on a single day was checked down to that day's page; every season run in this atlas carries the pages it was written from. Most of that evidence comes from one place, though — 241 of 309 citations, about 78%, are namu.wiki, a wiki anyone can edit and whose season pages keep moving. So the five betrayal edges, which make the heaviest claims about named real people, each carry at least one non-wiki source, with contemporaneous reporting or the person's own interview preferred where it exists. What is left is counted rather than rounded off: of the 52 relationship lines, 31 still stand on namu.wiki citations alone. Fifteen of those are among the forty-nine this app does NOT stamp 미확인 / Unverified — the ties it argues hardest for. That fifteen is pinned in the build check: it fails if the number rises, and if the number falls the pinned figure has to come down with it. It moves in one direction only.",
    /* Supplied by the product owner, 2026-08-03, as a set-level origin: the
       Wavve official site and namu.wiki. No file-to-origin mapping came with
       it, so this is not printed per image — see the field's own note in
       types.ts. `licence` is deliberately absent: broadcast stills and wiki
       images stay their photographers' property, and naming where a picture
       came from is not the same as holding the right to use it. */
    portraits: {
      credit: 'Wavve 공식 홈페이지 및 나무위키',
      creditEn: 'Wavve official site and namu.wiki',
    },
    /* Build-time, not hand-typed. See the BUILD_DATE note in vite.config.ts —
       this line read 2026.07.31 across two weeks of daily edits. */
    lastUpdated: __BUILD_DATE__,
    sources: [
      'https://ko.wikipedia.org/wiki/피의_게임',
      'https://namu.wiki/w/피의%20게임(시즌%201)',
      'https://namu.wiki/w/피의%20게임2',
      'https://namu.wiki/w/피의%20게임3',
      'https://www.newspim.com/news/view/20260604000984',
      'https://www.frame-less.co.kr/news/articleView.html?idxno=3505',
      'https://www.elle.co.kr/article/1903789',
    ],
  },
};
