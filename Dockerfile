# Obraz Node. Przy limicie Docker Hub (429 Too Many Requests, np. wspólne IP na hackathonie)
# użyj mirrora Google: NODE_IMAGE=mirror.gcr.io/library/node:22-alpine docker compose up --build
ARG NODE_IMAGE=node:22-alpine

# ---- 1. Budowa frontu (Vite + PWA) ----
FROM ${NODE_IMAGE} AS client
WORKDIR /app/client
# Brak package-lock.json w repo (prototyp) -> npm install. Po wygenerowaniu locka zamień na `npm ci`.
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---- 2. Runtime: sam Node, backend bez zależności ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=8787
WORKDIR /app
COPY server/ ./server/
COPY --from=client /app/client/dist ./client/dist
RUN mkdir -p /app/server/.cache && chown -R node:node /app/server/.cache
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "server/src/index.js"]
