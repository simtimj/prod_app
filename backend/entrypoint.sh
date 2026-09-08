#!/usr/bin/env sh
set -eu

PORT="${PORT:-8000}"
WEB_CONCURRENCY="${WEB_CONCURRENCY:-2}"
GUNICORN_TIMEOUT="${GUNICORN_TIMEOUT:-60}"
GUNICORN_GRACEFUL_TIMEOUT="${GUNICORN_GRACEFUL_TIMEOUT:-30}"
GUNICORN_KEEP_ALIVE="${GUNICORN_KEEP_ALIVE:-5}"
GUNICORN_MAX_REQUESTS="${GUNICORN_MAX_REQUESTS:-0}"
GUNICORN_MAX_REQUESTS_JITTER="${GUNICORN_MAX_REQUESTS_JITTER:-0}"

extra_args=""
if [ "${GUNICORN_MAX_REQUESTS}" != "0" ]; then
  extra_args="${extra_args} --max-requests ${GUNICORN_MAX_REQUESTS}"
fi

if [ "${GUNICORN_MAX_REQUESTS_JITTER}" != "0" ]; then
  extra_args="${extra_args} --max-requests-jitter ${GUNICORN_MAX_REQUESTS_JITTER}"
fi

exec gunicorn main:app \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WEB_CONCURRENCY}" \
  --timeout "${GUNICORN_TIMEOUT}" \
  --graceful-timeout "${GUNICORN_GRACEFUL_TIMEOUT}" \
  --keep-alive "${GUNICORN_KEEP_ALIVE}" \
  ${extra_args}
