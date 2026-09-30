# Build context is the repo root (see docker-compose.yml), so this stage can see both
# frontend/ and backend/ -- the frontend's build output has to land in backend/app/static
# before the Python image is assembled.
FROM node:20-alpine AS frontend-build
WORKDIR /workspace
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
COPY backend/app/static ./backend/app/static
RUN cd frontend && npm run build

FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /workspace/backend/app/static ./app/static

RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
