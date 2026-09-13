# ==== STAGE A: Python (FastAPI + torch CPU) ====
FROM python:3.11-slim AS python-builder
WORKDIR /app

# Install system deps for torch/librosa
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libsndfile1 && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps (pin versions for reproducibility)
COPY ml-training/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ml-training source (includes models/ after .gitignore fix)
COPY ml-training/ ./ml-training/

# ==== STAGE B: Node (Express build) ====
FROM node:22 AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm install 
COPY . .
RUN npm run build  # esbuild → dist/

# ==== STAGE C: Runtime ====
FROM python:3.11-slim
WORKDIR /app

# Install Node.js 22 and system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg libsndfile1 && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy Python deps + source
COPY --from=python-builder /app/ml-training/ ./ml-training/
COPY --from=python-builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

# Copy Node build
COPY --from=node-builder /app/dist/ ./dist/

# Copy .env for Express (PORT, INFERENCE_URL)
COPY .env ./

# Expose Express port (mobile talks here)
EXPOSE 3000

# Healthcheck (Render uses this)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/inspect/health || exit 1

# Start both services: FastAPI (bg) → Express (fg)
CMD ["sh", "-c", "echo 'Starting FastAPI...' && cd ml-training && python -m uvicorn src.inference:app --host 0.0.0.0 --port 8000 >> /tmp/fastapi.log 2>&1 & echo $! > /tmp/fastapi.pid && echo 'FastAPI started' && sleep 3 && echo 'Starting Express...' && cd /app && exec node dist/index.js >> /tmp/express.log 2>&1"]