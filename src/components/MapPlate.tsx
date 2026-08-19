import { neighbourhood } from "@/lib/site";

/**
 * BEAT 8 — the Kilimani plate.
 *
 * The storyboard asks for "a custom dark-green map plate, gold route-lines
 * animating out from the building pin… styled like a club's private city
 * guide, not Google default", with acorn №2 marking the building.
 *
 * Deliberately NOT a street map. We know the honest travel times (they are in
 * site.ts and they are checked); we do not know surveyed coordinates, and a
 * hand-drawn street map of Kilimani would be inventing geography to look
 * authoritative. So the plate encodes the one thing we can stand behind:
 * TIME. Radius = minutes from the door. Bearings are indicative only, spread
 * for legibility — which is why there is no compass rose and no street names.
 * It reads as an infographic, because that is what it honestly is.
 *
 * No JS. Threads draw themselves with `pathLength="1"` + stroke-dashoffset,
 * triggered by the `.seen` class the existing Providers observer already adds
 * to `.reveal` elements. Default state is fully drawn, so with JS disabled the
 * plate renders complete rather than blank — the same contract every other
 * reveal on this site honours.
 */

const CX = 400;
const CY = 400;

// Minutes per destination, in the order they appear in site.ts.
// "Kilimani cafés" has no stated figure — it is walking distance, so it sits
// on the inner walking ring and is labelled "Walk", never a number we made up.
// JKIA is the 30–45 midpoint; its label keeps the honest range.
const MINUTES = [8, 10, 5, 8, 12, 37];
// Chosen for composition and label clearance, not compass accuracy — see the
// note above. Spread so no two labels stack and no quadrant sits empty.
const BEARINGS = [300, 350, 225, 85, 45, 145];

// Piecewise so the walking ring (where most of the value is) gets real room
// instead of being crushed against the pin by the airport.
function radiusFor(m: number): number {
  if (m <= 5) return 70 + m * 10;
  if (m <= 15) return 120 + (m - 5) * 16;
  return 280 + (m - 15) * 3;
}

