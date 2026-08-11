# CRITIQUE — round 15

Five independent reviewers, one per pillar, run against the Release A build
(rename + pronoun fix + probe gating + phase 0) with all twenty portraits.

| pillar | score |
|---|---|
| visual | **6** |
| polish | **7** |
| depth | **8** |
| ux | **6** |
| motion | **6** |

Previous round: visual 6 · polish 6 · depth 8 · ux 6 · motion 6.

---

## VISUAL DESIGN & ART DIRECTION — 6/10

> The colour system, the type ramp and the Hangul/Latin tracking split are flagship-grade thinking, but the frames that actually ship are not: the camera never re-fits, so four captured states put the figure in a corner of a black field; a caption is set square across a face in the path-trace state; two of the four layout modes are visually unresolved; and the cast wall gives the photographs a quarter of their own tile.

**Biggest single win.** Make the canvas's effective viewport an explicit rect (full canvas minus the rail when open, minus the dossier when open, minus the status bar) and re-run the fit-to-extent transform with a ~420ms eased tween every time that rect or the visible node set changes — filter apply/clear, rail toggle, dossier open/close, mode switch. One change fixes the corner-blob composition in shots/14, 15 and 17, stops the dossier amputating the cold band and orphaning 곽범's name in 04/06/19/27, and — by giving the label solver back the space it currently has to fight for — removes most of the pressure that drives captions onto faces in the first place.

<details><summary>What is working</summary>

- The palette is the best-argued thing in the project and it holds in the pixels. Four channels with a stated job each, min pairwise ΔE 21.8 inside the archetype ramp, and crimson genuinely disciplined — across all 30 screenshots #ff2f43 appears only on the wordmark X, betrayal edges and the betrayal legend swatch. Every state colour is warm bone (--accent #dcd0b6). That restraint is rare and it is what stops this reading as a generic dark dashboard.
- The tone correction on the twenty photographs measurably works. Sampling a 46px box at the face centre of eight gallery tiles in shots/24-gallery.png gives mean luma 69.6–97.0, seven of eight inside 77–81. The wall reads as one set and the correction is not visible as a correction — this is the headline change and it landed.
- The cold band's parallel-record terminators are properly authored: the line stops short, ends in an OPEN circle (not the filled active bead), and the stub's x is now pinned to the cold person's x — measured in the crop of shots/02, all three caps sit within ~10px of the disc below them. The gap carries the meaning and the vertical carries the referent. That is a real design idea, executed.
- The tracking system splits Latin display tracking (−0.035em) from Hangul (0em) and caps tracking from language, and it is followed. 피의 게임 is not crowded the way a naive −0.035em would crowd it, and 'CAST ATLAS' / 'NO VERIFIED TIE' carry proper 0.16em Latin small-caps.

</details>

### [blocker] The camera never re-fits, so filtering or hiding chrome leaves the graph as a small blob in one corner of a black field

`src/graph/GraphCanvas.tsx` · shots/14-filtered.png, shots/15-rail-closed.png, shots/17-zoomed-out.png; contrast shots/02-graph-default.png, shots/18-laptop.png

**What is wrong.** In shots/14-filtered.png the ten remaining people occupy x 880–1520, y 190–700 of a canvas region that runs x 384–2000, y 75–1245 — roughly 17% of the frame's area, parked in the upper-right, with the entire lower half and the left 500px empty. shots/15-rail-closed.png is the same failure from the other direction: the rail is hidden, 292px of canvas is handed back, and the figure stays exactly where the with-rail fit put it, so it now sits top-left with ~60% of the frame as dead black. shots/17-zoomed-out.png repeats it. Compare shots/02 and shots/18, where the fit is correct and the composition is genuinely handsome — the difference is entirely whether a fit ran.

**Why it matters.** Filtering and hiding the rail are both acts of 'show me this more clearly', and both are answered by making the subject smaller and pushing it off-centre. A designer judging this from a screenshot of state 14 or 15 would conclude the layout is uncomposed, which is unfair to the layout — the composition exists, it is just never re-solved. This is also a re-file: CRITIQUE.md line 160 reports it as a blocker and it has not landed.

**Fix.** Make the effective viewport a value (full canvas minus rail width when open, minus dossier width when open, minus statusbar height) and re-run the fit-to-extent transform with a ~420ms eased tween whenever that rect OR the visible node set changes — filter apply, filter clear, rail toggle, dossier open/close, language switch. The figure should visibly slide and re-scale, not sit still while the frame changes around it.

### [blocker] A caption is painted square across the face it names, and the code knows

`src/graph/render.ts` · shots/23-path-trace.png (김유현, ~x1776 y824 natural), confirmed by 3× crop; render.ts ~L2440-2470; tools/assert-visual.mjs L151

**What is wrong.** In shots/23-path-trace.png the caption 김유현 is set at the exact vertical centre of 김유현's disc, covering his eyes and nose and overhanging the disc on both sides (I cropped it at 3× to confirm — the name is wider than the photograph). The disc is dimmed, so the label is grey-on-dark-face and neither the name nor the picture reads. render.ts lines ~2440–2470 measure this precisely — 'mobile 390 choi-hye-sun disc 22.6px box 75x18 covers 100%', 'laptop en park-ji-min covers 98%' — and then say 'NOT GATED YET … it is a product call'. assert-visual.mjs line 151 files it as a live defect failing 5 of 13 states.

**Why it matters.** Every plate now has a photograph and no mark is drawn anywhere, so the caption IS the identification and the photograph IS the plate. Laying one across the other destroys both at once. plate.ts already refuses to draw a MARK over a face for exactly this reason; the argument does not weaken because the ink happens to be a name. As shipped, the reader sees a face with a word stamped on it and reads it as a rendering fault.

**Fix.** Apply the one-line gate the file already names — reject the own-face seat when the box is wider than the picture (`if (b.w > 2 * rPhoto) return Infinity;`) — and pay for the resulting anonymity properly rather than by overprinting: when no honest seat exists, drop the caption and draw a 1px leader hairline from the disc to a seat in free space (the mechanism already exists; it is used for 하승진 in shots/17). Never both a face and a name in the same pixels.

### [major] The cold band — the one new editorial idea — is not composed: three discs on three baselines at two different pitches, and a name struck through by the fence

`src/graph/layout.ts` · shots/02-graph-default.png (3× crop of the band), shots/19-laptop-dossier.png (3× crop), src/graph/layout.ts L713-810

**What is wrong.** webLayout anchors the three no-tie people with a soft spring (anchorW 4, no fx/fy), so the row never actually lands on a line. Measured off shots/02-graph-default.png: disc centres at CSS y 805 / 804 / 796 (최연청 sits 9px high) and pitched 188px then 226px apart — a 20% pitch variance across three items. At 1280×800 with the dossier open (shots/19-laptop-dossier.png) it degrades badly: the three discs sit at three y's ~34 CSS px apart, and 신승용's caption is drawn straddling the band's dashed top rail so the rule passes through the middle of the glyphs and reads as a strikethrough. The band's caption is left-aligned in a container whose members are centred over a different span, leaving ~200 CSS px of empty band to the right of the caption and below the discs.

**Why it matters.** The band's entire rhetorical job is to say 'these three are set apart, deliberately'. A rank of exactly three that is ragged in both axes says the opposite — it reads as three nodes the physics failed to place, i.e. as missing data rather than as a finding. CRITIQUE.md line 207 already filed the baseline half of this; the stub-x half was fixed and this half was not.

**Fix.** In the cold band only, pin the discs with fx/fy (or clamp after the tick) to one shared y and an exactly equal pitch, and lock every caption to one shared baseline directly under its own disc, bypassing the collision placer — there are no collisions in a three-item row. Give the caption block the same horizontal centre as the row, and reserve the caption's own height inside the band so the rail can never cross a glyph.

### [major] By-season and by-archetype are the two modes nobody art-directed

`src/graph/layout.ts` · shots/08-seasons.png, shots/09-archetype.png; contrast shots/07-orbit.png

**What is wrong.** By-season (shots/08): four ellipses with near-identical dark fills overlap so heavily that the two- and three-way lens regions composite to a muddy warm grey — the region under 박지민 reads as a rendering artifact, not as an intersection. The group captions land at four different distances and four different angles from their own ellipses (시즌 2 top-centre, 시즌 1 far bottom-left, 시즌 3 mid-right, 이전 시즌 없음 floating above its ellipse). The whole figure sits at x 790–1660 in a region running 384–2000, so the left 400px is dead. By-archetype (shots/09): ten enclosure circles of wildly mismatched size — 곽범's one-person bubble is ~135px radius around a 25px disc, i.e. 97% empty — several of them overlapping each other (전문직 into 방송인, 이진형's into 최혜선's), which defeats the one thing an enclosure is for. Group labels sit above-left, below-left, right and below with no system, and the whole cluster floats up-and-right leaving the bottom-left third of the canvas black.

**Why it matters.** Four modes are offered as equals in the top bar. Web and Orbit are genuinely composed — Orbit in particular, with its concentric rings and leader-lined legend, is the best frame in the app. Landing on 2 or 3 after that is a visible drop in authorship, and it makes the whole set look like one designed view plus three algorithmic ones.

**Fix.** By-season: give each ellipse a stroke-only treatment with a single very low-alpha fill and let overlaps read by stroke crossing rather than by fill compositing; place every set caption at a fixed angular position on its own ellipse's boundary with a short leader. By-archetype: size each enclosure to its members' actual extent plus a constant padding (a 1-member group should be a ~55px circle, not 135px) and add a light circle-packing pass so no two enclosures overlap. Both: run the same fit-to-frame the web mode gets, so the figure fills the region instead of drifting into a corner.

### [major] The cast wall gives the photographs about a quarter of their own tile

`src/graph/plateGeometry.ts` · shots/24-gallery.png, shots/25-gallery-scrolled.png, shots/29-en-gallery.png; src/graph/plateGeometry.ts L26-35, L662

**What is wrong.** R_DISC 27 against R_RIM 40.4 and R_LAUREL_OUT 49.4 means the picture is 30% of the plate's area and the ring apparatus is 70%. On the gallery that lands as a ~72px photograph inside a ~135px ring assembly inside a ~300px column (shots/24, shots/25, shots/29). Compounding it, PHOTO_SEAT_IN = 0.62 darkens everything outside 62% of the disc radius to near-black, so the readable part of an already-small picture is 38% of its area. The net is a wall whose smallest, dimmest element is the face.

**Why it matters.** The cast wall exists so a reader can learn twenty faces. It is the one surface with no space pressure — a 1824px-wide modal, four columns — and it still shows the faces smaller than the diagram wrapped around them. The rings are beautiful and they are winning an argument they should be losing on this specific surface.

**Fix.** On the gallery variant only, raise R_DISC toward R_SEASON (27 → ~33) and pull the tick rim and laurel in proportionally, or simply scale the whole plate up so the photograph clears 120px in a 300px column. Separately, crop the sources tighter: the supplied frames are half grey seamless, so a face-detected crop at ~1.4× face height would buy back roughly a third of the apparent size at every node size for free.

