/* 여덟글자 관리자 — 한 파일 앱 (빌드 없음, ES 모듈)
   일진 계산은 본 서비스 saju.js 를 그대로 가져다 씁니다. 계산이 두 군데 있으면 언젠가 값이 어긋나니까요. */
import { todayInfo, STEMS, BRANCHES } from '/assets/js/saju.js?v=20261117b';

/* ════════ 이름표 ════════ */
const ROLE = { owner: '최고관리자', manager: '운영', viewer: '조회' };
const LEVEL = { owner: 3, manager: 2, viewer: 1 };
const INQ = { new: ['새 문의', 'b-bad'], progress: ['확인 중', 'b-warn'], done: ['답변 완료', 'b-ok'], closed: ['종료', ''] };
const PSTAT = {
  soon: ['준비 중 · 알림 신청 받기', 'b-info'], open: ['판매 중', 'b-ok'],
  paused: ['잠시 멈춤', 'b-warn'], hidden: ['숨김', ''],
};
const EV = {
  saju_made: '사주 만들기', mood_saved: '감정 날씨 기록', note_saved: '세 줄 기록', plan_saved: '지도 위 계획 메모',
  action_done: '오늘의 한 가지 완료', relation_saved: '궁합 상대 저장', card_saved: '카드 이미지 저장',
  link_shared: '링크 공유', invite_opened: '공유·초대 링크 열림', backup_export: '기록 백업', backup_import: '백업 가져오기',
  wish: '관심 표시', notify_signup: '출시 알림 신청', inquiry_sent: '문의 접수', buy_click: '결제 링크로 이동', install: '홈 화면에 추가',
};
const REF = {
  direct: '직접 방문·앱', naver: '네이버', google: '구글', daum: '다음·카카오', kakaotalk: '카카오톡',
  instagram: '인스타그램', threads: '스레드', facebook: '페이스북', x: 'X', youtube: '유튜브', bing: '빙',
  chatgpt: 'ChatGPT', claude: 'Claude', etc: '그 밖의 사이트',
};
const DEV = { m: '모바일', t: '태블릿', d: '데스크톱' };
const PAGE = {
  '/': '홈 · 오늘의 색', '/saju': '내 사주', '/gunghap': '궁합', '/time': '시간', '/record': '기록',
  '/report': '리포트', '/charm': '부적과 배치', '/calendar': '만세력', '/tarot': '타로', '/juyeok': '주역',
  '/type': '40유형', '/dict': '지식 사전', '/ilju': '일주 목록', '/jeolgi': '절기 목록', '/share': '공유 뷰어',
  '/about': '서비스 소개', '/notice': '공지사항', '/contact': '문의하기', '/terms': '이용약관', '/privacy': '개인정보처리방침',
  '/other': '그 밖의 주소',
};
const ILJU_KR = { gap: '갑', eul: '을', byeong: '병', jeong: '정', mu: '무', gi: '기', gyeong: '경', sin: '신', im: '임', gye: '계' };
const AUDIT = {
  setup: '최고관리자 계정 생성', login: '로그인', login_fail: '로그인 실패', logout: '로그아웃', 'password.change': '비밀번호 변경',
  'settings.update': '설정 변경', 'product.update': '상품 수정', 'notice.create': '공지 작성', 'notice.update': '공지 수정',
  'notice.delete': '공지 삭제', 'inquiry.update': '문의 처리', 'inquiry.delete': '문의 삭제', 'inquiry.reveal': '문의 이메일 열람',
  'waitlist.reveal': '알림 신청 이메일 열람', 'waitlist.export': '알림 신청 명단 내려받기', 'waitlist.notified': '알림 발송 처리',
  'waitlist.delete': '알림 신청 삭제', 'account.create': '계정 추가', 'account.update': '계정 수정', 'account.reset': '비밀번호 초기화',
  'system.purge': '보유기간 지난 기록 파기', 'backup.download': '전체 백업 내려받기',
};

/* ════════ 도구 ════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n || 0).toLocaleString('ko-KR');
const won = n => `${num(n)}원`;
const pad = n => String(n).padStart(2, '0');
function dt(iso, withTime = true) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  const s = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  return withTime ? `${s} ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
}
function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  return dt(iso, false);
}
const toLocalInput = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fromLocalInput = v => v ? new Date(v).toISOString() : '';
function pageLabel(p) {
  if (PAGE[p]) return PAGE[p];
  const m = p.match(/^\/ilju\/([a-z]+)$/);
  if (m) { const s = Object.keys(ILJU_KR).find(k => m[1].startsWith(k)); return `일주 · ${s ? ILJU_KR[s] : ''}${m[1].slice(s ? s.length : 0)}`; }
  if (p.startsWith('/jeolgi/')) return `절기 · ${p.slice(8)}`;
  return p;
}
const can = need => LEVEL[S.me?.role] >= LEVEL[need];
const icon = d => `<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

function download(name, text, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function csv(rows, cols) {
  const q = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [cols.map(c => q(c[1])).join(','), ...rows.map(r => cols.map(c => q(typeof c[0] === 'function' ? c[0](r) : r[c[0]])).join(','))].join('\r\n');
}

/* ════════ 서버 ════════ */
class ApiError extends Error { constructor(msg, status, code) { super(msg); this.status = status; this.code = code; } }
async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api/admin/' + path, {
      method, credentials: 'same-origin',
      headers: { 'x-admin': '1', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch { throw new ApiError('인터넷 연결을 확인해 주세요.', 0, 'NET'); }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    if (res.status === 401 && !['state', 'login', 'setup'].includes(path)) { S.me = null; start(); }
    if (data.code === 'MUST_CHANGE' && S.me) { S.me.mustChange = true; start(); }
    throw new ApiError(data.error || `요청을 처리하지 못했어요 (${res.status})`, res.status, data.code);
  }
  return data;
}

/* ════════ 알림 · 창 ════════ */
function toast(msg, bad = false) {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), bad ? 4200 : 2400);
}
function modal({ title, body, actions = [], wide = false, drawer = false, onOpen }) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    const box = document.createElement('div');
    box.className = drawer ? 'drawer' : 'modal' + (wide ? ' wide' : '');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', title);
    box.innerHTML = `<div class="mh"><h3>${esc(title)}</h3><button class="x" aria-label="닫기">×</button></div>
      <div class="mb"></div>${actions.length ? '<div class="mf"></div>' : ''}`;
    const mb = $('.mb', box);
    if (typeof body === 'string') mb.innerHTML = body; else if (body) mb.appendChild(body);
    const close = v => { ov.remove(); if (drawer) box.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    $('.x', box).onclick = () => close(null);
    ov.addEventListener('click', e => { if (e.target === ov) close(null); });
    const mf = $('.mf', box);
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.kind || ''); b.textContent = a.label;
      b.onclick = async () => {
        if (!a.run) return close(a.value ?? null);
        b.disabled = true;
        try { const v = await a.run(box); if (v !== false) close(v ?? a.value ?? true); }
        catch (e) { toast(e.message, true); }
        finally { b.disabled = false; }
      };
      mf.appendChild(b);
    }
    if (drawer) { document.body.appendChild(ov); document.body.appendChild(box); }
    else { ov.appendChild(box); document.body.appendChild(ov); }
    onOpen?.(box, close);
    setTimeout(() => ($('input,select,textarea', mb) || $('.x', box)).focus(), 30);
  });
}
const confirmBox = (title, text, { ok = '확인', danger = false } = {}) =>
  modal({ title, body: `<p style="margin:0;line-height:1.8">${text}</p>`,
    actions: [{ label: '취소', value: false }, { label: ok, kind: danger ? 'danger' : 'primary', value: true }] });

/* ════════ 상태 · 라우팅 ════════ */
const S = { me: null, needsSetup: false, setupKeyConfigured: true, badge: 0 };
const NAV = [
  { grp: '한눈에' },
  { path: '/', label: '대시보드', icon: '<path d="M3 10.5 10 4l7 6.5V16a1 1 0 0 1-1 1h-3.5v-4h-5v4H4a1 1 0 0 1-1-1z"/>', role: 'viewer', view: viewDashboard },
  { path: '/stats', label: '방문·사용 통계', icon: '<path d="M4 16V9M9 16V4M14 16v-5M3 17h14"/>', role: 'viewer', view: viewStats },
  { grp: '고객' },
  { path: '/inquiries', label: '문의함', icon: '<path d="M3 5h14v9H8l-4 3v-3H3z"/>', role: 'viewer', view: viewInquiries, badge: true },
  { path: '/waitlist', label: '출시 알림 신청', icon: '<path d="M10 3a4 4 0 0 1 4 4v3l1.5 3h-11L6 10V7a4 4 0 0 1 4-4zM8.5 16a1.6 1.6 0 0 0 3 0"/>', role: 'viewer', view: viewWaitlist },
  { grp: '서비스' },
  { path: '/products', label: '상품·가격', icon: '<path d="M3 7l7-4 7 4v7l-7 4-7-4z"/><path d="M3 7l7 4 7-4M10 11v7"/>', role: 'viewer', view: viewProducts },
  { path: '/notices', label: '공지·배너', icon: '<path d="M4 8v4h3l6 4V4L7 8z"/><path d="M16 8.5a3 3 0 0 1 0 3"/>', role: 'viewer', view: viewNotices },
  { path: '/settings', label: '사업자·사이트 설정', icon: '<circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/>', role: 'viewer', view: viewSettings },
  { grp: '관리' },
  { path: '/accounts', label: '계정·권한', icon: '<circle cx="8" cy="7" r="3"/><path d="M3 16c.6-2.6 2.6-4 5-4s4.4 1.4 5 4M14 5.5a2.5 2.5 0 0 1 0 5M15.5 12.5c1.2.6 2 1.8 2.3 3.5"/>', role: 'owner', view: viewAccounts },
  { path: '/audit', label: '활동 기록', icon: '<path d="M10 5v5l3 2"/><circle cx="10" cy="10" r="7"/>', role: 'manager', view: viewAudit },
  { path: '/system', label: '데이터·시스템', icon: '<ellipse cx="10" cy="5" rx="6" ry="2.2"/><path d="M4 5v10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5M4 10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2"/>', role: 'viewer', view: viewSystem },
  { path: '/me', label: '내 정보', icon: '<circle cx="10" cy="7" r="3.2"/><path d="M4 17c.8-3 3.2-4.6 6-4.6s5.2 1.6 6 4.6"/>', role: 'viewer', view: viewMe, hidden: true },
];
const route = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];
const query = () => new URLSearchParams(location.hash.split('?')[1] || '');

