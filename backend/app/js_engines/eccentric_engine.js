const HD = {
  "CSF-2UH": {
    14: {
      n: [8500, 3500],
      J: .033,
      r: {
        30: [4, 9, 6.8, 17],
        50: [5.4, 18, 6.9, 35],
        80: [7.8, 23, 11, 47],
        100: [7.8, 28, 11, 54]
      }
    },
    17: {
      n: [7300, 3500],
      J: .079,
      r: {
        30: [8.8, 16, 12, 30],
        50: [16, 34, 26, 70],
        80: [22, 43, 27, 87],
        100: [24, 54, 39, 108],
        120: [24, 54, 39, 86]
      }
    },
    20: {
      n: [6500, 3500],
      J: .193,
      r: {
        30: [15, 27, 20, 50],
        50: [25, 56, 34, 98],
        80: [34, 74, 47, 127],
        100: [40, 82, 49, 147],
        120: [40, 87, 49, 147],
        160: [40, 92, 49, 147]
      }
    },
    25: {
      n: [5600, 3500],
      J: .413,
      r: {
        30: [27, 50, 38, 95],
        50: [39, 98, 55, 186],
        80: [63, 137, 87, 255],
        100: [67, 157, 108, 284],
        120: [67, 167, 108, 304],
        160: [67, 176, 108, 314]
      }
    },
    32: {
      n: [4800, 3500],
      J: 1.69,
      r: {
        30: [54, 100, 75, 200],
        50: [76, 216, 108, 382],
        80: [118, 304, 167, 568],
        100: [137, 333, 216, 647],
        120: [137, 353, 216, 686],
        160: [137, 372, 216, 686]
      }
    },
    40: {
      n: [4000, 3000],
      J: 4.5,
      r: {
        50: [137, 402, 196, 686],
        80: [206, 519, 284, 980],
        100: [265, 568, 372, 1080],
        120: [294, 617, 451, 1180],
        160: [294, 647, 451, 1180]
      }
    },
    45: {
      n: [3800, 3000],
      J: 8.68,
      r: {
        50: [176, 500, 265, 950],
        80: [313, 706, 390, 1270],
        100: [353, 755, 500, 1570],
        120: [402, 823, 620, 1760],
        160: [402, 882, 630, 1910]
      }
    },
    50: {
      n: [3500, 2500],
      J: 12.5,
      r: {
        50: [122, 715, 175, 1430],
        80: [372, 941, 519, 1860],
        100: [470, 980, 666, 2060],
        120: [529, 1080, 813, 2060],
        160: [529, 1180, 843, 2450]
      }
    },
    58: {
      n: [3000, 2200],
      J: 27.3,
      r: {
        50: [176, 1020, 260, 1960],
        80: [549, 1480, 770, 2450],
        100: [696, 1590, 1060, 3180],
        120: [745, 1720, 1190, 3330],
        160: [745, 1840, 1210, 3430]
      }
    },
    65: {
      n: [2800, 1900],
      J: 46.8,
      r: {
        50: [245, 1420, 360, 2830],
        80: [745, 2110, 1040, 3720],
        100: [951, 2300, 1520, 4750],
        120: [951, 2510, 1570, 4750],
        160: [951, 2630, 1570, 4750]
      }
    }
  },
  "CSG-2UH": {
    14: {
      n: [8500, 3500],
      J: .033,
      r: {
        50: [7, 23, 9, 46],
        80: [10, 30, 14, 58],
        100: [10, 36, 14, 58]
      }
    },
    17: {
      n: [7300, 3500],
      J: .079,
      r: {
        50: [21, 44, 34, 91],
        80: [29, 56, 35, 109],
        100: [31, 70, 51, 109],
        120: [31, 70, 51, 109]
      }
    },
    20: {
      n: [6500, 3500],
      J: .193,
      r: {
        50: [33, 73, 44, 127],
        80: [44, 96, 61, 165],
        100: [52, 107, 64, 191],
        120: [52, 113, 64, 191],
        160: [52, 120, 64, 191]
      }
    },
    25: {
      n: [5600, 3500],
      J: .413,
      r: {
        50: [51, 127, 72, 242],
        80: [82, 178, 113, 332],
        100: [87, 204, 140, 369],
        120: [87, 217, 140, 395],
        160: [87, 229, 140, 408]
      }
    },
    32: {
      n: [4800, 3500],
      J: 1.69,
      r: {
        50: [99, 281, 140, 497],
        80: [153, 395, 217, 738],
        100: [178, 433, 281, 841],
        120: [178, 459, 281, 842],
        160: [178, 484, 281, 842]
      }
    },
    40: {
      n: [4000, 3000],
      J: 4.5,
      r: {
        50: [178, 523, 255, 892],
        80: [268, 675, 369, 1270],
        100: [345, 738, 484, 1400],
        120: [382, 802, 586, 1510],
        160: [382, 841, 586, 1510]
      }
    },
    45: {
      n: [3800, 3000],
      J: 8.68,
      r: {
        50: [229, 650, 345, 1235],
        80: [407, 918, 507, 1651],
        100: [459, 982, 650, 2041],
        120: [523, 1070, 806, 2288],
        160: [523, 1147, 819, 2483]
      }
    },
    50: {
      n: [3500, 2500],
      J: 12.5,
      r: {
        80: [484, 1223, 675, 2418],
        100: [611, 1274, 866, 2678],
        120: [688, 1404, 1057, 2678],
        160: [688, 1534, 1096, 3185]
      }
    },
    58: {
      n: [3000, 2200],
      J: 27.3,
      r: {
        80: [714, 1924, 1001, 3185],
        100: [905, 2067, 1378, 4134],
        120: [969, 2236, 1547, 4329],
        160: [969, 2392, 1573, 4459]
      }
    },
    65: {
      n: [2800, 1900],
      J: 46.8,
      r: {
        80: [969, 2743, 1352, 4836],
        100: [1236, 2990, 1976, 6175],
        120: [1236, 3263, 2041, 6175],
        160: [1236, 3419, 2041, 6175]
      }
    }
  }
};

