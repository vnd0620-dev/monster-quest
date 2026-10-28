// 2~4단원(그리고 1단원) 문제 은행 검사: 모든 준비된 단원에 같은 규칙을 적용하고,
// 정답은 문제 글·그림 정보(meta)·공식에서 따로 다시 계산해 맞는지 확인합니다.
const test = require('node:test');
const assert = require('node:assert');
const QB = require('../shared/questions.js');
const FIG = require('../shared/figures.js');
const { numVal, matches, fmtOf } = require('../shared/engine.js');

const READY = QB.subjects.flatMap(sj => sj.units.filter(u => u.ready));
const all = u => u.areas.flatMap(a => [...a.questions.map(q => ({ a, it: q, main: true })), ...a.twins.map(t => ({ a, it: t, main: false }))]);
const near = (x, y) => Math.abs(x - y) < 1e-9;

test('준비된 단원: 6학년 수학 1~6단원 모두 + 5학년 단원', () => {
  assert.deepEqual(READY.slice(0, 6).map(u => u.id), ['frac', 'prism', 'dec', 'ratio', 'graph', 'cube']);
  const G5 = ['mix5', 'fac5', 'corr5', 'red5', 'fadd5', 'poly5', 'range5', 'fmul5', 'cong5', 'dmul5', 'cuboid5', 'avg5'];
  assert.deepEqual(READY.slice(6).map(u => u.id), G5.filter(id => READY.some(u => u.id === id)));
  const math = QB.subjects.find(s => s.id === 'math');
  assert.deepEqual(math.units.filter(u => !u.ready).map(u => u.id), []);
});

