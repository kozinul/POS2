FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

RUN npm install -g pnpm@9 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        nano \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000 3001 5000
