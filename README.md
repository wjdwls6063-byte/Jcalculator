# Jcalculator 통합 Web Service

메인과 6개 설계 도구, 00 일정관리, 계산 API, `/admin` 편집 화면을 제공합니다. 현재 운영 환경은 Render Static Site(`Jcalculator`)와 Python Web Service(`jcalculator-engine-api`)로 나뉘며, `/api/*` 요청은 Web Service로 전달됩니다. 계산기는 로그인 없이 사용하며, 일정관리는 관리자 편집 모드와 게스트 보기 모드를 제공합니다.

## 구조

- `frontend/`: 메인, 6개 도구, 실제 관리자 화면
- `backend/app/`: 계산 엔진, 공개 API, 관리자 인증·설정 API
- `backend/tests/`: 계산 회귀·예외입력·관리자 보안 테스트
- `render.yaml`: 새 환경에서 단일 Web Service로 구성할 때 사용할 수 있는 Blueprint 예시
- `DEPLOY_GUIDE_KO.md`: Neon + Render 배포 및 롤백 절차

로컬 개발에서는 FastAPI가 `frontend/`도 직접 제공합니다. 현재 Render 운영 환경에서는 Static Site와 API Web Service를 사용합니다.

## 주요 경로

- `/`, `/conveyor/`, `/ballscrew/`, `/ballscrew/vertical/`
- `/eccentric/`, `/smc-cylinder/`, `/sensor/`
- `/admin/`: 관리자 로그인·편집·변경 이력·백업
- `/schedule/`: 관리자 편집 또는 게스트 보기 모드로 공유하는 프로젝트 일정관리
- `/api/schedule/document`: 관리자·게스트 조회, 관리자만 저장 (CSRF·버전 검사)
- `/api/public/config`: 게스트 화면에 적용할 공개 설정
- `/api/admin/*`: 로그인 세션과 CSRF 검증이 필요한 관리자 API
- `/health`: Render 상태 확인

## 보안·저장 방식

- 관리자 비밀번호 원문은 소스와 DB에 저장하지 않습니다.
- Render 환경변수 `JCALCULATOR_ADMIN_PASSWORD_HASH`와 `JCALCULATOR_GUEST_PASSWORD_HASH`에는 각각 scrypt 해시만 저장합니다.
- 게스트는 별도 세션으로 일정만 조회할 수 있습니다. 관리자 설정 조회와 일정 저장은 서버에서 거부합니다.
- 로그인 세션은 예측 불가능한 토큰을 사용하고, DB에는 토큰의 SHA-256 해시만 저장합니다.
- 쿠키는 `HttpOnly`, `SameSite=Strict`, 운영 HTTPS에서는 `Secure`입니다.
- 설정 변경 요청은 CSRF 토큰, 버전 충돌 검사, 서버측 값 범위 검증을 통과해야 합니다.
- 운영 설정·변경 이력·관리자 세션은 외부 Neon PostgreSQL에 저장합니다.
- 일정 데이터도 같은 PostgreSQL에 저장합니다. Render에서 `DATABASE_URL`이 없으면 일정 API는 저장을 거부합니다.
- 기존 브라우저의 `localStorage` 일정은 로그인 후 첫 화면의 **기존 일정 가져오기**로 한 번 옮깁니다. 서버가 이미 비어 있지 않으면 기존 내용을 자동 덮어쓰지 않고 JSON 백업을 받게 합니다.

## 로컬 실행

```powershell
python -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt
python backend/scripts/generate_admin_password_hash.py
```

출력된 해시를 현재 PowerShell 세션의 `JCALCULATOR_ADMIN_PASSWORD_HASH`에 설정한 뒤 실행합니다.

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

`DATABASE_URL`이 없으면 로컬 개발용 SQLite 파일 `backend/.data/jcalculator.db`를 사용합니다. 이 폴더는 Git에서 제외됩니다.

## 테스트

```powershell
cd backend
python -m pytest -q
```

현재 자동 테스트는 계산식 회귀, 0·음수·NaN·무한대·극단값, 공개 게스트 API, 관리자 로그인, HttpOnly 쿠키, CSRF, 동시편집 충돌, 버전 저장·복원·백업을 검증합니다.
