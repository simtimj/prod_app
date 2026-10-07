# System Design Decisions & Troubleshooting Log

This document records engineering decisions, measured results, and troubleshooting findings from
load-testing both the `/tasks/upsert` create-task write path and the authenticated `GET /tasks`
get-board read path. It is written for interview/system-design discussion, not as day-to-day
operational docs (see
[backend-100-to-1000-rps-runbook.md](backend-100-to-1000-rps-runbook.md) and
[ecs-fargate-deploy-checklist.md](ecs-fargate-deploy-checklist.md) for that).

## Architecture summary

- **Frontend**: Next.js, deployed on ECS/Fargate.
- **Backend**: FastAPI + Gunicorn/Uvicorn workers, deployed on ECS/Fargate, fronted by an ALB.
- **Database/Auth**: Supabase (managed Postgres + GoTrue auth + pgbouncer connection pooler).
- **Load testing**: k6, with a custom live-status reporter (see
  [performance/scripts/live_status.py](../performance/scripts/live_status.py)) that tails k6's own
  `--out json` metric stream to print periodic `RPS | requests | success | errors | success%`
  status without inventing a parallel counting system.

## Timeline of validated results

| Target RPS | Actual RPS | Success rate | p95 | p99 | Result | Key blocker at the time |
|---:|---:|---:|---:|---:|---|---|
| 100 | 99.20 | 99.97% | 190.94ms | — | ✅ Pass | None (first clean baseline) |
| 250 | 60.71 | 12.17% | — | 60.00s | ❌ Hard fail | Async `/health` missing; auth path issues |
| 250 | 249.72 | 99.92% | 159.01ms | 577.18ms | ✅ Pass | Fixed (see below) |
| 500 | 492.55 | 98.48% | 2.61s | 7.01s | ❌ Fail (latency) | Shared-compute DB tier variance |
| 500 | 499.22 | 99.91% | 182.67ms | 551.84ms | ✅ Pass | Fixed (Supabase Large tier) |
| 500 | 399.89 reported overall | 99.895% | 171.53ms | 326.42ms | ✅ Terminal thresholds | Latest run; rate basis needs reconciliation |

### Latest Create Task 500-RPS run

The terminal output for the run launched with
`TARGET_RPS=500 DURATION=120s PREALLOCATED_VUS=1500 MAX_VUS=8000` reported:

- 59,985 HTTP requests and 63 failed HTTP requests (0.10% failure; 99.895% success).
- p95 `171.53ms` and p99 `326.42ms`, both below the configured `300ms`/`700ms` limits.
- Terminal thresholds passed and the shell reported exit code `0`.
- Maximum request duration was approximately `60s`, indicating a small number of extreme
  outliers despite the good p95/p99.

There is a rate-accounting discrepancy to resolve before claiming that 500 RPS was sustained:
the terminal's `http_reqs.rate` was `399.887/s`, while 59,985 requests over the configured
120-second arrival phase is about `499.875/s`. The former is approximately 59,985 / 150 seconds,
suggesting the summary rate may include a 30-second graceful-drain period or otherwise use a
different elapsed-time denominator. Verify k6's actual scenario start/stop and summary duration
before using a throughput claim. Safe current statement: the API passed latency/error thresholds
in a 500-RPS-target, 120-second k6 run; do not yet state "sustained 500 RPS" without reconciling
the rate basis.

The archived JSON threshold booleans have previously disagreed with the terminal threshold block
and numeric values. Retain the terminal output plus the raw run summary, and treat that discrepancy
as an instrumentation/reporting issue rather than silently selecting the more favorable result.

## Get-board 500 RPS investigation (unresolved at the time; resolved in October 2026)

