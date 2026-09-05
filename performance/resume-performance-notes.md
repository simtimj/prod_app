# Resume Performance Notes

Last updated: 2026-09-04
Owner: juliussimtim

## Purpose
This file is a sidecar for resume-ready performance evidence and wording.
Append new benchmark outcomes here so final resume bullets can be generated quickly.

## Current Baselines

### Get Board (/tasks endpoint only)
Test command shape:
TARGET_RPS=<n> DURATION=<window> npm run perf:get-board

10 RPS run (2 minutes)
- Actual RPS: 9.98
- Total requests: 1203
- Successful requests: 1193
- Failed requests: 10
- Success rate: 99.16%
- Average response time: 247.55 ms
- p95 response time: 534.11 ms
- ECS backend CPU: avg 15.69%, peak 15.69%
- Interpretation: stable baseline with low-but-nonzero failures.

100 RPS run (2 minutes)
- Actual RPS: 70.27
- Total requests: 9275
- Failed requests: 1315 (14.17%)
- p95 response time: 57.57 s
- p99 response time: 60 s
- Dropped iterations: 2726
- Interpretation: saturation at this target without optimization.

### Create Task (/tasks/upsert)
- Low-rate validation succeeds after auth/token flow fixes.
- High-rate (100 RPS class) currently degrades heavily and is considered unoptimized ceiling.
- Action item: capture exact 100 RPS create-task metrics here when rerun.

## Resume Bullet Drafts

Short bullets (results-focused)
- Built and ran k6 performance benchmarks for read and write task APIs, establishing repeatable 10 to 100 RPS baselines against production-like ALB infrastructure.
- Achieved 9.98 actual RPS at a 10 RPS target for task board reads over 2 minutes with 99.16% success and 247.55 ms average latency.
- Identified system saturation at 100 RPS target (70.27 actual RPS, 14.17% failures, p95 57.57 s, dropped iterations), creating a clear optimization roadmap.

Technical bullets (implementation-focused)
- Refactored load tests to support direct ALB targeting and environment-driven configuration for repeatable local and deployed benchmarking.
- Hardened authentication test flow by stabilizing token minting and validating JWT-based request paths for k6 automation.
- Simplified board benchmarking to a single-endpoint test for high-signal baseline tracking while preserving a composite benchmark variant for deeper diagnostics.

## Project Summary Wording
Built a production-oriented performance testing workflow for a task management stack (Next.js frontend, FastAPI backend, Supabase data layer) using k6. Created reproducible read/write API benchmarks, captured baseline throughput and latency at multiple load tiers, and surfaced clear saturation behavior under higher concurrency. Used these findings to prioritize backend optimization work (worker concurrency, auth caching, and query/index tuning) with measurable before-and-after targets.

## Next Data To Add
- Exact create-task metrics at 10 RPS and 100 RPS over 120 seconds.
- Post-optimization reruns at 50 RPS and 100 RPS.
- Any ALB/DB metrics that correlate with timeout behavior.

## Optimization Log
- 2026-09-04: Added tasks read index migration `supabase/migrations/20260904_add_tasks_read_index.sql` to support `/tasks` query pattern (`user_id`, `archived`, `position`, `created_at`).
- 2026-09-04: Optimized `POST /tasks/upsert` in `backend/main.py` to insert-first, then resolve/update only on unique-key conflict, reducing typical DB round trips for create-heavy load tests.
