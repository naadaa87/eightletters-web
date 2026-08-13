# 여덟글자 (八字) — v4 배포 완성본

점수도 등급도 없이, 오늘의 색과 감정으로 읽는 사주.
이 저장소가 곧 배포본입니다. 빌드 과정이 없습니다.

- 서비스: https://yeodeol.kr  (구주소 eightletters-web.pages.dev 는 301로 넘어옴)
- 화면 100개 · 코드/문안 전부 정적 파일 · 서버 없음 · 개인 데이터는 브라우저에만 저장

---

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

### 방문 통계 켜기 (1분)

Pages 프로젝트 → **Metrics → Web Analytics → Enable**.
쿠키 없이 방문만 세는 방식이라 "방문 통계 외에는 아무것도 수집하지 않아요" 약속과 충돌하지 않습니다.

---

## 2. 무엇이 들어 있나 — 화면 100개

| 구역 | 화면 |
|---|---|
| 매일 | `/` 오늘의 색 · `/record` 기록 · `/saju` 내 사주 |
| 상품 | `/gunghap` 궁합 · `/time` 시간 · `/report` 리포트 진열대 · `/charm` 부적과 배치 |
| 도구 | `/calendar` 만세력 |
| 읽을거리 | `/tarot` 타로 · `/juyeok` 주역 64괘 · `/type` 40유형 · `/dict` 지식 사전 45항목 |
| 정적 유입 | `/ilju` + 일주 60페이지 · `/jeolgi` + 절기 24페이지 |
| 시스템 | `/share` 공유 뷰어(noindex) · `404.html` |

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
/                  화면 16 + 404 + 인프라 파일
/ilju/             일주 60 (정적 생성)
/jeolgi/           절기 24 (정적 생성)
/assets/css        style.css (다크·인쇄 포함)
/assets/js         saju.js(엔진) · app.js(공통) · content*.js(문안)
/assets/img        수채 19장 + OG 9장
/assets/icons      파비콘 · PWA 아이콘
/tools/gen.mjs     일주·절기·sitemap 재생성기
/functions/        _middleware.js — pages.dev → yeodeol.kr 301 리다이렉트
serve.py           로컬 확인용 (python3 serve.py → :8021, 클린 URL 지원)
test.mjs · t2.mjs  엔진 검증 (node test.mjs)
```

일주·절기 문안을 고치려면 `assets/js/content3.js` 수정 후:

```bash
cd tools && node gen.mjs   # 84페이지 + sitemap 재생성
```

## 5. 계산 방식 (전부 공개)

- 연주: 입춘(태양 황경 315°) · 월주: 12절 오호둔 · 일주: 율리우스 적일 (JDN+49)%60 · 시주: 오자둔 **조자시**
- **서머타임 자동 보정**: 1948–51 · 1955–60 · 1987–88 시행 구간 출생은 시계 시각에서 1시간을 되돌려 계산하고 화면에 알립니다
- 절기는 표가 아니라 태양 황경 직접 계산 — 연도 제한 없음
- 검증: `node test.mjs && node t2.mjs` (지지관계 14쌍 · 기상도 · 대운 역행 · 세운/월건)

## 6. 데이터 원칙

- 모든 개인 데이터는 `localStorage`의 `el.*` 키에만 저장 (구버전 `yeodeol.*`는 첫 방문 시 자동 이전)
- 서버 전송 0 · 회원가입 없음 · 백업은 기록 화면·푸터의 "전체 백업"(JSON 파일)으로
- 결제 버튼은 현재 "11월에 열어요" 예고 + 관심 표시(`el.wish`)만 저장

## 7. 브랜드 문구 규칙 (수정 시 유지)

점수·등급·퍼센트 없음 / 액운·흉일·"조심하세요" 없음 / 느낌표 없음 /
"결제하고 보기" 대신 "이어서 읽기" / 모든 해석의 끝은 오늘 할 수 있는 한 가지.
