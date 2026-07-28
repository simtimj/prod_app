#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.local"
K6_TEST_FILE="${SCRIPT_DIR}/create-task.js"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${ACCESS_TOKEN:-}" && -n "${SUPABASE_USER_ACCESS_TOKEN:-}" ]]; then
  ACCESS_TOKEN="${SUPABASE_USER_ACCESS_TOKEN}"
fi

if [[ -z "${ACCESS_TOKEN:-}" ]]; then
  echo "Missing ACCESS_TOKEN."
  echo ""
  echo "Set one of these before running:"
  echo "  1) ACCESS_TOKEN (preferred)"
  echo "  2) SUPABASE_USER_ACCESS_TOKEN"
  echo ""
  echo "Example:"
  echo "  ACCESS_TOKEN='<supabase_user_access_token>' ${0##*/}"
  exit 1
fi

if [[ "${ACCESS_TOKEN}" != *.*.* ]]; then
  echo "ACCESS_TOKEN does not look like a JWT."
  echo "Use a real Supabase user access token, not anon/service keys."
  exit 1
fi

exec k6 run "${K6_TEST_FILE}" "$@"
