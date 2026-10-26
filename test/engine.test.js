const test = require('node:test');
const assert = require('node:assert');
const { createEngine, matches, chosung, SMALL, TEAM, MAX_GIFTS } = require('../shared/engine.js');
const QB = require('../shared/questions.js');

function fakeConn() { const c = { ctx: {}, inbox: [], send(o) { c.inbox.push(JSON.parse(JSON.stringify(o))); } }; c.last = t => [...c.inbox].reverse().find(m => m.t === t); return c; }

function setup(n, settings) {
  const pending = [];
  const clock = { t: 1e12 };
  const eng = createEngine({ setTimeout: f => pending.push(f), now: () => clock.t, stuckMs: 60000 });
  const teacher = fakeConn();
  eng.handle(teacher, { t: 'tcreate', settings: Object.assign({ size: 4, stages: 2, perStage: 3, diag: 3 }, settings) });
  const code = teacher.last('troom').code;
  const kids = [];
  for (let i = 1; i <= n; i++) { const c = fakeConn(); eng.handle(c, { t: 'join', code, num: i, name: '학생' + i }); kids.push(c); }
  const flush = () => { while (pending.length) pending.shift()(); };
  const room = eng.rooms.get(code);
  const P = c => room.players.get(c.ctx.pid);
  return { eng, teacher, code, kids, flush, room, P, clock };
}
// 진단평가 → 모둠 → 3·2·1 → 게임
function toPlaying(s, diagRight) {
  s.eng.handle(s.teacher, { t: 'tdiag' });
  s.flush();
  for (const k of s.kids) {
    const p = s.P(k);
    while (!p.diag.done) { const q = p.diag.qs[p.diag.idx]; s.eng.handle(k, { t: 'answer', qid: q.id, choice: diagRight ? q.answer : (q.answer + 1) % 4 }); }
  }
  assert.equal(s.room.phase, 'grouped');
  s.eng.handle(s.teacher, { t: 'tstart' });
  s.flush();
  assert.equal(s.room.phase, 'playing');
}
const cur = (s, k) => { const p = s.P(k); return p.queue[p.qi]; };
const right = (s, k) => { const c = cur(s, k); s.eng.handle(k, { t: 'answer', qid: c.id, choice: c.answer }); };
const wrong = (s, k) => { const c = cur(s, k); const w = [0, 1, 2, 3].find(i => i !== c.answer && c.tried.indexOf(i) < 0 && c.eliminated.indexOf(i) < 0); s.eng.handle(k, { t: 'answer', qid: c.id, choice: w }); };
const finishMine = (s, k) => { for (let i = 0; i < s.room.settings.perStage; i++) right(s, k); };

test('입장 → 교사 대기 명단', () => {
  const s = setup(3);
  assert.equal(s.teacher.last('tstate').players.length, 3);
  assert.equal(s.kids[0].last('state').roster.length, 3);
});

test('같은 번호 다른 이름 막기 / 없는 방 안내', () => {
  const s = setup(1);
  const c = fakeConn(); s.eng.handle(c, { t: 'join', code: s.code, num: 1, name: '다른' });
  assert.ok(c.last('jerror'));
  const d = fakeConn(); s.eng.handle(d, { t: 'join', code: '0000', num: 1, name: '가' });
  assert.match(d.last('jerror').msg, /방을 찾을 수 없어요/);
});

test('레벨 테스트: 정답률로 레벨이 정해지고, 레벨은 학생 화면에 보내지 않는다', () => {
  const s = setup(2);
  s.eng.handle(s.teacher, { t: 'tdiag' }); s.flush();
  const [a, b] = s.kids;
  const pa = s.P(a), pb = s.P(b);
  while (!pa.diag.done) { const q = pa.diag.qs[pa.diag.idx]; s.eng.handle(a, { t: 'answer', qid: q.id, choice: q.answer }); }
  assert.equal(s.room.phase, 'diag', '한 명이 남았으니 아직 진단 중');
  assert.ok(a.last('state').diagDone);
  while (!pb.diag.done) { const q = pb.diag.qs[pb.diag.idx]; s.eng.handle(b, { t: 'answer', qid: q.id, choice: (q.answer + 1) % 4 }); }
  assert.equal(s.room.phase, 'grouped');
  assert.equal(pa.level, 4); assert.equal(pb.level, 1);
  assert.ok(!JSON.stringify(a.last('state')).includes('"level"'), '학생 상태에 레벨이 없어야 함');
  assert.equal(s.teacher.last('tstate').players.find(p => p.pid === pa.pid).level, 4);
});

test('모둠 편성: 레벨이 고르게 섞인다 (8명, 4명 모둠)', () => {
  const s = setup(8);
  s.eng.handle(s.teacher, { t: 'tdiag' }); s.flush();
  s.kids.forEach((k, i) => { const p = s.P(k); while (!p.diag.done) { const q = p.diag.qs[p.diag.idx]; s.eng.handle(k, { t: 'answer', qid: q.id, choice: i < 4 ? q.answer : (q.answer + 1) % 4 }); } });
  assert.equal(s.room.groups.length, 2);
  for (const g of s.room.groups) {
    const lv = g.members.map(pid => s.room.players.get(pid).level);
    assert.ok(lv.includes(4) && lv.includes(1), '모둠마다 잘하는 친구와 어려워하는 친구가 섞여야 함: ' + lv);
  }
});

test('교사가 진단을 기다리지 않고 바로 모둠 편성할 수 있다', () => {
  const s = setup(3);
  s.eng.handle(s.teacher, { t: 'tdiag' }); s.flush();
  s.eng.handle(s.teacher, { t: 'tgroup' });
  assert.equal(s.room.phase, 'grouped');
  assert.ok(s.kids.every(k => k.last('state').group));
});

test('스테이지마다 1인 3문제, 맞힐 때마다 몬스터 체력이 준다', () => {
  const s = setup(2); toPlaying(s, true);
  const g = s.room.groups[0];
  assert.equal(s.P(s.kids[0]).queue.length, 3);
  const hp0 = g.hp;
  right(s, s.kids[0]);
  assert.equal(g.hp, hp0 - SMALL);
  assert.equal(s.kids[1].last('fx').kind, 'hit', '친구 화면에도 데미지가 보임');
  assert.equal(s.kids[0].last('state').play.qi, 1);
});

test('틀리면 1차 힌트 → 2차 AI 힌트 → 3차 해설, 그리고 오답노트에 자동 저장', () => {
  const s = setup(1); toPlaying(s, true);
  const k = s.kids[0];
  wrong(s, k);
  let st = k.last('state');
  assert.equal(st.play.q.steps.length, 1);
  assert.equal(st.notes, 1, '오답노트 자동 저장');
  assert.equal(k.last('result').saved, true);
  wrong(s, k); wrong(s, k);
  st = k.last('state');
  assert.equal(st.play.q.steps.length, 3);
  assert.equal(st.play.q.steps[2], cur(s, k).hints[2]);
  assert.equal(st.notes, 1, '같은 문제는 한 번만 저장');
});

test('레벨 테스트도 3·2·1 뒤에 시작', () => {
  const s = setup(2);
  s.eng.handle(s.teacher, { t: 'tdiag' });
  assert.equal(s.room.phase, 'diagcount');
  assert.ok(!s.kids[0].last('state').diag);
  s.flush();
  assert.equal(s.room.phase, 'diag');
  assert.ok(s.kids[0].last('state').diag);
});

test('학생 화면에는 친구들의 진행 상황을 보내지 않는다 (교사 화면에는 보냄)', () => {
  const s = setup(2); toPlaying(s, true);
  right(s, s.kids[0]); wrong(s, s.kids[1]); wrong(s, s.kids[1]);
  const st = s.kids[1].last('state');
  for (const m of st.group.members) { assert.equal(m.done, undefined); assert.equal(m.stageDone, undefined); assert.equal(m.stuck, undefined); }
  assert.equal(st.group.doneCount, undefined);
  const tm = s.teacher.last('tstate').groups[0].members.find(m => m.pid === s.P(s.kids[1]).pid);
  assert.equal(tm.stuck, true);
});

