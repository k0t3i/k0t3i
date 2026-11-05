import { readFileSync } from 'node:fs';
import { FONT_STACK, fontFace } from './font.mjs';
import { silkLine } from './palette.mjs';
import { board, GRAIN_FILTER, n, svgDoc, text, via } from './svg.mjs';

export const AVATAR_URL = new URL('../assets/avatar.png', import.meta.url);

const W = 1280;
const H = 360;

/** One signal runs its trace in 30 % of the cycle; the four are staggered, so at most one is seen at a time. */
export const CYCLE_S = 14;

/*
 * The current: each signal is a short gold dash, unseen at rest. With `motion: false` (the still
 * version, for a reader who asked for reduced motion: the README picks it with <picture>), or under
 * prefers-reduced-motion where the image sees it, nothing moves.
 */
const MOTION_CSS = [
  `.sig{animation:sig ${CYCLE_S}s linear infinite}`,
  ...Array.from({ length: 3 }, (_, k) => `.sig${k + 2}{animation-delay:${n(((k + 1) * CYCLE_S) / 4)}s}`),
  '@keyframes sig{0%{opacity:0;stroke-dashoffset:7}2%,26%{opacity:.85}29%,100%{opacity:0}30%,100%{stroke-dashoffset:-100}}',
  '@media (prefers-reduced-motion:reduce){.sig{animation:none}}',
];

/** A polyline -> a path, for the traces. */
const path = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join('');

/*
 * The copper: J1 (the site) sends a bus of four traces to DISP1, a test point and R1 feed it from
 * the top, a via from the bottom. They all end under the module, as if they reached its header.
 */
const J1_X = [92, 116, 140, 164];
const J1_Y = 292;
const JOG_X = 700;
/** Keeps the 45° jog of the bus at an even spacing: 16 x tan(22.5°). */
const JOG_STEP = 6.63;

function busTrace(i) {
  const x = J1_X[i];
  const y = 200 + 16 * i;
  const jog = JOG_X + (3 - i) * JOG_STEP;
  return [[x, J1_Y - 11], [x, y + 12], [x + 12, y], [jog, y], [jog + 24, y + 24], [1010, y + 24]];
}

const TRACES = [
  busTrace(0),
  busTrace(1),
  busTrace(2),
  busTrace(3),
  [[732, 88], [806, 88]],
  [[838, 88], [1010, 88]],
  [[860, 326], [860, 314], [886, 288], [1010, 288]],
];

/** The traces the current pulses along, one after the other. */
const SIGNALS = [TRACES[0], [...TRACES[4], ...TRACES[5]], TRACES[2], TRACES[6]];

const PINS = ['GND', 'VCC', 'SCK', 'MOSI', 'DC', 'CS'];

/** A mounting hole and its ring of stitching vias, as on the site. */
function mountingHole(t, cx, cy) {
  const ring = Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4;
    return `<use href="#sv" x="${n(cx + 22 * Math.cos(a))}" y="${n(cy + 22 * Math.sin(a))}"/>`;
  });
  return via(cx, cy, 12, 6.5, t.gold) + ring.join('');
}

/**
 * The banner: a slice of the board of k0t3i.github.io. The silkscreen « ANTHONY · FRONT-END », J1
 * labelled « k0t3i.github.io », DISP1 with the pixel avatar, and a gold current pulsing slowly
 * along four traces into DISP1 (CSS animation, stopped by prefers-reduced-motion).
 */
