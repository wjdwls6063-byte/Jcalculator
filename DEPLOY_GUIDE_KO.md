# Render 배포 및 API 키 관리 안내

아래 순서대로 진행하면 됩니다. 먼저 백엔드를 배포하고, 발급된 백엔드 주소를 확인한 다음 기존 Static Site를 갱신합니다.

## 1. 배포 전 파일 확인

저장소 최상위에는 다음 세 항목이 있어야 합니다.

```text
backend/
frontend/
render.yaml
```

`.env`, `.venv`, 실제 API 키는 GitHub에 올리지 않습니다.

## 2. 동료별 API 키 만들기

PowerShell에서 다음을 실행합니다.

```powershell
cd backend
python scripts/generate_api_key.py
```

긴 문자열 하나가 출력됩니다. 동료마다 명령을 다시 실행하여 서로 다른 키를 만듭니다. 예를 들어 홍길동과 김설계에게 각각 발급한다면 Render 환경변수 값은 다음 형식입니다.

```text
hong=홍길동용_실제키,kim=김설계용_실제키
```

키 이름은 영문 소문자와 숫자로 짧게 정하면 관리하기 쉽습니다. 실제 키를 문서·소스·메신저 단체방에 남기지 마세요.

## 3. FastAPI 백엔드 배포

### Blueprint를 쓰는 방법

1. 이 프로젝트를 비공개 GitHub 저장소에 올립니다.
2. Render Dashboard에서 **New → Blueprint**를 선택합니다.
3. 저장소를 연결합니다.
4. `render.yaml`이 감지되면 `jcalculator-engine-api` Web Service 생성을 진행합니다.
5. `JCALCULATOR_API_KEYS` 입력란에 2단계에서 만든 `이름=키` 목록을 넣습니다.
6. 배포가 끝나면 `https://jcalculator-engine-api.onrender.com/health`를 엽니다.
7. `{"status":"ok"}`가 보이면 서버가 정상입니다.

### Web Service를 수동 생성하는 방법

- Runtime: `Python`
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/health`
- Environment:
  - `JCALCULATOR_API_KEYS`: `hong=키1,kim=키2`
  - `JCALCULATOR_ALLOWED_ORIGINS`: `https://jcalculator.onrender.com`

무료 인스턴스는 잠든 뒤 첫 요청에 시간이 걸릴 수 있습니다. 프런트 요청 제한 시간은 90초로 설정되어 있습니다.

## 4. 프런트의 API 주소 확인

`frontend/api-config.js`의 운영 주소가 실제 Web Service 주소와 같아야 합니다.

```javascript
apiBaseUrl: "https://jcalculator-engine-api.onrender.com"
```

Render가 다른 주소를 발급했다면 이 한 줄만 실제 주소로 바꿉니다. API 키는 이 파일에 넣지 않습니다.

## 5. 기존 Static Site 갱신

기존 `jcalculator.onrender.com` Static Site가 같은 저장소를 사용하도록 설정합니다.

- 저장소 루트가 프로젝트 최상위라면 Publish Directory: `frontend`
- Root Directory를 `frontend`로 지정했다면 Publish Directory: `.`
- 별도 빌드 과정은 없으므로 Build Command는 비워 두거나 기존 정적 배포 설정을 유지합니다.

배포 후 다음 주소를 차례로 엽니다.

- `/conveyor/`
- `/ballscrew/`
- `/ballscrew/vertical/`
- `/eccentric/`
- `/smc-cylinder/`

처음 열면 API 키 입력창이 나타납니다. 발급한 테스트 키를 넣고 기본 계산 결과가 표시되는지 확인합니다.

## 6. 배포 검증 체크리스트

- 키 없음 또는 틀린 키: 계산 API가 `401`
- 올바른 키: 모든 페이지의 기본 결과 표시
- 같은 입력: 이전 정적 버전과 결과 수치 일치
- 자동 조합 탐색: 볼스크류와 편심축 모두 응답
- 브라우저 개발자 도구 Console: 빨간 오류 없음
- 모바일 폭: 입력폼과 결과표가 기존처럼 표시
- `https://jcalculator.onrender.com` 외 Origin에는 CORS 허용 헤더가 없음

## 7. 퇴사자 키 폐기 — 킬 스위치

예를 들어 현재 값이 다음과 같다고 가정합니다.

```text
hong=키1,kim=키2,lee=키3
```

`lee`의 사용을 중단하려면 Render의 `JCALCULATOR_API_KEYS`에서 `lee=키3` 부분만 삭제하고 저장합니다.

```text
hong=키1,kim=키2
```

서비스 재시작 후 `lee` 키의 모든 새 API 요청은 `401`이 됩니다. 나머지 동료 키는 계속 작동합니다. 키를 다시 사용할 가능성이 있어도 삭제한 키를 복구하지 말고 새 키를 발급하세요.

## 8. 중복 배포 삭제

아래 검증이 모두 끝난 뒤에만 `jcalculator-api.onrender.com` 중복 서비스를 삭제합니다.

1. 메인 `jcalculator.onrender.com`의 다섯 페이지가 정상인지 확인합니다.
2. 최소 한 번은 다른 브라우저 또는 시크릿 창에서 새 키 입력부터 계산까지 확인합니다.
3. Render Dashboard에서 중복 서비스 `jcalculator-api`를 엽니다.
4. Settings의 삭제 메뉴에서 서비스 이름을 다시 입력해 삭제합니다.

삭제는 되돌리기 어려우므로 메인 사이트 검증 전에 실행하지 마세요.

## 9. 알아둘 한계

- 브라우저에서 쓰는 API 키는 사용자 본인에게는 보입니다. 이 방식은 DRM이 아니라 서버 접근권한과 폐기 가능한 킬 스위치입니다.
- CORS는 다른 웹사이트의 브라우저 호출을 제한할 뿐, 키를 알고 있는 `curl`이나 서버 프로그램을 막지 않습니다.
- 키 공유를 완전히 막아야 한다면 다음 단계로 회사 SSO, Cloudflare Access, 사용자 로그인, 호출 감사 로그와 속도 제한을 추가하는 것이 좋습니다.
- 서버가 보내는 응답에는 화면에 표시해야 하는 선택 제품 정보가 포함됩니다. 대량 토크표와 SMC 자동 선정 규칙은 정적 파일 및 공개 카탈로그 응답에서 제외했습니다.

