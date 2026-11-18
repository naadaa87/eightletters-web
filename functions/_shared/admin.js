/* 여덟글자 서버 — 관리자 API (/api/admin/*) */
import { json, readBody, fail, clean, emailOk, maskEmail, sameOrigin, limit, sha256hex } from './http.js';
import { getSettings, kstDay, kstMonth, nowIso, purge, DEFAULT_SETTINGS, SCHEMA_VERSION } from './db.js';
import {
  ROLES, hashPassword, verifyPassword, passwordProblem, tempPassword, ipKey,
  createSession, currentAdmin, destroySession, sessionCookie, clearCookie, need, audit,
} from './auth.js';
import { purgeConfigCache } from './public.js';

const LOGIN_RE = /^[a-z0-9._-]{3,32}$/;
/* 첫 최고관리자를 만들 때 쓰는 일회용 설정 키.
   원래 값은 저장소에 없고, 해시만 둡니다. Cloudflare 환경변수 ADMIN_SETUP_KEY 를 넣으면 그 값이 우선해요.
   첫 계정이 만들어지면 설정 화면은 영영 닫히므로, 그 뒤에는 이 값이 아무 의미가 없어요. */
const SETUP_KEY_SHA256 = 'affde341daab86d5d40710893876f5c02712d0e10023fc6b0bf8c231e2ade016';
async function setupKeyOk(env, key) {
  if (env.ADMIN_SETUP_KEY) return String(key) === String(env.ADMIN_SETUP_KEY);
  return (await sha256hex('yeodeol-setup|' + String(key))) === SETUP_KEY_SHA256;
}
const PRODUCT_STATUS = ['soon', 'open', 'paused', 'hidden'];
const INQ_STATUS = ['new', 'progress', 'done', 'closed'];
const CAT_LABEL = { use: '이용 문의', bug: '오류 제보', pay: '결제·환불', partner: '제휴·제안', etc: '기타' };
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

const isSecure = req => new URL(req.url).protocol === 'https:';
const pub = a => a && { id: a.id, login: a.login, name: a.name, role: a.role, roleLabel: ROLES[a.role]?.label, mustChange: a.mustChange };

export async function handleAdmin(ctx, path, method) {
  const { request, env } = ctx;
  const db = env.DB;

  // 쓰기 요청은 같은 출처 + 전용 헤더가 있어야 합니다
  if (method !== 'GET' && method !== 'HEAD') {
    if (!sameOrigin(request) || request.headers.get('x-admin') !== '1') fail(403, '허용되지 않은 요청이에요.', 'CSRF');
  }

  /* ── 인증 없이 열리는 것 ── */
  if (path === 'state' && method === 'GET') {
    const n = await db.prepare(`SELECT COUNT(*) AS n FROM admins`).first('n');
    const me = await currentAdmin(db, request);
    return json({ needsSetup: n === 0, setupKeyConfigured: true, me: pub(me) });
  }
  if (path === 'setup' && method === 'POST') return setup(ctx);
  if (path === 'login' && method === 'POST') return login(ctx);
  if (path === 'logout' && method === 'POST') {
    const me = await currentAdmin(db, request);
    await destroySession(db, request);
    if (me) await audit(db, me, 'logout');
    return json({ ok: true }, 200, { 'set-cookie': clearCookie(isSecure(request)) });
  }

  /* ── 여기부터 로그인 필요 ── */
  const me = await currentAdmin(db, request);
  need(me, 'viewer');
  if (me.mustChange && !(path === 'me/password' || path === 'me')) fail(403, '먼저 비밀번호를 바꿔 주세요.', 'MUST_CHANGE');

  const seg = path.split('/');
  const id = seg[1] && /^\d+$/.test(seg[1]) ? Number(seg[1]) : null;

  switch (true) {
    case path === 'me' && method === 'GET': return json({ me: pub(me) });
    case path === 'me/password' && method === 'POST': return changePassword(ctx, me);
    case path === 'dashboard' && method === 'GET': return dashboard(ctx, me);
    case path === 'stats' && method === 'GET': return stats(ctx, me);
    case path === 'kpi' && method === 'GET': return kpi(ctx, me);
    case path === 'kpi/goals' && method === 'PUT': return saveGoals(ctx, me);

    case path === 'members' && method === 'GET': return listMembers(ctx, me);
    case path === 'members/export' && method === 'POST': return exportMembers(ctx, me);

    case path === 'inquiries' && method === 'GET': return listInquiries(ctx, me);
    case seg[0] === 'inquiries' && id && seg.length === 2 && method === 'PATCH': return updateInquiry(ctx, me, id);
    case seg[0] === 'inquiries' && id && seg.length === 2 && method === 'DELETE': return deleteInquiry(ctx, me, id);
    case seg[0] === 'inquiries' && id && seg[2] === 'reveal' && method === 'POST': return revealInquiry(ctx, me, id);

    case path === 'waitlist' && method === 'GET': return listWaitlist(ctx, me);
    case path === 'waitlist/export' && method === 'POST': return exportWaitlist(ctx, me);
    case path === 'waitlist/notified' && method === 'POST': return markNotified(ctx, me);
    case seg[0] === 'waitlist' && id && seg.length === 2 && method === 'DELETE': return deleteWaitlist(ctx, me, id);
    case seg[0] === 'waitlist' && id && seg[2] === 'reveal' && method === 'POST': return revealWaitlist(ctx, me, id);

    case path === 'products' && method === 'GET': return listProducts(ctx, me);
    case seg[0] === 'products' && seg.length === 2 && method === 'PUT': return updateProduct(ctx, me, seg[1]);

    case path === 'notices' && method === 'GET': return listNotices(ctx, me);
    case path === 'notices' && method === 'POST': return saveNotice(ctx, me, null);
    case seg[0] === 'notices' && id && method === 'PUT': return saveNotice(ctx, me, id);
    case seg[0] === 'notices' && id && method === 'DELETE': return deleteNotice(ctx, me, id);

    case path === 'settings' && method === 'GET': return json({ settings: await publicSettings(db) });
    case path === 'settings' && method === 'PUT': return saveSettings(ctx, me);

    case path === 'accounts' && method === 'GET': return listAccounts(ctx, me);
    case path === 'accounts' && method === 'POST': return createAccount(ctx, me);
    case seg[0] === 'accounts' && id && seg.length === 2 && method === 'PATCH': return updateAccount(ctx, me, id);
    case seg[0] === 'accounts' && id && seg[2] === 'reset' && method === 'POST': return resetAccount(ctx, me, id);

    case path === 'audit' && method === 'GET': need(me, 'manager'); return listAudit(ctx, me);
    case path === 'system' && method === 'GET': return system(ctx, me);
    case path === 'system/purge' && method === 'POST': return runPurge(ctx, me);
    case path === 'backup' && method === 'GET': return backup(ctx, me);
  }
  fail(404, '없는 기능이에요.', 'NOT_FOUND');
}