async function start() {
  const app = $('#app');
  try {
    const st = await api('state');
    S.me = st.me; S.needsSetup = st.needsSetup; S.setupKeyConfigured = st.setupKeyConfigured;
  } catch (e) {
    app.innerHTML = `<div class="auth"><div class="box"><h1>여덟글자 관리자</h1>
      <p class="lead">${esc(e.status === 503 ? '데이터베이스가 아직 연결되지 않았어요. Cloudflare Pages 설정 > 바인딩에 D1(DB)을 연결한 뒤 다시 배포해 주세요.' : e.message)}</p>
      <button class="btn primary" onclick="location.reload()">다시 시도</button></div></div>`;
    return;
  }
  if (S.needsSetup) return renderSetup();
  if (!S.me) return renderLogin();
  if (S.me.mustChange) return renderMustChange();
  renderShell();
}

/* ════════ 로그인 · 최초 설정 ════════ */
function authBox(inner) {
  const t = todayInfo();
  $('#app').innerHTML = `<main class="auth"><div class="box">
    <div class="seal"><span class="stamp" aria-hidden="true"><span>${STEMS[t.stem]}</span><span>${BRANCHES[t.branch]}</span></span>
      <span>${t.y}년 ${t.mo}월 ${t.d}일 · ${esc(t.gzKr)}일</span></div>
    ${inner}</div></main>`;
}
function renderLogin() {
  authBox(`<h1>여덟글자 관리자</h1>
    <p class="lead">운영진만 들어오는 자리예요. 로그인 기록은 활동 기록에 남아요.</p>
    <form class="stack" id="f" autocomplete="on">
      <div class="field"><label for="lg">아이디</label><input class="in" id="lg" name="username" autocomplete="username" required></div>
      <div class="field"><label for="pw">비밀번호</label><input class="in" id="pw" type="password" name="password" autocomplete="current-password" required></div>
      <label class="check"><input type="checkbox" id="rm"> 이 기기에서 7일 동안 로그인 유지</label>
      <div class="err" id="er" role="alert"></div>
      <button class="btn primary" style="width:100%">로그인</button>
    </form>
    <p class="foot">비밀번호를 잊으셨다면 최고관리자에게 초기화를 요청하세요.<br><a href="/">여덟글자로 돌아가기</a></p>`);
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const b = $('#f button'); b.disabled = true; $('#er').textContent = '';
    try {
      const r = await api('login', { method: 'POST', body: { login: $('#lg').value, password: $('#pw').value, remember: $('#rm').checked } });
      S.me = r.me; start();
    } catch (err) { $('#er').textContent = err.message; b.disabled = false; }
  };
}
function renderSetup() {
  authBox(`<h1>처음 한 번만 — 최고관리자 만들기</h1>
    <p class="lead">아직 관리자 계정이 없어요. 전달받은 <b>일회용 설정 키</b>를 아는 사람만 첫 계정을 만들 수 있어요. 만들고 나면 이 화면은 다시 열리지 않아요.</p>
    <form class="stack" id="f" autocomplete="off">
      <div class="field"><label for="k">설정 키</label><input class="in" id="k" type="password" required autocomplete="off"></div>
      <div class="field"><label for="lg">아이디</label><input class="in" id="lg" required placeholder="영문 소문자·숫자 3~32자" autocomplete="username"></div>
      <div class="field"><label for="nm">이름</label><input class="in" id="nm" required placeholder="활동 기록에 남는 이름"></div>
      <div class="field"><label for="pw">비밀번호</label><input class="in" id="pw" type="password" required autocomplete="new-password">
        <span class="hint">10자 이상, 영문·숫자·기호 중 두 가지 이상</span></div>
      <div class="field"><label for="pw2">비밀번호 확인</label><input class="in" id="pw2" type="password" required autocomplete="new-password"></div>
      <div class="err" id="er" role="alert"></div>
      <button class="btn primary" style="width:100%">최고관리자 계정 만들기</button>
    </form>`);
  $('#f').onsubmit = async e => {
    e.preventDefault();
    if ($('#pw').value !== $('#pw2').value) { $('#er').textContent = '두 비밀번호가 서로 달라요.'; return; }
    const b = $('#f button'); b.disabled = true; $('#er').textContent = '';
    try {
      const r = await api('setup', { method: 'POST', body: { key: $('#k').value, login: $('#lg').value, name: $('#nm').value, password: $('#pw').value } });
      S.me = r.me; S.needsSetup = false; location.hash = '#/settings'; start();
      toast('최고관리자 계정을 만들었어요. 사업자 정보부터 채워 주세요.');
    } catch (err) { $('#er').textContent = err.message; b.disabled = false; }
  };
}
function passwordForm(id = 'pf') {
  return `<form class="stack" id="${id}">
    <div class="field"><label for="${id}c">지금 비밀번호${S.me?.mustChange ? ' (받은 임시 비밀번호)' : ''}</label><input class="in" id="${id}c" type="password" required autocomplete="current-password"></div>
    <div class="field"><label for="${id}n">새 비밀번호</label><input class="in" id="${id}n" type="password" required autocomplete="new-password">
      <span class="hint">10자 이상, 영문·숫자·기호 중 두 가지 이상. 바꾸면 다른 기기의 로그인은 모두 끊겨요.</span></div>
    <div class="field"><label for="${id}n2">새 비밀번호 확인</label><input class="in" id="${id}n2" type="password" required autocomplete="new-password"></div>
    <div class="err" id="${id}e" role="alert"></div>
    <button class="btn primary">비밀번호 바꾸기</button></form>`;
}
function wirePasswordForm(id, done) {
  $('#' + id).onsubmit = async e => {
    e.preventDefault();
    const er = $('#' + id + 'e'); er.textContent = '';
    if ($('#' + id + 'n').value !== $('#' + id + 'n2').value) { er.textContent = '새 비밀번호 두 칸이 서로 달라요.'; return; }
    try {
      await api('me/password', { method: 'POST', body: { current: $('#' + id + 'c').value, next: $('#' + id + 'n').value } });
      toast('비밀번호를 바꿨어요'); done?.();
    } catch (err) { er.textContent = err.message; }
  };
}
function renderMustChange() {
  authBox(`<h1>비밀번호를 새로 정해 주세요</h1>
    <p class="lead">${esc(S.me.name)}님, 임시 비밀번호로 들어오셨어요. 본인만 아는 비밀번호로 바꾸면 관리자 화면이 열려요.</p>
    ${passwordForm('mc')}`);
  wirePasswordForm('mc', () => { S.me.mustChange = false; start(); });
}

