# ==== STAGE A: Builder (Python + Node) ====
FROM python:3.11-slim AS builder
WORKDIR /app

# System deps for torch/librosa + Node.js 22 + git
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libsndfile1 curl ca-certificates gnupg git && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install CPU-only torch first (avoid CUDA bloat)
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install Python deps (pin versions for reproducibility)
COPY ml-training/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install ONLY server Node deps (tiny set)
COPY server/package.json ./server/package.json
RUN npm ci --prefix server

# Copy source needed for bundling
COPY server/ ./server/
COPY shared/ ./shared/
COPY drizzle/ ./drizzle/
COPY ml-training/ ./ml-training/
COPY tsconfig.json ./

# Build self-contained bundle (bundle all deps, no externals needed at runtime)
RUN npx esbuild server/_core/index.ts --platform=node --format=esm --bundle --outdir=dist/

# ==== STAGE B: Runtime ====
FROM python:3.11-slim
WORKDIR /app

# System deps for torch + healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy Python deps from builder (CPU torch only)
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

# Copy built app (self-contained bundle, no node_modules needed)
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/ml-training/ ./ml-training/
COPY --from=builder /app/.env ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=5 \
  CMD curl -f http://localhost:3000/api/inspect/health || exit 1

# Start FastAPI in background, then Express in foreground (logs to stdout)
CMD ["sh", "-c", "cd ml-training && python -m uvicorn src.inference:app --host 0.0.0.0 --port 8000 & echo \"FastAPI starting...\" && exec node dist/index.js"]