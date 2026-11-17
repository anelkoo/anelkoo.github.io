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

// Spotify and Steam run only when their secrets are set. A failure there skips that section
// with a warning instead of failing the whole deploy.
const env = process.env;
async function optional(name, fn) {
  try { return await fn(); } catch (e) { console.warn(`::warning::${name} skipped: ${e.message}`); return null; }
}
async function getJSON(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} on ${url.split('?')[0]}`); // no query string: it holds the Steam key
  return res.json();
}

const music = env.SPOTIFY_REFRESH_TOKEN ? await optional('Spotify', async () => {
  const { access_token } = await getJSON('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64') },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN }),
  });
  const sp = (path) => getJSON(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${access_token}` } });
  const [tracks, artists, recent] = await Promise.all([
    sp('/me/top/tracks?time_range=short_term&limit=10'),
    sp('/me/top/artists?time_range=short_term&limit=50'), // 50 so the genre counts mean something
    sp('/me/player/recently-played?limit=10'),
  ]);
  const img = (images) => (images?.at(-2) || images?.[0])?.url || null; // images come widest first; the middle one is ~300px
  const track = (t) => ({ name: t.name, artist: t.artists.map((a) => a.name).join(', '), url: t.external_urls.spotify, image: img(t.album.images) });
  const counts = {};
  for (const a of artists.items) for (const g of a.genres || []) counts[g] = (counts[g] || 0) + 1;
  return {
    tracks: tracks.items.map(track),
    artists: artists.items.slice(0, 10).map((a) => ({ name: a.name, url: a.external_urls.spotify, image: img(a.images) })),
    recent: recent.items.map((i) => ({ ...track(i.track), at: i.played_at })),
    genres: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, artists: n })),
    artistCount: artists.items.length,
  };
}) : null;

// HIDE_GAMES is a secret (comma-separated names) so the list itself never shows up in the public repo.
const hide = new Set((env.HIDE_GAMES || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
const games = env.STEAM_KEY && env.STEAM_ID ? await optional('Steam', async () => {
  const steam = (path, q) => getJSON(`https://api.steampowered.com/${path}/?${new URLSearchParams({ key: env.STEAM_KEY, steamid: env.STEAM_ID, ...q })}`);
  const owned = (await steam('IPlayerService/GetOwnedGames/v1', { include_appinfo: 1, include_played_free_games: 1 })).response.games;
  if (!owned) throw new Error('no games returned. Set Steam profile and "Game details" to Public');
  const all = owned.filter((g) => !hide.has(g.name.toLowerCase()));
  const played = all.filter((g) => g.playtime_forever > 0).sort((a, b) => b.playtime_forever - a.playtime_forever);
  const hours = (min) => Math.round(min / 6) / 10;
  const game = (g) => ({ appid: g.appid, name: g.name, icon: g.img_icon_url, hours: hours(g.playtime_forever) });
  // One call per played game. Games without achievements answer with an error, which counts as none.
  const ach = [];
  for (let i = 0; i < played.length; i += 10) {
    ach.push(...await Promise.all(played.slice(i, i + 10).map(async (g) => {
      const list = await steam('ISteamUserStats/GetPlayerAchievements/v1', { appid: g.appid }).then((r) => r.playerstats?.achievements || [], () => []);
      return { ...game(g), done: list.filter((a) => a.achieved).length, total: list.length };
    })));
  }
  return {
    count: all.length,
    hours: Math.round(played.reduce((a, g) => a + g.playtime_forever, 0) / 60),
    recent: all.filter((g) => g.playtime_2weeks).sort((a, b) => b.playtime_2weeks - a.playtime_2weeks).slice(0, 6)
      .map((g) => ({ ...game(g), recent: hours(g.playtime_2weeks) })),
    top: played.slice(0, 8).map(game),
    achievements: ach.filter((g) => g.total).slice(0, 5), // the 5 most played games that have achievements
    unlocked: ach.reduce((a, g) => a + g.done, 0),
    perfect: ach.filter((g) => g.total && g.done === g.total).map(({ appid, name, icon }) => ({ appid, name, icon })),
  };
}) : null;

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
  music,
  games,
};

if (music) assert(music.genres.every((g) => g.artists <= music.artistCount), 'a genre cannot have more artists than were fetched');
if (games) {
  const shown = [...games.recent, ...games.top, ...games.achievements, ...games.perfect];
  assert(shown.every((g) => !hide.has(g.name.toLowerCase())), 'hidden games must never be listed');
  assert(games.achievements.every((g) => g.done <= g.total), 'unlocked achievements cannot exceed the total');
}

if (total) assert(Math.abs(languages.reduce((a, l) => a + l.percent, 0) - 100) < 1, 'language percents must add up to 100');
assert(years.reduce((a, y) => a + y.commits, 0) <= code.commits, 'yearly commits cannot exceed the total');
assert(weeks.reduce((a, b) => a + b, 0) <= code.commits, 'weekly commits cannot exceed the total');
assert(projects.every((p) => pub.some((r) => r.html_url === p.url)), 'only public repos may be listed');

writeFileSync(new URL('../data.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`data.json: ${out.repos} repos (${out.privateRepos} private), ${languages.length} languages, ${projects.length} projects`);
