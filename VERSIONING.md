# Versioning

This project follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) and maintains a [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) `CHANGELOG.md`.

## Version scheme

`MAJOR.MINOR.PATCH`:

- **PATCH** — backwards-compatible bug fixes only (`Fixed`, `Security`).
- **MINOR** — backwards-compatible feature additions or visible behavior changes (`Added`, `Changed`, `Deprecated`).
- **MAJOR** — breaking changes to the public API, model schema, or stored data format (`Removed`, breaking `Changed`).

The single source of truth is `package.json#version`. Tags use the form `vMAJOR.MINOR.PATCH` (e.g. `v1.2.0`) and must equal that field.

## Day-to-day: as work lands

Every user-visible change picks up an entry under the `## [Unreleased]` section of `CHANGELOG.md`, in the appropriate category (`Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`). Internal refactors and chores do not need an entry.

## Cutting a release

1. Decide the bump (patch / minor / major) from what's in `[Unreleased]`.
2. In `CHANGELOG.md`, rename `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD`, add a fresh empty `## [Unreleased]` above it, and update the compare links at the bottom.
3. Bump `package.json#version` to `X.Y.Z`. Sync the lockfile: `npm install --package-lock-only --ignore-scripts`.
4. Commit: `chore: releases vX.Y.Z`.
5. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z"`.
6. Push: `git push <remote> main && git push <remote> vX.Y.Z`.

## Publishing the release

After tagging and pushing, follow [PUBLISHING.md](./PUBLISHING.md) for the image build, GHCR push, and Cloudron install steps.

## Notes for forks and downstream packaging

- Downstream packaging (e.g. Cloudron) should track tagged releases, not `main`.
- If a downstream needs its own versioning cadence (e.g. `1.2.0-cloudron.1`), use a SemVer pre-release suffix and keep the leading `MAJOR.MINOR.PATCH` aligned with the upstream tag it was built from.
