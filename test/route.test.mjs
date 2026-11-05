import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCalendar } from '../src/calendar.mjs';
import { layout } from '../src/layout.mjs';
import { isOctilinear, route, routeOrder, segment } from '../src/route.mjs';

const pads = (name) => layout(parseCalendar(JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')))).pads;
const cells = (list) => list.map((p) => [p.col, p.row]);

test('the routing order: column after column, each from the end nearest the net', () => {
  // Week 0: Sun, Wed. Week 2: Mon, Sat (the net comes from Wed, nearer Mon). Week 3: Tue.
  assert.deepEqual(cells(routeOrder(pads('calendar.json'))), [[0, 0], [0, 3], [2, 1], [2, 6], [3, 2]]);
});

test('a column is run upwards when the net arrives nearer its bottom', () => {
  const order = routeOrder([
    { col: 0, row: 6, level: 1 },
    { col: 0, row: 1, level: 1 },
    { col: 1, row: 0, level: 2 },
    { col: 1, row: 5, level: 2 },
    { col: 1, row: 2, level: 0 },
  ]);
  assert.deepEqual(cells(order), [[0, 1], [0, 6], [1, 5], [1, 0]]);
});

test('empty days are not on the net; no active day, no net', () => {
  assert.deepEqual(route(pads('calendar.json').map((p) => ({ ...p, level: 0 }))), { order: [], points: [], length: 0, at: [] });
});

test('segments keep to 0°, 45° and 90°', () => {
  const a = { col: 0, row: 3 };
  assert.deepEqual(cells(segment(a, { col: 2, row: 1 })), [[2, 1]]); // a pure 45°
  assert.deepEqual(cells(segment(a, { col: 0, row: 6 })), [[0, 6]]); // straight down
  assert.deepEqual(cells(segment(a, { col: 6, row: 1 })), [[2, 3], [4, 1], [6, 1]]); // chamfer in the middle
  assert.deepEqual(cells(segment(a, { col: 1, row: 0 })), [[1, 2], [1, 0]]); // 45° out, then up the column
  assert.deepEqual(cells(segment(a, { col: 3, row: 2 })), [[1, 3], [2, 2], [3, 2]]);
  assert.deepEqual(cells(segment(a, { col: 2, row: 2 })), [[0.5, 3], [1.5, 2], [2, 2]]); // half-cell runs
  for (let col = 0; col < 8; col++) {
    for (let row = 0; row < 7; row++) assert.ok(isOctilinear([a, ...segment(a, { col, row })]), `${col},${row}`);
  }
});

test('the net passes every active pad, in order, and only bends at 0°, 45° and 90°', () => {
  for (const name of ['calendar.json', 'year.json']) {
    const all = pads(name);
    const net = route(all);
    assert.equal(net.order.length, all.filter((p) => p.level > 0).length);
    assert.ok(isOctilinear(net.points));
    assert.deepEqual(net.points[0], { col: net.order[0].col, row: net.order[0].row });
    assert.deepEqual(net.points.at(-1), { col: net.order.at(-1).col, row: net.order.at(-1).row });
    // Each pad is reached once, further along the net than the one before.
    assert.equal(net.at[0], 0);
    assert.equal(net.at.at(-1), 1);
    net.at.forEach((v, i) => {
      if (i) assert.ok(v > net.at[i - 1]);
    });
  }
});

test('the length of the sample net', () => {
  const net = route(pads('calendar.json'));
  assert.deepEqual(cells(net.points), [[0, 0], [0, 3], [2, 1], [2, 6], [3, 5], [3, 2]]);
  assert.ok(Math.abs(net.length - (11 + 3 * Math.SQRT2)) < 1e-9);
});
