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

PARSE_AI_BASE_URL="${PARSE_AI_BASE_URL:-http://127.0.0.1:3000}"
PARSE_AI_PATH="${PARSE_AI_PATH:-/api/parse-task/mock}"
VUS="${VUS:-20}"
DURATION="${DURATION:-30s}"
SLEEP_SECONDS="${SLEEP_SECONDS:-0.1}"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY_FILE="${RESULTS_DIR}/parse-ai-summary-${TIMESTAMP}.json"

echo "Running parse AI load test against ${PARSE_AI_BASE_URL}${PARSE_AI_PATH}"

k6 run \
  -e PARSE_AI_BASE_URL="${PARSE_AI_BASE_URL}" \
  -e PARSE_AI_PATH="${PARSE_AI_PATH}" \
  -e VUS="${VUS}" \
  -e DURATION="${DURATION}" \
  -e SLEEP_SECONDS="${SLEEP_SECONDS}" \
  --summary-export "${SUMMARY_FILE}" \
  "${K6_SCRIPT}" "$@"

echo "k6 summary exported to ${SUMMARY_FILE}"