const ATG = {
  sz: [44, 62, 90, 120, 142, 180, 220],
  rpm: {
    44: [10000, 5000],
    62: [10000, 5000],
    90: [8000, 4000],
    120: [8000, 4000],
    142: [6000, 3000],
    180: [6000, 3000],
    220: [4000, 2000]
  },
  t1: {
    3: [19, 59, 165, 335, 625, 1206, 2030],
    4: [16, 51, 146, 300, 555, 1069, 1804],
    5: [16, 48, 160, 333, 618, 1189, 2010],
    6: [15, 45, 151, 311, 583, 1118, 1911],
    7: [15, 45, 149, 309, 573, 1108, 1870],
    8: [14, 43, 143, 298, 553, 1070, 1824],
    9: [13, 44, 145, 278, 516, 993, 1694],
    10: [14, 43, 141, 294, 549, 1059, 1779]
  },
  j1: {
    3: [.03, .16, .61, 3.25, 9.21, 28.98, 59.61],
    4: [.03, .14, .48, 2.74, 7.54, 23.67, 54.37],
    5: [.03, .13, .47, 2.71, 7.42, 23.29, 53.27],
    6: [.03, .13, .45, 2.65, 7.25, 22.75, 51.72],
    7: [.03, .13, .45, 2.62, 7.14, 22.48, 50.97],
    8: [.03, .13, .44, 2.58, 7.07, 22.59, 50.84],
    9: [.03, .13, .44, 2.57, 7.04, 22.53, 50.63],
    10: [.03, .13, .44, 2.57, 7.03, 22.51, 50.56]
  },
  t2: {
    15: [19, 59, 165, 335, 625, 1206, 2030],
    20: [16, 51, 146, 300, 555, 1069, 1804],
    25: [16, 48, 160, 333, 618, 1189, 2010],
    30: [15, 45, 151, 311, 583, 1118, 1911],
    35: [15, 45, 149, 309, 573, 1108, 1870],
    40: [14, 43, 143, 298, 553, 1070, 1824],
    50: [16, 48, 160, 333, 618, 1189, 2010],
    60: [15, 45, 151, 311, 583, 1118, 1911],
    70: [15, 45, 149, 309, 573, 1108, 1870],
    80: [14, 43, 143, 298, 553, 1070, 1824],
    90: [13, 44, 145, 278, 516, 993, 1694],
    100: [14, 43, 141, 294, 549, 1059, 1779]
  },
  j2: {
    15: [.03, .03, .14, .46, 2.63, 7.3, 22.79],
    20: [.03, .03, .14, .46, 2.63, 7.3, 22.79],
    25: [.03, .03, .14, .46, 2.63, 7.1, 22.79],
    30: [.03, .03, .14, .46, 2.43, 7.1, 22.59],
    35: [.03, .03, .14, .44, 2.43, 7.1, 22.59],
    40: [.03, .03, .14, .44, 2.43, 6.92, 22.59],
    50: [.03, .03, .14, .44, 2.43, 6.92, 22.59],
    60: [.03, .03, .14, .43, 2.39, 6.72, 21.83],
    70: [.03, .03, .14, .43, 2.39, 6.72, 21.83],
    80: [.03, .03, .14, .43, 2.39, 6.72, 21.83],
    90: [.03, .03, .14, .4, 2.39, 6.72, 21.6],
    100: [.03, .03, .14, .43, 2.39, 6.72, 21.83]
  }
};

const MOTORS = [{
  n: 'HG-KR053',
  W: 50,
  rt: .16,
  mx: .56,
  J: .045,
  Jb: .0472,
  rpm: 3000,
  rmx: 6000,
  jr: 15
}, {
  n: 'HG-KR13',
  W: 100,
  rt: .32,
  mx: 1.1,
  J: .0777,
  Jb: .0837,
  rpm: 3000,
  rmx: 6000,
  jr: 15
}, {
  n: 'HG-KR23',
  W: 200,
  rt: .64,
  mx: 2.2,
  J: .221,
  Jb: .243,
  rpm: 3000,
  rmx: 6000,
  jr: 24
}, {
  n: 'HG-KR43',
  W: 400,
  rt: 1.3,
  mx: 4.5,
  J: .371,
  Jb: .393,
  rpm: 3000,
  rmx: 6000,
  jr: 22
}, {
  n: 'HG-KR73',
  W: 750,
  rt: 2.4,
  mx: 8.4,
  J: 1.26,
  Jb: 1.37,
  rpm: 3000,
  rmx: 6000,
  jr: 15
}];

const KE = [[.1, .43], [.2, .64], [.3, .77], [.4, .85], [.5, .9], [.6, .94], [.7, .96], [.8, .98], [.9, .99], [1, 1]];

