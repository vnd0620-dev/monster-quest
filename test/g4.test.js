// 4학년 문항: 파이썬 생성기와 따로 JS로 정답을 다시 계산해 확인
const test = require('node:test');
const assert = require('node:assert');
const G4 = require('../shared/questions-g4.js');
const F = require('../shared/figures.js');

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const R = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
const add = (a, b) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]), sub = (a, b) => R(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a, b) => R(a[0] * b[0], a[1] * b[1]), div = (a, b) => R(a[0] * b[1], a[1] * b[0]);
function num(t) {
  let m;
  if ((m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return R(+m[1] * +m[3] + +m[2], +m[3]);
  if ((m = t.match(/^(\d+)\/(\d+)$/))) return R(+m[1], +m[2]);
  if ((m = t.match(/^(\d+)\.(\d+)$/))) return R(+(m[1] + m[2]), 10 ** m[2].length);
  return R(+t);
}
function evalExpr(s) {
  const tk = []; const re = /\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+|[+−×÷()])/gy; let m;
  while ((m = re.exec(s))) tk.push(m[1]);
  assert.strictEqual(tk.join('').replace(/\s/g, ''), s.replace(/\s/g, ''), '식 읽기 실패: ' + s);
  let i = 0;
  const atom = () => { const t = tk[i++]; if (t === '(') { const v = expr(); i++; return v; } return num(t); };
  const term = () => { let v = atom(); while (tk[i] === '×' || tk[i] === '÷') { const op = tk[i++]; const w = atom(); v = op === '×' ? mul(v, w) : div(v, w); } return v; };
  const expr = () => { let v = term(); while (tk[i] === '+' || tk[i] === '−') { const op = tk[i++]; const w = term(); v = op === '+' ? add(v, w) : sub(v, w); } return v; };
  const v = expr(); assert.strictEqual(i, tk.length); return v[0] / v[1];
}
// 정답 글자 앞부분의 수 (3 3/5, 1.35 m, 115°, 6950번 …)
function lead(t) {
  const m = String(t).replace(/^약\s*/, '').match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)/);
  if (!m) return null; const v = num(m[1]); return v[0] / v[1];
}
const near = (a, b) => a !== null && Math.abs(a - b) < 1e-9;
const all = [];
for (const sj of G4.subjects) for (const u of sj.units) for (const a of u.areas) for (const q of a.questions.concat(a.twins)) all.push({ u: u.id, q, ans: q.answer !== undefined ? q.answer : q.answers[0], texts: [q.text].concat(q.answer !== undefined ? [q.answer].concat(q.wrongs) : q.answers) });
const figsOf = (txt, type) => F.specsIn(txt).map(F.parse).filter(p => p && (!type || p.type === type));

test('4학년: 1·2학기 12단원, 828문항', () => {
  assert.deepEqual(G4.subjects.map(s => s.id), ['math4a', 'math4b']);
  assert.equal(G4.subjects.reduce((n, s) => n + s.units.length, 0), 12);
  assert.equal(all.length, 828);
});

test('4학년: 문제·보기 속 그림이 모두 그려짐 (대문자 모양 이름 포함)', () => {
  for (const { u, q, texts } of all) for (const t of texts) for (const sp of F.specsIn(t)) {
    assert.ok(F.parse(sp), `${u}:${q.id} 그림 읽기 실패 ${sp}`);
    assert.ok(/<svg/.test(F.render(sp)), `${u}:${q.id} 그림 그리기 실패 ${sp}`);
  }
});

test('4학년: 식(expr)의 값 = 정답', () => {
  let n = 0;
  for (const { u, q, ans } of all) if (q.meta && q.meta.expr) { n++; assert.ok(near(lead(ans), evalExpr(q.meta.expr)), `${u}:${q.id} ${q.meta.expr} ≠ ${ans}`); }
  assert.ok(n > 80, '식 문항 수 ' + n);
});

test('4학년: 나눗셈 몫·나머지', () => {
  for (const { u, q, ans } of all) if (q.meta && q.meta.div) {
    const [a, b] = q.meta.div, Q = Math.floor(a / b), r = a % b;
    const m = String(ans).match(/몫\s*(\d+),\s*나머지\s*(\d+)/);
    if (m) assert.deepEqual([+m[1], +m[2]], [Q, r], `${u}:${q.id}`);
    else if (q.meta.what === 'r') assert.equal(lead(ans), r, `${u}:${q.id}`);
    else if (/적어도/.test(q.text)) assert.equal(lead(ans), Q + (r ? 1 : 0), `${u}:${q.id} 올림`);
    else assert.equal(lead(ans), Q, `${u}:${q.id}`);
  }
});

test('4학년: 삼각형 180°, 사각형 360°, 각도기 눈금', () => {
  for (const { u, q, ans, texts } of all) {
    const m = q.meta || {};
    if (m.tri && m.tri.includes('q') && lead(ans) !== null) assert.equal(lead(ans) + m.tri.filter(x => x !== 'q').reduce((s, x) => s + x, 0), 180, `${u}:${q.id}`);
    if (m.tri && !m.tri.includes('q')) assert.equal(m.tri.reduce((s, x) => s + x, 0), 180, `${u}:${q.id} 세 각 합`);
    if (m.quad) assert.equal(lead(ans) + m.quad.reduce((s, x) => s + x, 0), 360, `${u}:${q.id}`);
    if (m.deg !== undefined) assert.equal(lead(ans), m.deg, `${u}:${q.id}`);
    for (const p of figsOf(q.text, 'tg')) if (p.missing !== null && m.tri && lead(ans) !== null) assert.equal(lead(ans), p.missing, `${u}:${q.id} 그림 ?`);
  }
});

