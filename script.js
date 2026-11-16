const T = {
  en: {
    skip: 'Skip to content',
    'nav.about': 'About', 'nav.projects': 'Projects', 'nav.skills': 'Skills', 'nav.github': 'GitHub', 'nav.contact': 'Contact',
    'hero.title': "Hi, I'm Anel.",
    'hero.lead': 'Student by day, programmer the rest of the time. I build things and put them on GitHub.',
    'hero.github': 'View my GitHub', 'hero.contact': 'Get in touch',
    'about.title': 'About me',
    'about.text': "I'm a student, and most of my free time goes into programming. I like trying new languages and tools, figuring out how things work, and turning ideas into small projects. I work mostly on Linux, in VS Code and Visual Studio.",
    'projects.title': 'Projects', 'projects.sub': 'My public repositories, straight from GitHub.',
    'projects.empty': 'No public projects yet. More are on the way.', 'projects.nodesc': 'No description yet.',
    'skills.title': 'Skills', 'skills.languages': 'Languages', 'skills.tools': 'Tools I use', 'skills.past': 'Used before',
    'github.title': 'On GitHub', 'github.sub': 'Counted across all my repositories, private ones included.',
    'github.repos': 'Repositories', 'github.private': 'private', 'github.commits': 'Commits', 'github.stars': 'Stars',
    'github.added': 'Lines added', 'github.deleted': 'Lines removed', 'github.since': 'On GitHub since', 'github.followers': 'Followers',
    'github.activity': 'Commits per week, last 12 months', 'github.years': 'Commits per year', 'github.languages': 'Languages',
    'github.week': 'Week of', 'github.commitsN': 'commits', 'github.today': 'Today',
    'github.footnote': "Lines and commits are counted on each repo's main branch, so generated and copied files count too.",
    'github.nolangs': 'Language stats appear after the first update.', 'github.updated': 'Updated',
    'github.bar': 'Languages by share of code',
    'contact.title': 'Contact', 'contact.sub': 'Find me here, or send me a message.', 'contact.copy': 'Copy', 'contact.copied': 'Copied',
  },
  de: {
    skip: 'Zum Inhalt springen',
    'nav.about': 'Über mich', 'nav.projects': 'Projekte', 'nav.skills': 'Skills', 'nav.github': 'GitHub', 'nav.contact': 'Kontakt',
    'hero.title': 'Hi, ich bin Anel.',
    'hero.lead': 'Tagsüber Schüler, den Rest der Zeit Programmierer. Ich baue Dinge und stelle sie auf GitHub.',
    'hero.github': 'Mein GitHub', 'hero.contact': 'Kontakt aufnehmen',
    'about.title': 'Über mich',
    'about.text': 'Ich bin Schüler und verbringe den Großteil meiner Freizeit mit Programmieren. Ich probiere gern neue Sprachen und Tools aus, finde heraus, wie Dinge funktionieren, und mache aus Ideen kleine Projekte. Meistens arbeite ich unter Linux, mit VS Code und Visual Studio.',
    'projects.title': 'Projekte', 'projects.sub': 'Meine öffentlichen Repositories, direkt von GitHub.',
    'projects.empty': 'Noch keine öffentlichen Projekte. Es kommen bald welche.', 'projects.nodesc': 'Noch keine Beschreibung.',
    'skills.title': 'Skills', 'skills.languages': 'Sprachen', 'skills.tools': 'Meine Tools', 'skills.past': 'Früher benutzt',
    'github.title': 'Auf GitHub', 'github.sub': 'Über alle meine Repositories gezählt, private eingeschlossen.',
    'github.repos': 'Repositories', 'github.private': 'privat', 'github.commits': 'Commits', 'github.stars': 'Sterne',
    'github.added': 'Zeilen hinzugefügt', 'github.deleted': 'Zeilen gelöscht', 'github.since': 'Auf GitHub seit', 'github.followers': 'Follower',
    'github.activity': 'Commits pro Woche, letzte 12 Monate', 'github.years': 'Commits pro Jahr', 'github.languages': 'Sprachen',
    'github.week': 'Woche vom', 'github.commitsN': 'Commits', 'github.today': 'Heute',
    'github.footnote': 'Zeilen und Commits werden auf dem Hauptbranch jedes Repos gezählt, generierte und kopierte Dateien also mit.',
    'github.nolangs': 'Die Sprachstatistik erscheint nach dem ersten Update.', 'github.updated': 'Aktualisiert',
    'github.bar': 'Sprachen nach Anteil am Code',
    'contact.title': 'Kontakt', 'contact.sub': 'Hier findest du mich, schreib mir gern.', 'contact.copy': 'Kopieren', 'contact.copied': 'Kopiert',
  },
};

