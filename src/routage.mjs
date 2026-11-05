import { FONT_STACK, fontFace } from './font.mjs';
import { layout, toBoard } from './layout.mjs';
import { route } from './route.mjs';
import { board, GRAIN_FILTER, n, svgDoc, text } from './svg.mjs';

const W = 1280;
const H = 312;
/** The signal routes the whole net once, slowly, after a short pause. */
export const DRAW_S = 16;
export const START_S = 1;

/*
 * Once, slowly: the net draws itself, its bright head ahead, each pad lighting as it is reached.
 * With `motion: false` (the still version the README picks for reduced motion) or under
 * prefers-reduced-motion where the image sees it, the end state shows at once.
 */
const MOTION_CSS = [
  `.route{animation:draw ${DRAW_S}s linear ${START_S}s both}`,
  `.head{animation:head ${DRAW_S}s linear ${START_S}s both}`,
  '.lit{animation:lit .6s ease-out both}',
  '@keyframes draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}',
  '@keyframes head{0%{stroke-dashoffset:1.5;opacity:1}98%{opacity:1}100%{stroke-dashoffset:-100;opacity:0}}',
  '@keyframes lit{from{opacity:0}to{opacity:1}}',
  '@media (prefers-reduced-motion:reduce){.route,.head,.lit{animation:none}}',
];

const plural = (count, one, many) => `${count.toLocaleString('en-GB')} ${count === 1 ? one : many}`;

/**
 * « Routage »: the contribution calendar as a board. Each day is a pad, dim when empty, gold when
 * active (bigger and brighter with its level). A gold signal routes one net through the active days
 * at 0°, 45° and 90°, once; each pad lights up as it reaches it. With reduced motion, or anywhere
 * the animation does not run, the board shows its end state: the whole net routed, every pad lit.
 */
export function renderRoutage(cal, t, { login = 'k0t3i', embedFont = true, motion = true } = {}) {
  const g = layout(cal, { width: W });
  const net = route(g.pads);
  const at = new Map(net.order.map((p, i) => [p, net.at[i]]));
  const d = net.points.map((p, i) => {
    const b = toBoard(g, p);
    return `${i ? 'L' : 'M'}${n(b.x)} ${n(b.y)}`;
  }).join('');

  const style = [
    fontFace({ embed: embedFont }),
    `text{font-family:${FONT_STACK};letter-spacing:.02em}`,
    `.silk{fill:${t.silk}}.dim{fill:${t.silkDim}}.hole{fill:${t.hole}}`,
    '.h{font-size:20px}.s{font-size:17px}',
    `.net{fill:none;stroke:#fff;stroke-opacity:.07;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}`,
    `.route{fill:none;stroke:${t.gold};stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100}`,
    `.head{fill:none;stroke:${t.padLit};stroke-width:4;stroke-linecap:round;stroke-dasharray:1.5 110;stroke-dashoffset:-100;opacity:0}`,
    ...(motion ? MOTION_CSS : []),
  ].join('');

  // The pads: the dim one of every day, then the gold one of each active day over the net.
  const defs = [
    GRAIN_FILTER,
    `<g id="p0"><circle r="3.5" fill="#fff" fill-opacity=".08"/><circle r="1.2" class="hole"/></g>`,
    `<g id="p1"><circle r="5" fill="${t.gold}"/><circle r="1.8" class="hole"/></g>`,
    `<g id="p2"><circle r="6" fill="${t.gold}"/><circle r="2" class="hole"/></g>`,
    `<g id="p3"><circle r="7" fill="${t.padLit}"/><circle r="2.2" class="hole"/></g>`,
    `<g id="p4"><circle r="10.5" fill="${t.led}" fill-opacity=".16"/><circle r="8" fill="${t.padLit}"/><circle r="2.4" class="hole"/></g>`,
  ];
  const dim = g.pads.map((p) => `<use href="#p0" x="${n(p.x)}" y="${n(p.y)}"/>`);
  const lit = net.order.map((p) => {
    const delay = START_S + DRAW_S * at.get(p);
    const when = motion ? ` style="animation-delay:${n(delay)}s"` : '';
    return `<use href="#p${p.level}" x="${n(p.x)}" y="${n(p.y)}" class="lit"${when}/>`;
  });

  const active = net.order.length;
  const first = cal.days[0]?.date ?? '';
  const last = cal.days.at(-1)?.date ?? '';
  const left = g.x0 - g.pitch / 2;
  const right = W - left;
  const foot = H - 30;

  // The legend: the five pads, from an empty day to the busiest.
  const legendX = right - 5 * 26 - 70;
  const legend = [
    text(legendX - 14, foot + 6, 'less', 'class="dim s" text-anchor="end"'),
    ...[0, 1, 2, 3, 4].map((l) => `<use href="#p${l}" x="${legendX + 8 + l * 26}" y="${foot}"/>`),
    text(right, foot + 6, 'more', 'class="dim s" text-anchor="end"'),
  ];

  const body = [
    `<defs>${defs.join('')}</defs>`,
    board(t, W, H, 14),
    `<text x="${n(left)}" y="50" class="h silk">ROUTING<tspan class="dim"> · ${plural(cal.total, 'contribution', 'contributions')} in the last year</tspan></text>`,
    text(right, 50, plural(active, 'day routed', 'days routed'), 'class="h dim" text-anchor="end"'),
    ...g.months.map((m) => text(m.x, 86, m.label, 'class="s dim"')),
    `<g>${dim.join('')}</g>`,
    d ? `<path class="net" d="${d}"/><path class="route" pathLength="100" d="${d}"/>` : '',
    `<g>${lit.join('')}</g>`,
    d && motion ? `<path class="head" pathLength="100" d="${d}"/>` : '',
    text(left, foot + 6, `@${login} · ${first} to ${last}`, 'class="s dim"'),
    ...legend,
  ].filter(Boolean).join('\n');

  return svgDoc({
    width: W,
    height: H,
    title: `Routing: ${plural(cal.total, 'contribution', 'contributions')} in the last year`,
    desc: `The public GitHub contributions of ${login} from ${first} to ${last}, drawn as pads on a circuit board: ${plural(active, 'active day', 'active days')}, routed by one gold trace.`,
    style,
    body,
  });
}
