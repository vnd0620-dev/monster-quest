// 서버 연결 — 끊기면 자동으로 다시 연결합니다.
// connect({ onOpen, onMessage, onStatus }) → { send(obj) }
(function () {
  'use strict';
  function socket(h) {
    let ws = null, retry = 0, timer = null, pingT = null;
    function open() {
      timer = null;
      if (ws && ws.readyState <= 1) return;
      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      ws.onopen = () => {
        retry = 0;
        if (h.onStatus) h.onStatus(true);
        if (h.onOpen) h.onOpen();
        clearInterval(pingT); pingT = setInterval(() => api.send({ t: 'ping' }), 25000);
      };
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } h.onMessage(m); };
      ws.onclose = () => {
        clearInterval(pingT);
        if (h.onStatus) h.onStatus(false);
        if (!timer) timer = setTimeout(open, Math.min(5000, 600 + retry++ * 700));
      };
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && (!ws || ws.readyState > 1)) { clearTimeout(timer); open(); }
    });
    const api = { send(o) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } return false; } };
    open();
    return api;
  }
  window.MQNet = { socket };
})();
