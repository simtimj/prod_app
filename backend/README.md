# Task API (FastAPI)

This service owns backend logic for:
- Task CRUD (`/tasks`, `/tasks/upsert`, `/tasks/reorder`, `/tasks/{task_id}/archive`)
- Saved list persistence (`/lists`, `/lists/sync`)
- Smart parse (`/parse-task`)
- Mock smart parse for load tests (`/parse-task/mock`)
- Health checks (`/health`)

## Required Environment Variables

Set these in `backend/.env` or project-level `.env.local`:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_PARSE_TASK_MODEL=gpt-4.1-mini
PARSE_MOCK_MIN_INTERVAL_MS=0
AUTH_CACHE_MAX_TTL_SECONDS=15
```

## Run Locally

From project root:

```bash
npm run dev:api
```

Or directly:

```bash
cd backend
.venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

For production-style load testing (no reload):

```bash
cd backend
.venv/bin/gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --workers 2 --timeout 60 --graceful-timeout 30 --keep-alive 5
```

## Smoke Test

With the API running:

```bash
cd backend
chmod +x scripts/smoke_test.sh
./scripts/smoke_test.sh
```

Expected checks:
- `GET /health` returns `200`
- `GET /tasks` returns `401` without bearer token
- `POST /tasks/upsert` returns `422` for empty body
- `POST /parse-task` returns `422` for empty body
- `POST /parse-task/mock` returns `422` for empty body

## Frontend Proxy

Frontend calls `/api/tasks`, `/api/parse-task`, and `/api/parse-task/mock` through Next rewrites.
Set this in frontend env if needed:

```bash
FASTAPI_BASE_URL=http://127.0.0.1:8000
```

Use `/parse-task/mock` when you want to stress the parse pipeline without invoking OpenAI. Set `PARSE_MOCK_MIN_INTERVAL_MS` if you want the mock route to simulate production-style throttling.
