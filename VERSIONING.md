# Versioning

This project follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) and maintains a [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) `CHANGELOG.md`.

## Version scheme

`MAJOR.MINOR.PATCH`:

- **PATCH** — backwards-compatible bug fixes only (`Fixed`, `Security`).
- **MINOR** — backwards-compatible feature additions or visible behavior changes (`Added`, `Changed`, `Deprecated`).
- **MAJOR** — breaking changes to the public API, model schema, or stored data format (`Removed`, breaking `Changed`).

## Single source of truth

`package.json#version` is the source. Every other file that pins the version (`CloudronManifest.json`, `packaging/cloudron/package.json`, the lockfile) is kept in sync automatically — never edit them by hand.

The synchroniser is `scripts/sync-version.js`, wired into the `npm version` lifecycle via the `version` script in `package.json`. Running `npm version` triggers it and stages the synced files so they land in the release commit.

Tags use the form `vMAJOR.MINOR.PATCH` (e.g. `v1.2.0`) and `npm version` creates them automatically.

## Day-to-day: as work lands

Every user-visible change picks up an entry under the `## [Unreleased]` section of `CHANGELOG.md`, in the appropriate category (`Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`). Internal refactors and chores do not need an entry.

## Cutting a release

1. In `CHANGELOG.md`, rename `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD`, add a fresh empty `## [Unreleased]` above it, and append a new compare link at the bottom.
2. `git add CHANGELOG.md` so the rename lands in the release commit.
3. Run **one** of:
   ```
   npm version patch        # 1.3.0 -> 1.3.1
   npm version minor        # 1.3.0 -> 1.4.0
   npm version major        # 1.3.0 -> 2.0.0
   npm version 1.5.0        # exact bump
   ```
   This single command: bumps `package.json` + `package-lock.json`, runs `scripts/sync-version.js` to update `CloudronManifest.json` and `packaging/cloudron/package.json`, stages those files, creates the commit `vX.Y.Z`, and creates the annotated tag `vX.Y.Z`.
4. Push: `git push <remote> main && git push <remote> vX.Y.Z`.

The commit message format `vX.Y.Z` comes from `npm version` by default. Override with `npm version --message "chore: releases v%s"` if you want a different convention.

## Publishing the release

After tagging and pushing, follow [PUBLISHING.md](./PUBLISHING.md) for the image build, GHCR push, and Cloudron install steps.

## Notes for forks and downstream packaging

- Downstream packaging (e.g. Cloudron) should track tagged releases, not `main`.
- If a downstream needs its own versioning cadence (e.g. `1.2.0-cloudron.1`), use a SemVer pre-release suffix and keep the leading `MAJOR.MINOR.PATCH` aligned with the upstream tag it was built from.
