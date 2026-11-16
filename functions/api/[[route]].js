/* 여덟글자 서버 — /api/* 진입점
   공개:   GET /api/config · POST /api/e · POST /api/inquiry · POST /api/notify
   관리자: /api/admin/*  (functions/_shared/admin.js) */
import { json, HttpError } from '../_shared/http.js';
import { ensure } from '../_shared/db.js';
import { getConfig, postEvent, postInquiry, postNotify } from '../_shared/public.js';
import { handleAdmin } from '../_shared/admin.js';

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const method = request.method.toUpperCase();

  try {
    if (!env.DB) {
      // 데이터베이스가 아직 연결되지 않았을 때 — 화면은 기본값으로 계속 돌아갑니다
      if (path === 'config') return json({ v: 1, offline: true, settings: {}, products: {}, notices: [], banner: null }, 200, { 'cache-control': 'public, max-age=30' });
      if (path === 'e') return new Response(null, { status: 204 });
      return json({ error: '서버 준비 중이에요. 잠시 뒤에 다시 시도해 주세요.', code: 'NO_DB' }, 503);
    }
    await ensure(env.DB);

    if (path === 'config' && method === 'GET') return await getConfig(ctx);
    if (path === 'e' && method === 'POST') return await postEvent(ctx);
    if (path === 'inquiry' && method === 'POST') return await postInquiry(ctx);
    if (path === 'notify' && method === 'POST') return await postNotify(ctx);
    if (path === 'health') return json({ ok: true, at: new Date().toISOString() });
    if (path.startsWith('admin/') || path === 'admin') {
      return await handleAdmin(ctx, path.replace(/^admin\/?/, ''), method);
    }
    return json({ error: '없는 주소예요.', code: 'NOT_FOUND' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
    console.error('[api]', path, e && (e.stack || e.message || e));
    return json({ error: '서버에서 문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.', code: 'SERVER' }, 500);
  }
}
