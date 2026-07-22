# Task API (FastAPI)

This service owns backend logic for:
- Task CRUD (`/tasks`, `/tasks/upsert`, `/tasks/reorder`, `/tasks/{task_id}/archive`)
- Smart parse (`/parse-task`)
- Health checks (`/health`)

## Required Environment Variables

Set these in `backend/.env` or project-level `.env.local`:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_PARSE_TASK_MODEL=gpt-4.1-mini
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

## Frontend Proxy

Frontend calls `/api/tasks` and `/api/parse-task` through Next rewrites.
Set this in frontend env if needed:

```bash
FASTAPI_BASE_URL=http://127.0.0.1:8000
```
