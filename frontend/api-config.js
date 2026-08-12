// 공개 설정입니다. API 키는 이 파일에 넣지 마세요.
window.JCALCULATOR_CONFIG = Object.freeze({
  apiBaseUrl: ["127.0.0.1", "localhost"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "https://jcalculator-engine-api.onrender.com",
});
