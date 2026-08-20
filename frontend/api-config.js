// 공개 설정입니다. 운영 배포는 같은 Web Service의 API를 사용합니다.
window.JCALCULATOR_CONFIG = Object.freeze({
  apiBaseUrl: ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port !== "8000"
    ? "http://127.0.0.1:8000"
    : "",
});
