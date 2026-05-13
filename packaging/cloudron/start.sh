#!/bin/bash
set -euo pipefail

DATA_DIR="${CLOUDRON_DATA_DIR:-/app/data}"
APP_ENV="${DATA_DIR}/app.env"
SESSIONS_DIR="${DATA_DIR}/sessions"

mkdir -p "${DATA_DIR}" "${SESSIONS_DIR}"

if [[ ! -f "${APP_ENV}" ]]; then
  echo "[isoflow] seeding ${APP_ENV} from app.env.example"
  cp /app/code/app.env.example "${APP_ENV}"
fi

chown -R cloudron:cloudron "${DATA_DIR}"
chmod 600 "${APP_ENV}" || true

cd /app/code
exec gosu cloudron:cloudron node server.js
