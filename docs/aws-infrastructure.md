# AWS Infrastructure Reference (restart guide)

Region: `us-east-1`. Account: `600402507141`. Both load balancers share one VPC.

## Load balancers

| Field | Frontend ALB | Backend ALB |
|---|---|---|
| Name | `productivity-frontend-ALB` | `productivity-backend-ALB` |
| State | Active | Active |
| Type / scheme | Application, internet-facing | Application, internet-facing |
| IP address type | IPv4 | IPv4 |
| VPC | `vpc-0bda38cff9af34eb7` | `vpc-0bda38cff9af34eb7` |
| Availability Zones | 2 | 2 |
| Security group | `sg-04f274246fdc94c4d` | `sg-0cf1d6010dce2f1c1` |
| DNS name | `productivity-frontend-ALB-343806077.us-east-1.elb.amazonaws.com` | `productivity-backend-ALB-782333318.us-east-1.elb.amazonaws.com` |
| ARN | `arn:aws:elasticloadbalancing:us-east-1:600402507141:loadbalancer/app/productivity-frontend-ALB/409e8af986b78e2b` | `arn:aws:elasticloadbalancing:us-east-1:600402507141:loadbalancer/app/productivity-backend-ALB/e6d0e0d254ad36d5` |
| Created | August 26, 2026, 20:08 (UTC-07:00) | August 27, 2026, 12:39 (UTC-07:00) |

- Backend health path: `/health`. Frontend health path: `/healthz`.
- The load tests and `FASTAPI_BASE_URL` default to the backend ALB over HTTP: `http://productivity-backend-alb-782333318.us-east-1.elb.amazonaws.com`.

## Container images (ECR)

- Registry: `600402507141.dkr.ecr.us-east-1.amazonaws.com`
- Backend repository: `productivity/backend` (build from `./backend`, use a new tag each time).
- Frontend image builds from the root `Dockerfile` and needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `FASTAPI_BASE_URL` as build args.

## Backend task settings

- Task size: 1 vCPU (1024), 2 GiB memory.
- `WEB_CONCURRENCY=8`, plus the Gunicorn and auth-cache variables in [backend-100-to-1000-rps-runbook.md](backend-100-to-1000-rps-runbook.md).
- Container health check and target-group health check on `/health`.

## Not recorded here (look up in the console)

- ECS cluster name and the frontend and backend service names.
- Task definition family names and the current image tags.
- Target group names and listener rules.
- NAT gateway IDs (two were in use, one per AZ).
- Supabase project reference.

## Starting everything back up

1. Supabase: confirm the project is active. Compute size: Large is enough for normal use; XL was needed for 1,000 RPS tests (**Project Settings, Compute and Disk**).
2. ECS: set **Desired tasks** on the backend service, then the frontend service. Use at least 2 each for normal use; 10 to 16 backend tasks for load tests. Raise the autoscaling maximum if autoscaling is on.
3. Wait until the backend and frontend target groups show healthy targets.
4. Check `GET /health` on the backend ALB and `/healthz` on the frontend ALB return 200.
5. Check the Fargate vCPU quota allows the task count you want.
6. Run tests from [performance/README.md](../performance/README.md).

## Shutting down to save cost

1. Set ECS desired tasks to 0 for both services (the ALBs still cost money while they exist).
2. Scale Supabase compute back down.
3. Delete the load-test data first if you want a clean start: `npm run perf:cleanup`, and delete the create-task user's rows from `public.tasks`.
