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

test('준비된 단원: 1~4단원, 5·6단원은 준비 중', () => {
  assert.deepEqual(READY.map(u => u.id), ['frac', 'prism', 'dec', 'ratio']);
  const math = QB.subjects.find(s => s.id === 'math');
  assert.deepEqual(math.units.filter(u => !u.ready).map(u => u.id), ['graph', 'cube']);
});

for (const u of READY) {
  test(`${u.name}: 평가요소 4 × (본 문항 10 + 추가 문제 8), 난이도·평가기준·제안 문구`, () => {
    assert.equal(u.areas.length, 4);
    const codes = u.standards.map(x => x.code);
    assert.ok(codes.length >= 2);
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
      return figs || !nums || !calc ? figs + '#' + nums + '#' + it.text.replace(FIG.TOKEN, '').replace(/[\s?.()]/g, '') : nums;
    };
    const seen = new Map();
    for (const { it } of all(u)) { const k = key(it); assert.ok(!seen.has(k), `${it.id} 와 ${seen.get(k)} 가 같은 문제`); seen.set(k, it.id); }
    assert.equal(seen.size, 72);
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
