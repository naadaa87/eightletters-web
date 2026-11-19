/* tools/assets-hook.mjs — 브라우저용 주소(/assets/js/…?v=…)로 적힌 import 를 Node 에서도 읽게 해 줍니다.
   사용: cd tools && node --import ./assets-hook.mjs gen.mjs */
import { register } from 'node:module';
const root = new URL('../', import.meta.url).href;
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, n) {
  if (s.startsWith('/assets/')) return n(new URL(s.slice(1).split('?')[0], ${JSON.stringify(root)}).href, c);
  return n(s, c);
}`));
