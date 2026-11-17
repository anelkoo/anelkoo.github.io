// One-time helper: prints the refresh token for the SPOTIFY_REFRESH_TOKEN secret.
// Needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET set, see README.
import { createServer } from 'node:http';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) throw new Error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.');
const redirect = 'http://127.0.0.1:8888/callback';

const server = createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code');
  if (!code) return res.end('No code in the URL. Open the link from the terminal again.');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  });
  const body = await r.json();
  res.end(body.refresh_token ? 'Done. Go back to the terminal.' : 'That failed. The terminal shows why.');
  console.log(body.refresh_token ? `\nYour SPOTIFY_REFRESH_TOKEN:\n\n${body.refresh_token}\n` : body);
  server.close();
}).listen(8888, '127.0.0.1');

console.log('Open this link, log in and allow access:\n\nhttps://accounts.spotify.com/authorize?' + new URLSearchParams({
  client_id: id, response_type: 'code', redirect_uri: redirect, scope: 'user-top-read user-read-recently-played',
}));
