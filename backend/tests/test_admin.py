from __future__ import annotations

from copy import deepcopy

from test_api import TEST_ADMIN_PASSWORD, client


def _login() -> tuple[str, dict]:
    response = client.post(
        "/api/admin/login",
        json={"username": "admin", "password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    cookie = response.headers.get("set-cookie", "")
    assert "HttpOnly" in cookie
    assert "SameSite=strict" in cookie
    return response.json()["csrfToken"], response.json()


def test_admin_page_is_public_but_settings_are_private() -> None:
    page = client.get("/admin/")
    assert page.status_code == 200
    assert "관리자 로그인" in page.text

    client.cookies.clear()
    assert client.get("/api/admin/config").status_code == 401
    assert client.get("/api/public/config").status_code == 200


def test_invalid_login_is_rejected_without_plaintext_secret() -> None:
    client.cookies.clear()
    response = client.post(
        "/api/admin/login",
        json={"username": "admin", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert TEST_ADMIN_PASSWORD not in response.text


def test_login_csrf_version_conflict_restore_backup_and_logout() -> None:
    client.cookies.clear()
    csrf, session = _login()
    assert session["username"] == "admin"
    assert client.get("/api/admin/session").status_code == 200

    current_response = client.get("/api/admin/config")
    assert current_response.status_code == 200
    current = current_response.json()
    version = current["version"]
    changed = deepcopy(current["config"])
    changed["content"]["homeTitle"] = "관리자 저장 통합 테스트"

    body = {"expectedVersion": version, "note": "통합 테스트 저장", "config": changed}
    assert client.put("/api/admin/config", json=body).status_code == 403
    saved = client.put(
        "/api/admin/config",
        headers={"X-CSRF-Token": csrf},
        json=body,
    )
    assert saved.status_code == 200
    saved_version = saved.json()["version"]
    assert saved_version == version + 1
    assert client.get("/api/public/config").json()["content"]["homeTitle"] == "관리자 저장 통합 테스트"

    stale = client.put(
        "/api/admin/config",
        headers={"X-CSRF-Token": csrf},
        json=body,
    )
    assert stale.status_code == 409

    versions = client.get("/api/admin/versions").json()["items"]
    assert versions[0]["version"] == saved_version
    backup = client.get("/api/admin/backup")
    assert backup.status_code == 200
    assert backup.json()["format"] == "jcalculator-backup-v1"
    assert "attachment" in backup.headers["content-disposition"]

    restored = client.post(
        "/api/admin/restore",
        headers={"X-CSRF-Token": csrf},
        json={
            "expectedVersion": saved_version,
            "version": version,
            "note": "통합 테스트 원복",
        },
    )
    assert restored.status_code == 200
    assert restored.json()["version"] == saved_version + 1

    logout = client.post("/api/admin/logout", headers={"X-CSRF-Token": csrf})
    assert logout.status_code == 200
    assert client.get("/api/admin/session").status_code == 401


def test_admin_config_validation_rejects_invalid_policy() -> None:
    client.cookies.clear()
    csrf, _ = _login()
    current = client.get("/api/admin/config").json()
    invalid = deepcopy(current["config"])
    invalid["common"]["warningMargin"] = 2.0
    invalid["common"]["passMargin"] = 1.3
    response = client.put(
        "/api/admin/config",
        headers={"X-CSRF-Token": csrf},
        json={"expectedVersion": current["version"], "note": "잘못된 경계", "config": invalid},
    )
    assert response.status_code == 422

    invalid_ratio = deepcopy(current["config"])
    invalid_ratio["tools"]["conveyor"]["defaults"]["ratio"] = 0
    response = client.put(
        "/api/admin/config",
        headers={"X-CSRF-Token": csrf},
        json={"expectedVersion": current["version"], "note": "감속비 0 차단", "config": invalid_ratio},
    )
    assert response.status_code == 422
