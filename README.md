# 여덟글자 (八字) — 오픈판

점수도 등급도 없이, 오늘의 색과 감정으로 읽는 사주.
이 저장소가 곧 배포본입니다. 빌드 과정이 없습니다.

- 서비스: https://yeodeol.kr  (구주소 eightletters-web.pages.dev 는 301로 넘어옴)
- 관리자: https://yeodeol.kr/admin
- 화면 105개 · 정적 파일 + Cloudflare Pages Functions(/api) + D1(yeodeol-db)
- 생년월일·감정 기록·일기는 방문자 기기에만 저장. 서버에는 익명 방문 숫자와, 방문자가 직접 보낸 문의·출시 알림 신청만 남음

---

## 0. 오픈판에서 달라진 것 (2026-11-17)

| 구분 | 내용 |
|---|---|
| 관리자 | `/admin` — 대시보드(오늘의 여덟 칸), 방문·사용 통계, 문의함, 출시 알림 신청자, 상품·가격, 공지·배너, 사업자·사이트 설정, 계정·권한(최고관리자/운영/조회), 활동 기록, 데이터·시스템 |
| 서버 | `functions/api/[[route]].js` 하나가 `/api/*`를 받음. 표는 첫 요청 때 스스로 만듦(SQL 붙여 넣기 불필요) |
| 결제 예고 | ‘11월에 열어요’ 문구 전부 정리. 상품 상태(준비 중/판매 중/잠시 멈춤/숨김)와 가격을 관리자에서 바꾸면 사이트 버튼이 따라감. 준비 중이면 이메일 출시 알림 신청, 판매 중이면 결제 링크로 이동 |
| 법적 고지 | `/terms` 이용약관, `/privacy` 개인정보처리방침, 푸터 사업자 정보(전자상거래법 제10조) — 값은 관리자 설정에서 |
| 새 화면 | `/about` 서비스 소개+FAQ, `/notice` 공지사항, `/contact` 문의하기 |
| 검색 | 네이버 소유확인 메타(홈), `rss.xml`(일주·절기 84편), sitemap 103 URL + lastmod, robots에서 /admin·/api 차단 |
| 신년 시즌 | 시간 화면에서 10월 15일~입춘 전에는 ‘다가오는 해’ 지도를 미리 펼쳐 볼 수 있음 |
| 고친 것 | 푸터 ‘전체 백업’ 버튼 연결 끊김, 신년 묶음 구성·합계 불일치(29,500원), 홈에서 안 쓰는 이미지 4장 선로딩, 정적 파일까지 함수를 거치던 것(_routes.json), 서버 코드·도구 파일이 주소로 열리던 것 |

## 1. 배포하는 법 (GitHub → Cloudflare Pages)

### 기존 저장소를 그대로 쓰는 경우 (권장)

```bash
git clone https://github.com/naadaa87/eightletters-web.git
cd eightletters-web
git rm -r .                # 옛 파일 전부 제거
# 이 압축의 내용물을 폴더에 풀어 넣고
git add -A
git commit -m "v4: 화면 복구 + 일주60/절기24 + 인프라 전체"
git push
```

Pages가 GitHub에 연결되어 있으면 push만으로 배포가 끝납니다.

### 새 저장소로 시작하는 경우

1. GitHub에 새 저장소 생성 → 이 압축의 내용물을 그대로 push
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → 저장소 연결
3. 설정은 아래 표 그대로. **빌드 명령을 비워 두는 것**이 핵심입니다.

| 항목 | 값 |
|---|---|
| Framework preset | None |
| Build command | (비움) |
| Build output directory | `/` |

### 배포 직후 확인 3가지

1. `https://<프리뷰주소>/ilju/gapja` 가 열리는지 — 클린 URL 확인
2. 없는 주소(예: `/abc`)에서 **404 화면**이 뜨는지 — 홈이 뜨면 안 됩니다
3. 카카오톡에 링크를 붙여 미리보기 이미지가 뜨는지

### 반드시 지킬 것

- **`_redirects` 파일에 `.html` 재작성 규칙을 절대 넣지 마세요.**
  Pages는 `/saju.html → /saju` 자동 리다이렉트를 하므로, 반대 방향 규칙을 넣으면
  무한 리다이렉트가 됩니다. 이 버그는 로컬 `python http.server` 에서는 보이지 않습니다.