/* ════════ 인증 ════════ */
async function setup(ctx) {
  const { request, env } = ctx;
  const db = env.DB;
  const n = await db.prepare(`SELECT COUNT(*) AS n FROM admins`).first('n');
  if (n > 0) fail(409, '이미 최고관리자가 만들어져 있어요. 로그인해 주세요.', 'DONE');
  await limit(db, 'setup:' + await ipKey(db, request), 6, 900);
  const b = await readBody(request);
  if (!(await setupKeyOk(env, b.key || ''))) fail(403, '설정 키가 맞지 않아요.', 'KEY');
  const login = clean(b.login, 32).toLowerCase();
  const name = clean(b.name, 30);
  if (!LOGIN_RE.test(login)) fail(400, '아이디는 영문 소문자·숫자·.-_ 로 3~32자예요.', 'LOGIN');
  if (!name) fail(400, '이름을 적어 주세요.', 'NAME');
  const prob = passwordProblem(b.password, login);
  if (prob) fail(400, prob, 'PW');
  const { hash, salt } = await hashPassword(b.password);
  const r = await db.prepare(`INSERT INTO admins(login,name,role,pw_hash,pw_salt,created_at) VALUES(?1,?2,'owner',?3,?4,?5)`)
    .bind(login, name, hash, salt, nowIso()).run();
  const admin = { id: r.meta.last_row_id, login, name, role: 'owner' };
  await audit(db, admin, 'setup', login);
  const s = await createSession(db, admin.id, request, false);
  return json({ ok: true, me: pub(admin) }, 200, { 'set-cookie': sessionCookie(s.token, s.maxAge, isSecure(request)) });
}

async function login(ctx) {
  const { request, env } = ctx;
  const db = env.DB;
  const ik = await ipKey(db, request);
  const since = Date.now() - 15 * 60e3;
  const fails = await db.prepare(`SELECT COUNT(*) AS n FROM login_attempts WHERE ip_hash=?1 AND at>?2 AND ok=0`).bind(ik, since).first('n');
  if (fails >= 8) fail(429, '로그인 실패가 많아 15분 동안 잠겼어요.', 'LOCKED');
  const b = await readBody(request);
  const loginId = clean(b.login, 32).toLowerCase();
  const row = await db.prepare(`SELECT * FROM admins WHERE login=?1`).bind(loginId).first();
  // 계정이 없어도 같은 시간이 걸리도록 해시를 한 번 돌립니다
  const ok = row ? await verifyPassword(String(b.password || ''), row.pw_hash, row.pw_salt)
                 : (await hashPassword(String(b.password || ''), '00'.repeat(16)), false);
  await db.prepare(`INSERT INTO login_attempts(ip_hash, at, ok) VALUES(?1,?2,?3)`).bind(ik, Date.now(), ok && row?.active ? 1 : 0).run();
  if (!ok || !row) {
    await audit(db, null, 'login_fail', loginId);
    fail(401, '아이디 또는 비밀번호가 맞지 않아요.', 'BAD_LOGIN');
  }
  if (!row.active) fail(403, '사용이 멈춘 계정이에요. 최고관리자에게 문의하세요.', 'INACTIVE');
  await db.prepare(`UPDATE admins SET last_login_at=?1 WHERE id=?2`).bind(nowIso(), row.id).run();
  const admin = { id: row.id, login: row.login, name: row.name, role: row.role, mustChange: !!row.must_change };
  await audit(db, admin, 'login');
  const s = await createSession(db, row.id, request, !!b.remember);
  return json({ ok: true, me: pub(admin) }, 200, { 'set-cookie': sessionCookie(s.token, s.maxAge, isSecure(request)) });
}

async function changePassword(ctx, me) {
  const db = ctx.env.DB;
  const b = await readBody(ctx.request);
  const row = await db.prepare(`SELECT pw_hash, pw_salt FROM admins WHERE id=?1`).bind(me.id).first();
  if (!(await verifyPassword(String(b.current || ''), row.pw_hash, row.pw_salt))) fail(400, '지금 비밀번호가 맞지 않아요.', 'BAD_PW');
  const prob = passwordProblem(b.next, me.login);
  if (prob) fail(400, prob, 'PW');
  if (b.next === b.current) fail(400, '지금과 다른 비밀번호로 정해 주세요.', 'SAME');
  const { hash, salt } = await hashPassword(b.next);
  await db.batch([
    db.prepare(`UPDATE admins SET pw_hash=?1, pw_salt=?2, must_change=0 WHERE id=?3`).bind(hash, salt, me.id),
    db.prepare(`DELETE FROM sessions WHERE admin_id=?1 AND token_hash<>?2`).bind(me.id, me.tokenHash),
  ]);
  await audit(db, me, 'password.change');
  return json({ ok: true });
}

/* ════════ 대시보드 · 통계 ════════ */
async function sumBy(db, from, to) {
  const { results } = await db.prepare(`SELECT day, kind, key, n FROM stats_daily WHERE day BETWEEN ?1 AND ?2`).bind(from, to).all();
  return results;
}

