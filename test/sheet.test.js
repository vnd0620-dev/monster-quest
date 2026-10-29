// 구글 시트 자동 저장: 서버가 만드는 표(shared/sheet.js)와 시트 쪽 Apps Script(docs/google-sheet-apps-script.gs)를 함께 검사합니다.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createEngine } = require('../shared/engine.js');
const SH = require('../shared/sheet.js');

function fakeConn() { const c = { ctx: {}, inbox: [], send(o) { c.inbox.push(JSON.parse(JSON.stringify(o))); } }; c.last = t => [...c.inbox].reverse().find(m => m.t === t); return c; }
function playedGame(n, settings, survey, extra) {
  const pending = [], clock = { t: 1.7e12 };
  const eng = createEngine(Object.assign({ setTimeout: f => pending.push(f), now: () => clock.t, stuckMs: 60000 }, extra));
  const teacher = fakeConn();
  eng.handle(teacher, { t: 'tcreate', settings: Object.assign({ size: 4, stages: 2, perStage: 3, diag: 3 }, settings) });
  const code = teacher.last('troom').code, room = eng.rooms.get(code), flush = () => { while (pending.length) pending.shift()(); };
  const kids = [];
  for (let i = 1; i <= n; i++) { const c = fakeConn(); eng.handle(c, { t: 'join', code, num: i, name: '비밀이름' + i }); kids.push(c); }
  const P = c => room.players.get(c.ctx.pid);
  eng.handle(teacher, { t: 'tdiag' }); flush();
  kids.forEach((k, i) => { const p = P(k); while (!p.diag.done) { const q = p.diag.qs[p.diag.idx]; eng.handle(k, { t: 'answer', qid: q.id, choice: i % 2 ? q.answer : (q.answer + 1) % 4 }); } });
  eng.handle(teacher, { t: 'tstart' }); flush();
  kids.forEach((k, i) => { const p = P(k), c = p.queue[p.qi]; if (!c) return; const w = [0, 1, 2, 3].find(x => x !== c.answer); if (i % 2 === 0) eng.handle(k, { t: 'answer', qid: c.id, choice: w }); eng.handle(k, { t: 'answer', qid: c.id, choice: c.answer }); clock.t += 5000; });
  eng.handle(teacher, { t: 'tend' });
  (survey || []).forEach(i => eng.handle(kids[i], { t: 'survey', answers: { q1: 2, q2: 1, q3: 2, q4: 1, q5: 2 } }));
  eng.handle(teacher, { t: 'tresearch' });
  return { R: teacher.last('tresearch'), eng, teacher, kids, code };
}

test('시트 표: 4개 탭, 칸 수 일치, 학생 이름 없음, 날짜·시각·방 번호·학생 번호', () => {
  const { R } = playedGame(5, {}, [0, 1]);
  assert.equal(R.empty, false);
  const p = SH.build(R);
  assert.deepEqual(p.tables.map(t => t.name), ['게임 요약', '학생별', '모둠별', '힌트 주고받기']);
  const json = JSON.stringify(p);
  assert.ok(!/비밀이름/.test(json), '학생 이름이 들어가면 안 됨');
  assert.match(p.key[0], /^\d{4}-\d{2}-\d{2}$/); assert.match(p.key[1], /^\d{2}:\d{2}$/); assert.equal(p.key[2], String(R.meta.code));
  for (const t of p.tables) {
    assert.deepEqual(t.header.slice(0, 3), ['날짜', '시작 시각', '방 번호']);
    assert.equal(new Set(t.header).size, t.header.length, t.name + ' 제목 겹침');
    for (const r of t.rows) { assert.equal(r.length, t.header.length, t.name); assert.deepEqual(r.slice(0, 3), p.key); r.forEach(v => assert.ok(v === '' || typeof v === 'string' || Number.isFinite(v), t.name + ' 값 ' + v)); }
  }
  assert.equal(p.tables[0].rows.length, 1);
  const st = p.tables[1], col = h => st.header.indexOf(h);
  assert.deepEqual(st.rows.map(r => r[col('학생 번호')]), [1, 2, 3, 4, 5]);
  // 결과 리포트 칸도 들어 있음
  R.students.forEach((x, i) => { assert.equal(st.rows[i][col('맞힌 횟수')], x.ok); assert.equal(st.rows[i][col('틀린 횟수')], x.wrong); });
  assert.ok(st.rows.some(r => r[col('평가 요소별 수준')] !== ''));
  assert.equal(st.rows[0][col('설문4')], 1); assert.equal(st.rows[4][col('설문4')], '');
  assert.equal(p.tables[0].rows[0][p.tables[0].header.indexOf('설문 응답 학생 수')], 2);
});