- 도메인이 또 바뀌면 전체 치환 후 정적 페이지를 재생성하세요.
  ```bash
  grep -rl "yeodeol.kr" . --include="*.html" --include="*.xml" --include="*.txt" \
    --include="*.mjs" --include="*.js" | xargs sed -i 's/yeodeol\.kr/새주소/g'
  cd tools && node gen.mjs
  ```
  `functions/_middleware.js` 의 `PRIMARY` 값도 함께 바꿔야 합니다.

### Cloudflare 설정 (이미 해 둠)

| 항목 | 값 |
|---|---|
| D1 데이터베이스 | `yeodeol-db` |
| Pages > 설정 > 바인딩 | D1 · 변수 이름 `DB` → `yeodeol-db` (Production) |
| 환경변수 | 필요 없음. `ADMIN_SETUP_KEY`를 넣으면 첫 계정 설정 키로 그 값이 우선함 |

바인딩을 바꾼 뒤에는 **다시 배포**해야 적용됩니다(배포 목록 > 최신 배포 > Retry deployment, 또는 아무 커밋이나 푸시).

### 관리자 첫 계정

1. `https://yeodeol.kr/admin` 접속 → ‘처음 한 번만 — 최고관리자 만들기’
2. 전달받은 일회용 설정 키 + 아이디 + 이름 + 비밀번호
3. 만들고 나면 설정 화면은 다시 열리지 않음. 이후 계정은 ‘계정·권한’에서 추가(임시 비밀번호 → 첫 로그인 때 변경)

### 정적 파일 버전 꼬리표

JS·CSS는 하루 캐시됩니다. 화면 코드를 고쳐 배포할 때는 꼭 꼬리표를 갱신하세요.

```bash
node tools/stamp.mjs        # 모든 /assets/js·css 주소에 ?v=새버전
```

### 방문 통계

관리자 > 방문·사용 통계에서 봅니다. 날짜별 숫자의 합만 저장하고, 쿠키·IP·기기 번호는 남기지 않습니다.
브라우저의 추적 거부(GPC/DNT)를 켠 방문은 세지 않습니다. Cloudflare Web Analytics를 함께 켜도 충돌하지 않습니다.

---

## 2. 무엇이 들어 있나 — 화면 105개

| 구역 | 화면 |
|---|---|
| 매일 | `/` 오늘의 색 · `/record` 기록 · `/saju` 내 사주 |
| 상품 | `/gunghap` 궁합 · `/time` 시간 · `/report` 리포트 진열대 · `/charm` 부적과 배치 |
| 도구 | `/calendar` 만세력 |
| 읽을거리 | `/tarot` 타로 · `/juyeok` 주역 64괘 · `/type` 40유형 · `/dict` 지식 사전 45항목 |
| 정적 유입 | `/ilju` + 일주 60페이지 · `/jeolgi` + 절기 24페이지 |
| 안내 | `/about` 소개·FAQ · `/notice` 공지 · `/contact` 문의 · `/terms` 약관 · `/privacy` 방침 |
| 시스템 | `/share` 공유 뷰어(noindex) · `404.html` · `/admin` 관리자(noindex) |

인프라: `robots.txt` · `sitemap.xml`(98 URL) · `manifest.json`(PWA) · `_headers`(캐시·보안) ·
파비콘/아이콘 5종 · OG 이미지 9종.

## 3. 종합진단 68건 반영 현황

| 심각도 | 결과 |
|---|---|
| A급 12건 | **12건 해소** — 화면 7개 복구·신설, 죽은 링크 0, 404/robots/sitemap/OG/manifest, 40유형 실데이터화, 계측 안내 |
| B급 23건 | **21건 해소** — 첫 방문 맛보기, og:url/twitter/JSON-LD, 일주60·절기24, 서머타임 보정, 백업/가져오기, 삭제 확인, 키 통일(el.*, 자동 이전), 지도 3~5장, 2층 무료 개방 등. *잔여 2건은 서버 필요: 실결제 연동(B-20/23은 예고·관심저장으로 대체 완료, 결제 자체는 11월 서버 오픈 몫)* |
| C급 33건 | **33건 해소** — 대비(--mute 4.0:1), 터치 타깃 전부 36px+, skip link, aria-live, 다크 모드, 인쇄, 접힘 종이감, 인주 도장, tabular-nums, 강 자동 스크롤, 기록 재배치, 빈 상태 등 |

