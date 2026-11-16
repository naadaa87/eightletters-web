/* 여덟글자 서버 — 공개 API
   개인을 알아볼 수 있는 값은 문의와 출시 알림에서 '본인이 적어 보낸 것'만 저장합니다.
   방문 통계는 날짜별 숫자 합계뿐이고, IP·쿠키·기기 식별자를 남기지 않습니다. */
import { json, readBody, fail, clean, emailOk, isBot, limit, sha256hex, clientIp } from './http.js';
import { getSettings, kstDay, nowIso, salt } from './db.js';

const PUBLIC_PREFIX = ['biz.', 'cs.', 'privacy.', 'legal.', 'site.'];

/* ── 공개 설정: 공지 · 상품 상태 · 사업자 정보 ── */
export async function getConfig(ctx) {
  const { env, request } = ctx;
  const cache = caches.default;
  const key = new Request(new URL('/api/config?v=1', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  const db = env.DB;
  const s = await getSettings(db);
  const settings = {};
  for (const [k, v] of Object.entries(s)) if (PUBLIC_PREFIX.some(p => k.startsWith(p))) settings[k] = v;

  const today = nowIso();
  const [{ results: prods }, { results: notes }] = await Promise.all([
    db.prepare(`SELECT id,name,price,price_label,status,buy_url FROM products ORDER BY sort`).all(),
    db.prepare(`SELECT id,kind,title,body,link,link_label,pinned,starts_at,created_at FROM notices
      WHERE active=1 AND (starts_at IS NULL OR starts_at='' OR starts_at<=?1)
        AND (ends_at IS NULL OR ends_at='' OR ends_at>=?1)
      ORDER BY pinned DESC, id DESC LIMIT 20`).bind(today).all(),
  ]);
  const products = {};
  for (const p of prods) {
    if (p.status === 'hidden') continue;
    products[p.id] = {
      name: p.name, price: p.price,
      label: p.price_label || `${Number(p.price).toLocaleString('ko-KR')}원`,
      status: p.status, url: p.status === 'open' && p.buy_url ? p.buy_url : null,
    };
  }
  const banner = notes.find(n => n.kind === 'banner') || null;
  const body = {
    v: 1, at: today,
    settings, products,
    banner: banner && { id: banner.id, title: banner.title, link: banner.link, label: banner.link_label },
    notices: notes.filter(n => n.kind === 'notice').map(n => ({
      id: n.id, title: n.title, body: n.body, link: n.link, label: n.link_label,
      pinned: !!n.pinned, date: (n.starts_at || n.created_at || '').slice(0, 10),
    })),
  };
  const res = new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

export async function purgeConfigCache(request) {
  try { await caches.default.delete(new Request(new URL('/api/config?v=1', request.url).toString())); } catch {}
}

/* ── 익명 사용 통계 ──
   p: 경로 · u: 오늘 이 기기의 첫 방문 · n: 이 기기의 첫 방문 · r: 들어온 곳(도메인) · d: 기기 종류 · k: 기능 이벤트 */
const EVENTS = new Set([
  'saju_made', 'mood_saved', 'note_saved', 'plan_saved', 'action_done', 'relation_saved',
  'card_saved', 'link_shared', 'invite_opened', 'backup_export', 'backup_import',
  'wish', 'notify_signup', 'inquiry_sent', 'buy_click', 'install',
]);
const PRODUCT_RE = /^[a-z]{2,12}$/;
const PATH_RE = /^\/[a-z0-9\-\/]{0,60}$/;

function refKind(r) {
  if (!r) return 'direct';
  const h = String(r).toLowerCase().replace(/^www\./, '');
  const map = [
    ['naver', /(^|\.)naver\.(com|net)$|^naver\.me$/], ['google', /(^|\.)google\.[a-z.]+$/],
    ['daum', /(^|\.)(daum\.net|kakao\.com|tistory\.com)$/], ['kakaotalk', /^(talk|story)\.kakao|kakaotalk/],
    ['instagram', /instagram\.com$/], ['threads', /threads\.(net|com)$/], ['facebook', /(facebook\.com|fb\.me)$/],
    ['x', /(^|\.)(x\.com|twitter\.com|t\.co)$/], ['youtube', /youtube\.com$|youtu\.be$/],
    ['bing', /bing\.com$/], ['chatgpt', /chatgpt\.com$|openai\.com$/], ['claude', /claude\.ai$/],
  ];
  for (const [k, re] of map) if (re.test(h)) return k;
  return 'etc';
}

export async function postEvent(ctx) {
  const { request, env } = ctx;
  if (isBot(request)) return new Response(null, { status: 204 });
  const b = await readBody(request, 2048);
  const db = env.DB;
  const day = kstDay();
  const up = (kind, key) => db.prepare(`INSERT INTO stats_daily(day,kind,key,n) VALUES(?1,?2,?3,1)
      ON CONFLICT(day,kind,key) DO UPDATE SET n = n + 1`).bind(day, kind, key);
  const stmts = [];

  if (typeof b.p === 'string') {
    let p = b.p.toLowerCase().replace(/\.html$/, '').replace(/\/+$/, '') || '/';
    if (!PATH_RE.test(p) || p.startsWith('/admin') || p.startsWith('/api')) p = '/other';
    stmts.push(up('pv', p));
    if (b.u) {
      stmts.push(up('uv', '-'));
      stmts.push(up('dev', ['m', 't', 'd'].includes(b.d) ? b.d : 'd'));
      stmts.push(up('ref', refKind(clean(b.r, 120))));
    }
    if (b.n) stmts.push(up('nv', '-'));
  }
  if (typeof b.k === 'string' && EVENTS.has(b.k)) {
    stmts.push(up('ev', b.k));
    if ((b.k === 'wish' || b.k === 'buy_click') && PRODUCT_RE.test(b.x || '')) stmts.push(up(b.k, b.x));
  }
  if (!stmts.length) return new Response(null, { status: 204 });
  // 한 기기가 통계를 부풀리지 못하도록 분당 한도
  const ipk = (await sha256hex((await salt(db)) + '|ev|' + day + '|' + clientIp(request))).slice(0, 24);
  try { await limit(db, 'ev:' + ipk, 120, 60); } catch { return new Response(null, { status: 204 }); }
  await db.batch(stmts);
  return new Response(null, { status: 204 });
}

/* ── 문의 ── */
const CATS = { use: '이용 문의', bug: '오류 제보', pay: '결제·환불', partner: '제휴·제안', etc: '기타' };

export async function postInquiry(ctx) {
  const { request, env } = ctx;
  const db = env.DB;
  const s = await getSettings(db);
  if (s['site.inquiry_open'] === '0') fail(503, '지금은 문의를 잠시 쉬고 있어요. 공지사항을 확인해 주세요.', 'CLOSED');
  const b = await readBody(request, 12 * 1024);
  if (b.hp) return json({ ok: true }); // 사람 눈에 안 보이는 칸이 채워졌으면 조용히 버립니다
  if (b.t0 && Date.now() - Number(b.t0) < 2500) fail(400, '조금만 천천히 보내 주세요.', 'TOO_FAST');
  const category = CATS[b.category] ? b.category : 'etc';
  const message = clean(b.message, 3000);
  const email = clean(b.email, 254);
  if (message.length < 5) fail(400, '내용을 조금 더 적어 주세요.', 'SHORT');
  if (email && !emailOk(email)) fail(400, '이메일 주소를 다시 확인해 주세요.', 'EMAIL');
  if (email && b.consent !== true) fail(400, '답장을 받으려면 개인정보 수집·이용에 동의해 주세요.', 'CONSENT');
  const page = clean(b.page, 120);
  const ipk = (await sha256hex((await salt(db)) + '|inq|' + kstDay() + '|' + clientIp(request))).slice(0, 24);
  await limit(db, 'inq:' + ipk, 6, 3600);
  const r = await db.prepare(`INSERT INTO inquiries(created_at, category, email, message, page) VALUES(?1,?2,?3,?4,?5)`)
    .bind(nowIso(), category, email || null, message, page || null).run();
  await db.prepare(`INSERT INTO stats_daily(day,kind,key,n) VALUES(?1,'ev','inquiry_sent',1)
      ON CONFLICT(day,kind,key) DO UPDATE SET n=n+1`).bind(kstDay()).run();
  return json({ ok: true, id: r.meta?.last_row_id, replyDays: s['cs.reply_days'] || '2' });
}

/* ── 출시 알림 신청 ── */
export async function postNotify(ctx) {
  const { request, env } = ctx;
  const db = env.DB;
  const s = await getSettings(db);
  if (s['site.notify_open'] === '0') fail(503, '지금은 알림 신청을 받지 않아요.', 'CLOSED');
  const b = await readBody(request, 2048);
  if (b.hp) return json({ ok: true });
  const product = clean(b.product, 20);
  const p = await db.prepare(`SELECT id, status FROM products WHERE id=?1`).bind(product).first();
  if (!p || p.status === 'hidden') fail(400, '알 수 없는 상품이에요.', 'PRODUCT');
  const email = clean(b.email, 254).toLowerCase();
  if (!emailOk(email)) fail(400, '이메일 주소를 다시 확인해 주세요.', 'EMAIL');
  if (b.consent !== true) fail(400, '알림을 받으려면 개인정보 수집·이용에 동의해 주세요.', 'CONSENT');
  const ipk = (await sha256hex((await salt(db)) + '|nt|' + kstDay() + '|' + clientIp(request))).slice(0, 24);
  await limit(db, 'nt:' + ipk, 12, 3600);
  const now = nowIso();
  const r = await db.prepare(`INSERT INTO waitlist(created_at, product, email, consent_at) VALUES(?1,?2,?3,?1)
      ON CONFLICT(product, email) DO NOTHING`).bind(now, product, email).run();
  if (r.meta?.changes) {
    await db.prepare(`INSERT INTO stats_daily(day,kind,key,n) VALUES(?1,'notify',?2,1)
        ON CONFLICT(day,kind,key) DO UPDATE SET n=n+1`).bind(kstDay(), product).run();
  }
  return json({ ok: true, already: !r.meta?.changes });
}
