# anelkoo.github.io

My personal website: one page with HTML, CSS and plain JavaScript, no build step.

- `index.html`, `style.css`, `script.js`: the page. The English and German text is in `script.js` (the `T` object).
- `scripts/update-data.mjs` writes `data.json` (repos, languages, stats) from the GitHub API.
- `.github/workflows/deploy.yml` reruns that script and deploys the site on every push to `main` and once a day.

## Run it locally

```bash
python -m http.server 8123
```

Then open http://localhost:8123. Running `node scripts/update-data.mjs` refreshes `data.json`, but only with public repos.

## Setup on GitHub (one time)

1. Push this folder to the `anelkoo/anelkoo.github.io` repo on the `main` branch.
2. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. To count private repos, create a token at **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**:
   - Repository access: **All repositories**
   - Permissions: **Metadata: Read-only** (selected by default)
   - Pick an expiration date and write it down, because the stats stop including private repos after the token expires.
4. In the repo, open **Settings → Secrets and variables → Actions**, add a new secret named `STATS_TOKEN` and paste the token in.
5. Under **Actions → Update stats and deploy**, click **Run workflow**.

Private repos count only toward the totals and the language bar. Their names never appear on the site, because only public repos make it into `data.json`.
