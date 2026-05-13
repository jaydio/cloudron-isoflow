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
| Community-app catalog | `CloudronVersions.json` at the repo root, served via `https://raw.githubusercontent.com/pronetivity/cloudron-isoflow/main/CloudronVersions.json` |

The image registry comes from `${{ github.repository_owner }}` in the workflow, so wherever the repo is hosted is where the image is pushed. No literal organization name is hard-coded in the build.

## End-to-end release flow

1. **Changelog**. In `CHANGELOG.md`, rename `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD`, add a fresh empty `[Unreleased]`, append the compare link, then `git add CHANGELOG.md`.
2. **Bump + tag in one command**. `npm version patch | minor | major | X.Y.Z` — this bumps `package.json` + lockfile, runs `scripts/sync-version.js` to update `CloudronManifest.json` and `packaging/cloudron/package.json`, commits everything as `vX.Y.Z`, and creates the annotated tag. See [VERSIONING.md](./VERSIONING.md#cutting-a-release) for details.
3. **Push**. `git push pronetivity main && git push pronetivity vX.Y.Z`.
4. **CI builds + publishes**. The `Build Cloudron image` workflow (`.github/workflows/cloudron-image.yml`) fires on the tag push and does three things automatically:
   - builds the multi-stage `Dockerfile` and pushes `ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z` + `:latest` to GHCR;
   - extracts the matching `## [X.Y.Z]` section from `CHANGELOG.md`;
   - creates a GitHub Release named `vX.Y.Z` with that section as the body, plus a "Cloudron install" snippet and the image digest. Tags containing a `-` (e.g. `v1.3.0-1`) are flagged as pre-releases automatically.

   Watch the run at `https://github.com/pronetivity/cloudron-isoflow/actions`. The Release shows up at `https://github.com/pronetivity/cloudron-isoflow/releases`.
5. **Verify image**. `docker pull ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z` from any machine. The image is public by default once the GitHub package visibility is set to public — go to the package settings on GitHub and switch it once after the first publish.
6. **Catalog the version** so Cloudron servers tracking the `CloudronVersions.json` URL pick it up. See [Community-app catalog](#community-app-catalog-cloudronversionsjson) below.

## Community-app catalog (`CloudronVersions.json`)

Cloudron treats this file as the source-of-truth feed for a community app. Users add the raw URL (see the [Where things are published](#where-things-are-published) table) under **Settings → App Store → Add custom app** in their dashboard, or pass `--versions-url <url>` to `cloudron install`. Every entry under `versions` becomes an installable version; new entries trigger update notifications.

### File shape (managed automatically)

```json
{
  "stable": true,
  "versions": {
    "1.3.0": {
      "manifest": { ... full CloudronManifest.json ... },
      "creationDate": "2026-05-13T15:30:00.000Z",
      "ts": "2026-05-13T15:30:00.000Z",
      "publishState": "published"
    }
  }
}
```

Do not edit this by hand — `cloudron versions add` writes it and embeds the manifest content from disk. The `changelog` field of the manifest is filled from the `./CHANGELOG` file (which `scripts/sync-version.js` regenerates from the `## [X.Y.Z]` section of `CHANGELOG.md` during `npm version`).

### After every release: add the version to the catalog

Once the GHCR image is built and pulled-tested (steps 4–5 above), from your local checkout on the release tag:

```bash
git checkout vX.Y.Z
docker pull ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z
docker tag  ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z   # records the ref locally for `cloudron versions add`

cloudron versions add --state published
git add CloudronVersions.json
git commit -m "chore: catalogs vX.Y.Z in CloudronVersions.json"
git push pronetivity main
```

The new entry is live the moment the commit reaches `main` — Cloudron servers re-fetch the raw URL on a schedule (and on demand from the dashboard).

### One-time setup (already done for this repo)

If starting a new packaging repo from scratch, run once at the repo root:

```bash
cloudron versions init
```

This creates an empty `CloudronVersions.json` and stamps the manifest with `iconUrl`, `minBoxVersion`, `changelog`, and `mediaLinks` placeholders. Replace each placeholder with real values before publishing the first version:

- `iconUrl` — public URL to a 256×256+ icon (we use `https://raw.githubusercontent.com/.../packaging/cloudron/icon.png`).
- `mediaLinks` — at least one publicly reachable screenshot URL (3:1 aspect ratio).
- `minBoxVersion` — minimum Cloudron platform version; `9.1.0` covers the `packagerName`/`packagerUrl`/`upstreamLicense`/`iconUrl` fields we use.
- `changelog` — kept as `file://CHANGELOG`; the file is regenerated by `scripts/sync-version.js`.

### Revoking or updating a published version

A bad release can be pulled with `cloudron versions revoke` (latest only). Users who haven't picked it up yet won't see it; users who already installed it are unaffected. Bump and ship a fix instead of editing a published entry — `cloudron versions update --version X.Y.Z --state published|testing` is for state changes only, not for changing the manifest or image of a version users may already have.

## Installing on a Cloudron

Three paths. The `--versions-url` path is what end users follow once the catalog is published; the others are for developers/testers.

### A) `--versions-url` (end-user path; community-app catalog)

```bash
cloudron install --server my.example.com \
                 --versions-url https://raw.githubusercontent.com/pronetivity/cloudron-isoflow/main/CloudronVersions.json \
                 --location isoflow.example.com
```

Or from the dashboard: **Settings → App Store → Add custom app** and paste the same URL. Cloudron then surfaces every entry in `CloudronVersions.json` as an installable version and notifies the user about updates automatically.

### B) `--image` (developer path; pin a specific GHCR image)

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

### C) Server-side build (no registry needed; for testing uncommitted changes)

Run from the repo root, which contains `CloudronManifest.json` and `Dockerfile`:

```bash
cloudron install --server my.example.com --location isoflow.example.com
cloudron update  --server my.example.com --app isoflow.example.com
```

The CLI uploads the working tree, the Cloudron server runs `docker build`, then deploys. Slower than `--image`, and the resulting install does not appear in any catalog.

## Announcing the app to the community

After the first version is in `CloudronVersions.json` and at least one screenshot is in `mediaLinks`:

1. Confirm a clean machine can `docker pull ghcr.io/pronetivity/cloudron-isoflow:vX.Y.Z` (image visibility is public) and a fresh Cloudron can install via path A above.
2. Post in the Cloudron forum's [Community Apps thread](https://forum.cloudron.io/topic/15172/community-apps) with:
   - the `CloudronVersions.json` URL (path A install line),
   - the repo URL,
   - a one-line description of what's new.

Subsequent releases only need the `cloudron versions add` step in [Community-app catalog](#community-app-catalog-cloudronversionsjson); the forum announcement is a one-time bootstrap.

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
