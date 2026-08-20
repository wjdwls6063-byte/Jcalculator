"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clone = (value) => JSON.parse(JSON.stringify(value));
const API = "/api/admin";
const TOOL_ORDER = ["conveyor", "ballscrew-horizontal", "ballscrew-vertical", "eccentric", "smc-cylinder", "sensor"];
const CATALOG_TYPES = [
  ["smc-cylinder", "SMC 실린더"], ["sensor", "OMRON 센서"], ["servo-motor", "서보모터"], ["reducer", "감속기"],
];
const LABELS = {
  passMargin: "통과 최소 여유율", warningMargin: "주의 경계", defaultSafetyFactor: "기본 안전율", decimalPlaces: "소수점 자릿수", showFormula: "계산 근거식 표시",
  load: "총하중", angle: "경사각", pmotor: "모터 출력", rpm: "모터 회전수", ratio: "감속비", pulley: "구동풀리 지름", center: "축간거리", width: "벨트폭", support: "지지방식", pitch: "롤러피치", sf: "안전율", eff: "기계효율", cmu: "직접입력 마찰계수", accelTime: "가속시간", equivalentInertia: "회전체 등가관성",
  massKg: "이송 질량", maxSpeedMmS: "최대 속도", accelTimeS: "가속시간", emergencyStopTimeS: "비상정지 시간", serviceFactor: "서비스 계수", safetyGoal: "안전 목표", brakeSafetyFactor: "브레이크 안전율",
  ta: "가속시간", te: "비상정지 시간", safetyFactor: "안전율", supplyPressureMpa: "공급압력", nonMagneticRatio: "비자성체 검출거리 비율",
  passMarginPct: "통과 여유율", warningMarginPct: "주의 여유율", autoSelectMargin: "자동선정 최소 여유",
};
const CONTENT_LABELS = {homeTitle:"메인 제목",homeDescription:"메인 설명",footerNotice:"메인 하단 안내"};

let csrfToken = "";
let session = null;
let current = null;
let originalConfig = null;
let workingConfig = null;
let defaultConfig = null;
let activeTool = TOOL_ORDER[0];
let activeCatalog = CATALOG_TYPES[0][0];
let versions = [];
let toastTimer = null;

async function request(path, options = {}) {
  const headers = {"Content-Type":"application/json", ...(options.headers || {})};
  if (options.csrf) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(API + path, {...options, credentials:"same-origin", headers});
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/login" && session) showLogin("관리자 세션이 만료되었습니다. 다시 로그인해 주세요.");
  if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : `요청 실패 (${response.status})`);
  return body;
}

function showToast(message, error = false) {
  const toast = $("#toast");
  toast.textContent = (error ? "! " : "✓ ") + message;
  toast.style.borderColor = error ? "rgba(251,113,133,.5)" : "rgba(185,231,105,.4)";
  toast.style.color = error ? "#fecdd3" : "#dfffb1";
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

function showLogin(message = "") {
  $("#adminApp").classList.add("hidden");
  $("#savebar").classList.add("hidden");
  $("#loginView").classList.remove("hidden");
  if (message) { $("#loginError").textContent = message; $("#loginError").classList.remove("hidden"); }
  $("#password").value = "";
}

async function loadAdmin() {
  const [configResult, defaultResult, versionResult] = await Promise.all([
    request("/config"), request("/default-config"), request("/versions?limit=20"),
  ]);
  current = configResult;
  originalConfig = clone(configResult.config);
  workingConfig = clone(configResult.config);
  defaultConfig = clone(defaultResult.config);
  versions = versionResult.items;
  $("#loginView").classList.add("hidden");
  $("#adminApp").classList.remove("hidden");
  $("#sessionUser").textContent = session.username;
  renderAll();
}

async function resumeSession() {
  try {
    session = await request("/session");
    csrfToken = session.csrfToken;
    await loadAdmin();
  } catch (error) {
    showLogin();
  }
}

function openPage(page) {
  $$(".page").forEach((item) => item.classList.toggle("active", item.id === `page-${page}`));
  $$("#nav button[data-page]").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  const active = $(`#nav button[data-page="${page}"] span`);
  $("#crumb").textContent = active ? active.textContent : "관리";
  $(".sidebar").classList.remove("open");
  if (page === "history") refreshVersions();
  window.scrollTo({top:0, behavior:"smooth"});
}

function setPath(root, path, value) {
  const parts = path.split(".");
  let target = root;
  parts.slice(0, -1).forEach((part) => { target = target[part]; });
  target[parts.at(-1)] = value;
}

function inputValue(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.dataset.type === "number") {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : 0;
  }
  return input.value;
}

