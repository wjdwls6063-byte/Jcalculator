from __future__ import annotations

from test_api import TEST_ADMIN_PASSWORD, client


def test_schedule_requires_login_csrf_and_prevents_stale_overwrite() -> None:
    client.cookies.clear()
    assert client.get("/api/schedule/readiness").json()["databaseAvailable"] is True
    assert client.get("/api/schedule/document").status_code == 401
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
