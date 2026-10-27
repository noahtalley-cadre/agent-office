FROM node:24-bookworm-slim AS build
WORKDIR /opt/clubhouse
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    git gh curl ca-certificates procps python3 build-essential ripgrep tini \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global @anthropic-ai/claude-code \
    && mkdir -p /data && chown node:node /data
COPY --from=build /opt/clubhouse /opt/clubhouse
WORKDIR /opt/clubhouse
ENV HOME=/data/home NODE_ENV=production
USER node
VOLUME /data
EXPOSE 4600
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "deploy/personal/start.mjs"]
