/**
 * The route of the « Routage » board: one gold net through every active day, drawn like a trace on
 * a circuit board, only at 0°, 45° and 90°. Grid units: a column is a week, a row a weekday.
 */

/**
 * The order the net visits the active pads (level > 0): column after column, left to right; in each
 * column, from the end nearest to where the net comes from, so it runs up one week and down the next
 * as the data allows. The first column starts at the top.
 */
export function routeOrder(pads) {
  const byCol = new Map();
  for (const p of pads) {
    if (p.level > 0) byCol.set(p.col, [...(byCol.get(p.col) ?? []), p]);
  }
  const order = [];
  let row = 0;
  for (const col of [...byCol.keys()].sort((a, b) => a - b)) {
    const run = byCol.get(col).sort((a, b) => a.row - b.row);
    const top = run[0].row;
    const bottom = run.at(-1).row;
    if (Math.abs(row - bottom) < Math.abs(row - top)) run.reverse();
    order.push(...run);
    row = run.at(-1).row;
  }
  return order;
}

/**
 * The bends from a to b ({ col, row }), b included, a not.
 * - Same column or row: straight.
 * - Wider than tall: straight, a 45° chamfer in the middle, straight: the run across weeks.
 * - Taller than wide: the 45° first, out of the column it leaves, then straight down the column of b.
 */
export function segment(a, b) {
  const dx = b.col - a.col;
  const dy = b.row - a.row;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const pts = [];
  if (ax !== 0 && ay !== 0) {
    if (ax >= ay) {
      const h = (ax - ay) / 2;
      pts.push({ col: a.col + sx * h, row: a.row }, { col: a.col + sx * (h + ay), row: b.row });
    } else {
      pts.push({ col: b.col, row: a.row + sy * ax });
    }
  }
  pts.push({ col: b.col, row: b.row });
  // No zero-length step (a chamfer of nothing, a bend on b itself).
  return pts.filter((p, i) => {
    const prev = i === 0 ? a : pts[i - 1];
    return p.col !== prev.col || p.row !== prev.row;
  });
}

const dist = (a, b) => Math.hypot(b.col - a.col, b.row - a.row);

/**
 * The whole net: its bends (the first pad first), its length, and where each pad sits along it
 * (0 at the first pad, 1 at the last), so each can light up as the signal reaches it.
 */
export function route(pads) {
  const order = routeOrder(pads);
  if (order.length === 0) return { order, points: [], length: 0, at: [] };
  const points = [{ col: order[0].col, row: order[0].row }];
  const reach = [0];
  let length = 0;
  for (let i = 1; i < order.length; i++) {
    for (const p of segment(order[i - 1], order[i])) {
      length += dist(points.at(-1), p);
      points.push(p);
    }
    reach.push(length);
  }
  return { order, points: simplify(points), length, at: reach.map((r) => (length ? r / length : 0)) };
}

/** Bends only: a point in the middle of a straight run goes. */
function simplify(points) {
  return points.filter((p, i) => {
    if (i === 0 || i === points.length - 1) return true;
    const a = points[i - 1];
    const b = points[i + 1];
    const [ux, uy, vx, vy] = [p.col - a.col, p.row - a.row, b.col - p.col, b.row - p.row];
    // Kept unless the run goes on the same way (a U-turn is a bend too).
    return ux * vy !== uy * vx || ux * vx + uy * vy <= 0;
  });
}

/** A route keeps to 0°, 45° and 90°: true when every step of `points` does. */
export function isOctilinear(points) {
  return points.every((p, i) => {
    if (i === 0) return true;
    const dx = Math.abs(p.col - points[i - 1].col);
    const dy = Math.abs(p.row - points[i - 1].row);
    return dx === 0 || dy === 0 || dx === dy;
  });
}
