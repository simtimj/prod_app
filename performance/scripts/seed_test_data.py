"""Seed Supabase users and board data for k6 performance tests.

Creates 10 users through Supabase Admin Auth API (no built-in provider email send),
then seeds each user with 5 custom lists and 100 saved-list tasks.
Outputs user access tokens to performance/data/test-users.json for k6.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import uuid4


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "performance" / "data"
USERS_FILE = DATA_DIR / "test-users.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def request_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    payload: dict[str, Any] | list[dict[str, Any]] | None = None,
) -> Any:
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    request = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(request) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPError as error:
        raw_error = error.read().decode("utf-8") if error.fp else ""
        detail = raw_error or error.reason
        raise RuntimeError(f"{method} {url} failed: {error.code} {detail}") from error


def request_no_content(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
) -> None:
    request = Request(url, headers=headers, method=method)
    try:
        with urlopen(request):
            return
    except HTTPError as error:
        raw_error = error.read().decode("utf-8") if error.fp else ""
        detail = raw_error or error.reason
        raise RuntimeError(f"{method} {url} failed: {error.code} {detail}") from error


@dataclass
class SeedUser:
    user_id: str
    email: str
    password: str
    access_token: str


def create_or_update_user(
    supabase_url: str,
    service_role_key: str,
    email: str,
    password: str,
) -> str:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "seed": "performance",
        },
    }

    try:
        created = request_json("POST", f"{supabase_url}/auth/v1/admin/users", headers=headers, payload=payload)
        return str(created["id"])
    except RuntimeError as error:
        if "already been registered" not in str(error):
            raise

    users_page = request_json(
        "GET",
        f"{supabase_url}/auth/v1/admin/users?{urlencode({'page': 1, 'per_page': 1000})}",
        headers=headers,
    )
    users = users_page.get("users") if isinstance(users_page, dict) else None
    if not isinstance(users, list):
        raise RuntimeError("Could not list users from Supabase admin API.")

    user = next((item for item in users if str(item.get("email", "")).lower() == email.lower()), None)
    if not user:
        raise RuntimeError(f"User already exists but could not be resolved by email: {email}")

    user_id = str(user["id"])
    request_json(
        "PUT",
        f"{supabase_url}/auth/v1/admin/users/{user_id}",
        headers=headers,
        payload={"password": password, "email_confirm": True},
    )
    return user_id


def sign_in_for_access_token(
    supabase_url: str,
    anon_key: str,
    email: str,
    password: str,
) -> str:
    headers = {
        "apikey": anon_key,
        "Content-Type": "application/json",
    }
    payload = {
        "email": email,
        "password": password,
    }

    response = request_json(
        "POST",
        f"{supabase_url}/auth/v1/token?grant_type=password",
        headers=headers,
        payload=payload,
    )
    access_token = str(response.get("access_token", "")).strip()
    if not access_token or access_token.count(".") != 2:
        raise RuntimeError(f"Could not retrieve valid access token for user: {email}")
    return access_token


def purge_existing_data(supabase_url: str, service_role_key: str, user_id: str) -> None:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }

    request_no_content(
        "DELETE",
        f"{supabase_url}/rest/v1/saved_list_tasks?user_id=eq.{user_id}",
        headers=headers,
    )
    request_no_content(
        "DELETE",
        f"{supabase_url}/rest/v1/saved_lists?user_id=eq.{user_id}",
        headers=headers,
    )
    request_no_content(
        "DELETE",
        f"{supabase_url}/rest/v1/tasks?user_id=eq.{user_id}",
        headers=headers,
    )


def seed_user_lists_and_tasks(
    supabase_url: str,
    service_role_key: str,
    user_id: str,
    *,
    lists_per_user: int,
    tasks_per_user: int,
) -> None:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    timestamp = now_iso()
    list_ids: list[str] = []
    lists_payload: list[dict[str, Any]] = []
    for list_index in range(lists_per_user):
        list_id = f"perf-{user_id[:8]}-list-{list_index + 1}"
        list_ids.append(list_id)
        lists_payload.append(
            {
                "id": list_id,
                "user_id": user_id,
                "name": f"Performance List {list_index + 1}",
                "position": list_index,
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        )

    if lists_payload:
        request_json(
            "POST",
            f"{supabase_url}/rest/v1/saved_lists",
            headers=headers,
            payload=lists_payload,
        )

    task_positions = [0 for _ in range(lists_per_user)]
    saved_list_tasks_payload: list[dict[str, Any]] = []
    for task_index in range(tasks_per_user):
        target_list = task_index % lists_per_user
        saved_list_tasks_payload.append(
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "list_id": list_ids[target_list],
                "title": f"Perf task {task_index + 1}",
                "completed": False,
                "recurrence_enabled": False,
                "recurrence_frequency": None,
                "recurrence_weekdays": None,
                "recurrence_month_days": None,
                "tag": None,
                "tag_color": None,
                "description": "Seeded performance list task",
                "due_date": None,
                "due_time": None,
                "priority": None,
                "position": task_positions[target_list],
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        )
        task_positions[target_list] += 1

    if saved_list_tasks_payload:
        request_json(
            "POST",
            f"{supabase_url}/rest/v1/saved_list_tasks",
            headers=headers,
            payload=saved_list_tasks_payload,
        )


def main() -> None:
    load_env_file(ROOT / ".env.local")

    parser = argparse.ArgumentParser(description="Seed Supabase users and board data for performance testing")
    parser.add_argument("--users", type=int, default=10, help="Number of users to create")
    parser.add_argument("--lists-per-user", type=int, default=5, help="Custom lists per user")
    parser.add_argument("--tasks-per-user", type=int, default=100, help="Saved-list tasks per user")
    parser.add_argument("--email-prefix", type=str, default="perf.k6.user", help="Email prefix for seeded users")
    parser.add_argument("--email-domain", type=str, default="example.com", help="Email domain for seeded users")
    parser.add_argument("--password", type=str, default="PerfUser!12345", help="Password for all seeded users")
    args = parser.parse_args()

    supabase_url = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    anon_key = (os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "").strip()

    missing = []
    if not supabase_url:
        missing.append("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
    if not service_role_key:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not anon_key:
        missing.append("SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if missing:
        raise RuntimeError("Missing required environment values: " + ", ".join(missing))

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    seeded_users: list[SeedUser] = []
    for index in range(args.users):
        email = f"{args.email_prefix}{index + 1:02d}@{args.email_domain}"
        user_id = create_or_update_user(supabase_url, service_role_key, email, args.password)
        access_token = sign_in_for_access_token(supabase_url, anon_key, email, args.password)
        purge_existing_data(supabase_url, service_role_key, user_id)
        seed_user_lists_and_tasks(
            supabase_url,
            service_role_key,
            user_id,
            lists_per_user=args.lists_per_user,
            tasks_per_user=args.tasks_per_user,
        )
        seeded_users.append(
            SeedUser(
                user_id=user_id,
                email=email,
                password=args.password,
                access_token=access_token,
            )
        )
        print(f"Seeded {email}: {args.lists_per_user} lists, {args.tasks_per_user} list tasks")

    USERS_FILE.write_text(
        json.dumps([user.__dict__ for user in seeded_users], indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote seeded users and access tokens to {USERS_FILE}")


if __name__ == "__main__":
    main()
