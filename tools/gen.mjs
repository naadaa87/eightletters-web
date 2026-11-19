/* tools/gen.mjs — 일주 60 · 절기 24 정적 페이지 + sitemap 생성
   사용: cd tools && node --import ./assets-hook.mjs gen.mjs
   (일주 한눈에 보기 표·절기 풍습 등 페이지별 내용은 아래 NAEUM · TERM_WHEN · TERM_CUSTOM 표에서 고칩니다) */
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
<script defer src="https://choisijun.com/k1.js" integrity="sha384-E7Xl7wiU1vNu5AUY41kJB1uV52L+UEvqwYRzRj4zdaBGAeyRfCll926ETRo39Jm6" crossorigin="anonymous"></script>
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

/* ═══ 일주 풀이표 — 일주마다 값이 달라지는 사실 (지장간 · 일지 십성 · 십이운성 · 납음오행) ═══
   글 본문(STEM_P · BRANCH_P)은 천간 10 · 지지 12 의 조합이라 일주끼리 겹치는 문장이 많다.
   아래 표는 예순 일주가 모두 다르게 나오는 값이라, 페이지마다 고유한 내용이 된다. */
const BRANCH_EL = [4,2,0,0,2,1,1,2,3,3,2,4];            // 子水 丑土 寅木 卯木 辰土 巳火 午火 未土 申金 酉金 戌土 亥水
const HIDDEN = [[8,9],[9,7,5],[4,2,0],[0,1],[1,9,4],[4,6,2],[2,5,3],[3,1,5],[4,8,6],[6,7],[7,3,4],[4,0,8]]; // 지장간(여기·중기·정기) — 마지막이 본기
const STAGES = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
const STAGE_TXT = {
  장생:'막 태어나 자라기 시작하는 자리예요. 배우고 받아들이는 힘이 좋아요.',
  목욕:'씻기고 다듬어지는 자리예요. 호기심이 많고 변화에 열려 있어요.',
  관대:'옷을 갖춰 입는 자리예요. 자기 색을 드러내고 인정받고 싶어 해요.',
  건록:'제힘으로 서는 자리예요. 기대지 않고 꾸준히 해내요.',
  제왕:'기운이 가장 가득 찬 자리예요. 앞에서 끌고 가는 힘이 있어요.',
  쇠:'정점을 지나 고르는 자리예요. 서두르지 않는 노련함이 있어요.',
  병:'힘을 덜어 내는 자리예요. 섬세하고 남의 사정을 잘 읽어요.',
  사:'멈추고 정리하는 자리예요. 한 가지에 깊이 파고들어요.',
  묘:'안에 간직하는 자리예요. 모으고 지키는 힘이 좋아요.',
  절:'끊기고 새로 이어지는 자리예요. 비우고 방향을 바꾸는 데 능해요.',
  태:'새 기운이 맺히는 자리예요. 가능성을 구상하는 힘이 있어요.',
  양:'안에서 길러지는 자리예요. 준비하고 보살피는 데 마음을 써요.',
};
const stageOf = (s, b) => {
  const start = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3][s];       // 장생이 드는 지지 (양간은 순행, 음간은 역행)
  return STAGES[s % 2 === 0 ? (b - start + 12) % 12 : (start - b + 12) % 12];
};
const tenGod = (s, hs) => {                                // 일간 s 가 본 천간 hs 의 십성
  const me = STEM_EL[s], el = STEM_EL[hs], same = s % 2 === hs % 2;
  if (el === me) return same ? '비견' : '겁재';
  if ((me + 1) % 5 === el) return same ? '식신' : '상관';
  if ((me + 2) % 5 === el) return same ? '편재' : '정재';
  if ((el + 2) % 5 === me) return same ? '편관' : '정관';
  return same ? '편인' : '정인';
};
const GOD_TXT = {
  비견:'나와 같은 기운이에요. 주관이 뚜렷하고 혼자서도 잘 서요.',
  겁재:'나와 닮았지만 결이 다른 기운이에요. 승부욕과 밀고 나가는 힘이 있어요.',
  식신:'내가 낳아 기르는 기운이에요. 여유 있게, 꾸준히 만들어 내요.',
  상관:'내가 낳는 날 선 기운이에요. 재치와 표현력, 틀을 깨는 힘이 있어요.',
  편재:'내가 다루는 넓은 재물의 기운이에요. 활동 반경이 넓고 감각이 빨라요.',
  정재:'내가 다루는 안정된 재물의 기운이에요. 성실하고 알뜰해요.',
  편관:'나를 누르는 센 기운이에요. 책임감과 버티는 힘이 길러져요.',
  정관:'나를 바르게 잡아 주는 기운이에요. 원칙과 신뢰를 중요하게 여겨요.',
  편인:'비껴서 나를 돕는 기운이에요. 직관과 남다른 배움의 길이 있어요.',
  정인:'바르게 나를 돕는 기운이에요. 배우고 보살핌받는 복이 있어요.',
};
const GROUP_TXT = {
  비견:'위아래 글자가 같은 기운이라 뚝심이 세요.', 겁재:'위아래 글자가 같은 기운이라 뚝심이 세요.',
  식신:'윗글자가 아랫글자를 길러요. 가진 것을 표현으로 흘려보내는 구조예요.', 상관:'윗글자가 아랫글자를 길러요. 가진 것을 표현으로 흘려보내는 구조예요.',
  편재:'윗글자가 아랫글자를 다뤄요. 현실을 쥐고 움직이는 구조예요.', 정재:'윗글자가 아랫글자를 다뤄요. 현실을 쥐고 움직이는 구조예요.',
  편관:'아랫글자가 윗글자를 다듬어요. 스스로를 단련하는 구조예요.', 정관:'아랫글자가 윗글자를 다듬어요. 스스로를 단련하는 구조예요.',
  편인:'아랫글자가 윗글자를 받쳐 줘요. 안에서 채워지는 구조예요.', 정인:'아랫글자가 윗글자를 받쳐 줘요. 안에서 채워지는 구조예요.',
};
const NAEUM = [['해중금','海中金','바닷속에 잠긴 금'],['노중화','爐中火','화로 속의 불'],['대림목','大林木','큰 숲의 나무'],['노방토','路傍土','길가의 흙'],['검봉금','劍鋒金','칼끝의 금'],
  ['산두화','山頭火','산꼭대기의 불'],['간하수','澗下水','골짜기 아래를 흐르는 물'],['성두토','城頭土','성 위의 흙'],['백랍금','白蠟金','흰 밀랍 같은 금'],['양류목','楊柳木','버드나무'],
  ['천중수','泉中水','샘 속의 물'],['옥상토','屋上土','지붕 위의 흙'],['벽력화','霹靂火','벼락의 불'],['송백목','松柏木','소나무와 잣나무'],['장류수','長流水','길게 흐르는 물'],
  ['사중금','沙中金','모래 속의 금'],['산하화','山下火','산 아래의 불'],['평지목','平地木','평지의 나무'],['벽상토','壁上土','벽 위의 흙'],['금박금','金箔金','금박의 금'],
  ['복등화','覆燈火','등잔의 불'],['천하수','天河水','하늘의 강물'],['대역토','大驛土','큰 길목의 흙'],['차천금','釵釧金','비녀와 팔찌의 금'],['상자목','桑柘木','뽕나무'],
  ['대계수','大溪水','큰 시냇물'],['사중토','沙中土','모래 속의 흙'],['천상화','天上火','하늘 위의 불'],['석류목','石榴木','석류나무'],['대해수','大海水','큰 바닷물']];