/* ════════ 틀 ════════ */
function renderShell() {
  const t = todayInfo();
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  $('#app').innerHTML = `<div class="shell">
    <aside class="side" id="side">
      <a class="brand" href="#/"><span class="mark">八</span><span><b>여덟글자</b><span>ADMIN · yeodeol.kr</span></span></a>
      <nav class="nav" aria-label="관리자 메뉴">${NAV.filter(n => !n.hidden).map(n => n.grp
        ? `<div class="grp">${n.grp}</div>`
        : can(n.role) ? `<a href="#${n.path}" data-p="${n.path}">${icon(n.icon)}<span>${n.label}</span>${n.badge ? '<span class="cnt" id="navBadge" hidden></span>' : ''}</a>` : '').join('')}
      </nav>
      <div class="side-foot"><a href="/" target="_blank" rel="noopener">사이트 열기 ↗</a><br><span>권한 · ${ROLE[S.me.role]}</span></div>
    </aside>
    <div class="main">
      <header class="top">
        <button class="menu-btn" id="menuBtn" aria-label="메뉴 열기">${icon('<path d="M3 6h14M3 10h14M3 14h14"/>')}</button>
        <div><h1 id="ttl"></h1><div class="crumb" id="crumb"></div></div>
        <div class="right">
          <div class="seal" title="오늘의 일진 — 본 서비스와 같은 계산식">
            <span class="stamp" aria-hidden="true"><span>${STEMS[t.stem]}</span><span>${BRANCHES[t.branch]}</span></span>
            <span class="txt">${t.mo}월 ${t.d}일 ${DOW[t.dow]}요일<br>${esc(t.gzKr)}일 · ${esc(t.term?.next?.name || '')} ${t.term?.next ? `D-${t.term.next.daysLeft}` : ''}</span>
          </div>
          <a class="who" href="#/me"><span class="av">${esc(S.me.name.slice(0, 1))}</span><span class="nm">${esc(S.me.name)}</span></a>
        </div>
      </header>
      <main class="content" id="view" tabindex="-1"></main>
    </div></div>`;
  $('#menuBtn').onclick = () => $('#side').classList.toggle('open');
  window.onhashchange = render;
  render();
  refreshBadge();
}
async function refreshBadge() {
  try {
    const r = await api('inquiries?status=new');
    S.badge = r.counts?.new || 0;
    const b = $('#navBadge');
    if (b) { b.hidden = !S.badge; b.textContent = S.badge; }
  } catch {}
}
async function render() {
  const p = route();
  const nav = NAV.find(n => n.path === p) || NAV[1];
  $('#side')?.classList.remove('open');
  $$('.nav a').forEach(a => a.toggleAttribute('aria-current', a.dataset.p === nav.path));
  $('#ttl').textContent = nav.label;
  $('#crumb').textContent = '';
  const v = $('#view');
  if (!can(nav.role)) { v.innerHTML = `<div class="card"><p class="muted" style="margin:0">이 메뉴는 ${ROLE[nav.role]} 이상만 볼 수 있어요.</p></div>`; return; }
  if (!v.firstChild) v.innerHTML = '<div class="loading">불러오는 중…</div>';
  else v.classList.add('dim');
  try { await nav.view(v); }
  catch (e) { v.innerHTML = `<div class="card"><p style="margin:0 0 12px">${esc(e.message)}</p><button class="btn" id="retry">다시 시도</button></div>`; $('#retry').onclick = render; }
  finally { v.classList.remove('dim'); }
}
const crumb = t => { $('#crumb').textContent = t; };

/* ════════ 차트 ════════ */
function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return v;
}
function lineChart(host, labels, series, { height = 220 } = {}) {
  host.classList.add('chart');
  const draw = () => {
    const W = Math.max(280, host.clientWidth), H = height, L = 38, R = 12, T = 12, B = 26;
    const max = niceMax(Math.max(1, ...series.flatMap(s => s.values)));
    const n = labels.length;
    const x = i => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
    const y = v => T + (H - T - B) * (1 - v / max);
    const step = Math.max(1, Math.ceil(n / Math.max(4, Math.floor((W - L) / 64))));
    let g = '';
    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4, yy = y(v);
      g += `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="axis-t" x="${L - 8}" y="${yy + 4}" text-anchor="end">${num(Math.round(v))}</text>`;
    }
    labels.forEach((lb, i) => { if (i % step === 0 || i === n - 1) g += `<text class="axis-t" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(lb.slice(5).replace('-', '.'))}</text>`; });
    const paths = series.map(s => {
      const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
      const last = s.values.length - 1;
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="5 4"' : ''}/>
        <circle cx="${x(last)}" cy="${y(s.values[last])}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;
    }).join('');
    host.innerHTML = `<div class="legend">${series.map(s => `<span><i class="${s.dash ? 'dash' : ''}" style="border-color:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(series.map(s => s.name).join(', '))} 추이">
        ${g}${paths}<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#B9B6AB" stroke-width="1" visibility="hidden"/>
        <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" class="hit"/></svg><div class="tip" hidden></div>`;
    const svg = $('svg', host), tip = $('.tip', host), xh = $('.xh', host), hit = $('.hit', host);
    const show = i => {
      xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.innerHTML = `<div class="hd">${esc(labels[i])}</div>` + series.map(s => `<div class="r"><i style="border-color:${s.color}${s.dash ? ';border-top-style:dashed' : ''}"></i><b>${num(s.values[i])}</b> <span class="muted">${esc(s.name)}</span></div>`).join('');
      const sx = svg.getBoundingClientRect().width / W;
      tip.style.left = Math.min(Math.max(x(i) * sx, 70), host.clientWidth - 70) + 'px';
      tip.style.top = (T + 30) + 'px';
    };
    hit.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      show(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))));
    });
    hit.addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
  };
  draw();
  const ro = new ResizeObserver(() => { if (Math.abs(host.clientWidth - (host._w || 0)) > 8) { host._w = host.clientWidth; draw(); } });
  host._w = host.clientWidth; ro.observe(host);
}
function barList(items, { empty = '아직 쌓인 숫자가 없어요', color = 'var(--s1)', fmt = num } = {}) {
  if (!items.length) return `<div class="empty">${empty}</div>`;
  const max = Math.max(...items.map(i => i.value), 1);
  return `<div class="bars">${items.map(i => `<div class="bar-row" title="${esc(i.label)} · ${fmt(i.value)}">
    <span class="lb">${esc(i.label)}</span><span class="tr"><i style="width:${(i.value / max) * 100}%;background:${color}"></i></span>
    <span class="vl">${fmt(i.value)}</span></div>`).join('')}</div>`;
}
const toItems = (obj, labeler = k => k, top = 10) =>
  Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => ({ label: labeler(k), value: v }));

/* ════════ 대시보드 ════════ */
async function viewDashboard(v) {
  const [d, prods] = await Promise.all([api('dashboard'), api('products').catch(() => ({ items: [] }))]);
  const pname = Object.fromEntries((prods.items || []).map(p => [p.id, p.name]));
  const days = Object.keys(d.series);
  const tk = days[days.length - 1], yk = days[days.length - 2];
  const T = d.series[tk], Y = d.series[yk];
  const te = d.todayEv || {}, ye = d.ydayEv || {};
  const delta = (a, b) => {
    if (!b && !a) return '어제도 0';
    const df = a - b;
    return `어제 ${num(b)} · <span class="${df >= 0 ? 'up' : 'down'}">${df >= 0 ? '▲' : '▼'} ${num(Math.abs(df))}</span>`;
  };
  const kpi = (k, val, sub, href, accent) => `<div class="kpi ${accent ? 'accent' : ''}">${href ? `<a href="${href}">` : ''}
    <div class="k">${k}</div><div class="v">${num(val)}</div><div class="d">${sub}</div>${href ? '</a>' : ''}</div>`;
  const wishTotal = Object.values(d.week.wish).reduce((a, b) => a + b, 0);
  const share = (te.card_saved || 0) + (te.link_shared || 0);
  const interest = Object.keys({ ...d.week.wish, ...d.waitlist.byProduct }).map(id => ({
    label: pname[id] || id, value: (d.week.wish[id] || 0) + (d.waitlist.byProduct[id] || 0),
    w: d.week.wish[id] || 0, n: d.waitlist.byProduct[id] || 0,
  })).sort((a, b) => b.value - a.value);
  const doneChecks = d.checks.filter(c => c.ok).length;
  crumb(`${d.today} 기준 · 한국 시간`);

  v.innerHTML = `<div class="stack">
    <section class="kpis" aria-label="오늘의 여덟 칸">
      ${kpi('오늘 방문한 기기', T.uv, delta(T.uv, Y.uv), '#/stats', true)}
      ${kpi('오늘 열린 화면', T.pv, delta(T.pv, Y.pv), '#/stats')}
      ${kpi('처음 온 기기', T.nv, delta(T.nv, Y.nv), '#/stats')}
      ${kpi('사주 만들기', te.saju_made || 0, delta(te.saju_made || 0, ye.saju_made || 0), '#/stats')}
      ${kpi('감정·세 줄 기록', (te.mood_saved || 0) + (te.note_saved || 0), delta((te.mood_saved || 0) + (te.note_saved || 0), (ye.mood_saved || 0) + (ye.note_saved || 0)), '#/stats')}
      ${kpi('카드·링크 공유', share, delta(share, (ye.card_saved || 0) + (ye.link_shared || 0)), '#/stats')}
      ${kpi('답하지 않은 문의', d.inquiries.new, d.inquiries.new ? '문의함에서 답해 주세요' : '모두 확인했어요', '#/inquiries', d.inquiries.new > 0)}
      ${kpi('출시 알림 대기', d.waitlist.open, `최근 24시간 +${num(d.waitlist.last24h)} · 관심 표시 7일 ${num(wishTotal)}`, '#/waitlist')}
    </section>

    <section class="card"><div class="ch"><h2>최근 14일 방문</h2><span class="sub">기기 수는 하루 한 번만 셉니다 · 쿠키·IP를 남기지 않아요</span>
      <div class="act"><a class="btn sm" href="#/stats">자세히</a></div></div><div id="trend"></div></section>

    <div class="grid g2">
      <section class="card"><div class="ch"><h2>많이 열린 화면</h2><span class="sub">최근 7일</span></div>${barList(toItems(d.week.pages, pageLabel, 8))}</section>
      <section class="card"><div class="ch"><h2>들어온 곳</h2><span class="sub">최근 7일 · 하루 첫 방문 기준</span></div>
        ${barList(toItems(d.week.ref, k => REF[k] || k, 8), { color: 'var(--s2)' })}
        <hr class="sep"><div class="small sub">${Object.entries(d.week.dev).map(([k, n]) => `${DEV[k] || k} ${num(n)}`).join(' · ') || '기기 정보 없음'}</div></section>
    </div>
    <div class="grid g2">
      <section class="card"><div class="ch"><h2>기능 사용</h2><span class="sub">최근 7일 · 기기당 하루 한 번</span></div>${barList(toItems(d.week.ev, k => EV[k] || k, 10))}</section>
      <section class="card"><div class="ch"><h2>상품 관심도</h2><span class="sub">관심 표시(7일) + 알림 대기</span>
        <div class="act"><a class="btn sm" href="#/products">상품 관리</a></div></div>
        ${barList(interest.slice(0, 9).map(i => ({ label: `${i.label}  (관심 ${i.w} · 알림 ${i.n})`, value: i.value })), { color: 'var(--s2)', empty: '아직 관심 표시가 없어요' })}</section>
    </div>
    <div class="grid g2">
      <section class="card"><div class="ch"><h2>오픈 점검</h2><span class="sub">${doneChecks}/${d.checks.length} 완료</span></div>
        <div class="checks">${d.checks.map(c => `<div class="chk ${c.ok ? 'ok' : 'no'}"><span class="ic">${c.ok ? '✓' : '!'}</span>
          <span>${esc(c.label)}${c.soft && !c.ok ? ' <span class="muted small">(권장)</span>' : ''}</span>${c.ok ? '' : `<a href="${c.to}">채우러 가기 →</a>`}</div>`).join('')}</div></section>
      <section class="card"><div class="ch"><h2>최근 문의</h2><div class="act"><a class="btn sm" href="#/inquiries">문의함</a></div></div>
        ${d.inquiries.recent.length ? `<div class="rows">${d.inquiries.recent.map(r => `<a class="row" href="#/inquiries?open=${r.id}" style="color:inherit;text-decoration:none">
          <span class="badge ${INQ[r.status]?.[1] || ''}">${INQ[r.status]?.[0] || r.status}</span>
          <span class="clip" style="flex:1">${esc(r.message)}</span><span class="muted small">${ago(r.created_at)}</span></a>`).join('')}</div>`
          : '<div class="empty">아직 들어온 문의가 없어요</div>'}</section>
    </div>
  </div>`;
  lineChart($('#trend'), days, [
    { name: '방문 기기', color: '#2D8659', values: days.map(k => d.series[k].uv) },
    { name: '열린 화면', color: '#3F6FB5', values: days.map(k => d.series[k].pv), dash: true },
  ]);
  S.badge = d.inquiries.new; const b = $('#navBadge'); if (b) { b.hidden = !S.badge; b.textContent = S.badge; }
}

