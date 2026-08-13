/* tools/gen.mjs — 일주 60 · 절기 24 정적 페이지 + sitemap 생성
   사용: node tools/gen.mjs  (저장소 루트에서) */
import { writeFileSync, mkdirSync } from 'fs';
import { STEM_P, BRANCH_P, TERM_EXTRA } from '../assets/js/content3.js';
import { TERM_MEANING } from '../assets/js/content2.js';

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const STEMS_KR = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCHES_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const S_ROM = ['gap','eul','byeong','jeong','mu','gi','gyeong','sin','im','gye'];
const B_ROM = ['ja','chuk','in','myo','jin','sa','o','mi','shin','yu','sul','hae'];
const STEM_EL = [0,0,1,1,2,2,3,3,4,4];
const EL = ['목','화','토','금','수'];
const EL_H = ['木','火','土','金','水'];
const SITE = 'https://yeodeol.kr';

const head = (title, desc, path, og, extra = '') => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — 여덟글자</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${SITE}${path}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/icons/favicon-64.png" sizes="64x64">
<link rel="apple-touch-icon" href="/assets/icons/icon-192.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#35714F">
<meta property="og:type" content="article">
<meta property="og:site_name" content="여덟글자">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${title} — 여덟글자">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/assets/img/${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${extra}
<link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="site-head"></header>

<main class="wrap" id="main">
`;
const foot = (active = 'null') => `
</main>

<footer class="site-foot"></footer>
<nav class="tabbar" aria-label="하단 메뉴"></nav>

<script type="module">
import { boot } from '/assets/js/app.js';
boot(${active});
</script>
</body>
</html>
`;

const seal2 = (a, b) => `<svg width="92" height="92" viewBox="0 0 100 100" class="seal" role="img" aria-label="${a}${b} 인장">
  <rect x="5" y="5" width="90" height="90" rx="14" fill="none" stroke="#B04B3F" stroke-width="5"/>
  <rect x="13" y="13" width="74" height="74" rx="8" fill="#B04B3F" opacity=".07"/>
  <text x="50" y="43" text-anchor="middle" font-family="Noto Serif KR,serif" font-size="33" fill="#B04B3F" font-weight="600">${a}</text>
  <text x="50" y="81" text-anchor="middle" font-family="Noto Serif KR,serif" font-size="33" fill="#B04B3F" font-weight="600">${b}</text>
</svg>`;

/* ═══ 일주 60 ═══ */
mkdirSync('../ilju', { recursive: true });
const iljuLinks = [];
const urls = [];

for (let i = 0; i < 60; i++) {
  const s = i % 10, b = i % 12;
  const gz = STEMS[s] + BRANCHES[b];
  const kr = STEMS_KR[s] + BRANCHES_KR[b];
  const slug = S_ROM[s] + B_ROM[b];
  const SP = STEM_P[s], BP = BRANCH_P[b];
  const alias = `${BP.place}의 ${SP.noun}`;
  const el = EL[STEM_EL[s]];
  const title = `${kr}일주 — ${alias}`;
  const desc = `${kr}일주(${gz})로 태어난 사람의 결. ${SP.t1.slice(0, 30)}… 점수도 등급도 없는 일주 이야기.`;
  const path = `/ilju/${slug}`;
  iljuLinks.push({ gz, kr, slug, s, b });
  urls.push(path);

  const related = [1, 2, 3].map(k => {
    const j = (i + k * 12) % 60; // 같은 지지 계열 대신 같은 일간의 다른 일지
    const js2 = j % 10, jb = j % 12;
    return { gz: STEMS[js2] + BRANCHES[jb], kr: STEMS_KR[js2] + BRANCHES_KR[jb], slug: S_ROM[js2] + B_ROM[jb] };
  });

  const jsonld = `<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${kr}일주 — ${alias}","inLanguage":"ko","author":{"@type":"Organization","name":"여덟글자"},"publisher":{"@type":"Organization","name":"여덟글자"},"mainEntityOfPage":"${SITE}${path}"}