function polar(bearingDeg: number, r: number) {
  const rad = ((bearingDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

const RINGS = [
  { r: 120, label: "5 min" },
  { r: 200, label: "10 min" },
  { r: 280, label: "15 min" },
  { r: 346, label: "30 min +" },
];

// SVG text does not wrap. The long compound names ("Yaya Centre & Adlife
// Plaza") run off the plate as one line, so they break at the ampersand —
// wrapped, never truncated, because dropping half a place name from a map is
// how a guest ends up at the wrong shopping centre.
function wrap(place: string): string[] {
  const i = place.indexOf(" & ");
  return i === -1 ? [place] : [place.slice(0, i) + " &", place.slice(i + 3)];
}

const nodes = neighbourhood.map((n, i) => {
  const r = radiusFor(MINUTES[i]);
  const p = polar(BEARINGS[i], r);
  const onFoot = /walk/i.test(n.time);
  const right = p.x >= CX;
  // Bow each thread slightly off the straight line so six spokes read as a
  // drawn guide rather than a pie chart.
  const mid = polar(BEARINGS[i] + (right ? -7 : 7), r * 0.55);
  // Each destination lights up as the sweep reaches it, so the nearest places
  // resolve first and the airport last — the stagger carries the distance.
  const delay = 0.15 + (r / 440) * 1.25;
  return { ...n, ...p, onFoot, right, mid, lines: wrap(n.place), delay };
});

export function MapPlate() {
  return (
    <div className="plate reveal grain relative overflow-hidden rounded-sm bg-white shadow-luxe">
      {/* Fluted edges — the ridged K, as the plate's frame. */}
      <div aria-hidden className="fluted pointer-events-none absolute inset-y-0 left-0 w-6 opacity-40" />
      <div aria-hidden className="fluted pointer-events-none absolute inset-y-0 right-0 w-6 opacity-40" />

      <svg
        viewBox="0 0 800 800"
        className="relative z-[1] block w-full"
        role="img"
        aria-label="Travel times from Kito Oak Haven: Yaya Centre 8 minutes' walk, Carrefour and Chandarana 10 minutes' walk, Kilimani cafés walking distance, Nairobi Hospital 8 minutes' drive, Nairobi CBD 12 minutes' drive, JKIA airport 30 to 45 minutes."
      >
        <defs>
          <linearGradient id="thread" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8a6832" />
            <stop offset="45%" stopColor="#e6cf9c" />
            <stop offset="100%" stopColor="#c6a15b" />
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0%" stopColor="#c6a15b" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#c6a15b" stopOpacity="0" />
          </radialGradient>

          {/* The reveal. stroke-dasharray is already carrying the walk/drive
              distinction, so it cannot also carry the draw-on — one property
              cannot do two jobs. Instead a circle grows out of the pin and
              masks the threads in, which is closer to what the beat describes:
              routes radiating from the door. Default r is the full radius so
              that with no JS the plate renders complete. */}
          <mask id="sweep">
            <circle className="sweep" cx={CX} cy={CY} r={440} fill="#fff" />
          </mask>
        </defs>

        <circle cx={CX} cy={CY} r="330" fill="url(#glow)" />

        {/* Time bands */}
        {RINGS.map((ring, i) => (
          <g key={ring.r} className="ring" style={{ ["--d" as string]: `${i * 0.09}s` }}>
            <circle
              cx={CX}
              cy={CY}
              r={ring.r}
              fill="none"
              stroke="#c6a15b"
              strokeOpacity={0.2}
              strokeWidth={1}
              strokeDasharray="2 7"
            />
            {/* Labelled on the bottom axis: no destination sits due south, so
                the band names never fight a thread or a place name. */}
            <text
              x={CX}
              y={CY + ring.r + 22}
              textAnchor="middle"
              className="ring-label"
              fill="#d9c6a6"
              fillOpacity={0.42}
            >
              {ring.label}
            </text>
          </g>
        ))}

        {/* Gold threads out from the door, revealed by the sweep */}
        <g mask="url(#sweep)">
          {nodes.map((n) => (
            <path
              key={`t-${n.place}`}
              d={`M${CX} ${CY} Q${n.mid.x.toFixed(1)} ${n.mid.y.toFixed(1)} ${n.x.toFixed(1)} ${n.y.toFixed(1)}`}
              fill="none"
              stroke="url(#thread)"
              strokeWidth={1.6}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={n.onFoot ? undefined : "0.022 0.018"}
            />
          ))}
        </g>

        {/* Destinations */}
        {nodes.map((n) => (
          <g
            key={`n-${n.place}`}
            className="node"
            style={{ ["--d" as string]: `${n.delay.toFixed(2)}s` }}
          >
            <circle cx={n.x} cy={n.y} r={4.5} fill="#e6cf9c" />
            <circle cx={n.x} cy={n.y} r={11} fill="none" stroke="#c6a15b" strokeOpacity={0.35} strokeWidth={1} />
            {n.lines.map((line, li) => (
              <text
                key={line}
                x={n.right ? n.x + 20 : n.x - 20}
                y={n.y - 2 + li * 27}
                textAnchor={n.right ? "start" : "end"}
                className="node-place"
                fill="#faf7f1"
              >
                {line}
              </text>
            ))}
            <text
              x={n.right ? n.x + 20 : n.x - 20}
              y={n.y + 20 + (n.lines.length - 1) * 27}
              textAnchor={n.right ? "start" : "end"}
              className="node-time"
              fill="#e6cf9c"
            >
              {n.time}
            </text>
          </g>
        ))}

        {/* The door — acorn №2 */}
        <g className="pin">
          <circle cx={CX} cy={CY} r={30} fill="#0a1c16" stroke="#c6a15b" strokeOpacity={0.5} strokeWidth={1} />
          <g transform={`translate(${CX} ${CY - 3}) scale(0.92)`} fill="#e6cf9c">
            {/* acorn: stem, cap, nut */}
            <rect x={-0.9} y={-17} width={1.8} height={5} rx={0.9} />
            <path d="M0 -12.5c-8 0-13 3.4-13 6.9C-13 -2.4 -8 -1.4 0 -1.4S13 -2.4 13 -5.6c0-3.5-5-6.9-13-6.9Z" />
            <path d="M-9.4 -1.1C-9.4 6.6 -5.2 13.4 0 16.2 5.2 13.4 9.4 6.6 9.4 -1.1Z" fillOpacity={0.86} />
          </g>
        </g>
      </svg>

      <p className="legend t-small">
        <span>
          <i className="swatch swatch-walk" aria-hidden /> On foot
        </span>
        <span>
          <i className="swatch swatch-drive" aria-hidden /> By car
        </span>
        <span className="legend-note">Rings are minutes from the door, not distance.</span>
      </p>
    </div>
  );
}