function bindConfigInputs(root = document) {
  $$('[data-config-path]', root).forEach((input) => {
    input.addEventListener("input", () => {
      setPath(workingConfig, input.dataset.configPath, inputValue(input));
      updateDirty();
    });
  });
}

function makeInput(path, key, value, hint = "") {
  const label = document.createElement("label");
  label.textContent = LABELS[key] || key;
  let input;
  if (typeof value === "boolean") {
    input = document.createElement("input"); input.type = "checkbox"; input.checked = value;
    label.classList.add("check"); label.prepend(input);
  } else if (key === "support") {
    input = document.createElement("select");
    [["slider","슬라이더"],["uhmw","UHMW"],["hybrid","혼합형"],["roller","롤러"],["bearing","정밀 베어링"],["custom","직접 입력"]].forEach(([v,t]) => input.add(new Option(t,v)));
    input.value = value;
    label.appendChild(input);
  } else if (key === "safetyGoal") {
    input = document.createElement("select");
    [["standard","표준"],["safe","안전"],["extra","고안전"]].forEach(([v,t]) => input.add(new Option(t,v)));
    input.value = value;
    label.appendChild(input);
  } else {
    input = document.createElement("input");
    if (typeof value === "number") { input.type = "number"; input.step = "any"; input.dataset.type = "number"; }
    else input.type = "text";
    input.value = value ?? "";
    label.appendChild(input);
  }
  input.dataset.configPath = path;
  if (hint) { const small = document.createElement("small"); small.textContent = hint; label.appendChild(small); }
  return label;
}

function renderCommon() {
  const common = workingConfig.common;
  const commonForm = $("#commonForm"); commonForm.innerHTML = "";
  ["passMargin","warningMargin","defaultSafetyFactor"].forEach((key) => commonForm.appendChild(makeInput(`common.${key}`, key, common[key])));
  const displayForm = $("#displayForm"); displayForm.innerHTML = "";
  ["decimalPlaces","showFormula"].forEach((key) => displayForm.appendChild(makeInput(`common.${key}`, key, common[key])));
  bindConfigInputs($("#page-common"));
}

function renderToolTabs() {
  const tabs = $("#toolTabs"); tabs.innerHTML = "";
  TOOL_ORDER.forEach((toolId) => {
    const button = document.createElement("button"); button.textContent = workingConfig.tools[toolId].label;
    button.classList.toggle("active", toolId === activeTool);
    button.onclick = () => { activeTool = toolId; renderToolTabs(); renderToolForm(); };
    tabs.appendChild(button);
  });
}

function renderToolForm() {
  const tool = workingConfig.tools[activeTool];
  $("#toolFormTitle").textContent = `${tool.label} 기본값`;
  const defaults = $("#toolDefaultsForm"), thresholds = $("#toolThresholdForm"); defaults.innerHTML = ""; thresholds.innerHTML = "";
  Object.entries(tool.defaults).forEach(([key, value]) => defaults.appendChild(makeInput(`tools.${activeTool}.defaults.${key}`, key, value)));
  Object.entries(tool.thresholds).forEach(([key, value]) => thresholds.appendChild(makeInput(`tools.${activeTool}.thresholds.${key}`, key, value)));
  bindConfigInputs($("#page-tools"));
}