function fm(x, d) {
  if (x === null || x === undefined || !isFinite(x)) return '–';
  const v = Math.abs(x);
  if (d === undefined) d = v >= 1000 ? 0 : v >= 100 ? 1 : v >= 10 ? 2 : v >= 1 ? 3 : 4;
  return x.toLocaleString('ko-KR', {
    maximumFractionDigits: d
  });
}

function keOf(a) {
  if (!isFinite(a) || a <= 0) return KE[0][1];
  if (a >= 1) return 1;
  if (a <= KE[0][0]) return KE[0][1];
  for (let i = 1; i < KE.length; i++) if (a <= KE[i][0]) {
    const [x0, y0] = KE[i - 1],
      [x1, y1] = KE[i];
    return y0 + (y1 - y0) * (a - x0) / (x1 - x0);
  }
  return 1;
}

function gearSizes(mk) {
  return mk === 'ATG1' || mk === 'ATG2' ? ATG.sz.slice() : HD[mk] ? Object.keys(HD[mk]).map(Number) : [];
}

function gearRatios(mk, sz) {
  if (mk === 'ATG1') return Object.keys(ATG.t1).map(Number);
  if (mk === 'ATG2') return Object.keys(ATG.t2).map(Number);
  return HD[mk] ? Object.keys(HD[mk][sz].r).map(Number) : [];
}

function resolveGear(mk, sz, rt, etaR, man) {
  if (mk === 'manual') return {
    kind: 'man',
    label: '직접입력 감속기',
    ig: man.ig,
    J: man.J * 1e-4,
    eff: man.eff,
    lim: {
      peak: man.peak,
      avg: man.avg,
      nmax: man.nmax,
      navg: man.navg
    },
    src: null
  };
  if (mk === 'ATG1' || mk === 'ATG2') {
    const one = mk === 'ATG1',
      TT = one ? ATG.t1 : ATG.t2;
    if (!TT[rt]) rt = +Object.keys(TT)[0];
    let i = ATG.sz.indexOf(+sz);
    if (i < 0) {
      i = 0;
      sz = ATG.sz[0];
    }
    const T = TT[rt][i],
      J = (one ? ATG.j1 : ATG.j2)[rt][i],
      R = ATG.rpm[sz];
    return {
      kind: 'atg',
      label: `ATG KSB${sz} ${one ? '1단' : '2단'} · i=${rt}`,
      ig: +rt,
      J: J * 1e-4,
      eff: one ? .97 : .94,
      rated: T,
      lim: {
        peak: T * 3,
        avg: T,
        inst: T * 3,
        nmax: R[0],
        navg: R[1]
      },
      src: mk,
      spec: `정격 출력토크 ${T} Nm · 순간최대 ${T * 3} Nm(정격×3) · 관성 ${J}×10⁻⁴ · 효율 ${one ? '≥97' : '≥94'}%`
    };
  }
  const S = HD[mk];
  if (!S[sz]) sz = +Object.keys(S)[0];
  const g = S[sz];
  if (!g.r[rt]) rt = +Object.keys(g.r)[0];
  const v = g.r[rt];
  return {
    kind: 'hd',
    label: `하모닉 ${mk} 형번${sz} · i=${rt}`,
    ig: +rt,
    J: g.J * 1e-4,
    etaR: etaR,
    rated: v[0],
    lim: {
      peak: v[1],
      avg: v[2],
      rated: v[0],
      inst: v[3],
      nmax: g.n[0],
      navg: g.n[1]
    },
    src: mk,
    spec: `정격 ${v[0]} / 기동정지피크 ${v[1]} / 평균부하최대 ${v[2]} / 순간최대 ${v[3]} Nm · 관성 ${g.J}×10⁻⁴`
  };
}

function gearEff(g, T) {
  return g.kind === 'hd' ? Math.max(.05, keOf(Math.abs(T) / g.rated) * g.etaR) : g.eff;
}

