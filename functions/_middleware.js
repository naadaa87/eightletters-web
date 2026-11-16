/* 모든 요청 앞에서 두 가지를 합니다.

   1) pages.dev 와 www 로 들어온 방문을 yeodeol.kr 로 넘깁니다.
      같은 사이트가 두 주소로 색인되면 검색 순위가 갈리기 때문입니다.
      - 운영 주소(eightletters-web.pages.dev)만 넘깁니다.
      - 미리보기 배포(abc123.eightletters-web.pages.dev)는 그대로 둡니다. 테스트해야 하니까요.
      - 경로와 쿼리는 유지합니다. 공유 링크의 #뒤 값은 브라우저가 알아서 옮겨 줍니다.

   2) 저장소에만 있어야 할 파일(서버 코드, 도구, 설명서)이 주소로 열리지 않게 막습니다.
      빌드 출력 폴더가 저장소 루트라서, 막지 않으면 그대로 내려받을 수 있습니다.

   정적 파일(/assets/*)은 _routes.json 에서 이 함수를 거치지 않도록 빼 두었습니다. */
const PRIMARY = 'yeodeol.kr';
const OLD_HOSTS = ['eightletters-web.pages.dev', 'www.yeodeol.kr'];
const PRIVATE = /^\/(functions|tools|node_modules|\.git)(\/|$)|^\/(README\.md|serve\.py|package(-lock)?\.json|wrangler\.toml)$|\.mjs$/i;

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (OLD_HOSTS.includes(url.hostname)) {
    url.hostname = PRIMARY;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  if (PRIVATE.test(url.pathname)) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });
  }
  return context.next();
}