async function dashboard(ctx, me) {
  const db = ctx.env.DB;
  ctx.waitUntil(purge(db).catch(() => {}));
  const today = kstDay(), yday = kstDay(-1), from = kstDay(-13);
  const rows = await sumBy(db, from, today);
  const series = {};
  for (let i = 13; i >= 0; i--) series[kstDay(-i)] = { uv: 0, pv: 0, nv: 0 };
  const dayEv = { [today]: {}, [yday]: {} };
  const week = { pages: {}, ref: {}, dev: {}, ev: {}, wish: {}, buy: {} };
  const weekFrom = kstDay(-6);
  for (const r of rows) {
    if (['uv', 'pv', 'nv'].includes(r.kind) && series[r.day]) series[r.day][r.kind] += r.n;
    if (r.kind === 'ev' && dayEv[r.day]) dayEv[r.day][r.key] = (dayEv[r.day][r.key] || 0) + r.n;
    if (r.day >= weekFrom) {
      const add = (o, k) => { o[k] = (o[k] || 0) + r.n; };
      if (r.kind === 'pv') add(week.pages, r.key);
      if (r.kind === 'ref') add(week.ref, r.key);
      if (r.kind === 'dev') add(week.dev, r.key);
      if (r.kind === 'ev') add(week.ev, r.key);
      if (r.kind === 'wish') add(week.wish, r.key);
      if (r.kind === 'buy_click') add(week.buy, r.key);
    }
  }
  const [inqNew, inqRecent, wlTotal, wlToday, wlBy, prods, settings, admins] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM inquiries WHERE status='new'`).first('n'),
    db.prepare(`SELECT id, created_at, category, substr(message,1,80) AS message, status FROM inquiries ORDER BY id DESC LIMIT 5`).all(),
    db.prepare(`SELECT COUNT(*) AS n FROM waitlist WHERE notified_at IS NULL`).first('n'),
    db.prepare(`SELECT COUNT(*) AS n FROM waitlist WHERE created_at >= ?1`).bind(new Date(Date.now() - 86400e3).toISOString()).first('n'),
    db.prepare(`SELECT product, COUNT(*) AS n FROM waitlist WHERE notified_at IS NULL GROUP BY product`).all(),
    db.prepare(`SELECT id, name, price, status, buy_url FROM products ORDER BY sort`).all(),
    getSettings(db),
    db.prepare(`SELECT COUNT(*) AS n FROM admins WHERE active=1`).first('n'),
  ]);
  const notices = await db.prepare(`SELECT COUNT(*) AS n FROM notices WHERE active=1`).first('n');
  const checks = [
    { key: 'biz', label: '사업자 정보(상호·대표자·사업자등록번호·주소·연락처)', ok: ['biz.name', 'biz.ceo', 'biz.regno', 'biz.address', 'biz.phone'].every(k => settings[k]), to: '#/settings' },
    { key: 'mailorder', label: '통신판매업 신고번호 — 유료 판매 전 필수', ok: !!settings['biz.mailorder'], to: '#/settings', soft: true },
    { key: 'privacy', label: '개인정보 보호책임자 이름·연락처', ok: !!(settings['privacy.officer'] && settings['privacy.contact']), to: '#/settings' },
    { key: 'cs', label: '고객센터 이메일', ok: !!settings['cs.email'], to: '#/settings' },
    { key: 'notice', label: '오픈 공지 1건 이상 게시', ok: notices > 0, to: '#/notices' },
    { key: 'admins', label: '관리자 계정 2개 이상(분실 대비)', ok: admins >= 2, to: '#/accounts', soft: true },
    { key: 'products', label: '판매 중 상품의 결제 링크', ok: prods.results.filter(p => p.status === 'open').every(p => p.buy_url), to: '#/products' },
  ];
  return json({
    today, series,
    todayEv: dayEv[today], ydayEv: dayEv[yday],
    week,
    inquiries: { new: inqNew, recent: inqRecent.results },
    waitlist: { open: wlTotal, last24h: wlToday, byProduct: Object.fromEntries(wlBy.results.map(r => [r.product, r.n])) },
    products: prods.results,
    checks,
  });
}

async function stats(ctx) {
  const db = ctx.env.DB;
  const u = new URL(ctx.request.url);
  const days = Math.min(365, Math.max(7, Number(u.searchParams.get('days')) || 30));
  const to = kstDay(), from = kstDay(-(days - 1));
  const rows = await sumBy(db, from, to);
  const series = {};
  for (let i = days - 1; i >= 0; i--) series[kstDay(-i)] = { uv: 0, pv: 0, nv: 0 };
  const agg = { pv: {}, ref: {}, dev: {}, ev: {}, wish: {}, buy_click: {}, notify: {} };
  for (const r of rows) {
    if (['uv', 'pv', 'nv'].includes(r.kind) && series[r.day]) series[r.day][r.kind] += r.n;
    if (agg[r.kind]) agg[r.kind][r.key] = (agg[r.kind][r.key] || 0) + r.n;
  }
  return json({ from, to, days, series, agg });
}

/* ════════ KPI ════════
   한 화면에서 '어디까지 왔는지'를 보기 위한 묶음입니다.
   같은 길이의 직전 기간을 함께 계산해 늘었는지 줄었는지까지 돌려줍니다. */
export const GOAL_METRICS = {
  uv: '방문한 기기', kept: '기록을 남긴 기기', saju: '사주 만들기',
  notify: '출시 알림 신청', buy: '결제 링크로 이동', members: '이메일을 남긴 사람(누적)',
};

function emptyBag() {
  return {
    uv: 0, pv: 0, nv: 0, vis: 0, d2: 0, dwell: 0, dwelln: 0, scroll: 0, scrolln: 0,
    ev: {}, pages: {}, pdwell: {}, pdwelln: {}, pscroll: {}, pscrolln: {},
    ref: {}, dev: {}, wish: {}, buy: {}, notify: {},
  };
}
function fold(bag, r) {
  const put = (o, k, n) => { o[k] = (o[k] || 0) + n; };
  switch (r.kind) {
    case 'uv': case 'nv': case 'vis': case 'd2': case 'dwell': case 'dwelln':
      bag[r.kind] += r.n; break;
    case 'pv': bag.pv += r.n; put(bag.pages, r.key, r.n); break;
    case 'pdwell': put(bag.pdwell, r.key, r.n); break;
    case 'pdwelln': put(bag.pdwelln, r.key, r.n); break;
    case 'scroll': bag.scroll += r.n; put(bag.pscroll, r.key, r.n); break;
    case 'scrolln': bag.scrolln += r.n; put(bag.pscrolln, r.key, r.n); break;
    case 'ev': put(bag.ev, r.key, r.n); break;
    case 'ref': put(bag.ref, r.key, r.n); break;
    case 'dev': put(bag.dev, r.key, r.n); break;
    case 'wish': put(bag.wish, r.key, r.n); break;
    case 'buy_click': put(bag.buy, r.key, r.n); break;
    case 'notify': put(bag.notify, r.key, r.n); break;
  }
}
/* 체류 시간을 재기 전에 쌓인 날이 섞이면 평균이 이상해집니다.
   그래서 '잰 횟수'가 있는 날만 나눕니다. 숫자가 없으면 null — 화면에서 '아직 모름'으로 보여 줍니다. */
const avg = (sum, n) => (n > 0 ? sum / n : null);
const rate = (a, b) => (b > 0 ? a / b : null);

async function kpi(ctx) {
  const db = ctx.env.DB;
  const u = new URL(ctx.request.url);
  const days = [7, 30, 90, 180].includes(Number(u.searchParams.get('days'))) ? Number(u.searchParams.get('days')) : 30;
  const to = kstDay(), from = kstDay(-(days - 1));
  const pTo = kstDay(-days), pFrom = kstDay(-(days * 2 - 1));
  const month = kstMonth();

  const rows = await db.prepare(`SELECT day, kind, key, n FROM stats_daily WHERE day BETWEEN ?1 AND ?2`).bind(pFrom, to).all();
  const cur = emptyBag(), prev = emptyBag(), mtd = emptyBag();
  const series = {};
  for (let i = days - 1; i >= 0; i--) series[kstDay(-i)] = { uv: 0, pv: 0, vis: 0, kept: 0, dwell: 0, dwelln: 0 };

  for (const r of rows.results) {
    const inCur = r.day >= from;
    fold(inCur ? cur : prev, r);
    if (r.day.startsWith(month)) fold(mtd, r);
    const s = series[r.day];
    if (s) {
      if (r.kind === 'uv' || r.kind === 'pv' || r.kind === 'vis') s[r.kind] += r.n;
      if (r.kind === 'dwell') s.dwell += r.n;
      if (r.kind === 'dwelln') s.dwelln += r.n;
      if (r.kind === 'ev' && r.key === 'day_kept') s.kept += r.n;
    }
  }

  /* 이메일을 남긴 사람 — 회원 기능이 아직 없으므로, 같은 주소를 한 사람으로 봅니다 */
  const [mTotal, mNew, mPrev, inqMail] = await Promise.all([
    db.prepare(`SELECT COUNT(DISTINCT LOWER(email)) AS n FROM waitlist`).first('n'),
    db.prepare(`SELECT COUNT(*) AS n FROM (SELECT LOWER(email) AS e FROM waitlist GROUP BY 1 HAVING MIN(created_at) >= ?1)`).bind(from).first('n'),
    db.prepare(`SELECT COUNT(*) AS n FROM (SELECT LOWER(email) AS e FROM waitlist GROUP BY 1 HAVING MIN(created_at) >= ?1 AND MIN(created_at) < ?2)`).bind(pFrom, from).first('n'),
    db.prepare(`SELECT COUNT(DISTINCT LOWER(email)) AS n FROM inquiries WHERE email IS NOT NULL AND email <> ''`).first('n'),
  ]);
  const mMonth = await db.prepare(`SELECT COUNT(*) AS n FROM (SELECT LOWER(email) AS e FROM waitlist GROUP BY 1 HAVING MIN(created_at) >= ?1)`)
    .bind(month + '-01').first('n');

  const goalRows = await db.prepare(`SELECT metric, target FROM kpi_goals`).all();
  const goals = Object.fromEntries(goalRows.results.map(r => [r.metric, r.target]));

  const shape = (b, members) => ({
    uv: b.uv, pv: b.pv, nv: b.nv, vis: b.vis,
    revisit: rate(b.uv - b.nv, b.uv),
    dwellAvg: avg(b.dwell, b.dwelln),
    dwellMeasured: b.dwelln,
    pagesPerVisit: rate(b.pv, b.vis),
    bounce: b.vis > 0 ? Math.max(0, 1 - b.d2 / b.vis) : null,
    scrollAvg: avg(b.scroll, b.scrolln),
    saju: b.ev.saju_made || 0,
    kept: b.ev.day_kept || 0,
    mood: b.ev.mood_saved || 0,
    note: b.ev.note_saved || 0,
    action: b.ev.action_done || 0,
    relation: b.ev.relation_saved || 0,
    share: (b.ev.card_saved || 0) + (b.ev.link_shared || 0),
    invite: b.ev.invite_opened || 0,
    install: b.ev.install || 0,
    wish: b.ev.wish || 0,
    notify: b.ev.notify_signup || 0,
    buy: b.ev.buy_click || 0,
    inquiry: b.ev.inquiry_sent || 0,
    members,
    firstUse: rate(b.ev.saju_made || 0, b.nv),     // 처음 온 기기가 사주를 만든 비율
    keepRate: rate(b.ev.day_kept || 0, b.uv),      // 방문한 기기가 기록을 남긴 비율
    buyRate: rate(b.ev.buy_click || 0, b.uv),
  });

  /* 화면별 — 방문 · 머문 시간 · 읽어 내린 비율 */
  const content = Object.keys({ ...cur.pages, ...cur.pdwell }).map(p => ({
    path: p, pv: cur.pages[p] || 0,
    dwell: avg(cur.pdwell[p] || 0, cur.pdwelln[p] || 0),
    scroll: avg(cur.pscroll[p] || 0, cur.pscrolln[p] || 0),
    measured: cur.pdwelln[p] || 0,
    prevPv: prev.pages[p] || 0,
  })).sort((a, b) => b.pv - a.pv);

  const c = shape(cur, mNew), p = shape(prev, mPrev);
  const funnel = [
    { key: 'uv', label: '방문한 기기', n: c.uv },
    { key: 'saju', label: '사주 만들기', n: c.saju },
    { key: 'kept', label: '기록 남기기', n: c.kept },
    { key: 'wish', label: '상품에 관심 표시', n: c.wish },
    { key: 'notify', label: '출시 알림 신청', n: c.notify },
    { key: 'buy', label: '결제 링크로 이동', n: c.buy },
  ];

  return json({
    days, from, to, prevFrom: pFrom, prevTo: pTo, month,
    cur: c, prev: p, series, content, funnel,
    ref: cur.ref, dev: cur.dev,
    products: { wish: cur.wish, buy: cur.buy, notify: cur.notify },
    members: { total: mTotal, inPeriod: mNew, thisMonth: mMonth, withInquiry: inqMail },
    mtd: {
      uv: mtd.uv, kept: mtd.ev.day_kept || 0, saju: mtd.ev.saju_made || 0,
      notify: mtd.ev.notify_signup || 0, buy: mtd.ev.buy_click || 0, members: mTotal,
    },
    goals, goalMetrics: GOAL_METRICS,
  });
}

async function saveGoals(ctx, me) {
  need(me, 'manager');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request, 4096);
  const now = nowIso();
  const stmts = [], changed = [];
  for (const k of Object.keys(GOAL_METRICS)) {
    if (!(k in b)) continue;
    const t = Math.max(0, Math.min(10_000_000, Math.round(Number(b[k]) || 0)));
    changed.push(`${GOAL_METRICS[k]} ${t}`);
    stmts.push(db.prepare(`INSERT INTO kpi_goals(metric,target,updated_at,updated_by) VALUES(?1,?2,?3,?4)
      ON CONFLICT(metric) DO UPDATE SET target=excluded.target, updated_at=excluded.updated_at, updated_by=excluded.updated_by`)
      .bind(k, t, now, me.name));
  }
  if (stmts.length) await db.batch(stmts);
  if (changed.length) await audit(db, me, 'kpi.goals', `${changed.length}개`, changed.join(', '));
  return json({ ok: true });
}

/* ════════ 이메일을 남긴 사람 ════════
   회원가입 기능은 아직 없습니다. 지금 '명단'이라 부를 수 있는 것은
   출시 알림을 신청하며 스스로 이메일을 적어 준 사람들뿐이고, 같은 주소는 한 사람으로 봅니다. */
async function listMembers(ctx) {
  const db = ctx.env.DB;
  const u = new URL(ctx.request.url);
  const q = clean(u.searchParams.get('q'), 60);
  const page = Math.max(1, Number(u.searchParams.get('page')) || 1);
  const sort = u.searchParams.get('sort') === 'old' ? 'ASC' : 'DESC';
  const where = q ? `WHERE LOWER(email) LIKE ?1` : '';
  const args = q ? [`%${q.toLowerCase()}%`] : [];
  const total = await db.prepare(`SELECT COUNT(*) AS n FROM (SELECT LOWER(email) FROM waitlist ${where} GROUP BY 1)`).bind(...args).first('n');
  const { results } = await db.prepare(
    `SELECT MIN(id) AS id, LOWER(email) AS email, MIN(created_at) AS first_at, MAX(created_at) AS last_at,
            COUNT(*) AS items, SUM(notified_at IS NOT NULL) AS notified, GROUP_CONCAT(product) AS products
       FROM waitlist ${where} GROUP BY LOWER(email)
       ORDER BY first_at ${sort} LIMIT 50 OFFSET ${(page - 1) * 50}`).bind(...args).all();
  const names = await db.prepare(`SELECT id, name FROM products`).all();
  const pname = Object.fromEntries(names.results.map(r => [r.id, r.name]));
  const byMonth = await db.prepare(
    `SELECT substr(first_at,1,7) AS m, COUNT(*) AS n FROM (SELECT LOWER(email) AS e, MIN(created_at) AS first_at FROM waitlist GROUP BY 1)
      GROUP BY m ORDER BY m DESC LIMIT 12`).all();
  return json({
    total, page, pages: Math.max(1, Math.ceil(total / 50)),
    items: results.map(r => ({
      id: r.id, email: maskEmail(r.email), first_at: r.first_at, last_at: r.last_at,
      items: r.items, notified: r.notified,
      products: [...new Set(String(r.products || '').split(','))].filter(Boolean).map(x => pname[x] || x),
    })),
    byMonth: byMonth.results.slice().reverse(),
  });
}
async function exportMembers(ctx, me) {
  need(me, 'manager');
  const db = ctx.env.DB;
  const { results } = await db.prepare(
    `SELECT LOWER(email) AS email, MIN(created_at) AS first_at, COUNT(*) AS items,
            SUM(notified_at IS NOT NULL) AS notified, GROUP_CONCAT(product) AS products
       FROM waitlist GROUP BY LOWER(email) ORDER BY first_at`).all();
  await audit(db, me, 'members.export', '전체', `${results.length}명`);
  return json({ items: results });
}

/* ════════ 문의 ════════ */
async function listInquiries(ctx) {
  const db = ctx.env.DB;
  const u = new URL(ctx.request.url);
  const st = u.searchParams.get('status') || '';
  const q = clean(u.searchParams.get('q'), 60);
  const page = Math.max(1, Number(u.searchParams.get('page')) || 1);
  const where = [], args = [];
  if (INQ_STATUS.includes(st)) { where.push(`status=?${args.length + 1}`); args.push(st); }
  if (q) { where.push(`(message LIKE ?${args.length + 1} OR memo LIKE ?${args.length + 1})`); args.push(`%${q}%`); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = await db.prepare(`SELECT COUNT(*) AS n FROM inquiries ${w}`).bind(...args).first('n');
  const { results } = await db.prepare(`SELECT * FROM inquiries ${w} ORDER BY id DESC LIMIT 30 OFFSET ${(page - 1) * 30}`).bind(...args).all();
  const counts = await db.prepare(`SELECT status, COUNT(*) AS n FROM inquiries GROUP BY status`).all();
  return json({
    total, page, pages: Math.max(1, Math.ceil(total / 30)),
    counts: Object.fromEntries(counts.results.map(r => [r.status, r.n])),
    items: results.map(r => ({ ...r, email: maskEmail(r.email), hasEmail: !!r.email, categoryLabel: CAT_LABEL[r.category] || r.category })),
  });
}
async function updateInquiry(ctx, me, id) {
  need(me, 'manager');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request);
  const row = await db.prepare(`SELECT id, status FROM inquiries WHERE id=?1`).bind(id).first();
  if (!row) fail(404, '없는 문의예요.');
  const status = INQ_STATUS.includes(b.status) ? b.status : row.status;
  const memo = b.memo !== undefined ? clean(b.memo, 2000) : undefined;
  const handled = status !== 'new' && row.status !== status ? nowIso() : null;
  await db.prepare(`UPDATE inquiries SET status=?1, memo=COALESCE(?2, memo),
      handled_at=COALESCE(?3, handled_at), handled_by=CASE WHEN ?3 IS NOT NULL THEN ?4 ELSE handled_by END WHERE id=?5`)
    .bind(status, memo ?? null, handled, me.name, id).run();
  await audit(db, me, 'inquiry.update', `#${id}`, status !== row.status ? `${row.status} → ${status}` : '메모');
  return json({ ok: true });
}
async function deleteInquiry(ctx, me, id) {
  need(me, 'manager');
  await ctx.env.DB.prepare(`DELETE FROM inquiries WHERE id=?1`).bind(id).run();
  await audit(ctx.env.DB, me, 'inquiry.delete', `#${id}`);
  return json({ ok: true });
}
async function revealInquiry(ctx, me, id) {
  need(me, 'manager');
  const r = await ctx.env.DB.prepare(`SELECT email FROM inquiries WHERE id=?1`).bind(id).first();
  if (!r) fail(404, '없는 문의예요.');
  await audit(ctx.env.DB, me, 'inquiry.reveal', `#${id}`);
  return json({ email: r.email });
}

