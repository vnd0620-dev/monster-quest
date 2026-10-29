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
//   stk:줄:칸:높이…            쌓기나무 (위에서 본 칸마다 쌓은 개수, 뒤쪽 줄부터 왼쪽→오른쪽, 0은 빈칸)
//   stkt:줄:칸:높이…           쌓기나무 + 위에서 본 모양(수 없이)
//   top:줄:칸:높이…            위에서 본 모양에 수 쓰기 (q는 □)
//   vw:높이…                   위·앞·옆에서 본 모양 (세로줄마다 정사각형 수)
//   lay:줄:칸:높이…            층별로 나타낸 모양 (1층, 2층, …)
//   cir:r|d:값:cm|m            원 (반지름 또는 지름 표시, 0은 □)
//   cyl:반지름:높이:cm|m       원기둥 (0은 표시 안 함, q는 □)
//   cone:반지름:높이:모선:cm|m  원뿔 (0은 표시 안 함, q는 □)
//   sph:반지름:cm|m            구
//   cnet:ok|same|one|tri:반지름:높이:cm|m   원기둥 전개도 (ok 바른 전개도 / same 밑면 둘이 같은 쪽 / one 밑면 하나 / tri 옆면이 직사각형 아님)
//   ang:각도:n|q|x             각 (n 각도 표시, q 는 ?°, x 표시 없음)
//   prot:각도                  각도기 위의 각 (눈금 읽기)
//   tg:각1:각2:각3             세 각이 표시된 삼각형 (q는 ?°, 왼쪽 아래·오른쪽 아래·위 순서)
//   tk:각1:각2                 표시 없는 삼각형 (직각이면 직각 표시)
//   ts:밑변:왼쪽변:오른쪽변:cm   세 변의 길이가 표시된 삼각형 (q는 □)
//   qd:trap|par|rhom|rect|sq|gen  표시 없는 사각형
//   pg:변 수:r|i|open|curve:0|a   다각형 (r 정다각형, i 일반, open 열린 도형, curve 굽은 선) — a는 대각선 모두
//   pll:거리:cm                평행선과 평행선 사이의 거리
//   bar:묶음:한 칸 값:값…      막대그래프 (세로)
//   lgr:묶음:한 칸 값:시작 값:값…  꺾은선그래프 (시작 값이 0이 아니면 물결선)
//   tf:모양:0|h|v|r90|r180|r270   모눈 위 도형 (h 오른쪽(왼쪽)으로 뒤집기, v 위(아래)쪽으로 뒤집기, r 시계 방향 돌리기)
//   mv:x1:y1:x2:y2             모눈 위 점 가(와 나) — 왼쪽 아래가 0:0, 나가 없으면 x2를 n
//   ln:seg|ray|rayb|line|angle|gap|curve   점 ㄱ, ㄴ을 지나는 선분/반직선(ㄱ에서 ㄴ쪽, rayb는 ㄴ에서 ㄱ쪽)/직선, 각과 각이 아닌 것
//   rul:mm                     자(cm, mm 눈금)와 0에서 시작하는 막대
//   clk:시:분:초                초바늘이 있는 시계
//   fb:n:k[:u]  fc:n:k          n칸 중 k칸 색칠한 띠(u는 똑같이 나누지 않음)·원
//   grp:묶음 수:한 묶음 개수:k    묶음 그림 (k묶음 색칠)
//   pic:묶음:큰 그림:작은 그림:값…  그림그래프
//   scl:최댓값:값  cup:최댓값:값     저울(g) · 비커(mL) 눈금
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
    town: ['가 마을', '나 마을', '다 마을', '라 마을', '마 마을'], farm: ['가 농장', '나 농장', '다 농장', '라 농장', '마 농장'], store: ['가 가게', '나 가게', '다 가게', '라 가게', '마 가게'],
    fruit: ['사과', '포도', '귤', '바나나', '기타'], sport: ['축구', '피구', '농구', '줄넘기', '기타'], pet: ['강아지', '고양이', '햄스터', '물고기', '기타'],
    go: ['걷기', '자전거', '버스', '자동차', '기타'], season: ['봄', '여름', '가을', '겨울'], subj: ['수학', '체육', '미술', '음악', '기타'],
    food: ['떡볶이', '피자', '치킨', '김밥', '기타'], land: ['논', '밭', '숲', '주거지', '기타'], trash: ['종이', '플라스틱', '캔', '유리', '기타'],
    color: ['빨강', '파랑', '노랑', '초록', '기타'], book: ['동화책', '과학책', '만화책', '위인전', '기타'], abc: ['가', '나', '다', '라', '마'],
    mon: ['3월', '4월', '5월', '6월', '7월', '8월'], hour: ['오전 9시', '10시', '11시', '낮 12시', '오후 1시', '2시'], day: ['월', '화', '수', '목', '금', '토'],
    yr: ['2020년', '2021년', '2022년', '2023년', '2024년', '2025년'], wk: ['1주', '2주', '3주', '4주', '5주', '6주'], cls: ['1반', '2반', '3반', '4반', '5반', '6반'],
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

  // ───── 6-2 공간과 입체: 쌓기나무 높이표 ─────
  // H[j][i]: 뒤쪽 줄(j=0)부터 앞쪽 줄, 왼쪽(i=0)부터 오른쪽
  function heightStack(H, ox, oy) {
    const s = 26, dx = 12, dy = 10, R = H.length, C = H[0].length;
    let body = '';
    for (let jb = 0; jb < R; jb++) { // 뒤쪽 줄부터 그림
      const j = R - 1 - jb; // j: 앞에서부터 깊이 (0 = 앞쪽 줄)
      const hrow = H[jb];
      const mx = Math.max(...H.flat());
      for (let k = 0; k < mx; k++) for (let i = 0; i < C; i++) {
        if (hrow[i] <= k) continue;
        const x = ox + i * s + j * dx, y = oy - k * s - j * dy;
        const fr = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
        const tp = [[x, y], [x + dx, y - dy], [x + s + dx, y - dy], [x + s, y]];
        const sd = [[x + s, y], [x + s + dx, y - dy], [x + s + dx, y + s - dy], [x + s, y + s]];
        body += `<polygon points="${pts(tp)}" fill="#ffe9a8" stroke="${INK}" stroke-width="1.1"/><polygon points="${pts(sd)}" fill="#e7b84a" stroke="${INK}" stroke-width="1.1"/><polygon points="${pts(fr)}" fill="#ffd76a" stroke="${INK}" stroke-width="1.1"/>`;
      }
    }
    const mx = Math.max(...H.flat());
    return { body, w: C * s + R * dx, h: mx * s + R * dy };
  }
  function topGrid(H, ox, oy, nums, cell) {
    const c = cell || 30; let body = '';
    H.forEach((row, j) => row.forEach((v, i) => {
      if (v === 0) return;
      const x = ox + i * c, y = oy + j * c;
      body += `<rect x="${f(x)}" y="${f(y)}" width="${c}" height="${c}" fill="${nums ? '#fff' : '#ffd76a'}" stroke="${INK}" stroke-width="1.6"/>`;
      if (nums) body += txt(x + c / 2, y + c / 2 + 6, v === 'q' ? '□' : v, 17, 700, 'middle', v === 'q' ? RED : INK);
    }));
    return { body, w: H[0].length * c, h: H.length * c };
  }
  const front = (x, y) => txt(x, y, '▲ 앞', 13, 700, 'middle', '#6b6490');
  function stk(H, withTop) {
    const R = H.length, mx = Math.max(...H.flat()), oy = 22 + (mx - 1) * 26 + R * 10;
    const g = heightStack(H, 24, oy);
    let body = g.body, W = g.w + 48, Hh = oy + 26 + 18;
    if (withTop) {
      const tx = W + 20, tg = topGrid(H, tx, 34, false);
      body += txt(tx + tg.w / 2, 22, '위에서 본 모양', 13, 700) + tg.body + front(tx + tg.w / 2, 34 + tg.h + 18);
      W = tx + tg.w + 24; Hh = Math.max(Hh, 34 + tg.h + 30);
    }
    return wrap(W, Hh, body, '쌓기나무 그림');
  }
  function topFig(H) {
    const tg = topGrid(H, 24, 20, true, 36);
    return wrap(tg.w + 48, tg.h + 48, tg.body + front(24 + tg.w / 2, 20 + tg.h + 20), '위에서 본 모양에 수를 쓴 그림');
  }
  function viewFig(cols) {
    const c = 22, mx = Math.max(...cols), W = cols.length * c + 28, Hh = mx * c + 24;
    let body = '';
    cols.forEach((h, i) => { for (let k = 0; k < h; k++) body += `<rect x="${14 + i * c}" y="${f(Hh - 12 - (k + 1) * c)}" width="${c}" height="${c}" fill="#ffd76a" stroke="${INK}" stroke-width="1.5"/>`; });
    return wrap(W, Hh, body, '본 모양');
  }
  function layFig(H) {
    const mx = Math.max(...H.flat()), c = 24, gw = H[0].length * c, gh = H.length * c;
    let body = '', x = 18;
    for (let fl = 1; fl <= mx; fl++) {
      body += txt(x + gw / 2, 20, fl + '층', 14, 700);
      H.forEach((row, j) => row.forEach((v, i) => {
        body += `<rect x="${x + i * c}" y="${32 + j * c}" width="${c}" height="${c}" fill="${v >= fl ? '#ffd76a' : '#fff'}" stroke="${v >= fl ? INK : '#cfc8e6'}" stroke-width="${v >= fl ? 1.5 : 1}"/>`;
      }));
      body += front(x + gw / 2, 32 + gh + 17);
      x += gw + 26;
    }
    return wrap(x - 8, 32 + gh + 28, body, '층별로 나타낸 모양');
  }
  // ───── 6-2 원·원기둥·원뿔·구 ─────
  const lenLab = (v, unit) => (v === 'q' ? '□' : v) + ' ' + unit;
  function circleFig(mode, v, unit) {
    const cx = 120, cy = 104, r = 74;
    let body = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SOFT}" stroke="${INK}" stroke-width="2.4"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="${INK}"/>`;
    const lab = lenLab(v === 0 ? 'q' : v, unit), col = v === 0 ? RED : INK;
    if (mode === 'r') body += line([cx, cy], [cx + r, cy], false, RED, 2.4) + txt(cx + r / 2, cy - 10, lab, 15, 700, 'middle', col);
    else body += line([cx - r, cy], [cx + r, cy], false, RED, 2.4) + txt(cx, cy - 10, lab, 15, 700, 'middle', col);
    return wrap(240, 208, body, mode === 'r' ? '반지름이 표시된 원' : '지름이 표시된 원');
  }
  function ell(cx, cy, rx, ry, half, dash) { // half: 'all' | 'front' | 'back'
    if (half === 'all') return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
    const sweep = half === 'front' ? 0 : 1;
    return `<path d="M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 ${sweep} ${cx + rx} ${cy}" fill="none" stroke="${INK}" stroke-width="${dash ? 1.6 : 2.2}"${dash ? ' stroke-dasharray="5 5"' : ''}/>`;
  }
  function cylFig(r, h, unit) {
    const cx = 110, rx = 62, ry = 18, top = 46, bot = 176;
    let body = `<rect x="${cx - rx}" y="${top}" width="${2 * rx}" height="${bot - top}" fill="${SOFT}"/><ellipse cx="${cx}" cy="${bot}" rx="${rx}" ry="${ry}" fill="${SOFT}"/><ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="#fff6d6"/>`;
    body += ell(cx, top, rx, ry, 'all') + line([cx - rx, top], [cx - rx, bot]) + line([cx + rx, top], [cx + rx, bot]) + ell(cx, bot, rx, ry, 'front') + ell(cx, bot, rx, ry, 'back', true);
    if (r !== 0) body += `<circle cx="${cx}" cy="${top}" r="3" fill="${INK}"/>` + line([cx, top], [cx + rx, top], false, RED, 2) + txt(cx + rx / 2, top - ry - 6, lenLab(r, unit), 14, 700, 'middle', r === 'q' ? RED : INK);
    if (h !== 0) body += txt(cx + rx + 8, (top + bot) / 2 + 5, lenLab(h, unit), 14, 700, 'start', h === 'q' ? RED : INK);
    return wrap(250, 212, body, '원기둥 그림');
  }
  function coneFig(r, h, l, unit) {
    const cx = 110, rx = 64, ry = 18, apex = [cx, 26], bot = 168;
    let body = `<polygon points="${pts([apex, [cx - rx, bot], [cx + rx, bot]])}" fill="${SOFT}"/><ellipse cx="${cx}" cy="${bot}" rx="${rx}" ry="${ry}" fill="${SOFT}"/>`;
    body += line(apex, [cx - rx, bot]) + line(apex, [cx + rx, bot]) + ell(cx, bot, rx, ry, 'front') + ell(cx, bot, rx, ry, 'back', true) + `<circle cx="${apex[0]}" cy="${apex[1]}" r="3.5" fill="${INK}"/>`;
    if (h !== 0) body += line(apex, [cx, bot], true, BLUE, 1.8) + txt(cx - 5, bot - 40, lenLab(h, unit), 13, 700, 'end', h === 'q' ? RED : BLUE);
    if (r !== 0) body += `<circle cx="${cx}" cy="${bot}" r="3" fill="${INK}"/>` + line([cx, bot], [cx + rx, bot], false, RED, 2) + txt(cx + rx / 2, bot + 30, lenLab(r, unit), 14, 700, 'middle', r === 'q' ? RED : INK);
    if (l !== 0) body += txt(cx + rx / 2 + 16, (apex[1] + bot) / 2 - 6, lenLab(l, unit), 14, 700, 'start', l === 'q' ? RED : INK);
    return wrap(250, 212, body, '원뿔 그림');
  }
  function sphFig(r, unit) {
    const cx = 110, cy = 100, R = 72;
    let body = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${SOFT}" stroke="${INK}" stroke-width="2.4"/>` + ell(cx, cy, R, 20, 'front') + ell(cx, cy, R, 20, 'back', true) + `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${INK}"/>`;
    if (r !== 0) { const e = [cx + R * 0.7071, cy - R * 0.7071]; body += line([cx, cy], e, false, RED, 2.2) + txt(cx + R * 0.35 - 10, cy - R * 0.35 - 8, lenLab(r, unit), 14, 700, 'end', r === 'q' ? RED : INK); }
    return wrap(230, 200, body, '구 그림');
  }
  function cnetFig(kind, r, h, unit) {
    const W = 300, rr = 26, rw = 2 * Math.PI * rr, rh = 80, x0 = (W - rw) / 2, y0 = 18 + 2 * rr + 4;
    let body = '';
    if (kind === 'tri') body += `<polygon points="${pts([[x0 + 18, y0], [x0 + rw - 18, y0], [x0 + rw, y0 + rh], [x0, y0 + rh]])}" fill="${SOFT}" stroke="${INK}" stroke-width="2.2"/>`;
    else body += `<rect x="${f(x0)}" y="${y0}" width="${f(rw)}" height="${rh}" fill="${SOFT}" stroke="${INK}" stroke-width="2.2"/>`;
    const circ = (cx, cy) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${rr}" fill="#fff6d6" stroke="${INK}" stroke-width="2.2"/>`;
    const topC = [x0 + rw * 0.35, y0 - rr], botC = [x0 + rw * 0.35, y0 + rh + rr], botSame = [x0 + rw * 0.75, y0 - rr];
    body += circ(topC[0], topC[1]);
    if (kind === 'ok' || kind === 'tri') body += circ(botC[0], botC[1]);
    if (kind === 'same') body += circ(botSame[0], botSame[1]);
    if (r) body += `<circle cx="${f(topC[0])}" cy="${f(topC[1])}" r="2.6" fill="${INK}"/>` + line(topC, [topC[0] + rr, topC[1]], false, RED, 2) + txt(topC[0] - rr - 6, topC[1] + 5, lenLab(r, unit), 13, 700, 'end', r === 'q' ? RED : INK);
    if (h) body += txt(x0 + rw + 8, y0 + rh / 2 + 5, lenLab(h, unit), 13, 700, 'start', h === 'q' ? RED : INK);
    if (r || h) body += txt(x0 + rw / 2 + 40, y0 + rh / 2 + 5, '옆면', 13, 700, 'middle', '#6b6490');
    return wrap(W + 40, y0 + rh + 2 * rr + 18, body, '원기둥의 전개도');
  }

  // ───── 4학년: 각, 삼각형, 사각형, 다각형, 그래프, 이동 ─────
  const rad = d => d * Math.PI / 180;
  const degLab = (v, mode) => mode === 'q' ? '?°' : v + '°';
  function arcPath(cx, cy, r, a0, a1) { // 화면 좌표: 각은 반시계 방향(위쪽)으로
    const p0 = [cx + r * Math.cos(rad(a0)), cy - r * Math.sin(rad(a0))], p1 = [cx + r * Math.cos(rad(a1)), cy - r * Math.sin(rad(a1))];
    return `<path d="M ${f(p0[0])} ${f(p0[1])} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${f(p1[0])} ${f(p1[1])}" fill="none" stroke="${RED}" stroke-width="2"/>`;
  }
  function angFig(d, mode) {
    const W = 260, H = d > 90 ? 170 : 180, cx = d > 90 ? 150 : 50, cy = H - 30, L = 150;
    let body = line([cx, cy], [cx + L * (d > 90 ? 0.65 : 1), cy]) + line([cx, cy], [cx + L * Math.cos(rad(d)) * (d > 90 ? 0.75 : 1), cy - L * Math.sin(rad(d)) * (d > 90 ? 0.75 : 1)]);
    body += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${INK}"/>`;
    if (d === 90) body += `<polyline points="${cx + 18},${cy} ${cx + 18},${cy - 18} ${cx},${cy - 18}" fill="none" stroke="${RED}" stroke-width="2"/>`;
    else body += arcPath(cx, cy, 30, 0, d);
    if (mode !== 'x') { const m = d / 2; body += txt(cx + 52 * Math.cos(rad(m)), cy - 52 * Math.sin(rad(m)) + 6, degLab(d, mode), 16, 700, 'middle', RED); }
    return wrap(W, H, body, '각 그림');
  }
  function protFig(d) {
    const cx = 160, cy = 170, R = 130;
    let body = `<path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z" fill="#fff6d6" stroke="${INK}" stroke-width="2"/>`;
    for (let a = 0; a <= 180; a += 5) {
      const big = a % 10 === 0, r0 = R - (big ? 12 : 7);
      body += line([cx + R * Math.cos(rad(a)), cy - R * Math.sin(rad(a))], [cx + r0 * Math.cos(rad(a)), cy - r0 * Math.sin(rad(a))], false, INK, big ? 1.4 : 0.9);
      if (big) body += txt(cx + (R - 22) * Math.cos(rad(a)), cy - (R - 22) * Math.sin(rad(a)) + 3, a, a % 30 === 0 ? 10 : 8, 700, 'middle', a % 30 === 0 ? INK : '#6b6490');
    }
    body += line([cx, cy], [cx + R + 20, cy], false, BLUE, 2.4) + line([cx, cy], [cx + (R + 20) * Math.cos(rad(d)), cy - (R + 20) * Math.sin(rad(d))], false, BLUE, 2.4) + `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${INK}"/>`;
    return wrap(330, 196, body, '각도기 그림');
  }
  function triPts(A, B, base) { // 왼쪽 아래 각 A, 오른쪽 아래 각 B → 꼭짓점
    const tA = Math.tan(rad(A)), tB = Math.tan(rad(B));
    const x = base * tB / (tA + tB), y = x * tA;
    return [[0, 0], [base, 0], [x, y]];
  }
  function fitTri(P, W, H, pad) {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), minx = Math.min(...xs), maxx = Math.max(...xs), maxy = Math.max(...ys);
    const k = Math.min((W - 2 * pad) / (maxx - minx), (H - 2 * pad) / maxy);
    const ox = (W - (maxx - minx) * k) / 2 - minx * k;
    return P.map(p => [ox + p[0] * k, H - pad - p[1] * k]);
  }
  function tgFig(a, b, c, labels) {
    const A = a === 'q' ? 180 - b - c : a, B = b === 'q' ? 180 - a - c : b;
    const P = fitTri(triPts(A, B, 100), 280, 200, 34);
    let body = `<polygon points="${pts(P)}" fill="${SOFT}" stroke="${INK}" stroke-width="2.2"/>`;
    const vals = [a, b, c], angs = [A, B, 180 - A - B];
    if (labels) P.forEach((p, i) => {
      const o = P.filter((_, j) => j !== i), mx = (o[0][0] + o[1][0]) / 2, my = (o[0][1] + o[1][1]) / 2, dx = mx - p[0], dy = my - p[1], L = Math.hypot(dx, dy);
      const t = vals[i] === 'q' ? '?°' : vals[i] + '°';
      const off = Math.abs(angs[i] - 90) < 1e-6 ? 36 : 28; body += txt(p[0] + dx / L * off, p[1] + dy / L * off + 5, t, 14, 700, 'middle', vals[i] === 'q' ? RED : INK);
    });
    angs.forEach((g, i) => { if (Math.abs(g - 90) < 1e-6) { const p = P[i], o = P.filter((_, j) => j !== i); const u = o.map(q => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); return [dx / L * 14, dy / L * 14]; }); body += `<polyline points="${f(p[0] + u[0][0])},${f(p[1] + u[0][1])} ${f(p[0] + u[0][0] + u[1][0])},${f(p[1] + u[0][1] + u[1][1])} ${f(p[0] + u[1][0])},${f(p[1] + u[1][1])}" fill="none" stroke="${RED}" stroke-width="1.8"/>`; } });
    return wrap(280, 200, body, '삼각형 그림');
  }
  function tsFig(a, l, r, unit) {
    const A_ = +a || 6, L_ = +l || 5, R_ = +r || 5;
    const x = (A_ * A_ + L_ * L_ - R_ * R_) / (2 * A_), y = Math.sqrt(Math.max(L_ * L_ - x * x, 0.5));
    const P = fitTri([[0, 0], [A_, 0], [x, y]], 280, 200, 36);
    const lab = v => (v === 'q' ? '□' : v) + ' ' + unit, col = v => (v === 'q' ? RED : INK);
    let body = `<polygon points="${pts(P)}" fill="${SOFT}" stroke="${INK}" stroke-width="2.2"/>`;
    body += txt((P[0][0] + P[1][0]) / 2, P[0][1] + 22, lab(a), 14, 700, 'middle', col(a));
    body += txt((P[0][0] + P[2][0]) / 2 - 10, (P[0][1] + P[2][1]) / 2, lab(l), 14, 700, 'end', col(l));
    body += txt((P[1][0] + P[2][0]) / 2 + 10, (P[1][1] + P[2][1]) / 2, lab(r), 14, 700, 'start', col(r));
    return wrap(280, 210, body, '삼각형 그림');
  }
  const QD = { trap: [[0, 0], [10, 0], [7.5, 5], [2.5, 5]], par: [[0, 0], [8, 0], [10.5, 5], [2.5, 5]], rhom: [[0, 3.5], [5, 0], [10, 3.5], [5, 7]], rect: [[0, 0], [10, 0], [10, 5.5], [0, 5.5]], sq: [[0, 0], [7, 0], [7, 7], [0, 7]], gen: [[0, 0], [9, 1], [7.5, 6], [1.5, 4.5]] };
  function qdFig(kind) {
    const P0 = QD[kind], xs = P0.map(p => p[0]), ys = P0.map(p => p[1]), k = Math.min(200 / Math.max(...xs), 120 / Math.max(...ys));
    const P = P0.map(p => [30 + p[0] * k, 150 - p[1] * k]);
    return wrap(260, 175, `<polygon points="${pts(P)}" fill="${SOFT}" stroke="${INK}" stroke-width="2.2"/>`, '사각형 그림');
  }
  function pgFig(n, kind, diag) {
    const cx = 120, cy = 108, R = 82;
    let P = Array.from({ length: n }, (_, i) => { const t = -Math.PI / 2 + 2 * Math.PI * i / n; return [cx + R * Math.cos(t), cy + R * Math.sin(t)]; });
    if (kind === 'i') P = P.map((p, i) => { const k = [1, 0.78, 0.95, 0.7, 1, 0.85, 0.9, 0.8][i % 8]; return [cx + (p[0] - cx) * k, cy + (p[1] - cy) * (k + 0.05 > 1 ? 1 : k + 0.05)]; });
    let body = '';
    if (kind === 'curve') body = `<path d="M ${f(P[0][0])} ${f(P[0][1])} ${P.slice(1).map((p, i) => `Q ${f((p[0] + P[i][0]) / 2 + 16)} ${f((p[1] + P[i][1]) / 2 - 16)} ${f(p[0])} ${f(p[1])}`).join(' ')} Q ${f((P[0][0] + P[n - 1][0]) / 2 - 16)} ${f((P[0][1] + P[n - 1][1]) / 2)} ${f(P[0][0])} ${f(P[0][1])}" fill="${SOFT}" stroke="${INK}" stroke-width="2.2"/>`;
    else if (kind === 'open') body = `<polyline points="${pts(P)}" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
    else body = `<polygon points="${pts(P)}" fill="${SOFT}" stroke="${INK}" stroke-width="2.2"/>`;
    if (diag === 'a' && (kind === 'r' || kind === 'i')) for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; body += line(P[i], P[j], true, RED, 1.6); }
    return wrap(240, 216, body, '도형 그림');
  }
  function pllFig(d, unit) {
    const y1 = 40, y2 = 130;
    let body = line([20, y1], [300, y1]) + line([20, y2], [300, y2]);
    body += line([70, y1], [40, y2], true, '#9a92c2', 1.4) + line([250, y1], [290, y2], true, '#9a92c2', 1.4);
    body += line([160, y1], [160, y2], false, RED, 2.4) + `<polyline points="${160},${y2 - 12} ${172},${y2 - 12} ${172},${y2}" fill="none" stroke="${RED}" stroke-width="1.6"/>`;
    body += txt(168, (y1 + y2) / 2 + 5, (d === 'q' ? '□' : d) + ' ' + unit, 15, 700, 'start', d === 'q' ? RED : RED);
    return wrap(320, 170, body, '평행선 그림');
  }
  function axes(set, step, vals, base, kind) {
    const names = SETS[set].slice(0, vals.length), n = vals.length;
    const top = Math.max(...vals), lo = base || 0, ticks = Math.ceil((top - lo) / step) + 1;
    const ox = 46, oy = 200, cw = Math.min(56, 260 / n), chH = 150, th = chH / ticks;
    let body = line([ox, oy], [ox + cw * n + 10, oy]) + line([ox, oy], [ox, oy - chH - 6]);
    for (let t = 0; t <= ticks; t++) { const y = oy - t * th; body += line([ox, y], [ox + cw * n + 10, y], false, '#ddd7f0', 1) + txt(ox - 6, y + 4, lo + t * step, 11, 700, 'end'); }
    if (lo > 0) body += `<path d="M ${ox - 6} ${oy - 4} l 4 -5 l 4 5 l 4 -5" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
    const Y = v => oy - (v - lo) / step * th;
    if (kind === 'bar') vals.forEach((v, i) => { const x = ox + 8 + i * cw; body += `<rect x="${f(x)}" y="${f(Y(v))}" width="${f(cw * 0.6)}" height="${f(oy - Y(v))}" fill="${PAL[i % PAL.length]}" stroke="${INK}" stroke-width="1.2"/>`; });
    else { const P = vals.map((v, i) => [ox + 8 + cw * 0.3 + i * cw, Y(v)]); body += `<polyline points="${pts(P)}" fill="none" stroke="${BLUE}" stroke-width="2.6"/>` + P.map(p => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="4" fill="${BLUE}"/>`).join(''); }
    names.forEach((nm, i) => { body += txt(ox + 8 + cw * 0.3 + i * cw, oy + 18, nm, 11, 700); });
    return wrap(ox + cw * n + 30, oy + 30, body, kind === 'bar' ? '막대그래프' : '꺾은선그래프');
  }
  const TF = { L: [[0, 0], [0, 1], [0, 2], [1, 0]], F: [[1, 0], [1, 1], [1, 2], [2, 2], [0, 1]], P: [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2]], T: [[0, 2], [1, 2], [2, 2], [1, 1], [0, 1]] };
  function tfCells(shape, op) {
    let C = TF[shape].map(c => c.slice());
    const flipH = cs => cs.map(([x, y]) => [-x, y]), flipV = cs => cs.map(([x, y]) => [x, -y]), rot = cs => cs.map(([x, y]) => [y, -x]); // 시계 방향 90°
    if (op === 'h') C = flipH(C); if (op === 'v') C = flipV(C);
    const r = { r90: 1, r180: 2, r270: 3 }[op] || 0; for (let i = 0; i < r; i++) C = rot(C);
    const mx = Math.min(...C.map(c => c[0])), my = Math.min(...C.map(c => c[1]));
    return C.map(([x, y]) => [x - mx, y - my]);
  }
  function tfFig(shape, op) {
    const C = tfCells(shape, op), c = 34, g = 4, ox = 14, oy = 14;
    let body = '';
    for (let i = 0; i <= g; i++) body += line([ox, oy + i * c], [ox + g * c, oy + i * c], false, '#ddd7f0', 1) + line([ox + i * c, oy], [ox + i * c, oy + g * c], false, '#ddd7f0', 1);
    const off = [Math.floor((g - 1 - Math.max(...C.map(q => q[0]))) / 2), Math.floor((g - 1 - Math.max(...C.map(q => q[1]))) / 2)];
    C.forEach(([x, y]) => { body += `<rect x="${ox + (x + off[0]) * c}" y="${oy + (g - 1 - y - off[1]) * c}" width="${c}" height="${c}" fill="#ffd76a" stroke="${INK}" stroke-width="1.6"/>`; });
    return wrap(g * c + 28, g * c + 28, body, '모눈 위 도형');
  }
  function mvFig(x1, y1, x2, y2) {
    const c = 30, gx = 7, gy = 5, ox = 16, oy = 16;
    let body = '';
    for (let i = 0; i <= gx; i++) body += line([ox + i * c, oy], [ox + i * c, oy + gy * c], false, '#ddd7f0', 1);
    for (let j = 0; j <= gy; j++) body += line([ox, oy + j * c], [ox + gx * c, oy + j * c], false, '#ddd7f0', 1);
    const P = (x, y) => [ox + x * c, oy + (gy - y) * c];
    const a = P(x1, y1); body += `<circle cx="${a[0]}" cy="${a[1]}" r="6" fill="${RED}"/>` + txt(a[0] - 10, a[1] - 9, '가', 14, 700, 'middle', RED);
    if (x2 !== 'n') { const b2 = P(x2, y2); body += `<circle cx="${b2[0]}" cy="${b2[1]}" r="6" fill="${BLUE}"/>` + txt(b2[0] + 11, b2[1] - 9, '나', 14, 700, 'middle', BLUE); }
    return wrap(gx * c + 32, gy * c + 32, body, '점의 이동');
  }


  // ───── 3학년: 선, 자, 시계, 분수 띠·원, 묶음, 그림그래프, 저울, 비커 ─────
  function lnFig(kind) {
    const A = [70, 100], B = [190, 100], dot = (p, t, dx) => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${INK}"/>` + txt(p[0] + (dx || 0), p[1] + 24, t, 15, 700);
    let body = '';
    if (kind === 'seg') body = line(A, B) + dot(A, 'ㄱ') + dot(B, 'ㄴ');
    else if (kind === 'ray') body = line(A, [250, 100]) + `<polygon points="250,100 238,94 238,106" fill="${INK}"/>` + dot(A, 'ㄱ') + dot(B, 'ㄴ');
    else if (kind === 'rayb') body = line([10, 100], B) + `<polygon points="10,100 22,94 22,106" fill="${INK}"/>` + dot(A, 'ㄱ') + dot(B, 'ㄴ');
    else if (kind === 'line') body = line([10, 100], [250, 100]) + `<polygon points="250,100 238,94 238,106" fill="${INK}"/><polygon points="10,100 22,94 22,106" fill="${INK}"/>` + dot(A, 'ㄱ') + dot(B, 'ㄴ');
    else if (kind === 'angle') body = line([90, 130], [230, 130]) + line([90, 130], [190, 30]) + `<circle cx="90" cy="130" r="4.5" fill="${INK}"/>`;
    else if (kind === 'gap') body = line([90, 130], [230, 130]) + line([100, 118], [190, 30]);
    else if (kind === 'curve') body = `<path d="M 90 130 L 230 130 M 90 130 Q 110 60 190 30" fill="none" stroke="${INK}" stroke-width="2.2"/>` + `<circle cx="90" cy="130" r="4.5" fill="${INK}"/>`;
    return wrap(260, 150, body, '선 그림');
  }
  function rulFig(mm) {
    const ox = 20, k = 3.4, W = (Math.ceil(mm / 10) + 1) * 10 * k + 40;
    const cmN = Math.ceil(mm / 10) + 1;
    let body = `<rect x="${ox - 8}" y="70" width="${cmN * 10 * k + 16}" height="46" rx="4" fill="#fff6d6" stroke="${INK}" stroke-width="1.6"/>`;
    for (let i = 0; i <= cmN * 10; i++) { const x = ox + i * k, big = i % 10 === 0, mid = i % 5 === 0; body += line([x, 70], [x, 70 + (big ? 16 : mid ? 11 : 7)], false, INK, big ? 1.4 : 0.8); if (big) body += txt(x, 104, i / 10, 11, 700); }
    body += `<rect x="${ox}" y="36" width="${f(mm * k)}" height="20" rx="3" fill="#7cc8ff" stroke="${INK}" stroke-width="1.4"/>`;
    body += line([ox + mm * k, 30], [ox + mm * k, 70], true, RED, 1.4);
    return wrap(W, 130, body, '자와 막대');
  }
  function clkFig(h, m, s) {
    const cx = 100, cy = 100, R = 82;
    let body = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${INK}" stroke-width="3"/>`;
    for (let i = 0; i < 60; i++) { const a = rad(90 - i * 6), big = i % 5 === 0, r0 = R - (big ? 10 : 5); body += line([cx + R * Math.cos(a), cy - R * Math.sin(a)], [cx + r0 * Math.cos(a), cy - r0 * Math.sin(a)], false, INK, big ? 2 : 0.9); }
    for (let i = 1; i <= 12; i++) { const a = rad(90 - i * 30); body += txt(cx + (R - 22) * Math.cos(a), cy - (R - 22) * Math.sin(a) + 6, i, 16, 700); }
    const hand = (deg, L, w, c) => line([cx, cy], [cx + L * Math.cos(rad(90 - deg)), cy - L * Math.sin(rad(90 - deg))], false, c, w);
    body += hand((h % 12) * 30 + m * 0.5 + s / 120, 42, 5, INK) + hand(m * 6 + s * 0.1, 62, 3.4, INK) + hand(s * 6, 70, 1.6, RED) + `<circle cx="${cx}" cy="${cy}" r="5" fill="${RED}"/>`;
    return wrap(200, 200, body, '시계');
  }
  const UNEQ = [0.12, 0.2, 0.3, 0.38, 0.5, 0.62, 0.7, 0.8, 0.88];
  function fbFig(n, k, uneq) {
    const x0 = 20, W = 260, y = 30, h = 50;
    const cuts = [0]; for (let i = 1; i < n; i++) cuts.push(uneq ? (i === 1 ? 0.18 : i / n + (i % 2 ? 0.07 : -0.05)) : i / n); cuts.push(1);
    let body = '';
    for (let i = 0; i < n; i++) body += `<rect x="${f(x0 + cuts[i] * W)}" y="${y}" width="${f((cuts[i + 1] - cuts[i]) * W)}" height="${h}" fill="${i < k ? '#ffb3d1' : '#fff'}" stroke="${INK}" stroke-width="1.8"/>`;
    return wrap(W + 40, h + 60, body, '분수 띠');
  }
  function fcFig(n, k) {
    const cx = 90, cy = 90, R = 70;
    let body = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
    for (let i = 0; i < n; i++) { const a0 = rad(90 - i * 360 / n), a1 = rad(90 - (i + 1) * 360 / n); const p0 = [cx + R * Math.cos(a0), cy - R * Math.sin(a0)], p1 = [cx + R * Math.cos(a1), cy - R * Math.sin(a1)];
      if (i < k) body += `<path d="M ${cx} ${cy} L ${f(p0[0])} ${f(p0[1])} A ${R} ${R} 0 ${360 / n > 180 ? 1 : 0} 1 ${f(p1[0])} ${f(p1[1])} Z" fill="#ffb3d1" stroke="${INK}" stroke-width="1.6"/>`;
      body += line([cx, cy], p0, false, INK, 1.6); }
    return wrap(180, 180, body, '분수 원');
  }
  function grpFig(g, per, k) {
    const c = 22, pad = 10, cols = Math.min(g, 4), rows = Math.ceil(g / 4), inCol = Math.min(per, 4), inRow = Math.ceil(per / 4);
    const bw = inCol * c + 14, bh = inRow * c + 14, W = pad * 2 + cols * (bw + 10), H = pad * 2 + rows * (bh + 10);
    let body = '';
    for (let i = 0; i < g; i++) { const bx = pad + (i % 4) * (bw + 10), by = pad + Math.floor(i / 4) * (bh + 10);
      body += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="${i < k ? '#ffe4ef' : '#fff'}" stroke="${i < k ? RED : '#9a92c2'}" stroke-width="${i < k ? 2.2 : 1.4}"/>`;
      for (let j = 0; j < per; j++) body += `<circle cx="${bx + 7 + c / 2 + (j % 4) * c}" cy="${by + 7 + c / 2 + Math.floor(j / 4) * c}" r="8" fill="${i < k ? '#ff7aa8' : '#ffd76a'}" stroke="${INK}" stroke-width="1.2"/>`; }
    return wrap(W, H, body, '묶음 그림');
  }
  function picFig(set, big, small, vals) {
    const names = SETS[set].slice(0, vals.length), rh = 34, ox = 90, W = 380;
    let body = line([ox, 10], [ox, 14 + rh * vals.length], false, INK, 1.2);
    vals.forEach((v, i) => { const y = 14 + i * rh + rh / 2, nb = Math.floor(v / big), ns = Math.round((v % big) / small); body += txt(ox - 10, y + 5, names[i], 13, 700, 'end'); body += line([10, 14 + (i + 1) * rh], [W - 10, 14 + (i + 1) * rh], false, '#ddd7f0', 1);
      let x = ox + 18; for (let j = 0; j < nb; j++) { body += `<circle cx="${x}" cy="${y}" r="12" fill="#ff9f7a" stroke="${INK}" stroke-width="1.4"/>`; x += 28; } for (let j = 0; j < ns; j++) { body += `<circle cx="${x - 4}" cy="${y}" r="6" fill="#7cc8ff" stroke="${INK}" stroke-width="1.2"/>`; x += 16; } });
    const ly = 14 + rh * vals.length + 20;
    body += `<circle cx="${ox + 18}" cy="${ly}" r="12" fill="#ff9f7a" stroke="${INK}" stroke-width="1.4"/>` + txt(ox + 36, ly + 5, big + '', 13, 700, 'start') + `<circle cx="${ox + 110}" cy="${ly}" r="6" fill="#7cc8ff" stroke="${INK}" stroke-width="1.2"/>` + txt(ox + 122, ly + 5, small + '', 13, 700, 'start');
    return wrap(W, ly + 22, body, '그림그래프');
  }
  function sclFig(max, v) {
    const cx = 110, cy = 112, R = 86;
    let body = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${INK}" stroke-width="3"/>`;
    const tick = max <= 1000 ? 10 : 100, bigT = max <= 1000 ? 100 : 500, labT = max <= 1000 ? 100 : 1000;
    for (let val = 0; val < max; val += tick) { const a = rad(90 - val / max * 360), big = val % bigT === 0, r0 = R - (big ? 12 : 6); body += line([cx + R * Math.cos(a), cy - R * Math.sin(a)], [cx + r0 * Math.cos(a), cy - r0 * Math.sin(a)], false, INK, big ? 1.8 : 0.8);
      if (val % labT === 0) body += txt(cx + (R - 26) * Math.cos(a), cy - (R - 26) * Math.sin(a) + 4, max <= 1000 ? val : val / 1000 + ' kg', 11, 700); }
    const a = rad(90 - v / max * 360); body += line([cx, cy], [cx + (R - 8) * Math.cos(a), cy - (R - 8) * Math.sin(a)], false, RED, 2.8) + `<circle cx="${cx}" cy="${cy}" r="5" fill="${RED}"/>` + txt(cx, cy + 34, max <= 1000 ? 'g' : '', 12, 700);
    return wrap(220, 220, body, '저울 눈금');
  }
  function cupFig(max, v) {
    const x = 70, y = 20, w = 90, h = 170, k = h / max, step = max <= 1000 ? 100 : 200;
    let body = `<rect x="${x}" y="${f(y + h - v * k)}" width="${w}" height="${f(v * k)}" fill="#bfe3ff"/>`;
    body += `<path d="M ${x} ${y - 6} L ${x} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y - 6}" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
    for (let t = 0; t <= max; t += step / 2) { const yy = y + h - t * k, big = t % step === 0; body += line([x, yy], [x + (big ? 22 : 12), yy], false, INK, big ? 1.6 : 1); if (big && t > 0) body += txt(x - 6, yy + 4, t, 11, 700, 'end'); }
    body += txt(x + w + 8, y + 10, 'mL', 12, 700, 'start');
    return wrap(220, 210, body, '비커 눈금');
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
    const hm = (R, C, v) => { if (!(R >= 1 && R <= 4 && C >= 1 && C <= 5 && v.length === R * C)) return null; const H = []; for (let j = 0; j < R; j++) H.push(v.slice(j * C, j * C + C)); return H; };
    if ((t === 'stk' || t === 'stkt' || t === 'lay') && /^\d$/.test(p[1]) && /^\d$/.test(p[2])) { const v = p.slice(3).map(Number), H = hm(+p[1], +p[2], v); if (H && v.every(x => Number.isInteger(x) && x >= 0 && x <= 5) && v.some(x => x > 0)) return { type: t, H, count: v.reduce((a, b2) => a + b2, 0), cells: v.filter(x => x > 0).length, max: Math.max(...v) }; }
    if (t === 'top' && /^\d$/.test(p[1]) && /^\d$/.test(p[2])) { const v = p.slice(3).map(x => (x === 'q' ? 'q' : Number(x))), H = hm(+p[1], +p[2], v); if (H && v.every(x => x === 'q' || (Number.isInteger(x) && x >= 0 && x <= 9)) && v.filter(x => x === 'q').length <= 1) return { type: t, H }; }
    if (t === 'vw') { const v = p.slice(1).map(Number); if (v.length >= 1 && v.length <= 6 && v.every(x => Number.isInteger(x) && x >= 1 && x <= 5)) return { type: t, cols: v, count: v.reduce((a, b2) => a + b2, 0) }; }
    const len = x => (x === 'q' ? 'q' : Number(x)), okLen = x => x === 'q' || (Number.isInteger(x) && x >= 0 && x <= 999);
    if (t === 'cir' && (p[1] === 'r' || p[1] === 'd') && (p[3] === 'cm' || p[3] === 'm') && /^\d{1,3}$/.test(p[2])) return { type: t, mode: p[1], v: +p[2], unit: p[3] };
    if (t === 'cyl' && (p[3] === 'cm' || p[3] === 'm')) { const r = len(p[1]), h = len(p[2]); if (okLen(r) && okLen(h)) return { type: t, r, h, unit: p[3] }; }
    if (t === 'cone' && (p[4] === 'cm' || p[4] === 'm')) { const r = len(p[1]), h = len(p[2]), l = len(p[3]); if (okLen(r) && okLen(h) && okLen(l)) return { type: t, r, h, l, unit: p[4] }; }
    if (t === 'sph' && (p[2] === 'cm' || p[2] === 'm')) { const r = len(p[1]); if (okLen(r)) return { type: t, r, unit: p[2] }; }
    if (t === 'cnet' && ['ok', 'same', 'one', 'tri'].indexOf(p[1]) >= 0 && (p[4] === 'cm' || p[4] === 'm')) { const r = len(p[2]), h = len(p[3]); if (okLen(r) && okLen(h)) return { type: t, kind: p[1], valid: p[1] === 'ok', r, h, unit: p[4] }; }
    if (t === 'ang' && a > 0 && a < 360 && ['n', 'q', 'x'].indexOf(b) >= 0) return { type: t, d: a, mode: b };
    if (t === 'prot' && Number.isInteger(a) && a > 0 && a <= 180) return { type: t, d: a };
    if (t === 'tg') { const v = p.slice(1, 4).map(x => (x === 'q' ? 'q' : Number(x))), kn = v.filter(x => x !== 'q'); if (v.length === 3 && v.filter(x => x === 'q').length <= 1 && kn.every(x => Number.isInteger(x) && x > 0 && x < 180) && (v.includes('q') ? kn.reduce((x, y) => x + y, 0) < 180 : kn.reduce((x, y) => x + y, 0) === 180)) return { type: t, v, missing: v.includes('q') ? 180 - kn.reduce((x, y) => x + y, 0) : null }; }
    if (t === 'tk' && a > 0 && +b > 0 && a + +b < 180) return { type: t, A: a, B: +b, C: 180 - a - +b };
    if (t === 'ts' && (p[4] === 'cm' || p[4] === 'm')) { const v = p.slice(1, 4); if (v.every(x => x === 'q' || /^\d{1,3}$/.test(x)) && v.filter(x => x === 'q').length <= 1) return { type: t, a: v[0], l: v[1], r: v[2], unit: p[4] }; }
    if (t === 'qd' && QD[p[1]]) return { type: t, kind: p[1] };
    if (t === 'pg' && a >= 3 && a <= 8 && ['r', 'i', 'open', 'curve'].indexOf(b) >= 0 && (p[3] === '0' || p[3] === 'a')) return { type: t, n: a, kind: b, diag: p[3], polygon: b === 'r' || b === 'i', diagonals: a * (a - 3) / 2 };
    if (t === 'pll' && (p[2] === 'cm' || p[2] === 'm') && (p[1] === 'q' || /^\d{1,3}$/.test(p[1]))) return { type: t, d: p[1], unit: p[2] };
    if ((t === 'bar' || t === 'lgr') && SETS[p[1]] && +p[2] > 0) { const off = t === 'lgr' ? 4 : 3, base = t === 'lgr' ? +p[3] : 0, v = p.slice(off).map(Number); if (v.length >= 2 && v.length <= Math.min(6, SETS[p[1]].length) && v.every(x => Number.isInteger(x) && x >= base) && (Math.max(...v) - base) / +p[2] <= 12) return { type: t, set: p[1], step: +p[2], base, vals: v, names: SETS[p[1]].slice(0, v.length) }; }
    if (t === 'tf' && TF[p[1]] && ['0', 'h', 'v', 'r90', 'r180', 'r270'].indexOf(p[2]) >= 0) return { type: t, shape: p[1], op: p[2], cells: tfCells(p[1], p[2]) };
    if (t === 'mv') { const v = p.slice(1).map(x => (x === 'n' ? 'n' : Number(x))); if (v.length === 4 && [v[0], v[1]].every(Number.isInteger) && v[0] >= 0 && v[0] <= 7 && v[1] >= 0 && v[1] <= 5 && (v[2] === 'n' || (v[2] >= 0 && v[2] <= 7 && v[3] >= 0 && v[3] <= 5))) return { type: t, a: [v[0], v[1]], b: v[2] === 'n' ? null : [v[2], v[3]] }; }
    if (t === 'ln' && ['seg', 'ray', 'rayb', 'line', 'angle', 'gap', 'curve'].indexOf(p[1]) >= 0) return { type: t, kind: p[1] };
    if (t === 'rul' && Number.isInteger(a) && a > 0 && a <= 150) return { type: t, mm: a };
    if (t === 'clk') { const v = p.slice(1).map(Number); if (v.length === 3 && v[0] >= 1 && v[0] <= 12 && v.every(Number.isInteger) && v[1] >= 0 && v[1] < 60 && v[2] >= 0 && v[2] < 60) return { type: t, h: v[0], m: v[1], s: v[2] }; }
    if ((t === 'fb' || t === 'fc') && Number.isInteger(a) && a >= 2 && a <= 12 && Number.isInteger(+b) && +b >= 0 && +b <= a && (p[3] === undefined || (t === 'fb' && p[3] === 'u'))) return { type: t, n: a, k: +b, equal: p[3] !== 'u' };
    if (t === 'grp') { const v = p.slice(1).map(Number); if (v.length === 3 && v.every(Number.isInteger) && v[0] >= 2 && v[0] <= 8 && v[1] >= 1 && v[1] <= 8 && v[2] >= 0 && v[2] <= v[0]) return { type: t, g: v[0], per: v[1], k: v[2], total: v[0] * v[1] }; }
    if (t === 'pic' && SETS[p[1]]) { const big = +p[2], small = +p[3], v = p.slice(4).map(Number); if (big > small && small > 0 && big % small === 0 && v.length >= 2 && v.length <= Math.min(5, SETS[p[1]].length) && v.every(x => Number.isInteger(x) && x > 0 && x % small === 0 && Math.floor(x / big) <= 7 && (x % big) / small <= 9)) return { type: t, set: p[1], big, small, vals: v, names: SETS[p[1]].slice(0, v.length) }; }
    if (t === 'scl' && [1000, 2000, 4000].indexOf(a) >= 0 && Number.isInteger(+b) && +b >= 0 && +b < a) return { type: t, max: a, v: +b };
    if (t === 'cup' && [500, 1000, 2000].indexOf(a) >= 0 && Number.isInteger(+b) && +b > 0 && +b <= a) return { type: t, max: a, v: +b };
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
    if (q.type === 'stk') return stk(q.H, false);
    if (q.type === 'stkt') return stk(q.H, true);
    if (q.type === 'top') return topFig(q.H);
    if (q.type === 'vw') return viewFig(q.cols);
    if (q.type === 'lay') return layFig(q.H);
    if (q.type === 'cir') return circleFig(q.mode, q.v, q.unit);
    if (q.type === 'cyl') return cylFig(q.r, q.h, q.unit);
    if (q.type === 'cone') return coneFig(q.r, q.h, q.l, q.unit);
    if (q.type === 'sph') return sphFig(q.r, q.unit);
    if (q.type === 'cnet') return cnetFig(q.kind, q.r, q.h, q.unit);
    if (q.type === 'ang') return angFig(q.d, q.mode);
    if (q.type === 'prot') return protFig(q.d);
    if (q.type === 'tg') return tgFig(q.v[0], q.v[1], q.v[2], true);
    if (q.type === 'tk') return tgFig(q.A, q.B, q.C, false);
    if (q.type === 'ts') return tsFig(q.a, q.l, q.r, q.unit);
    if (q.type === 'qd') return qdFig(q.kind);
    if (q.type === 'pg') return pgFig(q.n, q.kind, q.diag);
    if (q.type === 'pll') return pllFig(q.d, q.unit);
    if (q.type === 'bar') return axes(q.set, q.step, q.vals, 0, 'bar');
    if (q.type === 'lgr') return axes(q.set, q.step, q.vals, q.base, 'line');
    if (q.type === 'tf') return tfFig(q.shape, q.op);
    if (q.type === 'ln') return lnFig(q.kind);
    if (q.type === 'rul') return rulFig(q.mm);
    if (q.type === 'clk') return clkFig(q.h, q.m, q.s);
    if (q.type === 'fb') return fbFig(q.n, q.k, !q.equal);
    if (q.type === 'fc') return fcFig(q.n, q.k);
    if (q.type === 'grp') return grpFig(q.g, q.per, q.k);
    if (q.type === 'pic') return picFig(q.set, q.big, q.small, q.vals);
    if (q.type === 'scl') return sclFig(q.max, q.v);
    if (q.type === 'cup') return cupFig(q.max, q.v);
    if (q.type === 'mv') return mvFig(q.a[0], q.a[1], q.b ? q.b[0] : 'n', q.b ? q.b[1] : 0);
    return '';
  }
  const TOKEN = /\[\[fig:([A-Za-z0-9:]+)\]\]/g;
  const specsIn = text => { const out = []; String(text || '').replace(TOKEN, (_, s) => { out.push(s); return ''; }); return out; };
  return { render, parse, specsIn, TOKEN, SETS, TBL };
});
