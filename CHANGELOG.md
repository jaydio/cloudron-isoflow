# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
See [VERSIONING.md](./VERSIONING.md) for the release workflow.

Change categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

## [Unreleased]

## [1.3.0] - 2026-05-13

### Added
- Cloudron community-app packaging under `packaging/cloudron/`: multi-stage `Dockerfile` (builds the SPA, then runs on `cloudron/base:5.0.0`), `CloudronManifest.json` at the repo root (manifestVersion 2, `localstorage` + `oidc` addons), Express host (`server.js`) that serves the built SPA and optionally gates all routes behind Cloudron OIDC, plus `start.sh` that seeds `/app/data/app.env` on first boot.
- `AUTH_ENABLED` toggle in `/app/data/app.env` (default `false`) flips the Cloudron deployment between public and SSO-protected without rebuilding. Optional `ALLOWED_USERS` allowlist when SSO is on.
- GitHub Actions workflow (`.github/workflows/cloudron-image.yml`) builds and pushes `ghcr.io/<owner>/cloudron-isoflow:vX.Y.Z` on tag pushes and `:edge` on `main`.
- `PUBLISHING.md` documents the tag → GHCR → `cloudron install` flow.
- App icon: 1024×1024 ProNetivity-branded artwork at `packaging/cloudron/icon.png`.
- Manifest now declares `packagerName`, `packagerUrl`, and `upstreamLicense` so the Cloudron app store shows the right attribution.

### Changed
- Cloudron app id is `ph.pronetivity.isoflow`. Pre-existing installs under the previous id must be uninstalled and reinstalled to pick up the new id.
- `LICENSE` keeps the upstream MIT copyright and adds a ProNetivity Inc. copyright line for the Cloudron packaging modifications.
- Upstream nginx-only `Dockerfile` retained for reference as `Dockerfile.legacy`.

## [1.2.0] - 2026-05-13

### Added
- Auto-migrate legacy v2.3.0-shaped model JSON on import. `useInitialDataManager.load()` now runs `migrateModel()` before schema validation, converting top-level `components` → `items` and resolving `viewItem.component` refs so files exported by newer Isoflow forks load without errors. Anchor refs are preserved by emitting one v1 model item per referencing view item.

### Changed
- Pin `pathfinding` to the upstream GitHub tarball (`github:qiao/PathFinding.js#0.4.18`) instead of the npm registry release.

[Unreleased]: https://github.com/pronetivity/cloudron-isoflow/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/pronetivity/cloudron-isoflow/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/pronetivity/cloudron-isoflow/compare/v1.1.1...v1.2.0
