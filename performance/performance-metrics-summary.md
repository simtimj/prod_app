# Performance Metrics Summary

Last updated: 2026-09-08

## At-a-Glance

- Best validated create-task run so far:
  - Target RPS: 100
  - Actual RPS: 99.20
  - Success rate: 99.97%
  - p95: 190.94 ms
  - Duration: 120s
- Current observed write-path stress boundary:
  - 250 RPS target is not yet sustainable in current setup.

## Create-Task: Unoptimized vs Optimized

| Phase | Endpoint | Target RPS | Actual RPS | Total Requests | Successful Requests | Failed Requests | Success Rate | Avg Response Time | p95 Response Time | Duration | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Unoptimized baseline | POST /tasks/upsert | 100 | 62.62 | 9,394 | 7,659 | 1,735 | 81.54% | 20.66s | 59.00s | 120s | Saturation + repeated 500s |
| Optimized baseline | POST /tasks/upsert | 100 | 99.20 | 12,000 | 11,996 | 4 | 99.97% | 156.25ms | 190.94ms | 120s | Strong pass; only tail p99 strictness concern |
| Stress attempt (post-opt) | POST /tasks/upsert | 250 | 60.71 | 9,111 | 1,109 | 8,002 | 12.17% | 48.18s | 60.00s | 120s | Hard fail; timeout ceiling behavior |

## Get-Board (/tasks): Historical Baseline

| Phase | Endpoint | Target RPS | Actual RPS | Total Requests | Successful Requests | Failed Requests | Success Rate | Avg Response Time | p95 Response Time | Duration | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Baseline | GET /tasks | 10 | 9.98 | 1,203 | 1,193 | 10 | 99.16% | 247.55ms | 534.11ms | 120s | Stable low-load baseline |
| Saturation sample | GET /tasks | 100 | 70.27 | 9,275 | N/A | 1,315 | 85.83% | N/A | 57.57s | 120s | Pre-optimization saturation |

## Resume-Minimal Fields (Recommended)

Use these fields for recruiter-facing summaries:

| Field | Why it matters |
|---|---|
| Target RPS | Shows intended load goal |
| Actual RPS | Shows what was truly sustained |
| Success Rate | Reliability signal |
| p95 Response Time | User-perceived latency signal |
| Duration | Proves it was sustained, not a spike |
| Environment Snapshot | Gives context (task count/task size) |

## Environment Snapshot (for latest 100 RPS optimized run)

- Backend desired tasks: 4 (fixed during run)
- ECS task size: 1 vCPU / 2 GiB
- Duration: 120s

## Update Template for New Runs

Copy a row into the relevant table and replace values:

| Phase | Endpoint | Target RPS | Actual RPS | Total Requests | Successful Requests | Failed Requests | Success Rate | Avg Response Time | p95 Response Time | Duration | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| <phase> | <method/path> | <target> | <actual> | <total> | <success> | <failed> | <rate> | <avg> | <p95> | <seconds> | <summary> |


