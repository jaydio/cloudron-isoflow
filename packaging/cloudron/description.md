# Isoflow

Isoflow is an open-source React-based editor for drawing isometric network and infrastructure diagrams in the browser. This package wraps the standalone Isoflow web build with a small Express host so it can run on Cloudron.

## Highlights

- Drag-and-drop isometric tiles, connectors, rectangles, and text boxes.
- 1000+ built-in icons; supports custom icon packs.
- Import / export diagrams as JSON; export as PNG.
- Auto-migrates legacy `v2.3.0`-shaped JSON exports to the current schema.

## Authentication

By default the app is reachable publicly without authentication, matching the upstream Isoflow standalone experience. Optionally lock it down to authenticated Cloudron users by setting `AUTH_ENABLED=true` in `/app/data/app.env` and restarting the app — the Cloudron OIDC addon handles the login.

## Data

- Diagrams are not stored server-side. They live entirely in the user's browser session and can be exported / imported as JSON files.
- `/app/data/app.env` and `/app/data/sessions/` are the only persistent files; both are included in backups.

## Source

- App: https://github.com/markmanx/isoflow
- This package: https://github.com/pronetivity/cloudron-isoflow
