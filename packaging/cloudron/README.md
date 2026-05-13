# Cloudron packaging for Isoflow

Builds the upstream Isoflow SPA into a Cloudron community app with an optional Cloudron SSO gate.

## Layout

```
./
├── CloudronManifest.json         # app metadata + addons (at repo root, per Cloudron CLI convention)
├── Dockerfile                    # multi-stage: build SPA, then Cloudron runtime
├── Dockerfile.legacy             # upstream nginx-based standalone build (kept for reference)
└── packaging/cloudron/
    ├── server.js                 # Express host + optional OIDC gate
    ├── start.sh                  # entrypoint; seeds /app/data/app.env on first boot
    ├── app.env.example           # default runtime config (AUTH_ENABLED=false)
    ├── description.md            # rendered in the Cloudron app store
    ├── postinstall.md            # shown to the admin after install
    ├── icon.png                  # 256x256 app icon
    ├── package.json              # Express server dependencies
    └── README.md                 # this file
```

The Isoflow SPA itself is built from the repo root (`npm run docker:build`).

## Build & install (Cloudron CLI workflow)

From the repo root:

```bash
cloudron install --server my.example.com --location isoflow.example.com
cloudron update  --server my.example.com --app isoflow.example.com
```

`cloudron install` uploads the source, builds the image on the Cloudron server using the root `Dockerfile`, and deploys it.

## Build & install (pre-built image)

```bash
docker build -t ghcr.io/pronetivity/cloudron-isoflow:v1.2.0 .
docker push     ghcr.io/pronetivity/cloudron-isoflow:v1.2.0

cloudron install --server my.example.com \
                 --image  ghcr.io/pronetivity/cloudron-isoflow:v1.2.0 \
                 --location isoflow.example.com
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
