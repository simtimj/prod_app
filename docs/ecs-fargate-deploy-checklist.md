# ECS Fargate Deploy Checklist (Frontend + Backend)

This checklist is tailored to the current repo setup:
- Frontend (Next.js standalone) container on port `3000`
- Backend (FastAPI + gunicorn/uvicorn) container on port `8000`
- Frontend health route: `/api/health`
- Backend health route: `/health`

## 1. Container Images (ECR)

1. Build and push two images:
- frontend image from [Dockerfile](../Dockerfile)
- backend image from [backend/Dockerfile](../backend/Dockerfile)

2. Use immutable tags and record image digests.

3. Keep image scan policy enabled in ECR.

## 2. ECS Services Layout

1. Create two ECS services (recommended):
- `prod-app-frontend`
- `prod-app-backend`

2. Put both behind an ALB with separate target groups:
- frontend target group -> port `3000`
- backend target group -> port `8000`

3. Add ALB path-based routing so API traffic bypasses the frontend container:
- `/api/*` -> backend target group
- `/*` -> frontend target group

4. Use private subnets for tasks, public ALB.

## 3. Task Definition Defaults (Starting Point)

Use these as initial values, then tune with load tests.

### Backend task (FastAPI)

1. CPU/Memory start:
- `1024 CPU` (1 vCPU)
- `2048 MiB` memory

2. Container port:
- `8000`

3. Command/runtime:
- Keep current image default entrypoint ([backend/entrypoint.sh](../backend/entrypoint.sh)).

4. Environment variables:
- `PORT=8000`
- `WEB_CONCURRENCY=2` (start here)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_PARSE_TASK_MODEL`
- `PARSE_MOCK_MIN_INTERVAL_MS`
- `AUTH_CACHE_MAX_TTL_SECONDS`
- `AUTH_CACHE_MAX_ENTRIES`
- `PARSE_CLIENT_TRACK_MAX_ENTRIES`

5. Health check (target group):
- path: `/health`
- matcher: `200`
- interval: `30s`
- timeout: `5s`
- healthy threshold: `2`
- unhealthy threshold: `3`

### Frontend task (Next.js)

1. CPU/Memory start:
- `512 CPU`
- `1024 MiB` memory

2. Container port:
- `3000`

3. Environment variables:
- `PORT=3000`
- `NODE_ENV=production`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For ECS, do not bake a backend URL into the frontend image. Route `/api/*` directly from the ALB to the backend service instead.

4. Health check (target group):
- path: `/api/health`
- matcher: `200`
- interval: `30s`
- timeout: `5s`
- healthy threshold: `2`
- unhealthy threshold: `3`

## 4. Security Groups

1. ALB SG:
- allow inbound `80/443` from internet
- allow outbound to ECS task SGs

2. Frontend task SG:
- allow inbound from ALB SG on `3000`

3. Backend task SG:
- allow inbound from ALB SG (or frontend task SG if internal-only path) on `8000`
- allow outbound to Supabase/OpenAI endpoints

## 5. Logging / Observability

1. Enable awslogs for both services:
- separate log groups per service
- set retention (for example `14` or `30` days)

2. Dashboard metrics to track during load tests:
- ECS: CPUUtilization, MemoryUtilization, RunningTaskCount
- ALB: RequestCountPerTarget, TargetResponseTime, HTTPCode_Target_5XX_Count
- backend app logs: auth errors, Supabase/OpenAI errors, request failures

## 6. Autoscaling (Initial)

Start conservative, then tune from performance test data.

1. Backend service autoscaling:
- min tasks: `2`
- desired tasks: `2`
- max tasks: `10`
- target tracking: CPU `65%`
- target tracking: Memory `70%`

2. Frontend service autoscaling:
- min tasks: `2`
- desired tasks: `2`
- max tasks: `6`
- target tracking: CPU `60%`

3. Scale-in/out cooldowns:
- scale out: `60s`
- scale in: `180s`

## 7. Deployment Strategy

1. Use rolling deployment with minimum healthy percent/high availability.

2. Set ECS health check grace period:
- start with `60-120s`

3. Keep circuit breaker enabled (auto rollback on failed deployment).

## 8. Performance Test Readiness Gate

Before calling deployment stable:

1. `create-task` and `get-board` pass thresholds at target RPS.
2. No sustained ALB/backend 5xx spikes.
3. Backend CPU and memory stay below sustained saturation.
4. No recurring auth/token or Supabase connection failure patterns in logs.
5. Parse endpoint load tests use `/parse-task/mock` for high-RPS scenarios unless intentionally overriding.

## 9. Quick Runbook (Post-Deploy)

1. Deploy backend service first.
2. Verify backend target health on `/health`.
3. Deploy frontend service.
4. Verify frontend target health on `/api/health`.
5. Run staged load:
- 100 -> 250 -> 500 -> 750 -> 1000 RPS
6. Record ECS + ALB + app metrics for each stage.
7. Tune task count and `WEB_CONCURRENCY` based on bottlenecks.