const iljuFacts = (i, s, b, kr, BP) => {
  const yy = n => (n % 2 === 0 ? '양' : '음');
  const hid = HIDDEN[b], main = hid[hid.length - 1];
  const god = tenGod(s, main), stage = stageOf(s, b), [nm, nmH, nmT] = NAEUM[i >> 1];
  const row = (k, v) => `<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px;line-height:1.8;"><dt style="flex:0 0 84px;color:var(--mute);">${k}</dt><dd style="margin:0;flex:1;">${v}</dd></div>`;
  return {
    god, stage, nm,
    html: `    <section class="ilju-sec">
      <h2>${kr}일주 한눈에 보기</h2>
      <dl style="margin:6px 0 0;border-top:1px solid var(--line);">
        ${row('일간(위)', `${STEMS[s]}(${STEMS_KR[s]}) — ${yy(s)}의 ${EL[STEM_EL[s]]}(${EL_H[STEM_EL[s]]})`)}
        ${row('일지(아래)', `${BRANCHES[b]}(${BRANCHES_KR[b]}) — ${BP.animal}의 글자, ${EL[BRANCH_EL[b]]}(${EL_H[BRANCH_EL[b]]})`)}
        ${row('지장간', `${hid.map(h => `${STEMS[h]}(${STEMS_KR[h]})`).join(' · ')} — 아랫글자 안에 숨은 천간이에요. 중심이 되는 본기는 ${STEMS[main]}(${STEMS_KR[main]})예요.`)}
        ${row('일지 십성', `${god} — ${GOD_TXT[god]}`)}
        ${row('십이운성', `${stage} — ${STAGE_TXT[stage]}`)}
        ${row('납음오행', `${nm}(${nmH}) — ${nmT}에 빗댄 이름이에요.`)}
        ${row('예순 갑자', `${i + 1}번째 자리예요. 같은 일주는 예순 날마다 한 번 돌아와요.`)}
      </dl>
      <p style="margin-top:12px;">${kr}일주는 ${yy(s)}의 ${EL[STEM_EL[s]]} 일간이 ${EL[BRANCH_EL[b]]}의 자리 위에 놓여 있어요. ${GROUP_TXT[god]} 다만 이 표는 태어난 날 두 글자만 본 것이라, 나머지 여섯 글자에 따라 드러나는 모습은 달라져요.</p>
    </section>
`,
  };
};

