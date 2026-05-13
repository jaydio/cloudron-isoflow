# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
See [VERSIONING.md](./VERSIONING.md) for the release workflow.

Change categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

## [Unreleased]

## [1.2.0] - 2026-05-13

### Added
- Auto-migrate legacy v2.3.0-shaped model JSON on import. `useInitialDataManager.load()` now runs `migrateModel()` before schema validation, converting top-level `components` → `items` and resolving `viewItem.component` refs so files exported by newer Isoflow forks load without errors. Anchor refs are preserved by emitting one v1 model item per referencing view item.

### Changed
- Pin `pathfinding` to the upstream GitHub tarball (`github:qiao/PathFinding.js#0.4.18`) instead of the npm registry release.

[Unreleased]: https://github.com/jaydio/cloudron-isoflow/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/jaydio/cloudron-isoflow/compare/v1.1.1...v1.2.0
