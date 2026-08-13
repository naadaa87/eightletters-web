/* pages.dev 로 들어온 방문을 yeodeol.kr 로 넘깁니다.
   같은 사이트가 두 주소로 색인되면 검색 순위가 갈리기 때문입니다.

   - 운영 주소(eightletters-web.pages.dev)만 넘깁니다.
   - 미리보기 배포(abc123.eightletters-web.pages.dev)는 그대로 둡니다. 테스트해야 하니까요.
   - 경로와 쿼리는 유지합니다. 공유 링크의 #뒤 값은 브라우저가 알아서 옮겨 줍니다.
*/
const PRIMARY = 'yeodeol.kr';
const OLD_HOSTS = ['eightletters-web.pages.dev'];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (OLD_HOSTS.includes(url.hostname)) {
    url.hostname = PRIMARY;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
