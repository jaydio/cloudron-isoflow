# Isoflow is installed

By default the app is publicly reachable without authentication.

## Enable Cloudron single sign-on

1. Open the Cloudron Web Terminal for this app.
2. Edit `/app/data/app.env` and set `AUTH_ENABLED=true`.
3. Restart the app.

Any authenticated Cloudron user will then be required to log in before reaching the editor. Limit access to specific users by populating `ALLOWED_USERS` with a comma-separated username list in the same file.

To return to public access, set `AUTH_ENABLED=false` and restart again.
