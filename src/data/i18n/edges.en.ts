import type { EdgeEn } from './types';

/**
 * English accounts of the forty connections in `edges.ts`.
 *
 * Keyed by the same edge ids as the Korean source, which stays the single
 * source of truth for facts: every name, day number, score, placement and sum
 * of money is carried across unchanged, and only the prose is authored fresh.
 * As in the Korean, a description describes the RELATIONSHIP — placements and
 * elimination order live in `records.ts` — and nothing here touches season X.
 */
export const edgesEn: Record<string, EdgeEn> = {
  'hong-jin-ho--seo-chul-gu--alliance-s2-0': {
    label: 'Two seasons as a duo',
    description:
      "In Bloody Game 2 (2023) the wild team of hidden players that Hong Jin-ho belonged to abducted XITSUH out of the mansion on day three and recruited him, and from that point the two ran as the season's core pair. XITSUH called himself Hong Jin-ho's calculator, and played the part — a partner who deferred to Hong's reading of the board. They lined up together again in Bloody Game 3 (2024–25), XITSUH joining the alliance built around Hong. The connection outlived the broadcast: XITSUH took up poker after season 2 because of Hong, and says Hong went through his play with him point by point, from first to last.",
  },

  'hong-jin-ho--hyun-seong-joo--prior-show-1': {
    label: 'Same poker tournament field',
    description:
      "Their overlap at the poker table runs back years. Both were among the sixteen players in the season 2 invitational of War of the Poker Gods (포커 신들의 전쟁), the Texas hold'em survival series run by the YouTube channel TwoAces (투에이스), from 16 August to 30 September 2021 — Hyun Seong-joo competing as Komong (코몽) — and Hong Jin-ho won it. They were back for season 3 (2022–23), Hong as a team master and Hyun as a player. Both hold WSOP bracelets. On the strength of all that, the show sold their meeting in Bloody Game 2 as a duel between two poker professionals; inside the season they simply sat on opposite sides, with no personal antagonism on record.",
  },

  'kim-kyung-hoon--lee-sang-min--betrayal-2': {
    label: 'Betrayed his own mentor figure',
    description:
      "Both played tvN's The Genius: Grand Final (더 지니어스: 그랜드 파이널) in 2015. To Kim Kyung-hoon, Lee Sang-min was his anchor and the one ally he had in The Genius, and in the second round he declared it in those terms — that he was not himself, he was Lee Sang-min's dog. He disowned the relationship almost immediately, downgrading Lee to just a good hyung, and in the third round he leaked Lee's intended move to the politician Lee Jun-seok, which dropped Lee to the bottom of the main match. Lee had appeared to have the board under control, wiretapping included; instead he lost the episode-three Death Match to Kim himself and was eliminated. Namu Wiki dates Kim's real awakening to the moment Lee left, and Kim went on to finish runner-up.",
  },

  'lee-gwan-hee--choi-hye-sun--prior-show-3': {
    label: "Final couple on Single's Inferno 3",
    description:
      "The two were matched as a final couple on Netflix's Single's Inferno 3 (솔로지옥3), released between December 2023 and January 2024 — Lee Gwan-hee a professional basketball player, then with Changwon LG Sakers, and Choi Hye-sun an influencer. It did not turn into a relationship afterwards. Asked directly by the presenter Jang Sung-kyu on the web variety show Eat Breakfast Before You Go 2 (아침먹고 가2) in August 2024, Lee said that Choi was in England and so nothing had come of it, and that they had got as far as a meal and a coffee.",
  },

  'lee-jin-hyung--yoon-bi--betrayal-s2-4': {
    label: 'A payback Death Match',
    description:
      "On day nine of Bloody Game 2, Lee Jin-hyung joined Yoon Bi in the Money Challenge (머니 챌린지) 'Main Colour' (메인컬러), the two of them attaching to the Hong Jin-ho–XITSUH pair to make a four-way alliance. The alliance was a performance aimed squarely at Yoon Bi: Lee was repaying an earlier round in which Yoon had pushed him into last place, and he named Yoon as his Death Match (데스매치) opponent. Called out by the man he had taken for an ally, and never having got hold of the rules, Yoon declared his forfeit partway through the game and took the loss — he had thought his nerve was strong, he said, and apparently it was not.",
  },

  'lee-jin-hyung--park-ji-min--betrayal-s2-5': {
    label: 'Sold out her Pandora tip',
    description:
      "In Bloody Game 2, Park Ji-min was picked alongside Dex, the ex-UDT special forces presenter, as one of the first hidden players, and went into the mansion as the wild team's spy. On day two she shared a hint about Pandora's Box (판도라의 상자) with Lee Jin-hyung, and he passed it straight to the mansion side, which exposed her. Two days into an embedded assignment it was already over, and the suspicion it started never lifted off her for the rest of the season. They met once more, on day seven, when she came back as a phantom player in the phantom casino and played him again — and he won that one too. He finished the season as its champion.",
  },

  'lee-sang-min--hong-jin-ho--rivalry-6': {
    label: 'Genius rivals, real-life friends',
    description:
      "Three shared seasons of tvN's The Genius, and the defining rivalry of the series. They were both among the thirteen players in season 1, Rules of the Game (게임의 법칙, 2013), which Hong Jin-ho won with 79 garnets and a prize of 79 million won, while Lee Sang-min lost the episode-eleven Death Match to the broadcaster Kim Kyung-ran and finished third. The next year it inverted: Lee took season 2, Rule Breaker (룰 브레이커, 2013–14), on 62 garnets, beating the StarCraft professional Lim Yo-hwan in the final, and Hong went out mid-season. In 2015 both returned for the all-star season 4, Grand Final, one as the champion of season 1 and the other as the champion of season 2.",
  },

  'park-ji-min--jung-keun-woo--betrayal-s1-7': {
    label: 'Fake tears that ended his run',
    description:
      "They were two of the ten players in MBC's Bloody Game season 1 (2021) and the two poles it turned on: Jung Keun-woo ran his own alliance with Dex, the ex-UDT special forces presenter, and Park Jae-il, while Park Ji-min built the women's alliance with Song Seo-hyun and Queen WA$ABII on the other side. Early on she cooperated, handing his side what she had learned from Lee Tae-gyun on day two about the existence of extra votes. Then in day four's minefield game (지뢰게임) she broke the standing agreement, joined Heo Jun-young and pressed Jung's side to give up a man — they had been too close for too long, she told them. Jung, furious that they had agreed to betray each other with some manners about it, held out with Dex to stop the other side buying extra votes, then saw the women's alliance in tears, lost his nerve and chose his own elimination. The tears were staged, worked out by Park with Queen WA$ABII to break him without spending a won.",
  },

  'ha-seung-jin--yoon-bi--alliance-s2-8': {
    label: 'The poolside alliance',
    description:
      "They were two of the three axes of the pool alliance formed by Ha Seung-jin, Yoon Bi and the rapper Nucks at the poolside on the evening of day five in Bloody Game 2. The two worked together over the following days, and on day eight Ha was again moving as Yoon's partner. The alliance never took hold of the board, and once Ha went out first in a Death Match (데스매치), Yoon had the back half of the season to get through on his own.",
  },

  'ha-seung-jin--lee-gwan-hee--rivalry-9': {
    label: 'KBL rivals, then a YouTube feud',
    description:
      "Ha Seung-jin, a centre for Jeonju KCC taken first overall in the 2008 draft, and Lee Gwan-hee, a guard for Seoul Samsung taken fifth in the second round in 2011, spent years facing each other across a KBL floor. Setting aside Lee's military service with Sangmu (2014–16) and Ha's own, they were actually active together for seven seasons, and Ha retired after 2018-19. In April 2020, by then retired, Ha went on YouTube with the naturalised guard Jeon Tae-poong to lay out what was wrong with Korean basketball; Lee, still playing, posted a rebuttal video titled 'Korean basketball hasn't collapsed yet!' and said the argument had annoyed him because it risked belittling the effort of the players currently on court. Ha closed the row with a half-apology in the comments, telling Lee that his hyung had been short-sighted about it. Lee later turned up as a guest on Ha's own YouTube segment 'Ha Seung-jin Talk' (하승진톡) to say he had in fact agreed with Ha 200 per cent and had simply been speaking for the active players, and the whole thing ended warmly. These days Ha shows up in the chat during Lee's games to cheer him on.",
  },

  'hong-jin-ho--kim-kyung-hoon--prior-show-10': {
    label: 'Grand Final Death Match duel',
    description:
      "Both were among the thirteen players of The Genius season 4, Grand Final (tvN, 2015) — Hong Jin-ho as the champion of season 1, Kim Kyung-hoon as season 3's representative. In episode ten they both lost the main match, 'Co-op Hold'em' (협동홀덤), and met one on one in the Death Match, 'Two-Sided Poker' (양면포커). Kim won it and put Hong out. Going in, Kim made no secret of having been a genuine fan through seasons 1 and 2, or of what it meant to be playing Two-Sided Poker himself.",
  },

  'hong-jin-ho--kim-yoo-hyun--prior-show-11': {
    label: 'Genius all-stars, both poker pros',
    description:
      "They were both part of the thirteen-strong all-star cast of The Genius: Grand Final (tvN, 2015), Hong Jin-ho as the champion of season 1 and Kim Yoo-hyun as an alumnus of season 3, Black Garnet (블랙가넷). It went beyond sharing a call sheet: in the episode-two main match, 'Horror Racing' (공포 레이싱), Kim worked as Hong's strategist and the two ran that episode together, and his style of play drew comparisons with Hong's own from the early and middle stretch of season 1. Both are professional poker players — Hong won a WSOP bracelet in 2022, and Kim was already being introduced as a professional gambler when he appeared in 2015.",
  },

  'hong-jin-ho--park-ji-min--alliance-s2-12': {
    label: 'The original hidden four',
    description:
      "In Bloody Game 2 (2023, MBC and Wavve) Dex, the ex-UDT special forces presenter, and Park Ji-min were named hidden players first, and the pair of them then picked Hong Jin-ho and a fourth player, Shin Hyun-ji, to complete the original four. They started outside the mansion a full day ahead of the main group and became the core of the wild team, with Hong the brain running the board from outside. Park volunteered to go into the mansion as their spy, playing loyal on the inside while passing out information and supplies. The information went to the wild team as a whole rather than to Hong personally, though; there is no basis for saying he was her dedicated handler.",
  },

  'kim-kyung-hoon--kim-yoo-hyun--prior-show-13': {
    label: 'UIUC alumni, two Genius seasons',
    description:
      "They are alumni of the same university, Illinois Urbana-Champaign. Kim Kyung-hoon came through Minjok Leadership Academy and graduated in materials engineering, then took an integrated master's and doctoral course in chemical engineering at Seoul National University; Kim Yoo-hyun studied computer engineering at UIUC and left without finishing. On air they overlapped for two seasons — they met on tvN's The Genius: Black Garnet (더 지니어스: 블랙가넷) in 2014, and both appeared on the thirteen-player lineup of Grand Final the following year. Kim Kyung-hoon got in through an open selection for members of the public that drew 3,114 applicants. The claim that the two ran a private alliance of their own is not borne out.",
  },

  'park-ji-min--lee-tae-gyun--betrayal-s1-14': {
    label: 'From tipster to target',
    description:
      "They were in opposing alliances from day one of Bloody Game season 1 (2021) — Lee Tae-gyun with Choi Yeon-seung and Heo Jun-young in the men's alliance, Park Ji-min with Queen WA$ABII and Song Seo-hyun in the women's. They never formalised anything, but Lee treated her as a friendly: he passed her the hidden menu (히든 메뉴판) information on day two and talked her through the question of transferring money on day three, and she carried what she had straight over to the Jung Keun-woo alliance. On the terrace that third night, Park and Jung's alliance settled again on targeting Lee, and when the vote came she voted for him. He drew the most votes of anyone that day with eight and was duly nominated, though it did not put him out of the game; both of them reached the final four.",
  },

  'seo-chul-gu--yoon-bi--alliance-s2-15': {
    label: 'Recruited, then recruiter',
    description:
      "XITSUH and Yoon Bi were the two rappers the wild team abducted and turned in succession on the evenings of days two and three of Bloody Game 2. XITSUH, taken first, advised that being summoned outright makes a person more compliant than they expect — advice that helped bring Yoon across. Then on day six, in 'Real Time' (리얼 타임), Yoon leaned on his own side — Shin Hyun-ji and Dex, the ex-UDT special forces presenter — telling them he would name them for the Death Match (데스매치) if they did not betray their side; word of it reached Hong Jin-ho and XITSUH, and the two were finished with him. After Yoon's departure the wild team re-formed around Hong, Dex, Shin Hyun-ji and XITSUH.",
  },

  'seo-chul-gu--ha-seung-jin--rivalry-s2-16': {
    label: 'Would have hit anyone else',
    description:
      "During 'Day and Night' (낮과 밤), the day-eight Money Challenge (머니 챌린지) of Bloody Game 2, Ha Seung-jin threw open obstruction at the wild team as a whole: listening in on their conversations and cutting them off, taking their notes and hints, and drowning them out with shrieking and opera-volume noise. XITSUH took the brunt of it, isolated to the point that he could not get a sentence through to his own teammates; the official Wavve clip is titled, flatly, 'XITSUH, cut off even from talking to his own team'. None of it broke the written rules, but the backlash over the unwritten ones was heavy enough to produce articles questioning his character, and XITSUH said afterwards that if it had been anyone other than Seung-jin hyung, he would have hit him.",
  },

  'seo-chul-gu--heo-seong-beom--rivalry-s3-17': {
    label: 'Day 10, and the man who felt ignored',
    description:
      "They spent Bloody Game 3 (November 2024 – January 2025, Wavve) on opposite ground from day one — XITSUH started in the mansion of blood, Heo Seong-beom in the paradise of blood — and the production had already sorted them apart, billing XITSUH as an all-star and Heo as a new star. As the blocs formed later in the season XITSUH was the brain of the side around Hong Jin-ho and Heo went with the Jang Dong-min alliance. The one head-on clash between them came in day ten's 'Good and Evil': Heo said in interview that he had tried to explain his thinking and had simply been ignored. It was that game and no more — there is no season-long feud on record. Both then turned up as contestants on Netflix's Death Game: Bet Ten Million Won (데스게임: 천만원을 걸어라, 28 January – 1 April 2026) and its sequel Death Game 2: The Last Winner (데스게임2: 최후의 승자, 22 April – 17 June 2026), which makes three programmes running at the same table.",
  },

  'heo-seong-beom--choi-hye-sun--alliance-s3-33': {
    label: 'A day-one pact, broken by day eight',
    description:
      "Both started day one of Bloody Game 3 inside Paradise (피의 낙원). Choi Hye-sun had picked Heo Seong-beom out from the pre-game interviews alone as the player whose style matched hers, went looking for his trust first, and the two agreed that day to be the ally the other could ride all the way to the end. The line held even after the Day of the Raid sent Heo down to the ruins (잔해) on day three: on day five he came back to her with an offer to work together in the teams that would be reshuffled after the individual match — in effect, asking her to spy for the ruins. Then day eight split them, Heo into the Jang Dong-min alliance and Choi into Hong Jin-ho's, and they finished the season on opposite sides. The day-one promise was never kept, and it was never recorded as broken either.",
  },

  'jung-keun-woo--lee-tae-gyun--alliance-s1-34': {
    label: 'The basement team and a 22-card equation',
    description:
      "The place these two were actually on the same side in season 1 was not the mansion but the basement. Lee Tae-gyun went down on day three, having drawn the most votes; Jung Keun-woo went down on day four, having chosen his own elimination; and together with Lee Na-young and Choi Yeon-seung they made up the basement team. The episode showed the players already down there agreeing to greet Jung's arrival with a set of invented rules. The peak of the relationship is day eight's equation game in the disused factory: the basement team built an equation that spent all 22 of their cards without a single one left over, against the 16 the upstairs team used, and it was Lee Tae-gyun who closed that last equation out. The win sent the whole basement team up and the upstairs team down. The last two days Jung Keun-woo had in the game were, in effect, bought for him by Lee Tae-gyun's arithmetic.",
  },

  'ha-seung-jin--lee-jin-hyung--alliance-s2-18': {
    label: 'Secretly fed him information',
    description:
      "As of the Day of the Raid (습격의 날) on day three of Bloody Game 2, the two were grouped together on the mansion's inside team. In day six's money game, 'Real Time' (리얼 타임), Ha Seung-jin was outwardly part of the majority bloc trying to monopolise the time slots while quietly making contact with Lee Jin-hyung, by then squeezed into the minority, and handing him information. The motive was self-preservation — whichever side produced the winner and the elimination candidate, he did not want his own name called for the Death Match (데스매치) — and he was willing to risk finishing joint last to secure it.",
  },

  'ha-seung-jin--hyun-seong-joo--alliance-s2-19': {
    label: "Mansion men's alliance",
    description:
      "On the mansion team in Bloody Game 2, Ha Seung-jin and Hyun Seong-joo — Komong (코몽) — belonged to the men's alliance together with the rapper Nucks, Lee Jin-hyung, XITSUH and Yoon Bi. Namu Wiki sets out the factions inside the house as that alliance, plus solo play from the model Yurisa and the actor Fujii Mina, plus the two outcasts, Pi and Park Ji-min. The pair were on the inside team together and were pushed out of the mansion together after the raid. The alliance lost team game after team game, which earned it the names 'a household in pieces' (콩가루 집안) and 'the picket squad' (피켓단). No individual moment of loyalty or support between these two specifically is on record.",
  },

  'hong-jin-ho--ha-seung-jin--rivalry-s2-20': {
    label: 'Day 8 dirty-play showdown',
    description:
      "In the day-eight game 'Day and Night' (낮과 밤) of Bloody Game 2, Ha Seung-jin ran the dirty play that got nicknamed the Ha-pera (하페라) — eavesdropping on the other side, blocking them with his size, taking their notes and singing opera over them at volume. Hong Jin-ho broke it by producing the rule that when two contestants enter the voting room to transfer personal funds, no other contestant may follow them in. He was also the only player to answer back with outright swearing, and the sequence circulated widely as the dirty-play controversy. The clash was confined to that one game, though; it never became a season-long division.",
  },

  'hong-jin-ho--choi-hye-sun--alliance-s3-21': {
    label: 'He vouched for her',
    description:
      "In Bloody Game 3 the two sat in the Paradise alliance (낙원 연합) that Hong Jin-ho led, alongside Steve Yeh, XITSUH, Im Hyun-seo and Chungju-man, the civil-servant YouTuber, among others. When Steve Yeh and Joo Eon-gyu began treating Choi Hye-sun as a double agent, Hong put himself between them — he would believe a woman's tears once, he said — and talked the team into hearing her explanation. The infighting kept returning, and on day nine he dissolved the thing himself: team disbanded, every player for themselves. From that point he moved as a duo with Joo Eon-gyu.",
  },

  'hong-jin-ho--heo-seong-beom--rivalry-s3-22': {
    label: 'Started together, split apart',
    description:
      "Both began day one of Bloody Game 3 in Paradise (낙원). On day eight Heo Seong-beom joined the alliance around the comedian Jang Dong-min, which put him on the far side of the Jang Dong-min alliance against Hong Jin-ho alliance split that shaped the whole season. There is no record of a direct confrontation between the two; the opposition is a matter of which side of the board they stood on rather than of personal feeling.",
  },

  'hong-jin-ho--kim-nam-hee--alliance-23': {
    label: 'Time Hotel four-way alliance',
    description:
      "Both played the TVING original The Time Hotel (더 타임 호텔, 2023, ten contestants). Kim Nam-hee, the VIP on day one, first recruited the comedian Hwang Je-sung and the singer John Park, and those two in turn brought in Hong Jin-ho, completing a four-way alliance. Hong was the last piece and an indirect one, and the period in which the two were actually on the same side amounted to about a day: Kim went out on day two, after which the surviving three ran to the final without a fracture, under the nickname Hong-Hwang-John (홍황존). Note that this Kim Nam-hee is not the actor of the same name born in 1986 but the broadcaster born in 1989, a former SBS Sports announcer and a Mensa member.",
  },

  'hong-jin-ho--yoon-bi--alliance-s2-24': {
    label: 'Joined, then left the wild team',
    description:
      "In Bloody Game 2 (2023) Hong Jin-ho was in practice the leader of the wild team of hidden players, and Yoon Bi began on the mansion's inside team before being abducted as the second recruitment target after XITSUH and reassigned to the wild side. Around day six Yoon tried to play both the mansion and the wild team at once, fell out with XITSUH, and lost the wild team's trust in the process; Hong likewise pulled back once Yoon made plain how much he wanted to finish first.",
  },

  'hyun-seong-joo--seo-chul-gu--mentor-25': {
    label: 'Poker lessons, then a duel',
    description:
      "They met as fellow players on Bloody Game 2 (2023). Inside the season both started on the mansion team before XITSUH crossed to the wild team, which left them on opposite sides. Once it was over, XITSUH took up hold'em under the influence of Hong Jin-ho and of Hyun Seong-joo, the professional who plays as Komong (코몽), and says he asked both of them for feedback — Hyun's advice mostly encouragement, Hong's finely itemised. XITSUH later turned up as an opponent on the one-on-one hold'em challenge series on Hyun's poker YouTube channel Arte Poker (아르테포커) — one of a run of challengers that also took in the StarCraft professional Lim Yo-hwan and the poker player Kim Su-jo.",
  },

  'lee-jin-hyung--hyun-seong-joo--alliance-s2-26': {
    label: 'Same alliance, kept losing',
    description:
      "In the early mansion inside team of Bloody Game 2 (2023), Lee Jin-hyung and Hyun Seong-joo — Komong (코몽) — belonged to the men's alliance the house had split along gender lines, with Ha Seung-jin, the rapper Nucks, XITSUH and Yoon Bi. Straight after the Day of the Raid (습격의 날) the two went along with Ha in sending the model Yurisa down to the underground prison, and in the Money Challenge (머니 챌린지) 'Number Change' (넘버 체인지) it was Nucks and Lee who drove the team's strategy while Hyun followed it. That old mansion side lost the raid and then lost every subsequent team Money Challenge, a run bad enough to have it called 'a household in pieces' (콩가루 집안).",
  },

  'lee-sang-min--kim-yoo-hyun--prior-show-27': {
    label: 'Both on Genius Grand Final',
    description:
      "Both were on the thirteen-player all-star cast of The Genius season 4, Grand Final (tvN, 2015), and so played the same season directly. Lee Sang-min came in as the representative of season 2, having been through Rules of the Game (게임의 법칙) and Rule Breaker (룰 브레이커); Kim Yoo-hyun came in for season 3, Black Garnet (블랙가넷). Grand Final is the only season on which their credits meet.",
  },

  'seo-chul-gu--choi-hye-sun--alliance-s3-28': {
    label: 'He handed her the win',
    description:
      "Through the back half of Bloody Game 3 (Wavve, 2024–25) the two sat in the Paradise alliance (낙원 연합) together, and they stayed on the same side when it was rebuilt as the Hong Jin-ho alliance, seeing the season out together. The high point is day nine's 'Try13'. Choi Hye-sun rode the winning line XITSUH had worked out cleanly enough to take the season's first outright solo victory — and the price of it was that XITSUH had to burn his own alliance whole.",
  },

  'seo-chul-gu--lee-jin-hyung--rivalry-s2-29': {
    label: 'Exiled him, met him again',
    description:
      "In Bloody Game 2 (2023, Wavve) XITSUH started on the mansion team, was abducted and recruited by the wild team on the evenings of days two and three and changed sides, while Lee Jin-hyung stayed in the mansion. Mid-season, with consecutive wins in the equation-based Money Challenges (머니 챌린지) making him the power inside the house, XITSUH banished Lee out into the wild. They met again in the first final round at the end of the season, and this time Lee's double-declaration gambit took XITSUH apart.",
  },

  'lee-sang-min--lee-tae-gyun--co-season-s1-30': {
    label: 'Panel chief watched him win',
    description:
      "Lee Sang-min spent Bloody Game season 1 (MBC every1, 1 November 2021 – 24 January 2022) in the studio as head of the panel, the 'Brain Corps' (브레인 군단), commentating on the players alongside the comedian Jang Dong-min, the broadcaster Park Ji-yoon, the economics YouTuber Shuka World (슈카월드) and the singer Choi Yena. Lee Tae-gyun was a player in that same season, dropped down into the basement early and climbed back to take it. They shared a season and nothing more: the roles were separate — studio panel against player — and there is no evidence of direct interaction while the game was running.",
  },

  'lee-sang-min--park-ji-min--co-season-s1-31': {
    label: 'Watched her season from the panel',
    description:
      "In Bloody Game season 1, Lee Sang-min watched and commentated as head of the studio panel, the 'Brain Corps' (브레인 군단) — billed as the chief of a corps that lives and dies on instinct — while Park Ji-min, then an MBC announcer, was a player in the house. She is the one who turned 'I set this board up from the start, so just follow me' into one of the season's quoted lines. With one of them in the studio and the other in the mansion, though, they shared a season without ever playing one. Park returned as a player for season 2 as well, and that season had no panel seats at all.",
  },

  'ha-seung-jin--park-ji-min--rivalry-s2-32': {
    label: 'He voted her into the match',
    description:
      "In Bloody Game 2 (2023) Park Ji-min was the wild team's spy inside the mansion and Ha Seung-jin had been on the mansion team from the start, which set them directly against each other. Ha was the first person in the house to argue for voting along gender lines, on the grounds of the difference in head count between the men and the women, and when the vote came to decide who went to the Death Match (데스매치) he said her name. Park had been under suspicion from the opening days because of the reputation season 1 had fixed to her, and the first call against her in that house came out of his mouth. That said, Ha was not the leader of the mansion's men's alliance; Namu Wiki reads his season 2 as a supporting part.",
  },

  'heo-seong-beom--kang-ji-hoo--prior-show-35': {
    label: 'The KAIST seat, never the same season',
    description:
      "These two have never been in the same room. What they share is the KAIST seat on Coupang Play's University War (대학전쟁), handed on two seasons apart. Heo Seong-beom led the KAIST team in season 1 in 2023; Kang Ji-hoo played the KAIST team in season 3 across 2025–26 and finished third with it. They have never sat in the same season — the KAIST roster on University War 3 is Kang Ji-hoo, Kim Jae-han, Kim Ji-woo and Jeon Ji-min, Heo is not on it, no earlier contestant returned for that season, and it was hosted by Hwang In-sung. Count one more overlap and the route to the school matches too: Heo came through the Korea Science Academy into KAIST's School of Computing, Kang graduated early out of Gyeonggi Buk Science High School and entered KAIST's mathematical sciences department in 2022. They are the only two in this lineup who went from a science-gifted school to KAIST, and they were not even in the same department.",
  },

  'kim-nam-hee--choi-yeon-cheong--prior-show-36': {
    label: 'Two Mensa cards, never in the same room',
    description:
      "Nothing on record has ever put these two in the same room. This lineup holds two Mensa Korea members and these are the two, both reported at an IQ of 156, and both introduced in exactly those words in the casting announcement. There is a second overlap: Miss Korea. Choi Yeon-cheong competed in 2013 at nineteen, entering for North Jeolla, and Kim Nam-hee took Seon (善) and the friendship award at Miss Korea Seoul the following year, in 2014. Different region, different year: they were never on the stage at the same time. One year apart through the same gate, and the same membership card — but nothing on record puts them at the same pageant or the same programme. This is not a line that says they know each other; it is a line that says put them side by side and they are the same shape.",
  },

  'lee-jin-hyung--shin-seung-yong--prior-show-37': {
    label: 'Two doctors who have never met',
    description:
      "There is no record anywhere of these two meeting. There are two physicians in this lineup and even the university matches. Lee Jin-hyung came out of Seoul Science High School and entered Seoul National University's Liberal Studies programme with the 2014 intake, dropped out, posted a perfect score on the 2019 CSAT, re-entered as the 2019 intake of its medical school, and now practises dermatology in Cheongdam; Shin Seung-yong came out of Icheon High School, graduated from Seoul National University, and runs a clinic in Gangnam doing skin and hair work. Whether it was the same college is not established: his education reads 'Seoul National University, graduated' and stops there, and the two intakes are close to eight years apart. One of them has already won a season of this franchise and the other has never played it, and there is no record of the two meeting on a programme or in a hospital. The line does not mean they know each other. It means the same qualification is walking into the same house twice.",
  },

  'lee-sang-min--kwak-beom--prior-show-38': {
    label: 'Same classroom, fixed member and guest',
    description:
      "JTBC's Knowing Bros (아는 형님) is the only point of contact, and Kwak Beom has been in that classroom twice. Lee Sang-min joined as a fixed member in March 2016 and has been there ever since. Kwak's first visit was episode 469, on 15 February 2025, a futsal special — and he spent it in the commentary seat rather than the classroom. The time he actually sat in the room is episode 513, on 10 January 2026, the 'Hyungnim School joke war', where he came in as a transfer student alongside Shin Bong-sun, Yang Sang-guk, Lee Seon-min and Lee Jae-yul and recorded the whole episode. Nothing beyond those two days is on record between them. What they do share is a long stretch of surviving on being funny — Lee crossed over from the 1990s music industry and settled into variety, and Kwak failed auditions for four years before KBS took him into its 27th comedy class in 2012.",
  },

  'lee-sang-min--ha-seung-jin--prior-show-39': {
    label: 'One day in the same classroom',
    description:
      "Their only point of contact is also JTBC's Knowing Bros (아는 형님): Lee Sang-min a fixed member since March 2016, Ha Seung-jin a guest on episode 464, 11 January 2025, alongside Heo Kyung-hwan and Kim Yo-han. They were in the room together for that recording; a retired basketball player spending one day among variety regulars leaves no individual anecdote behind, and there is none. A third member of this lineup has been through the same classroom and did not overlap with him — Kwak Beom's first appearance is episode 469, five weeks later. Ha's own history in this cast runs through Bloody Game 2 and Lee's runs through the season 1 panel desk; the one thing joining the two of them sits outside the house entirely.",
  },
  'lee-tae-gyun--kim-yoo-hyun--prior-show-43': {
    label: 'Called to a board that never aired',
    description:
      "These two have sat at the same board, and the board was never broadcast. Both are on the cast list of Project Genius (프로젝트 지니어스), a brain-survival series shot by the YouTube channel TwoAces (투에이스) around May 2022. The eight names are Hong Jin-ho, Lee Doo-hee, Choi Yeon-seung, Kim Yoo-hyun, Kong Hyuk-joon, Jang Ji-soo, Hyun Seong-joo and Lee Tae-gyun — a casting that put the Genius line and the Bloody Game line at one table, since Choi Yeon-seung played season 1 alongside Lee Tae-gyun, and Hong Jin-ho and Hyun Seong-joo are on the list too. The production company suspended operations in 2024, the programme was never released, and nothing about what happened on that set survives anywhere. What this line records is not a result but a summons: the franchise's first champion and a professional gambler out of The Genius were called into the same room on the same day, four years ago.",
  },

  'hong-jin-ho--lee-tae-gyun--prior-show-45': {
    label: 'The first champion and Kong, one call sheet',
    description:
      "The franchise's first winner and the most-connected person in this house were called into the same room four years ago. Both are among the eight names on the cast list of Project Genius (프로젝트 지니어스), a brain-survival series shot around May 2022. The production company suspended operations in 2024 and the programme was never released, so there is no record of what passed between these two that day. What survives is the summons.",
  },

  'hyun-seong-joo--lee-tae-gyun--prior-show-46': {
    label: 'Two names on a board that never aired',
    description:
      "The season 1 winner and a professional poker player sit side by side on the eight-name cast list of Project Genius (프로젝트 지니어스), shot in 2022. It was filmed and never broadcast. Nothing is confirmed beyond the two of them being called to the same table on the same day.",
  },

  'hyun-seong-joo--kim-yoo-hyun--prior-show-47': {
    label: 'Two gamblers on the same list',
    description:
      "Both are on the eight-name Project Genius (프로젝트 지니어스) list from 2022 — named together off the poker side of the table. The board was never released, so how they actually played against each other is not on record anywhere.",
  },

  'lee-sang-min--jung-keun-woo--co-season-s1-40': {
    label: 'Same season, one desk and one house',
    description:
      "Both were in Bloody Game season 1 (MBC every1, 1 November 2021 – 24 January 2022) and neither was in the other's seat. Lee Sang-min headed the studio panel, the 'Brain Corps' (브레인 군단), alongside the comedian Jang Dong-min, the broadcaster Park Ji-yoon, the economics YouTuber Shuka World (슈카월드) and the singer Choi Yena; Jung Keun-woo was one of the ten players inside the mansion. The panel had no power to touch the game, so Lee watched Jung choose his own elimination on day four, go down to the basement and climb back up on day eight entirely through a monitor. They share a credit and nothing else — there is no evidence of direct interaction while the game ran. Lee Sang-min's tie to all three season 1 players in this cast is exactly this shape.",
  },

  'park-ji-min--heo-seong-beom--co-season-s3-41': {
    label: 'The dealer of the ruins, and a player sent down to it',
    description:
      "In Bloody Game 3 Park Ji-min was not a player but part of the machinery — billed by the production as the butler in charge of the phantom casino and the purgatory down in the ruins (잔해). Heo Seong-beom opened day one inside the paradise of blood and was sent down to the ruins after the Day of the Raid (습격의 날) on day three, and from that point the ground he was standing on was hers to run. The person who played two seasons and met the third from behind a dealer's table, and the youngest contestant in that season pushed down in front of it, were in the same frame. No individual exchange between the two is on record.",
  },

  'park-ji-min--choi-hye-sun--co-season-s3-42': {
    label: 'Where winning still sent her downstairs',
    description:
      "Choi Hye-sun won her day-one Death Match (데스매치) in Bloody Game 3 by 58 chips to 12 and the rules sent her down to the ruins (잔해) anyway — and the butler running the phantom casino and the purgatory down there was Park Ji-min. The woman who played seasons 1 and 2 and came out of them nicknamed the icon of betrayal (배신의 아이콘) was now turning other people's games for them, and Choi Hye-sun was one of the players who passed her table. Same season, different seats; nothing individual between them is on record.",
  },

  'lee-jin-hyung--hong-jin-ho--rivalry-s2-44': {
    label: 'Beaten 2:0, then cut loose',
    description:
      "The season's winner and its third place spent it on opposite sides. On day 4, in the money challenge Number Change, the two went out as their teams' first entrants: Lee announced he would spend the Hidden Chance just before submitting his blocks, trying to rattle Hong; Hong read the intent, expected an 8 or 9, and played 6 and 4 for ten. Lee had played 4 and 4 for eight — 2:0. On day 7 Hong went to Lee and Pi in person and warned that one of the two of them would be in danger if they did not vote for him; Lee, who had meant to vote Dex, took ten million won from XITSUH and voted Hong instead. On day 9's Main Color they were briefly allied in a four-man bloc, but Lee kept feeding remarks to the opposing side, so in the final round Hong sent XITSUH and Yoon Bi to tail him and then withdrew his trust outright: \"We can't believe a word you say now. And I can't help but treat you as hostile.\" Hong won the semifinal, which carried the right to choose the final's first-round game and set the bracket, and used it to put Lee against XITSUH in the harder Hidden Mission while taking Dex for himself — so the two never actually faced each other in the final.",
  },

  'hyun-seong-joo--yoon-bi--alliance-s2-45': {
    label: 'Close by the pool on day one',
    description:
      "In a post-season Q&A with Xports News (5 June 2023), Yoon Bi named Hyun Seong-joo outright as one of the people he grew close to in the mansion's first days: \"On the first day I drank whisky by the pool with Ha Seung-jin and Hyun Seong-joo, talked a great deal, and we became extremely close.\" They were on the same side only through day 2. That night Yoon was abducted by the hidden players — the second taken, after XITSUH — and his side changed for him; the next day's Raid result table has Hyun on the losing mansion team and Yoon on the winning outside one. Nucksal took the returning Yoon at his word; Hyun is recorded as not fully believing him. Hyun lost the day-5 death match to Fujii Mina 17:24 and went out third. After the season he appeared as a guest on Yoon Bi's Bloody Game 3 review broadcast.",
  },

  'park-ji-min--seo-chul-gu--rivalry-s2-46': {
    label: 'Taken out of the house as a throwaway card',
    description:
      "At the day-1 death-match vote Ha Seung-jin opened a men-against-women split, and XITSUH argued Fujii Mina should be the one sent — he later said his point was to get out of that framing, but the women in the house read it as the split itself. The \"aggression and the sudden flare-ups\" he showed at that vote got him marked by Park Ji-min, who was inside the mansion as the wild team's spy. That evening she scrapped the outside team's own plan — recruit Lee Jin-hyung, expected to be strong on the strength of his academic record — without consulting them, and picked XITSUH instead because he \"looked useful as a throwaway card,\" walking him out of the house. He followed her without argument and only understood once the hood came off and he was looking at open forest. In the official Q&A he said he was \"actually excited to be the first of the mansion players to know.\" His disappearance caused an uproar inside the house the next day, and Park — the last person seen talking to him — fell under suspicion for it.",
  },

  'park-ji-min--yoon-bi--rivalry-s2-47': {
    label: 'Two days, two votes against each other',
    description:
      "At the day-1 death-match vote Pi put Yoon Bi and Fujii Mina up as the two candidates, and Park Ji-min was the only one of ten voters to vote for Yoon (Yoon 1, Fujii Mina 9). Yoon himself voted for Fujii Mina. The next day, in the sealed auction for the round-2 running order in Ascending Order, Park — being pushed toward last place by Yurisa's Pandora's Box blackmail — bid ten million won of her own funds and offered to sign over the winner's prize on top, and was outbid by Ha Seung-jin at thirty million and Yoon Bi at twenty; her bid is recorded as failed. At that same day's death-match vote Yoon named Park, and she went to the death match on nine votes including her own, lost, and was eliminated. Yoon was abducted onto the outside team only after that vote, so the two were never on the same side.",
  },

  'park-ji-min--hyun-seong-joo--co-season-s2-48': {
    label: 'One vote of a unanimous nine',
    description:
      "After Ascending Order on day 2, Hyun Seong-joo named Park Ji-min in the death-match nomination vote. But that vote was unanimous — all nine players left in the mansion named her, her own vote among them — and namu.wiki itself describes his as following the majority. So it is a real act with a date, a game and a target, and it should not be read as a personal move against her. No confrontation between the two is recorded, and they never met in the ghost casino either: Park's opponent there was Lee Jin-hyung on day 7, while Hyun played XITSUH at dawn on day 10. This line claims only that the two were in the same season on opposite sides of it.",
  },
};
