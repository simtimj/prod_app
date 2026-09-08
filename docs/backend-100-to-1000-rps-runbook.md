# Backend 100 to 1000 RPS Runbook

This runbook is for backend-only performance optimization against:
- GET /tasks (get-board benchmark)
- POST /tasks/upsert (create-task benchmark)

## Goal
Reach stable higher throughput with minimal trial-and-error.

## Baseline Assumptions
- Backend image deployed from `backend/`.
- Supabase index migration applied:
  - `supabase/migrations/20260904_add_tasks_read_index.sql`
- Default benchmark commands:
  - `TARGET_RPS=<n> DURATION=120s npm run perf:get-board`
  - `TARGET_RPS=<n> DURATION=120s npm run perf:create-task`

## Required ECS Backend Settings
Set these on backend service task definition/environment:
- `WEB_CONCURRENCY=8`
- `AUTH_CACHE_MAX_TTL_SECONDS=120`
- `GUNICORN_TIMEOUT=90`
- `GUNICORN_GRACEFUL_TIMEOUT=45`
- `GUNICORN_KEEP_ALIVE=5`
- `GUNICORN_MAX_REQUESTS=2000`
- `GUNICORN_MAX_REQUESTS_JITTER=200`

Set these on ECS service:
- `healthCheckGracePeriodSeconds=120`
- Desired task count >= `2`

Set these on ALB target group health checks:
- Path: `/health`
- Interval: `30s`
- Timeout: `5s`
- Healthy threshold: `2` or `3`
- Unhealthy threshold: `5`

## Scaling Strategy
Do not try to jump directly from one task to 1000 RPS.

1. Vertical first (per-task)
- Keep task count fixed at `2`.
- Test 50 -> 100 -> 150 RPS.
- If stable, test 200 RPS.

2. Horizontal next (service task count)
- Increase desired tasks: `2 -> 4 -> 6 -> 8`.
- Re-run 100 and 250 RPS after each increase.
- If one task can sustain about 150 to 250 RPS for your workload, total capacity for 1000 RPS usually needs about 4 to 7 tasks.

3. Keep WEB_CONCURRENCY bounded
- If `WEB_CONCURRENCY=8` is unstable, try `6`.
- If CPU is low and latency still high, bottleneck is likely downstream (DB/network), so scale tasks instead of increasing workers further.

## Test Matrix (Minimal)
Run these in order and record metrics:

1. `TARGET_RPS=50 DURATION=120s npm run perf:get-board`
2. `TARGET_RPS=100 DURATION=120s npm run perf:get-board`
3. `TARGET_RPS=50 DURATION=120s npm run perf:create-task`
4. `TARGET_RPS=100 DURATION=120s npm run perf:create-task`

If stable, continue:

5. `TARGET_RPS=250 DURATION=120s npm run perf:get-board`
6. `TARGET_RPS=250 DURATION=120s npm run perf:create-task`

## What to Record Each Run
- Actual RPS (`http_reqs.rate`)
- Failure rate (`http_req_failed`)
- p95/p99 latency
- Dropped iterations
- ECS CPU/Memory per backend task
- ALB target 5xx and target response time

## Stop Conditions
Pause scaling and inspect logs if:
- p95 reaches 30s+ consistently
- Any endpoint has 5%+ failures
- Dropped iterations grow rapidly

Collect CloudWatch backend stack traces for `/tasks/upsert` or `/tasks` from the same time window.
