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
RUN npm ci
COPY . .
RUN npm run build  # esbuild → dist/

# ==== STAGE C: Runtime ====
FROM python:3.11-slim
WORKDIR /app

# Copy Python deps + source
COPY --from=python-builder /app/ml-training/ ./ml-training/
COPY --from=python-builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

# Copy Node build
COPY --from=node-builder /app/dist/ ./dist/

# Set non-root user (optional but good practice)
RUN useradd -m appuser
USER appuser

# Expose Express port (mobile talks here)
EXPOSE 3000

# Healthcheck (Render uses this)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/inspect/health || exit 1

# Start both services: FastAPI (bg) → Express (fg)
CMD ["sh", "-c", "cd ml-training && python -m uvicorn src.inference:app --host 127.0.0.1 --port 8000 & sleep 2 && cd /app && exec node dist/index.js"]