/* ════════ 통계 ════════ */
async function viewStats(v) {
  const days = Number(query().get('days')) || 30;
  const d = await api('stats?days=' + days);
  const keys = Object.keys(d.series);
  const sum = k => keys.reduce((a, x) => a + d.series[x][k], 0);
  crumb(`${d.from} ~ ${d.to}`);
  v.innerHTML = `<div class="stack">
    <div class="toolbar"><div class="seg" role="group" aria-label="기간">${[7, 30, 90, 180].map(n => `<button aria-pressed="${n === days}" data-d="${n}">최근 ${n}일</button>`).join('')}</div>
      <span class="grow"></span><button class="btn sm" id="dlCsv">날짜별 숫자 내려받기(CSV)</button></div>
    <section class="kpis">
      <div class="kpi accent"><div class="k">방문한 기기(일별 합)</div><div class="v">${num(sum('uv'))}</div><div class="d">하루 평균 ${num(Math.round(sum('uv') / days))}</div></div>
      <div class="kpi"><div class="k">열린 화면</div><div class="v">${num(sum('pv'))}</div><div class="d">방문당 ${sum('uv') ? (sum('pv') / sum('uv')).toFixed(1) : '0'}화면</div></div>
      <div class="kpi"><div class="k">처음 온 기기</div><div class="v">${num(sum('nv'))}</div><div class="d">다시 온 비율 ${sum('uv') ? Math.max(0, Math.round((1 - sum('nv') / sum('uv')) * 100)) : 0}%</div></div>
      <div class="kpi"><div class="k">사주 만들기</div><div class="v">${num(d.agg.ev.saju_made || 0)}</div><div class="d">처음 온 기기 대비 ${sum('nv') ? Math.round(((d.agg.ev.saju_made || 0) / sum('nv')) * 100) : 0}%</div></div>
    </section>
    <section class="card"><div class="ch"><h2>날짜별 방문</h2><div class="act"><button class="btn sm ghost" id="asTable">표로 보기</button></div></div>
      <div id="trend"></div><div id="trendTable" hidden></div></section>
    <div class="grid g2">
      <section class="card"><div class="ch"><h2>화면별</h2></div>${barList(toItems(d.agg.pv, pageLabel, 30))}</section>
      <section class="card"><div class="ch"><h2>기능 사용</h2><span class="sub">기기당 하루 한 번</span></div>${barList(toItems(d.agg.ev, k => EV[k] || k, 20))}</section>
    </div>
    <div class="grid g3">
      <section class="card"><div class="ch"><h2>들어온 곳</h2></div>${barList(toItems(d.agg.ref, k => REF[k] || k, 14), { color: 'var(--s2)' })}</section>
      <section class="card"><div class="ch"><h2>기기</h2></div>${barList(toItems(d.agg.dev, k => DEV[k] || k), { color: 'var(--s2)' })}</section>
      <section class="card"><div class="ch"><h2>상품별 반응</h2></div>
        <table class="t"><thead><tr><th>상품</th><th class="n">관심</th><th class="n">알림</th><th class="n">결제 이동</th></tr></thead><tbody>
        ${[...new Set([...Object.keys(d.agg.wish), ...Object.keys(d.agg.notify), ...Object.keys(d.agg.buy_click)])].map(k => `<tr><td>${esc(k)}</td>
          <td class="n">${num(d.agg.wish[k])}</td><td class="n">${num(d.agg.notify[k])}</td><td class="n">${num(d.agg.buy_click[k])}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">아직 없어요</td></tr>'}
        </tbody></table></section>
    </div>
    <p class="note">통계는 날짜별 숫자의 합만 저장해요. 방문자를 구별하는 쿠키·IP·기기 번호는 서버에 남지 않고, ‘방문한 기기’는 각 기기가 그날 처음 열었을 때 스스로 한 번만 알려 주는 방식이에요. 브라우저의 ‘추적 거부(GPC/DNT)’를 켠 방문은 세지 않아요.</p>
  </div>`;
  $$('.seg button', v).forEach(b => b.onclick = () => { location.hash = `#/stats?days=${b.dataset.d}`; });
  lineChart($('#trend'), keys, [
    { name: '방문 기기', color: '#2D8659', values: keys.map(k => d.series[k].uv) },
    { name: '열린 화면', color: '#3F6FB5', values: keys.map(k => d.series[k].pv), dash: true },
  ], { height: 240 });
  $('#trendTable').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>날짜</th><th class="n">방문 기기</th><th class="n">열린 화면</th><th class="n">처음 온 기기</th></tr></thead><tbody>
    ${keys.slice().reverse().map(k => `<tr><td>${k}</td><td class="n">${num(d.series[k].uv)}</td><td class="n">${num(d.series[k].pv)}</td><td class="n">${num(d.series[k].nv)}</td></tr>`).join('')}</tbody></table></div>`;
  $('#asTable').onclick = () => { const tb = $('#trendTable'); tb.hidden = !tb.hidden; $('#trend').hidden = !tb.hidden; $('#asTable').textContent = tb.hidden ? '표로 보기' : '그래프로 보기'; };
  $('#dlCsv').onclick = () => download(`yeodeol-stats-${d.from}_${d.to}.csv`,
    csv(keys.map(k => ({ day: k, ...d.series[k] })), [['day', '날짜'], ['uv', '방문 기기'], ['pv', '열린 화면'], ['nv', '처음 온 기기']]));
}

/* ════════ 문의함 ════════ */
async function viewInquiries(v) {
  const qs = query();
  const st = qs.get('status') || '', q = qs.get('q') || '', page = Number(qs.get('page')) || 1;
  const d = await api(`inquiries?status=${encodeURIComponent(st)}&q=${encodeURIComponent(q)}&page=${page}`);
  const all = Object.values(d.counts).reduce((a, b) => a + b, 0);
  const go = (o) => { const p = new URLSearchParams({ status: st, q, page: 1, ...o }); location.hash = '#/inquiries?' + p; };
  crumb(`전체 ${num(all)}건`);
  v.innerHTML = `<div class="toolbar">
      <div class="seg" role="group" aria-label="상태">${[['', '전체', all], ...Object.entries(INQ).map(([k, [l]]) => [k, l, d.counts[k] || 0])]
        .map(([k, l, n]) => `<button data-s="${k}" aria-pressed="${k === st}">${l} <span class="muted">${num(n)}</span></button>`).join('')}</div>
      <span class="grow"></span>
      <form id="sf" style="display:flex;gap:6px"><input class="in" id="sq" placeholder="내용·메모 검색" value="${esc(q)}" style="width:200px"><button class="btn sm">찾기</button></form>
    </div>
    <div class="table-wrap"><table class="t"><thead><tr><th>번호</th><th>받은 때</th><th>분류</th><th>내용</th><th>답장 주소</th><th>상태</th></tr></thead><tbody>
    ${d.items.map(r => `<tr class="click" data-id="${r.id}" tabindex="0"><td class="n">${r.id}</td><td class="small">${ago(r.created_at)}</td>
      <td><span class="badge">${esc(r.categoryLabel)}</span></td><td><div class="clip">${esc(r.message)}</div></td>
      <td class="small muted">${r.hasEmail ? esc(r.email) : '없음'}</td><td><span class="badge ${INQ[r.status]?.[1] || ''}">${INQ[r.status]?.[0] || esc(r.status)}</span></td></tr>`).join('')
      || '<tr><td colspan="6"><div class="empty">조건에 맞는 문의가 없어요</div></td></tr>'}
    </tbody></table></div>
    ${d.pages > 1 ? `<div class="pager"><button class="btn sm" data-pg="${page - 1}" ${page <= 1 ? 'disabled' : ''}>이전</button><span>${page} / ${d.pages}</span><button class="btn sm" data-pg="${page + 1}" ${page >= d.pages ? 'disabled' : ''}>다음</button></div>` : ''}
    <p class="note" style="margin-top:16px">이메일은 가려서 보여 드려요. 답장할 때만 ‘이메일 보기’를 누르세요 — 누가 언제 열어 봤는지 활동 기록에 남아요. 답변을 마친 문의는 3년 뒤 자동으로 지워져요.</p>`;
  $$('.seg button', v).forEach(b => b.onclick = () => go({ status: b.dataset.s }));
  $('#sf').onsubmit = e => { e.preventDefault(); go({ q: $('#sq').value.trim() }); };
  $$('[data-pg]', v).forEach(b => b.onclick = () => go({ page: b.dataset.pg }));
  const open = id => { const it = d.items.find(x => x.id === id); if (it) openInquiry(it); };
  $$('tr.click', v).forEach(tr => { tr.onclick = () => open(Number(tr.dataset.id)); tr.onkeydown = e => { if (e.key === 'Enter') open(Number(tr.dataset.id)); }; });
  const want = Number(qs.get('open'));
  if (want) { const it = d.items.find(x => x.id === want); if (it) openInquiry(it); }
}
async function openInquiry(r) {
  const editable = can('manager');
  const body = document.createElement('div');
  body.innerHTML = `<dl class="kv">
      <dt>번호</dt><dd>#${r.id}</dd><dt>받은 때</dt><dd>${dt(r.created_at)}</dd>
      <dt>분류</dt><dd>${esc(r.categoryLabel)}</dd><dt>보낸 화면</dt><dd>${r.page ? esc(r.page) : '<span class="muted">없음</span>'}</dd>
      <dt>답장 주소</dt><dd id="em">${r.hasEmail ? `${esc(r.email)} ${editable ? '<button class="btn sm" id="rv">이메일 보기</button>' : ''}` : '<span class="muted">남기지 않았어요 — 공지로 답하거나 처리만 표시하세요</span>'}</dd>
      ${r.handled_at ? `<dt>처리</dt><dd>${dt(r.handled_at)} · ${esc(r.handled_by || '')}</dd>` : ''}
    </dl>
    <h4 style="margin:18px 0 8px;font-size:13px">내용</h4><div class="msg"></div>
    <div class="form-grid" style="margin-top:18px">
      <div class="field"><label for="ist">상태</label><select class="in" id="ist" ${editable ? '' : 'disabled'}>${Object.entries(INQ).map(([k, [l]]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field full"><label for="imemo">운영 메모 <span class="muted">(고객에게 보이지 않아요)</span></label><textarea class="in" id="imemo" ${editable ? '' : 'readonly'} placeholder="처리 내용, 답장 요지 등">${esc(r.memo || '')}</textarea></div>
    </div>`;
  $('.msg', body).textContent = r.message;
  const actions = [{ label: '닫기' }];
  if (editable) {
    actions.unshift({ label: '삭제', kind: 'danger', run: async () => {
      if (!(await confirmBox('문의 삭제', '이 문의를 지울까요? 되돌릴 수 없어요.', { ok: '지우기', danger: true }))) return false;
      await api('inquiries/' + r.id, { method: 'DELETE' }); toast('문의를 지웠어요'); render(); refreshBadge();
    } });
    actions.push({ label: '저장', kind: 'primary', run: async box => {
      await api('inquiries/' + r.id, { method: 'PATCH', body: { status: $('#ist', box).value, memo: $('#imemo', box).value } });
      toast('저장했어요'); render(); refreshBadge();
    } });
  }
  modal({ title: `문의 #${r.id}`, body, actions, drawer: true, onOpen: box => {
    const rv = $('#rv', box);
    if (rv) rv.onclick = async () => {
      try {
        const { email } = await api(`inquiries/${r.id}/reveal`, { method: 'POST', body: {} });
        const subj = encodeURIComponent('[여덟글자] 문의에 답장드려요');
        const quote = encodeURIComponent(`\n\n\n— 보내 주신 문의 (${dt(r.created_at)})\n${r.message.slice(0, 600)}`);
        $('#em', box).innerHTML = `<span style="user-select:all">${esc(email)}</span> <a class="btn sm primary" href="mailto:${esc(email)}?subject=${subj}&body=${quote}">메일로 답장</a>`;
        if ($('#ist', box).value === 'new') $('#ist', box).value = 'progress';
      } catch (e) { toast(e.message, true); }
    };
  } });
}

