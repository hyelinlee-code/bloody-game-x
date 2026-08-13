import { useId, useSyncExternalStore, type JSX } from 'react';
import type { Category, EdgeType, SeasonNumber } from '../data/types';
import { BONE, BRASS, CATEGORY_COLOR, EDGE_COLOR, INK_LOW, SEASON_COLOR } from '../graph/palette';
import { t, type Lang, type UiKey } from '../data/i18n';
import { isMeeting } from '../data/edges';
import { castMarkSet } from '../graph/build';
import {
  FIELD_DEFAULT,
  HOST_RING,
  MARK_LEADING,
  PHOTO_LEVEL,
  PHOTO_SAT,
  PHOTO_SEAT_A1,
  PHOTO_SEAT_INK,
  R_DISC,
  R_HOST,
  R_LAUREL_IN,
  R_LAUREL_OUT,
  R_RIM,
  R_SEASON,
  SLOT_GAP,
  SPAN_MAX,
  TAU,
  markLines,
  rankFrac,
  seatStops,
  seeded,
} from '../graph/plateGeometry';
import {
  onPortraitLoad,
  photoGain,
  photoKeyDepth,
  photoSeatA1,
  portraitRevision,
  portraitUrl,
  seatMaskUrl,
} from '../graph/portraits';
import './Portrait.css';

/**
 * A portrait plate: a photograph inside a ring system drawn from the record.
 *
 * The rings are the information and the picture is the identification, and the
 * plate is designed so neither needs the other. `public/portraits/<id>.<ext>`
 * is a drop-in folder; today it holds one file per cast member, so every plate
 * in the app carries a face and the mark below is never drawn. Delete a file
 * and that person's mark comes back, on every surface at once, with the rings
 * unchanged — which is the whole reason the two were never entangled.
 *
 * The generated form is therefore not a placeholder and not dead code. It is
 * what this plate is when nobody has the rights to a picture, and it was the
 * shipping state for four rounds: press and broadcast stills of a real cast
 * belong to their photographers, so the app cannot supply them and does not
 * pretend the absence is a gap.
 *
 * ── the encoding, in one place ──────────────────────────────────────────────
 *
 *   season arc      one per prior season, in its own fixed slot, coloured by
 *                   season. Its LENGTH is how far they got that year, on a
 *                   scale that is the same on every plate (see SPAN_MAX): a
 *                   first place always draws the same arc whether the person
 *                   played once or three times. The ramp runs to the bottom of
 *                   the deepest field in the data, not to a hardcoded 12, so
 *                   4th / 7th / 10th / 13th stay apart.
 *   season track    the unfilled remainder of that slot, in the same season
 *                   colour at a twelfth of the ink, with a notch at the mark a
 *                   first place would reach. A length is not a quantity until
 *                   the reader can see what it is a fraction OF: 정근우's one
 *                   arc used to occupy part of an invisible slot with no zero,
 *                   no ceiling and no boundary, so it read as "a coloured arc
 *                   of some length" rather than as 7th of 10. Drawn under the
 *                   value arc, and only where there is a value — a beaded run
 *                   already fills its whole slot and has nothing to fall short
 *                   of.
 *   winner's cap    rank 1 draws a heavier arc and a filled terminal dot. Two
 *                   degrees of extra sweep is not a difference anyone can read;
 *                   a cap is.
 *   beaded arc      a run with no rank — a studio panel seat, a dealer, a host
 *                   — is NOT a bottom-of-table finish, and used to draw as one.
 *                   It gets the whole slot as a beaded hairline instead: present
 *                   all season, no finish to record. IT NOW CARRIES A SECOND
 *                   MEANING, and every painter of this plate carries it too: a
 *                   run whose rank this reader may not be told is handed here as
 *                   `undefined` and draws the same beads. See `ranks` below.
 *   dashed ring     inboard, in the archetype colour: the franchise is new to
 *                   them. Only ever drawn when there are no season arcs.
 *   bone hairline   a solid outer ring: this person has presided over a season.
 *                   Solid, so it is not a second dashed ring competing with the
 *                   newcomer's.
 *   rim ticks       one per verified connection, coloured by relationship type.
 *                   A `parallel` record is not one: that type exists to say the
 *                   two have demonstrably never shared a room, and the gallery
 *                   legend under this plate calls every tick a verified
 *                   connection out loud. It is filtered out, here and in
 *                   graph/build.ts, off the one predicate data/edges.ts owns.
 *   brass laurel    a past champion. Outboard of the tick rim, two concentric
 *                   hairlines with ticks between them — a different SHAPE from
 *                   the newcomer's dashed ring, not just a different shade, so
 *                   the amber archetypes cannot collide with it.
 *
 * The plate is seen small far more often than large, so the detail budget is
 * size-aware rather than one geometry scaled three ways — see `variant`.
 */

