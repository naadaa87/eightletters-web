/* 여덟글자 계산 엔진 — saju.js
   년주: 입춘(태양 황경 315°) 기준 · 월주: 12절 기준(오호둔) · 일주: 율리우스 적일 (JDN+49)%60 · 시주: 오자둔(조자시)
   외부 자료 없이 브라우저 안에서 전부 계산합니다. */

export const STEMS  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const STEMS_KR = ['갑','을','병','정','무','기','경','신','임','계'];
export const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
export const BRANCHES_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
export const ELEMENTS = ['목','화','토','금','수'];
export const ELEMENTS_HANJA = ['木','火','土','金','水'];
const STEM_EL = [0,0,1,1,2,2,3,3,4,4];
const BRANCH_EL = {子:4,丑:2,寅:0,卯:0,辰:2,巳:1,午:1,未:2,申:3,酉:3,戌:2,亥:4};

export const TERM_NAMES = ['춘분','청명','곡우','입하','소만','망종','하지','소서','대서','입추','처서','백로','추분','한로','상강','입동','소설','대설','동지','소한','대한','입춘','우수','경칩'];
export const TERM_HANJA = ['春分','淸明','穀雨','立夏','小滿','芒種','夏至','小暑','大暑','立秋','處暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒','立春','雨水','驚蟄'];

/* ── 천문 ─────────────────────────────── */
function jdUT(y, mo, d, h = 0, mi = 0) {
  let Y = y, M = mo;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5 + (h + mi / 60) / 24;
}
function sunLon(jd) { // 태양 황경(°), 저정밀 근사 (오차 ≈ 0.01°)
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  const lam = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return ((lam % 360) + 360) % 360;
}
const KST = 9 / 24;
function jdKST(y, mo, d, h = 0, mi = 0) { return jdUT(y, mo, d, h, mi) - KST; }

function findTerm(targetLon, approxJd) { // 목표 황경 통과 시각(JD, UT) 이분 탐색
  const diff = jd => (((sunLon(jd) - targetLon) % 360) + 540) % 360 - 180;
  let lo = approxJd - 20, hi = approxJd + 20;
  while (diff(lo) > 0) lo -= 10;
  while (diff(hi) < 0) hi += 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
function jdToKSTDate(jd) {
  const z = jd + KST + 0.5;
  let A = Math.floor(z);
  const F = z - A;
  if (A >= 2299161) { const a = Math.floor((A - 1867216.25) / 36524.25); A += 1 + a - Math.floor(a / 4); }
  const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E);
  const mo = E < 14 ? E - 1 : E - 13;
  const y = mo > 2 ? C - 4716 : C - 4715;
  const hf = F * 24, h = Math.floor(hf), mi = Math.round((hf - h) * 60);
  return { y, mo, d: day, h, mi };
}

/* ── 기둥 ─────────────────────────────── */
export function dayPillarIndex(y, mo, d) {
  const jdn = Math.round(jdUT(y, mo, d, 12));
  return ((jdn + 49) % 60 + 60) % 60;
}
export function yearPillarIndex(y, mo, d, h = 12, mi = 0) {
  const t = jdKST(y, mo, d, h, mi);
  const ipchun = findTerm(315, jdUT(y, 2, 4, 12));
  const sy = t >= ipchun ? y : y - 1;
  return { idx: ((sy - 4) % 60 + 60) % 60, sajuYear: sy };
}
export function monthPillarIndex(y, mo, d, h = 12, mi = 0, yearStem = null) {
  const lam = sunLon(jdKST(y, mo, d, h, mi));
  const branch = (Math.floor((((lam - 315) % 360) + 360) % 360 / 30) + 2) % 12;
  const ys = yearStem ?? yearPillarIndex(y, mo, d, h, mi).idx % 10;
  const start = [2, 4, 6, 8, 0][ys % 5]; // 오호둔: 인월 천간
  const stem = (start + ((branch - 2 + 12) % 12)) % 10;
  return { stem, branch };
}
export function hourPillarIndex(dayStem, h) {
  const branch = Math.floor(((h + 1) % 24) / 2);
  const start = [0, 2, 4, 6, 8][dayStem % 5]; // 오자둔: 자시 천간
  return { stem: (start + branch) % 10, branch };
}

