/* Jcalculator Sensor · OMRON connection/accessory engine v0.1 */
(() => {
  const A={
    e3t:'assets/catalog_detail/acc-table-p289.png',
    e3tMatrix:'assets/evidence/connection-p288.png',
    e3z:'assets/e3z/accessories-p180.png',
    e3zConnector:'assets/e3z/connector-p187.png',
    e2e:'assets/e2e/connectors-p61.jpg',
    ee:'assets/ee_sx47_67/connections-p1171.png',
    eeRelay:'assets/ee_sx47_67/accessory-relay-p1179.png'
  };
  const clone=x=>JSON.parse(JSON.stringify(x));
  const safe=s=>String(s??'').replace(/[^\w가-힣.-]+/g,'_');

  function baseLabel(b){
    const t=b?.type||'',l=b?.length;
    if(t==='cable')return `코드 인출${l!=null?` ${l}m`:''}`;
    if(t==='m8_connector')return 'M8 직접 커넥터';
    if(t==='m8_relay')return 'M8 커넥터 중계 0.3m';
    if(t==='connector_4pole')return '4극 커넥터 타입';
    if(t==='robot_cable_1m')return '코드 인출 1m · 로봇 코드';
    if(t==='connector_relay_0_1m')return '커넥터 중계 0.1m · 로봇 코드';
    return b?.label||t||'접속 방식';
  }
  function variantLabel(v){
    const t=v?.type||'', suffix=v?.codeSuffix||'', l=v?.cableLength;
    if(t==='cable')return `코드 인출 ${l!=null?`${l}m`:suffix}`;
    if(t==='robot_cable')return `로봇 코드 인출 ${l!=null?`${l}m`:suffix}`;
    if(t==='M12 Smart Click relay')return `M12 Smart Click 중계 ${l!=null?`${l}m`:suffix}`;
    if(t==='M12 standard relay')return `M12 표준 커넥터 중계 ${l!=null?`${l}m`:suffix}`;
    if(t==='M8 4-pole relay')return `M8 4극 커넥터 중계 ${l!=null?`${l}m`:suffix}`;
    if(t==='e-CON relay')return `e-CON 커넥터 중계 ${l!=null?`${l}m`:suffix.replace(/^-ECON\s*/,'')}`;
    return `${t}${suffix?` · ${suffix}`:''}`;
  }
  function choices(p){
    const out=[],b=p?.connection?.base||{};
    out.push({key:`base|${b.type||'unknown'}|${b.length??''}|${b.label||''}`,source:'base',type:b.type||'unknown',
      label:b.label||baseLabel(b),cableLength:b.length,unit:b.unit||'m',codeSuffix:'',raw:b});
    (p?.connection?.variants||[]).forEach((v,i)=>out.push({
      key:`variant|${i}|${v.type||''}|${v.codeSuffix||''}`,source:'variant',type:v.type||'unknown',
      label:variantLabel(v),cableLength:v.cableLength,unit:v.unit||'m',codeSuffix:v.codeSuffix||'',raw:v
    }));
    const seen=new Set();
    return out.filter(c=>{const k=[c.source,c.type,c.label,c.codeSuffix,c.cableLength].join('|');if(seen.has(k))return false;seen.add(k);return true});
  }
  function tokenFor(c){
    const t=c?.type||'';
    if(t==='connector_4pole')return 'fork_connector';
    if(t==='robot_cable_1m')return 'fork_cable';
    if(t==='connector_relay_0_1m')return 'fork_relay';
    if(t==='m8_relay')return 'm8_relay';
    if(t==='m8_connector')return 'm8_connector';
    if(t.includes('M8'))return 'm8';
    if(t.includes('M12'))return 'm12';
    if(t.includes('e-CON'))return 'econ';
    if(t.includes('robot'))return 'robot';
    if(t==='cable')return 'cable';
    return t;
  }
  function matchesToken(c,token){
    if(!token)return true;
    const ct=tokenFor(c);
    if(token==='m8')return ['m8','m8_relay','m8_connector'].includes(ct);
    if(token==='cable')return c.type==='cable';
    if(token==='robot')return ['robot_cable','robot_cable_1m'].includes(c.type);
    return ct===token;
  }
  function selectedChoices(p,tokens){
    const all=choices(p),ts=(tokens||[]).filter(Boolean);
    if(!ts.length)return all;
    const found=all.filter(c=>ts.some(t=>matchesToken(c,t)));
    return found.length?found:all;
  }
  function item(part,kind,length,note,certainty='catalog_verified',extra={}){return {part,kind,length,note,certainty,...extra}}
  function group(code,label,sub,image,items,help=''){return {code,label,sub,image,items,help}}

  const E3T_M12=[group('m12','M12 표준 코드','M12 중계 커넥터에서 제어반까지 연결',A.e3t,[
    item('XS5F-D421-D80-A','M12 표준 코드','2m','4선식 · 스트레이트'),
    item('XS5F-D421-G80-A','M12 표준 코드','5m','4선식 · 스트레이트')
  ],'제어반까지 필요한 길이로 2m 또는 5m를 선택합니다.')];

  const ECON=[group('econ','e-CON 접속 코드','e-CON 중계 타입 뒤에 연결',A.e3t,[
    item('E39-ECON2M','e-CON 편측 커넥터 코드','2m','공식 카탈로그 등재'),
    item('E39-ECON5M','e-CON 편측 커넥터 코드','5m','공식 카탈로그 등재'),
    item('E39-ECONW□M','e-CON 양측 커넥터 코드','0.5~2m','0.1m 단위 지정 길이','catalog_verified',
      {warning:'□에는 실제 주문 길이를 확정해 적용해야 합니다.'})
  ],'작은 배선 공간에 유리합니다. 실제 주문에서는 필요한 코드 길이까지 확정합니다.')];

  const E3Z_M8=[
    group('m8_std','M8 표준 코드','일반 환경용 M8 한쪽 커넥터 코드',A.e3z,[
      item('XS3F-M421-402-A','M8 표준 코드 · 스트레이트','2m','4선식'),
      item('XS3F-M421-405-A','M8 표준 코드 · 스트레이트','5m','4선식'),
      item('XS3F-M422-402-A','M8 표준 코드 · L형','2m','4선식'),
      item('XS3F-M422-405-A','M8 표준 코드 · L형','5m','4선식')
    ],'뒤 공간이 충분하면 스트레이트, 뒤 공간이 좁고 케이블을 옆으로 빼야 하면 L형을 검토합니다.'),
    group('m8_pur','M8 PUR 코드','저온 조건 검토용 PUR 코드',A.e3z,[
      item('XS3F-M421-402-L','M8 PUR 코드 · 스트레이트','2m','4선식'),
      item('XS3F-M421-405-L','M8 PUR 코드 · 스트레이트','5m','4선식'),
      item('XS3F-M422-402-L','M8 PUR 코드 · L형','2m','4선식'),
      item('XS3F-M422-405-L','M8 PUR 코드 · L형','5m','4선식')
    ],'E3Z 카탈로그는 일부 커넥터 타입을 -25~-40℃에서 사용할 때 PUR(-L) 코드를 사용하도록 안내합니다.')
  ];

  const E3Z_M12=[group('m12_m1j','M12 표준 코드','E3Z -M1J용 3선식 M12 코드',A.e3z,[
    item('XS2F-D421-DC0-A','M12 코드 · 스트레이트','2m','3선식 · -M1J용'),
    item('XS2F-D421-GC0-A','M12 코드 · 스트레이트','5m','3선식 · -M1J용'),
    item('XS2F-D422-DC0-A','M12 코드 · L형','2m','3선식 · -M1J용'),
    item('XS2F-D422-GC0-A','M12 코드 · L형','5m','3선식 · -M1J용')
  ],'뒤 공간과 케이블 길이에 따라 스트레이트/L형, 2m/5m를 선택합니다.')];

  const E2E_M8=[
    group('e2e_std','M8 표준 코드','커넥터/중계 타입에 필요한 3선식 M8 코드',A.e2e,[
      item('XS3F-M321-302-A','M8 표준 코드 · 스트레이트','2m','3선식'),
      item('XS3F-M321-305-A','M8 표준 코드 · 스트레이트','5m','3선식'),
      item('XS3F-M322-302-A','M8 표준 코드 · L형','2m','3선식'),
      item('XS3F-M322-305-A','M8 표준 코드 · L형','5m','3선식')
    ],'케이블이 고정되어 있으면 표준 코드를 먼저 검토합니다.'),
    group('e2e_robot','M8 로봇(내진용) 코드','반복 굽힘/이동이 있는 장치용',A.e2e,[
      item('XS3F-M321-302-R','M8 로봇 코드 · 스트레이트','2m','3선식'),
      item('XS3F-M321-305-R','M8 로봇 코드 · 스트레이트','5m','3선식'),
      item('XS3F-M322-302-R','M8 로봇 코드 · L형','2m','3선식'),
      item('XS3F-M322-305-R','M8 로봇 코드 · L형','5m','3선식')
    ],'케이블이 장비 동작에 따라 반복해서 굽혀지거나 움직일 때 검토합니다.')
  ];

  const EE=[
    group('ee_conn','커넥터만 연결','4극 커넥터 단품',A.ee,[
      item('EE-1001','커넥터','—','커넥터 타입용 액세서리','catalog_listed'),
      item('EE-1001-1','커넥터','—','L단자와 +단자를 사전에 단락 · 입광 ON 사용 시 편리','catalog_listed'),
      item('EE-1009','커넥터','—','커넥터 타입용 액세서리','catalog_listed')
    ],'EE-1001과 EE-1009의 상세 구조 차이는 현재 기본 카탈로그만으로 확인 불가합니다.'),
    group('ee_1m','코드 부착 1m','커넥터 + 1m 코드',A.ee,[
      item('EE-1006','코드 부착','1m','카탈로그 등재 후보','catalog_listed',{optional:'EE-1006A 커넥터 유지 브라켓 사용 가능'}),
      item('EE-1010','코드 부착','1m','카탈로그 등재 후보','catalog_listed')
    ],'EE-1006과 EE-1010의 상세 구조 차이는 현재 기본 카탈로그만으로 확인 불가합니다.'),
    group('ee_2m','코드 부착 2m','커넥터 + 2m 코드',A.ee,[
      item('EE-1006','코드 부착','2m','카탈로그 등재 후보','catalog_listed',{optional:'EE-1006A 커넥터 유지 브라켓 사용 가능'}),
      item('EE-1010','코드 부착','2m','카탈로그 등재 후보','catalog_listed')
    ]),
    group('ee_robot','로봇 코드 부착','반복 굽힘 고려',A.ee,[
      item('EE-1010-R','로봇 코드 부착','1m','커넥터 타입용 로봇 코드','catalog_listed'),
      item('EE-1010-R','로봇 코드 부착','2m','커넥터 타입용 로봇 코드','catalog_listed')
    ],'케이블이 반복해서 움직이면 로봇 코드 타입을 검토합니다.')
  ];

  const none=(summary,image,beginner)=>({requirement:'none',summary,image,groups:[],beginner});
  const required=(summary,image,groups,beginner)=>({requirement:'required',summary,image,groups:clone(groups),beginner});
  const unknown=(summary,image,beginner)=>({requirement:'unknown',summary,image,groups:[],beginner});

  function accessoryInfo(p,c){
    const s=p?.series||'',t=c?.type||p?.connection?.base?.type||'';
    if(s==='E3T'){
      if(t==='M12 Smart Click relay')return required('별도 M12 센서 I/O 코드 필요',A.e3t,E3T_M12,'0.3m 중계선 뒤 M12 코드 형번을 추가 선택합니다.');
      if(t==='e-CON relay')return required('별도 e-CON 접속 코드 필요',A.e3t,ECON,'e-CON 중계 끝에서 제어반까지 이어 줄 접속 코드를 추가 선택합니다.');
      if(t==='robot_cable')return none('센서에 로봇 코드가 직접 부착 · 추가 센서측 커넥터 없음',A.e3tMatrix,'센서와 케이블이 일체형입니다.');
      if(t==='cable')return none('센서에 코드가 직접 부착 · 추가 센서측 커넥터 없음',A.e3tMatrix,'센서와 케이블이 일체형입니다.');
    }
    if(s==='E3Z'){
      if(['m8_connector','m8_relay','M8 4-pole relay'].includes(t))return required('별도 M8 센서 I/O 코드 필요',A.e3z,E3Z_M8,'M8 뒤에 연결할 센서 I/O 코드를 추가 선택합니다.');
      if(t==='M12 standard relay')return required('별도 M12(-M1J용) 센서 I/O 코드 필요',A.e3z,E3Z_M12,'E3Z -M1J용 M12 코드를 추가 선택합니다.');
      if(t==='M12 Smart Click relay')return unknown('M12 Smart Click(-M1TJ) 접속 코드 정확한 형번: 확인 불가',A.e3z,'현재 E3Z 한글 2010 기본 카탈로그에서 -M1TJ 사양은 확인되지만 뒤에 연결할 정확한 코드 형번은 확인되지 않습니다. E3T용 XS5F를 임의 적용하지 않습니다.');
      if(t==='e-CON relay')return required('별도 e-CON 접속 코드 필요',A.e3z,ECON.map(g=>({...clone(g),image:A.e3z})),'e-CON 중계 끝에 E39-ECON 계열 코드를 추가 선택합니다.');
      if(t==='cable')return none('센서에 코드가 직접 부착 · 추가 센서측 커넥터 없음',A.e3z,'센서와 케이블이 일체형입니다.');
    }
    if(s==='E2E Small New'){
      if(['m8_connector','m8_relay'].includes(t))return required('별도 M8 센서 I/O 코드 필요',A.e2e,E2E_M8,'카탈로그 p.61은 커넥터 타입/중계 타입에 센서 I/O 커넥터가 부속되지 않으므로 별도 주문하도록 안내합니다.');
      if(t==='cable')return none('센서에 2m 코드가 직접 부착 · 추가 센서측 커넥터 없음',A.e2e,'센서측 M8 코드를 추가 선택하지 않습니다.');
    }
    if(s==='EE-SX47/67'){
      if(t==='connector_4pole')return required('별매 커넥터/코드 선택 필요',A.ee,EE,'4극 커넥터 타입은 센서 본체 외에 실제 접속 부품을 추가 선택해야 합니다.');
      if(t==='connector_relay_0_1m')return required('전용 EE-1016-R-1 2m 필요',A.eeRelay,[
        group('ee_relay','전용 접속 커넥터','EE-SX67□-C1J-R 전용',A.eeRelay,[
          item('EE-1016-R-1','로봇 코드 장착 커넥터','2m','EE-SX67□-C1J-R 전용','dedicated_verified')
        ],'공식 카탈로그에서 전용 접속 부품으로 지정되어 있습니다.')
      ],'0.1m 중계 타입에는 EE-1016-R-1 2m가 전용입니다.');
      if(t==='robot_cable_1m')return none('센서에 1m 로봇 코드가 직접 부착 · 추가 센서측 커넥터 없음',A.ee,'센서측 별도 EE 커넥터를 추가 선택하지 않습니다.');
    }
    return unknown('접속 부품 자동 매핑: 확인 불가',p?.productImage||'','현재 등록된 공식 자료만으로 별도 접속 부품 형번을 확정할 수 없습니다.');
  }

  function orderText(p,c){
    if(!p||!c)return p?.model||'';
    if(c.source==='base')return p.model;
    const s=String(c.codeSuffix||'').trim();
    if(!s)return p.model;
    return (s.startsWith('-')?`${p.model}${s}`:`${p.model} ${s}`).replace(/\s+/g,' ').trim();
  }
  function choiceHelp(p,c){
    const info=accessoryInfo(p,c),t=c?.type||'';
    let text='',key='';
    if(t==='cable'){text='센서 본체에서 케이블이 바로 붙어서 나옵니다.';key='센서 뒤에 별도 커넥터 공간이 필요 없지만 교체 시 케이블도 함께 처리합니다.';}
    else if(['robot_cable','robot_cable_1m'].includes(t)){text='반복 굽힘을 고려한 코드가 센서에 직접 붙어 있습니다.';key='케이블이 실제 장비 동작으로 계속 움직일 때 검토합니다.';}
    else if(t==='m8_connector'){text='센서 본체에 M8 커넥터를 직접 꽂습니다.';key='센서 교체는 쉽지만 별도 M8 센서 I/O 코드와 커넥터 뒤 공간이 필요합니다.';}
    else if(t==='m8_relay'||t==='M8 4-pole relay'){text='센서에서 짧은 케이블이 나온 뒤 M8 커넥터로 이어집니다.';key='센서 바로 뒤 공간이 좁지만 유지보수 때 분리하고 싶을 때 유리하며 별도 M8 코드가 필요합니다.';}
    else if(t==='M12 Smart Click relay'){text='짧은 중계선 뒤 M12 Smart Click 커넥터로 이어집니다.';key=p?.series==='E3Z'?'E3Z -M1TJ 뒤 접속 코드 형번은 현재 한글 기본 카탈로그에서 확인 불가입니다.':'E3T는 공식 p.289의 XS5F 2m/5m 코드를 선택합니다.';}
    else if(t==='M12 standard relay'){text='짧은 중계선 뒤 표준 M12 커넥터로 이어집니다.';key='E3Z -M1J용 XS2F 스트레이트/L형, 2m/5m에서 선택합니다.';}
    else if(t==='e-CON relay'){text='짧은 중계선 뒤 소형 e-CON으로 이어집니다.';key='E39-ECON 계열 접속 코드를 추가 선택합니다.';}
    else if(t==='connector_4pole'){text='센서 본체에 4극 커넥터를 직접 꽂습니다.';key='센서 교체는 쉽지만 EE-1001 계열 또는 코드 부착형 등 별매 접속 부품이 필요합니다.';}
    else if(t==='connector_relay_0_1m'){text='센서에서 0.1m 코드 뒤에 커넥터가 있습니다.';key='EE-SX67□-C1J-R은 EE-1016-R-1 2m 전용 접속 부품을 사용합니다.';}
    else{text=c?.label||'접속 방식을 확인합니다.';key=info.beginner||'공식 접속 사양을 확인하세요.';}
    return {title:c?.label||'접속 방식',text,key,image:info.image,footer:`${p?.series||''} 공식 한글 카탈로그 기준`};
  }

  window.SensorConnection={assets:A,choices,selectedChoices,matchesToken,tokenFor,baseLabel,variantLabel,
    accessoryInfo,requirementText:(p,c)=>accessoryInfo(p,c).summary,orderText,choiceHelp,safe};
})();