export type PortraitVariant = 'card' | 'mark' | 'chip';

export interface PortraitConnection {
  type: EdgeType;
  strength: number;
}

export interface PortraitProps {
  id: string;
  initials: string;
  category: Category;
  seasons: SeasonNumber[];
  /**
   * Best rank in each season, aligned with `seasons`.
   *
   * ** ALREADY THROUGH THE GATE WHEN IT ARRIVES. THIS PLATE CANNOT GATE IT. **
   *
   * A rank reaches this component as a bare number with no scope attached, so
   * there is nothing here to decide against and no `pick` this file could call.
   * The caller owes it the reader's watched-set, and there are exactly two
   * sanctioned sources — `node.plate.ranks`, which `buildGraph` solves through
   * `runFacts`, and `ranksFor(node, lang, watched)` in Dossier.tsx. Do not
   * rebuild the pair out of `person.priorSeasons`: `runFacts` composes two
   * `pick`s so a `fieldSize` passes the RANK's gate as well as its own, and a
   * hand-rolled read gets one gate where there must be three.
   *
   * The stakes are geometric rather than textual, which is what makes this the
   * easiest gate in the app to leave open. `rankFrac` maps rank and field to an
   * arc length on a scale shared by every plate, and the map is invertible — so
   * a plate handed a raw rank STATES the placing whatever the text beside it
   * says, and states it to a reader holding a protractor rather than to one
   * reading Korean. Gallery.tsx shipped that read for a round: measured at
   * `bgx.watched='[]'`, twelve of twenty cast cards drew their true sweep —
   * fourteen arcs in thirteen distinct lengths — under run rows that named no
   * finish at all.
   *
   * `undefined` MEANS TWO THINGS and both draw the beaded ring: a run that was
   * never at the prize (a host, a panel seat, a dealer) and a run whose finish
   * is sealed. They are different states, the beads currently say only the
   * first, and the third mark that tells them apart is PLAN-spoilers.md §3 —
   * landing in both painters and in the legend in one commit, never here alone.
   */
  ranks?: (number | undefined)[];
  /**
   * How many people were in each of those fields, aligned with `seasons`. Gated
   * with `ranks` and by the same rule — a denominator may never outlive the
   * number it qualifies, because the pair is what the arc's length is solved
   * from.
   *
   * Falls back to `FIELD_DEFAULT` when it is not known, which is why it may not
   * be withheld on its own: season 1 seated 10 and season 3 seated 18, so a
   * rank drawn against the constant 13 is not a hidden placing, it is a wrong
   * one — a false value drawn in vector, which PLAN-spoilers.md §3 rules out
   * explicitly.
   */
  fieldSizes?: (number | undefined)[];
  isWinner?: boolean;
  isHost?: boolean;
  noTies?: boolean;
  connections?: PortraitConnection[];
  variant?: PortraitVariant;
  /** Optional licensed photograph. Draws inside the same ring system. */
  /**
   * A photograph. Normally left undefined: the plate resolves its own from
   * `public/portraits/<id>.*` via the build-time manifest, so a call site
   * cannot forget to pass it and there is no seventh place to update. Pass it
   * explicitly only to override that — a different crop, or a preview.
   */
  imageUrl?: string;
  className?: string;
  /** Rendered as the accessible name; omit inside a labelled control. */
  alt?: string;
}

/* The plate's geometry, its rank ramp and its mark rules live in
   `graph/plateGeometry.ts` and are imported above. They used to be declared
   here, which was fine while this file was the only painter of a plate — it no
   longer is. `graph/plate.ts` draws the same object onto the graph canvas, and
   two copies of "a first place sweeps 1.74 radians" is a promise nobody can
   keep across two files. Do not re-declare any of them here. */

