const config = globalThis.JCALCULATOR_CONFIG ?? {};
const apiBaseUrl = String(config.apiBaseUrl ?? "").replace(/\/$/, "");
const storageKey = "jcalculator-api-key";
const storageExpiresKey = "jcalculator-api-key-expires-at";
const keyLifetimeMs = 8 * 60 * 60 * 1000;
const responseCache = new Map();
let keyPromptPromise = null;
let keyExpiryTimer = null;

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

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "jcalculator-auth";
  overlay.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(15,23,42,.78);backdrop-filter:blur(5px);padding:20px;font-family:Inter,Pretendard,system-ui,sans-serif";
  overlay.innerHTML = `
    <form style="width:min(420px,100%);background:#fff;border-radius:16px;padding:26px;box-shadow:0 24px 70px rgba(0,0,0,.35)">
      <div style="font-size:11px;font-weight:800;letter-spacing:.14em;color:#2563eb">JCALCULATOR ACCESS</div>
      <h1 style="margin:7px 0 8px;font-size:23px;color:#0f172a">API 키를 입력하세요</h1>
      <p style="margin:0 0 17px;color:#64748b;font-size:13px;line-height:1.65">관리자에게 받은 개인 키를 입력하면 이 브라우저에서 8시간 동안 유지됩니다. 키가 폐기되거나 8시간이 지나면 다시 입력해야 합니다.</p>
      <input name="key" type="password" autocomplete="off" required placeholder="API 키" style="box-sizing:border-box;width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:12px 13px;font-size:14px;outline:none" />
      <p data-error style="display:none;margin:9px 0 0;color:#b91c1c;font-size:12px"></p>
      <button type="submit" style="width:100%;border:0;border-radius:9px;margin-top:14px;padding:12px;background:#1d4ed8;color:#fff;font-size:14px;font-weight:800;cursor:pointer">인증하고 계산기 열기</button>
      <p style="margin:11px 0 0;text-align:center;color:#64748b;font-size:11px">무료 서버는 처음 연결할 때 약간의 대기 시간이 생길 수 있습니다.</p>
    </form>`;
  document.body.appendChild(overlay);
  return overlay;
}

function apiKey() {
  const key = localStorage.getItem(storageKey) ?? "";
  const expiresAt = Number(localStorage.getItem(storageExpiresKey));
  if (!key || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    forgetKey();
    return "";
  }
  scheduleKeyExpiry(expiresAt);
  return key;
}

function forgetKey() {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(storageExpiresKey);
  if (keyExpiryTimer !== null) {
    window.clearTimeout(keyExpiryTimer);
    keyExpiryTimer = null;
  }
}

function scheduleKeyExpiry(expiresAt) {
  if (keyExpiryTimer !== null) window.clearTimeout(keyExpiryTimer);
  const delay = expiresAt - Date.now();
  if (delay <= 0) {
    forgetKey();
    return;
  }
  keyExpiryTimer = window.setTimeout(forgetKey, delay);
}

function rememberKey(key) {
  const expiresAt = Date.now() + keyLifetimeMs;
  localStorage.setItem(storageKey, key);
  localStorage.setItem(storageExpiresKey, String(expiresAt));
  scheduleKeyExpiry(expiresAt);
}

async function promptForKey(message = "") {
  if (keyPromptPromise) return keyPromptPromise;
  keyPromptPromise = new Promise((resolve) => {
    document.getElementById("jcalculator-auth")?.remove();
    const overlay = createOverlay();
    const form = overlay.querySelector("form");
    const input = form.elements.key;
    const error = overlay.querySelector("[data-error]");
    if (message) {
      error.textContent = message;
      error.style.display = "block";
    }
    input.focus();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      rememberKey(value);
      overlay.remove();
      keyPromptPromise = null;
      resolve(value);
    });
  });
  return keyPromptPromise;
}

async function ensureKey() {
  return apiKey() || promptForKey();
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

async function request(path, options = {}, allowRetry = true) {
  if (!apiBaseUrl) throw new Error("api-config.js에 apiBaseUrl을 설정해 주세요.");
  const key = await ensureKey();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);
  const stopLoading = loading("계산 서버에 연결하는 중입니다…");
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": key,
        ...(options.headers ?? {}),
      },
    });
    if (response.status === 401 && allowRetry) {
      forgetKey();
      await promptForKey("키가 올바르지 않거나 폐기되었습니다. 새 키를 입력하세요.");
      return request(path, options, false);
    }
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
  forgetKey,
};
