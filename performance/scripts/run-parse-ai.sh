#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
K6_SCRIPT="${REPO_ROOT}/performance/k6/parse-ai.js"
RESULTS_DIR="${REPO_ROOT}/performance/results"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is required but was not found in PATH."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but was not found in PATH."
  exit 1
fi

PARSE_AI_BASE_URL="${PARSE_AI_BASE_URL:-http://productivity-backend-alb-782333318.us-east-1.elb.amazonaws.com}"
PARSE_AI_PATH="${PARSE_AI_PATH:-/parse-task/mock}"
TARGET_RPS="${TARGET_RPS:-40}"
PREALLOCATED_VUS="${PREALLOCATED_VUS:-200}"
MAX_VUS="${MAX_VUS:-2000}"
DURATION="${DURATION:-30s}"

if [[ "${PARSE_AI_PATH}" == "/parse-task" ]]; then
  if (( TARGET_RPS > 50 )) && [[ "${ALLOW_REAL_PARSE_HIGH_RPS:-0}" != "1" ]]; then
    echo "Refusing high-RPS run against /parse-task (OpenAI-backed) with TARGET_RPS=${TARGET_RPS}."
    echo "Use /parse-task/mock for high-throughput tests, or set ALLOW_REAL_PARSE_HIGH_RPS=1 to override intentionally."
    exit 1
  fi
fi

preflight_http_code="$(curl -sS -o /dev/null -w "%{http_code}" \
  --connect-timeout 3 \
  --max-time 10 \
  -X POST "${PARSE_AI_BASE_URL%/}${PARSE_AI_PATH}" \
  -H "Content-Type: application/json" \
  -d '{}' || true)"

if [[ "${preflight_http_code}" == "000" ]]; then
  echo "Preflight failed: could not connect to ${PARSE_AI_BASE_URL%/}${PARSE_AI_PATH}"
  echo "Start frontend/backend (npm run dev:up) or set PARSE_AI_BASE_URL/PARSE_AI_PATH to a reachable service."
  exit 1
fi

echo "Preflight connectivity check passed (HTTP ${preflight_http_code})"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY_FILE="${RESULTS_DIR}/parse-ai-summary-${TIMESTAMP}.json"

echo "Running parse AI load test against ${PARSE_AI_BASE_URL}${PARSE_AI_PATH}"

k6 run \
  -e PARSE_AI_BASE_URL="${PARSE_AI_BASE_URL}" \
  -e PARSE_AI_PATH="${PARSE_AI_PATH}" \
  -e TARGET_RPS="${TARGET_RPS}" \
  -e PREALLOCATED_VUS="${PREALLOCATED_VUS}" \
  -e MAX_VUS="${MAX_VUS}" \
  -e DURATION="${DURATION}" \
  --summary-export "${SUMMARY_FILE}" \
  "${K6_SCRIPT}" "$@"

echo "k6 summary exported to ${SUMMARY_FILE}"