/* 여덟글자 서버 — 관리자 인증
   비밀번호: PBKDF2-SHA256 10만 회 (Workers 런타임 상한)
   세션: 무작위 토큰을 HttpOnly 쿠키로, DB에는 해시만 저장 */
import { fail, sha256hex, clientIp } from './http.js';
import { salt, nowIso } from './db.js';

export const ROLES = {
  owner:   { label: '최고관리자', level: 3 },
  manager: { label: '운영',       level: 2 },
  viewer:  { label: '조회',       level: 1 },
};
const COOKIE = 'yd_s';
const ITER = 100000;

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = h => new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16)));

export async function hashPassword(pw, saltHex) {
  const s = saltHex || hex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(s), iterations: ITER }, key, 256);
  return { hash: hex(bits), salt: s };
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export async function verifyPassword(pw, hashHex, saltHex) {
  const { hash } = await hashPassword(pw, saltHex);
  return safeEqual(hash, hashHex);
}

export function passwordProblem(pw, login = '') {
  if (typeof pw !== 'string' || pw.length < 10) return '비밀번호는 10자 이상으로 정해 주세요.';
  if (pw.length > 128) return '비밀번호가 너무 길어요.';
  if (login && pw.toLowerCase().includes(String(login).toLowerCase())) return '아이디가 들어간 비밀번호는 쓸 수 없어요.';
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length;
  if (kinds < 2) return '영문·숫자·기호 중 두 가지 이상을 섞어 주세요.';
  return null;
}

export function randomToken(bytes = 32) {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)));
}

/* 임시 비밀번호 — 헷갈리는 글자(0 O 1 l I) 제외 */
export function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint8Array(12));
  let s = '';
  for (const b of r) s += chars[b % chars.length];
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
}

export async function ipKey(db, req) {
  return (await sha256hex((await salt(db)) + '|ip|' + clientIp(req))).slice(0, 32);
}

function readCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  for (const part of c.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

export function sessionCookie(token, maxAgeSec, secure = true) {
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}
export function clearCookie(secure = true) {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export async function createSession(db, adminId, req, remember) {
  const token = randomToken();
  const hours = remember ? 24 * 7 : 12;
  const expires = Date.now() + hours * 3600e3;
  await db.prepare(`INSERT INTO sessions(token_hash, admin_id, created_at, expires_at, ua) VALUES(?1,?2,?3,?4,?5)`)
    .bind(await sha256hex(token), adminId, nowIso(), expires, (req.headers.get('user-agent') || '').slice(0, 160)).run();
  return { token, maxAge: hours * 3600 };
}

export async function currentAdmin(db, req) {
  const token = readCookie(req, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const th = await sha256hex(token);
  const row = await db.prepare(`SELECT a.id, a.login, a.name, a.role, a.active, a.must_change, s.expires_at, s.token_hash
      FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ?1`).bind(th).first();
  if (!row || !row.active || row.expires_at < Date.now()) return null;
  return { id: row.id, login: row.login, name: row.name, role: row.role, mustChange: !!row.must_change, tokenHash: row.token_hash };
}

export async function destroySession(db, req) {
  const token = readCookie(req, COOKIE);
  if (token) await db.prepare(`DELETE FROM sessions WHERE token_hash=?1`).bind(await sha256hex(token)).run();
}

/* 권한 확인: need = 'viewer' | 'manager' | 'owner' */
export function need(admin, role) {
  if (!admin) fail(401, '다시 로그인해 주세요.', 'AUTH');
  if ((ROLES[admin.role]?.level || 0) < ROLES[role].level) fail(403, '이 작업은 권한이 없어요.', 'FORBIDDEN');
}

export async function audit(db, admin, action, target = '', detail = '') {
  await db.prepare(`INSERT INTO audit(at, admin_id, admin_name, action, target, detail) VALUES(?1,?2,?3,?4,?5,?6)`)
    .bind(nowIso(), admin?.id ?? null, admin ? `${admin.name}(${admin.login})` : null, action,
      String(target ?? '').slice(0, 120), typeof detail === 'string' ? detail.slice(0, 500) : JSON.stringify(detail).slice(0, 500))
    .run();
}