/* ════════ 출시 알림 신청자 ════════ */
async function listWaitlist(ctx) {
  const db = ctx.env.DB;
  const u = new URL(ctx.request.url);
  const product = clean(u.searchParams.get('product'), 20);
  const show = u.searchParams.get('show') || 'open';
  const where = [], args = [];
  if (product) { where.push(`product=?${args.length + 1}`); args.push(product); }
  if (show === 'open') where.push('notified_at IS NULL');
  if (show === 'done') where.push('notified_at IS NOT NULL');
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const { results } = await db.prepare(`SELECT * FROM waitlist ${w} ORDER BY id DESC LIMIT 500`).bind(...args).all();
  const by = await db.prepare(`SELECT product, SUM(notified_at IS NULL) AS open, SUM(notified_at IS NOT NULL) AS done FROM waitlist GROUP BY product`).all();
  return json({
    items: results.map(r => ({ ...r, email: maskEmail(r.email) })),
    byProduct: by.results,
  });
}
async function revealWaitlist(ctx, me, id) {
  need(me, 'manager');
  const r = await ctx.env.DB.prepare(`SELECT email FROM waitlist WHERE id=?1`).bind(id).first();
  if (!r) fail(404, '없는 신청이에요.');
  await audit(ctx.env.DB, me, 'waitlist.reveal', `#${id}`);
  return json({ email: r.email });
}
async function exportWaitlist(ctx, me) {
  need(me, 'manager');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request);
  const product = clean(b.product, 20);
  const args = [];
  let sql = `SELECT w.id, w.created_at, w.product, p.name AS product_name, w.email
      FROM waitlist w LEFT JOIN products p ON p.id = w.product WHERE w.notified_at IS NULL`;
  if (product) { sql += ' AND w.product = ?1'; args.push(product); }
  const { results } = await db.prepare(sql + ' ORDER BY w.id').bind(...args).all();
  await audit(db, me, 'waitlist.export', product || '전체', `${results.length}건`);
  return json({ items: results });
}
async function markNotified(ctx, me) {
  need(me, 'manager');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request);
  const ids = Array.isArray(b.ids) ? b.ids.filter(x => Number.isInteger(x)).slice(0, 2000) : [];
  const now = nowIso();
  let n = 0;
  if (ids.length) {
    const stmts = ids.map(i => db.prepare(`UPDATE waitlist SET notified_at=?1 WHERE id=?2 AND notified_at IS NULL`).bind(now, i));
    const r = await db.batch(stmts);
    n = r.reduce((a, x) => a + (x.meta?.changes || 0), 0);
  } else if (b.product) {
    const r = await db.prepare(`UPDATE waitlist SET notified_at=?1 WHERE product=?2 AND notified_at IS NULL`).bind(now, clean(b.product, 20)).run();
    n = r.meta?.changes || 0;
  }
  await audit(db, me, 'waitlist.notified', b.product || `${ids.length}명`, `${n}건 · 30일 뒤 자동 파기`);
  return json({ ok: true, n });
}
async function deleteWaitlist(ctx, me, id) {
  need(me, 'manager');
  await ctx.env.DB.prepare(`DELETE FROM waitlist WHERE id=?1`).bind(id).run();
  await audit(ctx.env.DB, me, 'waitlist.delete', `#${id}`);
  return json({ ok: true });
}