test('다 풀면 추가 문제: 난이도를 골라서 풀고, 맞히면 힌트를 모둠 힌트 상자에 넣는다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a] = s.kids;
  finishMine(s, a);
  assert.equal(a.last('state').play.twin.state, 'choose');
  s.eng.handle(a, { t: 'twinpick', diff: 3 });
  let tw = s.P(a).twin;
  assert.equal(tw.state, 'open'); assert.equal(tw.diff, 3);
  s.eng.handle(a, { t: 'twin', tid: tw.id, text: '모르겠어요' });
  assert.equal(a.last('state').play.twin.steps.length, 1, '틀리면 힌트 1단계');
  s.eng.handle(a, { t: 'twin', tid: tw.id, text: tw.answers[0] });
  assert.equal(s.P(a).twin.state, 'reward');
  s.eng.handle(a, { t: 'hintpick', kind: 'concept' });
  assert.equal(s.room.groups[0].box.length, 1);
  assert.equal(a.last('state').group.box[0].label, '개념 힌트');
  assert.equal(s.P(a).twin.state, 'choose', '또 풀 수 있음');
});

test('보낼 친구가 없어도 힌트는 상자에 저장된다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  finishMine(s, a);
  s.eng.handle(a, { t: 'twinpick', diff: 1 });
  s.eng.handle(a, { t: 'twin', tid: s.P(a).twin.id, text: s.P(a).twin.answers[0] });
  s.eng.handle(a, { t: 'hintpick', kind: 'step' });
  assert.equal(s.room.groups[0].box.length, 1);
  assert.equal(a.last('state').play.helpWanted, false, 'b는 아직 막히지 않음');
});

test('막힌 친구: 2번 틀리거나 60초가 지나면 스스로 종류를 골라 한 문제에 하나만 쓴다 (자동으로 쓰이지 않음)', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  const g = s.room.groups[0];
  finishMine(s, a);
  for (let i = 0; i < 4; i++) g.box.push({ id: 'x' + i, kind: ['concept', 'step', 'elim', 'concept'][i], from: '학생1', fromPid: s.P(a).pid });
  assert.equal(b.last('state').play.q.canTake, false, '처음엔 혼자 생각할 시간');
  s.eng.handle(b, { t: 'take', kind: 'concept' });
  assert.equal(cur(s, b).gifts.length, 0);
  s.clock.t += 59000; s.eng.handle(b, { t: 'ping' });
  assert.equal(b.last('state').play.q.canTake, false, '59초까지는 혼자 생각');
  s.clock.t += 2000; s.eng.handle(b, { t: 'ping' }); s.eng.handle(a, { t: 'chat', emoji: '👍' });
  assert.equal(b.last('state').play.q.canTake, true, '60초가 지나면 꺼낼 수 있음');
  assert.equal(cur(s, b).gifts.length, 0, '누르기 전에는 자동으로 쓰이지 않음');
  assert.equal(a.last('state').play.helpWanted, true, '다 푼 친구에게는 "기다리는 친구가 있어요"만 보임');
  assert.ok(!JSON.stringify(a.last('state').play).includes(s.P(b).name), '누가 막혔는지 이름은 보내지 않음');
  // 친구가 보내 주는 기능은 없음: give를 보내도 아무 일 없음
  s.eng.handle(a, { t: 'give' });
  assert.equal(cur(s, b).gifts.length, 0);
  // 학생 화면의 상자: 누가 넣었는지 없이 종류별 개수만
  const bx = b.last('state').group;
  assert.ok(!JSON.stringify(bx.box).includes('학생1') && !JSON.stringify(bx.boxKinds).includes('학생1'), '넣은 친구 이름 숨김');
  assert.deepEqual(bx.boxKinds.map(k => [k.kind, k.count]), [['elim', 1], ['concept', 2], ['step', 1]]);
  s.eng.handle(b, { t: 'take', kind: 'concept' });
  assert.equal(cur(s, b).gifts.length, 1);
  assert.equal(cur(s, b).gifts[0].kind, 'concept');
  assert.equal(g.box.filter(x => x.kind === 'concept').length, 1, '같은 종류 중 하나만 씀');
  s.eng.handle(b, { t: 'take', kind: 'step' });
  assert.equal(cur(s, b).gifts.length, MAX_GIFTS, '한 문제에 하나만');
  assert.equal(MAX_GIFTS, 1);
  assert.equal(g.box.length, 3);
});

test('내가 마지막으로 풀어서 합동 공격이 열리면 추가 문제는 나오지 않는다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  finishMine(s, a);
  assert.equal(s.P(a).twin.state, 'choose');
  finishMine(s, b);
  assert.equal(s.P(b).twin, null);
  assert.equal(b.last('state').group.ready, true);
  s.eng.handle(a, { t: 'twinpick', diff: 2 });
  assert.equal(s.P(a).twin.state, 'choose', '공격 가능 상태에서는 추가 문제를 새로 열지 않음');
});

test('B방법: 풀던 추가 문제는 합동 공격이 열려도 끝까지 풀 수 있고, 힌트 상자에 넣을 수 있다', () => {
  const s = setup(2, { stages: 3 }); toPlaying(s, true);
  const [a, b] = s.kids;
  finishMine(s, a);
  s.eng.handle(a, { t: 'twinpick', diff: 1 });
  const tw = s.P(a).twin;
  assert.equal(tw.state, 'open');
  finishMine(s, b);
  assert.equal(a.last('state').group.ready, true);
  assert.equal(a.last('state').play.twin.state, 'open', '합동 공격이 열려도 풀던 문제는 남음');
  s.eng.handle(a, { t: 'twin', tid: tw.id, text: tw.answers[0] });
  assert.equal(s.P(a).twin.state, 'reward');
  s.eng.handle(a, { t: 'hintpick', kind: 'concept' });
  assert.equal(s.room.groups[0].box.length, 1);
  assert.equal(s.P(a).twin, null, '공격 준비 상태라 새 추가 문제는 없음');
});

test('B방법: 공격해서 다음 스테이지로 가도 풀던 추가 문제는 이어지고, 힌트 상자는 새로 시작한다', () => {
  const s = setup(2, { stages: 3 }); toPlaying(s, true);
  const [a, b] = s.kids;
  const g = s.room.groups[0];
  finishMine(s, a);
  s.eng.handle(a, { t: 'twinpick', diff: 2 });
  const tw = s.P(a).twin;
  g.box.push({ id: 'old1', kind: 'step', from: '학생1', fromPid: s.P(a).pid });
  finishMine(s, b);
  s.eng.handle(b, { t: 'attack', stage: 1 });
  assert.equal(g.stage, 2);
  assert.equal(g.box.length, 0, '스테이지마다 힌트 상자는 새로 채움');
  assert.equal(s.P(a).twin.id, tw.id, '풀던 추가 문제가 이어짐');
  assert.equal(s.P(a).stageDone, false, '새 스테이지 내 문제는 새로 받음');
  assert.equal(s.P(b).twin, null);
  finishMine(s, a);
  assert.equal(s.P(a).twin.id, tw.id, '내 문제를 다 풀어도 새 문제로 바뀌지 않음');
  s.eng.handle(a, { t: 'twin', tid: tw.id, text: tw.answers[0] });
  assert.equal(s.P(a).twin.state, 'reward');
  s.eng.handle(a, { t: 'hintpick', kind: 'elim' });
  assert.equal(g.box.length, 1, '이번 스테이지에 새로 넣은 힌트');
  assert.equal(s.P(a).twin.state, 'choose', '이제 새 추가 문제를 고를 수 있음');
  g.box.push({ id: 'new1', kind: 'step', from: '학생1', fromPid: s.P(a).pid });
  // 이번 스테이지 상자 힌트를 막힌 친구가 씀
  wrong(s, b); wrong(s, b);
  s.eng.handle(b, { t: 'take', kind: 'step' });
  assert.equal(cur(s, b).gifts.length, 1);
});

test('새 게임을 시작하면 지난 게임의 추가 문제는 이어지지 않는다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a] = s.kids;
  finishMine(s, a);
  s.eng.handle(a, { t: 'twinpick', diff: 1 });
  assert.equal(s.P(a).twin.state, 'open');
  s.eng.handle(s.teacher, { t: 'tend' });
  s.eng.handle(s.teacher, { t: 'treset' });
  toPlaying(s, true);
  assert.equal(s.room.phase, 'playing');
  assert.equal(s.P(a).stageDone, false);
  assert.equal(s.P(a).twin, null);
});

