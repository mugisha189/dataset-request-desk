#!/bin/sh
set -e

echo "Waiting for database..."
python - <<'PYEOF'
import time
import sqlalchemy
from app.config import settings

for _ in range(30):
    try:
        sqlalchemy.create_engine(settings.database_url).connect().close()
        break
    except Exception:
        time.sleep(1)
else:
    raise SystemExit("database never became available")
PYEOF

echo "Running migrations..."
alembic upgrade head

echo "Seeding demo users (no-op if they already exist)..."
python cli.py seed-users seed/users.json || true

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
