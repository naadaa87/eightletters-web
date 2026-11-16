/* tools/docs.mjs — 서비스 소개 · 공지사항 · 문의하기 · 이용약관 · 개인정보처리방침
   사용: cd tools && node docs.mjs
   운영자 이름·연락처 같은 값은 관리자 화면 > 사업자·사이트 설정에서 채우면 data-cfg 자리에 들어갑니다. */
import { writeFileSync } from 'fs';

const SITE = 'https://yeodeol.kr';
const V = process.env.ASSET_V || '';
const q = V ? `?v=${V}` : '';

const head = ({ title, desc, path, og = 'og-home.jpg', extra = '', robots = '' }) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — 여덟글자</title>
<meta name="description" content="${desc}">
${robots ? `<meta name="robots" content="${robots}">\n` : ''}<link rel="canonical" href="${SITE}${path}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/icons/favicon-64.png" sizes="64x64">
<link rel="apple-touch-icon" href="/assets/icons/icon-192.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#35714F">
<meta property="og:type" content="website">
<meta property="og:site_name" content="여덟글자">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${title} — 여덟글자">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/assets/img/${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${extra}<link rel="stylesheet" href="/assets/css/style.css${q}">
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="site-head"></header>

<main class="wrap" id="main">
`;
const foot = js => `
</main>

<footer class="site-foot"></footer>
<nav class="tabbar" aria-label="하단 메뉴"></nav>

