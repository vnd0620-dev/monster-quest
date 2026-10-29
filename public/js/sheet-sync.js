// 구글 시트 자동 저장 v1
// 협력 리포트(R)를 표 4개(게임 요약 · 학생별 · 모둠별 · 힌트 주고받기)로 바꿔
// 선생님이 만든 Apps Script 웹 앱 주소로 보냅니다. 학생 이름은 보내지 않습니다.
// 같은 게임(날짜 · 시작 시각 · 방 번호)을 다시 보내면 시트에서 그 게임 줄을 새 값으로 바꿉니다.
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const sv = x => (x == null ? '' : x);
  // 게임 시작 시각을 이 컴퓨터 시간대로 바꿉니다.
  function stamp(iso) {
    const d = new Date(iso);
    return { day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
  }
  const KEY_HEAD = ['날짜', '시작 시각', '방 번호'];
  const BAND_HEAD = ['학생 수', '문제 해결률(%)', '한 번에 맞힌 비율(%)', '만든 힌트(평균)', '받은 힌트(평균)', '손들기(평균)', '설문4 평균(0~2)', '설문5 평균(0~2)'];
  const bandCells = b => (b ? [b.n, sv(b.solveRate), sv(b.firstTryRate), sv(b.hintsMade), sv(b.hintsGot), sv(b.hands), sv(b.q4), sv(b.q5)] : BAND_HEAD.map(() => ''));

  function build(R) {
    const M = R.meta, S = R.summary, t = stamp(M.date), key = [t.day, t.time, String(M.code)];
    const qAvg = id => { const q = (R.survey || []).find(x => x.id === id); return q ? sv(q.avg) : ''; };
    const games = {
      name: '게임 요약',
      header: [...KEY_HEAD, '단원', '평가 요소', '스테이지 수', '1인 문제 수', '모둠 인원 설정', '게임 시간(분)', '학생 수', '가상 친구 수', '가상 친구 힌트를 쓴 횟수', '모둠 수',
        '전원 해결률(%)', '최종 보스 처치 모둠 수', '평균 문제 해결률(%)', '만든 힌트 수', '쓰인 힌트 수', '힌트 사용률(%)', '친구 힌트 뒤 해결률(%)', '상위→하위 도움 횟수', '평균 완료 격차(초)',
        '손들기 횟수', '선생님이 손 내려 준 횟수', 'Freeze 횟수', 'Freeze 시간(초)', '설문 응답 학생 수', '설문1 평균(0~2)', '설문2 평균(0~2)', '설문3 평균(0~2)', '설문4 평균(0~2)', '설문5 평균(0~2)',
        ...BAND_HEAD.map(h => '하위 집단 ' + h), ...BAND_HEAD.map(h => '상위 집단 ' + h)],
      rows: [[...key, M.unit, M.area, M.stages, M.perStage, M.size, M.minutes, S.students, S.bots || 0, S.hintsFromBots || 0, S.groups,
        sv(S.allSolveRate), S.finishedGroups, sv(S.solveRate), S.hintsMade, S.hintsUsed, sv(S.hintUseRate), sv(S.hintSolvedRate), S.lowToHigh, sv(S.avgGapSec),
        S.hands, S.lowered, S.freezes, S.frozenSec, S.surveyDone, qAvg('q1'), qAvg('q2'), qAvg('q3'), qAvg('q4'), qAvg('q5'),
        ...bandCells((R.bands || [])[0]), ...bandCells((R.bands || [])[1])]],
    };
    const students = {
      name: '학생별',
      header: [...KEY_HEAD, '단원', '학생 번호', '모둠', '레벨', '집단', '받은 문제', '해결한 문제', '해결률(%)', '한 번에 맞힌 문제', '한 번에 맞힌 비율(%)', '맞힌 횟수', '틀린 횟수', '추가 문제 해결',
        '만든 힌트', '보낸 힌트', '친구가 쓴 내 힌트', '받은 힌트', '받은 힌트 뒤 해결', '손들기', '손든 시간(초)', '선생님이 손 내려 줌', '반응 이모지', '오답노트', '오답노트 해결', '자주 보인 오류', '평가 요소별 수준',
        '설문1', '설문2', '설문3', '설문4', '설문5'],
      rows: R.students.map(x => [...key, M.unit, x.num, x.group, x.level, x.band, x.dealt, x.solved, sv(x.solveRate), x.firstTry, sv(x.firstTryRate), sv(x.ok), x.wrong, x.extraSolved,
        x.hintsMade, sv(x.hintsSent), x.hintsUsedByFriends, x.hintsGot, x.hintsGotSolved, x.hands, x.handSec, x.lowered, x.reacts, x.notes, x.notesResolved, sv(x.topMistake),
        (R.areaNames || []).filter(a => x.levels[a]).map(a => `${a}: ${x.levels[a]}`).join(' / '),
        sv(x.survey.q1), sv(x.survey.q2), sv(x.survey.q3), sv(x.survey.q4), sv(x.survey.q5)]),
    };
    const groups = {
      name: '모둠별',
      header: [...KEY_HEAD, '모둠', '인원(실제)', '가상 친구', '레벨 구성', '스테이지 수', '처치한 스테이지', '최종 보스 처치', '전원 해결률(%)', '스테이지 평균 시간(초)', '평균 완료 격차(초)', '만든 힌트', '쓰인 힌트', '힌트 뒤 해결', '스테이지별 (번호:시간초/격차초)'],
      rows: R.groups.map(g => [...key, g.name, g.size, g.bots || 0, g.levels, g.stages, g.cleared, g.done ? '예' : '아니요', sv(g.allSolveRate), sv(g.avgStageSec), sv(g.avgGapSec), g.hintsMade, g.hintsUsed, g.hintsSolved, g.stageRows.map(r => `${r.stage}:${r.sec}/${r.gapSec}`).join(' ')]),
    };
    const gifts = {
      name: '힌트 주고받기',
      header: [...KEY_HEAD, '시작 후(분)', '스테이지', '모둠', '만든 학생 번호', '만든 학생 레벨', '쓴 학생 번호', '쓴 학생 레벨', '힌트 종류', '평가 요소', '쓸 때 틀린 횟수', '결국 해결', '힌트 뒤 더 틀린 횟수', '해결까지(초)'],
      rows: R.gifts.map(e => [...key, e.min, e.stage, e.group, e.fromBot ? '가상 친구' : sv(e.fromNum), e.fromLevel, sv(e.toNum), e.toLevel, e.kind, e.area, sv(e.wrongBefore), e.solved ? '예' : '아니요', sv(e.wrongAfter), sv(e.solvedSec)]),
    };
    return { app: 'monster-quest', v: 1, key, tables: [games, students, groups, gifts] };
  }

  // 같은 내용을 두 번 보내지 않으려고 내용을 짧은 값으로 줄입니다.
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  const URL_RE = /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]+\/exec$/;
  function checkUrl(u) {
    u = String(u || '').trim();
    if (!u) return { ok: false, msg: '주소를 넣어 주세요.' };
    if (/\/dev$/.test(u)) return { ok: false, msg: '끝이 /dev인 주소는 시험용이에요. 배포 후 나온 /exec 주소를 넣어 주세요.' };
    if (!URL_RE.test(u)) return { ok: false, msg: 'https://script.google.com/macros/s/…/exec 모양의 웹 앱 주소를 넣어 주세요.' };
    return { ok: true, url: u };
  }

  // 보내기: 먼저 답을 읽을 수 있는 방식으로 보내고, 브라우저가 답 읽기를 막으면(no-cors) 답 없이 한 번 더 보냅니다.
  // 같은 게임은 시트에서 바꿔 쓰므로 두 번 들어가도 줄이 겹치지 않습니다.
  async function send(url, payload, fetchFn) {
    const f = fetchFn || root.fetch.bind(root);
    const body = JSON.stringify(payload), headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    let res;
    try { res = await f(url, { method: 'POST', body, headers, redirect: 'follow' }); }
    catch (e) {
      try { await f(url, { method: 'POST', body, headers, mode: 'no-cors' }); return { ok: true, confirmed: false }; }
      catch (e2) { return { ok: false, msg: '인터넷 연결을 확인해 주세요.' }; }
    }
    let j = null;
    try { j = await res.json(); } catch (e) { /* 답이 JSON이 아님 */ }
    if (j && j.ok) return { ok: true, confirmed: true };
    if (j && j.error) return { ok: false, msg: '시트 쪽 오류: ' + j.error };
    return { ok: false, msg: `시트가 답하지 않았어요(${res.status}). 웹 앱 배포의 액세스가 '모든 사용자'인지 확인해 주세요.` };
  }

  const api = { build, hash, checkUrl, send };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MQSheet = api;
})(typeof window !== 'undefined' ? window : globalThis);
