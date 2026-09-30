#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
K6_SCRIPT="${REPO_ROOT}/performance/k6/parse-ai-integration.js"
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
INTEGRATION_REFERENCE_DATE="${INTEGRATION_REFERENCE_DATE:-2026-09-29}"
INTEGRATION_TIMEZONE="${INTEGRATION_TIMEZONE:-America/Los_Angeles}"
REQUEST_SPACING_SECONDS="${REQUEST_SPACING_SECONDS:-3}"

preflight_http_code="$(curl -sS -o /dev/null -w "%{http_code}" \
  --connect-timeout 3 \
  --max-time 10 \
  "${PARSE_AI_BASE_URL%/}/health" || true)"

if [[ "${preflight_http_code}" != "200" ]]; then
  echo "Backend health preflight failed (HTTP ${preflight_http_code}) at ${PARSE_AI_BASE_URL%/}/health"
  exit 1
fi

echo "Backend health preflight passed. Real OpenAI integration test: 30 sequential cases, ${REQUEST_SPACING_SECONDS}s spacing."
echo "Route: ${PARSE_AI_BASE_URL%/}/parse-task"
echo "This sends real provider requests and may incur OpenAI usage charges."

mkdir -p "${RESULTS_DIR}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY_FILE="${RESULTS_DIR}/parse-ai-integration-summary-${TIMESTAMP}.json"

set +e
k6 run \
  -e PARSE_AI_BASE_URL="${PARSE_AI_BASE_URL}" \
  -e INTEGRATION_REFERENCE_DATE="${INTEGRATION_REFERENCE_DATE}" \
  -e INTEGRATION_TIMEZONE="${INTEGRATION_TIMEZONE}" \
  -e REQUEST_SPACING_SECONDS="${REQUEST_SPACING_SECONDS}" \
  --summary-export "${SUMMARY_FILE}" \
  "${K6_SCRIPT}" "$@"
run_exit_code=$?
set -e

echo "Integration summary exported to ${SUMMARY_FILE}"
exit "${run_exit_code}"
