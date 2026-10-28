// 문제 그림 (SVG). 문제·보기 글 속에 [[fig:종류:값:옵션]] 을 넣으면 그 자리에 그림이 들어갑니다.
//   prism:n[:base|side|h|v]   n각기둥   (base 밑면 색칠, side 옆면 하나 색칠, h 높이 표시, v 꼭짓점 점)
//   pyr:n[:base|side|h|apex]  n각뿔     (apex 각뿔의 꼭짓점 표시)
//   net:n:종류                n각기둥 전개도 (ok 위·아래 같은 옆면 / ok2 위·아래 다른 옆면 / same 밑면 둘 다 위 / few 옆면 하나 모자람 / more 옆면 하나 많음)
//   tiles:빨강:파랑            색 타일
//   grid:k                    100칸 중 k칸 색칠
//   bars:a:b                  막대 가·나 (칸 수)
//   band:묶음:n|s:값…          띠그래프 (n 백분율 표시, s 눈금만) — 값의 합 100
//   band2:묶음:k:작년값…:올해값…  두 띠그래프 비교
//   pie:묶음:n|s:값…           원그래프 (둘레 눈금 100칸)
//   cub:가로:세로:높이:cm|m     직육면체 (0은 모르는 길이 □)
//   cubes:가로:세로:높이        쌓기나무 (한 개 1 cm³)
//   cubes2:가…:나…             쌓기나무 가·나 비교
//   tbl:묶음:k:윗줄값…:아랫줄값…  대응 관계 표 (k칸, q는 ? 칸)
//   shp:모양:값…:cm|m          평면도형 (rect 가로·세로 / sq 한 변 / par 밑변·높이·옆변 / tri 밑변·높이 / trap 윗변·아랫변·높이 / rhom 두 대각선 / reg 변 수·한 변) — 0은 □
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

  // ───── 5단원: 띠그래프·원그래프 ─────
  // 항목 이름 묶음 (그림 자리표에는 영문 이름만 쓸 수 있어서 묶음 이름으로 고름)
  const SETS = {
    fruit: ['사과', '포도', '귤', '바나나', '기타'], sport: ['축구', '피구', '농구', '줄넘기', '기타'], pet: ['강아지', '고양이', '햄스터', '물고기', '기타'],
    go: ['걷기', '자전거', '버스', '자동차', '기타'], season: ['봄', '여름', '가을', '겨울'], subj: ['수학', '체육', '미술', '음악', '기타'],
    food: ['떡볶이', '피자', '치킨', '김밥', '기타'], land: ['논', '밭', '숲', '주거지', '기타'], trash: ['종이', '플라스틱', '캔', '유리', '기타'],
    color: ['빨강', '파랑', '노랑', '초록', '기타'], book: ['동화책', '과학책', '만화책', '위인전', '기타'], abc: ['가', '나', '다', '라', '마'],
  };
  const PAL = ['#ff9f7a', '#7cc8ff', '#ffd76a', '#9be3a8', '#d3b8ff', '#ffb3d1'];
  const txt = (x, y, t, size, weight, anchor, color) => `<text x="${f(x)}" y="${f(y)}" font-size="${size}" font-weight="${weight || 400}" text-anchor="${anchor || 'middle'}" fill="${color || INK}" font-family="sans-serif">${t}</text>`;
  // 띠 하나 그리기 (x0부터 길이 L, 위쪽 y)
  function bandRow(names, vals, mode, x0, y, L, h) {
    let body = '', cum = 0;
    vals.forEach((v, i) => {
      const x = x0 + L * cum / 100, w = L * v / 100, cx = x + w / 2;
      body += `<rect x="${f(x)}" y="${y}" width="${f(w)}" height="${h}" fill="${PAL[i % PAL.length]}" stroke="${INK}" stroke-width="1.6"/>`;
      const nm = names[i], big = w >= 40 || (w >= 30 && nm.length <= 2), fs = w < 40 ? 13 : w >= 66 || nm.length <= 2 ? 17 : 14;
      if (big) {
        body += txt(cx, y + (mode === 'n' ? h / 2 - 3 : h / 2 + 6), nm, fs, 700);
        if (mode === 'n') body += txt(cx, y + h / 2 + 16, v + '%', w < 40 ? 12 : 15, 400);
      } else { // 좁은 칸은 띠 위에 이름을 씀
        body += txt(cx, y - 7, nm + (mode === 'n' ? ' ' + v + '%' : ''), 13, 700);
      }
      cum += v;
    });
    return body;
  }
  function ticks(x0, y, L) {
    let body = line([x0, y], [x0 + L, y], false, INK, 1.4);
    for (let t = 0; t <= 100; t += 5) { const x = x0 + L * t / 100; body += line([x, y], [x, y + (t % 10 ? 4 : 8)], false, INK, 1.2); if (t % 10 === 0) body += txt(x, y + 23, t, 13); }
    return body + txt(x0 + L + 16, y + 23, '(%)', 13, 400, 'start');
  }
  function band(set, mode, vals) {
    const names = SETS[set], x0 = 18, L = 340, top = vals.some(v => v * 3.4 < 40) ? 34 : 16, h = 54;
    const body = bandRow(names, vals, mode, x0, top, L, h) + ticks(x0, top + h + 6, L);
    return wrap(x0 + L + 52, top + h + 42, body, '띠그래프');
  }
  function band2(set, k, vals) { // 작년·올해 두 띠그래프
    const names = SETS[set], x0 = 56, L = 330, h = 50, a = vals.slice(0, k), b = vals.slice(k);
    const small = vals.some(v => v * 3.3 < 40), gapTop = small ? 20 : 6;
    let body = '', y = 14 + gapTop;
    [['작년', a], ['올해', b]].forEach(([lab, v]) => { body += txt(x0 - 10, y + h / 2 + 5, lab, 15, 700, 'end') + bandRow(names, v, 'n', x0, y, L, h); y += h + gapTop + 14; });
    body += ticks(x0, y - gapTop - 8, L);
    return wrap(x0 + L + 52, y + 24, body, '두 띠그래프');
  }
  function pie(set, mode, vals) {
    const names = SETS[set], cx = 160, cy = 158, R = 112, W = 320, H = 318;
    let body = '', cum = 0;
    const at = (pct, r) => { const t = -Math.PI / 2 + 2 * Math.PI * pct / 100; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; };
    vals.forEach((v, i) => {
      const a0 = at(cum, R), a1 = at(cum + v, R), large = v > 50 ? 1 : 0;
      body += `<path d="M${f(cx)},${f(cy)} L${f(a0[0])},${f(a0[1])} A${R},${R} 0 ${large} 1 ${f(a1[0])},${f(a1[1])} Z" fill="${PAL[i % PAL.length]}" stroke="${INK}" stroke-width="1.6"/>`;
      const m = at(cum + v / 2, R * (v < 15 ? 0.7 : 0.6));
      body += txt(m[0], m[1] + (mode === 'n' ? -2 : 5), names[i], v < 15 ? 12 : 15, 700);
      if (mode === 'n') body += txt(m[0], m[1] + 15, v + '%', 13);
      cum += v;
    });
    // 원 둘레 눈금 (1%마다, 10%마다 길게)
    for (let t = 0; t < 100; t++) { const p1 = at(t, R), p2 = at(t, R + (t % 10 ? 4 : 9)); body += line(p1, p2, false, INK, t % 10 ? 0.8 : 1.4); }
    for (let t = 0; t < 100; t += 10) { const p = at(t, R + 20); body += txt(p[0], p[1] + 4, t, 11); }
    body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
    return wrap(W, H, body, '원그래프');
  }

  // ───── 6단원: 직육면체·쌓기나무 ─────
  // cub:가로:세로:높이:단위 (0은 모르는 길이 □)
  // ───── 5학년 대응 관계 표 ─────
  const TBL = {
    tc: ['탁자 수(□)', '의자 수(△)'], bx: ['상자 수(□)', '공의 수(△)'], ag: ['동생 나이(□)', '형 나이(△)'], ct: ['자른 횟수(□)', '도막 수(△)'],
    cp: ['공책 수(□)', '공책값(△)'], tm: ['베이징 시각(□)', '서울 시각(△)'], st: ['줄 수(□)', '학생 수(△)'], wt: ['지난 시간(□)', '남은 물(△)'],
    sq: ['정사각형 수(□)', '꼭짓점 수(△)'], tr: ['삼각형 수(□)', '변의 수(△)'], cg: ['가진 돈(□)', '쓰고 남은 돈(△)'], lg: ['의자 수(□)', '다리 수(△)'],
  };
  function table(set, k, top, bot) {
    const [la, lb] = TBL[set], lw = 120, cw = 50, ch = 38, pad = 12, W = pad * 2 + lw + k * cw, H = pad * 2 + ch * 2;
    let body = '';
    [[la, top], [lb, bot]].forEach(([lab, vals], r) => {
      const y = pad + r * ch;
      body += `<rect x="${pad}" y="${y}" width="${lw}" height="${ch}" fill="${SOFT}" stroke="${INK}" stroke-width="1.4"/>` + txt(pad + lw / 2, y + ch * 0.64, lab, 14, 700);
      vals.forEach((v, i) => { const x = pad + lw + i * cw; body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` + txt(x + cw / 2, y + ch * 0.66, v === 'q' ? '?' : v, 17, 700, 'middle', v === 'q' ? RED : INK); });
    });
    return wrap(W, H, body, '대응 관계 표');
  }

  // ───── 5학년 평면도형 (둘레·넓이) ─────
  function shape(kind, v, unit) {
    const lab = x => (x === 0 ? '□' : x) + ' ' + unit;
    const W = 300, H = 210, pad = 34;
    let P = [], body = '', marks = '';
    const fit = (w, h) => { const k = Math.min((W - pad * 2) / w, (H - pad * 2) / h); return k; };
    const T = (x, y, t, anchor, color) => txt(x, y, t, 15, 700, anchor || 'middle', color);
    const right = (x, y, dx, dy) => `<polyline points="${f(x + dx * 9)},${f(y)} ${f(x + dx * 9)},${f(y + dy * 9)} ${f(x)},${f(y + dy * 9)}" fill="none" stroke="${RED}" stroke-width="1.4"/>`;
    if (kind === 'rect' || kind === 'sq') {
      const a = v[0] || 6, b = kind === 'sq' ? a : (v[1] || 4), k = Math.min((W - pad * 2 - 56) / a, (H - pad * 2) / b), w = a * k, h = b * k, x0 = (W - 56 - w) / 2, y0 = (H - h) / 2;
      P = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
      marks += T(x0 + w / 2, y0 + h + 22, lab(v[0])) + (kind === 'rect' ? T(x0 + w + 8, y0 + h / 2 + 5, lab(v[1]), 'start') : '');
    } else if (kind === 'par') {
      const a = v[0], h0 = v[1], sd = Math.max(v[2] || 0, h0 + 1), off = Math.sqrt(Math.max(1, sd * sd - h0 * h0)), k = fit(a + off, h0);
      const w = a * k, h = h0 * k, o = off * k, x0 = (W - w - o) / 2, y0 = (H - h) / 2;
      P = [[x0 + o, y0], [x0 + o + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
      marks += T(x0 + w / 2, y0 + h + 22, lab(v[0])) + line([x0 + o, y0], [x0 + o, y0 + h], true, RED, 1.8) + right(x0 + o, y0 + h, 1, -1) + T(x0 + o + 6, y0 + h / 2 + 5, lab(v[1]), 'start', RED);
      if (v[2]) marks += T(x0 + o / 2 - 10, y0 + h / 2, lab(v[2]), 'end');
    } else if (kind === 'tri') {
      const a = v[0], h0 = v[1], k = fit(a, h0), w = a * k, h = h0 * k, x0 = (W - w) / 2, y0 = (H - h) / 2, ax = x0 + w * 0.35;
      P = [[ax, y0], [x0 + w, y0 + h], [x0, y0 + h]];
      marks += T(x0 + w / 2, y0 + h + 22, lab(v[0])) + line([ax, y0], [ax, y0 + h], true, RED, 1.8) + right(ax, y0 + h, 1, -1) + T(ax + 6, y0 + h / 2 + 12, lab(v[1]), 'start', RED);
    } else if (kind === 'trap') {
      const a = v[0], bb = v[1], h0 = v[2], k = fit(bb, h0), w = bb * k, t = a * k, h = h0 * k, x0 = (W - w) / 2, y0 = (H - h) / 2, tx = x0 + (w - t) * 0.3;
      P = [[tx, y0], [tx + t, y0], [x0 + w, y0 + h], [x0, y0 + h]];
      marks += T(tx + t / 2, y0 - 8, lab(v[0])) + T(x0 + w / 2, y0 + h + 22, lab(v[1])) + line([tx + t, y0], [tx + t, y0 + h], true, RED, 1.8) + right(tx + t, y0 + h, -1, -1) + T(tx + t + 6, y0 + h / 2 + 5, lab(v[2]), 'start', RED);
    } else if (kind === 'rhom') {
      const d1 = v[0], d2 = v[1], k = fit(d1, d2), w = d1 * k, h = d2 * k, cx = W / 2, cy = H / 2;
      P = [[cx, cy - h / 2], [cx + w / 2, cy], [cx, cy + h / 2], [cx - w / 2, cy]];
      marks += line([cx - w / 2, cy], [cx + w / 2, cy], true, RED, 1.8) + line([cx, cy - h / 2], [cx, cy + h / 2], true, BLUE, 1.8) + T(cx + w / 4, cy - 7, lab(v[0]), 'middle', RED) + T(cx + 6, cy + h / 4 + 6, lab(v[1]), 'start', BLUE);
    } else if (kind === 'reg') {
      const n = v[0], R = 70, cx = W / 2, cy = H / 2 + 4;
      for (let i = 0; i < n; i++) { const t = -Math.PI / 2 + Math.PI / n + 2 * Math.PI * i / n; P.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]); }
      const a = P[Math.floor(n / 2)], b = P[Math.floor(n / 2) - 1 >= 0 ? Math.floor(n / 2) - 1 : n - 1];
      marks += T((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 22, lab(v[1]));
    }
    body = `<polygon points="${pts(P)}" fill="${SOFT}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` + marks;
    return wrap(W, H, body, '평면도형 그림');
  }

  function cuboid(a, b, c, unit) {
    const show = v => (v ? v : 0), da = show(a) || Math.max(b, c, 3), db = show(b) || Math.max(a, c, 3) * 0.6, dc = show(c) || Math.max(a, b, 3) * 0.7;
    const kx = 0.55, ky = 0.42; // 세로(안쪽) 방향을 비스듬히
    const s = Math.min(170 / (da + db * kx), 120 / (dc + db * ky), 34);
    const w = Math.max(da * s, 26), h = Math.max(dc * s, 24), dx = Math.max(db * s * kx, 14), dy = Math.max(db * s * ky, 11);
    const x0 = 56, y0 = 22 + dy;
    const F = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]; // 앞면 (왼위, 오위, 오아, 왼아)
    const Bk = F.map(p => [p[0] + dx, p[1] - dy]);
    let body = `<polygon points="${pts(F)}" fill="${SOFT}"/><polygon points="${pts([F[0], F[1], Bk[1], Bk[0]])}" fill="#fff6d6"/><polygon points="${pts([F[1], Bk[1], Bk[2], F[2]])}" fill="#dff1ff"/>`;
    // 보이지 않는 모서리 (뒤 왼쪽 아래 꼭짓점에서)
    body += line(Bk[3], Bk[0], true, INK, 1.6) + line(Bk[3], Bk[2], true, INK, 1.6) + line(Bk[3], F[3], true, INK, 1.6);
    for (let i = 0; i < 4; i++) body += line(F[i], F[(i + 1) % 4]);
    body += line(F[0], Bk[0]) + line(F[1], Bk[1]) + line(F[2], Bk[2]) + line(Bk[0], Bk[1]) + line(Bk[1], Bk[2]);
    const lab = v => (v ? `${v} ${unit}` : `□ ${unit}`);
    body += txt(x0 + w / 2, y0 + h + 22, lab(a), 15, 700, 'middle', a ? INK : RED);
    body += txt(x0 - 8, y0 + h / 2 + 5, lab(c), 15, 700, 'end', c ? INK : RED);
    body += txt(F[2][0] + dx / 2 + 12, F[2][1] - dy / 2 + 14, lab(b), 15, 700, 'start', b ? INK : RED);
    return wrap(x0 + w + dx + 70, y0 + h + 34, body, '직육면체 그림');
  }
  // 쌓기나무 (한 개 1 cm³): 가로 a개 × 세로 b개 × 높이 c층
  function cubeStack(a, b, c, ox, oy) {
    const s = 24, dx = 11, dy = 9;
    let body = '';
    for (let j = b - 1; j >= 0; j--) for (let k = 0; k < c; k++) for (let i = 0; i < a; i++) {
      const x = ox + i * s + j * dx, y = oy - k * s - j * dy;
      const fr = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
      const tp = [[x, y], [x + dx, y - dy], [x + s + dx, y - dy], [x + s, y]];
      const sd = [[x + s, y], [x + s + dx, y - dy], [x + s + dx, y + s - dy], [x + s, y + s]];
      body += `<polygon points="${pts(tp)}" fill="#ffe9a8" stroke="${INK}" stroke-width="1.1"/><polygon points="${pts(sd)}" fill="#e7b84a" stroke="${INK}" stroke-width="1.1"/><polygon points="${pts(fr)}" fill="#ffd76a" stroke="${INK}" stroke-width="1.1"/>`;
    }
    return { body, w: a * s + b * dx, h: c * s + b * dy };
  }
  function cubes(a, b, c) {
    const st = cubeStack(a, b, c, 18, 0), oy = 14 + (c - 1) * 24 + b * 9;
    const g = cubeStack(a, b, c, 18, oy);
    return wrap(st.w + 40, oy + 24 + 16, g.body, '쌓기나무 그림');
  }
  function cubes2(A, B) {
    const hA = (A[2] - 1) * 24 + A[1] * 9, hB = (B[2] - 1) * 24 + B[1] * 9, top = 34 + Math.max(hA, hB);
    const ga = cubeStack(A[0], A[1], A[2], 22, top), wa = A[0] * 24 + A[1] * 11;
    const gb = cubeStack(B[0], B[1], B[2], 22 + wa + 48, top), wb = B[0] * 24 + B[1] * 11;
    const body = txt(22 + wa / 2, 20, '가', 17, 700) + txt(22 + wa + 48 + wb / 2, 20, '나', 17, 700) + ga.body + gb.body;
    return wrap(22 + wa + 48 + wb + 26, top + 24 + 16, body, '쌓기나무 가와 나');
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
    const nums = p.slice(3).map(Number), sum = nums.reduce((x, y) => x + y, 0), okVals = (vs, min) => vs.length >= 2 && vs.length <= SETS[p[1]].length && vs.every(v => Number.isInteger(v) && v >= min) && vs.reduce((x, y) => x + y, 0) === 100;
    if ((t === 'band' || t === 'pie') && SETS[p[1]] && (p[2] === 'n' || p[2] === 's') && okVals(nums, t === 'pie' ? 10 : 5) && sum === 100) return { type: t, set: p[1], names: SETS[p[1]].slice(0, nums.length), mode: p[2], vals: nums };
    if (t === 'band2' && SETS[p[1]]) { const k = +p[2], vs = p.slice(3).map(Number); if (k >= 2 && vs.length === 2 * k && okVals(vs.slice(0, k), 5) && okVals(vs.slice(k), 5)) return { type: t, set: p[1], names: SETS[p[1]].slice(0, k), k, a: vs.slice(0, k), b: vs.slice(k) }; }
    if (t === 'cub' && (p[4] === 'cm' || p[4] === 'm')) { const d = [+p[1], +p[2], +p[3]]; if (d.every(v => Number.isInteger(v) && v >= 0 && v <= 200) && d.filter(v => v === 0).length <= 1) return { type: t, a: d[0], b: d[1], c: d[2], unit: p[4] }; }
    if (t === 'cubes') { const d = [+p[1], +p[2], +p[3]]; if (d[0] >= 1 && d[0] <= 6 && d[1] >= 1 && d[1] <= 4 && d[2] >= 1 && d[2] <= 4) return { type: t, a: d[0], b: d[1], c: d[2], count: d[0] * d[1] * d[2] }; }
    if (t === 'cubes2') { const d = p.slice(1).map(Number); if (d.length === 6 && d.every(v => Number.isInteger(v) && v >= 1 && v <= 6) && d[1] <= 4 && d[4] <= 4 && d[2] <= 4 && d[5] <= 4) return { type: t, A: d.slice(0, 3), B: d.slice(3), va: d[0] * d[1] * d[2], vb: d[3] * d[4] * d[5] }; }
    if (t === 'shp') { const kind = p[1], unit = p[p.length - 1], v = p.slice(2, -1).map(Number), need = { rect: 2, sq: 1, par: 3, tri: 2, trap: 3, rhom: 2, reg: 2 }[kind]; if (need && (unit === 'cm' || unit === 'm') && v.length === need && v.every(x => Number.isInteger(x) && x >= 0 && x <= 999) && (kind !== 'reg' || (v[0] >= 3 && v[0] <= 8 && v[1] > 0)) && (kind !== 'par' || (v[0] > 0 && v[1] > 0)) && (kind !== 'trap' || (v[0] > 0 && v[1] > v[0] && v[2] > 0)) && (kind !== 'tri' || (v[0] > 0 && v[1] > 0)) && (kind !== 'rhom' || (v[0] > 0 && v[1] > 0)) && v.filter(x => x === 0).length <= 1) return { type: t, kind, v, unit }; }
    if (t === 'tbl' && TBL[p[1]]) { const k = +p[2], v = p.slice(3); if (k >= 2 && k <= 6 && v.length === 2 * k && v.every(x => x === 'q' || /^\d{1,5}$/.test(x)) && v.filter(x => x === 'q').length <= 1) return { type: t, set: p[1], k, top: v.slice(0, k), bot: v.slice(k) }; }
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
    if (q.type === 'band') return band(q.set, q.mode, q.vals);
    if (q.type === 'band2') return band2(q.set, q.k, q.a.concat(q.b));
    if (q.type === 'pie') return pie(q.set, q.mode, q.vals);
    if (q.type === 'cub') return cuboid(q.a, q.b, q.c, q.unit);
    if (q.type === 'cubes') return cubes(q.a, q.b, q.c);
    if (q.type === 'cubes2') return cubes2(q.A, q.B);
    if (q.type === 'tbl') return table(q.set, q.k, q.top, q.bot);
    if (q.type === 'shp') return shape(q.kind, q.v, q.unit);
    return '';
  }
  const TOKEN = /\[\[fig:([a-z0-9:]+)\]\]/g;
  const specsIn = text => { const out = []; String(text || '').replace(TOKEN, (_, s) => { out.push(s); return ''; }); return out; };
  return { render, parse, specsIn, TOKEN, SETS, TBL };
});