// GitHub's own language colors for the common ones
const COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', 'C#': '#178600',
  'C++': '#f34b7d', C: '#555555', HTML: '#e34c26', CSS: '#663399', Go: '#00ADD8', Rust: '#dea584',
  Kotlin: '#A97BFF', Swift: '#F05138', PHP: '#4F5D95', Ruby: '#701516', Shell: '#89e051', Lua: '#000080',
  Dart: '#00B4AB', Vue: '#41b883', Luau: '#00A2FF', Svelte: '#ff3e00', Other: '#8e8e93', PowerShell: '#012456', ShaderLab: '#222c37', HLSL: '#aace60', Batchfile: '#C1F12E',
};
const FALLBACK = ['#ff9f0a', '#30d158', '#bf5af2', '#64d2ff', '#ff375f'];
const color = (name, i) => COLORS[name] || FALLBACK[i % FALLBACK.length];

let lang = 'en';
let data = null;
const $ = (id) => document.getElementById(id);
const t = (k) => T[lang][k];
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

function render() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  if (data) renderData();
}

function renderData() {
  const fmt = new Intl.NumberFormat(lang);

  const projects = $('project-list');
  projects.replaceChildren(...(data.projects.length ? data.projects.map((p) => {
    const meta = el('span', { className: 'meta' });
    if (p.language) meta.append(el('span', {}, el('i', { className: 'dot', style: `background:${color(p.language, 0)}` }), p.language));
    if (p.stars) meta.append(el('span', {}, `★ ${fmt.format(p.stars)}`));
    return el('a', { className: 'card project', href: p.url, target: '_blank', rel: 'noopener' },
      el('strong', {}, p.name), el('p', {}, p.description || t('projects.nodesc')), meta);
  }) : [el('p', { className: 'empty' }, t('projects.empty'))]));

  $('skill-langs').replaceChildren(...data.languages.filter((l) => l.name !== 'Other').map((l) => el('li', {}, l.name)));
  $('skill-langs').hidden = $('skill-langs').previousElementSibling.hidden = !data.languages.length;

  const big = new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 });
  const stats = [
    [fmt.format(data.repos), t('github.repos') + (data.privateRepos ? ` · ${fmt.format(data.privateRepos)} ${t('github.private')}` : '')],
    [fmt.format(data.code.commits), t('github.commits')],
    [big.format(data.code.added), t('github.added')],
    [big.format(data.code.deleted), t('github.deleted')],
    [new Date(data.since).getFullYear(), t('github.since')],
  ];
  if (data.stars) stats.push([fmt.format(data.stars), t('github.stars')]);
  if (data.followers) stats.push([fmt.format(data.followers), t('github.followers')]);
  $('stats').replaceChildren(...stats.map(([n, label]) => el('div', { className: 'stat' }, el('b', {}, n), el('span', {}, label))));

  const day = (d) => d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const start = new Date(data.activity.start + 'T00:00:00');
  const max = Math.max(...data.activity.weeks);
  $('activity-card').hidden = !max;
  const weeks = $('weeks');
  weeks.setAttribute('aria-label', `${t('github.activity')}: ${data.activity.weeks.reduce((a, b) => a + b, 0)} ${t('github.commitsN')}`);
  weeks.replaceChildren(...data.activity.weeks.map((n, i) => el('span', {
    className: n ? 'on' : '',
    style: `height:${(n / max) * 100}%`,
    title: `${t('github.week')} ${day(new Date(start.getTime() + i * 7 * 864e5))}: ${n} ${t('github.commitsN')}`,
  })));
  $('weeks-from').textContent = day(start);
  $('weeks-to').textContent = t('github.today');

  const yMax = Math.max(...data.years.map((y) => y.commits));
  $('years-card').hidden = !yMax;
  $('years').replaceChildren(...data.years.map((y) => el('li', {},
    el('span', {}, y.year), el('i', { style: `width:${(y.commits / yMax) * 100}%` }), el('b', {}, fmt.format(y.commits)))));

  const bar = $('lang-bar');
  bar.hidden = !data.languages.length;
  bar.setAttribute('aria-label', `${t('github.bar')}: ` + data.languages.map((l) => `${l.name} ${l.percent}%`).join(', '));
  bar.replaceChildren(...data.languages.map((l, i) => el('span', { style: `width:${l.percent}%;background:${color(l.name, i)}` })));
  $('lang-legend').replaceChildren(...(data.languages.length
    ? data.languages.map((l, i) => el('li', {}, el('i', { className: 'dot', style: `background:${color(l.name, i)}` }), l.name, el('em', {}, `${fmt.format(l.percent)}%`)))
    : [el('li', { className: 'empty' }, t('github.nolangs'))]));

  $('updated').textContent = `${t('github.updated')}: ${new Date(data.updated).toLocaleDateString(lang, { dateStyle: 'long' })}.`;
}

document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  try { localStorage.setItem('lang', lang); } catch {}
  render();
}));

document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
  const small = b.querySelector('small');
  small.textContent = t('contact.copied');
  setTimeout(() => { small.textContent = t('contact.copy'); }, 1500);
}));

try { lang = localStorage.getItem('lang') || ''; } catch {}
if (!T[lang]) lang = navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
$('year').textContent = new Date().getFullYear();
render();

fetch('data.json', { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((d) => { data = d; renderData(); })
  .catch(() => { $('updated').textContent = t('github.nolangs'); });
