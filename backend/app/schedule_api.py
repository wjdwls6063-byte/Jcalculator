from __future__ import annotations

import json
import os
import hmac
from datetime import date
from typing import Annotated

import holidays
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .admin_api import CsrfSession, SESSION_COOKIE, _blocked, _clear_attempts, _client_key, _failed, _secure_cookie
from .admin_auth import new_csrf_token, new_session_token, token_hash, verify_password
from .settings import admin_password_hash, guest_password_hash, session_minutes
from .store import StoreUnavailable, VersionConflict, store


router = APIRouter(prefix="/api/schedule", tags=["schedule"])
GUEST_COOKIE = "jcalculator_schedule_guest_session"
Identifier = Annotated[str, Field(min_length=1, max_length=100)]


class GuestLoginBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: str = Field(min_length=1, max_length=500)


def require_guest(request: Request) -> dict:
    token = request.cookies.get(GUEST_COOKIE, "")
    if not token:
        raise HTTPException(status_code=401, detail="게스트 로그인이 필요합니다.")
    try:
        session = store.guest_session(token_hash(token), session_minutes())
    except StoreUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    if session is None:
        raise HTTPException(status_code=401, detail="게스트 세션이 만료되었습니다.")
    return session


GuestSession = Annotated[dict, Depends(require_guest)]


def require_schedule_viewer(request: Request) -> dict:
    admin_token = request.cookies.get(SESSION_COOKIE, "")
    guest_token = request.cookies.get(GUEST_COOKIE, "")
    try:
        if admin_token:
            session = store.session(token_hash(admin_token), session_minutes())
            if session is not None:
                return {**session, "role": "admin"}
        if guest_token:
            session = store.guest_session(token_hash(guest_token), session_minutes())
            if session is not None:
                return session
    except StoreUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {"role": "guest", "csrfToken": ""}


ViewerSession = Annotated[dict, Depends(require_schedule_viewer)]


@router.get("/holidays/{year}")
def korean_holidays(year: int) -> dict:
    if not 1948 <= year <= 2100:
        raise HTTPException(status_code=422, detail="공휴일은 1948년부터 2100년까지 조회할 수 있습니다.")
    calendar = holidays.SouthKorea(years=year, language="ko", observed=True)
    return {"year": year, "holidays": {day.isoformat(): name for day, name in sorted(calendar.items()) if day.year == year}}


