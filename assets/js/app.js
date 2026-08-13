/* 여덟글자 공통 앱 유틸 — app.js
   저장은 전부 localStorage. 서버로 나가는 데이터가 없습니다. */
import { todayInfo, fourPillars, tenGod, TEN_GODS, fmt, STEMS, ELEMENTS, ELEMENTS_HANJA, dateKey } from './saju.js';
import { EL_THEME, WEATHER, TEN_GOD_DAY, TAROT, STEM_DEF, BADGES } from './content.js';

/* ── 저장 ─────────────────────────── */
const NS = 'el.';
/* 구버전 키(yeodeol.) 자동 이전 — 1회 */
try {
  if (!localStorage.getItem('el._migrated')) {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('yeodeol.')) {
        const nk = 'el.' + k.slice(8);
        if (localStorage.getItem(nk) == null) localStorage.setItem(nk, localStorage.getItem(k));
      }
    }
    localStorage.setItem('el._migrated', '1');
  }
} catch {}
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch {} },
};
export const getProfile = () => store.get('profile');
export const getMoods = () => store.get('moods', {});
export const getNotes = () => store.get('notes', {});

/* ── 데모 씨앗 (?demo=1, 데이터 없을 때만) ── */
export function maybeSeedDemo() {
  if (!location.search.includes('demo=1')) return;
  if (getProfile() || Object.keys(getMoods()).length) return;
  store.set('profile', { y: 1988, mo: 3, d: 26, h: 10, gender: 'F' });
  const t = todayInfo();
  const kinds = ['맑음','갬','흐림','맑음','비','갬','바람','맑음','흐림','갬','맑음','비'];
  const moods = {}, notes = {};
  let day = t.d, i = 0;
  while (i < kinds.length && day >= 1) {
    if (day % 5 !== 0) { moods[dateKey(t.y, t.mo, day)] = kinds[i]; i++; }
    day--;
  }
  notes[dateKey(t.y, t.mo, t.d - 1)] = ['작은 기회 하나를 봤다', '메모해 두었다', '내일 다시 보기'];
  notes[dateKey(t.y, t.mo, t.d - 3)] = ['말을 아꼈더니 편했다', '', ''];
  notes[dateKey(t.y - 1, t.mo, t.d)] = ['일 년 전의 나는 이 문장을 남겼다', '그때도 여름이었다', ''];
  store.set('moods', moods); store.set('notes', notes);
}

/* ── 오늘 컨텍스트 ─────────────────── */
export function getToday() {
  const t = todayInfo();
  const theme = EL_THEME[t.el];
  let mine = null;
  const p = getProfile();
  if (p) {
    const fp = fourPillars(p.y, p.mo, p.d, p.h ?? null);
    const rel = TEN_GODS[tenGod(fp.pillars.day.stem, t.stem)];
    mine = { ...p, fp, rel, relDay: TEN_GOD_DAY[rel], def: STEM_DEF[fp.pillars.day.stem], dayStem: fp.pillars.day.stem };
  }
  return { t, theme, mine };
}

/* ── 테마 적용 (오늘의 색) ─────────── */
export function applyTheme(theme) {
  const r = document.documentElement.style;
  r.setProperty('--el-pastel', theme.pastel);
  r.setProperty('--el-pasteldeep', theme.pastelDeep);
  r.setProperty('--el-deep', theme.deep);
  r.setProperty('--el-text', theme.text);
  r.setProperty('--el-g1', theme.grad[0]);
  r.setProperty('--el-g2', theme.grad[1]);
  r.setProperty('--el-g3', theme.grad[2]);
}

/* ── 리듬 계산 ─────────────────────── */
export function rhythm(mine) {
  const base = mine ? mine.relDay : { mood: 62, energy: 62 };
  const moods = getMoods();
  const t = todayInfo();
  const vals = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(t.y, t.mo - 1, t.d - i);
    const m = moods[dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate())];
    if (m) { const w = WEATHER.find(x => x.key === m); if (w) vals.push(w.mood); }
  }
  const logged = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const mood = logged == null ? base.mood : Math.round(base.mood * 0.45 + logged * 0.55);
  const energy = Math.round(base.energy * (logged == null ? 1 : 0.8) + (logged == null ? 0 : logged * 0.2));
  return { mood, energy, loggedDays: vals.length };
}

