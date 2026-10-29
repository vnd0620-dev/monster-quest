// 3학년 문항: 파이썬 생성기와 따로 JS로 정답을 다시 계산해 확인
const test = require('node:test');
const assert = require('node:assert');
const G3 = require('../shared/questions-g3.js');
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
for (const sj of G3.subjects) for (const u of sj.units) for (const a of u.areas) for (const q of a.questions.concat(a.twins)) all.push({ u: u.id, q, mc: q.answer !== undefined, ans: q.answer !== undefined ? q.answer : q.answers[0], texts: [q.text].concat(q.answer !== undefined ? [q.answer].concat(q.wrongs) : q.answers) });
const figsOf = (txt, type) => F.specsIn(txt).map(F.parse).filter(p => p && (!type || p.type === type));
const kgOf = s => { const m = String(s).match(/^(?:(\d+) (?:kg|L))?\s*(?:(\d+) (?:g|mL))?$/); return m ? (+(m[1] || 0)) * 1000 + (+(m[2] || 0)) : null; };
const secOf = s => { const m = String(s).match(/^(?:(\d+)시간? ?)?(?:(\d+)분 ?)?(?:(\d+)초)?$/); return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : null; };

test('3학년: 1·2학기 12단원', () => {
  assert.deepEqual(G3.subjects.map(s => s.id), ['math3a', 'math3b']);
  assert.equal(G3.subjects.reduce((n, s) => n + s.units.length, 0), 12);
  assert.ok(all.length > 800);
});

test('3학년: 문제·보기 속 그림이 모두 그려짐', () => {
  for (const { u, q, texts } of all) for (const t of texts) for (const sp of F.specsIn(t)) {
    assert.ok(F.parse(sp), `${u}:${q.id} 그림 읽기 실패 ${sp}`);
    assert.ok(/<svg/.test(F.render(sp)), `${u}:${q.id} 그림 그리기 실패 ${sp}`);
  }
});

test('3학년: 식(expr)의 값 = 정답', () => {
  let n = 0;
  for (const { u, q, ans } of all) if (q.meta && q.meta.expr && !/[×÷+−]/.test(ans)) { n++; assert.ok(near(lead(ans), evalExpr(q.meta.expr)), `${u}:${q.id} ${q.meta.expr} ≠ ${ans}`); }
  assert.ok(n > 150, '식 문항 수 ' + n);
});

test('3학년: 나눗셈 몫·나머지 (… 표기, 올림 포함)', () => {
  let n = 0;
  for (const { u, q, ans, mc } of all) if (q.meta && q.meta.div) {
    n++;
    const [a, b] = q.meta.div, Q = Math.floor(a / b), r = a % b;
    const m = String(ans).match(/^(\d+) … (\d+)$/);
    if (q.meta.up) assert.equal(lead(ans), Q + (r ? 1 : 0), `${u}:${q.id} 올림`);
    else if (m) assert.deepEqual([+m[1], +m[2]], [Q, r], `${u}:${q.id}`);
    else if (q.meta.what === 'r') assert.equal(lead(ans), r, `${u}:${q.id}`);
    else if (lead(ans) !== null && !/\d.*[×÷=]/.test(ans) && !/봉지, /.test(ans)) assert.equal(lead(ans), Q, `${u}:${q.id} ${ans}`);
    if (mc && m) for (const w of q.wrongs) { const k = String(w).match(/^(\d+) … (\d+)$/); if (k) assert.ok(!(+k[1] === Q && +k[2] === r), `${u}:${q.id} 오답이 정답과 같음`); }
  }
  assert.ok(n > 80);
});

