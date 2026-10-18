import { calculateAirConsumption } from './calculator.js';

const form = document.querySelector('#calculator');
const $ = selector => document.querySelector(selector);
const numeric = name => form.elements[name].value.trim() === '' ? NaN : Number(form.elements[name].value);
const HELP = {
  mode: ['작동 방식', '복동은 전진과 후진 모두 압축공기를 공급합니다. 단동은 한 방향에만 공급하고 반대 방향은 스프링으로 복귀합니다.'],
  bore: ['실린더 내경 D', '실린더 튜브 안쪽 지름입니다. 피스톤 면적과 전진 시 공기 체적을 결정합니다. 호스 지름과는 다른 값입니다.'],
  rod: ['로드 지름 d', '피스톤 로드의 지름입니다. 후진측은 로드가 차지하는 면적만큼 공기가 들어갈 공간이 줄어듭니다.'],
  stroke: ['스트로크 L', '실린더가 한 번 전진 또는 후진할 때 이동하는 거리입니다. 실린더 카탈로그의 스트로크를 mm로 입력합니다.'],
  pressureOut: ['전진측 압력 P₁', '전진할 때 실린더 헤드측에 공급되는 게이지압입니다. 압력계가 표시하는 MPa 값을 입력합니다.'],
  pressureIn: ['후진측 압력 P₂', '후진할 때 로드측에 공급되는 게이지압입니다. 양쪽 압력이 같으면 전진측과 같은 값을 입력합니다.'],
  cyclesPerMinute: ['작동 빈도 N', '전진 → 후진을 1왕복으로 셉니다. 1분 동안 이 왕복이 몇 번 일어나는지 입력합니다. 대기 시간을 포함해 1왕복에 10초 걸리면 6왕복/분입니다.'],
  cylinderCount: ['실린더 수량', '같은 조건으로 작동하는 실린더 개수입니다. 설비 전체의 분당 소비량은 실린더 1개의 분당 소비량에 이 수량을 곱합니다.'],
  piping: ['밸브~실린더 배관', '솔레노이드 밸브와 실린더 포트 사이 호스에 채우는 공기도 소비량에 포함할 수 있습니다. 밸브 모델명이나 유량 사양은 이 소비량 계산에 필요하지 않습니다.'],
  includePiping: ['배관 포함', '켜면 호스에 채우는 공기량까지 더합니다. 끄면 실린더 내부의 소비량만 표시하므로 실제 설비 소비량보다 작을 수 있습니다.'],
  tubeIdOut: ['전진측 호스 내경', '전진측 호스의 안쪽 지름입니다. 호스 외경이 아니라 내경을 입력합니다.'],
  tubeLengthOut: ['전진측 호스 길이', '솔레노이드 밸브의 전진측 포트에서 실린더 포트까지 연결된 호스 길이입니다.'],
  tubeIdIn: ['후진측 호스 내경', '후진측 호스의 안쪽 지름입니다. 전진측과 다르면 각각 따로 입력합니다.'],
  tubeLengthIn: ['후진측 호스 길이', '솔레노이드 밸브의 후진측 포트에서 실린더 포트까지 연결된 호스 길이입니다.'],
  temperatureC: ['공기 온도', '한국 SMC 설명서의 293/T 온도 보정에 사용합니다. 20°C가 기본값이며 이때 보정 계수는 1입니다.'],
  perCycle: ['1왕복 소비량', '실린더 1개가 전진하고 후진하는 동안 쓰는 공기량입니다. 복동은 두 방향을 합치고 단동은 공기를 공급하는 방향만 셉니다.'],
  perMinute: ['분당 소비량', '1왕복 소비량 × 1분 동안의 왕복 횟수입니다. 설비 전체 값은 여기에 같은 조건의 실린더 수량을 곱합니다.'],
  anr: ['ANR', '대기 기준 상태로 환산한 공기 체적을 뜻합니다. 여기서 L(ANR)은 1왕복 양이고 L/min(ANR)은 분당 소비량입니다.'],
};

