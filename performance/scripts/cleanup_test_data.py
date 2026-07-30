"""Cleanup seeded performance users and data."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
USERS_FILE = ROOT / "performance" / "data" / "test-users.json"


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


def request_no_content(method: str, url: str, headers: dict[str, str]) -> None:
    request = Request(url, headers=headers, method=method)
    try:
        with urlopen(request):
            return
    except HTTPError as error:
        raw = error.read().decode("utf-8") if error.fp else ""
        detail = raw or error.reason
        raise RuntimeError(f"{method} {url} failed: {error.code} {detail}") from error


def purge_user_data(supabase_url: str, service_role_key: str, user_id: str) -> None:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }

    request_no_content("DELETE", f"{supabase_url}/rest/v1/saved_list_tasks?user_id=eq.{user_id}", headers)
    request_no_content("DELETE", f"{supabase_url}/rest/v1/saved_lists?user_id=eq.{user_id}", headers)
    request_no_content("DELETE", f"{supabase_url}/rest/v1/tasks?user_id=eq.{user_id}", headers)


def delete_user(supabase_url: str, service_role_key: str, user_id: str) -> None:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }
    request_no_content("DELETE", f"{supabase_url}/auth/v1/admin/users/{user_id}", headers)


def main() -> None:
    load_env_file(ROOT / ".env.local")

    parser = argparse.ArgumentParser(description="Cleanup seeded performance test data")
    parser.add_argument("--delete-users", action="store_true", help="Also delete seeded auth users")
    args = parser.parse_args()

    supabase_url = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

    missing = []
    if not supabase_url:
        missing.append("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
    if not service_role_key:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        raise RuntimeError("Missing required environment values: " + ", ".join(missing))

    if not USERS_FILE.exists():
        print(f"No users file found at {USERS_FILE}; nothing to clean.")
        return

    users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
    if not isinstance(users, list):
        raise RuntimeError("performance/data/test-users.json must be a JSON array.")

    for user in users:
        user_id = str(user.get("user_id", "")).strip()
        email = str(user.get("email", "")).strip()
        if not user_id:
            continue

        purge_user_data(supabase_url, service_role_key, user_id)
        print(f"Removed seeded board data for {email or user_id}")

        if args.delete_users:
            delete_user(supabase_url, service_role_key, user_id)
            print(f"Deleted auth user {email or user_id}")

    USERS_FILE.unlink(missing_ok=True)
    print(f"Removed {USERS_FILE}")


if __name__ == "__main__":
    main()
