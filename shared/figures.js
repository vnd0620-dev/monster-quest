// 문제 그림 (SVG). 문제·보기 글 속에 [[fig:종류:값:옵션]] 을 넣으면 그 자리에 그림이 들어갑니다.
//   prism:n[:base|side|h|v]   n각기둥   (base 밑면 색칠, side 옆면 하나 색칠, h 높이 표시, v 꼭짓점 점)
//   pyr:n[:base|side|h|apex]  n각뿔     (apex 각뿔의 꼭짓점 표시)
//   net:n:종류                n각기둥 전개도 (ok 위·아래 같은 옆면 / ok2 위·아래 다른 옆면 / same 밑면 둘 다 위 / few 옆면 하나 모자람 / more 옆면 하나 많음)
//   tiles:빨강:파랑            색 타일
//   grid:k                    100칸 중 k칸 색칠
//   bars:a:b                  막대 가·나 (칸 수)
// 교사·학생 화면과 서버(검사)가 함께 씁니다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MQFigures = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const INK = '#2a2350', FILL = '#ffffff', BASE = '#ffd76a', SIDE = '#8fd0ff', RED = '#e5484d', BLUE = '#3b82f6', SOFT = '#efeaff';
  const f = v => Math.round(v * 10) / 10;
  const pts = arr => arr.map(p => `${f(p[0])},${f(p[1])}`).join(' ');
  const line = (a, b, dash, color, w) => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${color || INK}" stroke-width="${w || 2.2}" stroke-linecap="round"${dash ? ' stroke-dasharray="5 5"' : ''}/>`;
  const wrap = (w, h, body, label) => `<svg class="fig" viewBox="0 0 ${f(w)} ${f(h)}" role="img" aria-label="${label || '문제 그림'}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${f(w - 2)}" height="${f(h - 2)}" rx="12" fill="#fff" stroke="#d9d3ee"/>${body}</svg>`;

  // 밑면 정다각형을 비스듬히 본 모양 (앞쪽이 아래)
  function base(n, cx, cy, R, k) {
    // 홀수각형은 꼭짓점 하나가 정면, 짝수각형은 반 칸 돌려서 — 옆 모서리 두 개가 겹쳐 보이지 않게
    const start = n % 2 ? Math.PI / 2 : Math.PI / 2 + Math.PI / (2 * n);
    return Array.from({ length: n }, (_, i) => { const t = start + 2 * Math.PI * i / n; return { x: cx + R * Math.cos(t), y: cy + R * k * Math.sin(t), s: Math.sin(t) }; });
  }
  // 왼쪽 끝·오른쪽 끝을 기준으로 앞쪽 사슬과 뒤쪽 사슬 나누기
  function chains(P) {
    const n = P.length;
    let L = 0, R = 0;
    P.forEach((p, i) => { if (p.x < P[L].x) L = i; if (p.x > P[R].x) R = i; });
    const walk = d => { const out = [L]; let i = L; while (i !== R) { i = (i + d + n) % n; out.push(i); } return out; };
    const a = walk(1), b = walk(-1);
    const avg = c => c.reduce((t, i) => t + P[i].s, 0) / c.length;
    const front = avg(a) >= avg(b) ? a : b, back = front === a ? b : a;
    const edgeIn = (c, i, j) => c.some((v, k) => k < c.length - 1 && ((v === i && c[k + 1] === j) || (v === j && c[k + 1] === i)));
    return { L, R, front, back, backEdge: (i, j) => edgeIn(back, i, j), hiddenV: i => back.indexOf(i) > 0 && back.indexOf(i) < back.length - 1 };
  }

  function prism(n, opt) {
    const W = 230, H = 210, cx = 112, R = 74, k = 0.36, top = 52, h = 100;
    const T = base(n, cx, top, R, k), B = base(n, cx, top + h, R, k);
    const C = chains(B);
    let body = '';
    const P = a => a.map(p => [p.x, p.y]);
    // 옆면(앞쪽) 흰 바탕
    for (let k2 = 0; k2 < C.front.length - 1; k2++) { const i = C.front[k2], j = C.front[k2 + 1]; body += `<polygon points="${pts([[T[i].x, T[i].y], [T[j].x, T[j].y], [B[j].x, B[j].y], [B[i].x, B[i].y]])}" fill="${FILL}"/>`; }
    if (opt === 'base') body += `<polygon points="${pts(P(B))}" fill="${BASE}" opacity=".45"/>`;
    if (opt === 'side') {
      let bi = 0, best = -9;
      for (let k2 = 0; k2 < C.front.length - 1; k2++) { const i = C.front[k2], j = C.front[k2 + 1], s = (B[i].s + B[j].s) / 2; if (s > best) { best = s; bi = k2; } }
      const i = C.front[bi], j = C.front[bi + 1];
      body += `<polygon points="${pts([[T[i].x, T[i].y], [T[j].x, T[j].y], [B[j].x, B[j].y], [B[i].x, B[i].y]])}" fill="${SIDE}" opacity=".8"/>`;
    }
    body += `<polygon points="${pts(P(T))}" fill="${opt === 'base' ? BASE : SOFT}" opacity="${opt === 'base' ? '.9' : '1'}"/>`;
    // 모서리
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; body += line([B[i].x, B[i].y], [B[j].x, B[j].y], C.backEdge(i, j)); }
    for (let i = 0; i < n; i++) body += line([T[i].x, T[i].y], [B[i].x, B[i].y], C.hiddenV(i));
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; body += line([T[i].x, T[i].y], [T[j].x, T[j].y], false); }
    if (opt === 'h') { // 두 밑면 사이의 거리 (입체 밖에 치수선)
      const x = cx + R + 22, y1 = top, y2 = top + h;
      body += line([cx + R + 4, y1], [x + 6, y1], true, RED, 1.4) + line([cx + R + 4, y2], [x + 6, y2], true, RED, 1.4);
      body += line([x, y1 + 2], [x, y2 - 2], false, RED, 3.4) + `<polygon points="${pts([[x, y1], [x - 5, y1 + 9], [x + 5, y1 + 9]])}" fill="${RED}"/><polygon points="${pts([[x, y2], [x - 5, y2 - 9], [x + 5, y2 - 9]])}" fill="${RED}"/>`;
    }
    if (opt === 'v') { for (const p of T.concat(B)) body += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="4.2" fill="${RED}"/>`; }
    return wrap(W, H, body, '각기둥 그림');
  }

  function pyramid(n, opt) {
    const W = 230, H = 210, cx = 112, R = 76, k = 0.36, by = 158, apex = [cx, 26];
    const B = base(n, cx, by, R, k);
    const C = chains(B);
    let body = '';
    for (let k2 = 0; k2 < C.front.length - 1; k2++) { const i = C.front[k2], j = C.front[k2 + 1]; body += `<polygon points="${pts([apex, [B[i].x, B[i].y], [B[j].x, B[j].y]])}" fill="${FILL}"/>`; }
    if (opt === 'base') body += `<polygon points="${pts(B.map(p => [p.x, p.y]))}" fill="${BASE}" opacity=".75"/>`;
    if (opt === 'side') {
      let bi = 0, best = -9;
      for (let k2 = 0; k2 < C.front.length - 1; k2++) { const i = C.front[k2], j = C.front[k2 + 1], s = (B[i].s + B[j].s) / 2; if (s > best) { best = s; bi = k2; } }
      const i = C.front[bi], j = C.front[bi + 1];
      body += `<polygon points="${pts([apex, [B[i].x, B[i].y], [B[j].x, B[j].y]])}" fill="${SIDE}" opacity=".85"/>`;
    }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; body += line([B[i].x, B[i].y], [B[j].x, B[j].y], C.backEdge(i, j)); }
    for (let i = 0; i < n; i++) body += line(apex, [B[i].x, B[i].y], C.hiddenV(i));
    if (opt === 'h') {
      const foot = [cx, by];
      body += line(apex, foot, true, RED, 3) + `<polyline points="${pts([[cx, by - 10], [cx + 10, by - 10], [cx + 10, by - 4]])}" fill="none" stroke="${RED}" stroke-width="1.6"/>`;
    }
    if (opt === 'apex') body += `<circle cx="${apex[0]}" cy="${apex[1]}" r="11" fill="none" stroke="${RED}" stroke-width="2.5"/><circle cx="${apex[0]}" cy="${apex[1]}" r="4.5" fill="${RED}"/>`;
    return wrap(W, H, body, '각뿔 그림');
  }

  // 정다각형을 선분 (a→b)의 바깥쪽에 붙이기 (out: 바깥 방향 단위벡터)
  function regularOn(a, b, n, out) {
    const s = Math.hypot(b[0] - a[0], b[1] - a[1]), ap = s / (2 * Math.tan(Math.PI / n));
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], c = [mid[0] + out[0] * ap, mid[1] + out[1] * ap];
    const R = s / (2 * Math.sin(Math.PI / n)), a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
    const dir = ((b[0] - c[0]) * (a[1] - c[1]) - (b[1] - c[1]) * (a[0] - c[0])) > 0 ? -1 : 1;
    return Array.from({ length: n }, (_, i) => { const t = a0 + dir * 2 * Math.PI * i / n; return [c[0] + R * Math.cos(t), c[1] + R * Math.sin(t)]; });
  }
  // n각기둥 전개도
  function net(n, kind) {
    const s = n === 3 ? 40 : n === 4 ? 34 : n === 5 ? 30 : 26, h = n === 4 ? 56 : 52;
    const rects = kind === 'few' ? n - 1 : kind === 'more' ? n + 1 : n;
    const faces = [];
    for (let i = 0; i < rects; i++) faces.push([[i * s, 0], [(i + 1) * s, 0], [(i + 1) * s, h], [i * s, h]]);
    const mid = Math.floor((rects - 1) / 2);
    const topAt = kind === 'ok2' ? 0 : mid, botAt = kind === 'ok2' ? rects - 1 : kind === 'same' ? (mid + Math.max(1, Math.floor(rects / 2))) % rects : mid;
    const top = i => regularOn([i * s, 0], [(i + 1) * s, 0], n, [0, -1]);
    const bot = i => regularOn([(i + 1) * s, h], [i * s, h], n, [0, 1]);
    faces.push(top(topAt));
    faces.push(kind === 'same' ? top(botAt) : bot(botAt));
    // 경계: 한 번 나오는 선 = 자르는 선(실선), 두 번 = 접는 선(점선)
    const key = (a, b) => { const p = [f(a[0]), f(a[1])].join(','), q = [f(b[0]), f(b[1])].join(','); return p < q ? p + '|' + q : q + '|' + p; };
    const edges = new Map();
    for (const F of faces) for (let i = 0; i < F.length; i++) { const a = F[i], b = F[(i + 1) % F.length], k = key(a, b); const e = edges.get(k) || { a, b, c: 0 }; e.c++; edges.set(k, e); }
    const all = faces.flat(), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const pad = 14, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, W = Math.max(...xs) - x0 + pad, H = Math.max(...ys) - y0 + pad;
    const sh = p => [p[0] - x0, p[1] - y0];
    let body = faces.map((F, i) => `<polygon points="${pts(F.map(sh))}" fill="${i >= rects ? BASE : FILL}"${i >= rects ? ' fill-opacity=".7"' : ''}/>`).join('');
    for (const e of edges.values()) body += line(sh(e.a), sh(e.b), e.c > 1, INK, 2);
    return wrap(W, H, body, '전개도 그림');
  }

  function tiles(r, b) {
    const total = r + b, per = Math.max(7, Math.min(10, total)), rows = Math.ceil(total / per), c = 26, g = 6, pad = 14;
    const W = pad * 2 + per * c + (per - 1) * g, H = pad * 2 + rows * c + (rows - 1) * g;
    let body = '';
    for (let i = 0; i < total; i++) { const x = pad + (i % per) * (c + g), y = pad + Math.floor(i / per) * (c + g); body += `<rect x="${x}" y="${y}" width="${c}" height="${c}" rx="5" fill="${i < r ? RED : BLUE}" stroke="${INK}" stroke-width="1.2"/>`; }
    return wrap(W, H, body, '색 타일 그림');
  }
  // 그림 물건 (두 종류): objs:apple:6:orange:2
  const OBJ = { apple: '🍎', orange: '🍊', cat: '🐱', dog: '🐶', pencil: '✏️', book: '📕', star: '⭐', flower: '🌷' };
  function objs(a, r, b, n) {
    // 종류마다 줄을 따로 (한 줄에 10개까지) — 두 양을 세어 비교하기 쉽게
    const per = Math.max(7, Math.min(10, Math.max(r, n))), c = 30, pad = 12, gap = 8;
    const ra = Math.ceil(r / per), rb = Math.ceil(n / per);
    const W = pad * 2 + per * c, H = pad * 2 + (ra + rb) * c + gap;
    let body = '';
    const put = (count, icon, row0, dy) => { for (let i = 0; i < count; i++) { const x = pad + (i % per) * c + c / 2, y = pad + dy + (row0 + Math.floor(i / per)) * c + c * 0.78; body += `<text x="${x}" y="${y}" font-size="24" text-anchor="middle">${icon}</text>`; } };
    put(r, OBJ[a], 0, 0); put(n, OBJ[b], ra, gap);
    return wrap(W, H, body, '그림 물건');
  }
  function grid(k) {
    const c = 15, pad = 12, W = pad * 2 + c * 10, H = W;
    let body = '';
    for (let i = 0; i < 100; i++) { const x = pad + (i % 10) * c, y = pad + Math.floor(i / 10) * c; body += `<rect x="${x}" y="${y}" width="${c}" height="${c}" fill="${i < k ? '#7c5cff' : '#fff'}" stroke="#9a92c2" stroke-width=".8"/>`; }
    body += `<rect x="${pad}" y="${pad}" width="${c * 10}" height="${c * 10}" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
    return wrap(W, H, body, '모눈 그림');
  }
  function bars(a, b) {
    const c = 24, pad = 14, lab = 30, n = Math.max(a, b), W = pad * 2 + lab + n * c, H = pad * 2 + 2 * c + 14;
    let body = '';
    [[a, '가', '#ff8a5b'], [b, '나', '#4cc3ff']].forEach(([v, t, col], r) => {
      const y = pad + r * (c + 14);
      body += `<text x="${pad + 6}" y="${y + c * 0.72}" font-size="17" font-weight="700" fill="${INK}">${t}</text>`;
      for (let i = 0; i < v; i++) body += `<rect x="${pad + lab + i * c}" y="${y}" width="${c}" height="${c}" fill="${col}" stroke="${INK}" stroke-width="1.2"/>`;
    });
    return wrap(W, H, body, '막대 그림');
  }

  // 그림 이름 읽기 (검사용)
  function parse(spec) {
    const p = String(spec).split(':');
    const t = p[0], a = +p[1], b = p[2];
    if ((t === 'prism' || t === 'pyr') && a >= 3 && a <= 12) return { type: t, n: a, opt: b || '' };
    if (t === 'net' && a >= 3 && a <= 8 && ['ok', 'ok2', 'same', 'few', 'more'].indexOf(b) >= 0) return { type: t, n: a, kind: b, valid: b === 'ok' || b === 'ok2' };
    if (t === 'tiles' && a >= 0 && +b >= 0 && a + +b > 0 && a + +b <= 40) return { type: t, r: a, b: +b };
    if (t === 'grid' && a >= 0 && a <= 100) return { type: t, k: a };
    if (t === 'objs' && OBJ[p[1]] && OBJ[p[3]] && +p[2] > 0 && +p[4] > 0 && +p[2] + +p[4] <= 30) return { type: t, a: p[1], r: +p[2], b2: p[3], b: +p[4] };
    if (t === 'bars' && a > 0 && +b > 0 && Math.max(a, +b) <= 12) return { type: t, a, b: +b };
    return null;
  }
  function render(spec) {
    const q = parse(spec);
    if (!q) return '';
    if (q.type === 'prism') return prism(q.n, q.opt);
    if (q.type === 'pyr') return pyramid(q.n, q.opt);
    if (q.type === 'net') return net(q.n, q.kind);
    if (q.type === 'tiles') return tiles(q.r, q.b);
    if (q.type === 'grid') return grid(q.k);
    if (q.type === 'objs') return objs(q.a, q.r, q.b2, q.b);
    if (q.type === 'bars') return bars(q.a, q.b);
    return '';
  }
  const TOKEN = /\[\[fig:([a-z0-9:]+)\]\]/g;
  const specsIn = text => { const out = []; String(text || '').replace(TOKEN, (_, s) => { out.push(s); return ''; }); return out; };
  return { render, parse, specsIn, TOKEN };
});
