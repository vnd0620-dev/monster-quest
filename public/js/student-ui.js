// 학생 화면 v0.3
// 루미 안내(입장) → 대기실 → 3·2·1 → 레벨 테스트 → 모둠 구성 확인 → 3·2·1 → 전투 → 결과
// 친구들의 진행 상황(몇 문제 풀었는지, 막혔는지)은 보여 주지 않습니다.
// MQStudent.mount(요소, { connect, demo, presetRoom })
(function () {
  'use strict';
  const { esc, math, monsterImg, toast, store, IMG, avatar, setCatalog, resultCharts, itemIcon } = window.MQUI;
  const STEP = ['💡 힌트 1', '🧚 AI 힌트', '📖 AI 해설'];
  const SLOT_NAME = { base: '캐릭터', hat: '모자', glasses: '안경', weapon: '무기', pet: '친구', bg: '배경' };
  const GIFT_ICON = { elim: '✂️', concept: '📗', step: '🪜' };
  const GIFT_DESC = { elim: '틀린 보기 하나를 지워 줘요', concept: '개념을 다시 알려 줘요', step: '풀이 과정 첫 줄을 보여 줘요' };
  const DIFF_NAME = { 1: '하', 2: '중', 3: '상' };

  function mount(root, opt) {
    opt = opt || {};
    const demo = !!opt.demo;
    root.classList.add('mq-root', 's-root');
    root.innerHTML = `
      <div class="toasts" aria-live="polite"></div>
      <div class="s-main"></div>
      <div class="ov ov-count" hidden></div>
      <div class="ov ov-clear" hidden></div>
      <div class="ov ov-notes" hidden></div>
      <div class="ov ov-shop" hidden></div>
      <div class="ready-banner" role="status" aria-live="assertive" hidden><span>⚔️ 합동 공격이 가능해요!</span><button type="button" class="btn btn-attack sm" data-act="go-attack">공격하러 가기</button></div>
      <div class="ov ov-freeze" hidden><div class="ov-box freeze-box"><div class="freeze-ico" aria-hidden="true">❄️</div><h2>잠깐 멈춤!</h2><p>태블릿을 내려놓고<br>선생님을 바라봐 주세요</p></div></div>
      <div class="conn-bar" hidden>연결이 끊겼어요. 다시 연결하는 중…</div>`;
    const $ = s => root.querySelector(s);
    const main = $('.s-main');
    const presetRoom = () => String((typeof opt.presetRoom === 'function' ? opt.presetRoom() : opt.presetRoom) || '');

    const S = {
      st: null, pid: null, code: null, pending: null, err: '', sel: null, selQ: null, fx: [], prevHp: null, cdT: [], lastPhase: null,
      justWrong: false, form: { room: '', num: '', name: '' }, twinText: '', twinFor: null, attackLock: null,
      notes: null, notesOpen: false, noteText: {}, boxes: {}, noteLast: null, gotNotesForEnd: false, readReport: false, shopOpen: false, shopTab: 'hat', catalog: [],
    };
    const saved = demo ? null : store.get('sessionStorage', 'mq_s');
    if (saved && saved.pid && (!presetRoom() || presetRoom() === saved.code)) { S.pid = saved.pid; S.code = saved.code; }
    const lastForm = demo ? null : store.get('localStorage', 'mq_form');
    if (lastForm) { S.form.num = lastForm.num || ''; S.form.name = lastForm.name || ''; }

    const net = opt.connect({
      onOpen() { if (S.pid) net.send({ t: 'rejoin', code: S.code, pid: S.pid }); else if (S.pending) net.send(S.pending); },
      onStatus(on) { $('.conn-bar').hidden = on; },
      onMessage,
    });

    function onMessage(m) {
      switch (m.t) {
        case 'joined':
          S.pid = m.pid; S.code = m.code; S.pending = null; S.err = '';
          if (m.catalog) { S.catalog = m.catalog; setCatalog(m.catalog); }
          if (!demo) { store.set('sessionStorage', 'mq_s', { code: m.code, pid: m.pid }); store.set('localStorage', 'mq_form', { num: m.num, name: m.name }); }
          break;
        case 'jerror':
          S.pending = null; S.err = m.msg; S.st = null;
          if (m.reset) { S.pid = null; store.del('sessionStorage', 'mq_s'); }
          render(); break;
        case 'state':
          if (!S.pid && !S.pending) break; // 처음 화면으로 나간 뒤 늦게 온 상태는 무시
          if (!S.pid && m.me) S.pid = m.me.pid;
          S.st = m; render();
          if (S.shopOpen) { if (m.canShop) renderShop(); else closeShop(); }
          break;
        case 'result': if (!m.correct) S.justWrong = true; break;
        case 'fx': S.fx.push(m); break;
        case 'toast': toast($('.toasts'), m.msg); break;
        case 'notes':
          S.notes = m.list; S.noteLast = m.last || null;
          if (S.notesOpen) renderNotes();
          if (S.st && S.st.phase === 'ended') render();
          break;
        case 'kicked':
          S.pid = null; S.st = null; store.del('sessionStorage', 'mq_s');
          S.err = '선생님이 대기 명단에서 내보냈어요. 출석 번호와 이름을 확인하고 다시 들어와 주세요.'; render(); break;
        case 'replaced':
          S.pid = null; S.st = null; store.del('sessionStorage', 'mq_s');
          S.err = '같은 번호로 다른 화면에서 들어왔어요. 이 화면은 이제 쓰지 않아요.'; render(); break;
      }
    }

    // ───── 그리기 ─────
    // 누르는 도중 화면을 다시 그리면 버튼이 바뀌어 클릭이 씹히므로, 손을 뗄 때까지 다시 그리기를 미룹니다.
    const press = { down: false, pending: false, t: null };
    const flushPress = () => { press.down = false; clearTimeout(press.t); if (press.pending) { press.pending = false; render(); } };
    root.addEventListener('pointerdown', e => { if (e.target.closest('button, .choice, [data-act]')) { press.down = true; clearTimeout(press.t); press.t = setTimeout(flushPress, 1500); } }, true);
    ['pointerup', 'pointercancel'].forEach(ev => root.addEventListener(ev, () => { if (press.down) setTimeout(flushPress, 80); }, true));
    function render() {
      if (press.down) { press.pending = true; return; }
      const st = S.st;
      $('.ov-freeze').hidden = !(st && st.frozen);
      // 우리 모둠이 최종 보스를 물리치면, 다른 모둠이 아직 싸우는 중이어도 내 리포트로 넘어가요
      const phase = st ? (st.phase === 'playing' && st.group && st.group.done && st.result ? 'ended' : st.phase) : null;
      const counting = phase === 'countdown' || phase === 'diagcount';
      if (counting && S.lastPhase !== phase) { closeShop(); S.notesOpen = false; $('.ov-notes').hidden = true; } // 게임·레벨 테스트가 시작되면 상점·오답노트를 닫아요
      if (counting && S.lastPhase !== phase) startCountdown(phase === 'diagcount' ? '레벨 테스트를 시작해요!' : '모두 함께 준비!');
      if (!counting) stopCountdown();
      if (phase === 'ended' && S.lastPhase !== 'ended') { S.gotNotesForEnd = false; S.readReport = false; S.endAt = Date.now(); }
      if (phase === 'ended' && !S.gotNotesForEnd) { S.gotNotesForEnd = true; net.send({ t: 'notes' }); }
      S.lastPhase = phase;
      root.dataset.phase = phase || 'join';

      const focusId = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : null;
      let html;
      if (!st) html = formView();
      else if (phase === 'lobby' || phase === 'diagcount') html = lobbyView(st);
      else if (phase === 'diag') html = diagView(st);
      else if (phase === 'grouped' || phase === 'countdown') html = groupedView(st);
      else if (phase === 'playing') html = gameView(st);
      else if (reportWaiting(st)) html = reportWaitView(st);
      else if (st.survey && !st.survey.done && !S.surveySent) html = surveyView(st);
      else html = endedView(st);
      main.innerHTML = html;
      if (focusId) { const el = main.querySelector('#' + focusId); if (el) { el.focus(); if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length); } }
      afterRender(st);
      paintReadyBanner(st);
      if (phase === 'ended') watchReportEnd();
    }

    function topBar(st, withNotes) {
      return `<div class="s-top"><span class="me">${avatar(st.me.equip, 40, st.me.num)}${esc(st.me.num)}번 ${esc(st.me.name)}</span><span class="grow"></span>
        <span class="s-chip">방 ${esc(st.code)}</span><span class="s-chip gold" title="포인트">⭐ ${esc(st.me.points)}</span>
        <button type="button" class="btn sm btn-ghost" data-act="shop" ${st.canShop ? '' : 'disabled title="기다리는 시간이나 내 문제를 다 푼 뒤에 열려요"'}>🛒 상점</button>
        ${withNotes ? `<button type="button" class="btn sm btn-ghost notes-btn" data-act="notes">📒 오답노트${st.notes ? ` <b>${st.notes}</b>` : ''}</button>` : ''}</div>`;
    }

    function lumi() {
      return `<aside class="lumi"><div class="lumi-name">AI 요정 루미</div>
        <img class="lumi-img" src="${IMG.fairy}" alt="AI 요정 루미">
        <div class="bubble">누가 가장 빨리 풀었는지가 아니라, <b>우리 모두가 결국 해결했는지</b>가 중요해요. 모든 친구가 문제를 풀어야 합동 공격을 할 수 있어요!</div>
        <ul class="lumi-steps"><li>오답일 경우, 자동으로 <b>오답 노트</b>에 저장되어 다시 공부할 수 있어요.</li><li>틀리더라도 <b>단계별 힌트와 해설</b>이 제공돼요.</li></ul>
        <p class="lumi-cheer">💜 실수해도 괜찮아! 함께라면 이길 수 있어!</p></aside>`;
    }

    function formView() {
      const pre = presetRoom();
      const typed = !demo || opt.roomInput; // 실제 학생 화면: 방 번호를 직접 입력 (QR로 오면 미리 채워 둠)
      if (typed && pre && !S.form.room && !S.roomPrefilled) { S.form.room = pre; S.roomPrefilled = true; }
      const roomField = typed
        ? `<label class="field"><span>방 번호 (선생님 화면의 숫자 4개)</span><input id="sj-room" class="inp room-inp" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" placeholder="예) 2974" value="${esc(S.form.room)}"></label>`
        : pre
        ? `<div class="room-fixed">방 번호 <b>${esc(pre)}</b></div>`
        : demo
          ? `<div class="room-fixed muted">선생님 화면에서 먼저 <b>방을 만들어</b> 주세요</div>`
          : `<label class="field"><span>방 번호 (선생님 화면의 숫자 4개)</span><input id="sj-room" class="inp" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="예) 2974" value="${esc(S.form.room)}"></label>`;
      const busy = !!S.pending;
      return `<div class="join-wrap">${lumi()}
        <form class="s-card s-form" data-form="join" autocomplete="off" novalidate>
          <div class="s-logo"><small>다 함께 몬스터를 물리쳐요</small>협력 몬스터 퀴즈</div>
          ${S.err ? `<p class="err" role="alert">${esc(S.err)}</p>` : ''}
          ${roomField}
          <div class="row2">
            <label class="field"><span>출석 번호</span><input id="sj-num" class="inp" type="number" inputmode="numeric" min="1" max="60" placeholder="예) 7" value="${esc(S.form.num)}"></label>
            <label class="field"><span>이름</span><input id="sj-name" class="inp" type="text" maxlength="10" placeholder="내 이름" value="${esc(S.form.name)}"></label>
          </div>
          <button class="btn btn-gold btn-big" type="submit" ${busy || (demo && !typed && !pre) ? 'disabled' : ''}>${busy ? '들어가는 중…' : '모험 시작하기 ▶'}</button>
          <p class="muted small center">로그인은 필요 없어요. 출석 번호와 이름만 쓰면 돼요.</p>
        </form></div>`;
    }

    const reactBadge = m => (m.react ? `<span class="react-bubble" aria-label="반응 ${m.react}">${m.react}</span>` : '');
    const handMark = m => (m.hand ? '<span class="hand-mark" aria-label="손 들었어요">✋</span>' : '');
    const rosterHtml = list => `<ul class="roster">${list.map(x => `<li class="${x.me ? 'me' : ''} ${x.hand ? 'hand-up' : ''}"><span class="av-wrap">${avatar(x.equip, 30, x.num)}${reactBadge(x)}</span>${handMark(x)}${esc(x.name)}${x.me ? ' (나)' : ''}</li>`).join('')}</ul>`;

    function lobbyView(st) {
      const list = st.roster || [];
      return topBar(st) + `<section class="s-card s-lobby">
        <h2>⏳ 대기실</h2>
        <p>선생님이 시작하면 레벨 테스트부터 해요<span class="dots" aria-hidden="true"></span></p>
        <p class="map-chip">${esc(st.subjectName)} · ${esc(st.unitName)}</p>
        <div class="mon-preview">${monsterImg({ scale: .7 }, st.hue)}<p class="muted small">이번 지도의 몬스터: <b>${esc(st.dragon)}</b></p></div>
        ${rosterHtml(list)}
        <p class="muted small">지금 ${list.length}명이 들어왔어요</p>
      </section>`;
    }

    function choiceButtons(q, act) {
      const gone = i => (q.tried || []).indexOf(i) >= 0 || (q.eliminated || []).indexOf(i) >= 0;
      return `<div class="choices">${q.choices.map((c, i) => `<button type="button" class="choice ${S.sel === i ? 'sel' : ''} ${gone(i) ? 'tried' : ''}" data-act="${act}" data-i="${i}" ${gone(i) ? 'disabled' : ''}>${gone(i) ? '<span class="x" aria-hidden="true">✗</span>' : ''}${math(c)}</button>`).join('')}</div>`;
    }

    function diagView(st) {
      if (st.diagDone || !st.diag) {
        return topBar(st) + `<section class="s-card s-lobby"><h2>✅ 레벨 테스트 끝!</h2><p>잠시 기다려요<span class="dots"></span> 곧 모둠이 만들어져요.</p>
          <p class="muted small">기다리는 동안 🛒 상점에서 내 캐릭터를 꾸밀 수 있어요. 레벨은 친구들에게 공개되지 않아요.</p>${rosterHtml(st.roster || [])}</section>`;
      }
      const d = st.diag;
      if (S.selQ !== d.q.id) { S.sel = null; S.selQ = d.q.id; }
      return topBar(st) + `<section class="s-card q-card">
        <div class="progress">${Array.from({ length: d.total }, (_, i) => `<i class="${i < d.idx ? 'on' : i === d.idx ? 'now' : ''}"></i>`).join('')}</div>
        <p class="q-label">레벨 테스트 ${d.idx + 1} / ${d.total}</p>
        <h2 class="q-text">${math(d.q.text)}</h2>
        ${choiceButtons(d.q, 'pick')}
        <p class="soft muted">천천히 생각해서 골라요. 레벨은 친구들에게 보이지 않아요.</p>
        <button type="button" class="btn btn-gold btn-big" data-act="submit-diag" ${S.sel == null ? 'disabled' : ''}>제출하기</button>
      </section>`;
    }

    // 줌처럼: 이모지를 누르면 내 프로필 오른쪽 위에 잠깐 떠요 (하나만). 손들기는 따로.
    function chatBox(st) {
      const g = st.group; if (!g) return '';
      const lock = st.frozen;
      const me = g.members.find(m => m.me) || {};
      return `<section class="chat react-bar" aria-label="반응 보내기"><h3>💬 반응 보내기</h3>
        <div class="chat-btns">${(st.chatList || []).map(e => `<button type="button" class="emo-btn ${me.react === e ? 'on' : ''}" data-act="chat" data-e="${e}" ${lock ? 'disabled' : ''} aria-pressed="${me.react === e}" aria-label="반응 ${e}">${e}</button>`).join('')}</div>
        <button type="button" class="btn ${me.hand ? 'btn-gold' : 'btn-ghost'} hand-btn" data-act="hand" data-up="${me.hand ? 0 : 1}" ${lock ? 'disabled' : ''}>${me.hand ? '🙌 손 내리기' : '✋ 손들기'}</button>
        <p class="muted small">${lock ? '❄️ 멈춤 중에는 반응과 손들기를 할 수 없어요.' : '이모지는 내 프로필에 10초 동안 보여요. 도움이 필요하면 손을 들어요.'}</p></section>`;
    }

    function groupedView(st) {
      const g = st.group;
      if (!g) return topBar(st) + `<section class="s-card center"><h2>모둠을 만드는 중이에요<span class="dots"></span></h2></section>`;
      return topBar(st) + `<section class="s-card reveal">
        <h2>🎉 모둠이 만들어졌어요!</h2>
        <div class="team-name">🛡️ ${esc(g.name)}</div>
        <ul class="reveal-team">${g.members.map(m => `<li class="${m.me ? 'me' : ''} ${m.hand ? 'hand-up' : ''}"><span class="av-wrap">${avatar(m.equip, 64, m.num)}${reactBadge(m)}</span><b>${handMark(m)}${esc(m.name)}${m.me ? ' (나)' : ''}</b><small>용사</small></li>`).join('')}</ul>
        <p>우리 모둠 앞에 몬스터가 나타났어요!</p>
        <div class="reveal-mon">${monsterImg(g.monster, null, 'appear')}<p class="mon-name">${esc(g.monster.name)}</p></div>
        <p class="muted">선생님이 <b>게임 시작</b>을 누르면 3·2·1 후에 전투가 시작돼요. 스테이지 ${g.stages}개, 마지막은 최종 보스! 기다리는 동안 🛒 상점도 열려 있어요.</p>
      </section>` + chatBox(st);
    }

    function arena(st) {
      const g = st.group;
      const pct = g.hpMax ? Math.max(0, g.hp / g.hpMax * 100) : 0;
      const prev = S.prevHp && S.prevHp.gid === g.id && S.prevHp.stage === g.stage ? S.prevHp.pct : pct;
      const stageDots = Array.from({ length: g.stages }, (_, i) => `<i class="${i + 1 < g.stage || g.done ? 'on' : i + 1 === g.stage ? 'now' : ''}">${i + 1 < g.stage || g.done ? '✓' : i + 1 === g.stages ? '👑' : i + 1}</i>`).join('');
      return `<section class="arena ${g.monster.boss ? 'is-boss' : ''}" aria-label="몬스터 전투" id="s-arena">
        <div class="arena-head"><span class="tag">🛡️ ${esc(g.name)}</span><span class="tag box-tag" title="모둠 힌트 상자">🎁 힌트 상자 ${g.box.length}</span><span class="stages" aria-label="스테이지">${stageDots}</span></div>
        <div class="mon-wrap" id="s-monwrap">${monsterImg(g.monster, null, g.done ? 'defeated' : '')}</div>
        <div class="mon-name">${g.monster.boss ? '<span class="boss-tag">BOSS</span> ' : ''}${esc(g.monster.name)}</div>
        <div class="hp" role="meter" aria-label="몬스터 체력" aria-valuemin="0" aria-valuemax="${g.hpMax}" aria-valuenow="${g.hp}"><div class="hp-fill" style="width:${prev}%" data-to="${pct}"></div><span>HP ${g.hp} / ${g.hpMax}</span></div>
        <ul class="team">${g.members.map(m => `<li class="${m.me ? 'me' : ''} ${m.online ? '' : 'off'} ${m.hand ? 'hand-up' : ''}"><span class="av-wrap">${avatar(m.equip, 36, m.num)}${reactBadge(m)}</span><span class="nm">${handMark(m)}${esc(m.name)}${m.me ? ' (나)' : ''}</span><span class="st">용사</span></li>`).join('')}</ul>
      </section>`;
    }

    // 친구 힌트 3종류 버튼: 누가 넣었는지는 보이지 않고, 종류만 골라요.
    function kindButtons(g, q) {
      return `<div class="gift-row">${(g.boxKinds || []).map(k => {
        const elimNo = k.kind === 'elim' && !q.elimOk;
        const off = !k.count || elimNo;
        const note = !k.count ? '상자에 없어요' : elimNo ? '보기가 2개라 못 써요' : GIFT_DESC[k.kind] || '';
        return `<button type="button" class="gift-btn" data-act="take" data-k="${esc(k.kind)}" ${off ? 'disabled' : ''}><span class="gi" aria-hidden="true">${GIFT_ICON[k.kind] || '🎁'}</span>${esc(k.label)}<small>${esc(note)}</small></button>`;
      }).join('')}</div>`;
    }

    function questionCard(st) {
      const q = st.play.q, g = st.group;
      if (S.selQ !== q.id) { S.sel = null; S.selQ = q.id; }
      const wrongNow = S.justWrong; S.justWrong = false;
      const boxOffer = q.canTake && g.box.length && !q.gifts.length
        ? `<div class="box-offer"><p>🎁 <b>모둠 힌트 상자</b>에 친구들이 만든 힌트가 있어요. 필요하면 <b>하나만</b> 골라 써요. <span class="muted small">(누르기 전에는 쓰이지 않아요)</span></p>${kindButtons(g, q)}</div>` : '';
      return `<section class="s-card q-card ${wrongNow ? 'shake' : ''}">
        <div class="q-top"><p class="q-label">나의 문제 ${st.play.qi + 1} / ${st.play.per}</p><span class="q-area">${esc(q.areaName)}</span></div>
        <h2 class="q-text">${math(q.text)}</h2>
        ${choiceButtons(q, 'pick')}
        ${q.gifts.map(gf => `<div class="gift-note">🎁 친구 힌트 · <b>${esc(gf.label)}</b> — ${math(gf.text)}</div>`).join('')}
        ${q.steps.map((h, i) => `<div class="step step${i + 1}">${STEP[i]} — ${math(h)}</div>`).join('')}
        ${boxOffer}
        ${st.play.twin && (st.play.twin.state === 'open' || st.play.twin.state === 'reward') ? '<p class="small muted">📚 지난 스테이지에서 풀던 추가 문제는 내 문제를 다 풀면 이어서 풀 수 있어요.</p>' : ''}
        ${q.tried.length ? `<p class="saved">📒 오답노트에 자동 저장됐어요 · ${q.tried.length}번째 도전 중, 틀려도 괜찮아요</p>` : '<p class="soft muted">천천히 생각해도 불이익은 없어요. 시간 제한이 없어요.</p>'}
        <button type="button" class="btn btn-gold btn-big" data-act="submit" ${S.sel == null ? 'disabled' : ''}>✓ 정답 제출</button>
      </section>`;
    }

    // 주관식 답 칸: 대분수는 자연수·분자·분모, 분수는 분자·분모, 그 밖에는 글자 칸
    const BOXED = ['mixed', 'frac', 'int', 'dec', 'pct', 'ratio'];
    const FMT_TIP = { mixed: '왼쪽 칸에 자연수, 오른쪽 위에 분자, 아래에 분모를 써요.', frac: '위 칸에 분자, 아래 칸에 분모를 써요.', dec: '소수점(.)까지 함께 써요. 예) 2.5', pct: '% 앞의 숫자만 써요.', ratio: '앞의 수와 뒤의 수를 각각 써요.', int: '숫자만 써요.' };
    function ansInput(fmt, key, placeholder) {
      if (BOXED.indexOf(fmt) < 0) {
        const id = key === 'twin' ? 's-twin' : 'n-' + key;
        const val = key === 'twin' ? S.twinText : (S.noteText[key] || '');
        return `<input id="${id}" class="inp" type="text" maxlength="30" autocomplete="off" placeholder="${esc(placeholder)}" value="${esc(val)}">`;
      }
      const v = S.boxes[key] || {};
      const box = (part, label) => `<input id="bx-${esc(key)}-${part}" class="inp num-box ${part === 'v' ? 'wide' : ''}" type="text" inputmode="${part === 'v' && fmt !== 'int' ? 'decimal' : 'numeric'}" maxlength="${part === 'v' ? 7 : 4}" autocomplete="off" aria-label="${label}" value="${esc(v[part] || '')}">`;
      if (fmt === 'int' || fmt === 'dec') return `<div class="frac-in" role="group" aria-label="${fmt === 'dec' ? '소수로 답 쓰기' : '숫자로 답 쓰기'}">${box('v', fmt === 'dec' ? '소수' : '숫자')}</div>`;
      if (fmt === 'pct') return `<div class="frac-in" role="group" aria-label="백분율로 답 쓰기">${box('v', '백분율 숫자')}<span class="unit-mark">%</span></div>`;
      if (fmt === 'ratio') return `<div class="frac-in" role="group" aria-label="비로 답 쓰기">${box('a', '앞의 수')}<span class="unit-mark">:</span>${box('b', '뒤의 수')}</div>`;
      return `<div class="frac-in" role="group" aria-label="${fmt === 'mixed' ? '대분수로 답 쓰기' : '분수로 답 쓰기'}">
        ${fmt === 'mixed' ? `<div class="whole">${box('w', '자연수 부분')}</div>` : ''}
        <div class="frac-stack">${box('n', '분자')}<i class="bar" aria-hidden="true"></i>${box('d', '분모')}</div></div>`;
    }
    function ansValue(fmt, key) {
      if (BOXED.indexOf(fmt) < 0) return key === 'twin' ? S.twinText : (S.noteText[key] || '');
      const v = S.boxes[key] || {};
      const one = (v.v || '').trim();
      if (fmt === 'int' || fmt === 'dec') return one;
      if (fmt === 'pct') return one ? one + '%' : '';
      if (fmt === 'ratio') { const a = (v.a || '').trim(), b = (v.b || '').trim(); return a && b ? `${a} : ${b}` : ''; }
      const w = (v.w || '').trim(), n = (v.n || '').trim(), d = (v.d || '').trim();
      if (!n || !d || (fmt === 'mixed' && !w)) return '';
      return fmt === 'mixed' ? `${w} ${n}/${d}` : `${n}/${d}`;
    }

    function extraCard(st) {
      const tw = st.play.twin;
      if (!tw || st.group.done) return '';
      if (st.group.ready && tw.state === 'choose') return ''; // 합동 공격 준비가 되면 새 추가 문제는 고르지 않음
      const boxFull = st.group.box.length >= (st.group.boxMax || 6);
      const readyNote = st.group.ready ? '<p class="ready-note">⚔️ 합동 공격 준비 완료! 풀던 추가 문제는 마저 풀어도 돼요. 공격하면 다음 스테이지에서 이어서 풀 수 있어요.</p>' : '';
      if (tw.state === 'choose') {
        return `<section class="s-card twin-card">
          <h3>📚 추가 문제 풀이로 힌트 획득하기</h3>
          <p class="small muted">추가 문제를 맞히면 힌트를 하나 얻어 <b>모둠 힌트 상자</b>에 넣을 수 있어요. 난이도를 골라 보세요.</p>
          ${boxFull ? `<p class="box-full">🎁 힌트 상자가 가득 찼어요(${st.group.boxMax || 9}개). 지금은 맞히면 포인트만 받아요!</p>` : ''}
          <div class="diff-row">${[3, 2, 1].map(d => `<button type="button" class="diff-btn d${d}" data-act="twinpick" data-d="${d}"><b>${DIFF_NAME[d]}</b><small>${['', '기본', '보통', '도전'][d]}</small></button>`).join('')}</div>
        </section>`;
      }
      if (S.twinFor !== tw.id) { S.twinFor = tw.id; S.twinText = ''; S.boxes.twin = {}; }
      if (tw.state === 'open') {
        return `<section class="s-card twin-card">
          <h3>⭐ 추가 문제 <span class="diff-chip d${tw.diff}">난이도 ${DIFF_NAME[tw.diff]}</span></h3>${readyNote}
          <p class="q-area">${esc(tw.areaName)}</p>
          <p class="twin-q">${math(tw.text)}</p>
          <form class="twin-row ${BOXED.indexOf(tw.fmt) >= 0 ? 'has-boxes' : ''}" data-form="twin">${ansInput(tw.fmt, 'twin', '정답을 직접 써 보세요')}<button class="btn btn-gold" type="submit">확인</button></form>
          ${FMT_TIP[tw.fmt] ? `<p class="muted small">${FMT_TIP[tw.fmt]}</p>` : ''}
          ${tw.steps.map((h, i) => `<div class="step step${i + 1}">${STEP[i]} — ${math(h)}</div>`).join('')}
          ${tw.tries ? '<p class="saved">📒 오답노트에 자동 저장됐어요</p>' : '<p class="muted small">💡 방금 푼 문제와 같은 방법을 떠올려 보세요.</p>'}
          <button type="button" class="btn btn-ghost sm skip-btn" data-act="twinskip">📒 모르겠어요 · 오답노트에 저장하고 나가기</button>
        </section>`;
      }
      const kinds = st.giftKinds || {};
      return `<section class="s-card twin-card reward">
        <h3>🎁 힌트를 얻었어요!</h3>${readyNote}
        <p class="small">어떤 힌트를 <b>모둠 힌트 상자</b>에 넣을까요? 문제를 어려워하는 친구가 꺼내 쓸 수 있어요.</p>
        ${boxFull ? `<p class="box-full">🎁 그사이 힌트 상자가 가득 찼어요. 이번 문제는 포인트만 받아요.</p><button type="button" class="btn btn-gold" data-act="hintpick" data-k="${esc((tw.allowed || ['concept'])[0])}">확인하고 다음 추가 문제로</button>` : `
        <div class="gift-row">${Object.keys(kinds).map(k => { const ok = !boxFull && (!tw.allowed || tw.allowed.indexOf(k) >= 0); return `<button type="button" class="gift-btn" data-act="hintpick" data-k="${k}" ${ok ? '' : 'disabled'}><span class="gi" aria-hidden="true">${GIFT_ICON[k] || '🎁'}</span>${esc(kinds[k])}<small>${ok ? esc(GIFT_DESC[k] || '') : boxFull ? '상자가 가득 찼어요' : '🔒 다른 힌트를 먼저 만들어요'}</small></button>`; }).join('')}</div>`}
        <p class="muted small">힌트는 3종류를 골고루 만들어요. 아직 안 만든 종류만 고를 수 있어요.</p>
      </section>`;
    }

    function helpCard(st) {
      const g = st.group;
      if (!st.play.helpWanted || g.ready || g.done) return '';
      return `<section class="s-card help-card"><h3>🙋 힌트를 기다리는 친구가 있어요</h3>
        <p class="small muted">추가 문제를 풀어 모둠 힌트 상자에 힌트를 넣어 주세요. 친구가 필요할 때 직접 골라 써요.</p></section>`;
    }

    function gameView(st) {
      if (st.waiting || !st.group) return topBar(st, true) + `<section class="s-card center"><h2>모둠을 기다려요<span class="dots"></span></h2></section>`;
      const g = st.group, p = st.play || {};
      let panel;
      if (g.done) panel = `<section class="s-card wait-card"><div class="banner-ok">🏆 우리 모둠이 최종 보스를 물리쳤어요!</div><p class="muted">다른 모둠을 함께 응원해요. 상점도 열려 있어요.</p></section>`;
      else if (p.q && !p.stageDone) panel = questionCard(st);
      else {
        const lock = S.attackLock === `${g.id}-${g.stage}`;
        panel = `<section class="s-card wait-card"><div class="banner-ok">✅ 이번 스테이지 내 문제를 다 풀었어요!</div>
          ${g.ready ? `<p class="ready-text">모든 모둠원이 문제를 다 풀었어요!</p><button type="button" class="btn btn-attack" data-act="attack" ${lock ? 'disabled' : ''}>⚔️ 모둠원 합동 공격!</button>`
            : '<p>친구들과 함께 몬스터와 싸우는 중이에요. 모두 해결하면 합동 공격 버튼이 열려요.</p><p class="muted small">🛒 상점이 열렸어요. 기다리는 동안 꾸며 봐요.</p>'}
        </section>${helpCard(st)}${extraCard(st)}`;
      }
      return topBar(st, true) + `<div class="game-grid"><div class="col">${arena(st)}${chatBox(st)}</div><div class="col">${panel}</div></div>`;
    }

    function notesList(list) {
      if (!list) return `<p class="muted">불러오는 중…</p>`;
      if (!list.length) return `<div class="center stack"><div class="big-emoji" aria-hidden="true">🌟</div><p>오답노트가 비어 있어요. 멋져요!</p></div>`;
      return `<div class="notes">${list.map(n => {
        const last = S.noteLast && S.noteLast.nid === n.nid ? S.noteLast : null;
        const body = n.resolved
          ? `<p class="ok-text">✅ 다시 풀어서 해결했어요!</p>${n.explain ? `<p class="small">📖 ${math(n.explain)}</p>` : ''}`
          : n.kind === 'q'
            ? `<div class="choices small-choices">${n.choices.map((c, i) => `<button type="button" class="choice" data-act="note-pick" data-nid="${esc(n.nid)}" data-i="${i}">${math(c)}</button>`).join('')}</div>`
            : `<form class="twin-row ${BOXED.indexOf(n.fmt) >= 0 ? 'has-boxes' : ''}" data-form="note" data-nid="${esc(n.nid)}" data-fmt="${esc(n.fmt || 'text')}">${ansInput(n.fmt, n.nid, '정답을 다시 써 보세요')}<button class="btn btn-gold sm" type="submit">확인</button></form>`;
        return `<article class="note ${n.resolved ? 'resolved' : ''}">
          <p class="note-meta">${esc(n.unitName)} · ${esc(n.areaName)}</p>
          <h4>${math(n.text)}</h4>
          <p class="small muted">처음 쓴 답: <span class="mine">${math(n.mine)}</span></p>
          ${body}
          ${!n.resolved && n.hint ? `<p class="step step1">💡 ${math(n.hint)}</p>` : ''}
          ${last && !last.correct && !n.resolved ? '<p class="small warn">아직 아니에요. 힌트를 보고 다시 도전해요!</p>' : ''}
        </article>`;
      }).join('')}</div>`;
    }

    // 리포트가 준비되기 전에는 '정리 중' 대기 화면을 보여 줍니다 (최소 2.5초).
    const REPORT_WAIT_MS = 2500;
    function reportWaiting(st) {
      const ovc = $('.ov-clear');
      if (ovc && !ovc.hidden) S.endAt = Date.now(); // 합동 공격 화면을 닫은 뒤부터 대기 화면을 보여 줌
      const left = REPORT_WAIT_MS - (Date.now() - (S.endAt || 0));
      const notReady = !st.result || S.notes == null;
      if (left > 0 || notReady) { clearTimeout(reportWaiting.t); reportWaiting.t = setTimeout(() => { if (S.st && S.st.phase === 'ended') render(); }, Math.max(300, left)); return true; }
      return false;
    }
    function reportWaitView(st) {
      return topBar(st) + `<section class="s-card center stack report-wait" role="status" aria-live="polite">
        <div class="big-emoji wait-spin" aria-hidden="true">📊</div>
        <h2>학습 리포트 정리 중<span class="dots"></span></h2>
        <p class="muted">오늘 푼 문제와 오답노트를 모아 나만의 리포트를 만들고 있어요. 잠시만 기다려 주세요.</p>
      </section>`;
    }
    // 게임 끝 설문 (리포트를 보기 전에 한 번만)
    const SURVEY_OPTS = [[2, '😀', '그렇다'], [1, '🙂', '조금 그렇다'], [0, '😐', '아니다']];
    function surveyView(st) {
      const a = S.survey || (S.survey = {});
      const qs = st.survey.qs;
      const all = qs.every(q => a[q.id] != null);
      return topBar(st) + `<section class="s-card stack survey-card">
        <h2>📝 오늘 게임은 어땠나요?</h2>
        <p class="muted">정답은 없어요. 내 마음과 가장 가까운 것을 골라 주세요. 다 고르면 리포트를 볼 수 있어요.</p>
        ${qs.map((q, i) => `<div class="sv-q" role="group" aria-label="${esc(q.text)}"><p><b>${i + 1}.</b> ${esc(q.text)}</p>
          <div class="sv-opts">${SURVEY_OPTS.map(([v, e, l]) => `<button type="button" class="sv-opt ${a[q.id] === v ? 'sel' : ''}" data-act="sv-pick" data-q="${q.id}" data-v="${v}" aria-pressed="${a[q.id] === v}"><span aria-hidden="true">${e}</span>${l}</button>`).join('')}</div></div>`).join('')}
        <button type="button" class="btn btn-gold btn-big" data-act="sv-send" ${all ? '' : 'disabled'}>${all ? '보내고 리포트 보기 →' : `${qs.filter(q => a[q.id] != null).length} / ${qs.length} 골랐어요`}</button>
      </section>`;
    }
    function endedView(st) {
      const r = st.result || {};
      return topBar(st) + `<section class="s-card s-end">
        <div class="trophy" aria-hidden="true">🏆</div>
        <h2>${r.cleared >= r.stages ? `우리 모둠이 ${esc(st.dragon)}를 물리쳤어요!` : '모험 끝! 수고했어요'}</h2>
        <p>${r.team ? `<b>${esc(r.team)}</b> · ` : ''}몬스터 <b>${r.cleared || 0} / ${r.stages || 0}</b> 처치 · 내가 해결한 문제 <b>${r.ok || 0}개</b> · 추가 문제 ${r.extra || 0}개 · 포인트 ⭐ ${r.points || 0}</p>
        <p class="muted small">힌트를 보고 다시 도전한 것도 모두 멋진 성장이에요.</p>
        ${st.phase === 'playing' ? '<p class="muted small">⚔️ 다른 모둠은 아직 몬스터와 싸우는 중이에요. 그동안 내 리포트를 읽고 오답노트를 풀어 봐요.</p>' : ''}
        <div class="home-gate">${homeGateInner()}</div>
      </section>
      <h2 class="sec-title">📊 나의 학습 리포트 · ${esc(st.unitName)}</h2>
      ${resultCharts(r)}
      <div class="report-end" aria-hidden="true"></div>
      <h2 class="sec-title">📒 내 오답노트 다시 풀기</h2>
      <section class="s-card">${notesList(S.notes)}</section>
      <section class="s-card end-shop"><p>🛒 리포트와 오답노트를 다 봤으면 <b>상점</b>에서 내 캐릭터를 꾸며 봐요!</p><button type="button" class="btn btn-ghost" data-act="shop" ${st.canShop ? '' : 'disabled'}>🛒 상점 열기</button></section>
      <section class="s-card end-home"><div class="home-gate">${homeGateInner()}</div></section>`;
    }
    // 처음 화면 버튼: 학습 리포트를 끝까지 읽고, 오답노트를 모두 다시 풀어야 열립니다.
    function homeGate() {
      const total = S.notes ? S.notes.length : null;
      const left = S.notes ? S.notes.filter(n => !n.resolved).length : null;
      return { read: S.readReport, total, left, open: S.readReport && S.notes != null && left === 0 };
    }
    function homeGateInner() {
      const g = homeGate();
      const notesLine = g.total == null ? '오답노트 불러오는 중…' : g.total === 0 ? '오답노트 — 틀린 문제가 없어요' : `오답노트 다시 풀기 ${g.total - g.left} / ${g.total}`;
      return `<ul class="gate-list"><li class="${g.read ? 'done' : ''}">${g.read ? '✅' : '⬜'} 학습 리포트 끝까지 읽기</li><li class="${g.total != null && g.left === 0 ? 'done' : ''}">${g.total != null && g.left === 0 ? '✅' : '⬜'} ${notesLine}</li></ul>
        <button type="button" class="btn ${g.open ? 'btn-gold' : 'btn-ghost'}" data-act="home" ${g.open ? '' : 'disabled'}>🏠 처음 화면으로 돌아가기</button>
        ${g.open ? '' : '<p class="muted small">위 두 가지를 마치면 버튼이 열려요.</p>'}`;
    }
    function paintHomeGate() { main.querySelectorAll('.home-gate').forEach(el => { el.innerHTML = homeGateInner(); }); }
    let reportIO = null;
    function watchReportEnd() {
      if (reportIO) { reportIO.disconnect(); reportIO = null; }
      if (S.readReport) return;
      const end = main.querySelector('.report-end');
      if (!end) return;
      const seen = () => { if (S.readReport) return; S.readReport = true; if (reportIO) { reportIO.disconnect(); reportIO = null; } paintHomeGate(); };
      if (typeof IntersectionObserver === 'function') {
        reportIO = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) seen(); });
        reportIO.observe(end);
      } else {
        const chk = () => { if (end.getBoundingClientRect().top < window.innerHeight) { seen(); window.removeEventListener('scroll', chk, true); } };
        window.addEventListener('scroll', chk, true);
      }
    }

    function renderNotes() {
      const ov = $('.ov-notes');
      ov.innerHTML = `<div class="ov-box notes-box" role="dialog" aria-label="오답노트"><div class="row"><h2 class="grow">📒 내 오답노트</h2><button type="button" class="btn sm btn-ghost" data-act="notes-close">닫기 ✕</button></div><p class="muted small">틀린 문제를 다시 풀어 봐요. 맞히면 '해결'로 바뀌어요.</p>${notesList(S.notes)}</div>`;
      ov.hidden = false;
    }

    function renderShop() {
      const st = S.st; if (!st) return;
      const me = st.me, owned = new Set(me.owned);
      const items = S.catalog.filter(i => i.slot === S.shopTab);
      const ov = $('.ov-shop');
      ov.innerHTML = `<div class="ov-box shop-box" role="dialog" aria-label="포인트 상점">
        <div class="shop-top">${avatar(me.equip, 84, me.num)}<div class="grow"><h2>🛒 포인트 상점</h2><p>내 포인트 <b class="gold-text">⭐ ${me.points}</b></p></div><button type="button" class="btn sm btn-ghost" data-act="shop-close">닫기 ✕</button></div>
        <p class="muted small">문제를 맞히고, 추가 문제를 풀고, 친구에게 힌트를 보내면 포인트가 쌓여요.</p>
        <div class="shop-tabs">${Object.keys(SLOT_NAME).map(k => `<button type="button" class="shop-tab ${S.shopTab === k ? 'on' : ''}" data-act="shop-tab" data-k="${k}">${SLOT_NAME[k]}</button>`).join('')}</div>
        <div class="items">${items.map(it => {
          const has = it.price === 0 || owned.has(it.id), worn = me.equip[it.slot] === it.id;
          let btn;
          if (has) btn = worn ? (it.slot === 'base' || it.slot === 'bg' ? '<button type="button" class="btn sm btn-gold" disabled>착용 중</button>' : `<button type="button" class="btn sm btn-ghost" data-act="unequip" data-slot="${it.slot}">벗기</button>`) : `<button type="button" class="btn sm btn-gold" data-act="equip" data-slot="${it.slot}" data-id="${it.id}">입기</button>`;
          else btn = `<button type="button" class="btn sm" data-act="buy" data-id="${it.id}" ${me.points < it.price ? 'disabled' : ''}>⭐ ${it.price} 사기</button>`;
          return `<div class="item ${worn ? 'worn' : ''}">${it.css ? `<span class="ic" style="background:${it.css}"></span>` : `<span class="ic">${itemIcon(it)}</span>`}<span class="nm">${esc(it.name)}</span>${btn}</div>`;
        }).join('')}</div></div>`;
      ov.hidden = false;
    }
    function paintReadyBanner(st) {
      const b = $('.ready-banner'); if (!b) return;
      const g = st && st.group;
      const show = !!(st && st.phase === 'playing' && g && g.ready && !g.done && (S.notesOpen || S.shopOpen));
      b.hidden = !show;
    }
    function closeShop() { S.shopOpen = false; $('.ov-shop').hidden = true; }

    function afterRender(st) {
      const fill = main.querySelector('.hp-fill[data-to]');
      if (fill) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = fill.dataset.to + '%'; }));
      const g = st && st.group;
      S.prevHp = g ? { gid: g.id, stage: g.stage, pct: g.hpMax ? g.hp / g.hpMax * 100 : 0 } : null;
      const fx = S.fx; S.fx = [];
      for (const f of fx) {
        const wrap = main.querySelector('#s-monwrap'), mon = wrap && wrap.querySelector('.mon');
        if (f.kind === 'hit' && mon) hitFx(wrap, mon, f.dmg, false, f.by);
        if (f.kind === 'team') {
          const arenaEl = main.querySelector('#s-arena');
          if (arenaEl) { arenaEl.classList.remove('quake'); void arenaEl.offsetWidth; arenaEl.classList.add('quake'); }
          showClear(f);
        }
      }
    }

    function hitFx(wrap, mon, dmg, big, by) {
      mon.classList.remove('hit', 'hit-big'); void mon.offsetWidth; mon.classList.add(big ? 'hit-big' : 'hit');
      const slash = document.createElement('div'); slash.className = 'slash' + (big ? ' big' : ''); wrap.appendChild(slash);
      const d = document.createElement('div'); d.className = 'dmg' + (big ? ' big' : ''); d.innerHTML = '-' + dmg + (by ? `<small>${esc(by)}</small>` : ''); wrap.appendChild(d);
      setTimeout(() => { slash.remove(); d.remove(); }, 1200);
      main.querySelectorAll('.team li').forEach((li, i) => setTimeout(() => li.classList.add('jump'), i * 70));
    }

    function showClear(f) {
      const ov = $('.ov-clear');
      ov.innerHTML = `<div class="ov-box clear-box" role="dialog" aria-label="합동 공격">
        <div class="clear-stage">${monsterImg(f.monster, null, 'dying')}<div class="boom" aria-hidden="true"></div><div class="dmg big">-${f.dmg}</div></div>
        <h2>⚔️ 모둠원 합동 공격!</h2>
        <p><b>${esc(f.monster.name)}</b> 처치 성공!${f.by ? ` (${esc(f.by)} 친구가 공격 버튼을 눌렀어요)` : ''}</p>
        ${f.last ? '<p class="next">🏆 최종 보스까지 물리쳤어요! 곧 결과가 나와요.</p>' : f.next ? `<p class="next">다음 몬스터 <b>${esc(f.next.name)}</b> 등장!${f.next.boss ? ' 최종 보스예요!' : ' 더 크고 강해졌어요.'}</p>` : ''}
        <button type="button" class="btn btn-gold" data-act="close-clear">${f.last ? '확인' : '다음 스테이지로 ▶'}</button></div>`;
      ov.hidden = false;
      clearTimeout(showClear.t); showClear.t = setTimeout(() => { ov.hidden = true; }, 4500);
    }

    function startCountdown(text) {
      stopCountdown();
      const ov = $('.ov-count'); ov.hidden = false;
      [3, 2, 1].forEach((n, i) => S.cdT.push(setTimeout(() => { ov.innerHTML = `<div class="ov-box"><div class="cd-num">${n}</div><p>${esc(text)}</p></div>`; }, i * 1000)));
    }
    function stopCountdown() { S.cdT.forEach(clearTimeout); S.cdT = []; const ov = $('.ov-count'); ov.hidden = true; ov.innerHTML = ''; }

    function goHome() {
      net.send({ t: 'leave' }); // 서버가 더 이상 리포트를 보내지 않게
      S.pid = null; S.st = null; S.notes = null; S.err = ''; S.lastPhase = null;
      store.del('sessionStorage', 'mq_s');
      closeShop(); $('.ov-notes').hidden = true; S.notesOpen = false;
      render();
    }

    // ───── 누르기 ─────
    root.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled || !root.contains(el)) return;
      const st = S.st;
      switch (el.dataset.act) {
        case 'pick': S.sel = Number(el.dataset.i); render(); break;
        case 'submit':
          if (!st || !st.play || !st.play.q || S.sel == null) return;
          el.disabled = true; net.send({ t: 'answer', qid: st.play.q.id, choice: S.sel }); S.sel = null; break;
        case 'submit-diag':
          if (!st || !st.diag || S.sel == null) return;
          el.disabled = true; net.send({ t: 'answer', qid: st.diag.q.id, choice: S.sel }); S.sel = null; break;
        case 'attack':
          if (!st || !st.group) return;
          S.attackLock = `${st.group.id}-${st.group.stage}`; el.disabled = true;
          net.send({ t: 'attack', stage: st.group.stage }); break;
        case 'twinpick': el.disabled = true; net.send({ t: 'twinpick', diff: Number(el.dataset.d) }); break;
        case 'twinskip': el.disabled = true; S.boxes.twin = {}; S.twinText = ''; net.send({ t: 'twinskip' }); break;
        case 'hintpick': el.disabled = true; net.send({ t: 'hintpick', kind: el.dataset.k }); break;
        case 'take': el.disabled = true; net.send({ t: 'take', kind: el.dataset.k }); break;
        case 'chat': net.send({ t: 'chat', emoji: el.dataset.e }); break;
        case 'hand': net.send({ t: 'hand', up: el.dataset.up === '1' }); break;
        case 'sv-pick': (S.survey || (S.survey = {}))[el.dataset.q] = Number(el.dataset.v); render(); break;
        case 'sv-send': if (st.survey && st.survey.qs.every(q => S.survey && S.survey[q.id] != null)) { S.surveySent = true; net.send({ t: 'survey', answers: S.survey }); render(); } break;
        case 'notes': S.notesOpen = true; S.notes = null; S.noteLast = null; renderNotes(); paintReadyBanner(st); net.send({ t: 'notes' }); break;
        case 'notes-close': S.notesOpen = false; $('.ov-notes').hidden = true; paintReadyBanner(S.st); break;
        case 'go-attack': closeShop(); S.notesOpen = false; $('.ov-notes').hidden = true; paintReadyBanner(S.st); break;
        case 'note-pick': net.send({ t: 'note', nid: el.dataset.nid, choice: Number(el.dataset.i) }); break;
        case 'shop': if (st && st.canShop) { S.shopOpen = true; renderShop(); paintReadyBanner(st); } break;
        case 'shop-close': closeShop(); paintReadyBanner(S.st); break;
        case 'shop-tab': S.shopTab = el.dataset.k; renderShop(); break;
        case 'buy': net.send({ t: 'buy', id: el.dataset.id }); break;
        case 'equip': net.send({ t: 'equip', slot: el.dataset.slot, id: el.dataset.id }); break;
        case 'unequip': net.send({ t: 'equip', slot: el.dataset.slot, id: null }); break;
        case 'close-clear': $('.ov-clear').hidden = true; break;
        case 'home': if (homeGate().open) goHome(); break;
      }
    });
    root.addEventListener('input', e => {
      const id = e.target.id;
      if (id === 'sj-room') S.form.room = e.target.value.replace(/\D/g, '').slice(0, 4);
      else if (id === 'sj-num') S.form.num = e.target.value;
      else if (id === 'sj-name') S.form.name = e.target.value;
      else if (id === 's-twin') S.twinText = e.target.value;
      else if (id && id.indexOf('n-') === 0) S.noteText[id.slice(2)] = e.target.value;
      else if (id && id.indexOf('bx-') === 0) {
        const part = id.slice(-1), key = id.slice(3, -2);
        const v = part === 'v' ? e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 7) : e.target.value.replace(/\D/g, '').slice(0, 4);
        if (v !== e.target.value) e.target.value = v;
        (S.boxes[key] = S.boxes[key] || {})[part] = v;
      }
    });
    root.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target.dataset.form, st = S.st;
      if (f === 'twin') {
        if (!st || !st.play || !st.play.twin) return;
        const tw = st.play.twin, text = ansValue(tw.fmt, 'twin');
        if (!text.trim()) { toast($('.toasts'), tw.fmt === 'text' ? '정답을 써 주세요.' : '빈 칸을 모두 채워 주세요.'); return; }
        net.send({ t: 'twin', tid: tw.id, text }); S.twinText = ''; S.boxes.twin = {}; return;
      }
      if (f === 'note') {
        const nid = e.target.dataset.nid, fmt = e.target.dataset.fmt, text = ansValue(fmt, nid);
        if (!text.trim()) { toast($('.toasts'), fmt === 'text' ? '정답을 써 주세요.' : '빈 칸을 모두 채워 주세요.'); return; }
        net.send({ t: 'note', nid, text }); S.noteText[nid] = ''; S.boxes[nid] = {}; return;
      }
      if (f !== 'join') return;
      const code = (!demo || opt.roomInput) ? S.form.room : presetRoom();
      const num = Number(S.form.num), name = String(S.form.name).trim();
      if (!/^\d{4}$/.test(code)) { S.err = '방 번호는 숫자 4개예요.'; return render(); }
      if (!(num >= 1 && num <= 60)) { S.err = '출석 번호는 1부터 60 사이 숫자로 써 주세요.'; return render(); }
      if (!name) { S.err = '이름을 써 주세요.'; return render(); }
      S.err = ''; S.code = code;
      S.pending = { t: 'join', code, num, name };
      net.send(S.pending);
      render();
    });

    if (S.pid) main.innerHTML = `<section class="s-card center"><h2>다시 연결하는 중<span class="dots"></span></h2></section>`;
    else render();

    return { refresh() { if (!S.st) render(); } };
  }

  window.MQStudent = { mount };
})();