</script>`;

  const body = `  <article class="block" style="max-width:720px;">
    <div class="ilju-head">
      <div class="seal">${seal2(STEMS[s], BRANCHES[b])}</div>
      <div>
        <h1 class="ilju-alias">${alias}</h1>
        <p class="ilju-sub">${kr}일주 · ${gz} · ${el}(${EL_H[STEM_EL[s]]})의 ${SP.noun}가 ${BP.animal}의 자리에 앉았어요</p>
      </div>
    </div>

    <section class="ilju-sec">
      <p style="font-size:14.5px;line-height:2;color:var(--sub);">일주는 태어난 날의 두 글자예요. 여덟 글자 중에서 나의 성격과 가장 가까운 자리라, 일주 하나만 읽어도 절반은 만난 셈이에요. 아래는 ${kr}일주로 태어난 사람들이 자주 보이는 결이에요. 전부는 아니어도, 몇 줄에서는 멈추게 될 거예요.</p>
    </section>

    <section class="ilju-sec">
      <h2>자주 하는 것 셋</h2>
      <p>하나 — ${SP.t1}</p>
      <p>둘 — ${SP.t2}</p>
      <p>셋 — ${BP.t}</p>
    </section>

    <section class="ilju-sec">
      <h2>오해받기 쉬운 지점</h2>
      <p>${BP.mis}</p>
    </section>

    <section class="ilju-sec">
      <h2>이 글자를 잘 쓰는 법</h2>
      <p>${SP.use}</p>
      <p class="gyeol-action" id="todayLine" style="margin-top:12px;"></p>
    </section>

    <section class="ilju-sec" style="border-top:1px solid var(--line);padding-top:20px;margin-top:30px;">
      <p style="font-size:13px;color:var(--sub);margin:0 0 14px;">이건 ${kr}일주 전체의 이야기예요. 당신의 나머지 여섯 글자가 이 결을 어떻게 바꾸는지는 여덟 글자를 다 놓아야 보여요.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a class="btn btn-primary btn-sm" href="/saju">내 여덟 글자 만들기 · 무료</a>
        <a class="btn btn-soft btn-sm" href="/ilju">예순 일주 전부 보기</a>
      </div>
      <p style="font-size:12.5px;color:var(--mute);margin:16px 0 0;">같은 ${STEMS_KR[s]} 일간의 다른 자리 —
        ${related.map(r => `<a href="/ilju/${r.slug}" style="color:var(--brand-deep);">${r.kr}일주</a>`).join(' · ')}</p>
    </section>
  </article>`;

  const js = `import { boot } from '/assets/js/app.js';
import { branchRelation, REL_KIND } from '/assets/js/saju.js';
const ctx = boot(null);
const { t } = ctx;
const myB = ${b};
const todayRel = branchRelation(t.branch, myB);
document.getElementById('todayLine').textContent =
  todayRel ? \`오늘 \${t.gz}일과 이 일주의 아랫글자는 \${REL_KIND[todayRel]} 관계예요. 그 결을 염두에 두고 하루를 놓아 보세요.\`
           : \`오늘 \${t.gz}일과 이 일주는 서로 간섭이 적은 자리예요. 평소의 결대로 가면 되는 날이에요.\`;`;

  writeFileSync(`../ilju/${slug}.html`,
    head(title, desc, path, 'og-ilju.jpg', jsonld) + body +
    foot().replace("import { boot } from '/assets/js/app.js';\nboot(null);", js));
}

/* 일주 목록 */
const iljuList = `  <section class="block" style="margin-top:26px;">
    <div class="sec-head"><h2>예순 개의 일주</h2><span class="more">태어난 날 두 글자의 이야기</span></div>
    <p style="font-size:14px;color:var(--sub);line-height:1.95;max-width:680px;margin:0 0 8px;">
      갑자에서 계해까지, 태어난 날의 두 글자는 예순 가지 중 하나예요. 일주는 여덟 글자 가운데
      나의 성격과 가장 가까운 자리라, 명리를 처음 만나는 사람은 대개 여기서 시작해요.
      여덟글자의 일주 이야기에는 좋은 일주와 나쁜 일주가 없어요. 자주 하는 것 셋,
      오해받기 쉬운 지점 하나, 그리고 그 글자를 잘 쓰는 법 하나 — 이 다섯 문단이 전부예요.</p>
    <p class="sec-note" style="margin:0 0 18px;">내 일주를 모르면 <a href="/calendar" style="color:var(--brand-deep);font-weight:700;">만세력</a>에서 1분이면 찾을 수 있어요.</p>
    <div class="ilju-grid">
${iljuLinks.map(l => `      <a href="/ilju/${l.slug}">${l.gz}<br><span style="font-size:10.5px;color:var(--mute);font-family:var(--sans);">${l.kr}</span></a>`).join('\n')}
    </div>
  </section>`;