/* ════════ 출시 알림 신청 ════════ */
async function viewWaitlist(v) {
  const qs = query();
  const product = qs.get('product') || '', show = qs.get('show') || 'open';
  const [d, p] = await Promise.all([api(`waitlist?product=${product}&show=${show}`), api('products')]);
  const pname = Object.fromEntries(p.items.map(x => [x.id, x.name]));
  const go = o => { location.hash = '#/waitlist?' + new URLSearchParams({ product, show, ...o }); };
  const open = d.byProduct.reduce((a, r) => a + (r.open || 0), 0);
  crumb(`알림을 기다리는 ${num(open)}명`);
  v.innerHTML = `<div class="stack">
    <div class="grid g4">${p.items.filter(x => x.status !== 'hidden').map(x => {
      const r = d.byProduct.find(b => b.product === x.id) || {};
      return `<button class="kpi" style="text-align:left;cursor:pointer;${x.id === product ? 'border-color:var(--brand);' : ''}" data-p="${x.id}">
        <div class="k">${esc(x.name)}</div><div class="v">${num(r.open || 0)}</div><div class="d">${PSTAT[x.status]?.[0] || ''}${r.done ? ` · 보낸 ${num(r.done)}` : ''}</div></button>`;
    }).join('')}</div>
    <div class="toolbar">
      <select class="in" id="pf" style="width:auto"><option value="">모든 상품</option>${p.items.map(x => `<option value="${x.id}" ${x.id === product ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <div class="seg" role="group" aria-label="보기">${[['open', '알림 대기'], ['done', '보낸 기록'], ['all', '전체']].map(([k, l]) => `<button data-s="${k}" aria-pressed="${k === show}">${l}</button>`).join('')}</div>
      <span class="grow"></span>
      ${can('manager') ? `<button class="btn sm" id="exp">대기 명단 내려받기(CSV)</button><button class="btn sm primary" id="done" ${product ? '' : 'disabled title="상품을 먼저 고르세요"'}>이 상품 알림 보냄으로 표시</button>` : ''}
    </div>
    <div class="table-wrap"><table class="t"><thead><tr><th>신청한 때</th><th>상품</th><th>이메일</th><th>상태</th><th></th></tr></thead><tbody>
      ${d.items.map(r => `<tr data-id="${r.id}"><td class="small">${dt(r.created_at)}</td><td>${esc(pname[r.product] || r.product)}</td>
        <td class="em small">${esc(r.email)}</td><td>${r.notified_at ? `<span class="badge b-ok">보냄 · ${dt(r.notified_at, false)}</span>` : '<span class="badge b-info">대기</span>'}</td>
        <td style="text-align:right;white-space:nowrap">${can('manager') ? `<button class="btn sm ghost" data-rv="${r.id}">보기</button><button class="btn sm ghost" data-del="${r.id}">삭제</button>` : ''}</td></tr>`).join('')
        || '<tr><td colspan="5"><div class="empty">신청이 없어요</div></td></tr>'}
    </tbody></table></div>
    <div class="note"><b>보내는 순서</b> — ① 결제가 열리면 상품을 고르고 ‘대기 명단 내려받기’ ② 메일 프로그램에서 <b>숨은 참조(BCC)</b>로 한 번에 보내기 ③ ‘알림 보냄으로 표시’.
      보냄으로 표시한 주소는 30일 뒤, 신청 후 1년이 지난 주소는 자동으로 지워져요(개인정보처리방침의 보유 기간). 신청자가 삭제를 요청하면 ‘삭제’로 바로 지워 주세요.</div>
  </div>`;
  $$('[data-p]', v).forEach(b => b.onclick = () => go({ product: b.dataset.p === product ? '' : b.dataset.p }));
  $('#pf').onchange = e => go({ product: e.target.value });
  $$('.seg button', v).forEach(b => b.onclick = () => go({ show: b.dataset.s }));
  $$('[data-rv]', v).forEach(b => b.onclick = async () => {
    try { const { email } = await api(`waitlist/${b.dataset.rv}/reveal`, { method: 'POST', body: {} }); b.closest('tr').querySelector('.em').textContent = email; b.remove(); }
    catch (e) { toast(e.message, true); }
  });
  $$('[data-del]', v).forEach(b => b.onclick = async () => {
    if (!(await confirmBox('신청 삭제', '이 알림 신청을 지울까요? 본인이 삭제를 요청했을 때 쓰세요.', { ok: '지우기', danger: true }))) return;
    await api('waitlist/' + b.dataset.del, { method: 'DELETE' }); toast('지웠어요'); render();
  });
  $('#exp')?.addEventListener('click', async () => {
    try {
      const r = await api('waitlist/export', { method: 'POST', body: { product } });
      if (!r.items.length) return toast('내려받을 대기 명단이 없어요');
      download(`yeodeol-waitlist-${product || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`,
        csv(r.items, [['id', '번호'], ['created_at', '신청 시각(UTC)'], ['product_name', '상품'], ['email', '이메일']]));
      toast(`${r.items.length}명을 내려받았어요 · 활동 기록에 남았어요`);
    } catch (e) { toast(e.message, true); }
  });
  $('#done')?.addEventListener('click', async () => {
    if (!(await confirmBox('알림 보냄으로 표시', `‘${esc(pname[product])}’ 대기 명단 전체를 알림 보낸 것으로 표시할까요? 30일 뒤 자동으로 지워져요.`, { ok: '표시하기' }))) return;
    const r = await api('waitlist/notified', { method: 'POST', body: { product } });
    toast(`${r.n}명을 보냄으로 표시했어요`); render();
  });
}

/* ════════ 상품·가격 ════════ */
async function viewProducts(v) {
  const d = await api('products');
  const editable = can('manager');
  crumb(`${d.items.length}개 · 사이트의 가격 표시와 결제 버튼이 여기 값을 따라가요`);
  v.innerHTML = `<div class="stack">
    <div class="note info"><b>상태별로 사이트에서 이렇게 보여요</b><br>
      · <b>준비 중</b> — 버튼 옆에 ‘준비 중’ 표시가 붙고, 누르면 이메일로 출시 알림을 신청받아요.<br>
      · <b>판매 중</b> — 버튼이 결제 링크(스마트스토어·토스 링크페이·결제창 등)로 바로 이어져요. 링크가 있어야 고를 수 있어요.<br>
      · <b>잠시 멈춤</b> — ‘잠시 쉬는 중’으로 보이고 신청을 받지 않아요. · <b>숨김</b> — 버튼과 알림 신청이 사라져요.</div>
    <div class="table-wrap"><table class="t"><thead><tr><th>상품</th><th class="n">가격</th><th>상태</th><th class="n">알림 대기</th><th class="n">관심 30일</th><th>결제 링크</th><th></th></tr></thead><tbody>
    ${d.items.map(p => `<tr class="click" data-id="${p.id}" tabindex="0">
      <td><b>${esc(p.name)}</b><div class="small muted">${esc(p.summary || '')}</div></td>
      <td class="n" style="white-space:nowrap">${esc(p.price_label || won(p.price))}</td>
      <td><span class="badge ${PSTAT[p.status]?.[1] || ''}">${PSTAT[p.status]?.[0] || esc(p.status)}</span></td>
      <td class="n">${num(p.waitlist)}</td><td class="n">${num(p.wish30)}</td>
      <td class="small">${p.buy_url ? '<span class="badge b-ok">있음</span>' : '<span class="muted">없음</span>'}</td>
      <td style="text-align:right"><button class="btn sm">${editable ? '고치기' : '보기'}</button></td></tr>`).join('')}
    </tbody></table></div>
    <p class="note">결제 기능을 직접 붙이기 전에는 판매 채널(스마트스토어 디지털 상품, 토스페이먼츠 링크페이 등)의 결제 링크로 바로 팔 수 있어요. 유료 판매 전에는 <a href="#/settings">통신판매업 신고번호</a>를 꼭 채워 주세요.</p>
  </div>`;
  const open = id => editProduct(d.items.find(x => x.id === id), editable);
  $$('tr.click', v).forEach(tr => { tr.onclick = () => open(tr.dataset.id); tr.onkeydown = e => { if (e.key === 'Enter') open(tr.dataset.id); }; });
}
function editProduct(p, editable) {
  const ro = editable ? '' : 'readonly', dis = editable ? '' : 'disabled';
  const body = document.createElement('div');
  body.innerHTML = `<p class="small sub" style="margin:0 0 14px">알림 대기 <b>${num(p.waitlist)}</b>명 · 최근 30일 관심 표시 <b>${num(p.wish30)}</b> · 코드 ${esc(p.id)}</p>
    <div class="form-grid">
      <div class="field"><label>이름</label><input class="in" name="name" value="${esc(p.name)}" maxlength="40" ${ro}></div>
      <div class="field"><label>상태</label><select class="in" name="status" ${dis}>${Object.entries(PSTAT).map(([k, [l]]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>가격(원)</label><input class="in" name="price" type="number" min="0" step="100" value="${p.price}" ${ro}></div>
      <div class="field"><label>표시 가격 <span class="muted">(선택)</span></label><input class="in" name="price_label" value="${esc(p.price_label || '')}" placeholder="예: 월 4,900원" maxlength="30" ${ro}>
        <span class="hint">비워 두면 ‘${esc(won(p.price))}’처럼 보여요</span></div>
      <div class="field full"><label>결제 링크 <span class="muted">(판매 중일 때 필수 · https://)</span></label><input class="in" name="buy_url" value="${esc(p.buy_url || '')}" placeholder="https://" ${ro}></div>
      <div class="field full"><label>한 줄 설명 <span class="muted">(관리용)</span></label><input class="in" name="summary" value="${esc(p.summary || '')}" maxlength="120" ${ro}></div>
    </div>`;
  const actions = [{ label: '닫기' }];
  if (editable) actions.push({ label: '저장', kind: 'primary', run: async box => {
    const f = n => $(`[name="${n}"]`, box).value;
    await api('products/' + p.id, { method: 'PUT', body: { name: f('name'), status: f('status'), price: Number(f('price')), price_label: f('price_label'), buy_url: f('buy_url'), summary: f('summary') } });
    toast('저장했어요 · 사이트에는 1~2분 안에 반영돼요'); render();
  } });
  modal({ title: p.name, body, actions, wide: true });
}

/* ════════ 공지·배너 ════════ */
async function viewNotices(v) {
  const d = await api('notices');
  const editable = can('manager');
  const now = Date.now();
  const state = n => {
    if (!n.active) return ['내림', ''];
    if (n.starts_at && new Date(n.starts_at) > now) return ['예약', 'b-info'];
    if (n.ends_at && new Date(n.ends_at) < now) return ['기간 끝', ''];
    return ['게시 중', 'b-ok'];
  };
  crumb('상단 띠 배너는 모든 화면 맨 위에, 공지사항은 /notice 에 보여요');
  v.innerHTML = `<div class="toolbar"><span class="grow"></span>${editable ? '<button class="btn primary" id="nw">새로 쓰기</button>' : ''}</div>
    <div class="table-wrap"><table class="t"><thead><tr><th>종류</th><th>제목</th><th>게시 기간</th><th>상태</th><th>고침</th></tr></thead><tbody>
    ${d.items.map(n => { const [l, c] = state(n); return `<tr class="click" data-id="${n.id}" tabindex="0">
      <td><span class="badge ${n.kind === 'banner' ? 'b-brand' : ''}">${n.kind === 'banner' ? '띠 배너' : '공지'}</span>${n.pinned ? ' <span class="badge b-warn">고정</span>' : ''}</td>
      <td><div class="clip">${esc(n.title)}</div></td>
      <td class="small">${n.starts_at ? dt(n.starts_at) : '바로'} ~ ${n.ends_at ? dt(n.ends_at) : '계속'}</td>
      <td><span class="badge ${c}">${l}</span></td><td class="small muted">${ago(n.updated_at || n.created_at)}</td></tr>`; }).join('')
      || '<tr><td colspan="5"><div class="empty">아직 공지가 없어요. 오픈 안내부터 하나 써 보세요.</div></td></tr>'}
    </tbody></table></div>
    <p class="note" style="margin-top:16px">띠 배너는 한 번에 하나만 보여요(고정 → 최신 순). 문구는 짧게, 느낌표 없이 — ‘신년 묶음 알림 신청을 받고 있어요’처럼요.</p>`;
  $('#nw')?.addEventListener('click', () => editNotice(null));
  $$('tr.click', v).forEach(tr => { const n = d.items.find(x => x.id === Number(tr.dataset.id)); tr.onclick = () => editNotice(n); tr.onkeydown = e => { if (e.key === 'Enter') editNotice(n); }; });
}
function editNotice(n) {
  const editable = can('manager');
  const body = document.createElement('div');
  const ro = editable ? '' : 'disabled';
  body.innerHTML = `<div class="form-grid">
    <div class="field"><label>종류</label><select class="in" id="nk" ${ro}><option value="notice">공지사항 (/notice)</option><option value="banner">상단 띠 배너 (모든 화면)</option></select></div>
    <div class="field"><label>게시</label><div style="display:flex;gap:14px;align-items:center;min-height:38px">
      <label class="check"><input type="checkbox" id="na" ${!n || n.active ? 'checked' : ''} ${ro}> 게시 중</label>
      <label class="check"><input type="checkbox" id="np" ${n?.pinned ? 'checked' : ''} ${ro}> 맨 위 고정</label></div></div>
    <div class="field full"><label for="nt">제목</label><input class="in" id="nt" maxlength="120" value="${esc(n?.title || '')}" ${ro}></div>
    <div class="field full" id="nbw"><label for="nb">본문 <span class="muted">(줄바꿈 그대로 보여요)</span></label><textarea class="in" id="nb" style="min-height:160px" ${ro}>${esc(n?.body || '')}</textarea></div>
    <div class="field"><label for="nl">링크 <span class="muted">(선택)</span></label><input class="in" id="nl" placeholder="/report 또는 https://" value="${esc(n?.link || '')}" ${ro}></div>
    <div class="field"><label for="nll">링크 글자</label><input class="in" id="nll" maxlength="20" placeholder="자세히 보기" value="${esc(n?.link_label || '')}" ${ro}></div>
    <div class="field"><label for="ns">시작 <span class="muted">(비우면 바로)</span></label><input class="in" type="datetime-local" id="ns" value="${toLocalInput(n?.starts_at)}" ${ro}></div>
    <div class="field"><label for="ne">끝 <span class="muted">(비우면 계속)</span></label><input class="in" type="datetime-local" id="ne" value="${toLocalInput(n?.ends_at)}" ${ro}></div>
    <div class="field full"><span class="lab">띠 배너 미리 보기</span><div class="banner-prev" id="bp"></div></div>
  </div>`;
  $('#nk', body).value = n?.kind || 'notice';
  const prev = () => {
    const isB = $('#nk', body).value === 'banner';
    $('#nbw', body).hidden = isB;
    $('#bp', body).closest('.field').hidden = !isB;
    $('#bp', body).innerHTML = `<span>${esc($('#nt', body).value || '배너 문구')}</span>${$('#nl', body).value ? `<a>${esc($('#nll', body).value || '자세히')} →</a>` : ''}`;
  };
  ['#nk', '#nt', '#nl', '#nll'].forEach(s => $(s, body).addEventListener('input', prev));
  prev();
  const actions = [{ label: '닫기' }];
  if (editable && n) actions.unshift({ label: '삭제', kind: 'danger', run: async () => {
    if (!(await confirmBox('공지 삭제', '이 공지를 지울까요?', { ok: '지우기', danger: true }))) return false;
    await api('notices/' + n.id, { method: 'DELETE' }); toast('지웠어요'); render();
  } });
  if (editable) actions.push({ label: n ? '저장' : '게시하기', kind: 'primary', run: async box => {
    const body = { kind: $('#nk', box).value, title: $('#nt', box).value, body: $('#nb', box).value, link: $('#nl', box).value,
      link_label: $('#nll', box).value, active: $('#na', box).checked, pinned: $('#np', box).checked,
      starts_at: fromLocalInput($('#ns', box).value), ends_at: fromLocalInput($('#ne', box).value) };
    await api(n ? 'notices/' + n.id : 'notices', { method: n ? 'PUT' : 'POST', body });
    toast('저장했어요 · 사이트에는 1~2분 안에 반영돼요'); render();
  } });
  modal({ title: n ? '공지 고치기' : '새 공지', body, actions, wide: true });
}

/* ════════ 설정 ════════ */
const SETTING_GROUPS = [
  { title: '사업자 정보', note: '전자상거래법 제10조에 따라 사이트 첫 화면(푸터)에 보여야 하는 정보예요. 채우면 모든 화면 아래에 자동으로 표시돼요. 비어 있는 칸은 숨겨져요.', fields: [
    ['biz.name', '상호(법인명)', '예: 주식회사 ○○'], ['biz.ceo', '대표자', ''], ['biz.regno', '사업자등록번호', '000-00-00000'],
    ['biz.mailorder', '통신판매업 신고번호', '예: 제2026-서울마포-0000호 — 유료 판매 전 필수'], ['biz.address', '사업장 주소', '', 'full'],
    ['biz.phone', '대표 전화', ''], ['biz.email', '대표 이메일', ''], ['biz.hosting', '호스팅 제공자', 'Cloudflare, Inc.'],
  ] },
  { title: '개인정보 보호책임자', note: '개인정보처리방침과 푸터에 이름과 연락처가 들어가요.', fields: [
    ['privacy.officer', '책임자 이름(직책)', '예: 홍길동 (대표)'], ['privacy.contact', '연락처(이메일 또는 전화)', ''],
  ] },
  { title: '고객센터', note: '문의하기 화면과 이용약관에 들어가요.', fields: [
    ['cs.email', '고객센터 이메일', ''], ['cs.hours', '응대 시간', '평일 10:00–18:00'], ['cs.reply_days', '답장까지 걸리는 날(영업일)', '2'],
  ] },
  { title: '약관·방침', note: '이용약관과 개인정보처리방침의 시행일이에요. 내용을 크게 바꿀 때는 7일 전에 공지하고 날짜를 바꾸세요.', fields: [
    ['legal.effective', '시행일', '2026-11-17'],
  ] },
];
async function viewSettings(v) {
  const { settings: s } = await api('settings');
  const editable = can('owner');
  crumb(editable ? '바꾼 값은 1~2분 안에 사이트에 반영돼요' : '최고관리자만 고칠 수 있어요');
  v.innerHTML = `<form id="sf" class="stack">
    ${SETTING_GROUPS.map(g => `<section class="card"><div class="ch"><h2>${g.title}</h2></div><p class="note" style="margin:0 0 14px">${g.note}</p>
      <div class="form-grid">${g.fields.map(([k, l, ph, full]) => `<div class="field ${full ? 'full' : ''}"><label for="${k}">${l}</label>
        <input class="in" id="${k}" name="${k}" value="${esc(s[k])}" placeholder="${esc(ph)}" ${editable ? '' : 'readonly'}></div>`).join('')}</div></section>`).join('')}
    <section class="card"><div class="ch"><h2>받기 스위치</h2></div>
      <div style="display:flex;gap:22px;flex-wrap:wrap">
        <label class="check"><input type="checkbox" id="site.inquiry_open" ${s['site.inquiry_open'] !== '0' ? 'checked' : ''} ${editable ? '' : 'disabled'}> 문의 받기</label>
        <label class="check"><input type="checkbox" id="site.notify_open" ${s['site.notify_open'] !== '0' ? 'checked' : ''} ${editable ? '' : 'disabled'}> 출시 알림 신청 받기</label>
      </div><p class="hint small muted" style="margin:10px 0 0">끄면 해당 양식 대신 ‘잠시 쉬고 있어요’ 안내가 보여요. 휴가나 점검 때 쓰세요.</p></section>
    <section class="card"><div class="ch"><h2>검색엔진 등록</h2></div>
      <div class="rows">
        <div class="row"><span class="badge b-ok">반영됨</span><span>네이버 서치어드바이저 소유확인 메타 태그 — 홈 화면 &lt;head&gt;</span>
          <a style="margin-left:auto" href="https://searchadvisor.naver.com/console/board" target="_blank" rel="noopener">서치어드바이저 ↗</a></div>
        <div class="row"><span class="badge">제출할 것</span><span>사이트맵 https://yeodeol.kr/sitemap.xml · RSS https://yeodeol.kr/rss.xml</span></div>
        <div class="row"><span class="badge b-warn">1년마다</span><span>HTML 태그 방식 소유확인은 1년마다 다시 확인이 필요해요</span></div>
      </div></section>
    ${editable ? '<div class="savebar"><span class="err" id="se"></span><button class="btn primary">설정 저장</button></div>' : ''}
  </form>`;
  if (!editable) return;
  $('#sf').onsubmit = async e => {
    e.preventDefault();
    const body = {};
    for (const g of SETTING_GROUPS) for (const [k] of g.fields) body[k] = $(`[id="${k}"]`).value.trim();
    body['site.inquiry_open'] = $('[id="site.inquiry_open"]').checked ? '1' : '0';
    body['site.notify_open'] = $('[id="site.notify_open"]').checked ? '1' : '0';
    $('#se').textContent = '';
    try { const r = await api('settings', { method: 'PUT', body }); toast(r.changed.length ? `${r.changed.length}개 항목을 저장했어요` : '바뀐 값이 없어요'); }
    catch (err) { $('#se').textContent = err.message; }
  };
}

/* ════════ 계정·권한 ════════ */
async function viewAccounts(v) {
  const d = await api('accounts');
  crumb(`${d.items.length}개 계정`);
  v.innerHTML = `<div class="stack">
    <div class="note"><b>권한</b> — 최고관리자: 모든 것 · 운영: 문의·알림 신청·상품·공지 처리, 이메일 열람 · 조회: 숫자와 목록만(이메일은 가려진 채로).
      새 계정은 임시 비밀번호로 시작하고, 처음 로그인할 때 본인 비밀번호로 바꿔야 해요.</div>
    <div class="toolbar"><span class="grow"></span><button class="btn primary" id="add">계정 추가</button></div>
    <div class="table-wrap"><table class="t"><thead><tr><th>아이디</th><th>이름</th><th>권한</th><th>상태</th><th>마지막 로그인</th><th></th></tr></thead><tbody>
    ${d.items.map(a => `<tr data-id="${a.id}"><td>${esc(a.login)}${a.id === S.me.id ? ' <span class="badge b-brand">나</span>' : ''}</td><td>${esc(a.name)}</td>
      <td><select class="in" data-role style="min-height:32px;padding:4px 8px;width:auto" ${a.id === S.me.id ? 'disabled' : ''}>${Object.entries(ROLE).map(([k, l]) => `<option value="${k}" ${k === a.role ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td>${a.active ? (a.must_change ? '<span class="badge b-warn">첫 로그인 대기</span>' : '<span class="badge b-ok">사용 중</span>') : '<span class="badge">사용 중지</span>'}</td>
      <td class="small">${a.last_login_at ? ago(a.last_login_at) : '<span class="muted">없음</span>'}</td>
      <td style="text-align:right;white-space:nowrap">${a.id === S.me.id ? '' : `<button class="btn sm ghost" data-reset>비밀번호 초기화</button><button class="btn sm ghost" data-act="${a.active ? 0 : 1}">${a.active ? '사용 중지' : '다시 사용'}</button>`}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  const showTemp = (title, login, pw) => modal({ title, body: `<p style="margin:0 0 12px;line-height:1.8"><b>${esc(login)}</b> 계정의 임시 비밀번호예요. 이 창을 닫으면 다시 볼 수 없어요. 본인에게 따로 전해 주세요.</p>
    <div class="secret">${esc(pw)}</div><p class="small muted" style="margin:12px 0 0">처음 로그인하면 새 비밀번호를 정하는 화면이 먼저 나와요.</p>`, actions: [{ label: '전달했어요', kind: 'primary' }] });
  $('#add').onclick = () => {
    const body = document.createElement('div');
    body.innerHTML = `<div class="stack"><div class="field"><label>아이디</label><input class="in" id="al" placeholder="영문 소문자·숫자 3~32자"></div>
      <div class="field"><label>이름</label><input class="in" id="an"></div>
      <div class="field"><label>권한</label><select class="in" id="ar"><option value="manager">운영</option><option value="viewer">조회</option><option value="owner">최고관리자</option></select></div></div>`;
    modal({ title: '계정 추가', body, actions: [{ label: '취소' }, { label: '만들기', kind: 'primary', run: async box => {
      const login = $('#al', box).value;
      const r = await api('accounts', { method: 'POST', body: { login, name: $('#an', box).value, role: $('#ar', box).value } });
      setTimeout(() => showTemp('계정을 만들었어요', login, r.tempPassword), 50); render();
    } }] });
  };
  $$('tr[data-id]', v).forEach(tr => {
    const id = tr.dataset.id, a = d.items.find(x => String(x.id) === id);
    $('[data-role]', tr)?.addEventListener('change', async e => {
      try { await api('accounts/' + id, { method: 'PATCH', body: { role: e.target.value } }); toast('권한을 바꿨어요'); }
      catch (err) { toast(err.message, true); render(); }
    });
    $('[data-act]', tr)?.addEventListener('click', async e => {
      const on = e.target.dataset.act === '1';
      if (!on && !(await confirmBox('사용 중지', `${esc(a.login)} 계정의 로그인을 막을까요? 지금 열려 있는 로그인도 끊겨요.`, { ok: '사용 중지', danger: true }))) return;
      try { await api('accounts/' + id, { method: 'PATCH', body: { active: on } }); toast(on ? '다시 쓸 수 있게 했어요' : '사용을 멈췄어요'); render(); }
      catch (err) { toast(err.message, true); }
    });
    $('[data-reset]', tr)?.addEventListener('click', async () => {
      if (!(await confirmBox('비밀번호 초기화', `${esc(a.login)} 계정에 새 임시 비밀번호를 만들까요? 지금 비밀번호는 바로 못 쓰게 돼요.`, { ok: '초기화', danger: true }))) return;
      try { const r = await api(`accounts/${id}/reset`, { method: 'POST', body: {} }); showTemp('임시 비밀번호를 만들었어요', a.login, r.tempPassword); render(); }
      catch (err) { toast(err.message, true); }
    });
  });
}

/* ════════ 활동 기록 ════════ */
async function viewAudit(v) {
  const page = Number(query().get('page')) || 1;
  const d = await api('audit?page=' + page);
  crumb('누가 언제 무엇을 했는지 — 2년 보관');
  v.innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>때</th><th>누가</th><th>무엇을</th><th>대상</th><th>내용</th></tr></thead><tbody>
    ${d.items.map(a => `<tr><td class="small" style="white-space:nowrap">${dt(a.at)}</td><td class="small">${esc(a.admin_name || '—')}</td>
      <td><span class="badge ${a.action === 'login_fail' ? 'b-bad' : a.action.includes('reveal') || a.action.includes('export') ? 'b-warn' : ''}">${esc(AUDIT[a.action] || a.action)}</span></td>
      <td class="small">${esc(a.target || '')}</td><td class="small muted"><div class="clip">${esc(a.detail || '')}</div></td></tr>`).join('')
      || '<tr><td colspan="5"><div class="empty">기록이 없어요</div></td></tr>'}
    </tbody></table></div>
    ${d.pages > 1 ? `<div class="pager"><button class="btn sm" data-pg="${page - 1}" ${page <= 1 ? 'disabled' : ''}>이전</button><span>${page} / ${d.pages}</span><button class="btn sm" data-pg="${page + 1}" ${page >= d.pages ? 'disabled' : ''}>다음</button></div>` : ''}`;
  $$('[data-pg]', v).forEach(b => b.onclick = () => { location.hash = '#/audit?page=' + b.dataset.pg; });
}

/* ════════ 데이터·시스템 ════════ */
async function viewSystem(v) {
  const d = await api('system');
  const L = { admins: '관리자 계정', sessions: '열린 로그인', inquiries: '문의', waitlist: '출시 알림 신청', stats_daily: '통계 줄', notices: '공지', products: '상품', audit: '활동 기록' };
  crumb(`스키마 v${d.schema}`);
  v.innerHTML = `<div class="stack">
    <section class="card"><div class="ch"><h2>저장된 것</h2><span class="sub">Cloudflare D1 · ${d.statsSince ? `통계는 ${d.statsSince}부터` : '통계 없음'}</span></div>
      <div class="grid g4">${Object.entries(d.counts).map(([k, n]) => `<div class="kpi"><div class="k">${L[k] || k}</div><div class="v">${num(n)}</div></div>`).join('')}</div></section>
    <section class="card"><div class="ch"><h2>보유 기간과 자동 파기</h2></div>
      <table class="t"><thead><tr><th>무엇</th><th>얼마나</th><th>근거</th></tr></thead><tbody>
        <tr><td>출시 알림 이메일</td><td>알림을 보낸 뒤 30일, 늦어도 신청 후 1년</td><td>개인정보처리방침 · 수집 목적 달성</td></tr>
        <tr><td>문의(답장 주소 포함)</td><td>처리를 마친 뒤 3년</td><td>전자상거래법 시행령 — 소비자 불만·분쟁처리 기록</td></tr>
        <tr><td>활동 기록</td><td>2년</td><td>내부 관리</td></tr>
        <tr><td>방문 통계</td><td>기한 없음</td><td>날짜별 숫자 합계뿐이라 개인정보가 아님</td></tr>
        <tr><td>생년월일·감정 기록·일기</td><td>서버에 없음</td><td>방문자 기기(localStorage)에만 저장</td></tr>
      </tbody></table>
      <p class="small muted" style="margin:12px 0 0">대시보드를 열 때마다 기간이 지난 기록을 자동으로 지워요. 지금 바로 정리하려면 아래 버튼을 누르세요.</p>
      ${can('manager') ? '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="pg">지금 정리하기</button>' + (can('owner') ? '<a class="btn sm" href="/api/admin/backup" download>전체 백업 내려받기(JSON)</a>' : '') + '</div>' : ''}</section>
    <section class="card"><div class="ch"><h2>연결 상태</h2></div><div class="rows">
      <div class="row"><span class="badge b-ok">연결됨</span><span>데이터베이스(D1 · 바인딩 이름 DB)</span></div>
      <div class="row"><span class="badge b-ok">닫힘</span><span>첫 계정 설정 화면 — 최고관리자가 만들어진 뒤로는 다시 열리지 않아요</span></div>
      <div class="row"><span class="badge b-info">자동</span><span>GitHub main 브랜치에 올리면 Cloudflare Pages가 1~2분 안에 배포해요</span></div>
    </div></section>
  </div>`;
  $('#pg')?.addEventListener('click', async () => {
    const r = await api('system/purge', { method: 'POST', body: {} });
    toast(`알림 신청 ${r.waitlist}건 · 문의 ${r.inquiries}건을 지웠어요`); render();
  });
}

/* ════════ 내 정보 ════════ */
async function viewMe(v) {
  crumb('');
  v.innerHTML = `<div class="grid g2">
    <section class="card"><div class="ch"><h2>내 계정</h2></div>
      <dl class="kv"><dt>이름</dt><dd>${esc(S.me.name)}</dd><dt>아이디</dt><dd>${esc(S.me.login)}</dd><dt>권한</dt><dd>${ROLE[S.me.role]}</dd></dl>
      <hr class="sep"><button class="btn" id="lo">로그아웃</button></section>
    <section class="card"><div class="ch"><h2>비밀번호 바꾸기</h2></div>${passwordForm('pf')}</section></div>`;
  wirePasswordForm('pf', () => { $('#pf').reset(); });
  $('#lo').onclick = async () => { await api('logout', { method: 'POST', body: {} }).catch(() => {}); S.me = null; location.hash = ''; start(); };
}

start();
