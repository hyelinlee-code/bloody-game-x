import type { GlossaryTerm, SeasonMeta } from './types';

/**
 * The three completed seasons. These have all finished airing, so they can be
 * described fully — they are the history the graph is built out of.
 */
export const seasons: SeasonMeta[] = [
  {
    season: 1,
    titleKo: '피의 게임',
    titleEn: 'Bloody Game',
    network: 'MBC · Wavve',
    airDates: '2021.11.01 – 2022.01.24',
    year: '2021–22',
    episodes: '12부작 + 스페셜',
    prize: '우승자 상금 약 1억 800만 원',
    hook: '저택과 지하실. 같은 집 안에서 두 계급이 만들어진다.',
    format:
      '참가자들은 한 저택에 모여 살지만 전원이 같은 조건에 있지는 않다. 일부는 지하실로 내려가 훨씬 열악한 환경에서 생활하며, 그 격차 자체가 협상 카드가 된다. 상금은 시간이 흐를수록 줄어들기 때문에 오래 버티는 것만으로는 이길 수 없고, 탈락자는 데스매치를 통해 결정된다. 참가자 대부분이 일반인·비연예인 중심이었다는 점에서 이후 시즌들과 결이 다르다.',
    winnerId: 'lee-tae-gyun',
    winnerNameKo: '이태균',
    winnerNameEn: 'Lee Tae-gyun',
    signatureMoment:
      '3일차에 전원의 표를 받고 지하실로 쫓겨난 이태균이, 보일러실 통로를 맨몸으로 기어올라 거실 TV 속 진짜 열쇠를 꺼내 온 순간.',
    /* Was #ff2f43 — literally --blood, which the colour law reserves for the
       wordmark and betrayal, so the season-1 card read as an error alert.
       Now --s1-ink: the ink step, because this value also sets the card's
       "S1" eyebrow, which is type. Keep in step with tokens.css --s1-ink. */
    accent: '#4fa563',
  },
  {
    season: 2,
    titleKo: '피의 게임2',
    titleEn: 'Bloody Game 2',
    network: 'Wavve',
    airDates: '2023.04.28 – 2023.06.16',
    year: '2023',
    episodes: '14부작 (본편 13 + 비하인드 1)',
    prize: '최대 3억 원',
    hook: '집 밖에서 하루 먼저 시작한 사람들이 있었다.',
    format:
      '시즌1의 저택/지하실 구조 위에 히든 플레이어 장치를 얹었다. 일부 참가자가 저택 바깥에서 하루 먼저 게임을 시작한 뒤 뒤늦게 합류하는 형태로, 안에 있는 사람들은 자기가 아는 명단이 전부가 아니라는 사실을 모른 채 판을 짜게 된다. 규칙 안에서라면 생존을 위한 어떤 행동도 문제 삼지 않는다는 원칙이 명시돼, 협잡과 연합이 시즌1보다 훨씬 노골적으로 전개됐다.',
    winnerId: 'lee-jin-hyung',
    winnerNameKo: '이진형',
    winnerNameEn: 'Lee Jin-hyung',
    signatureMoment:
      '습격의 날, 밖에서 하루 먼저 시작한 히든 플레이어들이 저택 문을 열고 들어오면서 안에서 짜 놓은 명단과 계산이 통째로 무효가 된 순간.',
    accent: '#7c9cff',
  },
  {
    season: 3,
    titleKo: '피의 게임3',
    titleEn: 'Bloody Game 3',
    network: 'Wavve',
    airDates: '2024.11.15 – 2025.01.24',
    year: '2024–25',
    episodes: '15부작 (본편 14 + 비하인드 1)',
    prize: '우승 상금 액수 비공개',
    hook: '서바이벌 레전드들만 불러 모은 올스타전.',
    format:
      '캐스팅 철학이 완전히 바뀐 시즌이다. 일반인 중심이던 초기와 달리 각종 두뇌 서바이벌에서 이름을 알린 참가자들을 모아 올스타 구도를 만들었고, 그만큼 서로의 플레이 스타일을 이미 알고 들어온다는 전제가 게임 자체를 바꿨다. 개인이 확보한 자금이 최종 우승 상금에 직접 영향을 주지 않도록 규칙이 조정돼, 돈을 모으는 것과 이기는 것이 분리됐다. 거점 이름도 바뀌어, 조건이 보장되는 위쪽은 낙원, 밀려난 쪽은 잔해로 불렸다. 시즌1·2를 플레이어로 뛴 박지민은 이번엔 잔해의 딜러 겸 집사로 판을 굴렸다.',
    winnerId: undefined,
    winnerNameKo: '장동민',
    winnerNameEn: 'Jang Dong-min',
    signatureMoment:
      '여덟 번의 머니 챌린지에서 면제권만 다섯 번을 쓸어간 장동민이, 파이널마저 콜드게임으로 끝내 버린 것.',
    accent: '#e6c07a',
  },
];

