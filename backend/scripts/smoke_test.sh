#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8000}"

check_status() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local body="${4:-}"

  local url="${BASE_URL}${path}"
  local actual

  if [[ -n "$body" ]]; then
    actual=$(curl -sS -o /tmp/task_api_smoke_body.txt -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$body")
  else
    actual=$(curl -sS -o /tmp/task_api_smoke_body.txt -w "%{http_code}" -X "$method" "$url")
  fi

  if [[ "$actual" == "$expected" ]]; then
    echo "PASS ${method} ${path} -> ${actual}"
  else
    echo "FAIL ${method} ${path} -> ${actual} (expected ${expected})"
    echo "Response body:"
    cat /tmp/task_api_smoke_body.txt
    exit 1
  fi
}

echo "Running smoke tests against ${BASE_URL}"
check_status GET /health 200
check_status GET /tasks 401
check_status POST /tasks/upsert 422 '{}'
check_status POST /parse-task 422 '{}'
echo "All smoke checks passed"
