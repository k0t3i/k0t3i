import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderBanner } from '../src/banner.mjs';
import { CHARSET } from '../src/font.mjs';
import { THEMES } from '../src/palette.mjs';
import { text } from '../src/svg.mjs';
import { checkSvg } from '../src/xml.mjs';

const MAX_BYTES = 60 * 1024;

const banners = () =>
  Object.values(THEMES).flatMap((t) => [true, false].map((motion) => [`banner ${t.name} ${motion}`, renderBanner(t, { motion }), motion, t]));

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('the banner is well formed, named, and under 60 KB', () => {
  for (const [name, svg] of banners()) {
    assert.deepEqual(checkSvg(svg), [], name);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1280 360"/, name);
    assert.match(svg, /<title id="t">[^<]+<\/title>/, name);
    assert.ok(Buffer.byteLength(svg) < MAX_BYTES, `${name}: ${Buffer.byteLength(svg)} B`);
  }
});

test('the font is embedded, and every printed character has a glyph in it', () => {
  for (const [name, svg] of banners()) {
    assert.match(svg, /@font-face\{font-family:"JetBrains Mono";[^}]*src:url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\)/, name);
    assert.match(svg, /font-family:"JetBrains Mono", ui-monospace, Consolas, monospace/, name);
    for (const m of svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)) {
      for (const ch of unescape(m[1].replace(/<[^>]+>/g, ''))) assert.ok(CHARSET.has(ch), `${name}: no glyph for ${JSON.stringify(ch)}`);
    }
  }
  assert.throws(() => text(0, 0, 'Kit d’urgence'), /No glyph/);
});

test('the moving banner stops under prefers-reduced-motion; the still one never moves', () => {
  for (const [name, svg, motion] of banners()) {
    if (motion) {
      assert.match(svg, /animation:sig 14s linear infinite/, name);
      assert.match(svg, /@media \(prefers-reduced-motion:reduce\)\{\.sig\{animation:none\}\}/, name);
    } else {
      assert.doesNotMatch(svg, /animation|@keyframes/, name);
    }
  }
});

test('the name, J1 and its label, DISP1 with the pixel avatar, on each board', () => {
  for (const [name, svg, , t] of banners()) {
    assert.match(svg, />ANTHONY · FRONT-END</, name);
    assert.match(svg, />k0t3i\.github\.io</, name);
    assert.match(svg, />DISP1 · avatar</, name);
    assert.match(svg, /<image class="avatar"[^>]* width="192" height="192"[^>]* href="data:image\/png;base64,iVBORw0KGgo/, name);
    assert.match(svg, /\.avatar\{[^}]*image-rendering:pixelated/, name);
    assert.ok(svg.includes(`fill="${t.mask}"`), name);
    // The current: four signals, unseen at rest.
    assert.equal(svg.match(/<path class="sig/g).length, 4, name);
  }
});
