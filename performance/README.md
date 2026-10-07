# Performance Testing: Results and Cheat Sheet

Stack: Next.js frontend, FastAPI (Gunicorn + Uvicorn) on AWS ECS/Fargate behind an ALB, Supabase (Postgres, PostgREST, Auth). Load tests: k6 constant-arrival-rate, 120s, max 2,000 VUs.

Full history and reasoning: [docs/system-design-decisions-and-troubleshooting.md](../docs/system-design-decisions-and-troubleshooting.md).

## Results

### Unoptimized (September 2026 baseline)

| Test | Target RPS | Actual RPS | Success | p95 | What happened |
|---|---:|---:|---:|---:|---|
| Create task (`POST /tasks/upsert`) | 100 | 62.6 | 81.5% | 59.0s | Saturated, repeated 500s |
| Create task | 250 | 60.7 | 12.2% | 60.0s | Hard fail, timeouts |
| Get board (`GET /tasks`) | 100 | 70.3 | 85.8% | 57.6s | Saturated |
| Parse AI (mock route, August) | n/a | 50-180 | 100% | 27-414ms | Only low-rate runs existed |

### Optimized (October 2026, final)

| Test | Target RPS | Actual RPS | Failed | p95 | p99 | Result |
|---|---:|---:|---|---:|---:|---|
| Create task | 1,000 | 994 | 3 of 119,671 | 182ms | 429ms | Pass |
| Get board | 1,000 | 994 | 1 of 119,427 | 167ms | 539ms | Pass |
| Parse AI (`/parse-task/mock`) | 1,000 | passed | 0 | not recorded here | not recorded here | Pass (add exact figures from the run) |
| Parse AI integration (real OpenAI) | 1 req / 3s | 30 calls | n/a | n/a | n/a | Integration check only, not a throughput claim |

### Milestones on the way

| Step | Result |
|---|---|
| Insert-first upsert, auth cache, async `/health`, worker tuning | Create task 100 RPS: 99.2 RPS, p95 191ms |
| Supabase Small to Large, pool sizing | Create task 250 RPS: p95 159ms; 500 RPS: p95 183ms |
| Large compute ceiling | Create task 1,000 target: 906-965 RPS, p95 2.4-3.1s |
| Supabase XL | Create task 1,000 RPS: p95 182ms |
| Get board on XL, before fix | About 900 RPS, p95 2.5-2.9s |
| Get board `select("*")` fix | Get board 1,000 RPS: p95 167ms |
| Get board capacity before fix | 600 RPS passed, 750 RPS failed |

## Memorize: what fixed what

- Health check blocked in the sync thread pool: made `/health` async.
- Container crashed on deploy: newer local venv hid an import difference; added a try/except import. Pinned versions: supabase 2.7.4, postgrest 0.16.8, httpx 0.27.2.
- Auth failures under load were Supabase Auth timeouts, not bad tokens: log the real error, retry with backoff, return 503, keep an in-process token cache.
- Connection pool exhaustion on Nano: upgraded compute and re-sized the pool.
- Create task ceiling at 1,000 RPS: Supabase Large compute (2 vCPU). XL fixed it.
- Get board ceiling at 1,000 RPS: the backend's 19-column `select` list with spaces. `select("*")` fixed it.
- Dropped three unused or redundant indexes on `tasks`: small write gain.
- Did not help: HTTPX keep-alive 40 and 80, more ECS tasks (12 to 16), worker count.

## Memorize: troubleshooting method

- Change one variable per run. Keep deployed versions equal to the pinned requirements.
- Per-stage timing logs first: auth, client, query. Whichever stage matches total time is the bottleneck.
- Rule out in order: ECS CPU, ALB health, per-worker skew, Supabase CPU and disk, NAT gateways, query plan.
- Bisect the request path: token-less probe (no Supabase), direct Supabase test, then reproduce the exact request shape feature by feature.
- Healthy median with a bad tail means contention. A flat bad median means saturation.
- When k6 hits its VU cap, latency settles at VU cap / throughput (2,000 / 930 = about 2s). That plateau is a saturation signature, not a fixed delay.
- Check cheap request-level causes before paying for capacity.

## Memorize: reading k6

- `dropped_iterations`: the arrival rate could not be sustained.
- Exit 99: thresholds failed. Exit 105: run interrupted.
- Thresholds used: p95 under 300ms, p99 under 700ms, failures under 2%.
- Large boards matter: check `data_received`. About 165 bytes per response means empty results.

## Caveats to say honestly

- Get-board users have empty boards: the seed writes to `saved_list_tasks`, but `/tasks` reads `tasks`.
- Create task uses one user, so inserts concentrate on one `user_id`.
- Several create-task changes overlapped. Compute was the clear driver; the rest are not isolated.
- One later create-task XL rerun had p95 441ms. Treat 182ms as the best run.
- Parse AI mock RPS is not OpenAI throughput.
- The cause of the slow column list is measured, not explained at the PostgREST level.

## Commands

```bash
npm run perf:create-task   # TARGET_RPS=1000 PREALLOCATED_VUS=200 MAX_VUS=2000 DURATION=120s
npm run perf:get-board     # seeds users first
npm run perf:parse-ai      # defaults to /parse-task/mock
npm run perf:cleanup       # remove seeded users' data
```

Direct-to-Supabase read test (isolates Supabase from the backend): `performance/k6/get-board-direct.js` with `SHAPE=columns,order,users,profile`.

## Cost reminders

- Supabase compute is billed hourly: scale XL back to Large after tests.
- ECS: scale tasks back down after tests.
- Delete the create-task test user's rows from `public.tasks`.
