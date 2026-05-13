'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { Issuer, generators } = require('openid-client');

const DATA_DIR = process.env.CLOUDRON_DATA_DIR || '/app/data';
const STATIC_DIR = process.env.STATIC_DIR || '/app/code/dist';
const ENV_FILE = path.join(DATA_DIR, 'app.env');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');
const PORT = parseInt(process.env.PORT || '3000', 10);

function loadDataEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const out = {};
  for (const raw of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

function resolveSessionSecret(dataEnvValue) {
  if (dataEnvValue) return dataEnvValue;
  if (fs.existsSync(SECRET_FILE)) return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  const generated = crypto.randomBytes(48).toString('base64');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

async function buildOidcClient(appOrigin) {
  const discoveryUrl = process.env.CLOUDRON_OIDC_DISCOVERY_URL;
  const issuerUrl = process.env.CLOUDRON_OIDC_ISSUER;
  const clientId = process.env.CLOUDRON_OIDC_CLIENT_ID;
  const clientSecret = process.env.CLOUDRON_OIDC_CLIENT_SECRET;

  if (!clientId || !clientSecret || (!discoveryUrl && !issuerUrl)) {
    throw new Error(
      'AUTH_ENABLED=true but CLOUDRON_OIDC_* env vars are missing. ' +
      'Ensure the oidc addon is provisioned for this app.'
    );
  }

  const issuer = discoveryUrl
    ? await Issuer.discover(discoveryUrl)
    : await Issuer.discover(issuerUrl);

  return new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [new URL('/auth/openid/callback', appOrigin).toString()],
    response_types: ['code']
  });
}

function parseAllowedUsers(raw) {
  if (!raw) return null;
  const list = raw.split(',').map((s) => { return s.trim().toLowerCase(); }).filter(Boolean);
  return list.length ? new Set(list) : null;
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });

  const dataEnv = loadDataEnv();
  const authEnabled = (dataEnv.AUTH_ENABLED || 'false').toLowerCase() === 'true';
  const allowedUsers = parseAllowedUsers(dataEnv.ALLOWED_USERS);
  const sessionSecret = resolveSessionSecret(dataEnv.SESSION_SECRET);
  const appOrigin = process.env.CLOUDRON_APP_ORIGIN || `http://localhost:${PORT}`;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.get('/healthz', (req, res) => { return res.type('text/plain').send('ok'); });

  if (!authEnabled) {
    console.log('[isoflow] AUTH_ENABLED=false — serving publicly without authentication.');
    serveStatic(app);
    return listen(app);
  }

  console.log('[isoflow] AUTH_ENABLED=true — gating all routes behind Cloudron OIDC.');

  const client = await buildOidcClient(appOrigin);

  app.use(session({
    store: new FileStore({ path: SESSIONS_DIR, retries: 1, ttl: 60 * 60 * 24 * 7 }),
    secret: sessionSecret,
    name: 'isoflow.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: appOrigin.startsWith('https://'),
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }));

  app.get('/auth/login', (req, res) => {
    const state = generators.state();
    const nonce = generators.nonce();
    req.session.oidcState = state;
    req.session.oidcNonce = nonce;
    req.session.returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
    const url = client.authorizationUrl({
      scope: 'openid profile email',
      state,
      nonce
    });
    res.redirect(url);
  });

  app.get('/auth/openid/callback', async (req, res) => {
    try {
      const params = client.callbackParams(req);
      const { oidcState: state, oidcNonce: nonce, returnTo } = req.session || {};
      const tokenSet = await client.callback(
        new URL('/auth/openid/callback', appOrigin).toString(),
        params,
        { state, nonce }
      );
      const userInfo = await client.userinfo(tokenSet.access_token);
      const username = (userInfo.preferred_username || userInfo.username || userInfo.email || userInfo.sub || '').toLowerCase();

      if (allowedUsers && !allowedUsers.has(username)) {
        req.session.destroy(() => {});
        return res.status(403).type('text/plain').send(`User "${username}" is not in ALLOWED_USERS.`);
      }

      req.session.user = {
        sub: userInfo.sub,
        username,
        email: userInfo.email || null,
        name: userInfo.name || userInfo.preferred_username || username
      };
      delete req.session.oidcState;
      delete req.session.oidcNonce;
      const dest = typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/';
      res.redirect(dest);
    } catch (err) {
      console.error('[isoflow] OIDC callback failed:', err.message);
      res.status(500).type('text/plain').send('Authentication failed. Check the server logs.');
    }
  });

  app.get('/auth/logout', (req, res) => {
    const done = () => {
      try {
        const endSessionUrl = client.endSessionUrl({
          post_logout_redirect_uri: new URL('/', appOrigin).toString()
        });
        return res.redirect(endSessionUrl);
      } catch (_) {
        return res.redirect('/');
      }
    };
    if (req.session) req.session.destroy(done);
    else done();
  });

  app.get('/auth/whoami', (req, res) => {
    if (req.session && req.session.user) return res.json(req.session.user);
    return res.status(401).type('text/plain').send('Not authenticated.');
  });

  app.use((req, res, next) => {
    if (req.session && req.session.user) return next();
    if (req.path.startsWith('/auth/')) return next();
    const returnTo = encodeURIComponent(req.originalUrl || '/');
    return res.redirect(`/auth/login?returnTo=${returnTo}`);
  });

  serveStatic(app);
  return listen(app);
}

function serveStatic(app) {
  app.use(express.static(STATIC_DIR, {
    index: 'index.html',
    maxAge: '1h',
    fallthrough: true
  }));
  app.get('*', (req, res) => { return res.sendFile(path.join(STATIC_DIR, 'index.html')); });
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`[isoflow] listening on :${PORT}, serving ${STATIC_DIR}`);
      resolve(server);
    });
  });
}

main().catch((err) => {
  console.error('[isoflow] fatal:', err);
  process.exit(1);
});
