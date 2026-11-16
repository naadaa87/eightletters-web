/* 여덟글자 서버 — 요청·응답 도구 */

export class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code || 'ERR'; }
}
export const fail = (status, message, code) => { throw new HttpError(status, message, code); };

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

/* 본문 읽기 — 크기를 제한하고, sendBeacon이 보내는 text/plain도 받습니다 */
export async function readBody(request, max = 16 * 1024) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > max) fail(413, '보내신 내용이 너무 길어요.', 'TOO_LARGE');
  const text = await request.text();
  if (text.length > max) fail(413, '보내신 내용이 너무 길어요.', 'TOO_LARGE');
  if (!text) return {};
  try { return JSON.parse(text); } catch { fail(400, '형식이 올바르지 않아요.', 'BAD_JSON'); }
}

export const clientIp = req => req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch|yeti|daum|bingpreview|kakaotalk-scrap/i;
export const isBot = req => BOT.test(req.headers.get('user-agent') || '');

export async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* 문자열 정리 */
export function clean(v, max = 200) {
  if (v == null) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}
export const EMAIL_RE = /^[^\s@<>()[\],;:"]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
export function emailOk(e) { return EMAIL_RE.test(e) && e.length <= 254; }

export function maskEmail(e) {
  if (!e) return '';
  const [u, d] = String(e).split('@');
  if (!d) return '***';
  const head = u.length <= 2 ? u[0] : u.slice(0, 2);
  const dd = d.split('.');
  const dHead = dd[0].slice(0, 1);
  return `${head}${'*'.repeat(Math.max(2, u.length - head.length))}@${dHead}${'*'.repeat(Math.max(2, dd[0].length - 1))}.${dd.slice(1).join('.')}`;
}

/* 같은 출처에서 온 요청인지 — 관리자 쓰기 요청의 CSRF 방어 */
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  const host = new URL(req.url).host;
  if (origin) { try { return new URL(origin).host === host; } catch { return false; } }
  const ref = req.headers.get('referer');
  if (ref) { try { return new URL(ref).host === host; } catch { return false; } }
  return false;
}

/* 고정 창 속도 제한 — rate 표 한 줄로 셉니다 */
export async function limit(db, key, max, windowSec) {
  const now = Date.now();
  const n = await db.prepare(`INSERT INTO rate(k,n,reset_at) VALUES(?1,1,?2)
      ON CONFLICT(k) DO UPDATE SET
        n = CASE WHEN rate.reset_at < ?3 THEN 1 ELSE rate.n + 1 END,
        reset_at = CASE WHEN rate.reset_at < ?3 THEN ?2 ELSE rate.reset_at END
      RETURNING n`).bind(key, now + windowSec * 1000, now).first('n');
  if (n > max) fail(429, '잠시 뒤에 다시 시도해 주세요.', 'RATE_LIMIT');
  return n;
}
