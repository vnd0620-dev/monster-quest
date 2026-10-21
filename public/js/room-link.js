// claude.ai 아티팩트의 '방(room)' 기능으로 다른 기기와 연결합니다. (체험판 전용)
// · 선생님 화면을 연 기기 = 진행자(host). 게임 규칙 엔진이 여기서 돌아갑니다.
// · QR로 들어온 휴대폰 = 학생(client). 학생이 보내는 내용은 presence로, 진행자가 보내는 화면 상태는 emit으로 전달합니다.
// · claude.ai에 로그인해 이 아티팩트를 볼 수 있는 기기만 들어올 수 있어요. 실제 수업은 server.js 버전을 씁니다.
(function () {
  'use strict';
  const PART = 900;            // 한 번에 보내는 글자 수 (한글 3바이트 × 900 < 4KiB)
  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const bytes = o => { const s = JSON.stringify(o); return enc ? enc.encode(s).length : s.length * 3; };

  async function getRoom() {
    try { if (!window.claude || typeof window.claude.use !== 'function') return null; return await window.claude.use('room'); } catch (e) { return null; }
  }

  // ───── 진행자 (선생님 기기) ─────
  function host(engine, opt) {
    opt = opt || {};
    const status = s => { if (opt.onStatus) opt.onStatus(s); };
    const peers = new Map();
    let room = null;
    getRoom().then(r => {
      if (!r) return status('off');
      room = r;
      r.onConnection(c => status(c ? 'on' : 'wait'), () => status('off'));
      r.onPeers(ch => { for (const p of ch.peers) seen(p); for (const p of ch.left) gone(p); }, () => {});
      setInterval(flushAll, 200);
      setInterval(heartbeat, 3000);
    });
    function entry(peer) {
      let e = peers.get(peer);
      if (!e) {
        e = { peer, lastN: 0, out: [], lastState: null, lastSent: 0, k: 0, needAck: false, leftT: null };
        e.conn = { ctx: {}, send(o) { queue(e, o); } };
        peers.set(peer, e);
      }
      return e;
    }
    function seen(p) {
      if (p.sameTab || p.kind !== 'viewer') return;
      const mq = p.presence && p.presence.mq;
      if (!mq || mq.role !== 's' || !Array.isArray(mq.out)) return;
      const e = entry(p.peer);
      if (e.leftT) { clearTimeout(e.leftT); e.leftT = null; }
      for (const it of mq.out) {
        if (!it || typeof it.n !== 'number' || it.n <= e.lastN || !it.m || typeof it.m !== 'object') continue;
        e.lastN = it.n; e.needAck = true;
        try { engine.handle(e.conn, JSON.parse(JSON.stringify(it.m))); } catch (err) { console.error(err); }
      }
    }
    function gone(p) {
      const e = peers.get(p.peer); if (!e) return;
      e.leftT = setTimeout(() => { engine.disconnect(e.conn); peers.delete(p.peer); }, 5000);
    }
    function queue(e, o) {
      o = JSON.parse(JSON.stringify(o));
      if (o.t === 'state') { e.out = e.out.filter(x => x.t !== 'state'); e.lastState = o; }
      e.out.push(o);
    }
    function emitBatch(e, ms) {
      if (!room) return;
      const k = ++e.k, one = { to: e.peer, k, ack: e.lastN, ms };
      if (bytes(one) < 3800) room.emit('mq', one).catch(() => {});
      else {
        const s = JSON.stringify(ms), of = Math.ceil(s.length / PART);
        for (let i = 0; i < of; i++) room.emit('mq', { to: e.peer, k, ack: e.lastN, part: i, of, s: s.slice(i * PART, (i + 1) * PART) }).catch(() => {});
      }
      e.lastSent = Date.now(); e.needAck = false;
    }
    function flushAll() { for (const e of peers.values()) if (e.out.length || e.needAck) { const ms = e.out; e.out = []; emitBatch(e, ms); } }
    function heartbeat() { const t = Date.now(); for (const e of peers.values()) if (e.lastState && t - e.lastSent > 2500) emitBatch(e, [e.lastState]); }
    return { count: () => peers.size };
  }

  // ───── 학생 (QR로 들어온 기기) ─────
  function client(h) {
    let room = null, me = null, n = 0, out = [], opened = false;
    const parts = {};
    const push = () => { if (room && me) room.presence({ mq: { role: 's', out } }).catch(() => {}); };
    getRoom().then(r => {
      if (!r) { if (h.onStatus) h.onStatus(false); if (h.onUnavailable) h.onUnavailable(); return; }
      room = r;
      r.onConnection(c => { if (h.onStatus && opened) h.onStatus(c); }, () => { if (h.onUnavailable) h.onUnavailable(); });
      r.onPeers(ch => { const mine = ch.peers.find(p => p.sameTab); if (mine && !me) { me = mine.peer; ready(); } }, () => {});
      r.on('mq', msg => {
        const d = msg.data;
        if (!d || d.to !== me) return;
        if (typeof d.ack === 'number' && out.length) { const before = out.length; out = out.filter(x => x.n > d.ack); if (out.length !== before) push(); }
        let ms;
        if (d.of) {
          const b = parts[d.k] || (parts[d.k] = { got: 0, a: [] });
          if (b.a[d.part] == null) { b.a[d.part] = d.s; b.got++; }
          for (const key of Object.keys(parts)) if (Number(key) < d.k - 30) delete parts[key];
          if (b.got < d.of) return;
          delete parts[d.k];
          try { ms = JSON.parse(b.a.join('')); } catch (e) { return; }
        } else ms = d.ms;
        if (Array.isArray(ms)) for (const m of ms) h.onMessage(m);
      });
    });
    function ready() { if (opened) return; opened = true; if (h.onStatus) h.onStatus(true); push(); if (h.onOpen) h.onOpen(); }
    return { send(o) { out.push({ n: ++n, m: o }); if (out.length > 12) out = out.slice(-12); push(); return true; } };
  }

  window.MQRoomLink = { host, client };
})();