/* ════════ 상품 ════════ */
async function listProducts(ctx) {
  const db = ctx.env.DB;
  const { results } = await db.prepare(`SELECT * FROM products ORDER BY sort`).all();
  const wl = await db.prepare(`SELECT product, COUNT(*) AS n FROM waitlist WHERE notified_at IS NULL GROUP BY product`).all();
  const wish = await db.prepare(`SELECT key, SUM(n) AS n FROM stats_daily WHERE kind='wish' AND day >= ?1 GROUP BY key`).bind(kstDay(-29)).all();
  const wlm = Object.fromEntries(wl.results.map(r => [r.product, r.n]));
  const wim = Object.fromEntries(wish.results.map(r => [r.key, r.n]));
  return json({ items: results.map(p => ({ ...p, waitlist: wlm[p.id] || 0, wish30: wim[p.id] || 0 })) });
}
async function updateProduct(ctx, me, pid) {
  need(me, 'manager');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request);
  const row = await db.prepare(`SELECT * FROM products WHERE id=?1`).bind(pid).first();
  if (!row) fail(404, '없는 상품이에요.');
  const name = clean(b.name ?? row.name, 40) || row.name;
  const price = Number.isFinite(Number(b.price)) ? Math.max(0, Math.min(10_000_000, Math.round(Number(b.price)))) : row.price;
  const label = clean(b.price_label ?? row.price_label ?? '', 30) || null;
  const status = PRODUCT_STATUS.includes(b.status) ? b.status : row.status;
  let url = clean(b.buy_url ?? row.buy_url ?? '', 500) || null;
  if (url && !/^https:\/\/[^\s"'<>]+$/.test(url)) fail(400, '결제 링크는 https:// 로 시작하는 주소여야 해요.', 'URL');
  if (status === 'open' && !url) fail(400, '판매 중으로 바꾸려면 결제 링크가 있어야 해요.', 'URL_NEEDED');
  const summary = clean(b.summary ?? row.summary ?? '', 120) || null;
  await db.prepare(`UPDATE products SET name=?1, price=?2, price_label=?3, status=?4, buy_url=?5, summary=?6, updated_at=?7 WHERE id=?8`)
    .bind(name, price, label, status, url, summary, nowIso(), pid).run();
  const diff = [];
  if (row.status !== status) diff.push(`상태 ${row.status}→${status}`);
  if (row.price !== price) diff.push(`가격 ${row.price}→${price}`);
  if ((row.buy_url || '') !== (url || '')) diff.push('결제 링크 변경');
  if (row.name !== name) diff.push('이름 변경');
  await audit(db, me, 'product.update', pid, diff.join(', ') || '설명 변경');
  await purgeConfigCache(ctx.request);
  return json({ ok: true });
}

/* ════════ 공지 · 배너 ════════ */
async function listNotices(ctx) {
  const { results } = await ctx.env.DB.prepare(`SELECT * FROM notices ORDER BY pinned DESC, id DESC LIMIT 200`).all();
  return json({ items: results });
}
async function saveNotice(ctx, me, id) {
  need(me, 'manager');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request, 24 * 1024);
  const kind = b.kind === 'banner' ? 'banner' : 'notice';
  const title = clean(b.title, kind === 'banner' ? 80 : 120);
  if (!title) fail(400, '제목을 적어 주세요.', 'TITLE');
  const body = clean(b.body, 8000) || null;
  let link = clean(b.link, 300) || null;
  if (link && !/^(https:\/\/|\/)[^\s"'<>]*$/.test(link)) fail(400, '링크는 / 로 시작하는 사이트 안 주소나 https:// 주소만 돼요.', 'LINK');
  const label = clean(b.link_label, 20) || null;
  const iso = v => { const s = clean(v, 30); if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d.toISOString(); };
  const starts = iso(b.starts_at), ends = iso(b.ends_at);
  const active = b.active === false ? 0 : 1, pinned = b.pinned ? 1 : 0;
  const now = nowIso();
  if (id) {
    const r = await db.prepare(`UPDATE notices SET kind=?1,title=?2,body=?3,link=?4,link_label=?5,active=?6,pinned=?7,starts_at=?8,ends_at=?9,updated_at=?10 WHERE id=?11`)
      .bind(kind, title, body, link, label, active, pinned, starts, ends, now, id).run();
    if (!r.meta?.changes) fail(404, '없는 공지예요.');
    await audit(db, me, 'notice.update', `#${id}`, title);
  } else {
    const r = await db.prepare(`INSERT INTO notices(kind,title,body,link,link_label,active,pinned,starts_at,ends_at,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10)`)
      .bind(kind, title, body, link, label, active, pinned, starts, ends, now).run();
    id = r.meta.last_row_id;
    await audit(db, me, 'notice.create', `#${id}`, title);
  }
  await purgeConfigCache(ctx.request);
  return json({ ok: true, id });
}
async function deleteNotice(ctx, me, id) {
  need(me, 'manager');
  await ctx.env.DB.prepare(`DELETE FROM notices WHERE id=?1`).bind(id).run();
  await audit(ctx.env.DB, me, 'notice.delete', `#${id}`);
  await purgeConfigCache(ctx.request);
  return json({ ok: true });
}

/* ════════ 설정 ════════ */
async function publicSettings(db) {
  const s = await getSettings(db);
  const out = {};
  for (const k of SETTING_KEYS) out[k] = s[k] ?? '';
  return out;
}
async function saveSettings(ctx, me) {
  need(me, 'owner');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request, 16 * 1024);
  const before = await publicSettings(db);
  const now = nowIso();
  const stmts = [], changed = [];
  for (const k of SETTING_KEYS) {
    if (!(k in b)) continue;
    let v = clean(b[k], k === 'biz.address' ? 200 : 120);
    if (k.startsWith('site.')) v = v === '0' ? '0' : '1';
    if (k === 'cs.email' && v && !emailOk(v)) fail(400, '고객센터 이메일 형식을 확인해 주세요.', 'EMAIL');
    if (k === 'biz.email' && v && !emailOk(v)) fail(400, '사업자 이메일 형식을 확인해 주세요.', 'EMAIL');
    if (k === 'legal.effective' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(400, '시행일은 2026-11-17 형식으로 적어 주세요.', 'DATE');
    if (before[k] === v) continue;
    changed.push(k);
    stmts.push(db.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?1,?2,?3)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).bind(k, v, now));
  }
  if (stmts.length) await db.batch(stmts);
  if (changed.length) await audit(db, me, 'settings.update', `${changed.length}개 항목`, changed.join(', '));
  await purgeConfigCache(ctx.request);
  return json({ ok: true, changed });
}