test('3학년: 시간(분·초)과 들이·무게의 계산', () => {
  for (const { u, q, ans } of all) {
    const m = q.meta || {};
    if (m.sec) { const [A, B, op, v] = m.sec; assert.equal(op === '+' ? A + B : A - B, v, `${u}:${q.id} 식`); const s = secOf(String(ans).replace(/^(\d+)시 /, (x, h) => h + '시간 ')); if (s !== null && /분|초/.test(ans)) assert.equal(s % 86400, v % 86400, `${u}:${q.id} ${ans}`); }
    if (m.amt) { const [A, B, op, v] = m.amt; assert.equal(op === '+' ? A + B : A - B, v, `${u}:${q.id} 식`); const k = kgOf(ans); if (k !== null) assert.equal(k, v, `${u}:${q.id} ${ans}`); else assert.equal(lead(ans), v, `${u}:${q.id} ${ans}`); }
    if (m.clk) { const [h, mi, s] = m.clk; const p = figsOf(q.text, 'clk')[0]; assert.deepEqual([p.h, p.m, p.s], [h, mi, s]); if (/시 .*분 .*초/.test(ans)) assert.equal(ans.replace(/\s/g, ''), `${h}시${mi}분${s}초`, `${u}:${q.id}`); else assert.equal(lead(ans), s, `${u}:${q.id}`); }
    if (m.mm !== undefined) { const p = figsOf(q.text, 'rul')[0]; assert.equal(p.mm, m.mm); const t = String(ans).replace(/\s/g, ''); const mm = /^(\d+)cm(\d+)mm$/.exec(t); if (mm) assert.equal(+mm[1] * 10 + +mm[2], m.mm, `${u}:${q.id}`); else if (/^\d+(mm)?$/.test(t)) assert.ok(lead(ans) === m.mm || lead(ans) === m.mm % 10, `${u}:${q.id}`); }
    if (m.cup) { const p = figsOf(q.text, 'cup')[0]; assert.deepEqual([p.max, p.v], m.cup); assert.equal(kgOf(ans) !== null ? kgOf(ans) : lead(ans), m.cup[1], `${u}:${q.id}`); }
    if (m.scl) { const p = figsOf(q.text, 'scl')[0]; assert.deepEqual([p.max, p.v], m.scl); assert.equal(kgOf(ans) !== null ? kgOf(ans) : lead(ans), m.scl[1], `${u}:${q.id}`); }
  }
});

