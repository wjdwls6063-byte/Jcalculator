const config = globalThis.JCALCULATOR_CONFIG ?? {};
const apiBaseUrl = String(config.apiBaseUrl ?? "").replace(/\/$/, "");
const responseCache = new Map();
let fallbackUntil = 0;
const FALLBACK_RETRY_MS = 60_000;

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
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
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

function useFallback() {
  fallbackUntil = Date.now() + FALLBACK_RETRY_MS;
  let toast = document.getElementById("jcalculator-fallback-status");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "jcalculator-fallback-status";
    toast.style.cssText = "position:fixed;left:18px;bottom:18px;z-index:99997;max-width:360px;border-radius:10px;padding:10px 13px;background:#fef3c7;color:#78350f;border:1px solid #f59e0b;box-shadow:0 10px 30px rgba(120,53,15,.18);font:700 12px/1.45 Inter,Pretendard,system-ui,sans-serif";
    toast.textContent = "계산 서버 점검 중 · 브라우저 비상 계산 모드로 동작합니다.";
    document.body.appendChild(toast);
  }
}

function parseEngineResult(value) {
  return revive(JSON.parse(value));
}

async function localBallscrew(axis, inputs) {
  const engine = await import("./fallback/ballscrew-fallback.js");
  return axis === "vertical" ? engine.calculateVertical(inputs) : engine.calculateHorizontal(inputs);
}

async function localConveyorCatalog() {
  const engine = await import("./fallback/conveyor-engine.js");
  return parseEngineResult(engine.conveyorCatalogJSON());
}

async function localConveyorCalculate(inputs) {
  const engine = await import("./fallback/conveyor-engine.js");
  return parseEngineResult(engine.conveyorCalculateJSON(JSON.stringify(inputs)));
}

async function localEccentricCatalog() {
  const engine = await import("./fallback/eccentric-engine.js");
  return parseEngineResult(engine.eccentricCatalogJSON());
}

async function localEccentricCalculate(inputs) {
  const engine = await import("./fallback/eccentric-engine.js");
  return parseEngineResult(engine.eccentricCalculateJSON(JSON.stringify(inputs)));
}

async function localEccentricSearch(inputs) {
  const engine = await import("./fallback/eccentric-engine.js");
  return parseEngineResult(engine.eccentricSearchJSON(JSON.stringify(inputs)));
}

async function localSmcCatalog() {
  const engine = await import("./fallback/smc-engine.js");
  return parseEngineResult(engine.smcCatalogJSON());
}

async function localSmcResolve(inputs) {
  const engine = await import("./fallback/smc-engine.js");
  return parseEngineResult(engine.smcResolveJSON(JSON.stringify(inputs)));
}

async function serverFirst(serverCall, fallbackCall) {
  if (Date.now() < fallbackUntil) return fallbackCall();
  try {
    return await serverCall();
  } catch (error) {
    useFallback();
    try {
      return await fallbackCall();
    } catch (fallbackError) {
      fallbackError.cause = error;
      throw fallbackError;
    }
  }
}

export async function calculate(axis, inputs) {
  const path = axis === "vertical" ? "/api/ballscrew/vertical" : "/api/ballscrew";
  const cacheKey = `${axis}:${JSON.stringify(inputs)}`;
  const result = await serverFirst(
    () => request(path, { method: "POST", body: JSON.stringify(inputs) }),
    () => localBallscrew(axis, inputs),
  );
  responseCache.set(cacheKey, result);
  return result;
}

export async function autoSelect(inputs) {
  return serverFirst(
    () => request("/api/ballscrew/auto-select", { method: "POST", body: JSON.stringify(inputs) }),
    async () => ({ ok: false, error: "비상 계산 모드에서는 자동 조합 탐색을 사용할 수 없습니다. 입력 조건 계산은 정상 동작합니다." }),
  );
}

export async function bootstrap(axis) {
  let catalog;
  let result;
  if (Date.now() < fallbackUntil) {
    const engine = await import("./fallback/ballscrew-fallback.js");
    catalog = engine.catalog(axis);
    const defaults = axis === "vertical" ? catalog.verticalDefaults : catalog.horizontalDefaults;
    result = await localBallscrew(axis, defaults);
  } else {
    try {
      catalog = await request(`/api/ballscrew/catalog?axis=${axis}`);
      const defaults = axis === "vertical" ? catalog.verticalDefaults : catalog.horizontalDefaults;
      result = await request(axis === "vertical" ? "/api/ballscrew/vertical" : "/api/ballscrew", { method: "POST", body: JSON.stringify(defaults) });
    } catch (error) {
      useFallback();
      const engine = await import("./fallback/ballscrew-fallback.js");
      catalog = engine.catalog(axis);
      const defaults = axis === "vertical" ? catalog.verticalDefaults : catalog.horizontalDefaults;
      result = await localBallscrew(axis, defaults);
    }
  }
  globalThis.__JCALC_BOOTSTRAP__ = { axis, catalog, result };
  return globalThis.__JCALC_BOOTSTRAP__;
}

export async function conveyorBootstrap() {
  return serverFirst(() => request("/api/conveyor/catalog"), localConveyorCatalog);
}

export async function conveyorCalculate(inputs) {
  return serverFirst(
    () => request("/api/conveyor", { method: "POST", body: JSON.stringify(inputs) }),
    () => localConveyorCalculate(inputs),
  );
}

export async function eccentricBootstrap() {
  return serverFirst(() => request("/api/eccentric/catalog"), localEccentricCatalog);
}

export async function eccentricCalculate(inputs) {
  return serverFirst(
    () => request("/api/eccentric", { method: "POST", body: JSON.stringify(inputs) }),
    () => localEccentricCalculate(inputs),
  );
}

export async function eccentricSearch(inputs) {
  return serverFirst(
    () => request("/api/eccentric/auto-select", { method: "POST", body: JSON.stringify(inputs) }),
    () => localEccentricSearch(inputs),
  );
}

export async function smcBootstrap() {
  return serverFirst(() => request("/api/smc-cylinder/catalog"), localSmcCatalog);
}

export async function smcResolve(inputs) {
  return serverFirst(
    () => request("/api/smc-cylinder", { method: "POST", body: JSON.stringify(inputs) }),
    () => localSmcResolve(inputs),
  );
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