function polar(cx: number, cy: number, r: number, a: number): [number, number] {
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Connection ticks, grouped by relationship type. */
interface TickSpec {
  a: number;
  color: string;
  len: number;
}

export function Portrait({
  id,
  initials,
  category,
  seasons,
  ranks,
  fieldSizes,
  isWinner = false,
  isHost = false,
  noTies = false,
  connections = [],
  variant = 'mark',
  imageUrl,
  className,
  alt,
}: PortraitProps): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const color = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.other;
  const rnd = seeded(id);
  /* Resolved here rather than at the seven call sites. The drop-in folder's
     whole promise is that adding one file lights this person up on the graph
     node, the gallery card, the dossier crest, the hover card, the palette chip
     and the edge card at once — a promise seven independent prop-passes cannot
     keep, because the eighth surface will not pass it. */
  const photo = imageUrl ?? portraitUrl(id);
  /* Subscribed rather than read once: every grade this plate spends is measured
     against the set of everyone decoded SO FAR, so all of them move as the last
     few images land. Every panel opens long after `preloadPortraits`, so in
     practice this re-renders nothing — it matters only for a card mounted during
     the cold open, which is exactly the case a plain read would get wrong.
     The snapshot is the COUNT of portraits landed, not any one of the grades:
     a store whose snapshot happens to come back unchanged does not re-render,
     and the matte can appear on an event where the gain does not move. */
  useSyncExternalStore(onPortraitLoad, portraitRevision, () => 0);
  const gain = photoGain(id);
  /* The matte and the seat, both solved from this picture's own pixels in
     graph/portraits — the node draws exactly these two numbers and this bitmap,
     and a plate that solved its own would be the same person at two exposures
     on two surfaces. `imageUrl` overrides the folder, so an explicitly-passed
     crop is not the picture any of this was measured on and gets neither. */
  const own = !imageUrl && photo ? id : null;
  const maskUrl = own ? seatMaskUrl(own) : undefined;
  const maskDepth = own ? photoKeyDepth(own) : 0;
  const seat = seatStops(own ? photoSeatA1(own) : PHOTO_SEAT_A1);

  const card = variant === 'card';
  const chip = variant === 'chip';
  /* Square, in every variant. The card used to be 100 × 104 with cy still at
     50, so disc, season ring, tick rim, laurel and bloom — the whole plate —
     sat 2 units, 1.9%, above the centre of its own box. Measured in the
     gallery at render size: a 118 × 122.7 box with the disc centre at 59.0px
     against a box centre at 61.35px, which showed up as 15.1px of air above
     the disc and 9.6px below it inside a cell whose padding was symmetric.
     There was no comment for the four units and nothing needed them —
     R_LAUREL_OUT (49.4) plus its stroke fits inside 50, so it was not
     clearance — and while they existed the plate could not be optically
     aligned against anything by CSS box centring. */
  const W = 100;
  const H = 100;
  const cx = W / 2;
  const cy = H / 2;

  const R = chip ? 30 : R_DISC;
  const Rseason = chip ? 37.5 : R_SEASON;
  const Rrim = R_RIM;

  /* The etching field: seeded speckle, not radial strokes.

     It used to scatter 26 short RADIAL hairlines from Rrim + 3 outward — the
     same kind of mark, in an abutting band, as the rim ticks that run from
     Rrim outward and mean one verified connection each. Decoration drawn in
     the grammar of the data is worse than no decoration: on 정근우's plate,
     two ticks, thirteen of these apiece, and no way to tell which of the
     radial marks around the medallion were the count.

     A dot cannot be mistaken for a tick or for a ring, so the field changed
     kind rather than opacity. It also reads as tarnish on a struck plate,
     which is closer to what it was always for. Still card-only: at the
     dossier's 76px crest a 0.6-unit mark is 0.46 CSS px, which is not an
     etching, it is dirt. */
  const speckle = card
    ? Array.from({ length: 30 }, () => {
        const a = rnd() * TAU;
        const rr = Rrim + 5 + rnd() * 21;
        const [x, y] = polar(cx, cy, rr, a);
        return { x, y, r: 0.35 + rnd() * 0.4, o: 0.05 + rnd() * 0.11 };
      })
    : [];

  /* The ticks count MEETINGS. Every call site hands this component the whole
     adjacency — the gallery card, the dossier crest, the hover card and the
     edge card all map straight off `edgesOf` — so the filter belongs here
     rather than at six call sites, one of which would forget. `isMeeting` is
     the same predicate graph/build.ts uses on the canvas plate's spec, imported
     from data/edges.ts so there is one answer to the question.
     A parallel record drawn as a rim tick is indistinguishable from a verified
     one: 강지후's plate carried a single tick under a legend reading '테두리
     눈금은 확인된 인연의 수' while the only line he has says in its headline
     that the two have never been in the same room. */
  const met = connections.filter((c) => isMeeting(c.type));

  /* Rim ticks, on a size-aware budget.
     At card size there is room for one tick per verified connection, in a
     stable order — 190px of plate carries eleven 1.5-unit marks legibly.
     At 'mark' size (76px in the dossier header, ~44px in a hover card) the
     same geometry is 1.1px wide and 1.8px long: coloured dust, not a count. So
     the mark rolls the ticks up by relationship type — never more than the six
     types in the data — and spends the saved room on weight and length, with
     the tally carried by how far each tick reaches. */
  let ticks: TickSpec[] = [];
  let tickW = 1.5;
  if (chip) {
    ticks = [];
  } else if (card) {
    tickW = 1.5;
    ticks = met.slice(0, 28).map((c, i, all) => ({
      a: -Math.PI / 2 + (i / Math.max(1, all.length)) * TAU,
      color: EDGE_COLOR[c.type] ?? EDGE_COLOR.collab,
      len: 2.6 + c.strength * 0.9,
    }));
  } else {
    tickW = 2.6;
    const byType = new Map<EdgeType, number>();
    for (const c of met) byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
    const rolled = [...byType.entries()].slice(0, 8);
    ticks = rolled.map(([type, n], i) => ({
      a: -Math.PI / 2 + (i / Math.max(1, rolled.length)) * TAU,
      color: EDGE_COLOR[type] ?? EDGE_COLOR.collab,
      len: 4.2 + Math.min(n, 4) * 0.5,
    }));
  }

  const glyph = initials || '·';
  const glyphLines = markLines(glyph);
  /* THE FIT IS NOT SOLVED HERE.
     It used to be: three literals — 0.8, 1.62, 0.76/0.92 — re-implemented inline
     against this plate's own R, with no cohort, while graph/plate.ts solved the
     same mark through `fitMark` with the full twenty. plateGeometry's docblock
     says both painters call it and neither may hardcode a span; that was a
     promise this file was breaking. Measured on the cast wall at the time: the
     same disc diameter carried marks from 14.6 to 25.5 CSS px, a 74% spread,
     which does not read as twenty names — it reads as some of them being
     broken. `castMarkSet` is the cohort the canvas gets for free. */
  const { size: fs, squeeze: sq } = castMarkSet(glyph, R).cut(glyph, R);
  const lh = fs * MARK_LEADING;

  const slot = TAU / Math.max(3, seasons.length);

  return (
    <svg
      className={`portrait portrait--${variant}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role={alt ? 'img' : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      focusable="false"
    >
      <defs>
        <radialGradient id={`pdisc${uid}`} cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#231e1c" />
          <stop offset="100%" stopColor="#110e0b" />
        </radialGradient>
        {/* The bloom.

            It used to ramp 0 → 0.16 outward and was painted on a circle whose
            edge was exactly where the ramp peaked, so the one soft thing on a
            plate built out of hairlines terminated in a hard rim: every card
            showed a lighter disc die-cut into it, bluish behind LS, green
            behind JK, amber behind HyJ. A gradient at maximum opacity on the
            boundary of the shape it fills can only end in a step.

            Inverted, so it peaks behind the medallion and is gone before its
            own edge. The stops are in fractions of the painted circle
            (r = R_LAUREL_OUT + 14 = 63.4): 0.18 at 19 units — under the disc,
            where it does the work of a light source rather than of a ring —
            0.07 at 39, and zero at 55.8, six units outboard of the laurel and
            well inside the circle. The viewBox clips at 50 units, and the ramp
            is down to ~0.025 there, which is one or two levels on this
            backdrop rather than the full-strength straight cut the old ramp
            left down both sides of the card. */}
        <radialGradient id={`paura${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="30%" stopColor={color} stopOpacity="0.18" />
          <stop offset="62%" stopColor={color} stopOpacity="0.07" />
          <stop offset="88%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`pclip${uid}`}>
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
        {/* Seats a photograph into the plate's own ground — see where it is
            spent below. Only emitted when there is a photograph to seat.
            The canvas plate paints the identical grade out of the identical
            constants; if you change one, change both or change neither. */}
        {photo && (
          <>
            {/* The seat, at THIS picture's solved depth and off the shared stop
                list — not a flat three-stop ramp off the constants, which is
                what stood here for a round and put the same band at L* 21.3–30.6
                against the canvas painter's 23.1–24.0. Same ink, same curve,
                same solve; `seatStops` is where the shape lives and neither
                painter may hold one of its own. */}
            <radialGradient id={`pseat${uid}`} cx="50%" cy="50%" r="50%">
              {seat.map((s, i) => (
                <stop key={i} offset={`${(s.at * 100).toFixed(2)}%`} stopColor={PHOTO_SEAT_INK} stopOpacity={s.a} />
              ))}
            </radialGradient>
            {/* saturate + a linear transfer is the SVG spelling of the canvas
                painter's `saturation` blend followed by a `multiply` wash: same
                two operations, same order, same numbers. sRGB rather than
                linearRGB so the two agree pixel for pixel. */}
            <filter id={`pgrade${uid}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="saturate" values={String(PHOTO_SAT)} />
              <feComponentTransfer>
                {/* `gain` is the per-image exposure correction toward the set
                    median, measured off the decoded picture in graph/portraits.
                    The canvas painter multiplies PHOTO_LEVEL by exactly this,
                    and both have to: without it the same person is two
                    exposures on two surfaces — measured up to ~10 L* apart on
                    the pictures furthest from the median — and the card is the
                    surface a reader compares against the node. */}
                <feFuncR type="linear" slope={PHOTO_LEVEL * gain} />
                <feFuncG type="linear" slope={PHOTO_LEVEL * 0.97 * gain} />
                <feFuncB type="linear" slope={PHOTO_LEVEL * 0.93 * gain} />
              </feComponentTransfer>
            </filter>
          </>
        )}
      </defs>

      {/* seeded etching field */}
      {speckle.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={color} fillOpacity={s.o} />
      ))}

      <circle cx={cx} cy={cy} r={R_LAUREL_OUT + 14} fill={`url(#paura${uid})`} />

      {/* subject */}
      <circle cx={cx} cy={cy} r={R} fill={`url(#pdisc${uid})`} />
      {photo && (
        <>
          <image
            href={photo}
            x={cx - R}
            y={cy - R}
            width={R * 2}
            height={R * 2}
            /* `slice` fills the box and crops the overflow — CSS `object-fit:
               cover`.

               The alignment is NOT the same as the canvas painter's. `coverRect`
               in graph/portraits takes its square from 38% down a tall picture;
               `xMidYMin` takes it from the very top. Both exist for the same
               reason — a circular crop centred on a tall portrait centres on the
               chin — and SVG's preserveAspectRatio offers only Min/Mid/Max, so
               38% is not sayable here. Min is the closer of the two available
               answers and errs towards showing the head.

               Every file in the folder today is square, so the two are currently
               identical in output. Drop in a 3:4 picture and they diverge: the
               node would show from 38% down and this card from the top. Closing
               that means computing the crop into a `viewBox` rather than
               declaring it, which is the fix if a non-square file ever lands. */
            preserveAspectRatio="xMidYMin slice"
            clipPath={`url(#pclip${uid})`}
            filter={`url(#pgrade${uid})`}
          />
          {/* THE BACKDROP MATTE — the pass that finds the studio wall by its
              colour instead of by its radius, because on a head-and-shoulders
              crop the face and the room behind it are at the same radius. It is
              the identical bitmap the canvas painter composites (the seat's own
              ink carrying keyness as its alpha, pulled once off the decoded
              picture in graph/portraits), at the identical depth, so the card
              and the node are one object rather than two readings of one.

              Same `preserveAspectRatio` as the picture above it: the matte is
              pulled in `coverRect` space and has to land on the same pixels the
              photograph does. Every file in the folder is square, so both are
              identity today; a non-square file would move them together. */}
          {maskUrl && maskDepth > 0 && (
            <image
              href={maskUrl}
              x={cx - R}
              y={cy - R}
              width={R * 2}
              height={R * 2}
              opacity={maskDepth}
              preserveAspectRatio="xMidYMin slice"
              clipPath={`url(#pclip${uid})`}
            />
          )}
          {/* The same inward seat the canvas plate paints, for the same reason:
              a photograph arrives at whatever exposure it was shot at, and an
              un-graded disc reads as a sticker rather than as part of the plate
              — measured, a photographed disc's median luminance was L* 17.4
              against L* 6.2 for a drawn one, i.e. the brightest object on a
              black canvas. The grade above does most of that work now and this
              carries the last of it into the ring. */}
          <circle cx={cx} cy={cy} r={R} fill={`url(#pseat${uid})`} clipPath={`url(#pclip${uid})`} />
        </>
      )}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeOpacity={0.8} strokeWidth={1.6} />

      {/* The mark, set on its own syllables when it is romanised — "Jin" over
          "ho". The canvas plate does exactly this, off the same `markLines`,
          so the disc in the graph and the disc in this card are one object.
          A Hangul mark is one line and takes the same path with no branch. */}
      {!photo && (
        /* The horizontal squeeze, when this is one of the one or two marks too
           long to reach the cohort's size at its natural width. Scaled about the
           disc's centre so the stack stays centred; the alternative is setting
           all twenty at the longest name's size, which is the defect this
           replaced. `transform` rather than `textLength`, because textLength
           distributes the difference into the letter spacing on some engines and
           into the glyphs on others. */
        <g transform={sq < 0.999 ? `translate(${cx} 0) scale(${sq.toFixed(4)} 1) translate(${-cx} 0)` : undefined}>
          <text
            className="portrait__glyph"
            x={cx}
            y={cy - ((glyphLines.length - 1) * lh) / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fs}
          >
            {glyphLines.map((line, i) => (
              <tspan key={i} x={cx} dy={i === 0 ? 0 : lh}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      )}

      {/* one arc per prior season */}
      {seasons.length === 0 ? (
        <circle
          cx={cx}
          cy={cy}
          r={Rseason}
          fill="none"
          stroke={color}
          strokeOpacity={0.42}
          strokeWidth={1.1}
          strokeDasharray="2.5 4"
        />
      ) : (
        seasons.map((s, i) => {
          const start = -Math.PI / 2 + i * slot + SLOT_GAP / 2;
          const room = slot - SLOT_GAP;
          const rank = ranks?.[i];
          const won = rank === 1;

          /* No rank is not a bad rank. A studio-panel seat or a dealer's run
             has no finish, so it draws the whole slot as beads rather than the
             short stub a 13th place draws. */
          if (!rank || rank < 1) {
            return (
              <path
                key={`${s}-${i}`}
                d={arc(cx, cy, Rseason, start, start + room)}
                fill="none"
                stroke={SEASON_COLOR[s]}
                strokeOpacity={0.9}
                strokeWidth={2.2}
                strokeDasharray="0.01 5.2"
                strokeLinecap="round"
              />
            );
          }

          const span = Math.min(room, SPAN_MAX * rankFrac(rank, fieldSizes?.[i] ?? FIELD_DEFAULT));
          const [ex, ey] = polar(cx, cy, Rseason, start + span);
          return (
            <g key={`${s}-${i}`}>
              {/* The track: the rest of the slot, so the arc is a fraction of
                  something visible instead of a shape.

                  It is also the ceiling, which is why there is no separate
                  end-stop mark. SPAN_MAX is 1.74 rad and `room` is 1.744 for
                  any plate of three seasons or fewer — which is every plate in
                  this cast — so a first place fills the track to within a
                  quarter of a degree and the track's own cap is where the top
                  of the table is. A notch there would be a second mark in the
                  same place, and a radial one at that, in a band whose radial
                  marks are the tick count.

                  Suppressed at chip size, where 1.2 units is a third of a pixel
                  and the whole slot is eleven: it would read as a broken ring
                  rather than as a scale. */}
              {!chip && (
                <path
                  d={arc(cx, cy, Rseason, start, start + room)}
                  fill="none"
                  stroke={SEASON_COLOR[s]}
                  strokeOpacity={0.12}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              )}
              <path
                d={arc(cx, cy, Rseason, start, start + span)}
                fill="none"
                stroke={SEASON_COLOR[s]}
                strokeOpacity={0.95}
                strokeWidth={won ? 3.2 : 2.6}
                strokeLinecap="round"
              />
              {/* A win is two degrees of arc away from a second place. The cap
                  is what actually makes it readable. */}
              {won && !chip && <circle cx={ex} cy={ey} r={2.6} fill={SEASON_COLOR[s]} />}
            </g>
          );
        })
      )}

      {/* presided over a season. Solid: the dashed language belongs to the
          franchise newcomer, and two faint dashed circles on one plate is why
          the two used to be unreadable against each other.

          HOST_RING, not BONE. Presiding is a ROLE, and the bone/accent register
          is reserved for STATE — focus, selection, the orbit ego ring.
          plateGeometry moved the canvas painter off BONE for that reason and
          measured the replacement (ΔE 23.7 from ACCENT, 20.7 from BONE, >20
          from every archetype colour it is drawn beside); this painter was left
          behind, so 상민 and 지민 wore a warm ring on the card and a cool one on
          the node — one object in two colours. */}
      {isHost && !chip && (
        <circle cx={cx} cy={cy} r={R_HOST} fill="none" stroke={HOST_RING} strokeOpacity={0.5} strokeWidth={0.9} />
      )}

      {/* one rim tick per verified connection (per relationship type at mark size) */}
      {ticks.map((t, i) => {
        const [x0, y0] = polar(cx, cy, Rrim, t.a);
        const [x1, y1] = polar(cx, cy, Rrim + t.len, t.a);
        return (
          <line
            key={i}
            x1={x0}
            y1={y0}
            x2={x1}
            y2={y1}
            stroke={t.color}
            strokeOpacity={0.85}
            strokeWidth={tickW}
            strokeLinecap="round"
          />
        );
      })}

      {/* nobody yet. Read from the palette module rather than hardcoded: the
          hex that used to sit here, #6d6570, is named in palette.ts as a
          retired value and "if you find that hex anywhere, it is a bug".
          INK_LOW rather than INK_FAINT because this is a meaningful graphic and
          INK_FAINT composites to 2.11:1, under the 3:1 floor palette.ts sets —
          and because the legend tile in the field guide draws it in INK_LOW, so
          the plate and the thing that explains the plate now agree. */}
      {noTies && !chip && (
        <circle
          cx={cx}
          cy={cy}
          r={Rrim}
          fill="none"
          stroke={INK_LOW}
          strokeOpacity={0.62}
          strokeWidth={0.9}
          strokeDasharray="1.5 5"
        />
      )}

      {/* the laurel: outboard of everything, and a different shape rather than
          a different shade — on the amber archetypes it used to be the same
          hue, the same radius and the same broken-ring reading as a rookie's
          dashed season ring. */}
      {isWinner &&
        (chip ? (
          <circle cx={cx} cy={cy} r={Rseason + 5} fill="none" stroke={BRASS} strokeOpacity={0.6} strokeWidth={1} />
        ) : (
          <>
            <circle cx={cx} cy={cy} r={R_LAUREL_IN} fill="none" stroke={BRASS} strokeOpacity={0.5} strokeWidth={0.8} />
            <circle cx={cx} cy={cy} r={R_LAUREL_OUT} fill="none" stroke={BRASS} strokeOpacity={0.75} strokeWidth={0.9} />
            {/* The rungs between the two hairlines are a card-size mark: at the
                dossier's 76px crest they are 1.4px long and only muddy the
                pair of rings that already say "champion". */}
            {card &&
              Array.from({ length: 16 }, (_, i) => {
                const a = (i / 16) * TAU;
                const [x0, y0] = polar(cx, cy, R_LAUREL_IN, a);
                const [x1, y1] = polar(cx, cy, R_LAUREL_OUT, a);
                return (
                  <line
                    key={i}
                    x1={x0}
                    y1={y0}
                    x2={x1}
                    y2={y1}
                    stroke={BRASS}
                    strokeOpacity={0.65}
                    strokeWidth={1.1}
                    strokeLinecap="round"
                  />
                );
              })}
          </>
        ))}
    </svg>
  );
}

/* ── the plate key ────────────────────────────────────────────────────────
   Eight things are encoded on a node at once — disc size, fill, archetype
   ring, laurel, host hairline, newcomer dash, season arcs, bloom — and every
   one of them is on screen in the default frame. Until now the only place
   that said what any of them meant was the About sheet's second tab, i.e. two
   deliberate actions away from the graph, behind a modal that covers the
   thing being explained. A reader can see that some discs are decorated and
   has no way to find out what the decoration is.

   So the marks explain themselves where the reader already is: the hover card
   — which IS the graph surface, appears on every pointer move and already
   carries the plate at 40px — and the dossier header, which is how a touch
   reader gets in at all. The key names only the marks THIS plate carries, so
   pointing at 곽범 teaches the dashed newcomer ring and pointing at 이태균
   teaches the laurel, and four or five hovers cover the whole grammar without
   ever leaving the canvas.

   The sentences are the About sheet's own tile strings, read by key. Not
   copies: a second wording of "황동 후광 = 이전 시즌 우승" is a second thing to
   keep true, and the field guide and the plate have to agree by construction
   or the key is worse than nothing.

   The swatches are drawn from the same constants as the plate above, at the
   same relative radii, for the same reason. */

export type PlateMarkKind = 'laurel' | 'hostRing' | 'newcomer' | 'noTies' | 'arcs' | 'ticks' | 'ring';

/** Rarest and most-decorated first: that is the order a reader asks in. The
    archetype ring is on every plate, so it is the row that gets dropped when
    a surface can only afford two. */
const MARK_ORDER: PlateMarkKind[] = ['laurel', 'hostRing', 'newcomer', 'noTies', 'arcs', 'ticks', 'ring'];

const MARK_TEXT: Record<PlateMarkKind, UiKey> = {
  laurel: 'about.tileHalo',
  hostRing: 'about.tileHostRing',
  newcomer: 'about.tileDashedRim',
  noTies: 'about.tileNoTies',
  arcs: 'about.tileArcs',
  ticks: 'about.tileRimTicks',
  ring: 'about.tileRing',
};

export interface PlateKeyProps {
  lang: Lang;
  category: Category;
  seasons: SeasonNumber[];
  isWinner?: boolean;
  isHost?: boolean;
  noTies?: boolean;
  connections?: PortraitConnection[];
  /** Rows to print. The hover card takes three; the dossier takes them all. */
  limit?: number;
  /** Marks this surface already explains by other means, so the key does not
      spend a row saying what the reader can see stated beside it. */
  omit?: PlateMarkKind[];
  className?: string;
}

/** A 20-unit swatch of one mark, drawn at the plate's own proportions.
 *
 *  Exported because the filter rail draws a resting node key from the same
 *  marks. One drawing of each mark in the codebase — a second hand-made laurel
 *  in a stylesheet somewhere is how a legend stops depicting the thing it
 *  legends, which is a defect this project has already had. */
export function PlateMarkSwatch({
  kind,
  color,
  seasons,
  tickColors,
}: {
  kind: PlateMarkKind;
  color: string;
  seasons: SeasonNumber[];
  tickColors: string[];
}): JSX.Element {
  const c = 10;
  const body = <circle cx={c} cy={c} r={4.6} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.2} />;
  switch (kind) {
    case 'laurel':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx={c} cy={c} r={7.4} fill="none" stroke={BRASS} strokeOpacity={0.5} strokeWidth={0.8} />
          <circle cx={c} cy={c} r={8.8} fill="none" stroke={BRASS} strokeOpacity={0.85} strokeWidth={1} />
          {body}
        </svg>
      );
    case 'hostRing':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx={c} cy={c} r={8.6} fill="none" stroke={BONE} strokeOpacity={0.55} strokeWidth={0.9} />
          <path
            d={arc(c, c, 6.8, -2.2, 0.9)}
            fill="none"
            stroke={SEASON_COLOR[3]}
            strokeOpacity={0.9}
            strokeWidth={1.8}
            strokeDasharray="0.01 3"
            strokeLinecap="round"
          />
          {body}
        </svg>
      );
    case 'newcomer':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle
            cx={c}
            cy={c}
            r={7.2}
            fill="none"
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={1}
            strokeDasharray="2 3.2"
          />
          {body}
        </svg>
      );
    case 'noTies':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle
            cx={c}
            cy={c}
            r={8.4}
            fill="none"
            stroke={INK_LOW}
            strokeOpacity={0.7}
            strokeWidth={0.9}
            strokeDasharray="1.4 4"
          />
          {body}
        </svg>
      );
    case 'arcs':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          {/* Value over track, exactly as the plate draws it — the point of
              the mark is that the arc is a fraction of the slot. */}
          {seasons.slice(0, 2).map((s, i) => {
            const start = -Math.PI / 2 + i * Math.PI + 0.18;
            const room = Math.PI - 0.36;
            return (
              <g key={s}>
                <path
                  d={arc(c, c, 7.2, start, start + room)}
                  fill="none"
                  stroke={SEASON_COLOR[s]}
                  strokeOpacity={0.16}
                  strokeWidth={0.9}
                  strokeLinecap="round"
                />
                <path
                  d={arc(c, c, 7.2, start, start + room * (i === 0 ? 0.78 : 0.44))}
                  fill="none"
                  stroke={SEASON_COLOR[s]}
                  strokeOpacity={0.95}
                  strokeWidth={1.9}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {body}
        </svg>
      );
    case 'ticks':
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          {tickColors.map((tc, i) => {
            const a = -Math.PI / 2 + (i / Math.max(1, tickColors.length)) * TAU;
            const [x0, y0] = polar(c, c, 6.6, a);
            const [x1, y1] = polar(c, c, 9, a);
            return (
              <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={tc} strokeOpacity={0.9} strokeWidth={1.5} strokeLinecap="round" />
            );
          })}
          {body}
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx={c} cy={c} r={6.4} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.8} />
        </svg>
      );
  }
}

/** The marks a given plate actually carries, in reading order. */
function plateMarks({
  seasons,
  isWinner,
  isHost,
  noTies,
  connections,
}: Pick<PlateKeyProps, 'seasons' | 'isWinner' | 'isHost' | 'noTies' | 'connections'>): PlateMarkKind[] {
  const present = new Set<PlateMarkKind>(['ring']);
  if (isWinner) present.add('laurel');
  if (isHost) present.add('hostRing');
  if (seasons.length === 0) present.add('newcomer');
  else present.add('arcs');
  /* The key names the marks THIS plate carries, so it counts what the plate
     counts: a parallel record draws no tick, and a row explaining a mark that
     is not on the disc beside it is worse than a missing row. */
  if (noTies) present.add('noTies');
  else if ((connections ?? []).some((c) => isMeeting(c.type))) present.add('ticks');
  return MARK_ORDER.filter((m) => present.has(m));
}

export function PlateKey({
  lang,
  category,
  seasons,
  isWinner = false,
  isHost = false,
  noTies = false,
  connections = [],
  limit,
  omit,
  className,
}: PlateKeyProps): JSX.Element | null {
  const color = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.other;
  let marks = plateMarks({ seasons, isWinner, isHost, noTies, connections });
  if (omit?.length) marks = marks.filter((m) => !omit.includes(m));
  const shown = limit ? marks.slice(0, limit) : marks;
  if (shown.length === 0) return null;

  /* The person's own tick hues, so the swatch for "one tick per relationship,
     coloured by its type" is coloured by their types and not by a sample.
     Meetings only, because those are the hues the rim actually carries. */
  const tickColors = [
    ...new Set(connections.filter((k) => isMeeting(k.type)).map((k) => EDGE_COLOR[k.type] ?? EDGE_COLOR.collab)),
  ].slice(0, 4);

  return (
    <ul className={`platekey${className ? ` ${className}` : ''}`}>
      {shown.map((kind) => (
        <li className="platekey__row" key={kind}>
          <span className="platekey__mark">
            <PlateMarkSwatch
              kind={kind}
              color={color}
              seasons={seasons}
              tickColors={tickColors.length ? tickColors : [EDGE_COLOR.alliance, EDGE_COLOR.betrayal, EDGE_COLOR['prior-show']]}
            />
          </span>
          <span className="platekey__what">{t(lang, MARK_TEXT[kind])}</span>
        </li>
      ))}
    </ul>
  );
}
