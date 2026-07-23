from __future__ import annotations

import os
import re
import time
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request
from openai import APIError, OpenAI
from pydantic import BaseModel, Field
from supabase import Client, create_client

SERVICE_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SERVICE_DIR.parent.parent

# Load env files so the service can access OPENAI_API_KEY from the project root.
load_dotenv(SERVICE_DIR / ".env", override=False)
load_dotenv(WORKSPACE_ROOT / ".env", override=False)
load_dotenv(WORKSPACE_ROOT / ".env.local", override=False)

app = FastAPI(title="Task API Service", version="1.0.0")

logger = logging.getLogger("task_api")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

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

TASK_SELECT_COLUMNS = (
    "id, user_id, title, completed, recurrence_enabled, recurrence_frequency, "
    "recurrence_weekdays, recurrence_month_days, tag, tag_color, description, "
    "due_date, due_time, priority, created_at, updated_at, position, archived, archived_at"
)
SAVED_LIST_SELECT_COLUMNS = "id, user_id, name, position, created_at, updated_at"
SAVED_LIST_TASK_SELECT_COLUMNS = (
    "id, user_id, list_id, title, completed, recurrence_enabled, recurrence_frequency, "
    "recurrence_weekdays, recurrence_month_days, tag, tag_color, description, "
    "due_date, due_time, priority, position, created_at, updated_at"
)
BACKLOG_LIST_ID = "backlog"
BACKLOG_LIST_NAME = "Backlog"

Priority = Literal["Low", "Medium", "High"]
RecurrenceFrequency = Literal["daily", "weekly", "monthly"]


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


class TaskRow(BaseModel):
    id: str
    user_id: str
    title: str
    completed: bool
    recurrence_enabled: bool
    recurrence_frequency: Optional[RecurrenceFrequency] = None
    recurrence_weekdays: Optional[list[int]] = None
    recurrence_month_days: Optional[list[int]] = None
    tag: Optional[str] = None
    tag_color: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    priority: Optional[Priority] = None
    created_at: str
    updated_at: str
    position: int
    archived: bool
    archived_at: Optional[str] = None


class TaskListResponse(BaseModel):
    tasks: list[TaskRow]


class TaskUpsertPayload(BaseModel):
    id: str
    title: str
    completed: bool = False
    recurrence_enabled: bool = False
    recurrence_frequency: Optional[RecurrenceFrequency] = None
    recurrence_weekdays: Optional[list[int]] = None
    recurrence_month_days: Optional[list[int]] = None
    tag: Optional[str] = None
    tag_color: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    priority: Optional[Priority] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class UpsertTaskRequest(BaseModel):
    task: TaskUpsertPayload
    position: int = Field(ge=0)


class ReorderItem(BaseModel):
    task_id: str
    due_date: str
    position: int = Field(ge=0)


class ReorderTasksRequest(BaseModel):
    updates: list[ReorderItem]


class ArchiveTaskRequest(BaseModel):
    archived: bool


class OkResponse(BaseModel):
    ok: bool = True


class HealthResponse(BaseModel):
    status: str
    service: str
    utcTime: str


class SavedListTaskRow(BaseModel):
    id: str
    user_id: str
    list_id: str
    title: str
    completed: bool
    recurrence_enabled: bool
    recurrence_frequency: Optional[RecurrenceFrequency] = None
    recurrence_weekdays: Optional[list[int]] = None
    recurrence_month_days: Optional[list[int]] = None
    tag: Optional[str] = None
    tag_color: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    priority: Optional[Priority] = None
    created_at: str
    updated_at: str
    position: int


class SavedListRow(BaseModel):
    id: str
    user_id: str
    name: str
    position: int
    created_at: str
    updated_at: str
    tasks: list[SavedListTaskRow]


class SavedListsResponse(BaseModel):
    lists: list[SavedListRow]


class SavedListTaskPayload(BaseModel):
    id: Optional[str] = None
    title: str
    completed: bool = False
    recurrence_enabled: bool = False
    recurrence_frequency: Optional[RecurrenceFrequency] = None
    recurrence_weekdays: Optional[list[int]] = None
    recurrence_month_days: Optional[list[int]] = None
    tag: Optional[str] = None
    tag_color: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    priority: Optional[Priority] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SavedListPayload(BaseModel):
    id: str
    name: str
    tasks: list[SavedListTaskPayload] = Field(default_factory=list)


class SyncSavedListsRequest(BaseModel):
    lists: list[SavedListPayload]


class UserSettingsPayload(BaseModel):
    settings: dict[str, Any] = Field(default_factory=dict)