/* ════════ 계정 ════════ */
async function listAccounts(ctx, me) {
  need(me, 'owner');
  const { results } = await ctx.env.DB.prepare(`SELECT id, login, name, role, active, must_change, created_at, last_login_at FROM admins ORDER BY id`).all();
  return json({ items: results, roles: ROLES });
}
async function createAccount(ctx, me) {
  need(me, 'owner');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request);
  const login = clean(b.login, 32).toLowerCase();
  const name = clean(b.name, 30);
  const role = ROLES[b.role] ? b.role : 'viewer';
  if (!LOGIN_RE.test(login)) fail(400, '아이디는 영문 소문자·숫자·.-_ 로 3~32자예요.', 'LOGIN');
  if (!name) fail(400, '이름을 적어 주세요.', 'NAME');
  const exists = await db.prepare(`SELECT id FROM admins WHERE login=?1`).bind(login).first();
  if (exists) fail(409, '이미 있는 아이디예요.', 'DUP');
  const temp = tempPassword();
  const { hash, salt } = await hashPassword(temp);
  await db.prepare(`INSERT INTO admins(login,name,role,pw_hash,pw_salt,must_change,created_at) VALUES(?1,?2,?3,?4,?5,1,?6)`)
    .bind(login, name, role, hash, salt, nowIso()).run();
  await audit(db, me, 'account.create', login, ROLES[role].label);
  return json({ ok: true, tempPassword: temp });
}
async function updateAccount(ctx, me, id) {
  need(me, 'owner');
  const db = ctx.env.DB;
  const b = await readBody(ctx.request);
  const row = await db.prepare(`SELECT * FROM admins WHERE id=?1`).bind(id).first();
  if (!row) fail(404, '없는 계정이에요.');
  const role = ROLES[b.role] ? b.role : row.role;
  const active = b.active === undefined ? row.active : (b.active ? 1 : 0);
  const name = clean(b.name ?? row.name, 30) || row.name;
  if (row.id === me.id && (role !== 'owner' || !active)) fail(400, '내 계정의 최고관리자 권한은 스스로 내릴 수 없어요.', 'SELF');
  if (row.role === 'owner' && (role !== 'owner' || !active)) {
    const owners = await db.prepare(`SELECT COUNT(*) AS n FROM admins WHERE role='owner' AND active=1`).first('n');
    if (owners <= 1) fail(400, '최고관리자가 한 명은 남아 있어야 해요.', 'LAST_OWNER');
  }
  await db.prepare(`UPDATE admins SET role=?1, active=?2, name=?3 WHERE id=?4`).bind(role, active, name, id).run();
  if (!active) await db.prepare(`DELETE FROM sessions WHERE admin_id=?1`).bind(id).run();
  await audit(db, me, 'account.update', row.login, `${ROLES[role].label}${active ? '' : ' · 사용 중지'}`);
  return json({ ok: true });
}
async function resetAccount(ctx, me, id) {
  need(me, 'owner');
  const db = ctx.env.DB;
  const row = await db.prepare(`SELECT id, login FROM admins WHERE id=?1`).bind(id).first();
  if (!row) fail(404, '없는 계정이에요.');
  if (row.id === me.id) fail(400, '내 비밀번호는 ‘내 정보’에서 바꿔 주세요.', 'SELF');
  const temp = tempPassword();
  const { hash, salt } = await hashPassword(temp);
  await db.batch([
    db.prepare(`UPDATE admins SET pw_hash=?1, pw_salt=?2, must_change=1 WHERE id=?3`).bind(hash, salt, id),
    db.prepare(`DELETE FROM sessions WHERE admin_id=?1`).bind(id),
  ]);
  await audit(db, me, 'account.reset', row.login);
  return json({ ok: true, tempPassword: temp });
}

