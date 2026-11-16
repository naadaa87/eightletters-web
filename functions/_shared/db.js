/* 여덟글자 서버 — 데이터베이스(D1)
   표는 첫 요청 때 스스로 만듭니다. 대시보드에서 SQL을 붙여 넣을 필요가 없습니다.
   스키마를 바꿀 때는 SCHEMA_VERSION을 올리고 MIGRATIONS 끝에 문장을 덧붙이세요. */

export const SCHEMA_VERSION = 1;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS settings (
     key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS admins (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     login TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL,
     pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL,
     active INTEGER NOT NULL DEFAULT 1, must_change INTEGER NOT NULL DEFAULT 0,
     created_at TEXT, last_login_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL,
     created_at TEXT, expires_at INTEGER NOT NULL, ua TEXT)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
     ip_hash TEXT NOT NULL, at INTEGER NOT NULL, ok INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(ip_hash, at)`,
  `CREATE TABLE IF NOT EXISTS audit (
     id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL,
     admin_id INTEGER, admin_name TEXT, action TEXT NOT NULL, target TEXT, detail TEXT)`,
  `CREATE TABLE IF NOT EXISTS inquiries (
     id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
     category TEXT NOT NULL, email TEXT, message TEXT NOT NULL, page TEXT,
     status TEXT NOT NULL DEFAULT 'new', memo TEXT, handled_at TEXT, handled_by TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_inq_status ON inquiries(status, id)`,
  `CREATE TABLE IF NOT EXISTS waitlist (
     id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
     product TEXT NOT NULL, email TEXT NOT NULL, consent_at TEXT NOT NULL,
     notified_at TEXT, UNIQUE(product, email))`,
  `CREATE TABLE IF NOT EXISTS stats_daily (
     day TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY(day, kind, key))`,
  `CREATE TABLE IF NOT EXISTS notices (
     id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL DEFAULT 'notice',
     title TEXT NOT NULL, body TEXT, link TEXT, link_label TEXT,
     active INTEGER NOT NULL DEFAULT 1, pinned INTEGER NOT NULL DEFAULT 0,
     starts_at TEXT, ends_at TEXT, created_at TEXT, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS products (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL,
     price_label TEXT, status TEXT NOT NULL DEFAULT 'soon', buy_url TEXT,
     summary TEXT, sort INTEGER NOT NULL DEFAULT 0, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS rate (
     k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset_at INTEGER NOT NULL)`,
];

/* 상품 — 화면에 적힌 가격과 이름을 그대로 옮겼습니다. 관리자 > 상품·가격에서 바꿉니다. */
export const DEFAULT_PRODUCTS = [
  ['rel',     '관계 설명서',        5900,  null,          '두 사람을 네 층으로 읽는 정밀 궁합'],
  ['talk',    '말투 사전',          3900,  null,          '내 말이 저 사람에게 어떻게 들리는지, 열 가지 상황'],
  ['year',    '올해의 지도',        12900, null,          '열두 달에 성질의 이름을 붙인 한 해 지도'],
  ['daeun',   '열 해의 강',         7900,  null,          '대운 — 지금 건너는 구간과 앞뒤 구간'],
  ['use',     '쓰는 법과 안 쓸 때', 4900,  null,          '십성의 강약을 사용법으로 읽는 리포트'],
  ['body',    '몸이 보내는 신호',   2900,  null,          '오행의 넘침과 빔을 생활 습관의 언어로'],
  ['charm',   '나에게 맞는 부적',   3900,  null,          '비어 있는 오행을 부르는 글자와 배치'],
  ['monthly', '이달의 결 · 구독',   4900,  '월 4,900원', '매월 1일 도착하는 이달의 성질과 좋은 날 달력'],
  ['newyear', '신년 묶음',          22900, null,          '올해의 지도 + 몸의 신호 + 부적 + 이달의 결 두 달'],
];

export const DEFAULT_SETTINGS = {
  'biz.name': '', 'biz.ceo': '', 'biz.regno': '', 'biz.mailorder': '',
  'biz.address': '', 'biz.phone': '', 'biz.email': '',
  'biz.hosting': 'Cloudflare, Inc.',
  'privacy.officer': '', 'privacy.contact': '',
  'cs.email': '', 'cs.hours': '평일 10:00–18:00 (주말·공휴일 휴무)',
  'cs.reply_days': '2',
  'legal.effective': '2026-11-17',
  'site.inquiry_open': '1', 'site.notify_open': '1',
};

/* 모듈 수명 동안 한 번만 확인합니다 */
let ready = null;
export function ensure(db) {
  if (!db) return Promise.reject(new Error('NO_DB'));
  if (!ready) ready = migrate(db).catch(e => { ready = null; throw e; });
  return ready;
}

async function migrate(db) {
  const v = await db.prepare(`SELECT value FROM settings WHERE key='_schema'`).first('value').catch(() => null);
  if (v && Number(v) >= SCHEMA_VERSION) return;
  await db.batch(TABLES.map(s => db.prepare(s)));
  const now = new Date().toISOString();
  const stmts = [];
  for (const [i, p] of DEFAULT_PRODUCTS.entries()) {
    stmts.push(db.prepare(`INSERT OR IGNORE INTO products(id,name,price,price_label,status,summary,sort,updated_at)
      VALUES(?1,?2,?3,?4,'soon',?5,?6,?7)`).bind(p[0], p[1], p[2], p[3], p[4], i + 1, now));
  }
  for (const [k, val] of Object.entries(DEFAULT_SETTINGS)) {
    stmts.push(db.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES(?1,?2,?3)`).bind(k, val, now));
  }
  const salt = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
  stmts.push(db.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES('_salt',?1,?2)`).bind(salt, now));
  stmts.push(db.prepare(`INSERT INTO settings(key,value,updated_at) VALUES('_schema',?1,?2)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).bind(String(SCHEMA_VERSION), now));
  await db.batch(stmts);
}