/** Vocabulary a viewer needs before the graph makes sense. */
export const glossary: GlossaryTerm[] = [
  {
    termKo: '저택',
    termEn: 'The mansion',
    meaning: '참가자들이 함께 생활하는 위층 공간. 음식과 잠자리가 보장되는 쪽이며, 여기 남는 것 자체가 권력이다.',
  },
  {
    termKo: '지하실',
    termEn: 'The basement',
    meaning: '저택에서 밀려난 참가자들이 내려가는 아래층. 조건이 훨씬 열악하고, 위층과 협상하지 않으면 상황을 뒤집기 어렵다.',
  },
  {
    termKo: '낙원',
    termEn: 'Paradise',
    meaning:
      '시즌3에서 저택 자리를 물려받은 위쪽 거점. 정식 명칭은 ‘피의 낙원’이고, 여기 남아 있는 동안은 생활 조건과 발언권이 함께 보장된다.',
  },
  {
    termKo: '잔해',
    termEn: 'The ruins',
    meaning:
      '낙원에서 밀려난 참가자들이 내려가는 시즌3의 폐허 거점. 지하실과 달리 여기로 내려가는 것이 곧 탈락은 아니어서, 잔해에서 다시 올라오는 경로가 시즌 중반의 이야기를 만든다.',
  },
  {
    termKo: '데스매치',
    termEn: 'Death match',
    meaning: '탈락자를 가리는 1:1 혹은 소수 대결. 여기에 누구를 올려보낼지 정하는 과정이 시즌 대부분의 갈등을 만든다.',
  },
  {
    termKo: '머니 챌린지',
    termEn: 'Money challenge',
    meaning:
      '자금과 저택의 권력을 한꺼번에 걸고 벌이는 매 회차의 메인 경쟁. 상위권은 돈과 면제권을 가져가고 최하위권은 그대로 데스매치 후보가 되기 때문에, 한 판의 결과가 그날의 정치 지형을 통째로 바꾼다.',
  },
  {
    termKo: '면제권',
    termEn: 'Immunity',
    meaning:
      '탈락 지명이나 데스매치에서 빠질 수 있는 권리로, 주로 머니 챌린지 보상으로 나온다. 쓰지 않고 쥐고만 있어도 협상력이 되기 때문에 누가 몇 장을 가졌는지가 늘 추적 대상이다.',
  },
  {
    termKo: '판도라의 상자',
    termEn: "Pandora's box",
    meaning:
      '보상으로 주어지지만 좋은 면만 들어 있지는 않은 무작위 장치. 시즌2에서는 열린 순간 전 참가자의 자금이 균등 재분배됐고, 시즌3에서는 페널티 면이 열려 낙원의 방어 조건 자체가 뒤집혔다.',
  },
  {
    termKo: '습격의 날',
    termEn: 'Raid day',
    meaning:
      '바깥에서 시작한 쪽이 저택을 직접 덮치는 시즌2의 분기점. 이날을 기점으로 안팎 구도가 무너지고 그때까지의 연합이 전부 새로 짜인다.',
  },
  {
    termKo: '상금',
    termEn: 'The prize pool',
    meaning:
      '시간이 지날수록 줄어드는 공동 상금. 버티기만 해서는 손해라는 압박이 판을 계속 움직이게 만든다. 시즌별 숫자가 달라 보이는 것은 계산 방식이 다르기 때문으로, 시즌1의 1억 800만 원은 우승자가 실제로 가져간 금액이고 시즌2의 3억은 판에 걸린 최대치일 뿐 실수령액(5,000만 원)과 다르며, 시즌3은 아예 상금 액수를 공개하지 않았다.',
  },
  {
    termKo: '개인 자금',
    termEn: 'Personal funds',
    meaning:
      '참가자가 게임 안에서 벌고, 쓰고, 빼앗기는 자기 몫의 돈. 시즌2에서는 우승해야만 이 돈이 실제 상금이 됐기 때문에 최종 잔액 1위였던 서출구는 한 푼도 받지 못했고, 자금이 0원인 채로 이긴 이진형은 우승 상금 5,000만 원만 들고 나왔다.',
  },
  {
    termKo: '승자독식',
    termEn: 'Winner takes all',
    meaning:
      '상금을 우승자 한 명만 가져가는 원칙. 2등 이하는 아무리 오래 버티고 아무리 많이 모아도 0원이라, 시즌3은 개인 자금이 최종 우승 상금에 영향을 주지 않도록 규칙을 바꿔 돈을 모으는 일과 이기는 일을 아예 분리했다.',
  },
  {
    termKo: '히든 플레이어',
    termEn: 'Hidden player',
    meaning: '시즌2에서 도입된 장치. 저택 바깥에서 먼저 게임을 시작해 뒤늦게 합류하는 참가자로, 안쪽 사람들이 아는 명단을 무효화한다.',
  },
  {
    termKo: '연합',
    termEn: 'Alliance',
    meaning: '표를 몰아 주기로 한 임시 동맹. 피의 게임에서는 거의 예외 없이 깨지며, 깨지는 방식이 그 시즌의 이야기가 된다.',
  },
  {
    termKo: '올스타전',
    termEn: 'All-star format',
    meaning: '시즌3부터 뚜렷해진 캐스팅 방향. 이미 다른 서바이벌에서 검증된 참가자들을 모아, 서로의 전략을 아는 상태에서 시작하게 만든다.',
  },
];

