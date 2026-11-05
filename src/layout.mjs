/**
 * Where each day of the calendar sits on the board: a pad on a square grid, a column a week (oldest
 * on the left), a row a weekday (Sunday on top), centred across the width; and the month labels.
 */

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Columns a month label needs, so two labels never run into each other. */
const LABEL_COLS = 3;

export function layout(cal, { width = 1280, pitch = 22, top = 104 } = {}) {
  const cols = Math.max(1, cal.weeks);
  const x0 = (width - (cols - 1) * pitch) / 2;
  const pads = cal.days.map((d) => ({ ...d, col: d.week, row: d.weekday, x: x0 + d.week * pitch, y: top + d.weekday * pitch }));

  // A label over the first week of each month (the week of its first Sunday), the first one only if there is room.
  const first = new Map();
  for (const d of cal.days) if (!first.has(d.week)) first.set(d.week, d);
  const marks = [];
  let month = null;
  for (const [week, d] of [...first.entries()].sort((a, b) => a[0] - b[0])) {
    const m = Number(d.date.slice(5, 7)) - 1;
    if (m !== month) marks.push({ week, label: MONTHS[m] });
    month = m;
  }
  const months = marks
    .filter((mk, i) => !(i === 0 && marks[1] && marks[1].week - mk.week < LABEL_COLS))
    .map((mk) => ({ ...mk, x: x0 + mk.week * pitch - pitch / 2 + 2 }));

  return { pads, months, x0, top, pitch, cols, width, bottom: top + 6 * pitch };
}

/** Grid units ({ col, row }) -> board units. */
export const toBoard = (g, p) => ({ x: g.x0 + p.col * g.pitch, y: g.top + p.row * g.pitch });