export function fourPillars(y, mo, d, h = null) {
  const dst = h != null && isDST(y, mo, d);
  if (dst) h = (h + 23) % 24;   // 시계 시각 → 실제 표준시 (한 시간 앞당김의 역보정)
  const hh = h == null ? 12 : h;
  const yp = yearPillarIndex(y, mo, d, hh);
  const mp = monthPillarIndex(y, mo, d, hh, 0, yp.idx % 10);
  const di = dayPillarIndex(y, mo, d);
  const pillars = {
    year:  { stem: yp.idx % 10, branch: yp.idx % 12 },
    month: mp,
    day:   { stem: di % 10, branch: di % 12 },
    hour:  h == null ? null : hourPillarIndex(di % 10, h)
  };
  const count = [0, 0, 0, 0, 0];
  for (const k of ['year', 'month', 'day', 'hour']) {
    const p = pillars[k];
    if (!p) continue;
    count[STEM_EL[p.stem]]++;
    count[BRANCH_EL[BRANCHES[p.branch]]]++;
  }
  return { pillars, count, dst };
}

/* ── 절기 ─────────────────────────────── */
export function termInfo(y, mo, d) {
  const now = jdKST(y, mo, d, 12);
  const lam = sunLon(now);
  const prevIdx = Math.floor(lam / 15) % 24;
  const nextIdx = (prevIdx + 1) % 24;
  const nextLon = (nextIdx * 15) % 360;
  const approx = now + ((((nextLon - lam) % 360) + 360) % 360) / 0.9856;
  const nt = jdToKSTDate(findTerm(nextLon, approx));
  const prevLon = prevIdx * 15;
  const pt = jdToKSTDate(findTerm(prevLon, now - ((((lam - prevLon) % 360) + 360) % 360) / 0.9856));
  const days = Math.round(jdUT(nt.y, nt.mo, nt.d) - jdUT(y, mo, d));
  return {
    current: { name: TERM_NAMES[prevIdx], hanja: TERM_HANJA[prevIdx], ...pt },
    next: { name: TERM_NAMES[nextIdx], hanja: TERM_HANJA[nextIdx], ...nt, daysLeft: days }
  };
}
export function ipchunTime(year) { return jdToKSTDate(findTerm(315, jdUT(year, 2, 4, 12))); }

/* ── 십성 ─────────────────────────────── */
export const TEN_GODS = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
export function tenGod(myStem, otherStem) {
  const a = STEM_EL[myStem], b = STEM_EL[otherStem];
  const same = (myStem % 2) === (otherStem % 2);
  let base;
  if (b === a) base = 0;
  else if (b === (a + 1) % 5) base = 2;
  else if (b === (a + 2) % 5) base = 4;
  else if (b === (a + 3) % 5) base = 6;
  else base = 8;
  return base + (same ? 0 : 1);
}

