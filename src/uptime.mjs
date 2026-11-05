import { FONT_STACK, fontFace } from './font.mjs';
import { board, GRAIN_FILTER, svgDoc, text, via } from './svg.mjs';

/*
 * The uptime of k0t3i.github.io, computed exactly as the site does: the constants and the formula
 * are copied from src/lib/uptime.ts of github.com/k0t3i/k0t3i.github.io. Change them there first.
 */
export const UPTIME_BASE_HOURS = 34880;
export const UPTIME_BASE_DATE = '2020-03-30';
export const HOURS_PER_YEAR = 1744;

const DAYS_PER_YEAR = 365.2425;
const MS_PER_DAY = 86_400_000;

/** Hours of work since the base date, rounded down to the thousand. */
export function uptimeHours(now) {
  const days = (now.getTime() - new Date(UPTIME_BASE_DATE).getTime()) / MS_PER_DAY;
  const hours = UPTIME_BASE_HOURS + (days / DAYS_PER_YEAR) * HOURS_PER_YEAR;
  return Math.floor(hours / 1000) * 1000;
}

/** 46000 -> "46,000", in English like the EN page of the site. */
export function formatHours(hours) {
  return new Intl.NumberFormat('en-GB').format(hours);
}

export const UPTIME_AFTER = ' h to design, code, debug, lead, teach, learn';

/** "2026-11-05T15:24:28Z" -> "2026-11-05" (UTC). */
export function isoDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

const W = 1280;
const H = 64;

/**
 * The uptime line: a thin strip of the board, its silkscreen « uptime: 46,000 h to design, ... »
 * and, on the right, « rev. 2026-11-05 », the date of the last commit of the site. Static.
 */
export function renderUptime(t, { now, rev, embedFont = true }) {
  const hours = formatHours(uptimeHours(now));
  const day = isoDay(rev);
  const style = [
    fontFace({ embed: embedFont }),
    `text{font-family:${FONT_STACK};font-size:21px;letter-spacing:.02em}`,
    `.silk{fill:${t.silk}}.dim{fill:${t.silkDim}}.hole{fill:${t.hole}}`,
  ].join('');
  const body = [
    `<defs>${GRAIN_FILTER}</defs>`,
    board(t, W, H, 12),
    via(30, H / 2, 7, 3, t.gold),
    `<path d="M37 ${H / 2}H50" stroke="${t.gold}" stroke-width="3" stroke-linecap="round"/>`,
    `<text x="62" y="39" class="silk"><tspan class="dim">uptime: </tspan>${hours}<tspan class="dim">${UPTIME_AFTER}</tspan></text>`,
    text(W - 30, 39, `rev. ${day}`, 'class="dim" text-anchor="end"'),
  ].join('\n');
  return svgDoc({
    width: W,
    height: H,
    title: `uptime: ${hours} h`,
    desc: `uptime: ${hours}${UPTIME_AFTER}. Site revision of ${day}.`,
    style,
    body,
  });
}