/* ════════ 활동 기록 · 시스템 ════════ */
async function listAudit(ctx) {
  const u = new URL(ctx.request.url);
  const page = Math.max(1, Number(u.searchParams.get('page')) || 1);
  const db = ctx.env.DB;
  const total = await db.prepare(`SELECT COUNT(*) AS n FROM audit`).first('n');
  const { results } = await db.prepare(`SELECT * FROM audit ORDER BY id DESC LIMIT 50 OFFSET ${(page - 1) * 50}`).all();
  return json({ items: results, page, pages: Math.max(1, Math.ceil(total / 50)) });
}
async function system(ctx, me) {
  const db = ctx.env.DB;
  const tables = ['admins', 'sessions', 'inquiries', 'waitlist', 'stats_daily', 'notices', 'products', 'audit', 'kpi_goals'];
  const counts = {};
  const res = await db.batch(tables.map(t => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`)));
  tables.forEach((t, i) => { counts[t] = res[i].results[0].n; });
  const first = await db.prepare(`SELECT MIN(day) AS d FROM stats_daily`).first('d');
  return json({ schema: SCHEMA_VERSION, counts, statsSince: first, setupKey: !!ctx.env.ADMIN_SETUP_KEY, me: pub(me) });
}
async function runPurge(ctx, me) {
  need(me, 'manager');
  const r = await purge(ctx.env.DB);
  await audit(ctx.env.DB, me, 'system.purge', '', `알림신청 ${r.waitlist}건 · 문의 ${r.inquiries}건 파기`);
  return json({ ok: true, ...r });
}
async function backup(ctx, me) {
  need(me, 'owner');
  const db = ctx.env.DB;
  const pick = async sql => (await db.prepare(sql).all()).results;
  const data = {
    app: 'yeodeol-admin', v: 1, at: nowIso(),
    settings: await publicSettings(db),
    products: await pick(`SELECT * FROM products ORDER BY sort`),
    notices: await pick(`SELECT * FROM notices ORDER BY id`),
    inquiries: await pick(`SELECT * FROM inquiries ORDER BY id`),
    waitlist: await pick(`SELECT * FROM waitlist ORDER BY id`),
    stats_daily: await pick(`SELECT * FROM stats_daily ORDER BY day`),
    kpi_goals: await pick(`SELECT * FROM kpi_goals ORDER BY metric`),
    admins: await pick(`SELECT id, login, name, role, active, created_at, last_login_at FROM admins ORDER BY id`),
  };
  await audit(db, me, 'backup.download');
  return new Response(JSON.stringify(data, null, 1), {
    headers: {
      'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
      'content-disposition': `attachment; filename="yeodeol-admin-backup-${kstDay()}.json"`,
    },
  });
}
