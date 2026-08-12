# Jcalculator API 전환판

기존 화면은 유지하면서 계산 엔진과 주요 카탈로그/선정 규칙을 FastAPI 서버로 옮긴 버전입니다. 브라우저는 입력값을 `X-API-Key`와 함께 보내고 계산 결과만 받습니다.

## 폴더 구조

- `frontend/`: Render Static Site에 올릴 정적 화면
- `backend/`: FastAPI 계산 서버와 서버 전용 카탈로그
- `render.yaml`: Render Web Service 생성 설정
- `DEPLOY_GUIDE_KO.md`: 처음부터 따라 하는 배포·키 관리 안내

## 구현된 API

- `POST /api/conveyor`
- `POST /api/ballscrew`
- `POST /api/ballscrew/vertical`
- `POST /api/eccentric`
- `POST /api/smc-cylinder`
- 각 화면의 인증된 카탈로그/자동 선정 보조 엔드포인트
- `GET /health` — Render 상태 확인용, API 키 불필요

모든 `/api/` 요청은 `X-API-Key`가 필요합니다. 허용 Origin 기본값은 `https://jcalculator.onrender.com` 하나입니다.

## 검증 결과

- 원본 볼스크류 JS에서 생성한 회귀 픽스처와 Python 결과 비교
- 컨베이어·편심축 기본 입력의 원본 수치 고정 회귀 테스트
- SMC 선정 결과 및 서버측 자동 조합 탐색 테스트
- 인증 실패, 키 폐기, CORS 허용/차단 테스트
- 네 화면의 DOM 초기 렌더 테스트

로컬 테스트 명령:

```powershell
cd backend
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m pytest -q
```

현재 기준 결과는 `18 passed`입니다.

## 중요한 보안 범위

이 구조의 API 키는 “브라우저에서 절대 보이지 않는 비밀”이 아니라 사용 권한입니다. 키를 받은 사용자는 개발자 도구에서 자기 키와 API 응답을 볼 수 있습니다. 대신 계산 엔진 원본은 Static Site에 포함되지 않고, 키를 폐기하면 이후 계산·선정 요청은 `401`로 차단됩니다.

동료마다 서로 다른 키를 발급해야 한 사람의 키만 선택적으로 폐기할 수 있습니다. 자세한 절차는 `DEPLOY_GUIDE_KO.md`를 따르세요.
