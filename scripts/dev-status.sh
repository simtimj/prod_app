#!/usr/bin/env bash
set -euo pipefail

FRONTEND_PORT=3000
BACKEND_PORT=8000

echo "Frontend (${FRONTEND_PORT}):"
lsof -nP -iTCP:${FRONTEND_PORT} -sTCP:LISTEN || true
echo
echo "Backend (${BACKEND_PORT}):"
lsof -nP -iTCP:${BACKEND_PORT} -sTCP:LISTEN || true
echo
echo "Frontend URL: http://localhost:${FRONTEND_PORT}"
echo "Backend URL:  http://127.0.0.1:${BACKEND_PORT}"
