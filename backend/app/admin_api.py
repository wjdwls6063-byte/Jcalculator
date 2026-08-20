from __future__ import annotations

import hmac
import threading
import time
from collections import defaultdict, deque
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from .admin_auth import new_csrf_token, new_session_token, token_hash, verify_password
from .config_schema import default_config
from .settings import (
    admin_password_hash,
    admin_username,
    cookie_secure_default,
    session_minutes,
)
from .store import StoreUnavailable, VersionConflict, store


SESSION_COOKIE = "jcalculator_admin_session"
router = APIRouter(prefix="/api/admin", tags=["admin"])
_attempts: dict[str, deque[float]] = defaultdict(deque)
_attempt_lock = threading.Lock()
MAX_ATTEMPTS = 5
ATTEMPT_WINDOW_SECONDS = 10 * 60


class LoginBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=500)


class ConfigSaveBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedVersion: int = Field(ge=1)
    note: str = Field(min_length=1, max_length=500)
    config: dict[str, Any]


class RestoreBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedVersion: int = Field(ge=1)
    version: int = Field(ge=1)
    note: str = Field(min_length=1, max_length=500)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def _blocked(key: str) -> int:
    now = time.monotonic()
    with _attempt_lock:
        attempts = _attempts[key]
        while attempts and now - attempts[0] > ATTEMPT_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) < MAX_ATTEMPTS:
            return 0
        return max(1, int(ATTEMPT_WINDOW_SECONDS - (now - attempts[0])))


def _failed(key: str) -> None:
    with _attempt_lock:
        _attempts[key].append(time.monotonic())


def _clear_attempts(key: str) -> None:
    with _attempt_lock:
        _attempts.pop(key, None)


def _secure_cookie(request: Request) -> bool:
    if request.url.hostname in {"127.0.0.1", "localhost", "testserver"}:
        return False
    forwarded = request.headers.get("x-forwarded-proto", "").lower()
    return request.url.scheme == "https" or forwarded == "https" or cookie_secure_default()


def _store_error(error: StoreUnavailable) -> HTTPException:
    return HTTPException(status_code=503, detail=str(error))


def require_admin(request: Request) -> dict[str, Any]:
    token = request.cookies.get(SESSION_COOKIE, "")
    if not token:
        raise HTTPException(status_code=401, detail="관리자 로그인이 필요합니다.")
    try:
        session = store.session(token_hash(token), session_minutes())
    except StoreUnavailable as error:
        raise _store_error(error) from error
    if session is None:
        raise HTTPException(status_code=401, detail="관리자 세션이 만료되었습니다.")
    request.state.admin_session = session
    request.state.admin_token_hash = token_hash(token)
    return session


AdminSession = Annotated[dict[str, Any], Depends(require_admin)]


def verify_csrf(request: Request, session: AdminSession) -> dict[str, Any]:
    supplied = request.headers.get("x-csrf-token", "")
    if not supplied or not hmac.compare_digest(supplied, session["csrfToken"]):
        raise HTTPException(status_code=403, detail="보안 토큰이 없거나 올바르지 않습니다.")
    return session


CsrfSession = Annotated[dict[str, Any], Depends(verify_csrf)]


@router.post("/login")
def login(body: LoginBody, request: Request, response: Response) -> dict[str, Any]:
    configured_hash = admin_password_hash()
    if not configured_hash:
        raise HTTPException(status_code=503, detail="관리자 비밀번호 해시가 설정되지 않았습니다.")
    key = _client_key(request)
    retry_after = _blocked(key)
    if retry_after:
        raise HTTPException(
            status_code=429,
            detail="로그인 실패가 반복되어 잠시 차단되었습니다.",
            headers={"Retry-After": str(retry_after)},
        )
    password_ok = verify_password(body.password, configured_hash)
    username_ok = hmac.compare_digest(body.username, admin_username())
    if not (password_ok and username_ok):
        _failed(key)
        raise HTTPException(status_code=401, detail="관리자 ID 또는 비밀번호가 올바르지 않습니다.")
    _clear_attempts(key)
    raw_token = new_session_token()
    csrf = new_csrf_token()
    try:
        session = store.create_session(token_hash(raw_token), csrf, body.username, session_minutes())
    except StoreUnavailable as error:
        raise _store_error(error) from error
    response.set_cookie(
        SESSION_COOKIE,
        raw_token,
        max_age=session_minutes() * 60,
        httponly=True,
        secure=_secure_cookie(request),
        samesite="strict",
        path="/",
    )
    return session


@router.get("/session")
def session_info(session: AdminSession) -> dict[str, Any]:
    return session


@router.post("/logout")
def logout(request: Request, response: Response, session: CsrfSession) -> dict[str, bool]:
    try:
        store.delete_session(request.state.admin_token_hash)
    except StoreUnavailable as error:
        raise _store_error(error) from error
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/config")
def get_config(session: AdminSession) -> dict[str, Any]:
    try:
        return store.current()
    except StoreUnavailable as error:
        raise _store_error(error) from error


@router.get("/default-config")
def get_default_config(session: AdminSession) -> dict[str, Any]:
    return {"config": default_config()}


@router.put("/config")
def save_config(body: ConfigSaveBody, session: CsrfSession) -> dict[str, Any]:
    try:
        return store.save(body.config, body.expectedVersion, body.note, session["username"])
    except VersionConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except StoreUnavailable as error:
        raise _store_error(error) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/versions")
def list_versions(session: AdminSession, limit: int = 20) -> dict[str, Any]:
    try:
        return {"items": store.versions(limit)}
    except StoreUnavailable as error:
        raise _store_error(error) from error


@router.get("/versions/{version}")
def get_version(version: int, session: AdminSession) -> dict[str, Any]:
    try:
        item = store.version(version)
    except StoreUnavailable as error:
        raise _store_error(error) from error
    if item is None:
        raise HTTPException(status_code=404, detail="요청한 설정 버전을 찾을 수 없습니다.")
    return item


@router.post("/restore")
def restore_version(body: RestoreBody, session: CsrfSession) -> dict[str, Any]:
    try:
        item = store.version(body.version)
        if item is None:
            raise HTTPException(status_code=404, detail="복원할 설정 버전을 찾을 수 없습니다.")
        return store.save(item["config"], body.expectedVersion, body.note, session["username"])
    except VersionConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except StoreUnavailable as error:
        raise _store_error(error) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/backup")
def download_backup(session: AdminSession) -> JSONResponse:
    try:
        current = store.current()
        versions = store.versions(100)
    except StoreUnavailable as error:
        raise _store_error(error) from error
    response = JSONResponse({"format": "jcalculator-backup-v1", "current": current, "versions": versions})
    response.headers["Content-Disposition"] = f'attachment; filename="jcalculator-config-v{current["version"]}.json"'
    return response
