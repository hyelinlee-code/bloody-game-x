import type { PersonEn } from './types';

/**
 * English content for the twenty announced players of Bloody Game X.
 *
 * Keyed by the same ids as `src/data/people.ts`. The Korean file remains the
 * single source of truth for facts; nothing here may add a fact the Korean
 * does not carry, and — like the Korean — nothing here may describe anything
 * that happens inside season X.
 */
export const peopleEn: Record<string, PersonEn> = {
  /* ───────────────────────── Season 1 team ───────────────────────── */
  'lee-sang-min': {
    aka: ["Sang-min of Roo'Ra (룰라 이상민)"],
    occupation: "Broadcaster · former leader and producer of Roo'Ra",
    bio:
      "He started out as the leader and producer of the 1990s group Roo'Ra and has since settled into a second career as a fixture of Korean variety television, most durably as a long-running regular on JTBC's Knowing Bros (아는 형님). Within the brain-survival genre he is remembered as the winner of the second season of The Genius, Rule Breaker (더 지니어스: 룰 브레이커). In Bloody Game season 1 he never entered the house at all: he sat in the studio panel seats and watched the players from outside the game.",
    notableFor: [
      'Winner, The Genius: Rule Breaker',
      "Three of The Genius's four seasons",
      'Bloody Game season 1 studio panellist',
      "Leader and producer of Roo'Ra",
    ],
  },

  'park-ji-min': {
    occupation: 'MBC announcer',
    bio:
      "An MBC announcer who works both the news desk and the variety floor, with hosting credits including Welcome, First Time in Korea? (어서와~ 한국은 처음이지?) and Oh Eun-young Report: Marriage Hell (오은영 리포트 – 결혼지옥). No one is more deeply embedded in the Bloody Game franchise: she played as a contestant in seasons 1 and 2, and returned for season 3 not as a competitor but as the dealer of the 잔해 ghost casino and the butler of its purgatory — a supporting appearance rather than a hosting one, which production held back as a twist until episode 6.",
    notableFor: [
      'Contestant in Bloody Game 1 and 2, ghost-casino dealer in season 3',
      'The only person present for all three seasons',
      'Broadcasting award for presenting',
      'MBC announcer',
    ],
  },

  'jung-keun-woo': {
    occupation: 'Former KBO second baseman · baseball commentator',
    bio:
      'One of the defining second basemen of the KBO League, with his best years at the SK Wyverns and the Hanwha Eagles. He was part of the Korean squad that took baseball gold at the 2008 Beijing Olympics and won the Golden Glove several times over. Since retiring he has worked as a baseball commentator.',
    notableFor: [
      'Baseball gold, 2008 Beijing Olympics',
      'Multiple KBO Golden Gloves at second base',
      'Infield regular for SK, Hanwha and LG',
    ],
  },

  'lee-tae-gyun': {
    occupation: 'Police officer · qualified lawyer',
    bio:
      "A serving police officer who graduated from the Korean National Police University and then went through law school to qualify as a lawyer on top of the badge. He won Bloody Game season 1 outright, which leaves him holding the one title nobody else can take: the franchise's first champion.",
    notableFor: [
      "Winner, Bloody Game season 1 — the franchise's first champion",
      'Police University graduate, serving officer',
      'Passed the bar examination',
    ],
  },

  /* ───────────────────────── Season 2 team ───────────────────────── */
  'ha-seung-jin': {
    occupation: 'Former NBA and KBL centre · YouTuber',
    bio:
      'A 221cm centre taken by the Portland Trail Blazers in the 2004 NBA draft, making him the first Korean to play on an NBA court. He returned home to play for Jeonju KCC in the KBL and retired in 2019; he now works as a YouTuber and television personality.',
    notableFor: [
      'First Korean player in the NBA',
      'Tallest player in Korean basketball history, 221cm',
      'Former Jeonju KCC centre, KBL',
    ],
  },

  'hyun-seong-joo': {
    aka: ['Komong (코몽)', 'Koreanmonkey'],
    occupation: 'Professional poker player',
    bio:
      "A professional poker player who competes under the name Komong (코몽). He won a 2020 World Series of Poker (WSOP) online event to become only the third Korean ever to take home a gold bracelet, and he holds a World Poker Tour championship title as well. He is a graduate of Hankuk University of Foreign Studies.",
    notableFor: [
      'Third Korean to win a WSOP gold bracelet (2020)',
      'WPT championship title',
      'Hankuk University of Foreign Studies',
      "Plays as 'Komong'",
    ],
  },

  'yoon-bi': {
    realName: 'Myung Yun-baek (명윤백)',
    aka: ['YunB'],
    occupation: 'Rapper',
    bio:
      'A rapper signed to Hi-Lite Records, a philosophy graduate of New York University, and a junior Olympic gold medallist in taekwondo — a combination that reads like three different people. He appeared on Show Me The Money 6, 777 and 8, and won the Kakao TV web variety survival Survival Men and Women: A Divided World (생존남녀: 갈라진 세상), which put his name in the survival column before Bloody Game ever called.',
    notableFor: [
      'Philosophy, New York University',
      'Winner, web survival Survival Men and Women',
      'Junior Olympic taekwondo gold',
      'Hi-Lite Records',
    ],
  },

  'lee-jin-hyung': {
    occupation: 'Physician · dermatologist',
    bio:
      "He posted a perfect score on the 2019 College Scholastic Ability Test (수능) and went to Seoul National University's medical school on the back of it; he now practises as a dermatologist. He entered Bloody Game season 2 as a medical student and left it as the champion.",
    notableFor: [
      'Winner, Bloody Game season 2',
      'Perfect score, 2019 CSAT (수능)',
      'Seoul National University medical school',
    ],
  },

  /* ───────────────────────── Season 3 team ───────────────────────── */
  'hong-jin-ho': {
    aka: ['Kong (콩)', 'Storm Zerg (폭풍저그)'],
    occupation: 'Former StarCraft professional · professional poker player',
    bio:
      "A legendary StarCraft professional who played under the name Storm Zerg (폭풍저그). After retiring he turned to poker and won a WSOP bracelet in 2022, and as the inaugural winner of The Genius (더 지니어스: 게임의 법칙) he became the standing symbol of the Korean brain-survival genre. He has been through Bloody Game twice, in seasons 2 and 3 back to back.",
    notableFor: [
      'Inaugural winner, The Genius: Rules of the Game',
      'WSOP bracelet, 2022',
      "StarCraft legend, the 'Storm Zerg'",
      'Top-three finishes in Bloody Game 2 and 3',
    ],
  },

  'seo-chul-gu': {
    realName: 'Seo Hae-rang (서해랑)',
    /* Mirrors people.ts: XITSUH is the printed name now, so the romanisation is
       what belongs here — it is the string a reader who knows 서출구 will search. */
    aka: ['Seo Chul-gu', 'Mr.Note'],
    occupation: 'Rapper · internet broadcaster',
    bio:
      "A rapper and internet broadcaster who performs as XITSUH. He enrolled at Brigham Young University in the United States and left without finishing, then made his name on Mnet's Show Me The Money 5. He has been through Bloody Game twice, in seasons 2 and 3 back to back.",
    notableFor: [
      'Bloody Game seasons 2 and 3, back to back',
      'Compulsive note-taker; reads the board off his own records',
      'Show Me The Money 5',
    ],
  },

  'choi-hye-sun': {
    occupation: 'Influencer · life-sciences researcher',
    bio:
      "She read life sciences at Ewha Womans University, took a master's at Durham University in England, and has worked at a London teaching hospital; alongside that she works as an influencer. Netflix's Single's Inferno 3 (솔로지옥3) introduced her to a general audience, and Bloody Game season 3 followed.",
    notableFor: [
      "Netflix's Single's Inferno 3",
      "Life sciences at Ewha, master's at Durham",
      'Worked at a London teaching hospital',
    ],
  },

  'heo-seong-beom': {
    occupation: 'AI researcher, KAIST · model',
    bio:
      "An AI researcher who came up through the Korea Science Academy, graduated from KAIST's School of Computing, and is now taking a master's at its Kim Jaechul Graduate School of AI. He first drew attention as leader of the KAIST team on Coupang Play's University War (대학전쟁), and has modelled for Calvin Klein and LG Gram.",
    notableFor: [
      'KAIST School of Computing → Kim Jaechul Graduate School of AI',
      'KAIST team leader, University War',
      'Youngest player in Bloody Game season 3',
    ],
  },

  /* ───────────────────────── Challengers ───────────────────────── */
  'kim-kyung-hoon': {
    occupation: 'Entrepreneur · consumer-brand founder',
    bio:
      "He studied materials engineering at the University of Illinois Urbana-Champaign and chemical and biological engineering at Seoul National University's graduate school before going into business for himself, launching a caffeine-free coffee-substitute brand in 2023. To anyone who follows the brain-survival genre, though, he is the runner-up of tvN's The Genius: Grand Final (더 지니어스: 그랜드 파이널).",
    notableFor: [
      'Runner-up, The Genius: Grand Final',
      'The Genius seasons 3 and 4, back to back',
      'Founded a coffee-substitute brand',
    ],
  },

  'kim-yoo-hyun': {
    occupation: 'Professional poker player · former English instructor',
    bio:
      "Educated at international schools in Hong Kong and China, he studied computer engineering at the University of Illinois Urbana-Champaign and left without finishing. He arrived on television as an ordinary-citizen contestant on tvN's The Genius: Black Garnet (더 지니어스: 블랙가넷) and was invited back for Grand Final. He spent a stretch away from the felt working as an English instructor, returned to poker professionally in 2022, and won an APL side event in 2023.",
    notableFor: [
      'The Genius seasons 3 and 4, back to back',
      'Computer engineering at UIUC, left without finishing',
      'Winner, 2023 APL Mystery Bounty',
      'Amateur contestant turned professional',
    ],
  },

  'kim-nam-hee': {
    occupation: 'Broadcaster · former SBS Sports announcer',
    bio:
      "A graduate of Sookmyung Women's University who joined SBS Sports as an announcer in 2015. A Mensa Korea member with a measured IQ of 156, she built her reputation as one of television's thinking personalities through tvN's Problematic Men (뇌섹시대 – 문제적 남자). She has played the survival format before, on The Time Hotel (더 타임호텔).",
    notableFor: [
      'Mensa Korea member, IQ 156',
      'Miss Seoul 2014, Seon (2nd)',
      'Competed on The Time Hotel',
      'Former SBS Sports announcer',
    ],
  },

  'kang-ji-hoo': {
    occupation: 'Undergraduate, KAIST mathematical sciences',
    bio:
      "An undergraduate in mathematical sciences at KAIST, who finished third with the KAIST team on Coupang Play's brain-survival series University War 3 (대학전쟁3). He is the only currently enrolled student in this lineup.",
    notableFor: [
      'Third place, University War 3',
      'Mathematical sciences, KAIST',
      'The only current student in the lineup',
    ],
  },

  /* ───────────────────────── Rookies ───────────────────────── */
  'kwak-beom': {
    aka: ["Mad Monster's Tan (매드몬스터 탄)"],
    occupation: 'Comedian',
    bio:
      "He auditioned for four straight years before KBS finally took him on in its 27th open-recruitment class of comedians in 2012, and made his face known through sketches on Gag Concert (개그콘서트). Now with Meta Comedy, he co-runs the YouTube channel Bbangsongguk (빵송국) with Lee Chang-ho, where the pair invented the fake idol duo Mad Monster (매드몬스터) and watched it become a genuine phenomenon.",
    notableFor: [
      'KBS 27th open-recruitment comedy class',
      'Co-runs the YouTube channel Bbangsongguk',
      "Created and performs in the fake idol group 'Mad Monster'",
    ],
  },

  'lee-gwan-hee': {
    occupation: 'Professional basketball player, KBL',
    bio:
      "A shooting guard out of Yonsei University, drafted by the Seoul Samsung Thunders in the 2011 KBL draft and since then with Changwon LG and Wonju DB. He has twice finished the season as the league's best free-throw shooter. Netflix's Single's Inferno 3 (솔로지옥3) gave him a following well beyond basketball.",
    notableFor: [
      'KBL professional basketball player',
      'Led the league in free-throw percentage twice',
      "Netflix's Single's Inferno 3",
    ],
  },

  'shin-seung-yong': {
    occupation: 'Physician · aesthetic dermatology',
    bio:
      "A physician who came through Icheon High School and Seoul National University, and now runs a Gangnam practice doing skin and hair work; he has built an audience as an influencer alongside it. TVING's EXchange 4 (환승연애4) brought him to a general audience when he joined in episode 12. This is his first time inside the Bloody Game franchise.",
    notableFor: ["TVING's EXchange 4", 'Seoul National University graduate', 'Skin and hair practice, Gangnam'],
  },

  'choi-yeon-cheong': {
    realName: 'Choi Gyu-ri (최규리)',
    occupation: 'Actor',
    bio:
      'An actor who studied Korean traditional music at Dankook University and reached the Jeollabuk-do regional final of Miss Korea in 2013. She is a Mensa Korea member with a measured IQ of 156, and has worked back and forth between Korea and China in film and television, with drama credits including Miss Hammurabi (미스 함무라비).',
    notableFor: [
      'Mensa Korea member, IQ 156',
      'Korean traditional music, Dankook University',
      'Top award, open division, 2012 Bucheon Boksagol gugak competition',
      'Drama credit: Miss Hammurabi',
    ],
  },
};
