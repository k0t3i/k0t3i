import { CALENDAR_QUERY } from './calendar.mjs';

const API = 'https://api.github.com';

async function call(url, token, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'k0t3i-profile-board',
      'x-github-api-version': '2022-11-28',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

/** The public contribution calendar of `login` (GraphQL: a token is required, the workflow's GITHUB_TOKEN will do). */
export function fetchCalendar(login, token) {
  if (!token) throw new Error('GITHUB_TOKEN is required to read the contribution calendar');
  return call(`${API}/graphql`, token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: CALENDAR_QUERY, variables: { login } }),
  });
}

/** The date of the last commit on `branch` of the public repository `repo` ("owner/name"). */
export async function fetchLastCommitDate(repo, branch, token) {
  const commit = await call(`${API}/repos/${repo}/commits/${encodeURIComponent(branch)}`, token);
  const date = commit?.commit?.committer?.date ?? commit?.commit?.author?.date;
  if (!date) throw new Error(`No commit date for ${repo}@${branch}`);
  return date;
}
