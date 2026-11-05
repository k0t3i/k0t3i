import assert from 'node:assert/strict';
import { test } from 'node:test';
import { THEMES } from '../src/palette.mjs';
import { formatHours, isoDay, renderUptime, uptimeHours } from '../src/uptime.mjs';
import { checkSvg } from '../src/xml.mjs';

// The same cases as the site (k0t3i.github.io, src/lib/uptime.ts): the formula is copied from there.
test('uptime: the base hours on the base date, rounded down to the thousand', () => {
  assert.equal(uptimeHours(new Date('2020-03-30')), 34000);
  // One year later: 34880 + 1744 = 36624.
  assert.equal(uptimeHours(new Date('2021-03-30T05:49:12Z')), 36000);
  assert.equal(uptimeHours(new Date('2026-11-05T12:00:00Z')), 46000);
});

test('uptime grows with time, never down', () => {
  let last = 0;
  for (let y = 2020; y <= 2040; y++) {
    const h = uptimeHours(new Date(`${y}-06-01`));
    assert.ok(h >= last);
    assert.equal(h % 1000, 0);
    last = h;
  }
});

test('English formatting and the revision day', () => {
  assert.equal(formatHours(46000), '46,000');
  assert.equal(formatHours(102000), '102,000');
  assert.equal(isoDay('2026-11-05T15:24:28Z'), '2026-11-05');
  assert.equal(isoDay('2026-11-05T23:59:59-02:00'), '2026-11-06');
});

test('the uptime line: the hours of the site and the date of its last commit, on both boards', () => {
  for (const t of Object.values(THEMES)) {
    const svg = renderUptime(t, { now: new Date('2026-11-05T12:00:00Z'), rev: '2026-11-05T15:24:28Z' });
    assert.deepEqual(checkSvg(svg), []);
    assert.ok(Buffer.byteLength(svg) < 60 * 1024);
    assert.match(svg, /<tspan class="dim">uptime: <\/tspan>46,000<tspan class="dim"> h to design, code, debug, lead, teach, learn<\/tspan>/);
    assert.match(svg, />rev\. 2026-11-05</);
    assert.match(svg, /@font-face\{font-family:"JetBrains Mono";/);
    assert.doesNotMatch(svg, /animation/);
    assert.ok(svg.includes(`fill="${t.mask}"`));
  }
});