writeFileSync('../ilju.html',
  head('일주 60 — 태어난 날의 두 글자', '갑자일주부터 계해일주까지, 예순 개 일주의 성격과 결. 점수 없이 읽는 일주 사전.', '/ilju', 'og-ilju.jpg') +
  iljuList + foot());
urls.push('/ilju');

/* ═══ 절기 24 ═══ */
mkdirSync('../jeolgi', { recursive: true });
const TERM_ORDER = ['입춘','우수','경칩','춘분','청명','곡우','입하','소만','망종','하지','소서','대서','입추','처서','백로','추분','한로','상강','입동','소설','대설','동지','소한','대한'];
const TERM_HANJA = { 입춘:'立春',우수:'雨水',경칩:'驚蟄',춘분:'春分',청명:'淸明',곡우:'穀雨',입하:'立夏',소만:'小滿',망종:'芒種',하지:'夏至',소서:'小暑',대서:'大暑',입추:'立秋',처서:'處暑',백로:'白露',추분:'秋分',한로:'寒露',상강:'霜降',입동:'立冬',소설:'小雪',대설:'大雪',동지:'冬至',소한:'小寒',대한:'大寒' };
const T_ROM = { 입춘:'ipchun',우수:'usu',경칩:'gyeongchip',춘분:'chunbun',청명:'cheongmyeong',곡우:'gogu',입하:'ipha',소만:'soman',망종:'mangjong',하지:'haji',소서:'soseo',대서:'daeseo',입추:'ipchu',처서:'cheoseo',백로:'baengno',추분:'chubun',한로:'hallo',상강:'sanggang',입동:'ipdong',소설:'soseol',대설:'daeseol',동지:'dongji',소한:'sohan',대한:'daehan' };
const seasonOf = i => i < 6 ? 0 : i < 12 ? 1 : i < 18 ? 3 : 4; // 봄목 여름화 가을금 겨울수
const SEASON_TXT = {
  0:'봄의 절기라 목(木)의 기운 — 시작하고 자라는 힘 — 이 짙어지는 때예요.',
  1:'여름의 절기라 화(火)의 기운 — 퍼지고 표현하는 힘 — 이 짙어지는 때예요.',
  3:'가을의 절기라 금(金)의 기운 — 거두고 매듭짓는 힘 — 이 짙어지는 때예요.',
  4:'겨울의 절기라 수(水)의 기운 — 모으고 깊어지는 힘 — 이 짙어지는 때예요.',
};

