# Cloudron packaging for Isoflow

Builds the upstream Isoflow SPA into a Cloudron community app with an optional Cloudron SSO gate.

## Layout

```
packaging/cloudron/
├── CloudronManifest.json    # app metadata + addons
├── Dockerfile               # multi-stage: build SPA, then Cloudron runtime
├── server.js                # Express host + optional OIDC gate
├── start.sh                 # entrypoint; seeds /app/data/app.env on first boot
├── app.env.example          # default runtime config (AUTH_ENABLED=false)
├── description.md           # rendered in the Cloudron app store
├── postinstall.md           # shown to the admin after install
├── package.json             # server dependencies
└── README.md                # this file
```

The Isoflow SPA itself is built from the repo root (`npm run docker:build`).

## Build & install (Cloudron CLI workflow)

From the repo root:

```bash
cloudron build     # builds image, pushes to your registry
cloudron install   # installs from the registry
cloudron update    # subsequent updates
```

`cloudron build` uses `packaging/cloudron/Dockerfile` because `CloudronManifest.json` is referenced from there. Run all `cloudron` commands with `--manifest packaging/cloudron/CloudronManifest.json` if invoking from the repo root.

## Build & install (manual Docker workflow)

```bash
docker build -t ghcr.io/pronetivity/cloudron-isoflow:v1.2.0 -f packaging/cloudron/Dockerfile .
docker push ghcr.io/pronetivity/cloudron-isoflow:v1.2.0

cloudron install --image ghcr.io/pronetivity/cloudron-isoflow:v1.2.0 \
                 --manifest packaging/cloudron/CloudronManifest.json
```

## Auth toggle

After install the app is **public** by default. To require Cloudron sign-in:

1. Cloudron dashboard → app → Web Terminal.
2. Edit `/app/data/app.env`, set `AUTH_ENABLED=true`. Optionally set `ALLOWED_USERS=alice,bob`.
3. Restart the app.

See [postinstall.md](./postinstall.md) for the user-facing version of these steps.

## Runtime details

| Endpoint                  | Auth | Purpose                                              |
|---------------------------|------|------------------------------------------------------|
| `GET /healthz`            | none | Cloudron health check                                |
| `GET /auth/login`         | none | Starts the OIDC flow (only when `AUTH_ENABLED=true`) |
| `GET /auth/openid/callback` | none | OIDC callback (matches manifest `loginRedirectUri`)   |
| `GET /auth/logout`        | session | Destroys session + provider end-session redirect |
| `GET /auth/whoami`        | session | Returns current user JSON                         |
| `GET /*`                  | gated when `AUTH_ENABLED=true` | Static SPA          |

Sessions are stored on disk under `/app/data/sessions/` (included in Cloudron backups). The `SESSION_SECRET` in `app.env` is auto-generated on first boot if left blank.

## CI

`.github/workflows/cloudron-image.yml` builds and pushes `ghcr.io/<owner>/cloudron-isoflow` on tag pushes (`v*`) and `main`. Tags published: `:vX.Y.Z`, `:latest` (tags only), `:edge` (main).
