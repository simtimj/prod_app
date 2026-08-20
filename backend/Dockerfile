# FROM python:3.12.10-slim-bookworm@sha256:fd95fa221297a88e1cf49c55ec1828edd7c5a428187e67b5d1805692d11588db AS builder

# ENV PYTHONDONTWRITEBYTECODE=1 \
#     PYTHONUNBUFFERED=1 \
#     PIP_DISABLE_PIP_VERSION_CHECK=1

# WORKDIR /app

# RUN python -m venv /opt/venv
# ENV PATH="/opt/venv/bin:$PATH"

# COPY requirements.txt ./
# RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# FROM python:3.12.10-slim-bookworm@sha256:fd95fa221297a88e1cf49c55ec1828edd7c5a428187e67b5d1805692d11588db AS runner

# ENV PYTHONDONTWRITEBYTECODE=1 \
#     PYTHONUNBUFFERED=1 \
#     PIP_DISABLE_PIP_VERSION_CHECK=1 \
#     PATH="/opt/venv/bin:$PATH" \
#   HOME=/home/app \
#     PORT=8000

# WORKDIR /app

# RUN addgroup --system app \
#   && adduser --system --ingroup app --home /home/app app \
#   && mkdir -p /home/app \
#   && chown -R app:app /home/app

# COPY --from=builder /opt/venv /opt/venv
# COPY main.py ./
# COPY entrypoint.sh ./

# RUN chmod +x /app/entrypoint.sh

# USER app
# EXPOSE 8000

# HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
#   CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.getenv(\"PORT\",\"8000\")}/health').read()"

# CMD ["/app/entrypoint.sh"]
