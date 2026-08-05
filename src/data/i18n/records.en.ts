import type { SeasonRunEn } from './types';

/**
 * English accounts of what each returning player did in seasons 1–3.
 *
 * Keyed by the same person ids as `records.ts`, and the arrays are in the same
 * order as their Korean counterparts, so the two can be zipped index by index.
 * Facts — placements, scores, day numbers, sums of money — are carried across
 * unchanged; only the prose is authored fresh. Nothing here touches season X.
 */
export const recordsEn: Record<string, SeasonRunEn[]> = {
  'lee-sang-min': [
    {
      season: 1,
      placement: 'Studio panel',
      arc: "He never set foot in the mansion in season 1. He sat on a five-person studio panel alongside the comedian Jang Dong-min, the broadcaster Park Ji-yoon, the economics YouTuber Shuka World (슈카월드) and the singer Choi Yena, introduced as the head of the so-called 'Brain Corps' (브레인 군단). The panel had no power to intervene in the game at all; its entire function was to watch the house and talk over it. He has spent longer staring at this board than almost anyone in the franchise, and he has never once been caught on it.",
      beats: [
        "One of five studio panellists, billed as head of the 'Brain Corps' (브레인 군단)",
        'A commentary seat with no ability to touch the game',
        "Routinely miscredited as a player — he is not on season 1's list of ten contestants",
      ],
    },
  ],

  'park-ji-min': [
    {
      season: 1,
      placement: '4th of 10',
      arc: "She entered as an MBC announcer and became the largest single power in season 1. In the day-two distribution game the player holding the King card, Choi Yeon-seung, named her his Queen; she took what she knew straight to the rival alliance and sent him down to the basement on seven votes. On day four she produced tears on cue and talked Jung Keun-woo into eliminating himself, removing a competitor without spending a won of her own. She then won the Money Challenge (머니 챌린지) repeatedly and stockpiled immunity, and in a season that decided its eliminations by open vote she became the only contestant to reach the finale without ever drawing one. It ended with her finishing last of the four in the first final round.",
      beats: [
        'Day two: sold out Choi Yeon-seung, the King who had just made her his Queen',
        "Day four: staged tears that talked Jung Keun-woo into eliminating himself",
        "The only player to reach the final episode without drawing a single vote — hence 'Bat Ji-min' (박쥐민)",
      ],
    },
    {
      season: 2,
      placement: '13th of 13 — first player eliminated in season 2',
      arc: "She was season 2's biggest casting twist. To the house she was simply another member of the inside team; in fact she had started a day early out in the wild alongside Dex, the ex-UDT special forces presenter, and Hong Jin-ho, and her assignment was to feed the mansion's business back to the outside team. She passed Lee Jin-hyung a hint about Pandora's Box (판도라의 상자) and he turned it against her on the spot, which put her under suspicion from the opening days; isolated inside the house, she failed the assignment itself. When the house voted on who would go to the Death Match (데스매치), Ha Seung-jin — the first player in the mansion to argue for splitting the vote along gender lines — named her, and with the votes already stacked against her she named herself as well. She lost the match to the model Yurisa and became the first player eliminated in season 2, never seeing the Day of the Raid (습격의 날) she had helped design.",
      beats: [
        "A hidden-player spy passing as a member of the mansion's inside team",
        'Handed Lee Jin-hyung a hint and was betrayed with it',
        'First out, before the raid she helped plan ever happened',
      ],
    },
    {
      season: 3,
      placement: 'Host — dealer and butler',
      arc: "After two seasons as a player she moved behind the table, running the phantom casino built into the ruins (잔해) as its dealer and butler — dealing out to others the kind of game that had caught her twice. Returning contestants who remembered her from season 1 address her on camera by the name she earned back then, 'the icon of betrayal' (배신의 아이콘), and the edit leaves it in.",
      beats: [
        'Dealer and butler of the phantom casino down in the ruins',
        "Players calling her 'the icon of betrayal' made the broadcast intact",
        'The only person to appear in all three of seasons 1, 2 and 3',
      ],
    },
  ],

  'jung-keun-woo': [
    {
      season: 1,
      placement: '7th of 10',
      arc: "In the mansion he was panned for treating the whole thing with a shrug. On day four he joined a bluff intended to stop the other side buying extra votes, then saw Park Ji-min crying — an act, as it turned out — lost his nerve, said that betraying her a second time was not the decent thing to do, and chose his own elimination rather than go through with it, walking down to the basement. Underground he took everything the production put in front of him without complaint, invented rules and a fake class system included, and shouldered the physical labour, which reversed the mansion-era verdict on him completely. He climbed back to the upper floor on day eight and went out for good when the upstairs team lost on day nine.",
      beats: [
        'Chose his own elimination over a set of tears that were staged',
        'Rebuilt his reputation underground, playing along with rules the crew had invented',
        'Back upstairs on day eight, gone on day nine when the upstairs team lost',
      ],
    },
  ],

  'lee-tae-gyun': [
    {
      season: 1,
      placement: 'Winner — 1st of 10',
      arc: "He was among the first players thrown out of the mansion and won anyway. On day three a probing remark he made to Dex, the ex-UDT special forces presenter, was picked up on a hidden microphone, marked him as a traitor and sent him downstairs on what amounted to a unanimous vote. In the basement he cracked the safe combination on his own, then climbed the boiler-room shaft with nothing but his hands and recovered the real key hidden inside the living-room television, opening the basement team's route back up into the house. In the day-eight strategy-equation game he beat the upstairs team with a complete equation that left no card unused, and he won the second final round, 'Running Puzzle' (러닝 퍼즐), outright to take a prize of 108 million won.",
      beats: [
        'Day three: one overheard sentence, and the entire house voted him downstairs',
        'Climbed the boiler-room shaft by hand and pulled the real key out of the TV',
        "Won the 'Running Puzzle' (러닝 퍼즐) final clean — 108 million won",
      ],
    },
  ],

  'ha-seung-jin': [
    {
      season: 2,
      placement: '8th of 13 — sixth player eliminated',
      arc: "He arrived as the season's physical presence, billed on being the first Korean to reach the NBA. On the Day of the Raid (습격의 날) his size got him posted as the guard on his team's totem; Dex, the ex-UDT special forces presenter, got past him and broke it anyway, and Ha, convinced he was being mocked for it, grabbed him by the collar and the two had to be pulled apart — he apologised afterwards. He then built the pool alliance with the rapper Nucks and Yoon Bi, and pushed a plan to physically obstruct the opposing camp's communications during 'Day and Night' (낮과 밤), which drew enough of a backlash to put him up for elimination. He lost the 'Pattern Block' (패턴 블록) Death Match (데스매치) 4–1.",
      beats: [
        'The Day of the Raid: the totem broken, and a fight over the collar',
        'The pool alliance with Nucks and Yoon Bi',
        "Beaten 4–1 in the 'Pattern Block' (패턴 블록) Death Match",
      ],
    },
  ],

  'hyun-seong-joo': [
    {
      season: 2,
      placement: '11th of 13 — third player eliminated',
      arc: "He came in with a world poker title and an existing history with Hong Jin-ho from poker broadcasts, which the show promoted early as a duel between two professionals. He announced himself in the day-one Money Challenge (머니 챌린지) by working a gap in the rules rather than playing them straight, and inside the mansion he joined the effort to smoke out the spies. In the first Death Match (데스매치), 'Secret Dice' (시크릿 다이스), he claimed the special item before anyone else could and controlled the psychology of the table from end to end to survive. In the next one, 'Mystery Number' (미스터리 넘버), he lost 17–24. The reading was never his problem; the memorisation was.",
      beats: [
        'Day one: found the seam in the rules and played it',
        "Dominated the psychology of 'Secret Dice' (시크릿 다이스) and survived",
        "Lost 'Mystery Number' (미스터리 넘버) 17–24 — third player out",
      ],
    },
  ],

  'yoon-bi': [
    {
      season: 2,
      placement: '7th of 13 — conceded midway through his Death Match',
      arc: "He arrived holding a win from a web-variety survival show. He began on the mansion's inside team, was recruited by the hidden players on the night before the raid and crossed to the outside team, then broke away again to build the pool alliance with Ha Seung-jin and the rapper Nucks — he changed sides more than once. His high point was winning 'Day and Night' (낮과 밤): it brought him personal funds and immunity, made him the power inside the mansion, and let him banish XITSUH out into the wild, and he also opened Pandora's Box (판도라의 상자) on the quiet before anyone else, which forced every player's money to be redistributed in equal shares. Then Lee Jin-hyung, whom he had taken for an ally, named him for the Death Match (데스매치) — and, never having got hold of the rules, he declared his forfeit partway through the game.",
      beats: [
        "Won 'Day and Night' (낮과 밤), took the mansion, and banished XITSUH to the wild",
        "Opened Pandora's Box (판도라의 상자) in secret and flattened everyone's money into equal shares",
        'Named by the ally he trusted, Lee Jin-hyung, and conceded mid-Death Match',
      ],
    },
  ],

  'lee-jin-hyung': [
    {
      season: 2,
      placement: 'Winner — 1st of 13',
      arc: "He started inside the men's alliance and was expelled from it for refusing to carry the blame for a defeat; from there he assembled a much smaller minority bloc and survived by working the seams in the majority. In the back half of the season he was, in effect, its most productive killer — he put Yoon Bi, an ally by any reasonable reading, into the Death Match (데스매치), then dropped his last remaining partner himself, dismantling his own alliance with his own hands. He beat XITSUH 17–8 in the first final round and took the closing round, 'Jungle Maze' (정글 메이즈). His personal bank stood at zero, so he left with nothing beyond the 50 million won winner's prize, and his summing-up — that he had chosen an ugly victory over a beautiful defeat — split the audience sharply.",
      beats: [
        "Expelled from the men's alliance, rebuilt as a minority of a few",
        'Sent Yoon Bi to the Death Match, then finished off his last partner himself',
        'An ugly victory over a beautiful defeat — zero in the bank, 50 million won on the way out',
      ],
    },
  ],

  'hong-jin-ho': [
    {
      season: 2,
      placement: '3rd of 13',
      arc: "He was the oldest player in season 2 and the byword for the brain-survival genre, and he opened the season outside the house as a hidden player with Dex, the ex-UDT special forces presenter, and Park Ji-min, a full day ahead of everyone in the mansion. He worked the house night after night, pulled XITSUH and Yoon Bi across, and served as the political axis of the outside alliance. On the Day of the Raid (습격의 날) he went to check the CCTV, slipped on an unlit staircase and fractured his ankle; he played the rest of the season in a cast and on crutches. He came through the semi-final in first place, and then lost the first final round, 'Colour Turn' (컬러턴), on a misread of the rules — he was trying to build a line of four in any colour rather than in his own, and that was the difference.",
      beats: [
        'Started outside as a hidden player and recruited XITSUH and Yoon Bi',
        'Fractured his ankle on the stairs during the raid, then finished the season on crutches',
        "First out of the semi-final, then out of the season on a misread rule in 'Colour Turn' (컬러턴)",
      ],
    },
    {
      season: 3,
      placement: '3rd of 18',
      arc: "He finished third again in the all-star season. Last place in the day-one Money Challenge (머니 챌린지) dropped him straight into a Death Match (데스매치), where he paired with Choi Hye-sun and took the opposing pair apart, and he then opened his season with a piece of sleight of hand — passing off her win as his own and walking back into Paradise (낙원) as a spy. The middle of the season cost him: he was betrayed by Yurisa, the model he had trusted, and it visibly drained him. He came second out of the semi-final and went straight through to the final, where he failed to take a single round, finishing third for the second season running and hardening the perpetual-runner-up reputation around him.",
      beats: [
        'Hid a day-one Death Match win and walked back into Paradise as a spy',
        'Betrayed mid-season by Yurisa, and it cost him more than position',
        'Third two seasons in a row — and not one round won in the final',
      ],
    },
  ],

  'seo-chul-gu': [
    {
      season: 2,
      /* The parenthetical used to be the whole head of this string, because the
         surfaces that show only the head split on " · " or " — " and this one
         had neither. Em dash, so the Track record cell reads "4th of 13". */
      placement: '4th of 13 — his own entry lists him joint 3rd with Hong Jin-ho',
      arc: "He began on the mansion's inside team, was recruited by the hidden players in the nights before the raid, and crossed to the outside team, where he formed the season's tightest two-man pair with Hong Jin-ho and did most of the alliance's practical work. Arithmetic was his edge, so he dominated the equation-based Money Challenges (머니 챌린지), and consecutive wins made him the power inside the mansion — he used it to banish Lee Jin-hyung and then Yoon Bi out into the wild, laying out the board himself. In the first final round Lee Jin-hyung's double-declaration gambit caught him out and he lost 8–17. He ended the season with more money banked than any other contestant and, under winner-takes-all, took home nothing.",
      beats: [
        'The tightest two-man pair of the season, with Hong Jin-ho',
        'Took power in the mansion and banished Lee Jin-hyung and Yoon Bi to the wild',
        'Top of the money table, zero won in hand — winner-takes-all',
      ],
    },
    {
      season: 3,
      placement: '6th of 18',
      arc: "His placement is the one most easily misread. He lost the day-two Death Match (데스매치) and the caption said eliminated, but in season 3 that was not a full exit — it meant the underground prison, and he came out of the day-four Death Match in first place and back into the game. Once returned he was the alliance's calculator and effectively its brain. On day nine, in 'Try13', the winning line he worked out burned his own alliance to the ground and handed Choi Hye-sun a solo victory. When the written-communication rule (필담) turned into a dispute, he told the production not to cut it and to put the whole exchange on air, and the scene ran in full.",
      beats: [
        'Eliminated on day two, jailed underground, back in first place on day four',
        "Solved 'Try13' so thoroughly it burned his own alliance and crowned Choi Hye-sun",
        'Told the crew not to edit the written-note row — and it aired whole',
      ],
    },
  ],

  'choi-hye-sun': [
    {
      season: 3,
      placement: '10th of 18',
      arc: "On day one she went into a Death Match (데스매치) for Paradise (낙원) paired with Hong Jin-ho and destroyed the opposing pair 58 chips to 12 — and the rules still sent her down to the ruins (잔해), while Hong Jin-ho passed her win off as his own and kept his place upstairs. Through the middle of the season her footing shifted every time the strongholds were redrawn, but she attached herself to the bloc around XITSUH and Chungju-man, the civil-servant YouTuber, and held her line above elimination. Her peak was day nine's 'Try13', where she rode XITSUH's winning formula cleanly to 75 points and the season's first outright solo win, worth 20 million won and two immunity passes. The very next day, in the Death Match, she walled in one of her own tiles and cut off her own scoring route, finished bottom and went out.",
      beats: [
        'Won her day-one Death Match 58 chips to 12 and was sent down to the ruins regardless',
        "Day nine's 'Try13': 75 points, 20 million won and two immunity passes",
        'Out the following day, having boxed in her own tile',
      ],
    },
  ],

  'heo-seong-beom': [
    {
      season: 3,
      placement: '4th of 18',
      arc: "He started on 5 million won, the smallest bank among the eighteen players, and dragged his whole season upward on individual-game strength, winning the Money Challenge (머니 챌린지) four times to tie the season's high. His reward for winning on day two was Pandora's Box (판도라의 상자), and of all the faces available he opened the penalty one, which rewrote the conditions under which Paradise (낙원) could defend itself against the raid and remained a live variable through the middle of the season. He came second out of the semi-final and into the final, where a transcription slip in the first round — one character missing from the title of a work — proved decisive, and he closed out fourth without a single round win to his name.",
      beats: [
        'Started on the smallest bank in the house, 5 million won, and won four Money Challenges',
        "Opened the penalty face of Pandora's Box and inverted Paradise's raid defence",
        'Final round one: one character short in a title, and that was the season',
      ],
    },
  ],
};
