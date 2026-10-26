// 교사 화면 v0.2
// 수업 만들기(설정 탭) → QR·대기 명단 → 레벨 테스트 → 모둠 구성 확인 → 게임 시작 → 모둠 현황 → 결과
// MQTeacher.mount(요소, { connect, demo, joinLink(code) → {url, note} | null })
(function () {
  'use strict';
  const { esc, math, hero, monsterImg, toast, store, resultCharts, lvBadge } = window.MQUI;
  const PHASE = { lobby: '대기 중', diagcount: '레벨 테스트 준비', diag: '레벨 테스트 중', grouped: '모둠 구성 완료', countdown: '시작하는 중', playing: '게임 중', ended: '게임 끝' };
  const DIFF = { auto: '레벨에 맞춰 자동', 1: '하 (기본)', 2: '중 (보통)', 3: '상 (도전)' };
  const TABS = [['grade', '학년'], ['subject', '과목'], ['unit', '단원'], ['area', '영역'], ['diff', '난이도'], ['stages', '스테이지'], ['perStage', '1인 문제 수'], ['diag', '레벨 테스트'], ['size', '모둠 인원']];

  function mount(root, opt) {
    opt = opt || {};
    const demo = !!opt.demo;
    const CAT = window.MQQuestions.catalog();
    root.classList.add('mq-root', 't-root');
    root.innerHTML = `
      <header class="t-head">
        <div class="t-brand"><span aria-hidden="true">🗡️</span> 협력 몬스터 퀴즈 <span class="pill">선생님 화면</span></div>
        <span class="t-phase" hidden></span><span class="grow"></span>
        <button type="button" class="btn btn-ghost sm" data-act="ask-new" hidden>새 수업 만들기</button>
      </header>
      <div class="t-confirm" hidden></div>
      <div class="t-body"></div>
      <div class="ov ov-qr" hidden></div>
      <div class="ov ov-detail" hidden></div>
      <div class="ov ov-research" hidden></div>
      <div class="toasts" aria-live="polite"></div>
      <div class="conn-bar" hidden>서버와 연결이 끊겼어요. 다시 연결하는 중…</div>`;
    const $ = s => root.querySelector(s);
    const body = $('.t-body');

    const T = { detail: null, detailPid: null, ts: null, code: null, key: null, draft: { grade: 6, subject: 'math', unit: 'frac', area: 'all', diff: 'auto', stages: 3, perStage: 3, diag: 4, size: 4 }, tab: 'grade', visited: new Set(['grade']), base: '', confirm: null, flash: {}, qrCache: {}, resuming: false };
    const saved = demo ? null : store.get('localStorage', 'mq_t');
    if (saved && saved.code && saved.key) { T.code = saved.code; T.key = saved.key; T.resuming = true; }

    const net = opt.connect({
      onOpen() { if (T.code && T.key) net.send({ t: 'tresume', code: T.code, key: T.key }); },
      onStatus(on) { $('.conn-bar').hidden = on; },
      onMessage,
    });

    if (!demo) {
      T.base = location.origin;
      if (['localhost', '127.0.0.1', '[::1]', ''].indexOf(location.hostname) >= 0) fetch('/api/lan').then(r => r.json()).then(j => { if (j.base) { T.base = j.base; render(); } }).catch(() => {});
    }

    function onMessage(m) {
      switch (m.t) {
        case 'troom': T.code = m.code; T.key = m.key; T.resuming = false; if (!demo) store.set('localStorage', 'mq_t', { code: m.code, key: m.key }); break;
        case 'tstate': T.ts = m; T.draft = Object.assign({}, m.settings); render(); break;
        case 'terror': store.del('localStorage', 'mq_t'); T.code = null; T.key = null; T.ts = null; T.resuming = false; render(); toast($('.toasts'), m.msg); break;
        case 'toast': toast($('.toasts'), m.msg); break;
        case 'tdetail': if (T.detailPid === m.pid) { T.detail = m; renderDetail(); } break;
        case 'tresearch': T.research = m; renderResearch(); break;
        case 'tfx': T.flash[m.group] = Date.now(); toast($('.toasts'), m.last ? `🏆 ${m.team} 최종 보스 처치!` : `⚔️ ${m.team} 합동 공격 성공!`); break;
      }
    }

    // ───── 설정 탭 (HTML 버전과 같은 방식) ─────
    const subjectsOf = g => CAT.subjects.filter(s => s.grade === g);
    const subjOf = s => CAT.subjects.find(x => x.id === s.subject) || subjectsOf(s.grade)[0];
    const unitOf = s => { const sj = subjOf(s); return (sj && sj.units.find(u => u.id === s.unit)) || (sj && sj.units[0]); };
    function valueOf(s, k) {
      const sj = subjOf(s), u = unitOf(s);
      switch (k) {
        case 'grade': return `${s.grade}학년 ${sj ? sj.term : ''}`;
        case 'subject': return sj ? `${sj.icon} ${sj.name}` : '-';
        case 'unit': return u ? u.name : '-';
        case 'area': return s.area === 'all' ? '전체 섞어서' : ((u && u.areas.find(a => a.id === s.area)) || {}).name || '-';
        case 'diff': return DIFF[s.diff];
        case 'stages': return `${s.stages}마리 (마지막은 보스)`;
        case 'perStage': return `스테이지마다 ${s.perStage}문제`;
        case 'diag': return `${s.diag}문항`;
        case 'size': return `${s.size}명`;
      }
    }
    function settingsHtml(s, locked) {
      const dis = locked ? 'disabled' : '';
      const opt = (k, v, on, label, extra) => `<button type="button" class="opt" role="radio" aria-checked="${on}" data-act="set" data-k="${k}" data-v="${esc(v)}" ${dis} ${extra || ''}>${label}</button>`;
      const num = (k, lo, hi, unit, hint) => `<div class="numrow"><button type="button" class="btn btn-ghost sm" data-act="step" data-k="${k}" data-d="-1" aria-label="줄이기" ${dis}>−</button><input id="t-num-${k}" class="inp num" type="number" inputmode="numeric" min="${lo}" max="${hi}" value="${s[k]}" data-num="${k}" ${dis}><span>${unit}</span><button type="button" class="btn btn-ghost sm" data-act="step" data-k="${k}" data-d="1" aria-label="늘리기" ${dis}>＋</button></div><p class="hint">${hint} (${lo}~${hi})</p>`;
      const sj = subjOf(s), u = unitOf(s);
      let panel = '';
      switch (T.tab) {
        case 'grade': panel = `<h3>학년을 골라요</h3><div class="opts">${CAT.grades.map(g => opt('grade', g.grade, s.grade === g.grade, `<b>${g.grade}학년</b><small>${g.ready ? '1학기 문제 있음' : '준비 중'}</small>`, g.ready ? '' : 'disabled')).join('')}</div><p class="hint">프로토타입에는 6학년 1학기 문제만 들어 있어요.</p>`; break;
        case 'subject': panel = `<h3>과목을 골라요</h3><div class="opts">${subjectsOf(s.grade).map(x => opt('subject', x.id, s.subject === x.id, `<b>${x.icon} ${x.name}</b><small>${x.ready ? `${x.units.filter(u => u.ready).length}개 단원 준비됨` : '준비 중'}</small>`, x.ready ? '' : 'disabled')).join('')}</div>`; break;
        case 'unit': panel = `<h3>단원을 골라 몬스터 지도를 정해요</h3><div class="opts wide">${sj.units.map(x => opt('unit', x.id, s.unit === x.id, `<span class="opt-mon">${monsterImg({ scale: 1 }, x.hue)}</span><b>${esc(x.name)}</b><small>${x.ready ? `${esc(x.dragon)} · ${x.standards.map(st => esc(st.code)).join(' ')}` : '준비 중'}</small>`, x.ready ? '' : 'disabled')).join('')}</div><p class="hint">지금은 1~4단원에 문제·평가기준이 들어 있어요. 5·6단원은 준비 중이에요.</p>`; break;
        case 'area': panel = `<h3>평가 요소를 골라요 <span class="muted small">(${esc(u.name)})</span></h3><div class="opts wide">${opt('area', 'all', s.area === 'all', '<b>전체 섞어서</b>')}${u.areas.map(a => opt('area', a.id, s.area === a.id, `<b>${esc(a.name)}</b><small>${esc(a.std)}</small>`)).join('')}</div>`; break;
        case 'diff': panel = `<h3>난이도</h3><div class="opts">${['auto', 1, 2, 3].map(d => opt('diff', d, String(s.diff) === String(d), `<b>${DIFF[d]}</b><small>${d === 'auto' ? '레벨 테스트 결과에 맞춰 학생마다 달라져요' : ['', '기본 문제', '보통 문제', '도전 문제'][d]}</small>`)).join('')}</div>`; break;
        case 'stages': panel = `<h3>스테이지 수 (몬스터 수)</h3>${num('stages', 1, 5, '마리', '몬스터를 몇 마리 물리치면 끝날지 정해요. 마지막 몬스터는 최종 보스예요')}`; break;
        case 'perStage': panel = `<h3>1인 문제 수</h3>${num('perStage', 1, 5, '문제', '스테이지마다 학생 한 명이 푸는 문제 수예요. 모둠원 모두 다 풀어야 합동 공격')}`; break;
        case 'diag': panel = `<h3>레벨 테스트 문항 수</h3><div class="opts">${[3, 4, 5].map(n => opt('diag', n, s.diag === n, `<b>${n}문항</b>`)).join('')}</div><p class="hint">게임 전에 학생마다 풀어서 레벨(1~4)을 정해요. 레벨은 선생님 화면에만 보이고, 모둠을 고르게 섞는 데 써요.</p>`; break;
        case 'size': panel = `<h3>모둠 인원</h3>${num('size', 2, 6, '명', '정한 인원 ±1명으로 모둠을 나눠요(예: 5명이면 4~6명)')}`; break;
      }
      const idx = TABS.findIndex(t => t[0] === T.tab);
      const next = idx < TABS.length - 1 ? `<button type="button" class="btn btn-ghost sm" data-act="tab" data-k="${TABS[idx + 1][0]}">다음: ${TABS[idx + 1][1]} ▶</button>` : '';
      return `<div class="t-settings">
        <div class="set-tabs" role="tablist" aria-label="게임 설정">${TABS.map((t, i) => `<button type="button" class="set-tab" role="tab" aria-selected="${T.tab === t[0]}" data-act="tab" data-k="${t[0]}"><small>${locked ? '' : T.visited.has(t[0]) ? '✅ ' : '⬜ '}${i + 1}. ${t[1]}</small><b>${esc(valueOf(s, t[0]))}</b></button>`).join('')}</div>
        <div class="set-panel" role="tabpanel">${panel}<div class="row end">${next}</div></div>
        ${locked ? '<p class="hint">게임 중에는 설정을 바꿀 수 없어요. 대기실로 돌아가면 다시 바꿀 수 있어요.</p>' : ''}
      </div>`;
    }
    // 방 만들기 버튼: 9단계 탭을 모두 한 번씩 확인해야 켜짐
    const allVisited = () => TABS.every(t => T.visited.has(t[0]));
    function createBtn() {
      const left = TABS.map((t, i) => [t, i]).filter(([t]) => !T.visited.has(t[0]));
      return `<button type="button" class="btn btn-gold btn-big" data-act="create" ${left.length ? 'disabled' : ''}>🔑 방 번호 만들고 QR 생성하기</button>
        ${left.length ? `<p class="hint create-hint">아직 확인하지 않은 단계: ${left.map(([t, i]) => `${i + 1}. ${esc(t[1])}`).join(' · ')}</p>` : '<p class="hint create-hint ok">9단계를 모두 확인했어요. 방을 만들 수 있어요!</p>'}`;
    }
    function changeSetting(k, v) {
      if (T.tab) T.visited.add(T.tab);
      const cur = T.ts ? T.ts.settings : T.draft;
      const s = Object.assign({}, cur, { [k]: v });
      const firstReady = sj => (sj.units.find(u => u.ready) || sj.units[0]).id;
      if (k === 'grade') { const sj = subjectsOf(v).find(x => x.ready) || subjectsOf(v)[0]; if (sj) { s.subject = sj.id; s.unit = firstReady(sj); s.area = 'all'; } }
      if (k === 'subject') { const sj = CAT.subjects.find(x => x.id === v); s.unit = firstReady(sj); s.area = 'all'; }
      if (k === 'unit') s.area = 'all';
      T.draft = s;
      if (T.ts) { T.ts.settings = s; net.send({ t: 'tsettings', settings: s }); }
      render();
    }
    const RANGE = { stages: [1, 5], perStage: [1, 5], size: [2, 6] };

    // ───── QR ─────
    function qrSvg(text) {
      if (T.qrCache[text]) return T.qrCache[text];
      if (typeof window.qrcode !== 'function') return '';
      const q = window.qrcode(0, 'M'); q.addData(text); q.make();
      return (T.qrCache[text] = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: '학생 입장 QR 코드' }));
    }
    function joinInfo() {
      if (opt.joinLink) return opt.joinLink(T.code);
      return { url: `${T.base}/student.html?room=${T.code}`, fixed: `${T.base}/student.html`, note: '같은 와이파이(또는 인터넷 주소)에서 접속해요. 학생은 로그인이 필요 없어요.' };
    }
    function qrCard() {
      const j = joinInfo();
      return `<aside class="t-card t-qr"><h3>학생 입장</h3>
        ${j && j.url ? `<div class="qr-img">${qrSvg(j.url)}</div>` : `<div class="qr-off">${esc((j && j.off) || '다른 기기 연결을 준비하는 중이에요…')}</div>`}
        <p class="muted small">방 번호</p><div class="code">${esc(T.code)}</div>
        ${j && j.url ? `<div class="url" id="t-url">${esc(j.url)}</div><div class="row center-row"><button type="button" class="btn btn-ghost sm" data-act="copy">링크 복사</button><button type="button" class="btn btn-ghost sm" data-act="qr-big">QR 크게 보기</button></div>` : ''}
        ${j && j.fixed ? `<div class="fixed-url"><p class="small"><b>📌 늘 같은 학생 주소</b> — 학생은 이 주소에 들어가 방 번호만 입력하면 돼요.</p><div class="url" id="t-fixed">${esc(j.fixed)}</div><button type="button" class="btn btn-ghost sm" data-act="copy" data-which="fixed">학생 주소 복사</button></div>` : ''}
        ${j && j.note ? `<p class="muted small">${esc(j.note)}</p>` : ''}
      </aside>`;
    }

    // ───── 진행 버튼 ─────
    const researchBtn = (label, main) => `<button type="button" class="btn ${main ? 'btn-violet' : 'btn-ghost sm'}" data-act="research">📊 ${label}</button>`;
    function controls(ts) {
      const on = ts.players.filter(p => p.online).length;
      const freeze = ts.frozen
        ? `<button type="button" class="btn btn-ice" data-act="freeze" data-on="0">▶ 다시 움직이기</button>`
        : `<button type="button" class="btn btn-violet" data-act="freeze" data-on="1">❄️ Freeze (모두 멈춤)</button>`;
      const done = ts.players.filter(p => p.online && p.diag && p.diag.done).length;
      switch (ts.phase) {
        case 'lobby': return `<button type="button" class="btn btn-gold btn-big" data-act="diag" ${on ? '' : 'disabled'}>▶ 레벨 테스트 시작</button><span class="muted">접속 <b>${on}</b>명 · 모두 들어오면 눌러 주세요 (학생마다 ${ts.settings.diag}문항)</span>${researchBtn('지난 게임 협력 리포트')}`;
        case 'diagcount': return `<b>3, 2, 1… 곧 레벨 테스트가 시작돼요!</b>`;
        case 'diag': return `<b>레벨 테스트 ${done} / ${on}명 완료</b><button type="button" class="btn btn-ghost" data-act="group">모둠 바로 편성</button>${freeze}`;
        case 'grouped': return `<button type="button" class="btn btn-gold btn-big" data-act="start">▶ 게임 시작 (3·2·1)</button>${freeze}`;
        case 'countdown': return `<b>3, 2, 1… 곧 시작해요!</b>`;
        case 'playing': return `${freeze}<button type="button" class="btn btn-danger" data-act="ask-end">🏁 게임 끝내기</button>${researchBtn('지금까지 협력 리포트')}<span class="muted small">모든 모둠이 최종 보스를 물리치면 자동으로 끝나요</span>`;
        default: return `${researchBtn('협력 리포트 보기·내려받기', true)}<button type="button" class="btn btn-gold" data-act="reset">🔄 같은 학생들과 다시 하기</button><span class="muted">다시 하기 전에 협력 리포트를 내려받아 두세요</span>`;
      }
    }

    // 손을 들면 이름 왼쪽 ✋ + 이름 칸 반짝임, 이모지 반응은 이름 오른쪽에
    const nameDeco = (p, inner) => `<span class="nm-wrap ${p.hand ? 'hand-up' : ''}">${p.hand ? `<button type="button" class="hand-mark hand-lower" data-act="lower" data-pid="${esc(p.pid)}" title="${esc(p.name)} 손 내리기" aria-label="${esc(p.name)} 손 내리기">✋</button>` : ''}${inner}${p.react ? `<span class="t-react" aria-label="반응 ${p.react}">${p.react}</span>` : ''}</span>`;
    const nameBtn = (p, label) => nameDeco(p, `<button type="button" class="name-btn" data-act="detail" data-pid="${esc(p.pid)}" title="${esc(p.name)} 학생 자세히 보기">${esc(label || p.name)}</button>`);
    const lv = l => `<span class="lv lv${l}">${l ? 'Lv.' + l : '-'}</span>`;
    function rosterHtml(ts) {
      const n = ts.players.length;
      if (!n) return `<h3>🙋 대기 명단</h3><p class="empty">학생이 QR을 찍고 들어오면 여기에 바로 나타나요<span class="dots"></span></p>`;
      return `<h3>🙋 대기 명단 (${n}명)</h3><ul class="t-roster">${ts.players.map(p => `<li class="${p.online ? '' : 'off'}"><span aria-hidden="true">${hero(p.num)}</span>${nameDeco(p, `<span>${p.num}번 ${esc(p.name)}</span>`)}${p.online ? '' : ' · 끊김'}${ts.phase === 'lobby' ? `<button type="button" class="kick" data-act="kick" data-pid="${esc(p.pid)}" aria-label="${esc(p.name)} 내보내기">✕</button>` : ''}</li>`).join('')}</ul>`;
    }
    function diagHtml(ts) {
      return `<h3>📝 레벨 테스트 진행 상황</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>번호</th><th>이름</th><th>진행</th><th>레벨</th><th>접속</th></tr></thead><tbody>${ts.players.map(p => `<tr><td>${p.num}</td><td>${nameBtn(p)}</td><td>${p.diag ? (p.diag.done ? `✅ ${p.diag.ok}/${p.diag.total} 정답` : `✏️ ${p.diag.idx}/${p.diag.total}`) : '-'}</td><td>${p.diag && p.diag.done ? lv(p.level) : '-'}</td><td>${p.online ? '🟢' : '⚪'}</td></tr>`).join('')}</tbody></table></div><p class="muted small">레벨은 정답률로만 정해요(90% 이상 Lv.4 · 60% 이상 Lv.3 · 30% 이상 Lv.2). 학생 화면에는 보이지 않아요.</p>`;
    }
    function groupCards(ts, mode) {
      const pl = new Map(ts.players.map(p => [p.pid, p]));
      return `<div class="gcards">${ts.groups.map(g => {
        const pct = g.hpMax ? Math.max(0, g.hp / g.hpMax * 100) : 0;
        const flash = T.flash[g.id] && Date.now() - T.flash[g.id] < 1500 ? 'flash' : '';
        const badge = mode !== 'play' ? '' : g.done ? '<span class="badge ready">🏆 클리어</span>' : g.ready ? '<span class="badge ready">⚔️ 합동 공격 가능</span>' : `<span class="badge">${g.doneCount}/${g.onlineCount}명 완료</span>`;
        return `<article class="t-card gcard ${flash} ${g.ready ? 'is-ready' : ''}">
          <header><span class="g-mon">${monsterImg(g.monster, null, 'thumb')}</span><div class="grow"><h4>${esc(g.name)}</h4><p class="muted small">${mode === 'play' ? `스테이지 ${Math.min(g.stage, g.stages)}/${g.stages} · 처치 ${g.cleared} · 🎁 힌트 상자 ${g.box || 0}` : `${g.members.length}명`}</p></div>${badge}</header>
          ${mode === 'play' ? `<div class="hp small"><div class="hp-fill" style="width:${pct}%"></div><span>${g.hp} / ${g.hpMax}</span></div>` : ''}
          <ul class="mem">${g.members.map(m => { const p = pl.get(m.pid) || {}; const st = !m.online ? '⚪ 끊김' : mode !== 'play' ? '' : m.stageDone ? (m.twin === 'open' ? '⭐ 쌍둥이' : '✅ 완료') : m.stuck ? `🙋 ${m.done}/${m.per} 도움 필요` : `✏️ ${m.done}/${m.per}`;
            return `<li class="${m.online ? '' : 'off'} ${m.stuck ? 'stuck' : ''}"><span aria-hidden="true">${hero(m.num)}</span><span class="n">${nameBtn(m, `${m.num}번 ${m.name}`)}</span>${lv(p.level)}<span class="s ${m.stageDone ? 'ok' : ''}">${st}</span>${mode === 'play' ? `<span class="c" title="맞힘·틀림·만든 힌트">${p.ok || 0}·${p.wrong || 0}·🎁${p.hintsMade || 0}</span>` : ''}</li>`; }).join('')}</ul>
        </article>`;
      }).join('') || '<p class="empty">모둠이 아직 없어요.</p>'}</div>`;
    }
    function playHtml(ts) {
      const on = ts.players.filter(p => p.online);
      const stuck = on.filter(p => p.stuck).length;
      const stats = `<div class="t-stats">
        <div><b>${ts.groups.length}</b><span>모둠</span></div>
        <div><b>${on.length}</b><span>접속 학생</span></div>
        <div><b>${ts.groups.filter(g => g.done).length}/${ts.groups.length}</b><span>클리어한 모둠</span></div>
        <div><b>${stuck}</b><span>도움이 필요한 학생</span></div>
        <div><b>${ts.players.reduce((a, p) => a + p.hintsSent, 0)}</b><span>주고받은 힌트</span></div></div>`;
      return `<h3>⚔️ 모둠 현황</h3>${stats}${groupCards(ts, 'play')}<p class="muted small">숫자는 맞힌 수 · 틀린 수 · 보낸 힌트예요. 🙋 표시는 한 문제를 2번 틀렸거나 60초 넘게 머문 학생이에요. 이때부터 친구 힌트를 받을 수 있어요(학생 화면에는 보이지 않아요). 이름을 누르면 자세히 볼 수 있어요.</p>`;
    }
    function endHtml(ts) {
      const name = id => (ts.groups.find(g => g.id === id) || {}).name || '-';
      return `<h3>📊 결과 리포트</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>번호</th><th>이름</th><th>모둠</th><th>레벨</th>${(ts.unitAreas || []).map(a => `<th title="${esc(a.std)}">${esc(a.name)}</th>`).join('')}<th>맞힘</th><th>틀림</th><th>자주 보인 오류</th><th>보낸·받은 힌트</th><th>오답노트 해결</th></tr></thead><tbody>${ts.players.map(p => `<tr><td>${p.num}</td><td>${nameBtn(p)}</td><td>${esc(name(p.group))}</td><td>${lv(p.level)}</td>${(ts.unitAreas || []).map(a => `<td>${p.levels && p.levels[a.id] ? lvBadge(p.levels[a.id], true) : '-'}</td>`).join('')}<td>${p.ok}</td><td>${p.wrong}</td><td>${esc(p.topMistake || '-')}</td><td>${p.hintsSent}·${p.hintsGot}</td><td>${p.notesResolved}/${p.notes}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted small">평가 요소별 상·중·하는 성취기준 [6수01-10], [6수01-11]에 맞춰 만든 평가기준으로 판정했어요. 이름을 누르면 평가기준 전문, 오류 유형, 지도 제안, 문항별 기록을 볼 수 있어요.</p>
        <h3>⚔️ 모둠별 결과</h3>${groupCards(ts, 'play')}`;
    }

    // 누르는 도중 화면을 다시 그리면 버튼이 바뀌어 클릭이 씹히므로, 손을 뗄 때까지 다시 그리기를 미룹니다.
    const press = { down: false, pending: false, t: null };
    const flushPress = () => { press.down = false; clearTimeout(press.t); if (press.pending) { press.pending = false; render(); } };
    root.addEventListener('pointerdown', e => { if (e.target.closest('button, .choice, [data-act]')) { press.down = true; clearTimeout(press.t); press.t = setTimeout(flushPress, 1500); } }, true);
    ['pointerup', 'pointercancel'].forEach(ev => root.addEventListener(ev, () => { if (press.down) setTimeout(flushPress, 80); }, true));
    function render() {
      if (press.down) { press.pending = true; return; }
      const ts = T.ts;
      $('.t-phase').hidden = !ts; if (ts) $('.t-phase').textContent = PHASE[ts.phase] || ts.phase;
      $('[data-act="ask-new"]').hidden = !ts;
      const cf = $('.t-confirm');
      if (T.confirm) {
        const txt = T.confirm === 'end' ? '게임을 끝낼까요? 학생 화면에 결과가 나와요.' : '지금 수업을 닫고 새 수업을 만들까요? 학생들은 새 방 번호로 다시 들어와야 하고, 협력 리포트도 사라져요. 필요하면 먼저 내려받아 두세요.';
        cf.innerHTML = `<span>${txt}</span><button type="button" class="btn btn-danger sm" data-act="${T.confirm === 'end' ? 'end' : 'new'}">네</button><button type="button" class="btn btn-ghost sm" data-act="cancel">아니요</button>`;
        cf.hidden = false;
      } else cf.hidden = true;

      const focusId = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : null;
      if (!ts) {
        body.innerHTML = T.resuming
          ? `<section class="t-card center"><h2>이전 수업에 다시 연결하는 중<span class="dots"></span></h2></section>`
          : `<section class="t-card t-setup"><h2>수업 만들기</h2><p class="muted">탭을 눌러 하나씩 고르세요. 다 고르면 아래에서 방을 만들어 QR을 보여 줘요.</p>${settingsHtml(T.draft, false)}${createBtn()}</section>`;
      } else {
        const frozenBar = ts.frozen ? `<div class="t-frozen" role="status">❄️ 지금 모든 학생 화면이 멈춰 있어요 (채팅·답 제출도 멈춤)</div>` : '';
        const mainHtml = ts.phase === 'lobby' || ts.phase === 'diagcount' ? rosterHtml(ts)
          : ts.phase === 'diag' ? diagHtml(ts)
            : ts.phase === 'grouped' || ts.phase === 'countdown' ? `<div class="panel-head"><h3>🛡️ 모둠 구성 (레벨을 고르게 섞었어요)</h3>${ts.phase === 'grouped' ? '<button type="button" class="btn btn-ghost sm" data-act="shuffle">🔀 모둠 다시 섞기</button>' : ''}</div>${groupCards(ts, 'group')}`
              : ts.phase === 'playing' ? playHtml(ts) : endHtml(ts);
        body.innerHTML = `${frozenBar}<div class="t-grid">${qrCard()}<div class="t-col">
          <section class="t-card t-ctl">${controls(ts)}</section>
          <section class="t-card t-main">${mainHtml}</section>
          <details class="t-card t-set" ${ts.phase === 'lobby' ? 'open' : ''}><summary>⚙️ 게임 설정 · ${esc(valueOf(ts.settings, 'unit'))} · ${esc(valueOf(ts.settings, 'diff'))} · 스테이지 ${ts.settings.stages} · ${ts.settings.size}명 모둠</summary>${settingsHtml(ts.settings, ts.phase !== 'lobby')}</details>
        </div></div>`;
      }
      if (focusId) { const el = body.querySelector('#' + focusId); if (el) el.focus(); }
    }

    // ───── 협력 리포트 (연구용) ─────
    const n = v => (v == null ? '-' : v);
    const pctTxt = v => (v == null ? '-' : v + '%');
        function renderResearch() {
      const ov = $('.ov-research');
      if (!T.researchOpen) { ov.hidden = true; return; }
      const R = T.research;
      if (!R) { ov.innerHTML = '<div class="ov-box detail-box"><p class="muted">불러오는 중…</p></div>'; ov.hidden = false; return; }
      if (R.empty) { ov.innerHTML = `<div class="ov-box detail-box"><div class="row"><h2 class="grow">📊 협력 리포트</h2><button type="button" class="btn btn-ghost sm" data-act="research-close">닫기 ✕</button></div><p class="muted">아직 게임 기록이 없어요. 게임을 시작하면 기록이 쌓여요.</p></div>`; ov.hidden = false; return; }
      const S = R.summary, M = R.meta;
      const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}" class="muted">기록이 없어요</td></tr>`}</tbody></table></div>`;
      const stat = (v, label, tip) => `<div title="${esc(tip || '')}"><b>${v}</b><span>${label}</span></div>`;
      ov.innerHTML = `<div class="ov-box detail-box research-box" role="dialog" aria-label="협력 리포트">
        <div class="row"><h2 class="grow">📊 협력 리포트 ${R.previous ? '<span class="pill">지난 게임</span>' : M.ended ? '' : '<span class="pill">진행 중</span>'}</h2>
          <button type="button" class="btn btn-ghost sm" data-act="research-refresh">새로 고침</button><button type="button" class="btn btn-ghost sm" data-act="research-close">닫기 ✕</button></div>
        <p class="muted small">${esc(M.date.slice(0, 10))} · 방 ${esc(M.code)} · ${esc(M.unit)}${M.area !== '전체' ? ' · ' + esc(M.area) : ''} · 스테이지 ${M.stages} · 1인 ${M.perStage}문제 · 모둠 ${M.size}명 기준 · 게임 시간 ${M.minutes}분</p>
        <section class="dl-box"><h3>⬇️ 엑셀 파일로 내려받기</h3><p class="small muted">엑셀 파일 1개에 요약 · 레벨 집단 비교 · 설문 · 모둠별 · 학생별 · 힌트 주고받기가 시트별로 들어 있어요. 수업마다 내려받아 모아 두면 보고서 자료가 돼요.</p>
          <div class="row wrap"><button type="button" class="btn btn-gold" data-act="xlsx">⬇️ 학생 리포트 내려받기</button></div></section>
        <h3>한눈에 보기</h3>
        <div class="t-stats">${stat(pctTxt(S.allSolveRate), '전원 해결률', '모둠원 모두가 자기 문제를 해결해 합동 공격까지 간 스테이지의 비율')}${stat(pctTxt(S.solveRate), '평균 문제 해결률', '받은 문제 중 끝까지 해결한 비율의 평균')}${stat(`${S.hintsUsed}/${S.hintsMade}`, '쓰인 힌트/만든 힌트', '친구 힌트가 실제로 쓰인 수 / 만든 수')}${stat(pctTxt(S.hintSolvedRate), '친구 힌트 뒤 해결률', '친구 힌트를 쓴 문제를 결국 해결한 비율')}${stat(S.lowToHigh, '상위→하위 도움', '레벨 3~4 학생이 만든 힌트를 레벨 1~2 학생이 쓴 횟수')}${stat(n(S.avgGapSec) + '초', '평균 완료 격차', '모둠에서 첫 번째로 끝낸 학생과 마지막 학생 사이 시간의 평균')}${stat(S.hands, '손들기', '게임 중 손을 든 횟수 (선생님이 내려 준 횟수 ' + S.lowered + ')')}${stat(`${S.freezes}회 · ${S.frozenSec}초`, 'Freeze', '모두 멈춤 횟수와 멈춘 시간')}${stat(`${S.surveyDone}/${S.students}`, '설문 응답', '게임 끝 설문에 답한 학생 수')}</div>
        <h3>레벨 집단 비교 <span class="muted small">(레벨 테스트 기준)</span></h3>
        ${tbl(['집단', '학생 수', '문제 해결률', '한 번에 맞힌 비율', '만든 힌트(평균)', '받은 힌트(평균)', '손들기(평균)', '설문4 필요한 사람(0~2)', '설문5 협력(0~2)'], R.bands.map(b => [esc(b.label), b.n, pctTxt(b.solveRate), pctTxt(b.firstTryRate), n(b.hintsMade), n(b.hintsGot), n(b.hands), n(b.q4), n(b.q5)]))}
        <h3>모둠별</h3>
        ${tbl(['모둠', '인원', '레벨 구성', '처치/스테이지', '전원 해결률', '스테이지 평균 시간(초)', '평균 완료 격차(초)', '만든 힌트', '쓰인 힌트', '힌트 뒤 해결'], R.groups.map(g => [esc(g.name), g.size, esc(g.levels), `${g.cleared}/${g.stages}`, pctTxt(g.allSolveRate), n(g.avgStageSec), n(g.avgGapSec), g.hintsMade, g.hintsUsed, g.hintsSolved]))}
        <h3>게임 끝 설문</h3>
        ${tbl(['문항', '응답 수', '그렇다', '보통이다', '아니다', '평균(0~2)'], R.survey.map(q => [esc(q.text), q.n, q.yes, q.some, q.no, n(q.avg)]))}
        <h3>학생별</h3>
        ${tbl(['번호', '이름', '모둠', '레벨', '해결/받은 문제', '해결률', '한 번에', '만든 힌트', '친구가 쓴 내 힌트', '받은 힌트(해결)', '손들기', '설문 1~5'], R.students.map(x => [x.num, esc(x.name), esc(x.group), x.level, `${x.solved}/${x.dealt}`, pctTxt(x.solveRate), pctTxt(x.firstTryRate), x.hintsMade, x.hintsUsedByFriends, `${x.hintsGot}(${x.hintsGotSolved})`, x.hands, ['q1', 'q2', 'q3', 'q4', 'q5'].map(k => x.survey[k] == null ? '·' : x.survey[k]).join(' ')]))}
        <h3>힌트 주고받기 <span class="muted small">(누가 만든 힌트를 누가 썼는지)</span></h3>
        ${tbl(['시작 후(분)', '스테이지', '모둠', '만든 학생(레벨)', '쓴 학생(레벨)', '힌트 종류', '평가 요소', '결국 해결', '힌트 뒤 더 틀림'], R.gifts.slice(0, 80).map(e => [e.min, e.stage, esc(e.group), `${e.fromNum}번 ${esc(e.fromName || '')} (${e.fromLevel})`, `${e.toNum}번 ${esc(e.toName || '')} (${e.toLevel})`, esc(e.kind), esc(e.area), e.solved ? '⭕' : '❌', n(e.wrongAfter)]))}
        ${R.gifts.length > 80 ? `<p class="muted small">화면에는 80개까지만 보여요. 전체 ${R.gifts.length}개는 파일에 모두 들어 있어요.</p>` : ''}
        <p class="muted small">레벨 1~2를 하위 집단, 3~4를 상위 집단으로 나눴어요(레벨 테스트 ${esc(String(T.ts ? T.ts.settings.diag : ''))}문항 기준). 설문 점수는 그렇다 2 · 보통이다 1 · 아니다 0이에요.</p>
      </div>`;
      ov.hidden = false;
    }
    function sheetRows(k, R) {
      const M = R.meta, S = R.summary, sv = x => (x == null ? '' : x);
      if (k === 'summary') return [
        ['항목', '값', '설명'], ['날짜', M.date.slice(0, 10), ''], ['방 번호', M.code, ''], ['단원', M.unit, ''], ['평가 요소', M.area, ''], ['스테이지 수', M.stages, ''], ['1인 문제 수', M.perStage, ''], ['모둠 인원 설정', M.size, ''], ['게임 시간(분)', M.minutes, ''],
        ['학생 수', S.students, ''], ['모둠 수', S.groups, ''], ['전원 해결률(%)', sv(S.allSolveRate), '모둠원 모두가 해결해 합동 공격까지 간 스테이지 비율'], ['최종 보스 처치 모둠 수', S.finishedGroups, ''],
        ['평균 문제 해결률(%)', sv(S.solveRate), '받은 문제 중 끝까지 해결한 비율의 평균'], ['만든 힌트 수', S.hintsMade, ''], ['쓰인 힌트 수', S.hintsUsed, ''], ['힌트 사용률(%)', sv(S.hintUseRate), '쓰인 힌트 ÷ 만든 힌트'],
        ['친구 힌트 뒤 해결률(%)', sv(S.hintSolvedRate), '친구 힌트를 쓴 문제를 결국 해결한 비율'], ['상위→하위 도움 횟수', S.lowToHigh, '레벨 3~4가 만든 힌트를 레벨 1~2가 쓴 횟수'], ['평균 완료 격차(초)', sv(S.avgGapSec), '모둠 안 첫 완료자와 마지막 완료자 사이 시간'],
        ['손들기 횟수', S.hands, ''], ['선생님이 손 내려 준 횟수', S.lowered, ''], ['Freeze 횟수', S.freezes, ''], ['Freeze 시간(초)', S.frozenSec, ''], ['설문 응답 학생 수', S.surveyDone, ''],
      ];
      if (k === 'bands') return [
        ['집단', '학생 수', '문제 해결률(%)', '한 번에 맞힌 비율(%)', '만든 힌트(평균)', '받은 힌트(평균)', '손들기(평균)', '설문4 평균(0~2)', '설문5 평균(0~2)'],
        ...R.bands.map(b => [b.label, b.n, sv(b.solveRate), sv(b.firstTryRate), sv(b.hintsMade), sv(b.hintsGot), sv(b.hands), sv(b.q4), sv(b.q5)]),
      ];
      if (k === 'survey') return [
        ['설문 문항', '응답 수', '그렇다(2)', '보통이다(1)', '아니다(0)', '평균(0~2)'], ...R.survey.map(q => [q.id + '. ' + q.text, q.n, q.yes, q.some, q.no, sv(q.avg)]),
      ];
      if (k === 'students') return [
        ['번호', '이름', '모둠', '레벨', '집단', '받은 문제', '해결한 문제', '해결률(%)', '한 번에 맞힌 문제', '한 번에 맞힌 비율(%)', '틀린 횟수', '추가 문제 해결', '만든 힌트', '친구가 쓴 내 힌트', '받은 힌트', '받은 힌트 뒤 해결', '손들기', '손든 시간(초)', '선생님이 손 내려 줌', '반응 이모지', '오답노트', '오답노트 해결', ...R.areaNames.map(a => '수준: ' + a), '설문1', '설문2', '설문3', '설문4', '설문5'],
        ...R.students.map(x => [x.num, x.name, x.group, x.level, x.band, x.dealt, x.solved, sv(x.solveRate), x.firstTry, sv(x.firstTryRate), x.wrong, x.extraSolved, x.hintsMade, x.hintsUsedByFriends, x.hintsGot, x.hintsGotSolved, x.hands, x.handSec, x.lowered, x.reacts, x.notes, x.notesResolved, ...R.areaNames.map(a => x.levels[a] || ''), sv(x.survey.q1), sv(x.survey.q2), sv(x.survey.q3), sv(x.survey.q4), sv(x.survey.q5)]),
      ];
      if (k === 'groups') return [
        ['모둠', '인원', '레벨 구성', '스테이지 수', '처치한 스테이지', '최종 보스 처치', '전원 해결률(%)', '스테이지 평균 시간(초)', '평균 완료 격차(초)', '만든 힌트', '쓰인 힌트', '힌트 뒤 해결', '스테이지별 (번호:시간초/격차초)'],
        ...R.groups.map(g => [g.name, g.size, g.levels, g.stages, g.cleared, g.done ? '예' : '아니요', sv(g.allSolveRate), sv(g.avgStageSec), sv(g.avgGapSec), g.hintsMade, g.hintsUsed, g.hintsSolved, g.stageRows.map(r => `${r.stage}:${r.sec}/${r.gapSec}`).join(' ')]),
      ];
      return [
        ['시작 후(분)', '스테이지', '모둠', '만든 학생 번호', '만든 학생 이름', '만든 학생 레벨', '쓴 학생 번호', '쓴 학생 이름', '쓴 학생 레벨', '힌트 종류', '평가 요소', '결국 해결', '힌트 뒤 더 틀린 횟수', '해결까지(초)'],
        ...R.gifts.map(e => [e.min, e.stage, e.group, e.fromNum, e.fromName, e.fromLevel, e.toNum, e.toName, e.toLevel, e.kind, e.area, e.solved ? '예' : '아니요', sv(e.wrongAfter), sv(e.solvedSec)]),
      ];
    }
    const SHEETS = [['summary', '요약'], ['bands', '레벨 집단 비교'], ['survey', '설문'], ['groups', '모둠별'], ['students', '학생별'], ['gifts', '힌트 주고받기']];
    // 엑셀(.xlsx) 파일을 직접 만듭니다: 시트 여러 개, 숫자는 숫자로, 첫 줄은 굵게
    const xmlEsc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    const colName = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
    function sheetXml(rows) {
      const w = [];
      rows.forEach(r => r.forEach((v, c) => { const len = v == null ? 0 : [...String(v)].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 2 : 1), 0); w[c] = Math.min(60, Math.max(w[c] || 8, len + 2)); }));
      const cols = w.length ? `<cols>${w.map((x, i) => `<col min="${i + 1}" max="${i + 1}" width="${x}" customWidth="1"/>`).join('')}</cols>` : '';
      const data = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, c) => {
        if (v == null || v === '') return '';
        const ref = colName(c) + (ri + 1), st = ri === 0 ? ' s="1"' : '';
        return typeof v === 'number' && isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
      }).join('')}</row>`).join('');
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${data}</sheetData></worksheet>`;
    }
    function xlsxFiles(R) {
      const sh = SHEETS.map(([k, name]) => ({ name, xml: sheetXml(sheetRows(k, R)) }));
      const NS = 'http://schemas.openxmlformats.org', X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      return [
        ['[Content_Types].xml', `${X}<Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sh.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
        ['_rels/.rels', `${X}<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
        ['xl/workbook.xml', `${X}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets>${sh.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
        ['xl/_rels/workbook.xml.rels', `${X}<Relationships xmlns="${NS}/package/2006/relationships">${sh.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sh.length + 1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
        ['xl/styles.xml', `${X}<styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
        ...sh.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, s.xml]),
      ];
    }
    // 압축 없이(store) 묶는 zip — .xlsx는 zip 파일이에요
    const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    function zipStore(files) {
      const enc = new TextEncoder(), parts = [], central = []; let off = 0;
      const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
      for (const [name, text] of files) {
        const nb = enc.encode(name), db = enc.encode(text), crc = crc32(db);
        const head = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), ...u16(0)];
        const local = new Uint8Array([...u32(0x04034b50), ...head]);
        parts.push(local, nb, db);
        central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...head, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nb);
        off += local.length + nb.length + db.length;
      }
      const csize = central.reduce((a, b) => a + b.length, 0);
      const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(csize), ...u32(off), ...u16(0)]);
      return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    function downloadXlsx() {
      const R = T.research; if (!R || R.empty) return;
      const file = `협력리포트_${R.meta.date.slice(0, 10)}_방${R.meta.code}.xlsx`;
      try {
        const a = document.createElement('a'); a.href = URL.createObjectURL(zipStore(xlsxFiles(R))); a.download = file;
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        toast($('.toasts'), `⬇️ ${file} 을(를) 내려받았어요.`);
      } catch (e) { toast($('.toasts'), '이 화면에서는 내려받기가 막혀 있어요. 실제 서버 주소에서 내려받아 주세요.'); }
    }
    window.__mqXlsx = { sheetRows, xlsxFiles, zipStore }; // 자동 검사용

    function renderDetail() {
      const d = T.detail, ov = $('.ov-detail');
      if (!T.detailPid) { ov.hidden = true; ov.innerHTML = ''; return; }
      if (!d) { ov.innerHTML = '<div class="ov-box detail-box"><p class="muted">불러오는 중…</p></div>'; ov.hidden = false; return; }
      const res = r => r.wrong === 0 ? '<span class="ok">한 번에 해결</span>' : `<span class="warn">${r.wrong}번 다시 도전 후 해결</span>`;
      const cur = d.current;
      ov.innerHTML = `<div class="ov-box detail-box" role="dialog" aria-label="${esc(d.name)} 학생 자세히 보기">
        <div class="row"><h2 class="grow">${hero(d.num)} ${d.num}번 ${esc(d.name)} <span class="lv lv${d.level}">${d.level ? 'Lv.' + d.level : '-'}</span></h2><button type="button" class="btn sm btn-ghost" data-act="detail-close">닫기 ✕</button></div>
        <p class="muted small">${esc(d.team || '모둠 없음')} · ${esc(d.unitName)} · 맞힘 ${d.result.ok} · 틀림 ${d.result.wrong} · 추가 문제 ${d.result.extra} · 보낸 힌트 ${d.result.hintsSent} · 받은 힌트 ${d.result.hintsGot} ${d.online ? '' : '· ⚪ 연결 끊김'}</p>
        ${cur ? `<section class="cur-box ${cur.stuck ? 'stuck' : ''}"><h3>✏️ 지금 푸는 문제 ${cur.stuck ? '· 🙋 도움 필요' : ''}</h3><p>${math(cur.text)}</p><p class="small">정답 <b>${math(cur.answer)}</b>${cur.tried.length ? ` · 고른 오답: ${cur.tried.map(math).join(', ')}` : ''} · 받은 힌트 ${cur.gifts}개</p></section>` : ''}
        <h3>📊 성취기준별 리포트 (교사용)</h3>${d.diag && d.diag.length ? `<p class="small muted">레벨 테스트: ${d.diag.map(x => `${x.ok == null ? '⚪' : x.ok ? '⭕' : '❌'} ${esc(x.areaName)}`).join(' · ')}</p>` : ''}
        ${d.result.areas.length ? resultCharts(d.result, { teacher: true }) : '<p class="muted small">아직 해결한 문제가 없어요.</p>'}
        <h3>✅ 맞은 문제 (${d.records.length})</h3>
        ${d.records.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>스테이지</th><th>평가 요소</th><th>난이도</th><th>문제</th><th>정답</th><th>결과</th><th>고른 오답 (오류 유형)</th><th>받은 힌트</th></tr></thead><tbody>${d.records.map(r => `<tr><td>${r.stage || '-'}</td><td>${esc(r.areaName)}${r.kind === 'twin' ? ' · 추가' : ''}</td><td>${['', '하', '중', '상'][r.diff] || '-'}</td><td class="wrap">${math(r.text)}</td><td>${math(r.answer)}</td><td>${res(r)}</td><td class="wrap">${r.picks.length ? r.picks.map((x, i) => `${math(x)}${r.mis[i] ? ` <span class="muted small">(${esc(r.mis[i])})</span>` : ''}`).join(', ') : '-'}</td><td>${r.gifts || 0}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">아직 없어요.</p>'}
        <h3>❌ 틀린 문제 (오답노트 ${d.notes.length})</h3>
        ${d.notes.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>영역</th><th>문제</th><th>정답</th><th>학생이 고른 답</th><th>오답노트</th></tr></thead><tbody>${d.notes.map(n => `<tr><td>${esc(n.areaName)}</td><td class="wrap">${math(n.text)}</td><td>${math(n.answer)}</td><td>${n.mine.map(math).join(', ')}</td><td>${n.resolved ? '<span class="ok">다시 풀어 해결</span>' : '<span class="muted">아직</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">틀린 문제가 없어요.</p>'}
      </div>`;
      ov.hidden = false;
    }

    function showBigQr() {
      const j = joinInfo(); if (!j || !j.url) return;
      const ov = $('.ov-qr');
      ov.innerHTML = `<div class="ov-box qr-big" role="dialog" aria-label="입장 QR 크게 보기"><div class="qr-img">${qrSvg(j.url)}</div><div class="code big">${esc(T.code)}</div><p>휴대폰 카메라로 QR을 찍어서 들어와요</p><button type="button" class="btn btn-gold" data-act="qr-close">닫기</button></div>`;
      ov.hidden = false;
    }

    root.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled || !root.contains(el)) return;
      const a = el.dataset.act, k = el.dataset.k;
      switch (a) {
        case 'tab': T.tab = k; T.visited.add(k); render(); break;
        case 'set': changeSetting(k, k === 'grade' || k === 'diag' ? Number(el.dataset.v) : k === 'diff' ? (el.dataset.v === 'auto' ? 'auto' : Number(el.dataset.v)) : el.dataset.v); break;
        case 'step': { const cur = (T.ts ? T.ts.settings : T.draft)[k]; const [lo, hi] = RANGE[k]; changeSetting(k, Math.min(hi, Math.max(lo, cur + Number(el.dataset.d)))); break; }
        case 'create': if (!allVisited()) { toast($('.toasts'), '9단계를 모두 확인해야 방을 만들 수 있어요.'); break; } net.send({ t: 'tcreate', settings: T.draft }) || toast($('.toasts'), '연결하는 중이에요. 잠시 뒤 다시 눌러 주세요.'); break;
        case 'diag': net.send({ t: 'tdiag' }); break;
        case 'group': net.send({ t: 'tgroup' }); break;
        case 'shuffle': net.send({ t: 'tshuffle' }); break;
        case 'start': net.send({ t: 'tstart' }); break;
        case 'freeze': net.send({ t: 'tfreeze', on: el.dataset.on === '1' }); break;
        case 'ask-end': T.confirm = 'end'; render(); break;
        case 'ask-new': T.confirm = 'new'; render(); break;
        case 'cancel': T.confirm = null; render(); break;
        case 'end': T.confirm = null; net.send({ t: 'tend' }); render(); break;
        case 'new': T.confirm = null; store.del('localStorage', 'mq_t'); T.code = null; T.key = null; T.ts = null; render(); break;
        case 'reset': net.send({ t: 'treset' }); break;
        case 'kick': net.send({ t: 'tkick', pid: el.dataset.pid }); break;
        case 'qr-big': showBigQr(); break;
        case 'detail': T.detailPid = el.dataset.pid; T.detail = null; renderDetail(); net.send({ t: 'tdetail', pid: T.detailPid }); break;
        case 'detail-close': T.detailPid = null; T.detail = null; renderDetail(); net.send({ t: 'tdetail', pid: null }); break;
        case 'qr-close': $('.ov-qr').hidden = true; break;
        case 'lower': net.send({ t: 'tlower', pid: el.dataset.pid }); break;
        case 'research': T.research = null; T.researchOpen = true; renderResearch(); net.send({ t: 'tresearch' }); break;
        case 'research-close': T.researchOpen = false; $('.ov-research').hidden = true; break;
        case 'research-refresh': net.send({ t: 'tresearch' }); break;
        case 'xlsx': downloadXlsx(); break;
        case 'copy': {
          const fixed = el.dataset.which === 'fixed', t = (joinInfo() || {})[fixed ? 'fixed' : 'url']; if (!t) return;
          const fallback = () => { const r = document.createRange(); r.selectNodeContents($(fixed ? '#t-fixed' : '#t-url')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast($('.toasts'), '링크를 선택했어요. Ctrl+C로 복사해 주세요.'); };
          if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast($('.toasts'), '링크를 복사했어요.'), fallback); else fallback();
          break;
        }
      }
    });
    root.addEventListener('change', e => {
      const k = e.target.dataset && e.target.dataset.num; if (!k) return;
      const [lo, hi] = RANGE[k];
      const v = Math.round(Number(e.target.value));
      if (!Number.isFinite(v)) return render();
      changeSetting(k, Math.min(hi, Math.max(lo, v)));
    });

    render();
    return { code: () => T.code, refresh: render };
  }

  window.MQTeacher = { mount };
})();
