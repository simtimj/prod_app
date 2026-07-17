from __future__ import annotations

import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from openai import APIError, OpenAI
from pydantic import BaseModel

SERVICE_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SERVICE_DIR.parent.parent

# Load env files so the service can access OPENAI_API_KEY from the project root.
load_dotenv(SERVICE_DIR / ".env", override=False)
load_dotenv(WORKSPACE_ROOT / ".env", override=False)
load_dotenv(WORKSPACE_ROOT / ".env.local", override=False)

app = FastAPI(title="Task Parse Service", version="1.0.0")

MODEL_NAME = os.getenv("OPENAI_PARSE_TASK_MODEL", "gpt-4.1-mini")
PARSE_MIN_INTERVAL_MS = 1800
_recent_parse_by_client: dict[str, float] = {}

parse_task_system_prompt = """You convert natural language task requests into a strict JSON object.

Rules:
1) Return ONLY valid JSON matching this shape:
{
  "title": string,
  "dueDate": string | null,
  "dueTime": string | null,
  "description": string | null
}
2) title must be concise and action-oriented.
3) dueDate must be YYYY-MM-DD when date is explicit, otherwise null.
4) dueTime must be HH:MM in 24-hour format when time is explicit (for example 5pm -> 17:00), otherwise null.
5) Resolve relative dates (tomorrow, next Monday, this Friday) using the provided reference date and timezone.
6) If time is mentioned, include concise context in description too.
7) description should preserve useful context from the original user phrase.
8) Never invent dates if unclear.
"""


class ParseTaskRequest(BaseModel):
    text: str
    timezone: Optional[str] = None
    currentDate: Optional[str] = None


class ParsedTaskDraft(BaseModel):
    title: str
    dueDate: Optional[str] = None
    dueTime: Optional[str] = None
    description: Optional[str] = None


class ParseTaskResponse(BaseModel):
    draft: ParsedTaskDraft


class ModelParsedTask(BaseModel):
    title: str
    dueDate: Optional[str] = None
    dueTime: Optional[str] = None
    description: Optional[str] = None


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing OPENAI_API_KEY.")
    return OpenAI(api_key=api_key)


def is_valid_date(value: str) -> bool:
    return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", value))


def is_real_calendar_date(value: str) -> bool:
    if not is_valid_date(value):
        return False

    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False

    return parsed.strftime("%Y-%m-%d") == value


def is_valid_time(value: str) -> bool:
    return bool(re.fullmatch(r"([01][0-9]|2[0-3]):[0-5][0-9]", value))


def normalize_model_result(value: ModelParsedTask) -> ParseTaskResponse:
    normalized_title = value.title.strip()
    normalized_due_date = (value.dueDate or "").strip()
    normalized_due_time = (value.dueTime or "").strip()
    normalized_description = (value.description or "").strip()

    if not normalized_title:
        raise HTTPException(status_code=500, detail="Parsed title is empty.")

    if normalized_due_date and not is_real_calendar_date(normalized_due_date):
        raise HTTPException(status_code=500, detail="Parsed dueDate is invalid. Expected a real YYYY-MM-DD date.")

    if normalized_due_time and not is_valid_time(normalized_due_time):
        raise HTTPException(status_code=500, detail="Parsed dueTime is invalid. Expected HH:MM (24-hour).")

    return ParseTaskResponse(
        draft=ParsedTaskDraft(
            title=normalized_title,
            dueDate=normalized_due_date or None,
            dueTime=normalized_due_time or None,
            description=normalized_description or None,
        )
    )


def get_client_key(x_forwarded_for: Optional[str], x_real_ip: Optional[str]) -> str:
    forwarded = (x_forwarded_for or "").split(",")[0].strip()
    real_ip = (x_real_ip or "").strip()
    return forwarded or real_ip or "unknown"


@app.post("/parse-task", response_model=ParseTaskResponse)
def parse_task(
    body: ParseTaskRequest,
    x_forwarded_for: Optional[str] = Header(default=None),
    x_real_ip: Optional[str] = Header(default=None),
) -> ParseTaskResponse:
    text = body.text.strip()
    timezone_name = (body.timezone or "UTC").strip() or "UTC"
    reference_date = (body.currentDate or "").strip()

    if not text:
        raise HTTPException(status_code=400, detail="Task text is required.")

    if len(text) > 400:
        raise HTTPException(status_code=400, detail="Task text is too long (max 400 chars).")

    now_ms = time.time() * 1000
    client_key = get_client_key(x_forwarded_for, x_real_ip)
    previous_ms = _recent_parse_by_client.get(client_key, 0)
    elapsed_ms = now_ms - previous_ms
    if elapsed_ms < PARSE_MIN_INTERVAL_MS:
        retry_after_seconds = max(1, int((PARSE_MIN_INTERVAL_MS - elapsed_ms + 999) // 1000))
        raise HTTPException(
            status_code=429,
            detail={
                "error": f"Rate limited. Please wait {retry_after_seconds}s and try again.",
                "retryAfterSeconds": retry_after_seconds,
            },
        )
    _recent_parse_by_client[client_key] = now_ms

    if reference_date and not is_real_calendar_date(reference_date):
        raise HTTPException(status_code=400, detail="currentDate must be a real YYYY-MM-DD date.")

    grounded_reference_date = reference_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    user_prompt = "\n".join(
        [
            f"User input: {text}",
            f"Reference date: {grounded_reference_date}",
            f"Timezone: {timezone_name}",
        ]
    )

    try:
        client = get_openai_client()
        completion = client.responses.create(
            model=MODEL_NAME,
            input=[
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": parse_task_system_prompt}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": user_prompt}],
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "parsed_task",
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "title": {"type": "string"},
                            "dueDate": {"type": ["string", "null"]},
                            "dueTime": {"type": ["string", "null"]},
                            "description": {"type": ["string", "null"]},
                        },
                        "required": ["title", "dueDate", "dueTime", "description"],
                    },
                    "strict": True,
                }
            },
        )

        json_text = completion.output_text
        if not json_text:
            raise HTTPException(status_code=502, detail="No parse result returned by model.")

        parsed = ModelParsedTask.model_validate_json(json_text)
        return normalize_model_result(parsed)
    except APIError as exc:
        if exc.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "OpenAI rate limit reached. Please wait a few seconds and try again.",
                    "retryAfterSeconds": 3,
                },
            ) from exc

        message = str(exc) or "OpenAI parse request failed."
        raise HTTPException(status_code=500, detail=message) from exc


@app.exception_handler(HTTPException)
async def normalize_http_exception(_request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return fastapi_json_response(exc.detail, exc.status_code)
    if isinstance(exc.detail, str):
        return fastapi_json_response({"error": exc.detail}, exc.status_code)
    return fastapi_json_response({"error": "Unexpected API error."}, exc.status_code)


def fastapi_json_response(payload: dict, status_code: int):
    from fastapi.responses import JSONResponse

    return JSONResponse(content=payload, status_code=status_code)