test('친구 힌트 열림: 틀린 보기 지우기는 1번, 개념·풀이 힌트는 2번 틀리면 열린다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  finishMine(s, a);
  s.room.groups[0].box.push({ id: 'k1', kind: 'concept', from: '학생1', fromPid: s.P(a).pid });
  assert.equal(b.last('state').play.q.canTake, false, '처음엔 혼자 생각');
  wrong(s, b);
  assert.equal(b.last('state').play.q.steps.length, 1, '내 1차 힌트');
  assert.deepEqual(b.last('state').play.q.canKinds, ['elim'], '1번 틀리면 보기 지우기만');
  s.eng.handle(b, { t: 'take', kind: 'concept' });
  assert.equal(cur(s, b).gifts.length, 0, '개념 힌트는 아직 못 씀');
  wrong(s, b);
  assert.deepEqual(b.last('state').play.q.canKinds, ['concept', 'step'], '2번 틀리면 보기 2개라 지우기는 못 쓰고 나머지 둘');
  s.eng.handle(b, { t: 'take', kind: 'concept' });
  assert.equal(cur(s, b).gifts.length, 1);
});

test('귀한 힌트: 1번 틀린 뒤 보기 지우기를 쓰면 오답 하나가 지워지고, 기록에 쓸 때 틀린 횟수가 남는다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  finishMine(s, a);
  s.room.groups[0].box.push({ id: 'e1', kind: 'elim', from: '학생1', fromPid: s.P(a).pid });
  wrong(s, b);
  s.eng.handle(b, { t: 'take', kind: 'elim' });
  const c = cur(s, b);
  assert.equal(c.gifts.length, 1); assert.equal(c.eliminated.length, 1);
  assert.notEqual(c.eliminated[0], c.answer);
  right(s, b);
  s.eng.handle(s.teacher, { t: 'tresearch' });
  const gf = s.teacher.last('tresearch').gifts[0];
  assert.equal(gf.wrongBefore, 1); assert.equal(gf.solved, true);
});

test('스테이지마다 종류별 한도: 보기 지우기 2 · 개념 4 · 풀이 4, 다 차면 다른 종류만, 모두 차면 포인트만', () => {
  const s = setup(2); toPlaying(s, true);
  const [a] = s.kids;
  const g = s.room.groups[0], pa = s.P(a);
  finishMine(s, a);
  const make = kind => { s.eng.handle(a, { t: 'twinpick', diff: 1 }); s.eng.handle(a, { t: 'twin', tid: pa.twin.id, text: pa.twin.answers[0] }); if (pa.twin && pa.twin.state === 'reward') { const al = a.last('state').play.twin.allowed; s.eng.handle(a, { t: 'hintpick', kind: kind || al[0] }); return al; } return null; };
  const seen = [];
  for (let i = 0; i < 10; i++) seen.push(make());
  assert.deepEqual({ ...g.made }, { elim: 2, concept: 4, step: 4 });
  assert.equal(g.box.length, 10);
  assert.ok(seen.slice(6).every(al => al.indexOf('elim') < 0), '보기 지우기 2개가 차면 고를 수 없음');
  const caps = a.last('state').group.boxKinds.map(k => [k.kind, k.made, k.max]);
  assert.deepEqual(caps, [['elim', 2, 2], ['concept', 4, 4], ['step', 4, 4]]);
  assert.equal(a.last('state').group.boxFull, true);
  const before = pa.points;
  assert.equal(make(), null, '모두 차면 힌트 고르기 없음');
  assert.equal(pa.points - before, 10, '포인트만');
});

test('친구 힌트 3종: 틀린 보기 지우기·개념 힌트·풀이 과정 살펴보기 (내 힌트와 겹치지 않음)', () => {
  assert.equal(chosung('국회'), 'ㄱㅎ');
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  const g = s.room.groups[0];
  // 오래 머물러 막힌 경우: 보기가 넉넉하면 틀린 보기 하나를 지움
  s.clock.t += 61000; s.eng.handle(b, { t: 'ping' });
  assert.equal(b.last('state').play.q.elimOk, true);
  g.box.push({ id: 'e1', kind: 'elim', from: '학생1', fromPid: s.P(a).pid });
  s.eng.handle(b, { t: 'take', kind: 'elim' });
  const c = cur(s, b);
  assert.equal(c.eliminated.length, 1);
  assert.notEqual(c.eliminated[0], c.answer);
  assert.equal(c.gifts[0].label, '틀린 보기 지우기');
  // 다음 문제에서 풀이 과정 살펴보기: 문항의 풀이 첫 줄, 내 힌트 3단계와 다름
  s.eng.handle(b, { t: 'answer', qid: c.id, choice: c.answer });
  const c1 = cur(s, b);
  s.clock.t += 61000; s.eng.handle(b, { t: 'ping' });
  g.box.push({ id: 's1', kind: 'step', from: '학생1', fromPid: s.P(a).pid });
  s.eng.handle(b, { t: 'take', kind: 'step' });
  assert.equal(c1.gifts[0].text, c1.step);
  assert.equal(c1.gifts[0].label, '풀이 과정 살펴보기');
  assert.ok(!c1.hints.includes(c1.step));
  // 2번 틀린 뒤(보기 2개 남음): 틀린 보기 지우기는 쓸 수 없고, 상자에서 빠지지도 않음
  const s2 = setup(2); toPlaying(s2, true);
  const [a2, b2] = s2.kids;
  wrong(s2, b2); wrong(s2, b2);
  assert.equal(b2.last('state').play.q.elimOk, false);
  s2.room.groups[0].box.push({ id: 'e2', kind: 'elim', from: '학생1', fromPid: s2.P(a2).pid });
  s2.eng.handle(b2, { t: 'take', kind: 'elim' });
  const c2 = cur(s2, b2);
  assert.equal(c2.eliminated.length, 0, '정답 하나만 남기지 않음');
  assert.equal(c2.gifts.length, 0, '쓰지 못한 힌트는 소모되지 않음');
  assert.equal(s2.room.groups[0].box.length, 1);
});

test('문제 은행: 본 문항 20개 모두 "첫 단계" 힌트가 있고 정답을 그대로 말하지 않는다', () => {
  const u = require('../shared/questions.js').unitById('frac');
  for (const a of u.areas) for (const qq of a.questions) {
    assert.ok(qq.step && qq.step.startsWith('첫 단계'), qq.id);
    assert.ok(![qq.hint1, qq.hint2, qq.explain].includes(qq.step), qq.id + ' 내 힌트와 겹침');
    const ans = qq.answer.replace(/ ?(m|L|kg)$/, '');
    assert.ok(!qq.step.includes('= ' + ans + ' ') && !qq.step.endsWith('= ' + ans), qq.id + ' 정답 노출');
  }
});

test('상점: 기다리는 때·내 문제를 다 푼 뒤에만 열리고, 포인트로 산다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a] = s.kids;
  assert.equal(a.last('state').canShop, false, '문제 푸는 중에는 닫힘');
  s.eng.handle(a, { t: 'buy', id: 'h_cap' });
  assert.equal(s.P(a).owned.length, 0);
  finishMine(s, a);
  const st = a.last('state');
  assert.equal(st.canShop, true);
  assert.ok(st.me.points >= 20);
  s.eng.handle(a, { t: 'buy', id: 'h_cap' });
  assert.ok(s.P(a).owned.includes('h_cap'));
  assert.equal(s.P(a).equip.hat, 'h_cap');
  assert.equal(s.kids[1].last('state').group.members.find(m => !m.me).equip.hat, 'h_cap', '친구 화면에도 꾸민 모습');
});

test('교사: 학생을 고르면 맞은 문제·틀린 문제·결과를 볼 수 있다', () => {
  const s = setup(1); toPlaying(s, true);
  const k = s.kids[0];
  wrong(s, k); right(s, k);
  s.eng.handle(s.teacher, { t: 'tdetail', pid: s.P(k).pid });
  const d = s.teacher.last('tdetail');
  assert.equal(d.records.length, 1); assert.equal(d.records[0].wrong, 1); assert.equal(d.records[0].picks.length, 1);
  assert.equal(d.notes.length, 1); assert.ok(d.notes[0].answer);
  assert.ok(d.result.areas.length);
  right(s, k);
  assert.equal(s.teacher.last('tdetail').records.length, 2, '열어 둔 상세 화면도 실시간 갱신');
});