function calc(P) {
  const th = P.theta * Math.PI / 180,
    cyc = P.ta + P.tc + P.td + P.tw;
  const dn = P.tc + (P.ta + P.td) / 2,
    w = dn > 0 ? th / dn : 0;
  const aa = P.ta > 0 ? w / P.ta : 0,
    ad = P.td > 0 ? w / P.td : 0;
  const Jcm = P.shape === 'disk' ? .5 * P.m * Math.pow(P.r / 1000, 2) : P.shape === 'rect' ? P.m * (Math.pow(P.ra / 1000, 2) + Math.pow(P.rb / 1000, 2)) / 12 : P.jd * 1e-4;
  const e = P.e / 1000,
    J = Jcm + P.m * e * e;
  const Tg = P.orient === 'v' ? P.m * GRAV * e : 0,
    Tf = P.tf;
  const T1 = J * aa + Tg + Tf,
    T2 = Tg + Tf,
    T3 = J * ad + Tg + Tf,
    Th = P.hold ? Tg : 0;
  const direct = P.drive === 'direct';
  const ib = direct ? 1 : P.drive === 'belt11' ? 1 : P.d1 > 0 ? P.d2 / P.d1 : 1;
  const eb = direct ? 1 : P.eb;
  const d2eff = P.drive === 'belt11' ? P.d1 : P.d2;
  const jp1 = direct ? 0 : .5 * P.mp1 * Math.pow(P.d1 / 2000, 2);
  const jp2 = direct ? 0 : .5 * P.mp2 * Math.pow(d2eff / 2000, 2);
  const toG = (T, a) => (T + jp2 * a) / (ib * eb) + jp1 * a * ib;
  const G1 = toG(T1, aa),
    G2 = toG(T2, 0),
    G3 = toG(T3, ad),
    Gh = toG(Th, 0);
  const Gpk = Math.max(G1, G3),
    Grms = Math.sqrt((G1 * G1 * P.ta + G2 * G2 * P.tc + G3 * G3 * P.td + Gh * Gh * P.tw) / (cyc || 1));
  const g = resolveGear(P.gmk, P.gsz, P.grt, P.etaR, P.gman),
    ig = g.ig,
    Jg = g.J;
  const Jm = (P.brake && !P.mo.man ? P.mo.Jb : P.mo.J) * 1e-4;
  const e1 = gearEff(g, G1),
    e2 = gearEff(g, G2),
    e3 = gearEff(g, G3),
    eh = gearEff(g, Gh);
  const toM = (Gx, a, ef) => (ig > 0 ? Gx / (ig * ef) : 0) + (Jm + Jg) * a * ib * ig;
  const M1 = toM(G1, aa, e1),
    M2 = toM(G2, 0, e2),
    M3 = toM(G3, ad, e3),
    Mh = toM(Gh, 0, eh);
  const Mpk = Math.max(M1, M3),
    Mrms = Math.sqrt((M1 * M1 * P.ta + M2 * M2 * P.tc + M3 * M3 * P.td + Mh * Mh * P.tw) / (cyc || 1));
  const Jref = ((J + jp2) / (ib * ib) + jp1) / (ig * ig) + Jg,
    ratio = Jm > 0 ? Jref / Jm : Infinity;
  const N = w * 60 / (2 * Math.PI) * ib * ig,
    Na = th * ib * ig / (cyc || 1) * 60 / (2 * Math.PI);
  let est = null;
  if (P.estop && P.te > 0) {
    const ae = w / P.te,
      Te = J * ae + Tg + Tf;
    est = {
      ae,
      Te,
      G: toG(Te, ae)
    };
  }
  const mo = P.mo,
    sf = P.sf,
    D = {
      J,
      Jcm,
      Tg,
      w,
      aa,
      ad,
      ib,
      jp1,
      jp2,
      eb,
      cyc,
      e1,
      e2,
      e3,
      eh,
      Jm,
      Jg,
      ig,
      Jref
    };
  const items = [];
  const add = (k, name, need, allow, unit, useSf, det) => {
    const req = useSf ? need * sf : need;
    items.push({
      k,
      name,
      need,
      req,
      allow,
      unit,
      useSf,
      margin: allow / req - 1,
      det
    });
  };
  add('Mpk', '모터 최대토크', Mpk, mo.mx, 'Nm', true, P.light ? 0 : {
    used: [`J = ${fm(J)} kg·m²`, `αa = ${fm(aa)} rad/s²`, `Tg = ${fm(Tg)} Nm`, `i_b = ${fm(ib)}`, `i_g = ${ig}`, `ηg(가속) = ${fm(e1, 3)}`, `Jm+Jg = ${fm((Jm + Jg) * 1e4)}×10⁻⁴`],
    f: 'M₁ = G₁ /(i_g·ηg) + (Jm+Jg)·αa·i_b·i_g    ,   M_pk = max(M₁, M₃)',
    s: `G₁ = ${fm(G1)} Nm\nM₁ = ${fm(G1)}/(${ig}×${fm(e1, 3)}) + ${fm((Jm + Jg) * 1e4)}×10⁻⁴×${fm(aa)}×${fm(ib)}×${ig}\n   = ${fm(G1 / (ig * e1))} + ${fm((Jm + Jg) * aa * ib * ig)} = ${fm(M1)} Nm\nM₃ = ${fm(M3)} Nm  →  M_pk = ${fm(Mpk)} Nm`
  });
  add('Mrms', '모터 RMS토크', Mrms, mo.rt, 'Nm', true, P.light ? 0 : {
    used: [`M₁ = ${fm(M1)}`, `M₂ = ${fm(M2)}`, `M₃ = ${fm(M3)}`, `M_hold = ${fm(Mh)} Nm`, `ta/tc/td/tw = ${P.ta}/${P.tc}/${P.td}/${P.tw} s`],
    f: 'M_rms = √[ (M₁²·ta + M₂²·tc + M₃²·td + M_hold²·tw) / t_cycle ]',
    s: `= √[ (${fm(M1)}²×${P.ta} + ${fm(M2)}²×${P.tc} + ${fm(M3)}²×${P.td} + ${fm(Mh)}²×${P.tw}) / ${fm(cyc, 2)} ]\n= ${fm(Mrms)} Nm` + (P.hold ? '\n※ 휴지 중 서보 위치유지 ON → 중력토크가 휴지구간에도 포함됨' : '\n※ 휴지 중 서보 위치유지 OFF(기계 브레이크 가정)')
  });
  add('jratio', '이너샤비', ratio, mo.jr, '배', false, P.light ? 0 : {
    used: [`J = ${fm(J)}`, `Jp2 = ${fm(jp2)}`, `Jp1 = ${fm(jp1)} kg·m²`, `i_b = ${fm(ib)}`, `i_g = ${ig}`, `Jg = ${fm(Jg * 1e4)}×10⁻⁴`, `Jm = ${fm(Jm * 1e4)}×10⁻⁴ kg·m²`],
    f: 'J_ref = [ (J + Jp2)/i_b² + Jp1 ] / i_g² + Jg    ,   이너샤비 = J_ref / Jm',
    s: `J_ref = [ (${fm(J)} + ${fm(jp2)})/${fm(ib)}² + ${fm(jp1)} ] / ${ig}² + ${fm(Jg)}\n      = ${fm(Jref)} kg·m²\n이너샤비 = ${fm(Jref)} / ${fm(Jm)} = ${fm(ratio, 2)} 배`
  });
  add('Nmot', '모터 최대회전수', N, mo.rmx, 'rpm', false, P.light ? 0 : {
    used: [`ω = ${fm(w)} rad/s`, `i_b = ${fm(ib)}`, `i_g = ${ig}`],
    f: 'N = ω × 60/2π × i_b × i_g',
    s: `ω = θ/(tc+(ta+td)/2) = ${fm(th)}/(${P.tc}+(${P.ta}+${P.td})/2) = ${fm(w)} rad/s\nN = ${fm(w)}×9.5493×${fm(ib)}×${ig} = ${fm(N, 0)} rpm`
  });
  if (g.kind === 'hd') {
    add('Gpk', '감속기 기동정지 피크토크', Gpk, g.lim.peak, 'Nm', true, P.light ? 0 : {
      used: [`T₁ = ${fm(T1)} Nm(부하축)`, `Jp2·αa = ${fm(jp2 * aa)}`, `i_b = ${fm(ib)}`, `ηb = ${fm(eb, 3)}`],
      f: 'G₁ = (T₁ + Jp2·αa)/(i_b·ηb) + Jp1·αa·i_b   ,   G_pk = max(G₁, G₃)',
      s: `G₁ = (${fm(T1)} + ${fm(jp2 * aa)})/(${fm(ib)}×${fm(eb, 3)}) + ${fm(jp1 * aa * ib)} = ${fm(G1)} Nm\nG₃ = ${fm(G3)} Nm  →  G_pk = ${fm(Gpk)} Nm\n허용 = 기동·정지시의 허용피크토크 ${g.lim.peak} Nm (카탈로그)`
    });
    add('Grms', '감속기 평균부하토크', Grms, g.lim.avg, 'Nm', true, P.light ? 0 : {
      used: [`G₁ = ${fm(G1)}`, `G₂ = ${fm(G2)}`, `G₃ = ${fm(G3)}`, `G_hold = ${fm(Gh)} Nm`],
      f: 'G_rms = √[ (G₁²·ta + G₂²·tc + G₃²·td + G_hold²·tw) / t_cycle ]',
      s: `= ${fm(Grms)} Nm\n허용 = 평균부하토크의 허용최대치 ${g.lim.avg} Nm (카탈로그)`
    });
    add('Grated', '감속기 연속 정격토크', G2, g.lim.rated, 'Nm', true, P.light ? 0 : {
      used: [`정속구간 부하축 토크 T₂ = Tg + Tf = ${fm(T2)} Nm`, `i_b = ${fm(ib)}`, `ηb = ${fm(eb, 3)}`],
      f: 'G₂ = T₂ /(i_b·ηb)',
      s: `G₂ = ${fm(T2)}/(${fm(ib)}×${fm(eb, 3)}) = ${fm(G2)} Nm\n허용 = 입력 2000r/min시의 정격토크 ${g.lim.rated} Nm (카탈로그)`
    });
  } else {
    add('Gpk', '감속기 최대 출력토크', Gpk, g.lim.peak, 'Nm', true, P.light ? 0 : {
      used: [`T₁ = ${fm(T1)} Nm(부하축)`, `Jp2·αa = ${fm(jp2 * aa)}`, `i_b = ${fm(ib)}`, `ηb = ${fm(eb, 3)}`],
      f: 'G₁ = (T₁ + Jp2·αa)/(i_b·ηb) + Jp1·αa·i_b   ,   G_pk = max(G₁, G₃)',
      s: `G₁ = (${fm(T1)} + ${fm(jp2 * aa)})/(${fm(ib)}×${fm(eb, 3)}) + ${fm(jp1 * aa * ib)} = ${fm(G1)} Nm\nG₃ = ${fm(G3)} Nm  →  G_pk = ${fm(Gpk)} Nm` + (g.kind === 'atg' ? `\n허용 = 정격 출력토크 ${g.rated} Nm × 3 = ${g.lim.peak} Nm (카탈로그)` : '')
    });
    add('Grms', '감속기 평균 출력토크', Grms, g.lim.avg, 'Nm', true, P.light ? 0 : {
      used: [`G₁ = ${fm(G1)}`, `G₂ = ${fm(G2)}`, `G₃ = ${fm(G3)}`, `G_hold = ${fm(Gh)} Nm`],
      f: 'G_rms = √[ (G₁²·ta + G₂²·tc + G₃²·td + G_hold²·tw) / t_cycle ]',
      s: `= ${fm(Grms)} Nm` + (g.kind === 'atg' ? `\n허용 = 정격 출력토크 ${g.rated} Nm (카탈로그)` : '')
    });
  }
  add('Gnmax', '감속기 최고 입력회전수', N, g.lim.nmax, 'rpm', false, P.light ? 0 : {
    used: [`N = ${fm(N, 0)} rpm`],
    f: '감속기 입력회전수 = 모터 회전수',
    s: `${fm(N, 0)} rpm  vs  허용최고 입력회전속도 ${g.lim.nmax} rpm (카탈로그)`
  });
  add('Gnavg', '감속기 평균 입력회전수', Na, g.lim.navg, 'rpm', false, P.light ? 0 : {
    used: [`θ = ${P.theta}°`, `t_cycle = ${fm(cyc, 2)} s`, `i_b×i_g = ${fm(ib * ig, 2)}`],
    f: 'N_avg = θrad × i_b × i_g / t_cycle × 60/2π',
    s: `= ${fm(th)}×${fm(ib)}×${ig}/${fm(cyc, 2)}×9.5493 = ${fm(Na, 0)} rpm\nvs 허용평균 입력회전속도 ${g.lim.navg} rpm (카탈로그)`
  });
  if (est && g.lim.inst) {
    add('Ginst', '비상정지 순간토크', est.G, g.lim.inst, 'Nm', false, P.light ? 0 : {
      used: [`비상정지 시간 te = ${P.te} s`, `αe = ω/te = ${fm(est.ae)} rad/s²`, `J = ${fm(J)} kg·m²`],
      f: 'T_e = J·αe + Tg + Tf   →   G_e = (T_e + Jp2·αe)/(i_b·ηb) + Jp1·αe·i_b',
      s: `T_e = ${fm(J)}×${fm(est.ae)} + ${fm(Tg)} + ${fm(Tf)} = ${fm(est.Te)} Nm\nG_e = ${fm(est.G)} Nm\nvs 순간허용최대토크 ${g.lim.inst} Nm (카탈로그)`
    });
  }
  const margins = items.map(i => i.margin),
    min = Math.min(...margins);
  const lim = items[margins.indexOf(min)];
  return {
    P,
    g,
    mo,
    D,
    T: [T1, T2, T3, Th],
    Gv: [G1, G2, G3, Gh],
    Mv: [M1, M2, M3, Mh],
    Gpk,
    Grms,
    Mpk,
    Mrms,
    J,
    Jcm,
    Tg,
    ib,
    ig,
    ratio,
    N,
    Na,
    cyc,
    w,
    aa,
    ad,
    items,
    min,
    lim,
    est
  };
}

