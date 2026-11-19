/* 여덟글자 공통 앱 유틸 — app.js
   생년월일·감정 기록·일기는 전부 이 기기의 localStorage 에만 저장합니다.
   서버로 가는 것은 세 가지뿐입니다.
     1) 익명 방문 숫자 — 경로와 '오늘 첫 방문인지' 여부. 쿠키·기기 번호 없음. GPC/DNT 를 켜면 보내지 않음
     2) 방문자가 직접 적어 보낸 문의
     3) 방문자가 직접 신청한 출시 알림 이메일 */
import { todayInfo, fourPillars, tenGod, TEN_GODS, fmt, STEMS, ELEMENTS, ELEMENTS_HANJA, dateKey } from '/assets/js/saju.js?v=20261120a';
import { EL_THEME, WEATHER, TEN_GOD_DAY, TAROT, STEM_DEF, BADGES } from '/assets/js/content.js?v=20261120a';

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
/* 저장할 때 어떤 기능을 썼는지 '이름만' 셉니다 (내용은 보내지 않아요) */
const STORE_EVENT = { profile: 'saju_made', moods: 'mood_saved', notes: 'note_saved', plans: 'plan_saved', actions: 'action_done', relations: 'relation_saved' };
/* 무엇이든 하나라도 남긴 기기 — 서비스가 잘 되고 있는지 보는 북극성 지표 */
const KEEP = new Set(['mood_saved', 'note_saved', 'plan_saved', 'action_done']);
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) {
    try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch {}
    if (STORE_EVENT[k]) trackEvent(STORE_EVENT[k]);
  },
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
  trackEvent('link_shared');
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
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^el\.plans_\d{4}$/.test(k)) out.data[k.slice(3)] = store.get(k.slice(3)); } } catch {}
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  a.download = `여덟글자_백업_${out.at.slice(0, 10)}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  trackEvent('backup_export');
  toast('기록을 파일로 담았어요 · 기록은 당신 것이에요');
}
export async function importAll(file) {
  const obj = JSON.parse(await file.text());
  if (!obj || obj.app !== 'yeodeol-8' || obj.v !== 1) throw new Error('형식이 달라요');
  let n = 0;
  for (const [k, v] of Object.entries(obj.data)) if (BK_KEYS.includes(k) || /^plans_\d{4}$/.test(k)) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch {} n++; }
  trackEvent('backup_import');
  return n;
}

/* ── 익명 사용 통계 ─────────────────
   경로와 '오늘 이 기기의 첫 방문인가'만 보냅니다. 쿠키도, 기기 번호도 없습니다.
   브라우저에서 추적 거부(GPC · Do Not Track)를 켜 두면 아무것도 보내지 않습니다. */
const noTrack = () => {
  try { return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1' || /^(localhost|127\.)/.test(location.hostname); }
  catch { return true; }
};
const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
function beacon(payload) {
  if (noTrack()) return;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/e', new Blob([body], { type: 'text/plain' }))) return;
  } catch {}
  try { fetch('/api/e', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {}); } catch {}
}
/* 한 번의 방문 = 30분. 몇 번째 화면인지만 세고, 방문에 번호를 붙이지는 않습니다. */
const VISIT_GAP = 30 * 60e3;
function visitTick() {
  try {
    const now = Date.now();
    let s = JSON.parse(localStorage.getItem('el._vs') || 'null');
    if (!s || now - s.t > VISIT_GAP) s = { t: now, n: 0 };
    s.n += 1; s.t = now;
    localStorage.setItem('el._vs', JSON.stringify(s));
    return { start: s.n === 1, second: s.n === 2 };
  } catch { return { start: false, second: false }; }
}

export function trackPage() {
  try {
    const day = kstToday();
    const u = localStorage.getItem('el._seen') !== day;
    const n = !localStorage.getItem('el._first');
    if (u) localStorage.setItem('el._seen', day);
    if (n) localStorage.setItem('el._first', day);
    const v = visitTick();
    let r = '';
    try { const h = document.referrer ? new URL(document.referrer).hostname : ''; if (h && h !== location.hostname) r = h; } catch {}
    const w = Math.min(screen.width || innerWidth, innerWidth);
    const d = w < 768 ? 'm' : (w < 1100 && matchMedia('(pointer:coarse)').matches ? 't' : 'd');
    const pay = { p: location.pathname };
    if (u) { pay.u = 1; pay.n = n ? 1 : 0; pay.r = r; pay.d = d; }
    if (v.start) pay.s = 1;
    if (v.second) pay.d2 = 1;
    beacon(pay);
    watchDwell();
  } catch {}
}

/* 머문 시간과 읽어 내린 비율 — 화면을 떠날 때 한 번만 보냅니다.
   다른 탭에 가 있는 동안은 세지 않아요. 그래야 '켜 두었다'와 '읽었다'가 섞이지 않습니다. */
let dwellOn = false;
function watchDwell() {
  if (dwellOn || noTrack()) return;
  dwellOn = true;
  let acc = 0, mark = Date.now(), deep = 0, sent = false;
  const pause = () => { if (mark) { acc += Date.now() - mark; mark = 0; } };
  const resume = () => { if (!mark) mark = Date.now(); };
  const depth = () => {
    const h = document.documentElement;
    const total = Math.max(1, h.scrollHeight - innerHeight);
    const p = h.scrollHeight <= innerHeight + 24 ? 100 : Math.round((h.scrollTop / total) * 100);
    deep = Math.min(100, Math.max(deep, p));
  };
  const flush = () => {
    if (sent) return;
    pause();
    const t = Math.round(acc / 1000);
    if (t < 2) { sent = true; return; }   // 잘못 눌러 바로 닫은 화면은 보내지 않습니다
    sent = true;
    depth();
    beacon({ q: location.pathname, t, sd: deep });
  };
  depth();
  addEventListener('scroll', depth, { passive: true });
  addEventListener('visibilitychange', () => { document.hidden ? pause() : resume(); });
  addEventListener('pagehide', flush);
  // 사파리에서 pagehide 가 빠지는 경우를 대비합니다
  addEventListener('visibilitychange', () => { if (document.hidden) setTimeout(() => { if (document.hidden) flush(); }, 1200); });
}

/* 같은 기능은 기기당 하루 한 번만 셉니다 */
export function trackEvent(k, x = '') {
  try {
    const day = kstToday();
    let log = JSON.parse(localStorage.getItem('el._ev') || '{}');
    if (log.d !== day) log = { d: day, k: [] };
    const id = x ? `${k}:${x}` : k;
    if (log.k.includes(id)) return;
    log.k.push(id);
    localStorage.setItem('el._ev', JSON.stringify(log));
    beacon(x ? { k, x } : { k });
    if (KEEP.has(k)) trackEvent('day_kept');
  } catch {}
}

/* ── 운영 설정 (공지 · 상품 상태 · 사업자 정보) ──
   관리자 화면에서 바꾼 값이 1분 안에 내려옵니다. 서버가 없거나 느려도 화면은 기본값으로 그대로 돌아갑니다. */
let cfgPromise = null;
export function loadConfig() {
  if (cfgPromise) return cfgPromise;
  let cached = null;
  try { cached = JSON.parse(sessionStorage.getItem('el._cfg') || 'null'); } catch {}
  const net = fetch('/api/config', { headers: { accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null))
    .then(j => {
      if (j && !j.offline) { j._t = Date.now(); try { sessionStorage.setItem('el._cfg', JSON.stringify(j)); } catch {} return j; }
      return cached;
    })
    .catch(() => cached);
  cfgPromise = cached && Date.now() - (cached._t || 0) < 2 * 60e3 ? Promise.resolve(cached) : net;
  return cfgPromise;
}
const escHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeHref = v => (/^(\/|https:\/\/)/.test(String(v || '')) ? String(v) : '');

/* 상단 띠 배너 — 닫으면 같은 배너는 다시 뜨지 않아요 */
function renderBanner(cfg) {
  const b = cfg?.banner;
  if (!b || store.get('bannerOff') === b.id || document.querySelector('.notice-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'notice-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', '알림');
  const href = safeHref(b.link);
  bar.innerHTML = `<div class="wrap"><span class="nb-dot" aria-hidden="true"></span><span class="nb-tx">${escHtml(b.title)}</span>
    ${href ? `<a class="nb-go" href="${escHtml(href)}">${escHtml(b.label || '자세히')} <span aria-hidden="true">→</span></a>` : ''}
    <button class="nb-x" aria-label="알림 닫기">×</button></div>`;
  bar.querySelector('.nb-x').onclick = () => { store.set('bannerOff', b.id); bar.remove(); };
  document.body.insertBefore(bar, document.body.firstChild);
}

/* 푸터 사업자 정보 — 전자상거래법 제10조 표시 사항 */
function renderBiz(cfg) {
  const box = document.getElementById('footBiz');
  if (!box) return;
  const s = cfg?.settings || {};
  const regDigits = String(s['biz.regno'] || '').replace(/\D/g, '');
  const items = [
    s['biz.name'] && `상호 ${escHtml(s['biz.name'])}`,
    s['biz.ceo'] && `대표 ${escHtml(s['biz.ceo'])}`,
    s['biz.regno'] && `사업자등록번호 ${escHtml(s['biz.regno'])}${regDigits.length === 10 ? ` <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${regDigits}" target="_blank" rel="noopener">사업자정보 확인</a>` : ''}`,
    s['biz.mailorder'] && `통신판매업 신고 ${escHtml(s['biz.mailorder'])}`,
    s['biz.address'] && `주소 ${escHtml(s['biz.address'])}`,
    s['biz.phone'] && `전화 ${escHtml(s['biz.phone'])}`,
    (s['biz.email'] || s['cs.email']) && `이메일 ${escHtml(s['biz.email'] || s['cs.email'])}`,
    s['privacy.officer'] && `개인정보 보호책임자 ${escHtml(s['privacy.officer'])}`,
    `호스팅 ${escHtml(s['biz.hosting'] || 'Cloudflare, Inc.')}`,
  ].filter(Boolean);
  box.innerHTML = items.map(x => `<span>${x}</span>`).join('');
}

/* 문서 안의 data-cfg="키" 자리에 운영 설정 값을 채웁니다 (약관 · 방침 · 문의 화면) */
function fillCfg(cfg) {
  const s = cfg?.settings || {};
  document.querySelectorAll('[data-cfg]').forEach(el => {
    const v = s[el.dataset.cfg];
    if (v) el.textContent = v;
  });
  document.querySelectorAll('[data-cfg-show]').forEach(el => { el.hidden = !s[el.dataset.cfgShow]; });
}

/* ── 상품 · 결제 버튼 ─────────────────
   준비 중: 누르면 출시 알림 신청 · 판매 중: 결제 링크로 · 잠시 멈춤: 안내만 · 숨김: 버튼을 감춥니다 */
const LEGACY_PID = { '관계 설명서':'rel', '말투 사전':'talk', '올해의 지도':'year', '열 해의 강':'daeun', '쓰는 법':'use',
  '몸의 신호':'body', '부적':'charm', '구독':'monthly', '신년 묶음':'newyear' };
export const PRODUCTS = {
  rel: { name: '관계 설명서', label: '5,900원' }, talk: { name: '말투 사전', label: '3,900원' },
  year: { name: '올해의 지도', label: '12,900원' }, daeun: { name: '열 해의 강', label: '7,900원' },
  use: { name: '쓰는 법과 안 쓸 때', label: '4,900원' }, body: { name: '몸이 보내는 신호', label: '2,900원' },
  charm: { name: '나에게 맞는 부적', label: '3,900원' }, monthly: { name: '이달의 결 · 구독', label: '월 4,900원' },
  newyear: { name: '신년 묶음', label: '22,900원' },
};
const pidOf = b => { const p = b.dataset.p || ''; return PRODUCTS[p] ? p : (LEGACY_PID[p] || ''); };

export function wirePayButtons(root = document) {
  const btns = [...root.querySelectorAll('.pay-btn')];
  const apply = cfg => {
    const P = cfg && !cfg.offline && cfg.products && Object.keys(cfg.products).length ? cfg.products : null;
    // 가격 표시 자리
    if (P) root.querySelectorAll('[data-price]').forEach(el => { const p = P[el.dataset.price]; if (p) el.textContent = p.label; });
    btns.forEach(b => {
      const id = pidOf(b);
      const p = P ? P[id] : null;
      if (P && id && !p) { b.hidden = true; return; }               // 숨김
      const status = p?.status || 'soon';
      const label = p?.label || PRODUCTS[id]?.label || '';
      if (label && b.dataset.keep !== '1') {
        const base = (b.dataset.base ||= b.textContent.replace(/\s*·\s*[^·]*원\s*$/, '').trim());
        b.textContent = status === 'soon' && b.dataset.soon ? b.dataset.soon : `${base} · ${label}`;
      }
      b.dataset.status = status;
      let chip = b.nextElementSibling?.classList.contains('pay-state') ? b.nextElementSibling : null;
      const chipText = status === 'soon' ? '준비 중 · 알림 신청 가능' : status === 'paused' ? '잠시 쉬는 중' : '';
      if (chipText && !chip) { chip = document.createElement('span'); chip.className = 'pay-state'; b.after(chip); }
      if (chip) { chip.textContent = chipText; chip.hidden = !chipText; }
      b.onclick = () => {
        if (status === 'open' && p?.url) {
          trackEvent('buy_click', id);
          window.open(p.url, '_blank', 'noopener');
          return;
        }
        if (status === 'paused') { toast('지금은 잠시 쉬고 있어요 · 무료 구간은 그대로 열려 있어요'); return; }
        const w = store.get('wish', {});
        if (!w[id || b.textContent.trim()]) { w[id || b.textContent.trim()] = Date.now(); store.set('wish', w); }
        if (id) trackEvent('wish', id);
        openNotifySheet(id, cfg);
      };
    });
  };
  apply(null);
  loadConfig().then(apply);
}

/* 출시 알림 신청 시트 */
function openNotifySheet(id, cfg) {
  const prod = cfg?.products?.[id] || PRODUCTS[id] || { name: '이 리포트' };
  const open = cfg?.settings?.['site.notify_open'] !== '0' && !cfg?.offline;
  document.querySelector('.sheet-ov')?.remove();
  const ov = document.createElement('div');
  ov.className = 'sheet-ov';
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="shT">
    <button class="sheet-x" aria-label="닫기">×</button>
    <p class="sheet-kicker">결제 준비 중</p>
    <h3 id="shT">${escHtml(prod.name)} — 열리면 알려 드릴게요</h3>
    <p class="sheet-lead">지금은 결제를 준비하고 있어요. 무료로 열린 부분은 그대로 읽으실 수 있어요.
      ${open ? '이메일을 남기시면 결제가 열리는 날 <b>한 번만</b> 알려 드려요. 광고 메일은 보내지 않아요.' : '열리는 날 이 자리와 공지사항에서 알려 드릴게요.'}</p>
    ${open ? `<form class="sheet-form" novalidate>
      <label class="sr" for="shE">이메일</label>
      <input id="shE" type="email" inputmode="email" autocomplete="email" placeholder="이메일 주소" required>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="sheet-agree"><input type="checkbox" id="shC"> <span><b>(필수)</b> 개인정보 수집·이용에 동의해요</span></label>
      <p class="sheet-fine">수집 항목: 이메일 · 목적: 출시 알림 1회 발송 · 보유: 알림을 보낸 뒤 30일, 늦어도 신청일로부터 1년.
        동의하지 않으셔도 무료 구간 이용에는 아무 제한이 없어요. <a href="/privacy">개인정보처리방침</a></p>
      <p class="sheet-err" role="alert"></p>
      <button class="btn btn-primary" style="width:100%;">알림 신청하기</button>
    </form>` : ''}
    <button class="sheet-skip">${open ? '이메일 없이 관심만 남길게요' : '알겠어요'}</button>
  </div>`;
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  ov.querySelector('.sheet-x').onclick = close;
  ov.querySelector('.sheet-skip').onclick = () => { close(); toast('관심을 남겼어요 · 열리면 이 자리에서 알려 드릴게요'); };
  const f = ov.querySelector('form');
  if (f) f.onsubmit = async e => {
    e.preventDefault();
    const err = ov.querySelector('.sheet-err');
    const email = ov.querySelector('#shE').value.trim();
    err.textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = '이메일 주소를 다시 확인해 주세요.'; return; }
    if (!ov.querySelector('#shC').checked) { err.textContent = '알림을 받으려면 동의가 필요해요.'; return; }
    const btn = f.querySelector('button'); btn.disabled = true;
    try {
      const r = await fetch('/api/notify', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product: id, email, consent: true, hp: f.website.value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || '지금은 신청을 받지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
      trackEvent('notify_signup', id);
      close();
      toast(j.already ? '이미 신청해 두셨어요 · 열리면 알려 드릴게요' : '신청했어요 · 열리는 날 한 번만 알려 드릴게요');
    } catch (x) { err.textContent = x.message; btn.disabled = false; }
  };
  document.body.appendChild(ov);
  setTimeout(() => (ov.querySelector('#shE') || ov.querySelector('.sheet-skip')).focus(), 30);
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
      <div class="foot-legal">
      <div class="foot-links">
        <a href="/about">서비스 소개</a><a href="/notice">공지사항</a><a href="/contact">문의하기</a>
        <a href="/terms">이용약관</a><a href="/privacy"><b>개인정보처리방침</b></a>
        <button type="button" id="ftExport">내 기록 백업</button>
      </div>
      <div class="foot-biz" id="footBiz"><span>호스팅 Cloudflare, Inc.</span></div>
      <div class="foot-note"><span>© 여덟글자 · yeodeol.kr</span><span>생년월일·감정 기록·일기는 이 기기에만 저장돼요 · 서버에는 익명 방문 숫자와, 직접 보내 주신 문의·알림 신청만 남아요</span></div>
      </div>
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
  trackEvent('card_saved');
}

/* ── 공통 초기화 ───────────────────── */
export function boot(active) {
  maybeSeedDemo();
  const ctx = getToday();
  applyTheme(ctx.theme);
  renderChrome(active);
  trackPage();
  loadConfig().then(cfg => { if (!cfg) return; renderBanner(cfg); renderBiz(cfg); fillCfg(cfg); });
  return ctx;
}
try { window.addEventListener('appinstalled', () => trackEvent('install')); } catch {}
export { WEATHER, ELEMENTS, ELEMENTS_HANJA, dateKey, fmt, STEMS };