test('한 명이라도 덜 풀면 합동 공격 불가, 모두 풀면 합동 공격으로 몬스터 처치', () => {
  const s = setup(3); toPlaying(s, true);
  const g = s.room.groups[0];
  const [a, b, c] = s.kids;
  finishMine(s, a); finishMine(s, b);
  right(s, c); right(s, c);
  assert.equal(a.last('state').group.ready, false);
  s.eng.handle(a, { t: 'attack', stage: 1 });
  assert.equal(g.stage, 1); assert.ok(a.last('toast'));
  right(s, c);
  assert.equal(a.last('state').group.ready, true);
  assert.equal(g.hp, TEAM, '작은 공격들로 합동 공격 몫만 남음');
  s.eng.handle(c, { t: 'attack', stage: 1 });
  s.eng.handle(a, { t: 'attack', stage: 1 }); // 동시에 눌러도 한 번만
  assert.equal(g.stage, 2); assert.equal(g.cleared, 1);
  const fx = b.last('fx'); assert.equal(fx.kind, 'team'); assert.ok(fx.next);
  assert.ok(s.kids.every(k => s.P(k).qi === 0 && s.P(k).queue.length === 3), '새 스테이지 문제 3개씩');
});

test('마지막 스테이지(최종 보스)를 깨면 모든 모둠이 끝났을 때 결과 화면', () => {
  const s = setup(2, { stages: 2 }); toPlaying(s, true);
  for (let st = 1; st <= 2; st++) { s.kids.forEach(k => finishMine(s, k)); s.eng.handle(s.kids[0], { t: 'attack', stage: st }); }
  assert.equal(s.room.groups[0].done, true);
  assert.equal(s.kids[0].last('fx').last, true);
  s.flush();
  assert.equal(s.room.phase, 'ended');
  const r = s.kids[0].last('state').result;
  assert.equal(r.cleared, 2);
  assert.ok(r.areas.length >= 1);
});

test('오답노트에서 다시 풀어 맞히면 해결 표시', () => {
  const s = setup(1); toPlaying(s, true);
  const k = s.kids[0];
  wrong(s, k);
  const c = cur(s, k);
  s.eng.handle(k, { t: 'notes' });
  const n = k.last('notes').list[0];
  assert.equal(n.resolved, false);
  assert.equal(n.choices.length, 4);
  s.eng.handle(k, { t: 'note', nid: n.nid, choice: c.answer });
  assert.equal(k.last('notes').list[0].resolved, true);
  assert.equal(k.last('state').notes, 0);
});

test('이모지 반응(줌처럼): 정해진 5개 중 하나만, 프로필에 10초, Freeze 중에는 못 보냄', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  const meIn = (k, who) => k.last('state').group.members.find(m => m.pid === s.P(who).pid);
  s.P(a).chatAt = -9999;
  s.eng.handle(a, { t: 'chat', emoji: '👍' });
  assert.equal(meIn(b, a).react, '👍', '친구 화면의 내 프로필에 보임');
  assert.equal(s.teacher.last('tstate').players.find(p => p.pid === s.P(a).pid).react, '👍', '선생님 화면에도');
  s.clock.t += 1000; s.eng.handle(a, { t: 'chat', emoji: '🤔' });
  assert.equal(meIn(b, a).react, '🤔', '하나만: 새로 고르면 바뀜');
  s.clock.t += 1000; s.eng.handle(a, { t: 'chat', emoji: '안녕' });
  assert.equal(meIn(b, a).react, '🤔', '자유 글자는 안 됨');
  s.clock.t += 1000; s.eng.handle(a, { t: 'chat', emoji: '🤔' });
  assert.equal(meIn(b, a).react, null, '같은 것을 다시 누르면 내림');
  s.clock.t += 1000; s.eng.handle(a, { t: 'chat', emoji: '💪' });
  s.clock.t += 10100; s.eng.handle(b, { t: 'ping' }); s.flush();
  assert.equal(meIn(b, a).react, null, '10초 뒤 사라짐');
  s.eng.handle(s.teacher, { t: 'tfreeze', on: true });
  s.clock.t += 1000; s.eng.handle(a, { t: 'chat', emoji: '👏' });
  assert.equal(meIn(b, a).react, null, 'Freeze 중에는 못 보냄');
});

test('손들기: 들면 친구·선생님 화면에 보이고, 내리면 사라짐 (Freeze 중에는 멈춤)', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  const tp = () => s.teacher.last('tstate').players.find(p => p.pid === s.P(a).pid);
  s.eng.handle(s.teacher, { t: 'tfreeze', on: true });
  s.eng.handle(a, { t: 'hand', up: true });
  assert.equal(tp().hand, false, 'Freeze 중에는 못 함');
  s.eng.handle(s.teacher, { t: 'tfreeze', on: false });
  s.eng.handle(a, { t: 'hand', up: true });
  assert.equal(tp().hand, true);
  assert.equal(s.teacher.last('tstate').groups[0].members.find(m => m.pid === s.P(a).pid).hand, true);
  assert.equal(b.last('state').group.members.find(m => m.pid === s.P(a).pid).hand, true);
  s.eng.handle(a, { t: 'hand', up: false });
  assert.equal(tp().hand, false);
  s.eng.handle(a, { t: 'hand', up: true });
  s.eng.handle(s.teacher, { t: 'tend' }); s.eng.handle(s.teacher, { t: 'treset' });
  assert.equal(tp().hand, false, '새 수업이면 손을 내림');
});

test('스테이지마다 몬스터 모습이 진화한다 (새끼 → 성장 → 최종 보스)', () => {
  const s = setup(2, { stages: 4 }); toPlaying(s, true);
  const g = s.room.groups[0];
  const forms = [];
  for (let st = 1; st <= 4; st++) {
    forms.push(s.kids[0].last('state').group.monster.form);
    for (const k of s.kids) finishMine(s, k);
    s.eng.handle(s.kids[0], { t: 'attack', stage: g.stage });
  }
  assert.deepEqual(forms, [1, 2, 2, 3]);
});

test('추가 문제 답 칸 모양: 대분수는 3칸, 분수는 2칸, 단위가 붙어도 숫자 칸', () => {
  const { fmtOf } = require('../shared/engine.js');
  assert.deepEqual(['2/7', '2 3/5', '4/9 L', '2/9 m²', '1 1/4', '국회'].map(fmtOf), ['frac', 'mixed', 'frac', 'frac', 'mixed', 'text']);
  const u = require('../shared/questions.js').unitById('frac');
  for (const a of u.areas) for (const tw of a.twins) {
    const f = fmtOf(tw.answers[0]);
    assert.ok(f === 'frac' || f === 'mixed', tw.id + ' 숫자 칸으로 답할 수 있어야 함');
    const v = tw.answers[0].replace(/\s*[a-zA-Z²]+$/, '');
    assert.ok(matches(v, tw.answers), tw.id + ' 칸 답이 정답으로 인정');
  }
  const s = setup(2); toPlaying(s, true);
  const [a] = s.kids; finishMine(s, a);
  s.eng.handle(a, { t: 'twinpick', diff: 1 });
  assert.ok(['frac', 'mixed'].includes(a.last('state').play.twin.fmt));
});

test('추가 문제를 모르겠으면 오답노트에 저장하고 나간다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a] = s.kids;
  finishMine(s, a);
  s.eng.handle(a, { t: 'twinpick', diff: 2 });
  const tw = s.P(a).twin;
  s.eng.handle(a, { t: 'twinskip' });
  assert.equal(s.P(a).twin.state, 'choose', '다시 고를 수 있음');
  const n = s.P(a).notes.find(x => x.key === 't:' + tw.tid);
  assert.ok(n && !n.resolved, '오답노트에 저장');
  s.eng.handle(a, { t: 'notes' });
  assert.ok(['frac', 'mixed'].includes(a.last('notes').list.find(x => x.nid === n.nid).fmt));
  s.eng.handle(a, { t: 'note', nid: n.nid, text: tw.answers[0] });
  assert.ok(n.resolved, '오답노트에서 다시 풀어 해결');
});