function installHelp() {
  const targets = [
    [$('.mode-group legend'), 'mode'],
    ...['bore', 'rod', 'stroke', 'pressureOut', 'pressureIn', 'cyclesPerMinute', 'cylinderCount',
      'tubeIdOut', 'tubeLengthOut', 'tubeIdIn', 'tubeLengthIn', 'temperatureC']
      .map(name => [form.elements[name].closest('.field'), name]),
    [$('.pipe-section h3'), 'piping'], [$('.pipe-section .switch'), 'includePiping'],
    [$('.hero-result > span'), 'perMinute'], [$('.result-pair > div:first-child > span'), 'perCycle'],
    [$('.result-pair > div:last-child > span'), 'perMinute'], [$('.reference-chip small'), 'anr'],
  ];
  const tip = document.createElement('div');
  tip.id = 'termTooltip';
  tip.className = 'term-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  let active = null;
  let pinned = false;

  function hide() {
    if (active) active.setAttribute('aria-expanded', 'false');
    active = null;
    pinned = false;
    tip.hidden = true;
  }
  function show(button, stick = false) {
    if (active && active !== button) active.setAttribute('aria-expanded', 'false');
    active = button;
    pinned = stick;
    button.setAttribute('aria-expanded', 'true');
    tip.textContent = HELP[button.dataset.help][1];
    tip.hidden = false;
    const rect = button.getBoundingClientRect();
    const width = tip.getBoundingClientRect().width;
    const height = tip.getBoundingClientRect().height;
    tip.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - width - 12))}px`;
    tip.style.top = `${rect.bottom + 9 + height > innerHeight ? Math.max(8, rect.top - height - 9) : rect.bottom + 9}px`;
  }

  for (const [target, key] of targets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'term-help';
    button.dataset.help = key;
    button.textContent = 'ⓘ';
    button.setAttribute('aria-label', `${HELP[key][0]} 설명`);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-describedby', 'termTooltip');
    if (target.classList.contains('field')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'field-wrap';
      target.replaceWith(wrapper);
      wrapper.append(target, button);
    } else if (key === 'includePiping') {
      const wrapper = document.createElement('span');
      wrapper.className = 'switch-wrap';
      target.replaceWith(wrapper);
      wrapper.append(target, button);
    } else target.append(button);
    button.addEventListener('mouseenter', () => { if (!pinned) show(button); });
    button.addEventListener('mouseleave', () => { if (!pinned && active === button) hide(); });
    button.addEventListener('focus', () => { if (!pinned) show(button); });
    button.addEventListener('blur', () => { if (!pinned && active === button) hide(); });
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (active === button && pinned) hide(); else show(button, true);
    });
  }
  document.addEventListener('pointerdown', event => {
    if (pinned && !event.target.closest('.term-help')) hide();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  window.addEventListener('scroll', () => { if (active) hide(); }, { passive: true });
  window.addEventListener('resize', hide);
}
const sample = {
  mode: 'double', bore: 20, rod: 8, stroke: 50,
  pressureOut: 0.4, pressureIn: 0.4,
  tubeIdOut: 4, tubeIdIn: 4, tubeLengthOut: 1500, tubeLengthIn: 1500,
  cyclesPerMinute: 30, cylinderCount: 1, temperatureC: 20, includePiping: true,
};

function readInputs() {
  return {
    mode: form.elements.mode.value,
    bore: numeric('bore'), rod: numeric('rod'), stroke: numeric('stroke'),
    pressureOut: numeric('pressureOut'), pressureIn: numeric('pressureIn'),
    tubeIdOut: numeric('tubeIdOut'), tubeIdIn: numeric('tubeIdIn'),
    tubeLengthOut: numeric('tubeLengthOut') * 1000,
    tubeLengthIn: numeric('tubeLengthIn') * 1000,
    cyclesPerMinute: numeric('cyclesPerMinute'), cylinderCount: numeric('cylinderCount'),
    temperatureC: numeric('temperatureC'), includePiping: form.elements.includePiping.checked,
  };
}

const amount = value => value.toLocaleString('ko-KR', { minimumFractionDigits: Math.abs(value) < 0.01 ? 4 : 3, maximumFractionDigits: Math.abs(value) < 0.01 ? 4 : 3 });
const perMinute = value => value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const factor = value => value.toLocaleString('ko-KR', { maximumFractionDigits: 4 });

function updateMode() {
  const mode = form.elements.mode.value;
  document.querySelectorAll('[data-direction="out"]').forEach(node => node.classList.toggle('inactive', mode === 'spring-extend'));
  document.querySelectorAll('[data-direction="in"]').forEach(node => node.classList.toggle('inactive', mode === 'spring-return'));
  $('#pipeInputs').classList.toggle('off', !form.elements.includePiping.checked);
}

function renderExample() {
  const result = calculateAirConsumption(sample);
  const printedCycle = Number(result.perCycle.toFixed(3));
  const agrees = Math.abs(result.extension.total - 0.154) < 0.0005
    && Math.abs(result.retraction.total - 0.141) < 0.0005
    && printedCycle === 0.295
    && printedCycle * sample.cyclesPerMinute === 8.85;
  const status = $('#exampleStatus');
  status.textContent = agrees ? '공식 예제 재현 ✓' : '예제 재확인 필요';
  status.classList.toggle('failed', !agrees);
  $('#exampleValues').innerHTML = `<div class="example-values"><span>전진 <strong>${amount(result.extension.total)}</strong> L</span><span>후진 <strong>${amount(result.retraction.total)}</strong> L</span><span>1왕복 <strong>${amount(result.perCycle)}</strong> L</span><span>SMC 표기 <strong>${perMinute(printedCycle * sample.cyclesPerMinute)}</strong> L/min</span></div><p class="rounding-note">SMC 예제는 반올림한 1왕복 값 0.295 × 30 = <b>8.85 L/min</b>으로 표기합니다. 이 계산기의 최종 결과는 반올림 전 값으로 계산하므로 같은 조건에서 <b>${perMinute(result.perMinuteTotal)} L/min</b>입니다. 차이 0.01 L/min은 중간 반올림 때문입니다.</p>`;
}

function render() {
  updateMode();
  try {
    const input = readInputs();
    const result = calculateAirConsumption(input);
    $('#formError').hidden = true;
    $('#perCycle').textContent = amount(result.perCycle);
    $('#perMinuteEach').textContent = perMinute(result.perMinuteEach);
    $('#perMinuteTotal').textContent = perMinute(result.perMinuteTotal);
    $('#totalHint').textContent = `실린더 ${input.cylinderCount}개 × ${factor(input.cyclesPerMinute)}왕복/분 · 배관 ${input.includePiping ? '포함' : '제외'}`;

    const rows = [
      ['전진', result.extension, result.usesExtension],
      ['후진', result.retraction, result.usesRetraction],
    ];
    $('#strokeBreakdown').innerHTML = rows.map(([label, stroke, active]) => `<div class="stroke-row ${active ? '' : 'off'}"><strong>${label}</strong><span>${active ? '1회 소비량' : '스프링 복귀 · 공급 제외'}</span><b>${active ? amount(stroke.total) : '—'} L</b>${active ? `<div class="stroke-parts"><span>실린더 ${amount(stroke.cylinder)} L</span><span>배관 ${amount(stroke.piping)} L</span></div>` : ''}</div>`).join('');

    const [out, inside] = rows;
    $('#substitutionRows').innerHTML = [
      [out, result.areaOut, result.tubeAreaOut, input.pressureOut, input.tubeLengthOut],
      [inside, result.areaIn, result.tubeAreaIn, input.pressureIn, input.tubeLengthIn],
    ].map(([[label, stroke, active], area, tubeArea, pressure, length]) => `<div class="sub-row ${active ? '' : 'off'}"><b>${label}측 ${active ? `${amount(stroke.total)} L (ANR)` : '공급 제외'}</b>A ${factor(area)} × L ${factor(input.stroke)} × (${factor(pressure)} + 0.1) / 0.1 × 10⁻⁶ × ${factor(result.temperatureFactor)} = 실린더 ${amount(stroke.cylinder)} L<br>a ${factor(tubeArea)} × ℓ ${factor(length)} × ${factor(pressure)} / 0.1 × 10⁻⁶ × ${factor(result.temperatureFactor)} = 배관 ${amount(stroke.piping)} L${!input.includePiping ? ' (배관 제외)' : ''}</div>`).join('')
      + `<div class="sub-row"><b>분당 합계 ${perMinute(result.perMinuteTotal)} L/min (ANR)</b>1왕복 ${amount(result.perCycle)} L × ${factor(input.cyclesPerMinute)} 왕복/분 × ${input.cylinderCount}개<br><small>화면의 1왕복 표시값은 반올림값이며, 분당 합계는 반올림 전 값으로 계산합니다.</small></div>`;
  } catch (error) {
    $('#formError').textContent = error.message;
    $('#formError').hidden = false;
    ['#perCycle', '#perMinuteEach', '#perMinuteTotal'].forEach(selector => { $(selector).textContent = '—'; });
    $('#totalHint').textContent = '입력값을 수정하면 다시 계산합니다.';
    $('#strokeBreakdown').replaceChildren();
    $('#substitutionRows').replaceChildren();
  }
}

form.addEventListener('input', render);
form.addEventListener('change', render);
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', () => setTimeout(render, 0));
$('#exampleButton').addEventListener('click', () => {
  form.reset();
  Object.entries(sample).forEach(([key, value]) => {
    if (key === 'mode') form.querySelector(`[name="mode"][value="${value}"]`).checked = true;
    else if (key === 'includePiping') form.elements.includePiping.checked = value;
    else form.elements[key].value = key.startsWith('tubeLength') ? value / 1000 : value;
  });
  render();
});

installHelp();
renderExample();
render();