class UserSettingsResponse(BaseModel):
    settings: dict[str, Any] = Field(default_factory=dict)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def get_supabase_admin() -> Client:
    # Accept frontend URL var as fallback to reduce local-env duplication.
    supabase_url = (
        os.getenv("SUPABASE_URL", "").strip()
        or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    )
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    missing_fields: list[str] = []
    if not supabase_url:
        missing_fields.append("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)")
    if not service_role_key:
        missing_fields.append("SUPABASE_SERVICE_ROLE_KEY")

    if missing_fields:
        raise HTTPException(
            status_code=500,
            detail=(
                "Missing Supabase backend credentials: "
                + ", ".join(missing_fields)
                + ". Note: NEXT_PUBLIC_SUPABASE_ANON_KEY is not a service-role key and cannot be used here."
            ),
        )

    return create_client(supabase_url, service_role_key)


def extract_bearer_token(authorization: Optional[str]) -> str:
    value = (authorization or "").strip()
    if not value.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    token = value.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    return token


def get_current_user_id(authorization: Optional[str]) -> str:
    token = extract_bearer_token(authorization)
    client = get_supabase_admin()

    try:
        result = client.auth.get_user(jwt=token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid auth token.") from exc

    user = getattr(result, "user", None)
    if user is None and isinstance(result, dict):
        user = result.get("user")

    user_id: Optional[str]
    if user is None:
        user_id = None
    elif isinstance(user, dict):
        user_id = user.get("id")
    else:
        user_id = getattr(user, "id", None)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth token.")

    return str(user_id)


def validate_task_payload(task: TaskUpsertPayload) -> None:
    title = task.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Task title is required.")

    if task.due_date and not is_real_calendar_date(task.due_date):
        raise HTTPException(status_code=400, detail="due_date must be a real YYYY-MM-DD date.")

    if task.due_time and not is_valid_time(task.due_time):
        raise HTTPException(status_code=400, detail="due_time must be HH:MM (24-hour).")

    if not task.recurrence_enabled:
        return

    if task.recurrence_frequency is None:
        raise HTTPException(status_code=400, detail="recurrence_frequency is required when recurrence is enabled.")

    if task.recurrence_frequency == "weekly":
        weekdays = task.recurrence_weekdays or []
        if not weekdays:
            raise HTTPException(status_code=400, detail="recurrence_weekdays is required for weekly recurrence.")
        if any((not isinstance(value, int) or value < 0 or value > 6) for value in weekdays):
            raise HTTPException(status_code=400, detail="recurrence_weekdays values must be between 0 and 6.")

    if task.recurrence_frequency == "monthly":
        month_days = task.recurrence_month_days or []
        if not month_days:
            raise HTTPException(status_code=400, detail="recurrence_month_days is required for monthly recurrence.")
        if any((not isinstance(value, int) or value < 1 or value > 31) for value in month_days):
            raise HTTPException(status_code=400, detail="recurrence_month_days values must be between 1 and 31.")


def validate_saved_list_task_payload(task: SavedListTaskPayload) -> None:
    title = task.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Saved list task title is required.")

    if task.due_date and not is_real_calendar_date(task.due_date):
        raise HTTPException(status_code=400, detail="Saved list task due_date must be a real YYYY-MM-DD date.")

    if task.due_time and not is_valid_time(task.due_time):
        raise HTTPException(status_code=400, detail="Saved list task due_time must be HH:MM (24-hour).")

    if not task.recurrence_enabled:
        return

    if task.recurrence_frequency is None:
        raise HTTPException(status_code=400, detail="Saved list recurrence_frequency is required when recurrence is enabled.")

    if task.recurrence_frequency == "weekly":
        weekdays = task.recurrence_weekdays or []
        if not weekdays:
            raise HTTPException(status_code=400, detail="Saved list recurrence_weekdays is required for weekly recurrence.")
        if any((not isinstance(value, int) or value < 0 or value > 6) for value in weekdays):
            raise HTTPException(status_code=400, detail="Saved list recurrence_weekdays values must be between 0 and 6.")

    if task.recurrence_frequency == "monthly":
        month_days = task.recurrence_month_days or []
        if not month_days:
            raise HTTPException(status_code=400, detail="Saved list recurrence_month_days is required for monthly recurrence.")
        if any((not isinstance(value, int) or value < 1 or value > 31) for value in month_days):
            raise HTTPException(status_code=400, detail="Saved list recurrence_month_days values must be between 1 and 31.")


def ensure_backlog_list(client: Client, user_id: str) -> None:
    existing = (
        client.table("saved_lists")
        .select("id")
        .eq("user_id", user_id)
        .eq("id", BACKLOG_LIST_ID)
        .limit(1)
        .execute()
    )

    if existing.data:
        return

    current_time = now_iso()
    client.table("saved_lists").upsert(
        {
            "id": BACKLOG_LIST_ID,
            "user_id": user_id,
            "name": BACKLOG_LIST_NAME,
            "position": 0,
            "created_at": current_time,
            "updated_at": current_time,
        },
        on_conflict="user_id,id",
    ).execute()


def load_user_settings(client: Client, user_id: str) -> dict[str, Any]:
    result = client.table("user_settings").select("settings").eq("user_id", user_id).limit(1).execute()
    row = (result.data or [None])[0]
    if not row:
        return {}

    settings = row.get("settings") if isinstance(row, dict) else None
    return settings if isinstance(settings, dict) else {}


@app.middleware("http")
async def log_task_route_requests(request: Request, call_next):
    should_log = request.url.path.startswith("/tasks")
    start_ms = time.perf_counter() if should_log else 0.0

    response = await call_next(request)

    if should_log:
        elapsed_ms = (time.perf_counter() - start_ms) * 1000
        logger.info(
            "request method=%s path=%s status=%s durationMs=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )

    return response


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="task-api", utcTime=now_iso())


@app.get("/tasks", response_model=TaskListResponse)
def list_tasks(
    includeArchived: bool = Query(default=True),
    authorization: Optional[str] = Header(default=None),
) -> TaskListResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()

    query = (
        client.table("tasks")
        .select(TASK_SELECT_COLUMNS)
        .eq("user_id", user_id)
        .order("archived", desc=False)
        .order("position", desc=False)
        .order("created_at", desc=False)
    )

    if not includeArchived:
        query = query.eq("archived", False)

    result = query.execute()
    rows = result.data or []
    return TaskListResponse(tasks=rows)


@app.get("/lists", response_model=SavedListsResponse)
def list_saved_lists(authorization: Optional[str] = Header(default=None)) -> SavedListsResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()

    ensure_backlog_list(client, user_id)

    lists_result = (
        client.table("saved_lists")
        .select(SAVED_LIST_SELECT_COLUMNS)
        .eq("user_id", user_id)
        .order("position", desc=False)
        .order("created_at", desc=False)
        .execute()
    )
    task_result = (
        client.table("saved_list_tasks")
        .select(SAVED_LIST_TASK_SELECT_COLUMNS)
        .eq("user_id", user_id)
        .order("position", desc=False)
        .order("created_at", desc=False)
        .execute()
    )

    task_rows = task_result.data or []
    tasks_by_list: dict[str, list[dict[str, Any]]] = {}
    for row in task_rows:
        tasks_by_list.setdefault(str(row["list_id"]), []).append(row)

    rows = [
        {
            **row,
            "tasks": tasks_by_list.get(str(row["id"]), []),
        }
        for row in (lists_result.data or [])
    ]
    return SavedListsResponse(lists=rows)


@app.get("/settings", response_model=UserSettingsResponse)
def get_user_settings(authorization: Optional[str] = Header(default=None)) -> UserSettingsResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()
    return UserSettingsResponse(settings=load_user_settings(client, user_id))


@app.put("/settings", response_model=OkResponse)
def upsert_user_settings(
    body: UserSettingsPayload,
    authorization: Optional[str] = Header(default=None),
) -> OkResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()
    current_time = now_iso()

    client.table("user_settings").upsert(
        {
            "user_id": user_id,
            "settings": body.settings,
            "created_at": current_time,
            "updated_at": current_time,
        },
        on_conflict="user_id",
    ).execute()

    return OkResponse()


@app.post("/lists/sync", response_model=OkResponse)
def sync_saved_lists(
    body: SyncSavedListsRequest,
    authorization: Optional[str] = Header(default=None),
) -> OkResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()
    current_time = now_iso()

    seen_ids: set[str] = set()
    normalized_lists: list[SavedListPayload] = []
    for incoming_list in body.lists:
        list_id = incoming_list.id.strip()
        list_name = incoming_list.name.strip()

        if not list_id:
            raise HTTPException(status_code=400, detail="Saved list id is required.")
        if not list_name:
            raise HTTPException(status_code=400, detail="Saved list name is required.")
        if list_id in {"recurring", "archive"}:
            raise HTTPException(status_code=400, detail="Recurring and Archive are managed system lists and cannot be synced.")
        if list_id in seen_ids:
            raise HTTPException(status_code=400, detail="Saved list ids must be unique.")

        seen_ids.add(list_id)
        normalized_lists.append(
            SavedListPayload(
                id=list_id,
                name=BACKLOG_LIST_NAME if list_id == BACKLOG_LIST_ID else list_name,
                tasks=incoming_list.tasks,
            )
        )

    if BACKLOG_LIST_ID not in seen_ids:
        normalized_lists.insert(0, SavedListPayload(id=BACKLOG_LIST_ID, name=BACKLOG_LIST_NAME, tasks=[]))

    existing_lists_result = (
        client.table("saved_lists")
        .select("id, created_at")
        .eq("user_id", user_id)
        .execute()
    )
    existing_by_id = {str(row["id"]): row for row in (existing_lists_result.data or [])}

    list_rows: list[dict[str, Any]] = []
    task_rows: list[dict[str, Any]] = []
    for list_position, saved_list in enumerate(normalized_lists):
        existing_row = existing_by_id.get(saved_list.id)
        list_rows.append(
            {
                "id": saved_list.id,
                "user_id": user_id,
                "name": saved_list.name,
                "position": list_position,
                "created_at": existing_row.get("created_at") if existing_row else current_time,
                "updated_at": current_time,
            }
        )

        for task_position, task in enumerate(saved_list.tasks):
            validate_saved_list_task_payload(task)
            task_rows.append(
                {
                    "id": task.id or str(uuid4()),
                    "user_id": user_id,
                    "list_id": saved_list.id,
                    "title": task.title.strip(),
                    "completed": bool(task.completed),
                    "recurrence_enabled": bool(task.recurrence_enabled),
                    "recurrence_frequency": task.recurrence_frequency if task.recurrence_enabled else None,
                    "recurrence_weekdays": task.recurrence_weekdays if task.recurrence_enabled and task.recurrence_frequency == "weekly" else None,
                    "recurrence_month_days": task.recurrence_month_days if task.recurrence_enabled and task.recurrence_frequency == "monthly" else None,
                    "tag": task.tag,
                    "tag_color": task.tag_color,
                    "description": task.description,
                    "due_date": task.due_date,
                    "due_time": task.due_time,
                    "priority": task.priority,
                    "position": task_position,
                    "created_at": task.created_at or current_time,
                    "updated_at": task.updated_at or current_time,
                }
            )

    client.table("saved_list_tasks").delete().eq("user_id", user_id).execute()
    client.table("saved_lists").delete().eq("user_id", user_id).neq("id", "").execute()
    if list_rows:
        client.table("saved_lists").insert(list_rows).execute()
    if task_rows:
        client.table("saved_list_tasks").insert(task_rows).execute()

    return OkResponse()


@app.post("/tasks/upsert", response_model=OkResponse)
def upsert_task(
    body: UpsertTaskRequest,
    authorization: Optional[str] = Header(default=None),
) -> OkResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()

    validate_task_payload(body.task)
    task = body.task
    current_time = now_iso()

    payload: dict[str, Any] = {
        "id": task.id,
        "user_id": user_id,
        "title": task.title.strip(),
        "completed": bool(task.completed),
        "recurrence_enabled": bool(task.recurrence_enabled),
        "recurrence_frequency": task.recurrence_frequency if task.recurrence_enabled else None,
        "recurrence_weekdays": task.recurrence_weekdays if task.recurrence_enabled and task.recurrence_frequency == "weekly" else None,
        "recurrence_month_days": task.recurrence_month_days if task.recurrence_enabled and task.recurrence_frequency == "monthly" else None,
        "tag": task.tag,
        "tag_color": task.tag_color,
        "description": task.description,
        "due_date": task.due_date,
        "due_time": task.due_time,
        "priority": task.priority,
        "position": body.position,
        "archived": False,
        "archived_at": None,
        "created_at": task.created_at or current_time,
        "updated_at": task.updated_at or current_time,
    }

    client.table("tasks").upsert(payload, on_conflict="id").execute()
    return OkResponse()


@app.post("/tasks/reorder", response_model=OkResponse)
def reorder_tasks(
    body: ReorderTasksRequest,
    authorization: Optional[str] = Header(default=None),
) -> OkResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()

    if not body.updates:
        return OkResponse()

    for item in body.updates:
        if not is_real_calendar_date(item.due_date):
            raise HTTPException(status_code=400, detail="Each due_date must be a real YYYY-MM-DD date.")

        client.table("tasks").update(
            {
                "due_date": item.due_date,
                "position": item.position,
                "updated_at": now_iso(),
            }
        ).eq("id", item.task_id).eq("user_id", user_id).execute()

    return OkResponse()


@app.post("/tasks/{task_id}/archive", response_model=OkResponse)
def set_task_archive_state(
    task_id: str,
    body: ArchiveTaskRequest,
    authorization: Optional[str] = Header(default=None),
) -> OkResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()

    archived = bool(body.archived)
    client.table("tasks").update(
        {
            "archived": archived,
            "archived_at": now_iso() if archived else None,
            "updated_at": now_iso(),
        }
    ).eq("id", task_id).eq("user_id", user_id).execute()

    return OkResponse()


@app.delete("/tasks/{task_id}", response_model=OkResponse)
def delete_task(
    task_id: str,
    authorization: Optional[str] = Header(default=None),
) -> OkResponse:
    user_id = get_current_user_id(authorization)
    client = get_supabase_admin()

    client.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()

    return OkResponse()


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