test('힌트 종류 골고루: 3종류를 한 번씩 만들어야 같은 종류를 다시 만들 수 있다', () => {
  const s = setup(2, { stages: 3 }); toPlaying(s, true);
  const [a] = s.kids;
  const g = s.room.groups[0];
  finishMine(s, a);
  const earn = () => { s.eng.handle(a, { t: 'twinpick', diff: 1 }); s.eng.handle(a, { t: 'twin', tid: s.P(a).twin.id, text: s.P(a).twin.answers[0] }); };
  earn();
  assert.deepEqual(a.last('state').play.twin.allowed, ['elim', 'concept', 'step']);
  s.eng.handle(a, { t: 'hintpick', kind: 'concept' });
  earn();
  assert.deepEqual(a.last('state').play.twin.allowed, ['elim', 'step']);
  s.eng.handle(a, { t: 'hintpick', kind: 'concept' });
  assert.equal(g.box.length, 1, '같은 종류는 아직 안 됨');
  assert.equal(s.P(a).twin.state, 'reward', '다시 고를 수 있게 그대로');
  s.eng.handle(a, { t: 'hintpick', kind: 'step' });
  earn(); s.eng.handle(a, { t: 'hintpick', kind: 'elim' });
  earn();
  assert.deepEqual(a.last('state').play.twin.allowed, ['elim', 'concept', 'step'], '한 바퀴 돌면 다시 모두 열림');
  assert.deepEqual(g.box.map(b => b.kind).sort(), ['concept', 'elim', 'step']);
});

test('선생님이 학생 손을 내려 줄 수 있다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  s.eng.handle(a, { t: 'hand', up: true });
  assert.equal(b.last('state').group.members.find(m => m.pid === s.P(a).pid).hand, true);
  s.eng.handle(s.teacher, { t: 'tlower', pid: s.P(a).pid });
  assert.equal(s.P(a).hand, false);
  assert.equal(b.last('state').group.members.find(m => m.pid === s.P(a).pid).hand, false, '친구 화면에서도 내려감');
  assert.equal(a.last('state').group.members.find(m => m.me).hand, false, '내 화면 버튼도 손들기로');
});

test('게임이 끝난 뒤 처음 화면으로 나가면 더 이상 리포트(상태)를 보내지 않는다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a, b] = s.kids;
  const pa = s.P(a);
  s.eng.handle(a, { t: 'leave' });
  assert.ok(pa.online, '게임 중에는 나가기 무시');
  s.eng.handle(s.teacher, { t: 'tend' });
  s.eng.handle(a, { t: 'leave' });
  const n = a.inbox.length;
  s.eng.handle(b, { t: 'chat', emoji: '👍' }); s.eng.handle(s.teacher, { t: 'tdetail', pid: null });
  assert.equal(a.inbox.length, n, '나간 화면에는 아무것도 안 감');
  assert.equal(pa.online, false);
  // 같은 화면에서 새 방에 다시 들어갈 수 있음
  s.eng.handle(a, { t: 'join', code: s.room.code, num: 99, name: '새로' });
  assert.ok(a.last('joined') || a.last('jerror'), '다시 들어가기 응답');
});

test('모둠 인원: 설정 n명이면 모든 모둠이 n-1 ~ n+1명', () => {
  const sizes = (n, size) => { const s = setup(n, { size }); toPlaying(s, true); return s.room.groups.map(g => g.members.length).sort((a, b) => a - b); };
  assert.deepEqual(sizes(11, 5), [5, 6]);
  assert.deepEqual(sizes(14, 5), [4, 5, 5]);
  assert.deepEqual(sizes(9, 4), [4, 5]);
  assert.deepEqual(sizes(13, 4), [4, 4, 5]);
  assert.deepEqual(sizes(6, 5), [6]);
  for (const [n, size] of [[23, 5], [27, 4], [30, 6], [17, 3], [25, 5]]) for (const k of sizes(n, size)) assert.ok(Math.abs(k - size) <= 1, `${n}명 ${size}명 모둠: ${k}명`);
});

test('대기실(레벨 테스트 전)에서도 상점을 쓸 수 있고, 아이템이 늘었다', () => {
  const s = setup(1);
  const k = s.kids[0];
  assert.equal(s.room.phase, 'lobby');
  assert.equal(k.last('state').canShop, true);
  const { CATALOG } = require('../shared/engine.js');
  assert.ok(CATALOG.length >= 45, '아이템 수 ' + CATALOG.length);
  assert.ok(!CATALOG.some(i => i.slot === 'cape'), '망토 없음');
  s.P(k).points = 100;
  s.eng.handle(k, { t: 'buy', id: 'h_ribbon' });
  assert.ok(s.P(k).owned.includes('h_ribbon'));
});

test('힌트 상자(10개)가 가득 차도 추가 문제는 계속 풀고, 맞히면 포인트(10점)만 받는다', () => {
  const s = setup(2); toPlaying(s, true);
  const [a] = s.kids;
  const g = s.room.groups[0];
  finishMine(s, a);
  for (let i = 0; i < 10; i++) g.box.push({ id: 'f' + i, kind: 'concept', from: 'x', fromPid: 'x' });
  assert.equal(a.last('state').group.boxMax, 10);
  s.eng.handle(a, { t: 'twinpick', diff: 1 });
  assert.equal(s.P(a).twin.state, 'open', '가득 차도 추가 문제를 풀 수 있음');
  const before = s.P(a).points, extra = s.P(a).stats.extra;
  s.eng.handle(a, { t: 'twin', tid: s.P(a).twin.id, text: s.P(a).twin.answers[0] });
  assert.equal(s.P(a).points - before, 10, '10점만');
  assert.equal(s.P(a).stats.extra, extra + 1, '추가 문제 기록은 남음');
  assert.equal(s.P(a).twin.state, 'choose', '힌트 고르기 없이 다음 추가 문제로');
  assert.equal(g.box.length, 10);
  // 힌트를 얻은 뒤 그사이 상자가 가득 찬 경우: 넣지 않고 다음으로
  g.box.length = 9;
  s.eng.handle(a, { t: 'twinpick', diff: 1 });
  s.eng.handle(a, { t: 'twin', tid: s.P(a).twin.id, text: s.P(a).twin.answers[0] });
  assert.equal(s.P(a).twin.state, 'reward');
  g.box.push({ id: 'z', kind: 'elim', from: 'x', fromPid: 'x' });
  const pts = s.P(a).points;
  s.eng.handle(a, { t: 'hintpick', kind: 'step' });
  assert.equal(g.box.length, 10); assert.equal(s.P(a).points, pts, '추가 점수 없음');
  assert.equal(s.P(a).twin.state, 'choose');
});

test('우리 모둠이 최종 보스를 물리치면 다른 모둠이 싸우는 중이어도 내 리포트를 받는다', () => {
  const s = setup(4, { size: 2, stages: 1 }); toPlaying(s, true);
  assert.equal(s.room.groups.length, 2);
  const g1 = s.room.groups[0];
  const mine = s.kids.filter(k => s.P(k).group === g1.id), other = s.kids.find(k => s.P(k).group !== g1.id);
  for (const k of mine) finishMine(s, k);
  s.eng.handle(mine[0], { t: 'attack', stage: 1 });
  assert.equal(g1.done, true);
  assert.equal(s.room.phase, 'playing', '다른 모둠은 계속');
  assert.ok(mine[0].last('state').result && mine[0].last('state').result.areas.length, '내 리포트');
  assert.equal(other.last('state').result, undefined);
  const pm = s.P(mine[0]);
  s.eng.handle(mine[0], { t: 'leave' });
  assert.equal(pm.online, false, '리포트를 다 보고 처음 화면으로 나갈 수 있음');
});

test('Freeze 중에는 답·공격·선물 불가', () => {
  const s = setup(1); toPlaying(s, true);
  s.eng.handle(s.teacher, { t: 'tfreeze', on: true });
  const k = s.kids[0];
  right(s, k);
  assert.equal(s.P(k).qi, 0);
  assert.equal(k.last('state').frozen, true);
});

test('연결 끊긴 친구는 공격 조건에서 빠지고, 다시 오면 같은 모둠', () => {
  const s = setup(3); toPlaying(s, true);
  const [a, b, c] = s.kids;
  finishMine(s, a); finishMine(s, b);
  const pidC = s.P(c).pid, g = s.room.groups[0];
  s.eng.disconnect(c);
  assert.equal(a.last('state').group.ready, true);
  const again = fakeConn(); s.eng.handle(again, { t: 'rejoin', code: s.code, pid: pidC });
  assert.equal(s.room.players.get(pidC).group, g.id);
  assert.equal(a.last('state').group.ready, false);
});