function renderContent() {
  const root = $("#contentForm"); root.innerHTML = "";
  Object.entries(workingConfig.content).forEach(([key, value]) => {
    const panel = document.createElement("article"); panel.className = "panel";
    const label = document.createElement("label"); label.textContent = CONTENT_LABELS[key] || key;
    const input = value.length > 60 ? document.createElement("textarea") : document.createElement("input");
    input.value = value; input.dataset.configPath = `content.${key}`; label.appendChild(input); panel.appendChild(label); root.appendChild(panel);
  });
  bindConfigInputs(root);
}

function renderCatalogTabs() {
  const root = $("#catalogTabs"); root.innerHTML = "";
  CATALOG_TYPES.forEach(([id, label]) => { const button = document.createElement("button"); button.textContent = label; button.classList.toggle("active", id === activeCatalog); button.onclick = () => { activeCatalog = id; renderCatalogTabs(); renderCatalog(); }; root.appendChild(button); });
}

function catalogItems() { return workingConfig.catalogOverrides[activeCatalog] || (workingConfig.catalogOverrides[activeCatalog] = []); }

function renderCatalog() {
  const query = $("#catalogSearch").value.trim().toLowerCase();
  const items = catalogItems();
  const body = $("#catalogBody"); body.innerHTML = "";
  items.forEach((item, index) => {
    if (query && !`${item.maker} ${item.model} ${item.spec}`.toLowerCase().includes(query)) return;
    const row = document.createElement("tr");
    row.innerHTML = `<td><span class="chip ${item.enabled === false ? "off" : ""}">${item.enabled === false ? "제외" : "사용"}</span></td><td></td><td><strong></strong></td><td></td><td></td><td><button>편집</button></td>`;
    row.children[1].textContent = item.maker; row.children[2].querySelector("strong").textContent = item.model; row.children[3].textContent = item.spec; row.children[4].textContent = item.verifiedAt;
    row.querySelector("button").onclick = () => openCatalog(index); body.appendChild(row);
  });
  if (!body.children.length) { const row = document.createElement("tr"); row.innerHTML = '<td class="empty" colspan="6">등록된 추가·교정 항목이 없습니다.</td>'; body.appendChild(row); }
  $("#catalogCount").textContent = `${items.length}개 항목`;
}

function openCatalog(index = -1) {
  const item = index >= 0 ? catalogItems()[index] : {maker:"",model:"",spec:"",sourceUrl:"",verifiedAt:new Date().toISOString().slice(0,10),enabled:true};
  $("#catalogIndex").value = String(index); $("#catalogMaker").value = item.maker; $("#catalogModel").value = item.model; $("#catalogSpec").value = item.spec; $("#catalogSource").value = item.sourceUrl; $("#catalogVerified").value = item.verifiedAt; $("#catalogEnabled").checked = item.enabled !== false;
  $("#catalogModalTitle").textContent = index >= 0 ? "카탈로그 항목 편집" : "카탈로그 항목 추가"; $("#deleteCatalogBtn").classList.toggle("hidden", index < 0); $("#catalogModal").classList.remove("hidden");
}

function saveCatalog(event) {
  event.preventDefault(); const index = Number($("#catalogIndex").value);
  const item = {maker:$("#catalogMaker").value.trim(),model:$("#catalogModel").value.trim(),spec:$("#catalogSpec").value.trim(),sourceUrl:$("#catalogSource").value.trim(),verifiedAt:$("#catalogVerified").value,enabled:$("#catalogEnabled").checked};
  if (!item.maker || !item.model || !item.spec || !item.sourceUrl || !item.verifiedAt) return;
  if (index >= 0) catalogItems()[index] = item; else catalogItems().push(item);
  $("#catalogModal").classList.add("hidden"); renderCatalog(); updateDirty();
}

function deleteCatalog() {
  const index = Number($("#catalogIndex").value); if (index < 0) return;
  catalogItems().splice(index, 1); $("#catalogModal").classList.add("hidden"); renderCatalog(); updateDirty();
}

