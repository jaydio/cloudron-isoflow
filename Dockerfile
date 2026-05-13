# syntax=docker/dockerfile:1.7

# ----- Stage 1: build the Isoflow SPA -----
FROM node:21-bookworm-slim AS spa

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY tsconfig.json ./
COPY webpack/ ./webpack/
COPY src/ ./src/
RUN npm run docker:build

# ----- Stage 2: install server deps -----
FROM node:21-bookworm-slim AS server-deps

WORKDIR /server
COPY packaging/cloudron/package.json packaging/cloudron/package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi

# ----- Stage 3: Cloudron runtime -----
FROM cloudron/base:5.0.0

ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/code/dist

# /app/code is the read-only image root. /app/data is provided by the
# localstorage addon at runtime.
WORKDIR /app/code

COPY --from=spa /build/dist /app/code/dist
COPY --from=server-deps /server/node_modules /app/code/node_modules

COPY packaging/cloudron/server.js          /app/code/server.js
COPY packaging/cloudron/start.sh           /app/code/start.sh
COPY packaging/cloudron/app.env.example    /app/code/app.env.example
COPY packaging/cloudron/package.json       /app/code/package.json

RUN chmod +x /app/code/start.sh && chown -R cloudron:cloudron /app/code

EXPOSE 3000

CMD ["/app/code/start.sh"]
