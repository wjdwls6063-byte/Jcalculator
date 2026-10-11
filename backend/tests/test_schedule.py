from __future__ import annotations

from uuid import uuid4

from test_api import TEST_ADMIN_PASSWORD, client


def test_korean_holidays_include_2026_law_changes_and_substitute_days() -> None:
    response = client.get("/api/schedule/holidays/2026")
    assert response.status_code == 200
    days = response.json()["holidays"]
    assert days["2026-05-01"] == "노동절"
    assert days["2026-07-17"] == "제헌절"
    assert "대체" in days["2026-10-05"]
    assert "추석" in days["2026-09-25"]
    assert client.get("/api/schedule/holidays/2101").status_code == 422


def test_public_guest_can_read_without_password_but_cannot_save_or_access_admin(monkeypatch) -> None:
    client.cookies.clear()
    monkeypatch.delenv("JCALCULATOR_GUEST_PASSWORD_HASH", raising=False)
    session = client.get("/api/schedule/session")
    assert session.status_code == 200
    assert session.json()["role"] == "guest"
    assert not session.json()["csrfToken"]
    document = client.get("/api/schedule/document")
    assert document.status_code == 200
    assert client.get("/api/admin/config").status_code == 401
    attempt = client.put(
        "/api/schedule/document",
        json={"expectedVersion": document.json()["version"], "data": document.json()["data"]},
        headers={"X-CSRF-Token": "forged"},
    )
    assert attempt.status_code == 401
    assert client.get("/api/schedule/document").json()["version"] == document.json()["version"]


def test_schedule_requires_admin_csrf_to_save_and_prevents_stale_overwrite() -> None:
    client.cookies.clear()
    assert client.get("/api/schedule/readiness").json()["databaseAvailable"] is True
    assert client.get("/api/schedule/document").status_code == 200
    response = client.post(
        "/api/admin/login", json={"username": "admin", "password": TEST_ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    csrf = response.json()["csrfToken"]
    initial = client.get("/api/schedule/document")
    assert initial.status_code == 200
    version = initial.json()["version"]
    document = {
        "version": 1,
        "projects": [{"id": "project-a", "name": "프로젝트 A", "color": "#1769d6"}],
        "events": [{"id": "meeting", "projectId": "project-a", "title": "검수", "date": "2026-10-05"}],
        "tasks": [
            {"id": "parent", "projectId": "project-a", "title": "준비", "due": "", "order": 1},
            {"id": "child", "projectId": "project-a", "parentId": "parent", "title": "도면 확인", "due": "2026-10-04", "order": 1},
        ],
    }
    body = {"expectedVersion": version, "data": document}
    assert client.put("/api/schedule/document", json=body).status_code == 403
    saved = client.put("/api/schedule/document", json=body, headers={"X-CSRF-Token": csrf})
    assert saved.status_code == 200
    assert saved.json()["version"] == version + 1
    assert saved.json()["data"]["tasks"][0]["due"] is None
    assert client.get("/api/schedule/document").json()["data"]["tasks"][1]["title"] == "도면 확인"
    stale = client.put("/api/schedule/document", json=body, headers={"X-CSRF-Token": csrf})
    assert stale.status_code == 409
    bad = {**document, "tasks": [{**document["tasks"][0], "parentId": "missing"}]}
    assert client.put(
        "/api/schedule/document",
        json={"expectedVersion": version + 1, "data": bad},
        headers={"X-CSRF-Token": csrf},
    ).status_code == 422
    assert client.get("/api/schedule/document").json()["version"] == version + 1
    assert client.post("/api/admin/logout", headers={"X-CSRF-Token": csrf}).status_code == 200
    assert client.get("/api/schedule/document").json()["version"] == version + 1
    assert client.get("/api/schedule/session").json()["role"] == "guest"


def test_public_guest_can_add_shared_checklist_but_only_admin_can_edit_content() -> None:
    client.cookies.clear()
    login = client.post("/api/admin/login", json={"username": "admin", "password": TEST_ADMIN_PASSWORD})
    assert login.status_code == 200
    csrf = login.json()["csrfToken"]
    current = client.get("/api/schedule/document").json()
    project_id = f"shared-{uuid4()}"
    document = current["data"]
    document["projects"].append({"id": project_id, "name": "공유 테스트", "color": "#1769d6"})
    saved = client.put(
        "/api/schedule/document",
        json={"expectedVersion": current["version"], "data": document},
        headers={"X-CSRF-Token": csrf},
    )
    assert saved.status_code == 200
    assert client.post("/api/admin/logout", headers={"X-CSRF-Token": csrf}).status_code == 200

    assert client.post("/api/schedule/notes", json={"projectId": project_id, "kind": "memo", "body": "옛 메모"}).status_code == 422
    checklist = client.post("/api/schedule/notes", json={"projectId": project_id, "kind": "checklist", "body": "안전 펜스 확인"})
    assert checklist.status_code == 201
    note_id = checklist.json()["id"]
    assert client.patch(f"/api/schedule/notes/{note_id}", json={"done": True}).json()["done"] is True
    listed = client.get("/api/schedule/notes")
    assert listed.status_code == 200
    assert {item["body"] for item in listed.json()["notes"] if item["projectId"] == project_id} == {"안전 펜스 확인"}
    assert client.delete(f"/api/schedule/notes/{note_id}").status_code == 401
    assert client.put(f"/api/schedule/notes/{note_id}", json={"body": "수정 시도"}).status_code == 401
    assert client.patch("/api/schedule/notes/missing", json={"done": True}).status_code == 404
    assert client.post("/api/schedule/notes", json={"projectId": "missing", "kind": "checklist", "body": "없음"}).status_code == 404
    assert client.post("/api/schedule/notes", json={"projectId": project_id, "kind": "checklist", "body": "차단"}, headers={"Origin": "https://other.example"}).status_code == 403
    assert client.get("/api/schedule/document").json()["version"] == saved.json()["version"]

    login = client.post("/api/admin/login", json={"username": "admin", "password": TEST_ADMIN_PASSWORD})
    csrf = login.json()["csrfToken"]
    assert client.put(f"/api/schedule/notes/{note_id}", json={"body": "수정 시도"}).status_code == 403
    edited = client.put(f"/api/schedule/notes/{note_id}", json={"body": "  안전장치 확인  "}, headers={"X-CSRF-Token": csrf})
    assert edited.status_code == 200
    assert edited.json()["body"] == "안전장치 확인"
    assert edited.json()["done"] is True
    assert client.put("/api/schedule/notes/missing", json={"body": "내용"}, headers={"X-CSRF-Token": csrf}).status_code == 404
    assert client.delete(f"/api/schedule/notes/{note_id}", headers={"X-CSRF-Token": csrf}).status_code == 200
    assert all(item["id"] != note_id for item in client.get("/api/schedule/notes").json()["notes"])


def test_existing_memo_becomes_checklist_without_losing_content_or_completion(tmp_path) -> None:
    from app.store import ConfigStore

    db = ConfigStore(f"sqlite:///{tmp_path / 'old-notes.db'}")
    db.ensure_schema()
    old = db.shared_note_add("old-memo", "project-a", "memo", "현장 확인 메모")
    assert old["kind"] == "memo"
    assert db.shared_note_check("old-memo", True)["done"] is True
    reopened = ConfigStore(db.url)
    reopened.ensure_schema()
    notes = reopened.shared_notes()
    assert len(notes) == 1
    assert notes[0]["kind"] == "checklist"
    assert notes[0]["body"] == "현장 확인 메모"
    assert notes[0]["done"] is True
