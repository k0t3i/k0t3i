#!/usr/bin/env node
/**
 * Renders the live part of the profile: routage-{light,dark}.svg, their still versions
 * routage-{light,dark}-still.svg (for reduced motion), and uptime-{light,dark}.svg.
 * The workflow (.github/workflows/board.yml) runs it every day and publishes them on the `output` branch.
 *
 *   node scripts/render.mjs --out <dir> [--login k0t3i] [--site k0t3i/k0t3i.github.io] [--branch master]
 *                           [--calendar answer.json] [--rev 2026-11-05] [--now 2026-11-05] [--no-font]
 *
 * GITHUB_TOKEN (or GH_TOKEN) reads the GitHub API. --calendar and --rev work offline, from a saved
 * GraphQL answer and a given date.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseCalendar } from '../src/calendar.mjs';
import { fetchCalendar, fetchLastCommitDate } from '../src/github.mjs';
import { THEMES } from '../src/palette.mjs';
import { renderRoutage } from '../src/routage.mjs';
import { renderUptime } from '../src/uptime.mjs';
import { checkSvg } from '../src/xml.mjs';

/** The budget of each SVG: a light image for the profile page. */
export const MAX_BYTES = 60 * 1024;

const { values: opt } = parseArgs({
  options: {
    out: { type: 'string', default: 'dist' },
    login: { type: 'string', default: process.env.GITHUB_REPOSITORY_OWNER || 'k0t3i' },
    site: { type: 'string', default: 'k0t3i/k0t3i.github.io' },
    branch: { type: 'string', default: 'master' },
    calendar: { type: 'string' },
    rev: { type: 'string' },
    now: { type: 'string' },
    'no-font': { type: 'boolean', default: false },
  },
});

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const now = opt.now ? new Date(opt.now) : new Date();
const answer = opt.calendar ? JSON.parse(readFileSync(opt.calendar, 'utf8')) : await fetchCalendar(opt.login, token);
const rev = opt.rev ?? (await fetchLastCommitDate(opt.site, opt.branch, token));
const cal = parseCalendar(answer);
const embedFont = !opt['no-font'];

const out = resolve(opt.out);
mkdirSync(out, { recursive: true });
for (const theme of Object.values(THEMES)) {
  const files = {
    [`routage-${theme.name}.svg`]: renderRoutage(cal, theme, { login: opt.login, embedFont }),
    [`routage-${theme.name}-still.svg`]: renderRoutage(cal, theme, { login: opt.login, embedFont, motion: false }),
    [`uptime-${theme.name}.svg`]: renderUptime(theme, { now, rev, embedFont }),
  };
  for (const [name, svg] of Object.entries(files)) {
    const problems = checkSvg(svg);
    if (problems.length) throw new Error(`${name} is not well formed: ${problems.join('; ')}`);
    const bytes = Buffer.byteLength(svg);
    if (bytes > MAX_BYTES) throw new Error(`${name} is ${bytes} bytes, over ${MAX_BYTES}`);
    writeFileSync(join(out, name), svg);
    console.log(`${name}  ${bytes} B`);
  }
}
console.log(`${cal.total} contributions, ${cal.days.filter((d) => d.level > 0).length} active days; site revision ${rev}`);