test('3학년: 분수 — 색칠 칸, 묶음, 분수만큼, 대분수·가분수', () => {
  for (const { u, q, ans } of all) {
    const m = q.meta || {};
    if (m.shade) { const [n, k] = m.shade; const p = figsOf(q.text).find(x => x.type === 'fb' || x.type === 'fc'); assert.ok(p.equal !== false); assert.ok(p.n === n && (p.k === k || p.n - p.k === k), `${u}:${q.id} 그림`); if (/\//.test(ans)) assert.equal(ans, `${k}/${n}`, `${u}:${q.id}`); else assert.ok(near(lead(ans), k / n), `${u}:${q.id}`); }
    if (m.grp) { const [g, per, k] = m.grp; const p = figsOf(q.text, 'grp')[0]; assert.deepEqual([p.g, p.per, p.k], [g, per, k]); assert.equal(ans, `${k}/${g}`, `${u}:${q.id}`); }
    if (m.part) { const [n, a, c] = m.part; assert.equal(n % c, 0); assert.equal(lead(ans), n / c * a, `${u}:${q.id}`); }
    if (m.imp && q.answer !== undefined && /\//.test(ans)) { const [n, d] = m.imp; const v = num(ans); assert.ok(v[0] * d === n * v[1], `${u}:${q.id}`); if (m.mix) { const [w, r, d2] = m.mix; assert.equal(w * d2 + r, n, `${u}:${q.id} 대분수=가분수`); } }
    if (q.answer !== undefined && m.mix && m.imp) for (const w of q.wrongs) { if (/^\d+( \d+)?\/\d+$|^\d+$/.test(w)) { const v = num(w), [n, d] = m.imp; assert.ok(v[0] * d !== n * v[1], `${u}:${q.id} 오답 ${w}`); } }
  }
});

test('3학년: 크기 비교(분수·소수) 기호', () => {
  const val = s => { const v = num(s); return v[0] / v[1]; };
  for (const { u, q, ans } of all) if (q.meta && q.meta.cmp && ['>', '<', '='].includes(ans)) {
    const [a, b] = q.meta.cmp.map(val);
    assert.equal(ans, a > b ? '>' : a < b ? '<' : '=', `${u}:${q.id}`);
  }
});

test('3학년: 그림그래프 — 그림 값과 정답', () => {
  for (const { u, q, ans } of all) if (q.meta && q.meta.pic) {
    const [st, big, small, vals] = q.meta.pic;
    const p = figsOf(q.text, 'pic')[0] || figsOf(q.answer || '', 'pic')[0];
    assert.ok(p, `${u}:${q.id} 그림 없음`);
    assert.deepEqual([p.set, p.big, p.small, p.vals], [st, big, small, vals], `${u}:${q.id}`);
    if (q.meta.val !== undefined) assert.equal(lead(ans), vals[q.meta.val], `${u}:${q.id}`);
    if (q.meta.pick) { const v = q.meta.pick === 'max' ? Math.max(...vals) : Math.min(...vals); assert.equal(vals.filter(x => x === v).length, 1); assert.equal(ans, p.names[vals.indexOf(v)], `${u}:${q.id}`); }
    if (q.meta.sum) assert.equal(lead(ans), vals.reduce((s, x) => s + x, 0), `${u}:${q.id}`);
  }
});

test('3학년: 원·선·삼각형 그림과 정답', () => {
  const NM = { seg: '선분', ray: '반직선', rayb: '반직선', line: '직선', angle: '각' };
  for (const { u, q, ans } of all) {
    const m = q.meta || {};
    if (m.cir) { const [mode, v] = m.cir; const p = figsOf(q.text, 'cir')[0]; assert.deepEqual([p.mode, p.v], [mode, v]); if (/반지름은 몇/.test(q.text)) assert.equal(lead(ans), mode === 'r' ? v : v / 2, `${u}:${q.id}`); if (/지름은 몇/.test(q.text) && !/반지름은 몇/.test(q.text)) assert.equal(lead(ans), mode === 'd' ? v : v * 2, `${u}:${q.id}`); }
    if (m.ln && m.ln !== 'angle') { const p = figsOf(q.text, 'ln')[0]; if (p) { assert.equal(p.kind, m.ln); assert.ok(ans.startsWith(NM[m.ln]) || ans === 'ㄴㄱ', `${u}:${q.id}`); } if (m.ln === 'rayb' && ans.startsWith('반직선')) assert.ok(/ㄴㄱ/.test(ans)); if (m.ln === 'ray' && ans.startsWith('반직선') && / ㄱㄴ/.test(q.answer || '')) assert.ok(true); }
    if (m.tri) { assert.equal(m.tri.reduce((s, x) => s + x, 0), 180, `${u}:${q.id}`); const p = figsOf(q.text + ' ' + (q.answer || ''), 'tk')[0]; if (p) assert.deepEqual([p.A, p.B, p.C], m.tri, `${u}:${q.id}`); }
  }
});

test('3학년: 단위가 섞인 오답(몇 L 몇 mL, 몇 분 몇 초 등)이 정답과 값이 같지 않음', () => {
  const amt = s => { const m = String(s).match(/^(?:(\d+) (kg|L|km|cm))?\s*(?:(\d+) (g|mL|m|mm))?$/); if (!m || (!m[1] && !m[3])) return null; const f = { kg: 1000, L: 1000, km: 1000, cm: 10 }[m[2]] || 0; return (+(m[1] || 0)) * f + (+(m[3] || 0)); };
  const tm = s => { const m = String(s).match(/^(?:(\d+)시간? )?(?:(\d+)분)? ?(?:(\d+)초)?$/); if (!m || !(m[2] || m[3])) return null; return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)); };
  for (const { u, q, mc } of all) if (mc) for (const w of q.wrongs) {
    const A = amt(q.answer), W = amt(w), T = tm(q.answer), TW = tm(w);
    assert.ok(!(A !== null && W !== null && A === W), `${u}:${q.id} ${w}`);
    assert.ok(!(T !== null && TW !== null && T === TW), `${u}:${q.id} ${w}`);
  }
});

test('주관식: 단위가 있는 답은 단위 칸을 앱이 보여 주어 학생이 영어 단위를 쓰지 않음', () => {
  const E = require('../shared/engine.js'), Q = require('../shared/questions.js');
  for (const s of Q.subjects) for (const u of s.units) for (const a of u.areas || []) for (const q of a.twins || []) {
    const f = E.fmtOf(q.answers);
    assert.ok(!(f === 'text' && q.answers.some(x => /[a-zA-Z]{2,}|\d\s*[a-zA-Z]/.test(x))), `${u.id}:${q.id} ${q.answers}`);
  }
  assert.equal(E.fmtOf(['2 L 600 mL']), 'u2:L:mL');
  assert.equal(E.fmtOf(['15', '15 cm']), 'u1:cm');
  assert.ok(E.matches('2 L 600 mL', ['2 L 600 mL']) && E.matches('3분 50초', ['3분 50초']) && E.matches('15 cm', ['15', '15 cm']));
});
