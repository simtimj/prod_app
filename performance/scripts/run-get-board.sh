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

SEED_USERS="${SEED_USERS:-10}"
SEED_LISTS_PER_USER="${SEED_LISTS_PER_USER:-5}"
SEED_TASKS_PER_USER="${SEED_TASKS_PER_USER:-100}"
SEED_EMAIL_PREFIX="${SEED_EMAIL_PREFIX:-perf.k6.user}"
SEED_EMAIL_DOMAIN="${SEED_EMAIL_DOMAIN:-example.com}"
SEED_PASSWORD="${SEED_PASSWORD:-PerfUser!12345}"

BOARD_BASE_URL="${BOARD_BASE_URL:-http://localhost:8000}"
VUS="${VUS:-20}"
DURATION="${DURATION:-30s}"
SLEEP_SECONDS="${SLEEP_SECONDS:-1}"

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
  -e VUS="${VUS}" \
  -e DURATION="${DURATION}" \
  -e SLEEP_SECONDS="${SLEEP_SECONDS}" \
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
