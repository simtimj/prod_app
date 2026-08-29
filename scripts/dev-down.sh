#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.dev-runtime"
frontend_pid_file="${RUNTIME_DIR}/frontend.pid"
backend_pid_file="${RUNTIME_DIR}/backend.pid"

stop_pid_file() {
  local label="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$label: not running"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    echo "$label: stopped (pid $pid)"
  else
    echo "$label: not running"
  fi

  rm -f "$pid_file"
}

stop_pid_file "frontend" "$frontend_pid_file"
stop_pid_file "backend" "$backend_pid_file"

if [[ -d "$RUNTIME_DIR" ]] && [[ -z "$(ls -A "$RUNTIME_DIR" 2>/dev/null)" ]]; then
  rmdir "$RUNTIME_DIR" 2>/dev/null || true
fi