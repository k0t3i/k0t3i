import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderBanner } from '../src/banner.mjs';
import { THEMES } from '../src/palette.mjs';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const RAW = 'https://raw.githubusercontent.com/k0t3i/k0t3i/';

/** The only links of the page: the site, the four public projects, the contact. */
const LINKS = [
  'https://k0t3i.github.io/',
  'https://k0t3i.github.io/kit-urgence/',
  'https://github.com/k0t3i/splitr-releases/releases/latest',
  'https://my-card.tisserands.ai/',
  'https://monscoreimmo.fr/',
  'mailto:contact@tisserands.ai',
];

test('every image has a meaningful alternative', () => {
  const imgs = [...readme.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(imgs.length, 3);
  for (const img of imgs) {
    const alt = /\balt="([^"]*)"/.exec(img)?.[1] ?? '';
    assert.ok(alt.split(' ').length >= 6, img);
  }
  assert.match(readme, /<a href="https:\/\/k0t3i\.github\.io\/">\s*<picture>[\s\S]*?alt="Anthony’s circuit board: front-end engineer, links to k0t3i\.github\.io"[\s\S]*?<\/picture>\s*<\/a>/);
});

test('links only to the site, the four public projects and the contact', () => {
  const hrefs = [...readme.matchAll(/\]\(([^)]+)\)|href="([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  for (const href of hrefs) assert.ok(LINKS.includes(href), href);
  for (const link of LINKS) assert.ok(hrefs.includes(link), link);
});

test('images come only from this repository: no third-party stats, no counters', () => {
  const urls = [...readme.matchAll(/(?:src|srcset)="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(urls.length, 10);
  for (const url of urls) assert.ok(url.startsWith(RAW), url);
  assert.doesNotMatch(readme, /shields\.io|readme-stats|vercel\.app|komarev|hits\.|visitor|counter/i);
});

test('each board in light and dark, and still for reduced motion', () => {
  for (const name of [
    'main/assets/banner-light.svg', 'main/assets/banner-dark.svg', 'main/assets/banner-light-still.svg', 'main/assets/banner-dark-still.svg',
    'output/routage-light.svg', 'output/routage-dark.svg', 'output/routage-light-still.svg', 'output/routage-dark-still.svg',
    'output/uptime-light.svg', 'output/uptime-dark.svg',
  ]) {
    assert.ok(readme.includes(`"${RAW}${name}"`), name);
  }
  // In each <picture>, the still sources come first: the first one that matches wins.
  for (const pic of readme.match(/<picture>[\s\S]*?<\/picture>/g)) {
    const media = [...pic.matchAll(/media="([^"]+)"/g)].map((m) => m[1]);
    const still = media.findLastIndex((m) => m.includes('reduced-motion'));
    const dark = media.indexOf('(prefers-color-scheme: dark)');
    assert.ok(still < dark, pic);
  }
});

test('the committed banners are in step with src/banner.mjs', () => {
  for (const t of Object.values(THEMES)) {
    for (const motion of [true, false]) {
      const file = `banner-${t.name}${motion ? '' : '-still'}.svg`;
      const committed = readFileSync(new URL(`../assets/${file}`, import.meta.url), 'utf8');
      assert.ok(committed === renderBanner(t, { motion }), `${file}: run npm run banner`);
    }
  }
});