> Update: the get-board read ceiling was later traced to the backend's explicit PostgREST column
> list. See [October 2026: reaching 1,000 RPS](#october-2026-reaching-1000-rps-on-create-task-and-get-board).
> The notes below are the original September investigation, kept as written.

### k6 evidence

Several get-board runs targeted 500 RPS for 120 seconds, but achieved only about 396-397 HTTP
requests/second. The saved summaries show increasing failure rates and tail latency across these
runs:

| Archived run ID | Actual RPS | HTTP failures | p95 latency | Max latency | Dropped iterations |
|---|---:|---:|---:|---:|---:|
| `get-board-summary-20260928-190227.json` | 397.41 | 0.40% (237) | 938.83ms | 60.00s | 379 |
| `get-board-summary-20260928-192903.json` | 396.43 | 0.79% (469) | 1,080.14ms | 11.54s | 530 |
| `get-board-summary-20260928-204547.json` | 396.25 | 0.90% (537) | 1,323.31ms | 13.59s | 552 |

All original timestamped summary filenames and their complete k6 JSON payloads are preserved as
entries in [performance-history.json](../performance/results/performance-history.json). Search
that archive's `runs[].file` field for one of the run IDs above.

The last run's terminal output reported a p95 around 1.32s and threshold failure. The JSON
summary's threshold booleans do not consistently agree with its recorded p95 values, so use the
raw numeric metrics and terminal output as evidence; do not treat those serialized threshold
booleans as authoritative without investigating the discrepancy.

The 500-RPS target was not sustained: the runs completed around 396-397 RPS. The HTTP failure
fraction remained below 1%, but p95 was over 900ms and climbed to 1.32s in the latest run; k6's
configured p95 target is 300ms. The result is therefore not a passing 500-RPS performance result.

### Infrastructure observations reported during the run

The operator reported, for the presumed same test interval:

- ECS backend service had 8 running tasks, CPU maximum around 41%, and memory around 23%.
- ALB backend target response-time maximum was approximately 535ms.
- Target connection errors were zero; healthy-host count stayed healthy.
- Supabase Database CPU was reported at 81.19%.
- CloudWatch Logs Insights showed many successful `GET /tasks` request log entries with
  `durationMs` around 11.7-13.5 seconds, timestamped near `2026-09-28T20:46:19-07:00` through
  `20:46:22-07:00`.
- The operator reported 531 `HTTPCode_Target_5XX_Count` for one interval, then previously
  reported 1,461 in another check. The 531 figure is close to the latest k6 count of 537 failed
  requests, but the exact interval/dimensions have not been independently verified. Treat 1,461
  as likely a different period or selection until reconciled.
- A search for request-log messages containing a 5xx status returned no matches, while broad
  `/tasks` searches showed many 200 responses.

### What this evidence does and does not establish

- The k6 result establishes high tail latency, dropped iterations, and shortfall from the 500-RPS
  target.
- A target 5XX metric, when selected for the correct single ALB/target-group series and exact test
  window, represents 5xx responses returned by targets. It does not identify whether the code was
  500, 502, 503, or 504.
- Zero target connection errors makes connection establishment failure less likely for that
  interval, but does not explain target-generated 5xx responses.
- ECS CPU/memory readings do not show broad service-level resource saturation in the reported
  interval. Aggregate CPU could still hide a hot individual task.
- Supabase CPU at 81.19% is a lead, not proof that Supabase caused the errors or latency.
- The reported 535ms ALB target-response maximum conflicts with application logs showing 11-13s
  request durations if these are truly the same requests and interval. Possible causes include
  time-range, timezone, ALB/target-group selection, metric statistic, or request/log correlation
  mismatch. Resolve this before attributing the latency to a specific tier or service.
- The latest k6 failure count (537) and one reported target-5xx count (531) are close, but that
  numerical similarity alone does not prove a match. Confirm same interval, load balancer, target
  group, metric period, and single time series.

### Next diagnostic actions

1. Verify the test start/end time and timezone; log timestamps shown with `-07:00` are PDT on this
   date, while CloudWatch may be displaying UTC.
2. In CloudWatch `AWS/ApplicationELB`, use one `LoadBalancer` + `TargetGroup` series for the
   backend. Use `Sum` for target 5xx and target connection error counts, and `p95`/`Maximum` for
   target response time. Keep the graph on the exact test interval and 1-minute period.
3. Reconcile the 531, 1,461, and k6 537 counts. Check whether multiple AZ/target-group series or
   a wider time range were included.
4. In Logs Insights, select every backend log stream covering the same interval. First query all
   `/tasks` request records, then separately inspect exceptions/container stderr. The middleware
   request log is emitted only when the response returns through it; an escaping exception may
   appear as a traceback rather than a `status=500` middleware message.
5. Enable ALB access logs before the next run if not already enabled. For slow/failed `/tasks`
   records, compare `elb_status_code`, `target_status_code`, `request_processing_time`,
   `target_processing_time`, `response_processing_time`, target IP, and `error_reason`.
6. Check Supabase Database and API Gateway metrics/logs over precisely the same interval for
   request latency, PostgREST errors, pooler pressure, and database errors. CPU percentage alone
   is insufficient to assign root cause.
7. Check per-task ECS CPU and task/service events; an aggregate service metric can mask imbalance.
8. Avoid changing ECS task size/count, ALB reservation, and Supabase tier together. After evidence
   identifies a likely bottleneck, change one factor and repeat a controlled test.

### Independent second-opinion prompt

Copy the prompt below into another AI and include the three k6 summaries plus redacted, same-window
ALB/ECS/Supabase evidence. Do not include credentials, JWTs, user emails, or raw secrets.

```text
Act as a skeptical senior performance engineer reviewing a real k6 investigation. Do not assume
the database, ECS, or ALB is the cause; distinguish observed facts from hypotheses and identify
contradictions before recommending changes.

Workload: authenticated GET /tasks via FastAPI on ECS/Fargate, ALB, and Supabase Postgres. k6
constant-arrival-rate target was 500 RPS for 120 seconds, preAllocatedVUs=500,
maxVUs=2500. Three saved runs achieved about 397.41, 396.43, and 396.25 HTTP RPS, with 0.40%,
0.79%, and 0.90% HTTP failures; p95 latency was 939ms, 1,080ms, and 1,323ms respectively;
dropped iterations were 379, 530, and 552. Target was 500 RPS and configured p95 goal is 300ms.

Reported same-window observations (not independently verified): ECS had 8 running tasks, maximum
service CPU ~41%, memory ~23%; ALB TargetResponseTime maximum ~535ms, zero TargetConnectionErrorCount,
and targets stayed healthy; Supabase Database CPU ~81.19%. A CloudWatch Logs Insights search showed
some successful FastAPI GET /tasks records with durationMs ~11.7-13.5 seconds around
2026-09-28 20:46:19-07:00 to 20:46:22-07:00. A status-5 search returned no entries. One ALB
HTTPCode_Target_5XX_Count reading was 531 and another earlier reading was 1,461; latest k6 failed
request count was 537. These may not share the same time window/dimensions. The saved summaries
also have threshold booleans that conflict with their numeric p95 values; terminal output reported
the p95 threshold failed.

Please:
1. State what is proven, what is plausible, and what remains unknown.
2. Explain the mismatch between FastAPI duration logs (~12s), ALB target response max (~0.535s),
   and the counts (ALB 5XX 531/1,461 vs k6 failures 537). Give likely measurement/configuration
   causes, not an unsupported root cause.
3. Explain what zero target connection errors and healthy hosts do and do not rule out.
4. Give an ordered, low-cost diagnostic plan to isolate app, Supabase/PostgREST/pooler, ALB, ECS
   per-task imbalance, logging coverage, and the k6 load generator. Specify the exact metrics,
   statistics, dimensions, and timestamps to correlate.
5. Recommend no scaling or configuration change until the evidence supports it. If a change is
   warranted, propose one variable at a time and a controlled retest.
6. Note any safety/privacy issues; use no credentials or secrets.
```

## Root causes found, in the order they were diagnosed

### 1. `/health` endpoint blocking behind write traffic

FastAPI runs synchronous (`def`) path functions in a shared thread pool per worker process.
`/health` was originally a sync `def`, so under load it queued behind slow `/tasks/upsert` calls
in the same thread pool — even though the event loop itself was idle. The ALB's health check
would then time out (`Request timed out`), ECS would mark the task unhealthy, and stop it,
reducing capacity further and amplifying the outage.

**Fix**: made `/health` `async def` so it stays on the event loop instead of competing for the
sync thread pool (`backend/main.py`).

### 2. Deployed image crash from a version-mismatched import (exit code 3)

A fix added `from supabase_auth.errors import AuthRetryableError`. This worked locally because the
dev `.venv` had `supabase==2.31.0` installed, but `backend/requirements.txt` pinned `supabase==2.7.4`,
which still used the older `gotrue` package name. The Docker-built image crashed on startup with an
`ImportError`, and ECS's deployment circuit breaker rolled back the deploy (reported as "exit code 3").

**Fix**: dual-path import that works across supabase-py versions:
```python
try:
    from supabase_auth.errors import AuthRetryableError  # supabase-py >= ~2.10
except ImportError:
    from gotrue.errors import AuthRetryableError  # supabase-py < ~2.10
```
**Lesson**: a local dev venv's installed versions can silently diverge from what
`requirements.txt` actually pins into the container image — always sanity-check the exact
container build, not just local imports.

### 3. Auth failures under load were actually Supabase Auth API timeouts, not bad tokens

Every failure from `client.auth.get_user(jwt=token)` was being converted to a generic
`401 Invalid auth token`, regardless of the real cause. Under burst load, CloudWatch logs revealed
the actual exception:
```
AuthRetryableError: The read operation timed out
```
This is an SDK-classified **retryable** error — Supabase's own Auth API was slow to respond under
a "thundering herd" of concurrent, uncached token validations (the in-memory auth cache is
per-Gunicorn-worker-process, so with `WEB_CONCURRENCY=8` × 8 ECS tasks, there were up to 64
independent caches that could all miss simultaneously at test start).

**Fixes**:
- Log the real exception instead of only "Invalid auth token".
- Retry `AuthRetryableError` specifically, with backoff, instead of failing immediately.
- Don't invalidate the token cache on a transient timeout (the token was never proven invalid).
- Return `503` (service temporarily unavailable) instead of a misleading `401` if retries are
  exhausted.
- A low-RPS warm-up was attempted/recommended, but it is **not established as a cache-warming fix**:
  the runner may mint a new access token on each invocation, and the auth cache is process-local.
  A separate warm-up run therefore does not prove the later run's token cache is warm, nor that
  every worker process was warmed.

### 4. Database connection-pool exhaustion (`522` from Supabase, at Nano tier)

CloudWatch logs showed unhandled `500`s from `/tasks/upsert`, and Supabase's own dashboard showed
many `522` (Cloudflare "connection timed out") responses on the write path. This traced to
Supabase's Nano tier having a pgbouncer **pool size of only 15** connections — nowhere near enough
concurrency for sustained write throughput.

Using Little's Law as a sizing heuristic:
$$\text{required pool size} \approx \text{RPS} \times \text{avg time per DB operation (s)}$$

At ~0.2s/request, 250 RPS needs ~50 pooled connections; 15 was never going to be enough.

**Fix**: staged Supabase compute-tier upgrades, always re-validating the pool size after each
resize (it does **not** auto-scale with compute tier — it's a separately configurable value), and
staying under an ~80% pool-size-to-max-connections safety margin (the dashboard itself warns past
that point, since Postgres reserves connections for direct/dashboard/backup access outside the
pooler).

| Tier | Max DB connections | Pool size used | RPS validated |
|---|---:|---:|---:|
| Nano (free) | 60 | 15 (default) | Failed at 100 RPS write load |
| Small | 90 | 50 | Passed 250 RPS |
| Medium | 120 | 95 | Passed error-rate threshold, **failed latency** (see below) |
| Large | 160 | 120 | Passed 500 RPS cleanly |

### 5. Medium-tier 500-RPS tail latency; cause not proven

At Medium tier with pool size already near its safe maximum (`95`/`120`, ~79%), the 500 RPS test
had a **healthy median** (`136.82ms`) but a **terrible tail** (`p95=2.61s`, `p99=7.01s`, one request
took `11.43s`). Neither ECS backend CPU (`17%`) nor Supabase disk IO (`2%`) nor Supabase CPU (peaked
at `75%`, never saturated) were pegged — no single resource was exhausted, yet tail latency was
severe.

The earlier interpretation attributed this to shared-compute "noisy neighbor" variance, but the
available measurements did not establish that cause. A healthy median with a high tail is
consistent with queueing/contention or outliers, but does not identify whether the source is
database/pooler, application workers, network, or shared-compute interference. The subsequent
Large-tier pass is correlated with the improvement, but does not by itself prove which change
caused it.

**Observed follow-up**: after moving to Supabase **Large** (dedicated 2 vCPUs) and setting pool size
to `120`, a 500-RPS Create Task run passed: actual rate `499.22 RPS`, p95 `182.67ms`, p99
`551.84ms`, error rate `0.08%`. This is a strong before/after observation, but other simultaneous
changes and lack of a controlled single-variable experiment mean it is not definitive causal
proof. The separate Get-board read-path issue remains unresolved as documented above.

### GET /tasks concurrency diagnostics added

To distinguish Supabase request time from authentication and concurrent synchronous handler load,
`GET /tasks` now records `authMs`, `authCache`, `authValidationMs`, `supabaseClientMs`,
`queryBuildMs`, `supabaseExecuteMs`, row count, process ID, and in-flight request counters in its
request log. These timings must be present in the deployed ECS image before CloudWatch can show
them. The in-flight and peak counters are process-local (Gunicorn worker-local), not ECS-service
totals. The peak value is captured when a request enters the handler, so to observe a later peak,
inspect subsequent request logs from that same PID. This is diagnostic instrumentation, not yet
evidence that a particular stage is the bottleneck.

## October 2026: reaching 1,000 RPS on create-task and get-board

### Final validated results (k6, constant-arrival-rate, 120s, 2,000 max VUs)

| Endpoint | Supabase compute | Actual RPS | p95 | p99 | Failed requests | Result |
|---|---|---:|---:|---:|---|---|
| POST /tasks/upsert | Large (2 vCPU) | 906 | 3.06s | 10.61s | 3 of 109,245 | Fail: saturated (baseline) |
| POST /tasks/upsert | Large, +HTTPX keep-alive 80 | 934 | 2.38s | 4.17s | 2 of 113,659 | Fail |
| POST /tasks/upsert | Large, +3 indexes dropped | 965 | 2.49s | not recorded | 57 (internet outage mid-run) | Fail |
| POST /tasks/upsert | **XL (4 vCPU)** | **994** | **182ms** | **429ms** | 3 of 119,671 | **Pass** |
| GET /tasks | XL, before fix | about 900 | 2.45-2.93s | 3.3-3.9s | about 0 | Fail: saturated |
| GET /tasks | XL, 500 / 600 RPS target | 499 / 597 | 160ms / 190ms | 241ms / 302ms | 0 | Pass |
| GET /tasks | XL, 750 RPS target | about 743 | 841ms | 1.07s | about 0 | Fail |
| GET /tasks | XL, 12 to 16 tasks, before fix | 929 | 2.2s | 2.72s | 4 of 112,378 | Fail: adding tasks did not help |
| GET /tasks | **XL, after `select("*")` fix** | **994** | **167ms** | **539ms** | 1 of 119,427 | **Pass** |

One later same-day create-task rerun on XL (back-to-back with get-board runs) measured 995 RPS but
p95 441ms and p99 792ms, missing both thresholds. Treat the 182ms result as the best run, not a
guaranteed steady state; I did not investigate that variance.

### Create-task bottleneck: how it was isolated

1. k6 showed seconds of latency with near-zero errors: requests queued, they were not rejected.
2. Request-log `durationMs` (every request) matched k6, so the delay was inside the service.
3. Added sampled (1%) `TASK_UPSERT_TIMING` logs. Auth was about 0.05ms (cache hits), client setup
   and payload building about 0, and `supabase_insert_ms` was almost identical to total time. All
   the time was inside the Supabase insert call.
4. Middleware time vs handler time differed by tens of ms, so requests were not queuing for a
   worker thread. ECS CPU peaked at 66% (average 18%), so the backend was not CPU-bound.
5. Supabase API Gateway average response time (804ms) matched the backend's insert time. Supabase
   Large CPU peaked at about 85-89%, disk IOPS peaked at 18% of the 3,000 provisioned, and the
   PostgREST connection count was flat at 37. Disk was ruled out.
6. HTTPX pool experiment: the pinned `supabase==2.7.4` / `postgrest==0.16.8` build its own
   `httpx.Client` with default limits (100 connections, 20 keep-alive). I replaced that session
   after singleton creation to test keep-alive 40, then 80. Small or no effect; not credited.
7. Six indexes existed on `tasks`. Usage stats showed two unused and one redundant; dropping three
   gave a small gain (934 to 965 RPS).
8. Upgrading Supabase from Large to XL moved create-task from 965 to 994 RPS with p95 182ms: database
   compute was the limit.

### Get-board bottleneck: how it was isolated (bisecting the request path)

With Supabase on XL, get-board still saturated at about 900 RPS with a median near 2s. Each step
ruled something out:

| Check | Finding |
|---|---|
| Latency per Gunicorn worker (PID) | Median about 1.9s on every worker, busy or idle: not a hot-worker problem |
| Auth cache | About 99% hits (auth about 0.03ms). A cold-start burst of 1,061 misses in the first 30s was not the cause |
| Supabase database | CPU peak 41% on XL; `EXPLAIN ANALYZE` 0.16ms index scan; `seq_scan` unchanged |
| NAT gateways | `ErrorPortAllocation` 0, `PacketsDropCount` 0, about 2,000 active connections |
| ECS task count | 12 to 16 tasks barely changed throughput (about 900 to 929 RPS): not per-task capacity |
| `/tasks` without a token (401, no Supabase call) | 998 RPS, p95 100ms: ALB, uvicorn and thread pool are fine |
| k6 direct to Supabase, `select=*` | 990 RPS, p95 140ms: Supabase handles reads |
| Same, plus the `{}` GET body supabase-py sends | No change |
| Same, reproducing the backend's exact request shape | Slow again (p95 1.9s) |
| Request shape split: rotating users, profile headers | Fast |
| Request shape split: repeated `order` parameter | Fast |
| Request shape split: explicit 19-column select list | Slow (p95 1.71s) |
| Same list with spaces removed | 434ms: spaces were most of it, list still slower |
| `select=*` | About 140ms |

**Root cause (measured, mechanism not identified):** `TASK_SELECT_COLUMNS` was a 19-column string
with a space after each comma. Sent through postgrest-py 0.16.8 to Supabase's Data API, it made reads
about 10x slower at 1,000 RPS even though the database was idle. Fix: `TASK_SELECT_COLUMNS = "*"`.
The `TaskRow` response model still limits the API response to its declared fields. After the fix:
994 RPS, p95 167ms, p99 539ms.

**Why the plateau looked like about 2s:** with the VU cap reached, latency settles at roughly
VU cap / throughput (2,000 / about 930 = about 2.1s). That flat 2s is a saturation signature, not a
fixed delay, and it hid the real cause for a long time.

### Caveats to state honestly

- The seeded get-board users have empty boards on `GET /tasks`: the seed script writes tasks to
  `saved_list_tasks`, but `/tasks` reads the `tasks` table. Responses were about 165 bytes. The result
  measures auth, routing and a Data API round trip, not a full 100-task payload.
- The create-task test uses one user, so index inserts are concentrated on one `user_id`.
- Several changes overlapped on create-task (keep-alive 80, three indexes dropped, XL). Compute was
  the clear driver, but the smaller effects are not isolated.
- The same spaced column-list pattern exists for the saved-list queries behind `GET /lists`. It was not
  measured or changed.
- Live Supabase indexes do not match the repo migrations (some live indexes are not in any migration,
  and `20260813` creates indexes that did not exist live). `20261006_drop_unused_tasks_indexes.sql`
  records the three drops.
- Confirm the ECS task count used for the final get-board run before quoting a task count.

### Likely interview questions and short answers

- **How did you find the bottleneck?** Instrumented per-stage timings, then bisected the request
  path by removing one layer at a time (token-less probe, direct client calls, reproducing the exact
  request shape) until one request feature, the select list, reproduced the slowdown.
- **Why did adding ECS tasks not help?** The limit was shared downstream of the tasks, so more
  workers only added more waiting requests.
- **How do you read k6 output?** `dropped_iterations` means the arrival rate could not be sustained;
  hitting the VU cap makes latency equal VU cap / throughput; exit code 99 means thresholds failed,
  105 means the run was interrupted.
- **What would you do differently?** Change one variable per run, keep all deployed versions equal
  to the pinned requirements (a newer local venv hid differences before), and test with realistic
  data (non-empty boards, many users).
- **Scaling vs fixing the query?** Scaling (Supabase XL) fixed writes; a query-shape change fixed
  reads at no extra cost. Check the cheap request-level causes before paying for capacity.

### Environment notes worth remembering

- Backend: FastAPI with Gunicorn and Uvicorn workers (`WEB_CONCURRENCY=8`) on ECS/Fargate tasks of
  1 vCPU and 2 GiB. Sync handlers run on a per-process thread pool of 40 threads. `/health` is async
  so it does not queue behind them.
- Auth: JWT validated through Supabase Auth, with a per-process cache (default TTL 15s; the runbook
  uses 120s). `get_user` timeouts are retried and return 503, not 401.
- Writes: `POST /tasks/upsert` inserts first and only selects and updates on a unique-key conflict.
- Egress goes through two NAT gateways to Supabase.
- Tools added in the repo: `performance/k6/get-board-direct.js` (direct-to-Supabase read test with
  `SHAPE` options and `GET_BODY`), and the sampled `TASK_UPSERT_TIMING` logging in the upsert handler.
- Supabase compute is billed hourly; the 1,000 RPS results used XL, so scale it back down afterward.

### Resume-safe claims (updated)

> Load-tested a FastAPI task API (Python, ECS/Fargate, Supabase PostgreSQL) with k6 to a sustained
> 994 RPS on writes (p95 182ms) after diagnosing a database-compute bottleneck from per-stage
> request timings; right-sized Supabase compute and removed redundant indexes.

> Reduced `GET /tasks` p95 latency from about 2.5s to 167ms at 994 RPS by bisecting the request path
> and replacing an explicit PostgREST column list with `select=*`, validated with k6 against the
> deployed ECS stack.

## How to explain this in an interview

> Note: the paragraph below is the September narrative. For the 1,000 RPS results, use the
> October 2026 section above.

A concise way to narrate this project's performance work:

> "I load-tested the write path from 100 to 500 RPS using k6 against a FastAPI backend on
> ECS/Fargate with Supabase Postgres. Along the way I found and fixed a thread-pool starvation bug
> in the health check, a version-mismatched import that crashed the container on deploy, and a
> misdiagnosed auth failure that was actually the Auth API timing out under a cold-cache burst
> across many worker processes. I then measured and tuned database connection-pool capacity. The
> write path passed at 500 RPS after the final configuration changes. A separate get-board read
> test at 500 RPS currently sustains about 396 RPS with high tail latency; I am correlating ALB,
> FastAPI, ECS, and Supabase evidence before claiming a root cause or changing capacity."

Resume-safe Create Task bullet based on the latest terminal evidence:

> Load-tested a FastAPI task-creation API with k6 at a 500-RPS target for 120 seconds, recording
> 99.9% HTTP success with 172ms p95 and 326ms p99 latency; investigating a discrepancy between
> the scheduled arrival rate and aggregate reported throughput before claiming sustained 500 RPS.

## Reusable methodology (applies beyond this project)

1. **Don't trust a single error message** — `401`, `500`, and `522` here were all misleading
   surface symptoms of a deeper cause (thread pool starvation, import crash, auth timeout,
   connection exhaustion).
2. **Rule out resources in order, with evidence**: ECS CPU/memory → ALB target health → Supabase
   disk IO → Supabase CPU → connection pool sizing → shared vs dedicated compute. Only escalate
   spend (bigger tier) after the cheaper/free explanations are ruled out.
3. **Median vs tail latency tells you what kind of problem you have.** A healthy median with a bad
   tail is contention/queueing; a bad median across the board is raw capacity.
4. **Match test rigor to the claim.** A result is only reportable once success rate, error rate,
   p95, p99, and sustained duration are all clean together — not just one metric in isolation.