/* ── 통계 · 배지 ───────────────────── */
export function stats() {
  const moods = getMoods(), notes = getNotes();
  return {
    moodDays: Object.keys(moods).length,
    noteDays: Object.keys(notes).length,
    letterRead: store.get('letterRead', 0),
  };
}
export function earnedBadges() { const s = stats(); return BADGES.map(b => ({ ...b, on: b.test(s) })); }

export function monthStats(y, mo) {
  const moods = getMoods();
  const pfx = `${y}-${String(mo).padStart(2, '0')}-`;
  const list = Object.entries(moods).filter(([k]) => k.startsWith(pfx));
  const byKind = {}, byDow = [0,0,0,0,0,0,0];
  for (const [k, v] of list) {
    byKind[v] = (byKind[v] || 0) + 1;
    const d = new Date(k + 'T12:00:00');
    byDow[d.getDay()]++;
  }
  const top = Object.entries(byKind).sort((a, b) => b[1] - a[1])[0] || null;
  return { count: list.length, byKind, byDow, top };
}

/* ── 오늘의 타로 (날짜 시드) ────────── */
export function todayTarot() {
  const t = todayInfo();
  const seed = (t.y * 373 + t.mo * 31 + t.d * 7 + t.stem * 3 + t.branch) % TAROT.length;
  return { title: TAROT[seed][0], line: TAROT[seed][1] };
}