TERM_ORDER.forEach((name, i) => {
  const slug = T_ROM[name];
  const path = `/jeolgi/${slug}`;
  urls.push(path);
  const se = seasonOf(i);
  const desc = `${name}(${TERM_HANJA[name]}) — ${TERM_MEANING[name]}. 이 절기의 뜻과 이 보름을 지나는 법.`;
  const jsonld = `<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${name} — ${TERM_MEANING[name]}","inLanguage":"ko","author":{"@type":"Organization","name":"여덟글자"},"publisher":{"@type":"Organization","name":"여덟글자"},"mainEntityOfPage":"${SITE}${path}"}
</script>`;
  const prev = TERM_ORDER[(i + 23) % 24], next = TERM_ORDER[(i + 1) % 24];
  const body = `  <article class="block" style="max-width:720px;">
    <div class="jg-head">
      <h1>${name}</h1><span class="han">${TERM_HANJA[name]}</span>
      <span style="margin-left:auto;font-size:12px;color:var(--mute);">스물넷 중 ${i + 1}번째</span>
    </div>
    <p style="font-size:15px;color:var(--sub);margin:0 0 20px;">${TERM_MEANING[name]}</p>

    <section class="ilju-sec">
      <h2>이 절기의 자리</h2>
      <p>절기는 태양이 지나는 자리를 스물넷으로 나눈 것이에요. 날짜는 해마다 하루쯤 움직이지만 자리는 움직이지 않아요. ${SEASON_TXT[se]}</p>
    </section>

    <section class="ilju-sec">
      <h2>이 보름을 지나는 법</h2>
      <p>${TERM_EXTRA[name]}</p>
      <p class="sec-note" id="jgWhen" style="margin-top:10px;"></p>
    </section>

    <section class="ilju-sec" style="border-top:1px solid var(--line);padding-top:20px;margin-top:30px;">
      <p style="font-size:13px;color:var(--sub);margin:0 0 14px;">이 절기가 당신에게 받는 계절인지 단련의 계절인지는 당신의 일간에 따라 달라져요. 절기 편지에서 이어서 읽을 수 있어요.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a class="btn btn-primary btn-sm" href="/time">나의 절기 편지 읽기</a>
        <a class="btn btn-soft btn-sm" href="/jeolgi">스물네 절기 전부 보기</a>
      </div>
      <p style="font-size:12.5px;color:var(--mute);margin:16px 0 0;">
        ← <a href="/jeolgi/${T_ROM[prev]}" style="color:var(--brand-deep);">${prev}</a> ·
        <a href="/jeolgi/${T_ROM[next]}" style="color:var(--brand-deep);">${next}</a> →</p>
    </section>
  </article>`;
  const js = `import { boot } from '/assets/js/app.js';
import { termsOfYear } from '/assets/js/saju.js';
const ctx = boot(null);
const { t } = ctx;
const sy = (t.mo === 1 || (t.mo === 2 && t.d < 4)) ? t.y - 1 : t.y;
const tm = termsOfYear(sy).find(x => x.name === '${name}');
if (tm) document.getElementById('jgWhen').textContent =
  \`올해의 \${'${name}'}은 \${tm.mo}월 \${tm.d}일이에요.\`;`;
  writeFileSync(`../jeolgi/${slug}.html`,
    head(`${name} — ${TERM_MEANING[name]}`, desc, path, 'og-jeolgi.jpg', jsonld) + body +
    foot().replace("import { boot } from '/assets/js/app.js';\nboot(null);", js));
});

const jgList = `  <section class="block" style="margin-top:26px;">
    <div class="sec-head"><h2>스물네 번의 절기</h2><span class="more">계절이 바뀌는 자리마다 한 편씩</span></div>
    <p style="font-size:14px;color:var(--sub);line-height:1.95;max-width:680px;margin:0 0 18px;">
      절기는 태양의 자리로 나눈 스물네 개의 계절 마디예요. 입춘에 한 해가 시작되고,
      동지에 밤이 가장 길어졌다가 낮이 다시 자라기 시작해요. 여덟글자는 절기마다 편지를 한 통씩 써요.
      아래는 그 스물네 자리의 뜻이에요. 날짜는 해마다 하루쯤 움직여요.</p>
    <div class="ilju-grid" style="grid-template-columns:repeat(4,1fr);">
${TERM_ORDER.map(n => `      <a href="/jeolgi/${T_ROM[n]}">${n}<br><span style="font-size:10.5px;color:var(--mute);font-family:var(--sans);">${TERM_HANJA[n]}</span></a>`).join('\n')}
    </div>
  </section>`;
writeFileSync('../jeolgi.html',
  head('절기 24 — 계절이 바뀌는 자리', '입춘부터 대한까지 스물네 절기의 뜻과 이 보름을 지나는 법.', '/jeolgi', 'og-jeolgi.jpg') +
  jgList + foot());
urls.push('/jeolgi');

/* ═══ sitemap ═══ */
const core = ['/', '/saju', '/gunghap', '/time', '/record',
  '/tarot', '/calendar', '/dict', '/type', '/juyeok', '/report', '/charm'];
const all = [...core, ...urls.sort()];
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url><loc>${SITE}${u}</loc><changefreq>${u === '/' ? 'daily' : 'weekly'}</changefreq><priority>${u === '/' ? '1.0' : core.includes(u) ? '0.8' : '0.6'}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync('../sitemap.xml', sm);
console.log(`일주 60 + 절기 24 + 목록 2 생성 · sitemap ${all.length}개 URL`);
