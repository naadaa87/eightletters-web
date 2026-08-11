const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const jobs = [
    ['home-d','http://localhost:8021/?demo=1',1440,940,true],
    ['home-m','http://localhost:8021/?demo=1',390,844,true],
    ['gh-d','http://localhost:8021/gunghap?demo=1',1440,940,true],
    ['gh-m','http://localhost:8021/gunghap?demo=1',390,844,true],
    ['time-d','http://localhost:8021/time?demo=1',1440,940,true],
    ['saju-d','http://localhost:8021/saju?demo=1',1440,940,true],
    ['rec-d','http://localhost:8021/record?demo=1',1440,940,true],
  ];
  for (const [name,url,w,h,full] of jobs){
    const p = await b.newPage({viewport:{width:w,height:h}});
    const errs=[];
    p.on('pageerror', e=>errs.push(String(e).slice(0,200)));
    p.on('console', m=>{ if(m.type()==='error' && !m.text().includes('403') && !m.text().includes('googleapis')) errs.push(m.text().slice(0,200)); });
    await p.goto(url,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(1300);
    await p.screenshot({path:`shot-${name}.png`, fullPage:full});
    console.log(name, 'ERRORS:', JSON.stringify(errs.slice(0,4), null, 1));
    await p.close();
  }
  // 궁합 데모: 상대 저장 후 결과 화면
  const p2 = await b.newPage({viewport:{width:1440,height:940}});
  await p2.goto('http://localhost:8021/gunghap?demo=1',{waitUntil:'domcontentloaded'});
  await p2.waitForTimeout(800);
  try {
    await p2.fill('#rNick','봄'); await p2.fill('#rY','1990'); await p2.fill('#rM','7'); await p2.fill('#rD','15');
    await p2.click('#btnRelSave'); await p2.waitForTimeout(900);
    await p2.screenshot({path:'shot-gh-result.png', fullPage:true});
    // 초대 링크 → share 페이지
    const url = await p2.evaluate(() => {
      const mod = document.querySelector('script[type=module]');
      return null;
    });
  } catch(e){ console.log('gh flow err', String(e).slice(0,150)); }
  await p2.close();
  await b.close();
})();