function collectDiff(before, after, prefix = "") {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!before || !after || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) || Array.isArray(after)) return [{path:prefix || "config", before, after}];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].flatMap((key) => collectDiff(before[key], after[key], prefix ? `${prefix}.${key}` : key));
}

function updateDirty() {
  const diffs = collectDiff(originalConfig, workingConfig);
  $("#savebar").classList.toggle("hidden", diffs.length === 0); $("#statChanges").textContent = String(diffs.length); $("#changeSummary").textContent = `${diffs.length}개 변경`;
  return diffs;
}

function renderDashboard() {
  $("#statVersion").textContent = `v${current.version}`; $("#lastUpdated").textContent = formatDate(current.updatedAt);
  const cards = $("#toolCards"); cards.innerHTML = "";
  TOOL_ORDER.forEach((id) => { const tool = workingConfig.tools[id], card = document.createElement("div"); card.className = "tool-card"; card.innerHTML = `<div><strong></strong><small>${Object.keys(tool.defaults).length}개 기본값 · ${Object.keys(tool.thresholds).length}개 판정값</small></div><button>→</button>`; card.querySelector("strong").textContent = tool.label; card.querySelector("button").onclick = () => { activeTool = id; renderToolTabs(); renderToolForm(); openPage("tools"); }; cards.appendChild(card); });
  renderRecentVersions();
}

function formatDate(value) { try { return new Intl.DateTimeFormat("ko-KR",{dateStyle:"short",timeStyle:"short"}).format(new Date(value)); } catch { return value; } }

function renderRecentVersions() {
  const root = $("#recentVersions"); root.innerHTML = "";
  versions.slice(0,4).forEach((item) => { const row = document.createElement("div"); row.className = "activity-row"; row.innerHTML = `<div><b></b><small></small></div>`; row.querySelector("b").textContent = `v${item.version} · ${item.note}`; row.querySelector("small").textContent = `${formatDate(item.createdAt)} · ${item.createdBy}`; root.appendChild(row); });
}

function renderHistory() {
  const root = $("#historyList"); root.innerHTML = "";
  versions.forEach((item) => { const row = document.createElement("div"); row.className = "history-row"; row.innerHTML = `<time></time><div><strong></strong></div><span></span><button class="ghost">복원</button>`; row.querySelector("time").textContent = formatDate(item.createdAt); row.querySelector("strong").textContent = `v${item.version} · ${item.note}`; row.querySelector("span").textContent = item.createdBy; const button = row.querySelector("button"); button.disabled = item.version === current.version; button.textContent = item.version === current.version ? "현재" : "복원"; button.onclick = () => restoreVersion(item.version); root.appendChild(row); });
}

async function refreshVersions() { try { versions = (await request("/versions?limit=20")).items; renderHistory(); renderRecentVersions(); } catch (error) { showToast(error.message, true); } }

async function restoreVersion(version) {
  if (updateDirty().length) return showToast("현재 변경을 저장하거나 되돌린 뒤 복원해 주세요.", true);
  if (!confirm(`v${version} 설정을 새 버전으로 복원하시겠습니까?`)) return;
  try { const result = await request("/restore",{method:"POST",csrf:true,body:JSON.stringify({expectedVersion:current.version,version,note:`v${version} 설정 복원`})}); applyServerResult(result); showToast(`v${version} 설정을 새 버전으로 복원했습니다.`); } catch (error) { showToast(error.message, true); }
}

function renderAll() { renderCommon(); renderToolTabs(); renderToolForm(); renderCatalogTabs(); renderCatalog(); renderContent(); renderDashboard(); renderHistory(); updateDirty(); updateSessionClock(); }

