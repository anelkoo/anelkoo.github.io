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

let commitsYear = null;
if (token) {
  const q = '{ viewer { contributionsCollection { totalCommitContributions restrictedContributionsCount } } }';
  const { data } = await gh('/graphql', { method: 'POST', body: JSON.stringify({ query: q }) });
  const c = data.viewer.contributionsCollection;
  commitsYear = c.totalCommitContributions + c.restrictedContributionsCount;
}

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
  commitsYear,
  languages,
  projects,
};

if (total) assert(Math.abs(languages.reduce((a, l) => a + l.percent, 0) - 100) < 1, 'language percents must add up to 100');
assert(projects.every((p) => pub.some((r) => r.html_url === p.url)), 'only public repos may be listed');

writeFileSync(new URL('../data.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`data.json: ${out.repos} repos (${out.privateRepos} private), ${languages.length} languages, ${projects.length} projects`);
