"""Seed helper for performance test data."""

from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "ai-prompts.json"


if __name__ == "__main__":
    print(DATA_PATH.read_text(encoding="utf-8"))