/* ── 표기 ─────────────────────────────── */
export const fmt = {
  gz: (s, b) => STEMS[s] + BRANCHES[b],
  gzKr: (s, b) => STEMS_KR[s] + BRANCHES_KR[b],
  stemEl: s => STEM_EL[s],
  branchEl: b => BRANCH_EL[BRANCHES[b]],
};
export function todayInfo(date = new Date()) {
  const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
  const di = dayPillarIndex(y, mo, d);
  const stem = di % 10, branch = di % 12;
  return {
    y, mo, d, dow: date.getDay(),
    stem, branch,
    gz: fmt.gz(stem, branch), gzKr: fmt.gzKr(stem, branch),
    el: STEM_EL[stem],
    term: termInfo(y, mo, d)
  };
}
export function dateKey(y, mo, d) { return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

/* ── 서머타임 (한국 일광절약시간제, KST) — 진단 B-11 ── */
const DST = [
  [19480601,19480912],[19490403,19490910],[19500401,19500909],[19510506,19510908],
  [19550505,19550908],[19560520,19560929],[19570505,19570921],[19580504,19580920],
  [19590503,19590919],[19600501,19600917],[19870510,19871010],[19880508,19881008],
];
export function isDST(y, mo, d) {
  const t = y * 10000 + mo * 100 + d;
  return DST.some(([a, b]) => t >= a && t <= b);
}

/* ══════════ 궁합 · 시간 확장 (기획서 부록 B) ══════════ */

/* 지지 관계 — 검사 순서: 육합→삼합→방합→충→형→파→해→원진 (기획서 B-1)
   특례: 인해·사신은 합 우선(순서상 자동), 자미·축오는 원진으로 읽음 */
const IN = (set, a, b) => set.includes(a + b) || set.includes(b + a);
const SETS = {
  yukhap: ['子丑','寅亥','卯戌','辰酉','巳申','午未'],
  chung:  ['子午','丑未','寅申','卯酉','辰戌','巳亥'],
  pa:     ['子酉','丑辰','寅亥','卯午','巳申','戌未'],
  hae:    ['子未','丑午','寅巳','卯辰','申亥','酉戌'],
  wonjin: ['子未','丑午','寅酉','卯申','辰亥','巳戌'],
};
const SAMHAP = [['寅','午','戌'],['巳','酉','丑'],['申','子','辰'],['亥','卯','未']];
const BANGHAP = [['寅','卯','辰'],['巳','午','未'],['申','酉','戌'],['亥','子','丑']];
const HYEONG = ['寅巳','巳申','丑戌','戌未','子卯','辰辰','午午','酉酉','亥亥'];

export function branchRelation(b1, b2) { // b1,b2: 지지 index
  const A = BRANCHES[b1], B = BRANCHES[b2];
  if (IN(['子未','丑午'], A, B)) return 'wonjin'; // 특례 (기획서 B-2)
  if (IN(SETS.yukhap, A, B)) return 'yukhap';
  if (b1 !== b2 && SAMHAP.some(t => t.includes(A) && t.includes(B))) return 'samhap';
  if (b1 !== b2 && BANGHAP.some(t => t.includes(A) && t.includes(B))) return 'banghap';
  if (IN(SETS.chung, A, B)) return 'chung';
  if (IN(HYEONG, A, B) || (b1 === b2 && HYEONG.includes(A + B))) return 'hyeong';
  if (IN(SETS.pa, A, B)) return 'pa';
  if (IN(SETS.hae, A, B)) return 'hae';
  if (IN(SETS.wonjin, A, B)) return 'wonjin';
  return null; // 무관
}
export const REL_KIND = { yukhap:'붙는', samhap:'같은 곳을 보는', banghap:'같은 계절의', chung:'마주 서는', hyeong:'같은 자리에서 걸리는', pa:'조금 어긋나는', hae:'서운함이 쌓이는', wonjin:'이유 없이 신경 쓰이는' };
export const REL_HANJA = { yukhap:'六合', samhap:'三合', banghap:'方合', chung:'沖', hyeong:'刑', pa:'破', hae:'害', wonjin:'怨嗔' };
const HAP_SET = ['yukhap','samhap','banghap'];

export function stemHap(s1, s2) { // 천간합: 갑기 을경 병신 정임 무계
  return (s1 % 5) === (s2 % 5) && s1 !== s2 && Math.abs(s1 - s2) === 5;
}
export function stemRelation(s1, s2) {
  if (stemHap(s1, s2)) return 'hap';
  const a = STEM_EL[s1], b = STEM_EL[s2];
  if (a === b) return 'same';
  if ((a + 1) % 5 === b || (b + 1) % 5 === a) return 'saeng';
  return 'geuk';
}

/* A-01 기상 판정표 */
export function coupleWeather(dayA, dayB) { // day pillar {stem,branch} 둘
  const br = branchRelation(dayA.branch, dayB.branch);
  const brHap = HAP_SET.includes(br);
  const brClash = br === 'chung' || br === 'hyeong';
  const st = stemRelation(dayA.stem, dayB.stem);
  let state;
  if (brHap && st === 'hap') state = 'clear';
  else if (st === 'hap' && !brHap && !brClash) state = 'breeze';
  else if (brHap && st === 'geuk') state = 'drizzle';
  else if (brClash) state = 'gale';
  else if (brHap) state = 'clear';
  else state = 'mist';
  return { state, br, st };
}

/* A-04 오늘의 방향 */
export function tenGodDirection(tg) {
  if ([2,3,4,5].includes(tg)) return 'out';
  if ([6,7].includes(tg)) return 'hold';
  return 'in';
}

/* 오행 보완 (부록 B-4) */
export function elementComplement(countA, countB) {
  const fills = [], piles = [];
  for (let i = 0; i < 5; i++) {
    if (countA[i] === 0 && countB[i] >= 2) fills.push(i);
    if (countA[i] >= 3 && countB[i] >= 2) piles.push(i);
  }
  return { fills, piles };
}

/* 대운 — 양남음녀 순행 (만 나이 기준 근사) */
export function daeun(y, mo, d, h, gender) {
  const fp = fourPillars(y, mo, d, h ?? 12);
  const yearStemYang = fp.pillars.year.stem % 2 === 0;
  const forward = (yearStemYang && gender === 'M') || (!yearStemYang && gender === 'F');
  const birthJd = jdKST(y, mo, d, h ?? 12);
  const lam = sunLon(birthJd);
  const JEOL = [315,345,15,45,75,105,135,165,195,225,255,285];
  let target, approx;
  if (forward) {
    const nexts = JEOL.map(t => (((t - lam) % 360) + 360) % 360).map((dd,i)=>({dd:dd===0?360:dd,i}));
    const n = nexts.reduce((a,b)=>a.dd<b.dd?a:b);
    target = JEOL[n.i]; approx = birthJd + n.dd / 0.9856;
  } else {
    const prevs = JEOL.map(t => (((lam - t) % 360) + 360) % 360).map((dd,i)=>({dd:dd===0?360:dd,i}));
    const n = prevs.reduce((a,b)=>a.dd<b.dd?a:b);
    target = JEOL[n.i]; approx = birthJd - n.dd / 0.9856;
  }
  const days = Math.abs(findTerm(target, approx) - birthJd);
  const startAge = Math.max(1, Math.round(days / 3));
  const m = fp.pillars.month;
  const list = [];
  for (let k = 1; k <= 8; k++) {
    const idx60 = ((m.stem === undefined ? 0 : 0), 0);
    const stem = ((m.stem + (forward ? k : -k)) % 10 + 10) % 10;
    const branch = ((m.branch + (forward ? k : -k)) % 12 + 12) % 12;
    list.push({ stem, branch, fromAge: startAge + (k - 1) * 10, toAge: startAge + k * 10 - 1 });
  }
  return { startAge, forward, list };
}

/* 세운·월건 (올해의 지도용) — sajuYear의 열두 달 월건 */
export function yearMonths(sajuYear) {
  const yIdx = ((sajuYear - 4) % 60 + 60) % 60;
  const ys = yIdx % 10;
  const start = [2, 4, 6, 8, 0][ys % 5];
  const out = [];
  for (let i = 0; i < 12; i++) {
    out.push({ stem: (start + i) % 10, branch: (2 + i) % 12 });
  }
  return { yearStem: ys, yearBranch: yIdx % 12, months: out };
}

/* 올해 절기 24개 날짜 (입춘부터) */
export function termsOfYear(sajuYear) {
  const list = [];
  const base = jdUT(sajuYear, 2, 4, 12);
  for (let k = 0; k < 24; k++) {
    const lon = (315 + k * 15) % 360;
    const t = jdToKSTDate(findTerm(lon, base + k * 15.22));
    const idx = ((lon / 15) + 24) % 24;
    list.push({ name: TERM_NAMES[idx], hanja: TERM_HANJA[idx], lon, ...t });
  }
  return list;
}
export function seasonElOfTerm(lon) { // 절기 황경 → 계절 오행 (봄목 여름화 가을금 겨울수)
  if (lon >= 315 || lon < 45) return 0;
  if (lon < 135) return 1;
  if (lon < 225) return 3;
  return 4;
}
