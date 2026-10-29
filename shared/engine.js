// 게임 규칙 엔진 v0.3 — 화면·통신과 분리된 순수 규칙 모듈
// 서버(server.js)와 체험판(demo.html)이 같은 코드를 씁니다.
//
// 연결(conn) = { send(obj), ctx: {} }
// engine.handle(conn, msg) : 화면에서 온 메시지 처리
// engine.disconnect(conn)  : 연결이 끊겼을 때
//
// 진행 순서
//   lobby(대기실) → diagcount(3·2·1) → diag(레벨 테스트) → grouped(모둠 구성 확인) → countdown(3·2·1) → playing → ended(결과)
// 전투 규칙
//   · 스테이지마다 한 사람이 문제를 perStage개(기본 3개) 받고, 맞힐 때마다 몬스터에게 작은 데미지(SMALL).
//   · 틀리면 1차 힌트 → 2차 AI 힌트 → 3차 AI 해설이 차례로 열리고, 오답노트에 자동 저장.
//   · 학생 화면에는 친구들의 진행 상황(몇 문제 풀었는지, 막혔는지)을 보여 주지 않습니다. 교사 화면에만 보여요.
//   · 내 문제를 다 풀면 '추가 문제'(쌍둥이 문제, 주관식)를 난이도 상·중·하 중에 골라 풀 수 있어요.
//     맞히면 힌트 하나를 얻어 '모둠 힌트 상자'에 넣습니다. 몇 번이든 다시 풀 수 있어요.
//   · 오래 막혀 있거나 틀린 친구는 힌트 상자에서 힌트를 꺼내 쓸 수 있고, 다 푼 친구가 보내 줄 수도 있어요(누가 막혔는지는 비공개).
//     한 문제에 받을 수 있는 힌트는 최대 3개.
//   · 접속한 모둠원 전원이 자기 문제를 다 풀면 '합동 공격'이 열리고, 큰 데미지로 몬스터를 쓰러뜨립니다.
//     합동 공격이 열리면 추가 문제는 더 내지 않아요.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./questions.js'));
  else root.MQEngine = factory(root.MQQuestions);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (QB) {
  'use strict';

  const SMALL = 40;   // 한 문제 맞힐 때
  const TEAM = 200;   // 합동 공격 (마지막 일격)
  const MAX_GIFTS = 1; // 한 문제에 쓸 수 있는 친구 힌트 수 (3종류 중 하나만 골라 씀)
  const BOX_MAX = 10; // 모둠 힌트 상자 크기 (가득 차면 추가 문제는 포인트만)
  const KIND_MAX = { elim: 2, concept: 4, step: 4 }; // 스테이지마다 종류별로 만들 수 있는 수 (합 10)
  const UNLOCK_BY = { elim: 1, concept: 2, step: 2 }; // 몇 번 틀리면 쓸 수 있는지 (보기 지우기는 귀한 힌트라 1번부터)
  const POINTS = { correct: 10, extra: 10, give: 5, team: 20, note: 5 };
  const STAGE_TITLES = ['새끼', '성난', '거대한', '고대의'];
  const TEAM_NAMES = ['별빛 용사단', '불꽃 기사단', '바람 탐험대', '무지개 수호대', '번개 마법단', '달빛 모험단', '파도 원정대', '숲속 지킴이', '구름 파수꾼', '황금 방패단'];
  const CHAT = ['👍', '💪', '👏', '🤔', '🎉']; // 손들기는 따로 버튼
  // 친구 힌트 3종: 내 힌트(1차 힌트·AI 힌트·AI 해설)와 내용이 겹치지 않게 만듭니다.
  const GIFTS = { elim: '틀린 보기 지우기', concept: '개념 힌트', step: '풀이 과정 살펴보기' };
  const UNLOCK_WRONG = 2; // 내 힌트를 먼저 본 뒤(2번 틀린 뒤) 친구 힌트가 열림
  const DIAG_DIFFS = { 3: [1, 2, 3], 4: [1, 2, 2, 3], 5: [1, 2, 2, 3, 3] };
  const readyUnits = [];
  for (const sj of QB.subjects) for (const u of sj.units) if (u.ready) readyUnits.push(u);
  const firstUnit = readyUnits[0];
  const DEFAULTS = { grade: 6, subject: QB.subjectOfUnit(firstUnit.id).id, unit: firstUnit.id, area: 'all', diff: 'auto', stages: 3, perStage: 3, diag: 4, size: 4 };

  // ───── 상점 (포인트로 캐릭터 꾸미기) ─────
  const CATALOG = [
    { id: 'b_kid', slot: 'base', name: '꼬마 모험가', price: 0, icon: '🧒' }, { id: 'b_girl', slot: 'base', name: '씩씩한 소녀', price: 0, icon: '👧' },
    { id: 'b_boy', slot: 'base', name: '용감한 소년', price: 0, icon: '👦' }, { id: 'b_bear', slot: 'base', name: '곰돌이', price: 0, icon: '🐻' },
    { id: 'b_rabbit', slot: 'base', name: '토끼', price: 0, icon: '🐰' }, { id: 'b_panda', slot: 'base', name: '판다', price: 0, icon: '🐼' },
    { id: 'h_cap', slot: 'hat', name: '야구 모자', price: 20, icon: '🧢' }, { id: 'h_helmet', slot: 'hat', name: '탐험 헬멧', price: 30, icon: '⛑️' },
    { id: 'h_grad', slot: 'hat', name: '박사 모자', price: 40, icon: '🎓' }, { id: 'h_top', slot: 'hat', name: '신사 모자', price: 60, icon: '🎩' }, { id: 'h_crown', slot: 'hat', name: '황금 왕관', price: 120, icon: '👑' },
    { id: 'g_read', slot: 'glasses', name: '동그란 안경', price: 20, icon: '👓' }, { id: 'g_sun', slot: 'glasses', name: '멋쟁이 선글라스', price: 35, icon: '🕶️' }, { id: 'g_goggle', slot: 'glasses', name: '탐험 고글', price: 50, icon: '🥽' },
    { id: 'g_heart', slot: 'glasses', name: '하트 선글라스', price: 45, icon: '💗' }, { id: 'g_star', slot: 'glasses', name: '반짝 별 안경', price: 55, icon: '⭐' }, { id: 'g_3d', slot: 'glasses', name: '3D 안경', price: 40, icon: '🔴' },
    { id: 'g_rainbow', slot: 'glasses', name: '무지개 안경', price: 65, icon: '🌈' }, { id: 'g_party', slot: 'glasses', name: '파티 고양이 안경', price: 75, icon: '🎉' },
    { id: 'w_book', slot: 'weapon', name: '마법 책', price: 25, icon: '📖' }, { id: 'w_wand', slot: 'weapon', name: '별 지팡이', price: 60, icon: '🪄' },
    { id: 'w_sword', slot: 'weapon', name: '용사의 검', price: 70, icon: '🗡️' }, { id: 'w_shield', slot: 'weapon', name: '튼튼한 방패', price: 70, icon: '🛡️' },
    { id: 'p_chick', slot: 'pet', name: '병아리', price: 40, icon: '🐥' }, { id: 'p_dog', slot: 'pet', name: '강아지', price: 50, icon: '🐶' },
    { id: 'p_fox', slot: 'pet', name: '여우', price: 70, icon: '🦊' }, { id: 'p_unicorn', slot: 'pet', name: '유니콘', price: 130, icon: '🦄' }, { id: 'p_dragon', slot: 'pet', name: '아기 용', price: 180, icon: '🐉' },
    { id: 'bg_night', slot: 'bg', name: '밤하늘', price: 0, css: 'linear-gradient(#2b1f5e,#170f36)' }, { id: 'bg_sky', slot: 'bg', name: '구름 위', price: 30, css: 'linear-gradient(#6ec6ff,#e6f6ff)' },
    { id: 'bg_grass', slot: 'bg', name: '푸른 들판', price: 30, css: 'linear-gradient(#bfe9ff 0 55%,#8fd36b 55%)' }, { id: 'bg_sea', slot: 'bg', name: '바닷속', price: 60, css: 'linear-gradient(#5ee0e0,#1b6fb5)' },
    { id: 'bg_space', slot: 'bg', name: '우주', price: 90, css: 'radial-gradient(circle at 30% 30%,#7a4bd6,#0b0b2b 70%)' },
    // v0.10 추가 아이템
    { id: 'b_cat', slot: 'base', name: '고양이', price: 0, icon: '🐱' }, { id: 'b_tiger', slot: 'base', name: '호랑이', price: 30, icon: '🐯' }, { id: 'b_robot', slot: 'base', name: '로봇', price: 80, icon: '🤖' },
    { id: 'h_ribbon', slot: 'hat', name: '리본', price: 20, icon: '🎀' }, { id: 'h_straw', slot: 'hat', name: '꽃 밀짚모자', price: 35, icon: '👒' }, { id: 'h_flower', slot: 'hat', name: '꽃 장식', price: 45, icon: '🌸' },
    { id: 'w_bow', slot: 'weapon', name: '활', price: 50, icon: '🏹' }, { id: 'w_orb', slot: 'weapon', name: '수정 구슬', price: 80, icon: '🔮' }, { id: 'w_hammer', slot: 'weapon', name: '망치', price: 60, icon: '🔨' }, { id: 'w_trident', slot: 'weapon', name: '삼지창', price: 110, icon: '🔱' },
    { id: 'p_cat', slot: 'pet', name: '아기 고양이', price: 45, icon: '🐈' }, { id: 'p_turtle', slot: 'pet', name: '거북이', price: 45, icon: '🐢' }, { id: 'p_owl', slot: 'pet', name: '부엉이', price: 65, icon: '🦉' }, { id: 'p_penguin', slot: 'pet', name: '펭귄', price: 65, icon: '🐧' }, { id: 'p_phoenix', slot: 'pet', name: '불새', price: 200, icon: '🐦‍🔥' },
    { id: 'bg_sunset', slot: 'bg', name: '노을', price: 40, css: 'linear-gradient(#ff9a5a,#ff5e7e 60%,#6a3fb5)' }, { id: 'bg_forest', slot: 'bg', name: '숲속', price: 45, css: 'linear-gradient(#a8e6a3,#2f7d4a)' },
    { id: 'bg_cherry', slot: 'bg', name: '벚꽃', price: 60, css: 'radial-gradient(circle at 30% 30%,#ffe3ef,#ffb3cf 70%)' }, { id: 'bg_snow', slot: 'bg', name: '눈밭', price: 60, css: 'linear-gradient(#dff1ff,#ffffff)' }, { id: 'bg_lava', slot: 'bg', name: '용암 동굴', price: 120, css: 'radial-gradient(circle at 50% 100%,#ff7a18,#5a0f0f 70%)' },
  ];
  const ITEM = Object.fromEntries(CATALOG.map(i => [i.id, i]));
  const SLOTS = ['base', 'hat', 'glasses', 'weapon', 'pet', 'bg'];
  const BASES = CATALOG.filter(i => i.slot === 'base').map(i => i.id);

  // ───── 답 비교 (주관식) ─────
  const hasHangul = s => /[가-힣]/.test(s);
  const norm = s => String(s == null ? '' : s).trim().replace(/\s+/g, ' ').replace(/\s*([/:·.%])\s*/g, '$1').toLowerCase();
  // 분수·대분수·소수 값으로 읽기 (뒤에 붙은 단위는 무시). 읽을 수 없으면 null
  function numVal(s) {
    const m = String(s == null ? '' : s).trim().replace(/\s+/g, ' ').match(/^(\d+)(?: (\d+)\/(\d+)|\/(\d+)|(\.\d+))?(?: ?[a-zA-Z가-힣²³%]*)?$/);
    if (!m) return null;
    if (/\d\s*[만억조](?=$|[\s원명개번권]|[^가-힣])/.test(String(s))) return null; // 540만, 3억 처럼 만·억·조가 붙은 큰 수는 글자로 비교 (540과 같지 않음)
    if (m[2] != null) return +m[3] ? +m[1] + m[2] / m[3] : null;
    if (m[4] != null) return +m[4] ? m[1] / m[4] : null;
    return parseFloat(m[1] + (m[5] || ''));
  }
  function matches(input, answers) {
    const a = norm(input);
    if (!a) return false;
    const av = numVal(input);
    return answers.some(x => {
      const b = norm(x);
      if (a === b || ((hasHangul(b) || /[a-z]/.test(b)) && a.replace(/ /g, '') === b.replace(/ /g, ''))) return true;
      const bv = numVal(x);
      return av != null && bv != null && Math.abs(av - bv) < 1e-9; // 2/3 과 4/6 처럼 크기가 같은 분수도 정답
    });
  }
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  // 주관식 답 입력 칸 모양: 대분수(자연수·분자·분모 칸) / 분수(분자·분모 칸) / 글자
  // 정수(한 칸) / 소수(소수점 칸) / 비(□ : □) / 백분율(□ %)
  // 단위가 있는 답은 앱이 단위를 보여 주고 학생은 숫자만 씀: u1:단위(한 칸), u1d:단위(소수 한 칸), u2:단위:단위, u3:시:분:초
  const LU = '(km|mm|cm|m|kg|g|t|mL|L)';
  const unitFmt = s => {
    const t = String(s || '').trim();
    let m;
    if ((m = t.match(new RegExp('^\\d+ ?' + LU + ' \\d+ ?' + LU + '$')))) return 'u2:' + m[1] + ':' + m[2];
    if (/^\d+시 \d+분 \d+초$/.test(t)) return 'u3:시:분:초';
    if ((m = t.match(/^\d+(시간|분) \d+(분|초)$/))) return 'u2:' + m[1] + ':' + m[2];
    if ((m = t.match(new RegExp('^(\\d+(\\.\\d+)?) ?(cm²|m²|km²|cm³|m³|' + LU.slice(1, -1) + '|°|[가-힣]{1,2})$')))) return (m[2] ? 'u1d:' : 'u1:') + m[3];
    return null;
  };
  const baseFmt = a => {
    const v = String(a || '').trim().replace(/\s*[a-zA-Z²³가-힣]+$/, '');
    if (/^\d+ \d+\/\d+$/.test(v)) return 'mixed';
    if (/^\d+\/\d+$/.test(v)) return 'frac';
    if (/^\d+ ?: ?\d+$/.test(v)) return 'ratio';
    if (/^\d+(\.\d+)? ?%$/.test(v)) return 'pct';
    if (/^\d+\.\d+$/.test(v)) return 'dec';
    if (/^\d+$/.test(v)) return 'int';
    return 'text';
  };
  const fmtOf = a => {
    const list = (Array.isArray(a) ? a : [a]).filter(x => x != null);
    const base = baseFmt(list[0]);
    if (base === 'text' || base === 'int' || base === 'dec') for (const x of list) { const u = unitFmt(x); if (u) return u; }
    return base;
  };
  const chosung = s => String(s).replace(/[가-힣]/g, ch => CHO[Math.floor((ch.charCodeAt(0) - 0xac00) / 588)]);
  const bucket = wrong => (wrong === 0 ? 'first' : wrong <= 2 ? 'retry' : 'many');

  function createEngine(opt) {
    opt = opt || {};
    const rand = opt.random || Math.random;
    const now = opt.now || (() => Date.now());
    const later = opt.setTimeout || ((f, ms) => setTimeout(f, ms));
    const COUNTDOWN_MS = opt.countdownMs != null ? opt.countdownMs : 3000;
    const END_DELAY_MS = opt.endDelayMs != null ? opt.endDelayMs : 3500;
    const STUCK_MS = opt.stuckMs != null ? opt.stuckMs : 60000; // 이만큼 한 문제에 머물면 '도움이 필요한' 상태

    const R = (a, b) => a + Math.floor(rand() * (b - a + 1));
    const pick = a => a[R(0, a.length - 1)];
    const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    let seq = 0;
    const uid = () => (now().toString(36) + (++seq).toString(36) + Math.floor(rand() * 1e9).toString(36)).slice(-14);
    const rooms = new Map();
    const send = (conn, obj) => { if (conn) { try { conn.send(obj); } catch (e) { /* 끊긴 연결 */ } } };
    const intIn = (v, lo, hi) => { v = Math.round(Number(v)); return Number.isFinite(v) && v >= lo && v <= hi ? v : null; };
    const cleanName = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 10);

    // ───── 설정 ─────
    function cleanSettings(s, cur) {
      s = s && typeof s === 'object' ? s : {};
      const out = Object.assign({}, cur);
      const num = (k, lo, hi) => { const v = intIn(s[k], lo, hi); if (v != null) out[k] = v; };
      const isReady = x => x.units.some(u => u.ready);
      const g = intIn(s.grade, 1, 6); if (g && QB.subjects.some(x => x.grade === g && isReady(x))) out.grade = g;
      const subjects = QB.subjects.filter(x => x.grade === out.grade && isReady(x));
      if (subjects.some(x => x.id === s.subject)) out.subject = s.subject;
      if (!subjects.some(x => x.id === out.subject)) out.subject = subjects[0].id;
      const subj = subjects.find(x => x.id === out.subject);
      const units = subj.units.filter(u => u.ready);
      if (units.some(u => u.id === s.unit)) out.unit = s.unit;
      if (!units.some(u => u.id === out.unit)) out.unit = units[0].id;
      const unit = units.find(u => u.id === out.unit);
      if (s.area === 'all' || unit.areas.some(a => a.id === s.area)) out.area = s.area;
      if (out.area !== 'all' && !unit.areas.some(a => a.id === out.area)) out.area = 'all';
      if (s.diff === 'auto') out.diff = 'auto'; else { const d = intIn(s.diff, 1, 3); if (d) out.diff = d; }
      num('stages', 1, 5); num('perStage', 1, 5); num('diag', 3, 5); num('size', 2, 6);
      return out;
    }
    const unitOf = room => QB.unitById(room.settings.unit) || firstUnit;
    const areasOf = room => { const u = unitOf(room); return room.settings.area === 'all' ? u.areas : u.areas.filter(a => a.id === room.settings.area); };
    const areaById = (room, id) => unitOf(room).areas.find(a => a.id === id);
    function monsterOf(room, stage) {
      const u = unitOf(room), last = stage >= room.settings.stages;
      // form: 1 새끼(첫 스테이지) · 2 성장(중간) · 3 최종 보스 — 스테이지가 오를수록 더 강한 모습
      const scale = last ? 1.12 : Math.min(1, 0.74 + 0.1 * (stage - 1));
      if (u.art && u.mons) {
        // 진화 그림 4단계: 마지막 스테이지는 항상 4단계(최종 보스), 그 앞은 1 → 2 → 3단계 순서
        const form = last ? 4 : Math.min(stage, 3);
        return { name: last ? `최종 보스 · ${u.mons[3]}` : u.mons[form - 1], hue: u.hue, boss: last, form, scale, art: `img/mon/${u.art}${form}.webp` };
      }
      const form = last ? 3 : stage <= 1 ? 1 : 2;
      return { name: last ? `최종 보스 · ${u.dragon}` : `${STAGE_TITLES[Math.min(stage - 1, STAGE_TITLES.length - 1)]} ${u.dragon}`, hue: u.hue, boss: last, form, scale };
    }
    const groupOf = (room, p) => (p && p.group ? room.groups.find(g => g.id === p.group) : null) || null;
    const membersOf = (room, g) => g.members.map(pid => room.players.get(pid)).filter(Boolean);
    const curOf = p => (p.queue && p.queue[p.qi]) || null;
    const isStuck = (p, c) => !!(c && !p.stageDone && (c.tried.length >= UNLOCK_WRONG || now() - c.shownAt >= STUCK_MS));
    // 틀린 보기 지우기는 지운 뒤에도 보기가 2개 이상 남을 때만 (정답만 남기지 않음)
    const canElim = c => !!c && c.choices.filter((_, i) => i !== c.answer && c.tried.indexOf(i) < 0 && c.eliminated.indexOf(i) < 0).length >= 2;
    const REACT_MS = 10000; // 이모지 반응은 10초 동안 프로필에 떠 있음 (줌처럼)
    const reactOf = p => (p.react && now() - p.react.at < REACT_MS ? p.react.e : null);
    // 힌트 종류 골고루: 내가 가장 적게 만든 종류만 고를 수 있음 (3종류를 한 번씩 돌아가며)
    // 이번 스테이지에 모둠이 그 종류를 더 만들 수 있는지 (보기 지우기 2 · 개념 4 · 풀이 4)
    const kindLeft = (g, k) => KIND_MAX[k] - ((g && g.made && g.made[k]) || 0);
    const allowedKinds = (p, g) => { const ks = Object.keys(GIFTS).filter(k => !g || kindLeft(g, k) > 0); if (!ks.length) return []; const c = k => (p.made && p.made[k]) || 0, min = Math.min(...ks.map(c)); return ks.filter(k => c(k) === min); };
    const boxFull = g => !!g && (g.box.length >= BOX_MAX || Object.keys(GIFTS).every(k => kindLeft(g, k) <= 0));
    // 종류마다 쓸 수 있는 때가 달라요: 보기 지우기는 1번, 나머지는 2번 틀리면 (또는 60초가 지나면)
    const canUseKind = (p, c, k) => !!(c && !p.stageDone && c.gifts.length < MAX_GIFTS && (c.tried.length >= UNLOCK_BY[k] || now() - c.shownAt >= STUCK_MS) && (k !== 'elim' || canElim(c)));
    const canTakeGift = (p, c) => Object.keys(GIFTS).some(k => canUseKind(p, c, k));

    // ───── 문제 고르기 ─────
    function targetDiff(room, p) {
      const d = room.settings.diff;
      if (d !== 'auto') return d;
      return pick({ 0: [1, 2], 1: [1], 2: [1, 2], 3: [2, 3], 4: [3] }[p.level || 0]);
    }
    function pickQuestion(room, p, diff) {
      const all = [];
      for (const a of areasOf(room)) for (const q of a.questions) all.push({ q, a });
      const fresh = all.filter(x => !p.seen.has(x.q.id));
      const pool = fresh.length ? fresh : all;
      let best = Infinity, cands = [];
      for (const x of pool) { const dist = Math.abs(x.q.diff - diff); if (dist < best) { best = dist; cands = [x]; } else if (dist === best) cands.push(x); }
      const { q, a } = pick(cands);
      return makeInst(p, q, a);
    }
    function makeInst(p, q, a) {
      p.seen.add(q.id);
      const choices = shuffle([q.answer].concat(q.wrongs));
      const mis = choices.map(c => { const i = q.wrongs.indexOf(c); return i >= 0 ? (q.mis && q.mis[i]) || 'guess' : null; });
      return { id: uid(), qid: q.id, area: a.id, areaName: a.name, diff: q.diff, text: q.text, choices, mis, answer: choices.indexOf(q.answer), answerText: q.answer, hints: [q.hint1, q.hint2, q.explain], step: q.step || q.hint1, tried: [], eliminated: [], gifts: [], solved: false, shownAt: 0 };
    }
    // 한 평가요소 안에서 난이도에 가장 가까운 새 문항
    function pickFromArea(p, a, diff) {
      const fresh = a.questions.filter(q => !p.seen.has(q.id));
      const pool = fresh.length ? fresh : a.questions;
      let best = Infinity, cands = [];
      for (const q of pool) { const dist = Math.abs(q.diff - diff); if (dist < best) { best = dist; cands = [q]; } else if (dist === best) cands.push(q); }
      return makeInst(p, pick(cands), a);
    }
    function showCurrent(room, p) {
      const c = curOf(p); if (!c) return;
      c.shownAt = now();
      const id = c.id;
      later(() => { if (curOf(p) && curOf(p).id === id && !c.solved && rooms.has(room.code)) pushAll(room); }, STUCK_MS + 50);
    }
    // 풀던 추가 문제(또는 아직 상자에 넣지 않은 힌트)는 다음 스테이지로 이어 갑니다.
    const keepTwin = p => !!(p.twin && (p.twin.state === 'open' || p.twin.state === 'reward'));
    function dealStage(room, p, fresh) {
      p.queue = []; p.qi = 0; p.stageDone = false; p.stageDoneAt = null; if (fresh || !keepTwin(p)) p.twin = null;
      for (let i = 0; i < room.settings.perStage; i++) p.queue.push(pickQuestion(room, p, targetDiff(room, p)));
      if (p.rs) p.rs.dealt += p.queue.length;
      showCurrent(room, p);
    }
    function openTwin(room, p, diff) {
      const area = areaById(room, p.lastArea) || areasOf(room)[0];
      const fresh = area.twins.filter(x => !p.seenTwin.has(x.id));
      const pool = fresh.length ? fresh : area.twins;
      let best = Infinity, cands = [];
      for (const x of pool) { const dist = Math.abs((x.diff || 2) - diff); if (dist < best) { best = dist; cands = [x]; } else if (dist === best) cands.push(x); }
      const tw = pick(cands);
      p.seenTwin.add(tw.id);
      p.twin = { id: uid(), tid: tw.id, area: area.id, areaName: area.name, diff, text: tw.text, answers: tw.answers, hints: tw.hints, tries: 0, state: 'open' };
    }

    // ───── 오답노트 ─────
    function saveNote(room, p, item) {
      const old = p.notes.find(n => n.key === item.key && !n.resolved);
      if (old) { if (old.mineAll.indexOf(item.mine) < 0) old.mineAll.push(item.mine); return; }
      p.notes.unshift(Object.assign({ nid: uid(), unitName: unitOf(room).name, resolved: false, tries: 0, mineAll: [item.mine] }, item));
      if (p.notes.length > 80) p.notes.length = 80;
    }
    const notesView = p => p.notes.map(n => ({ nid: n.nid, kind: n.kind, fmt: n.kind === 'q' ? null : fmtOf(n.answers), unitName: n.unitName, areaName: n.areaName, text: n.text, choices: n.choices, mine: n.mine, resolved: n.resolved, tries: n.tries, hint: n.tries >= 1 ? n.hints[Math.min(n.tries, 3) - 1] : null, explain: n.resolved ? n.explain : null }));

    // ───── 모둠 ─────
    function newGroup(room) {
      const i = room.groups.length;
      const g = { id: 'g' + (++room.gseq), name: TEAM_NAMES[i % TEAM_NAMES.length] + (i >= TEAM_NAMES.length ? ' ' + (Math.floor(i / TEAM_NAMES.length) + 1) : ''), members: [], stage: 1, hp: 0, hpMax: 0, cleared: 0, done: false, chat: [], box: [], made: {} };
      room.groups.push(g);
      return g;
    }
    function setStageHp(room, g) {
      const on = Math.max(1, membersOf(room, g).filter(m => m.online).length);
      g.hpMax = SMALL * room.settings.perStage * on + TEAM; g.hp = g.hpMax;
    }
    // 모둠 수 고르기: 모든 모둠이 (설정 인원 ± 1)명이 되게. 그런 방법이 없으면(학생 수가 너무 적을 때) 설정 인원에 가장 가깝게.
    function groupCount(n, size) {
      if (n <= size + 1) return 1;
      let best = null;
      for (let gc = 1; gc <= n; gc++) {
        const lo = Math.floor(n / gc), hi = Math.ceil(n / gc);
        const dev = Math.max(Math.abs(lo - size), Math.abs(hi - size)), avg = Math.abs(n / gc - size);
        const score = [dev <= 1 ? 0 : 1, dev, avg];
        if (!best || score[0] < best.s[0] || (score[0] === best.s[0] && (score[1] < best.s[1] || (score[1] === best.s[1] && score[2] < best.s[2])))) best = { gc, s: score };
      }
      return best.gc;
    }
    function formGroups(room) {
      room.groups = []; room.gseq = 0;
      const list = shuffle([...room.players.values()].filter(p => p.online)).sort((a, b) => (b.level || 0) - (a.level || 0));
      const n = list.length, size = room.settings.size;
      const gc = groupCount(n, size);
      const groups = Array.from({ length: gc }, () => newGroup(room));
      list.forEach((p, k) => { const r = Math.floor(k / gc), pos = k % gc, gi = r % 2 ? gc - 1 - pos : pos; groups[gi].members.push(p.pid); p.group = groups[gi].id; });
      for (const p of room.players.values()) if (!p.online) p.group = null;
      for (const g of room.groups) setStageHp(room, g);
    }
    function placeLate(room, p) {
      if (['grouped', 'countdown', 'playing'].indexOf(room.phase) < 0 || groupOf(room, p)) return;
      let g = room.groups.filter(x => !x.done && x.members.length < room.settings.size + 1).sort((a, b) => a.members.length - b.members.length)[0];
      if (!g) { g = newGroup(room); setStageHp(room, g); }
      g.members.push(p.pid); p.group = g.id; if (!p.level) p.level = 2;
      if (room.phase === 'playing') dealStage(room, p, true);
    }
    function isReady(room, g) {
      if (room.phase !== 'playing' || room.frozen || g.done) return false;
      const on = membersOf(room, g).filter(m => m.online);
      return on.length > 0 && on.every(m => m.stageDone);
    }
    // 힌트를 기다리는 친구 (힌트를 덜 받은 친구 → 오래 막힌 친구 순)
    function needyOf(room, g, except) {
      return membersOf(room, g).filter(m => m !== except && m.online && canTakeGift(m, curOf(m))).sort((a, b) => curOf(a).gifts.length - curOf(b).gifts.length || curOf(a).shownAt - curOf(b).shownAt);
    }

    // ───── 진단평가 ─────
    function startDiag(room, p) {
      const diffs = DIAG_DIFFS[room.settings.diag] || DIAG_DIFFS[4];
      const areas = shuffle(areasOf(room));
      p.diag = { qs: diffs.map((d, i) => pickFromArea(p, areas[i % areas.length], d)), idx: 0, ok: 0, done: false, results: [] };
    }
    const levelOf = (ok, total) => { const r = total ? ok / total : 0; return r >= 0.9 ? 4 : r >= 0.6 ? 3 : r >= 0.3 ? 2 : 1; };
    function checkDiagDone(room) {
      if (room.phase !== 'diag') return;
      const on = [...room.players.values()].filter(p => p.online);
      if (on.length && on.every(p => p.diag && p.diag.done)) beginGrouping(room);
    }
    function beginGrouping(room) {
      for (const p of room.players.values()) if (p.diag && !p.diag.done) { p.diag.done = true; p.level = levelOf(p.diag.ok, p.diag.qs.length); }
      for (const p of room.players.values()) if (!p.level) p.level = 2;
      formGroups(room);
      room.phase = 'grouped';
      pushAll(room);
    }

    // ───── 결과 정리: 성취기준·평가기준 기반 리포트 ─────
    // 문항 점수: 한 번에 1 / 1번 다시 0.6 / 2번 다시 0.3 / 3번 이상(해설을 본 뒤) 0. 친구 힌트를 받으면 최대 0.6.
    // 평가요소 수준: 상 = 점수율 80% 이상 + 상 난이도 문항을 한 번에 해결 / 중 = 점수율 50% 이상 / 하 = 그 밖
    //               문항이 2개보다 적으면 '확인 필요'(자료 부족)
    const itemScore = r => { let v = r.wrong === 0 ? 1 : r.wrong === 1 ? 0.6 : r.wrong === 2 ? 0.3 : 0; if (r.gifts) v = Math.min(v, 0.6); return v; };
    function areaSummary(room, p) {
      const u = unitOf(room);
      return u.areas.map(a => {
        const rs = p.records.filter(r => r.area === a.id);
        const x = { area: a.id, name: a.name, std: a.std, concept: a.concept, count: rs.length, wrong: 0, first: 0, retry: 0, many: 0, gifts: 0 };
        for (const r of rs) { x.wrong += r.wrong; x[bucket(r.wrong)]++; x.gifts += r.gifts || 0; }
        // 레벨 테스트 문항도 근거에 넣습니다 (한 번만 답하므로 맞으면 1점, 틀리면 0점)
        const ds = ((p.diag && p.diag.results) || []).filter(d => d.area === a.id && d.ok != null).map(d => ({ wrong: d.ok ? 0 : 9, diff: d.diff, gifts: 0, mis: d.mis ? [].concat(d.mis) : [] }));
        x.diagN = ds.length; x.diagOk = ds.filter(d => d.wrong === 0).length;
        const ev = rs.concat(ds);
        if (!ev.length) return null;
        x.evidence = ev.length;
        x.rate = Math.round(ev.reduce((t, r) => t + itemScore(r), 0) / ev.length * 100);
        const hardFirst = ev.some(r => r.diff >= 3 && r.wrong === 0 && !r.gifts);
        x.level = ev.length < 2 ? 'na' : x.rate >= 80 && hardFirst ? 'high' : x.rate >= 50 ? 'mid' : 'low';
        x.needHard = x.rate >= 80 && !hardFirst; // 점수는 높지만 상 난이도를 아직 못 해 봄
        const lv = x.level === 'na' ? 'mid' : x.level;
        x.criterion = a.criteria[lv]; x.criteria = a.criteria; x.studentTip = a.student[lv]; x.teacherTip = a.teacher[lv];
        const counts = {};
        for (const r of ev) for (const k of r.mis || []) if (k) counts[k] = (counts[k] || 0) + 1;
        x.mistakes = Object.keys(counts).sort((m, n) => counts[n] - counts[m]).slice(0, 3).map(k => Object.assign({ key: k, count: counts[k] }, u.mistakes[k] || u.mistakes.guess));
        x.cls = x.level === 'high' ? 'good' : x.level === 'low' ? 'weak' : 'review';
        return x;
      }).filter(Boolean);
    }
    function totals(p) { const t = { first: 0, retry: 0, many: 0 }; for (const r of p.records) t[bucket(r.wrong)]++; return t; }
    function resultOf(room, p) {
      const g = groupOf(room, p), u = unitOf(room);
      const d = p.diag && p.diag.results ? p.diag.results : [];
      const qs = p.records.filter(r => r.kind === 'q');
      return {
        team: g ? g.name : '', cleared: g ? g.cleared : 0, stages: room.settings.stages, ok: p.stats.ok, wrong: p.stats.wrong, extra: p.stats.extra,
        hintsSent: p.stats.hintsSent, hintsGot: p.stats.hintsGot, points: p.points, unitName: u.name, standards: u.standards,
        areas: areaSummary(room, p), totals: totals(p),
        growth: { diag: d.length ? Math.round(d.filter(x => x.ok).length / d.length * 100) : null, diagN: d.length, game: qs.length ? Math.round(qs.filter(r => r.wrong === 0).length / qs.length * 100) : null, gameN: qs.length },
      };
    }

    // ───── 화면으로 보내는 상태 ─────
    const canShop = (room, p) => room.phase === 'lobby' || room.phase === 'grouped' || room.phase === 'ended' || (room.phase === 'diag' && !!(p.diag && p.diag.done)) || (room.phase === 'playing' && !!p.stageDone);
    // 학생 화면용 모둠 정보: 친구들의 진행 상황은 넣지 않습니다.
    function groupViewStudent(room, g, me) {
      return {
        id: g.id, name: g.name, stage: g.stage, stages: room.settings.stages, hp: g.hp, hpMax: g.hpMax, cleared: g.cleared, done: g.done,
        ready: isReady(room, g), monster: monsterOf(room, g.stage),
        members: membersOf(room, g).map(m => ({ pid: m.pid, num: m.num, name: m.name, online: m.online, me: m === me, equip: m.equip, react: reactOf(m), hand: !!m.hand })),
        boxMax: BOX_MAX, boxFull: boxFull(g), box: g.box.map(b => ({ kind: b.kind, label: GIFTS[b.kind] })), boxKinds: Object.keys(GIFTS).map(k => ({ kind: k, label: GIFTS[k], count: g.box.filter(b => b.kind === k).length, made: (g.made && g.made[k]) || 0, max: KIND_MAX[k], unlock: UNLOCK_BY[k] })),
      };
    }
    function groupViewTeacher(room, g) {
      const members = membersOf(room, g), on = members.filter(m => m.online);
      return {
        id: g.id, name: g.name, stage: g.stage, stages: room.settings.stages, hp: g.hp, hpMax: g.hpMax, cleared: g.cleared, done: g.done,
        ready: isReady(room, g), monster: monsterOf(room, g.stage), doneCount: on.filter(m => m.stageDone).length, onlineCount: on.length,
        members: members.map(m => { const c = curOf(m); return { pid: m.pid, num: m.num, name: m.name, online: m.online, done: m.qi || 0, per: room.settings.perStage, stageDone: !!m.stageDone, stuck: isStuck(m, c), twin: m.twin ? m.twin.state : null, react: reactOf(m), hand: !!m.hand }; }),
        box: g.box.length,
      };
    }
    function studentState(room, p) {
      const u = unitOf(room), subj = QB.subjectOfUnit(u.id);
      const st = { t: 'state', code: room.code, phase: room.phase, frozen: room.frozen, soundOff: !!room.soundOff, subjectName: subj ? subj.name : '', unitName: u.name, dragon: u.dragon, hue: u.hue, art: u.art ? `img/mon/${u.art}4.webp` : null, chatList: CHAT, giftKinds: GIFTS,
        me: { pid: p.pid, num: p.num, name: p.name, ok: p.stats.ok, points: p.points, equip: p.equip, owned: p.owned }, notes: p.notes.filter(n => !n.resolved).length, canShop: canShop(room, p) };
      if (room.phase === 'lobby' || room.phase === 'diagcount' || room.phase === 'diag') {
        // 대기 명단에는 이름만 (누가 레벨 테스트를 끝냈는지도 보여 주지 않음)
        st.roster = [...room.players.values()].filter(x => x.online).sort((a, b) => a.num - b.num).map(x => ({ num: x.num, name: x.name, me: x === p, equip: x.equip, react: reactOf(x), hand: !!x.hand }));
      }
      if (room.phase === 'diag') {
        const d = p.diag;
        if (d && !d.done) { const q = d.qs[d.idx]; st.diag = { idx: d.idx, total: d.qs.length, q: { id: q.id, text: q.text, choices: q.choices } }; }
        else st.diagDone = true;
      }
      const g = groupOf(room, p);
      if (g && ['grouped', 'countdown', 'playing', 'ended'].indexOf(room.phase) >= 0) st.group = groupViewStudent(room, g, p);
      if (room.phase === 'playing' && g) {
        const c = curOf(p);
        st.play = { qi: p.qi, per: room.settings.perStage, stageDone: !!p.stageDone };
        if (c && !p.stageDone) st.play.q = { id: c.id, areaName: c.areaName, text: c.text, choices: c.choices, tried: c.tried, eliminated: c.eliminated, gifts: c.gifts.map(x => ({ kind: x.kind, label: x.label, text: x.text })), elimOk: canElim(c), canKinds: Object.keys(GIFTS).filter(k => canUseKind(p, c, k)), steps: c.hints.slice(0, Math.min(3, c.tried.length)), canTake: canTakeGift(p, c) };
        if (p.twin) st.play.twin = { id: p.twin.id, state: p.twin.state, allowed: p.twin.state === 'reward' ? allowedKinds(p, groupOf(room, p)) : undefined, fmt: p.twin.answers ? fmtOf(p.twin.answers) : 'text', text: p.twin.text, areaName: p.twin.areaName, diff: p.twin.diff, tries: p.twin.tries, steps: p.twin.hints ? p.twin.hints.slice(0, Math.min(3, p.twin.tries)) : [] };
        st.play.helpWanted = !!p.stageDone && !g.done && needyOf(room, g, p).length > 0; // 누가 막혔는지는 보내지 않음
      }
      if (room.phase === 'playing' && !g) st.waiting = true;
      if (room.phase === 'ended' || (room.phase === 'playing' && g && g.done)) {
        st.result = resultOf(room, p);
        if (room.rlog && p.rs) st.survey = { done: !!p.rs.survey, qs: surveyQs(p).map(id => ({ id, text: SURVEY[id] })) };
      }
      return st;
    }
    // ───── 연구용 협력 리포트 (선생님이 내려받기) ─────
    // 레벨 1~2를 '하위 집단', 3~4를 '상위 집단'으로 나눔 (레벨 테스트 기준)
    function research(room) {
      const L = room.rlog;
      if (!L) return { t: 'tresearch', empty: true };
      const u = unitOf(room), end = L.end || now();
      const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : null);
      const avg = arr => { const v = arr.filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
      const sec = ms => Math.round(ms / 1000);
      const gname = gid => (room.groups.find(g => g.id === gid) || {}).name || '-';
      const players = [...room.players.values()].filter(p => !p.bot && (p.group || (p.rs && p.rs.dealt))).sort((a, b) => a.num - b.num); // 가상 친구는 빼고 실제 학생만
      const byPid = new Map(players.map(p => [p.pid, p]));
      const students = players.map(p => {
        const qs = p.records.filter(r => r.kind === 'q'), rs = p.rs || {};
        const usedByOthers = L.gifts.filter(e => e.fromPid === p.pid && e.toPid !== p.pid);
        const got = L.gifts.filter(e => e.toPid === p.pid);
        const areas = areaSummary(room, p);
        const sv = rs.survey || {};
        const handMs = (rs.handMs || 0) + (rs.handUpAt != null ? end - rs.handUpAt : 0);
        return {
          num: p.num, name: p.name, group: gname(p.group), level: p.level || 0, band: (p.level || 0) >= 3 ? '상위(레벨 3~4)' : '하위(레벨 1~2)',
          dealt: rs.dealt || 0, solved: qs.length, solveRate: pct(qs.length, rs.dealt || 0), firstTry: qs.filter(r => r.wrong === 0).length, firstTryRate: pct(qs.filter(r => r.wrong === 0).length, qs.length), wrong: p.stats.wrong,
          extraSolved: p.stats.extra, hintsMade: madeCount(p), hintsUsedByFriends: usedByOthers.length, hintsGot: got.length, hintsGotSolved: got.filter(e => e.solved).length,
          hands: rs.hands || 0, handSec: sec(handMs), lowered: rs.lowered || 0, reacts: Object.values(rs.reacts || {}).reduce((a, b) => a + b, 0),
          notes: p.notes.length, notesResolved: p.notes.filter(n => n.resolved).length,
          ok: p.stats.ok, hintsSent: p.stats.hintsSent, topMistake: (areas.flatMap(a => a.mistakes).sort((m, n) => n.count - m.count)[0] || {}).name || '', // 결과 리포트 칸 (구글 시트 저장용)
          levels: Object.fromEntries(areas.map(a => [a.name, { high: '상', mid: '중', low: '하', na: '확인 필요' }[a.level]])),
          survey: { q1: sv.q1 ?? null, q2: sv.q2 ?? null, q3: sv.q3 ?? null, q4: sv.q4 ?? null, q5: sv.q5 ?? null }, surveyDone: !!rs.survey,
        };
      });
      const groups = room.groups.map(g => {
        const st = L.stages.filter(x => x.gid === g.id);
        const gift = L.gifts.filter(e => e.gid === g.id);
        const mem = g.members.map(pid => byPid.get(pid)).filter(Boolean);
        return {
          name: g.name, size: mem.length, bots: g.members.filter(pid => (room.players.get(pid) || {}).bot).length, levels: mem.map(m => m.level || 0).join('·'), stages: room.settings.stages, cleared: g.cleared, done: g.done,
          allSolveRate: pct(g.cleared, room.settings.stages), avgStageSec: avg(st.map(x => sec(x.cleared - x.start))), avgGapSec: avg(st.map(x => sec(x.gapMs))),
          hintsMade: mem.reduce((a, m) => a + madeCount(m), 0), hintsUsed: gift.length, hintsSolved: gift.filter(e => e.solved).length,
          stageRows: st.map(x => ({ stage: x.stage, sec: sec(x.cleared - x.start), gapSec: sec(x.gapMs) })),
        };
      });
      const isBot = pid => !!(room.players.get(pid) || {}).bot;
      const gifts = L.gifts.filter(e => !isBot(e.toPid)).map(e => { // 가상 친구가 받은 힌트는 빼고, 가상 친구가 만든 힌트는 '가상 친구'로 남김
        const a = byPid.get(e.fromPid) || room.players.get(e.fromPid) || {}, b = byPid.get(e.toPid) || room.players.get(e.toPid) || {}, fromBot = isBot(e.fromPid);
        return { min: Math.round((e.at - L.start) / 6000) / 10, stage: e.stage, group: gname(e.gid), fromBot, fromNum: fromBot ? '' : a.num, fromName: fromBot ? '가상 친구' : a.name, fromLevel: a.level || 0, toNum: b.num, toName: b.name, toLevel: b.level || 0, kind: GIFTS[e.kind], area: e.area, wrongBefore: e.triedBefore, solved: e.solved, wrongAfter: e.wrongAfter, solvedSec: e.solvedSec };
      });
      const band = name => students.filter(x => x.band.startsWith(name));
      const bandRow = (label, arr) => ({ label, n: arr.length, solveRate: avg(arr.map(x => x.solveRate)), firstTryRate: avg(arr.map(x => x.firstTryRate)), hintsMade: avg(arr.map(x => x.hintsMade)), hintsGot: avg(arr.map(x => x.hintsGot)), hands: avg(arr.map(x => x.hands)), q4: avg(arr.map(x => x.survey.q4)), q5: avg(arr.map(x => x.survey.q5)) });
      const made = students.reduce((a, x) => a + x.hintsMade, 0);
      const survey = Object.keys(SURVEY).map(id => { const v = students.map(x => x.survey[id]).filter(x => x != null); return { id, text: SURVEY[id], n: v.length, yes: v.filter(x => x === 2).length, some: v.filter(x => x === 1).length, no: v.filter(x => x === 0).length, avg: avg(v) }; });
      return {
        t: 'tresearch', empty: false,
        meta: { code: room.code, date: new Date(L.start).toISOString(), unit: u.name, area: room.settings.area === 'all' ? '전체' : ((u.areas.find(a => a.id === room.settings.area) || {}).name || ''), stages: room.settings.stages, perStage: room.settings.perStage, size: room.settings.size, minutes: Math.round((end - L.start) / 6000) / 10, ended: room.phase === 'ended' },
        summary: {
          students: students.length, groups: groups.length, allSolveRate: pct(room.groups.reduce((a, g) => a + g.cleared, 0), room.groups.length * room.settings.stages),
          finishedGroups: room.groups.filter(g => g.done).length, solveRate: avg(students.map(x => x.solveRate)),
          hintsMade: made, hintsUsed: gifts.filter(x => !x.fromBot).length, hintUseRate: pct(gifts.filter(x => !x.fromBot).length, made), hintsFromBots: gifts.filter(x => x.fromBot).length, bots: [...room.players.values()].filter(p => p.bot).length, hintSolvedRate: pct(gifts.filter(x => x.solved).length, gifts.length),
          lowToHigh: gifts.filter(x => !x.fromBot && x.fromLevel >= 3 && x.toLevel <= 2).length,
          freezes: L.freezes, frozenSec: sec(L.frozenMs + (L.frozenAt ? end - L.frozenAt : 0)), hands: students.reduce((a, x) => a + x.hands, 0), lowered: students.reduce((a, x) => a + x.lowered, 0),
          avgGapSec: avg(groups.map(g => g.avgGapSec)), surveyDone: students.filter(x => x.surveyDone).length,
        },
        bands: [bandRow('하위 집단 (레벨 1~2)', band('하위')), bandRow('상위 집단 (레벨 3~4)', band('상위'))],
        groups, students, gifts, survey, areaNames: u.areas.map(a => a.name),
      };
    }
    function teacherState(room) {
      const players = [...room.players.values()].sort((a, b) => a.num - b.num).map(p => {
        const c = curOf(p);
        const areas = room.phase === 'ended' ? areaSummary(room, p) : [];
        return {
          pid: p.pid, num: p.num, name: p.name, online: p.online, level: p.level || 0, group: p.group, react: reactOf(p), hand: !!p.hand, bot: !!p.bot,
          diag: p.diag ? { done: p.diag.done, ok: p.diag.ok, idx: p.diag.idx, total: p.diag.qs.length } : null,
          done: p.qi || 0, stageDone: !!p.stageDone, stuck: isStuck(p, c), twin: p.twin ? p.twin.state : null,
          ok: p.stats.ok, wrong: p.stats.wrong, extra: p.stats.extra, hintsSent: p.stats.hintsSent, hintsGot: p.stats.hintsGot, hintsMade: madeCount(p), points: p.points,
          notes: p.notes.length, notesResolved: p.notes.filter(n => n.resolved).length,
          weak: areas.filter(a => a.cls === 'weak').map(a => a.name), review: areas.filter(a => a.cls === 'review').map(a => a.name),
          levels: Object.fromEntries(areas.map(a => [a.area, a.level])), topMistake: (areas.flatMap(a => a.mistakes).sort((m, n) => n.count - m.count)[0] || {}).name || '',
        };
      });
      const u = unitOf(room);
      return { t: 'tstate', code: room.code, phase: room.phase, frozen: room.frozen, soundOff: !!room.soundOff, settings: room.settings, unitAreas: u.areas.map(a => ({ id: a.id, name: a.name, std: a.std })), players, groups: room.groups.map(g => groupViewTeacher(room, g)) };
    }
    function studentDetail(room, p) {
      const g = groupOf(room, p), c = curOf(p);
      return {
        t: 'tdetail', pid: p.pid, num: p.num, name: p.name, level: p.level || 0, team: g ? g.name : '', online: p.online,
        unitName: unitOf(room).name, result: resultOf(room, p),
        records: p.records.map(r => ({ kind: r.kind, stage: r.stage, diff: r.diff, areaName: r.areaName, text: r.text, answer: r.answer, wrong: r.wrong, picks: r.picks, gifts: r.gifts, mis: (r.mis || []).map(k => ((unitOf(room).mistakes || {})[k] || {}).name || '') })),
        diag: (p.diag && p.diag.qs || []).map((qq, i) => { const res = p.diag.results[i]; return { text: qq.text, answer: qq.answerText, areaName: qq.areaName, diff: qq.diff, done: !!res, ok: res ? res.ok : null }; }),
        notes: p.notes.map(n => ({ kind: n.kind, areaName: n.areaName, text: n.text, answer: n.answers[0], mine: n.mineAll, resolved: n.resolved })),
        current: c && !p.stageDone && room.phase === 'playing' ? { text: c.text, answer: c.answerText, tried: c.tried.map(i => c.choices[i]), gifts: c.gifts.length, stuck: isStuck(p, c) } : null,
      };
    }
    function pushAll(room) {
      for (const p of room.players.values()) if (p.online) send(p.conn, studentState(room, p));
      if (room.tconn) {
        send(room.tconn, teacherState(room));
        const open = room.tdetail && room.players.get(room.tdetail);
        if (open) send(room.tconn, studentDetail(room, open));
      }
    }
    const toast = (conn, msg) => send(conn, { t: 'toast', msg });
    const toGroup = (room, g, obj) => { for (const m of membersOf(room, g)) if (m.online) send(m.conn, obj); };

    // ───── 진행 ─────
    function countdownTo(room, phase, then) {
      room.phase = phase;
      const token = ++room.token;
      pushAll(room);
      later(() => { if (room.token === token && room.phase === phase) then(); }, COUNTDOWN_MS);
    }
    function startDiagPhase(room) {
      for (const p of room.players.values()) Object.assign(p, freshProgress(), { points: p.points, owned: p.owned, equip: p.equip });
      countdownTo(room, 'diagcount', () => {
        room.phase = 'diag';
        for (const p of room.players.values()) if (p.online) startDiag(room, p);
        pushAll(room);
      });
    }
    function startPlaying(room) {
      countdownTo(room, 'countdown', () => {
        for (const g of room.groups) { g.stage = 1; g.cleared = 0; g.done = false; g.box = []; g.made = {}; g.stageStart = now(); setStageHp(room, g); }
        room.rlog = { start: now(), end: null, gifts: [], stages: [], freezes: 0, frozenMs: 0, frozenAt: null };
        room.phase = 'playing';
        for (const p of room.players.values()) if (groupOf(room, p)) dealStage(room, p, true);
        pushAll(room);
      });
    }
    function endGame(room) { room.token++; if (room.rlog && !room.rlog.end) { if (room.rlog.frozenAt) { room.rlog.frozenMs += now() - room.rlog.frozenAt; room.rlog.frozenAt = null; } room.rlog.end = now(); } room.phase = 'ended'; room.frozen = false; pushAll(room); }
    function checkAllDone(room) {
      if (room.phase !== 'playing' || !room.groups.length || !room.groups.every(g => g.done)) return;
      const token = room.token;
      later(() => { if (room.token === token && room.phase === 'playing') endGame(room); }, END_DELAY_MS);
    }
    function resetToLobby(room) {
      if (room.rlog) { room.prevResearch = research(room); room.rlog = null; } // 지난 게임 리포트는 대기실에서도 내려받을 수 있게 남겨 둠
      room.token++; room.phase = 'lobby'; room.frozen = false; room.groups = []; room.gseq = 0; room.tdetail = null;
      for (const [pid, p] of room.players) {
        if (!p.online) { room.players.delete(pid); continue; }
        Object.assign(p, freshProgress(), { react: null, hand: false });
      }
    }
    function freshProgress() {
      return { level: 0, diag: null, group: null, queue: [], qi: 0, stageDone: false, twin: null, lastArea: null, seen: new Set(), seenTwin: new Set(), records: [], notes: [], stats: { ok: 0, wrong: 0, extra: 0, hintsSent: 0, hintsGot: 0 }, chatAt: 0, made: {}, rs: { dealt: 0, hands: 0, handUpAt: null, handMs: 0, lowered: 0, reacts: {}, survey: null } };
    }

    function onCorrect(room, p, g, c) {
      c.solved = true; p.stats.ok++; p.points += POINTS.correct;
      p.records.push({ kind: 'q', qid: c.qid, diff: c.diff, stage: g.stage, area: c.area, areaName: c.areaName, text: c.text, answer: c.answerText, wrong: c.tried.length, picks: c.tried.map(i => c.choices[i]), mis: c.tried.map(i => c.mis[i]).filter(Boolean), gifts: c.gifts.length });
      g.hp = g.hp > TEAM ? Math.max(TEAM, g.hp - SMALL) : g.hp;
      p.qi++; p.lastArea = c.area;
      for (const e of c.glog || []) { e.solved = true; e.wrongAfter = c.tried.length - e.triedBefore; e.solvedSec = Math.round((now() - e.at) / 1000); }
      if (p.qi >= p.queue.length) {
        p.stageDone = true; p.stageDoneAt = now();
        // 이 학생이 마지막이라 합동 공격이 열리면 새 추가 문제는 내지 않음 (지난 스테이지에서 풀던 문제는 이어서)
        if (!keepTwin(p)) p.twin = isReady(room, g) ? null : { state: 'choose' };
      } else showCurrent(room, p);
      toGroup(room, g, { t: 'fx', kind: 'hit', by: p.name, dmg: SMALL });
    }
    function giftText(room, kind, c) {
      if (kind === 'elim') {
        const can = c.choices.map((_, i) => i).filter(i => i !== c.answer && c.tried.indexOf(i) < 0 && c.eliminated.indexOf(i) < 0);
        // 정답 하나만 남기지는 않음
        if (can.length >= 2) { c.eliminated.push(pick(can)); return '틀린 보기 하나를 지워 줬어요. 남은 보기 중에서 다시 생각해 봐요.'; }
        return c.step; // 지우면 정답만 남는 때는 첫 단계를 대신 보여 줌
      }
      if (kind === 'concept') { const a = areaById(room, c.area); return a ? a.concept : c.hints[0]; }
      return c.step;
    }
    function handDown(p, byTeacher) {
      if (!p.rs || p.rs.handUpAt == null) return;
      p.rs.handMs += now() - p.rs.handUpAt; p.rs.handUpAt = null;
      if (byTeacher) p.rs.lowered++;
    }
    // 게임 끝 학생 설문: 상황에 맞는 문항만 (친구 힌트를 쓴 학생 / 힌트를 만든 학생 / 모두)
    const SURVEY = {
      q1: '친구가 만든 힌트가 문제를 푸는 데 도움이 되었나요?',
      q2: '내가 만든 힌트가 친구에게 도움이 되었을 것 같나요?',
      q3: '친구를 위해 추가 문제를 풀며 힌트를 만드는 것이 나에게도 공부가 되었나요?',
      q4: '모둠 친구들과 끝까지 함께 게임했다고 느꼈나요?',
      q5: '몬스터를 모둠이 함께 물리치는 방식이 친구와 협력하게 만들었나요?',
    };
    const madeCount = p => Object.values(p.made || {}).reduce((a, b) => a + b, 0);
    const surveyQs = p => [p.stats.hintsGot > 0 ? 'q1' : null, madeCount(p) > 0 ? 'q2' : null, madeCount(p) > 0 ? 'q3' : null, 'q4', 'q5'].filter(Boolean);
    function applyGift(room, g, item, to) {
      const c = curOf(to);
      c.gifts.push({ from: item.from, kind: item.kind, label: GIFTS[item.kind], text: giftText(room, item.kind, c) });
      if (room.rlog) { const e = { at: now(), stage: g.stage, gid: g.id, fromPid: item.fromPid, toPid: to.pid, kind: item.kind, qid: c.qid, area: c.areaName, triedBefore: c.tried.length, solved: false, wrongAfter: null, solvedSec: null }; room.rlog.gifts.push(e); (c.glog = c.glog || []).push(e); }
      g.box = g.box.filter(b => b !== item);
      to.stats.hintsGot++;
      const giver = room.players.get(item.fromPid);
      if (giver) { giver.stats.hintsSent++; giver.points += POINTS.give; }
    }
    function doTeamAttack(room, g, by) {
      const mon = monsterOf(room, g.stage);
      const dmg = g.hp;
      g.hp = 0; g.cleared++;
      const last = g.stage >= room.settings.stages;
      if (room.rlog) {
        const mem = membersOf(room, g), ts = mem.map(m => m.stageDoneAt).filter(Boolean);
        room.rlog.stages.push({ gid: g.id, stage: g.stage, start: g.stageStart || room.rlog.start, cleared: now(), size: mem.length, gapMs: ts.length > 1 ? Math.max(...ts) - Math.min(...ts) : 0 });
        g.stageStart = now();
      }
      const ev = { t: 'fx', kind: 'team', by: by.name, dmg, monster: mon, cleared: true, last };
      for (const m of membersOf(room, g)) if (m.online) m.points += POINTS.team;
      if (last) { g.done = true; for (const m of membersOf(room, g)) m.twin = null; }
      else {
        g.stage++;
        g.box = []; g.made = {}; // 스테이지마다 힌트 상자를 새로 채워요 (주고받는 기회를 매 라운드 다시)
        setStageHp(room, g);
        ev.next = monsterOf(room, g.stage);
        for (const m of membersOf(room, g)) dealStage(room, m);
      }
      toGroup(room, g, ev);
      if (room.tconn) send(room.tconn, { t: 'tfx', group: g.id, team: g.name, last });
      pushAll(room);
      checkAllDone(room);
    }

    function attach(room, p, conn) {
      if (p.conn && p.conn !== conn) { send(p.conn, { t: 'replaced' }); p.conn.ctx = {}; }
      p.conn = conn; p.online = true;
      conn.ctx = { role: 's', room: room.code, pid: p.pid };
      send(conn, { t: 'joined', pid: p.pid, code: room.code, num: p.num, name: p.name, catalog: CATALOG });
      if (room.phase === 'diag' && !p.diag) startDiag(room, p);
      placeLate(room, p);
      pushAll(room);
    }
    function newCode() { let c; do { c = String(R(1000, 9999)); } while (rooms.has(c)); return c; }

    // ───── 메시지 처리 ─────
    function handle(conn, m) {
      if (!conn || !m || typeof m !== 'object' || typeof m.t !== 'string') return;
      if (!conn.ctx) conn.ctx = {};
      const ctx = conn.ctx;
      if (m.t === 'tcreate' || m.t === 'tresume' || m.t === 'join' || m.t === 'rejoin') {
        const prev = ctx.room ? rooms.get(ctx.room) : null;
        if (prev && prev.tconn === conn) prev.tconn = null;
        if (prev && ctx.pid) { const pp = prev.players.get(ctx.pid); if (pp && pp.conn === conn && !(m.t === 'rejoin' && m.pid === pp.pid) && !(m.t === 'join' && prev.code === String(m.code))) { pp.online = false; pp.conn = null; pushAll(prev); } }
      }

      switch (m.t) {
        case 'ping': return send(conn, { t: 'pong' });
        case 'tcreate': {
          const room = { code: newCode(), key: uid(), tconn: conn, settings: cleanSettings(m.settings, DEFAULTS), phase: 'lobby', frozen: false, players: new Map(), groups: [], gseq: 0, token: 0, touched: now(), tdetail: null };
          rooms.set(room.code, room);
          conn.ctx = { role: 't', room: room.code };
          send(conn, { t: 'troom', code: room.code, key: room.key });
          return send(conn, teacherState(room));
        }
        case 'tresume': {
          const room = rooms.get(String(m.code));
          if (!room || room.key !== m.key) return send(conn, { t: 'terror', msg: '이전 수업을 찾을 수 없어요. 새로 만들어 주세요.' });
          if (room.tconn && room.tconn !== conn) room.tconn.ctx = {};
          room.tconn = conn; room.touched = now();
          conn.ctx = { role: 't', room: room.code };
          send(conn, { t: 'troom', code: room.code, key: room.key });
          return send(conn, teacherState(room));
        }
        case 'join': {
          const room = rooms.get(String(m.code == null ? '' : m.code).trim());
          if (!room) return send(conn, { t: 'jerror', msg: '방을 찾을 수 없어요. 방 번호 4자리를 다시 확인해 주세요.' });
          const num = intIn(m.num, 1, 60), name = cleanName(m.name);
          if (!num || !name) return send(conn, { t: 'jerror', msg: '출석 번호와 이름을 모두 써 주세요.' });
          let p = [...room.players.values()].find(x => x.num === num);
          if (p && p.name !== name) return send(conn, { t: 'jerror', msg: `${num}번은 이미 다른 이름(${p.name})으로 들어와 있어요. 번호를 확인해 주세요.` });
          if (!p) {
            if (room.phase === 'ended') return send(conn, { t: 'jerror', msg: '게임이 끝났어요. 선생님이 새 게임을 열면 들어올 수 있어요.' });
            p = Object.assign({ pid: uid(), num, name, conn: null, online: false, points: 0, owned: [], equip: { base: BASES[(num - 1) % BASES.length], bg: 'bg_night' }, react: null, hand: false }, freshProgress());
            room.players.set(p.pid, p);
          }
          room.touched = now();
          return attach(room, p, conn);
        }
        case 'rejoin': {
          const room = rooms.get(String(m.code));
          const p = room && room.players.get(String(m.pid));
          if (!p) return send(conn, { t: 'jerror', msg: '다시 입장해 주세요.', reset: true });
          room.touched = now();
          return attach(room, p, conn);
        }
      }

      const room = ctx.room ? rooms.get(ctx.room) : null;
      if (!room) return;
      room.touched = now();

      // ── 교사 ──
      if (ctx.role === 't') {
        if (room.tconn !== conn) return;
        switch (m.t) {
          case 'tsettings':
            if (room.phase !== 'lobby') return;
            room.settings = cleanSettings(m.settings, room.settings);
            return pushAll(room);
          case 'tdiag':
            if (room.phase !== 'lobby') return;
            if (![...room.players.values()].some(p => p.online)) return toast(conn, '접속한 학생이 아직 없어요.');
            return startDiagPhase(room);
          case 'tgroup':
            if (room.phase !== 'diag') return;
            return beginGrouping(room);
          case 'tshuffle':
            if (room.phase !== 'grouped') return;
            formGroups(room); return pushAll(room);
          case 'tstart':
            if (room.phase !== 'grouped') return;
            return startPlaying(room);
          case 'tlower': { // 선생님이 학생 손 내려 주기
            const p = room.players.get(String(m.pid));
            if (!p || !p.hand) return;
            p.hand = false; handDown(p, true); return pushAll(room);
          }
          case 'tfreeze':
            if (room.phase === 'lobby' || room.phase === 'ended') return;
            if (room.rlog && room.phase === 'playing' && !!m.on !== room.frozen) {
              if (m.on) { room.rlog.freezes++; room.rlog.frozenAt = now(); }
              else if (room.rlog.frozenAt) { room.rlog.frozenMs += now() - room.rlog.frozenAt; room.rlog.frozenAt = null; }
            }
            room.frozen = !!m.on; return pushAll(room);
          case 'tsound': // 학생 기기 효과음을 한 번에 끄기/켜기
            room.soundOff = !!m.off; return pushAll(room);
          case 'tend':
            if (['diagcount', 'diag', 'grouped', 'countdown', 'playing'].indexOf(room.phase) < 0) return;
            return endGame(room);
          case 'treset':
            resetToLobby(room); return pushAll(room);
          case 'tbotsdone': { // 가상 친구는 이번 스테이지 내 문제를 바로 모두 풀어 완료로
            if (room.phase !== 'playing' || room.frozen) return;
            let n = 0;
            for (const p of [...room.players.values()]) {
              if (!p.bot || !p.conn) continue;
              for (let k = 0; k < 40 && !p.stageDone; k++) { const c = curOf(p); if (!c) break; handle(p.conn, { t: 'answer', qid: c.id, choice: c.answer }); }
              if (p.stageDone) n++;
            }
            if (room.tconn) send(room.tconn, { t: 'toast', msg: `🤖 가상 친구 ${n}명이 이번 스테이지 문제를 모두 풀었어요.` });
            return pushAll(room);
          }
          case 'tbots': {
            if (room.phase !== 'lobby') return;
            const n = intIn(m.n, 1, 30);
            if (!n) return;
            addBots(room, n);
            return pushAll(room);
          }
          case 'tkick': {
            if (room.phase !== 'lobby') return;
            const p = room.players.get(String(m.pid));
            if (!p) return;
            send(p.conn, { t: 'kicked' }); if (p.conn) p.conn.ctx = {};
            room.players.delete(p.pid);
            return pushAll(room);
          }
          case 'tresearch': return send(conn, room.rlog ? research(room) : room.prevResearch ? Object.assign({}, room.prevResearch, { previous: true }) : research(room));
          case 'tdetail': {
            const p = m.pid ? room.players.get(String(m.pid)) : null;
            room.tdetail = p ? p.pid : null;
            if (p) send(conn, studentDetail(room, p));
            return;
          }
        }
        return;
      }

      // ── 학생 ──
      if (ctx.role !== 's') return;
      const p = room.players.get(ctx.pid);
      if (!p || p.conn !== conn) return;

      if (m.t === 'notes') return send(conn, { t: 'notes', list: notesView(p) });
      if (m.t === 'leave') { // 게임이 끝난 뒤 '처음 화면으로' — 연결을 끊어 리포트로 다시 돌아오지 않게
        const lg = groupOf(room, p);
        if (room.phase !== 'ended' && !(room.phase === 'playing' && lg && lg.done)) return;
        conn.ctx = {}; p.conn = null; p.online = false; p.hand = false;
        return pushAll(room);
      }
      if (room.frozen) return toast(conn, '❄️ 지금은 멈춤 시간이에요. 선생님을 바라봐 주세요.');
      const g = groupOf(room, p);

      switch (m.t) {
        case 'answer': {
          const choiceIn = list => intIn(m.choice, 0, list.length - 1);
          if (room.phase === 'diag') {
            const d = p.diag;
            if (!d || d.done) return;
            const q = d.qs[d.idx];
            if (m.qid && m.qid !== q.id) return;
            const choice = choiceIn(q.choices); if (choice === null) return;
            if (choice === q.answer) d.ok++;
            d.results.push({ area: q.area, diff: q.diff, ok: choice === q.answer, mis: choice === q.answer ? null : q.mis[choice] });
            d.idx++;
            if (d.idx >= d.qs.length) { d.done = true; p.level = levelOf(d.ok, d.qs.length); }
            pushAll(room);
            return checkDiagDone(room);
          }
          if (room.phase !== 'playing' || !g || p.stageDone) return;
          const c = curOf(p);
          if (!c || (m.qid && m.qid !== c.id)) return;
          const choice = choiceIn(c.choices);
          if (choice === null || c.tried.indexOf(choice) >= 0 || c.eliminated.indexOf(choice) >= 0) return;
          if (choice === c.answer) {
            send(conn, { t: 'result', correct: true });
            onCorrect(room, p, g, c);
          } else {
            c.tried.push(choice); p.stats.wrong++;
            saveNote(room, p, { key: 'q:' + c.qid, kind: 'q', areaName: c.areaName, text: c.text, choices: c.choices, answer: c.answer, answers: [c.answerText], mine: c.choices[choice], hints: c.hints, explain: c.hints[2] });
            send(conn, { t: 'result', correct: false, step: Math.min(3, c.tried.length), saved: true });
          }
          return pushAll(room);
        }
        case 'twinpick': { // 추가 문제 난이도 고르기
          if (room.phase !== 'playing' || !g || !p.stageDone || !p.twin || p.twin.state !== 'choose' || isReady(room, g)) return;
          const d = intIn(m.diff, 1, 3); if (!d) return;
          openTwin(room, p, d);
          return pushAll(room);
        }
        case 'twin': {
          if (room.phase !== 'playing' || !p.twin || p.twin.state !== 'open') return;
          if (m.tid && m.tid !== p.twin.id) return;
          const text = String(m.text == null ? '' : m.text).slice(0, 40);
          if (!text.trim()) return;
          const tw = p.twin;
          if (hasHangul(tw.answers[0]) && /\d/.test(text) && !/\d/.test(tw.answers[0])) return toast(conn, '숫자 대신 한글로 써 주세요. 예) 칠각뿔');
          if (matches(text, tw.answers)) {
            tw.state = 'reward'; p.stats.extra++; p.points += POINTS.extra;
            if (g && boxFull(g)) { p.twin = isReady(room, g) || g.done ? null : { state: 'choose' }; toast(conn, `⭐ 맞혔어요! +${POINTS.extra}점 · 이번 스테이지 힌트를 모두 만들어서 이번엔 포인트만 받아요.`); }
            p.records.push({ kind: 'twin', qid: tw.tid, diff: tw.diff, stage: g ? g.stage : 0, area: tw.area, areaName: tw.areaName, text: tw.text, answer: tw.answers[0], wrong: tw.tries, picks: tw.picks || [], mis: [], gifts: 0 });
            send(conn, { t: 'result', correct: true, twin: true });
          } else {
            tw.tries++; p.stats.wrong++; (tw.picks = tw.picks || []).push(text);
            saveNote(room, p, { key: 't:' + tw.tid, kind: 'twin', areaName: tw.areaName + ' · 추가 문제', text: tw.text, answers: tw.answers, mine: text, hints: tw.hints, explain: tw.hints[2] });
            send(conn, { t: 'result', correct: false, twin: true, step: Math.min(3, tw.tries), saved: true });
          }
          return pushAll(room);
        }
        case 'twinskip': { // 추가 문제를 모르겠으면 오답노트에 저장하고 나가기
          if (room.phase !== 'playing' || !p.twin || p.twin.state !== 'open') return;
          const tw = p.twin;
          saveNote(room, p, { key: 't:' + tw.tid, kind: 'twin', areaName: tw.areaName + ' · 추가 문제', text: tw.text, answers: tw.answers, mine: tw.picks && tw.picks.length ? tw.picks[tw.picks.length - 1] : '(모르겠어요)', hints: tw.hints, explain: tw.hints[2] });
          toast(conn, '📒 오답노트에 저장했어요. 나중에 다시 풀어 봐요!');
          p.twin = isReady(room, g) || (g && g.done) ? null : { state: 'choose' };
          return pushAll(room);
        }
        case 'hintpick': { // 얻은 힌트 종류를 골라 모둠 힌트 상자에 넣기
          if (room.phase !== 'playing' || !g || !p.twin || p.twin.state !== 'reward' || !GIFTS[m.kind]) return;
          if (boxFull(g)) { // 그사이 상자가 가득 찼으면 힌트는 넣지 않음 (점수는 맞혔을 때 이미 받음)
            toast(conn, '이번 스테이지 힌트를 모두 만들었어요. 이번 문제는 포인트만 받아요.');
            p.twin = isReady(room, g) || g.done ? null : { state: 'choose' };
            return pushAll(room);
          }
          if (kindLeft(g, m.kind) <= 0) return toast(conn, `${GIFTS[m.kind]}는 이번 스테이지에 ${KIND_MAX[m.kind]}개를 다 만들었어요. 다른 종류를 골라요.`);
          if (allowedKinds(p, g).indexOf(m.kind) < 0) return toast(conn, '힌트를 골고루 만들어 봐요. 아직 안 만든 종류를 먼저 골라요.');
          { g.box.push({ id: uid(), kind: m.kind, from: p.name, fromPid: p.pid }); p.made = p.made || {}; p.made[m.kind] = (p.made[m.kind] || 0) + 1; g.made = g.made || {}; g.made[m.kind] = (g.made[m.kind] || 0) + 1; toast(conn, `🎁 ${GIFTS[m.kind]}를 모둠 힌트 상자에 넣었어요!`); }
          p.twin = isReady(room, g) || g.done ? null : { state: 'choose' };
          return pushAll(room);
        }
        case 'take': { // 막힌 학생이 직접 힌트 종류를 골라 씀 (같은 종류가 여러 개면 그중 하나를 무작위로)
          if (room.phase !== 'playing' || !g) return;
          const c = curOf(p);
          if (!canTakeGift(p, c)) return toast(conn, c && c.gifts.length >= MAX_GIFTS ? '이 문제에는 친구 힌트를 이미 썼어요.' : '먼저 혼자 생각해 봐요. 틀린 보기 지우기는 1번, 다른 힌트는 2번 틀리거나 1분이 지나면 쓸 수 있어요.');
          const kind = GIFTS[m.kind] ? m.kind : (g.box.find(b => canUseKind(p, c, b.kind)) || {}).kind;
          if (!kind) return toast(conn, '지금 쓸 수 있는 힌트가 상자에 없어요.');
          if (kind === 'elim' && !canElim(c)) return toast(conn, '남은 보기가 2개뿐이라 틀린 보기 지우기는 쓸 수 없어요.');
          if (!canUseKind(p, c, kind)) return toast(conn, `${GIFTS[kind]}는 ${UNLOCK_BY[kind]}번 틀리거나 1분이 지나면 쓸 수 있어요.`);
          const same = g.box.filter(b => b.kind === kind);
          if (!same.length) return toast(conn, '이 힌트는 상자에 없어요.');
          applyGift(room, g, pick(same), p);
          return pushAll(room);
        }
        case 'attack': {
          if (room.phase !== 'playing' || !g) return;
          if (m.stage !== g.stage) return;
          if (!isReady(room, g)) return toast(conn, '조금만 기다려요. 모두 해결하면 합동 공격을 할 수 있어요.');
          return doTeamAttack(room, g, p);
        }
        case 'survey': { // 게임 끝 설문 (한 번만)
          const g2 = groupOf(room, p);
          if (!p.rs || p.rs.survey || !room.rlog || !(room.phase === 'ended' || (room.phase === 'playing' && g2 && g2.done))) return;
          const ans = {};
          for (const id of surveyQs(p)) { const v = intIn(m.answers && m.answers[id], 0, 2); if (v === null) return toast(conn, '모든 질문에 답해 주세요.'); ans[id] = v; }
          p.rs.survey = ans;
          return pushAll(room);
        }
        case 'chat': { // 이모지 반응: 한 번에 하나만, 프로필 오른쪽 위에 10초 동안 (같은 것을 다시 누르면 내림)
          if (CHAT.indexOf(m.emoji) < 0 || room.frozen) return;
          const t = now(); if (t - p.chatAt < 250) return; p.chatAt = t;
          p.react = p.react && p.react.e === m.emoji && t - p.react.at < REACT_MS ? null : { e: m.emoji, at: t };
          if (p.react && p.rs && room.phase === 'playing') p.rs.reacts[m.emoji] = (p.rs.reacts[m.emoji] || 0) + 1;
          later(() => { if (rooms.has(room.code)) pushAll(room); }, REACT_MS + 50);
          return pushAll(room);
        }
        case 'hand': { // 손들기 / 손 내리기
          const up = !!m.up;
          if (!!p.hand === up) return;
          p.hand = up;
          if (up && p.rs && room.phase === 'playing') { p.rs.hands++; p.rs.handUpAt = now(); } else if (!up) handDown(p, false);
          return pushAll(room);
        }
        case 'note': {
          const n = p.notes.find(x => x.nid === m.nid);
          if (!n || n.resolved) return;
          let ok;
          if (n.kind === 'q') { const ch = intIn(m.choice, 0, n.choices.length - 1); if (ch === null) return; ok = ch === n.answer; }
          else {
            if (hasHangul(n.answers[0]) && /\d/.test(String(m.text || '')) && !/\d/.test(n.answers[0])) return toast(conn, '숫자 대신 한글로 써 주세요. 예) 칠각뿔');
            ok = matches(m.text, n.answers);
          }
          if (ok) { n.resolved = true; p.points += POINTS.note; toast(conn, `🌟 다시 풀어서 해결했어요! (+${POINTS.note}점)`); } else n.tries++;
          send(conn, { t: 'notes', list: notesView(p), last: { nid: n.nid, correct: ok } });
          return pushAll(room);
        }
        case 'buy': {
          if (!canShop(room, p)) return toast(conn, '상점은 기다리는 시간이나 내 문제를 다 푼 뒤에 열려요.');
          const it = ITEM[m.id];
          if (!it || it.price === 0 || p.owned.indexOf(it.id) >= 0) return;
          if (p.points < it.price) return toast(conn, '포인트가 모자라요!');
          p.points -= it.price; p.owned.push(it.id); p.equip[it.slot] = it.id;
          toast(conn, `🛍️ ${it.name}을(를) 샀어요!`);
          return pushAll(room);
        }
        case 'equip': {
          if (!canShop(room, p) || SLOTS.indexOf(m.slot) < 0) return;
          if (m.id == null) { if (m.slot === 'base' || m.slot === 'bg') return; delete p.equip[m.slot]; }
          else { const it = ITEM[m.id]; if (!it || it.slot !== m.slot || !(it.price === 0 || p.owned.indexOf(it.id) >= 0)) return; p.equip[m.slot] = it.id; }
          return pushAll(room);
        }
      }
    }

    function disconnect(conn) {
      const ctx = (conn && conn.ctx) || {};
      const room = ctx.room ? rooms.get(ctx.room) : null;
      if (!room) return;
      if (ctx.role === 't') { if (room.tconn === conn) room.tconn = null; return; }
      const p = room.players.get(ctx.pid);
      if (!p || p.conn !== conn) return;
      p.online = false; p.conn = null;
      pushAll(room);
      checkDiagDone(room);
    }
    // ───── 가상 친구 (선생님 대기실에서 넣기) ─────
    // 레벨이 고르게 나오도록 정답률을 돌아가며 정하고, 한 문제에 걸리는 시간도 실제 학생과 비슷하게(약 15~35초) 맞춰요.
    const BOT_NAMES = ['별이', '솔이', '콩이', '달이', '구름', '보리', '하늘', '바다', '단비', '새봄', '나래', '미르', '가람', '누리', '다온', '라온', '여름', '이슬', '한울', '해솔', '초롱', '아라', '도담', '봄이', '빛나', '슬기', '온새', '하랑', '예솔', '푸름'];
    const BOT_KIND = [{ acc: 0.5, sec: 34 }, { acc: 0.68, sec: 27 }, { acc: 0.84, sec: 21 }, { acc: 0.95, sec: 16 }]; // 레벨 테스트 전(정답률로 레벨이 고르게 나오게)
    // 게임 중에는 레벨 테스트로 정해진 실제 레벨에 맞춰 풀어요: 레벨이 높을수록 빠르고 정확하게 (한 번 답하는 데 평균 초)
    const BOT_LV = { 1: { acc: 0.55, sec: 20 }, 2: { acc: 0.7, sec: 14 }, 3: { acc: 0.85, sec: 10 }, 4: { acc: 0.95, sec: 7 } };
    function addBots(room, n) {
      const all = () => [...room.players.values()];
      let made = all().filter(p => p.bot).length;
      for (let i = 0; i < n && all().length < 40; i++) {
        let num = 60; while (num > 0 && all().some(p => p.num === num)) num--;
        if (!num) break;
        const base = BOT_NAMES.find(x => !all().some(p => p.name === '🤖 ' + x)) || ('친구' + num);
        const kind = BOT_KIND[made++ % BOT_KIND.length];
        const p = Object.assign({ pid: uid(), num, name: '🤖 ' + base, conn: null, online: false, points: 0, owned: [], equip: { base: BASES[(num - 1) % BASES.length], bg: 'bg_night' }, react: null, hand: false, bot: kind }, freshProgress());
        room.players.set(p.pid, p);
        attach(room, p, { ctx: {}, send() {}, bot: true });
      }
    }
    function botTick() { // 1초마다 서버가 불러요
      for (const room of rooms.values()) {
        if (room.frozen || (room.phase !== 'diag' && room.phase !== 'playing')) continue;
        for (const p of [...room.players.values()]) {
          if (!p.bot || !p.conn || !p.online) continue;
          const conn = p.conn, chance = x => rand() < x, b = room.phase === 'playing' ? (BOT_LV[p.level] || p.bot) : p.bot;
          if (room.phase === 'diag') {
            if (p.diag && !p.diag.done && chance(1 / 10)) { const q = p.diag.qs[p.diag.idx]; handle(conn, { t: 'answer', qid: q.id, choice: chance(b.acc) ? q.answer : (q.answer + 1) % 4 }); }
            continue;
          }
          const g = groupOf(room, p);
          if (!g || g.done) continue;
          const c = curOf(p);
          if (c && !p.stageDone && c.gifts.length < MAX_GIFTS && g.box.length && chance(0.25)) { // 막히면 상자에서 쓸 수 있는 힌트를 꺼내 씀
            const ks = [...new Set(g.box.map(x => x.kind))].filter(k => canUseKind(p, c, k));
            if (ks.length) { handle(conn, { t: 'take', kind: pick(ks) }); continue; }
          }
          if (c && !p.stageDone) {
            if (chance(1 / b.sec)) { const pool = c.choices.map((_, i) => i).filter(i => i !== c.answer && c.tried.indexOf(i) < 0 && c.eliminated.indexOf(i) < 0); handle(conn, { t: 'answer', qid: c.id, choice: chance(b.acc) || !pool.length ? c.answer : pick(pool) }); }
          } else if (p.twin && p.twin.state === 'choose' && chance(0.12)) handle(conn, { t: 'twinpick', diff: R(1, 3) });
          else if (p.twin && p.twin.state === 'open' && chance(1 / b.sec)) handle(conn, { t: 'twin', tid: p.twin.id, text: chance(b.acc) ? p.twin.answers[0] : '모르겠어요' });
          else if (p.twin && p.twin.state === 'reward' && chance(0.3)) { const ks = allowedKinds(p, g); handle(conn, { t: 'hintpick', kind: ks.length ? pick(ks) : 'concept' }); }
          else if (isReady(room, g) && membersOf(room, g).every(m => m.bot || !m.online) && chance(0.2)) handle(conn, { t: 'attack', stage: g.stage });
          if (chance(0.01)) handle(conn, { t: 'chat', emoji: pick(CHAT) });
        }
      }
    }
    function sweep(maxIdleMs) {
      const t = now();
      for (const [code, r] of rooms) if (!r.tconn && t - r.touched > maxIdleMs) rooms.delete(code);
    }

    return { handle, disconnect, sweep, botTick, rooms };
  }

  return { numVal, fmtOf, createEngine, DEFAULTS, SMALL, TEAM, CHAT, GIFTS, CATALOG, MAX_GIFTS, BOX_MAX, KIND_MAX, UNLOCK_BY, POINTS, matches, chosung };
});