test('늦게 들어온 학생: 진단 중이면 진단부터, 게임 중이면 모둠에 바로', () => {
  const s = setup(2);
  s.eng.handle(s.teacher, { t: 'tdiag' }); s.flush();
  const late = fakeConn(); s.eng.handle(late, { t: 'join', code: s.code, num: 9, name: '늦음' });
  assert.ok(late.last('state').diag);
  const s2 = setup(4); toPlaying(s2, true);
  const late2 = fakeConn(); s2.eng.handle(late2, { t: 'join', code: s2.code, num: 9, name: '늦음' });
  const st = late2.last('state');
  assert.ok(st.group && st.play && st.play.q);
});

test('학생은 교사 명령을 보낼 수 없다 / 교사 새로고침 복귀', () => {
  const s = setup(2);
  s.eng.handle(s.kids[0], { t: 'tdiag' });
  assert.equal(s.room.phase, 'lobby');
  const t2 = fakeConn(); s.eng.handle(t2, { t: 'tresume', code: s.code, key: s.teacher.last('troom').key });
  assert.equal(t2.last('tstate').players.length, 2);
});

test('설정: 준비 중인 과목·단원은 고를 수 없고, 숫자는 범위 안으로', () => {
  const s = setup(0);
  s.eng.handle(s.teacher, { t: 'tsettings', settings: Object.assign({}, s.room.settings, { subject: 'social', unit: 'democ', size: 99, stages: 0 }) });
  const st = s.room.settings;
  assert.equal(st.subject, 'math'); assert.equal(st.unit, 'frac');
  assert.equal(st.size, 4); assert.equal(st.stages, 2, '범위 밖 값은 무시');
  for (const unit of ['prism', 'dec', 'ratio', 'graph', 'cube']) { s.eng.handle(s.teacher, { t: 'tsettings', settings: Object.assign({}, s.room.settings, { unit }) }); assert.equal(s.room.settings.unit, unit, unit + ' 고를 수 있음'); }
});

test('난이도 자동: 레벨 1은 쉬운 문제, 레벨 4는 어려운 문제', () => {
  const s = setup(2, { diff: 'auto' }); toPlaying(s, false);
  const p = s.P(s.kids[0]);
  assert.equal(p.level, 1);
  assert.ok(p.queue.every(q => q.diff === 1), '레벨1 → 하');
  const s2 = setup(1, { diff: 'auto' }); toPlaying(s2, true);
  assert.ok(s2.P(s2.kids[0]).queue.every(q => q.diff === 3), '레벨4 → 상');
});

test('보기 순서가 섞여 정답 위치가 고르게 나온다', () => {
  const s = setup(1); toPlaying(s, true);
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 300; i++) { s.eng.handle(s.teacher, { t: 'tend' }); s.eng.handle(s.teacher, { t: 'treset' }); toPlaying(s, true); counts[cur(s, s.kids[0]).answer]++; }
  assert.ok(counts.every(n => n > 45), String(counts));
});

// ───── 문제 은행 검사 (준비된 단원) ─────
const { numVal } = require('../shared/engine.js');
const READY = QB.subjects.flatMap(sj => sj.units.filter(u => u.ready));

test('1단원: 문항 40개, 평가요소 4개 × 10문항, 추가 문제 4 × 8개, 난이도 하·중·상 모두, 성취기준·평가기준·제안 문구', () => {
  const u = QB.unitById('frac');
  assert.equal(u.areas.length, 4);
  assert.equal(u.areas.reduce((n, a) => n + a.questions.length, 0), 40);
  const codes = u.standards.map(x => x.code);
  for (const a of u.areas) {
    assert.equal(a.questions.length, 10, a.id);
    assert.equal(a.twins.length, 8, a.id);
    assert.ok(codes.includes(a.std), a.id + ' 성취기준 연결');
    for (const k of ['high', 'mid', 'low']) { assert.ok(a.criteria[k] && a.student[k] && a.teacher[k], `${a.id} ${k}`); }
    for (const d of [1, 2, 3]) { assert.ok(a.questions.some(q => q.diff === d), `${a.id} 난이도 ${d}`); assert.ok(a.twins.some(t => t.diff === d), `${a.id} 추가 문제 난이도 ${d}`); }
  }
});

test('1단원: 보기 중복 없음, 오답마다 실수 유형이 있고 사전에 있음, 힌트 3단계', () => {
  const u = QB.unitById('frac');
  for (const a of u.areas) for (const q of a.questions) {
    assert.equal(q.wrongs.length, 3, q.id);
    assert.equal(new Set([q.answer, ...q.wrongs]).size, 4, q.id + ' 보기 중복');
    assert.equal(q.mis.length, 3, q.id);
    for (const k of q.mis) assert.ok(u.mistakes[k], `${q.id}: 실수 유형 ${k} 없음`);
    assert.ok(q.hint1 && q.hint2 && q.explain, q.id);
  }
});

// 정답을 식에서 직접 계산해 확인 (문장제는 식을 따로 적음)
const frac = s => { const v = numVal(s); assert.ok(v != null, '숫자로 읽을 수 없음: ' + s); return v; };
const WORD = { 'nat-5': 5 / 3, 'nat-9': 7 / 2, 'nat-10': 3, 'fd-4': (12 / 13) / 4, 'fd-5': (3 / 11) * 4, 'fd-10': (15 / 16) / 5, 'fm-5': (3 / 4) / 5, 'fm-10': (3 / 7) / 2, 'mx-5': (9 / 4) / 3, 'mx-10': (18 / 5) / 6 };
test('1단원: 정답이 실제 계산과 맞고, 정답과 같은 크기의 오답이 없다', () => {
  const u = QB.unitById('frac');
  let checked = 0;
  for (const a of u.areas) for (const q of a.questions) {
    let expect = WORD[q.id];
    const m = q.text.match(/^(?:(\d+) )?(\d+)(?:\/(\d+))? ÷ (\d+)(?: = \?|의 몫을 대분수로 나타내면\?)$/);
    if (m) expect = ((m[1] ? +m[1] : 0) + (m[3] ? m[2] / m[3] : +m[2])) / m[4];
    if (expect == null) continue; // 식 바꾸기·첫 단계 문항은 아래에서 따로
    checked++;
    assert.ok(Math.abs(frac(q.answer) - expect) < 1e-9, `${q.id}: ${q.text} 정답 ${q.answer} ≠ ${expect}`);
    for (const w of q.wrongs) { const wv = numVal(w); if (wv != null) assert.ok(Math.abs(wv - expect) > 1e-9, `${q.id}: 오답 ${w} 이(가) 정답과 같은 크기`); }
  }
  assert.ok(checked >= 38, '계산 확인한 문항 수 ' + checked);
  const fm1 = u.areas.find(a => a.id === 'fmul').questions.find(q => q.id === 'fm-1');
  assert.equal(fm1.answer, '4/7 × 1/3');
  const mx4 = u.areas.find(a => a.id === 'mixed').questions.find(q => q.id === 'mx-4');
  assert.match(mx4.answer, /8\/5/); // 1 3/5 = 8/5
});

test('1단원 추가 문제: 정답이 계산과 맞고, 크기가 같은 분수도 정답으로 인정', () => {
  const T = { 'nat-t1': 2 / 7, 'nat-t2': 13 / 5, 'nat-t3': 4 / 9, 'fd-t1': 3 / 11, 'fd-t2': 2 / 13, 'fd-t3': 6 / 7, 'fm-t1': 3 / 8, 'fm-t2': 5 / 21, 'fm-t3': 2 / 9, 'mx-t1': 2 / 3, 'mx-t2': 1 / 2, 'mx-t3': 5 / 4,
    'nat-t4': 3 / 8, 'nat-t5': 4 / 7, 'nat-t6': 17 / 6, 'nat-t7': 10 / 3, 'nat-t8': 8 / 5,
    'fd-t4': (4 / 9) / 2, 'fd-t5': (6 / 13) / 3, 'fd-t6': (14 / 15) / 7, 'fd-t7': (15 / 8) / 5, 'fd-t8': (5 / 9) * 2,
    'fm-t4': (1 / 3) / 4, 'fm-t5': (2 / 5) / 3, 'fm-t6': (5 / 8) / 3, 'fm-t7': (3 / 10) / 4, 'fm-t8': (4 / 9) / 6,
    'mx-t4': (6 / 5) / 3, 'mx-t5': (7 / 3) / 7, 'mx-t6': (24 / 7) / 6, 'mx-t7': (16 / 3) / 4, 'mx-t8': (14 / 3) / 7 };
  const u = QB.unitById('frac');
  for (const a of u.areas) for (const t of a.twins) {
    assert.ok(T[t.id] != null, t.id);
    for (const ans of t.answers) assert.ok(Math.abs(frac(ans) - T[t.id]) < 1e-9, `${t.id}: ${ans}`);
    assert.equal(t.hints.length, 3);
  }
  assert.ok(matches('4/6', ['2/3'])); assert.ok(matches('5/4', ['1 1/4'])); assert.ok(!matches('23/4', ['2 3/4']));
});

