import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { levelsFromCounts, parseCalendar } from '../src/calendar.mjs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

test('reads the GraphQL answer: weeks, weekdays and GitHub levels', () => {
  const cal = parseCalendar(fixture('calendar.json'));
  assert.equal(cal.total, 26);
  assert.equal(cal.weeks, 4);
  assert.equal(cal.days.length, 28);
  assert.deepEqual(cal.days[0], { date: '2026-01-04', week: 0, weekday: 0, count: 1, level: 1 });
  const active = cal.days.filter((d) => d.level > 0).map((d) => [d.week, d.weekday, d.level]);
  assert.deepEqual(active, [[0, 0, 1], [0, 3, 2], [2, 1, 4], [2, 6, 3], [3, 2, 1]]);
});

test('reads an answer without its data envelope', () => {
  const cal = parseCalendar(fixture('calendar.json').data);
  assert.equal(cal.days.length, 28);
});

test('levels from counts when GitHub gives none: quartiles of the active days', () => {
  assert.deepEqual(levelsFromCounts([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(levelsFromCounts([0, 1, 2, 3, 4, 0]), [0, 1, 2, 3, 4, 0]);
  const levels = levelsFromCounts([0, 1, 1, 1, 1, 50]);
  assert.equal(levels[0], 0);
  assert.equal(levels[5], 4);
  assert.ok(levels.every((l, i) => (i === 0 ? l === 0 : l >= 1 && l <= 4)));

  const cal = parseCalendar(fixture('year.json'));
  assert.ok(cal.days.every((d) => (d.count === 0 ? d.level === 0 : d.level >= 1 && d.level <= 4)));
  for (const l of [1, 2, 3, 4]) assert.ok(cal.days.some((d) => d.level === l), `level ${l} is used`);
});

test('a busier day is never on a lower level', () => {
  const { days } = parseCalendar(fixture('year.json'));
  const active = days.filter((d) => d.count > 0).sort((a, b) => a.count - b.count);
  active.forEach((d, i) => {
    if (i) assert.ok(d.level >= active[i - 1].level);
  });
});

test('refuses an answer it cannot read', () => {
  assert.throws(() => parseCalendar({ errors: [{ message: 'Bad credentials' }] }), /Bad credentials/);
  assert.throws(() => parseCalendar({ data: { user: null } }), /No contribution calendar/);
  const bad = { user: { contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: [{ date: 'x', weekday: 0 }] }] } } } };
  assert.throws(() => parseCalendar(bad), /Bad day/);
});
