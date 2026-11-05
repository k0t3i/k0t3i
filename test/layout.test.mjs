import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCalendar } from '../src/calendar.mjs';
import { layout, toBoard } from '../src/layout.mjs';

const fixture = (name) => parseCalendar(JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')));

test('a pad a day: the week is the column, the weekday the row, on a square pitch', () => {
  const g = layout(fixture('calendar.json'), { width: 1280, pitch: 22, top: 100 });
  assert.equal(g.pads.length, 28);
  const p = g.pads.find((d) => d.date === '2026-01-20'); // week 2, Tuesday
  assert.equal(p.col, 2);
  assert.equal(p.row, 2);
  assert.equal(p.x - g.x0, 2 * 22);
  assert.equal(p.y, 100 + 2 * 22);
  assert.deepEqual(toBoard(g, { col: 2, row: 2 }), { x: p.x, y: p.y });
});

test('the grid is centred across the board', () => {
  const g = layout(fixture('year.json'), { width: 1280, pitch: 22 });
  assert.equal(g.cols, 53);
  const xs = g.pads.map((p) => p.x);
  assert.equal(Math.min(...xs) + Math.max(...xs), 1280);
});

test('one label a month, over the week its first Sunday falls in, never two too close', () => {
  const g = layout(fixture('year.json'));
  const labels = g.months.map((m) => m.label);
  assert.deepEqual(labels.slice(0, 3), ['NOV', 'DEC', 'JAN']);
  assert.equal(labels.at(-1), 'NOV');
  assert.equal(new Set(labels.slice(1, -1)).size, labels.length - 2);
  const dec = g.months.find((m) => m.label === 'DEC');
  assert.equal(g.pads.find((p) => p.week === dec.week && p.weekday === 0).date.slice(0, 7), '2025-12');
  g.months.forEach((m, i) => {
    if (i) assert.ok(m.week - g.months[i - 1].week >= 3);
  });
});
