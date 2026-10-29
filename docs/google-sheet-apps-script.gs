/**
 * 협력 몬스터 퀴즈 → 구글 시트 자동 저장 (v1)
 *
 * 붙이는 방법
 *  1) 저장할 구글 스프레드시트를 엽니다.
 *  2) 메뉴 [확장 프로그램] → [Apps Script]를 누릅니다.
 *  3) 원래 있던 코드를 모두 지우고 이 파일 내용을 붙여 넣은 뒤 저장(💾)합니다.
 *  4) 오른쪽 위 [배포] → [새 배포] → 톱니바퀴에서 [웹 앱]을 고릅니다.
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: 모든 사용자
 *  5) [배포] → 권한 검토 → 내 계정 선택 → "확인되지 않은 앱" 화면에서 [고급] → [(프로젝트 이름)(으)로 이동] → [허용]
 *  6) 나온 웹 앱 URL(…/exec)을 복사해 몬스터 퀴즈 교사 화면 → 협력 리포트 → "구글 시트 자동 저장" 칸에 넣고 [주소 저장]을 누릅니다.
 *
 * 하는 일
 *  - 탭 4개(게임 요약 · 학생별 · 모둠별 · 힌트 주고받기)를 처음에 만들고, 게임마다 아래에 줄을 이어 붙입니다.
 *  - 같은 게임(날짜 · 시작 시각 · 방 번호가 같음)이 다시 오면 그 게임의 예전 줄을 지우고 새 줄로 바꿉니다.
 *    (게임이 끝난 뒤 들어온 설문 답을 반영하기 위해서입니다.)
 *  - 이 웹 앱은 줄을 쓰기만 합니다. 시트 내용을 밖으로 보내 주지 않습니다.
 *
 * 코드를 고친 뒤에는 [배포] → [배포 관리] → 연필 → 버전 "새 버전" → [배포]를 해야 반영됩니다. (주소는 그대로입니다)
 */
const KEY_COLS = 3; // 날짜, 시작 시각, 방 번호

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d || d.app !== 'monster-quest' || !Array.isArray(d.tables) || !Array.isArray(d.key)) return out_({ ok: false, error: '몬스터 퀴즈에서 온 자료가 아니에요' });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const key = d.key.map(String).join('|');
    let replaced = false;
    d.tables.forEach(function (t) {
      const w = t.header.length;
      const sh = sheet_(ss, t.name, t.header);
      const old = findRows_(sh, key);              // 지우기 전에 예전 줄 위치를 먼저 찾습니다
      const rows = (t.rows || []).map(function (r) { const a = r.slice(0, w); while (a.length < w) a.push(''); return a; });
      if (rows.length) {
        const start = sh.getLastRow() + 1;
        // 글자 칸(날짜·시각·방 번호·모둠 이름 등)은 시트가 날짜나 숫자로 바꾸지 않도록 '일반 텍스트'로 둡니다
        for (let c = 0; c < w; c++) {
          if (rows.some(function (r) { return typeof r[c] === 'string' && r[c] !== ''; })) sh.getRange(start, c + 1, rows.length, 1).setNumberFormat('@');
        }
        sh.getRange(start, 1, rows.length, w).setValues(rows);
      }
      if (old.length) { removeRows_(sh, old); replaced = true; }
    });
    return out_({ ok: true, replaced: replaced });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// 주소를 브라우저로 열었을 때 연결 확인용
function doGet() { return out_({ ok: true, app: 'monster-quest' }); }

function sheet_(ss, name, header) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  // 첫 줄은 언제나 최신 제목으로 맞춥니다 (앱이 칸을 뒤에 더 붙여도 제목이 따라옵니다)
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (sh.getFrozenRows() < 1) sh.setFrozenRows(1);
  return sh;
}

// 같은 게임의 줄 번호(시트 기준)를 찾습니다
function findRows_(sh, key) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const v = sh.getRange(2, 1, n, KEY_COLS).getDisplayValues();
  const hit = [];
  for (let i = 0; i < n; i++) if (v[i].join('|') === key) hit.push(i + 2);
  return hit;
}

// 아래쪽부터 이어진 묶음 단위로 지웁니다. 남은 줄이 없어지는 경우에는 지우는 대신 내용만 비웁니다.
function removeRows_(sh, rowNums) {
  rowNums.sort(function (a, b) { return b - a; });
  let i = 0;
  while (i < rowNums.length) {
    let j = i;
    while (j + 1 < rowNums.length && rowNums[j + 1] === rowNums[j] - 1) j++;
    const first = rowNums[j], count = j - i + 1;
    if (sh.getLastRow() - 1 <= count) sh.getRange(first, 1, count, sh.getLastColumn()).clearContent();
    else sh.deleteRows(first, count);
    i = j + 1;
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
