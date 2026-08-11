# 피의 게임X · Cast Atlas

An interactive atlas of the twenty players announced for **피의 게임X** (*Bloody Game X*, Wavve,
2026) — who they are, where each of them came from, and every alliance, betrayal and shared stage
that connects them **to each other before the season started**.

```bash
npm install
npm run dev
```

## The spoiler rule

This is the constraint the whole project is built around:

> **The nodes are season X's cast. Everything else predates season X.**

The cast list and the five-team lineup are public pre-premiere announcements. Every biography,
placement, alliance and betrayal shown in the app comes from **seasons 1–3** of the franchise, from
other programmes, or from real-life history. Nothing that happens *inside* season X appears
anywhere: no results, no eliminations, no standings, no episode events, no mission outcomes.

Anyone editing `src/data/` must hold that line. When in doubt, leave it out.

## Reading the graph

| Encoding | Meaning |
| --- | --- |
| Node size | How connected that person is, blended with how much franchise history they carry |
| Ring colour | Background — comedian, athlete, esports, poker, creator… |
| Arcs around a node | Which prior seasons of 피의 게임 they played |
| Brass halo | Won a previous season |
| Dashed rim | Franchise newcomer — no 피의 게임 history yet |
| Line colour | Relationship type |
| Dashed line | History from outside the house |
| Arrowhead | Direction — who did what to whom |
| Row along the bottom | The four with no verified tie to anyone else in the cast |

## Things it does that a node-link diagram usually doesn't

**Trace a connection.** Select someone, then shift-click anybody else. The app finds the shortest
chain of *real, sourced* relationships between the two and lights only that route:
Hong Jin-ho → *The Genius* → Lee Sang-min → *the season 1 panel* → Jung Keun-woo. If no chain
exists it says so rather than drawing nothing.

**The cast wall** (`G`). Every player as a portrait plate, grouped by lineup bloc.

**Generated portraits.** The plates are not photographs — press and broadcast stills of the cast are
third-party copyright, and twenty scraped images would look like twenty different photographers.
Each plate is drawn from that person's own record instead: one ring arc per prior season with its
sweep set by how far they got, a rim tick for every verified connection coloured by its type, a
brass laurel for past winners, a dashed rim for newcomers, over a stroke field seeded from their id
so it is unique and stable. `Person.portraitUrl` slots a licensed photo into the same frame if one
ever exists.

**Korean and English.** Both are authored, not machine-translated: twenty biographies, sixteen
season accounts and the whole interface exist in both. Korean remains the source of record for
facts; where an English string is genuinely missing, the Korean shows rather than a blank.

## Layouts

| Key | Mode | What it shows |
| --- | --- | --- |
| `1` | 관계망 · Web | Pure force-directed. The natural shape of the cast. |
| `2` | 시즌별 · By season | Bands by prior season; crossover players fall into the gaps. |
| `3` | 직업군별 · By background | Clusters by what they do for a living. |
| `4` | 인물 중심 · Orbit | Ego network of the selected person, ringed by tie strength. |

## Shortcuts

`⌘K` / `/` search · `1`–`4` layouts · `G` cast wall · `F` fit · `+` `−` zoom · `[` rail · `?` help ·
`Esc` deselect · `Backspace` previous person · drag to pan · drag a node to move it ·
`Shift`+click a second person to trace how they connect

## Layout of the code

```
src/
  data/        types.ts — the schema · dataset.ts — the researched content
  graph/       build.ts   dataset → renderable nodes/links
               layout.ts  anchor positions per layout mode
               render.ts  the canvas painter (world space + screen space)
               GraphCanvas.tsx  simulation, camera, pointer + keyboard
  state/       useAtlas.ts — selection, filters, search, history
  components/  the chrome: TopBar, FilterRail, Dossier, HoverCard,
               CommandPalette, AboutSheet, Intro, StatusBar
  styles/      tokens.css — the design system · base.css · app.css
tools/
  shots.mjs    Playwright harness: drives the app through every key state
               and writes shots/*.png for design review
```

## Sourcing

Every person and every connection carries a `confidence` field and a source list. Ties were found
by independent multi-angle research passes and then put through an adversarial pass whose explicit
job was to *refute* them. Of 89 candidate ties, 8 were killed outright — including two that turned
out to be fabricated — and a later consolidation pass merged 8 duplicate pairs and deleted 11 more
that said nothing beyond "they were both there", leaving **33**. The edge count was never a target.

Placements went through a separate adjudication against the season result tables, because the first
research pass produced six mutually contradictory answers. `src/data/records.ts` is the single
source of truth for every finish; edge descriptions deliberately do not restate them.

Four of the twenty have no verified tie to anyone else in the cast. That is a finding, not a hole:
shared schools and shared credentials were checked and deliberately not counted as relationships,
so the app says "no tie found in public sources" rather than inventing one. Those four get their
own labelled row in the graph.

## Live

- **App** — https://bloody-game-x.vercel.app
- **Source** — https://github.com/hyelinlee-code/bloody-game-x
