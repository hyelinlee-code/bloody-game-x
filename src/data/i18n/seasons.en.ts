import type { FranchiseEn, GlossaryEn, SeasonMetaEn } from './types';

/**
 * English for `src/data/seasons.ts` — the three season cards, the glossary and
 * the franchise copy.
 *
 * Seasons are keyed by season number and glossary entries by the Korean term
 * exactly as it appears in the Korean source, so the two files can be looked up
 * against each other without a mapping table. Every figure — prize money,
 * episode counts, day numbers — is carried across unchanged. Nothing here
 * describes anything inside season X.
 */
export const seasonsEn: Record<number, SeasonMetaEn> = {
  1: { scope: ['bg1'], scopes: { prize: ['bg1'], signatureMoment: ['bg1'] },
    season: 1,
    hook: 'A mansion and a basement. Two classes, manufactured inside one house.',
    format:
      "The contestants share a single house, but not on equal terms. Some are sent down to the basement to live in markedly worse conditions, and that gap is itself the currency everyone negotiates in. The shared prize pool shrinks as the days pass, so outlasting the field is not by itself a way to win, and whoever leaves is settled in a Death Match (데스매치). The casting leaned on ordinary members of the public rather than broadcast names, which gives season 1 a different grain from everything that came after it.",
    prize: "Winner's prize of roughly 108 million won",
    episodes: '12 episodes plus a special',
    signatureMoment:
      'Voted downstairs on day three by the whole house, Lee Tae-gyun climbed the boiler-room shaft with nothing but his hands and came back up holding the real key, hidden inside the living-room television.',
  },
  2: { scope: ['bg2'], scopes: { prize: ['bg2'], signatureMoment: ['bg2'] },
    season: 2,
    hook: 'Some of them had already been playing for a day, outside the house.',
    format:
      "Season 2 keeps the mansion-and-basement architecture and lays the hidden player device on top of it. A handful of contestants begin a full day early out beyond the walls and only join the house later, which means the people inside build their plans without knowing that the list of names they hold is incomplete. The production also stated its principle out loud: inside the rules, nothing a player does to survive will be held against them. The scheming and the alliances are correspondingly more naked than season 1's.",
    prize: 'Up to 300 million won',
    episodes: '14 episodes (13 main plus one behind-the-scenes)',
    signatureMoment:
      'On the Day of the Raid (습격의 날), the hidden players who had started a day early outside opened the mansion door and walked in — and every list and every calculation drawn up inside went void at once.',
  },
  3: { scope: ['bg3'], scopes: { prize: ['bg3'], signatureMoment: ['bg3'] },
    season: 3,
    hook: 'An all-star season, cast entirely out of survival-show legends.',
    format:
      "This is the season where the casting philosophy changed outright. Where the early seasons filled the house with members of the public, season 3 assembles players who had already made their names across the brain-survival shows, and the fact that they arrive knowing one another's habits changes the game itself. The rules were rewritten so that the funds a player accumulates have no direct bearing on the final winner's prize, which splits getting rich from getting out on top. The strongholds were renamed as well: the upper side, where conditions are guaranteed, is Paradise (낙원), and the side that gets pushed out lives in the ruins (잔해). The ruins came with a phantom casino staffed from the house side rather than by players, so the side that had been pushed down was still tied to the board.",
    prize: "Winner's prize undisclosed",
    episodes: '15 episodes (14 main plus one behind-the-scenes)',
    signatureMoment:
      'Jang Dong-min (comedian) swept five immunity passes out of eight Money Challenges (머니 챌린지), and then ended the final itself early, by cold game.',
  },
};