function evalP(P, k) {
  try {
    const c = calc({
        ...P,
        light: 1
      }),
      it = c.items.find(i => i.k === k);
    return {
      v: it ? it.margin : -99,
      min: c.min
    };
  } catch (err) {
    return {
      v: -99,
      min: -99
    };
  }
}

function remedyList(P, item) {
  const k = item.k,
    L = [],
    SER = ['ATG1', 'ATG2', 'CSF-2UH', 'CSG-2UH'];
  const push = (t, E, d) => L.push({
    t,
    E,
    d
  });
  const torqueM = ['Mpk', 'Mrms'].includes(k),
    gearT = ['Gpk', 'Grms', 'Grated', 'Ginst'].includes(k);
  const spdM = k === 'Nmot',
    spdG = ['Gnmax', 'Gnavg'].includes(k),
    inr = k === 'jratio';
  const nm = (mk, s) => mk.startsWith('ATG') ? `ATG KSB${s} ${mk === 'ATG1' ? '1단' : '2단'}` : `하모닉 ${mk} 형번${s}`;
  if (P.gmk !== 'manual') {
    let best = null;
    for (const r of gearRatios(P.gmk, P.gsz)) {
      if (r === P.grt) continue;
      const E = evalP({
        ...P,
        grt: r
      }, k);
      if (E.v >= 0 && (!best || E.v > best.E.v)) best = {
        r,
        E
      };
    }
    if (best) push(`감속비를 <b>${P.grt} → ${best.r}</b> 로 변경 (동일 제품)`, best.E, best.r > P.grt ? `감속비를 ${(best.r / P.grt).toFixed(2)}배로 올리면 모터토크는 약 1/${(best.r / P.grt).toFixed(2)}, 모터축 환산관성은 1/${Math.pow(best.r / P.grt, 2).toFixed(1)}로 줄어듭니다. 대신 모터 회전수가 ${(best.r / P.grt).toFixed(2)}배가 됩니다.` : `감속비를 낮추면 모터·감속기 입력회전수가 ${(P.grt / best.r).toFixed(2)}배 낮아집니다. 대신 모터 토크 부담이 커집니다.`);
  }
  if (P.gmk !== 'manual') {
    let found = null;
    for (const s of gearSizes(P.gmk)) {
      if (s === P.gsz) continue;
      const rr = gearRatios(P.gmk, s),
        rt = rr.includes(P.grt) ? P.grt : rr[0];
      const E = evalP({
        ...P,
        gsz: s,
        grt: rt
      }, k);
      if (E.v >= 0 && (!found || Math.abs(s - P.gsz) < Math.abs(found.s - P.gsz))) found = {
        s,
        rt,
        E
      };
    }
    if (found) push(`감속기 형번을 <b>${P.gmk.startsWith('ATG') ? 'KSB' + P.gsz + ' → KSB' + found.s : '형번 ' + P.gsz + ' → ' + found.s}</b>${found.rt !== P.grt ? ` (감속비 ${found.rt})` : ''} 로 변경`, found.E, spdG ? '형번이 작을수록 허용 입력회전수가 높습니다.' : found.s > P.gsz ? '형번을 올리면 허용토크가 크게 증가합니다. 관성·중량·설치공간도 함께 늘어납니다.' : '형번을 낮추면 관성이 줄어 이너샤비·회전수 조건에 유리합니다.');
  }
  {
    let alt = null;
    for (const mk of SER) for (const s of gearSizes(mk)) for (const r of gearRatios(mk, s)) {
      if (mk === P.gmk && s === P.gsz && r === P.grt) continue;
      const E = evalP({
        ...P,
        gmk: mk,
        gsz: s,
        grt: r
      }, k);
      if (E.min >= 0 && (!alt || E.min > alt.E.min)) alt = {
        mk,
        s,
        r,
        E
      };
    }
    if (alt) push(`감속기를 <b>${nm(alt.mk, alt.s)} · 감속비 ${alt.r}</b> 로 교체 <em>(전 계열 236조합 중 최적)</em>`, alt.E, alt.mk.startsWith('CS') ? '하모닉(파동치차)은 같은 외형 대비 허용토크가 크고 백래시가 작아 편심 부하에 유리합니다.' : 'ATG 유성감속기는 효율(≥94~97%)과 허용 입력회전수가 높습니다.');
  }
  if (torqueM || inr || spdM) {
    let found = null;
    for (const mo of MOTORS) {
      if (P.mo.man !== true && mo.n === P.mo.n) continue;
      const E = evalP({
        ...P,
        mo
      }, k);
      if (E.v >= 0 && (!found || mo.rt < found.mo.rt)) found = {
        mo,
        E
      };
    }
    if (found) push(`서보모터를 <b>${P.mo.n} → ${found.mo.n}</b> (${found.mo.W}W · 정격 ${found.mo.rt} / 최대 ${found.mo.mx} Nm)`, found.E, inr ? `로터 관성이 ${P.mo.J}→${found.mo.J}×10⁻⁴ kg·m² 로 커지고 허용 이너샤비도 ${found.mo.jr}배가 됩니다.` : `토크 여유가 커집니다. 관성 ${found.mo.J}×10⁻⁴ kg·m², 허용 이너샤비 ${found.mo.jr}배.`);else push('HG-KR 5기종 내에서는 모터 변경만으로 해결 불가', {
      v: -1,
      min: -1
    }, '감속비·벨트비를 함께 올리거나 상위 시리즈(HG-SR 중관성 등) 검토가 필요합니다.');
  }
  if (torqueM || gearT || spdM || spdG) {
    let hit = null;
    for (let kk = 1.1; kk <= 4.01; kk += .1) {
      const E = evalP({
        ...P,
        ta: P.ta * kk,
        td: P.td * kk
      }, k);
      if (E.v >= 0) {
        hit = {
          k: kk,
          E,
          ta: P.ta * kk,
          td: P.td * kk
        };
        break;
      }
    }
    if (hit) push(`가·감속 시간을 <b>${fm(P.ta, 2)}→${fm(hit.ta, 2)}s / ${fm(P.td, 2)}→${fm(hit.td, 2)}s</b> 로 연장 (${hit.k.toFixed(1)}배)`, hit.E, `각가속도 α가 1/${hit.k.toFixed(1)} 로 줄어 피크토크가 내려갑니다. 1사이클이 ${fm(P.ta + P.tc + P.td + P.tw, 2)}s → ${fm(hit.ta + P.tc + hit.td + P.tw, 2)}s 로 늘어납니다.`);
  }
  if (spdM || spdG || torqueM) {
    let hit = null;
    for (let kk = 1.2; kk <= 5.01; kk += .2) {
      const E = evalP({
        ...P,
        tc: P.tc * kk
      }, k);
      if (E.v >= 0) {
        hit = {
          E,
          tc: P.tc * kk
        };
        break;
      }
    }
    if (hit) push(`정속 시간을 <b>${fm(P.tc, 2)}→${fm(hit.tc, 2)}s</b> 로 연장 (회전 속도 저감)`, hit.E, '같은 각도를 더 천천히 돌면 ω가 낮아져 회전수·가속토크가 함께 내려갑니다.');
  }
  if (k === 'Mrms' || k === 'Grms') {
    let hit = null;
    for (let kk = 1.2; kk <= 6.01; kk += .2) {
      const E = evalP({
        ...P,
        tw: P.tw * kk
      }, k);
      if (E.v >= 0) {
        hit = {
          E,
          tw: P.tw * kk
        };
        break;
      }
    }
    if (hit) push(`휴지 시간을 <b>${fm(P.tw, 2)}→${fm(hit.tw, 2)}s</b> 로 연장`, hit.E, 'RMS(실효)토크는 1사이클 제곱평균이므로 휴지가 길수록 내려갑니다. 택트타임이 허용되는지 확인하십시오.');
  }
  if ((k === 'Mrms' || k === 'Grms') && P.hold) {
    push('휴지 중 <b>무여자 전자브레이크로 유지</b> (서보 위치유지 해제)', evalP({
      ...P,
      hold: false
    }, k), `정지 중 중력토크 ${fm(P.m * GRAV * P.e / 1000)} Nm 을 기계적으로 잡아 RMS 계산에서 제외됩니다. 브레이크 부착형(HG-KR□3B) 선정이 필요합니다.`);
  }
  if (P.orient === 'v' && P.e > 0 && (torqueM || gearT)) {
    let lo = 0,
      hi = P.e,
      ok = null;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (evalP({
        ...P,
        e: mid
      }, k).v >= 0) {
        lo = mid;
        ok = mid;
      } else hi = mid;
    }
    if (ok !== null && ok < P.e * 0.995) push(`편심량을 <b>${fm(P.e, 1)} → ${fm(ok, 1)} mm 이하</b>로 저감 (카운터웨이트)`, evalP({
      ...P,
      e: ok
    }, k), `중력토크 Tg = m·g·e 가 ${fm(P.m * GRAV * P.e / 1000)} → ${fm(P.m * GRAV * ok / 1000)} Nm 으로 줄어듭니다. 반대편 밸런스 웨이트로 무게중심을 회전중심에 맞추는 것이 가장 근본적인 대책입니다.`);
  }
  if (P.drive === 'belt') {
    let best = null;
    for (const b of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5]) {
      const E = evalP({
        ...P,
        d2: P.d1 * b
      }, k);
      if (E.v >= 0 && (!best || E.v > best.E.v)) best = {
        b,
        E
      };
    }
    if (best && Math.abs(best.b - P.d2 / P.d1) > .01) push(`벨트비를 <b>${fm(P.d2 / P.d1, 2)} → ${best.b}</b> 로 변경 (D2 = ${fm(P.d1 * best.b, 0)} mm)`, best.E, '벨트비도 감속비처럼 작동합니다. 감속기·모터를 바꾸지 않고 조정할 수 있는 가장 저렴한 수단입니다. 축간거리·벨트 길이를 함께 확인하십시오.');
  }
  if (item.useSf && item.allow / item.need > 1) {
    const maxSf = item.allow / item.need;
    push(`안전계수를 <b>Sf ${fm(P.sf, 2)} → ${fm(maxSf, 2)} 미만</b>으로 재검토`, {
      v: 0,
      min: NaN
    }, `이 항목만 보면 Sf ${fm(maxSf, 2)} 미만에서 통과합니다. 다만 안전계수 하향은 최후의 수단이며, 부하 변동·마찰 증가·경년 열화를 감안해 1.2 이상은 유지하는 것을 권장합니다.`);
  }
  if (inr || torqueM) {
    push('부하 관성 자체를 저감 (치구 경량화 · 외경 축소)', null, `J = Jcm + m·e² 이며 원판은 Jcm = ½mr² 이므로 <b>외경이 제곱으로</b> 기여합니다. 반경을 10% 줄이면 관성이 약 19% 감소하고, 알루미늄·중공 구조로 질량을 줄이면 중력토크까지 함께 내려갑니다.`);
  }
  return L;
}


