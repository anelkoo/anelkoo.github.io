// Builds data.json for the site from the GitHub API.
// With GH_TOKEN set (in the Action), private repos count toward the totals and languages.
// Private repo names never leave this script: only public repos go into "projects".
import { writeFileSync } from 'node:fs';
import assert from 'node:assert';

const USER = 'anelkoo';
const token = process.env.GH_TOKEN;
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'personal-site-stats',
  ...(token && { Authorization: `Bearer ${token}` }),
};

async function gh(path, init) {
  const res = await fetch(`https://api.github.com${path}`, { headers, ...init });
  if (!res.ok) throw new Error(`GitHub API ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
}

const user = await gh(`/users/${USER}`);
// shortcut: one page of 100 repos, add pagination if you ever own more than 100
const repos = (token
  ? await gh('/user/repos?affiliation=owner&per_page=100')
  : await gh(`/users/${USER}/repos?type=owner&per_page=100`)
).filter((r) => !r.fork);

const bytes = {};
for (const r of repos) {
  const langs = await gh(`/repos/${r.full_name}/languages`);
  for (const [lang, n] of Object.entries(langs)) bytes[lang] = (bytes[lang] || 0) + n;
}
const total = Object.values(bytes).reduce((a, b) => a + b, 0);
const sorted = Object.entries(bytes).sort((a, b) => b[1] - a[1]);
const top = sorted.slice(0, 7);
const rest = sorted.slice(7).reduce((a, [, n]) => a + n, 0);
if (rest) top.push(['Other', rest]);
const languages = top.map(([name, n]) => ({ name, percent: +((n / total) * 100).toFixed(1) }));

// Lines added/deleted and commits by me, from each repo's contributor stats (default branch only).
// Used instead of GitHub's contribution calendar, which leaves out most private work.
// GitHub computes these lazily and answers 202 until ready, so retry a few times.
async function contributorStats(repo) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`https://api.github.com/repos/${repo}/stats/contributors`, { headers });
    if (res.status === 200) return res.json();
    if (res.status === 204) return [];
    if (res.status !== 202) throw new Error(`GitHub API ${res.status} on stats for ${repo}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.warn(`stats for ${repo} not ready, skipped`);
  return [];
}
const WEEK = 7 * 864e5;
const now = Date.now();
const firstWeek = now - 52 * WEEK; // last 52 weeks, oldest first
const code = { added: 0, deleted: 0, commits: 0 };
const perYear = {};
const weeks = Array(52).fill(0);
for (const r of repos) {
  const me = (await contributorStats(r.full_name)).find((s) => s.author?.login?.toLowerCase() === USER);
  for (const w of me?.weeks || []) {
    code.added += w.a; code.deleted += w.d; code.commits += w.c;
    if (!w.c) continue;
    const t = w.w * 1000;
    perYear[new Date(t).getUTCFullYear()] = (perYear[new Date(t).getUTCFullYear()] || 0) + w.c;
    const i = Math.floor((t - firstWeek) / WEEK);
    if (i >= 0 && i < 52) weeks[i] += w.c;
  }
}
const years = [];
for (let y = new Date(user.created_at).getUTCFullYear(); y <= new Date(now).getUTCFullYear(); y++) years.push({ year: y, commits: perYear[y] || 0 });
const activity = { start: new Date(firstWeek).toISOString().slice(0, 10), weeks };

const pub = repos.filter((r) => !r.private);
const projects = pub
  .filter((r) => r.name.toLowerCase() !== USER) // skip the profile README repo
  .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
  .slice(0, 6)
  .map((r) => ({
    name: r.name,
    description: r.description,
    url: r.html_url,
    homepage: r.homepage || null,
    language: r.language,
    stars: r.stargazers_count,
  }));

const out = {
  updated: new Date().toISOString(),
  name: user.name || user.login,
  avatar: user.avatar_url,
  url: user.html_url,
  repos: repos.length,
  privateRepos: repos.length - pub.length,
  stars: repos.reduce((a, r) => a + r.stargazers_count, 0),
  followers: user.followers,
  since: user.created_at,
  code,
  years,
  activity,
  languages,
  projects,
};

if (total) assert(Math.abs(languages.reduce((a, l) => a + l.percent, 0) - 100) < 1, 'language percents must add up to 100');
assert(years.reduce((a, y) => a + y.commits, 0) <= code.commits, 'yearly commits cannot exceed the total');
assert(weeks.reduce((a, b) => a + b, 0) <= code.commits, 'weekly commits cannot exceed the total');
assert(projects.every((p) => pub.some((r) => r.html_url === p.url)), 'only public repos may be listed');

writeFileSync(new URL('../data.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`data.json: ${out.repos} repos (${out.privateRepos} private), ${languages.length} languages, ${projects.length} projects`);
