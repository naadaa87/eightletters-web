/* tools/stamp.mjs — 정적 파일 주소에 버전 꼬리표(?v=)를 붙입니다
   JS·CSS는 브라우저가 하루 동안 캐시해요. 배포할 때 꼬리표를 바꾸면 모두가 새 파일을 받아요.
   사용: 저장소 루트에서  node tools/stamp.mjs  (버전을 직접 주려면 node tools/stamp.mjs 20261117a) */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const V = process.argv[2] || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '');
const SKIP = new Set(['.git', 'node_modules', '.wrangler', 'functions', 'tools']);
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f)) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.html', '.js'].includes(extname(p))) files.push(p);
  }
})('.');

let changed = 0;
for (const f of files) {
  let s = readFileSync(f, 'utf8');
  const before = s;
  // 1) 절대 경로 자산
  s = s.replace(/(\/assets\/(?:js|css)\/[\w.-]+\.(?:js|css))(\?v=[\w-]+)?/g, `$1?v=${V}`);
  s = s.replace(/(\/admin\/admin\.(?:js|css))(\?v=[\w-]+)?/g, `$1?v=${V}`);
  // 2) assets/js 안의 상대 import → 같은 버전의 절대 경로 (모듈이 두 번 실행되지 않게)
  if (f.startsWith('assets/js/') || f.startsWith(join('assets', 'js'))) {
    s = s.replace(/from\s+'\.\/([\w.-]+\.js)'/g, `from '/assets/js/$1?v=${V}'`);
    s = s.replace(/import\('\.\/([\w.-]+\.js)'\)/g, `import('/assets/js/$1?v=${V}')`);
  }
  if (s !== before) { writeFileSync(f, s); changed++; }
}
console.log(`버전 ${V} · ${changed}개 파일에 꼬리표를 달았어요`);