<script type="module">
${js}
</script>
</body>
</html>
`;
const BOOT = `import { boot } from '/assets/js/app.js${q}';\nboot(null);`;
const cfg = (key, empty) => `<span data-cfg="${key}" data-empty="${empty}"></span>`;

/* ═══════════ 서비스 소개 ═══════════ */
const FAQ = [
  ['정말 무료인가요?', '오늘의 색, 내 사주, 궁합의 첫 두 층, 감정 기록, 만세력, 일주·절기 글은 모두 무료예요. 더 깊이 읽는 리포트만 따로 값을 받고, 그것도 첫 부분은 결제 전에 먼저 열어 드려요.'],
  ['회원가입을 해야 하나요?', '아니요. 가입도 로그인도 없어요. 입력한 생년월일과 기록은 지금 쓰시는 기기의 브라우저에만 저장돼요. 기기를 바꾸실 때는 푸터의 ‘내 기록 백업’으로 파일을 옮기면 돼요.'],
  ['태어난 시간을 몰라도 되나요?', '괜찮아요. 시간을 모르면 시주(時柱)를 비워 두고 여섯 글자로 읽어요. 일주와 오행의 큰 흐름은 그대로 보여요.'],
  ['다른 사이트와 여덟 글자가 다르게 나와요.', '절기 경계와 자시(子時)를 어떻게 보느냐에 따라 달라질 수 있어요. 여덟글자는 절기를 태양 황경으로 직접 계산하고, 밤 11시부터를 다음 날로 보는 조자시를 따르며, 서머타임 시행 기간 출생은 한 시간을 되돌려 계산해요. 계산 방식은 모두 공개해 두었어요.'],
  ['점수나 운세 등급은 왜 없나요?', '숫자 하나가 하루를 대신 판단해 버리면 오히려 불안해지기 쉬워요. 여덟글자는 좋고 나쁨 대신 그날의 성질을 설명하고, 오늘 해 볼 만한 일 하나로 끝맺어요.'],
  ['내 기록을 운영자가 볼 수 있나요?', '볼 수 없어요. 생년월일, 감정 기록, 세 줄 일기는 서버로 보내지 않아요. 서버에 남는 건 어떤 화면이 몇 번 열렸는지 같은 익명 숫자, 그리고 직접 보내 주신 문의와 알림 신청뿐이에요.'],
  ['유료 리포트는 언제 열리나요?', '지금 결제를 준비하고 있어요. 리포트마다 ‘열리면 알려 주세요’를 눌러 이메일을 남기시면 열리는 날 한 번만 알려 드려요. 열리는 소식은 공지사항에도 올려요.'],
  ['해석을 믿고 중요한 결정을 해도 될까요?', '여덟글자의 문장은 스스로를 돌아보는 데 쓰는 참고 자료예요. 건강, 법률, 돈과 관련된 결정은 꼭 전문가와 상의해 주세요.'],
];
const aboutLd = `<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
{"@type":"Organization","@id":"${SITE}/#org","name":"여덟글자","url":"${SITE}/","logo":"${SITE}/assets/icons/icon-512.png"},
{"@type":"FAQPage","mainEntity":[${FAQ.map(([qq, a]) => `{"@type":"Question","name":${JSON.stringify(qq)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(a)}}}`).join(',')}]}
]}
</script>
`;
writeFileSync('../about.html', head({
  title: '여덟글자는 어떤 곳인가요', path: '/about', extra: aboutLd,
  desc: '점수도 등급도 없이, 오늘의 색과 감정으로 사주를 읽는 곳. 여덟글자가 하는 일과 하지 않는 일, 계산 방식, 기록을 다루는 원칙을 소개합니다.',
}) + `  <article class="doc">
    <header class="doc-head">
      <p class="kicker">서비스 소개</p>
      <h1>사주를 보는 대신,<br>사주와 함께 살아가는 자리</h1>
      <p>여덟글자는 태어난 해·달·날·시의 여덟 글자로 오늘을 읽는 서비스예요. 좋고 나쁨을 매기기보다 그날이 어떤 성질의 하루인지 설명하고, 오늘 해 볼 만한 일 하나로 끝맺어요.</p>
    </header>

    <h2>매일 열어 보는 것</h2>
    <p><b>오늘의 색</b>은 그날의 일진에서 계산한 오행의 색과 문장이에요. 아침마다 바뀌어요. 여기에 오늘 마음의 날씨를 한 번 눌러 남기면, 한 달 뒤에는 감정 달력과 월말 편지로 돌아와요. 기록이 쌓일수록 ‘나는 어떤 날에 어떤 마음이었는지’가 보이기 시작해요.</p>

    <h2>깊이 읽고 싶은 날에</h2>
    <ul>
      <li><a href="/saju">내 사주</a> — 네 기둥 여덟 글자와 오행의 자리, 오늘 나에게 들어오는 결</li>
      <li><a href="/gunghap">궁합</a> — 점수 대신 두 사람의 날씨. 상대 생일을 몰라도 링크로 초대할 수 있어요</li>
      <li><a href="/time">시간</a> — 올해의 지도, 이달의 결, 대운의 강, 절기마다 오는 편지</li>
      <li><a href="/report">리포트</a> — 더 길게 읽는 리포트. 첫 부분은 언제나 결제 전에 열려 있어요</li>
    </ul>

    <h2>천천히 읽을거리</h2>
    <p><a href="/ilju">일주 예순 편</a>, <a href="/jeolgi">절기 스물네 편</a>, 용어가 낯설 때 펼치는 <a href="/dict">지식 사전</a>, 하루 한 장 <a href="/tarot">타로</a>와 <a href="/juyeok">주역</a>, 여덟 글자 계산기 <a href="/calendar">만세력</a>이 있어요. 모두 무료이고 로그인이 필요 없어요.</p>

    <h2>여덟글자가 하지 않는 것</h2>
    <ul>
      <li>점수, 등급, 퍼센트로 사람이나 관계를 매기지 않아요.</li>
      <li>액운, 흉일 같은 말로 겁주지 않아요. ‘조심하세요’로 끝나는 문장도 쓰지 않아요.</li>
      <li>광고를 싣지 않아요. 읽는 자리에 파는 말이 끼어들지 않게요.</li>
      <li>아무것도 드리기 전에 결제를 청하지 않아요. 유료 리포트도 첫 부분은 먼저 열어 드려요.</li>
      <li>기록을 가져가지 않아요. 생년월일과 일기는 쓰시는 기기에만 남아요.</li>
    </ul>

    <h2>계산 방식</h2>
    <table>
      <tr><th>연주</th><td>입춘(태양 황경 315°)을 한 해의 시작으로 봐요.</td></tr>
      <tr><th>월주</th><td>열두 절(節)을 경계로 나누고, 월간은 오호둔으로 붙여요.</td></tr>
      <tr><th>일주</th><td>율리우스 적일(JDN)로 계산해요. (JDN + 49) mod 60.</td></tr>
      <tr><th>시주</th><td>오자둔을 따르고, 밤 11시부터를 다음 날로 보는 조자시 기준이에요.</td></tr>
      <tr><th>서머타임</th><td>1948–51, 1955–60, 1987–88년 시행 구간에 태어났다면 한 시간을 되돌려 계산하고 화면에 알려 드려요.</td></tr>
      <tr><th>절기</th><td>표를 베끼지 않고 태양 황경을 직접 계산해요. 연도 제한이 없어요.</td></tr>
    </table>

    <h2 id="faq">자주 묻는 것</h2>
    <div class="faq">
