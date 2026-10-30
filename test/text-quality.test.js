// 문제은행 전체 글 검사: 2026-10-30 전수 검수에서 찾은 유형이 다시 생기지 않게 합니다.
const test = require('node:test');
const assert = require('node:assert');
const QB = require('../shared/questions.js');

function all() {
  const out = [];
  for (const s of QB.catalog().subjects) for (const cu of s.units) {
    const U = QB.unitById(cu.id); if (!U) continue;
    for (const a of U.areas) {
      for (const q of a.questions || []) out.push({ unit: cu.id, q, texts: [q.text, q.answer, ...(q.wrongs || []), q.hint1, q.hint2, q.explain, q.step] });
      for (const t of a.twins || []) out.push({ unit: cu.id, q: t, texts: [t.text, ...(t.hints || [])] });
    }
  }
  return out;
}

test('다른 단원의 첫 단계 안내가 섞이지 않음 (같은 문항 번호가 여러 단원에 있음)', () => {
  const byId = new Map();
  for (const { unit, q } of all()) if (q.step) { if (!byId.has(q.id)) byId.set(q.id, []); byId.get(q.id).push({ unit, step: q.step, text: q.text }); }
  const bad = [];
  for (const [id, list] of byId) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++)
    if (list[i].step === list[j].step && list[i].text !== list[j].text && /\d/.test(list[i].step)) bad.push(`${id}: ${list[i].unit}와 ${list[j].unit}의 첫 단계가 같음`);
  assert.deepEqual(bad, []);
});

test('조사·서술어 겹침 오류 없음', () => {
  const RULES = [
    [/[요다]예요/, '서술어 뒤에 예요가 겹침 (예: 같아요예요)'],
    [/몫를/, '몫를 → 몫을'],
    [/[ㄱ-ㅎ]예요/, '자음 이름 뒤에는 이에요 (예: ㄴㄱ이에요)'],
    [/\d+\s?[명분일]예요/, '받침 있는 단위 뒤에는 이에요'],
    [/\d+\s?[초]이에요/, '초 뒤에는 예요'],
    [/아니오예요/, '아니요'],
  ];
  const bad = [];
  for (const { unit, q, texts } of all()) for (const t of texts) {
    if (typeof t !== 'string') continue;
    const s = t.replace(/‘[^’]*’예요/g, '');
    for (const [re, why] of RULES) if (re.test(s.replace(/둘 다예요/g, ''))) bad.push(`${unit} ${q.id}: ${why} — ${t.slice(0, 60)}`);
  }
  assert.deepEqual(bad, []);
});

test('주관식 문제의 입력 예시가 정답을 알려 주지 않음', () => {
  const bad = [];
  for (const { unit, q } of all()) {
    if (!q.answers) continue;
    const m = q.text.match(/\(예: ([^)]*)\)/) || q.text.match(/대분수는 ([\d ]+\/\d+)처럼/);
    if (m && q.answers.some(a => m[1].replace(/\s/g, '') === String(a).replace(/\s/g, ''))) bad.push(`${unit} ${q.id}: 예시 "${m[1]}"가 정답과 같음`);
  }
  assert.deepEqual(bad, []);
});

test('첫 힌트(공통 안내)의 예시가 그 문항의 식과 같지 않음', () => {
  const bad = [];
  for (const { unit, q } of all()) {
    if (unit === 'frac' || unit === 'dec') continue; // 6학년 1학기 1·3단원은 문항마다 따로 쓴 첫 단계 힌트(정답은 보이지 않음)
    const h1 = (q.hint1 || (q.hints || [])[0] || '').replace(/ /g, '');
    const t = q.text.replace(/\[\[fig:[^\]]*\]\]/g, '');
    const ex = [...t.matchAll(/\d+(?: \d+\/\d+|\/\d+|\.\d+)? ?[×÷+−] ?\d+(?: \d+\/\d+|\/\d+|\.\d+)?/g), ...t.matchAll(/\d+의 \d+\/\d+/g)].map(m => m[0]);
    for (const e of ex) if (h1.includes(e.replace(/ /g, ''))) bad.push(`${unit} ${q.id}: 첫 힌트에 "${e}"가 그대로 있음`);
  }
  assert.deepEqual(bad, []);
});

test('같은 뜻의 다른 말투도 정답으로 받음', () => {
  const { matches } = require('../shared/engine.js');
  const t = QB.unitById('move4').areas.flatMap(a => a.twins).find(x => x.id === 'fl-t2');
  for (const s of ['같다', '같아요', '같습니다', '같음']) assert.ok(matches(s, t.answers), s);
  assert.ok(!matches('달라요', t.answers));
});
