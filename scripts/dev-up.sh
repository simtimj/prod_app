#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run"
mkdir -p "${RUN_DIR}"

FRONTEND_PORT=3000
BACKEND_PORT=8000

if lsof -ti :"${FRONTEND_PORT}" >/dev/null 2>&1; then
  echo "Port ${FRONTEND_PORT} already in use. Run npm run dev:down first."
  exit 1
fi

if lsof -ti :"${BACKEND_PORT}" >/dev/null 2>&1; then
  echo "Port ${BACKEND_PORT} already in use. Run npm run dev:down first."
  exit 1
fi

echo "Starting backend on http://127.0.0.1:${BACKEND_PORT} ..."
nohup bash -lc "cd '${ROOT_DIR}' && npm run dev:api" > "${RUN_DIR}/backend.log" 2>&1 &
echo $! > "${RUN_DIR}/backend.pid"

echo "Starting frontend on http://127.0.0.1:${FRONTEND_PORT} ..."
nohup bash -lc "cd '${ROOT_DIR}' && npm run dev" > "${RUN_DIR}/frontend.log" 2>&1 &
echo $! > "${RUN_DIR}/frontend.pid"

sleep 1
echo
echo "Started:"
echo "- Frontend: http://localhost:${FRONTEND_PORT}"
echo "- Backend:  http://127.0.0.1:${BACKEND_PORT}"
echo
echo "Logs:"
echo "- ${RUN_DIR}/frontend.log"
echo "- ${RUN_DIR}/backend.log"
echo
echo "Use: npm run dev:status"
