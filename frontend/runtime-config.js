(function () {
  "use strict";

  const configuredBase = String(window.JCALCULATOR_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const ready = fetch(`${configuredBase}/api/public/config`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`설정 불러오기 실패 (${response.status})`);
      return response.json();
    })
    .then((config) => {
      window.dispatchEvent(new CustomEvent("jcalculator:config", { detail: config }));
      return config;
    })
    .catch((error) => {
      console.warn("Jcalculator 관리자 설정을 기본값으로 대체합니다.", error);
      return null;
    });

  window.JCalculatorRuntimeConfig = { ready };
})();
