# CRITIQUE — round 16

| pillar | score | prev |
|---|---|---|
| visual | **7** | 6 |
| polish | **6** | 7 |
| depth | **8** | 8 |
| ux | **6** | 6 |
| motion | **5** | 6 |

---

## VISUAL DESIGN & ART DIRECTION — 7/10

> The colour system, the tone/backdrop correction and the cold open are the work of someone genuinely good, but the picture doesn't cash the reasoning: at common viewports the four most-connected people are anonymous faces, the round's headline feature (a photograph) is never drawn at a size where a face resolves, and two of the four layout modes are visibly less composed than the default.

**Biggest single win.** Make the photograph the object rather than the filling. R_DISC is 27 against R_LAUREL_OUT 49.4, so the face is 30–34% of the mark's area on every surface, and the sources are 4.0–6.4 KB WebP (0.36–0.57 bpp). Re-encode the twenty at q80–85 (~20 KB each; 400 KB total against 104 KB now), raise R_DISC to ~35 against the same 49.4 outer on the Gallery card and the Dossier crest, and lift the web layout's fill target from the measured 45–53% to ~75%. That single change takes the face from a colour swatch with a head in it to the thing the atlas is about, and it simultaneously relieves the crowding that makes the caption solver drop names (the blocker).

### [blocker] At ≤~1024px the four highest-degree people are drawn with no name at all

`src/graph/render.ts` · Live capture at localhost:5173, 580×622 and 1024×700 (English). Contrast with shots/02-graph-default.png at 1600×1000 where all twenty are named.

**Wrong.** Driven live at localhost:5173 at 580×622 and again at 1024×700, sixteen of twenty nodes carry a caption. The four that do not are always the densest, most central discs — 홍진호 / Hong Jin-ho, 이진형 / Lee Jin-hyung, 이상민 / Lee Sang-min, 정근우 / Jung Keun-woo. drawCaptions' seat ranker refuses a seat rather than veiling one, which was survivable when a monogram was painted inside the disc; now that every plate carries a photograph and the mark is never drawn, a dropped caption leaves an unlabelled 20px face. The shipped 1600×1000 captures (02-graph-default.png, 26-en-graph.png) all name twenty, which is why this was not caught — it only fires once the rail eats enough width.

**Why.** This is a cast atlas. Its entire job is 'who is this'. At a half-screen browser window — not an exotic size — the four people a reader most wants named are unidentifiable photographs, and the caption is by the brief's own account the whole of a node's identification.

**Fix.** The VEIL path already exists in drawCaptions. Make it the terminal fallback for any node where named(n) is true: a name at ~0.33 alpha laid over a plate is strictly better than no name on a plate that carries no mark. Alternatively hard-guarantee a seat for every node above a degree threshold and let lower-degree captions be the ones that yield. Add a regression to tools/assert-visual.mjs asserting captions drawn === nodes visible at 580, 768, 1024 and 1280 in both languages.

### [major] The photograph is never drawn at a size where a face resolves, on any surface

