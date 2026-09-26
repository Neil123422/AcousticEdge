# ==== STAGE A: Builder ====
FROM python:3.11-slim AS builder
WORKDIR /app

# System deps + Node.js 22 in single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libsndfile1 curl ca-certificates gnupg git && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# CPU-only torch first (skip CUDA bloat)
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Python deps
COPY ml-training/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Server Node deps (tiny set, ~1 min vs ~10 min for full app)
# Installed at /app so both server/ and drizzle/ sources resolve them
COPY server/package.json ./package.json
RUN npm install

# Copy source and build (preserve directory structure)
COPY server/ ./server/
COPY shared/ ./shared/
COPY drizzle/ ./drizzle/
COPY ml-training/ ./ml-training/
COPY .env ./.env
RUN npx esbuild server/_core/index.ts --platform=node --format=cjs --bundle --outdir=dist/

# ==== STAGE B: Runtime ====
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 curl ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Python deps from builder (CPU torch, ~1.5GB max vs ~4GB with CUDA)
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

# Self-contained bundle (no node_modules needed at runtime)
COPY --from=builder /app/dist/ ./dist/

# App source + models + env
COPY --from=builder /app/ml-training/ ./ml-training/
COPY --from=builder /app/.env ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=5 \
  CMD curl -f http://localhost:3000/api/inspect/health || exit 1

# FastAPI bg, Express fg; logs to stdout for Render visibility
CMD ["sh", "-c", "cd ml-training && python -m uvicorn src.inference:app --host 0.0.0.0 --port 8000 & echo \"FastAPI starting...\" && exec node dist/index.js"]