class Project(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Identifier
    name: str = Field(min_length=1, max_length=40)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class Event(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Identifier
    projectId: Identifier
    title: str = Field(min_length=1, max_length=80)
    date: date
    time: str = Field(default="", pattern=r"^$|^([01][0-9]|2[0-3]):[0-5][0-9]$")
    notes: str = Field(default="", max_length=500)
    done: bool = False


class Task(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Identifier
    projectId: Identifier
    eventId: str = Field(default="", max_length=100)
    parentId: str = Field(default="", max_length=100)
    title: str = Field(min_length=1, max_length=100)
    due: date | None = None
    priority: str = Field(default="normal", pattern=r"^(high|normal|low)$")
    order: int = Field(default=1, ge=0, le=100000)
    done: bool = False

    @field_validator("due", mode="before")
    @classmethod
    def empty_due(cls, value: object) -> object:
        return None if value == "" else value


class ScheduleDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(default=1, ge=1, le=1)
    projects: list[Project] = Field(default_factory=list, max_length=100)
    events: list[Event] = Field(default_factory=list, max_length=2000)
    tasks: list[Task] = Field(default_factory=list, max_length=10000)

    @model_validator(mode="after")
    def check_links(self) -> "ScheduleDocument":
        projects = {item.id for item in self.projects}
        events = {item.id: item for item in self.events}
        tasks = {item.id: item for item in self.tasks}
        if len(projects) != len(self.projects) or len(events) != len(self.events) or len(tasks) != len(self.tasks):
            raise ValueError("중복된 프로젝트, 일정 또는 할 일 ID가 있습니다.")
        if any(item.projectId not in projects for item in self.events):
            raise ValueError("존재하지 않는 프로젝트에 연결된 일정이 있습니다.")
        for item in self.tasks:
            if item.projectId not in projects:
                raise ValueError("존재하지 않는 프로젝트에 연결된 할 일이 있습니다.")
            if item.eventId and (item.eventId not in events or events[item.eventId].projectId != item.projectId):
                raise ValueError("할 일과 연결된 일정의 프로젝트가 맞지 않습니다.")
            if item.parentId:
                parent = tasks.get(item.parentId)
                if item.eventId or parent is None or parent.id == item.id or parent.projectId != item.projectId or parent.eventId or parent.parentId:
                    raise ValueError("하위 할 일의 상위 연결이 올바르지 않습니다.")
        return self


class SaveBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedVersion: int = Field(ge=1)
    data: ScheduleDocument


def require_persistent_database() -> None:
    if os.environ.get("RENDER") == "true" and not store.postgres:
        raise HTTPException(status_code=503, detail="Render에 영구 저장용 DATABASE_URL을 설정해 주세요.")


@router.post("/guest/login")
def guest_login(body: GuestLoginBody, request: Request, response: Response) -> dict:
    configured_hash = guest_password_hash()
    if not configured_hash:
        raise HTTPException(status_code=503, detail="게스트 비밀번호가 설정되지 않았습니다.")
    key = "schedule-guest:" + _client_key(request)
    retry_after = _blocked(key)
    if retry_after:
        raise HTTPException(status_code=429, detail="로그인 실패가 반복되어 잠시 차단되었습니다.", headers={"Retry-After": str(retry_after)})
    if not verify_password(body.password, configured_hash):
        _failed(key)
        raise HTTPException(status_code=401, detail="게스트 비밀번호가 올바르지 않습니다.")
    _clear_attempts(key)
    raw_token = new_session_token()
    try:
        session = store.create_guest_session(token_hash(raw_token), new_csrf_token(), session_minutes())
    except StoreUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    response.set_cookie(
        GUEST_COOKIE, raw_token, max_age=session_minutes() * 60,
        httponly=True, secure=_secure_cookie(request), samesite="strict", path="/",
    )
    response.delete_cookie(SESSION_COOKIE, path="/")
    return session


@router.get("/session")
def schedule_session(session: ViewerSession) -> dict:
    return session


@router.post("/guest/logout")
def guest_logout(request: Request, response: Response, session: GuestSession) -> dict[str, bool]:
    supplied = request.headers.get("x-csrf-token", "")
    if not supplied or not hmac.compare_digest(supplied, session["csrfToken"]):
        raise HTTPException(status_code=403, detail="보안 토큰이 없거나 올바르지 않습니다.")
    try:
        store.delete_guest_session(token_hash(request.cookies[GUEST_COOKIE]))
    except StoreUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    response.delete_cookie(GUEST_COOKIE, path="/")
    return {"ok": True}


@router.get("/readiness")
def readiness() -> dict[str, bool]:
    try:
        store.schedule_current()
        database_available = True
    except StoreUnavailable:
        database_available = False
    return {
        "ready": database_available and bool(admin_password_hash()) and (store.postgres or os.environ.get("RENDER") != "true"),
        "persistentDatabase": store.postgres,
        "databaseAvailable": database_available,
        "loginConfigured": bool(admin_password_hash()),
        "guestConfigured": bool(guest_password_hash()),
    }


@router.get("/document")
def get_document(session: ViewerSession) -> dict:
    require_persistent_database()
    try:
        return store.schedule_current()
    except StoreUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.put("/document")
def save_document(body: SaveBody, session: CsrfSession) -> dict:
    require_persistent_database()
    data = body.data.model_dump(mode="json")
    if len(json.dumps(data, ensure_ascii=False).encode("utf-8")) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="일정 데이터가 5MB를 초과했습니다.")
    try:
        return store.schedule_save(data, body.expectedVersion, session["username"])
    except VersionConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except StoreUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
