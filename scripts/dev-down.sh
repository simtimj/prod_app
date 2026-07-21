#!/usr/bin/env bash
set -euo pipefail

FRONTEND_PORT=3000
BACKEND_PORT=8000

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti :"${port}" || true)"
  if [[ -n "${pids}" ]]; then
    echo "Stopping processes on port ${port}: ${pids}"
    kill ${pids} || true
  else
    echo "No process found on port ${port}"
  fi
}

stop_port "${FRONTEND_PORT}"
stop_port "${BACKEND_PORT}"

sleep 1
echo "Done. Use npm run dev:status to verify."
