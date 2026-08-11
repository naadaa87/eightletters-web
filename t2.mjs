import { branchRelation, coupleWeather, daeun, yearMonths, BRANCHES, dayPillarIndex, fourPillars, fmt } from './assets/js/saju.js';
const B = n => BRANCHES.indexOf(n);
const cases=[['子','午','chung'],['子','丑','yukhap'],['寅','午','samhap'],['子','未','wonjin'],['寅','亥','yukhap'],['巳','申','yukhap'],['寅','卯','banghap'],['子','卯','hyeong'],['辰','辰','hyeong'],['卯','午','pa'],['酉','戌','hae'],['寅','酉','wonjin'],['子','辰','samhap'],['子','酉','pa'],['甲?','',''],];
for(const [a,b,exp] of cases){ if(!exp&&!b) continue; const r=branchRelation(B(a),B(b)); console.log(`${a}${b}: ${r} ${r===exp?'✓':'✗ exp '+exp}`); }
// 기상도: 庚辰(나) vs 乙酉? 진유=육합, 庚乙=천간합 → 맑음
const w1=coupleWeather({stem:6,branch:B('辰')},{stem:1,branch:B('酉')});
console.log('庚辰×乙酉:', w1.state, w1.br, w1.st, w1.state==='clear'?'✓':'✗');
// 庚辰 vs 甲戌: 진술=충 → 된바람
const w2=coupleWeather({stem:6,branch:B('辰')},{stem:0,branch:B('戌')});
console.log('庚辰×甲戌:', w2.state, w2.state==='gale'?'✓':'✗');
// 대운: 1988-03-26 여 (戊辰년 양간 여 → 역행)
const du=daeun(1988,3,26,10,'F');
console.log('대운:', du.forward?'순행':'역행', '시작', du.startAge+'세', du.list.slice(0,3).map(s=>fmt.gz(s.stem,s.branch)).join(' '));
const ym=yearMonths(2026);
console.log('2026 세운:', fmt.gz(ym.yearStem,ym.yearBranch), '| 인월:', fmt.gz(ym.months[0].stem,ym.months[0].branch), '| 오월:', fmt.gz(ym.months[4].stem,ym.months[4].branch));
