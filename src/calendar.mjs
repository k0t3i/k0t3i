/**
 * The contribution calendar of a GitHub user, as the GraphQL API gives it, reduced to what the board
 * draws: one entry a day, its week (a column), its weekday (a row, Sunday first) and a level 0 to 4.
 */

export const CALENDAR_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionCount contributionLevel } }
      }
    }
  }
}`;

/** GitHub's own buckets of a day, from none to the busiest quarter. */
export const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

/**
 * The level of a day from its count alone, for data without GitHub's buckets: the quartiles of the
 * days with at least one contribution, as GitHub does.
 */
export function levelsFromCounts(counts) {
  const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (active.length === 0) return counts.map(() => 0);
  const q = (p) => active[Math.min(active.length - 1, Math.floor(p * active.length))];
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return counts.map((c) => (c <= 0 ? 0 : c < q1 ? 1 : c < q2 ? 2 : c < q3 ? 3 : 4));
}

/**
 * The GraphQL answer (with or without its `data` envelope) -> { total, days }, each day being
 * { date, week, weekday, count, level }. Throws on an answer it cannot read.
 */
export function parseCalendar(answer) {
  if (answer?.errors?.length) throw new Error(`GraphQL: ${answer.errors.map((e) => e.message).join('; ')}`);
  const cal = (answer?.data ?? answer)?.user?.contributionsCollection?.contributionCalendar;
  if (!cal || !Array.isArray(cal.weeks)) throw new Error('No contribution calendar in the answer');

  const days = cal.weeks.flatMap((w, week) =>
    (w.contributionDays ?? []).map((d) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6) {
        throw new Error(`Bad day: ${JSON.stringify(d)}`);
      }
      return { date: d.date, week, weekday: d.weekday, count: Math.max(0, d.contributionCount | 0), level: LEVELS[d.contributionLevel] };
    }),
  );
  if (days.some((d) => d.level === undefined)) {
    const levels = levelsFromCounts(days.map((d) => d.count));
    days.forEach((d, i) => {
      d.level = levels[i];
    });
  }
  // A day with contributions is never drawn as an empty pad, whatever its bucket says.
  for (const d of days) if (d.count > 0 && d.level === 0) d.level = 1;

  const total = Number.isInteger(cal.totalContributions) ? cal.totalContributions : days.reduce((s, d) => s + d.count, 0);
  return { total, weeks: cal.weeks.length, days };
}