test('4학년: 삼각형 분류(각·변)가 정답과 맞음', () => {
  const kind = t => { const x = Math.max(...t); return x === 90 ? '직각' : x > 90 ? '둔각' : '예각'; };
  for (const { u, q, ans } of all) {
    const m = q.meta || {};
    if (m.kind) assert.equal(m.kind, kind(m.tri) + '삼각형', `${u}:${q.id}`);
    if (u === 'tri4' && /^ak-t[1-6]$/.test(q.id)) assert.ok(ans.startsWith(kind(m.tri)), `${u}:${q.id}`);
    if (m.sides && q.answer && /삼각형$/.test(ans)) {
      const k = new Set(m.sides).size, nm = k === 1 ? '정삼각형' : k === 2 ? '이등변삼각형' : '세 변의 길이가 모두 다른 삼각형';
      assert.equal(ans, nm, `${u}:${q.id}`);
    }
  }
});

test('4학년: 밀기·뒤집기·돌리기 — 정답 그림의 칸이 맞고, 오답 그림은 모두 다름', () => {
  const key = c => c.map(x => x.join(',')).sort().join(' ');
  for (const { u, q } of all) if (q.meta && q.meta.tf && q.answer) {
    const [s, op] = q.meta.tf;
    const want = key(F.parse(`tf:${s}:${op}`).cells);
    const a = figsOf(q.answer, 'tf')[0];
    if (a) {
      assert.equal(key(a.cells), want, `${u}:${q.id} 정답 그림`);
      for (const w of q.wrongs) { const p = figsOf(w, 'tf')[0]; if (p) assert.notEqual(key(p.cells), want, `${u}:${q.id} 오답 ${w}`); }
    }
  }
});

test('4학년: 점의 이동 칸 수', () => {
  for (const { u, q } of all) if (q.meta && q.meta.mv && q.meta.dx !== undefined) {
    const [x1, y1, x2, y2] = q.meta.mv;
    assert.deepEqual([x2 - x1, y2 - y1], [q.meta.dx, q.meta.dy], `${u}:${q.id}`);
    const p = figsOf(q.text, 'mv')[0]; if (p) assert.deepEqual([p.a, p.b], [[x1, y1], [x2, y2]], `${u}:${q.id} 그림`);
  }
});

test('4학년: 막대·꺾은선그래프 — 그림 값과 정답', () => {
  let n = 0;
  for (const { u, q, ans } of all) {
    const m = q.meta || {}, g = m.bar ? { set: m.bar[0], step: m.bar[1], vals: m.bar[2], t: 'bar' } : m.lgr ? { set: m.lgr[0], step: m.lgr[1], base: m.lgr[2], vals: m.lgr[3], t: 'lgr' } : null;
    if (!g) continue; n++;
    const p = figsOf(q.text, g.t)[0] || figsOf(q.answer || '', g.t)[0];
    assert.ok(p, `${u}:${q.id} 그림 없음`);
    assert.deepEqual(p.vals, g.vals, `${u}:${q.id} 그림 값`);
    assert.equal(p.step, g.step, `${u}:${q.id} 눈금`);
    if (m.val !== undefined) assert.equal(lead(ans), g.vals[m.val], `${u}:${q.id} 값`);
    if (m.pick) { const v = m.pick === 'max' ? Math.max(...g.vals) : Math.min(...g.vals); assert.equal(g.vals.filter(x => x === v).length, 1, `${u}:${q.id} 같은 값`); assert.equal(ans, p.names[g.vals.indexOf(v)], `${u}:${q.id} 항목`); }
    if (m.sum) assert.equal(lead(ans), g.vals.reduce((s, x) => s + x, 0), `${u}:${q.id} 합`);
    if (m.chg) { const d = /늘|자란/.test(q.text) ? m.chg : m.chg.map(Math.abs), mx = Math.max(...d); assert.equal(d.filter(x => x === mx).length, 1, `${u}:${q.id} 변화가 가장 큰 곳이 하나`); }
  }
  assert.ok(n > 40, '그래프 문항 수 ' + n);
});

test('4학년: 수 배열의 빈칸과 대각선 수', () => {
  for (const { u, q, ans } of all) {
    const m = q.meta || {};
    if (m.seq) assert.equal(lead(ans), m.seq[m.blank], `${u}:${q.id}`);
    if (m.diag !== undefined) assert.equal(lead(ans), m.diag, `${u}:${q.id}`);
    if (m.pg && m.diag !== undefined) assert.equal(m.pg[0] * (m.pg[0] - 3) / 2, m.diag, `${u}:${q.id}`);
  }
});

test('4학년: 소수 크기 비교', () => {
  for (const { u, q, ans } of all) if (q.meta && q.meta.cmp) {
    const [a, b] = q.meta.cmp.map(Number);
    assert.equal(ans, a > b ? '>' : a < b ? '<' : '=', `${u}:${q.id}`);
  }
});
