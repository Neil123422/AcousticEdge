# ==== STAGE A: Python (FastAPI + torch CPU) + Node builder ====
FROM python:3.11-slim AS builder
WORKDIR /app

# Install system deps for torch/librosa + Node.js 22 + git
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libsndfile1 curl ca-certificates gnupg git && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps (pin versions for reproducibility)
COPY ml-training/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Node deps
COPY package*.json ./
RUN npm ci

# Build TypeScript → dist/index.js
COPY . .
RUN npm run build

# Copy ml-training source (includes models/ after .gitignore fix)
COPY ml-training/ ./ml-training/

# ==== STAGE B: Runtime (single image) ====
FROM python:3.11-slim
WORKDIR /app

# System deps for torch inference + healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy Python deps from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

# Copy Node modules (esbuild used --packages=external, so node_modules needed at runtime)
COPY --from=builder /app/node_modules/ ./node_modules/

# Copy built app
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/ml-training/ ./ml-training/
COPY --from=builder /app/node_modules/ ./node_modules/

# Copy env
COPY .env ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=5 \
  CMD curl -f http://localhost:3000/api/inspect/health || exit 1

# Start FastAPI in background, then Express in foreground
CMD ["sh", "-c", "cd ml-training && python -m uvicorn src.inference:app --host 0.0.0.0 --port 8000 >> /tmp/fastapi.log 2>&1 & echo \"FastAPI starting...\" && cd /app && exec node dist/index.js >> /tmp/express.log 2>&1"]