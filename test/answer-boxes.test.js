// 모든 학년의 주관식(추가 문제) 정답을 학생 답 칸에 실제로 넣을 수 있는지 검사합니다.
// 학생 화면(student-ui.js)과 같은 규칙: 칸 v는 숫자·소수점 V_MAX자, 분자·분모·자연수·비는 숫자 4자, 단위 여러 개 칸은 숫자 5자.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const QB = require('../shared/questions.js');
const { fmtOf, matches } = require('../shared/engine.js');

const UI = fs.readFileSync(path.join(__dirname, '../public/js/student-ui.js'), 'utf8');
const V_MAX = Number((UI.match(/const V_MAX = (\d+)/) || [])[1]);
const glue = u => (/^[가-힣°]/.test(u) ? '' : ' ');

function twins() {
  const out = [];
  for (const s of QB.catalog().subjects) for (const cu of s.units) {
    const U = QB.unitById(cu.id); if (!U) continue;
    for (const a of U.areas) for (const t of a.twins || []) out.push({ unit: cu.id, t });
  }
  return out;
}

test('학생 화면의 숫자 칸 길이 설정을 읽을 수 있음', () => { assert.ok(V_MAX >= 12, 'V_MAX ' + V_MAX); });

test('모든 주관식 정답: 학생 답 칸에 들어가고, 넣으면 정답으로 인정됨', () => {
  const LIM = { v: V_MAX, w: 4, n: 4, d: 4, a: 4, b: 4, x: 5, y: 5, z: 5 };
  const bad = [];
  let n = 0;
  for (const { unit, t } of twins()) {
    n++;
    const f = fmtOf(t.answers), a = String(t.answers[0]), nums = a.match(/\d+(\.\d+)?/g) || [];
    let boxes = null, val = a;
    if (/^u1d?:/.test(f)) { const u = f.split(':')[1]; boxes = { v: nums[0] }; val = nums[0] + glue(u) + u; }
    else if (/^u[23]:/.test(f)) { const us = f.split(':').slice(1); boxes = {}; us.forEach((u, i) => { boxes['xyz'[i]] = nums[i]; }); val = us.map((u, i) => nums[i] + glue(u) + u).join(' '); }
    else if (f === 'int' || f === 'dec') { boxes = { v: a.replace(/,/g, '') }; val = boxes.v; }
    else if (f === 'pct') { boxes = { v: nums[0] }; val = nums[0] + '%'; }
    else if (f === 'ratio') { boxes = { a: nums[0], b: nums[1] }; val = `${nums[0]} : ${nums[1]}`; }
    else if (f === 'mixed') { boxes = { w: nums[0], n: nums[1], d: nums[2] }; val = `${nums[0]} ${nums[1]}/${nums[2]}`; }
    else if (f === 'frac') { boxes = { n: nums[0], d: nums[1] }; val = `${nums[0]}/${nums[1]}`; }
    else if (f !== 'text') { bad.push(`${unit} ${t.id}: 모르는 칸 형식 ${f}`); continue; }
    if (f === 'text' && /[A-Za-z]/.test(a)) bad.push(`${unit} ${t.id}: 알파벳을 쳐야 하는 답 "${a}"`);
    if (boxes) for (const [k, v] of Object.entries(boxes)) {
      if (v == null || v === '') bad.push(`${unit} ${t.id}: ${f} 칸 ${k}가 비어 있음 (답 "${a}")`);
      else if (String(v).length > LIM[k]) bad.push(`${unit} ${t.id}: 칸 ${k}에 "${v}"가 들어가지 않음 (최대 ${LIM[k]}자)`);
    }
    if (!matches(val, t.answers)) bad.push(`${unit} ${t.id}: 칸으로 만든 "${val}"가 정답으로 인정되지 않음`);
  }
  assert.ok(n > 1500, '주관식 수 ' + n);
  assert.deepEqual(bad, []);
});