${FAQ.map(([qq, a]) => `      <details><summary>${qq}</summary><p>${a}</p></details>`).join('\n')}
    </div>

    <div class="box" style="margin-top:30px;"><p>더 궁금한 점은 <a href="/contact" style="color:var(--brand-deep);font-weight:700;">문의하기</a>로 남겨 주세요. 새 소식은 <a href="/notice" style="color:var(--brand-deep);font-weight:700;">공지사항</a>에 올려요.</p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px;">
      <a class="btn btn-primary" href="/saju">내 여덟 글자 만들기 · 무료</a>
      <a class="btn btn-soft" href="/">오늘의 색 보기</a>
    </div>
  </article>
` + foot(BOOT));

/* ═══════════ 공지사항 ═══════════ */
writeFileSync('../notice.html', head({
  title: '공지사항', path: '/notice',
  desc: '여덟글자의 새 소식과 안내. 새 기능, 리포트 오픈, 점검 소식을 이곳에 올려요.',
}) + `  <section class="doc">
    <header class="doc-head">
      <p class="kicker">공지사항</p>
      <h1>여덟글자의 새 소식</h1>
      <p>새 기능, 리포트가 열리는 날, 점검 안내를 여기에 올려요.</p>
    </header>
    <div class="notice-list" id="list" aria-live="polite">
      <p class="sec-note" style="padding:22px 4px;">공지를 불러오는 중이에요.</p>
    </div>
  </section>
