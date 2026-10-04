from __future__ import annotations

import os
from pathlib import Path


DEFAULT_ORIGIN = "https://jcalculator.onrender.com"


def allowed_origins() -> list[str]:
    raw = os.getenv("JCALCULATOR_ALLOWED_ORIGINS", DEFAULT_ORIGIN)
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


def database_url() -> str:
    raw = os.getenv("DATABASE_URL", "").strip()
    if raw.startswith("postgres://"):
        return "postgresql://" + raw[len("postgres://") :]
    if raw:
        return raw
    path = os.getenv("JCALCULATOR_SQLITE_PATH", "").strip()
    if not path:
        path = str(Path(__file__).resolve().parents[1] / ".data" / "jcalculator.db")
    return f"sqlite:///{Path(path).resolve()}"


def admin_username() -> str:
    return os.getenv("JCALCULATOR_ADMIN_USERNAME", "admin").strip() or "admin"


def admin_password_hash() -> str:
    return os.getenv("JCALCULATOR_ADMIN_PASSWORD_HASH", "").strip()


def guest_password_hash() -> str:
    return os.getenv("JCALCULATOR_GUEST_PASSWORD_HASH", "").strip()


def session_minutes() -> int:
    raw = os.getenv("JCALCULATOR_SESSION_MINUTES", "30")
    try:
        return min(720, max(5, int(raw)))
    except ValueError:
        return 30


def cookie_secure_default() -> bool:
    return os.getenv("JCALCULATOR_COOKIE_SECURE", "true").strip().lower() not in {"0", "false", "no"}
