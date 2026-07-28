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

exec k6 run "${K6_TEST_FILE}" "$@"
