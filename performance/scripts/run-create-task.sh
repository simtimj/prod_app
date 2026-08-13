#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.local"
K6_SCRIPT="${REPO_ROOT}/performance/k6/create-task.js"
RESULTS_DIR="${REPO_ROOT}/performance/results"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is required but was not found in PATH."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but was not found in PATH."
  exit 1
fi

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

# Map common frontend env names to backend/auth names for convenience.
if [[ -z "${SUPABASE_URL:-}" && -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
fi

if [[ -z "${SUPABASE_ANON_KEY:-}" && -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
fi

if [[ -z "${ACCESS_TOKEN:-}" && -n "${SUPABASE_USER_ACCESS_TOKEN:-}" ]]; then
  ACCESS_TOKEN="${SUPABASE_USER_ACCESS_TOKEN}"
fi

# If no token is provided, optionally mint one from test credentials.
if [[ -z "${ACCESS_TOKEN:-}" ]]; then
  if [[ -n "${SUPABASE_TEST_EMAIL:-}" && -n "${SUPABASE_TEST_PASSWORD:-}" && -n "${SUPABASE_URL:-}" && -n "${SUPABASE_ANON_KEY:-}" ]]; then
    auth_url="${SUPABASE_URL%/}/auth/v1/token?grant_type=password"

    auth_response="$(curl -sS -X POST "${auth_url}" \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"${SUPABASE_TEST_EMAIL}\",\"password\":\"${SUPABASE_TEST_PASSWORD}\"}" \
      || true)"

    ACCESS_TOKEN="$(printf '%s' "${auth_response}" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

    if [[ -z "${ACCESS_TOKEN:-}" ]]; then
      echo "Failed to mint ACCESS_TOKEN from SUPABASE_TEST_EMAIL/SUPABASE_TEST_PASSWORD."
      echo "Supabase response: ${auth_response}"
      exit 1
    fi
  fi
fi

if [[ -z "${ACCESS_TOKEN:-}" ]]; then
  echo "Missing ACCESS_TOKEN."
  echo ""
  echo "Set one of these before running:"
  echo "  1) ACCESS_TOKEN (preferred)"
  echo "  2) SUPABASE_USER_ACCESS_TOKEN"
  echo "  3) SUPABASE_TEST_EMAIL + SUPABASE_TEST_PASSWORD (auto-mints token)"
  echo ""
  echo "Example:"
  echo "  ACCESS_TOKEN='<supabase_user_access_token>' ${0##*/}"
  echo "  SUPABASE_TEST_EMAIL='you@example.com' SUPABASE_TEST_PASSWORD='password' ${0##*/}"
  exit 1
fi

if [[ "${ACCESS_TOKEN}" != *.*.* ]]; then
  echo "ACCESS_TOKEN does not look like a JWT."
  echo "Use a real Supabase user access token, not anon/service keys."
  exit 1
fi

export ACCESS_TOKEN

CREATE_TASK_BASE_URL="${CREATE_TASK_BASE_URL:-http://127.0.0.1:8000}"
TARGET_RPS="${TARGET_RPS:-50}"
PREALLOCATED_VUS="${PREALLOCATED_VUS:-200}"
MAX_VUS="${MAX_VUS:-2000}"
DURATION="${DURATION:-30s}"

preflight_http_code="$(curl -sS -o /dev/null -w "%{http_code}" \
  --connect-timeout 3 \
  --max-time 10 \
  -X POST "${CREATE_TASK_BASE_URL%/}/tasks/upsert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{}' || true)"

if [[ "${preflight_http_code}" == "000" ]]; then
  echo "Preflight failed: could not connect to ${CREATE_TASK_BASE_URL%/}/tasks/upsert"
  echo "Start backend (npm run dev:api) or set CREATE_TASK_BASE_URL to a reachable service."
  exit 1
fi

echo "Preflight connectivity check passed (HTTP ${preflight_http_code})"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY_FILE="${RESULTS_DIR}/create-task-summary-${TIMESTAMP}.json"

echo "Running create-task load test against ${CREATE_TASK_BASE_URL}"

exec k6 run \
  -e ACCESS_TOKEN="${ACCESS_TOKEN}" \
  -e CREATE_TASK_BASE_URL="${CREATE_TASK_BASE_URL}" \
  -e TARGET_RPS="${TARGET_RPS}" \
  -e PREALLOCATED_VUS="${PREALLOCATED_VUS}" \
  -e MAX_VUS="${MAX_VUS}" \
  -e DURATION="${DURATION}" \
  --summary-export "${SUMMARY_FILE}" \
  "${K6_SCRIPT}" "$@"