` + foot(`import { boot } from '/assets/js/app.js${q}';
boot(null);
const box = document.getElementById('list');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const safe = v => /^(\\/|https:\\/\\/)/.test(String(v || '')) ? String(v) : '';
fetch('/api/config').then(r => r.ok ? r.json() : null).catch(() => null).then(cfg => {
  const list = cfg && cfg.notices || [];
  if (!list.length) { box.innerHTML = '<p class="sec-note" style="padding:22px 4px;">아직 올라온 공지가 없어요. 새 소식이 생기면 이 자리에 먼저 알려 드릴게요.</p>'; return; }
  const want = Number(location.hash.slice(1));
  box.innerHTML = list.map((n, i) => \`<details class="notice-item" id="\${n.id}" \${(want ? want === n.id : i === 0) ? 'open' : ''}>
    <summary>\${n.pinned ? '<span class="pin">고정</span>' : ''}<b>\${esc(n.title)}</b><span class="d">\${esc((n.date || '').replace(/-/g, '.'))}</span></summary>
    <div class="nbody"></div>
    \${safe(n.link) ? \`<p style="padding:0 4px 20px;margin:0;"><a class="btn btn-soft btn-sm" href="\${esc(safe(n.link))}">\${esc(n.label || '자세히 보기')} →</a></p>\` : ''}
  </details>\`).join('');
  list.forEach(n => { const el = document.getElementById(String(n.id)); if (el) el.querySelector('.nbody').textContent = n.body || ''; });
});`));

/* ═══════════ 문의하기 ═══════════ */
writeFileSync('../contact.html', head({
  title: '문의하기', path: '/contact',
  desc: '여덟글자에 궁금한 점, 오류, 제안을 남겨 주세요. 답장이 필요하면 이메일을 함께 적어 주세요.',
}) + `  <section class="doc" style="max-width:640px;">
    <header class="doc-head">
      <p class="kicker">문의하기</p>
      <h1>무엇이든 편하게 남겨 주세요</h1>
      <p>이용하다 막힌 곳, 이상하게 보이는 화면, 이런 게 있으면 좋겠다는 생각까지 모두 읽어요.
        <span data-cfg-show="cs.hours" hidden>응대 시간은 ${cfg('cs.hours', '')}이고, </span>보통 <span data-cfg="cs.reply_days" data-empty="2">2</span>영업일 안에 답장드려요.</p>
    </header>

    <form class="panel form-card" id="f" novalidate>
      <div class="f-row"><span class="lab" id="catLab">어떤 이야기인가요</span>
        <div class="chips" role="group" aria-labelledby="catLab">
          <button type="button" data-c="use" aria-pressed="true">이용 문의</button>
          <button type="button" data-c="bug" aria-pressed="false">오류 제보</button>
          <button type="button" data-c="pay" aria-pressed="false">결제·환불</button>
          <button type="button" data-c="partner" aria-pressed="false">제휴·제안</button>
          <button type="button" data-c="etc" aria-pressed="false">기타</button>
        </div></div>
      <div class="f-row"><label class="lab" for="msg">내용</label>
        <textarea class="in" id="msg" maxlength="3000" required placeholder="오류라면 어떤 화면에서 무엇을 눌렀을 때인지 적어 주시면 빨리 찾을 수 있어요."></textarea>
        <span class="f-hint">생년월일이나 일기 내용은 적지 않으셔도 돼요. 꼭 필요할 때만 저희가 따로 여쭤볼게요.</span></div>
      <div class="f-row"><label class="lab" for="em">답장 받을 이메일 <span style="font-weight:400;color:var(--mute);">(선택)</span></label>
        <input class="in" id="em" type="email" inputmode="email" autocomplete="email" placeholder="비워 두시면 답장 없이 의견으로만 받아요"></div>
      <label class="sheet-agree" id="agreeRow" hidden><input type="checkbox" id="agree"> <span><b>(필수)</b> 답장을 위한 개인정보 수집·이용에 동의해요</span></label>
      <p class="sheet-fine" id="agreeFine" hidden>수집 항목: 이메일, 문의 내용 · 목적: 문의 확인과 답장 · 보유: 처리를 마친 뒤 3년(전자상거래법에 따른 소비자 불만·분쟁처리 기록). 동의하지 않으시면 이메일 칸을 비우고 보내 주세요. <a href="/privacy">개인정보처리방침</a></p>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="f-err" id="err" role="alert"></p>
      <button class="btn btn-primary" style="width:100%;">보내기</button>
    </form>
    <div class="panel done-card" id="done" hidden>
      <div class="seal-ok" aria-hidden="true">受</div>
      <h2 class="serif" style="font-size:20px;margin:0 0 8px;">잘 받았어요</h2>
      <p class="sec-note" id="doneTx" style="margin:0 0 18px;">남겨 주신 이야기를 읽고 답장드릴게요.</p>
      <a class="btn btn-soft btn-sm" href="/">오늘의 색으로 돌아가기</a>
    </div>

    <p class="sec-note" style="margin-top:22px;" data-cfg-show="cs.email" hidden>메일로 바로 보내셔도 돼요 — ${cfg('cs.email', '')}</p>
    <p class="sec-note">자주 묻는 것은 <a href="/about#faq" style="color:var(--brand-deep);">서비스 소개</a>에 모아 두었어요. 내 정보의 열람·삭제를 원하시면 ‘기타’로 남겨 주세요.</p>
  </section>
` + foot(`import { boot } from '/assets/js/app.js${q}';
boot(null);
const t0 = Date.now();
let cat = new URLSearchParams(location.search).get('c') || 'use';
const chips = [...document.querySelectorAll('.chips button')];
const paint = () => chips.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === cat)));
chips.forEach(b => b.onclick = () => { cat = b.dataset.c; paint(); });
paint();
const em = document.getElementById('em');
em.addEventListener('input', () => { const on = !!em.value.trim(); document.getElementById('agreeRow').hidden = !on; document.getElementById('agreeFine').hidden = !on; });
const f = document.getElementById('f');
f.onsubmit = async e => {
  e.preventDefault();
  const err = document.getElementById('err'); err.textContent = '';
  const message = document.getElementById('msg').value.trim();
  const email = em.value.trim();
  if (message.length < 5) { err.textContent = '내용을 조금 더 적어 주세요.'; return; }
  if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) { err.textContent = '이메일 주소를 다시 확인해 주세요.'; return; }
  if (email && !document.getElementById('agree').checked) { err.textContent = '답장을 받으시려면 동의가 필요해요. 이메일 없이 보내셔도 괜찮아요.'; return; }
  const btn = f.querySelector('button.btn-primary'); btn.disabled = true;
  try {
    const r = await fetch('/api/inquiry', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category: cat, message, email, consent: !!email, page: document.referrer ? new URL(document.referrer).pathname : '', hp: f.website.value, t0 }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || '지금은 보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
    f.hidden = true; document.getElementById('done').hidden = false;
    document.getElementById('doneTx').textContent = email
      ? \`남겨 주신 이메일로 \${j.replyDays || 2}영업일 안에 답장드릴게요.\`
      : '이메일이 없어서 답장은 드리지 못하지만, 남겨 주신 이야기는 꼭 읽고 반영할게요.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (x) { err.textContent = x.message; btn.disabled = false; }
};`));

/* ═══════════ 이용약관 ═══════════ */
writeFileSync('../terms.html', head({
  title: '이용약관', path: '/terms',
  desc: '여덟글자 서비스 이용약관. 무료 서비스의 범위, 해석의 성격, 유료 리포트의 결제와 청약철회, 기록 보관에 관한 약속을 담았어요.',
}) + `  <article class="doc">
    <header class="doc-head">
      <p class="kicker">이용약관</p>
      <h1>여덟글자 이용약관</h1>
      <p>시행일 <span data-cfg="legal.effective" data-empty="2026-11-17">2026-11-17</span> · 여덟글자를 쓰실 때 서로 지킬 약속이에요. 어려운 말은 되도록 풀어서 적었어요.</p>
    </header>

    <h2>제1조 (목적)</h2>
    <p>이 약관은 ${cfg('biz.name', '여덟글자 운영자')}(이하 ‘운영자’)가 yeodeol.kr에서 제공하는 여덟글자 서비스(이하 ‘서비스’)를 이용하는 조건과 절차, 운영자와 이용자의 권리·의무를 정하는 것을 목적으로 해요.</p>

    <h2>제2조 (운영자 정보)</h2>
    <table>
      <tr><th>상호</th><td>${cfg('biz.name', '운영 정보 등록 중')}</td><th>대표자</th><td>${cfg('biz.ceo', '—')}</td></tr>
      <tr><th>사업자등록번호</th><td>${cfg('biz.regno', '—')}</td><th>통신판매업 신고</th><td>${cfg('biz.mailorder', '유료 판매 시작 전 등록')}</td></tr>
      <tr><th>주소</th><td colspan="3">${cfg('biz.address', '—')}</td></tr>
      <tr><th>전화</th><td>${cfg('biz.phone', '—')}</td><th>이메일</th><td>${cfg('cs.email', '문의하기 화면 이용')}</td></tr>
    </table>

    <h2>제3조 (서비스의 내용)</h2>
    <ol>
      <li>운영자는 생년월일과 태어난 시간으로 사주의 여덟 글자를 계산하고, 그 결과를 해석한 글과 그림을 제공해요.</li>
      <li>무료 서비스: 오늘의 색, 내 사주, 궁합의 일부, 감정 기록과 세 줄 일기, 만세력, 일주·절기 글, 타로, 주역, 지식 사전 등.</li>
      <li>유료 서비스: 더 깊이 읽는 리포트와 구독(이하 ‘유료 리포트’). 상품마다 내용, 가격, 결제 방법, 제공 방식을 결제 전 화면에 따로 알려 드려요.</li>
      <li>운영자는 서비스를 더 낫게 만들기 위해 내용을 바꾸거나 더할 수 있어요. 이용자에게 불리하게 바뀌는 경우에는 제11조에 따라 미리 알려 드려요.</li>
    </ol>

    <h2>제4조 (가입 없이 쓰는 방식과 기록의 보관)</h2>
    <ol>
      <li>서비스는 회원가입 없이 이용할 수 있어요.</li>
      <li>입력하신 생년월일, 성별, 감정 기록, 일기, 궁합 상대 정보는 이용자 기기의 브라우저 저장소에만 저장되고 운영자에게 전송되지 않아요.</li>
      <li>그래서 브라우저 데이터를 지우거나 기기를 바꾸면 기록이 사라질 수 있어요. ‘내 기록 백업’으로 파일을 만들어 두시길 권해요. 운영자는 서버에 없는 기록을 되살려 드릴 수 없어요.</li>
    </ol>

    <h2>제5조 (해석의 성격)</h2>
    <ol>
      <li>서비스의 해석은 명리학의 전통적인 해석 틀을 바탕으로 한 참고 자료예요. 미래를 단정하거나 보장하지 않아요.</li>
      <li>건강, 법률, 투자, 진로 등 중요한 결정은 해당 분야의 전문가와 상의해 주세요. 해석만을 근거로 한 결정의 결과에 대해서는 운영자가 책임지기 어려워요.</li>
    </ol>

    <h2>제6조 (이용자가 지켜 주실 것)</h2>
    <ul>
      <li>다른 사람의 개인정보를 그 사람의 동의 없이 입력하거나 공유 링크로 퍼뜨리지 않기</li>
      <li>서비스의 글과 그림을 허락 없이 상업적으로 복제·배포하지 않기</li>
      <li>자동화된 방법으로 서비스에 과도한 부하를 주거나, 보안을 우회하려 하지 않기</li>
      <li>문의하기 등에 다른 사람을 비방하거나 법령에 어긋나는 내용을 보내지 않기</li>
    </ul>

    <h2>제7조 (유료 리포트의 결제)</h2>
    <ol>
      <li>유료 리포트의 가격과 결제 방법은 상품 화면에 적힌 대로예요. 결제는 운영자가 안내하는 결제 화면(결제대행사 또는 판매 채널)에서 이뤄져요.</li>
      <li>결제를 준비하는 동안에는 ‘열리면 알려 주세요’로 출시 알림만 받아요. 알림 신청은 결제나 구매 약속이 아니에요.</li>
    </ol>

    <h2 id="t8">제8조 (청약철회와 환불)</h2>
    <ol>
      <li>결제 후 리포트 내용을 아직 열람하지 않으셨다면, 결제일로부터 7일 안에 청약을 철회하고 전액 환불받으실 수 있어요.</li>
      <li>리포트는 열람과 동시에 제공이 끝나는 디지털 콘텐츠라서, 내용을 열람하신 뒤에는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따라 청약철회가 제한될 수 있어요. 운영자는 이 점을 결제 전에 알리고, 결제 전에 리포트의 첫 부분을 무료로 열어 드려요.</li>
      <li>리포트 내용이 안내와 다르거나 제대로 열리지 않는 등 운영자의 잘못이 있으면, 열람 여부와 상관없이 그 사실을 안 날부터 30일, 결제일부터 3개월 안에 환불을 요청하실 수 있어요.</li>
      <li>구독은 언제든 해지할 수 있고, 해지하면 다음 결제일부터 요금이 청구되지 않아요. 이미 받은 달의 리포트는 계속 보실 수 있어요.</li>
      <li>환불은 요청을 확인한 날부터 3영업일 안에 결제한 수단으로 돌려 드려요. 결제대행사 사정으로 늦어지면 그 사유를 알려 드려요.</li>
    </ol>

    <h2>제9조 (저작권)</h2>
    <p>서비스의 해석 글, 그림, 화면 구성의 저작권은 운영자에게 있어요. 카드 저장과 링크 공유처럼 서비스가 제공하는 방식으로 개인적으로 나누는 것은 얼마든지 괜찮아요.</p>

    <h2>제10조 (서비스의 중단)</h2>
    <p>설비 점검, 교체, 장애, 천재지변 등 부득이한 사정이 있으면 서비스를 잠시 멈출 수 있어요. 미리 알 수 있는 경우에는 공지사항으로 먼저 알려 드려요. 서비스를 완전히 종료할 때는 30일 전에 알리고, 유료 리포트의 남은 이용 기간은 환불해 드려요.</p>

    <h2>제11조 (약관의 변경)</h2>
    <p>약관을 바꿀 때는 바뀌는 내용과 시행일을 적어 시행 7일 전부터 공지사항에 알려 드려요. 이용자에게 불리한 변경이라면 30일 전부터 알려 드려요.</p>

    <h2>제12조 (분쟁의 해결)</h2>
    <ol>
      <li>서비스 이용에 불편이 있으면 <a href="/contact">문의하기</a>로 먼저 알려 주세요. 영업일 기준 ${cfg('cs.reply_days', '2')}일 안에 답장드려요.</li>
      <li>원만히 해결되지 않으면 한국소비자원(1372) 또는 전자거래분쟁조정위원회에 조정을 신청하실 수 있어요.</li>
      <li>소송이 필요한 경우 관할 법원은 「민사소송법」에 따라 정해요.</li>
    </ol>

    <p class="muted" style="margin-top:30px;">부칙 — 이 약관은 <span data-cfg="legal.effective" data-empty="2026-11-17">2026-11-17</span>부터 시행해요.</p>
  </article>
` + foot(BOOT));

/* ═══════════ 개인정보처리방침 ═══════════ */
writeFileSync('../privacy.html', head({
  title: '개인정보처리방침', path: '/privacy',
  desc: '여덟글자는 생년월일과 기록을 서버로 보내지 않아요. 서버에 남는 것과 남지 않는 것, 보관 기간, 권리 행사 방법을 적었어요.',
}) + `  <article class="doc">
    <header class="doc-head">
      <p class="kicker">개인정보처리방침</p>
      <h1>여덟글자 개인정보처리방침</h1>
      <p>시행일 <span data-cfg="legal.effective" data-empty="2026-11-17">2026-11-17</span> · ${cfg('biz.name', '여덟글자 운영자')}(이하 ‘운영자’)는 「개인정보 보호법」에 따라 이용자의 개인정보를 이렇게 다뤄요.</p>
    </header>

    <div class="box"><p><b>한 줄 요약</b> — 생년월일, 감정 기록, 일기는 이용자 기기에만 저장되고 운영자 서버로 오지 않아요. 서버에는 익명 방문 숫자와, 이용자가 직접 보낸 문의·출시 알림 신청만 남아요. 광고와 행태 추적은 하지 않아요.</p></div>

    <p class="toc">
      <a href="#p1">1. 처리 목적과 항목</a><a href="#p2">2. 기기에만 저장되는 정보</a><a href="#p3">3. 보유 기간과 파기</a>
      <a href="#p4">4. 제3자 제공</a><a href="#p5">5. 처리 위탁과 국외 이전</a><a href="#p6">6. 자동 수집</a>
      <a href="#p7">7. 이용자의 권리</a><a href="#p8">8. 안전성 확보 조치</a><a href="#p9">9. 보호책임자</a><a href="#p10">10. 권익침해 구제</a>
    </p>

    <h2 id="p1">1. 처리하는 개인정보와 목적</h2>
    <div class="table-scroll"><table>
      <tr><th>무엇을 할 때</th><th>항목</th><th>목적</th><th>근거</th></tr>
      <tr><td>문의하기</td><td>(필수) 문의 분류, 내용, 문의를 보낸 화면 주소<br>(선택) 답장 받을 이메일</td><td>문의 확인과 답장, 오류 수정</td><td>이메일은 동의(제15조 제1항 제1호), 그 밖에는 이용자 요청 처리</td></tr>
      <tr><td>출시 알림 신청</td><td>(필수) 이메일, 신청한 상품</td><td>유료 리포트가 열릴 때 1회 알림 발송</td><td>동의(제15조 제1항 제1호)</td></tr>
      <tr><td>유료 리포트 결제 (판매를 시작한 뒤)</td><td>결제 화면에서 안내하는 항목</td><td>결제, 제공, 환불</td><td>계약 이행 · 상품 화면에서 따로 안내</td></tr>
    </table></div>
    <p>회원가입이 없기 때문에 이름, 전화번호, 주민등록번호 같은 정보는 받지 않아요. 민감정보와 고유식별정보도 처리하지 않아요.</p>

    <h2 id="p2">2. 기기에만 저장되고 서버로 오지 않는 정보</h2>
    <p>생년월일, 태어난 시간, 성별, 감정 날씨 기록, 세 줄 일기, 지도 위 계획 메모, 궁합 상대의 별칭과 생일은 이용자 기기의 브라우저 저장소(localStorage)에서만 처리돼요. 사주 계산도 기기 안에서 해요. 운영자는 이 정보를 볼 수도, 되살릴 수도 없어요.</p>
    <ul>
      <li>지우는 법: 브라우저 설정에서 yeodeol.kr의 사이트 데이터를 삭제하면 모두 지워져요. 기록 화면에서 하나씩 지울 수도 있어요.</li>
      <li>공유 링크: ‘링크로 공유’를 누르면 카드에 필요한 값(일진, 별칭 등)이 링크 주소 안에 담겨요. 서버에 저장되지 않고, 링크를 받은 사람만 볼 수 있어요. 다른 사람의 정보는 그 사람이 괜찮다고 할 때만 공유해 주세요.</li>
      <li>이용자가 입력한 정보를 인공지능 모델 학습에 쓰지 않아요.</li>
    </ul>

    <h2 id="p3">3. 보유 기간과 파기</h2>
    <div class="table-scroll"><table>
      <tr><th>정보</th><th>보유 기간</th></tr>
      <tr><td>출시 알림 이메일</td><td>알림을 보낸 뒤 30일, 늦어도 신청일로부터 1년</td></tr>
      <tr><td>문의 내용과 이메일</td><td>처리를 마친 뒤 3년 — 「전자상거래 등에서의 소비자보호에 관한 법률」 시행령에 따른 소비자의 불만 또는 분쟁처리 기록</td></tr>
      <tr><td>유료 리포트 결제 기록 (판매 시작 후)</td><td>계약·청약철회·대금결제 기록 5년 (같은 법률)</td></tr>
    </table></div>
    <p>기간이 지난 정보는 자동으로 지워지고, 데이터베이스에서 복구할 수 없는 방법으로 삭제해요. 이용자가 삭제를 요청하면 법령상 보관 의무가 있는 경우를 빼고 바로 지워요.</p>

    <h2 id="p4">4. 제3자 제공</h2>
    <p>이용자의 개인정보를 다른 곳에 제공하지 않아요. 법령에 특별한 규정이 있거나 수사기관이 법에 정한 절차에 따라 요구하는 경우만 예외예요.</p>

    <h2 id="p5">5. 처리 위탁과 국외 이전</h2>
    <div class="table-scroll"><table>
      <tr><th>받는 곳</th><th>맡기는 일</th><th>이전 국가 · 방법</th><th>항목 · 기간</th></tr>
      <tr><td>Cloudflare, Inc.<br><span class="muted">privacyquestions@cloudflare.com</span></td><td>웹사이트 호스팅, 데이터베이스 보관</td><td>미국 등 Cloudflare 데이터센터가 있는 국가 · 문의나 알림 신청을 보낼 때 암호화된 통신으로 전송</td><td>1번 표의 항목 · 3번 표의 기간과 같음</td></tr>
    </table></div>
    <p>국외 이전을 원하지 않으시면 문의하기와 출시 알림 신청을 쓰지 않으시면 돼요. 이 경우에도 다른 무료 서비스는 그대로 이용하실 수 있어요. 출시 알림과 답장 메일은 운영자의 업무용 이메일로 보내요.</p>

    <h2 id="p6">6. 자동으로 수집되는 것</h2>
    <ul>
      <li><b>쿠키를 쓰지 않아요.</b> 광고, 행태 추적, 외부 분석 도구도 없어요.</li>
      <li><b>익명 방문 숫자</b> — 어떤 화면이 열렸는지, 그 기기가 오늘 처음 왔는지, 어디서 들어왔는지(검색엔진 이름 수준), 기기 종류(모바일·데스크톱)를 날짜별 합계로만 저장해요. 방문자를 구별할 수 있는 번호나 IP 주소는 남기지 않아요. 브라우저의 추적 거부(GPC, Do Not Track)를 켜 두면 이 숫자도 보내지 않아요.</li>
      <li><b>부정 이용 방지</b> — 문의와 알림 신청이 한꺼번에 몰리는 것을 막기 위해 접속 IP를 되돌릴 수 없게 변환한 값을 최대 1시간 동안 사용하고 지워요. IP 원래 값은 저장하지 않아요.</li>
      <li><b>글꼴</b> — 화면 글꼴을 Google Fonts에서 받아 와요. 이 과정에서 브라우저의 접속 정보가 Google에 전달될 수 있어요.</li>
    </ul>

    <h2 id="p7">7. 이용자의 권리와 행사 방법</h2>
    <p>이용자는 언제든 자신의 개인정보 열람, 정정, 삭제, 처리정지를 요구하고 동의를 철회할 수 있어요. <a href="/contact">문의하기</a>나 아래 보호책임자 연락처로 알려 주시면 10일 안에 처리하고 결과를 알려 드려요. 대리인을 통해서도 요구하실 수 있어요. 만 14세 미만 아동은 문의 이메일과 출시 알림 신청을 할 수 없어요.</p>

    <h2 id="p8">8. 안전성 확보 조치</h2>
    <ul>
      <li>관리자 화면 접근은 역할별로 나눈 최소한의 권한으로만 허용해요.</li>
      <li>관리자 화면에서 이메일은 기본적으로 가려서 보이고, 열람·내려받기 기록이 남아요. 관리자 접속 기록은 2년 보관해요.</li>
      <li>관리자 비밀번호는 복원할 수 없는 방식(PBKDF2)으로 저장하고, 모든 통신은 HTTPS로 암호화해요.</li>
    </ul>

    <h2 id="p9">9. 개인정보 보호책임자</h2>
    <table>
      <tr><th>보호책임자</th><td>${cfg('privacy.officer', '운영 정보 등록 중')}</td></tr>
      <tr><th>연락처</th><td>${cfg('privacy.contact', '문의하기 화면을 이용해 주세요')}</td></tr>
      <tr><th>고충 처리</th><td><a href="/contact">문의하기</a> · ${cfg('cs.email', '')}</td></tr>
    </table>

    <h2 id="p10">10. 권익침해 구제 방법</h2>
    <p>개인정보 침해로 상담이나 구제가 필요하시면 아래 기관에 문의하실 수 있어요.</p>
    <ul>
      <li>개인정보침해신고센터 — 국번 없이 118 · privacy.kisa.or.kr</li>
      <li>개인정보분쟁조정위원회 — 1833-6972 · www.kopico.go.kr</li>
      <li>대검찰청 — 국번 없이 1301 · www.spo.go.kr</li>
      <li>경찰청 — 국번 없이 182 · ecrm.police.go.kr</li>
    </ul>

    <h2>11. 방침의 변경</h2>
    <p>이 방침을 바꿀 때는 시행 7일 전부터 공지사항에 알려 드려요. 수집 항목이나 이용 목적이 바뀌는 등 중요한 변경은 30일 전부터 알려 드려요.</p>
    <p class="muted" style="margin-top:30px;">이 방침은 <span data-cfg="legal.effective" data-empty="2026-11-17">2026-11-17</span>부터 시행해요.</p>
  </article>
` + foot(BOOT));

console.log('문서 화면 5개 생성: about · notice · contact · terms · privacy');
