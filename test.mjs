import { fourPillars, todayInfo, tenGod, fmt, ipchunTime, termInfo, STEMS, TEN_GODS } from './assets/js/saju.js';

const t = todayInfo(new Date(2026,7,9));
console.log('2026-08-09 일진:', t.gz, t.gzKr, '| 오행', t.el, '| 다음절기', t.term.next.name, t.term.next.daysLeft+'일 뒤', `${t.term.next.mo}/${t.term.next.d}`);
console.log('현재 절기:', t.term.current.name, `${t.term.current.mo}/${t.term.current.d}`);

const fp = fourPillars(1988,3,26,10);
const P = fp.pillars;
console.log('1988-03-26 10시:', fmt.gz(P.year.stem,P.year.branch), fmt.gz(P.month.stem,P.month.branch), fmt.gz(P.day.stem,P.day.branch), fmt.gz(P.hour.stem,P.hour.branch));
console.log('오행 분포 [목화토금수]:', fp.count);

console.log('입춘 2026:', ipchunTime(2026));
console.log('입춘 1988:', ipchunTime(1988));
console.log('십성 庚→乙 :', TEN_GODS[tenGod(6,1)]);
console.log('십성 庚→丙 :', TEN_GODS[tenGod(6,2)]);
console.log('십성 甲→甲 :', TEN_GODS[tenGod(0,0)]);

// 경계: 1988-02-04 (입춘일) 전후
const b1 = fourPillars(1988,2,3,12), b2 = fourPillars(1988,2,5,12);
console.log('1988-02-03 년주:', fmt.gz(b1.pillars.year.stem,b1.pillars.year.branch), '| 02-05 년주:', fmt.gz(b2.pillars.year.stem,b2.pillars.year.branch));

// 시간 모름
const nk = fourPillars(1993,7,21,null);
console.log('1993-07-21 (시간모름) 일주:', fmt.gz(nk.pillars.day.stem,nk.pillars.day.branch), '| 시주:', nk.pillars.hour);

// ── 궁합 확장 검증 ──
import { branchRelation, coupleWeather, stemHap, daeun, yearMonths, BRANCHES } from './assets/js/saju.js';
const B = n => BRANCHES.indexOf(n);
console.log('자오:', branchRelation(B('子'),B('午')), '| 자축:', branchRelation(B('子'),B('丑')), '| 인오:', branchRelation(B('寅'),B('午')), '| 자미:', branchRelation(B('子'),B('未')), '| 인해:', branchRelation(B('寅'),B('亥')));
console.log('천간합 甲己:', stemHap(0,5), '| 甲乙:', stemHap(0,1));
// 1988-03-26(庚辰일주) vs 1990-07-15 일주?
