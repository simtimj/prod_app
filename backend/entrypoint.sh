#!/usr/bin/env sh
set -eu

PORT="${PORT:-8000}"
WEB_CONCURRENCY="${WEB_CONCURRENCY:-2}"

exec gunicorn main:app \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WEB_CONCURRENCY}" \
  --timeout 60 \
  --graceful-timeout 30 \
  --keep-alive 5
