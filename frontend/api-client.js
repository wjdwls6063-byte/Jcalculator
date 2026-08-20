const config = globalThis.JCALCULATOR_CONFIG ?? {};
const apiBaseUrl = String(config.apiBaseUrl ?? "").replace(/\/$/, "");
const responseCache = new Map();

function revive(value) {
  if (value === "Infinity") return Infinity;
  if (value === "-Infinity") return -Infinity;
  if (value === "NaN") return NaN;
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, revive(item)]));
  }
  return value;
}

function loading(message) {
  let toast = document.getElementById("jcalculator-api-status");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "jcalculator-api-status";
    toast.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:99998;max-width:340px;border-radius:10px;padding:11px 14px;background:#0f172a;color:#fff;box-shadow:0 12px 35px rgba(15,23,42,.3);font:600 12px/1.5 Inter,Pretendard,system-ui,sans-serif;transition:opacity .2s";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = "1";
  return () => {
    toast.style.opacity = "0";
    window.setTimeout(() => toast.remove(), 220);
  };
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);
  const stopLoading = loading("계산 서버에 연결하는 중입니다…");
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail ?? `API 요청 실패 (${response.status})`);
    return revive(body);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("계산 서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
    stopLoading();
  }
}

export async function calculate(axis, inputs) {
  const path = axis === "vertical" ? "/api/ballscrew/vertical" : "/api/ballscrew";
  const cacheKey = `${axis}:${JSON.stringify(inputs)}`;
  const result = await request(path, { method: "POST", body: JSON.stringify(inputs) });
  responseCache.set(cacheKey, result);
  return result;
}

export async function autoSelect(inputs) {
  return request("/api/ballscrew/auto-select", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
}

export async function bootstrap(axis) {
  const catalog = await request(`/api/ballscrew/catalog?axis=${axis}`);
  const defaults = axis === "vertical" ? catalog.verticalDefaults : catalog.horizontalDefaults;
  const result = await calculate(axis, defaults);
  globalThis.__JCALC_BOOTSTRAP__ = { axis, catalog, result };
  return globalThis.__JCALC_BOOTSTRAP__;
}

export async function conveyorBootstrap() {
  return request("/api/conveyor/catalog");
}

export async function conveyorCalculate(inputs) {
  return request("/api/conveyor", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
}

export async function eccentricBootstrap() {
  return request("/api/eccentric/catalog");
}

export async function eccentricCalculate(inputs) {
  return request("/api/eccentric", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
}

export async function eccentricSearch(inputs) {
  return request("/api/eccentric/auto-select", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
}

export async function smcBootstrap() {
  return request("/api/smc-cylinder/catalog");
}

export async function smcResolve(inputs) {
  return request("/api/smc-cylinder", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
}

export function cached(cacheKey) {
  return responseCache.get(cacheKey);
}

export function showError(error) {
  const stop = loading(error?.message ?? "계산 중 오류가 발생했습니다.");
  window.setTimeout(stop, 7000);
}

globalThis.JCalculatorApi = {
  bootstrap,
  calculate,
  autoSelect,
  conveyorBootstrap,
  conveyorCalculate,
  eccentricBootstrap,
  eccentricCalculate,
  eccentricSearch,
  smcBootstrap,
  smcResolve,
  cached,
  showError,
};
