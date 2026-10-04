from __future__ import annotations

import json
import os
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .admin_api import AdminSession, CsrfSession
from .settings import admin_password_hash
from .store import StoreUnavailable, VersionConflict, store


router = APIRouter(prefix="/api/schedule", tags=["schedule"])
Identifier = Annotated[str, Field(min_length=1, max_length=100)]


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
    }


@router.get("/document")
def get_document(session: AdminSession) -> dict:
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