test('1단원: 본 문항과 추가 문제 사이에 같은 식(숫자 조합)이 없다', () => {
  const u = QB.unitById('frac');
  const key = txt => (txt.match(/\d+ \d+\/\d+|\d+\/\d+|\d+/g) || []).join('|');
  const seen = new Map();
  for (const a of u.areas) for (const it of [...a.questions, ...a.twins]) {
    const k = a.id + ':' + key(it.text);
    assert.ok(!seen.has(k), `${it.id} 와 ${seen.get(k)} 가 같은 식`);
    seen.set(k, it.id);
  }
  assert.equal(seen.size, 72);
});

test('주관식 답 비교: 띄어쓰기·단위 허용', () => {
  assert.ok(matches('삼권분립', ['삼권 분립']));
  assert.ok(matches(' 2 3/4 ', ['2 3/4']));
  assert.ok(matches('4/9 L', ['4/9']));
  assert.ok(matches('45 %', ['45%']));
  assert.ok(!matches('', ['국회']));
});

test('리포트: 평가요소별 수준(상·중·하·확인 필요)과 평가기준, 실수 유형', () => {
  const s = setup(1, { stages: 1, perStage: 5, area: 'nat', diff: 3 }); toPlaying(s, true);
  const k = s.kids[0];
  // 첫 문제 두 번 틀리고, 나머지는 한 번에
  wrong(s, k); wrong(s, k); right(s, k);
  for (let i = 0; i < 4; i++) right(s, k);
  s.eng.handle(s.teacher, { t: 'tend' });
  const r = k.last('state').result;
  const nat = r.areas.find(a => a.area === 'nat');
  assert.equal(nat.count, 5);
  const dg = s.P(k).diag.results.filter(d => d.area === 'nat');
  assert.equal(nat.diagN, dg.length, '레벨 테스트 문항도 근거에 들어감');
  assert.equal(nat.rate, Math.round((0.3 + 4 + dg.filter(d => d.ok).length) / (5 + dg.length) * 100));
  assert.ok(['high', 'mid'].includes(nat.level));
  assert.ok(nat.criterion && nat.studentTip && nat.teacherTip);
  assert.ok(nat.mistakes.length >= 1 && nat.mistakes[0].student, '자주 보인 실수');
  assert.deepEqual(r.standards.map(x => x.code), ['[6수01-10]', '[6수01-11]']);
  assert.ok(r.growth.diag != null && r.growth.game != null);
  const lv = s.teacher.last('tstate').players[0].levels;
  assert.equal(lv.nat, nat.level);
});

test('리포트: 문항이 1개뿐이면 수준을 정하지 않고 확인 필요', () => {
  const s = setup(1, { stages: 1, perStage: 1, area: 'mixed' }); toPlaying(s, true);
  s.P(s.kids[0]).diag.results = []; // 레벨 테스트 근거 없이 게임 1문제만
  right(s, s.kids[0]);
  s.eng.handle(s.teacher, { t: 'tend' });
  assert.equal(s.kids[0].last('state').result.areas[0].level, 'na');
});

test('리포트: 레벨 테스트에서 틀린 평가요소는 근거로 남는다', () => {
  const s = setup(1, { stages: 1, perStage: 1, area: 'mixed', diag: 4 });
  const k = s.kids[0];
  s.eng.handle(s.teacher, { t: 'tdiag' }); s.flush();
  const p = s.P(k);
  p.diag.qs.forEach(q => { const c = q.answer === 0 ? 1 : 0; s.eng.handle(k, { t: 'answer', qid: q.id, choice: c }); });
  assert.ok(p.diag.results.every(d => d.ok === false));
  assert.ok(p.diag.results.some(d => d.mis), '오류 유형이 기록됨');
});

test('레벨 테스트는 평가요소를 고르게 묻는다', () => {
  const s = setup(1, { diag: 4 });
  s.eng.handle(s.teacher, { t: 'tdiag' }); s.flush();
  const areas = new Set(s.P(s.kids[0]).diag.qs.map(q => q.area));
  assert.equal(areas.size, 4);
});

test('협력 리포트: 힌트 주고받기·완료 격차·손들기·Freeze가 기록되고, 설문은 조건에 맞게 한 번만 받는다', () => {
  const s = setup(2, { stages: 1 }); toPlaying(s, true);
  const [a, b] = s.kids;
  const pa = s.P(a), pb = s.P(b);
  s.eng.handle(s.teacher, { t: 'tresearch' });
  assert.equal(s.teacher.last('tresearch').empty, false);
  // a가 다 풀고 힌트를 만듦
  finishMine(s, a);
  s.eng.handle(a, { t: 'twinpick', diff: 1 });
  s.eng.handle(a, { t: 'twin', tid: pa.twin.id, text: pa.twin.answers[0] });
  s.eng.handle(a, { t: 'hintpick', kind: 'concept' });
  // b가 손들고, 선생님이 내려 주고, Freeze 10초
  s.eng.handle(b, { t: 'hand', up: true }); s.clock.t += 5000;
  s.eng.handle(s.teacher, { t: 'tlower', pid: pb.pid });
  s.eng.handle(s.teacher, { t: 'tfreeze', on: true }); s.clock.t += 10000; s.eng.handle(s.teacher, { t: 'tfreeze', on: false });
  // b가 2번 틀리고 친구 힌트를 받아 해결
  wrong(s, b); wrong(s, b);
  s.eng.handle(b, { t: 'take', kind: 'concept' });
  assert.equal(cur(s, b).gifts.length, 1);
  s.clock.t += 3000; right(s, b);
  for (let i = 1; i < s.room.settings.perStage; i++) right(s, b);
  s.eng.handle(a, { t: 'attack', stage: 1 }); s.flush();
  assert.equal(s.room.groups[0].done, true);
  s.eng.handle(s.teacher, { t: 'tresearch' });
  const R = s.teacher.last('tresearch');
  assert.equal(R.gifts.length, 1);
  const gf = R.gifts[0];
  assert.equal(gf.fromNum, 1); assert.equal(gf.toNum, 2); assert.match(gf.kind, /개념/); assert.equal(gf.solved, true);
  assert.equal(gf.wrongAfter, 0);
  assert.equal(R.summary.hintsMade, 1); assert.equal(R.summary.hintsUsed, 1); assert.equal(R.summary.hintSolvedRate, 100);
  assert.equal(R.summary.hands, 1); assert.equal(R.summary.lowered, 1);
  assert.equal(R.summary.freezes, 1); assert.equal(R.summary.frozenSec, 10);
  assert.equal(R.summary.allSolveRate, 100);
  assert.ok(R.groups[0].avgGapSec >= 18, '먼저 끝낸 a와 마지막 b 사이 시간');
  const sa = R.students.find(x => x.num === 1), sb = R.students.find(x => x.num === 2);
  assert.equal(sa.hintsMade, 1); assert.equal(sa.hintsUsedByFriends, 1);
  assert.equal(sb.hintsGot, 1); assert.equal(sb.hintsGotSolved, 1); assert.equal(sb.wrong, 2);
  assert.equal(sb.solved, s.room.settings.perStage); assert.equal(sb.firstTry, s.room.settings.perStage - 1);
  // 설문: a는 힌트를 만들었으니 q2·q3, b는 힌트를 받았으니 q1
  const qa = a.last('state').survey, qb = b.last('state').survey;
  assert.deepEqual(qa.qs.map(q => q.id), ['q2', 'q3', 'q4', 'q5']);
  assert.deepEqual(qb.qs.map(q => q.id), ['q1', 'q4', 'q5']);
  s.eng.handle(b, { t: 'survey', answers: { q1: 2, q4: 1, q5: 2, q2: 9 } });
  s.eng.handle(b, { t: 'survey', answers: { q1: 0, q4: 0, q5: 0 } });
  assert.equal(b.last('state').survey.done, true);
  s.eng.handle(s.teacher, { t: 'tresearch' });
  const R2 = s.teacher.last('tresearch');
  const sb2 = R2.students.find(x => x.num === 2);
  assert.deepEqual(sb2.survey, { q1: 2, q2: null, q3: null, q4: 1, q5: 2 }, '처음 답만, 받지 않은 문항은 비움');
  assert.equal(R2.survey.find(q => q.id === 'q1').yes, 1);
  // 다시 하기로 대기실에 가도 지난 게임 리포트를 볼 수 있다
  s.eng.handle(s.teacher, { t: 'tend' });
  s.eng.handle(s.teacher, { t: 'treset' });
  s.eng.handle(s.teacher, { t: 'tresearch' });
  const R3 = s.teacher.last('tresearch');
  assert.equal(R3.previous, true); assert.equal(R3.gifts.length, 1);
});

