/* OMRON E32 Fiber Sensor integration v0.2
 * - 모든 화이버 선택 항목에 기존 Jcalculator ? Hover/Tap 설명 팝업 적용
 * - 화이버 앰프를 '필수 구성품'으로 정확한 형번까지 선택
 * - 최종 결과를 E32 + 화이버 앰프 조합으로 명확히 표시
 */
(() => {
  const FD=window.OMRON_FIBER_DATA;
  if(!FD||!Array.isArray(FD.products))return;
  const products=FD.products,amps=FD.amplifiers||[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groupCodeByName=Object.fromEntries((FD.groups||[]).map(g=>[g.name,g.code]));
  const groupNameByCode=Object.fromEntries((FD.groups||[]).map(g=>[g.code,g.name]));
  const defaults=()=>({group:null,subcategory:null,method:null,length:null,search:'',ampSeries:'E3NX-FA',ampOutput:null,ampConnection:null,ampModel:null,ampWarning:false});

  const GROUP_DESC={
    standard:'일반적인 나사·원주형 설치',space:'헤드 공간이 매우 좁거나 물체 가까이 설치',beam:'작은 물체·장거리·좁은 시야·배경 억제',
    transparent:'필름·글래스 등 투명체 검출',environment:'오일·약품·반복 굴곡·고온 환경',application:'영역·액면·진공·FPD/반도체 전용'
  };
  const GROUP_HELP={standard:'fiber_group_standard',space:'fiber_group_space',beam:'fiber_group_beam',transparent:'fiber_group_transparent',environment:'fiber_group_environment',application:'fiber_group_application'};
  const SUB_DESC={
    '나사형':'표준 나사 홀 + 너트 고정','원주형':'세트 스크류 고정이 가능한 원통형','플랫형':'폭·높이가 제한된 공간에 직접 설치','슬리브형':'검출 물체 가까이 작은 헤드를 배치',
    '소스폿 반사':'미소 물체를 작은 스폿으로 검출','하이 파워':'장거리·먼지 환경에서 광량 확보','협시계':'틈새를 통과하도록 빛 확산 억제','배경 커트':'배경 간섭 없이 정해진 범위 검출',
    '회귀 반사형':'투명체를 왕복 광로로 안정 검출','한정 반사형':'정반사 글래스 검출','내약품 / 내유':'오일·약품 노출 환경','내굴곡 / 내단선':'가동부 반복 굴곡·충격','내열':'고온 환경',
    '에어리어 빔':'선이 아닌 영역으로 검출','액면 레벨':'파이프/접액 액체 검출','내진공':'고진공 장비','FPD / 반도체 / 태양전지':'글래스·웨이퍼 전용'
  };
  const SUB_HELP={
    '나사형':'fiber_sub_screw','원주형':'fiber_sub_cyl','플랫형':'fiber_sub_flat','슬리브형':'fiber_sub_sleeve',
    '소스폿 반사':'fiber_sub_smallspot','하이 파워':'fiber_sub_highpower','협시계':'fiber_sub_narrow','배경 커트':'fiber_sub_bgs',
    '회귀 반사형':'fiber_sub_retro','한정 반사형':'fiber_sub_limited','내약품 / 내유':'fiber_sub_oilchem','내굴곡 / 내단선':'fiber_sub_flex','내열':'fiber_sub_heat',
    '에어리어 빔':'fiber_sub_area','액면 레벨':'fiber_sub_liquid','내진공':'fiber_sub_vacuum','FPD / 반도체 / 태양전지':'fiber_sub_fpd'
  };

  function fiberState(){ state.fiber=state.fiber||defaults(); return state.fiber; }
  function resetFiber(){ state.fiber=defaults(); }
  function info(key){return `<span class="info term fiber-info" data-term="${esc(key)}" onclick="event.preventDefault();event.stopPropagation();if(typeof showTerm==='function')showTerm('${esc(key)}',this)">?</span>`}

  function addTerms(){
    try{
      const add=(key,title,img,text,foot)=>terms[key]={title,img,text,foot,shapeImage:!!img};
      add('fiber','화이버센서','assets/fiber/evidence/p005.jpg','검출 위치에는 작은 E32 화이버 유니트를 두고, 제어반 쪽에는 별도 화이버 앰프를 연결하는 센서입니다. 작은 헤드가 필요하거나 일반 광전센서가 견디기 어려운 고온·진공·약품 환경에서 주로 검토합니다. 최종 선정은 E32만 고르는 것이 아니라 E32 + 앰프 형번을 함께 확정해야 합니다.','OMRON Fiber Sensor Best Selection 2017 · 선정 가이드 p.4~5');
      add('fiber_unit','화이버 유니트 E32','assets/fiber/evidence/p005.jpg','실제 검출 위치에 설치하는 광학 헤드와 화이버 케이블입니다. 설치 형상·검출 방식·환경 대응은 E32 형번으로 결정합니다. E32만으로 PLC 출력은 만들 수 없으며 화이버 앰프가 반드시 필요합니다.','OMRON 공식 카탈로그 · E32 화이버 유니트');
      add('fiber_amp','화이버 앰프 · 필수','assets/fiber/evidence/p064.jpg','E32 화이버 유니트에 빛을 보내고 받아서 PLC가 사용할 전기 출력으로 변환하는 본체입니다. 화이버센서의 필수 구성품입니다. NPN/PNP와 접속 방식까지 맞는 정확한 앰프 형번을 선택해야 최종 선정이 끝납니다.','OMRON 공식 카탈로그 · E3NX-FA p.64 / E3X-HD p.78');
      add('fiber_cut','프리 커트','assets/fiber/evidence/p006.jpg','화이버 케이블을 현장에서 필요한 길이로 잘라 사용할 수 있다는 뜻입니다. “커트 불가” 형번은 임의로 자르면 성능을 보장할 수 없으므로 카탈로그 지시에 따라 사용합니다.','OMRON 공식 카탈로그 · 각 E32 사양표');
      add('fiber_length','화이버 길이','assets/fiber/evidence/p006.jpg','E32 형번 끝의 1M, 2M, 5M 등은 화이버 케이블 길이입니다. 설치 위치에서 앰프까지 실제 배선 경로를 기준으로 선택합니다. 너무 짧으면 설치가 불가능하고, 불필요하게 긴 케이블은 배선 정리가 어려워집니다.','OMRON 공식 카탈로그 · 각 E32 형번');
      add('fiber_detection_method','검출 방식 / 특징','assets/fiber/evidence/p005.jpg','같은 화이버센서라도 투과형·반사형·배경 커트·액면·내열처럼 목적이 다릅니다. “빛을 어떻게 쓰는가”와 “어떤 환경을 견디는가”를 함께 나타내는 항목이므로 실제 워크와 설치 구조에 맞는 항목을 선택합니다.','OMRON 공식 카탈로그 · 선정 가이드 p.4~5');
      add('fiber_search','형번 / 키워드 검색','assets/fiber/evidence/p098.jpg','정확한 E32 형번을 알면 형번으로 바로 찾고, 모르면 “슬리브”, “내열”, “액면”, “배경 커트” 같은 사용 조건 키워드로 후보를 줄일 수 있습니다.','OMRON 공식 카탈로그 · 형식 INDEX p.98');

      add('fiber_group_standard','표준 설치','assets/fiber/evidence/p005.jpg','일반적인 기계 브라켓에 나사 또는 원주형 헤드를 고정하는 기본 분류입니다. 특별한 공간 제약이나 환경 조건이 없다면 여기부터 확인하면 됩니다.','OMRON 공식 카탈로그 · 선정 가이드 p.5');
      add('fiber_group_space','공간 절감','assets/fiber/evidence/p005.jpg','검출 위치가 좁아 일반 센서 본체를 둘 수 없을 때 사용하는 소형 헤드 분류입니다. 플랫형은 얇게 붙이고, 슬리브형은 아주 작은 선단을 워크 가까이에 배치할 때 유리합니다.','OMRON 공식 카탈로그 · 선정 가이드 p.5');
      add('fiber_group_beam','빔 강화','assets/fiber/evidence/p005.jpg','작은 물체, 긴 거리, 좁은 틈, 가까운 배경처럼 빛의 크기·세기·퍼짐을 제어해야 할 때 선택합니다. 무엇이 문제인지에 따라 소스폿/하이 파워/협시계/배경 커트를 고릅니다.','OMRON 공식 카탈로그 · 선정 가이드 p.5');
      add('fiber_group_transparent','투명체 검출','assets/fiber/evidence/p034.jpg','필름·투명 용기·글래스처럼 일반 반사형에서 수광량 변화가 작아 검출이 불안정한 대상용입니다. 회귀 반사형은 빛을 왕복 통과시키고, 한정 반사형은 정반사 글래스 검출에 사용합니다.','OMRON 공식 카탈로그 · p.34~36');
      add('fiber_group_environment','내환경','assets/fiber/evidence/p038.jpg','오일·약품·반복 굴곡·단선 위험·고온처럼 일반 플라스틱 화이버가 버티기 어려운 환경에서 선택합니다. 환경 종류를 정확히 고르는 것이 우선입니다.','OMRON 공식 카탈로그 · p.38~46');
      add('fiber_group_application','전용 어플리케이션','assets/fiber/evidence/p048.jpg','일반 유무 검출이 아니라 영역 검출, 액면, 진공, FPD/반도체/태양전지 공정처럼 특정 용도에 맞춘 전용 화이버입니다. 해당 용도와 일치할 때만 우선 선택합니다.','OMRON 공식 카탈로그 · p.48~56');

      add('fiber_sub_screw','나사형','assets/fiber/evidence/p006.jpg','가장 표준적인 설치 방식입니다. 브라켓에 나사 홀을 가공하고 너트로 헤드를 고정합니다. 설치 공간이 충분하고 특별한 형상 제약이 없을 때 우선 검토합니다.','OMRON 공식 카탈로그 · 나사형 p.6~9');
      add('fiber_sub_cyl','원주형','assets/fiber/evidence/p010.jpg','원통형 헤드를 세트 스크류 등으로 고정하는 방식입니다. 나사산이 필요 없고 원통 홀에 끼워 위치를 조정하기 쉬운 구조가 필요할 때 검토합니다.','OMRON 공식 카탈로그 · 원주형 p.10~13');
      add('fiber_sub_flat','플랫형','assets/fiber/evidence/p014.jpg','헤드 높이와 폭을 줄여 벽면이나 좁은 공간에 직접 붙이는 형상입니다. 나사형 헤드를 넣을 깊이가 부족할 때 유리합니다.','OMRON 공식 카탈로그 · 플랫형 p.14~15');
      add('fiber_sub_sleeve','슬리브형','assets/fiber/evidence/p016.jpg','아주 가는 금속 슬리브 선단만 워크 가까이에 배치하는 형상입니다. 좁은 틈 안쪽이나 작은 부품 근처처럼 헤드 공간이 거의 없을 때 사용합니다.','OMRON 공식 카탈로그 · 슬리브형 p.16~19');
      add('fiber_sub_smallspot','소스폿 반사','assets/fiber/evidence/p020.jpg','빛을 작은 점으로 모아 작은 워크를 구분하는 반사형입니다. 미소 부품이나 좁은 위치만 보고 싶을 때 선택합니다. 스폿 크기와 작업 거리는 반드시 해당 형번 표를 확인합니다.','OMRON 공식 카탈로그 · 소스폿 p.20~23');
      add('fiber_sub_highpower','하이 파워','assets/fiber/evidence/p024.jpg','더 많은 광량이 필요한 장거리 설치, 큰 물체, 먼지가 있는 환경에서 검토합니다. 단순히 “강한 센서”가 아니라 필요한 거리와 렌즈 조합을 공식표에서 함께 확인해야 합니다.','OMRON 공식 카탈로그 · 하이 파워 p.24~29');
      add('fiber_sub_narrow','협시계','assets/fiber/evidence/p030.jpg','빛이 옆으로 퍼지는 것을 줄여 좁은 틈을 통과시키거나 주변 물체의 간섭을 줄이는 타입입니다. 가까운 구조물 사이로 빛을 통과시켜야 할 때 선택합니다.','OMRON 공식 카탈로그 · 협시계 p.30~31');
      add('fiber_sub_bgs','배경 커트','assets/fiber/evidence/p032.jpg','검출 대상 뒤에 배경이 가까이 있어 일반 반사형이 배경까지 검출할 수 있을 때 사용합니다. 정해진 검출 범위 안의 물체만 보도록 설계된 타입입니다.','OMRON 공식 카탈로그 · 배경 커트 p.32~33');
      add('fiber_sub_retro','회귀 반사형 · 투명체','assets/fiber/evidence/p034.jpg','센서와 반사판 사이의 빛을 투명체가 왕복으로 두 번 통과하게 해 작은 감광 변화도 크게 만듭니다. 필름·투명체 검출에 유리하지만 반사판 설치 공간이 필요합니다.','OMRON 공식 카탈로그 · 회귀 반사형 p.34~35');
      add('fiber_sub_limited','한정 반사형 · 글래스','assets/fiber/evidence/p036.jpg','정반사되는 글래스 표면을 정해진 광학 위치에서 안정적으로 검출하도록 만든 타입입니다. 글래스 각도와 설치 거리가 중요합니다.','OMRON 공식 카탈로그 · 한정 반사형 p.36~37');
      add('fiber_sub_oilchem','내약품 / 내유','assets/fiber/evidence/p038.jpg','절삭유·오일·약품이 닿는 환경에서 재질 열화가 걱정될 때 선택합니다. 어떤 액체든 모두 견디는 것은 아니므로 실제 사용액과 재질 적합성을 확인합니다.','OMRON 공식 카탈로그 · 내약품/내유 p.38~39');
      add('fiber_sub_flex','내굴곡 / 내단선','assets/fiber/evidence/p040.jpg','케이블이 반복해서 움직이거나 걸림·충격으로 단선될 위험이 있는 가동부용입니다. 고정 배선이라면 일반형으로 충분할 수 있고, 케이블 베어 등 반복 굴곡이면 이 타입을 우선 검토합니다.','OMRON 공식 카탈로그 · 내굴곡/내단선 p.40~43');
      add('fiber_sub_heat','내열','assets/fiber/evidence/p044.jpg','고온 챔버·가열부 근처처럼 일반 플라스틱 화이버의 온도 한계를 넘는 환경용입니다. 형번마다 허용 온도가 다르므로 “내열”만 보고 고르지 말고 실제 최고 온도를 확인합니다.','OMRON 공식 카탈로그 · 내열 p.44~47');
      add('fiber_sub_area','에어리어 빔','assets/fiber/evidence/p048.jpg','한 점이 아니라 일정 폭의 영역으로 워크를 검출합니다. 워크 통과 위치가 흔들리거나 낙하 위치 편차가 있어 점 검출로 놓칠 수 있을 때 사용합니다.','OMRON 공식 카탈로그 · 에어리어 빔 p.48~49');
      add('fiber_sub_liquid','액면 레벨','assets/fiber/evidence/p050.jpg','파이프 바깥 또는 접액 구조로 액체의 유무·액면을 검출하는 전용 타입입니다. 파이프 재질·직경·액체 특성에 맞는 형번을 사용해야 합니다.','OMRON 공식 카탈로그 · 액면 레벨 p.50~51');
      add('fiber_sub_vacuum','내진공','assets/fiber/evidence/p052.jpg','진공 챔버 내부처럼 일반 케이블 재질의 아웃가스나 진공 적합성이 문제가 되는 장비용입니다. 카탈로그는 고진공 환경 대응 타입을 별도 분류합니다.','OMRON 공식 카탈로그 · 내진공 p.52~53');
      add('fiber_sub_fpd','FPD / 반도체 / 태양전지','assets/fiber/evidence/p005.jpg','글래스 기판·웨이퍼 같은 공정물을 검출하도록 특화된 전용 형상입니다. 일반 유무 검출보다 공정 대상과 설치 방향이 명확할 때 선택합니다.','OMRON 공식 카탈로그 · 전용 어플리케이션 p.54~57');

      add('fiber_amp_e3nx','E3NX-FA · 스마트 화이버 앰프','assets/fiber/evidence/p064.jpg','스마트 튜닝과 넓은 광량 조정 범위를 제공하는 E32용 화이버 앰프입니다. 신규 설계에서 특별한 기존 설비 제약이 없으면 먼저 비교하기 좋은 시리즈입니다. 최종 형번은 NPN/PNP, 접속 방식, 고기능/2출력 여부로 결정합니다.','OMRON 공식 카탈로그 · E3NX-FA p.64~69');
      add('fiber_amp_e3xhd','E3X-HD · 화이버 앰프','assets/fiber/evidence/p078.jpg','E32와 조합 가능한 화이버 앰프 시리즈입니다. 기존 E3X-HD 설비 호환이나 해당 기능이 필요한 경우 선택합니다. 출력과 접속 형번을 반드시 맞춰야 합니다.','OMRON 공식 카탈로그 · E3X-HD p.78~81');
      add('fiber_amp_output','앰프 출력 · NPN / PNP','assets/fiber/evidence/p064.jpg','센서가 PLC 입력에 보내는 출력 방식입니다. NPN과 PNP 중 어느 것이 더 좋은 것이 아니라 PLC 입력 공통(COM) 방식과 맞아야 합니다. 모르면 PLC 입력 모듈 사양을 먼저 확인하세요.','OMRON 공식 카탈로그 · 앰프 형식표');
      add('fiber_amp_network','네트워크용 앰프','assets/fiber/evidence/p064.jpg','일반 NPN/PNP 단독 출력 대신 센서 통신 유니트와 연결하는 타입입니다. E3NX-FA0 또는 E3X-HD0처럼 통신 유니트용 커넥터 형번을 사용하며, 별도 센서 통신 유니트가 필요합니다.','OMRON 공식 카탈로그 · E3NX-FA/E3X-HD 통신 유니트용');
      add('fiber_amp_conn_cable','코드 인출 2m','assets/fiber/amplifiers/e3nx_cable.jpg','앰프 본체에서 2m 케이블이 바로 나오는 방식입니다. 별도 배선 절감 커넥터가 필요하지 않아 단순하지만 교체 시 케이블까지 함께 배선해야 합니다.','OMRON 공식 카탈로그 · 앰프 형식표');
      add('fiber_amp_conn_wiring','배선 절감 커넥터','assets/fiber/amplifiers/e3nx_wiring.jpg','여러 앰프를 나란히 설치할 때 배선을 줄이기 위한 커넥터 방식입니다. 단품 코드 인출형과 설치·배선 방식이 다르므로 제어반 구성에 맞춰 선택합니다.','OMRON 공식 카탈로그 · 앰프 형식표');
      add('fiber_amp_conn_m8','M8 커넥터','assets/fiber/amplifiers/e3nx_m8.jpg','앰프에 M8 커넥터로 배선하는 방식입니다. 유지보수와 분리가 편하지만 커넥터와 케이블 체결 공간을 확보해야 합니다.','OMRON 공식 카탈로그 · 앰프 형식표');
      add('fiber_amp_conn_network','센서 통신 유니트용 커넥터','assets/fiber/amplifiers/e3nx_network.jpg','앰프를 E3NW/E3X 통신 유니트에 연결하기 위한 전용 타입입니다. 일반 단독 NPN/PNP 배선용이 아니므로 네트워크 구성일 때만 선택합니다.','OMRON 공식 카탈로그 · 앰프/통신 유니트');
      add('fiber_amp_exact','최종 앰프 형번','assets/fiber/evidence/p064.jpg','화이버센서 최종 선정에는 E32 형번과 정확한 앰프 형번이 둘 다 필요합니다. 시리즈만 선택하고 끝내지 말고 NPN/PNP, 접속 방식, 표준/고기능/2출력 여부를 확인해 앰프 형번 1개를 선택합니다.','OMRON 공식 카탈로그 · E3NX-FA p.64 / E3X-HD p.78');
    }catch(e){}
  }

  function methodHelpKey(v){
    const sub=Object.keys(SUB_HELP).find(s=>String(v).includes(s.replace('형',''))||String(v)===s);
    return sub?SUB_HELP[sub]:'fiber_detection_method';
  }
  function ampSeriesHelpKey(s){return s==='E3X-HD'?'fiber_amp_e3xhd':'fiber_amp_e3nx'}
  function ampOutputHelpKey(v){return v==='NPN'?'npn':v==='PNP'?'pnp':'fiber_amp_network'}
  function ampConnHelpKey(v){const t=String(v||'');if(t.includes('코드 인출'))return'fiber_amp_conn_cable';if(t.includes('배선 절감'))return'fiber_amp_conn_wiring';if(t.includes('M8'))return'fiber_amp_conn_m8';return'fiber_amp_conn_network'}
  function ampImage(a){
    const pre=a.series==='E3X-HD'?'e3x':'e3nx';const c=String(a.connection||'');
    if(c.includes('배선 절감'))return`assets/fiber/amplifiers/${pre}_wiring.jpg`;
    if(c.includes('M8'))return`assets/fiber/amplifiers/${pre}_m8.jpg`;
    if(c.includes('통신'))return`assets/fiber/amplifiers/${pre}_network.jpg`;
    return`assets/fiber/amplifiers/${pre}_cable.jpg`;
  }
  function selectedAmp(){const m=fiberState().ampModel;return amps.find(a=>a.model===m)||null}

  function installSidebar(){
    const side=document.querySelector('.sidebar'); if(!side||document.getElementById('fiberExpertSection'))return;
    const box=document.createElement('div');box.id='fiberExpertSection';box.className='filter-section fiber-expert';
    box.innerHTML=`<div class="filter-title">화이버센서 · 실무자용 ${info('fiber')}</div>
      <div class="fiber-sidebar-count">E32 화이버 유니트 <b>${products.length}개</b></div>
      <label class="check"><input id="fiberSidebarEnable" type="checkbox"> 화이버센서 E32만 보기 ${info('fiber_unit')}</label>
      <div class="fiber-field"><label>분류 ${info('fiber_detection_method')}</label><select id="fiberSideGroup"><option value="">전체 분류</option>${(FD.groups||[]).map(g=>`<option value="${esc(g.code)}">${esc(g.name)}</option>`).join('')}</select></div>
      <div class="fiber-field"><label>검출 방식 / 특징 ${info('fiber_detection_method')}</label><select id="fiberSideMethod"><option value="">전체</option>${[...new Set(products.map(p=>p.classification.detectionMethod))].sort().map(v=>`<option>${esc(v)}</option>`).join('')}</select></div>
      <div class="fiber-field"><label>형번 / 키워드 ${info('fiber_search')}</label><input id="fiberSideSearch" placeholder="예: E32-T11N, 내열, 슬리브"></div>`;
    side.appendChild(box);
    box.querySelector('#fiberSidebarEnable').addEventListener('change',e=>{if(e.target.checked)selectFiberSensorType()});
    box.querySelector('#fiberSideGroup').addEventListener('change',e=>{const f=fiberState();f.group=e.target.value||null;f.subcategory=null;state.step=6;render()});
    box.querySelector('#fiberSideMethod').addEventListener('change',e=>{fiberState().method=e.target.value||null;state.step=6;render()});
    box.querySelector('#fiberSideSearch').addEventListener('input',e=>{fiberState().search=e.target.value;state.step=6;render()});
  }
  function setSidebarMode(on){
    const side=document.querySelector('.sidebar');if(!side)return;const fs=document.getElementById('fiberExpertSection');
    side.querySelectorAll('.filter-section').forEach(x=>{if(x===fs)return;if(on)x.dataset.fiberWasDisplay=x.style.display||'';x.style.display=on?'none':(x.dataset.fiberWasDisplay||'')});
    if(fs)fs.classList.toggle('show',on);const count=document.getElementById('sidebarCount');if(count&&on)count.innerHTML=`현재 화이버 조건 <b>${filtered().length}개</b> / E32 ${products.length}개`;
  }
  function renderFiberChips(){
    const f=fiberState(),bar=document.getElementById('conditionBar');if(!bar)return;bar.querySelectorAll('.chip.dynamic').forEach(x=>x.remove());const empty=document.getElementById('emptyCond');
    const vals=['화이버센서'];if(f.group)vals.push(groupNameByCode[f.group]||f.group);if(f.subcategory)vals.push(f.subcategory);if(f.method)vals.push(f.method);if(f.length)vals.push(f.length);if(f.ampSeries)vals.push(f.ampSeries);if(f.ampOutput)vals.push(f.ampOutput);if(f.ampConnection)vals.push(f.ampConnection);if(f.ampModel)vals.push(f.ampModel);if(f.search)vals.push(f.search);
    if(empty)empty.style.display='none';vals.forEach(v=>{const c=document.createElement('span');c.className='chip dynamic';c.textContent=v;bar.insertBefore(c,bar.querySelector('.clear'))});
  }
  try{const oldChips=chips;chips=function(){if(state.sensorType==='fiber')renderFiberChips();else oldChips()}}catch(e){}

  window.selectFiberSensorType=function(){
    resetFiber();state.sensorType='fiber';state.purpose='presence';state.target=null;state.targetDetails=[];state.photoMethod=null;state.proxSize=null;state.proxShield=null;state.forkShape=null;state.through=null;state.reflector=null;state.background=null;state.distance='';state.shape=null;state.output=null;state.operation=null;state.connection=[];state.step=2;
    document.querySelectorAll('[data-filter]').forEach(el=>{if(el.type==='checkbox'||el.type==='radio')el.checked=false});render();window.scrollTo({top:0,behavior:'smooth'});
  };
  function addFiberCard(){
    const grid=document.querySelector('#panel .sensor-type-cards');if(!grid||grid.querySelector('.sensor-type-card.fiber'))return;const b=document.createElement('button');b.className='sensor-type-card fiber'+(state.sensorType==='fiber'?' selected':'');b.type='button';b.onclick=selectFiberSensorType;
    b.innerHTML=`<div class="sensor-type-icon">≋</div><div class="sensor-type-copy"><div class="sensor-type-title">화이버센서 ${info('fiber')}</div><p>작은 E32 검출 헤드와 별도 앰프를 조합해 좁은 공간·미소 물체·특수 환경을 검출합니다.</p><div class="sensor-type-series">E32 + E3NX-FA / E3X-HD</div><div class="sensor-type-next">설치·용도 → 화이버 TYPE → 필수 앰프 형번 → 최종 조합</div></div>`;grid.appendChild(b);
    const guide=document.querySelector('#panel .guide');if(guide&&!guide.querySelector('.fiber-guide-line'))guide.insertAdjacentHTML('beforeend','<p class="fiber-guide-line"><b>화이버센서</b>: E32 화이버 유니트와 화이버 앰프를 반드시 함께 선정합니다.</p>');
  }

  function groupCounts(){const c={};products.forEach(p=>{const k=groupCodeByName[p.classification.group]||p.classification.group;c[k]=(c[k]||0)+1});return c}
  function subCounts(groupCode){const name=groupNameByCode[groupCode],c={};products.filter(p=>!name||p.classification.group===name).forEach(p=>c[p.classification.subcategory]=(c[p.classification.subcategory]||0)+1);return c}
  function filtered(){
    const f=fiberState(),gname=groupNameByCode[f.group],q=(f.search||'').trim().toLowerCase();return products.filter(p=>{
      if(gname&&p.classification.group!==gname)return false;if(f.subcategory&&p.classification.subcategory!==f.subcategory)return false;if(f.method&&p.classification.detectionMethod!==f.method)return false;if(f.length&&p.specs.fiberLength!==f.length)return false;
      if(q){const s=[p.model,p.classification.group,p.classification.subcategory,p.classification.detectionMethod,p.specs.fiberLength,p.specs.cutCapability,...(p.applicationTags||[])].join(' ').toLowerCase();if(!s.includes(q))return false}return true;
    }).sort((a,b)=>a.evidence.catalogPage-b.evidence.catalogPage||a.model.localeCompare(b.model));
  }
  function ampCandidates(){const f=fiberState();let a=amps.filter(x=>x.series===f.ampSeries);if(f.ampOutput)a=a.filter(x=>x.outputType===f.ampOutput);if(f.ampConnection)a=a.filter(x=>x.connection===f.ampConnection);return a}

  function fiberTree(){const counts=groupCounts();return `<div class="fiber-tree"><strong>TYPE Catalog · 직접 탐색 ${info('fiber_unit')}</strong>${(FD.groups||[]).filter(g=>g.code!=='new').map(g=>{const subs=subCounts(g.code);return `<details><summary>${esc(g.name)} ${info(GROUP_HELP[g.code]||'fiber_detection_method')} · ${counts[g.code]||0}개</summary>${g.subs.map(s=>`<button type="button" onclick="setFiberSub('${esc(g.code)}','${esc(s)}')">▶ ${esc(s)} ${info(SUB_HELP[s]||'fiber_detection_method')} (${subs[s]||0})</button>`).join('')}</details>`}).join('')}</div>`}
  window.setFiberGroup=function(code){const f=fiberState();f.group=code||null;f.subcategory=null;f.method=null;render()};
  window.setFiberSub=function(group,sub){const f=fiberState();f.group=group||null;f.subcategory=sub||null;f.method=null;state.step=4;render()};
  window.setFiberMethod=function(v){fiberState().method=v||null;render()};
  window.setFiberLength=function(v){fiberState().length=v||null;render()};
  window.setFiberSearch=function(v,doRender=true){fiberState().search=v||'';if(doRender)render();else{const n=document.getElementById('fiberLiveCount');if(n)n.textContent=filtered().length+'개 후보'}};
  window.setFiberAmpSeries=function(v){const f=fiberState();f.ampSeries=v;f.ampOutput=null;f.ampConnection=null;f.ampModel=null;f.ampWarning=false;render()};
  window.setFiberAmpOutput=function(v){const f=fiberState();f.ampOutput=v||null;f.ampModel=null;f.ampWarning=false;render()};
  window.setFiberAmpConnection=function(v){const f=fiberState();f.ampConnection=v||null;f.ampModel=null;f.ampWarning=false;render()};
  window.setFiberAmpModel=function(model){const f=fiberState(),a=amps.find(x=>x.model===model);if(!a)return;f.ampSeries=a.series;f.ampOutput=a.outputType;f.ampConnection=a.connection;f.ampModel=a.model;f.ampWarning=false;render()};

  function renderStep2(){
    const f=fiberState(),cnt=groupCounts();document.getElementById('panel').innerHTML=`<div class="panel-grid"><div class="question"><h2>화이버센서를 어디에 사용합니까? ${info('fiber')}</h2><div class="sub">전문 TYPE명보다 실제 설치·검출 목적을 먼저 선택합니다. 모든 선택지의 <b>?</b>에 마우스를 올리면 무엇인지, 언제 선택하는지, 주의할 점을 확인할 수 있습니다.</div>
      <div class="fiber-grid">${(FD.groups||[]).filter(g=>g.code!=='new').map(g=>`<button class="fiber-choice ${f.group===g.code?'selected':''}" onclick="setFiberGroup('${g.code}')"><b>${esc(g.name)} ${info(GROUP_HELP[g.code]||'fiber_detection_method')}</b><small>${esc(GROUP_DESC[g.code]||'카탈로그 분류')}</small><span class="fiber-count">${cnt[g.code]||0}개</span></button>`).join('')}</div>${fiberTree()}</div>
      <aside class="guide"><h4>선정 순서 ${info('fiber_unit')}</h4><p><b>E32 화이버 유니트</b>를 설치·검출 조건으로 먼저 좁힌 뒤 <b>화이버 앰프</b>의 정확한 형번을 선택합니다.</p><div class="mini"><strong>필수</strong><p>E32만 선택하면 최종 선정이 아닙니다. 마지막 화면에는 <b>E32 + 앰프</b>를 한 조합으로 표시합니다.</p></div></aside></div>`;
  }
  function renderStep3(){
    const f=fiberState(),g=f.group||'standard',gobj=(FD.groups||[]).find(x=>x.code===g),subs=gobj?.subs||[],cnt=subCounts(g);document.getElementById('panel').innerHTML=`<div class="panel-grid"><div class="question"><h2>${esc(gobj?.name||'화이버')}에서 어떤 형태가 맞습니까? ${info(GROUP_HELP[g]||'fiber_detection_method')}</h2><div class="sub">형상 차이는 설치 공간과 검출 안정성에 직접 영향을 줍니다. 각 선택지의 ? 설명을 보고 판단하세요.</div>
      <div class="fiber-grid">${subs.map(s=>`<button class="fiber-choice ${f.subcategory===s?'selected':''}" onclick="setFiberSub('${esc(g)}','${esc(s)}')"><b>${esc(s)} ${info(SUB_HELP[s]||'fiber_detection_method')}</b><small>${esc(SUB_DESC[s]||'OMRON 카탈로그 분류')}</small><span class="fiber-count">${cnt[s]||0}개</span></button>`).join('')}</div></div>
      <aside class="guide"><h4>현재 후보</h4><p>${filtered().length}개 E32 형번이 현재 분류와 일치합니다.</p><p>형번을 이미 알고 있으면 상단 통합 검색에서 E32-…를 바로 입력할 수 있습니다.</p></aside></div>`;
  }
  function renderStep4(){
    const f=fiberState(),base=filtered(),methods=[...new Set(base.map(p=>p.classification.detectionMethod))].sort(),lengths=[...new Set(base.map(p=>p.specs.fiberLength))].sort();document.getElementById('panel').innerHTML=`<div class="panel-grid"><div class="question"><h2>검출 방식과 화이버 조건을 좁힙니다. ${info('fiber_detection_method')}</h2><div class="sub">검출 거리 숫자는 앰프 시리즈와 동작 모드에 따라 달라지므로, 여기서는 E32의 구조·용도·길이를 먼저 확정합니다.</div>
      <div class="fiber-field"><label>검출 방식 / 특징 ${info('fiber_detection_method')}</label><div class="fiber-methods"><button class="fiber-pill ${!f.method?'selected':''}" onclick="setFiberMethod('')">전체</button>${methods.map(v=>`<button class="fiber-pill ${f.method===v?'selected':''}" onclick="setFiberMethod('${esc(v)}')">${esc(v)} ${info(methodHelpKey(v))}</button>`).join('')}</div></div>
      <div class="fiber-field"><label>화이버 길이 ${info('fiber_length')}</label><div class="fiber-pills"><button class="fiber-pill ${!f.length?'selected':''}" onclick="setFiberLength('')">전체</button>${lengths.map(v=>`<button class="fiber-pill ${f.length===v?'selected':''}" onclick="setFiberLength('${esc(v)}')">${esc(v)} ${info('fiber_length')}</button>`).join('')}</div></div>
      <div class="fiber-field"><label>형번 / 키워드 ${info('fiber_search')}</label><input value="${esc(f.search)}" oninput="setFiberSearch(this.value,false)" placeholder="예: E32-T11N, 내열, 프리 커트"></div>
      <div class="fiber-route-card"><strong id="fiberLiveCount">${filtered().length}개 후보</strong><div>정확한 검출 거리는 최종 E32 형번의 공식표에서 선택 앰프와 GIGA·HS·ST·SHS 모드를 함께 확인합니다.</div></div></div>
      <aside class="guide"><h4>프리 커트 ${info('fiber_cut')}</h4><p>형번별 프리 커트/커트 불가가 다릅니다. 공식표에서 확인된 상태만 카드에 표시합니다.</p></aside></div>`;
  }
  function renderStep5(){
    const f=fiberState(),series=FD.amplifierSeries||{},ac=ampCandidates(),sel=selectedAmp();const outputs=[...new Set(amps.filter(a=>a.series===f.ampSeries).map(a=>a.outputType))],conns=[...new Set(amps.filter(a=>a.series===f.ampSeries).map(a=>a.connection))];
    document.getElementById('panel').innerHTML=`<div class="panel-grid"><div class="question"><h2>필수 화이버 앰프를 선택합니다. ${info('fiber_amp')}</h2><div class="sub">여기서 <b>정확한 앰프 형번 1개</b>를 선택해야 최종 결과로 넘어갑니다. E32 + 앰프가 한 세트입니다.</div>
      <div class="fiber-grid">${Object.entries(series).map(([k,v])=>`<button class="fiber-amp-card ${f.ampSeries===k?'selected':''}" onclick="setFiberAmpSeries('${k}')"><b>${k} · ${esc(v.name)} ${info(ampSeriesHelpKey(k))}</b><p>전원 ${esc(v.supplyVoltage)}<br>SHS ${esc(v.responseModes.SHS)} · HS ${esc(v.responseModes.HS)} · ST ${esc(v.responseModes.ST)} · GIGA ${esc(v.responseModes.GIGA)}</p><span class="fiber-count">카탈로그 p.${v.sourcePage}</span></button>`).join('')}</div>
      <div class="fiber-field"><label>출력 ${info('fiber_amp_output')}</label><div class="fiber-pills"><button class="fiber-pill ${!f.ampOutput?'selected':''}" onclick="setFiberAmpOutput('')">아직 모름 / 전체 ${info('fiber_amp_output')}</button>${outputs.map(v=>`<button class="fiber-pill ${f.ampOutput===v?'selected':''}" onclick="setFiberAmpOutput('${esc(v)}')">${esc(v)} ${info(ampOutputHelpKey(v))}</button>`).join('')}</div></div>
      <div class="fiber-field"><label>접속 방식 ${info('fiber_amp_exact')}</label><div class="fiber-pills"><button class="fiber-pill ${!f.ampConnection?'selected':''}" onclick="setFiberAmpConnection('')">전체</button>${conns.map(v=>`<button class="fiber-pill ${f.ampConnection===v?'selected':''}" onclick="setFiberAmpConnection('${esc(v)}')">${esc(v)} ${info(ampConnHelpKey(v))}</button>`).join('')}</div></div>
      <div class="fiber-amp-select-head"><div><strong>최종 앰프 형번을 1개 선택하세요. ${info('fiber_amp_exact')}</strong><small>현재 조건에 맞는 앰프 ${ac.length}개</small></div>${sel?`<span class="fiber-selected-amp">✓ ${esc(sel.model)} 선택됨</span>`:''}</div>
      <div class="fiber-amp-model-grid">${ac.map(a=>`<button class="fiber-amp-model ${f.ampModel===a.model?'selected':''}" onclick="setFiberAmpModel('${esc(a.model)}')"><img src="${esc(ampImage(a))}" alt="${esc(a.model)}"><div><b>${esc(a.model)} ${info('fiber_amp_exact')}</b><span>${esc(a.type)} · ${esc(a.outputType)}</span><small>${esc(a.connection)}</small></div>${f.ampModel===a.model?'<i>✓</i>':''}</button>`).join('')||'<div class="result-empty">현재 출력/접속 조건에 맞는 앰프가 없습니다.</div>'}</div>
      ${f.ampWarning&&!sel?'<div class="fiber-amp-warning"><b>앰프 형번 선택이 필요합니다.</b><br>화이버센서는 E32만으로 동작하지 않으므로 위에서 정확한 앰프 형번 1개를 선택한 뒤 다음으로 진행하세요.</div>':''}
      </div><aside class="guide"><h4>왜 앰프가 필수인가? ${info('fiber_amp')}</h4><p>E32는 검출 헤드와 광섬유입니다. PLC에 연결할 전기 출력은 앰프가 만듭니다.</p><div class="mini"><strong>최종 조합 예</strong><p>E32-T11N 2M<br><b>＋</b><br>E3NX-FA11 2M</p></div><p>따라서 마지막 결과 화면에서도 앰프를 별도 부속품이 아니라 <b>필수 본체</b>로 크게 표시합니다.</p></aside></div>`;
  }

  function reason(p){const f=fiberState(),r=[];if(f.group)r.push(`${p.classification.group} 조건`);if(f.subcategory)r.push(`${p.classification.subcategory} 형상`);if(f.method)r.push(`${p.classification.detectionMethod}`);if(f.length)r.push(`화이버 ${p.specs.fiberLength}`);const a=selectedAmp();if(a)r.push(`필수 앰프 ${a.model}`);return r.join(' · ')}
  function renderResults(){
    const rows=filtered(),a=selectedAmp(),f=fiberState();if(!a){f.ampWarning=true;state.step=5;renderStep5();return}
    document.getElementById('panel').innerHTML=`<div class="question"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap"><div><h2>화이버센서 최종 조합 결과</h2><div class="sub">각 후보는 <b>E32 화이버 유니트 + 필수 화이버 앰프 ${esc(a.model)}</b> 조합입니다. 앰프가 빠진 결과는 최종 선정으로 표시하지 않습니다.</div></div><button class="ghost" onclick="state.step=2;render()">조건 다시 선택</button></div>
      <div class="fiber-final-amp-banner"><div class="fiber-final-plus">＋</div><img src="${esc(ampImage(a))}" alt="${esc(a.model)}"><div><span>필수 화이버 앰프</span><b>${esc(a.model)}</b><small>${esc(a.series)} · ${esc(a.type)} · ${esc(a.outputType)} · ${esc(a.connection)}</small></div><button onclick="openFiberAmpEvidence('${esc(a.model)}')">📖 앰프 근거보기</button><button onclick="state.step=5;render()">앰프 변경</button></div>
      <div class="engine-status"><span class="engine-badge live">E32 ${products.length}개 등록</span><span class="engine-badge source">OMRON 한글 카탈로그 2017</span><span class="engine-badge">앰프 확정 · ${esc(a.model)}</span></div>
      ${rows.length?`<div class="fiber-result-grid">${rows.slice(0,30).map((p,i)=>`<article class="fiber-product-card ${i===0?'best':''}">${i===0?'<span class="fiber-best">조건 일치 상위</span>':''}<div class="fiber-combo-label">최종 조합</div><img src="${esc(p.productImage)}" alt="${esc(p.model)}"><div class="maker">OMRON · E32 · ${esc(p.classification.group)}</div><div class="model">${esc(p.model)}</div>
        <div class="fiber-spec-grid"><div><span>검출/특징 ${info(methodHelpKey(p.classification.detectionMethod))}</span><b>${esc(p.classification.detectionMethod)}</b></div><div><span>형상/용도 ${info(SUB_HELP[p.classification.subcategory]||'fiber_detection_method')}</span><b>${esc(p.classification.subcategory)}</b></div><div><span>화이버 길이 ${info('fiber_length')}</span><b>${esc(p.specs.fiberLength)}</b></div><div><span>커트 ${info('fiber_cut')}</span><b>${esc(p.specs.cutCapability)}</b></div></div>
        <div class="fiber-reason">✓ ${esc(reason(p))}</div><div class="fiber-combo-connector">＋</div><div class="fiber-required-amp"><img src="${esc(ampImage(a))}" alt="${esc(a.model)}"><div><span>필수 앰프 ${info('fiber_amp')}</span><b>${esc(a.model)}</b><small>${esc(a.outputType)} · ${esc(a.connection)}</small></div><button onclick="openFiberAmpEvidence('${esc(a.model)}')">근거</button></div>
        <div class="fiber-amp-summary"><b>검출 거리</b><br>${esc(p.specs.sensingDistance)}<br><span>선택 앰프 ${esc(a.series)}의 GIGA/HS/ST/SHS 모드별 값을 공식표에서 최종 확인</span></div>
        <div class="fiber-actions"><button onclick="openFiberDetail('${esc(p.model)}')">상세보기</button><button class="primary" onclick="openFiberEvidence('${esc(p.model)}')">📖 E32 근거보기</button></div></article>`).join('')}</div>`:`<div class="result-empty"><strong>현재 조건에 맞는 E32 형번이 없습니다.</strong><br>분류·방식·길이 조건을 하나씩 완화해 확인하세요.</div>`}
      <div class="fiber-source-note"><strong>최종 선정 원칙:</strong> E32와 앰프를 함께 표시합니다. 형번별 검출 거리 숫자는 앰프 시리즈와 동작 모드 조합에 따라 달라지므로 확인되지 않은 셀은 추정하지 않고 공식표 확인으로 남깁니다.</div></div>`;
  }

  function renderFiber(){
    setSidebarMode(true);renderFiberChips();const labels=['센서 종류','설치·용도','세부 TYPE','화이버 조건','필수 앰프','최종 조합'];const st=document.getElementById('stepper');if(st)st.innerHTML=labels.map((x,i)=>`<div class="step ${state.step===i+1?'active':state.step>i+1?'done':''}" onclick="goStep(${i+1})"><span class="num">${state.step>i+1?'✓':i+1}</span><span class="labeltxt">${x}</span></div>`).join('');
    if(state.step===2)renderStep2();else if(state.step===3)renderStep3();else if(state.step===4)renderStep4();else if(state.step===5)renderStep5();else if(state.step===6)renderResults();
    const next=document.getElementById('nextBtn');if(next)next.style.visibility=state.step>=6?'hidden':'visible';const count=document.getElementById('sidebarCount');if(count)count.innerHTML=`현재 화이버 조건 <b>${filtered().length}개</b> / E32 ${products.length}개`;
    const sg=document.getElementById('fiberSideGroup');if(sg)sg.value=fiberState().group||'';const sm=document.getElementById('fiberSideMethod');if(sm)sm.value=fiberState().method||'';const ss=document.getElementById('fiberSideSearch');if(ss&&document.activeElement!==ss)ss.value=fiberState().search||'';
  }

  function installModals(){
    if(document.getElementById('fiberDetailBack'))return;document.body.insertAdjacentHTML('beforeend',`<div class="fiber-modal-back" id="fiberDetailBack"><div class="fiber-modal"><div class="fiber-modal-head"><strong id="fiberDetailTitle">화이버센서 상세</strong><button onclick="closeFiberDetail()">닫기</button></div><div class="fiber-modal-body" id="fiberDetailBody"></div></div></div><div class="fiber-modal-back" id="fiberEvidenceBack"><div class="fiber-modal"><div class="fiber-modal-head"><strong id="fiberEvidenceTitle">공식 근거</strong><button onclick="closeFiberEvidence()">닫기</button></div><div class="fiber-modal-body" id="fiberEvidenceBody"></div></div></div>`);['fiberDetailBack','fiberEvidenceBack'].forEach(id=>document.getElementById(id).addEventListener('click',e=>{if(e.target.id===id)e.target.classList.remove('show')}));
  }
  window.openFiberDetail=function(model){const p=products.find(x=>x.model===model);if(!p)return;const a=selectedAmp(),f=fiberState();document.getElementById('fiberDetailTitle').textContent=`${model} · 상세보기`;document.getElementById('fiberDetailBody').innerHTML=`<div class="fiber-detail-layout"><div class="summary"><img src="${esc(p.productImage)}"><h3>${esc(p.model)}</h3><p>${esc(p.classification.group)} · ${esc(p.classification.subcategory)}</p><button class="btn btn-primary" onclick="openFiberEvidence('${esc(p.model)}')">📖 E32 공식 근거</button></div><div><table class="fiber-detail-table"><tr><th>제조사 / 시리즈</th><td>OMRON / E32</td></tr><tr><th>검출 방식</th><td>${esc(p.classification.detectionMethod)}</td></tr><tr><th>분류</th><td>${esc(p.classification.group)} · ${esc(p.classification.subcategory)}</td></tr><tr><th>화이버 길이</th><td>${esc(p.specs.fiberLength)}</td></tr><tr><th>프리 커트</th><td>${esc(p.specs.cutCapability)}</td></tr><tr><th>검출 거리</th><td>${esc(p.specs.sensingDistance)}<br><small>같은 E32라도 ${esc(f.ampSeries)}와 GIGA/HS/ST/SHS 모드에 따라 값이 달라집니다.</small></td></tr><tr class="fiber-detail-required-row"><th>필수 화이버 앰프</th><td>${a?`<b>${esc(a.model)}</b><br>${esc(a.series)} · ${esc(a.type)} · ${esc(a.outputType)} · ${esc(a.connection)} <button class="fiber-inline-btn" onclick="openFiberAmpEvidence('${esc(a.model)}')">앰프 근거</button>`:'<b>미선택</b> · STEP 5에서 앰프 형번 선택 필요'}</td></tr><tr><th>공식 근거</th><td>OMRON Fiber Sensor Best Selection · SCEA-165P-1 · 2017 · p.${p.evidence.catalogPage}</td></tr></table><div class="fiber-source-note">설치 치수·굴곡 반경·내열 온도·최소 검출 물체 등 카드에 구조화하지 않은 항목은 근거보기의 원본 표에서 확인합니다.</div></div></div>`;document.getElementById('fiberDetailBack').classList.add('show')};
  window.closeFiberDetail=function(){document.getElementById('fiberDetailBack')?.classList.remove('show')};

  window.openFiberEvidence=function(model){const p=products.find(x=>x.model===model);if(!p)return;const h=p.evidence.highlight||{};document.getElementById('fiberEvidenceTitle').textContent=`${model} · 📖 E32 근거보기`;document.getElementById('fiberEvidenceBody').innerHTML=`<div class="fiber-evidence-meta"><span>OMRON 공식</span><span>Fiber Sensor Best Selection</span><span>2017</span><span>p.${p.evidence.catalogPage}</span><span>해당 형번: ${esc(model)}</span></div><div class="fiber-evidence-tools"><button onclick="openFiberEvidenceZoom('${esc(model)}',false)">크게 보기 / 확대</button><button onclick="openFiberEvidenceZoom('${esc(model)}',true)">형식 INDEX 보기</button><a href="sources/OMRON_FIBER_SENSOR_2017_KOR.pdf" target="_blank" rel="noopener">원본 PDF ↗</a></div><div class="fiber-evidence-wrap"><img src="${esc(p.evidence.image)}" alt="공식 카탈로그 p.${p.evidence.catalogPage}"><div class="fiber-evidence-highlight" style="left:${h.xPct||0}%;top:${h.yPct||0}%;width:${h.wPct||5}%;height:${h.hPct||2}%"></div></div><div class="fiber-source-note"><strong>근거 해석:</strong> 선택된 형번 주변 표를 유지하고 파란 테두리로 현재 형번 위치를 강조합니다.</div>`;document.getElementById('fiberEvidenceBack').classList.add('show')};
  window.closeFiberEvidence=function(){document.getElementById('fiberEvidenceBack')?.classList.remove('show')};
  window.openFiberEvidenceZoom=function(model,indexMode){const p=products.find(x=>x.model===model);if(!p||typeof openEvidenceZoom!=='function')return;if(indexMode)openEvidenceZoom(p.evidence.indexImage,'E32 형식 INDEX · p.98',null);else openEvidenceZoom(p.evidence.image,`${model} · 공식 카탈로그 p.${p.evidence.catalogPage}`,p.evidence.highlight||null)};

  function ampHighlight(a){
    const pn=a.sourcePage||64,model=a.model;let h={xPct:a.outputType==='PNP'?56.2:43.5,yPct:17,wPct:13,hPct:5};
    if(pn===64){if(/FA6$|FA8$/.test(model))h.yPct=20.5;else if(/FA21|FA51/.test(model))h.yPct=26;else if(/FA7|FA9/.test(model))h.yPct=32;else if(/FA24|FA54/.test(model))h.yPct=38;else if(/FA0$/.test(model))h={xPct:43,yPct:43.5,wPct:27,hPct:5};else h.yPct=15.5;}
    else {if(/HD6$|HD8$/.test(model))h.yPct=26;else if(/HD14|HD44/.test(model))h.yPct=33.5;else if(/HD0$/.test(model))h={xPct:43,yPct:40,wPct:27,hPct:5};else h.yPct=19;}
    return h;
  }
  window.openFiberAmpEvidence=function(model){const a=amps.find(x=>x.model===model);if(!a)return;const h=ampHighlight(a);document.getElementById('fiberEvidenceTitle').textContent=`${model} · 📖 앰프 근거보기`;document.getElementById('fiberEvidenceBody').innerHTML=`<div class="fiber-evidence-meta"><span>OMRON 공식</span><span>Fiber Sensor Best Selection</span><span>2017</span><span>p.${a.sourcePage}</span><span>앰프 형번: ${esc(model)}</span></div><div class="fiber-evidence-tools"><button onclick="openFiberAmpEvidenceZoom('${esc(model)}')">크게 보기 / 확대</button><a href="sources/OMRON_FIBER_SENSOR_2017_KOR.pdf" target="_blank" rel="noopener">원본 PDF ↗</a></div><div class="fiber-evidence-wrap"><img src="${esc(a.sourceImage)}" alt="${esc(model)} 공식 앰프 형식표"><div class="fiber-evidence-highlight" style="left:${h.xPct}%;top:${h.yPct}%;width:${h.wPct}%;height:${h.hPct}%"></div></div><div class="fiber-source-note"><strong>필수 앰프 확인:</strong> E32 화이버 유니트와 함께 사용할 앰프 형번의 출력 및 접속 방식을 공식 형식표에서 확인합니다.</div>`;document.getElementById('fiberEvidenceBack').classList.add('show')};
  window.openFiberAmpEvidenceZoom=function(model){const a=amps.find(x=>x.model===model);if(a&&typeof openEvidenceZoom==='function')openEvidenceZoom(a.sourceImage,`${model} · 화이버 앰프 형식표 p.${a.sourcePage}`,ampHighlight(a))};

  function installSearch(){
    const input=document.getElementById('globalSearch'),box=document.getElementById('searchSuggest');if(!input||!box)return;const fiberSpecific=q=>/^e32-|^e3nx-|^e3x-hd/i.test(q)||/화이버|슬리브|내열|내진공|액면|에어리어|소스폿|협시계/i.test(q);
    function matches(q){q=q.trim().toLowerCase();if(!q)return{ps:[],aa:[]};const ps=products.filter(p=>[p.model,p.classification.group,p.classification.subcategory,p.classification.detectionMethod,...(p.applicationTags||[])].join(' ').toLowerCase().includes(q)).slice(0,10),aa=amps.filter(a=>[a.model,a.series,a.outputType,a.connection,a.type].join(' ').toLowerCase().includes(q)).slice(0,7);return{ps,aa}}
    function paint(){const q=input.value.trim();if(!fiberSpecific(q))return;const{ps,aa}=matches(q);box.innerHTML=[...ps.map(p=>`<div class="search-item" data-fiber-model="${esc(p.model)}"><img src="${esc(p.productImage)}"><div class="search-copy"><b>${esc(p.model)}</b><small>화이버센서 · ${esc(p.classification.subcategory)} · ${esc(p.classification.detectionMethod)}</small></div></div>`),...aa.map(a=>`<div class="search-item" data-fiber-amp="${esc(a.model)}"><img src="${esc(ampImage(a))}"><div class="search-copy"><b>${esc(a.model)}</b><small>화이버 앰프 · ${esc(a.series)} · ${esc(a.outputType)} · ${esc(a.connection)}</small></div></div>`)].join('')||'<div class="search-empty">화이버 카탈로그에서 일치 항목 없음</div>';box.classList.add('show')}
    input.addEventListener('input',()=>setTimeout(paint,0));input.addEventListener('focus',()=>setTimeout(paint,0));input.addEventListener('keydown',e=>{const q=input.value.trim();if(e.key!=='Enter'||!fiberSpecific(q))return;e.preventDefault();e.stopImmediatePropagation();resetFiber();state.sensorType='fiber';if(/^e3nx-|^e3x-hd/i.test(q)){const a=amps.find(x=>x.model.toLowerCase()===q.toLowerCase())||amps.find(x=>x.model.toLowerCase().includes(q.toLowerCase()));if(a){const f=fiberState();f.ampSeries=a.series;f.ampOutput=a.outputType;f.ampConnection=a.connection;f.ampModel=a.model;state.step=5}else state.step=5}else{fiberState().search=q;state.step=6}render();box.classList.remove('show')},true);
    box.addEventListener('click',e=>{const m=e.target.closest('[data-fiber-model]'),ael=e.target.closest('[data-fiber-amp]');if(m){e.preventDefault();e.stopImmediatePropagation();resetFiber();state.sensorType='fiber';state.step=6;fiberState().search=m.dataset.fiberModel;input.value=m.dataset.fiberModel;render();box.classList.remove('show')}else if(ael){e.preventDefault();e.stopImmediatePropagation();const a=amps.find(x=>x.model===ael.dataset.fiberAmp);resetFiber();state.sensorType='fiber';state.step=5;if(a){const f=fiberState();f.ampSeries=a.series;f.ampOutput=a.outputType;f.ampConnection=a.connection;f.ampModel=a.model}input.value=ael.dataset.fiberAmp;render();box.classList.remove('show')}},true);
  }

  installSidebar();installModals();addTerms();installSearch();
  const source=document.querySelector('.source-policy-copy');if(source&&!source.querySelector('.fiber-source-added'))source.insertAdjacentHTML('beforeend',`<div class="fiber-source-added">+ OMRON Fiber Sensor Best Selection 2017 · E32 ${products.length}개 · 화이버 앰프 ${amps.length}형식 추가 · 최종 조합은 E32 + 앰프</div>`);
  const brand=document.querySelector('.brand small');if(brand&&!brand.textContent.includes('E32'))brand.textContent=brand.textContent.replace('TYPE Catalog','TYPE Catalog + E32 Fiber');

  const baseGoStep=goStep;
  goStep=function(n){
    if(state.sensorType==='fiber'){
      n=Math.min(6,Math.max(1,n));
      if(n>=3&&!fiberState().group){state.step=2;render();return}
      if(n>=6&&!selectedAmp()){fiberState().ampWarning=true;state.step=5;render();return}
    }
    baseGoStep(n);
  };
  const baseRender=render;render=function(){baseRender();if(state.sensorType==='fiber'&&state.step>1)renderFiber();else{setSidebarMode(false);if(state.step===1)addFiberCard()}};
  const baseReset=resetAll;resetAll=function(){resetFiber();baseReset()};
  render();
})();
