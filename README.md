# Dataset Request Desk

An internal platform for a robotics data collection company: clients request
episode datasets, operators fulfil them by assigning recorded episodes, and
clients accept or reject the delivery.

- **Backend:** Python, FastAPI, SQLAlchemy, Alembic migrations, PostgreSQL.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Radix UI primitives
  + ECharts, built as a single-page app and served as static files by the
  same FastAPI app (one deployable, no separate frontend host/CORS to manage).
  A data table (search, filters, row actions, pagination, CSV/Excel/PDF
  export) and a dashboard (period presets, several ECharts breakdowns) are
  shared across every listing and are not one-offs per page.
- **Stretch item chosen:** none — see `NOTES.md` §2 for what was left out and why.

## Running it

### With Docker (recommended)

```bash
docker compose up --build
```

This brings up Postgres, runs the Alembic migrations, seeds the demo users
from `backend/seed/users.json`, and starts the API + frontend on
**http://localhost:8000**.

### Without Docker

Requires Python 3.11+, Node 20+, and a running PostgreSQL instance.

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # edit DATABASE_URL if needed
alembic upgrade head
python cli.py seed-users seed/users.json
uvicorn app.main:app --reload
```

```bash
# Frontend (in a second terminal)
cd frontend
npm install
npm run dev    # dev server on :5173, proxies /api to the backend on :8000
```

Open http://localhost:5173 for hot-reloading development, or build it once
(`npm run build`, from `frontend/`) and open **http://localhost:8000** to have
the FastAPI server serve the built app directly — that's what `npm run build`
does: it writes straight into `backend/app/static` (see `frontend/vite.config.ts`),
which is also what the Docker image does at build time.

### Seed user credentials

| Email | Password | Role |
|---|---|---|
| admin@example.com | admin123 | admin |
| ops1@example.com | ops123 | operator |
| ops2@example.com | ops123 | operator |
| client-a@example.com | client123 | client |
| client-b@example.com | client123 | client |

### Importing episode metadata

Via the UI: log in as an operator/admin and use the "Import episode metadata"
panel on the Episodes tab.

Via the CLI (same code path, useful for large files):

```bash
cd backend
python cli.py import-episodes seed/episodes.csv
```

Re-running the same file is safe — see `NOTES.md` §1 for how idempotency and
the messy-data handling work. To generate a large clean file to test import
and analytics at volume:

```bash
python seed/generate_episodes.py 200000 > seed/episodes_large.csv
python cli.py import-episodes seed/episodes_large.csv
```

## Running the tests

```bash
cd backend
source .venv/bin/activate   # if not already
createdb drd_test           # once, if it doesn't exist; or point DATABASE_URL at any empty database
pytest
```

Tests run against a real PostgreSQL database (the import path uses
`INSERT ... ON CONFLICT`, which is Postgres-specific) and each test gets a
clean schema via a fixture that drops/recreates all tables. Set
`DATABASE_URL` to point at a scratch database before running if you don't
want to use the default (`postgresql+psycopg://drd:drd@localhost:5432/drd_test`).

In CI (`.github/workflows/ci.yml`) this runs automatically against a
Postgres service container on every push/PR.

## API overview

All endpoints are under `/api`. Auth is a JWT in an httpOnly cookie set by
`POST /api/auth/login`; also accepted as a `Bearer` token in `Authorization`
for scripting.

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST /api/users`, `PATCH /api/users/{id}` — admin only
- `GET /api/episodes`, `POST /api/episodes/import`, `GET /api/episodes/export?format=csv|xlsx|pdf` — operator/admin
- `POST/GET /api/requests`, `GET /api/requests/{id}`,
  `POST /api/requests/{id}/status`,
  `POST/DELETE /api/requests/{id}/assignments[/{assignment_id}]`,
  `GET /api/requests/export?format=csv|xlsx|pdf`
- `GET /api/analytics?date_from=&date_to=`, `GET /api/analytics/daily-export?format=csv|xlsx|pdf`
- `GET /api/users/export?format=csv|xlsx|pdf` — admin only
- `GET /health`

See `NOTES.md` for the domain rules, design decisions, and what's out of scope.
