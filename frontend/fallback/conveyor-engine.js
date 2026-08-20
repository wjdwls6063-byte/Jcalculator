var SUP = {
  slider: {
    mu: 0.40,
    name: "슬라이더 베드 (강판 면지지)",
    order: 1,
    cost: "낮음 ★☆☆",
    noise: "보통",
    maint: "낮음 (베드 마모 점검)",
    apply: "소형·경량 부품, 짧은 반송, 저속 라인",
    roll: false,
    feat: "강판 또는 수지판 위를 벨트가 직접 미끄러지는 가장 기본적인 구조. 부품 수가 적어 저렴하고 얇게 만들 수 있으며, 작은 제품도 이송면 단차 없이 안정적으로 반송됩니다.",
    pros: "구조 단순·최저 비용 / 벨트 처짐 없음 / 소형·경량 제품에 유리 / 청소·세척 용이",
    cons: "마찰이 가장 커서 필요동력·벨트 장력이 크게 증가 / 베드와 벨트 하면 마모 / 장거리·고하중에 불리"
  },
  uhmw: {
    mu: 0.25,
    name: "UHMW 저마찰 베드 (수지 면지지)",
    order: 2,
    cost: "낮음~보통 ★★☆",
    noise: "낮음 (정숙)",
    maint: "낮음 (수지판 주기 교체)",
    apply: "정숙성이 필요한 경량 반송, 식품·의약 라인, 클린룸",
    roll: false,
    feat: "초고분자량 폴리에틸렌(UHMW-PE) 판을 베드면에 깔아 마찰을 낮춘 구조. 슬라이더 베드의 단순함을 유지하면서 동력과 소음을 함께 줄일 수 있습니다.",
    pros: "슬라이더 대비 마찰 약 40% 감소 / 저소음·비발청 / 벨트 하면 마모 감소 / 자기 윤활성",
    cons: "수지판 마모 시 교체 필요 / 고온 환경에 취약 / 롤러 방식보다는 여전히 마찰이 큼"
  },
  hybrid: {
    mu: 0.30,
    name: "혼합형 (면지지 + 무동력 롤러)",
    order: 3,
    cost: "보통 ★★☆",
    noise: "보통",
    maint: "보통 (롤러+베드 병행 점검)",
    apply: "경량~중량 혼재 라인, 부분 구간만 하중이 큰 설비, 범용 라인",
    roll: true,
    feat: "하중이 집중되는 구간에는 캐리어 롤러를, 소형품이 지나는 구간에는 슬라이더 베드를 배치한 절충 구조. 소형품 낙하·걸림을 막으면서 동력도 줄일 수 있습니다.",
    pros: "동력과 안정성의 균형 / 국부 고하중 대응 / 기존 슬라이더 설비 개조가 쉬움",
    cons: "구조가 복잡해 제작·조립 공수 증가 / 구간별 마찰 차이로 벨트 장력 관리 필요"
  },
  roller: {
    mu: 0.15,
    name: "롤러 베드 (무동력 캐리어 롤러)",
    order: 4,
    cost: "보통~높음 ★★☆",
    noise: "다소 큼",
    maint: "보통 (롤러 회전·이물 점검)",
    apply: "중·고하중 박스 반송, 장거리 라인, 물류 이송",
    roll: true,
    feat: "벨트 하부를 일정 피치의 캐리어 롤러가 받쳐 회전 저항만으로 지지하는 구조. 마찰이 크게 줄어 같은 모터로 더 무거운 하중을 반송할 수 있습니다.",
    pros: "슬라이더 대비 필요동력 약 1/3 / 고하중·장거리 유리 / 벨트 하면 마모 최소 / 발열 적음",
    cons: "롤러 피치가 크면 벨트 처짐 발생 / 소형·박형 제품은 롤러 단차 영향 / 롤러 개수만큼 비용·소음 증가"
  },
  bearing: {
    mu: 0.10,
    name: "정밀 베어링 롤러 (무동력 정밀 아이들러)",
    order: 5,
    cost: "높음 ★★★",
    noise: "매우 낮음",
    maint: "낮음 (장수명) · 부품가 높음",
    apply: "고효율·정밀 이송, 검사·계측 라인, 저진동 요구 설비",
    roll: true,
    feat: "정밀 볼베어링을 내장한 <b>무동력</b> 저관성 아이들러 롤러로 벨트를 받쳐 회전 저항을 최소화한 구조. 미소 동력으로도 부드럽게 구동되며 속도 변동과 진동이 매우 작습니다. <b>모터·감속기가 내장된 구동 롤러(파워몰러/MDR)와는 다른 부품</b>이며, 그쪽은 구동부(모터) 항목에 해당합니다.",
    pros: "필요동력 최소(슬라이더의 약 1/4) / 저진동·저소음 / 장수명·고정밀 / 소형 모터 선정 가능",
    cons: "초기 비용이 가장 높음 / 이물·습기에 의한 베어링 손상 주의 / 과하중 시 국부 파손 위험"
  },
  custom: {
    mu: null,
    name: "μ 직접 입력",
    order: 6,
    cost: "—",
    noise: "—",
    maint: "—",
    apply: "사용자 지정 지지 구조",
    roll: true,
    feat: "실측값 또는 제조사 제공 등가 마찰계수를 직접 적용합니다.",
    pros: "실측 기반 정확한 검토 가능",
    cons: "값의 근거를 별도로 확보해야 함"
  }
};