/* ── 링크 공유 코덱 (부록 E-3: 짧은 키 난독화, 서버 저장 없음) ── */
const XK = 'yeodeol-8';
function b64u(b){ return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64u(s){ s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '='; return atob(s); }
export function encodeShare(obj){
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  const k = new TextEncoder().encode(XK);
  return b64u(raw.map((v,i)=>v ^ k[i % k.length]));
}
export function decodeShare(str){
  try {
    const raw = Uint8Array.from(unb64u(str), c => c.charCodeAt(0));
    const k = new TextEncoder().encode(XK);
    return JSON.parse(new TextDecoder().decode(raw.map((v,i)=>v ^ k[i % k.length])));
  } catch { return null; }
}
export function shareLink(obj){ return `${location.origin}/share#${encodeShare(obj)}`; }
export async function copyShareLink(obj, msg='링크를 복사했어요 · 여는 사람은 여덟글자에서 보게 돼요'){
  const url = shareLink(obj);
  try {
    if (navigator.share) { await navigator.share({ title:'여덟글자', url }); toast('공유했어요'); return; }
  } catch {}
  try { await navigator.clipboard.writeText(url); toast(msg); }
  catch { prompt('이 링크를 복사하세요', url); }
}

/* ── 상대 저장 (A군 · 최대 3명 무료) ── */
export const getRelations = () => store.get('relations', []);
export function saveRelation(rel){
  const list = getRelations();
  if (!rel.id) rel.id = 'r' + Date.now().toString(36);
  const i = list.findIndex(x => x.id === rel.id);
  if (i >= 0) list[i] = rel; else {
    if (list.length >= 3) return { ok:false, reason:'무료로는 세 명까지 저장할 수 있어요' };
    list.push(rel);
  }
  store.set('relations', list);
  return { ok:true, id: rel.id };
}
export function removeRelation(id){ store.set('relations', getRelations().filter(x => x.id !== id)); }

/* ── 데이터 내보내기 · 가져오기 (전체 백업) ── */
const BK_KEYS = ['profile','relations','moods','notes','plans','actions','wish','gh.active','letterRead'];
export function exportAll() {
  const out = { app: 'yeodeol-8', v: 1, at: new Date().toISOString(), data: {} };
  for (const k of BK_KEYS) { const v = store.get(k, null); if (v !== null) out.data[k] = v; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  a.download = `여덟글자_백업_${out.at.slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('기록을 파일로 담았어요 · 기록은 당신 것이에요');
}
export async function importAll(file) {
  const obj = JSON.parse(await file.text());
  if (!obj || obj.app !== 'yeodeol-8' || obj.v !== 1) throw new Error('형식이 달라요');
  let n = 0;
  for (const [k, v] of Object.entries(obj.data)) if (BK_KEYS.includes(k)) { store.set(k, v); n++; }
  return n;
}

/* ── 결제 예고 · 관심 저장 (B-23) ── */
export function wirePayButtons(root = document) {
  root.querySelectorAll('.pay-btn').forEach(b => b.onclick = () => {
    const w = store.get('wish', {});
    const id = b.dataset.p || b.textContent.trim();
    if (!w[id]) { w[id] = Date.now(); store.set('wish', w); }
    toast('11월에 열어요 · 열리면 이 자리에서 알려 드릴게요');
  });
}

/* ── 인주 도장 SVG (C-22) ── */
export function sealSVG(chars, size = 84, color = '#B04B3F') {
  const two = chars.length > 1;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${chars} 인장">
    <rect x="5" y="5" width="90" height="90" rx="14" fill="none" stroke="${color}" stroke-width="5"/>
    <rect x="13" y="13" width="74" height="74" rx="8" fill="${color}" opacity=".07"/>
    ${two
      ? `<text x="50" y="42" text-anchor="middle" font-family="Noto Serif KR,serif" font-size="34" fill="${color}" font-weight="600">${chars[0]}</text>
         <text x="50" y="80" text-anchor="middle" font-family="Noto Serif KR,serif" font-size="34" fill="${color}" font-weight="600">${chars[1]}</text>`
      : `<text x="50" y="63" text-anchor="middle" font-family="Noto Serif KR,serif" font-size="46" fill="${color}" font-weight="600">${chars}</text>`}
  </svg>`;
}

/* ── 이미지 자산 ───────────────────── */
export const EL_IMG  = [0,1,2,3,4].map(i => `/assets/img/el-${i}.webp`);
export const ELC_IMG = [0,1,2,3,4].map(i => `/assets/img/elc-${i}.webp`);
const imgCache = {};
export function loadImage(src) {
  if (imgCache[src]) return imgCache[src];
  imgCache[src] = new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
  return imgCache[src];
}

/* ── 수채 SVG ─────────────────────── */
const MOTIF = {
  leaf: c => `<g fill="${c}" opacity=".9"><path d="M0 0c34-46 86-58 118-52-6 40-38 84-92 92C12 44 2 24 0 0z" transform="translate(46 118) rotate(-18)"/><path d="M0 0c26-36 66-44 90-40-4 30-28 64-70 70C10 34 2 18 0 0z" transform="translate(112 158) rotate(14) scale(.8)"/><path d="M60 210c8-60 26-104 58-142" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/></g>`,
  flame: c => `<g fill="${c}" opacity=".9"><path d="M92 12c26 34 44 58 44 92 0 38-28 66-62 66S12 142 12 104c0-26 12-46 28-64-2 18 4 30 16 36-4-26 10-46 36-64z" transform="translate(28 40)"/></g>`,
  mountain: c => `<g fill="${c}" opacity=".85"><path d="M0 150c30-64 58-102 84-118 22 30 34 52 44 74 16-14 26-20 40-24 20 26 30 46 38 68z" transform="translate(10 40)"/></g>`,
  moon: c => `<g opacity=".9"><circle cx="110" cy="110" r="62" fill="${c}"/><circle cx="134" cy="92" r="56" fill="rgba(255,255,255,.55)"/></g>`,
  wave: c => `<g stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"><path d="M8 90c24-24 48-24 72 0s48 24 72 0 40-20 52-8"/><path d="M8 132c24-24 48-24 72 0s48 24 72 0 40-20 52-8"/><path d="M30 174c20-20 40-20 60 0s40 20 60 0"/></g>`,
};
export function heroArt(theme) {
  const d = theme.deep, pd = theme.pastelDeep;
  return `<svg viewBox="0 0 900 420" preserveAspectRatio="xMaxYMax slice" width="100%" height="100%" aria-hidden="true">
    <defs>
      <filter id="wc" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="16"/>
        <feGaussianBlur stdDeviation="1.4"/>
      </filter>
      <radialGradient id="sun" cx="50%" cy="50%"><stop offset="0%" stop-color="#FCE9B8" stop-opacity=".95"/><stop offset="100%" stop-color="#FCE9B8" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="700" cy="86" r="86" fill="url(#sun)"/>
    <g filter="url(#wc)">
      <ellipse cx="760" cy="430" rx="420" ry="210" fill="${pd}" opacity=".55"/>
      <ellipse cx="520" cy="480" rx="460" ry="220" fill="${d}" opacity=".18"/>
      <ellipse cx="930" cy="470" rx="380" ry="190" fill="${d}" opacity=".28"/>
    </g>
    <g filter="url(#wc)" transform="translate(620 150) scale(1.05)">${MOTIF[theme.motif](d)}</g>
  </svg>`;
}
export function cardArt(motif, color, size = 88) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 220 220" aria-hidden="true">
    <defs><filter id="wc2"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="10"/><feGaussianBlur stdDeviation="1"/></filter></defs>
    <g filter="url(#wc2)">${MOTIF[motif](color)}</g></svg>`;
}

/* ── 헤더 · 푸터 · 탭바 렌더 ────────── */
export function renderChrome(active) {
  const p = getProfile();
  const meLabel = p ? `${p.y}. ${p.mo}. ${p.d}.` : '내 사주 만들기';
  document.querySelector('.site-head').innerHTML = `
    <div class="wrap">
      <a class="logo" href="/"><b>여덟글자</b><span>YEODEOL GEULJA</span></a>
      <nav class="gnav">
        <a href="/" ${active === 'home' ? 'aria-current="page"' : ''}>오늘의 색</a>
        <a href="/saju" ${active === 'saju' ? 'aria-current="page"' : ''}>내 사주</a>
        <a href="/gunghap" ${active === 'gh' ? 'aria-current="page"' : ''}>궁합</a>
        <a href="/time" ${active === 'time' ? 'aria-current="page"' : ''}>시간</a>
        <a href="/record" ${active === 'record' ? 'aria-current="page"' : ''}>기록</a>
      </nav>
      <a class="head-me" href="/saju"><span class="dot"></span>${meLabel}</a>
    </div>`;
  const foot = document.querySelector('.site-foot');
  if (foot) foot.innerHTML = `
    <div class="wrap" style="padding-top:0;padding-bottom:0;display:block;">
      <div class="prefoot">
        <img src="/assets/img/path.webp" alt="" loading="lazy">
        <div class="pf-txt"><b>사주를 보는 대신, 사주와 함께 살아갑니다</b>
          <span>매일의 색 하나, 감정 하나, 세 줄 하나면 충분해요</span></div>
      </div>
    </div>
    <div class="wrap">
      <div class="foot-brand"><b>여덟글자</b>
        <p>매일의 색과 감정으로 하루에 작은 의미를 더합니다.<br>사주를 보는 대신, 사주와 함께 살아가는 자리입니다.</p></div>
      <div><h5>하지 않는 것</h5><ul>
        <li>단정하지 않습니다 — 모든 문장은 관찰과 제안입니다</li>
        <li>불안을 팔지 않습니다 — 점수 · 등급 · 흉일이 없습니다</li>
        <li>기록을 함부로 다루지 않습니다 — 이 기기에만 저장됩니다</li></ul></div>
      <div><h5>계산 방식</h5><ul>
        <li>절기 — 태양 황경 직접 계산 (입춘 315°)</li>
        <li>일주 — 율리우스 적일 (JDN+49) % 60</li>
        <li>시주 — 오자둔 · 조자시 기준</li></ul></div>
      <div class="foot-note"><span>© 여덟글자 · yeodeol.kr</span><span>생년월일과 일기는 서버로 전송되지 않습니다 · 방문 통계 외에는 아무것도 수집하지 않아요</span></div>
    </div>`;
  const fx = document.getElementById('ftExport');
  if (fx) fx.onclick = () => exportAll();
  const tab = document.querySelector('.tabbar');
  if (tab) tab.innerHTML = ['home:/:홈', 'saju:/saju:사주', 'gh:/gunghap:궁합', 'time:/time:시간', 'record:/record:기록']
    .map(s => { const [k, href, label] = s.split(':');
      return `<a href="${href}" ${active === k ? 'aria-current="page"' : ''}>
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">${
          k === 'home' ? '<path d="M3 9.5 10 3l7 6.5V17h-4.5v-4h-5v4H3z"/>' :
          k === 'saju' ? '<circle cx="10" cy="10" r="7"/><path d="M10 3v14M3 10h14"/>' :
          k === 'gh' ? '<circle cx="7" cy="10" r="4"/><circle cx="13" cy="10" r="4"/>' :
          k === 'time' ? '<circle cx="10" cy="10" r="7"/><path d="M10 6v4.5l3 2"/>' :
          '<rect x="4" y="3" width="12" height="14" rx="2"/><path d="M7.5 7.5h5M7.5 10.5h5M7.5 13.5h3"/>'
        }</svg>${label}</a>`; }).join('');
}

/* ── 토스트 ───────────────────────── */
let toastT;
export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1900);
}

/* ── 공유 카드 (canvas 4:5, 수채 이미지 포함) ── */
export async function drawShareCard(canvas, { t, theme, mine }) {
  const W = 1080, H = 1350;
  canvas.width = W; canvas.height = H;
  const x = canvas.getContext('2d');
  x.fillStyle = '#FFFEFB'; x.fillRect(0, 0, W, H);
  const serif = '"Noto Serif KR","Noto Serif CJK KR",serif';
  const sans = '"Pretendard","Noto Sans KR","Noto Sans CJK KR",sans-serif';

  const IMG_H = 580;
  const im = await loadImage(EL_IMG[t.el]);
  if (im) {
    const scale = Math.max(W / im.width, IMG_H / im.height);
    const sw = im.width * scale, sh = im.height * scale;
    x.drawImage(im, (W - sw) / 2, -sh * 0.06, sw, sh);
  } else {
    const g0 = x.createLinearGradient(0, 0, 0, IMG_H);
    g0.addColorStop(0, theme.grad[0]); g0.addColorStop(1, theme.grad[2]);
    x.fillStyle = g0; x.fillRect(0, 0, W, IMG_H);
  }
  const fade = x.createLinearGradient(0, IMG_H - 190, 0, IMG_H + 8);
  fade.addColorStop(0, 'rgba(255,254,251,0)'); fade.addColorStop(1, 'rgba(255,254,251,1)');
  x.fillStyle = fade; x.fillRect(0, IMG_H - 190, W, 200);

  x.fillStyle = 'rgba(46,45,41,.55)'; x.font = `400 30px ${sans}`;
  x.fillText(`${t.y}. ${String(t.mo).padStart(2,'0')}. ${String(t.d).padStart(2,'0')} · ${t.gzKr}일`, 84, IMG_H + 66);
  x.fillStyle = theme.text; x.font = `300 118px ${serif}`;
  x.fillText(t.gz, W - 84 - x.measureText(t.gz).width, IMG_H + 118);
  x.fillStyle = '#2E3B32'; x.font = `600 58px ${serif}`;
  x.fillText(theme.title[0], 84, IMG_H + 168);
  x.fillText(theme.title[1], 84, IMG_H + 252);
  x.fillStyle = '#4A554D'; x.font = `400 35px ${sans}`;
  x.fillText(theme.sub, 84, IMG_H + 330);
  x.fillStyle = theme.text; x.font = `500 35px ${sans}`;
  x.fillText(theme.action, 84, IMG_H + 392);
  let tx = 84;
  x.font = `500 30px ${sans}`;
  for (const tag of theme.tags) {
    const w = x.measureText('#' + tag).width + 44;
    x.fillStyle = theme.pastel;
    x.beginPath(); x.roundRect(tx, IMG_H + 438, w, 60, 30); x.fill();
    x.fillStyle = theme.text; x.fillText('#' + tag, tx + 22, IMG_H + 479);
    tx += w + 14;
  }
  x.fillStyle = 'rgba(46,45,41,.5)'; x.font = `400 27px ${sans}`;
  if (mine) x.fillText(`일간 ${STEMS[mine.dayStem]} · 오늘 ${t.gz} · ${mine.rel}`, 84, IMG_H + 592);
  const brand = '여덟글자 · yeodeol.kr';
  x.fillStyle = 'rgba(46,45,41,.42)';
  x.fillText(brand, mine ? W - 84 - x.measureText(brand).width : 84, IMG_H + 592);
}
export function downloadCanvas(canvas, name) {
  const a = document.createElement('a');
  a.download = name; a.href = canvas.toDataURL('image/png'); a.click();
}

/* ── 공통 초기화 ───────────────────── */
export function boot(active) {
  maybeSeedDemo();
  const ctx = getToday();
  applyTheme(ctx.theme);
  renderChrome(active);
  return ctx;
}
export { WEATHER, ELEMENTS, ELEMENTS_HANJA, dateKey, fmt, STEMS };