mkdirSync('../ilju', { recursive: true });
const iljuLinks = [];
const urls = [];
const feed = []; // RSS 항목

for (let i = 0; i < 60; i++) {
  const s = i % 10, b = i % 12;
  const gz = STEMS[s] + BRANCHES[b];
  const kr = STEMS_KR[s] + BRANCHES_KR[b];
  const slug = S_ROM[s] + B_ROM[b];
  const SP = STEM_P[s], BP = BRANCH_P[b];
  const alias = `${BP.place}의 ${SP.noun}`;
  const el = EL[STEM_EL[s]];
  const F = iljuFacts(i, s, b, kr, BP);
  const title = `${kr}일주 — ${alias}`;
  const desc = `${kr}일주(${gz})의 성격과 결. 일지 ${F.god} · 십이운성 ${F.stage} · 납음 ${F.nm}까지, 점수도 등급도 없이 읽는 ${kr}일주 이야기.`;
  const path = `/ilju/${slug}`;
  iljuLinks.push({ gz, kr, slug, s, b });
  urls.push(path);
  feed.push({ title: `${kr}일주 — ${alias}`, path, cat: '일주',
    text: `${kr}일주(${gz})는 ${el}(${EL_H[STEM_EL[s]]})의 ${SP.noun}가 ${BP.animal}의 자리에 앉은 날이에요. 자주 하는 것 — ${SP.t1} ${SP.t2} ${BP.t} 오해받기 쉬운 지점 — ${BP.mis} 이 글자를 잘 쓰는 법 — ${SP.use}` });

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

${F.html}
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
    <div class="sec-head"><h1>예순 개의 일주</h1><span class="more">태어난 날 두 글자의 이야기</span></div>
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
/* 절기마다 달라지는 사실 — 드는 때(양력) · 태양 황경 · 예부터의 풍습 · 사주에서의 자리 */
const TERM_WHEN = { 입춘:'2월 4일 무렵',우수:'2월 19일 무렵',경칩:'3월 5~6일 무렵',춘분:'3월 20~21일 무렵',청명:'4월 4~5일 무렵',곡우:'4월 20일 무렵',
  입하:'5월 5~6일 무렵',소만:'5월 21일 무렵',망종:'6월 5~6일 무렵',하지:'6월 21일 무렵',소서:'7월 7일 무렵',대서:'7월 22~23일 무렵',
  입추:'8월 7~8일 무렵',처서:'8월 23일 무렵',백로:'9월 7~8일 무렵',추분:'9월 22~23일 무렵',한로:'10월 8일 무렵',상강:'10월 23~24일 무렵',
  입동:'11월 7~8일 무렵',소설:'11월 22일 무렵',대설:'12월 7일 무렵',동지:'12월 21~22일 무렵',소한:'1월 5~6일 무렵',대한:'1월 20일 무렵' };
const TERM_CUSTOM = {
  입춘:'대문이나 기둥에 ‘입춘대길 건양다경’ 같은 입춘첩을 써 붙이고 한 해의 복을 빌었어요. 겨울을 난 몸을 깨우려고 향이 센 햇나물을 무쳐 먹기도 했어요.',
  우수:'눈이 비로 바뀌고 얼었던 땅이 풀리기 시작해요. ‘우수·경칩에 대동강 물이 풀린다’는 말이 이때를 가리켜요.',
  경칩:'겨울잠을 자던 개구리와 벌레가 땅 위로 나온다는 때예요. 고로쇠나무 수액을 받아 마시고, 흙일을 시작해도 탈이 없다고 여겼어요.',
  춘분:'낮과 밤의 길이가 같아지고, 이날부터 낮이 더 길어져요. 논밭을 갈고 씨 뿌릴 채비를 하며 한 해 농사를 열었어요.',
  청명:'한식과 같은 날이거나 하루 차이라 조상의 묘를 돌보고 나무를 심었어요. 하늘이 맑아 봄 일을 시작하기 좋은 때로 쳤어요.',
  곡우:'봄비가 내려 온갖 곡식을 기름지게 한다는 때예요. 못자리를 마련하고, 이 무렵 딴 첫 찻잎을 귀하게 여겼어요.',
  입하:'봄빛이 물러나고 신록이 짙어지는 여름의 문턱이에요. 못자리를 돌보고 김을 매며 여름 농사를 준비했어요.',
  소만:'햇볕이 넉넉해져 만물이 자라 조금씩 차오르는 때예요. 보리가 익어 가고 모내기 준비로 바빠졌어요.',
  망종:'벼나 보리처럼 까끄라기가 있는 곡식의 씨를 뿌리는 때예요. 보리를 거두고 모를 심느라 한 해 중 가장 바빴어요.',
  하지:'한 해 가운데 낮이 가장 긴 날이에요. 햇감자를 캐 먹고, 비가 늦으면 기우제를 지냈어요.',
  소서:'작은 더위라는 뜻으로, 장마가 겹치는 때예요. 갓 거둔 밀로 국수나 수제비를 해 먹었어요.',
  대서:'한 해 중 가장 더운 때로, 중복과 겹치는 일이 많아요. ‘염소 뿔도 녹는다’는 말이 있을 만큼 더위가 깊어요.',
  입추:'아직 덥지만 절기로는 가을이 시작돼요. 김장에 쓸 무와 배추를 심고, 날이 맑기를 바랐어요.',
  처서:'더위가 그친다는 뜻이에요. ‘처서가 지나면 모기도 입이 비뚤어진다’고 했고, 풀이 덜 자라 벌초를 했어요.',
  백로:'밤 기온이 내려가 풀잎에 흰 이슬이 맺혀요. 포도가 제철이라 이 무렵을 ‘포도순절’이라고 불렀어요.',
  추분:'낮과 밤의 길이가 다시 같아지고, 이날부터 밤이 더 길어져요. 논밭의 곡식을 거두기 시작했어요.',
  한로:'찬 이슬이 맺히는 때예요. 국화로 전을 부치고 술을 담갔고, 서리가 오기 전에 타작을 서둘렀어요.',
  상강:'서리가 내리기 시작하는 때예요. 단풍이 절정에 이르고 가을걷이를 마무리했어요.',
  입동:'겨울이 시작돼요. 김장을 하고, 햇곡식으로 시루떡을 쪄 이웃과 나누었어요.',
  소설:'첫눈이 내린다는 때예요. 김장을 마무리하고 겨울 채비를 서둘렀어요.',
  대설:'눈이 많이 내린다는 때예요. 이 무렵 눈이 넉넉하면 이듬해 풍년이 든다고 여겼고, 메주를 쑤기 시작했어요.',
  동지:'한 해 가운데 밤이 가장 긴 날이에요. 팥죽을 쑤어 먹었고, 이날부터 낮이 다시 길어져 ‘작은 설’이라고도 불렀어요.',
  소한:'이름은 작은 추위지만 우리나라에서는 한 해 중 가장 추운 때예요. ‘대한이 소한 집에 놀러 갔다가 얼어 죽었다’는 속담이 있어요.',
  대한:'큰 추위라는 뜻의, 스물네 절기의 마지막이에요. 한 해의 매듭을 짓고 새 절기 입춘을 기다렸어요.' };
const BR_MONTH = ['인','묘','진','사','오','미','신','유','술','해','자','축'];   // 입춘부터 두 절기씩 한 달
const BR_MONTH_H = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
const hasJong = w => (w.charCodeAt(w.length - 1) - 0xac00) % 28 !== 0;
const eun = w => w + (hasJong(w) ? '은' : '는'), i_ga = w => w + (hasJong(w) ? '이' : '가');
const termSaju = (name, i) => {
  const m = i >> 1, mon = `${BR_MONTH[m]}월(${BR_MONTH_H[m]}月)`;
  if (i % 2 === 0) {
    return `사주에서는 ${i_ga(name)} ${mon}의 시작이에요. 달력의 1일이 아니라 ${i_ga(name)} 드는 시각부터 태어난 달의 글자(월주)가 바뀌어요.` +
      (i === 0 ? ' 한 해의 글자(연주)도 설날이 아니라 입춘을 기준으로 바뀌어요. 그래서 1월이나 2월 초에 태어났다면 띠가 달라질 수 있어요.' : ` 그래서 ${name} 앞뒤로 태어났다면 태어난 시각까지 확인해야 월주가 정확해요.`);
  }
  const prev = TERM_ORDER[i - 1];
  return `사주에서 ${eun(name)} ${mon}의 한가운데에 있는 절기(중기)예요. 월주는 앞선 ${prev}에 이미 바뀌었고, ${name} 무렵에는 그 달의 기운이 가장 또렷해져요.`;
};
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
  feed.push({ title: `${name}(${TERM_HANJA[name]}) — ${TERM_MEANING[name]}`, path, cat: '절기',
    text: `${name}은 ${TERM_MEANING[name]}. ${SEASON_TXT[se]} 이 보름을 지나는 법 — ${TERM_EXTRA[name]}` });
  const desc = `${name}(${TERM_HANJA[name]})의 뜻과 날짜. 양력 ${TERM_WHEN[name]}에 드는 절기로, ${TERM_MEANING[name]}${hasJong(TERM_MEANING[name]) ? '이에요' : '예요'}. 풍습과 사주에서의 자리, 이 보름을 지나는 법까지.`;
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
      <h2>${eun(name)} 언제인가요</h2>
      <p>양력으로 해마다 ${TERM_WHEN[name]}에 들어요. 태양이 황경 ${(315 + i * 15) % 360}도 자리를 지나는 때로, ${prev} 다음이고 ${next} 앞이에요. 다음 절기까지는 보름쯤 걸려요.</p>
      <p class="sec-note" id="jgWhen" style="margin-top:10px;"></p>
    </section>

    <section class="ilju-sec">
      <h2>예부터 이렇게 보냈어요</h2>
      <p>${TERM_CUSTOM[name]}</p>
    </section>

    <section class="ilju-sec">
      <h2>사주에서 보는 ${name}</h2>
      <p>${termSaju(name, i)}</p>
    </section>

    <section class="ilju-sec">
      <h2>이 보름을 지나는 법</h2>
      <p>${TERM_EXTRA[name]}</p>
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
    <div class="sec-head"><h1>스물네 번의 절기</h1><span class="more">계절이 바뀌는 자리마다 한 편씩</span></div>
    <p style="font-size:14px;color:var(--sub);line-height:1.95;max-width:680px;margin:0 0 18px;">
      절기는 태양의 자리로 나눈 스물네 개의 계절 마디예요. 입춘에 한 해가 시작되고,
      동지에 밤이 가장 길어졌다가 낮이 다시 자라기 시작해요. 여덟글자는 절기마다 편지를 한 통씩 써요.
      아래는 그 스물네 자리의 뜻이에요. 날짜는 해마다 하루쯤 움직여요.</p>
    <p style="font-size:14px;color:var(--sub);line-height:1.95;max-width:680px;margin:0 0 18px;">
      스물네 절기는 태양이 한 해 동안 지나는 길(황도)을 15도씩 나눈 자리예요. 음력이 아니라 태양의 움직임을 따르기 때문에 양력 날짜가 해마다 거의 같아요.
      입춘·경칩·청명처럼 달을 여는 열두 절기와, 우수·춘분·곡우처럼 달의 한가운데에 놓이는 열두 중기가 번갈아 와요.
      사주에서는 달을 여는 열두 절기가 드는 시각을 기준으로 태어난 달의 글자를 정해요. 한 해의 시작도 설날이 아니라 입춘으로 봐요.</p>
    <div class="ilju-grid" style="grid-template-columns:repeat(4,1fr);">
${TERM_ORDER.map(n => `      <a href="/jeolgi/${T_ROM[n]}">${n}<br><span style="font-size:10.5px;color:var(--mute);font-family:var(--sans);">${TERM_HANJA[n]}</span></a>`).join('\n')}
    </div>
  </section>`;
writeFileSync('../jeolgi.html',
  head('절기 24 — 계절이 바뀌는 자리', '입춘부터 대한까지 스물네 절기의 뜻과 이 보름을 지나는 법.', '/jeolgi', 'og-jeolgi.jpg') +
  jgList + foot());
urls.push('/jeolgi');

/* ═══ sitemap ═══ */
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const core = ['/', '/saju', '/gunghap', '/time', '/record', '/report', '/charm',
  '/tarot', '/calendar', '/dict', '/type', '/juyeok', '/about', '/notice', '/contact', '/terms', '/privacy'];
const all = [...core, ...urls.sort()];
const prio = u => u === '/' ? '1.0' : ['/terms', '/privacy', '/contact'].includes(u) ? '0.3' : core.includes(u) ? '0.8' : '0.6';
const freq = u => u === '/' ? 'daily' : u === '/notice' ? 'weekly' : ['/terms', '/privacy'].includes(u) ? 'yearly' : 'monthly';
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod><changefreq>${freq(u)}</changefreq><priority>${prio(u)}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync('../sitemap.xml', sm);

/* ═══ RSS — 네이버 서치어드바이저 · 피드 리더용 (본문 요약 포함) ═══ */
const xml = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PUB = new Date('2026-11-17T09:00:00+09:00');
const items = feed.map((f, i) => {
  const d = new Date(PUB.getTime() - i * 60e3); // 같은 시각이 겹치지 않게 1분씩
  return `  <item>
    <title>${xml(f.title)}</title>
    <link>${SITE}${f.path}</link>
    <guid isPermaLink="true">${SITE}${f.path}</guid>
    <category>${f.cat}</category>
    <pubDate>${d.toUTCString()}</pubDate>
    <description>${xml(f.text)}</description>
  </item>`;
});
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>여덟글자 — 일주와 절기 이야기</title>
  <link>${SITE}/</link>
  <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
  <description>점수도 등급도 없이 읽는 일주 예순 편과 절기 스물네 편</description>
  <language>ko</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join('\n')}
</channel>
</rss>
`;
writeFileSync('../rss.xml', rss);
console.log(`일주 60 + 절기 24 + 목록 2 생성 · sitemap ${all.length}개 URL · rss ${items.length}개 항목`);
