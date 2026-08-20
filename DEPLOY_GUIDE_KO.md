# Jcalculator Neon + Render 무료 배포 안내

## 1. 운영 구성

```text
사용자 브라우저
  └─ https://jcalculator.onrender.com
       ├─ 메인 + 6개 게스트 도구
       ├─ 공개 계산 API
       └─ /admin + 관리자 API
              └─ Neon PostgreSQL (설정·버전·세션)
```

Render에는 Python Web Service 하나만 둡니다. Render 무료 파일시스템은 재배포·재시작 때 보존되지 않으므로 운영 DB는 Neon Free를 사용합니다. 로컬 SQLite는 개발 미리보기 전용입니다.

## 2. Neon 준비

1. [Neon Console](https://console.neon.tech/)에서 프로젝트를 만듭니다.
2. 배포 리전과 가까운 리전을 선택합니다.
3. Connection Details에서 PostgreSQL 연결 문자열을 복사합니다. 가능하면 pooled connection 문자열을 사용합니다.
4. 연결 문자열은 GitHub 파일에 넣지 않고 Render의 `DATABASE_URL` 비밀 환경변수에만 저장합니다.

앱 첫 연결 시 `app_config`, `config_versions`, `admin_sessions` 테이블과 초기 설정 v1을 자동 생성합니다.

## 3. 관리자 비밀번호 해시 생성

저장소 루트에서 다음 스크립트를 실행합니다.

```powershell
python backend/scripts/generate_admin_password_hash.py
```

새 비밀번호를 두 번 입력하면 `scrypt$...` 형식의 해시가 출력됩니다. 비밀번호 원문은 출력·파일 저장되지 않습니다. 출력된 해시만 Render의 `JCALCULATOR_ADMIN_PASSWORD_HASH`에 넣습니다.

## 4. Render Web Service 설정

`render.yaml` Blueprint를 사용하거나 기존 `jcalculator` 서비스를 아래 값으로 맞춥니다.

| 항목 | 값 |
|---|---|
| Runtime | Python |
| Plan | Free |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check | `/health` |

환경변수:

| 키 | 값/처리 |
|---|---|
| `DATABASE_URL` | Neon 연결 문자열, Secret |
| `JCALCULATOR_ADMIN_USERNAME` | 기본 `admin`, 필요 시 변경 |
| `JCALCULATOR_ADMIN_PASSWORD_HASH` | 3단계에서 만든 해시, Secret |
| `JCALCULATOR_ALLOWED_ORIGINS` | `https://jcalculator.onrender.com` |
| `JCALCULATOR_COOKIE_SECURE` | `true` |

기존 `JCALCULATOR_API_KEY(S)`는 더 이상 사용하지 않습니다. 게스트 계산 API는 공개이고, 변경 API만 관리자 세션으로 보호됩니다.

## 5. 배포 후 확인

먼저 `/health`가 `{"status":"ok","database":"ok"}`인지 확인하고 다음 경로를 실제 브라우저에서 엽니다.

- `/`
- `/conveyor/`
- `/ballscrew/`
- `/ballscrew/vertical/`
- `/eccentric/`
- `/smc-cylinder/`
- `/sensor/`
- `/admin/`

게스트 6개 도구에서 기본 결과가 보이고 API 키 입력창이 나타나지 않아야 합니다. `/admin`은 비로그인 상태에서 편집 내용을 보여주지 않아야 합니다. 로그인 후 테스트 문구를 새 버전으로 저장하고 게스트 메인에 반영되는지 확인한 뒤 이전 버전을 복원하면 저장·공개 반영·복원까지 한 번에 검증할 수 있습니다.

## 6. 무료 플랜 동작

- Render Free Web Service는 일정 시간 요청이 없으면 슬립하며 첫 요청이 늦을 수 있습니다.
- 설정은 Neon에 있으므로 Render 재시작·재배포 후에도 유지됩니다.
- Neon 한도에 접근하면 Neon Console의 사용량을 확인합니다.

## 7. 롤백

- 앱 코드 문제: GitHub에서 직전 정상 커밋으로 되돌린 뒤 Render 재배포
- 운영 설정 문제: `/admin` → `변경 이력·백업`에서 정상 버전을 새 버전으로 복원
- DB 장애 대비: `/admin`의 JSON 백업을 내려받아 별도 보관
- 원본 기준 복구: 작업 전 원본 ZIP을 그대로 보관하고, 필요 시 그 버전을 새 브랜치/커밋으로 복원

서비스나 DB 삭제는 정상 배포 검증과 백업 확인이 끝난 뒤에만 진행합니다.
