// 5학년 문항: meta.expr 식을 파이썬 생성기와 따로 JS로 다시 계산해 정답과 맞는지 확인
const test = require('node:test');
const assert = require('node:assert');
const G5 = require('../shared/questions-g5.js');
const { numVal } = require('../shared/engine.js');

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const R = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
const add = (a, b) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const sub = (a, b) => R(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a, b) => R(a[0] * b[0], a[1] * b[1]);
const div = (a, b) => R(a[0] * b[1], a[1] * b[0]);

function tokens(s) {
  const re = /\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+|[+−×÷()])/gy;
  const out = []; let m;
  while ((m = re.exec(s))) out.push(m[1]);
  assert.strictEqual(out.join('').replace(/\s/g, ''), s.replace(/\s/g, ''), '식 읽기 실패: ' + s);
  return out;
}
function num(t) {
  let m;
  if ((m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return R(+m[1] * +m[3] + +m[2], +m[3]);
  if ((m = t.match(/^(\d+)\/(\d+)$/))) return R(+m[1], +m[2]);
  if ((m = t.match(/^(\d+)\.(\d+)$/))) return R(+(m[1] + m[2]), 10 ** m[2].length);
  return R(+t);
}
function evalExpr(s) {
  const tk = tokens(s); let i = 0;
  const atom = () => { const t = tk[i++]; if (t === '(') { const v = expr(); i++; return v; } return num(t); };
  const term = () => { let v = atom(); while (tk[i] === '×' || tk[i] === '÷') { const op = tk[i++]; const w = atom(); v = op === '×' ? mul(v, w) : div(v, w); } return v; };
  const expr = () => { let v = term(); while (tk[i] === '+' || tk[i] === '−') { const op = tk[i++]; const w = term(); v = op === '+' ? add(v, w) : sub(v, w); } return v; };
  const v = expr(); assert.strictEqual(i, tk.length, '식 끝까지 못 읽음: ' + s); return v;
}

test('5학년: 식이 있는 문항의 정답을 JS로 다시 계산하면 같음', () => {
  let n = 0;
  for (const sj of G5.subjects) for (const u of sj.units) for (const a of u.areas) for (const q of a.questions) {
    if (!q.meta || !q.meta.expr) continue;
    const [p, d] = evalExpr(q.meta.expr);
    const got = numVal(q.answer);
    assert.ok(got !== null && Math.abs(got - p / d) < 1e-9, `${u.id} ${q.id}: ${q.meta.expr} = ${p}/${d}, 정답 ${q.answer}`);
    n++;
  }
  assert.ok(n >= 150, '식 문항 수 ' + n);
});