const GRAV=9.80665;
function __safeJson(value){
  return JSON.stringify(value,function(_k,v){
    if(typeof v==='number'&&!isFinite(v)) return v===Infinity?'Infinity':v===-Infinity?'-Infinity':'NaN';
    return v;
  });
}
function __normalizeP(P){
  if(P.motorId&&P.motorId!=='manual'){
    const found=MOTORS.find(function(m){return m.n===P.motorId;});
    if(!found) throw new Error('지원하지 않는 모터입니다: '+P.motorId);
    P.mo=found;
  }else if(P.motorId==='manual'&&P.manualMotor){
    P.mo=Object.assign({n:'직접입력 모터',man:true},P.manualMotor);
  }
  if(!P.mo) throw new Error('모터 정보가 필요합니다.');
  return P;
}
function eccentricCatalogJSON(){
  const gearOptions={};
  ['ATG1','ATG2','CSF-2UH','CSG-2UH'].forEach(function(mk){
    gearOptions[mk]=gearSizes(mk).map(function(size){return {size:size,ratios:gearRatios(mk,size)};});
  });
  return __safeJson({motors:MOTORS,gearOptions:gearOptions});
}
function eccentricCalculateJSON(payload){
  const P=__normalizeP(JSON.parse(payload));
  const result=calc(P);
  result.items.forEach(function(item){
    item.remedies=item.margin<0.3?remedyList(P,item):[];
  });
  return __safeJson(result);
}
function eccentricSearchJSON(payload){
  const P=__normalizeP(JSON.parse(payload)),rows=[];
  const series=['ATG1','ATG2','CSF-2UH','CSG-2UH'];
  for(const mk of series) for(const sz of gearSizes(mk)) for(const rt of gearRatios(mk,sz)) for(let mi=0;mi<MOTORS.length;mi++){
    const q=Object.assign({},P,{gmk:mk,gsz:sz,grt:rt,mo:MOTORS[mi]});
    let c; try{c=calc(Object.assign({},q,{light:1}));}catch(_err){continue;}
    rows.push({mk:mk,sz:sz,rt:rt,mo:MOTORS[mi],min:c.min,lim:c.lim.name,Mpk:c.Mpk,Mrms:c.Mrms,ratio:c.ratio,N:c.N});
  }
  rows.sort(function(a,b){return b.min-a.min;});
  const safe=rows.filter(function(x){return x.min>=.3;}).sort(function(a,b){return a.mo.rt-b.mo.rt||a.sz-b.sz||a.min-b.min;});
  return __safeJson({best:safe[0]||null,safeCount:safe.length,totalCount:rows.length,rows:rows.slice(0,30)});
}
