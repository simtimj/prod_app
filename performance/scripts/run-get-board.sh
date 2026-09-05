#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SEED_SCRIPT="${SCRIPT_DIR}/seed_test_data.py"
CLEANUP_SCRIPT="${SCRIPT_DIR}/cleanup_test_data.py"
K6_SCRIPT="${REPO_ROOT}/performance/k6/get-board.js"
RESULTS_DIR="${REPO_ROOT}/performance/results"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but was not found in PATH."
  exit 1
fi

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is required but was not found in PATH."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but was not found in PATH."
  exit 1
fi

SEED_USERS="${SEED_USERS:-10}"
SEED_LISTS_PER_USER="${SEED_LISTS_PER_USER:-5}"
SEED_TASKS_PER_USER="${SEED_TASKS_PER_USER:-100}"
SEED_EMAIL_PREFIX="${SEED_EMAIL_PREFIX:-perf.k6.user}"
SEED_EMAIL_DOMAIN="${SEED_EMAIL_DOMAIN:-example.com}"
SEED_PASSWORD="${SEED_PASSWORD:-PerfUser!12345}"

BOARD_BASE_URL="${BOARD_BASE_URL:-http://productivity-backend-alb-782333318.us-east-1.elb.amazonaws.com}"
TARGET_RPS="${TARGET_RPS:-20}"
PREALLOCATED_VUS="${PREALLOCATED_VUS:-200}"
MAX_VUS="${MAX_VUS:-2000}"
DURATION="${DURATION:-30s}"

preflight_http_code="$(curl -sS -o /dev/null -w "%{http_code}" \
  --connect-timeout 3 \
  --max-time 10 \
  "${BOARD_BASE_URL%/}/tasks" || true)"

if [[ "${preflight_http_code}" == "000" ]]; then
  echo "Preflight failed: could not connect to ${BOARD_BASE_URL%/}/tasks"
  echo "Start backend (npm run dev:api) or set BOARD_BASE_URL to a reachable service."
  exit 1
fi

echo "Preflight connectivity check passed (HTTP ${preflight_http_code})"
echo "TARGET_RPS represents requests/sec against /tasks for the default get-board benchmark."

mkdir -p "${RESULTS_DIR}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY_FILE="${RESULTS_DIR}/get-board-summary-${TIMESTAMP}.json"

echo "Seeding test users and board data..."
python3 "${SEED_SCRIPT}" \
  --users "${SEED_USERS}" \
  --lists-per-user "${SEED_LISTS_PER_USER}" \
  --tasks-per-user "${SEED_TASKS_PER_USER}" \
  --email-prefix "${SEED_EMAIL_PREFIX}" \
  --email-domain "${SEED_EMAIL_DOMAIN}" \
  --password "${SEED_PASSWORD}"

echo "Running k6 get-board test..."
k6 run \
  -e BOARD_BASE_URL="${BOARD_BASE_URL}" \
  -e TARGET_RPS="${TARGET_RPS}" \
  -e PREALLOCATED_VUS="${PREALLOCATED_VUS}" \
  -e MAX_VUS="${MAX_VUS}" \
  -e DURATION="${DURATION}" \
  --summary-export "${SUMMARY_FILE}" \
  "${K6_SCRIPT}" "$@"

echo "k6 summary exported to ${SUMMARY_FILE}"

if [[ "${CLEANUP_AFTER_RUN:-0}" == "1" ]]; then
  echo "Cleaning up seeded data..."
  if [[ "${CLEANUP_DELETE_USERS:-0}" == "1" ]]; then
    python3 "${CLEANUP_SCRIPT}" --delete-users
  else
    python3 "${CLEANUP_SCRIPT}"
  fi
fi