test('웹 앱 주소 확인', () => {
  assert.equal(SH.checkUrl('https://script.google.com/macros/s/AKfycbx_1-2/exec').ok, true);
  assert.equal(SH.checkUrl(' https://script.google.com/a/school.kr/macros/s/AKfy/exec ').ok, true);
  assert.equal(SH.checkUrl('https://script.google.com/macros/s/AKfy/dev').ok, false);
  assert.equal(SH.checkUrl('https://evil.example.com/exec').ok, false);
  assert.equal(SH.checkUrl('').ok, false);
});

test('보내기: JSON 답으로 성공·실패 판단', async () => {
  const calls = [];
  const ok = await SH.send('u', { a: 1 }, async (u, o) => { calls.push(o); return { status: 200, json: async () => ({ ok: true }) }; });
  assert.deepEqual(ok, { ok: true }); assert.equal(calls[0].headers['Content-Type'], 'text/plain;charset=utf-8'); assert.equal(calls[0].redirect, 'follow');
  const bad = await SH.send('u', {}, async () => ({ status: 200, json: async () => ({ ok: false, error: '권한 없음' }) }));
  assert.equal(bad.ok, false); assert.match(bad.msg, /권한 없음/);
  const html = await SH.send('u', {}, async () => ({ status: 401, json: async () => { throw new Error('not json'); } }));
  assert.equal(html.ok, false); assert.match(html.msg, /모든 사용자/);
  const off = await SH.send('u', {}, async () => { throw new TypeError('x'); });
  assert.equal(off.ok, false);
});

test('시작 시각은 서버 시간대와 상관없이 한국 시간', () => {
  assert.deepEqual(SH.stamp('2026-10-29T00:05:00.000Z'), { day: '2026-10-29', time: '09:05' });
  assert.deepEqual(SH.stamp('2026-10-29T15:30:00.000Z'), { day: '2026-10-30', time: '00:30' });
});

test('엔진: 게임이 끝날 때·끝난 뒤 설문이 들어올 때·다시 보내기를 누를 때 시트로 보냄', () => {
  const calls = [];
  const g = playedGame(3, {}, [0], { onReport: (R, code, force) => calls.push({ R, code, force }) });
  // 끝날 때 1번 + 설문 1번 (tresearch는 보내지 않음)
  assert.equal(calls.length, 2); assert.equal(calls[0].code, g.code); assert.equal(calls[0].force, false);
  assert.equal(calls[0].R.summary.surveyDone, 0); assert.equal(calls[1].R.summary.surveyDone, 1);
  g.eng.handle(g.teacher, { t: 'tsheet' }); assert.equal(calls.length, 3); assert.equal(calls[2].force, true);
  // 결과는 교사 화면 상태로
  assert.deepEqual(g.teacher.last('tstate').sheet, { on: true });
  g.eng.sheetResult(g.code, { ok: false, msg: '권한 없음' });
  const st = g.teacher.last('tstate').sheet; assert.equal(st.on, true); assert.equal(st.ok, false); assert.equal(st.msg, '권한 없음');
  g.eng.sheetResult(g.code, { ok: true }); assert.equal(g.teacher.last('tstate').sheet.ok, true);
  // 다시 하기 뒤에도 지난 게임을 다시 보낼 수 있음 (같은 게임)
  g.eng.handle(g.teacher, { t: 'treset' }); g.eng.handle(g.teacher, { t: 'tsheet' });
  assert.equal(calls.length, 4); assert.equal(calls[3].R.meta.date, calls[0].R.meta.date);
  // 게임 중에는 보내지 않음
  const h = playedGame(2, {}, [], { onReport: () => calls.push('x') });
  const before = calls.length; h.eng.handle(h.teacher, { t: 'treset' }); h.eng.handle(h.teacher, { t: 'tdiag' }); h.eng.handle(h.teacher, { t: 'tsheet' });
  assert.equal(calls.length, before + 1, '다시 하기 뒤 레벨 테스트 중에는 지난 게임만 보냄');
  // 시트 설정이 없으면 꺼짐
  const n = playedGame(2, {}, []); assert.deepEqual(n.teacher.last('tstate').sheet, { on: false });
});