export function renderBanner(t, { embedFont = true, motion = true, avatar = readFileSync(AVATAR_URL) } = {}) {
  const line = silkLine(t);
  const mod = { x: 948, y: 30, w: 240, h: 282 };
  const glass = { x: mod.x + 12, y: 84, w: 216, h: 216 };
  const pinX = (i) => mod.x + 30 + 36 * i;

  const style = [
    fontFace({ embed: embedFont }),
    `text{font-family:${FONT_STACK};letter-spacing:.02em}`,
    `.silk{fill:${t.silk}}.dim{fill:${t.silkDim}}.hole{fill:${t.hole}}`,
    '.name{font-size:46px;letter-spacing:.05em}.url{font-size:24px}.ref{font-size:15px}.pin{font-size:12px}',
    '.cu{fill:none;stroke:#fff;stroke-opacity:.055;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}',
    `.outline{fill:none;stroke:${line}}`,
    '.avatar{image-rendering:optimizeSpeed;image-rendering:crisp-edges;image-rendering:pixelated}',
    `.sig{fill:none;stroke:${t.gold};stroke-width:3;stroke-linecap:round;stroke-dasharray:7 110;stroke-dashoffset:7;opacity:0}`,
    ...(motion ? MOTION_CSS : []),
  ].join('');

  const defs = [
    GRAIN_FILTER,
    `<filter id="lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="${t.shadow}" flood-opacity=".45"/></filter>`,
    '<pattern id="scan" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" fill-opacity=".08"/></pattern>',
    '<linearGradient id="glare" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".04"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></linearGradient>',
    `<g id="sv"><circle r="3.5" fill="#fff" fill-opacity=".07"/><circle r="1" class="hole"/></g>`,
  ];

  const corners = (() => {
    const [l, tp, r, b, a] = [mod.x - 8, mod.y - 8, mod.x + mod.w + 8, mod.y + mod.h + 8, 14];
    return `<path class="outline" d="M${l} ${tp + a}V${tp}H${l + a}M${r - a} ${tp}H${r}V${tp + a}M${r} ${b - a}V${b}H${r - a}M${l + a} ${b}H${l}V${b - a}"/>`;
  })();

  const body = [
    `<defs>${defs.join('')}</defs>`,
    board(t, W, H, 16),
    `<rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="8" fill="none" stroke="#fff" stroke-opacity=".05"/>`,
    // The copper under the mask, then the current on it.
    `<g class="cu">${TRACES.map((p) => `<path d="${path(p)}"/>`).join('')}</g>`,
    `<g>${SIGNALS.map((p, k) => `<path class="sig${k ? ` sig${k + 1}` : ''}" pathLength="100" d="${path(p)}"/>`).join('')}</g>`,
    // Mounting holes, a fiducial.
    mountingHole(t, 40, 40),
    mountingHole(t, 40, H - 40),
    mountingHole(t, W - 40, 40),
    mountingHole(t, W - 40, H - 40),
    `<circle cx="${W - 40}" cy="${H / 2}" r="10" class="outline"/><circle cx="${W - 40}" cy="${H / 2}" r="4" fill="${t.gold}"/>`,
    // The name.
    text(88, 140, 'ANTHONY · FRONT-END', 'class="silk name"'),
    // J1, the connector to the site: four SMD pads in a frame, pin 1 marked.
    `<rect x="76" y="272" width="104" height="40" rx="3" class="outline"/>`,
    `<path d="M70 318l6-6" class="outline"/>`,
    ...J1_X.map((x) => `<rect x="${x - 6}" y="${J1_Y - 11}" width="12" height="22" rx="1.5" fill="${t.gold}"/>`),
    text(76, 262, 'J1', 'class="dim ref"'),
    text(198, 301, 'k0t3i.github.io', 'class="silk url"'),
    // TP1 and R1, on the trace from the top.
    via(720, 88, 8, 3.5, t.gold),
    text(720, 66, 'TP1', 'class="dim ref" text-anchor="middle"'),
    `<rect x="802" y="81" width="10" height="14" rx="1" fill="${t.gold}"/><rect x="832" y="81" width="10" height="14" rx="1" fill="${t.gold}"/>`,
    `<rect x="811" y="82" width="22" height="12" fill="#141518"/>`,
    `<rect x="796" y="75" width="52" height="26" rx="2" class="outline"/>`,
    text(822, 66, 'R1', 'class="dim ref" text-anchor="middle"'),
    via(860, 326, 6, 2.5, t.gold),
    // DISP1: a small black board of its own, screwed onto the main one, its header on top.
    corners,
    `<rect x="${mod.x}" y="${mod.y}" width="${mod.w}" height="${mod.h}" rx="7" fill="${t.module}" stroke="${t.bodyEdge}" filter="url(#lift)"/>`,
    ...PINS.map((p, i) =>
      (i === 0
        ? `<rect x="${pinX(i) - 5}" y="${mod.y + 15}" width="10" height="10" rx="1" fill="${t.gold}"/><circle cx="${pinX(i)}" cy="${mod.y + 20}" r="2.5" class="hole"/>`
        : via(pinX(i), mod.y + 20, 5, 2.5, t.gold)) + text(pinX(i), mod.y + 44, p, 'class="dim pin" text-anchor="middle"'),
    ),
    `<rect x="${glass.x}" y="${glass.y}" width="${glass.w}" height="${glass.h}" rx="2" fill="${t.glass}" stroke="${t.bodyEdge}"/>`,
    `<image class="avatar" x="${glass.x + 12}" y="${glass.y + 12}" width="192" height="192" preserveAspectRatio="none" href="data:image/png;base64,${avatar.toString('base64')}"/>`,
    `<rect x="${glass.x}" y="${glass.y}" width="${glass.w}" height="${glass.h}" rx="2" fill="url(#scan)"/>`,
    `<rect x="${glass.x}" y="${glass.y}" width="${glass.w}" height="${glass.h}" rx="2" fill="url(#glare)"/>`,
    text(mod.x, H - 20, 'DISP1 · avatar', 'class="dim ref"'),
  ].join('\n');

  return svgDoc({
    width: W,
    height: H,
    title: 'Anthony · front-end',
    desc: 'A slice of the circuit board of k0t3i.github.io: the silkscreen ANTHONY · FRONT-END, the connector J1 labelled k0t3i.github.io, and the small screen DISP1 showing a pixel-art avatar. A gold current runs slowly along the traces.',
    style,
    body,
  });
}