export async function getSettings(db, { includePrivate = false } = {}) {
  const { results } = await db.prepare(`SELECT key, value FROM settings`).all();
  const out = {};
  for (const r of results) if (includePrivate || !r.key.startsWith('_')) out[r.key] = r.value;
  return out;
}

let saltCache = null;
export async function salt(db) {
  if (saltCache) return saltCache;
  saltCache = await db.prepare(`SELECT value FROM settings WHERE key='_salt'`).first('value') || 'yeodeol';
  return saltCache;
}

/* 한국 시간 기준 날짜 */
export function kstDay(offsetDays = 0, base = Date.now()) {
  return new Date(base + 9 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
}
export const nowIso = () => new Date().toISOString();

/* 오래된 기록 정리 — 개인정보처리방침의 보유 기간과 맞춥니다 */
export async function purge(db) {
  const now = Date.now();
  const d = days => new Date(now - days * 86400e3).toISOString();
  const r = await db.batch([
    db.prepare(`DELETE FROM sessions WHERE expires_at < ?1`).bind(now),
    db.prepare(`DELETE FROM login_attempts WHERE at < ?1`).bind(now - 86400e3),
    db.prepare(`DELETE FROM rate WHERE reset_at < ?1`).bind(now),
    db.prepare(`DELETE FROM waitlist WHERE (notified_at IS NOT NULL AND notified_at < ?1) OR created_at < ?2`).bind(d(30), d(365)),
    db.prepare(`DELETE FROM inquiries WHERE status IN ('done','closed') AND handled_at < ?1`).bind(d(365 * 3)),
    db.prepare(`DELETE FROM audit WHERE at < ?1`).bind(d(365 * 2)),
  ]);
  return { waitlist: r[3].meta?.changes || 0, inquiries: r[4].meta?.changes || 0 };
}
