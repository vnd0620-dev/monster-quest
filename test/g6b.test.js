// 6학년 2학기 문항: 파이썬 생성기와 따로 JS로 정답을 다시 계산해 확인
const test = require('node:test');
const assert = require('node:assert');
const G6B = require('../shared/questions-g6b.js');
const F = require('../shared/figures.js');
const { numVal, matches } = require('../shared/engine.js');

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
const near = (a, b) => Math.abs(a - b) < 1e-9;
const all = [];
for (const sj of G6B.subjects) for (const u of sj.units) for (const a of u.areas) for (const q of [...a.questions, ...a.twins]) all.push({ u, q, ans: q.answer || q.answers[0] });

test('6-2: 식이 있는 문항은 정답이 식의 값과 같음', () => {
  let n = 0;
  for (const { u, q, ans } of all) if (q.meta && q.meta.expr) { assert.ok(near(numVal(ans), evalExpr(q.meta.expr)), `${u.id} ${q.id}: ${q.meta.expr} ≠ ${ans}`); n++; }
  assert.ok(n >= 150, '식 문항 ' + n);
});
test('6-2: 쌓기나무 개수 문항은 그림의 칸별 수를 더한 값과 같음', () => {
  let n = 0;
  for (const { u, q, ans } of all) if (q.meta && q.meta.fig) { const p = F.parse(q.meta.fig); assert.ok(p && p.count === q.meta.count, q.id); assert.ok(near(numVal(ans), p.count), `${u.id} ${q.id}`); n++; }
  assert.ok(n >= 10, '그림 개수 문항 ' + n);
});
test('6-2: 앞·옆에서 본 모양 보기는 위에서 본 모양의 수로 다시 구한 모양과 같음', () => {
  let n = 0;
  for (const { q } of all) if (q.meta && q.meta.view) {
    const p = F.parse('top:' + q.meta.top), H = p.H;
    const cols = q.meta.view === 'front' ? H[0].map((_, i) => Math.max(...H.map(r => r[i]))) : H.slice().reverse().map(r => Math.max(...r));
    assert.strictEqual(q.answer, '[[fig:vw:' + cols.join(':') + ']]', q.id);
    assert.ok(!q.wrongs.includes(q.answer), q.id); n++;
  }
  assert.ok(n >= 3);
});
test('6-2: 몫 반올림·남는 양·비례배분·가장 간단한 비 문항을 다시 계산', () => {
  for (const { u, q, ans } of all) {
    const m = q.meta || {};
    if (m.round) {
      const [a, d, p] = m.round; const v = evalExpr(`${a} ÷ ${d}`), k = 10 ** p; let r = Math.round(v * k + 1e-9) / k;
      if (m.add) r += +m.add; assert.ok(near(numVal(ans), r), `${q.id}: ${ans} ≠ ${r}`);
    }
    if (m.rem) {
      const a = evalExpr(m.rem[0]), d = evalExpr(m.rem[1]), k = Math.floor(a / d + 1e-9), r = Math.round((a - d * k) * 1e6) / 1e6;
      const got = ans.includes(',') ? numVal(ans.split(',')[1].trim()) : numVal(ans); assert.ok(near(got, r), `${q.id}: ${ans} ≠ ${r}`);
    }
    if (m.ratio && /^\d+ : \d+$/.test(ans)) {
      const a = evalExpr(m.ratio[0]), b = evalExpr(m.ratio[1]); const [x, y] = ans.split(' : ').map(Number);
      assert.ok(near(x / y, a / b) && gcd(x, y) === 1, `${q.id}: ${ans}`);
      assert.ok(matches(ans, [ans]) && !(q.answers || []).some(z => z !== ans), q.id);
    }
    if (m.split) { const [t, a, c] = m.split; assert.ok(Number.isInteger(t * a / (a + c)), q.id); }
  }
});
test('6-2: 원주·원의 넓이 문항을 3.14로 다시 계산', () => {
  let n = 0;
  for (const { q, ans } of all) if (q.meta && q.meta.circle) {
    const [k, vs, times] = q.meta.circle, v = +vs;
    const e = { d: v * 3.14, r: v * 2 * 3.14, C: v / 3.14, Cr: v / 3.14 / 2, A_r: v * v * 3.14, A_d: (v / 2) ** 2 * 3.14 }[k] * (times || 1);
    assert.ok(Math.abs(numVal(ans) - e) < 1e-6, `${q.id}: ${ans} ≠ ${e}`); n++;
  }
  assert.ok(n >= 20, '원 문항 ' + n);
});
test('6-2: 전개도 보기의 정답은 바른 전개도', () => {
  for (const { q } of all) if (/^\[\[fig:cnet/.test(q.answer || '')) {
    assert.ok(F.parse(q.answer.slice(6, -2)).valid, q.id);
    q.wrongs.forEach(w => assert.ok(!F.parse(w.slice(6, -2)).valid, q.id + ' ' + w));
  }
});