유료 전문(3·4층, 잠긴 달 등)은 **의도적으로 이 저장소에 없습니다**.
클라이언트에 넣는 순간 개발자 도구로 열리기 때문입니다(진단 17-2).
결제 서버가 열릴 때 서버 응답으로만 내려보내세요.

## 4. 폴더 구조

```
/                  화면 21 + 404 + 인프라 파일(_headers · _routes.json · robots · sitemap · rss · manifest)
/admin/            관리자 (index.html · admin.js · admin.css)
/ilju/ /jeolgi/    일주 60 · 절기 24 (정적 생성)
/assets/           css · js(saju 엔진, app 공통, content 문안) · img · icons
/functions/        _middleware.js(301·비공개 파일 차단) · api/[[route]].js · _shared/(db·auth·http·public·admin)
/tools/            gen.mjs(일주·절기·sitemap·rss) · docs.mjs(소개·공지·문의·약관·방침) · stamp.mjs(버전 꼬리표)
serve.py           정적 화면만 볼 때 (python3 serve.py → :8021). API까지 보려면 npx wrangler pages dev . --d1 DB=local
test.mjs · t2.mjs  엔진 검증 (node test.mjs)
```

일주·절기 문안을 고치려면 `assets/js/content3.js` 수정 후:

```bash
cd tools && node gen.mjs && node docs.mjs && cd .. && node tools/stamp.mjs
# 일주·절기 84페이지 + sitemap + rss + 문서 5화면 재생성 → 버전 꼬리표
```

## 5. 계산 방식 (전부 공개)

- 연주: 입춘(태양 황경 315°) · 월주: 12절 오호둔 · 일주: 율리우스 적일 (JDN+49)%60 · 시주: 오자둔 **조자시**
- **서머타임 자동 보정**: 1948–51 · 1955–60 · 1987–88 시행 구간 출생은 시계 시각에서 1시간을 되돌려 계산하고 화면에 알립니다
- 절기는 표가 아니라 태양 황경 직접 계산 — 연도 제한 없음
- 검증: `node test.mjs && node t2.mjs` (지지관계 14쌍 · 기상도 · 대운 역행 · 세운/월건)

## 6. 데이터 원칙

- 생년월일·감정 기록·일기는 `localStorage`의 `el.*` 키에만 저장 (구버전 `yeodeol.*`는 첫 방문 시 자동 이전)
- 회원가입 없음 · 백업은 기록 화면·푸터의 "내 기록 백업"(JSON 파일)으로
- 서버(D1)에 남는 것: 날짜별 익명 숫자(`stats_daily`), 문의(`inquiries`), 출시 알림 이메일(`waitlist`), 운영 설정·상품·공지, 관리자 계정·활동 기록
- 자동 파기: 알림 이메일은 발송 후 30일·신청 후 1년, 문의는 처리 후 3년, 활동 기록 2년 (대시보드를 열 때 정리)

## 6-1. API

| 주소 | 하는 일 |
|---|---|
| `GET /api/config` | 공지·띠 배너·상품 상태·사업자 정보 (엣지 60초 캐시) |
| `POST /api/e` | 익명 방문·기능 사용 숫자 (sendBeacon) |
| `POST /api/inquiry` | 문의 접수 (숨은 칸·속도 제한) |
| `POST /api/notify` | 출시 알림 신청 (동의 필수) |
| `/api/admin/*` | 관리자 — HttpOnly 세션 쿠키, 같은 출처 + `x-admin` 헤더, 역할별 권한, 로그인 15분 잠금 |

## 7. 브랜드 문구 규칙 (수정 시 유지)

점수·등급·퍼센트 없음 / 액운·흉일·"조심하세요" 없음 / 느낌표 없음 /
"결제하고 보기" 대신 "이어서 읽기" / 모든 해석의 끝은 오늘 할 수 있는 한 가지.
