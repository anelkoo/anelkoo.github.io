# anelkoo.github.io

My personal website: one page with HTML, CSS and plain JavaScript, no build step.

- `index.html`, `style.css`, `script.js`: the page. The English and German text is in `script.js` (the `T` object).
- `scripts/update-data.mjs` writes `data.json` from the GitHub API, plus Spotify and Steam when their secrets are set.
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

## Music, games and Discord (optional)

Each of these sections stays hidden until its setup is done. Add the secrets the same way as `STATS_TOKEN`, then run the workflow again.

### Spotify

1. Go to https://developer.spotify.com/dashboard and create an app. Set the redirect URI to `http://127.0.0.1:8888/callback` and tick **Web API**. Spotify only allows this for accounts with Premium.
2. Copy the app's client ID and client secret, then run this once in PowerShell:

   ```powershell
   $env:SPOTIFY_CLIENT_ID='paste-id'; $env:SPOTIFY_CLIENT_SECRET='paste-secret'; node scripts/spotify-auth.mjs
   ```

   Open the link it prints and allow access. The terminal then shows your refresh token.
3. Add three secrets: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` and `SPOTIFY_REFRESH_TOKEN`.

The refresh token only works for 180 days. After that the Music section disappears and the workflow log shows a "Spotify skipped" warning. Run `spotify-auth.mjs` again and replace the `SPOTIFY_REFRESH_TOKEN` secret.

Spotify no longer sends genres for some apps. If it sends none, the genre card stays hidden.

### Steam

1. Get a key at https://steamcommunity.com/dev/apikey (any domain name works).
2. Find your 64-bit Steam ID (the 17-digit number) at https://steamid.io.
3. In Steam, open **Edit Profile → Privacy Settings** and set **My profile** and **Game details** to **Public**.
4. Add the secrets `STEAM_KEY` and `STEAM_ID`.
5. Optional: add a `HIDE_GAMES` secret with game names separated by commas, for example `Game One, Game Two`. Those games never show up on the site. It's a secret so the list doesn't end up in this public repo.

The workflow asks Steam about achievements for every game you've played, so it takes longer with a big library.

### Discord

1. Join the Lanyard server at https://discord.gg/lanyard so it can see your status.
2. In Discord, turn on **Settings → Advanced → Developer Mode**, right-click your name and pick **Copy User ID**.
3. Paste that ID into `DISCORD_ID` near the top of `script.js` and push.

The status comes straight from Discord in the visitor's browser, so `HIDE_GAMES` doesn't apply to it. To hide a game there, open **Settings → Activity Privacy** in Discord and turn off activity sharing, or turn it off for that game under **Registered Games**.

### Timeline

The timeline entries are in `TIMELINE` near the top of `script.js`, newest first, in English and German.
