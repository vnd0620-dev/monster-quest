// 몬스터 퀘스트 서버
//   npm install   (처음 한 번)
//   npm start     → 화면에 나오는 주소로 접속
// 교사 PC에서 켜면 같은 와이파이의 학생 기기가 접속할 수 있고,
// Render 같은 호스팅에 올리면 인터넷 주소 하나로 어디서나 접속할 수 있습니다.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const { createEngine } = require('./shared/engine.js');

const PORT = Number(process.env.PORT) || 3000;
const ROOTS = { '/shared/': path.join(__dirname, 'shared'), '/': path.join(__dirname, 'public') };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8' };

const SHEET = require('./shared/sheet.js');

// 구글 시트 자동 저장: Render → Environment에 MQ_SHEET_URL(Apps Script 웹 앱 …/exec 주소)을 넣으면 켜집니다.
const SHEET_URL = (() => { if (process.env.MQ_TEST === '1' && /^http:\/\/127\.0\.0\.1:\d+\//.test(process.env.MQ_SHEET_URL || '')) return process.env.MQ_SHEET_URL; // 자동 시험용 가짜 시트
  const c = SHEET.checkUrl(process.env.MQ_SHEET_URL); if (process.env.MQ_SHEET_URL && !c.ok) console.log('  ⚠️ MQ_SHEET_URL 주소 모양이 이상해요: ' + c.msg); return c.ok ? c.url : null; })();
const SHEET_TZ = process.env.MQ_TZ || 'Asia/Seoul';
const sheetJobs = new Map(); // 방 번호 → { R, force, timer, sent(게임별 마지막으로 보낸 내용), tries }
function queueSheet(R, code, force) {
  const job = sheetJobs.get(code) || { sent: {}, tries: 0 };
  sheetJobs.set(code, job);
  job.R = R; job.force = job.force || force; job.tries = 0;
  clearTimeout(job.timer);
  job.timer = setTimeout(() => runSheet(code), force ? 0 : 4000); // 설문이 한꺼번에 들어오면 4초 모아서 한 번에 보냄
}
async function runSheet(code) {
  const job = sheetJobs.get(code); if (!job || !job.R) return;
  const payload = SHEET.build(job.R, SHEET_TZ), id = payload.key.join(' '), fp = SHEET.hash(JSON.stringify(payload.tables));
  if (!job.force && job.sent[id] === fp) return;
  const R = job.R, r = await SHEET.send(SHEET_URL, payload);
  if (r.ok) { job.sent[id] = fp; if (job.R === R) { job.R = null; job.force = false; } }
  else if (job.R === R && ++job.tries <= 3) job.timer = setTimeout(() => runSheet(code), 30000 * job.tries); // 실패하면 30초·60초·90초 뒤 다시
  if (!r.ok) console.log(`  ⚠️ 시트 저장 실패 (방 ${code}): ${r.msg}`);
  engine.sheetResult(code, r);
}

const engine = createEngine(SHEET_URL ? { onReport: queueSheet } : {});

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) return i.address;
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/lan') {
    const ip = lanAddress();
    res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
    return res.end(JSON.stringify({ base: ip ? `http://${ip}:${PORT}` : null }));
  }
  if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  // 자동 시험용 (MQ_TEST=1 로 켰을 때만): 학생의 현재 정답을 알려 줍니다.
  if (process.env.MQ_TEST === '1' && url.pathname === '/api/test/answer') {
    const room = engine.rooms.get(url.searchParams.get('code'));
    const p = room && room.players.get(url.searchParams.get('pid'));
    const c = p && p.queue && p.queue[p.qi];
    res.writeHead(200, { 'content-type': MIME['.json'] });
    return res.end(JSON.stringify(p ? { choice: c ? c.choices[c.answer] : null, index: c ? c.answer : null, twin: p.twin ? p.twin.answers[0] : null, diag: p.diag && !p.diag.done ? p.diag.qs[p.diag.idx].choices[p.diag.qs[p.diag.idx].answer] : null } : {}));
  }
  let p;
  try { p = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html';
  const prefix = p.startsWith('/shared/') ? '/shared/' : '/';
  const base = ROOTS[prefix];
  const file = path.normalize(path.join(base, p.slice(prefix.length)));
  if (!file.startsWith(base + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('페이지를 찾을 수 없어요'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
wss.on('connection', ws => {
  ws.alive = true;
  const conn = { ctx: {}, send: obj => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } };
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', data => {
    ws.alive = true;
    let msg; try { msg = JSON.parse(data); } catch (e) { return; }
    try { engine.handle(conn, msg); } catch (e) { console.error('메시지 처리 오류', e); }
  });
  ws.on('close', () => { try { engine.disconnect(conn); } catch (e) { console.error(e); } });
});

// 응답 없는 연결 정리 + 오래된 방 정리
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); }
}, 30000).unref();
setInterval(() => engine.sweep(6 * 3600 * 1000), 10 * 60 * 1000).unref();
setInterval(() => engine.botTick(), 1000).unref(); // 가상 친구 움직이기

server.listen(PORT, () => {
  const ip = lanAddress();
  console.log('\n  🗡️  몬스터 퀘스트 서버가 켜졌어요!');
  console.log(`  이 컴퓨터에서 열기:   http://localhost:${PORT}`);
  if (ip) console.log(`  같은 와이파이 기기:   http://${ip}:${PORT}`);
  console.log(SHEET_URL ? '  📗 구글 시트 자동 저장: 켜짐' : '  📗 구글 시트 자동 저장: 꺼짐 (MQ_SHEET_URL 없음)');
  console.log('  끄려면 이 창에서 Ctrl + C\n');
});

module.exports = { server, engine };