// ───── Apps Script를 가짜 스프레드시트에서 돌려 봅니다 ─────
function fakeSpreadsheet() {
  const sheets = new Map();
  function makeSheet(name) {
    const sh = { name, data: [], fmt: [], frozen: 0 };
    const lastRow = () => { for (let i = sh.data.length - 1; i >= 0; i--) if ((sh.data[i] || []).some(v => v !== '' && v != null)) return i + 1; return 0; };
    const cell = (r, c) => { while (sh.data.length < r) sh.data.push([]); return sh.data[r - 1]; };
    sh.api = {
      getLastRow: lastRow,
      getLastColumn: () => Math.max(0, ...sh.data.map(r => r.length)),
      getFrozenRows: () => sh.frozen, setFrozenRows: k => { sh.frozen = k; },
      deleteRows: (start, count) => { if (lastRow() - sh.frozen <= count) throw new Error('Sorry, it is not possible to delete all non-frozen rows.'); sh.data.splice(start - 1, count); sh.fmt.splice(start - 1, count); },
      getRange: (r, c, nr, nc) => {
        nr = nr || 1; nc = nc || 1;
        const rg = {
          setValues: v => { assert.equal(v.length, nr); v.forEach((row, i) => { assert.equal(row.length, nc); const R = cell(r + i); row.forEach((x, j) => { const f = (sh.fmt[r + i - 1] || [])[c + j - 1]; R[c + j - 1] = f === '@' ? String(x) : (typeof x === 'string' && /^\d+$/.test(x) ? Number(x) : x); }); }); return rg; },
          setFontWeight: () => rg,
          setNumberFormat: f => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { while (sh.fmt.length < r + i) sh.fmt.push([]); sh.fmt[r + i - 1][c + j - 1] = f; } return rg; },
          getDisplayValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => String(((sh.data[r + i - 1] || [])[c + j - 1]) ?? ''))),
          clearContent: () => { for (let i = 0; i < nr; i++) { const R = sh.data[r + i - 1]; if (R) for (let j = 0; j < nc; j++) R[c + j - 1] = ''; } return rg; },
        };
        return rg;
      },
    };
    return sh;
  }
  const ss = { getSheetByName: n => (sheets.get(n) || {}).api || null, insertSheet: n => { const s = makeSheet(n); sheets.set(n, s); return s.api; } };
  return { ss, sheets, rows: n => { const s = sheets.get(n); return s ? s.data.slice(1, s.api.getLastRow()) : []; } };
}
function loadGs(fake) {
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => fake.ss },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; } }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../docs/google-sheet-apps-script.gs'), 'utf8'), ctx);
  return payload => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(payload) } }).s);
}

test('Apps Script: 게임마다 줄 이어 붙이기, 같은 게임은 바꿔 쓰기, 방 번호·시각은 글자 그대로', () => {
  const fake = fakeSpreadsheet(), post = loadGs(fake);
  const g1 = playedGame(4, {}, []), g2 = playedGame(6, { stages: 3 }, [0]);
  const p1 = SH.build(g1.R), p2 = SH.build(g2.R);
  p2.key[1] = p1.key[1] === '09:05' ? '09:06' : '09:05'; p2.tables.forEach(t => t.rows.forEach(r => { r[1] = p2.key[1]; }));
  assert.deepEqual(post(p1), { ok: true, replaced: false });
  assert.equal(fake.rows('학생별').length, 4);
  assert.deepEqual(post(p2), { ok: true, replaced: false });
  assert.equal(fake.rows('학생별').length, 10); assert.equal(fake.rows('게임 요약').length, 2);
  // 첫 게임에 설문이 늦게 들어와 다시 보냄 → 줄 수 그대로, 값만 바뀜
  g1.eng.handle(g1.kids[0], { t: 'survey', answers: { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2 } });
  g1.eng.handle(g1.teacher, { t: 'tresearch' });
  const p1b = SH.build(g1.teacher.last('tresearch'));
  assert.deepEqual(p1b.key, p1.key);
  assert.deepEqual(post(p1b), { ok: true, replaced: true });
  assert.equal(fake.rows('학생별').length, 10); assert.equal(fake.rows('게임 요약').length, 2);
  const H = fake.sheets.get('게임 요약').data[0], sumRows = fake.rows('게임 요약');
  const g1row = sumRows.find(r => r[2] === p1.key[2] && r[1] === p1.key[1]); assert.ok(g1row);
  assert.equal(g1row[H.indexOf('설문 응답 학생 수')], 1);
  assert.equal(sumRows.filter(r => r[1] === p2.key[1]).length, 1, '둘째 게임 줄은 그대로');
  // 방 번호와 시각은 글자로 저장
  fake.rows('학생별').forEach(r => { assert.equal(typeof r[2], 'string'); assert.equal(typeof r[1], 'string'); assert.equal(typeof r[4], 'number'); });
  // 힌트가 없는 게임만 있는 탭에서 '모든 줄 지우기'가 되어도 오류 없이 처리
  const only = fakeSpreadsheet(), post2 = loadGs(only);
  const t = JSON.parse(JSON.stringify(p1)); t.tables[3].rows = [t.tables[1].rows[0].slice(0, t.tables[3].header.length)];
  post2(t); assert.equal(only.rows('힌트 주고받기').length, 1);
  const t2 = JSON.parse(JSON.stringify(t)); t2.tables[3].rows = [];
  assert.equal(post2(t2).ok, true); assert.equal(only.rows('힌트 주고받기').length, 0);
  // 엉뚱한 자료는 거절
  assert.equal(post({ hello: 1 }).ok, false);
});