function showReview() {
  const diffs = updateDirty(); if (!diffs.length) return;
  const list = $("#diffList"); list.innerHTML = "";
  diffs.slice(0,30).forEach((diff) => { const row = document.createElement("div"); row.className = "diff-item"; row.innerHTML = "<b></b><span></span>"; row.querySelector("b").textContent = diff.path; row.querySelector("span").textContent = `${JSON.stringify(diff.before)} → ${JSON.stringify(diff.after)}`; list.appendChild(row); });
  if (diffs.length > 30) list.insertAdjacentHTML("beforeend", `<div class="diff-item">외 ${diffs.length - 30}개 변경</div>`);
  $("#versionNote").value = ""; $("#saveError").classList.add("hidden"); $("#reviewModal").classList.remove("hidden");
}

function applyServerResult(result) {
  current = result; originalConfig = clone(result.config); workingConfig = clone(result.config); renderAll(); refreshVersions();
}

async function applyChanges() {
  const note = $("#versionNote").value.trim(); if (!note) { $("#saveError").textContent = "버전 설명을 입력해 주세요."; $("#saveError").classList.remove("hidden"); return; }
  const button = $("#applyBtn"); button.disabled = true;
  try { const result = await request("/config",{method:"PUT",csrf:true,body:JSON.stringify({expectedVersion:current.version,note,config:workingConfig})}); $("#reviewModal").classList.add("hidden"); applyServerResult(result); showToast(`설정 v${result.version}을 적용했습니다.`); }
  catch (error) { $("#saveError").textContent = error.message; $("#saveError").classList.remove("hidden"); }
  finally { button.disabled = false; }
}

function discardChanges() { workingConfig = clone(originalConfig); renderAll(); showToast("저장하지 않은 변경을 되돌렸습니다."); }

async function downloadBackup() {
  try { const response = await fetch(`${API}/backup`,{credentials:"same-origin"}); if (!response.ok) throw new Error("백업을 내려받지 못했습니다."); const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `jcalculator-config-v${current.version}.json`; link.click(); URL.revokeObjectURL(url); }
  catch (error) { showToast(error.message, true); }
}

function updateSessionClock() {
  if (!session) return; const remaining = Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 60000)); $("#sessionTime").textContent = `세션 약 ${remaining}분 남음`;
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = event.submitter; button.disabled = true; $("#loginError").classList.add("hidden");
  try { session = await request("/login",{method:"POST",body:JSON.stringify({username:$("#username").value.trim(),password:$("#password").value})}); csrfToken = session.csrfToken; await loadAdmin(); showToast("관리자 로그인에 성공했습니다."); }
  catch (error) { $("#loginError").textContent = error.message; $("#loginError").classList.remove("hidden"); }
  finally { button.disabled = false; }
});

$("#logoutBtn").onclick = async () => { try { await request("/logout",{method:"POST",csrf:true,body:"{}"}); } catch {} session = null; csrfToken = ""; showLogin(); };
$$('[data-page]').forEach((button) => button.onclick = () => openPage(button.dataset.page));
$$('[data-jump]').forEach((button) => button.onclick = () => openPage(button.dataset.jump));
$$('[data-close]').forEach((button) => button.onclick = () => $(`#${button.dataset.close}`).classList.add("hidden"));
$("#mobileMenu").onclick = () => $(".sidebar").classList.toggle("open");
$("#resetToolBtn").onclick = () => { workingConfig.tools[activeTool] = clone(defaultConfig.tools[activeTool]); renderToolTabs(); renderToolForm(); updateDirty(); showToast("현재 도구를 코드 기본값으로 되돌렸습니다."); };
$("#catalogSearch").addEventListener("input", renderCatalog); $("#addCatalogBtn").onclick = () => openCatalog(); $("#catalogForm").addEventListener("submit", saveCatalog); $("#deleteCatalogBtn").onclick = deleteCatalog;
$("#reviewBtn").onclick = showReview; $("#applyBtn").onclick = applyChanges; $("#discardBtn").onclick = discardChanges; $("#backupBtn").onclick = downloadBackup;
setInterval(updateSessionClock, 30000);
resumeSession();
