from __future__ import annotations

import os


DEFAULT_ORIGIN = "https://jcalculator.onrender.com"


def allowed_origins() -> list[str]:
    raw = os.getenv("JCALCULATOR_ALLOWED_ORIGINS", DEFAULT_ORIGIN)
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


def api_keys() -> dict[str, str]:
    """Read `name=key,name2=key2` or a legacy single key from the environment."""
    raw = os.getenv("JCALCULATOR_API_KEYS", "").strip()
    result: dict[str, str] = {}
    if raw:
        for index, item in enumerate(raw.split(","), start=1):
            item = item.strip()
            if not item:
                continue
            if "=" in item:
                name, value = item.split("=", 1)
                result[name.strip() or f"key-{index}"] = value.strip()
            else:
                result[f"key-{index}"] = item
    legacy = os.getenv("JCALCULATOR_API_KEY", "").strip()
    if legacy:
        result.setdefault("legacy", legacy)
    return {name: value for name, value in result.items() if value}