### [major] 300×300 sources at 5KB are visibly mushy at zoom and unusable at the sizes most nodes are actually drawn

`public/portraits/` · shots/16-zoomed-in.png (1.6× crop of 이태균), shots/19-laptop-dossier.png (3× crop of cold band); public/portraits/*.webp file sizes

**What is wrong.** Two ends of the same problem. At the top: 300px source against a node reaching 298 CSS px (597 device px at 2×) is a 2× upscale, and the files are 4.0–6.4 KB webp — about 0.45 bits/pixel. The 1.6× crop of 이태균 in shots/16-zoomed-in.png shows it plainly: smeared hair edges, waxy blotching across the cheek, and ringing along the jacket shoulder. At the bottom: node radius runs 24–44 world units, which at default zoom puts the smallest discs at ~20 CSS px diameter with only the inner 62% un-vignetted — a ~12px face. With the dossier open on a 1280×800 laptop (shots/19) that is where most of the cast lives, and 김유현, 김경훈, 정근우 and the three cold-band members are indistinguishable smudges.

**Why it matters.** The photograph is now the whole plate — no mark is drawn anywhere — so at both ends of the zoom range the identification system is delivering nothing and the caption is carrying 100% of the load. That is also why the caption defect above hurts so much: there is no second identifier to fall back on.

**Fix.** Resupply at 600×600, q≈78 (~25–35 KB each, ~600 KB for twenty — nothing against the two variable fonts already loading) and have tools/vite-plugin-portraits.mjs emit both sizes, picking by devicePixelRatio × view scale. If resupply is impossible, clamp max camera k so plate diameter never exceeds the source's device pixels. At the small end, raise the minimum node radius (24 → ~30) and/or pull PHOTO_SEAT_IN out to ~0.72 so more of the face survives the vignette.

### [minor] The filter rail's node-key row is guillotined mid-glyph in every desktop and laptop capture

`src/components/FilterRail.css` · shots/02-graph-default.png y≈1052; shots/18-laptop.png and shots/19-laptop-dossier.png y≈1030

**What is wrong.** The scroll container's bottom fade is 28px (FilterRail.css ~L476) and the boundary lands in the middle of a row rather than between rows. In shots/02, 03, 04, 05, 06, 07, 08, 09, 14 and 17 the row '크기 = 연결 수' under 노드 읽는 법 is rendered at roughly 35% and sliced horizontally through its x-height. In shots/18 and 19 (1280×800) it is worse: '평행 이력 … 3' is cut through the middle of the Hangul with a hard edge ~12px below its cap height.

**Why it matters.** It is the first row of the section that explains how to read the whole graph, and it looks erased rather than scrollable. A hard edge through Hangul syllable blocks reads as a clipping bug, not as an affordance — the fade is too short to say 'more below'.

**Fix.** Lengthen the bottom fade to ~56px (a full row height plus air) so the cut is unambiguously soft, and add scroll-snap or a scroll-padding so the container never rests with a row half-visible. Alternatively collapse 노드 읽는 법 by default so the resting boundary lands on a section rule.

### [minor] The About sheet and the cast wall set their headers to 55% of the panel and leave the rest ruled and empty

`src/components/AboutSheet.css` · shots/12-about.png, shots/24-gallery.png, shots/29-en-gallery.png

**What is wrong.** In shots/12-about.png the '지금 / THE SEASON IN QUESTION' table draws full-width rules to x≈1540 while every value (Wavve, 2026.07.03, 주간 공개) ends by x≈735 — roughly 800px of ruled, empty row, three times. The body paragraph above it wraps at x≈1260 in a 1140px-wide panel. The same shape in shots/24 and shots/29: the gallery's explanatory paragraph occupies the left 55% and the right 45% of the header block is empty, while the tile grid immediately below uses the full width. The header and the body are not on the same grid.

**Why it matters.** Long ruled rows terminating in nothing read as an unfinished table rather than as deliberate air, and the mismatch between a 55%-wide header and a 100%-wide grid makes the modal look like two pasted-together layouts.

**Fix.** Either right-align the values against the rule's end (a proper definition list), or cap the rule at the value's column so the row and its content end together. For the gallery header, either set the paragraph to the same four-column grid the tiles use (span 2 of 4) with something in the remaining span — the legend key, a count summary — or narrow the whole header block and centre it.

### [minor] The wordmark's X collides with 임 — no side-bearing between the Hangul and the Latin

`src/components/Intro.css` · shots/01-intro.png (3× crop), shots/20-mobile-intro.png, shots/02-graph-default.png topbar

**What is wrong.** At 3× on shots/01-intro.png the crimson X's upper-left arm overlaps the right vertical stem of 임's ㅁ. The inter-syllable gaps in 피의 게임 measure ~35 crop px; the 임-to-X gap measures 0. The same lockup at 24px in the TopBar (shots/02) is tight for the same reason. Pretendant's Hangul is drawn on a full em square with its own sidebearings and Inter's X is not, so butting them produces a crash rather than a kern.

**Why it matters.** This is the brand mark, set at ~88px on the cold open — the first thing anyone sees, and the one element that has to look decided. A crashed pair at display size reads as a font-fallback accident.

**Fix.** Wrap the X in a span with `margin-left: 0.06em` (or a hair space), and give it its own `letter-spacing: var(--tr-display-latin)` rather than inheriting the Hangul 0em. Check the TopBar lockup at the same time — it needs the same treatment at a smaller value.

### [nit] The season arc's round terminal is optically twice the arc's own weight

`src/graph/plate.ts` · shots/16-zoomed-in.png, 1.6× crop, green terminal at ~(935,590) in crop space

**What is wrong.** In the 1.6× crop of 이태균 in shots/16-zoomed-in.png the season-1 arc is stroked at ~28 crop px and its end terminal renders as a filled blob ~55 crop px across — roughly double. At max zoom it is the single heaviest mark on the plate and it reads as a tadpole head or a stray dot rather than as the end of a progress arc.

**Why it matters.** At the zoom where a reader is deliberately studying one person's record, the ornament that is meant to say 'this is how far they got' looks like a rendering artifact hanging off the ring.

**Fix.** Either drop the separate terminal dot and rely on `lineCap: 'round'` alone (which already gives a semicircular cap at exactly the arc's width), or if the dot is doing separate work, cap its radius at `arcWidth * 0.6`.

### [nit] tokens.css warns that the canvas is still violet-black; it isn't, and the warning will get a fixed thing 'fixed'

`src/styles/tokens.css` · src/styles/tokens.css L111-118 vs src/graph/render.ts L321-323 and src/graph/plate.ts L273-274

**What is wrong.** Lines 111-118 state 'THE CANVAS HAS NOT BEEN ROTATED YET' and that render.ts still paints #0a0810 / #08070c / #060509 and #221d29 → #100d16. `grep` returns zero hits for all five hexes; render.ts:321-323 already uses the warm #0d0807 / #0a0706 / #070504 and plate.ts:273 the warm #231e1c → #110e0b. The rotation landed; the warning did not get deleted.

**Why it matters.** This is the design system's own file and it is the document a new component owner reads before picking a background. A stale 'not done yet' block in the canonical token file is how a fixed thing gets re-fixed, or how someone concludes the two halves of the frame disagree when the screenshots show they do not.

**Fix.** Delete the paragraph, or reduce it to one line recording that the rotation is complete and naming the two files that carry the canvas values, so the next reader knows where to look rather than what to do.

---

## POLISH & CRAFT — 7/10

> Unusually disciplined craft everywhere the work is old — tokenised CSS with zero dead classes, a real label solver, honest copy coupling — but the two newest surfaces (the photographed plate and the cold band) both ship visible misses in the default view, and one mobile artifact reads as an outright bug.

**Biggest single win.** Re-encode the twenty portraits at 600×600, WebP q≈80. They are currently 4–6 KB each at 300×300 — roughly 0.5 bits per pixel — against a node that reaches 597 device pixels at maximum zoom, so the default presentation of every person in the atlas softens into blocks exactly when the reader leans in. At q80/600px each file lands around 25–40 KB, under 800 KB for the whole set, and it fixes the one quality ceiling that is visible on every screen in the app at once.

<details><summary>What is working</summary>

- CSS is genuinely systematised: every border-radius and colour goes through a token (only `50%`, `inherit` and `0` appear raw), and a sweep of every class selector in all 12 stylesheets against the TSX found zero dead rules — that is rare.
- Focus handling is real work, not a default: the language switch is a proper `role="radiogroup"` with roving tabindex and Home/End, the mode segment uses the same pattern, and every control paints a 2px ring.
- The honesty coupling is done properly — `gallery.note`/`gallery.notePhotos` and `about.tilePlate`/`about.tilePlatePhotos` swap on folder contents, so the app never claims "nobody here was photographed" over photographs.
- The brass laurel does survive against a face: on 이태균's plate the laurel band sits outside the photo rim entirely, so the one ring most at risk never lands on skin.

</details>

### [major] Portraits are 4–6 KB WebP at 300×300 against a node that reaches 597 device px

`public/portraits/*.webp`

**What is wrong.** `ls -la public/portraits` shows every file between 4,026 and 6,432 bytes for a 300×300 image — roughly 0.5 bits per pixel. That is two problems compounding: a ~2× upscale at maximum zoom (298 CSS px × 2 DPR = 597 device px from a 300 px source) on top of an encode so aggressive that hair and skin are already smeared in the source. I captured the running app at max zoom (scratchpad/b-zoomed.png, 1600×1000 @2x) — 이진형's hair, 홍진호's jaw and 박지민's fringe are visibly mush, and at 4× (scratchpad/j-tile-tae.png) 이태균's hair reads as flat blocks rather than strands. It is also visible one step down: the dossier's 96 px header plate at DPR3 is soft.

**Why it matters.** The photograph is now the whole of the plate — the monogram is never drawn — so the picture quality IS the node's quality. Zooming in is the app's core gesture (`scroll to zoom` is in the footer hint) and the reward for using it is a blurrier face than the one you started with.

**Fix.** Re-encode the set at 600×600, WebP q≈80. That lands each file around 25–40 KB, ~700 KB for all twenty, which is nothing against the fonts already being shipped. If the byte budget is genuinely fixed, the alternative is to cap `photoRadius` so the disc never exceeds ~1.25× the source's device pixels and let the plate grow around a photo that stops growing — but re-encoding is the right fix.

### [major] The cold band's row is not a row: unequal pitch and unequal baseline

`src/graph/layout.ts`

**What is wrong.** layout.ts:771–783 sets a single `gap` and puts all three cold nodes on one `y` with `anchorW = 4`, but the springs park before they converge. Measured on the shipped capture shots/02-graph-default.png the three disc centres are at x ≈ 889 / 1123 / 1410 — gaps of 234 and 287 px, a 23% difference. My live 1600×1000 @2x crop (scratchpad/a-cold.png) gives 377 and 454, the same 20%. Vertically they are not level either: shots/19-laptop-dossier.png has 신승용's disc ~15 px higher than its two neighbours, and in shots/26-en-graph.png the three sit at y ≈ 999 / 985 / 1005. The band's rails are centred on `cx` (the mesh centroid) while the row's own midpoint is elsewhere, so the container is ~11 px off-centre against its contents as well.

**Why it matters.** This band is the app's single most rhetorical composition — a deliberate, captioned rank that says 'these three are a set'. A rank whose pitch varies by a quarter and whose baseline wanders 20 px reads as three nodes that happened to drift near each other, which is exactly the reading the band exists to prevent. It is in the default view at every viewport.

**Fix.** The comment at layout.ts:781 rejects `fx`/`fy` because it would 'lose the transit'. Keep the transit and pin on arrival: let the spring fly them there, then set `fx`/`fy` once the node is within a few units of its anchor (or once GraphCanvas's brake fires). Alternatively drop cold nodes out of the charge and collide forces entirely once the row has formed — they have no links, so nothing else needs them in the sim. Also seat the band's rails and caption on the row's own midpoint rather than on the mesh centroid.

### [major] On mobile the cold-band names are seated off their own faces, and the band's rail strikes through two of them

`src/graph/render.ts`

**What is wrong.** In my live 390×844 @3x capture (scratchpad/m-cold.png) the label 'Kang Ji-hoo' sits at y≈505 while his disc is at y≈617 — 112 px above and offset right, landing immediately to the right of the parallel-record open-circle terminator at (417,475). 'Shin Seung-yong' is 27 px above-right of its disc, 'Choi Yeon-cheong' is level-right of its disc: three peers in one composed rank, three different seats. Worse, the band's dashed top rail runs horizontally at y≈508 — exactly the x-height of 'Kang Ji-hoo' and 'Kwak Beom' — so the rule's dashes emerge on both sides of two names. 'Kwak Beom' itself is seated ~80 px down-left of its own node, closer to the band than to its face.

**Why it matters.** The brief's own test — with no mark drawn, the caption is the whole of a node's identification — fails here. A phone reader looking at that region sees a name adjacent to a small hollow ring and will conclude the ring is Kang Ji-hoo. And a container rule drawn through a name is the kind of collision that reads as a broken renderer, on the app's most-used screen size.

**Fix.** Two changes. (1) Treat the cold row as one composed object for label placement: force all three names to the same side and the same offset, chosen once for the row (drawLabels already solves `coldSide` once at render.ts:1832 — extend that from 'which side' to 'the whole seat'). (2) Add the band's top and bottom rails to the label solver's obstacle set so no name can be seated on a rule, the same way discs and link geometry already are.

### [major] The parallel-record open-circle terminator has no legend entry

`src/components/AboutSheet.tsx`

**What is wrong.** render.ts:769–818 invents a glyph — a parallel line that stops short of the band and terminates in an open circle — and reasons about it carefully in the comment ('the universal "does not connect here" cap'). But the field guide's 'how to read' grid has fourteen KeyTiles (AboutSheet.tsx:879–1190: tileSize, tileRing, tileArcs, tileHalo, tileDashedRim, tileHostRing, tileNoTies, tileDashedLine, tileArrow, tileEdgeRead, tileEdgePin, tileColdBand, tileRimTicks, tileShiftClick) and not one of them is the terminator. `about.tileColdBand` draws a gradient rectangle — the band, not the stub.

**Why it matters.** This is precisely the 'legible or merely correct' question. In the default view (shots/02-graph-default.png) three teal dashed lines run down from 허성범, 박지민 and 이상민 and stop at small hollow rings above the band. At that size the ring is indistinguishable from a distant unlabelled node, and nothing on the canvas or in the guide tells the reader that a parallel record is a non-tie. The distinction is stated correctly in `gallery.note`, `about.coldBody` and `dossier.coldSub` — three places a reader looking at the graph is not.

**Fix.** Add a fifteenth KeyTile between `tileDashedLine` and `tileColdBand`: a disc, a teal dashed line, an open circle, and the copy '평행 이력 = 같은 기록, 만난 적 없음 — 관계로 세지 않음 / Parallel record — same history, never met; not counted as a tie'. It is one tile and it closes the loop between the glyph and its meaning.

### [major] The Orbit keyboard-shortcut badge leaks onto mobile as a stray 9 px dashed circle

`src/components/TopBar.css`

**What is wrong.** I probed the live DOM at 390×844: `.tb-seg-slot` measures 0×0 for Web, By season and By background, but 9×9 at x=361, y=55 for Orbit (`.tb-seg-btn is-locked`). It renders as an unexplained dashed circle floating at the right edge of the segmented pill, half-clipped by the pill's own border. It is in the shipped capture too — shots/21-mobile-graph.png at (862,140) — and in my scratchpad/h-mobile-top.png. The rule that collapses the badge on narrow viewports is evidently scoped so that the locked variant escapes it.

**Why it matters.** On a touch device a keyboard-shortcut badge should not be there at all, and this one survives only for the one mode that is locked, so it reads as a fragment of a fifth tab or a clipping bug. It sits in the top 90 px of the phone's primary screen where it is the first thing a reader's eye lands on.

**Fix.** Whatever media-query rule sets `.tb-seg-slot { width: 0 }` at narrow widths, drop the `:not(.is-locked)` (or equivalent) qualifier so it applies to all four, and hide the shortcut badge outright under `(hover: none)`.

### [minor] Korean text in the palette's empty state is rendered with monospace word gaps

`src/components/CommandPalette.css`

**What is wrong.** The echoed query is wrapped in `.mono`, which base.css:287 binds to `var(--font-mono)` = JetBrains Mono. JetBrains Mono carries no Hangul, so the syllables fall back to Pretendard while the U+0020 spaces keep the monospace advance (~0.6 em against Pretendard's ~0.26 em). In my scratchpad/e-palette-long.png the heading reads "스타크래프트  프로게이머  출신  포커  플레이어  홍진호" with gaps roughly 2.3× normal — it looks like badly justified type.

**Why it matters.** Korean is the source language and this is the one surface whose whole job is to help a reader recover from a bad query. Setting their own words back at them in visibly broken spacing undermines that.

**Fix.** Give `.cp__empty-q .mono` its own stack that puts the Hangul face first — `font-family: var(--font-kr), var(--font-mono)` — or, cleaner, drop the `.mono` class from the echo when the query contains Hangul and keep it only for the Latin/numeric case that motivated it.

### [minor] Photo crops are not normalised across the set

`public/portraits/README.md`

**What is wrong.** The tone correction does its job — the wall does read as one exposure — but the framing does not. At 4× (scratchpad/j-tile-tae.png) 이태균's hair is clipped by the top of the disc; in the same gallery row (scratchpad/c-gallery-top.png) 이상민 sits noticeably smaller with clear headroom, and 박지민's hair grazes the rim. Head size varies by roughly 15% of the disc diameter across the three, and the eye-line sits at three different heights.

**Why it matters.** The disc is a repeated frame twenty times over on the cast wall (shots/24-gallery.png, shots/29-en-gallery.png). Inconsistent head size inside a repeated circle is the single loudest signal that the images came from twenty sources — louder than exposure, which has been solved.

**Fix.** Add a crop normalisation to the source pass: detect the face box, place the pupils at a fixed fraction of the disc diameter from the top (~0.40) and set head width to a fixed fraction (~0.52), then re-crop. This is a one-off on the twenty source files, not runtime work.

### [minor] Names in the seasons layout's "no prior season" cluster sit between two rows of faces

`src/graph/render.ts`

**What is wrong.** In shots/08-seasons.png the eight people with no prior season sit in a tidy two-row lattice inside their ellipse, but the labels alternate sides with no pattern. 최연청's label at (1505,951) is 69 px above its own disc (1505,1020) and only ~16 px below 이관희's disc (1410,935) — it is nearer, vertically, to the wrong row. 신승용's label at (1315,972) sits in the same gutter between 김유현's disc and its own. 강지후, 곽범 and 김남희 take yet other seats.

**Why it matters.** Same failure mode as the cold band and the same reason it matters: with no mark on the plate, the caption is the identification. In an anchored lattice — where the app knows the positions exactly, unlike the free web layout — a name landing in the gutter between two rows is unambiguously solvable and currently is not.

**Fix.** In anchored modes, seat labels by row rather than per node: every disc in a lattice row takes the same side and the same offset, resolved once for the row. The solver already has the cluster membership it would need.

### [minor] Mobile filter-rail controls are below the touch-target floor

`src/components/FilterRail.css`

**What is wrong.** Measured on the live 390×844 build: `.frail__sec-btn` is 24 px tall (three of them), `.fmini` is 30×28 and 47×28, `.frail__close` is 30×30, the five `.fchip` lineage chips are 30 px tall, and the seven `.frow.fedge` relationship rows are 32 px. WCAG 2.2 target-size AA is 24×24 as an absolute floor and the 24 px buttons are exactly on it before their 1 px border is counted.

**Why it matters.** The 전체 / 없음 pair and the section jump links are the rail's primary controls on a phone, and at 24 px they are a coin-flip to hit with a thumb.

**Fix.** Add an invisible `::before` hit area (`position:absolute; inset:-8px`) to `.frail__sec-btn`, `.fmini` and `.frail__close` under a `(hover: none)` query. That gets them to 40–44 px without touching the visual rhythm of the rail.

### [minor] The cold band turns inside out when the language changes

`src/graph/render.ts`

**What is wrong.** `capBelow` at render.ts:504 decides the caption's seat from how much clearance the mesh happened to leave, and `coldSide` (render.ts:1832) then gives the three names the other side. At the identical 1600×1000 frame with identical data, shots/02-graph-default.png (KO) seats the caption above the row with the names below, and shots/26-en-graph.png (EN) seats the caption below with the names above — the whole band mirrors, because the EN mesh settles a few units lower.

**Why it matters.** A reader who toggles 한국어/EN sees a composed element flip its internal order for no reason they can perceive. The flip is a good idea as a fallback; it should not be the ordinary case.

**Fix.** Make `capBelow` sticky: keep the seat chosen on the first frame the band forms and only flip when the clearance is violated by more than a hysteresis margin (say 20 world units), rather than re-solving it every frame from a value that drifts.

### [minor] Field-guide legend grid: two row heights and ~190 px of dead space under the short tiles

`src/components/AboutSheet.css`

**What is wrong.** In shots/13-about-legend.png the eight visible tiles form a 2×4 grid, but row 1 is ~250 px tall and row 2 is ~380 px, because `about.tileHostRing` runs four Korean lines plus four English lines (구슬 점선 호 = … 플레이어가 아닌 자리로 참여한 적이 있는 사람) while its three row-mates run two and two. The result is roughly 190 px of empty tile beneath the two-line caption of 가는 회색 테두리 and beneath 점선 = 하우스 밖에서 생긴 인연.

**Why it matters.** It is a key — eight peers that should read as one system. Two row heights and three tiles that are mostly hollow make it read as a grid that ran out of copy.

**Fix.** Either split `about.tileHostRing` into two tiles (구슬 점선 호 and 바깥 실선 고리 are two facts sharing one caption), or pin the caption block to the bottom of the tile with `justify-content: space-between` on the tile's flex column so the empty space falls between illustration and caption rather than below it.

### [nit] Nine duplicated top-level selector blocks across the stylesheets

`src/components/CommandPalette.css`

**What is wrong.** The same selector is declared twice at file top level in nine places, e.g. `.cp__empty-q .mono` at CommandPalette.css:707 and :712 (adjacent, and trivially mergeable), `.tb-actions` at TopBar.css:64 and :485, `.dsr-rep__badge` at Dossier.css:696 and :1771, `.dossier` at app.css:96 and :112, plus `.abt-keys__ko`, `.abt-rec__h--s`, `.edgecard__tag`, `.intro__stage`, `.pathcard__degree-en`. None is inside a media query — they are layered patches.

**Why it matters.** None of it renders wrong today, but it means the next person changing `.tb-actions` has to know there are two places 420 lines apart that set it, which is how a border starts appearing and disappearing.

**Fix.** Merge each pair into the primary block. The `.cp__empty-q .mono` pair is two lines apart and should be one rule.

### [nit] Two different focus-ring colours

`src/styles/base.css`

**What is wrong.** Walking Tab through the live app and reading `getComputedStyle().outline`: the canvas focuses with `rgb(230, 192, 122) solid 2px` (amber) while every button — segment tabs, search, language, the four icon buttons, the lineage chips — focuses with `rgb(240, 231, 212) solid 2px` (bone).

**Why it matters.** The ring is the one thing a keyboard user tracks continuously, and it changes colour on the app's largest and most important stop.

**Fix.** Pick one and route both through the same token. If the canvas genuinely needs a warmer ring for contrast against the near-black field, make that a named token (`--focus-on-canvas`) rather than a second hardcoded value.

### [nit] A leader line that touches neither end

`src/graph/render.ts`

**What is wrong.** In shots/17-zoomed-out.png 하승진's label at (1345,745) is joined to its disc by a faint dotted vertical leader running y≈675 to y≈735 — which leaves a ~35 px gap to the bottom of the disc at y≈640 and a ~10 px gap to the label. It is the only leader in the frame, so it reads as an artefact rather than a callout.

**Why it matters.** A connector that connects nothing is worse than no connector: the reader spends a beat deciding whether it is a very short edge.

**Fix.** Draw the leader from the plate's extent to the label's cap-height with no gap at either end, and give it the same dash rhythm and weight everywhere it fires so it reads as a deliberate device.

### [nit] Comments describe a data state that stopped being true when the cold band fired

`src/graph/layout.ts`

**What is wrong.** layout.ts:505–510 states 'The cold branch below is dormant: every person in the cast now has at least one verified tie, so `cold` is empty and nothing here reserves the row's band' — the validator reports 'no verified tie: 3 (강지후, 신승용, 최연청)' and the branch runs on every relayout. layout.ts:777 says 'These four have no links pulling them anywhere' where there are three; render.ts:1926 says 'The cold-tray four count as important'; GraphCanvas.tsx:1452 says 'four cold nodes drifting free'.

**Why it matters.** This codebase's comments are unusually good and are clearly meant to be load-bearing documentation. A comment that confidently asserts the opposite of the current data is the one kind of comment worse than none — the next maintainer will read 'dormant' and skip the branch that is actually producing the row.

**Fix.** Rewrite the block at 505–510 to describe the live state, and replace the three 'four' counts with 'the cold row' so they cannot go stale again when the edge list moves.

### [nit] The status hint tells you to do the thing you have already done

`src/components/StatusBar.tsx`

**What is wrong.** In shots/23-path-trace.png a path is traced, the PathCard is open showing 홍진호 → 이상민 → 정근우, and the status bar still reads '홍진호 선택됨 · Shift+클릭으로 두 사람 사이 경로 추적 · Esc로 해제'.

**Why it matters.** Small, but the status bar is the app's one running commentary on state, and here it is describing the state before last.

**Fix.** Swap the hint while a path is live to name the current chain and the way out — '경로: 홍진호 → 정근우 · Esc로 해제' — and restore the shift-click invitation when the path clears.

---

## INFORMATION DEPTH & EDITORIAL QUALITY — 8/10

> The writing, sourcing discipline and derived-record machinery are flagship-grade, but the app still prints "Host" over a studio panellist, renders none of the 46 citations behind its most claim-dense prose, and leaves an authored English field dead — three failures of exactly the accuracy it markets.

**Biggest single win.** Kill the word "Host". Split `dossier.roleHost` / `hover.host` / `dossier.hosted` by `Role` so a `panel` run reads "Studio panel / 스튜디오 패널" and a `crew` run reads "Not playing / 비참가" — the neutral strings already exist in `gallery.hosted` and `gallery.hostShort` — and fix Park Ji-min's bio and notableFor in both languages to match her own record. This is the one place in the atlas that asserts something untrue about a named real person, it fires on the two surfaces every reader touches, types.ts already documents it as a known and supposedly-fixed defect, and it costs about six string edits and two branches.

<details><summary>What is working</summary>

- The 52 edges are not filler. The shortest description is 169 Korean characters and the median is 314 KO / 680 EN; even the seven `co-season` lines — the obvious place for "both were in season 2" — are argued rather than asserted (홍진호×허성범 ends "진영이 갈렸다는 사실과 두 사람이 부딪쳤다는 주장은 다른 말이고, 이 선은 앞의 것만 말한다"), and edges.ts carries a written record of pairs searched and deliberately NOT drawn (이진형×김남희, 정근우×하승진, 하승진×곽범) so "no edge" cannot be read as "nobody looked".
- The season arcs name moments, not tendencies: 최혜선 winning a Death Match 58 chips to 12 and being sent down anyway; 이태균 climbing the boiler-room shaft to the key inside the television and taking 108 million won on 러닝 퍼즐; 현성주 losing 미스터리 넘버 17–24 with the closer "예측은 좋았고 암기가 발목을 잡았다". Sixteen runs, none hedged.
- The Sources tab volunteers its own weakness in numbers rather than in adjectives — 241 of 309 citations (78%) are namu.wiki, 31 of 52 ties stand on wiki alone, fifteen of those are ties the app does not stamp Unverified — and pins the fifteen in the build check so it can only fall. I have not seen a fan reference work disclose against itself at that resolution.
- The cold band is genuinely editorial, not a null state: 강지후's panel reads "Walks in cold — No shared credit and no documented working relationship with any of the other nineteen turned up in public sources. A shared school or a shared credential was not counted as a tie on its own", with the parallel record listed separately under "The records rhyme; the two have never been in the same room. Not counted in the verified total."
- headToHead.ts derives the whole franchise ledger — duels, same-field finishes, `unadjudicated` shared appearances, and a career `share` (players outlasted over field size) that makes 3rd-of-13 and 4th-of-18 comparable — and the About sheet renders it as a sortable table with a season timeline. Almost everything a fan would ask for is already built.

</details>

### [blocker] The app calls a studio panellist and a casino dealer "Host" — a false credit about two named real people, on the two most-read surfaces

`src/data/i18n/ui.ts` · Live capture of the English dossier for Lee Sang-min: "ACROSS THE FRANCHISE · 프랜차이즈 통산 / S1 Host / 1 season" followed by a chip reading "Hosted". Same strip drives 박지민's S3 cell ("S3 Host"). `hover.host` fires the same word on the hover card.

**What is wrong.** `dossier.roleHost` = '진행' / 'Host', `hover.host` = '진행자' / 'Host' and `dossier.hosted` = '진행 경력' / 'Hosted' are selected by `watched(run)` (src/data/types.ts:72), which is true for BOTH non-playing roles — `panel` and `crew`. Lee Sang-min sat on season 1's 브레인 군단 studio panel and never entered the house; his own arc, four inches lower in the same panel, says he is "routinely miscredited" and that the panel "had no power to touch the game". 박지민's season-3 run is filed 보조 출연, a twist held back until episode 6. Neither hosted anything. types.ts:36–47 documents this exact falsehood being caught by a reader once already and splits `Role` into panel/crew specifically to stop it — the union landed, the copy did not. The correct neutral vocabulary already exists two files away and is used by the gallery: `gallery.hosted` = '플레이어가 아닌 자리로 참여' / 'In a season, not playing', `gallery.hostShort` = '비참가' / 'Not playing'.

**Why it matters.** This is the only place in the atlas that states something untrue about an identifiable person, and it does so on the primary panel and on hover — the two surfaces every reader hits. A fan who knows season 1 sees the app assert Lee Sang-min hosted it and reasonably stops trusting the other 51 ties. It also collides head-on with the product's loudest claim ("every tick is a verified connection") and with its own schema comment.

**Fix.** Split the key by role. Add `dossier.rolePanel` ('스튜디오 패널' / 'Studio panel') and `dossier.roleCrew` ('진행 밖 출연' / 'On the board, not playing'), or simply reuse `gallery.hostShort` for both; branch on `run.role` at src/components/Dossier.tsx:438 and :528 instead of on `watched()`. For the aggregate tag at HoverCard.tsx:217 and CommandPalette.tsx:320, `some(watched)` is fine but the label must become 'Not playing' / '비참가'. Rename `dossier.hosted` to `dossier.offBoard` with 'In a season, not playing'. Then add a validator assertion that no UI key containing 'host' is reachable from a run whose role is 'panel'.

### [major] Park Ji-min's own dossier contradicts itself about season 3 — bio says host, record says supporting cast

`src/data/people.ts` · people.ts:117 vs records.ts:137; people.en.ts:29 vs records.en.ts:48; Korean gallery card (shots/24-gallery.png) "S3 유령 카지노 딜러" vs English gallery card (shots/29-en-gallery.png) "S3 Host".

**What is wrong.** Three surfaces say she hosted season 3 — bio "시즌3에서는 판을 굴리는 진행자 자리로 옮겨 앉았다", notableFor "시즌3 진행자" / "host in season 3" and "Broadcasting award for hosting Bloody Game", and seasons.ts franchise.reception "진행을 맡은 박지민". Two say she was not — her own season-3 record, "참가자가 아니라 잔해 유령 카지노의 딜러 겸 연옥 집사 — 보조 출연" whose first appearance was episode 6 as a production twist, and types.ts:37 which names her as a case where the host claim is untrue. Separately, the English placement string is 'Host — dealer and butler' while the Korean is '유령 카지노 딜러 · 연옥 집사'; because the gallery card splits on the first separator, the two languages print different claims on the same card.

**Why it matters.** She is the franchise's most-embedded figure — the one person in all three seasons — so her file is the one a knowledgeable fan will read hardest, and it disagrees with itself within one scroll. The bilingual split is worse: an English reader is told she hosted the season while a Korean reader is told she dealt cards in the ruins, from the same dataset.

**Fix.** Pick the version the records file and the validator already enforce. Rewrite the bio clause to "시즌3에서는 참가자가 아니라 잔해의 딜러 겸 집사로 판을 굴렸다" / "…moved behind the table as the dealer and butler of the ruins", change notableFor to '시즌1·2 참가자, 시즌3 잔해 딜러' / 'Contestant in seasons 1 and 2, dealer in season 3', and either date the broadcasting award to the season it was actually given for or drop it. Change records.en.ts:48 `placement` to 'Dealer and butler — the phantom casino' so the head of the string matches the Korean head. Move seasons.ts franchise.reception's "진행을 맡은 박지민" to whichever season she actually presented.

### [major] 46 season-run citations are authored, build-enforced and counted in the public total — and rendered nowhere

`src/components/Dossier.tsx` · `grep -n '\.sources' src/components/Dossier.tsx` returns only `e.sources` (priorElsewhere, line 641) and `p.sources` (line 1324) — never `run.sources`. Live capture of Ha Seung-jin and Jung Keun-woo: the Franchise record plate ends at the beats with no Sources affordance, while the "record elsewhere" plate directly beneath it has one.

**What is wrong.** records.ts opens with a paragraph explaining that every run now carries its own citations because "the longest and most argued-over prose in the app was the only text in it with no source list", and tools/validate-data.mjs:628 fails the build for any run without them. Sixteen runs carry 46 references. The Dossier never reads the field. The Sources tab meanwhile tells the reader there are 309 citations and that "every season run in this atlas carries the pages it was written from" — 15% of that total is unreachable, and the sentence is true of the data and false of the app.

**Why it matters.** The season arcs are where the hard numbers live — 58칩 대 12칩, 17:24, 4:1, 8:17, 상금 1억 800만 원, 5,000만 원, 자금 2,000만 원. They are the most disputable text in the product and the only long-form text a reader cannot check. The asymmetry is worse than a uniform absence: the shorter 바깥에서의 기록 paragraph beside it does show its working, which reads as "we sourced the easy one".

**Fix.** Lift the disclosure block from `ElsewherePlate` (Dossier.tsx:667–692) into a small shared `<SourceList>` and render it at the foot of `SeasonPlate` (Dossier.tsx:526) from `run.sources`. It is the same markup, the same `dossier.sources` key and the same fold-away behaviour; nothing new needs designing. Then add a validator assertion that every array the sourcing paragraph counts is reachable from a component.

### [major] The authored English `aka` never renders, and English search cannot find English names

`src/components/Dossier.tsx` · Live English dossier for Hong Jin-ho: "Known as 콩 · 폭풍저그" (also visible in shots/27-en-dossier.png). src/data/i18n/people.en.ts:112 holds `aka: ['Kong (콩)', 'Storm Zerg (폭풍저그)']`.

**What is wrong.** Dossier.tsx:1325 does `const aka = (p.aka ?? [])` unconditionally, so the Korean array is printed in both languages and `peopleEn[id].aka` is dead code. Four people have authored English aliases that no reader ever sees: Hong Jin-ho ('Kong', 'Storm Zerg'), Hyun Seong-joo ('Komong', 'Koreanmonkey'), Kwak Beom ("Mad Monster's Tan"), Lee Sang-min ("Sang-min of Roo'Ra"). CommandPalette.tsx:140 has the same bug in search: occupation (line 147), category (150), notableFor (158) and otherShows (163) are all deliberately matched across both languages, and `aka` is the one field matched in Korean only — so typing "Kong", "Storm Zerg" or "Koreanmonkey" returns nothing.

**Why it matters.** The product's stated position is that an English reader must not have to read Hangul off the interface — that is why the medallion mark is romanised. The alias line breaks that rule in the one place where the nickname IS the identity: 폭풍저그 and 콩 are how Korean e-sports fans refer to Hong Jin-ho, and an English reader is shown glyphs instead of the translation that was already written for them. Search failing on "Kong" is the same gap made worse, because the reader has no way to discover the alias exists.

**Fix.** Add an `aka` case to the i18n accessor next to `personOccupation` / `personNotableFor` in src/data/i18n/index.ts, use it at Dossier.tsx:1325, and extend the CommandPalette loop at line 140 to iterate both `p.aka` and `peopleEn[p.id]?.aka` the way `notableKo` / `notableEn` are already zipped at lines 155–162.

### [minor] Seven of the 22 "record elsewhere" essays carry no citation, and the sourcing disclosure does not mention them

`src/data/people.ts` · Uncited priorElsewhere blocks: 박지민, 정근우, 이태균, 윤비, 서출구, 최혜선, 허성범. people.ts:231 carries the comment "SOURCES PENDING, DELIBERATELY". Dossier.tsx:667 wraps the Sources button in `sources.length > 0 &&`.

**What is wrong.** Seven multi-hundred-word biographical accounts — 정근우's Olympic gold and five post-retirement shows, 이태균's police-university-to-bar route, 서출구's two Netflix series, 최혜선's Durham MSc and London hospital, 윤비's 생존남녀 win, 허성범's KAIST record, 박지민's day job — render with no citation surface at all, while the fifteen beside them have one. Because the button is conditionally hidden rather than showing an empty state, the reader gets no signal that anything is missing. The Sources tab's honesty paragraph accounts for season runs and for the 52 relationship lines by name and is silent about this section.

**Why it matters.** It is the one incomplete disclosure in a product whose distinguishing quality is that it counts what it cannot prove. A reader who has just been told "31 of the 52 relationship lines still stand on namu.wiki alone" is entitled to assume the same accounting covers the biography, and it does not.

**Fix.** Either attach the citations (each of these blocks is written from pages already listed in that person's own `sources` array, so it is a copy, not new research — plus the matching arithmetic edit to `dataset.meta.sourcing` in the same commit, which is what the comment says is blocking it), or render an explicit "출처 없음 / Not separately cited" line where the button would be, and add one sentence to the Sources tab stating how many of the 22 accounts are cited.

### [minor] The franchise strip counts non-playing seasons as seasons played

`src/components/Dossier.tsx` · Live capture: Park Ji-min reads "Best No. 4 · 3 seasons · Outlasted 29%"; Lee Sang-min reads "1 season".

**What is wrong.** Dossier.tsx:425 computes `played = new Set(runs.map(r => r.season)).size` over every run regardless of role. Park Ji-min played two seasons and dealt in a third; Lee Sang-min has never played one. headToHead.ts:292 already computes this correctly (`runs.filter(r => r.role === 'contestant')`) and the strip does not use it. The wording is neutral enough on its own ('개 시즌' / 'seasons'), but the strip is headed 프랜차이즈 통산 / ACROSS THE FRANCHISE and the number sits between "Best" and "Outlasted %", both of which are play metrics.

**Why it matters.** It puts a play count on a man who has never played, immediately under a chip that already (wrongly) says he hosted — the two errors compound into a franchise record he does not have.

**Fix.** Read `career[personId].seasons.length` instead, and print the non-playing seasons separately as their own clause ("1 season on the panel" / "패널 1개 시즌") so the record stays complete without being counted as competition.

### [minor] Two edges tell materially different stories in Korean and English

`src/data/i18n/edges.en.ts` · edges.en.ts:214 (`lee-sang-min--park-ji-min`) against its Korean counterpart in edges.ts; edges.en.ts entry for `park-ji-min--heo-seong-beom`.

**What is wrong.** The English file's header states that "every name, day number, score, placement and sum of money is carried across unchanged, and only the prose is authored fresh". On the 이상민×박지민 line the Korean names three specific season-1 plays (selling out the King who made her Queen on day two, the staged tears on day four, the only contestant to reach the finale without drawing a vote); the English drops all three and instead adds a characterisation with no Korean source — "billed as the chief of a corps that lives and dies on instinct". On 박지민×허성범 the English dates the raid to "day three" where the Korean gives no day. Related: hong-jin-ho's season-3 arc renders "passing off her win as his own" for 최혜선을 이긴 척 위장한 채, which is a different assertion (claiming credit vs. faking a result).

**Why it matters.** Korean is declared the source of record. Two readers looking at the same tie card get different facts, and in one direction the English is the only place a claim appears at all — which is precisely the drift the file headers throughout this repo exist to prevent.

**Fix.** Re-zip these two entries against the Korean: restore the three named plays to the 이상민×박지민 English (or, better, cut them from the Korean too, since edges.ts's own rule says placements and elimination order belong in records.ts), delete the unsourced "lives and dies on instinct" clause, drop "on day three", and change "passing off her win as his own" to "passing himself off as the one who had beaten her". Then extend the validator to flag any English description containing a day number, score or year absent from its Korean pair.

### [nit] Stale counts in the data-file headers

`src/data/i18n/edges.en.ts` · edges.en.ts:4 "English accounts of the forty connections in `edges.ts`"; the validator reports 52. Dossier.tsx:580 "Eight of the twenty have never played this franchise, and until this section existed…" now sits above a section that people.ts:606 says covers 20 of 20.

**What is wrong.** Two header comments quote counts the data has since moved past.

**Why it matters.** In this repo the headers are the specification — three separate bugs above were caught by reading them against the code. A header that has drifted is a specification that has stopped being checkable, and it is the first thing the next reviewer or contributor reads.

**Fix.** Replace the hard-coded numbers with the invariant they stand for ("one entry per edge in edges.ts, keyed by id"), and have tools/validate-data.mjs assert that any digit-bearing count in a data-file header matches the live figure.

---

## UI/UX & INTERACTION DESIGN — 6/10

> The information architecture, copy, legend and keyboard/ARIA work are genuinely flagship-grade, but the app's single most common gesture — hovering a node — blacks out that person's photograph, picking someone from the search palette silently filters the atlas down to 2 of 20 people, and the browser Back button is a dead key; three primary-surface failures on the most-travelled paths.

**Biggest single win.** Stop the caption from destroying the face it names. Suppress the canvas caption for the node the HoverCard is already describing, and clip the own-face wash to the glyph box with a ceiling around 0.68 instead of painting a 109px-radius 94%-opaque disc from a 200px caption box. That is a handful of lines in one function of src/graph/render.ts, and it repairs the release's entire headline feature at the exact moment of attention — hover, select and the orbit centre all currently render the subject as a black silhouette, in four of the supplied screenshots and permanently on a Korean phone.

<details><summary>What is working</summary>

- Keyboard operation of the canvas is real and better than most commercial graph tools: the canvas is role="application" with tabindex=0 as the FIRST tab stop, arrow keys move a cursor between nodes inside a 100° cone, Enter opens, and every cursor move writes one sentence into a polite live region that matches the sr-only fallback list verbatim. The custom widgets are correct too — roving-tabindex radiogroups for mode and language, a proper combobox/listbox palette with aria-activedescendant, tablist/tabpanel in the help sheet, and `inert` rather than aria-hidden on leaving dialogs.
- The empty state is the best-written screen in the app: 'Nobody matches these filters' with a bilingual second line and an explicit recovery sentence naming the number (20) that comes back. Almost nobody writes this screen at all.
- The honesty coupling holds up under inspection. The gallery note and about.tilePlate genuinely switch on whether the portraits folder has content, and the cast wall prints '0 건 · 평행 이력 1' for 강지후 — the verified/parallel distinction is legible as a number, not just correct in the data model.
- The relationship encoding is discoverable without help: the filter rail is a live legend (colour swatch + name + count, all clickable as filters), so 'what does teal mean' and 'show me only teal' are the same control. That is the right answer to 'is the encoding discoverable'.

</details>

### [blocker] Hovering a node wipes out that person's photograph — the caption scrim reaches 0.94 alpha over the face

`src/graph/render.ts`

**What is wrong.** When a node is hovered, the caption is promoted to the two-line name+role form and the label solver frequently seats it on the own-face slot of last resort. The plate wash is then `min(0.94, (onOwnFace ? 0.9 : …) + 0.25 * max(n.focus*2, useSub ? 1 : 0))` (render.ts ~2915) and it is painted as a radial gradient of radius `(boxW + 18) / 2`. For a two-line Korean caption boxW is ~200px, so a 109px-radius, 94%-opaque black disc is painted over a node whose photo radius is ~31px. I drove this live at 1600×1000 dpr2: before hover 홍진호's face is fully visible; on hover it is a black silhouette with the caption printed on it. It is in the supplied screenshots too — 03-hover, 04-dossier, 05, 06 and 07-orbit all show 홍진호 as a black disc, and 07 has it as the CENTRE of the orbit layout. On a 390px phone in Korean it is at rest and permanent: 이진형 stays a black disc with his name across it after 8 seconds of settling.

**Why it matters.** The headline of this release is that all twenty people now have a real photograph and the mark is never drawn. The app deletes the photograph at exactly the moment the reader asks who someone is, and the code comment beside the seat argues the opposite ('it is painted with a heavier scrim so the type sits ON the photograph rather than in it') — 0.94 is not 'on', it is 'instead of'. It also makes the hover redundant twice over: the HoverCard already shows the same name, the same role and a thumbnail, so the canvas is destroying the portrait to repeat text that is already on screen 40px away.

**Fix.** Three independent fixes, any of which lands it. (1) Suppress the canvas caption entirely for the node the HoverCard is currently describing — the card is the readout. (2) Never promote to the two-line `useSub` form when the chosen slot is the own-face seat; a one-line name needs a ~70px box, not 200px. (3) Clip the wash to the glyph box (`boxW+18 × boxH+14` rounded-rect) instead of a circle of radius (boxW+18)/2, and cap `onOwnFace` at ~0.68 — the knockout stroke at rgba(10,7,6,0.9)/3px already carries most of the legibility. Assert it: sample mean luma inside r = rPhoto*0.6 before and after hover; it must not drop by more than 25%.

### [blocker] Opening a person from the search palette leaves a hidden query filter that guts the atlas

`src/state/useAtlas.ts`

**What is wrong.** Typing '홍진호' into the command palette and pressing Enter opens his dossier AND leaves `q=홍진호` set. Pressing Escape closes the dossier and leaves the graph at 2 of 20 people and 1 of 52 ties (verified live: status bar reads '인물 2/20 · 관계 1', hash `#q=%ED%99%8D%EC%A7%84%ED%98%B8&lang=ko`). The only trace is a small count chip inside the top-bar search button, and that chip is `aria-hidden="true"` (TopBar.tsx:721). Screenshot 14-filtered shows the same trap in the shipped set: the rail says 10/20, the search chip says 14, and nothing on screen explains the difference.

**Why it matters.** The reader asked to LOOK AT a person, not to filter the atlas down to them. They then close the panel and are staring at an atlas that has lost 90% of itself, with no visible cause and no obvious undo — 'clear filters' in the status bar is the only exit and it is 1100px away from where the action happened. This is the single fastest way for a first-time user to break the app and not know why.

**Fix.** Separate 'search to navigate' from 'search to filter'. Committing a person from the palette (Enter / click on a People row) should clear the query — the selection is the outcome, the filter was scaffolding. Keep the live graph-filtering while the palette is OPEN, since that is what the 'closing keeps this' note promises, but clear `q` on commit-to-person. If the persistent filter must stay, the top-bar chip must be a visible dismissible token showing the query string ('홍진호 ✕'), not an aria-hidden count.

### [blocker] The browser Back button does nothing, and one Escape can push two history entries

`src/state/useDeepLink.ts`

**What is wrong.** Traced live: start `#lang=ko` (history.length 2) → select 홍진호 (len 3) → press 4 for orbit (len 4) → press Escape (len **6** — one keypress, two pushes, because clearing the selection also reverts the locked orbit mode in a second commit). Then three consecutive `history.back()` calls leave the hash unchanged at `#q=…&lang=ko` and history.length pinned at 6 — the app re-writes the hash forward on every popstate, so Back is a no-op. The user cannot even leave the page with it.

**Why it matters.** On Android the hardware/gesture Back is the primary 'close this panel' gesture, and this app is a phone-first companion to a Korean variety show. Back either does nothing or, once the trap is escaped, jumps two steps. The file's own comments argue carefully about which changes are navigations and which are refinements — that reasoning is sound and the implementation does not deliver it.

**Fix.** Two fixes. (a) Coalesce the Escape commit: clearing the selection and reverting the orbit lock must land in one state write, so batch them (a single `atlas.select(null)` that also normalises mode) before the deep-link effect runs. (b) Fix the popstate loop: when `onNav` applies an incoming hash, set `selfWrite.current = true` for the whole apply-and-rebuild cycle, not just one macrotask — the `setTimeout(…, 0)` at line 341 fires before React has committed the applied state, so the rebuild reads as a fresh user change and re-pushes. Regression test: select → Escape → history.back() must restore the person.

### [major] Four of twenty people are unnamed on an English phone — with no mark drawn, they are anonymous faces

`src/graph/render.ts`

**What is wrong.** At 390×844 dpr3 with `lang=en`, the default view inks 17 captions and drops four — lee-sang-min, jung-keun-woo, lee-jin-hyung, choi-hye-sun — all with reason 'stray' (read from `window.__atlasPaint.frame.dropped`). The same viewport in Korean names all twenty. Confirmed visually in my capture: four discs on the first screen carry no text of any kind. Separately, at 1600×1000 pressing '=' three times drops ha-seung-jin, hyun-seong-joo and seo-chul-gu as 'unseen' while their discs are still inside the viewport.

**Why it matters.** The brief's own premise is that the caption is now the WHOLE of a node's identification. An English reader on a phone — the exact user the romanised mark exists for — cannot identify 20% of the cast on the first screen without tapping each one. The two failure modes are also inconsistent with each other: Korean takes the own-face seat and destroys a photo, English refuses the seat and produces an anonymous face. One of those two policies is wrong.

**Fix.** Give the solver a shorter fallback string before it gives up. English romanisations are 2–3× the pixel width of the Hangul ('Choi Yeon-cheong' vs '최연청'), so add a surname-dropped or given-name-only variant ('Yeon-cheong') to `buildSpots` as a second pass when every slot at full width is priced above MISSEAT, and only then fall through to drop. Also raise the seen-fraction floor's grace at k > 2 so a disc whose centre is on screen keeps its name. Assert: `paintedFrame.dropped` must be empty for every node whose centre is inside the uncovered rect, at 390/1280/1600 × {ko, en}.

### [major] Single-letter shortcuts fire while Ctrl/Cmd is held, so browser chrome and the graph both react

`src/App.tsx`

**What is wrong.** The global keydown handler (App.tsx:418–464) switches on `e.key` with no check on `e.ctrlKey`/`e.metaKey`/`e.altKey` — the only guard is whether focus is in an input. So Ctrl+F opens the browser's find bar AND refits the graph; Ctrl+- and Ctrl+= zoom the browser AND zoom the graph (compounding, so the reader ends up at an unintended scale in two coordinate systems); Cmd+[ on macOS is browser-back and also toggles the filter rail; Ctrl+G (find-next) toggles the cast wall.

**Why it matters.** These are among the most-used browser shortcuts. A reader who reaches for Ctrl+F to find a name — the single most likely keystroke on a page of twenty names — gets the find bar plus an unexplained camera move, and cannot tell which of the two things they did. Ctrl+- is worse because the two zooms compound and there is no single control that undoes both.

**Fix.** Add `if (e.metaKey || e.ctrlKey || e.altKey) return;` immediately after the existing Ctrl+K branch and before the switch. The Ctrl+K palette toggle already handles its own modifier case above it, so nothing else in the handler wants a modifier.

### [major] Filtering never refits the camera, so the graph shrinks into the top-left of a mostly-empty canvas

`src/graph/GraphCanvas.tsx`

**What is wrong.** In 14-filtered (10 of 20 shown) the blob occupies roughly x 860–1520 of a 390–2000 canvas and is centred at y≈440 of a 80–1245 box — the bottom half and both side thirds are dead black. 17-zoomed-out is the same 14-person filter with more dead space. The cause is that the vertical space reserved for the cold band is still reserved when the filter has removed everyone in it, so the surviving graph is pushed permanently above centre and never rescaled.

**Why it matters.** Filtering is the app's main analytical gesture and it makes the result harder to read, not easier — the ten remaining people are drawn at the same small radius as twenty, in 40% of the width, and the reader has to press F (undiscoverable) or scroll-zoom to recover. It also makes the filter feel like it removed the wrong thing.

**Fix.** Include `visible` in the coalescing camera effect that already keys on (selection, filters, insets) and call `fit(96)` when the visible set's bounding box changes by more than ~15% in either dimension. And make `coldBounds` return null height when `coldCount(s) === 0` so the reserved band collapses. Assert: after any filter change, the visible nodes' bbox must fill ≥ 55% of the uncovered rect's shorter axis.

### [major] By-archetype does not earn its place: six of ten groups are singletons and bubble radius encodes nothing

`src/graph/layout.ts`

**What is wrong.** In 09-archetype, six of the ten hulls contain exactly one person (배우, 크리에이터, 코미디언, e스포츠, 기타, and 최혜선's), and the hull radii are near-identical regardless of membership — the 1-person e스포츠 bubble around 홍진호 is the same size as the 5-person 전문직 bubble. The captions sit 150–250px out in empty black with no leaders, so '배우 · 1명' and '크리에이터 · 1명' are two near-identical pink-dotted labels 220px apart with two pink circles between them and it is genuinely ambiguous which is 최연청 and which is 최혜선. Hulls also intersect (전문직 into 뮤지션 and e스포츠) which for set membership implies an overlap that cannot exist.

**Why it matters.** You asked whether one of the four layouts is redundant. This is it. Web already encodes archetype as ring colour on every disc, so this mode adds only the grouping — and with 6/10 groups of one, there is no grouping to show. Meanwhile it costs the reader a mode slot, a keyboard number and a line in the help sheet, and it is the one screen where a viewer cannot reliably tell which label goes with which shape.

**Fix.** Either merge singletons into a single '기타 · 6명' hull so the mode shows three or four real blocs, or drop the mode to three and give the number 3 to something the data supports. If it stays: make hull radius a function of member count, forbid intersection outright (the file's own opening rule says so), and draw a leader hairline from every caption to its hull — Cluster.bare is never set any more (layout.ts:126), so no archetype caption gets one today.

### [minor] The clipped parallel-record line and its open-circle terminator are explained nowhere

`src/components/AboutSheet.tsx`

**What is wrong.** Three teal dash-dot lines run down toward the cold band, stop ~11px short of it and terminate in an unfilled circle floating in black (visible in 02, 21, 26). This is a careful, deliberate device — `coldCrossing` binary-searches the crossing point and the comment explains the reasoning well — but there is no legend card for it. The HOW TO READ grid has tiles for size, ring colour, arcs, halo, dashed rim, beaded arc, grey rim, dashed line, arrowhead, bead, brass collar, cold band, plate, rim ticks and shift-click; none covers the stop-and-cap. The FilterRail's only footnote is about dashed lines.

**Why it matters.** You asked whether the parallel/verified distinction is legible or merely correct. This is precisely where it is only correct. A reader sees a band captioned 'nobody here is entangled with anybody' with three lines visibly running into it and stopping — the picture and the caption contradict each other, and the resolution exists only in a code comment. Every other graphic in this app is taught.

**Fix.** Add an `about.tileParallelStop` card to the HOW TO READ grid showing the clipped line and its open cap, with the copy that already exists at ui.ts:258 ('기록은 겹치지만 만난 적은 없는 관계입니다' / 'records that rhyme, a meeting that never happened'). Add a one-line foot under the 평행 이력 row in FilterRail beside the existing dashed-line note. Also align the three stub x-positions with the people they point at — they land at 846/1034/1188 against band members at 827/1080/1352.

### [minor] The empty state tells the reader what to do but gives them nothing to click

`src/graph/render.ts`

**What is wrong.** With every lineage chip off, the canvas paints 'Nobody matches these filters / 조건에 맞는 사람이 없습니다 / Clear the filters to bring all 20 of them back'. It is canvas text, so it is not clickable, not focusable and not in the accessibility tree. The two real recovery controls are 'Reset' at the top of the filter rail and 'clear filters' in the status bar — and on a phone the rail defaults closed, so the status-bar link is the only exit.

**Why it matters.** An empty state that names the action but does not offer it makes the reader hunt. It is also the one screen where a keyboard or screen-reader user has nothing at all: the canvas's aria-label still says 'use the arrow keys to move between people' when there are no people.

**Fix.** Render the empty state as a DOM overlay instead of canvas text, with the recovery as a real `<button>` wired to `atlas.resetFilters`. Swap the canvas aria-label to the empty message while `visible.size === 0`.

### [minor] Mobile: no wordmark on the graph screen, and the language switch is the loudest control on it

`src/components/TopBar.tsx`

**What is wrong.** At 390×844 (21-mobile-graph, 22-mobile-dossier, and my own capture) the '피의 게임X / CAST ATLAS' wordmark is gone entirely and the top two rows are search-icon, a full-value bone-filled 한국어|EN pill, and four icon buttons, above the four layout tabs. The language toggle is the largest and brightest object on the screen — larger than search, heavier than the four mode tabs beneath it.

**Why it matters.** You asked what a newcomer knows in the first ten seconds. On a phone, after the intro is dismissed, nothing on the screen says what this is — the title exists only in the cold open, which a deep link skips entirely (`hasDeepLink()` sets introDone true). A shared link on a phone lands on twenty unexplained faces. Meanwhile the loudest pixel is a setting almost nobody changes twice.

**Fix.** Put a compact wordmark ('피의 게임X · CAST ATLAS' at ~13px) in row one on mobile, taking the space the language pill currently occupies. Demote the language switch to a globe icon that opens a two-item menu, matching the weight of the other five icon buttons.

### [nit] The filter rail's Node key section renders its first row at ~35% opacity, so it reads as disabled rather than scrollable

`src/components/FilterRail.tsx`

**What is wrong.** In every desktop screenshot (02, 04, 07, 08, 09, 14, 17) the '노드 읽는 법 NODE KEY' header is followed by exactly one row — '크기 = 연결 수' — already inside the bottom scroll-fade at roughly 35% opacity, then the section-jump strip. The fade begins on the very first item of the section rather than a row or two later.

**Why it matters.** A dimmed first row under a live header reads as a disabled control, not as 'there is more below'. The reader's model of the rail is that dim = filtered out, which is exactly what that opacity means seven rows above it in the relationship list.

**Fix.** Start the mask ~48px lower so at least one full row of the section sits at full opacity, or put the fade only on the last 24px and add a caret. The section-jump strip below already provides the affordance; the fade is fighting it.

### [nit] In English the canvas prints a Hangul second line while the rest of the UI is English-only

`src/data/i18n/ui.ts`

**What is wrong.** With lang=en the canvas paints 'No prior tie on record / 확인된 인연 없음 · 3명' and the empty state paints 'Nobody matches these filters / 조건에 맞는 사람이 없습니다'. Everything else in EN mode is monolingual — the rail says 'Season 1' and 'Alliance' with no Korean, the top bar is English-only. In KO mode the rail IS bilingual ('동맹 Alliance').

**Why it matters.** The bilingual pairing is a deliberate and good editorial device, but it is applied to the canvas in both languages and to the chrome in only one. The result is that the only Hangul an English reader ever sees is painted on the canvas, where it reads as a leak rather than as the register choice it is elsewhere.

**Fix.** Pick one rule and apply it to both surfaces: either mirror the KO pattern (English primary + Korean secondary throughout the EN chrome), or drop the Korean second line from the canvas strings when lang === 'en', keeping it only where it names a Korean proper noun.

---

## MOTION & ANIMATION — 6/10

> The motion system is reasoned at flagship level and holds a clean 16.7ms median almost everywhere, but the app's two most-used moments — the first unobstructed frame of the graph and the first click on a person — are both measurably broken: the mesh has not started drawing when the curtain clears, and the first dossier open costs ~450ms of long tasks and leaves an empty panel on screen for a third of a second.

**Biggest single win.** Warm the Dossier behind the cold open the way CommandPalette (`.cp--warm`, opacity 0.008 for two frames) and HoverCard (`.is-warming`) already warm themselves. First-mount currently costs ~450ms across five long tasks on the production build with a real GPU, which turns the app's core interaction into an empty panel for a third of a second and a document that is not complete until 1.05s; the 240ms slide and the 90+65×4ms section cascade are never actually seen by anyone. Warming it under the curtain moves that cost to where GraphCanvas already spends WARM_PASSES and lets the choreography that is already written finally run — and it would then let the three-commit `bodyReady`/tail split be deleted rather than tuned a fourth time.

<details><summary>What is working</summary>

- The canvas genuinely sleeps at rest and every wake-up is derived (visibilitychange, portrait load, focus change) rather than polled — 0.5 paints/s idle is rare and it is the reason mode changes, the palette and the gallery all measure a flat 16.7ms median on a real GPU.
- Reduced motion is properly implemented rather than blanket-disabled: measured, the reveal ramps 0→1 in ~70ms, the intro unmounts at ~57ms, anchored layouts teleport (rest=true, mean error 5.3px) and the auto-advance timer is switched off per WCAG 2.2.1.
- The cold open's countdown hairline reads `currentTime` off the Web Animation instead of keeping a parallel setTimeout — the bar IS the timer, so a hover pause pauses the same quantity. That is the correct solution, not a compensated one.
- Transitions land and stay landed. After a node drag the mesh reaches rest in 161ms; after a mode change anchor error is 0.2px at ~950ms and `rest` latches true. No creep, no re-acceleration, no infinite jiggle.
- The command palette's split of surface-opacity (90ms) from lift (180ms), and the removal of both backdrop-filters with the measurement that justified it, is exactly right and measurably works: 42 frames in 900ms, p90 16.9ms.

</details>

### [blocker] First dossier open delivers 6–11 frames in 900ms and shows an empty panel for ~350ms

`src/components/Dossier.tsx`

**What is wrong.** Measured on the PRODUCTION build, headed, real GPU (localhost:4319), clicking the hub: 11 rAF frames in 1000ms with inter-frame gaps of 150, 300, 83, 200, 100ms and five longtasks of 132/66/105/87/61ms — ~450ms of blocked main thread. Per-frame DOM sampling across three runs: `aside.dossier` exists and is opaque at 175–232ms (x: 1028→1000, so the 240ms slide is delivered in 3 samples), `.dsr-id` is still at opacity 0 until 320–349ms, `.dsr-sec` count is 0 until ~350ms and only reaches 8 at 730–930ms, and no section reaches full opacity until ~1050ms (run0 had none at 888ms). Captured in the screencast frames inter/dossier_001_491.jpg and inter/dossier_002_565.jpg: an opaque panel with the DOSSIER header bar, the Focus-orbit/Sources footer pinned to the bottom, and nothing in between. This is the exact symptom the file's own comment says was fixed — "an identity header floating over 370px of black with the footer pinned to the bottom of nothing" and "last section did not finish until 1.06–1.72s after the click". Isolation proves it is FIRST-mount only: clicking a second node with the panel already open measured 53 frames in 1000ms at a flat 17ms with zero longtasks, and Escape measured 48 frames at a flat 17ms.

**Why it matters.** Clicking a person is the product's core interaction and every reader pays this exactly once, on their first click. The 240ms entrance and the 90ms lead + 65ms × 4 section cascade — all of it carefully tuned — are delivered in two or three frames, so none of the choreography is ever seen; what is seen is a one-second hollow rectangle that reads as a failed load. It also means the 64ms rAF-race caps in `bodyReady`/the tail commit are not buying what they claim: they bound the WAIT, not the WORK, and the work is 450ms.

**Fix.** Warm the Dossier behind the cold open the same way this codebase already warms the other two heavy surfaces. CommandPalette.tsx renders `.cp--warm` (pointer-events:none, opacity 0.008) for two frames on mount, and HoverCard.css does the same via `.is-warming`, for exactly this reason ("an element at visibility:hidden and opacity 0 is never PAINTED… the whole cost was simply deferred to first paint"). Render one hidden Dossier for a real person at opacity 0.008 / aria-hidden for two frames while the intro is still up — it will pay the module init, the Pretendard/Inter metrics at the dossier's own sizes, the Portrait plate geometry for the relation rows and the eight section subtrees under the curtain, where GraphCanvas already spends WARM_PASSES. Then delete the three-commit split in Dossier.tsx (bodyReady + the tail flag): once first mount is cheap it is pure added latency, and it is what is currently pushing the section count from 2 to 8 at 730–930ms.

### [major] The curtain clears before the relationship mesh has started drawing — 0 of 52 lines in 2 of 3 runs

`src/graph/GraphCanvas.tsx`

**What is wrong.** Sampling `__atlasDebug.linkDraw()` per frame on the production build, headed, at the frame `.intro` leaves the DOM: run0 — curtain gone at 656ms with 0/52 links begun; run1 — 545ms with 16/52 begun and 4 complete; run2 — 526ms with 0/52 begun. All 52 lines are complete only at 930 / 1063 / 1351ms. The screencast corroborates independently: reveal/f055 (525ms after ENTER) shows twenty fully lit portraits and no lines, f057 (611ms) still none, f060 (744ms) roughly 40%. The cause is the schedule: SWEEP_AT=0.8 puts the first line's start 267ms into the 700ms reveal, DRAW_SPAN=420 puts the LAST line's start 687ms in, and DRAW_DUR=220 puts its completion at ~907ms after reveal start — against a curtain that is gone by ~500ms.

**Why it matters.** The product's entire thesis is the relationships; the nodes are the axis, the lines are the content. The reader's first unobstructed look at the atlas is twenty disconnected faces sitting above a caption that says three of them have no verified tie — which asserts the opposite of the app's claim, for 200–500ms, on the one frame everyone sees. The file's own comment says this was fixed ("for the first ~700ms of the product the canvas asserted the exact opposite of its thesis"); it has been shortened, not fixed.

**Fix.** Move the sweep to complete WITH the curtain rather than after it. Drop SWEEP_AT from 0.8 to ~0.55 (≈115ms into the reveal on the measured EASE_REVEAL, where the intro is ~99% opaque so nothing is exposed early) and cut DRAW_SPAN from 420 to ~240 and DRAW_DUR from 220 to ~180. Last line then completes at ~535ms after reveal start, i.e. within a frame or two of the curtain clearing, and the mesh is still visibly growing under the last third of the black instead of being drawn onto an already-revealed empty scene. Verify by re-running the same probe: the target is ≥40 of 52 lines complete on the frame `.intro` unmounts.

### [major] The cold open is removed from the DOM while still 15–28% opaque — the last beat is a cut

`src/components/Intro.tsx`

**What is wrong.** Per-frame `getComputedStyle('.intro').opacity` on the production build, headed: run A — 0.674, 0.597, 0.507, 0.401, 0.281 at 494ms, element gone at 512ms; run B — 0.281 at 494, 0.146 at 512, gone at 530; a third run had it gone while the last sampled value was 0.832. The race is structural: `EXIT_MS = 500` is used BOTH as the inline `transitionDuration` on `.intro` and as the `setTimeout` that calls `onDone` and unmounts it, but the CSS transition cannot begin until the commit after `setExiting(true)` — measured 20–40ms later — so the unmount is always at least one frame early. The exit curve `cubic-bezier(0.64, 0, 0.78, 0)` has y1=y2=0, i.e. it is a pure t³ ease-in, so the last 6% of the timeline carries ~28% of the opacity: a 30ms shortfall costs a quarter of the screen's brightness.

**Why it matters.** It is the final frame of the app's first impression, and it is the one frame in a 2.6s choreography that is a hard cut. On a file whose comments argue about a 0.15 alpha crossing between two ring ramps, ending the entrance with a 15–28% brightness step is the loudest thing on screen.

**Fix.** Stop racing them. Either (a) set the inline `transitionDuration` to `EXIT_MS - 80` while keeping the 500ms unmount timer, so the curtain reaches 0 at ~420ms and has 80ms of headroom for the commit and any dropped frame; or (b) better, drive the unmount off `transitionend` on `.intro`'s opacity with the existing 500ms timer as a backstop, which removes the assumption entirely. Independently, the curve deserves a less punishing tail — `cubic-bezier(0.55, 0, 0.9, 0.35)` still holds the black opaque through the first third but reaches ~0.05 at 88% of the window, so a one-frame error costs 5% instead of 28%.

### [major] Anchored layout changes implode 17–31% before they arrange; node paths run 1.23–1.44× the straight line

`src/graph/GraphCanvas.tsx`

**What is wrong.** Tracing every node's screen position per frame on the production build and computing the mean distance from the cast's centroid: web→by-season goes 199 → 166px at 79ms (−17%) before recovering to 214; by-season→by-background goes 194 → 134px at 62ms (−31%) before settling at 177. Path straightness (total travelled distance ÷ straight-line displacement, movers only): web→season mean 1.23 with the hub at 2.52; orbit→web mean 1.44 with 10 of 20 nodes above 1.3 and a worst of 2.28. The cause is in the layout effect: `held` is set to a hard 1 the instant the mode changes, so charge collapses from −260−16r to −70−4r and link strength drops to 15% in one frame, while `anchorStrengthRef` ramps in on its own clock. For the first ~4 frames nothing is holding the mesh apart and nothing is yet pulling it to the new seats. Corroborated in modes/season2arch_003 and web2season_006, where the cast is an unreadable central heap with captions stacked on each other. (Note: the 150–167ms frame gaps I measured for the same transitions headless do NOT reproduce on a real GPU — median 16.7, p90 33.4 — so the stutter is software rasterisation, not a defect. The implosion reproduces on both.)

**Why it matters.** The brief for a layout switch is that the eye can follow one person from one arrangement to the next. A 31% collapse toward the centre followed by a bloom outward is not a translation; it is two moves, and during the first one every plate and caption is stacked on every other. A 1.44 mean path ratio on the return to Web means the average person travels 44% further than they needed to, along a route that reverses.

**Fix.** Cross-fade the two force régimes on the SAME clock as the anchor ramp instead of switching them instantly. Make `held` a per-tick value — `held = anchorStrengthRef.current / Math.max(1e-6, anchorTargetRef.current)` — and re-apply the charge/link/x/y strengths from it inside the render loop rather than once in the layout effect (d3 re-initialises a force when its strength is set, so do it on a coarse step, e.g. whenever `held` moves by more than 0.1, not every frame). Repulsion then decays exactly as the anchors take over and no frame has neither. Target: centroid spread monotone across the whole transition, and mean path ratio ≤1.15.

### [minor] HoverCard survives the click that opens the dossier and cross-fades over it

`src/components/HoverCard.css`

**What is wrong.** In inter/dossier_001_491.jpg the hover card for Hong Jin-ho is at full opacity, overlapping the left edge of the dossier that has just opened for Hong Jin-ho — two cards for the same person on screen at once. In inter/dossier_002_565.jpg it is mid-exit and the canvas labels 'Lee Sang-min' and 'Kim Nam-hee' are legible straight through its body, with the card's own type on top of them. The exit is `opacity var(--hover-d) var(--ease-out)` with no delay and no surface guarantee — the same double-exposure that CommandPalette.css and Dossier.css each argued their way out of (the palette by finishing surface opacity in 90ms, the dossier by never fading the surface at all), and that this very file's own surface note is about ("'이상민' and '김경훈' were legible THROUGH the card").

**Why it matters.** It is a 150ms window, but it lands on the frame after the app's most important click, and it duplicates the information the panel is arriving to give. The card is also the one surface whose opacity guarantee this file spends 40 lines defending — and the guarantee is exactly what the fade suspends.

**Fix.** Two lines. Drop `.is-shown` the instant a node is selected (the card has been superseded by the panel showing the same record), so there is no cross-fade at all; and shorten the exit to ~90ms so that even when it does fade over the mesh the half-alpha window is under three frames. If a fade is wanted, fade the CONTENT and cut the surface, mirroring the palette.

### [minor] The entrance's two most important curves are unnamed one-offs outside the design system

`src/styles/tokens.css`

**What is wrong.** tokens.css defines exactly three curves (--ease-out, --ease-in-out, --ease-spring) and GraphCanvas evaluates two of them numerically so canvas and DOM share a personality. But the master reveal runs on `EASE_REVEAL = cubicBezier(1/3, 1, 2/3, 1)`, declared as a literal in src/App.tsx with its own HANDOFF note saying it wants a name in tokens.css; and the curtain's exit runs on `cubic-bezier(0.64, 0, 0.78, 0)`, a literal in src/components/Intro.css that appears nowhere else. Both are on the single animation this codebase has re-tuned across five rounds.

**Why it matters.** App.tsx's own comment states the rule it is breaking — 'an easeOutCubic that appears nowhere in tokens.css. One curve, one place.' Two unnamed curves on the entrance means the next person tuning it has to discover them by reading three files, and the CSS half and the JS half of the same handoff can drift without anything catching it.

**Fix.** Add `--ease-reveal: cubic-bezier(0.333, 1, 0.667, 1)` and `--ease-curtain: cubic-bezier(0.55, 0, 0.9, 0.35)` to tokens.css with the reasoning that currently lives in App.tsx, have Intro.css use the token, and have App.tsx read it the way GraphCanvas already reads --ease-out.

### [minor] Orbit (key 4) with nothing selected produces no motion, no camera move and no chip change

`src/App.tsx`

**What is wrong.** On the production build with no person selected, pressing 4 leaves everything untouched: node path tracing measured movers=0 and centroid spread pinned at 177px for the full 1.5s window; `__atlasDebug.geometry().clusters` returns only ['cold'] (no orbit rings); `anchorError()` reports anchored=false, rest=true; and the screenshot orbit-after.png shows the TopBar still highlighting 'Web 1'. Every other mode key produces a 1.0–1.2s arrangement change.

**Why it matters.** A pressed control that produces literally zero pixels of change is indistinguishable from a dropped keystroke. Three of the four mode shortcuts move the whole cast; the fourth silently does nothing until an unrelated precondition is met, and nothing on screen says so.

**Fix.** Either make 4 with no selection focus the hub automatically (the mobile build already focuses the hub on entry, so the arrangement is well defined), or give the rejection a motion: pulse the Orbit chip on --ease-spring at --d-fast and put the one-line reason in the StatusBar. Silence is the one response a keyboard shortcut may not give.

### [nit] The cast wall's twenty tiles arrive as one block while the palette's eleven rows cascade

`src/components/Gallery.css`

**What is wrong.** Gallery.css animates the sheet as a single object (`gal-in` over --d-slow with a scrim) and has no per-tile delay. Measured per frame: 41 of 42 tile elements are already above 0.9 opacity at the first sample after G (193ms) and all 42 by 400ms. CommandPalette.css by contrast gives its rows `animation-delay: calc(var(--cp-lead) + var(--i) * var(--cp-stagger))` at 22ms per row, and Intro.css staggers its three stat columns at 26ms.

**Why it matters.** It is the app's only grid of twenty faces — the surface where an ordering would read most clearly — and it is the one collection with none, while a short vertical list has one. The inconsistency is visible if you open G then Ctrl+K back to back.

**Fix.** Give the tiles the same treatment as the palette rows: `--i` from the map index, `animation-delay: calc(120ms + var(--i) * 18ms)`, capped so the last tile starts no later than ~360ms (20 × 18 = 342ms, which fits inside the sheet's own 420ms). Reading order across the grid, not by index within a column.

---