test('협력 리포트: 게임 중에도 모든 표 항목이 들어 있다', () => {
  const s = setup(2); toPlaying(s, true);
  s.eng.handle(s.teacher, { t: 'tresearch' });
  const R = s.teacher.last('tresearch');
  for (const k of ['meta', 'summary', 'bands', 'groups', 'students', 'gifts', 'survey', 'areaNames']) assert.ok(k in R, k);
  assert.equal(R.bands.length, 2);
  assert.equal(R.survey.length, 5);
});

test('가상 친구: 대기실에서만 넣을 수 있고, 레벨이 고르게 나오며, 스스로 끝까지 풀고, 협력 리포트에서는 빠진다', () => {
  const s = setup(1, { stages: 2, perStage: 2, size: 3 });
  s.eng.handle(s.kids[0], { t: 'tbots', n: 3 });
  assert.equal(s.room.players.size, 1, '학생은 가상 친구를 넣을 수 없음');
  s.eng.handle(s.teacher, { t: 'tbots', n: 5 });
  const bots = [...s.room.players.values()].filter(p => p.bot);
  assert.equal(bots.length, 5);
  assert.ok(bots.every(p => p.name.startsWith('🤖 ') && p.online && p.num > 40), '🤖 표시, 높은 번호');
  const k = s.kids[0], me = s.P(k);
  s.eng.handle(s.teacher, { t: 'tdiag' }); s.flush();
  const tick = n => { for (let i = 0; i < n; i++) { s.clock.t += 1000; s.eng.botTick(); s.flush(); } };
  while (!me.diag.done) { const q = me.diag.qs[me.diag.idx]; s.eng.handle(k, { t: 'answer', qid: q.id, choice: q.answer }); }
  for (let i = 0; i < 600 && s.room.phase === 'diag'; i++) tick(1);
  assert.equal(s.room.phase, 'grouped', '가상 친구도 레벨 테스트를 끝냄');
  s.eng.handle(s.teacher, { t: 'tbots', n: 2 });
  assert.equal([...s.room.players.values()].filter(p => p.bot).length, 5, '대기실이 아니면 더 넣지 않음');
  s.eng.handle(s.teacher, { t: 'tstart' }); s.flush();
  for (let i = 0; i < 3000 && !s.room.groups.every(g => g.done); i++) {
    tick(1);
    const c = cur(s, k);
    if (c && !me.stageDone && i % 20 === 0) right(s, k);
    const g = s.room.groups.find(x => x.id === me.group);
    if (k.last('state').group && k.last('state').group.ready && i % 5 === 0) s.eng.handle(k, { t: 'attack', stage: g.stage });
    s.flush();
  }
  assert.ok(s.room.groups.every(g => g.done), '모든 모둠이 최종 보스까지');
  const made = bots.reduce((a, p) => a + Object.values(p.made || {}).reduce((x, y) => x + y, 0), 0);
  assert.ok(made > 0, '가상 친구도 힌트를 만듦');
  s.eng.handle(s.teacher, { t: 'tresearch' });
  const R = s.teacher.last('tresearch');
  assert.equal(R.students.length, 1, '리포트에는 실제 학생만');
  assert.equal(R.summary.bots, 5);
  assert.ok(R.gifts.every(e => e.toNum === 1), '가상 친구가 받은 힌트는 빠짐');
  assert.ok(R.groups.reduce((a, g) => a + g.bots, 0) === 5);
});

test('가상 친구: 게임 중에는 실제 레벨에 맞춰 풀고(레벨 4가 가장 빠름), 선생님이 이번 스테이지를 한 번에 완료시킬 수 있다', () => {
  // 우연에 따라 결과가 흔들리지 않게, 정해진 난수로 가상 친구 16명을 돌려 레벨별 평균을 비교
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pending = [], clock = { t: 1e12 };
  const eng = createEngine({ setTimeout: f => pending.push(f), now: () => clock.t, stuckMs: 60000, random: rnd });
  const T = fakeConn(); eng.handle(T, { t: 'tcreate', settings: { size: 4, stages: 2, perStage: 3, diag: 4 } });
  const room = eng.rooms.get(T.last('troom').code), fl = () => { while (pending.length) pending.shift()(); };
  eng.handle(T, { t: 'tbots', n: 16 }); eng.handle(T, { t: 'tdiag' }); fl();
  const tick = () => { clock.t += 1000; eng.botTick(); fl(); };
  for (let i = 0; i < 900 && room.phase === 'diag'; i++) tick();
  eng.handle(T, { t: 'tstart' }); fl();
  const bots = [...room.players.values()];
  const doneAt = new Map();
  for (let i = 1; i <= 600 && doneAt.size < bots.length; i++) { tick(); for (const p of bots) if (p.stageDone && !doneAt.has(p.pid)) doneAt.set(p.pid, i); }
  const avgBy = lvs => { const v = bots.filter(p => lvs.includes(p.level) && doneAt.has(p.pid)).map(p => doneAt.get(p.pid)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const lo = avgBy([1, 2]), hi = avgBy([4]);
  assert.ok(hi != null && lo != null && hi < lo, `높은 레벨이 더 빨라야 함 (레벨 4 평균 ${hi}초, 레벨 1~2 평균 ${lo}초)`);
  assert.ok(hi <= 45, '레벨 4는 3문제를 평균 45초 안에');
  // 선생님 '가상 친구 모두 완료'
  const s2 = setup(1, { stages: 2, perStage: 3, size: 4 });
  s2.eng.handle(s2.teacher, { t: 'tbots', n: 3 });
  s2.eng.handle(s2.teacher, { t: 'tdiag' }); s2.flush();
  { const me = s2.P(s2.kids[0]); while (!me.diag.done) { const q = me.diag.qs[me.diag.idx]; s2.eng.handle(s2.kids[0], { t: 'answer', qid: q.id, choice: q.answer }); } }
  for (let i = 0; i < 900 && s2.room.phase === 'diag'; i++) { s2.clock.t += 1000; s2.eng.botTick(); s2.flush(); }
  s2.eng.handle(s2.teacher, { t: 'tstart' }); s2.flush();
  assert.equal(s2.room.phase, 'playing');
  s2.eng.handle(s2.kids[0], { t: 'tbotsdone' });
  assert.ok([...s2.room.players.values()].filter(p => p.bot).every(p => !p.stageDone), '학생은 쓸 수 없음');
  s2.eng.handle(s2.teacher, { t: 'tbotsdone' });
  const bs = [...s2.room.players.values()].filter(p => p.bot);
  assert.ok(bs.every(p => p.stageDone), '가상 친구 모두 이번 스테이지 완료');
  assert.equal(s2.P(s2.kids[0]).stageDone, false, '실제 학생은 그대로');
  assert.match(s2.teacher.last('toast').msg, /가상 친구 3명/);
  assert.equal(s2.teacher.last('tstate').players.filter(p => p.bot).length, 3, '선생님 화면에 가상 친구 표시');
});