for (const u of READY) {
  test(`${u.name}: 평가요소 4~5 × (본 문항 10 + 추가 문제 8), 난이도·평가기준·제안 문구`, () => {
    assert.ok(u.areas.length === 4 || u.areas.length === 5, u.id + ' 평가요소 수');
    const codes = u.standards.map(x => x.code);
    assert.ok(codes.length >= 1);
    for (const a of u.areas) {
      assert.equal(a.questions.length, 10, a.id);
      assert.equal(a.twins.length, 8, a.id);
      assert.ok(codes.includes(a.std), a.id + ' 성취기준 연결');
      assert.ok(a.concept && a.name);
      for (const k of ['high', 'mid', 'low']) assert.ok(a.criteria[k] && a.student[k] && a.teacher[k], `${a.id} ${k}`);
      for (const d of [1, 2, 3]) { assert.ok(a.questions.some(q => q.diff === d), `${a.id} 본 문항 난이도 ${d}`); assert.ok(a.twins.some(t => t.diff === d), `${a.id} 추가 문제 난이도 ${d}`); }
    }
  });

  test(`${u.name}: 보기 4개 중복 없음, 오답마다 실수 유형, 힌트 3단계, 풀이 과정 첫 줄`, () => {
    for (const a of u.areas) for (const q of a.questions) {
      assert.equal(q.wrongs.length, 3, q.id);
      assert.equal(new Set([q.answer, ...q.wrongs]).size, 4, q.id + ' 보기 중복');
      for (const k of q.mis) assert.ok(u.mistakes[k], `${q.id}: 실수 유형 ${k} 없음`);
      assert.ok(q.hint1 && q.hint2 && q.explain, q.id + ' 힌트');
      assert.ok(q.step && q.step.startsWith('첫 단계'), q.id + ' 풀이 과정 첫 줄');
      assert.ok(![q.hint1, q.hint2, q.explain].includes(q.step), q.id + ' 내 힌트와 겹침');
      const ans = q.answer.replace(/ ?(m|L|kg|g|cm|개|배)$/, '');
      if (!/^\[\[fig/.test(q.answer)) assert.ok(!q.step.includes('= ' + ans + ' ') && !q.step.endsWith('= ' + ans) && !q.step.endsWith(' ' + q.answer), q.id + ' 첫 줄에 정답이 보임');
      // 숫자 보기는 크기가 같은 오답이 없어야 함
      const av = numVal(q.answer);
      if (av != null) for (const w of q.wrongs) { const wv = numVal(w); if (wv != null) assert.ok(!near(av, wv), `${q.id}: 오답 ${w} 이 정답과 같은 크기`); }
    }
    for (const a of u.areas) for (const t of a.twins) { assert.equal(t.hints.length, 3, t.id); assert.ok(t.answers.length >= 1); }
  });

  test(`${u.name}: 단원 안에서 같은 문제(숫자·그림 조합)가 겹치지 않음`, () => {
    const key = it => {
      const figs = FIG.specsIn(it.text).join('+');
      const nums = (it.text.replace(FIG.TOKEN, '').match(/\d+ \d+\/\d+|\d+\/\d+|\d+\.\d+|\d+/g) || []).join('|');
      // 계산 단원(1·3단원)은 숫자 조합이 같으면 같은 문제, 개념 단원(2·4단원)은 숫자와 묻는 말이 모두 같아야 같은 문제
      const calc = u.id === 'frac' || u.id === 'dec';
      // 혼합 계산 단원은 괄호 위치가 다르면 다른 문제
      const strip = u.id === 'mix5' ? /[\s?.]/g : /[\s?.()]/g;
      return figs || !nums || !calc ? figs + '#' + nums + '#' + it.text.replace(FIG.TOKEN, '').replace(strip, '') : nums;
    };
    const seen = new Map();
    for (const { it } of all(u)) { const k = key(it); assert.ok(!seen.has(k), `${it.id} 와 ${seen.get(k)} 가 같은 문제`); seen.set(k, it.id); }
    assert.equal(seen.size, u.areas.length * 18);
  });

  test(`${u.name}: 그림 자리표는 모두 그릴 수 있음`, () => {
    for (const { it } of all(u)) {
      const specs = FIG.specsIn(it.text).concat(it.answer ? FIG.specsIn([it.answer, ...(it.wrongs || [])].join(' ')) : []);
      for (const sp of specs) { assert.ok(FIG.parse(sp), `${it.id}: ${sp}`); const svg = FIG.render(sp); assert.ok(svg.startsWith('<svg') && !/NaN|undefined/.test(svg), `${it.id}: ${sp} 그림`); }
    }
  });

  test(`${u.name}: 추가 문제는 답 칸 모양에 맞게 입력하면 정답으로 인정`, () => {
    for (const a of u.areas) for (const t of a.twins) {
      const f = fmtOf(t.answers[0]);
      if (u.id === 'dec' || u.id === 'ratio' || u.id === 'frac') assert.notEqual(f, 'text', t.id + ' 계산 단원은 숫자 칸');
      const typed = f === 'pct' ? t.answers[0].replace(/\s*%$/, '') + '%' : f === 'ratio' ? t.answers[0].replace(/\s*:\s*/, ' : ') : t.answers[0];
      assert.ok(matches(typed, t.answers), t.id);
    }
  });
}

// ───── 3단원: 식에서 직접 계산 ─────
test('3단원 소수의 나눗셈: 정답이 실제 계산과 맞음', () => {
  const u = QB.unitById('dec');
  const W = {
    'dn-7': 3 / 5, 'dn-8': 9 / 6, 'dd-3': 9.6 / 3, 'dd-8': 7.5 / 3, 'dd-9': 13.6 / 4, 'dz-9': 0.6 / 4, 'dw-2': 27.6 / 3, 'dw-4': 37.5 / 5, 'dw-5': 18.6 / 3, 'dw-6': 13.2 / 6,
    'dw-7': 9.6 / 4, 'dw-8': 7.4 / 4, 'dw-9': 42 / 5 / 5, 'dw-10': 4.2 / 7,
    'dn-t7': 5 / 4, 'dd-t6': 6.6 / 2, 'dd-t7': 14.7 / 3, 'dz-t7': 1.4 / 4, 'dw-t1': 9.2 / 4, 'dw-t2': 6.3 / 9, 'dw-t3': 14.8 / 4, 'dw-t4': 20 / 8, 'dw-t5': 13.5 / 5, 'dw-t6': 36.8 / 4 / 4, 'dw-t7': 10.2 / 6, 'dw-t8': 7.8 / 6,
  };
  let n = 0;
  for (const { it } of all(u)) {
    let e = W[it.id];
    const m = it.text.match(/^(\d+(?:\.\d+)?) ÷ (\d+)(?: = \?(?: \(소수로 써 보세요\))?| 의 몫을 소수로 나타내면\?)$/);
    if (m) e = +m[1] / +m[2];
    if (it.id === 'dw-1') { assert.ok(Math.abs(it.meta.est - 4) < 0.2 && it.answer === '약 4'); n++; continue; }
    if (it.id === 'dw-3') { const v = c => { const k = c.match(/^(\d+\.\d+) ÷ (\d+)$/); return +k[1] / +k[2]; }; assert.ok([it.answer, ...it.wrongs].every(c => v(c) <= v(it.answer))); n++; continue; }
    assert.ok(e != null, it.id + ' 계산식 없음');
    const got = numVal(it.answer || it.answers[0]);
    assert.ok(got != null && Math.abs(got - e) < 1e-9, `${it.id}: ${it.text} → ${it.answer || it.answers[0]} ≠ ${e}`);
    n++;
  }
  assert.equal(n, 72);
});

// ───── 4단원: 그림 정보·글에서 다시 계산 ─────
test('4단원 비와 비율: 정답이 그림·문장과 맞음', () => {
  const u = QB.unitById('ratio');
  const TXT = { 'rc-3': '나눗셈으로 비교한 값', 'rc-7': '차가 점점 커진다', 'rc-9': '귤이 감보다 5개 더 많다', 'rr-2': '4 대 7', 'rr-9': '7 : 25', 'rr-10': '12 : 13', 'rr-t2': '5 : 9', 'rr-t6': '13 : 30', 'rr-t8': '14 : 9', 'ra-4': '7/10, 0.7', };
  let n = 0;
  for (const { it } of all(u)) {
    const ans = it.answer || it.answers[0];
    const m = it.meta || {};
    let e = null;
    if (m.ask && m.r != null) e = { sub: m.r - m.b, div: m.r / m.b, bdiv: m.b / m.r, rb: `${m.r} : ${m.b}`, rt: `${m.r} : ${m.r + m.b}`, bt: `${m.b} : ${m.r + m.b}`, rtf: m.r / (m.r + m.b), rtp: 100 * m.r / (m.r + m.b), both: `${m.r - m.b}개 더 많고, ${m.r / m.b}배이다` }[m.ask];
    else if (m.ask && m.a != null) e = { sub: m.a - m.b, div: m.a / m.b }[m.ask];
    else if (m.ask && m.k != null) e = { shaded: m.k, white: 100 - m.k, shadedDec: m.k / 100 }[m.ask];
    else if (m.val != null) e = m.val;
    else {
      let k;
      if (TXT[it.id]) e = TXT[it.id];
      else if ((k = it.text.match(/^(\d+)에 대한 (\d+)의 비/))) e = `${k[2]} : ${k[1]}`;
      else if ((k = it.text.match(/^(\d+)의 (\d+)에 대한 비/))) e = `${k[1]} : ${k[2]}`;
      else if ((k = it.text.match(/^(\d+) : (\d+) 에서 (기준량|비교하는 양)/))) e = k[3] === '기준량' ? +k[2] : +k[1];
      else if ((k = it.text.match(/^(\d+) : (\d+) (?:를|을|의)/))) e = +k[1] / +k[2];
    }
    // 그림 자리표 숫자와 meta가 같은지
    const sp = FIG.specsIn(it.text)[0];
    if (sp) { const f = FIG.parse(sp); if (f.type === 'tiles' || f.type === 'objs') assert.deepEqual([f.r, f.b], [m.r, m.b], it.id); if (f.type === 'grid') assert.equal(f.k, m.k, it.id); if (f.type === 'bars') assert.deepEqual([f.a, f.b], [m.a, m.b], it.id); }
    assert.ok(e != null, it.id + ' 검사 기준 없음');
    if (typeof e === 'string') assert.ok(ans.replace(/\s/g, '') === e.replace(/\s/g, ''), `${it.id}: ${ans} ≠ ${e}`);
    else { const got = numVal(ans); assert.ok(got != null && near(got, e), `${it.id}: ${ans} ≠ ${e}`); }
    n++;
  }
  assert.equal(n, 72);
  // 같은 비율이어도 비는 다름: 4 : 6 을 2 : 3 으로 쓰면 오답
  assert.ok(!matches('2 : 3', ['4 : 6'])); assert.ok(matches('4:6', ['4 : 6'])); assert.ok(matches('35', ['35%'])); assert.ok(matches('35 %', ['35%']));
});

// ───── 2단원: 공식으로 다시 계산, 그림과 문제가 같은 입체인지 ─────
const KN = { 3: '삼', 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구', 10: '십' };
test('2단원 각기둥과 각뿔: 면·모서리·꼭짓점 수와 이름이 공식과 맞고, 그림과 일치', () => {
  const u = QB.unitById('prism');
  let checked = 0, figs = 0, mains = 0;
  for (const { it, main } of all(u)) {
    const ans = it.answer || it.answers[0];
    const sp = FIG.specsIn(it.text);
    if (main) { mains++; if (sp.length || FIG.specsIn(it.answer).length) figs++; }
    const m = it.meta;
    if (m && m.solid) {
      const n = m.n, P = m.solid === 'prism';
      const V = P ? 2 * n : n + 1, E = P ? 3 * n : 2 * n, F = P ? n + 2 : n + 1, name = KN[n] + '각' + (P ? '기둥' : '뿔');
      const e = { name, V, E, F, side: n, baseFromE: KN[n] + '각형', nameFromV: name, nameFromF: name, nameFromE: name }[m.ask];
      assert.ok(e != null, it.id);
      if (typeof e === 'number') assert.equal(numVal(ans), e, `${it.id}: ${ans} ≠ ${e}`); else assert.equal(ans, e, it.id);
      if (sp.length) { const f = FIG.parse(sp[0]); assert.equal(f.n, n, it.id + ' 그림의 각 수'); assert.equal(f.type === 'pyr' ? 'pyr' : 'prism', m.solid, it.id + ' 그림 종류'); }
      // 문장 속 조건(모서리 24개 등)도 공식과 맞는지
      const c = it.text.match(/(꼭짓점|모서리|면)이 (\d+)개인/);
      if (c) assert.equal(+c[2], { 꼭짓점: V, 모서리: E, 면: F }[c[1]], it.id + ' 문장 조건');
      checked++;
    }
    if (m && m.net) {
      const opts = [it.answer, ...it.wrongs].map(x => FIG.parse(FIG.specsIn(x)[0]));
      assert.equal(opts.filter(o => o.valid).length, 1, it.id + ' 올바른 전개도는 하나');
      assert.ok(FIG.parse(FIG.specsIn(it.answer)[0]).valid, it.id + ' 정답이 올바른 전개도');
      const n = opts[0].n; assert.ok(opts.every(o => o.n === n));
      assert.ok(it.text.startsWith(KN[n] + '각기둥'), it.id + ' 문제의 각기둥과 그림이 같음');
      checked++;
    }
  }
  // 각기둥이 아닌 것 고르기
  const pp10 = u.areas[0].questions.find(q => q.id === 'pp-10');
  assert.equal(FIG.parse(FIG.specsIn(pp10.answer)[0]).type, 'pyr');
  assert.ok(pp10.wrongs.every(w => FIG.parse(FIG.specsIn(w)[0]).type === 'prism'));
  assert.ok(checked >= 45, '공식으로 확인한 문항 ' + checked);
  assert.ok(figs / mains >= 0.62 && figs / mains <= 0.72, `그림 문항 비율 ${figs}/${mains}`);
});

test('4단원 그림 문항은 약 1/3', () => {
  const u = QB.unitById('ratio');
  const qs = u.areas.flatMap(a => a.questions);
  const k = qs.filter(q => FIG.specsIn(q.text).length).length;
  assert.ok(k / qs.length >= 0.28 && k / qs.length <= 0.4, `${k}/${qs.length}`);
});

test('전개도 그림: 올바른 전개도는 면 수가 n+2, 틀린 전개도는 접으면 안 되는 까닭이 있음', () => {
  for (const n of [3, 4, 5, 6]) for (const k of ['ok', 'ok2', 'same', 'few', 'more']) {
    const f = FIG.parse(`net:${n}:${k}`);
    assert.equal(f.valid, k === 'ok' || k === 'ok2');
    const svg = FIG.render(`net:${n}:${k}`);
    const faces = (svg.match(/<polygon/g) || []).length;
    assert.equal(faces, k === 'few' ? n + 1 : k === 'more' ? n + 3 : n + 2, `net:${n}:${k} 면 수`);
  }
});

// ───── 5단원: 그래프 그림의 값에서 다시 계산 ─────
test('5단원 여러 가지 그래프: 정답이 그래프 그림·자료와 맞음', () => {
  const u = QB.unitById('graph');
  const TXT = {
    'gm-9': '띠 전체가 100%가 되어야 하기 때문에', 'gp-10': '전체에 대한 각 부분의 비율을 나타낸다',
    'gc-1': '꺾은선그래프', 'gc-2': '띠그래프, 원그래프', 'gc-7': '꺾은선그래프 — 시간에 따른 변화를 잘 나타낸다', 'gc-8': '한 달 동안 매일 잰 강아지의 몸무게',
    'gc-t1': '꺾은선그래프', 'gc-t2': '원그래프', 'gc-t8': '막대그래프',
  };
  let n = 0, figs = 0, mains = 0;
  for (const { it, main } of all(u)) {
    const ans = it.answer || it.answers[0], m = it.meta || {};
    const sp = FIG.specsIn(it.text)[0], f = sp ? FIG.parse(sp) : null;
    if (main) { mains++; if (sp || FIG.specsIn(it.answer).length) figs++; }
    let e = null;
    if (f && f.type !== 'band2') {
      const v = f.vals, nm = f.names, sorted = v.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]);
      assert.equal(new Set(v).size === v.length || ['times', 'pct', 'count', 'countdiff', 'countsum'].includes(m.ask) || !m.ask, true, it.id + ' 최대·최소를 묻는데 값이 겹침');
      e = { pct: v[m.i], max: nm[sorted[0][1]], min: nm[sorted[sorted.length - 1][1]], second: nm[sorted[1][1]], diffp: v[m.i] - v[m.j], times: v[m.i] / v[m.j], sum: v[m.i] + v[m.j], count: m.total * v[m.i] / 100, countdiff: m.total * (v[m.i] - v[m.j]) / 100, countsum: m.total * (v[m.i] + v[m.j]) / 100 }[m.ask];
      if (m.ask === 'max' || m.ask === 'min' || m.ask === 'second') assert.ok(sorted[0][0] !== sorted[1][0] && sorted[sorted.length - 1][0] !== sorted[sorted.length - 2][0], it.id + ' 순서가 하나로 정해짐');
      // 문장 속 항목 이름이 그림에 있는지 (그림과 문제가 같은 자료)
      for (const w of (it.text.replace(FIG.TOKEN, '').match(/[가-힣]+/g) || [])) if (FIG.SETS[f.set].includes(w)) assert.ok(nm.includes(w), it.id + ' 문장 속 ' + w + ' 가 그림에 없음');
    } else if (f && f.type === 'band2') {
      const d = f.a.map((x, i) => f.b[i] - x);
      if (m.ask === 'dec2') { const dec = d.map((x, i) => [x, i]).filter(x => x[0] < 0); assert.equal(dec.length, 1, it.id + ' 줄어든 항목은 하나'); e = f.names[dec[0][1]]; }
      if (m.ask === 'inc2') e = d[m.i];
    } else if (m.ask === 'mk') e = m.n / m.total * 100;
    else if (m.ask === 'mkitem') { // 문장 속 자료 표에서 다시 계산
      const pairs = [...it.text.matchAll(/([가-힣]+) (\d+)명/g)].map(x => [x[1], +x[2]]);
      const total = pairs.reduce((a, x) => a + x[1], 0), hit = pairs.find(x => x[0] === m.item);
      assert.ok(hit && pairs.length >= 3, it.id + ' 자료 표 읽기'); e = hit[1] / total * 100;
    } else if (m.ask === 'len') { const k = it.text.match(/길이가 (\d+) cm인 띠그래프.*?(\d+)%인/); assert.deepEqual([+k[1], +k[2]], [m.L, m.p], it.id); e = m.L * m.p / 100; }
    else if (m.ask === 'pick') {
      const want = m.vals || m.counts.map(c => c / m.counts.reduce((a, b) => a + b, 0) * 100);
      const opts = [it.answer, ...it.wrongs].map(x => FIG.parse(FIG.specsIn(x)[0]));
      assert.deepEqual(opts[0].vals, want, it.id + ' 정답 그래프');
      assert.ok(opts.slice(1).every(o => o.vals.join() !== want.join()), it.id + ' 오답 그래프는 다름');
      assert.ok(opts.every(o => o.type === opts[0].type && o.set === opts[0].set), it.id);
      if (m.counts) { const pairs = [...it.text.matchAll(/([가-힣]+) (\d+)명/g)].map(x => +x[2]); assert.deepEqual(pairs, m.counts, it.id + ' 문장 자료'); }
      n++; continue;
    } else if (m.val != null) e = m.val;
    else if (TXT[it.id]) e = TXT[it.id];
    else if (!sp && !m.ask && /(가|나|다|라) 항목이 (\d+)%/.test(it.text)) e = null;
    // 문장 속 계산 (gb-10 · gm-4 · gm-t2: 나머지 백분율)
    if (it.id === 'gb-10' || it.id === 'gm-4' || it.id === 'gm-t2') { const ps = [...it.text.matchAll(/(\d+)%/g)].map(x => +x[1]); assert.equal(e, 100 - ps.reduce((a, b) => a + b, 0), it.id); }
    if (it.id === 'gb-t4' || it.id === 'gp-t5') { const k = it.text.match(/(\d+)명/g).map(x => parseInt(x)), p = +it.text.match(/(\d+)%/)[1]; assert.equal(e, k[0] * p / 100, it.id); }
    if (it.id === 'gc-3') { const v = f.vals; assert.equal(v[0] + v[1], 70); assert.ok(v[2] !== Math.max(...v) && v[1] / v[3] !== 2 && v[0] <= 50, it.id); n++; continue; }
    if (it.id === 'gc-4') { const v = f.vals; assert.equal(v[1], v[2]); assert.ok(v[3] !== Math.max(...v) && v[0] !== 50 && v[1] - v[3] !== 10, it.id); n++; continue; }
    if (it.id === 'gc-9' || it.id === 'gc-10') { // 해석 문항: 정답 문장만 참
      const v = f.vals;
      if (it.id === 'gc-9') { assert.ok(v[0] === Math.max(...v)); assert.ok(v[1] / v[2] !== 2 && v[0] + v[1] !== 50 && v[3] !== Math.max(...v)); }
      if (it.id === 'gc-10') { assert.equal(200 * v[2] / 100, 40); assert.notEqual(200 * v[0] / 100, 40); assert.notEqual(200 * v[1] / 100, 25); assert.notEqual(v[3] / v[2], 2); }
      n++; continue;
    }
    assert.ok(e != null, it.id + ' 검사 기준 없음');
    if (typeof e === 'string') assert.ok(ans.replace(/\s/g, '') === e.replace(/\s/g, ''), `${it.id}: ${ans} ≠ ${e}`);
    else { const got = numVal(ans); assert.ok(got != null && near(got, e), `${it.id}: ${ans} ≠ ${e}`); }
    n++;
  }
  assert.equal(n, 72);
  assert.ok(figs / mains >= 0.5, `그림 문항 비율 ${figs}/${mains}`);
});

// ───── 6단원: 그림·문장의 길이에서 공식으로 다시 계산 ─────
test('6단원 직육면체의 부피와 겉넓이: 정답이 공식·그림과 맞음', () => {
  const u = QB.unitById('cube');
  const TXT = { 'cc-5': '세제곱센티미터', 'cv-9': '(가로) × (세로) × (높이)', 'cu-8': '1 m', 'cs-9': '(한 꼭짓점에서 만나는 세 면의 넓이의 합) × 2' };
  const toM = (v, unit) => (unit === 'cm' ? v / 100 : v);
  let n = 0, figs = 0, mains = 0;
  for (const { it, main } of all(u)) {
    const ans = it.answer || it.answers[0], m = it.meta || {};
    const sps = FIG.specsIn(it.text), f = sps.length ? FIG.parse(sps[0]) : null;
    if (main) { mains++; if (sps.length) figs++; }
    // 가로·세로·높이 (그림 또는 문장)
    let dims = null, unit = 'cm';
    if (f && f.type === 'cub') { dims = [f.a, f.b, f.c]; unit = f.unit; }
    else if (f && f.type === 'cubes') dims = [f.a, f.b, f.c];
    else {
      const k = it.text.match(/가로 (\d+) (cm|m), 세로 (\d+) (cm|m), 높이 (\d+) (cm|m)/);
      if (k) { const us = [k[2], k[4], k[6]]; const mixed = new Set(us).size > 1 || /몇 m³/.test(it.text); dims = mixed || /몇 m³/.test(it.text) ? [toM(+k[1], k[2]), toM(+k[3], k[4]), toM(+k[5], k[6])] : [+k[1], +k[3], +k[5]]; unit = mixed || /몇 m³/.test(it.text) ? 'm' : us[0]; }
      const c = it.text.match(/한 모서리의 길이가 (\d+) cm인 정육면체/); if (c) dims = [+c[1], +c[1], +c[1]];
      const L = it.text.match(/가로 (\d+)개, 세로 (\d+)개, 높이 (\d+)층/); if (L) dims = [+L[1], +L[2], +L[3]];
    }
    const vol = dims ? dims[0] * dims[1] * dims[2] : null, surf = dims ? 2 * (dims[0] * dims[1] + dims[1] * dims[2] + dims[0] * dims[2]) : null;
    let e = null;
    switch (m.ask) {
      case 'cubes': case 'layers': case 'vol': e = vol; break;
      case 'surf': e = surf; break;
      case 'volcm': assert.equal(unit, 'm', it.id); e = vol * 1000000; break;
      case 'cubesPlus': e = vol + m.plus; assert.ok(it.text.includes(Math.abs(m.plus) + ' cm³ 더 ' + (m.plus > 0 ? '큰' : '작은')), it.id); break;
      case 'bigger': case 'diff2': {
        assert.equal(f.type, 'cubes2', it.id);
        if (m.ask === 'diff2') e = Math.abs(f.vb - f.va);
        else e = f.va === f.vb ? '두 부피가 같다' : f.va > f.vb ? '가' : '나';
        break;
      }
      case 'same2': { const [p, q] = sps.map(FIG.parse); const va = p.a * p.b * p.c, vb = q.a * q.b * q.c; e = va === vb ? '두 부피가 같다' : va > vb ? '정육면체가 더 크다' : '직육면체가 더 크다'; break; }
      case 'missing': { assert.equal(dims.filter(x => x === 0).length, 1, it.id); assert.ok(it.text.includes('부피가 ' + m.V + ' cm³'), it.id); e = m.V / dims.filter(x => x).reduce((a, b) => a * b, 1); break; }
      case 'cubeEdge': { assert.ok(it.text.includes('부피가 ' + m.V + ' cm³인 정육면체'), it.id); e = Math.round(Math.cbrt(m.V)); assert.equal(e ** 3, m.V, it.id); break; }
      case 'surfEdge': { assert.ok(it.text.includes('겉넓이가 ' + m.S + ' cm²인 정육면체'), it.id); e = Math.sqrt(m.S / 6); assert.ok(Number.isInteger(e), it.id); break; }
      case 'face': { e = +it.text.match(/한 면의 넓이가 (\d+) cm²/)[1] * 6; break; }
      case 'faces3': { e = 2 * [...it.text.matchAll(/(\d+) cm²/g)].reduce((a, x) => a + +x[1], 0); break; }
      case 'conv': { const k = it.text.match(/^(\d+(?:\.\d+)?) (m³|cm³)는 몇 (cm³|m³)/); e = k[2] === 'm³' ? +k[1] * 1000000 : +k[1] / 1000000; break; }
      case 'maxvol': { const toVal = x => { const k = x.match(/^(\d+) (m³|cm³)$/); return k[2] === 'm³' ? +k[1] : +k[1] / 1000000; }; const all4 = [it.answer, ...it.wrongs]; assert.ok(all4.every(x => toVal(x) <= toVal(it.answer)) && new Set(all4.map(toVal)).size === 4, it.id); n++; continue; }
      default: if (m.val != null) e = m.val; else if (TXT[it.id]) e = TXT[it.id];
    }
    if (it.id === 'cu-10') assert.equal(e, (100 / 10) ** 3);
    // 그림의 단위와 정답의 단위가 맞는지
    if (typeof e === 'number' && /(cm³|m³|cm²)/.test(ans)) { const ask = (it.text.match(/몇 (cm³|m³|cm²)/) || [])[1]; const want = m.ask === 'surf' || m.ask === 'face' || m.ask === 'faces3' ? 'cm²' : ask || (unit === 'm' ? 'm³' : 'cm³'); assert.ok(ans.endsWith(want), `${it.id}: 단위 ${ans} (${want})`); }
    assert.ok(e != null, it.id + ' 검사 기준 없음');
    if (typeof e === 'string') assert.ok(ans.replace(/\s/g, '') === e.replace(/\s/g, ''), `${it.id}: ${ans} ≠ ${e}`);
    else { const got = numVal(ans); assert.ok(got != null && near(got, e), `${it.id}: ${ans} ≠ ${e}`); }
    // 숫자 오답이 정답과 같은 크기가 아닌지(부피 단위 문항 포함)
    n++;
  }
  assert.equal(n, 72);
  assert.ok(figs / mains >= 0.4, `그림 문항 비율 ${figs}/${mains}`);
});

test('5·6단원 새 그림: 띠·원그래프의 칸 수와 백분율, 쌓기나무 개수, 직육면체 길이 글자', () => {
  const b = FIG.render('band:fruit:n:35:25:20:15:5');
  assert.equal((b.match(/<rect /g) || []).length - 1, 5, '띠 칸 5개 (테두리 1개 빼고)');
  for (const v of [35, 25, 20, 15, 5]) assert.ok(b.includes('>' + v + '%<') || b.includes(' ' + v + '%<'), '백분율 ' + v);
  const p = FIG.render('pie:season:s:20:35:30:15');
  assert.equal((p.match(/<path /g) || []).length, 4); assert.ok(!/\d+%</.test(p), '눈금만 모드는 백분율 글자 없음');
  assert.equal(FIG.parse('pie:fruit:n:50:45:5'), null, '원그래프는 10% 미만 조각 없음');
  assert.equal(FIG.parse('band:fruit:n:50:40'), null, '합이 100이 아니면 안 그림');
  const c = FIG.render('cubes:3:2:2');
  assert.equal((c.match(/<polygon/g) || []).length, 3 * 12, '쌓기나무 12개 × 세 면');
  const k = FIG.render('cub:6:4:0:cm');
  assert.ok(k.includes('6 cm') && k.includes('4 cm') && k.includes('□ cm'));
  assert.equal((k.match(/stroke-dasharray/g) || []).length, 3, '보이지 않는 모서리 3개');
});