/** The vocabulary a viewer needs before the graph makes sense. */
export const glossaryEn: Record<string, GlossaryEn> = {
  '저택': {
    termKo: '저택', scope: [],
    meaning:
      'The upstairs space the contestants live in together, and the side where food and a bed are guaranteed. Staying in it is itself a form of power.',
  },
  '지하실': {
    termKo: '지하실', scope: [],
    meaning:
      'The lower floor that anyone forced out of the mansion goes down to. Conditions there are far harsher, and without negotiating with the floor above it is difficult to turn anything around.',
  },
  '낙원': {
    termKo: '낙원', scope: [],
    meaning:
      "The upper stronghold that inherited the mansion's role in season 3; its full name is 'Paradise of Blood' (피의 낙원). For as long as a player is in it, living conditions and a say in the game come together.",
  },
  '잔해': {
    termKo: '잔해', scope: [],
    meaning:
      'The derelict stronghold in season 3 that players pushed out of Paradise descend into. Unlike the basement, going down there is not the same as being eliminated, and the routes back up out of the ruins are what makes the middle of the season.',
  },
  '데스매치': {
    termKo: '데스매치', scope: [],
    meaning:
      "The one-on-one, or small-group, contest that decides who leaves. Most of a season's conflict is generated by the process of deciding who gets sent into it.",
  },
  '머니 챌린지': {
    termKo: '머니 챌린지', scope: [],
    meaning:
      "Each episode's main contest, with funds and control of the mansion staked on it at the same time. The top finishers take money and immunity passes and the bottom finishers become Death Match candidates on the spot, so a single round can redraw the whole of that day's politics.",
  },
  '면제권': {
    termKo: '면제권', scope: [],
    meaning:
      'The right to sit out a nomination or a Death Match, handed out mainly as a Money Challenge reward. It is leverage even when it is never played, which is why the house keeps a running count of who is holding how many.',
  },
  '판도라의 상자': {
    termKo: '판도라의 상자', scope: [],
    meaning:
      "A random device dressed up as a reward, and not everything inside it is good. In season 2, opening it forced every player's funds to be redistributed in equal shares; in season 3 a penalty face came up and inverted the terms on which Paradise could defend itself.",
  },
  '습격의 날': {
    termKo: '습격의 날', scope: [],
    meaning:
      "Season 2's hinge — the day the side that started outside comes for the mansion directly. From that point the inside/outside structure collapses and every alliance built up to then is drawn again from scratch.",
  },
  '상금': {
    termKo: '상금', scope: ['bg1', 'bg2'],
    meaning:
      "The shared prize pool, which shrinks as the days pass. Sitting still costs money, and that pressure is what keeps the board moving. The figures look different from season to season because they are counted differently: season 1's 108 million won is what the winner actually took home, season 2's 300 million was only the maximum on the table and not the 50 million won that was actually paid out, and season 3 never disclosed a figure at all.",
  },
  '개인 자금': {
    termKo: '개인 자금', scope: ['bg2'],
    meaning:
      "A player's own pot — the money they earn, spend and have taken off them inside the game. In season 2 that pot only turned into prize money if you won, so XITSUH, who finished with the largest balance of anyone in the house, was paid nothing whatsoever, while Lee Jin-hyung won with zero in the bank and left with the 50 million won winner's prize and not a won more.",
  },
  '승자독식': {
    termKo: '승자독식', scope: [],
    meaning:
      'The principle that the prize goes to the winner and nobody else. Second place and below finish on zero however long they lasted and however much they piled up, which is why season 3 changed the rules so that personal funds no longer feed the final prize at all — separating the business of making money from the business of winning.',
  },
  '히든 플레이어': {
    termKo: '히든 플레이어', scope: [],
    meaning:
      'The device introduced in season 2: a contestant who starts the game outside the mansion and joins it late. Their existence voids the list of names the people inside believe they are playing against.',
  },
  '연합': {
    termKo: '연합', scope: [],
    meaning:
      'A temporary pact to vote as a bloc. In Bloody Game they break almost without exception, and the way a given one breaks becomes the story of that season.',
  },
  '올스타전': {
    termKo: '올스타전', scope: [],
    meaning:
      "The casting direction that came into focus from season 3 on. It gathers players already proven on other survival shows, so that everyone begins already knowing everyone else's strategy.",
  },
};

export const franchiseEn: FranchiseEn = {
  premise:
    'Bloody Game begins by putting its contestants in one house and then designing that house to be unequal on purpose. Living conditions split between the mansion upstairs and the basement below, the shared prize pool shrinks the longer the season runs, and whoever leaves is decided in a Death Match (데스매치). It is not a structure anyone wins on stamina or on intelligence alone; the outcome comes out of whose hand you take and when you let go of it. Which is why what gets remembered from this franchise is, as a rule, not the winner but the betrayal.',
  lineage:
    "In the lineage of Korean brain-survival shows, Bloody Game takes over the board The Genius built and moves it into a living space. Where The Genius engineered an intricately ruled game every week, Bloody Game makes a weapon of the environment rather than the rules — hunger, a place to sleep and the gap between classes are the bargaining chips. The casting has shifted across the seasons too, from members of the public towards players carrying names made on other survival shows, and the result is that the franchise now functions as the crossing point of the genre, the room the whole cast list ends up in.",
  reception:
    'It settled in as a Wavve original and drew more attention with each season, with community reaction concentrating, reliably, on the episodes where an alliance or a betrayal came into the open.',
};
