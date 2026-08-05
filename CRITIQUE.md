# CRITIQUE — round 12

Five independent reviewers.


---

## reviewer 1 — 8/10

**Verdict:** The prose and the derived layers are flagship-grade reference work, but the app's central editorial claim — that every record carries the page it was written from — is quietly untrue in two places: the 77%-namu.wiki provenance paragraph is authored, build-validated and never rendered, and seven of the twenty-one "record elsewhere" essays ship with no citation at all.

**Biggest single win:** Render `meta.sourcing` in the Sources panel and then add the missing `sources` arrays to the seven uncited priorElsewhere essays. It is a four-line component change plus fourteen URLs already declared at the top of people.ts, and it closes the one gap between what this atlas claims about its own evidence and what it actually shows — which is the single thing separating it from a reference work you would cite.

### Working
- The season arcs do what almost no fan wiki does: they name the moment. 이태균 climbing the boiler-room shaft to pull the real key out of the living-room TV; 최혜선 winning her day-one Death Match 58 chips to 12 and being sent down anyway; 홍진호 fracturing an ankle on the CCTV stairs and finishing the season on crutches; 허성범 losing the final round on one dropped syllable of a title. Sixteen runs, sixteen specifics, no hedging.
- headToHead.ts is a genuine analytical contribution rather than a data dump: duels are authored (only the source's own scoreline), field results are derived, `unadjudicated` exists so a "2–0" can say what it is not holding, and `share` (outlasted / field size, summed) is the first number in any Bloody Game reference that makes 3rd-of-13-twice and 4th-of-18-once comparable.
- The honesty apparatus is unusually rigorous and mostly user-visible: the `parallel` type exists precisely so a non-meeting cannot be counted as a tie, 서출구's season-2 placement preserves the source disagreement inside the placement string, the glossary entry for 상금 explains why the three seasons' prize figures are not comparable, and the Sources tab volunteers that the twenty portraits carry no credit, source or licence.
- Bilingual parity is complete at the data level and does not thin out: 47/47 edge descriptions, 16/16 season arcs with beats, 20/20 bios and credential lists, plus full English glossary, franchise copy and season formats. The English is written, not translated — "He won the house and went back to work" is not a rendering of the Korean.

### Defects

#### [blocker] The provenance paragraph — the app's single most important editorial disclosure — is never rendered anywhere
`src/data/dataset.ts`

*Evidence:* Playwright dump of the About sheet, Sources tab, EN and the grep for `sourcing` across src/

**Wrong:** `meta.sourcing` / `meta.sourcingEn` carries the paragraph that says 223 of 290 citations (about 77%) are namu.wiki, that namu.wiki is a wiki anyone can edit, that the five betrayal edges each carry a non-wiki source, and that fifteen ties marked 확인됨 still stand on wiki citations alone. Grepping the whole of src/ for `sourcing` outside the data files returns exactly one hit, and it is a code comment. I drove the running app and dumped every About tab: What this is, Seasons, Track record, Glossary, The franchise, Shortcuts and Sources. The Sources tab prints the portraits notice and seven top-level links and nothing about evidence quality. The paragraph is dead data that the build check (validate-data section 9) nevertheless asserts against the live citation count.

**Matters:** The whole product prints 확인된 인연 / 'verified' on every tick of every rim and puts a `confidence` field on every edge. A reader who trusts that apparatus has no way to learn that three quarters of it rests on a crowd-editable wiki whose season pages keep moving — which is exactly the thing the editor already wrote down and already measured. It also has a downstream cost: three data-file comments (edges.ts:1073, edges.ts:1123, people.ts:227) cite this invisible paragraph as the reason they cannot add citations, and one of them quotes stale arithmetic ('287건 중 220건') that no longer matches dataset.ts. Work is being blocked to protect the accuracy of prose nobody can read.

**Fix:** Render it in the Sources panel, above the link list and above the portraits block, as the first thing under `about.sourcesHeading` — `<p className="abt-prose">{bilingual(meta.sourcing, meta.sourcingEn)}</p>` in `sourcesPanel()` in src/components/AboutSheet.tsx (~line 1704), the same treatment `policy` already gets on the What-this-is tab at line 575. Once it is visible, the citation arithmetic becomes a normal edit rather than a cross-file blocker.

#### [major] Seven of the twenty-one 바깥에서의 기록 essays carry no sources at all
`src/data/people.ts`

*Evidence:* Structural scan of every priorElsewhere block in people.ts; 강지후 dossier dump showing the per-block 'Sources 1' row that these seven lack

**Wrong:** 박지민, 정근우, 이태균, 윤비, 서출구, 최혜선 and 허성범 each have a `priorElsewhere` block with no `sources` array. These are the longest continuous prose in each of those dossiers (200–300 words) and they make hard, checkable claims: 정근우's Beijing 2008 gold and repeat Golden Gloves, 최혜선's Durham MSc and London teaching hospital, 허성범's Calvin Klein and LG Gram modelling, 서출구's Brigham Young enrolment and withdrawal. The dossier renders a per-block source count (강지후's University War 3 block shows 'Sources 1'); on these seven the row is simply absent. The comment at people.ts:227–234 says this is deliberate — 'SOURCES PENDING, DELIBERATELY' — because adding references would change the citation totals printed by `dataset.meta.sourcing`.

**Matters:** records.ts's own header states the rule: 'EVERY RUN CARRIES ITS OWN CITATIONS… the longest and most argued-over prose in the app was the only text in it with no source list.' That defect was fixed for season runs and then reintroduced one section lower, on essays of comparable length about the same people. A third of the atlas's biographical prose is uncited in a product that treats citation as its differentiator, and the stated reason is bookkeeping against a paragraph no user sees (see the blocker above).

**Fix:** Add `sources` to each of the seven from the URLs already declared at the top of the file and already on each person's own `sources` array — e.g. 정근우 → [NAMU_JKW, NAMU_BASEBALL_LEAGUE]; 이태균 → [NAMU_PROJECT_GENIUS, `${NAMU}(시즌%201)`]; 최혜선 → [`${NAMU}3`, LINEUP_1]; 서출구 → ['https://namu.wiki/w/서출구', NAMU_DEATHGAME]; 허성범 → [NAMU_UNIWAR_3-equivalent 대학전쟁 page, NAMU_DEATHGAME]; 윤비 → ['https://ko.wikipedia.org/wiki/윤비']; 박지민 → ['https://namu.wiki/w/박지민(아나운서)']. Then re-run `npx tsx tools/validate-data.mjs` and update the three numbers in `meta.sourcing`/`sourcingEn` in the same commit.

#### [major] The Track record table hides half the cast, including the most decorated brain-survival player in the lineup after 홍진호
`src/data/headToHead.ts`

*Evidence:* headToHead.ts:288–318; Playwright dump of the About sheet, Track record tab

**Wrong:** `CareerRecord` is built only from `records[p.id]`, so `careerTable` contains the twelve franchise returners and the tab closes with 'Everyone else in the lineup is new to the franchise.' But four of the eight excluded people have machine-readable ranked finishes in `otherShows` that headToHead already reads for its field results: 김경훈 (Genius Grand Final, runner-up, rank 2 of 13; Black Garnet, 12th), 김유현 (5th, then 9th of 13), 이상민 (Genius S1 3rd of 13, S2 winner), 홍진호 (S1 winner of 13, S4 4th of 13). 김경훈 — a Grand Final runner-up who won all three of his Death Matches — appears in no track-record table anywhere in the app.

**Matters:** A fan opening 'Track record' is asking who in this house has actually won things. The tab answers for twelve people and tells them the other eight are blank, when the dataset already knows that one of the eight was runner-up of the last season of The Genius and another has a KAIST-team third place. It makes a research gap out of data that is present, indexed and already used elsewhere in the same file.

**Fix:** Extend `CareerRecord` with an `elsewhere` block computed the same way from `ExternalShow.rank`/`fieldSize` (the ingredients are already gathered in the outside-field loop at headToHead.ts:139–168), and add a second section to the Track record panel — 'Elsewhere in the genre' — with the same Best-finish / Outlasted columns. While there, add `rank: 3` (and a `fieldSize` if a source gives one) to 강지후's 대학전쟁3 row in people.ts:762, which currently states the third place only in the prose `result` string so nothing derived can see it.

#### [major] 라이벌 / 'Sustained head-to-head antagonism' overclaims on four of its seven edges, three of which say so in their own text
`src/data/i18n/ui.ts`

*Evidence:* src/data/i18n/ui.ts:1319–1348 against the seven rivalry descriptions in edges.ts; FilterRail dump showing 'Rivalry 7 — Sustained head-to-head antagonism'

**Wrong:** `EDGE_GLOSS_I18N.rivalry` reads 시즌 내내 정면으로 부딪친 관계 / 'Sustained head-to-head antagonism'. Four of the seven rivalry edges document a single incident, and three state it outright in the description the reader sees on the same card: 홍진호×하승진 — '기록에 남은 두 사람의 정면 충돌은 이 한 게임이고'; 서출구×허성범 — '기록에 남은 두 사람의 정면 마찰은 10일차 \'선과 악\' 한 판이다'; 서출구×하승진 — one Money Challenge on day 8; 하승진×박지민 — one vote in one nomination. edges.ts's own comment at line 638 says exactly this reasoning is why 홍진호×허성범 was retyped to `co-season`, and closes 'when the vocabulary over-claims, change the word, not the paragraph' — then the four remaining cases had their paragraphs rewritten and their type left alone.

**Matters:** edges.ts states that filtering to 라이벌 is 'the single most likely thing a fan does with this app'. Doing it now returns seven pairs of which four are one-off clashes, and the legend beside them promises season-long antagonism. That is the legend contradicting the paragraph under it — the precise failure mode the file already caught once and documented.

**Fix:** Cheapest correct fix: widen the gloss to what all seven actually support — 정면으로 부딪친 기록이 남아 있는 관계 / 'A documented head-to-head clash' — in EDGE_GLOSS_I18N (ui.ts:1323 and :1337). If the stronger reading is wanted, retype 하승진×박지민 (one vote) and 서출구×하승진 (one game) to `co-season` and leave 홍진호×하승진 and 서출구×허성범 as rivalries on the strength of their being the most-replayed confrontations of their seasons. Same audit applies to `alliance`, whose gloss says 'Played together inside the house' while 홍진호×김남희 is a 더 타임호텔 alliance with `season: 0`.

#### [major] The negative research — the best material about the three cold-band players — is trapped in a code comment
`src/data/edges.ts`

*Evidence:* src/data/edges.ts:926–967 vs the 강지후 dossier dump (EN), 'Walks in cold' section

**Wrong:** Lines 926–967 hold a superb, specific account of what was searched and came back empty for 강지후, 신승용 and 최연청: the KAIST four of all three 대학전쟁 seasons named out, 황인성 hosting all three so there is no shared-MC route, the entire 환승연애4 cast read out by name, 퀸승용's documented guests, 최연청's two agencies and four music videos, and the one near-miss that was rejected on principle (이진형 suggesting 강지후's channel name, undated, therefore unusable). None of it reaches the screen. The dossier's cold-band copy is one generic sentence — 'No shared credit and no documented working relationship with any of the other nineteen turned up in public sources' — identical for all three.

**Matters:** 'We looked and there is nothing' is a weak claim; 'we read out the eleven names on the 환승연애4 cast list and none of them is in this house' is a strong one, and it is already written. Three of twenty people — 15% of the cast — get the app's thinnest page precisely where the editor has the app's most interesting unpublished paragraph. It is also the difference between the cold band reading as an editorial finding and reading as missing data, which is the exact distinction the brief asks the product to make legible.

**Fix:** Add an optional `checked?: { ko: string; en: string }[]` to `Person` (or to a small `coldNotes` map keyed by id) and render it in the dossier's `Walks in cold` block as a short 'what was checked' list under the existing sentence — three or four items per person, lifted verbatim from the comment. The Gallery card and the HoverCard can stay as they are.

#### [minor] A placement the dataset itself flags as contested is hardened into an unqualified 2–0 in the ledger
`src/data/headToHead.ts`

*Evidence:* src/data/records.ts:315 against src/data/headToHead.ts:112–131; screenshot 06-dossier-connections.png, the 서출구 순위 2-0 card

**Wrong:** 서출구's season-2 placement string carries the disagreement on purpose: '4위 / 13명 중 · 4th of 13 (본인 문서는 홍진호와 공동 3위로 표기)'. But `rank: 4` is what the field-result loop reads, so the ledger derives 홍진호 > 서출구 for season 2 and prints it beside the season-3 result as 순위 2–0 with the flat line 홍진호가 서출구보다 높이 끝났다. The caveat authored one file away is dropped at exactly the point where the app converts it into a scoreline.

**Matters:** records.ts's header says 'Where two sources genuinely disagree, the alternative wording is kept in the placement string rather than hidden' — and then the derived layer hides it. A reader who opens 홍진호's dossier sees a 2–0 over 서출구 with no indication that one of the two results is disputed by 서출구's own page, which is the kind of quiet overclaim the rest of this dataset goes to great lengths to avoid.

**Fix:** Add `rankContested?: boolean` to `SeasonRun`, set it on 서출구's season-2 run, propagate it onto the derived `Meeting` and render the row with the existing 미확인 / Unverified marker plus a one-line note ('one source records this as a joint 3rd'). Alternatively exclude contested ranks from `Ledger.wins`/`losses` and count them in `unadjudicated`, which already exists for exactly this class of problem.

#### [minor] Three of the forty-seven ties are the same non-fact written three ways, on one source each
`src/data/edges.ts`

*Evidence:* src/data/edges.ts:1127–1168; single-source count run across the file (3 edges with ≤1 source, all three of these)

**Wrong:** 홍진호×이태균, 현성주×이태균 and 현성주×김유현 exist solely because four names appear on the eight-person call sheet for 프로젝트 지니어스, a 2022 shoot that was never released. Each description says in its own last sentence that nothing is known about what happened in the room, and each fills its length with biography restated from the two dossiers — what each person was doing in May 2022. All three cite a single URL, the thinnest sourcing in the file, on `confidence: 'medium'`. Their gloss reads 'Met first on another programme outside the house'.

**Matters:** Two of these are half of 이태균's out-of-season-1 connections, so the franchise's first champion's link into the wider graph rests largely on a shoot nobody has seen. edges.ts's own rule says a fact named on an edge belongs on the person it is about and the edge should then describe only the pair — these three do the inverse. It is the only place in an otherwise substantive edge list where a reader learns nothing about the pair.

**Fix:** Either merge all four Project Genius pairs into one edge type/label that names what it is — a shared call sheet, not a meeting — with a single shared description and `strength: 1`, or leave the edges and drop the biography: two sentences that say only 'both names are on this eight-person list; the shoot was never released' is more honest than three different 150-word framings of the same absence. At minimum add the second source (each person's own page attesting the 촬영 후 미공개 row) so they are not the only edges in the file standing on one URL.

#### [minor] The Track record 'Seasons' column counts a panel seat and a dealer's chair as seasons played
`src/components/AboutSheet.tsx`

*Evidence:* src/components/AboutSheet.tsx:646, 1499; Playwright dump of the Track record tab (박지민 row: '4th of 10 | 13th of 13 | Host | 3')

**Wrong:** `played: runs.length` (line 646) counts every `SeasonRun` regardless of role, so 박지민 shows Seasons 3 when she played two and hosted one, and 이상민 shows Seasons 1 with an em-dash in both Best finish and Outlasted — a row in a table headed 'Track record across seasons 1–3' for a man who never entered the house. headToHead.ts's `CareerRecord` already splits `seasons` (contestant) from `presided`, and its comment states the rule explicitly: 'A host or a panellist is in the credits of a season, not in its field.' The table ignores the split it was given.

**Matters:** 'Seasons' next to 'Best finish' and 'Outlasted' reads as seasons played, and sorting by it puts a studio panellist above people who actually competed. The Korean header 출신 시즌 is defensible; the English 'Seasons' is not.

**Fix:** Render `career[id].seasons.length` with the presided count as a subscript — '2 +1 hosted' / '2 +1 진행' — and sort on the played count. Or, if the column must stay a single number, rename the English header at ui.ts:1005 from 'Seasons' to 'Appearances'.

#### [minor] The Project Genius editorial note is stale and contradicts the file forty lines below it
`src/data/edges.ts`

*Evidence:* src/data/edges.ts:1053–1079 vs :1127–1168; `npx tsx tools/validate-data.mjs` output

**Wrong:** The block at lines 1053–1079 is headed '── THE OTHER THREE PAIRS ON THIS CAST LIST — RESEARCHED, NOT YET DRAWN ──', lists 이태균×홍진호, 이태균×현성주 and 현성주×김유현 as missing, explains 'WHAT BLOCKS THEM', and says 'Section 0c below keeps the three pairs on the build's open-seams list until they do'. All three edges are drawn at lines 1127–1168. The same note quotes the sourcing figures as '287건 중 220건, 약 77%' while dataset.ts now says 290 / 223, and the validator's open-seams list now reports something else entirely (15 high-confidence edges on wiki-only citations).

**Matters:** These comments are the dataset's editorial log and they are unusually good — they are the reason a fifth reviewer can tell what was decided and why. A block that describes as blocked-and-undrawn three edges sitting immediately beneath it costs the log its authority, and the next editor will either re-do the research or trust a stale number.

**Fix:** Replace the 'NOT YET DRAWN' block with a two-line note saying the three were drawn and where the shared narrative lives, and delete the arithmetic quotation entirely — `dataset.meta.sourcing` and validate-data are the authority for those figures and a copy in a comment is a copy that will drift again.

#### [nit] One English show title is mislabelled and leaves raw Hangul in an English-only field
`src/data/people.ts`

*Evidence:* src/data/people.ts:631; screenshot 27-en-dossier.png for the Elsewhere table treatment

**Wrong:** 김경훈's credits list carries `show: 'Society Game spinoffs / 금수저 전쟁'`. The `show` field is the English title everywhere else in the file and is also the join key headToHead matches outside programmes on. 금수저 전쟁 is not a Society Game spin-off, the slash construction appears nowhere else in 83 credit rows, and an English reader gets unromanised Hangul in a column where every other row is Latin.

**Matters:** It renders in the English dossier's Elsewhere table beside clean entries like 'The Genius: Grand Final' and 'University War', and it is the one row a reader would flag as unedited. It would also silently fail to join if that programme ever gained a `rank`.

**Fix:** Set `show: 'Golden Spoon War'` (or the show's own English billing) and leave `showKo: '금수저 전쟁'` to carry the Korean, exactly as the other 82 rows do.


---

## reviewer 2 — 6/10

**Verdict:** The default web view is genuinely handsome and the colour reasoning is better than most shipped work, but the headline change — twenty photographs — carries a visible chroma-key halo on every face above ~1.3× zoom, the camera never refits so opening the dossier clips a fifth of the cast off-screen, two of the four layout modes are visually unresolved, and the cast wall shows 68px faces inside 299px columns.

**Biggest single win:** Kill the chroma-key fringe on the portraits — erode the keyness field by one pixel before building the mask and change the ramp band from a source-over composite toward PHOTO_SEAT_INK to a multiply/darken, then trim each disc's residual backdrop to within ±4 luma of PHOTO_WALL_TARGET. The photograph is now the entire identification system, and right now every one of the twenty is outlined like a cut-out sticker the moment you zoom past 1.3×. Nothing else in this review touches all twenty faces on every surface.

### Working
- The relationship ramp is genuinely disciplined: crimson is confined to the wordmark and betrayal, alliance mint / rivalry orange / prior-show periwinkle / parallel petrol are separable at 2px on a near-black ground, and the `parallel` long-dash/dot rhythm is the one rhythm nothing else uses — a non-meeting is carried by shape as well as hue, which is the right call.
- Per-language typography is real, not decorative: `--tr-display-latin` / `--tr-display-ko` and the `:lang(en)` tracking overrides in Dossier.css mean the Latin display lines get -0.035em and Hangul gets 0em, and a Korean gloss inside an English paragraph keeps Hangul metrics. Very few bilingual products bother.
- The cold band is an authored idea, not a fallback: a fenced strip below the graph, a dedicated caption, and parallel-record lines that visibly stop short and terminate in a hollow ring rather than landing on the person. The concept is right even where the execution misses.
- The source photographs are a genuinely uniform set — one pale blue-grey seamless, frontal, black wardrobe, near-identical head size — so the tone pipeline is solving a smaller problem than it was written for, and the wall does read as one cast rather than twenty sources.

### Defects

#### [blocker] Every portrait carries a pale keying fringe around hair and shoulders
`src/graph/portraits.ts`

*Evidence:* scratchpad z-max.png and the 1.6× / 1.8× crops z1.png (Park Ji-min), z2.png (Lee Tae-gyun), driven live at localhost:5173

**Wrong:** The backdrop matte (KEY_PERP_IN 12 → KEY_PERP_OUT 32, composited source-over toward PHOTO_SEAT_INK) leaves the anti-aliased boundary pixels between hair and seamless only partly keyed. At 1× the residue is a 1px line; at max zoom, where the disc reaches ~608 device px from a 300px source, it becomes a 3–5px light outline that traces the entire silhouette. In my max-zoom capture Lee Tae-gyun is outlined in pale grey along his hair, ear, jaw and left shoulder, with a bright cloudy patch over the top-right of his hair; Park Ji-min is outlined down both sides of her hair and across her collar. The effect is a badly cut-out sticker pasted on black.

**Matters:** The photograph is now the WHOLE of a node's identity — no mark is drawn anywhere. A halo that reads as a compositing artefact turns twenty real people into twenty clip-art cutouts, and it is on all twenty, on every surface, at any zoom above about 1.3×. It is the single most visible thing in the app once you scroll in, and it directly contradicts the product's claim to be a considered, verified document.

**Fix:** Erode the keyness field by one pixel at KEY_PX before building the mask (a 3×3 min filter over `kn`), and change the edge treatment from a source-over composite toward PHOTO_SEAT_INK to a multiply/darken on the ramp band only, so a 40%-keyed hair pixel is darkened by 40% rather than tinted 40% toward a flat ink. Also widen KEY_PERP_OUT from 32 to ~44 so the ramp covers more of the mixed edge and each pixel moves less.

#### [blocker] Opening the dossier pushes four of the twenty people off-screen; the camera never refits
`src/graph/GraphCanvas.tsx`

*Evidence:* 04-dossier.png, 06-dossier-connections.png, 27-en-dossier.png, 15-rail-closed.png

**Wrong:** The dossier is a fixed 530px right panel that overlays the canvas without changing the camera. In 04, 06 and 27 the panel sits directly on top of Kwak Beom's node (only his dimmed label survives, orphaned at x≈1383), and the whole cold band — Kang Ji-hoo, Shin Seung-yong, Choi Yeon-cheong — is sliced by the bottom edge and the status bar, discs cut roughly in half. Compare 02, where all twenty are fully visible. The same non-refit is why 15-rail-closed leaves the bottom 45% of a 1250px frame as dead black while the blob stays where the with-rail fit put it.

**Matters:** Clicking a node is the primary interaction. It costs the reader 20% of the cast, including the exact three people the cold band exists to explain, and it does so silently. Compositionally it turns a deliberately balanced frame into an off-centre blob with a panel bolted onto it — which is the charge this design has to answer.

**Fix:** Make the canvas's effective viewport rect a prop (inset right by the panel width, bottom by the status bar) and re-run the fit-to-extent transform with an eased 420ms tween whenever that rect changes — on dossier open/close and on rail toggle. The graph should visibly slide left and settle, not sit still and get covered.

#### [major] 300px sources at 2.03× upscale: faces go waxy while the rings stay hairline-crisp
`public/portraits/README.md`

**Wrong:** At maximum zoom Park Ji-min's disc measures ~608 device px across, driven from a 300×300 WebP — a 2.03× upsample. Skin goes plastic, WebP blocking is visible on her forehead and cheek, individual hair strands smear into blobs, and eyelashes disappear. The damage is unmissable because the vector furniture drawn on the same plate — the 4px archetype ring, the season arcs, the rim ticks — is resolution-independent and razor sharp. Soft photo inside a perfect ring reads as a broken asset, not as a style.

**Matters:** Zooming in is the app's reward loop: you scroll toward a face to look at a person. The one moment the product invites close attention is the moment its central asset falls apart.

**Fix:** Either ask the owner for 600×600 sources (20 × ~14KB at the same 0.4bpp — a rounding error next to the fonts), or clamp the plate's maximum photo diameter to ~1.35× the source's device resolution (about 400 device px) and let the rings, ticks and caption keep growing past it. A disc that stops growing reads as a deliberate cap; a disc that keeps growing and dissolves reads as a bug.

#### [major] The design-system colour channel is dead code and two of its values are the retired ones
`src/styles/tokens.css`

*Evidence:* tokens.css:222,226,280–284 vs palette.ts:49–103; grep for consumers returns zero hits outside tokens.css

**Wrong:** `--c-esports: #6f87cf` and `--c-poker: #c8a85b` are still the exact values that src/graph/palette.ts spends 40 lines of docblock explaining were fatal — the first ΔE 2.9 from `--s2` (an esports player's archetype ring and his season-2 arc as one colour on the same plate), the second ΔE 10.3 from `--brass` (five gold discs where there are two champions). tokens.css also still carries a 'STILL BROKEN, on purpose' paragraph describing a bug that palette.ts fixed. And `grep -rn '\-\-c-\|--r-\|--s1\b' src/ --include=*.css --include=*.tsx | grep -v tokens.css` returns nothing: not one of the twenty-four archetype/relationship/season variables is read by any component. Every coloured surface goes through palette.ts inline styles.

**Matters:** The prompt calls tokens.css 'THE design system'. It is now a file that declares two retired colours, documents a solved collision as unsolved, and is consumed by nothing. The next person to add a chip will reach for `var(--c-esports)`, get the season-2 blue back, and reintroduce by hand the exact collision the codebase congratulates itself on fixing.

**Fix:** Either delete the `--c-*` / `--r-*` / `--s*` blocks and the stale prose outright, leaving palette.ts as the single source; or generate them from palette.ts at build time and route the DOM surfaces back through the variables. Do not leave a design token file whose colour section is both wrong and unread.

#### [major] The cast wall shows 68px faces in 299px columns, and the face reads as indented
`src/components/Gallery.css`

*Evidence:* 24-gallery.png, 29-en-gallery.png, crop c4.png

**Wrong:** In 29-en-gallery the portrait disc measures ~68 CSS px across inside a ~299 CSS px column: 23% of the column width, ~5% of its area. Everything else is empty ring-space out to the rim ticks at ~123 CSS px. Separately, the plate is left-aligned by its INVISIBLE extent — the outermost tick lands at x = the name's left edge — so the visible photo starts 27 CSS px inboard of 'Lee Sang-min' below it. Four cards in a row all show a face that looks accidentally indented from its own caption.

**Matters:** This is the one screen whose entire job is 'look at twenty faces'. After twenty real photographs were supplied, the wall still presents them at command-palette thumbnail scale, and the one alignment a reader can actually perceive is wrong. It is the largest unclaimed win in the product.

**Fix:** Take the photo disc to ~140 CSS px and the tick extent to ~185 in the gallery only (the plate geometry already parameterises radius), and align the plate on the OPTICAL form: set the photo disc's left edge flush to the text column's left edge and let the ticks overhang into the gutter. Optical alignment beats bounding-box alignment whenever the bounding box is invisible.

#### [major] The parallel-record stubs point at nobody: terminators don't align with the cold people
`src/graph/render.ts`

*Evidence:* 02-graph-default.png, crop c3.png

**Wrong:** Three teal dash-dot lines descend from the connected cluster and terminate in small hollow rings on the cold band's fence. Measured in 02 the terminators sit at x ≈ 848, 1035, 1190 while Kang Ji-hoo, Shin Seung-yong and Choi Yeon-cheong sit at x ≈ 828, 1080, 1352 — the third is 162px off. There is nothing linking a stub to a person. In the same band, the three captions sit on three different baselines (강지후 y≈865, 신승용 y≈823, 최연청 y≈890) and at three different offsets (below-left, below-centre, below-right) for three items in one deliberately composed row.

**Matters:** The whole point of the cold band is to make ONE distinction legible: 'same record, never met' is not a tie. The picture currently says 'three lines stop at a fence, and three people stand behind it' — the pairing has to be guessed or clicked for. And a row of exactly three whose captions land on three baselines reads as ragged rather than as a set, which undercuts the band's status as an authored object.

**Fix:** Give each parallel edge a fixed terminator x equal to its cold person's node x, so the stub sits directly above the face it refers to and the vertical gap becomes the meaning. In the cold band only, lock every caption to one shared baseline directly under its disc — ignore the collision-avoidance placer, there are no collisions in a three-item row.

#### [major] By-archetype is not composed: orphan labels, eleven groups, three indistinguishable greens
`src/graph/layout.ts`

*Evidence:* 09-archetype.png

**Wrong:** Eleven enclosures of wildly different radii overlap in a way no reader can parse. Two group labels have no visible enclosure at all — '기타 · 1명' at (627,726) and '포커 플레이어 · 2명' at (866,793) float as a dot plus a caption in empty canvas. Label anchoring is arbitrary: some sit above their circle, some far to the left, some outside at the frame edge. And three of the eleven swatches are effectively one hue — 전문직 #89996e, 운동선수 #569c8b and e스포츠 #8fae52 are three greens on one screen, next to 크리에이터 #c46390 and 배우 #d199b0, two pinks.

**Matters:** It is one of four top-level modes, presented as a peer of the default view, and it looks generated rather than designed. A categorical palette cannot carry eleven members at 8px dot size no matter what the pairwise ΔE says — ΔE 21.8 between two olives is a lab number, not a perceptual one at that scale on a dark ground.

**Fix:** Collapse the eleven archetypes to five or six presentation groups for this mode (the singletons — comedian 1, creator 1, actor 1, other 1 — merge into one 'other' enclosure) and anchor every group label to the same clock position on its own circle, e.g. always tangent at 12 o'clock. Never draw a group label whose enclosure isn't on screen.

#### [major] By-season: muddy triple-overlap fill and a fourth group drawn to a different rule
`src/graph/layout.ts`

*Evidence:* 08-seasons.png

**Wrong:** Three tinted ellipses (purple S2, green S1, amber S3) overlap heavily, and where all three cross — around 박지민, dead centre of the frame — the additive fills composite to a murky mustard-brown that belongs to no token and reads as a rendering fault. The fourth group, '이전 시즌 없음 · 8명', is drawn as a stroke-only ellipse with no fill, so it is visually a different KIND of object from its three siblings. Group labels are anchored top-centre (S2), bottom-left-outside (S1) and right-edge (S3) — three different rules. Long dashed edges run from the bottom group straight through all three ellipses, so no enclosure actually encloses anything.

**Matters:** The most attractive idea in the mode — you can see who overlaps whom — is destroyed by the one place the overlap is greatest going brown. And a fourth peer group drawn to a different spec tells the reader it means something different, which it doesn't.

**Fix:** Composite the enclosure fills with `globalCompositeOperation = 'lighter'` capped, or better: drop the fills entirely and carry membership on the stroke plus a season pip on each node's caption. Give the no-prior-season group the same fill treatment as the other three at the same alpha, and anchor all four labels tangent at the same clock position.

#### [major] At high zoom the caption is set into the plate's ring band and a hairline crosses it
`src/graph/render.ts`

*Evidence:* scratchpad z-max.png, crop z1.png

**Wrong:** At max zoom 'Park Ji-min / MBC announcer' is drawn between the photo edge and the plate's outer hairline ring, with no gutter and no scrim — the outer ring arc passes visibly behind and through the descender zone of 'MBC announcer', and a second ring skims the cap-height of 'Park Ji-min'. Meanwhile Lee Tae-gyun's caption in the same frame is set well outside his plate to the left, and Jung Keun-woo's above. Three captions, three different relationships to the plate.

**Matters:** With no mark drawn on any disc, the caption is the entire identification — the code's own comment says as much. Setting it into a band that two hairlines cross, without a scrim, is the one place the type must not be compromised, and the inconsistency across three adjacent nodes makes it look like a placement bug rather than a rule.

**Fix:** Add the caption's own rect to the plate-extent solver as an exclusion so no ring is drawn through it, or paint a 6px radial scrim (alpha 0.75 of --bg-base) behind the caption box. Whichever slot the placer picks, keep a minimum 8px clear of every ring stroke.

#### [major] Residual disc backdrops land on visibly different values person to person
`src/graph/plateGeometry.ts`

*Evidence:* scratchpad z-max.png, crops z1.png and z2.png

**Wrong:** PHOTO_WALL_TARGET is solved to a median, so the outcome is a spread, not a value — and at zoom the spread is plainly visible. In one frame Park Ji-min's disc interior is a cool olive-grey with a lighter aura around her head, Lee Tae-gyun's is a warm mid brown-grey noticeably lighter overall, and Jung Keun-woo's is greenish-dark. Side by side at ~300 CSS px each they read as three different plates.

**Matters:** The brief's own test is 'is the correction visible as a correction'. Here the answer is yes twice over: the halo and the residual level. The elaborate two-band solve is buying set-level consistency at 1× and losing it exactly where the reader is looking hardest.

**Fix:** After the matte solve, run a second per-image trim on the KEPT wall pixels — solve a small additive offset so each disc's matted region lands within ±4 luma of PHOTO_WALL_TARGET rather than only its median. Cheap: the samples are already retained in wallSamplesOf.

#### [minor] No optical size compensation on mixed Hangul/Latin runs
`src/styles/tokens.css`

*Evidence:* 27-en-dossier.png, 28-en-dossier-scrolled.png

**Wrong:** Tracking is handled per-language (--tr-display-latin vs --tr-display-ko, the :lang() overrides in Dossier.css) but size is not. Hangul syllable blocks in Pretendard fill nearly the full em; Inter's cap-height is 0.727em and x-height 0.52em. At the same px they are not the same optical size. In 27-en-dossier the grey secondary '前 프로게이머 · 프로 포커 플레이어' visually matches the white primary 'Former StarCraft professional · professional poker player' above it despite being smaller and dimmer, and on the 'Known as 콩 · 폭풍저그' line the Hangul value out-shouts its own Latin label.

**Matters:** In English mode the Korean gloss is meant to sit UNDER the English. It doesn't — it sits alongside it, so the hierarchy the panel was designed with inverts for every English reader on every mixed line.

**Fix:** Add `font-size-adjust: 0.52` on Latin-primary containers, or simpler and safer: an explicit `[lang='ko'] { font-size: 0.92em }` on inline Korean runs inside `:lang(en)` blocks, mirrored by `[lang='en'] { font-size: 1.05em }` inside `:lang(ko)`. One rule pair fixes it everywhere.

#### [minor] The hover card occludes four nodes and never flips
`src/components/HoverCard.css`

*Evidence:* 03-hover.png

**Wrong:** In 03-hover the card describing 홍진호 is placed down-and-right of the cursor and covers 이태균 (his label survives as a clipped '|태균'), 박지민 and 정근우 entirely, plus a slab of the edge bundle it is describing.

**Matters:** The card's job is to help you decide where to look next, and it hides the candidates. It also occludes the arrowheads on the betrayal edges leaving the hovered node — the exact marks it is annotating.

**Fix:** Flip the card to the side of the cursor with more free canvas (measure the node quadtree's occupancy in each of the four quadrants around the pointer), and offset it perpendicular to the hovered node's densest edge bundle.

#### [minor] Gallery: the archetype word is printed twice within 60px, in two colours
`src/components/Gallery.tsx`

*Evidence:* 29-en-gallery.png, crop c4.png

**Wrong:** On Lee Sang-min's card the role line reads 'Broadcaster · former leader and producer of Roo'Ra' in grey, and 60px below it the metadata rule is labelled 'Broadcaster' again in #6da3ba. Same on Park Ji-min. Adjacent to that blue label, the season pip at the right end of the rule is --s1 #367f45 pine green, while Jung Keun-woo's card puts --c-athlete #569c8b teal beside the same pine-green pip — two greens, two channels, 320px apart on one hairline.

**Matters:** Duplicated words read as a template bug and cost a line of a card that is already 90% empty ring. The green-on-green adjacency is the one place in the app where two channels are forced into the same eye-span.

**Fix:** Strip the leading archetype token from the role string when the metadata rule below already carries it. Move the season pips off the archetype rule onto the record line below, where the S1/S2/S3 labels already live and where the pine green has a matching '$S1' label to anchor it.

#### [minor] Mobile: 26% of the viewport is chrome and the language switch is the loudest control on screen
`src/components/TopBar.css`

*Evidence:* 21-mobile-graph.png, 22-mobile-dossier.png, 20-mobile-intro.png

**Wrong:** At 390×844 the top bar is two stacked pill rows totalling ~216 CSS px before any content — 26% of the viewport. Within that, the 한국어|EN toggle is a filled bone-coloured pill (--accent at full value, 12.9:1) and is the brightest, largest object on the entire screen, larger than search (icon-only circle) and heavier than the four layout tabs it sits above.

**Matters:** On the one form factor where every pixel of canvas counts, the control a reader touches once per session is the visual anchor, and the graph gets 620px of a 844px screen.

**Fix:** Collapse the language switch on mobile to a single 'KO'/'EN' ghost chip at --ink-mid, and merge the two rows: layout tabs left, the four utility icons right, one 56px bar. That returns ~160px of canvas.

#### [nit] Command palette: the bottom scrim fades a fully-visible result row to unreadable
`src/components/CommandPalette.css`

*Evidence:* 11-palette-typed.png, 10-palette-empty.png

**Wrong:** In 11-palette-typed the last row (이진형) is entirely inside the panel — nothing is clipped — yet a bottom fade drops it to roughly 35% opacity, taking its 우승 badge and its 시즌 2 chip to near-invisible. The scrim's start point is ~90px too high.

**Matters:** A fade that means 'there is more below' is being read as 'this row is disabled'. The 32px avatars in the same list are also too small to resolve a face and read as coloured smudges beside otherwise strong typography.

**Fix:** Start the mask gradient at the panel's scroll edge minus 24px, not minus 110px, and floor the fade at 0.55 opacity. Take the palette avatars to 44px so the photo resolves, or drop them to a bare 10px archetype dot and let the type carry the row.

#### [nit] Four of the supplied screenshots do not show the state they are named for
`tools/shots.mjs`

*Evidence:* shots/07-orbit.png vs 02, shots/23-path-trace.png vs 07, shots/16 vs 17

**Wrong:** 07-orbit.png shows the Web tab active and is the default web layout, not orbit. 16-zoomed-in.png and 17-zoomed-out.png both show a search filter ('시즌', 14/20) at near-identical zoom, not a zoom range. 23-path-trace.png is pixel-identical in composition to 07 with no path highlighted. The capture script's state setup is silently failing for those four.

**Matters:** Two of the four layout modes and the headline path-trace feature cannot be reviewed from the deliverable screenshot set. I had to drive the app to see max zoom, and I still could not reach a verified orbit or path-trace state — which means nobody reviewing from shots/ has ever looked at them.

**Fix:** In tools/shots.mjs, assert the expected state before each capture (e.g. wait for the Orbit tab's aria-selected, wait for the PathCard to mount) and fail the run rather than shooting whatever is on screen.


---

## reviewer 3 — 5/10

**Verdict:** The choreography is beautifully reasoned and, once the app has been idle for ~4.5 seconds, genuinely excellent — but the two set-piece moments (the cold open and the curtain-up) are delivered in two to four frames if the reader presses ENTER when the UI invites them to, the command palette's entrance never renders a single intermediate frame, the cold open's countdown hairline never starts, and the dossier's cascade runs bottom-to-top.

**Biggest single win:** Give the warm pass a deadline and stop gating it on the camera. Remove `!tweenRef.current` from `warmable` (a mount frameArrival tween has nothing to do with whether the label solve and plate cache are warm — and it is the mount's own DUR.cine tween that blocks it), run the first two passes immediately with fallback metrics instead of waiting on `document.fonts.ready` for all three, and have GraphCanvas publish an `onWarm` callback that App holds `revealArmed` on with a ~400ms ceiling. That one change is the difference between a 1.3s entrance delivered in 26–39 frames and the same entrance delivered in 2.

### Working
- Settling is exemplary: traced on the production build, the free web mesh reaches rest ~256ms after the entrance and `restRef` never flips back — meanErr held at 23.59 for six straight seconds with zero repaints. No jiggle, no overshoot, no d3 alpha tail. The ARRIVE_MS landing / BRAKE_MS brake pair does exactly what its comment claims.
- Layout-mode transitions run at a flat 60fps: web→season 126 frames in 2.6s at median dt 17ms, season→archetype median 17 / p90 17 / max 66. Both arrangements arrive at ~931ms and stop. That is a hard thing to do with twenty force-simulated bodies and it is done.
- The idle gate is real and correct — a rested scene stops painting entirely, and the `visibilitychange` / `onPortraitLoad` wake-ups are all wired. An atlas left open in a tab costs nothing.
- Reduced motion is honoured properly and end-to-end: countdown element absent, hint copy swapped, canvas mode changes teleport in one frame (17ms) rather than easing, and the canvas honours the flag itself rather than leaving a 420ms ease under a UI that snaps.

### Defects

#### [blocker] The entrance collapses to 2–4 frames if ENTER is pressed early — the warm pass has no deadline and is blocked by the mount's own camera tween
`src/graph/GraphCanvas.tsx`

**Wrong:** `warmable = fontsReadyRef.current && sizeRef.current.w > 2 && !tweenRef.current` (the reveal-scale block in the render loop, ~line 2384). The mount fires `frameArrival()` → `setTween(..., DUR.cine)`, and the debounced refit and every `sizeVersion` bump re-issue one, so `tweenRef.current` is non-null for seconds after mount. Measured on the production preview, headed, real GPU, 1440×900 @dpr2: the camera tween was live from the first frame the debug hook existed (533ms) until 2500ms, and the three warm passes only completed at 3300ms. Four runs pressing ENTER at 1700ms — 300ms after the CTA has finished arriving — gave warmAtEnter=0 on three of four, and those three delivered the whole 1.3s entrance in 2 / 35 / 36 frames with median dt 500ms in the worst case and only 1, 2 and 4 frames respectively showing a partially-faded curtain. `sweepAt` (which SWEEP_AT is supposed to pin at 291ms) landed at 100ms, 550ms and undefined. The same four runs with a 4500ms wait gave warmAtEnter=3 every time, 26–39 frames of visible fade, 22–35 frames of visible sweep, and sweepAt 283–333ms.

**Matters:** The entrance is the piece this codebase has re-tuned across four rounds — SWEEP_AT, DRAW_SPAN, DRAW_DUR, REVEAL_DPR, the bearing-ordered sweep, the whole chromeReady deferral — and whether any of it renders is decided by how long the reader happened to wait. The cold open's own CTA lands at 1400ms and the copy offers four ways out, so pressing early is the invited behaviour. Those readers see black, then one dim half-composed frame, then the finished graph: no curtain, no mesh growing outward from the hub. Previous round filed the reveal frame budget (CRITIQUE.md line 563) and the warm pass is the fix that landed for it; it lands only for readers who wait.

**Fix:** Drop `!tweenRef.current` from `warmable` — the warm pass exists to compile the label solve, the measureText cache and the plate ladder, none of which care where the camera is. Split the fonts gate: run two passes immediately and re-run the third on `fonts.ready`. Then close the loop from the other side: publish an `onWarm` callback beside `onEntranceDone`, and in App.tsx hold `setRevealArmed(true)` until it fires or 400ms have passed, whichever is first, so `reveal` never starts against an uncompiled painter. Assert it in the harness: `__atlasDebug.intro().warm` must equal WARM_PASSES on the frame `reveal` first exceeds 0.

#### [blocker] The command palette's 180ms entrance never renders — the animations sit pending for 1.13s and then jump to finished
`src/components/CommandPalette.css`

**Wrong:** Traced per rAF on the production build, headed, dpr 1, with the graph at rest: `.cp__dialog` enters the DOM 171ms after the Ctrl+K keydown, then `cp-dialog-fade` and `cp-dialog-lift` report playState 'running' with `currentTime: 0` and computed `opacity: 0`, `transform: matrix(0.98,…)` for 1133ms — through samples at t=171, 1021 and 1054 — and at t=1304 both are suddenly 'finished' (currentTime 90 and 180). Frame gaps after the keydown on a first open: 517, 401, 66, 167, 150ms. The cause is two new backdrop-filter layers over a live full-viewport canvas (`.cp__scrim` blur(9px) and `.cp__dialog` blur(26px) saturate(1.2)) forcing a full backdrop snapshot before the first animated frame can run — the exact trap HoverCard.css documents at the top of its own file. Same measurement on G (gallery): 584ms gap at keydown then 100/233/83/233. On ? (about sheet): 100/350/167.

**Matters:** The palette is the app's keyboard-first entry point and the one surface whose CSS carries the longest reasoning in the file — the 90ms lead, the separated fade and lift, the anti-'two typographic layers' argument. None of it is ever on screen. What the reader gets is a dead second after Ctrl+K and then a fully-formed drawer appearing between two frames, which reads as a hang, not as an opening. Every full-screen glass overlay in the app has the same fault.

**Fix:** Warm the layer the way HoverCard already does: keep the scrim and dialog mounted at `opacity: 0.008` / `visibility: visible` for two frames on app mount (or on first focus of the search shortcut) so the backdrop snapshot is paid before the reader asks for it. Cheaper and probably better: drop `backdrop-filter` from `.cp__scrim` entirely — it sits under a 96%-opaque dialog and a 74% void wash, so it is buying almost nothing — and promote the dialog with `will-change: transform, opacity` before the open. Assert the fix: `document.querySelector('.cp__dialog').getAnimations()[0].startTime` must be non-null within one frame of mount.

#### [major] The cold open is a slideshow: the title mask-rise and the kicker wipe get zero to one intermediate frame
`src/components/Intro.css`

**Wrong:** Sampled per rAF on the production preview, headed: frame gaps through the first 2.2s of the cold open were 433, 333, 267, 250, 233, 83, 200, 200, 66ms. Against that budget, `.intro__title-in` (intro-rise, 700ms from translateY(108%), delay 180ms) was measured at translateY(100.733px) at t=0, still 100.733px at t=696, and 'none' by t=1829 — not one intermediate value. `.intro__kicker` (intro-kicker, 900ms clip-path wipe, delay 620ms) read inset(0 100% 0 0) at t=696 and inset(0 0.466% 0 0) at t=1829: one frame of a 900ms wipe. `.intro__line` (820ms) got three. The blocking work is React mounting App → GraphCanvas, whose simulation effect runs `for (let i = 0; i < 190; i++) sim.tick()` synchronously alongside the force construction, the layout solve and the i18n tables, all on the main thread the intro is trying to animate on.

**Matters:** This is the product's first impression and its most expensive gesture — a masked wordmark rising behind a crimson rule. It is not seen. The reader gets the composed final card in one step, which makes the 2.6s of scheduling in this file, and the whole #preboot handoff apparatus above it, invisible work.

**Fix:** Get the graph's construction off the intro's critical path. Chunk the 190-tick pre-settle across rAF (20 ticks a frame) or move it behind a `requestIdleCallback`, and defer mounting GraphCanvas until two rAFs after the Intro has committed — the canvas is behind an opaque curtain for 4.5s and has no reason to compete for the frame the wordmark is rising in. Verify with the same per-rAF sampler: `.intro__title-in`'s transform must take at least 20 distinct values between mount+180ms and mount+880ms.

#### [major] The cold open's countdown hairline never starts, so the auto-advance is armed ~1.8s late off an animation that is still pending
`src/components/Intro.tsx`

**Wrong:** `intro-countdown` is created with `transform: scaleX(0)` and `animation-fill-mode: both`, and it does not get a start time. Measured headless on the production build: the element existed by t=2951 and the animation reported `playState: 'running'`, `pending: true`, `startTime: null`, `currentTime: 0` until t=4717 — 1.77 seconds — before finally starting. Headed on a real GPU it was still `pending: true, startTime: null` at t=6149. The arming effect (lines 171–200) does `void anim.ready.then(() => arm(anim.currentTime))`, so the 4500ms auto-advance timer does not begin until that late resolution, and it begins from currentTime ≈ 0. Net effect measured: the bar's own 1400ms delay also starts late, so the hairline reads scaleX(0) — completely empty — for roughly the first 3 seconds of the window it is supposed to be reporting, and the screen changes at ~6.3s rather than the 4500ms the constant names.

**Matters:** The file's own comment is explicit that this bar is not a picture of the timer, it IS the timer's clock, and that it exists so the reader is never surprised by an involuntary transition. Both halves fail: the readout under-reports (an empty rule says 'plenty of time' for three seconds), and the promise in the hint line — 기다리면 저절로 열립니다 — is honoured almost two seconds late. It is the same class of error the odometer was deleted for: a control that is false while it is on screen.

**Fix:** Do not read the clock off an element that Chromium can refuse to paint. Either give the bar a non-zero resting footprint (animate `width` from 1px, or scaleX from 0.001, or animate `clip-path` on a full-width rule) so it is painted and the animation can start, or — better — make the timer authoritative in JS: arm a `performance.now()`-based interval at mount, drive the bar from `anim.currentTime = elapsed` (or from a CSS variable), and keep `anim.ready` only as a sanity check. Assert: `getAnimations()[0].startTime` must be non-null within 100ms of the Intro's first paint.

#### [major] The dossier's section cascade runs bottom-to-top — the below-the-fold sections arrive ~250ms before the two above them
`src/components/Dossier.tsx`

**Wrong:** `SECTION_TAIL` (line 233) carries no delay at all, while `SECTION_BY_SLOT` gives slot 2 a 220ms delay and slot 3 a 285ms delay. Since `.dsr-sec` elements 3 onward take the tail, they start first. Traced per rAF on the production build, second click: at t=360ms the six visible `.dsr-sec` opacities read [0.038, 0, 0.791, 0.791, 0.791, 0.791] — the credentials/record/faced blocks are four-fifths in while the lineup and bio blocks above them are at 0.04 and 0. Lineup does not reach 1 until ~479ms and bio not until ~512ms. First click is worse: [0, 0, 0.544, 0.544, 0.544, 0.544] at t=527.

**Matters:** A staggered entrance's whole job is to give the eye a reading order, and this one gives it the reverse of the reading order. The panel visibly fills from the middle down and then pops two blocks in above what the reader has already started reading, which pushes the text they were looking at. The comment justifying the change ('nothing below the fold is being watched arrive') is true of the delay but not of the ordering it produced — on a 900px window all six of these sections are on screen.

**Fix:** Give the tail the last slot's delay measured from its own mount rather than dropping it: `SECTION_TAIL.show.transition.delay = SECTION_LEAD + (SECTION_SLOTS - 1) * SECTION_STEP - TAIL_COMMIT_OFFSET`, with the offset measured once (~33ms, two frames) — or simplest, hold the body render until the tail is ready so header and tail commit together and the ordered stagger works as originally written. Assert in the harness: the opacity of `.dsr-sec:nth-of-type(1)` must be greater than or equal to `.dsr-sec:nth-of-type(4)` on every sampled frame of the entrance.

#### [major] Every mode change drops the region scaffolding to ~0.32 and hard-swaps identity at the bottom of the dip
`src/graph/GraphCanvas.tsx`

**Wrong:** `regionPainted = Math.max(exitAlpha, regionAlpha)` with `REGION_CROSS_CAP = 0.35` puts a floor under the crossing but the two sets still take the slot in turn — `clusters: exitHoldsSlot ? exitClustersRef.current : clustersRef.current`. Measured per rAF on the production build: web→by-season painted alpha ran 1 → 0.979 → 0.901 → 0.514 → 0.331 (t=178) → 0.563 → 0.848 → 1; by-season→by-archetype ran 1 → 0.984 → 0.558 → 0.464 (t=176) → 0.741 → 1. So on every mode switch the ellipses and captions fade to a third, the set of shapes on screen is replaced in a single frame at that alpha, and the new set brightens back. The file's own HANDOFF note on REGION_CROSS specifies the real fix (per-cluster `Cluster.at`, both sets painted together) and it is not implemented.

**Matters:** The reason the crossing was tuned at all is that the frame the reader most needs is 'these circles are about to become those circles'. A dip to 0.32 with a hard identity swap at the bottom is not that frame — it is a dissolve to near-nothing followed by a cut, and it lands exactly while twenty people are travelling their furthest, i.e. when the scaffolding is the only thing telling the eye where they are going.

**Fix:** Land the handoff the comment already specifies: add `at?: number` to `Cluster`, multiply it into `ra` at the top of `drawClusters`'s cluster loop and into `ctx.globalAlpha` in `drawCaptions`, then hand the painter `[...exit, ...current]` with `at` set from `exitAlpha` and `regionAlpha` respectively. The composite floor then becomes exitAlpha + regionAlpha rather than max(), which never drops below ~0.7, and the old rings dissolve inside the new ones instead of being cut to.

#### [minor] Layout transitions are not legible for the nodes that barely move — path lengths up to 3.7× the straight line
`src/graph/GraphCanvas.tsx`

**Wrong:** Traced per frame at 1440×900 by sampling every node's screen position through each transition and dividing total path length by net displacement: web→by-season gave 현성주 103px travelled for 28px net (3.69×), 박지민 70/29 (2.41×), 홍진호 265/126 (2.11×); by-archetype→web gave 강지후 551/238 (2.32×), 신승용 448/206 (2.17×), 최연청 823/446 (1.84×). The cause is the ordering in the render loop: the anchor ramp (`settle(dt, 260)`) and the collide/link régime swap fight for the first ~250ms before the ARRIVE_MS landing takes over, so a node whose new seat is near its old one is pushed away and pulled back.

**Matters:** The whole justification for animating a layout change rather than cutting is that the eye can follow an individual through it. A node that travels three and a half times its own displacement does not read as moving from A to B — it reads as scattering and re-forming, which is the failure mode a cut at least does not pretend to avoid. The three cold-band people (강지후, 신승용, 최연청) are among the worst, and they are the ones whose position in the picture carries the most meaning.

**Fix:** Suppress the physics for nodes whose anchor error is already small: in the anchored branch, skip `applyAnchors`/tick contribution and drive straight onto ax/ay via the ARRIVE_TAU exponential for any node with `hypot(ax-x, ay-y) < 2 * radius` from the first frame of the transition rather than only after ARRIVE_MS. Verify with the same detour-ratio measurement — no visible node should exceed ~1.3× on a mode change.

#### [minor] The first hover of a session is still ~60ms and two dropped frames slower than every hover after it
`src/components/HoverCard.tsx`

**Wrong:** Measured per rAF on the production build with the canvas at rest: first hover — canvas focus lit at 59ms, card opacity > 0.02 at 209ms, full at 242ms, with frame gaps of 133ms and 151ms inside that window. Second hover of the same session — lit at 67ms, card visible at 99ms, full at 182ms, no gaps over 40ms. The two-frame warm at 0.008 opacity paints a shell (`.hovercard__warm`), not the real payload, so the first hover still pays for the person's type, the plate and the layout.

**Matters:** The first hover is the reader's first evidence that the discs answer to the pointer, and it is the slowest one they will ever get — and the 133/151ms stalls make it stutter rather than merely lag. CRITIQUE.md line 605 filed this and it is still measurable, which makes this the second round it has been reported fixed.

**Fix:** Warm with a real payload: mount the card off-viewport at app mount carrying an actual person's data, the actual portrait plate and the longest name string in the current language, let it lay out and decode once, then hide it. The target is the first hover landing within 15% of the 182ms steady state, and that assertion belongs in the shots harness.

#### [nit] Intro.css calls the kicker wipe 'a compositor-only wipe'; clip-path animations are not composited in Chromium
`src/styles/../components/Intro.css`

**Wrong:** The comment above `.intro__kicker` (line 213–220) says 'The reveal is a compositor-only wipe now: clip-path and opacity, no layout', and the rule declares `will-change: clip-path, opacity`. Chromium does not run clip-path animations on the compositor — they are main-thread paint-level, and `will-change: clip-path` does not promote them. Measured consequence in the capture above: the 900ms wipe was delivered with one intermediate value.

**Matters:** Not the wipe's fault that it stutters — the main thread is the real problem — but the comment is the reason nobody looked again, and it will mislead the next person deciding where the cold open's frame budget is going.

**Fix:** Either correct the comment to 'no layout, but still main-thread paint', or make the claim true by wiping with a `transform: translateX` on a mask element inside an `overflow: hidden` wrapper, which genuinely is compositor-only and reads identically at this size.


---

## reviewer 4 — 6/10

**Verdict:** The plate engineering, token system and bilingual typography are flagship-grade, but on the default mobile view three of twenty captions sit under somebody else's face, captions are painted for nodes that are off-screen or hidden behind the dossier, and the photographic plate intermittently reverts to a text mark — identification failures in a product whose whole job is identification.

**Biggest single win:** Make a misattributed caption impossible rather than merely expensive in src/graph/render.ts: run the seat ranker once with MISSEAT = Infinity, and only fall back to the priced version if every one of the sixteen slots is a lie — and when it does fall back, stroke the leader hairline unconditionally (in a colour that is not the same grey as the 'same season' edge). That one change fixes the three wrong-face names on the default mobile view, which is the only defect here that makes the app state something untrue.

### Working
- The photographic plate itself is the best thing here: the per-image tone solve, the chromaticity-keyed backdrop matte and the solved seat depth genuinely make twenty sources read as one set — in shots/24 and shots/29 the wall does not look like twenty photographers, and the correction is invisible as a correction.
- The bilingual treatment is disciplined and consistent almost everywhere: primary/secondary swap correctly in the dossier, the cold-band caption, the gallery group heads and the status bar, and the Korean never becomes a footnote in EN (shots/27).
- Numbers are genuinely tabular — .tnum is applied in 45 places, the filter counts, ledger placements and 'N ties' columns all align, and the mono keycaps use slashed-zero. This is the detail most projects skip.
- tokens.css is a real design system, not a colour list: the --rad-* rename carries a written rationale, and the deprecation comment on the old aliases is honest about its own debt.

### Defects

#### [blocker] On mobile the default view puts three names under the wrong faces
`src/graph/render.ts`

**Wrong:** At 390x844 (shots/21-mobile-graph.png, and reproduced live — see the crop I captured of the 0–290 × 230–480 CSS region): 'Choi Hye-sun' is seated directly below the purple-ringed male disc that is Seo Chul-gu, ~65px from his centre and ~196px from her own pink-ringed disc; 'Seo Chul-gu' is seated directly below the big gold-ringed disc that is Lee Jin-hyung, 73px from his centre and 97px from his own; 'Hong Jin-ho' sits immediately right of Choi Hye-sun's pink disc while his own yellow-ringed disc is well down and right. Meanwhile Choi Hye-sun's and Hyun Seong-joo's discs carry no caption at all near them. No leader hairline is drawn on any of the three, so there is nothing to correct the reading. render.ts prices this exact failure (MISSEAT, MISSEAT_PX) but MISSEAT is deliberately finite and the code comment promises 'when that happens the leader fires unconditionally' — on mobile it accepts the lie and the leader does not fire.

**Matters:** The brief's own premise is that with the mark never drawn, the caption under the disc is the WHOLE of a node's identification. A reader on a phone — the majority case for a Korean variety-show companion — is told the wrong person's name for three of twenty cast members, on the first screen, with no way to detect it. This is worse than an unnamed node: an unnamed node is a gap, a mis-seated one is a false claim, and this app is otherwise obsessive about not making false claims.

**Fix:** Two changes in the label ranker. (1) Make a misattributed seat unaffordable rather than expensive: if ownerOf(b).who !== null, return Infinity unless every one of the sixteen slots is misattributed — i.e. run a first pass with MISSEAT = Infinity and only fall back to the priced version if the argmin is Infinity. (2) Make the leader unconditional in fact, not just in comment: assert it — whenever the chosen box's nearest disc centre is not the node's own, stroke the leader hairline regardless of the standoff test that currently suppresses it. Verify by asserting in a dev build that for every painted caption, argmin over discs of distance(boxCentre, discCentre) === the caption's own node.

#### [blocker] Captions are painted for nodes that are off-screen or hidden behind the dossier
`src/graph/render.ts`

**Wrong:** Opening the dossier re-frames the camera and pushes Kwak Beom's disc under the panel, but his caption is still painted just left of the panel edge — a name floating in empty canvas with no disc anywhere near it. Visible in shots/04-dossier.png (곽범 at ~x1410), shots/06-dossier-connections.png, shots/19-laptop-dossier.png and shots/27-en-dossier.png (Kwak Beom at ~x1384). Worse at high zoom: in my max-zoom capture the caption 'Shin Seung-yong / Physician · aesthetic dermatology' is set in full at the left of the viewport with a leader hairline running left and terminating in blank space, because the node is entirely off-canvas. chromeBoxes() correctly treats the dossier as an obstacle for the label BOX, but nothing tests whether the NODE is still visible.

**Matters:** An orphaned name is the one artefact that makes a carefully-built graph look broken. It also actively misleads: in shots/04 the nearest thing to the floating '곽범' is 이태균's disc, so the label reads as a second, contradictory caption for a node that already has one.

**Fix:** In the label pass, drop any node whose disc centre (plus rPhoto) is outside the visible canvas rect, and any node whose disc is more than ~70% covered by a chrome box. You already compute chromeBoxes() and discs — the coverage test is one overlapArea call per node. Nodes the reader cannot see do not need naming.

#### [blocker] The photographic plate intermittently falls back to the name mark
`src/graph/plate.ts`

**Wrong:** shots/26-en-graph.png — one of the delivered captures — shows SEVEN of twenty nodes rendering the generated mark instead of a photograph: 'Gwan hee', 'Yoo hyun', 'Beom', 'Nam hee', 'Ji hoo', 'Seung yong', 'Yeon cheong'. All seven are the smallest-radius nodes; the thirteen large ones are photographed. I reproduced it live at 1280x800: after opening the cast wall with G and closing it, Shin Seung-yong and Choi Yeon-cheong lost their photographs and reverted to 'Seung yong' / 'Yeon cheong' text discs, and stayed that way — this was 1.4s after the interaction, not a decode race. The mechanism is plate.ts:370 `const photo = d.image ? gradedDisc(...) : null` feeding plate.ts:408 `if (d.glyph && !photo …)` — when gradedDisc cannot strike a buffer, or when the never-DOM-attached `new Image()` has had its decode purged and naturalWidth goes to 0, the plate silently degrades to text.

**Matters:** The stated premise of this release is that the photographed plate is the DEFAULT and the mark is a fallback reachable only by deleting a file. Seven text discs in the app's own English screenshot says the opposite, and the two presentations are so visually different that a reader sees a broken load, not a graceful degradation. It also lands hardest on exactly the three cold-band people, who are already the hardest nodes to read.

**Fix:** Two guards. (1) Never regress a plate that has already been photographed: keep the last successfully-struck graded canvas per person and blit that if gradedDisc returns null this frame, rather than falling through to the mark. (2) Stop relying on a detached HTMLImageElement staying decoded — call createImageBitmap() on the decode callback and hold the ImageBitmap, which the browser will not silently purge; also guard gradedDisc against coverRect().sw <= 1 and treat it as 'not ready' rather than building a 16px buffer.

#### [major] The no-verified-tie band breaks apart when the dossier opens on a laptop
`src/graph/layout.ts`

**Wrong:** At 1600x1000 (shots/04-dossier.png) and 1280x800 (shots/19-laptop-dossier.png, shots/27-en-dossier.png) the dossier re-frames the camera and the cold band goes half off the bottom edge: 강지후 / 신승용 / 최연청 are cut through the middle of their discs by the viewport, the band's lower dashed boundary is gone entirely, and in shots/19 the '신승용' caption ends up overlapping 강지후's disc. Compare shots/02-graph-default.png where the band is a complete, bounded object with its caption above and captions below.

**Matters:** The cold band is the app's one editorial statement — three people whose only line is a parallel record, i.e. 'same record, never met'. It fires for the first time in this release and the moment a reader clicks anyone to learn more, the statement is amputated. Half-discs bleeding off a canvas edge also read as a rendering bug rather than a crop.

**Fix:** Include the band's own bounding box (dashed rule, caption, discs and captions) in the fit-to-view rect the dossier-open re-frame solves against, the same way chromeBoxes already constrains labels. If it will not fit, collapse the band to its caption row plus a '3' count and let the discs live only in the unobstructed layout, rather than clipping them.

#### [major] The filter rail clips a legend row mid-glyph and its section-jump strip wraps
`src/components/FilterRail.css`

**Wrong:** At 1280x800 the rail body is 456px against 832px of content. In shots/18-laptop.png the '평행 이력 / Parallel record 3' row is sliced roughly in half by the rail's lower edge with only a very short fade, and '멘토 / Mentorship 1' — a real relationship type with a real count — is not visible at all; the legend appears to have six types when it has seven. In EN at 1280 (my capture, and shots/26-en-graph.png) the same cut lands through 'Outer arcs = prior seasons'. Separately, the bottom section-jump strip wraps to two lines in EN ('↓ Relationships | Node key | Archetype' then 'Most connected' orphaned on a second line, left-aligned under the arrow), which reads as a broken toolbar rather than a nav.

**Matters:** The legend is the key to the entire encoding, and the one row a laptop reader never sees is the one type that has a count of 1 — the rarest and therefore most interesting mark on the graph. A hard cut through the middle of Korean glyph bodies is also the single most 'unfinished' thing on the screen, because Hangul has no descender slack to hide it in.

**Fix:** Lengthen the tail mask so a row is either fully legible or fully gone — set the fade to at least one full row height (var(--sp-9)) and snap the scroll to row boundaries with scroll-snap-type: y proximity on .frail__body. For the jump strip, let it scroll horizontally like .tb-seg-scroll rather than wrap, or drop the '↓' glyph and set the four items in a 2×2 grid so a wrap is a decision.

#### [major] The cast wall shows four of twenty people at laptop height
`src/components/Gallery.css`

**Wrong:** Measured live at 1280x800: .gallery__sheet is 752px, of which .gallery__head (104px) + .gallery__note (117px) = 221px is pinned outside the scroller, leaving .gallery__scroll 529px for a 355px group. One season group — four people — is on screen, and 29% of a wall of faces is a paragraph of prose that never moves. The bottom row is also hard-cut through the romanised name line (shots/24: 'Ha Seung-jin' bisected; shots/25: the challenger names reduced to a sliver of ascender).

**Matters:** 'The cast wall' is a promise about seeing the cast. Four at a time, with a permanent 220px explanatory header, makes it a scrolling list with a preamble. The same explanation is already in the About sheet's HOW TO READ tab, twice over.

**Fix:** Move .gallery__note inside .gallery__scroll so it scrolls away after the first group, and keep only the eyebrow + '20 players' + close pinned (that is 104px, 14% not 29%). Then apply the same full-row-height tail fade as the filter rail so the bottom row is cut between cards, not through a name.

#### [major] On mobile the cold band's caption and labels swap sides relative to desktop
`src/graph/render.ts`

**Wrong:** On desktop (shots/02) the band reads top-to-bottom: dashed boundary, caption '아직 아무와도 얽히지 않은 사람들 / NO VERIFIED TIE · 3', the three discs, their captions, closing boundary. On mobile (shots/21-mobile-graph.png, reproduced live) it reads: boundary, the three CAPTIONS, the three discs, then the caption block underneath. The three names now sit between the band's upper rule and the discs, closer to 김남희's node above than to the discs they belong to, and the band's own explanatory caption has fallen below the group it explains.

**Matters:** The band is a labelled region; putting the region's label after its contents inverts the one reading order the desktop version establishes, and floating the three names above the discs is a milder version of the misattribution defect above — on the small screen, 강지후's name sits nearer the boundary rule than his own face.

**Fix:** Pin the band caption to the band's top edge in both breakpoints (it is already a region caption, not a solved label), and exclude cold-band members from the generic above/below label flip — their discs are on a fixed row with guaranteed clearance below, so force seat 'below' for all three.

#### [minor] The About sheet's HOW TO READ tab is cut through the middle of a card row
`src/components/AboutSheet.css`

**Wrong:** In shots/13-about-legend.png the third row of key tiles is bisected by the sheet's bottom edge at ~y1132 — the arrow, node-and-panel, edge and cold-band illustrations are all sliced horizontally with no scrim, no visible scrollbar and no 'more below' affordance. The same hard cut appears in shots/30-en-about.png. Separately, the row-2 tiles stretch to the tallest sibling and leave 70px of dead space under the shorter captions ('점선 시즌 고리' ends at y951, card bottom at y1022) because the captions are top-aligned in a stretched grid item.

**Matters:** The one tab that teaches the encoding gives no signal that a third of it exists. And on a sheet this considered, a half-drawn illustration reads as a paint bug rather than as a scroll.

**Fix:** Add the .scroll--faded tail mask the filter rail and gallery already use, sized to one full tile row, and give the card grid `align-content: start` with the caption block `margin-top: auto` so short captions bottom-align to a shared baseline instead of leaving a ragged void.

#### [minor] Portrait discs change size inside a single row of the cast wall
`src/components/Gallery.css`

**Wrong:** Measured at 1280x800, .gallery__plate is 118px for Lee Sang-min and Park Ji-min but ~85px for Jung Keun-woo and ~95px for Lee Tae-gyun, in the same row (shots/24, shots/29). The wall inherits the graph's degree-driven radius, but the gallery's own note explains only the rings ('the length of a season ring is how far they got that year… every tick on the rim is one verified connection') and never says the portrait itself is scaled by tie count. The cards are a fixed-height grid, so the smaller discs float in their boxes with unequal optical spacing above the name.

**Matters:** On a graph, size-encodes-degree is legible because neighbours are adjacent and the encoding is in the node key. On a four-up grid with aligned name baselines it just reads as inconsistent cropping — some cast members look like they got a smaller photograph.

**Fix:** Either normalise .gallery__plate to one diameter across the wall and let the tick ring alone carry degree, or keep the scaling and add one clause to gallery.note ('and the disc's size is how many of those connections they have'). The first is better: the wall's job is faces, and the tick ring is already the honest count.

#### [minor] The fallback mark drops the hyphen the rest of the app uses
`src/graph/plateGeometry.ts`

**Wrong:** When the mark is drawn (shots/26-en-graph.png, and my 1280x800 reproduction) it wraps the given name across two lines with no hyphen and no join: 'Gwan / hee', 'Seung / yong', 'Yeon / cheong', 'Nam / hee', 'Ji / hoo'. Everywhere else in the app the same names are set 'Kang Ji-hoo', 'Shin Seung-yong' — with the hyphen — including the caption sitting eight pixels below the disc, so the two are visible simultaneously and disagree.

**Matters:** The two-word setting reads as two syllables of a family name rather than one given name, and an English reader is being asked to match 'Seung yong' to 'Shin Seung-yong' at a glance. The mark is a fallback now, but it is the fallback the app ships in its own English screenshot.

**Fix:** Break on the hyphen and keep it as a trailing soft hyphen on line one: 'Seung-' / 'yong'. markLines() already owns the split; pass the hyphenated romanisation rather than a space-joined one and render the hyphen at the end of the first line.

#### [minor] The by-season layout draws its region ellipses through the discs they contain
`src/graph/layout.ts`

**Wrong:** In shots/08-seasons.png the '이전 시즌 없음 · 8명' ellipse's lower boundary passes straight through 곽범's and 김남희's discs, leaving both half in and half out of the region that is supposed to contain them. The four region captions also use three different anchor conventions in one frame: '시즌 2 · 7명' top-centre outside, '이전 시즌 없음 · 8명' top-centre outside, '시즌 1 · 4명' bottom-LEFT outside, '시즌 3 · 5명' bottom-RIGHT outside. Node captions inside the bottom group alternate above and below with no visible rule (강지후 above, 김경훈 below, 이관희 80px above versus everyone else's ~40px).

**Matters:** The containment is the entire encoding of this layout — 'this person belongs to this season'. A disc straddling the boundary makes the one claim the view exists to make ambiguous.

**Fix:** Solve the ellipse from the member discs' bounding circle plus rPhoto plus a fixed pad, after positions settle, rather than from the seed radius. Pick one caption anchor (top-left of the ellipse's bounding box reads best against a dark field) and use it for all four.

#### [minor] The gallery note is bilingual in Korean and monolingual in English
`src/data/i18n`

**Wrong:** shots/24-gallery.png sets the Korean explanation and then the full English gloss beneath it at lower opacity — three lines plus five. shots/29-en-gallery.png sets only the English, with no Korean gloss. Everywhere else the pattern holds in both directions: the dossier in EN carries '前 프로게이머 · 프로 포커 플레이어' under the English occupation line (shots/27), the cold band caption carries '확인된 인연 없음 · 3명' under 'No prior tie on record', and the gallery cards themselves carry '이상민' under 'Lee Sang-min'.

**Matters:** It is the one place the bilingual contract silently breaks, and it breaks in the direction that reads as 'Korean is the translation' — the opposite of the stated position that Korean is the source of record.

**Fix:** Give gallery.note the same two-line treatment in EN that it has in KO: English primary, Korean gloss at the secondary opacity, matching the dossier's occupation block.

#### [nit] Orbit's locked keycap reads as a stray clipped ring on mobile
`src/components/TopBar.css`

**Wrong:** At 390px the .tb-seg-slot for the locked Orbit tab is absolutely positioned at right:9px / top:6px as a 9px dashed ring with no digit (the .tb-seg-key text is invisible at that size). In my crop of the mode strip it sits above and right of the 'Orbit' label, unlabelled, its right arcs disappearing into the strip's 999px corner curve. The CSS comment records that this was already moved from 3px to 9px because 'the ring sat on the curve of the outermost tab and read as a stray dot floating outside the control' — at 9px it still does.

**Matters:** An unexplained dashed fragment in the primary navigation is the kind of thing a reader reads as a rendering error, and its meaning ('press 4' / 'not yet available') is unguessable at 9px with no glyph in it.

**Fix:** Drop the slot entirely below 640px — the keycap is a keyboard hint and there is no keyboard. Signal the locked state the way the rest of the app does: dash the Orbit tab's own outline, which is already the app's 'not yet' language for a franchise newcomer's node.

#### [nit] Six dead design tokens the file itself asks to be deleted
`src/styles/tokens.css`

**Wrong:** Lines 444–450 define --r-xs, --r-sm, --r-md, --r-lg, --r-xl and --r-full as aliases of the --rad-* scale under the comment 'deprecated — mechanical find/replace to --rad-*, then delete these'. The find/replace has already happened: there are zero `var(--r-*)` references anywhere in src. Related: two hard-coded radii survive the system at CommandPalette.css:545 (border-radius: 2px) and PathCard.css:225 (border-radius: 1px), both below --rad-xs.

**Matters:** Six live aliases for a scale nothing uses is exactly the ambiguity the rename was performed to remove — the next person to add a radius has two equally-valid-looking names to pick from, and autocomplete offers both.

**Fix:** Delete lines 444–450. Add --rad-hair: 2px (or accept the two 1–2px cases as sub-token hairlines and note it) so the two stragglers have a home.

#### [nit] Two of the delivered captures do not show the state they are named for
`shots/23-path-trace.png`

**Wrong:** shots/23-path-trace.png is pixel-for-pixel the default view: no PathCard, no highlighted chain, no selection, and the status bar shows the resting hint ('노드를 클릭해 인물 정보 · 선을 클릭해 그 인연 읽기…') rather than a selected-node string. shots/16-zoomed-in.png shows a search-filtered graph (14/20, '시즌' in the search field) at roughly default zoom, not a zoomed-in view.

**Matters:** Shift-click path tracing and PathCard are named as new in this release and there is no evidence in the capture set that either renders. Whether the feature failed or the capture script did, the one artefact a reviewer or stakeholder has for it shows nothing.

**Fix:** Re-run the capture for 23 with an explicit wait on the PathCard element rather than a fixed timeout, and re-shoot 16 from a scripted camera scale rather than a wheel gesture. If the trace genuinely does not fire on shift-click, that is a separate blocker in src/state/findPath.ts.


---

## reviewer 5 — 6/10

**Verdict:** The reading model, the copy and the accessibility groundwork are genuinely strong, but three of the app's primary surfaces are broken in ways a user hits in the first minute — the cast wall hides the photographs it exists to show, opening the dossier orphans a name and clips the cold band, and the headline "47 connections" counts three things the app elsewhere insists are not connections.

**Biggest single win:** Cut the cast wall's pinned masthead from ~300px to a ~72px title bar and let the section headers be the sticky element instead. That single change restores the photographs of every row after the first — the entire payload of this release — recovers a quarter of the modal, and makes the seven-line explainer read once rather than permanently. It is a CSS change in one file and it fixes the only defect here that makes a primary surface fail at what it was built to do.

### Working
- Keyboard operation of the canvas is real, not theatre: role=application with a visually-hidden <li> per person, arrow keys move a cursor, Enter opens the dossier and moves focus to its heading, Esc returns focus to the canvas AND clears the hash. Verified end-to-end with Playwright.
- Deep linking is unusually complete — p/m/q/l/a/e/r/path/tie/lang all round-trip. #p=park-ji-min&m=seasons&e=alliance,betrayal&lang=ko restores the person, the layout, the edge filter and the language exactly, and the hash survives untouched.
- The filter-everything-out state is properly designed: a centred dashed ghost node, '조건에 맞는 사람이 없습니다 / 필터를 해제하면 20명이 모두 돌아옵니다', and a clear-filters chip that appears in the status bar. Most graph apps ship a blank canvas here.
- The cold band is the best idea in the product — a titled, counted enclosure for the three people with zero verified ties, rather than three unexplained orphans drifting at the rim. The gallery card even prints '0 건 · 평행 이력 1' per person, which makes the never-met distinction legible at the individual level.

### Defects

#### [blocker] The cast wall's sticky masthead decapitates every row scrolled under it
`src/components/Gallery.tsx / Gallery.css`

**Wrong:** The modal's header block — '20명' plus a seven-line bilingual explainer — is pinned and occupies ~300px of a ~1080px modal. It is opaque, so as you scroll, each row's portrait discs slide under it and vanish while that row's names, roles, archetype and stats stay visible below. In my own capture (scratchpad/gal3.png, G then scroll 1400px) the 김경훈 / 김유현 / 김남희 / 강지후 row shows four card bodies with four empty holes where the faces should be — only faint slivers of ring survive at the block's lower edge. shots/25-gallery-scrolled.png shows the same 300px block still pinned. Net usable scroll area is ~780px, which fits roughly one row.

**Matters:** This is the release whose stated headline is 'every cast member now has a real photograph', and the surface built to show all twenty of them hides the faces of every row after the first. A user scrolling the wall reads a list of decapitated cards. It also wastes 28% of the modal on prose that is read once.

**Fix:** Make only the title line sticky (~72px: '20명 · THE CAST' plus a one-line summary). Move the seven-line explainer into normal scroll flow at the top, or behind a '읽는 법' disclosure that links to the About sheet's HOW TO READ tab. Then set the season section headers to position:sticky; top:72px so the reader always knows which bloc they are in — which is what the sticky region should have been carrying all along.

#### [major] Opening the dossier leaves 곽범's name floating with no disc, and clips the cold band off the bottom
`src/graph/render.ts (drawLabels) + src/graph/GraphCanvas.tsx (camera fit)`

**Wrong:** With the dossier open the 530px panel covers part of the graph, but the label painter does not know that. In shots/04-dossier.png, 05, 06 and 19-laptop-dossier.png the caption '곽범' is painted at x≈1410 (KO) / x≈1265 (laptop) with no disc anywhere near it — his plate is entirely behind the panel and only his name leaks into the uncovered strip. Simultaneously the camera reframes on the selected node without accounting for the cold band, so 강지후 / 신승용 / 최연청's discs are cut in half by the bottom edge (19-laptop-dossier.png, 신승용's disc at y≈1147 is ~40% visible). This is a re-file: CRITIQUE.md line 155 reports both symptoms and neither has landed.

**Matters:** A name attached to nothing is the single most confusing thing a node-link diagram can paint — the reader's first assumption is that the label belongs to the nearest visible disc, which is somebody else. And the cold band is the app's own editorial invention; clipping it the moment anyone clicks a person means the three-people story is only visible in the untouched default view.

**Fix:** drawLabels already receives the uncovered viewport rect (the layout uses it via worldBox/view). Reject any label whose owning plate centre is outside that rect, exactly as the cold-band clip already rejects link segments. For the camera: after a selection, fit the union of {selected node, its ring-1 neighbours, the cold band's flat cluster bounds} into the uncovered rect rather than centring on the node alone (GraphCanvas.tsx:2236-2242 currently holds k and only re-centres x/y).

#### [major] '47 connections' counts three records the app says are not connections
`src/components/Intro.tsx:225 (and src/components/StatusBar.tsx:54-62, src/components/FilterRail.tsx)`

**Wrong:** Intro.tsx prints count(dataset.edges) = 47 under the label CONNECTIONS / 관계, and the status bar prints '관계 47'. 47 = 13 alliance + 5 betrayal + 7 rivalry + 12 outside + 6 same-season + 1 mentorship + 3 PARALLEL. But the cold band in the same screenshot says '아직 아무와도 얽히지 않은 사람들 · NO VERIFIED TIE · 3', the gallery note says a parallel record 'gets no tick' and 'is not counted', ui.ts:258 says '확인된 인연 수에는 넣지 않습니다', and the validator prints 'no verified tie: 3'. Worse, the filter rail lists 평행 이력 as the sixth row under a section header that reads literally '관계 / RELATIONSHIPS 7'. Verified against `npx tsx tools/validate-data.mjs` (edges 47, no verified tie 3).

**Matters:** The brief asks whether the parallel/verified distinction is legible or merely correct. It is merely correct: the app makes the distinction in prose in three places and then contradicts it in the two biggest numbers on screen, on the splash and in the persistent status bar. A reader who counts — and this app invites counting — concludes the arithmetic is unreliable, which undermines every other number in it.

**Fix:** Intro: show 44 under CONNECTIONS and add the parallels as a footnote line, or relabel to '관계선 47' with a sub-line '확인된 인연 44 · 평행 이력 3'. StatusBar: same split. FilterRail: retitle the section '인연 · TIES 6' and move 평행 이력 out into its own single row beneath, headed '이력만 겹침 · NOT A TIE' — the row is already a different colour and a different dash rhythm, it just needs to stop living under a heading that calls it a relationship.

#### [major] By-archetype region captions are not attached to the regions they name
`src/graph/layout.ts (archetypeLayout) + src/graph/render.ts:2749 (drawCaptions)`

**Wrong:** Nothing sets Cluster.bare any more (layout.ts:126 says so explicitly), and drawCaptions only draws a leader for bare regions — so no archetype caption gets a leader line at all. In shots/09-archetype.png and my scratchpad/arch.png six of ten captions sit 150–250px out in empty black with nothing tying them to a hull: '배우 · 1명' and '크리에이터 · 1명' are two near-identical pink-dotted captions 220px apart with two pink circles between them, and it is genuinely ambiguous which belongs to 최연청 and which to 최혜선. '포커 플레이어 · 2명' and '기타 · 1명' sit stacked in the empty lower-left and read as a colour legend rather than as two region names; their hulls are up-and-right of them. Separately, the file's own opening rule — 'two enclosures that mean different things may not intersect at all' — is visibly violated where the five-person 전문직 hull runs into the 뮤지션 and e스포츠 hulls.

**Matters:** This is one of four top-level layout modes, and its entire payload is 'which archetype is this person'. If the reader has to guess which caption names which circle, the mode delivers nothing that hovering a node would not, and it delivers a hairball of 47 cross-cluster edges on top. It is the weakest of the four and the one most at risk of being redundant.

**Fix:** Drop the `slot >= NEAR_SLOTS || strayed` gate for cluster captions and stroke the CAPTION_GAP leader hairline for every non-flat region, using markR for singletons (the code at render.ts:2749 already does this for bare — just widen the condition). Then either grow the inter-hull spacing until no two archetype hulls intersect, or attenuate cross-cluster links to near-zero in this mode so the enclosures are the only strong figure on screen.

#### [major] Portraits are struck at 300px and upscaled ~2× at working zoom; the softness is conspicuous against razor-sharp vector rings
`src/graph/portraits.ts:327-330 (cap = Math.min(512, src)) / src/graph/plate.ts:376`

**Wrong:** The graded buffer is capped at the source's own square — 300px — then drawImage scales it to the device diameter. At maximum zoom the disc reaches ~560-600 device px (my scratchpad/maxzoom2.png, 박지민 at 1600×1000 DPR 2): the hair edge dissolves into flat blobs, the lash line and lip edge have no defined boundary, and skin has the plastic smear of a bicubic upscale. The plate's own furniture — the blue archetype ring, the beaded S3 arc, the rim ticks — is vector and pin-sharp in the same 8px of screen, so the face reads as the low-fidelity element in its own medallion. This is a re-file: CRITIQUE.md lines 186-192 measured the same files at 0.358-0.572 bpp and asked for 600×600; nothing changed.

**Matters:** The photograph is now the default presentation and is meant to be the reason to look. Zooming in is the natural gesture for 'who is that' and it is the gesture that most degrades the answer. The contrast with the crisp rings makes it read as a bug rather than as a compression budget.

**Fix:** Ship 600×600 at quality ~78 (≈25-35 KB each, ~600 KB for twenty — trivial next to the two variable fonts already loading) and let tools/vite-plugin-portraits.mjs emit both sizes; pick by devicePixelRatio × k in photoKeyOf. If the owner cannot resupply, clamp the camera's max k so the plate diameter never exceeds `src` device px — a slightly less zoomy graph is better than a mushy one.

#### [major] The twenty read as two shoots: exposure is corrected, background luminance is not
`src/graph/portraits.ts (the exposure pass)`

**Wrong:** The measured per-image correction normalises mean exposure but leaves the field behind the head alone, so the annulus between the face and the disc rim varies by shoot. On the cast wall (shots/24-gallery.png, 25-gallery-scrolled.png, my scratchpad/gal3.png) 이상민, 박지민 and 최혜선 carry a clearly readable mid-grey studio backdrop inside the disc, while 허성범, 정근우 and 신승용 sit on near-black. Side by side in the same four-up row that is the most visible tell in the set — the eye reads it as two different lighting setups before it reads any of the ring encoding.

**Matters:** The brief asks whether the wall reads as one set. It does not, and the failure is in the one place the app has full control (the annulus, which is pure background) rather than in the faces, where variation is unavoidable and forgivable.

**Fix:** After the exposure pass, multiply a radial matte keyed to the disc: unity inside ~0.55r, ramping to a fixed target value at the rim, with the ramp strength solved per-image from that image's own measured rim luminance so every plate's outer annulus lands on the same value. That normalises the shoot without touching the face, and it doubles as the 'seat' the brief asks about — the photograph would then visibly bed into the plate instead of sitting on it as a circular sticker.

#### [major] The one legend-free graphic the build invented — a line that stops short and ends in an open circle — is never explained
`src/graph/render.ts:764-793 (coldCrossing, COLD_STOP_PX / COLD_CAP_PX) + src/data/i18n/ui.ts (about.tile* keys)`

**Wrong:** Parallel-record edges are clipped at the cold band's rail and capped with a small open circle. Those three caps are in the default view of every desktop and mobile capture (shots/02 at ≈846/1034/1188 × 858; shots/21-mobile-graph.png at y≈1400). There is no legend tile for it — the HOW TO READ grid's twelve about.tile* keys cover plate, size, ring, arcs, halo, dashed season, beaded, no-ties rim, dashed line, arrow, edge click and the cold band, and none covers this — and no note in the rail beside 평행 이력. On mobile the reading order is worse: the open circle sits directly above the '강지후' caption, so it reads as part of his stack.

**Matters:** The reasoning in the code is excellent — a non-meeting should visibly refuse to enter the band. But an invented symbol with no key is decoration. The user sees three teal dashes terminating in empty rings that point at nobody, which is exactly the 'broken/dangling edge' reading the device was meant to prevent.

**Fix:** Add an about.tileParallelStop card to the HOW TO READ grid showing the clipped line and its cap with the copy that already exists at ui.ts:258 ('기록은 겹치지만 만난 적은 없는 관계입니다'), and add a one-line foot under the 평행 이력 row in the FilterRail alongside the existing 'dashed = history from outside the house' note. Also nudge the three stub x-positions so each lines up with the person it points at — they currently land at 846/1034/1188 against band members at 827/1080/1352.

#### [major] Shift+Enter path tracing is documented in the Shortcuts tab and does not work as documented
`src/graph/GraphCanvas.tsx:3204-3207 (and src/components/Dossier.tsx:918)`

**Wrong:** The Shortcuts tab (shots/13c-about-shortcuts.png) prints 'Enter — 커서가 놓인 인물 열기' immediately followed by 'Shift Enter — 선택한 인물과 커서가 놓인 인물 사이의 경로 추적'. But Enter opens the dossier and the dossier focuses its own heading, so the canvas no longer has focus and Shift+Enter goes to the panel. Verified: canvas.focus() → ArrowRight → Enter → ArrowRight ×2 → Shift+Enter produced zero path elements and no change to the hash; the identical sequence with an explicit canvas.focus() re-inserted after Enter produced #path=hong-jin-ho,kim-yoo-hyun immediately. The source comment at GraphCanvas.tsx:3204 already admits 'the SHORTCUTS tab's documented Enter, then Shift+Enter to trace fails as written'.

**Matters:** Path tracing is one of the two headline interactions in this build and it is keyboard-unreachable by the only route the app documents. A keyboard user follows the printed instructions, gets nothing, and has no way to discover that an undocumented Shift+Tab back to the canvas is required. Documented-but-false shortcuts are worse than absent ones.

**Fix:** Either keep focus on the canvas when Enter opens the dossier (move focus into the panel only on an explicit Tab, and announce the open via the existing role=status live region), or register the Shift+Enter binding at document level whenever atlas.selectedId is set so it fires regardless of which of the two surfaces holds focus. The second is a three-line change in App.tsx's existing key handler.

#### [major] The dossier stays open on a person the filters have removed, over an empty graph
`src/state/useAtlas.ts / src/App.tsx / src/components/StatusBar.tsx`

**Wrong:** Turn every lineage chip off (my scratchpad/B-empty.png). The canvas correctly says '조건에 맞는 사람이 없습니다 · 필터를 해제하면 20명이 모두 돌아옵니다' and the rail reads 0/20 — but the right panel still shows 홍진호's complete file with '관계 12' and '이미 마주친 사이 11', and the status bar still reads '홍진호 선택됨 · Shift+클릭으로 두 사람 사이 경로 추적 · Esc로 해제' over a canvas containing zero nodes.

**Matters:** Three surfaces disagree about whether anyone is on screen, and the status bar instructs an action (Shift+click a second person) that is impossible in the current state. It also undermines the otherwise excellent empty state next to it — the empty-state copy reads as a bug report when a full dossier is sitting beside it.

**Fix:** When !visible.has(selectedId): either drop the selection (and say so — 'filters removed 홍진호'), or keep the panel and badge it '현재 필터에서 제외됨 / hidden by current filters' under the name, greying the 관계 chips. Either way swap the status hint back to the idle string when relationCount is 0.

#### [minor] A cold load can paint monogram plates where photographs belong — a mixed wall of faces and initials
`src/graph/plate.ts (mark fallback) / src/graph/portraits.ts`

**Wrong:** In shots/26-en-graph.png seven of twenty nodes are drawn as name-monogram discs while thirteen carry photographs: Lee Gwan-hee ('Gwan hee'), Kim Yoo-hyun, Kwak Beom, Kim Nam-hee, Kang Ji-hoo, Shin Seung-yong, Choi Yeon-cheong — exactly the seven lowest-degree, smallest-radius nodes. The same file in Korean (02) shows all twenty with photos. It did not reproduce on my warm 3s reload or on a live language switch, so it is a decode race won by the large plates and lost by the small ones, not a missing asset (0 failed requests either way).

**Matters:** The brief states the monogram is 'never drawn anywhere' and only reachable by deleting a file. In practice a first visit on a cold cache paints a wall that is half photographs and half initials — visibly inconsistent, and it makes the size-encodes-degree channel read as 'small nodes are different in kind' rather than 'small nodes have fewer ties'.

**Fix:** Do not composite the mark as an eager fallback. Draw the plate with an empty seated disc (the vignette alone) and cross-fade the photo in when the decode resolves, so the medallion never changes kind mid-load. Reserve the mark strictly for the case where the file genuinely does not exist — which the vite plugin already knows at build time, so it can be a static per-person boolean rather than a runtime race.

#### [minor] Orbit is a quarter of the primary nav and is dead on every fresh load
`src/App.tsx:372 / src/components/TopBar.tsx:637 (aria-disabled) / src/graph/layout.ts:2086`

**Wrong:** The fourth mode tab is aria-disabled until a person is selected; pressing 4 is a silent no-op; clicking it only flashes '인물을 먼저 선택하세요'. The layout's own handoff note at layout.ts:2086-2094 says the mode now composes fine for an empty selection and asks for one string — an eyebrow naming the auto-chosen subject — which was never written. Circumstantial evidence that this trips even the project's own tooling: shots/07-orbit.png and shots/23-path-trace.png are byte-identical (7,102,189 bytes) and both show the Web tab active, i.e. the capture script asked for orbit and got web; shots/14-filtered.png does not exist at all.

**Matters:** A newcomer's exploration of a four-item nav includes clicking the fourth item. Getting a refusal there in the first ten seconds teaches that the chrome is unreliable, and the refusal is unnecessary — orbitLayout already falls back to the highest-weight node.

**Fix:** Enable the tab. On entry with no selection, centre the highest-weight person (홍진호) and paint the eyebrow the layout note asks for: '{name} 중심 / centred on {name}'. Two string keys and deleting the isLocked guard.

#### [minor] The HoverCard covers the ties it exists to explain
`src/components/HoverCard.tsx / HoverCard.css`

**Wrong:** The card is always placed down-and-right of the pointer. In shots/03-hover.png, hovering 홍진호 — the hub, twelve ties — puts a ~280×400 card squarely over 이태균, 정근우 and the lower half of 박지민, and clips 이태균's caption to '…태균'. Those are three of the nodes whose links have just been lit by the hover.

**Matters:** The hover is the shortest path from 'I see a blob' to 'I understand a relationship', and on the densest node in the graph the readout hides a quarter of the answer. The card's own content ('가장 강한 인연 · 서출구') points at a node the card is not covering, which makes the occlusion feel arbitrary.

**Fix:** Score the four quadrants around the pointer by how many highlighted (focus > 0) link segments and lit node discs each would cover, and place the card in the cheapest one, falling back to down-right on a tie. The renderer already computes per-link focus, so the count is available for free.

#### [minor] Caption leader hairlines use the same visual channel as the 'same season' edge
`src/graph/render.ts:2352 (strokeStyle alpha(INK_LOW, 0.7), lineWidth 1)`

**Wrong:** Strayed captions get a solid 1px INK_LOW hairline from plate rim to text box. The 같은 시즌 / Same season edge type is a solid grey-lavender line at roughly 2px. In shots/16-zoomed-in.png and 17-zoomed-out.png, 하승진's and 홍진호's names hang on long near-vertical grey lines that are indistinguishable at a glance from a same-season tie running off into empty space — in 16 홍진호's leader is ~110px long and terminates in text, which is exactly what a mis-drawn edge would look like.

**Matters:** This app's whole premise is that every stroke on the canvas means something specific. A typographic tether painted in the relationship language is the one place where a stroke means nothing and looks like it does — and it fires most on the zoomed and filtered views, where the reader is already working harder.

**Fix:** Give the leader a channel no edge uses: dash it [2/k, 3/k] and drop the width to 0.75, or terminate it in a 1.5px dot at the plate rim. It only has to survive as an attachment cue; it must not survive as a line.

#### [minor] The graph's key is a ghost in the default desktop view
`src/components/FilterRail.tsx / FilterRail.css (section order and scroll mask)`

**Wrong:** '노드 읽는 법 / NODE KEY' is the only place the plate encoding is explained without opening the field guide. At 1600×1000 (shots/02, 03, 07, 08, 09, 14) exactly one of its five rows is visible — '크기 = 연결 수' — and it sits inside the rail's bottom scroll mask, rendered at an alpha that reads as disabled rather than as scrollable. The other four rows (ring colour, outer arcs, brass halo, remaining marks) are below the fold with no scrollbar and no affordance beyond a jump-link strip.

**Matters:** The brief asks whether the encoding is discoverable without opening help. It is not: the one on-screen key is faded to the point of looking switched off, while a 7-row relationship filter that the reader has no reason to touch yet occupies the space above it.

**Fix:** Reorder: Lineage → Node key → Relationships, and ship Relationships collapsed by default (the section is already a <button> with a chevron). Or raise the mask's floor so a half-visible row still reads as live type rather than as a disabled control.

#### [minor] Mobile: primary navigation sits below the utility icons, and section headers are at the WCAG target-size floor
`src/components/TopBar.css / FilterRail.css (mobile breakpoints)`

**Wrong:** At 390×844 (shots/21-mobile-graph.png, my scratchpad/m-lock.png) row one is search / language / fit / rail / gallery / help and row two is the four layout modes — the least-used controls above the most-used. Measured target sizes in the same viewport: the rail's section-header buttons (관계, 노드 읽는 법, 직업군, 가장 얽힌 인물) are exactly 24px tall, i.e. sitting on the WCAG 2.5.8 minimum with zero margin; the filter-panel close button is 30×30; the lineage chips are 30px tall; language buttons 44×38. Also, the three cold-band captions take three different placements in one three-node row (강지후 above its disc, 신승용 to the right, 최연청 above), with the band's own caption below all of them.

**Matters:** On the device where thumb reach and target size matter most, the four things a user switches between constantly are one row further from the thumb than the six things they touch once, and four controls are at the legal floor rather than the comfortable one.

**Fix:** Swap the two rows at the mobile breakpoint. Raise the section-header buttons to 36px min-height and the chips to 36px (the type does not need to grow — pad the hit area). For the cold row, force a single caption side for all band members: the renderer already solves coldSide for the band's own caption, so pass the same answer to the three member labels.

#### [nit] A switched-off relationship type keeps its count at full brightness
`src/components/FilterRail.css`

**Wrong:** In the off state (my scratchpad/rail-off.png, #e=alliance,betrayal) the swatch dims and takes a diagonal strike and the label dims — but the trailing count (7, 12, 6, 3, 1) stays at the same value as the two live rows. Separately, 같은 시즌's swatch is itself grey, so grey line + grey strike collapse into an illegible smudge at 13px, making it the one row whose state cannot be read from the swatch at all.

**Matters:** The number is the brightest thing in a disabled row, which reads as 'this filter is on and matches 6' rather than 'this filter is off'.

**Fix:** Dim the count to --ink-low in the off state alongside the label. For 같은 시즌 specifically, strike in --ink-hi rather than in the swatch's own family so the two marks separate.
