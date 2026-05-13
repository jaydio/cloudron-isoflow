# Publishing

How releases of `pronetivity/cloudron-isoflow` are cut, built, and shipped to a Cloudron.

For the version-bump mechanics (SemVer rules, changelog format, tag form), see [VERSIONING.md](./VERSIONING.md). This document covers the *publishing* steps that happen *after* a release is tagged.

## Where things are published

| Artifact | Location |
|---|---|
| Source | `pronetivity/cloudron-isoflow` on GitHub (`pronetivity` remote in this repo) |
| Container image | `ghcr.io/pronetivity/cloudron-isoflow` on GHCR |
| Image tags | `:vX.Y.Z` (every release tag), `:latest` (latest release tag), `:edge` (every `main` push) |
| App id | `ph.pronetivity.isoflow` (Cloudron-side identity; immutable per install) |

The image registry comes from `${{ github.repository_owner }}` in the workflow, so wherever the repo is hosted is where the image is pushed. No literal organization name is hard-coded in the build.

## End-to-end release flow

1. **Bump + changelog**. Follow the steps in [VERSIONING.md](./VERSIONING.md#cutting-a-release) — move `[Unreleased]` entries to a dated version section, bump `package.json#version` (and the lockfile), commit `chore: releases vX.Y.Z`.
2. **Tag**. `git tag -a vX.Y.Z -m "vX.Y.Z"`.
3. **Push**. `git push pronetivity main && git push pronetivity vX.Y.Z`.
4. **CI builds**. The `Build Cloudron image` workflow (`.github/workflows/cloudron-image.yml`) fires on the tag push, builds the multi-stage `Dockerfile`, and pushes `ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z` + `:latest` to GHCR. Watch the run at `https://github.com/pronetivity/cloudron-isoflow/actions`.
5. **Verify image**. `docker pull ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z` from any machine. The image is public by default once the GitHub package visibility is set to public — go to the package settings on GitHub and switch it once after the first publish.

## Installing on a Cloudron

Two paths. Pick one — the `--image` path is recommended once CI is publishing reliably because it avoids re-building on the Cloudron server.

### A) `--image` (recommended; uses the GHCR image)

```bash
cloudron install --server my.example.com \
                 --image  ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z \
                 --location isoflow.example.com
```

Update an existing install:

```bash
cloudron update  --server my.example.com \
                 --app    isoflow.example.com \
                 --image  ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z
```

For a private GHCR image, configure the registry credentials on the Cloudron once: `cloudron registry add ghcr.io ...`.

### B) Server-side build (no registry needed)

Run from the repo root, which contains `CloudronManifest.json` and `Dockerfile`:

```bash
cloudron install --server my.example.com --location isoflow.example.com
cloudron update  --server my.example.com --app isoflow.example.com
```

The CLI uploads the working tree, the Cloudron server runs `docker build`, then deploys. Slower than `--image`, but useful for testing uncommitted changes.

## Publishing as a Cloudron community app

The Cloudron community app catalogue is the forum thread at <https://forum.cloudron.io/topic/15172/community-apps>. To list this app there:

1. Push a tagged release and confirm the GHCR image is publicly pullable (`docker pull ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z` from a clean machine).
2. Ensure the manifest fills the appstore-recommended fields: `id`, `title`, `description`, `tagline`, `website`, `contactEmail`, `author`, `tags`, `changelog`. The `cloudron appstore validate` command checks this — run it from the repo root.
3. Post a reply in the community thread with: the image reference (`ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z`), the repo URL, and the install command from path A above.

## Auth toggle as part of the publish story

The app ships with `AUTH_ENABLED=false` in the seeded `/app/data/app.env`. This is intentional: a fresh community-app install is reachable without sign-in, matching upstream Isoflow's standalone behavior. End users opt into Cloudron SSO by editing `app.env` and restarting — see [`packaging/cloudron/postinstall.md`](./packaging/cloudron/postinstall.md).

## Changing the app id

The Cloudron app id (`ph.pronetivity.isoflow`) is immutable per install. Changing it in the manifest means:

- New installs land under the new id.
- Existing installs cannot be updated to the new id via `cloudron update`. They must be uninstalled and reinstalled. Back up the `/app/data/` contents first if anything important lives there.

Do not change the id casually. If the org/domain that owns the package changes, treat it as a coordinated migration.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Invalid CloudronManifest.json: must NOT have additional properties` | Manifest contains a field not in the Cloudron schema. Validate locally with `node -e "import('@cloudron/manifest-format').then(m => console.log(m.parse(require('./CloudronManifest.json'))))"`. |
| GH Action push step fails with `403 / denied` | The repo's GitHub Actions need `packages: write` permission and the package may need to be set public in the package settings UI after the first publish. |
| `cloudron install` complains about Dockerfile / manifest not found | Run from the repo root. Both files must be at the same directory as the working dir. |
| Image builds locally but install hangs at `Building image` on the server | Check `cloudron logs --server <host> --app <location>` and `cloudron logs --build` for the build output. |
