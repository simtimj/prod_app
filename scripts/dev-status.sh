#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.dev-runtime"
frontend_pid_file="${RUNTIME_DIR}/frontend.pid"
backend_pid_file="${RUNTIME_DIR}/backend.pid"

report_status() {
  local label="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$label: stopped"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "$label: running (pid $pid)"
  else
    echo "$label: stale pid file"
  fi
}

report_status "frontend" "$frontend_pid_file"
report_status "backend" "$backend_pid_file"