var ORDER = ["slider", "uhmw", "hybrid", "roller", "bearing"];

var TBL = ORDER.concat(["custom"]);


const G=9.81,BELT_KG_M2=3.0;
function __safeJson(value){
  return JSON.stringify(value,function(_k,v){
    if(typeof v==='number'&&!isFinite(v)) return v===Infinity?'Infinity':v===-Infinity?'-Infinity':'NaN';
    return v;
  });
}
function conveyorCatalogJSON(){return __safeJson({supports:SUP,order:ORDER,tableOrder:TBL});}
function conveyorCalculateJSON(payload){
  const P=JSON.parse(payload);
  const finite=function(name,value,min,inclusive){
    const n=Number(value);
    if(!Number.isFinite(n)||(inclusive?n<min:n<=min)) throw new Error(name+' 입력값이 올바르지 않습니다.');
    return n;
  };
  const load=finite('총하중',P.load,0,false),ang=finite('경사각',P.angle,-90,true),pm=finite('모터 출력',P.pmotor,0,false),rpm=finite('모터 회전수',P.rpm,0,false);
  if(ang>90) throw new Error('경사각은 -90~90° 범위여야 합니다.');
  const i=finite('감속비',P.ratio,0,false),D=finite('구동풀리 지름',P.pulley,0,false),C=finite('축간거리',P.center,0,false),B=finite('벨트폭',P.width,0,false);
  const sup=P.support in SUP?P.support:'slider',p=finite('롤러 피치',P.pitch,0,false);
  const sf=finite('안전율',P.sf,0,false),eff=finite('기계효율',P.eff,0,false);
  if(eff>1) throw new Error('기계효율은 0 초과 1 이하여야 합니다.');
  const accelTime=finite('가속시간',P.accelTime==null?0.5:P.accelTime,0,false);
  const equivalentInertia=finite('회전체 등가관성',P.equivalentInertia==null?0:P.equivalentInertia,0,true);
  const passMarginPct=finite('통과 여유율',P.passMarginPct==null?30:P.passMarginPct,0,true);
  if(passMarginPct>1000) throw new Error('통과 여유율은 0~1000% 범위여야 합니다.');
  const passFactor=1+passMarginPct/100;
  const mu=sup==='custom'?Math.min(Math.max(+P.cmu||0,0.01),1):SUP[sup].mu,isRoll=SUP[sup].roll;
  const outRpm=rpm/i,vmm=Math.PI*D*outRpm,vmin=vmm/1000,vms=vmin/60;
  const beltLengthMm=2*C+Math.PI*D,area=(beltLengthMm/1000)*(B/1000),mBelt=area*BELT_KG_M2,mTot=load+mBelt;
  const nRoll=Math.floor(C/p)+1,perRoll=mTot/nRoll;
  const th=ang*Math.PI/180,fFric=mTot*G*mu*Math.cos(th),fGrad=mTot*G*Math.sin(th),Fe=fFric+fGrad;
  const radius=D/2000,acceleration=vms/accelTime,angularAcceleration=acceleration/radius;
  const accelerationForce=mTot*acceleration,steadyTorque=Fe*radius;
  const accelerationTorque=accelerationForce*radius+equivalentInertia*angularAcceleration;
  const startupTorque=steadyTorque+accelerationTorque;
  const selectedOutputTorque=Math.max(Math.abs(steadyTorque),Math.abs(startupTorque));
  const T=steadyTorque,Tk=T*10.1972,Treq=selectedOutputTorque*sf,Treqk=Treq*10.1972;
  const Tmotor=Treq/(i*eff),Trated=pm/(2*Math.PI*rpm/60),Tratio=Trated/Tmotor;
  const outputOmega=2*Math.PI*outRpm/60,Preq=Treq*outputOmega/eff,PreqNoSf=selectedOutputTorque*outputOmega;
  const margin=(pm-Preq)/Preq*100,need30=Preq*passFactor,ratio=pm/Preq*100;
  const comparison=TBL.map(function(k){
    const m=k==='custom'?Math.min(Math.max(+P.cmu||0,0.01),1):SUP[k].mu;
    const f=mTot*G*(m*Math.cos(th)+Math.sin(th)),runT=f*radius,startT=runT+accelerationTorque;
    const pw=Math.max(Math.abs(runT),Math.abs(startT))*sf*outputOmega/eff,mg=(pm-pw)/pw*100;
    return {key:k,mu:m,powerW:pw,marginPct:mg,relativePct:pw/Preq*100,status:mg>=passMarginPct?'safe':mg>=0?'conditional':'fail',braking:f<0};
  });
  const Tini=B*1.0,wl=(load+mBelt/2)*G/Math.max(C/1000,0.001);
  const pitches=[100,150,200,250,300,400,500,600];
  if(pitches.indexOf(Math.round(p))<0)pitches.push(Math.round(p));
  pitches.sort(function(a,b){return a-b;});
  const sagRows=pitches.map(function(pp){
    const sag=wl*Math.pow(pp/1000,2)/(8*Math.max(Tini,0.001))*1000;
    const rate=sag/pp*100,n=Math.max(1,Math.floor(C/pp)+1),kg=mTot/n;
    return {pitchMm:pp,sagMm:sag,ratePct:rate,rollerCount:n,kgPerRoller:kg,status:rate<=1?'safe':rate<=2?'warning':'fail'};
  });
  const altForce=mTot*G*(0.10*Math.cos(th)+Math.sin(th));
  const altPower=Math.max(Math.abs(altForce*radius),Math.abs(altForce*radius+accelerationTorque))*sf*outputOmega/eff;
  const iNeed=margin<passMarginPct&&Preq>0&&pm>0?i*(Preq/(pm/passFactor)):null;
  return __safeJson({load:load,ang:ang,pm:pm,rpm:rpm,i:i,D:D,C:C,B:B,sup:sup,p:p,sf:sf,eff:eff,mu:mu,isRoll:isRoll,
    outRpm:outRpm,vmm:vmm,vmin:vmin,vms:vms,area:area,mBelt:mBelt,mTot:mTot,nRoll:nRoll,perRoll:perRoll,th:th,
    fFric:fFric,fGrad:fGrad,Fe:Fe,T:T,Tk:Tk,Treq:Treq,Treqk:Treqk,Tmotor:Tmotor,Trated:Trated,Tratio:Tratio,
    Preq:Preq,PreqNoSf:PreqNoSf,margin:margin,need30:need30,passMarginPct:passMarginPct,ratio:ratio,comparison:comparison,Tini:Tini,wl:wl,
    sagRows:sagRows,altPower:altPower,iNeed:iNeed,backdriveRisk:Fe<0,
    beltPurchaseLengthMm:beltLengthMm,beltPurchaseMassKg:mBelt,
    weightN:mTot*G,forceFactor:mu*Math.cos(th)+Math.sin(th),accelTime:accelTime,equivalentInertia:equivalentInertia,
    accelerationMS2:acceleration,angularAccelerationRadS2:angularAcceleration,accelerationForceN:accelerationForce,
    accelerationTorqueNm:accelerationTorque,startupTorqueNm:startupTorque,selectedOutputTorqueNm:selectedOutputTorque,
    operatingMode:Fe<0?'braking':'driving',brakingPowerW:Fe<0?Math.abs(Fe)*vms*sf/eff:0,inertiaConfirmed:equivalentInertia>0});
}

export { conveyorCatalogJSON, conveyorCalculateJSON };

