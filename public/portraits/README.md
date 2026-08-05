# Portraits

Drop an image in this folder and that person's plate carries the photograph —
on the graph node, the gallery card, the dossier crest, the hover card, the
palette chip and the edge card at once. Remove it and the generated plate comes
back, rings unchanged. Nothing else to edit.

This folder currently holds one file per cast member, so every plate in the app
shows a face. The app's own copy tracks that: with images present the cast wall
and the field guide describe the rings *around a portrait*; with none they say
nobody was photographed. Neither sentence is ever false.

## Naming

The filename must be the person's `id` from `src/data/people.ts`:

```
public/portraits/hong-jin-ho.webp    → Hong Jin-ho / 홍진호
public/portraits/park-ji-min.jpg     → Park Ji-min / 박지민
```

`.jpg` `.jpeg` `.png` `.webp` `.avif` `.gif` are all accepted. Files starting
with `_` or `.` are ignored entirely — use that prefix for scratch.

Run `npm run portraits` at any time to see who is covered, who is still on a
generated plate, and whether any filename is a near-miss for a real id:

```
⚠ THESE FILES MATCH NOBODY AND WILL NOT BE SHOWN
  ✗ park-ji-mn.webp   did you mean "park-ji-min"?
```

The full id list:

```
lee-sang-min      park-ji-min       jung-keun-woo     lee-tae-gyun
ha-seung-jin      hyun-seong-joo    yoon-bi           lee-jin-hyung
hong-jin-ho       seo-chul-gu       choi-hye-sun      heo-seong-beom
kim-kyung-hoon    kim-yoo-hyun      kim-nam-hee       kang-ji-hoo
kwak-beom         lee-gwan-hee      shin-seung-yong   choi-yeon-cheong
```

## What makes a good file

The plate crops to a **circle**, so framing matters more than anything else.

- **Square.** Anything else is centre-cropped to a square, and the two painters
  crop tall images slightly differently (the canvas from 38% down, the SVG card
  from the top — SVG cannot express 38%). Square sidesteps it entirely.
- **512×512.** Measured, not guessed: the largest a disc is ever drawn is a
  graph node at maximum zoom, **298 CSS px — 597 device pixels on a 2× display**.
  The gallery card's disc is only 63.7 CSS px, so cards are never the constraint.
  The files here are 300×300, which is a 2× upscale at full zoom; 512 covers it.
- **Head and shoulders, head slightly above centre.** This has a numeric
  consequence beyond composition: the exposure correction below is measured on
  the **inner 62%** of the crop, which is where a head-and-shoulders framing puts
  the face. A picture framed loose gets its background normalised instead.
- **Any exposure.** Twenty pictures from twenty sources will not match, and the
  app corrects for it rather than asking you to. Each image's median luminance
  is measured on decode and nudged toward the set's median — at 0.75 strength,
  bounded to ±25%, so faces still differ from one another; they just stop
  looking like half the cast was lit and half was standing in shadow. Measured
  on the current set: face lightness spread went from 19.2 to 6.5 L\*.

## Rights and provenance

Use images you have the right to use. The app cannot supply them — press and
broadcast stills of a real cast belong to their photographers — which is why
the generated plate exists and why it is a complete presentation rather than a
placeholder. Leaving a file out is a complete answer; putting one in you cannot
account for is not.

**Nothing in this repository records where the twenty shipped files came from.**
Measured on the current set: every one of the twenty is a bare `VP8 ` chunk with
no `EXIF`, no `XMP` and no `ICCP` — so there is no photographer, no source URL
and no licence statement in the files, and the schema has no field to put one
in either. That is the one uncited thing in a product that counts its citations
to one decimal place, and the app now says so out loud: the field guide's
출처 / SOURCES tab prints a 초상 사진 / THE PORTRAITS block stating how many
plates are photographs, that they enter the build from this folder, and that
their origin is unrecorded (`about.portraits*` in `src/data/i18n/ui.ts`).

If you are adding files, do better than that paragraph:

1. Keep a line per image — supplier, where it came from, and the basis you are
   using it on (own work, permission, a licence with a name and a version).
2. Put it in the data rather than in a comment, so the UI can print it per
   image instead of printing one apology for the set. The shape the About sheet
   is waiting for is a `portraits` block on `dataset.meta` — see the HANDOFF
   above `sourcesPanel` in `src/components/AboutSheet.tsx` for the exact field.
3. Never overwrite or re-encode the files already here. They are the only copy
   the product owner supplied; derived images belong under a new name.