`src/graph/plateGeometry.ts` · shots/16-zoomed-in.png (crop of 이태균 at max zoom); shots/24-gallery.png row crops; shots/04-dossier.png crest crop; ls -l public/portraits/*.webp.

**Wrong.** R_DISC=27, R_RIM=40.4, R_LAUREL_OUT=49.4, so the face occupies 30–34% of the mark's area everywhere. Measured: default web view discs are 27–46 CSS px diameter (world r 28.6–37 × k 0.32); the Gallery card gives the face ~55 CSS px inside a ~180px ring assembly; the Dossier crest gives it ~45 CSS px beside a 36px name. At maximum zoom the photo reaches ~163 CSS px (326 device px at 2×) — but the sources are 4,026–6,432 bytes at 300×300, i.e. 0.36–0.57 bits/pixel, so 16-zoomed-in.png shows mushed hair edges, a smeared collar and blocking across 이태균's cheek. The face is too small everywhere it has room and too soft everywhere it has size.

**Why.** Twenty real photographs are the headline of this round, and in the default state they are indistinguishable brown ovals; the Gallery — a cast wall whose only content is faces — gives the decorative apparatus three times the area of the subject. The reader never gets the payoff the assets were bought for.

**Fix.** Two independent moves. (1) Re-encode the twenty at q80–85 (~20 KB each, 400 KB for the set against 104 KB now) and/or supply 600×600; the file budget here is a rounding error next to the fonts. (2) On the two surfaces with no crowding pressure — Gallery.tsx's card and the Dossier crest — pass a plate variant with R_DISC ~35 against the same R_LAUREL_OUT 49.4, taking the face from 30% to ~50% of the mark's area. Leave the graph node's ratio alone; there the crowding is real.

### [major] The twenty crops are never normalised — coverRect() short-circuits on square sources

`src/graph/portraits.ts` · shots/24-gallery.png rows 1 and 2 (crops), against src/graph/portraits.ts:958 `if (w === h) return { sx: 0, sy: 0, sw: w, sh: h };`

**Wrong.** coverRect() returns `{sx:0, sy:0, sw:w, sh:h}` whenever w===h. Every supplied file is 300×300, so the 38% head bias documented directly above that function never executes on a single portrait. The result is visible on the wall: measured off 24-gallery.png, head height runs from ~55% of the disc diameter (이상민) to ~85% (정근우, 하승진, whose hair is clipped by the rim), and the eye line sits anywhere between 35% and 48% of the disc height. Row 2 is the clearest — 하승진's face nearly fills the disc while 현성주's sits in a pool of dark shoulder.

**Why.** The exposure and backdrop-key work is excellent and does make the set read as one lighting setup; the framing is then what gives away that these came from twenty sources. On a grid of twenty discs, inconsistent head scale and eye line is a stronger 'different photographers' cue than exposure, because the eye lands on it first.

**Fix.** Add two optional numbers per person to the manifest — a crop scale and a vertical offset — hand-set once against a target of eye line at ~40% of the disc and head height at ~70%, and have coverRect honour them even when the source is square (make the w===h branch apply the offset rather than return early). Twenty pairs of numbers, one afternoon, and the wall becomes one set.

### [major] In by-season mode a caption sits 145px above its own node and lands on the row above's caption line

`src/graph/layout.ts` · shots/08-seasons.png, crop of the bottom hull; compare the leader on Choi Hye-sun in shots/26-en-graph.png.

**Wrong.** The '이전 시즌 없음 · 8명' hull holds eight nodes in two staggered rows, and its eight captions take four different bearings. 신승용's caption is seated ~145px ABOVE its node, which lands it on the horizontal band occupied by 김유현's and 이관희's captions — so it reads as a member of the top row, which it is not. 김남희's, directly beside it, is seated BELOW. 강지후's is 150px up-left, 최연청's 185px up-right. No leader line is drawn for any of them, although the leader system exists and fires in web mode at half those distances (26-en-graph.png draws a dotted leader from Choi Hye-sun to her disc).

**Why.** A caption that identifies the wrong person is worse than no caption. It also means only the default layout was actually composed — render.ts explicitly seats the web mode's cold band as a row ('THE COLD BAND IS A COMPOSED ROW, so its three names are set as a row'), and the cluster hulls got no equivalent rule, so by-season and by-background read as force-layout leftovers with labels sprayed on.

**Fix.** Extend the row-seating rule to cluster hulls: within one hull, seat every caption on the same side and on one baseline per row, and space the row evenly. Separately, lower the leader threshold and apply it in all four modes — draw a leader whenever the caption's centre exceeds ~1.2× the plate radius from its disc.

### [major] Path trace and selection dim the captions and edges but not the plate rings, so nothing focuses

`src/graph/render.ts` · shots/23-path-trace.png, crop around 홍진호 / 이상민 / 정근우.

**Wrong.** With a two-person path traced, off-path captions drop to grey and off-path edges recede — but the plates keep full chroma. 이태균's brass laurel plus his green season arc, 윤비's violet archetype ring and 박지민's blue ring with its amber bead arc are all painted at essentially resting saturation while their names are dimmed. Meanwhile the path itself gets no dedicated stroke: the 홍진호→이상민 hop is an ordinary orange dash and 이상민→정근우 an ordinary pale grey-blue line, both at their normal weight. The three brightest objects in the frame are three plates that are not on the path.

**Why.** Shift-click path tracing is a headline interaction, and it produces a frame where the eye is pulled to a brass laurel in the corner instead of to the chain. The reader has to hunt for the answer to the question they just asked.

**Fix.** Multiply the plate ring alphas by the same dim curve the captions already use (the dossier-selection case appears to do this — 04-dossier.png shows 이관희 and 곽범 properly knocked back — so this is a missing branch in the path-trace state, not new machinery). Then give the traced links a casing: a 2px BONE stroke under the type colour, so the chain is unambiguously the heaviest line in the frame.

### [major] 'No verified tie' and 'never played a prior season' are the same shape at the same radius

`src/graph/plate.ts` · shots/02-graph-default.png cold-band crop (강지후, 신승용, 최연청); shots/13-about-legend.png cards 5 and 7.

**Wrong.** plate.ts:707 strokes the no-ties mark as a dashed hairline in INK_LOW at rRim. The same three people are also rookies, so they carry the dashed 'never played a prior season' ring too — 강지후 and 최연청 render as two concentric broken circles separated only by a few pixels and by hue at 1px width. The About sheet reproduces the ambiguity: cards 5 ('점선 시즌 고리 = 이전 시즌에 출연한 적 없음') and 7 ('가는 회색 테두리 = 확인된 인연이 아직 없음') are both 'a dashed ring around a disc'. At the default 27–46px node the two are not separable.

**Why.** This is the exact question the round was meant to answer — is the cold state legible or merely correct. The answer is: legible at the BAND level (the shelf and its caption work), and not at the plate level, so the moment one of those three appears anywhere other than the shelf (the gallery, the by-season hull, a search row) the distinction evaporates.

**Fix.** Use the move the file already proves works. plate.ts:719 says of the winner's laurel, 'A different SHAPE rather than a different shade' — do the same here. Make no-verified-tie a single continuous hairline at low alpha with a deliberate gap at 12 o'clock, or an open arc, so it is not a dashed ring at all. Then the two marks differ in kind, not in dash length.

### [major] The graph fills under half the canvas, and the empty half is not negative space

`src/graph/layout.ts` · Live window.__atlasDebug.fill(); shots/02-graph-default.png and shots/17-zoomed-out.png.

**Wrong.** window.__atlasDebug.fill() reports hFill 45.4 / vFill 56.5. Measured off the shipped 1600×1000 capture, the tied mass spans ~53% of the canvas box in both axes. The remainder is not composed: 곽범 sits stranded ~400px out on the right with one long dashed edge, which becomes the picture's strongest diagonal by accident, and everything below the cold band is dead. The consequence is that every disc is drawn at roughly two-thirds of the diameter the frame would allow, which is what makes the photograph problem bite.

**Why.** A centred blob at half scale with chrome bolted round it is exactly the read the brief is worried about. There is no focal point — the eye enters, finds no hierarchy in the mass, and leaves. And the wasted scale is paid for by the faces.

**Fix.** Raise shapeToFrame's fill target to ~72–78% of the shorter axis (leaving the cold band's reserved drop intact). Separately, decide about 곽범: either give the single-edge outliers a shorter tether so they join the mass, or place them deliberately — a stated 'satellites' shelf on the right, like the cold band on the bottom — so the void is a decision rather than a remainder.

### [minor] The Orbit tab's shortcut chip is dashed while 1/2/3 are solid, spending the app's most loaded idiom on chrome

`src/components/TopBar.css` · 3× crops of shots/02-graph-default.png and shots/04-dossier.png, top bar x1030–2230.

**Wrong.** With no person selected the '4' chip is drawn with a dashed 1px border; once a person is selected it becomes solid (compare 02-graph-default.png with 04-dossier.png at the same crop). The tab label itself does not change — it stays the same --ink as the other two inactive tabs — so the entire 'this mode needs a selection' signal is carried by a dash on a 20×20 chip.

**Why.** Dashed is already overloaded in this product: outside-the-house edge, no-verified-tie rim, never-played-that-season ring. A fourth meaning in the chrome makes all four weaker, and at chip size it just reads as a rendering artefact. Also, the active tab's underline spans only the Hangul run and stops ~4px short of 망's right edge, so the primary nav has two small unresolved details.

**Fix.** Signal the unavailable mode on the label — drop 인물 중심 / Orbit to --ink-faint — and leave the chip solid. Keep dashes for data. Extend the active underline to the full label lockup (Hangul + Latin gloss) or inset it symmetrically.

### [minor] Dossier header hierarchy inverts: the stage alias outranks the person's romanised name

`src/components/Dossier.css` · shots/04-dossier.png, 1.6× crop of the crest and header, x2340–3420 y280–840.

**Wrong.** The crest lockup runs 홍진호 (~36px bone bold) → Hong Jin-ho (~20px --ink-mid) → 활동명 콩 · 폭풍저그 (~24px bone bold). The alias is set larger and brighter than the romanisation, so it is the second thing read. Below it, 前 프로게이머 · 프로 포커 플레이어 (~24px bone) and Former StarCraft professional · professional poker player (~22px --ink-mid) differ by under 10% in size, so four consecutive lines all sit between 20 and 24px and the whole lockup is separated by colour alone — precisely the flattening tokens.css's own ramp note warns about.

**Why.** In English the reader's own script for this person's name is the third-ranked line in their file, behind a nickname. And a header block with no size contrast reads as a paragraph, not a masthead.

**Fix.** Romanisation to --t-h3 (20px) --ink-sub set immediately under the name with no intervening line; alias down to --t-sm with its 활동명 label at --t-xs --ink-mid; insert a --sp-3 rule between the name block and the role block so the two groups separate by structure rather than by hue.

### [minor] Command-palette rows draw the full plate at ~26px, where neither the photo nor the rings resolve

`src/components/CommandPalette.css` · shots/11-palette-typed.png.

**Wrong.** Each result row carries the whole plate — photograph, archetype ring, season arcs, rim ticks — at roughly 26px. At that size the face is a two-tone smudge and the rings composite into a single coloured halo. Nothing on the row is identifying except the text, which the row already has. The bottom row is additionally caught mid-height by the scroll mask, so it sits at ~40% opacity and reads as disabled rather than as clipped.

**Why.** This is the fast-scan surface. Twenty near-identical coloured halos beside twenty names is visual noise that costs scanning speed rather than buying anything.

**Fix.** On list surfaces show a plain cropped disc at 40px with no ring apparatus — the photograph alone, which at 40px is at least a recognisable silhouette. Snap the scroll mask to row boundaries (scroll-padding on the row height) so a row is never half-faded.

### [minor] The intro's auto-advance bar has no track, so it reads as a stray misaligned rule under the CTA

`src/components/Intro.css` · shots/20-mobile-intro.png, 3× crop of the CTA block; also visible in shots/01-intro.png.

**Wrong.** A ~3px crimson bar sits ~40px under the ENTER button, spanning roughly the left third of the button's width, fading in on the left and terminating hard on the right. It is the auto-open countdown, but with no unfilled track behind it there is no way to read it as progress until it moves — statically it is a decorative rule hanging 130px off the centre of a rigorously centred layout.

**Why.** It is the last element on the app's most art-directed screen and it looks like a bug. It also spends --blood on state; tokens.css reserves crimson for the brand mark and betrayal and gives countdowns/state to --accent-*.

**Fix.** Draw a 1px --ink-faint track at the CTA's exact width, centred, with the fill in --accent. Under prefers-reduced-motion (where there is no timer) hide the whole element rather than leaving an empty track.

### [minor] tokens.css instructs the next designer to make a change that has already landed, and would re-break it

`src/styles/tokens.css` · src/styles/tokens.css:111–118 against src/graph/render.ts:325 and src/graph/plate.ts:273.

**Wrong.** Lines 111–118 state: 'THE CANVAS HAS NOT BEEN ROTATED YET… src/graph/render.ts still paints paintBackdrop's three stops as #0a0810 / #08070c / #060509 and the node body as #221d29 → #100d16, all of them 255–265°.' It has been rotated: render.ts:325–327 paints #0d0807 / #0a0706 / #070504 and plate.ts:273 paints #231e1c → #110e0b, exactly the warm values the paragraph proposes.

**Why.** This file is the design system of record and it is the first thing a new hand reads. A live 'known defect' block describing a fixed defect is how a fixed defect gets reintroduced, and it costs the reviewer time proving the picture is right.

**Fix.** Delete the paragraph and replace it with one line recording that both halves of the frame now sit on the warm side of neutral, plus the assert-visual check that holds it there.

### [minor] The 'how to read' legend grid leaves ~250px holes and its specimens have no common diameter

`src/components/AboutSheet.css` · shots/13-about-legend.png.

**Wrong.** The legend is a fixed 4-column grid on fixed rows. In row 2 one card carries nine lines of Korean and English while its three row-mates carry two or three, so all four cards stretch to the tallest and three sit above roughly 250px of empty tint. Separately the specimens are 56–84px across (card 1 a 28+56 pair, card 2 three 44s, card 3 a 56 with arcs to 78, card 4 a 56 with a halo to 84), vertically centred in a fixed band, and card 1's pair is centred as a pair so its large disc sits off the card's own axis.

**Why.** This is the one screen whose entire job is to demonstrate that the marks are a system. It is the worst place in the app for the specimens to be four different sizes on four different axes.

**Fix.** grid-auto-rows: masonry (or a two-column flow for the compound card), and normalise every specimen to one outer diameter with the subject disc on the card's vertical axis — pair specimens get the large disc centred and the small one offset.

### [nit] 'XITSUH' is the only all-caps caption in a set of twenty and takes no optical compensation

`src/graph/render.ts` · shots/26-en-graph.png at the 서출구 node.

**Wrong.** In English the caption set is nineteen title-case romanisations plus one all-caps run. Set at the same px with the same tracking as its neighbours, an all-caps Latin run reads roughly 12% larger and noticeably heavier — so this one name is the loudest caption in the frame for no reason, and reads as a system token rather than a person.

**Why.** It breaks the one typographic register the caption layer is supposed to hold, on the surface where twenty captions are the whole of identification.

**Fix.** Detect an all-caps run in a caption and apply --tr-caps plus a 1px size reduction, the same asymmetry tokens.css already documents for Hangul vs Latin tracking.

### [nit] Hangul + Latin lockups are baseline-aligned where they should be optically centred

`src/components/Intro.css` · shots/20-mobile-intro.png, 3× crop of the ENTER button.

**Wrong.** In the CTA, 들어가기 and the ENTER gloss share a baseline. ENTER is all-caps with no descender, so its optical centre sits ~2 CSS px below the Hangul's — measured at 3× on the capture, the Hangul run's box centre is at 325 and the caps run's at 337.5. The same device (Hangul heading + tracked Latin caps gloss) appears in the top bar tabs, every dossier section heading and the stat rail, so the error is systematic even where it is small.

**Why.** It is the app's single most-used typographic device. A 12%-of-cap-height sag on a pairing that appears forty times is the difference between 'typeset' and 'laid out'.

**Fix.** Align the two runs on centre rather than on baseline (align-items: center with a small translate on the Latin run tuned per size), or set the caps gloss with a -0.04em vertical nudge in the shared .latin utility.

### [nit] Mobile drops the wordmark entirely and lets the language toggle become the brightest object on screen

`src/components/TopBar.css` · shots/21-mobile-graph.png and shots/22-mobile-dossier.png.

**Wrong.** At 390px the 피의 게임X / CAST ATLAS lockup is not rendered at all — the top bar is a search icon, a 한국어|EN pill and four icon buttons. The pill occupies ~37% of the bar's width and its selected half is a filled bone capsule, making it the highest-contrast element in the entire frame, above the graph and above the brand.

**Why.** The crimson X lockup is this product's strongest single asset and it is absent from the phone. A language switch outranking the brand and the content is a hierarchy inversion on the most-used viewport.

**Fix.** Keep at least the diamond mark plus 피의 게임X at --t-sm in the mobile bar; reduce the language switch to a two-letter segmented control (KO | EN) at icon-button width and drop its selected fill to --chip-on-bg rather than solid bone.

---

## POLISH & CRAFT — 6/10

> The plate system, the bilingual setting and the dossier are genuinely flagship-grade, but the marquee new feature — the cold band — renders as a staggered scatter on every viewport I measured and gets a dashed rule struck through a cast member's name at 1280×800, and three more hard breakages (a filter row bisected mid-glyph in Korean, an English text collision in the new cast wall, curved-bracket separators with an orphan on wrap) sit in default states of mainstream sizes.

**Biggest single win.** Pin the cold row instead of springing it. Setting `fx`/`fy` on the three cold nodes once `alpha` drops below ~0.05 levels the band at every viewport in one change — and because the band's top rail and all three captions are computed off the highest disc, it simultaneously removes the 1280×800 strikethrough through 신승용's name, the full-line caption stagger, and the uneven pitch. That is the app's headline new feature going from "a clump dropped under a wall" to the composed row the code already says it is.

### [blocker] The cold band's dashed top rail is struck through 신승용's name at 1280×800

`src/graph/render.ts` · shots/19-laptop-dossier.png, crop of x 850–1550 / y 1170–1430 at 3×

**Wrong.** In shots/19-laptop-dossier.png the band's dashed top rail runs horizontally at the exact baseline of the caption 신승용 — the dashes enter on the left of the glyphs and exit on the right, so the name is literally struck through. Cause: `coldBounds()` sets `top = y0 − 74` (line 477), where y0 is the top of the highest cold disc. When `capBelow` is true the three captions are seated ABOVE their discs (the branch documented at render.ts:2682), but `top` reserves nothing for them — 74 world units at k=0.576 is 43 CSS px, and the caption block is taller than that. The rail is computed as if the captions were still below.

**Why.** 1280×800 is the most common laptop viewport, this is the default view with no interaction required, and the struck-through element is a real person's name inside the one frame in the app that makes a factual claim about them. A rule drawn through a name reads as a rendering failure, not as a container.

**Fix.** Make `top` a function of where the captions actually go: when `capBelow` is true, `top = min(y0 − 74, y0 − (captionBlockH(k)/k + COLD_CAP_GUTTER/k + 8))`. The same `captionBlockH` that `capFloor` already uses on line 507 is the number; it is just never spent on the top side.

### [major] The cold band is not a row — the three discs are off-level and unevenly pitched at every viewport

`src/graph/layout.ts` · Live probe via __atlasDebug.nodeScreenPos at three viewports; visible in shots/02-graph-default.png, 19-laptop-dossier.png, 21-mobile-graph.png

**Wrong.** Measured on the running app after a 7s settle, at rest (alpha 0): 1600×1000 — y = 797.9 / 787.6 / 800.5 (12.9px spread), x pitch 179.9 then 190.3; 1280×800 — y = 629.6 / 617.1 / 633.3 (16.2px spread), pitch 148.7 then 159.2; 390×844 — y = 659.6 / 654.3 / 664.4, pitch 67.6 then 71.0. The captions inherit the stagger, so in shots/02-graph-default.png 신승용's name sits a full line above 강지후's and 최연청's. `webLayout` anchors the row with a spring (`n.anchorW = 4`, strength 0.5 × anchorK 0.12) rather than pinning it; the mesh's charge and collide forces still win by 13–16px. The code comment at layout.ts:777–781 says this exact failure was fixed by stiffening the spring — it was not.

**Why.** The band's whole rhetorical job is 'these three are one class, presented as one object'. Three items presented as a rank, arriving as a scatter, undoes the claim — and the brief's question ('does the app make the distinction legible or merely correct') is answered by this composition first.

**Fix.** Stop springing and start pinning once the transit is over: keep the spring for the fly-in, then set `n.fx = n.ax; n.fy = n.ay` on the cold nodes when `alpha < 0.05` (or after the layout's tween completes). d3's fx/fy is the right tool here — the comment rejects it for losing the transit, but the transit only needs the spring for the first ~600ms. Alternatively exclude cold nodes from the charge and collide forces entirely; they have no links and nothing needs to repel them.

### [major] The filter rail's scroll bisects a row mid-glyph in Korean at 1280×800

`src/components/FilterRail.css` · shots/19-laptop-dossier.png (crop x 20–640 / y 1220–1420 at 3×) and a live Playwright measurement at 1280×800 ko

**Wrong.** Measured live at 1280×800 in Korean: the `평행 이력 / Parallel record / 3` row occupies y 646.0–677.9 and `.frail__body`'s content box ends at 663.8 — so 17.8px of a 31.9px row is painted and then hard-cut by the panel's 1px border, with the top half of the Hangul fully legible. The bottom fade is not deep enough to hide it. In English at the same size the row heights happen to divide evenly and the cut lands in a gutter, so the defect is Korean-only — i.e. it is invisible in the language the developer tests in and present in the source language. shots/28-en-dossier-scrolled.png shows the same cut on `Outer arcs = prior seasons` at 1600×1000, so it is not width-specific either.

**Why.** A half-glyph clipped against a hard border reads as a paint bug, not as 'there is more below' — which is exactly the failure the comment at FilterRail.css:465 says the fade was added to prevent.

**Fix.** The fade depth is currently tuned to the 36px control at the end of the list; make it at least one full row (36px+) AND add `scroll-snap-align: end` to `.frow` so a rest never lands mid-row — the file already uses `scroll-snap-type: proximity` with snap points on section starts, so extending them to rows is a two-line change.

### [major] Jump-nav separators are curved brackets, and wrapping leaves an orphan one

`src/components/FilterRail.css` · Live 1280×800 EN capture, crop x 40–600 / y 520–620 at 4×

**Wrong.** `.frail__below-b + .frail__below-b { border-left: 1px solid var(--glass-edge-strong) }` sits on an element that also has `border-radius: var(--rad-xs)` (line 428). The radius rounds the ends of the 1px left border, so every separator paints as a curved '(' bracket rather than a straight rule — clearly visible at 4× on the live 1280×800 English rail. Worse, in English the four items wrap to two lines and the adjacent-sibling selector still fires on the first item of line 2, so 'Most connected' carries a leading orphan bracket hanging in the left margin with nothing before it.

**Why.** It is the one place in the app where a border is visibly the wrong shape, and the orphan reads as a stray glyph. It also means the rail's foot is one line tall in Korean and two in English, so the scroller's height silently changes with language.

**Fix.** Move the separator off the button: `.frail__below { gap: var(--sp-2) }` plus a `::before` on non-first children set to `border-radius: 0`, or simply add `border-radius: 0` to the border-carrying edge by splitting the radius (`border-radius: 0 var(--rad-xs) var(--rad-xs) 0` when a left border is present). For the orphan, either set `flex-wrap: nowrap` with `overflow-x: auto`, or lay the four items out as a 2×2 grid where column-1 items get no rule.

### [major] Gallery: the English record line collides with the tie count

`src/components/Gallery.css`

**Wrong.** shots/29-en-gallery.png, Park Ji-min's card: `S3 Ghost-casino dealer and purgatory butler11 ties` — the placement string and the right-aligned count touch with zero space between 'butler' and '11'. `.gallery__line` is `grid-template-columns: minmax(0,1fr) auto` with `gap: var(--sp-2)`, but `.gallery__run` carries `white-space: nowrap` (line 640), so the long English placement overflows its 1fr track and paints across the gap into the auto track. Korean does not trip it because 유령 카지노 딜러 is short — again a defect only visible in the non-default language.

**Why.** Two unrelated numbers running together ('butler11') is unreadable, and it is on the cast wall, which is the app's showcase surface for the new photographs.

**Fix.** Drop `white-space: nowrap` from `.gallery__run` and let the placement wrap (the flex container already has `flex-wrap: wrap` and `align-items: baseline`), keeping nowrap only on `.gallery__run-s` so the S1/S2/S3 marker never separates from its first word. Add `overflow-wrap: anywhere` to `.gallery__run-p` as a backstop.

### [major] The camera never re-fits — hiding the chrome or filtering leaves the graph small and high

`src/graph/GraphCanvas.tsx`

**Wrong.** In shots/15-rail-closed.png (14 of 20 shown, chrome hidden) the node cloud spans roughly 730×390 in a 1980×1120 canvas — about 13% of the frame — and its centre sits ~195px above the canvas centre, leaving the entire bottom half black. Measured live: toggling the rail off pans the camera correctly (x shifts by 152px) but k stays at 0.756, unchanged, so the 380px of canvas the rail gave back is spent entirely on emptiness. The same under-fill is visible in shots/17-zoomed-out.png.

**Why.** 'Chrome hidden' is meant to be the app's cleanest presentation and it is strictly worse framing than the default. And a filter that removes six people should let the remaining fourteen breathe, not shrink the picture's share of the frame.

**Fix.** Re-run the existing fit (the same path `F` / 'fit to screen' uses) whenever `viewRect` changes or the visible node set changes, unless the user has taken manual camera control (`anchorError.userCam` is already tracked). Tween k rather than jumping it so the change reads as the frame opening up.

### [major] The cold mark is merely correct, not legible: two dotted rings 6px apart mean two different things

`src/graph/plate.ts`

**Wrong.** 'Never played a prior season' is a dashed ring at `M_SEASON` = 34/27 = 1.26r in the archetype colour (line 551–556). 'No verified tie' is a dashed ring at `M_RIM` = 40.4/27 = 1.50r in INK_LOW (line 707–715). All three cold people are also franchise newcomers, so they carry both: two concentric dotted circles 0.24r apart, which at the default k≈0.75 and r≈36 is about 6 screen pixels of separation. In shots/02-graph-default.png the two rings on 최연청 and 신승용 read as one tinted dotted ring, while 곽범 — who has a tie — carries a visually identical orange dotted ring. The AboutSheet needs two near-identical swatch cards (shots/13-about-legend.png, cards 5 and 7) to tell them apart, which is the tell.

**Why.** With no monogram drawn, the plate's rings are the whole of a person's record at a glance. If the one mark that identifies the app's new cold state is indistinguishable from a mark eight other plates already wear, the reader has to fall back on the band's caption — and the band only exists in the web layout.

**Fix.** Give the cold state a different SHAPE, not a different hue at a near-identical radius — the same argument plate.ts already makes for the laurel at line 719. An unbroken hairline rim with a single gap at 12 o'clock, or a rim drawn as short inward ticks rather than outward dashes, both differ in form from the newcomer ring at every zoom. Failing that, suppress the newcomer ring on plates that also carry the noTies rim: 'no prior season' is implied by 'no verified tie' for this cast.

### [minor] By-season layout: three of eight captions in the 'no prior season' cluster are unattributable

`src/graph/render.ts` · shots/08-seasons.png, crop x 1250–2600 / y 1450–1750 at 2×

**Wrong.** shots/08-seasons.png, the '이전 시즌 없음 · 8명' cluster: 신승용's caption floats in the gap between the two disc rows with no leader stub, equidistant from 김유현's disc (upper row, left) and 이관희's disc (upper row, right) while its own disc is on the lower row directly beneath it. 최연청's caption sits two rows and ~120px away from its disc. The cluster hull's stroke passes through the top of 김남희's caption with no knockout. Leader stubs are drawn for 김경훈 and 이관희 but not for 김유현, 신승용 or 최연청 — the same solver, three different treatments in one 8-node cluster.

**Why.** The brief asks whether every visible node is named at several zooms; in this layout three of them are named ambiguously enough that a reader would attribute at least one caption to the wrong face. A caption on the wrong plate is, as render.ts:2091 puts it, a false statement about a real person.

**Fix.** Two changes: (a) draw the leader stub unconditionally whenever the seat's centre is more than ~1.2× plateExtent from the disc, instead of only for some seats; (b) add the cluster hull stroke to the caption collision map the same way `chromeBoxes` adds the viewport walls, so a caption never seats on a hull line.

### [minor] At high zoom the caption is seated on the plate's rings, not in a quiet annulus

`src/graph/render.ts` · shots/16-zoomed-in.png, crop x 2000–2700 / y 100–800 at 2×

**Wrong.** The inner-ring seat is `ir = min(r, max(rPhoto + 7, r * 0.55))` (line 2115), documented as landing on 'the plate's own quiet annulus'. On a winner's plate that annulus is the busiest part of the plate: in shots/16-zoomed-in.png, 이태균's second caption line 경찰관 · 변호사 is crossed by the rim-tick ring, with a grey rim tick sitting immediately under the descenders and the brass laurel's inner ring passing behind the whole block.

**Why.** It is the highest-fidelity view of the new photographed plate — the state a user reaches deliberately — and the name is set across the record marks that the plate exists to show.

**Fix.** Exclude the inner-ring seats when `n.isWinner` (that annulus carries three rings and sixteen spokes), or bias `ir` to the angular gap between `M_RIM` and `M_LAUREL_IN` rather than to `r * 0.55`. A cheaper fix: paint a short radial scrim (a soft radial-gradient wedge in the plate's body colour) under the caption box before the text, so the caption always sits on its own ground.

### [minor] 22 of 158 design tokens are never read — including every alias in the file's own state lookup table

`src/styles/tokens.css`

**Wrong.** A scan for `var(--x)` across src/ and index.html finds no consumer for --tab-on-bg, --tab-on-line, --tab-on-ink, --tab-on-gloss, --chip-on-bg, --chip-on-line, --chip-on-ink, --row-on-bg, --row-on-line, --row-on-rail, --icon-ink, --icon-ink-on, --match-bg, --match-ink — i.e. all fourteen entries of the 'STATE CHANNEL LOOKUP — this is a table, not a principle' block at lines 44–70, which exists precisely so component owners stop re-deriving state colour. The components reach past the aliases to the raw ramp: `--accent-tint` in AboutSheet.css ×3 and StatusBar.css ×2, `--accent-tint-strong` in Dossier.css and StatusBar.css. Also dead: --bg-base, --brass-deep, --accent-deep, --accent-ink, --accent-glow, --select-bg, --select-line, --t-h1, --t-lg, --t-nano, --sp-8, --sp-9, --d-cine, --z-toast, --inset-top.

**Why.** The file argues at length (lines 23–38) that a duplicated ramp nothing reads drifts silently and then hands the next person a fatal value through autocomplete. Fourteen unused semantic aliases sitting under a prescriptive table are the same trap, one level up.

**Fix.** Either repoint the components at the aliases (`.dossier__… { background: var(--row-on-bg) }`) so the table becomes true, or delete the aliases and delete the table with them. Add the same `retiredHexInCss` style assertion in tools/assert-visual.mjs for 'token defined but never read' so it cannot regrow.

### [minor] Portrait set: one plate reads as a grey coin among black ones, one is crushed

`public/portraits`

**Wrong.** At 1:1 in shots/24-gallery.png (season-1 row), 이상민's disc interior is a uniform mid-warm-grey that sits visibly lighter than the near-black interiors of 박지민, 정근우 and 이태균 beside it — the source has a light studio backdrop, which the median-exposure correction cannot address because it is a background-luminance mismatch, not an exposure one. At the other end, 정근우's plate is crushed dark enough that his eyes are barely readable at card size. Head scale also drifts: heads occupy ~52% of the disc diameter in the season-1 row and ~40% in the season-2 row, so 하승진, 현성주 and 이진형 all sit low with an empty top third.

**Why.** The wall is the one place all twenty are seen together, and one light disc among nineteen dark ones is the first thing the eye lands on — it reads as a missing image or a different asset pipeline rather than as a person.

**Fix.** Add a background-luminance term to the grading alongside the exposure gain: measure the median luma of the non-subject region (photoKey already produces the matte) and multiply the backdrop toward the set median before the ±25% exposure bound is applied. For the crop, anchor on the eye line at a fixed fraction of the disc (≈0.42 from the top) and normalise head width rather than frame width.

### [minor] 300px portraits against a 597 device-px node — the softness is visible well before max zoom

`public/portraits`

**Wrong.** Sources are 300×300. A graph node reaches 298 CSS px at maximum zoom, i.e. 597 device px at DPR 2 — a 2.0× upscale. In shots/16-zoomed-in.png, which is not even at max zoom (the disc is ~198 CSS px, a 1.3× upscale), 이태균's face already has no pore-level detail, a mushy hair edge and visible interpolation blur across the cheek — noticeably softer than every vector mark drawn around it, which stays razor-sharp because it is canvas geometry. The contrast between a crisp brass laurel and a soft face on the same plate is what makes it read as low-resolution rather than as shallow depth of field.

**Why.** The photographed plate is now the default presentation, and the zoom that shows it best is the one that shows it worst.

**Fix.** Ship 600×600 sources (still ~15–20KB each in webp at this quality; the whole set is currently 104KB, so the budget is there) and let the plate downsample. If the source assets cannot be re-supplied, cap the node's photo scale at 1.0× of the source and let the plate grow around a fixed-size disc past that zoom — a smaller sharp face is better than a large soft one.

### [minor] Intro stat block: the rule is narrower than the grid it caps, so the last gloss overhangs it

`src/components/Intro.css`

**Wrong.** Measured at 390×844: `.intro__rule` spans x 33.5–356.5 (323px) while `.intro__stats` is a `117px 117px 117px` grid spanning 19.5–370.5 (351px). Because 'CAST' is much narrower than its 109px label box and 'PRIOR SEASONS' nearly fills its own, the painted result is asymmetric — the first gloss sits inside the rule with air to spare while 'PRIOR SEASONS' paints roughly 10px past the rule's right terminal. shots/20-mobile-intro.png: the hairline visibly stops short of the last column.

**Why.** It is the first screen of the app and the only element on it is a centred stack; a cap rule that does not cap the thing under it is the one alignment error there is nothing else to distract from.

**Fix.** Give the rule and the grid the same box — either drop the rule's 14px inset so both span 19.5–370.5, or step the gloss down one size (`--t-nano`) and reduce its letter-spacing below 400px so the widest label fits inside 109px.

### [nit] About → How to read: one long card stretches its whole row to 2.2× the row above

`src/components/AboutSheet.css`

**Wrong.** shots/13-about-legend.png: row 1's four cards are ~250px tall; row 2's are ~380px because the '구슬 점선 호 …' card carries 5 lines of Korean plus 5 of English and the grid stretches its siblings to match. The other three cards in that row each end up with ~180px of empty base below their last line, so the eye reads three broken cards next to one full one.

**Why.** The legend is where a reader goes when the graph confuses them; a row that looks half-empty suggests content failed to load.

**Fix.** `align-items: start` on the grid so cards size to their content, with `row-gap` doing the rest — or split the beaded-arc card into two (beaded arc / solid outer ring), which is what its copy already is.

---

## INFORMATION DEPTH & EDITORIAL QUALITY — 8/10

> This is a genuine reference work — 16 season runs written with named moments and real scorelines, 52 argued connections, a derived head-to-head ledger, a documented list of pairs searched and *not* drawn, and a sourcing disclosure that counts its own weaknesses out loud — but it is kept off the top shelf by an English layer that contradicts the Korean on its headline player's headline moment, an intra-dataset factual drift the codebase's own comments already caught, and the fact that the one new public thing about season X (the five-bloc team format) is rendered as a colour swatch with no editorial word attached to it.

**Biggest single win.** Give the five X blocs actual editorial content. The team format is the season's premise and the only structural fact the atlas is permitted to state, and right now it is a colour swatch and a four-word origin label (lineage.ts) — no paragraph in the gallery bloc headers, no tab in the Field Guide, and the by-season layout dissolves the blocs entirely. The dataset already holds the two best sentences and never writes them: every Challenger arrives from a rival brain-survival franchise (김경훈·김유현 from 더 지니어스, 김남희 from 더 타임호텔, 강지후 from 대학전쟁3), and three of the four Rookies are precisely the three people the cold band flags as having zero verified ties — meaning the Rookie bloc and the cold band are the same casting decision described from two ends, and the app never joins them. Add a `blurb` per XTeam plus a 'The lineup' tab that sets the five blocs against each other on franchise seasons played, brain-survival credits elsewhere, and verified ties inside this twenty. That converts the atlas from 'twenty biographies with a graph over them' into an argument about why this particular twenty were put in a house together — which is the question a fan actually opens it with.

### [major] The English layer misstates 홍진호's day-one deception, contradicting both the Korean and its own bullet

`src/data/i18n/records.en.ts` · shots/28-en-dossier-scrolled.png; src/data/i18n/records.en.ts:265, 275, 315 vs src/data/records.ts:437, 447, 506

**Wrong.** Korean (records.ts:437) reads 최혜선을 이긴 척 위장한 채 낙원에 스파이로 복귀 — the pair WON together and he faked having beaten her, so Paradise believed she was gone. Both English surfaces render this as "passing off her win as his own" (records.en.ts:265) and "Hong Jin-ho passed her win off as his own" (records.en.ts:315). That is a different and incoherent claim: it makes her the sole winner and him a credit thief, and it directly contradicts the beat printed two lines below it, "Hid a day-one Death Match win and walked back into Paradise as a spy" (records.en.ts:275) — you cannot hide a win you are claiming. Visible in shots/28-en-dossier-scrolled.png.

**Why.** This is the single most-read paragraph in the app — the most-connected player (13 ties), on the moment his season-3 arc opens with. An English reader gets a factually wrong account of it, and gets it twice, on his page and on hers, so cross-checking does not rescue them. The file's own header says the Korean is the source of truth and 'every name, day number, score, placement and sum of money is carried across unchanged'; here the mechanic was not.

**Fix.** Rewrite both to the Korean claim, e.g. '…where he paired with Choi Hye-sun and took the opposing pair apart — and then opened his season with a piece of sleight of hand, passing their joint win off as a win over her and walking back into Paradise (낙원) as a spy.' On 최혜선's arc (records.en.ts:315): '…while Hong Jin-ho passed the result off as a win over her and kept his place upstairs.' Then add a validator assertion that pairs 홍진호's bg3 arcParts[1] with 최혜선's arc, since the two must describe one event.

### [major] 박지민's English placement string ignores the file's own split convention and overprints her tie count on the cast wall

`src/data/i18n/records.en.ts` · shots/29-en-gallery.png, Park Ji-min card; src/data/i18n/records.en.ts:91 vs src/components/Gallery.tsx:115

**Wrong.** Gallery.tsx:115 takes the head of a placement with `.split(/\s+[·—]\s+/)[0]`. Every other English placement carries a separator ('Winner — 1st of 10', '13th of 13 — first player eliminated in season 2'), so the head stays short. Line 91 is 'Ghost-casino dealer and purgatory butler' — no separator anywhere in it — so the whole 40-character string renders and collides with the tie count: the card reads 'Ghost-casino dealer and purgatory butler11 ties', with no space. The Korean equivalent, '유령 카지노 딜러 · 연옥 집사', splits correctly to eight characters.

**Why.** It is the franchise's only three-season figure, on the wall's third row of the first bloc, in the only surface that shows the whole cast at once. A run-together 'butler11 ties' is the kind of thing a reader reads as a broken app, and it undermines the wall's claim that every rim tick is a counted connection.

**Fix.** Change to 'Ghost-casino dealer · purgatory butler' (or '— purgatory butler') so the head becomes 'Ghost-casino dealer'. Then add a validator rule in tools/validate-data.mjs: any placement whose split head exceeds ~22 characters fails, checked on both language halves — this is a class of bug, not one string.

### [major] 김경훈's SNU degree is named two different ways on two surfaces, and his high school exists only on the edge

`src/data/edges.ts` · src/data/edges.ts:473 and :1064 vs src/data/people.ts:800

**Wrong.** people.ts:800 says 서울대 대학원에서 화학생물공학을 수학한 뒤 창업했다. The 김경훈×김유현 edge (edges.ts:473) says (이후 서울대 화학공학 석박사통합과정) — a different department. A comment inside the same file (edges.ts:1064) states the correct one, '김경훈, whose SNU is a 화학생물공학 graduate school', so the file already knows the edge is wrong. Separately, 민족사관고 appears in that edge description and nowhere on 김경훈's own entry — the exact inversion edges.ts's own header rule forbids ('IF A DESCRIPTION NAMES A PROGRAMME, AN AWARD OR A SCHOOL, THAT FACT ALSO BELONGS ON THE PERSON IT IS ABOUT').

**Why.** A reader who opens the edge card and then the dossier — which is exactly the flow the app is built for — sees two different degrees for one man, and no way to tell which is right. In a dataset this fastidious, one visible internal contradiction costs more credibility than the fact is worth. And the pair page again knows more biography than the person page, which is the drift the whole rule exists to prevent.

**Fix.** In edges.ts:473 change 서울대 화학공학 석박사통합과정 to 서울대 화학생물공학 석박사통합과정 (and the matching line in i18n/edges.en.ts). Promote 민족사관고 to 김경훈's bio in people.ts:800 and to peopleEn, then cut it from the edge so the edge describes only the shared UIUC years. Add a validator check that any school or department name in an edge description appears on at least one endpoint's own entry.

### [major] The five X blocs — the one genuinely new public fact about season X — carry no editorial content at all

`src/data/lineage.ts` · src/data/lineage.ts (whole file); shots/24-gallery.png bloc headers; shots/08-seasons.png

**Wrong.** lineage.ts gives each bloc a label, an origin string ('타 서바이벌 출신' / 'From other survival shows'), and a hex colour. That is the entirety of what the app says about the team format. There is no per-bloc paragraph anywhere: not in seasons.ts, not in the About sheet (which has tabs for Seasons, Track record, Glossary and The franchise but none for the lineup), not in the gallery's bloc headers (shots/24-gallery.png shows '시즌1 팀 SEASON 1 TEAM 4' and nothing else), and the by-season layout regroups by seasons *played*, dissolving the blocs entirely (shots/08-seasons.png).

**Why.** The team format is the premise of the season and the only structural fact the atlas is allowed to state, and it is the one thing a reader arrives wanting explained. Worse, the dataset already holds the two best observations and never makes them: all four Challengers come from *rival* brain-survival franchises (김경훈·김유현 from 더 지니어스, 김남희 from 더 타임호텔, 강지후 from 대학전쟁3), and three of the four Rookies are exactly the three people with zero verified ties (신승용, 최연청, plus 강지후 sitting in Challengers). The cold band and the Challenger bloc are describing the same casting decision from two ends and neither says so.

**Fix.** Add a `blurbKo`/`blurbEn` per XTeam in lineage.ts (four to six sentences each, derived only from facts already in people.ts), render it as a bloc header in Gallery.tsx above each section and as a hover on the FilterRail lineage chips, and add a 'The lineup' tab to AboutSheet between Seasons and Track record that sets the five blocs against each other — counting, for each, franchise seasons played, brain-survival credits elsewhere, and verified ties inside this twenty.

### [major] franchise.creator is a wired, labelled, empty slot — the atlas never says who makes the show

`src/data/seasons.ts` · src/data/types.ts:778, src/components/AboutSheet.tsx:600 and :1641, src/data/seasons.ts:159–166, src/data/i18n/seasons.en.ts:125

**Wrong.** `Franchise.creator?: string` exists in types.ts:778, AboutSheet.tsx:1641 has a rendering branch for it, and ui.ts carries the label ('제작' / 'Creator') in both languages — but `franchise` in seasons.ts:159–166 never sets it, so the row silently never appears. `FranchiseEn` in i18n/types.ts has no `creator` field at all, so even populating the Korean would leak Korean prose to English readers.

**Why.** A three-season franchise reference that never names the production company or the directors is missing the first thing a fan asks after 'who is in it'. It is also sourceable from pages already cited (the season 1/2/3 namu.wiki indexes carry 연출 and 제작), and the season-3 format shift the app describes at length — 일반인 casting to all-star — is a production decision that reads very differently once you can attach it to a name.

**Fix.** Populate `franchise.creator` in seasons.ts and add `creator` to `FranchiseEn` in src/data/i18n/types.ts plus the string in i18n/seasons.en.ts, citing the season indexes already in meta.sources. Then make validate-data.mjs fail on any optional field that has a render branch and an i18n label but no data — this pattern will recur.

### [major] 31 of 52 ties stand on namu.wiki alone, and 15 of them carry no 미확인 stamp

`src/data/edges.ts` · tools/validate-data.mjs output: "citations: 309 refs, 104 unique, 14 hosts, namu.wiki 241 (78.0%)" and "15 'high' edges still cite namu.wiki alone"; src/data/dataset.ts:58–60

**Wrong.** `npx tsx tools/validate-data.mjs` reports 241 of 309 citations (78%) are namu.wiki and prints an open item: "15 'high' edges still cite namu.wiki alone → pair each with press or an interview." Those fifteen are in the 49 the app does NOT mark 미확인, i.e. the ties it asserts hardest, sitting on a wiki anyone can edit and whose season pages keep moving.

**Why.** This is the ceiling on the whole thing. Every other quality here — the day numbers, the scorelines, the head-to-head ledger — inherits its reliability from the citation layer, and for 60% of the relationship lines that layer is one editable fan wiki. The five betrayal edges were correctly given non-wiki corroboration; the remaining fifteen 'high' ties were not, and a reader has no way to tell which fifteen.

**Fix.** Work the fifteen down: contemporaneous coverage exists for most season-2 and season-3 beats (뉴스1, iMBC, 네이트/뉴시스 are already in the file for other edges) and for the KBL and 아는 형님 items. Where none can be found, demote the edge to `confidence: 'medium'` so the 미확인 stamp fires — that is the honest resolution and it costs nothing but a badge. Ratchet the pinned number down in dataset.meta.sourcing as each lands.

### [minor] franchise.reception is the one padded paragraph in the dataset

`src/data/seasons.ts` · src/data/seasons.ts:164–165; src/data/i18n/seasons.en.ts:130–131 (renders in the Field Guide → The franchise tab)

**Wrong.** seasons.ts:164–165 reads 'Wavve 오리지널로 자리 잡으며 시즌을 거듭할수록 화제성이 커졌고, 특히 배신과 연합이 드러나는 회차마다 커뮤니티 반응이 집중되는 패턴을 보였다' (EN: seasons.en.ts:130–131). No viewership figure, no chart position, no date, no named community, no citation — and it renders under a heading, '반응 / Reception', that promises exactly those things. Every other paragraph in these files dates and numbers itself.

**Why.** It is the only sentence in the app a reader could not check, sitting in a Field Guide whose entire posture is 'we counted rather than waved at'. One unfalsifiable paragraph in that context reads worse than none.

**Fix.** Replace with something sourceable — Wavve's own weekly ranking for the finale weeks, the Good Data Corporation non-drama TV topicality placings the seasons charted in, or the specific episode that drove the biggest community spike — with a citation; or cut the field and let the section be Premise and Lineage only, which are both excellent.

### [minor] The 'No season X' callout states the same rule twice, back to back, in both languages

`src/data/i18n/ui.ts` · shots/30-en-about.png and shots/12-about.png, the NO SEASON X box; src/data/i18n/ui.ts:416–417, 979–980; src/data/dataset.ts:26–28

**Wrong.** ui.ts:979 ('Nothing from inside season X appears here: no results, no eliminations, no missions, no story…') is rendered directly above dataset.ts:28 ('…Nothing that happens inside season X appears anywhere: no results, no eliminations, no standings, no story.'). Same list, same order, one word different. The Korean pair (ui.ts:417 / dataset.ts:26) duplicates just as closely.

**Why.** It is the most prominent box in the Field Guide and the app's single most important promise, and repeating it verbatim makes it read as boilerplate rather than as a rule. The second paragraph is spending prime space saying nothing new.

**Fix.** Keep ui.ts's line as the flag and rewrite meta.spoilerPolicy to answer the question the reader actually has next: what date the lineup information was frozen at (2026.07.31 is already in meta.lastUpdated, three weeks after the 07.03 premiere), and what will and will not be added as the season airs.

### [minor] Two credential bullets hedge or restate, in a list that is never otherwise vague

`src/data/people.ts` · src/data/people.ts:143 and :1069; rendered as the 이력 4 chip in shots/04-dossier.png

**Wrong.** 박지민's notableFor (people.ts:143) contains '방송 진행상 수상 이력' / 'Broadcasting award for presenting' — an unnamed, undated, uncited award, in a file where every other bullet names a thing ('2008 베이징 올림픽 야구 금메달', '2012 부천복사골국악대회 명인부 최우수상', '한국인 3번째 WSOP 골드 브레이슬릿 (2020)'). 이관희's first bullet (people.ts:1069) is 'KBL 프로농구 선수', which is a verbatim restatement of his occupationKo, '프로농구 선수 (KBL)' — one of only three slots spent on his job title while his own priorElsewhere holds the 2022 All-Star three-point contest win and his passing of the 5,200-point second-round scoring record on 13 Feb 2025.

**Why.** These render as the dossier's 이력 chip row — the headline credential list, the first thing after the bio. An unnamed award and a repeated job title in a three-to-four item list are the two places a reader would first suspect the research is thinner than it looks, on two people who are not otherwise thin.

**Fix.** Name 박지민's award with its year or cut the bullet — her three remaining bullets are already strong. For 이관희, swap 'KBL 프로농구 선수' for '2022 올스타 3점슛 콘테스트 우승' or '2라운드 출신 통산 최다 득점 기록 경신 (2025.02.13)', both already written and sourced in his own priorElsewhere at people.ts:1084–1086. Add a validator rule rejecting a notableFor entry that is a substring of occupation/occupationKo.

### [nit] The Seasons tab hedges a prize figure the app states exactly two tabs away

`src/data/seasons.ts` · shots/13b-about-seasons.png, the 상금 / PRIZE row; src/data/seasons.ts:16 vs :128 and src/data/records.ts:110, 260

**Wrong.** seasons.ts:16 says '우승자 상금 약 1억 800만 원' ('roughly 108 million won', seasons.en.ts:19). The glossary entry for 상금 (seasons.ts:128) says '시즌1의 1억 800만 원은 우승자가 실제로 가져간 금액이고' with no 약, records.ts:260 says '상금 1억 800만 원', and the cited iMBC piece (PRESS_LTG_WIN, records.ts:110) headlines the exact figure.

**Why.** The Seasons tab is the first place a reader looks up a prize, and it is the only surface that hedges a number three other surfaces state flatly. Small, but it makes the reader wonder which of the four is the careful one.

**Fix.** Drop 약 / 'roughly' from seasons.ts:16 and seasons.en.ts:19, and cite PRESS_LTG_WIN on the season-1 record so the exact figure carries its source where it is first shown.

### [nit] The English edge file's docstring is stale by twelve edges

`src/data/i18n/edges.en.ts` · src/data/i18n/edges.en.ts:4 vs validator output 'english: 20 people, 16 season runs, 52 edges'

**Wrong.** Line 4 reads 'English accounts of the forty connections in `edges.ts`.' The validator counts 52, and the English file does cover all 52 — only the header is wrong.

**Why.** Invisible to readers, but this file's comments are load-bearing documentation for whoever edits next, and a header that miscounts its own contents is the first thing that erodes trust in the rest of them.

**Fix.** Either write '52' or, better, drop the number — validate-data.mjs already asserts the count, so a hand-maintained figure in a comment is a second copy that can only drift.

---

## UI/UX & INTERACTION DESIGN — 6/10

> The keyboard, URL-state and reduced-motion work is genuinely flagship-grade, but the single most common way a user picks a person — type in the palette, press Enter — silently destroys the graph down to two nodes and puts a self-contradiction on screen, and the mobile build has detached captions, sub-44px targets and no legend at all.

**Biggest single win.** Clear the search query when a PERSON is committed from the command palette (keep it only when the palette is dismissed with Escape, which is what its own footer promises). One condition in the commit handler removes the blocker, removes the on-screen contradiction between the dossier's "관계 13" and the footer's "관계 1", and removes the stranded-camera composition that three of the supplied screenshots are showing.

### [blocker] Committing a person in the command palette leaves the query on as a graph filter, collapsing the atlas to 2 nodes

`src/components/CommandPalette.tsx (commit handler) + src/state/useAtlas.ts (query → visible)` · scratchpad/J-pick-from-palette.png (live capture); also visible in the supplied 14-filtered.png / 15-rail-closed.png / 17-zoomed-out.png, all of which carry "시즌 14" in the search field

**Wrong.** Ctrl-K, type "홍진", Enter on 홍진호. The dossier opens — and the graph behind it drops from 20 people / 52 ties to 2 people / 1 tie, because the free-text query stays applied as a visibility filter. The result is a direct contradiction on one screen: the dossier reads 관계 13, the status bar reads 관계 1, and exactly one line is drawn. Reproduced live; resulting hash is #p=hong-jin-ho&q=%ED%99%8D%EC%A7%84&lang=ko, and it survives reload at 2/20. The second surviving node is 서출구, who matches only because "홍진" appears in his bio prose — so the graph is showing a text-match set, not a relationship set.

**Why.** Search is the primary way anyone finds a named person in a cast of twenty, and it is the one action the app advertises in the top bar. Taking it destroys the artefact the user came for, and the two numbers side by side make the app look wrong rather than filtered. Nothing on screen explains it — the rail's five lineage chips are all still lit, so the visible filter controls disagree with the visible result.

**Fix.** Distinguish dismissing the palette from committing a result. Escape with free text = keep the query as a filter (that is what the palette footer already promises: "닫아도 유지됩니다"). Enter/click on a PERSON row = clear q and set p. Concretely, in the person-commit branch call setQuery('') before onSelect(id). If you want to keep the narrowing, at minimum make the dossier's own graph obey it — but the honest fix is that picking a person is a navigation, not a filter.

### [major] After a filter change the camera pans but refuses to re-scale, leaving half the canvas dead black

`src/graph/GraphCanvas.tsx:1719 (correctFrame's "a correction may always make the picture smaller, never larger" guard)` · scratchpad/E2-search-rail-closed.png (14/20, rail closed); supplied 15-rail-closed.png and 17-zoomed-out.png show the same frame

**Wrong.** Apply a search filter to 14 of 20 people and close the rail. The remaining cluster occupies roughly the top-left 40% of a 1600×1000 viewport; everything below y≈620 CSS px is empty. The refit effect on filterKey does fire, but correctFrame is past modeStartRef + DUR.cine + 200 by then, so target.k > v.k * 0.98 sends it down the demoted branch and it is held to a pan at the twenty-person scale. The reader never touched the camera, so readerCam ownership is not the reason.

**Why.** Removing six people should make the remaining six-teen bigger and easier to read; instead it makes them a small island in a void. The composition reads as broken rather than filtered, and it is the very first thing you see after using search — compounding the blocker above.

**Fix.** Make the filterKey path a first-class reframe rather than a correction: when the change of visible set (not the chrome inset) is what triggered the effect and readerCamRef is unset, call reframe with the full solveFrame(b, 96) including scale, on DUR.slow. Keep the never-zoom-in guard for the dossier/rail inset case it was actually written for.

### [major] On mobile the cold band inverts its own reading order and its three captions detach from their faces

`src/graph/render.ts (drawCaptions / coldBounds caption seating, ~lines 400–520)` · scratchpad/F-mobile.png and supplied 21-mobile-graph.png, compared against 02-graph-default.png

**Wrong.** At 390×844 the three no-verified-tie people are drawn as: caption row (강지후 / 신승용 / 최연청) at y≈500 CSS px, then the band's dashed top rail, then the three photographed discs at y≈535, then the band's own title "아직 아무와도 얽히지 않은 사람들 / NO VERIFIED TIE · 3" below them. On desktop the order is the exact opposite — title, faces, names. Worse, those three captions land at the same y as the three hollow terminator circles where the parallel-record lines stop, so each name sits beside an unrelated line stub rather than under its own face.

**Why.** You told me the caption is now the whole of a node's identification, because the monogram is never drawn. For these three nodes on mobile the caption is separated from its subject by the band's own boundary rail and is optically closer to a line terminator than to a face — so three of twenty are effectively unlabelled at the default fit, and they are precisely the three the band exists to explain.

**Fix.** Seat cold-band captions inside the band, below their disc, always — the band already reserves its own height (capH), so extend that reservation by one caption line at mobile widths instead of letting the generic collision solver flee upward across the rail. If space genuinely will not allow it, drop the band's own title to the top and keep names under faces; never let the two swap sides between breakpoints.

### [major] Mobile touch targets are systematically under 44 px, including the graph nodes themselves

`src/components/TopBar.css, src/components/FilterRail.css, src/graph/GraphCanvas.tsx (pointer hit test)` · live measurement at 390×844 (16 controls under 44 px); scratchpad/F-mobile.png

**Wrong.** Measured live at 390×844: the four layout tabs are 91×40, the 한국어/EN buttons 44×38, the filter-panel close button 30×30, and every lineage chip 85×30. Node discs at the default fit measure roughly 22–26 CSS px across and sit 8–15 px apart in the central cluster (이진형 / 홍진호 / 박지민 / 윤비), with no evidence of an enlarged hit radius in the pointer test.

**Why.** WCAG 2.5.8 asks for 24 px minimum and 2.5.5 for 44; a 30×30 close button and a 22 px node in a dense cluster mean mis-taps that open the wrong person's dossier — and on a graph, opening the wrong person is not a small error, because it re-solves the layout and moves everything.

**Fix.** Give every top-bar and rail control a 44 px minimum block size (padding, not font size). In the canvas hit test, clamp the pick radius to max(nodeRadius, 22 CSS px) on coarse pointers, and when two candidates are both inside the pad, prefer the higher-degree node rather than the topmost.

### [major] Mobile has no legend and no product name

`src/components/TopBar.tsx (mobile branch), src/components/FilterRail.tsx (default open state)` · scratchpad/F-mobile.png and supplied 21-mobile-graph.png / 22-mobile-dossier.png

**Wrong.** At 390 px the rail is closed by default, and the rail is the only place the seven edge colours and the node key live. So after the cold open the whole screen is twenty faces and fifty-two multicoloured solid/dashed lines with no key anywhere, and no way to discover one except guessing that the ? icon holds it. The 피의 게임X / CAST ATLAS wordmark is also dropped entirely on mobile — the product has no name on screen after the intro.

**Why.** The brief's own test is whether the encoding is discoverable without opening help. On desktop the answer is yes, because the rail carries it permanently. On mobile the answer is flatly no, and mobile is where most people will meet a Korean variety-show companion piece.

**Fix.** Add a collapsed, one-line legend strip pinned above the mobile status bar showing the seven edge colours with their Korean labels, tappable to expand into the full key. Keep the wordmark as a compact 피의 게임X lockup in the mobile top bar.

### [major] "시즌 2" names two different populations on screen simultaneously

`src/graph/layout.ts:1196 (held()) vs src/components/FilterRail.tsx lineage facet` · 08-seasons.png

**Wrong.** In the by-season layout the blue hull is labelled "시즌 2 · 7명" (people who appeared in season 2). Eighteen centimetres to its left, the filter rail's LINEAGE facet says "시즌 2  4" (people cast into X from the season-2 cohort). The four band counts sum to 24 against a cast of 20, which is correct for overlapping membership but reads as an arithmetic error next to a rail that sums to exactly 20.

**Why.** Two visible numbers under the same words, differing by nearly a factor of two, on the same screen. A reader trying to reconcile them concludes the data is wrong, which is the worst possible outcome for a project whose entire premise is verified provenance.

**Fix.** Rename the layout's bands to the predicate they actually express — "시즌 2에 출연 · 7명" / "Played season 2" — and add the overlap note to the band header ("두 시즌을 뛴 사람은 겹치는 자리에"). Leave the rail's 출신/LINEAGE wording alone; it is the more load-bearing of the two.

### [major] Parallel-record lines into the cold band stop in mid-air at an unlabelled hollow circle

`src/graph/render.ts:854–890 (coldCrossing terminator)` · 02-graph-default.png (three stubs at y≈877), scratchpad/B1-filtered.png, scratchpad/F-mobile.png

**Wrong.** A dashed teal line leaves 허성범, travels 250 px down, and stops at a ~6 px open circle just above the cold band's top rail. It does not reach 강지후, is not labelled, and there are three of these dangling stubs in the default view. The clip is deliberate — the band's rectangle is protected — but nothing on the canvas says so.

**Why.** You asked whether the app makes "same record, never met" legible or merely correct. As drawn it is neither: a severed line reads as a rendering fault, and the reader cannot tell that 허성범 and 강지후 are the pair it concerns. The one visual idea that would distinguish parallel from absent is spent on something that looks like a bug.

**Fix.** Either let the line land on its target with the band's own dimmed treatment applied to that final segment, or make the terminator carry meaning: a small open ring plus a hairline caption of the target's name, and make the stub hoverable so it opens the same EdgeCard the full line would. The gallery already gets this right ("0 건 · 평행 이력 1") — bring that phrasing onto the canvas.

### [minor] By-background group labels float unanchored, several closer to the wrong hull than the right one

`src/graph/layout.ts (archetype cluster label placement)` · 09-archetype.png

**Wrong.** "전문직 · 5명" sits at roughly (1370,489) — about 200 px from the hull it names and visibly nearer to 이진형's bubble. "포커 플레이어 · 2명", "크리에이터 · 1명" and "기타 · 1명" carry no leader line at all, while the by-season layout draws them. Separately, single-member groups get full-diameter circles, so the layout leaves the left third of the frame empty while its bubbles overlap in the right two-thirds.

**Why.** This is the layout whose only job is to make grouping legible; a label you have to guess the owner of defeats it, and it is the weakest of the four modes as a result — the one I would question the place of.

**Fix.** Anchor every group label to its hull with the same hairline leader the seasons layout uses, and place it on the hull's outward-facing side. Scale a group's circle to sqrt(members) as the seasons layout already does at layout.ts:1209, so a one-person group is a small circle and the packing can use the whole frame.

### [minor] The node key — the harder half of the encoding — is clipped below the rail fold; the line key is not

`src/components/FilterRail.tsx / FilterRail.css (rail scroll region)` · 02-graph-default.png, 26-en-graph.png, and every other desktop shot

**Wrong.** In every desktop capture the rail shows all seven edge types with swatches and counts, then "노드 읽는 법 NODE KEY" with exactly one row ("크기 = 연결 수") rendered at roughly 35% opacity and sliced by the rail's bottom edge. Ring colour, outer arcs, brass halo, dashed rim and the fine grey rim are all below the fold, behind a scroll whose only affordance is an 11 px grey jump strip reading "↓ 노드 읽는 법 | 직업군 | 가장 얽힌 인물".

**Why.** Line colour is the easy half — a swatch and a word. Node encoding is five simultaneous channels drawn around a face, and it is the half a newcomer cannot reverse-engineer. Putting it in the clipped position inverts the priority.

**Fix.** Swap the order: node key above relationships, or collapse the relationship list to its swatch row by default. Failing that, give the fade a real scroll cue (a gradient plus a chevron) instead of a half-opacity row that reads as disabled.

### [minor] At maximum zoom the plate is mostly chrome and the 300 px portrait is visibly upsampled

`public/portraits/*.webp (source size), src/graph/plateGeometry.ts (ring radii vs photo radius)` · scratchpad/I-maxzoom.png; supplied 16-zoomed-in.png

**Wrong.** Zoomed to the cap, 박지민's photo disc measures roughly 265 CSS px across — about 530 device px at 2× from a 300 px source, a 1.4–1.8× upsample. Hair strands and lash detail go mushy, and the softness is conspicuous because the vector rings at the same radius are razor sharp. The photo occupies only about 38% of the plate's total diameter; the outer rim circle is roughly 700 CSS px with twelve small ticks on it.

**Why.** Zooming in is a request to see the person better. Here it delivers a bigger diagram wrapped around a softer face — the ring furniture grows linearly with k while the photo's information does not.

**Fix.** Ship 600×600 sources (still under 60 KB each in webp) so the max-zoom draw is at or below 1:1. Independently, damp the ring geometry past k≈2 — hold rim radius and tick length at their k=2 values so the face keeps taking a larger share of the plate as you zoom.

### [minor] Link stroke width scales without a cap and becomes a slab over the plates

`src/graph/render.ts (link stroke width, drawLinks)` · scratchpad/I-maxzoom.png

**Wrong.** At maximum zoom the betrayal and alliance strokes render as roughly 15–18 CSS px ribbons that cut straight across portrait plates and pass immediately beside the node caption ("MBC 아나운서").

**Why.** At the scale where the reader is trying to look at one person, the connective tissue is the loudest thing on screen and competes with the caption that is now the sole identification.

**Fix.** Clamp the stroke to min(baseWidth * k, 6) and let the arrows/dashes carry the emphasis instead. The relationship is already encoded by hue and dash pattern; extra width past k≈1.5 buys nothing.

### [nit] Gallery crops are not normalised to a common eye-line or head size

`tools/vite-plugin-portraits.mjs (crop), src/components/Portrait.tsx` · scratchpad/H-gallery-top.png; 24-gallery.png

**Wrong.** In the season-1 row, 정근우's head fills about 85% of the disc width with his hair cropped flat at the rim, while 박지민's fills about 62% with clear headroom. Eye-line varies by roughly 6% of disc height across the four cards in a single row.

**Why.** The wall is the one view where all twenty are compared side by side; inconsistent face scale is the thing that makes a set of portraits read as sourced rather than shot, and it undoes some of the good the exposure correction does.

**Fix.** Detect the face box at build time and normalise on two constraints — inter-ocular distance to a fixed fraction of the disc, eye-line at a fixed height — rather than centre-cropping the square. Where a source is too tight to allow headroom, pad with the sampled background rather than cropping the crown.

### [nit] The dossier's section-jump chips look like static stat pills

`src/components/Dossier.tsx / Dossier.css (.dsr-jump__b)` · 04-dossier.png, 22-mobile-dossier.png; Tab order verified live

**Wrong.** 관계 13 / 이미 마주친 사이 11 / 피의 게임 기록 2 / 바깥에서의 기록 1 / 이력 4 / 다른 프로그램 5 are real buttons that scroll to their sections — confirmed by tabbing, they are the first five focus stops after the name heading — but they carry no chevron, no underline, no rest-state affordance distinguishing them from the 전문직 / 역대 우승자 tags directly above, which are not interactive.

**Why.** The dossier is long enough that these chips are the main navigation, and they are indistinguishable from the decorative tags two rows up.

**Fix.** Give them a downward chevron or a bottom hairline in the rest state, and make the non-interactive category tags visually flatter (no border) so the two rows stop rhyming.

### [nit] The gallery's final section leaves ~600 px of empty sheet

`src/components/Gallery.tsx / Gallery.css` · scratchpad/H2-gallery-mid.png

**Wrong.** Scrolled to the end, the 루키 팀 section's four cards are followed by roughly 600 px of blank modal before the sheet's bottom edge, with nothing to say the wall has ended.

**Why.** Reads as content that failed to load rather than as the end of a list.

**Fix.** Let the sheet's height shrink to content at the last section, or close the wall with the same provenance line the header opens with.

### [nit] "XITSUH" is set in all caps among Title-Case English names

`src/data/i18n/ (people, en)` · 26-en-graph.png, 11-palette-typed.png

**Wrong.** 서출구's English name renders as XITSUH beside Ha Seung-jin, Hong Jin-ho, Park Ji-min. It is his stage name, but the caps make it read as an acronym or a shout in a column of romanised personal names.

**Why.** On the English graph and in the palette it is the one label that breaks the typographic rhythm of the twenty.

**Fix.** Set it as "Xitsuh" in running name positions and keep the caps lockup only where the stage name is being quoted as such (the 활동명 line in the dossier).

---

## MOTION & ANIMATION — 5/10

> The motion system is reasoned at flagship level and idles, settles and recovers better than almost anything I could name — but the three moments a reader actually watches (the chrome landing, the first click on a person, and the mesh drawing itself) are delivered wrong: one of them freezes the production build for 300–400ms, one shows an empty rectangle and fills out of order, and one finishes half a second after the curtain it was tuned against.

**Biggest single win.** Kill the chrome's 300–400ms freeze at ~1.4s after ENTER. It is a hard, input-dead stall on the production build with a real GPU, it is ablation-proven to be the three chrome panes starting ~30 CSS animations in one commit (removing them takes the worst frame from 400ms to 116ms; prefers-reduced-motion, which disables those animations, has a worst frame of 16.8ms), and it lands immediately after the 1.3s of choreography that this codebase has spent five rounds tuning — so it is the frame that decides whether all of that work reads as craft or as jank. It is also the single most valuable catch because App.tsx:186–226 documents this as measured and solved at "50–103ms", which means nobody will look for it. Fix: arm TopBar, StatusBar and FilterRail on three successive frames instead of one boolean, and collapse FilterRail's 30-element cascade to a container fade plus one nested stagger of ~6.

### [blocker] The chrome's arrival freezes the app for 300–400ms right after the entrance — the fix App.tsx claims to have landed did not land

`src/App.tsx` · Production build (localhost:4173), headed GPU (--use-angle=default), 1440x900 dpr1, three runs each, rAF gaps recorded from the ENTER keypress. Control: worst frame 299.9ms @1380ms, 400ms @1508ms, 299.9ms @1398ms. Same page with `.topbar,.frail,.statusbar,.rail{display:none}`: worst frame 116.7ms @180ms, 133.3ms @203ms, 116.6ms @195ms — and 66 frames delivered in the 900–2000ms window against 43–49 in control. On the dev build the same stall measures 466.7 / 483.3 / 483.3ms. Corroborated in the screencast: run6/0028-reveal-1157.png then nothing until run6/0029-reveal-1794.png, a 637ms gap, and that frame shows the rail as a ghost rectangle with two words in it. Turning backdrop-filter off does NOT fix it (still 300–333ms), so it is not the blur.

**Wrong.** `chromeReady` flips on `onEntranceDone`, and the commit that follows brings three large panes from opacity 0 to 1 while starting ~30 CSS animations at once (FilterRail's `.frail.is-ready` cascade over head + sections + chips + rows + top + below + foot, plus TopBar and StatusBar). That single commit blocks the main thread for 300–400ms on the production build with a real GPU. Under prefers-reduced-motion, where `.frail`'s animations are `animation: none` and --d-base is 1ms, the same window has a worst frame of 16.8ms — which isolates the cost to the animations, not to the layout or the blur.

**Why.** It is the last beat of the app's first impression and it is a hard freeze: input is dead, the canvas stops, and the reader watches a half-drawn rail for a third to half a second immediately after 1.3s of carefully-tuned choreography. Worse, the comment at App.tsx:186–226 asserts this was measured and solved — "Armed at entrance-done, the same window's worst frame is 50–103ms" — so the next person to touch this file will believe it is fixed. A stated measurement that the shipped artefact contradicts is the most expensive kind of comment.

**Fix.** Stop starting thirty animations in one commit. Two changes, either of which alone would help: (1) arm the three chrome regions on separate frames rather than one boolean — `setChromeReady` for TopBar, then a rAF later StatusBar, then a rAF later FilterRail, so no single commit owns all three paints; and (2) collapse FilterRail's per-element cascade to a container-level fade plus at most one nested stagger of ~6 elements. The rail's own comment already says the cascade is only worth paying for where the eye can follow it, and 30 elements at 10–16ms apart is below the perceptual threshold anyway. Verify with the exact ablation above: control must reach ≥60 frames in the 900–2000ms window with no frame over 120ms.

### [blocker] First dossier open still shows an empty panel, and the panel then fills OUT OF ORDER — identity, then below-the-fold sections, then the nav and the sections between them

`src/components/Dossier.tsx` · Production build, headed GPU. Per-frame `getComputedStyle` of `aside.dossier` and its first six sections after clicking the hub: t=94 panel translateX 28px, all sections 0. t=161 x=11.6, sections 0,0,0,0. t=310 sections 0.97,0,0,0,0,0. t=409 panel landed (x≈0), sections 1,0,0,0,0,0. t=471 sections 1,0,0,0,**0.47,0.47**. t=519 1,0.6,0,0,0.93,0.93. t=607 1,0.97,0.77,0,1,1. t=624 1,0.99,0.86,0.14,1,1. All six at 1 only at t=758. Screencast run8/0003-dossier-360.png shows the arrived panel completely blank between a full-opacity header bar and a full-opacity 'Focus orbit / Sources 5' footer; run8/0005-dossier-453.png has the whole body at once. Frame gaps in the first 700ms: 15 frames, with 100ms @102, 166.7ms @286, 83.3ms @369.

**Wrong.** Two distinct faults. (a) The 90/155/220/285ms four-slot cascade is not delivered: a 166.7ms frame lands squarely on slots 3 and 4, so the cascade the file spends 55 lines justifying is 2–3 frames wide and reads as one pop. (b) The order is inverted. Sections 4 and 5 use `SECTION_TAIL`, which has NO delay, and they mount one commit later behind `tailReady` — so they start their fade the moment they mount and reach 0.47 at t=471 while slots 1, 2 and 3 (delays 155/220/285) are still at 0. The panel therefore fills top, then bottom, then middle. Both of these sections are on screen at 900px tall — I can see them in run8/0005 — so the 'nobody is watching it arrive' premise behind `SECTION_TAIL` is false at this viewport.

**Why.** Clicking a person is the product's core interaction and every reader pays this on their first click. What they see is a 350ms hollow rectangle with a populated footer pinned to the bottom of nothing — the exact failure the comment at Dossier.tsx:144–160 says was fixed — followed by a fill that runs in the wrong direction. An out-of-order cascade is worse than no cascade: it actively tells the eye the panel is loading rather than arriving.

**Fix.** Do what the previous round already prescribed and what this codebase already does twice: warm the Dossier under the cold open the way CommandPalette does with `.cp--warm` (opacity 0.008, pointer-events none, two frames) and HoverCard does with `.is-warming`. That pays module init, Pretendard/Inter metrics at the dossier's sizes and the Portrait plate geometry behind the curtain. Then delete `bodyReady` and `tailReady` entirely — once first mount is cheap they are pure added latency and they are the direct cause of the inversion. If the split has to survive, give SECTION_TAIL the last slot's delay back (`delay: SECTION_LEAD + (SECTION_SLOTS-1) * SECTION_STEP`) so the tail can never overtake the slots. Verify: no section may reach opacity > 0.05 before every section above it in the DOM has.

### [major] The mesh still has not drawn when the curtain clears — the reader's first unobstructed frame is twenty disconnected faces

`src/graph/GraphCanvas.tsx` · SWEEP_AT=0.8, DRAW_SPAN=420, DRAW_DUR=220 are unchanged from the last round. Sampling `__atlasDebug.linkDraw()` per frame: min(draw) is 0 until t=912ms after ENTER, 0.892 at 929, and only reaches 1.0 at t=1045 — while `.intro`'s opacity is 0.0008 at t=511 and the element is gone by t=580. Corroborated in run10/t340.png (curtain 0.867, reveal 0.815): only the hub's own links are on screen; run10/t420.png (curtain 0.598) is still visibly short of the full mesh.

**Wrong.** The sweep is scheduled against the reveal but the curtain outruns both. The last line starts at SWEEP_AT (≈291ms) + DRAW_SPAN (420) = ~711ms and completes at ~931–1045ms, against a curtain that is at 0.08% by 511ms. So for roughly half a second the app's first unobstructed frame shows twenty portraits and an incomplete web, above a band captioned 'No prior tie on record · 3' — which asserts the opposite of the product's thesis on the one frame every reader sees.

**Why.** The nodes are the axis; the lines are the content. This is the single frame the whole entrance exists to deliver and it delivers the wrong picture. The comment at GraphCanvas.tsx:208–216 says this was fixed; it was shortened, not fixed, and this is the second consecutive round in which the same numbers reproduce.

**Fix.** Move the sweep under the curtain instead of after it. SWEEP_AT 0.8 -> 0.55 (≈115ms into the 700ms EASE_REVEAL, where the intro is still ~99% opaque so nothing leaks early), DRAW_SPAN 420 -> 240, DRAW_DUR 220 -> 180. The last line then completes at ~535ms after reveal start, within a frame or two of the curtain clearing, and the mesh is visibly growing under the last third of the black. Assert it: ≥40 of 52 links at draw ≥ 0.95 on the frame `.intro` unmounts.

### [major] Every layout-mode change implodes the cast by 16% before it expands, so no node can be followed from one arrangement to the next

`src/graph/GraphCanvas.tsx` · Per-frame screen positions across web -> by-season, mean distance of the twenty nodes from their own centroid: 187.9px at t=0, **157.2px at t=65 (−16.3%)**, 158.4 at t=162, back through 175.7 at 261, 187.0 at 294, and settling at 213.6. Visible in run3/0024-mode-4804.png (+114ms): a central heap with 'Lee Gwan-hee' printed across 'XITSUH' and 'Jung Keun-woo' across 'Lee Jin-hyung'. Cause is at GraphCanvas.tsx:1060, `const held = res.anchored ? 1 : 0;` — set once in the layout effect, so charge collapses from −260−16r to −70−4r and link strength drops to 15% in a single frame while `anchorStrengthRef` is still ramping in on `settle(dt, 260)`.

**Wrong.** For the first ~4 frames of every mode change nothing is holding the mesh apart and nothing is yet pulling it to the new seats, so it falls inward and then blooms back out. The eye tracks continuous motion; it cannot track a contraction it did not expect followed by an expansion in a different direction, and the labels collide during the heap.

**Why.** Four layout modes are offered as equals in the top bar and the whole point of animating between them is that the reader can see who moved where. A collapse-then-bloom destroys that, and it is the only reason the transition is not legible — the frame rate itself is fine on a real GPU (48 frames in 900ms, worst 50ms).

**Fix.** Cross-fade the two force régimes on the same clock as the anchors. Make `held` a per-tick value — `held = anchorStrengthRef.current / Math.max(1e-6, anchorTargetRef.current)` — and re-apply charge/link/x/y strengths from it inside the render loop on a coarse step (whenever `held` moves by more than 0.1, since d3 re-initialises a force on every strength set). Repulsion then decays exactly as the anchors take over. Target: mean radius from centroid monotone across the whole transition, never below its starting value.

### [major] The region handover is a swap, not a cross-fade: the incoming scaffolding is at alpha 0 for the first ~240ms and first appears at 0.52

`src/graph/GraphCanvas.tsx` · Per-frame `__atlasDebug.dim().regionAlpha` and `.regionExit()` across web -> by-season: t=85 painted 1 / exit 0.983 / **incoming 0**; t=169 painted 0.749 / exit 0.547 / **incoming 0**; t=261 painted 0.523 / exit 0.017 / incoming 0.523; then 0.732, 0.826, 0.89… Screencast confirms: run3/0024 (+114ms) and run3/0026 (+255ms) have no season ellipses and no season captions at all; they first appear in run3/0029 (+526ms). The code's own HANDOFF note at REGION_CROSS (GraphCanvas.tsx:336–344) admits the mechanism is unimplemented — `RenderState` still carries one `clusters` array and one `regionAlpha`, and `exitHoldsSlot` picks one set or the other.

**Wrong.** `regionPainted = Math.max(exitAlpha, regionAlpha)` gives a smooth NUMBER, and the numbers do not dip — but the painter draws only one of the two sets, so what is actually on screen for the first 240ms is the OUTGOING arrangement's scaffolding (web's cold band) at 0.75–1.0, over people who have already left it. The season ellipses then appear from nothing at 0.52. The claimed cross-fade is a hard swap with a pop.

**Why.** The 240ms in which the twenty people travel furthest is exactly the window in which the reader needs to see 'these circles are about to become those circles'. Instead they see a caption about the old arrangement over a heap, then five ellipses materialising at half strength once everyone has stopped. It also means the REGION_CROSS/REGION_CROSS_CAP tuning — three constants and forty lines of reasoning — currently buys nothing visible.

**Fix.** Finish the handoff the comment specifies: add `at?: number` to `Cluster` (default 1), multiply it into `ra` at the top of `drawClusters`'s `for (const c of s.clusters)` loop and into `ctx.globalAlpha` in `drawCaptions`, then hand the painter `[...exit, ...current]` with `at` set from the two ramps and drop `exitHoldsSlot`. Verify by screenshot, not by the number: at +120ms and +240ms into web -> by-season, both the departing band and at least one incoming ellipse must be drawn.

### [major] The draw-on sweep uses --ease-out on a stroke LENGTH, so each line pops to 40% instantly and then crawls invisibly

`src/graph/GraphCanvas.tsx` · GraphCanvas.tsx:2410, `l.draw = EASE_OUT(p)` where EASE_OUT = cubic-bezier(0.22, 1, 0.36, 1). Evaluated on that curve: at p=0.10 (22ms of the 220ms draw) the line is 40.1% of its length; at p=0.25 (55ms) it is 70%; at p=0.50 (110ms) it is 96.2%. The remaining 110ms carries 3.8%. Visible in the sweep frames run10/t340.png and run10/t420.png, where lines are either absent or essentially complete with almost nothing in between.

**Wrong.** --ease-out is an expo-out. It is the right curve for an ARRIVAL — a position or an opacity landing softly — and the wrong curve for a quantity that represents a pen travelling along a path. A stroke that appears at 40% of its length in the first frame and a half has not been drawn, it has been switched on. The effective visible duration of a 220ms draw is about 60ms, which is why the bearing-ordered sweep this file has re-tuned four times reads as popping rather than as growth.

**Why.** The sweep is half the entrance choreography and the thing that makes the mesh feel like it is being written rather than pasted. With this curve the DRAW_DUR constant does not mean what the surrounding comments assume it means, which is also why re-tuning DRAW_SPAN has repeatedly failed to change what the sweep looks like.

**Fix.** Use a symmetric curve or none: `l.draw = EASE_IN_OUT(p)` (cubic-bezier(0.65, 0, 0.35, 1), already evaluated in this file) or simply `l.draw = p`. Both give a pen that starts at the node and arrives at the other end. With EASE_IN_OUT the perceived duration matches the constant, so pair it with DRAW_DUR 220 -> 180 as part of the sweep re-timing above.

### [minor] The HoverCard stays lit on top of the dossier it has just been superseded by

`src/components/HoverCard.css` · run6/0034-dossier-6585.png (+425ms after the click) and run6/0035-dossier-6708.png (+548ms): the dossier is fully arrived and the HoverCard for the same person is still at full opacity, overlapping the panel's left edge, with the canvas captions 'Lee Sang-min' and 'Kim Nam-hee' printing through its glass. Same in run8/0003-dossier-360.png on the production build.

**Wrong.** `.is-shown` is only dropped when the pointer leaves the node. A click does not move the pointer, so the card keeps its 150ms fade running against a panel that is arriving with the same record in it — and during that fade the card is the one surface in the app whose opacity guarantee is not held, so canvas type crosses it.

**Why.** It lands on the frame after the app's most important click, it duplicates the panel's information, and it is the one moment the reader has two competing readouts of the same person. It also visually overlaps the dossier, which is the only surface in the app that is otherwise guaranteed never to be crossed.

**Fix.** Drop `.is-shown` the instant `selectedId` becomes non-null — the card has been superseded, so there should be no cross-fade at all. If a fade is wanted, shorten the exit to ~90ms so the half-alpha window is under three frames, and fade the CONTENT while cutting the surface, mirroring what CommandPalette already does.

### [minor] The cast wall opens as one object with no tile stagger, alone among the app's list surfaces

`src/components/Gallery.css` · Gallery.css:63 `animation: gal-in var(--d-slow) var(--ease-out) both` on the sheet, with no per-tile delay anywhere in the file. run11/gallery-200.png, taken 200ms after G on the production build, already shows every visible tile at full opacity. Compare CommandPalette.css:418–419 (`calc(var(--cp-lead) + var(--i) * var(--cp-stagger))`, 22ms per row, capped at i=9) and Intro.css:294–299 (26ms per stat column).

**Wrong.** The gallery is the app's largest list — twenty portrait tiles in a grid — and it is the only list that arrives flat. The palette staggers 10 rows, the intro staggers 3 columns, the dossier staggers 4 sections, and the rail staggers 30 elements; the one surface where a cascade would actually read gets none.

**Why.** It is a visible inconsistency in a motion vocabulary that is otherwise unusually disciplined, and it makes the wall feel pasted in rather than dealt out — which matters more here than elsewhere because the tiles are photographs and the reader is being invited to scan them.

**Fix.** Give the tiles `--i` from their index in reading order across the grid (not down columns) and `animation-delay: calc(120ms + var(--i) * 18ms)`, capped so the last tile starts by ~360ms — 20 x 18 = 342ms fits inside the sheet's own --d-slow. Keep the exit flat: the sheet should leave as one object, as it already does.

### [minor] The entrance's two load-bearing curves are unnamed literals outside the design system

`src/App.tsx` · tokens.css:418–420 defines exactly three curves. `EASE_REVEAL = cubicBezier(1/3, 1, 2/3, 1)` is a literal at App.tsx:56 whose own HANDOFF note asks for a name in tokens.css; the curtain's exit runs on `cubic-bezier(0.64, 0, 0.78, 0)` at Intro.css:59, which appears nowhere else in the codebase. Both were present last round and neither has been promoted.

**Wrong.** GraphCanvas goes to the trouble of evaluating --ease-out and --ease-in-out numerically so canvas and DOM share a personality, and then the single most-tuned animation in the app runs on two curves that the design system has never heard of — one in JS, one in CSS, on the two halves of the same handoff.

**Why.** App.tsx states the rule it is breaking: 'One curve, one place.' The next person tuning the entrance has to discover both by reading three files, and the CSS half and the JS half can drift with nothing to catch it.

**Fix.** Add `--ease-curtain: cubic-bezier(0.333, 1, 0.667, 1)` and `--ease-curtain-out: cubic-bezier(0.64, 0, 0.78, 0)` to tokens.css with the reasons already written in App.tsx and Intro.css, have Intro.css reference the token, and have App.tsx read it the way GraphCanvas reads --ease-out.

### [nit] Three standing will-change promotions on elements that are hidden or static most of the time

`src/components/HoverCard.css` · HoverCard.css:36 `will-change: transform, opacity` on a permanently-mounted element that is `visibility: hidden` for most of a session; Intro.css:231 `will-change: clip-path, opacity` on `.intro__kicker`, whose animation is over by 1520ms and which is never removed before unmount; FilterRail.css:1318 `will-change: transform` on seven `.ftop__bar-fill` elements that change only on a filter toggle.

**Wrong.** Each of these holds a composited layer for the life of the page rather than for the life of the animation. On the HoverCard it is deliberate and defensible; on the kicker and the seven filter bars it is a layer per element for animations that run once or rarely.

**Why.** Small on its own, but the entrance is exactly the moment this app is layer-bound — the App.tsx ablation table shows the cost is 'three large glass panes going from opacity 0 to opacity 1 over a canvas that is repainting every frame' — and standing layers add to that budget for nothing.

**Fix.** Drop `will-change` from `.intro__kicker` (the animation is 900ms and one-shot; a `clip-path` animation gets promoted for its duration anyway) and move `.ftop__bar-fill`'s promotion behind a class the rail sets only while a filter change is in flight. Keep the HoverCard's — that one is paid for by the measurement in its own header comment.
