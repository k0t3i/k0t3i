import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCalendar } from '../src/calendar.mjs';
import { CHARSET } from '../src/font.mjs';
import { THEMES } from '../src/palette.mjs';
import { renderRoutage } from '../src/routage.mjs';
import { checkSvg } from '../src/xml.mjs';

const MAX_BYTES = 60 * 1024;
const cal = (name) => parseCalendar(JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')));

/** Every routage the profile shows: both boards, moving and still, on a short sample and a full year. */
function all() {
  return Object.values(THEMES).flatMap((t) =>
    [true, false].flatMap((motion) => ['calendar.json', 'year.json'].map((f) => [`${f} ${t.name} ${motion}`, renderRoutage(cal(f), t, { motion }), motion])),
  );
}

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('every routage is a well-formed SVG, named, under 60 KB, its font embedded', () => {
  for (const [name, svg] of all()) {
    assert.deepEqual(checkSvg(svg), [], name);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1280 312"/, name);
    assert.match(svg, /<title id="t">Routing: [^<]+<\/title>/, name);
    assert.ok(Buffer.byteLength(svg) < MAX_BYTES, `${name}: ${Buffer.byteLength(svg)} B`);
    assert.match(svg, /@font-face\{font-family:"JetBrains Mono";[^}]*src:url\(data:font\/woff2;base64,/, name);
    for (const m of svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)) {
      for (const ch of unescape(m[1].replace(/<[^>]+>/g, ''))) assert.ok(CHARSET.has(ch), `${name}: no glyph for ${JSON.stringify(ch)}`);
    }
  }
});

test('animated once, stopped by prefers-reduced-motion; the still version never moves', () => {
  for (const [name, svg, motion] of all()) {
    if (motion) {
      assert.match(svg, /\.route\{animation:draw 16s linear 1s both\}/, name);
      assert.doesNotMatch(svg, /infinite/, name);
      assert.match(svg, /@media \(prefers-reduced-motion:reduce\)\{\.route,\.head,\.lit\{animation:none\}\}/, name);
    } else {
      assert.doesNotMatch(svg, /animation|@keyframes|class="head"/, name);
    }
  }
});

test('a pad a day, the gold ones over one net, lit in routing order', () => {
  const sample = cal('calendar.json');
  const svg = renderRoutage(sample, THEMES.dark, { login: 'k0t3i' });
  assert.equal(svg.match(/<use href="#p0"/g).length, 28 + 1); // a day each, and the legend
  const lit = [...svg.matchAll(/<use href="#p(\d)" x="([\d.]+)" y="([\d.]+)" class="lit" style="animation-delay:([\d.]+)s"\/>/g)];
  assert.deepEqual(lit.map((m) => Number(m[1])), [1, 2, 4, 3, 1]);
  const delays = lit.map((m) => Number(m[4]));
  assert.equal(delays[0], 1);
  assert.equal(delays.at(-1), 17);
  delays.forEach((d, i) => {
    if (i) assert.ok(d > delays[i - 1]);
  });
  assert.equal(svg.match(/<path class="route" pathLength="100" d="M[^"]+"\/>/g).length, 1);
  assert.match(svg, /ROUTING<tspan class="dim"> · 26 contributions in the last year<\/tspan>/);
  assert.match(svg, />5 days routed</);
  assert.match(svg, />@k0t3i · 2026-01-04 to 2026-01-31</);
  assert.ok(svg.includes(`fill="${THEMES.dark.mask}"`));
  assert.ok(renderRoutage(sample, THEMES.light).includes(`fill="${THEMES.light.mask}"`));
});

test('the bigger the level, the bigger and the brighter the pad', () => {
  const svg = renderRoutage(cal('calendar.json'), THEMES.light);
  const radius = (l) => Number(new RegExp(`<g id="p${l}">(?:<circle r="[\\d.]+" fill="${THEMES.light.led}"[^>]*/>)?<circle r="([\\d.]+)"`).exec(svg)[1]);
  const sizes = [0, 1, 2, 3, 4].map(radius);
  sizes.forEach((r, i) => {
    if (i) assert.ok(r > sizes[i - 1], `p${i}`);
  });
  assert.match(svg, new RegExp(`<g id="p3"><circle r="7" fill="${THEMES.light.padLit}"`));
  assert.match(svg, new RegExp(`<g id="p1"><circle r="5" fill="${THEMES.light.gold}"`));
});

test('a year with no contribution: dim pads, no net', () => {
  const quiet = { ...cal('year.json') };
  quiet.days = quiet.days.map((d) => ({ ...d, count: 0, level: 0 }));
  quiet.total = 0;
  const svg = renderRoutage(quiet, THEMES.light);
  assert.deepEqual(checkSvg(svg), []);
  assert.doesNotMatch(svg, /class="route"|class="lit"/);
  assert.match(svg, /0 contributions in the last year/);
  assert.match(svg, />0 days routed</);
});