export const franchise = {
  premise:
    '피의 게임은 참가자들을 한 집에 몰아넣고, 그 집을 일부러 불평등하게 설계한 데서 출발한다. 위층 저택과 아래층 지하실로 생활 조건이 갈리고, 공동 상금은 시간이 갈수록 줄어들며, 탈락자는 데스매치로 정해진다. 체력이나 지능 하나로 이기는 구조가 아니라 누구와 손을 잡고 언제 그 손을 놓느냐가 결과를 만드는 쪽에 가깝다. 그래서 이 프랜차이즈에서 기억되는 것은 대체로 승자가 아니라 배신의 순간이다.',
  lineage:
    '한국 두뇌 서바이벌 계보에서 피의 게임은 「더 지니어스」가 만든 판을 이어받되, 게임판을 생활 공간으로 바꿔 놓은 쪽에 서 있다. 「더 지니어스」가 매회 정교한 룰의 게임을 설계했다면, 피의 게임은 룰보다 환경 자체를 무기로 삼는다 — 굶주림, 잠자리, 계급 차이가 곧 협상 카드다. 시즌을 거치며 캐스팅도 일반인 중심에서 다른 서바이벌을 거친 이름값 있는 플레이어 중심으로 옮겨 갔고, 그 결과 지금은 장르 전체의 출연자들이 한자리에 모이는 교차점 역할을 하고 있다.',
  reception:
    'Wavve 오리지널로 자리 잡으며 시즌을 거듭할수록 화제성이 커졌고, 특히 배신과 연합이 드러나는 회차마다 커뮤니티 반응이 집중되는 패턴을 보였다. 진행을 맡은 박지민은 이 프로그램으로 방송 진행 부문 상을 받기도 했다.',
};
