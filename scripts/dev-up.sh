#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.dev-runtime"
mkdir -p "${RUNTIME_DIR}"

frontend_pid_file="${RUNTIME_DIR}/frontend.pid"
backend_pid_file="${RUNTIME_DIR}/backend.pid"
frontend_log_file="${RUNTIME_DIR}/frontend.log"
backend_log_file="${RUNTIME_DIR}/backend.log"

cleanup_stale_pid() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pid_file"
    fi
  fi
}

cleanup_stale_pid "$frontend_pid_file"
cleanup_stale_pid "$backend_pid_file"

if [[ -f "$frontend_pid_file" ]] || [[ -f "$backend_pid_file" ]]; then
  echo "One or more dev processes already appear to be running."
  echo "Run npm run dev:status first, or npm run dev:down to stop them."
  exit 1
fi

echo "Starting backend on 127.0.0.1:8000..."
(cd "$ROOT_DIR" && npm run dev:api) >"$backend_log_file" 2>&1 &
echo $! >"$backend_pid_file"

echo "Starting frontend on 127.0.0.1:3000..."
(cd "$ROOT_DIR" && npm run dev) >"$frontend_log_file" 2>&1 &
echo $! >"$frontend_pid_file"

echo "Frontend PID: $(cat "$frontend_pid_file")"
echo "Backend PID:  $(cat "$backend_pid_file")"
echo "Logs:"
echo "  frontend -> $frontend_log_file"
echo "  backend  -> $backend_log_file"
echo ""
echo "Open http://localhost:3000"