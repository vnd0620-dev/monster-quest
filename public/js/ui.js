// 교사·학생 화면이 같이 쓰는 작은 도우미
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // "2 1/3", "4/5" 같은 글자를 진짜 분수 모양으로 바꿉니다.
  const fracHtml = (n, d) => `<span class="frac" aria-label="${d}분의 ${n}"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
  function math(text) {
    // [[fig:...]] 그림 자리표는 먼저 빼 두었다가 마지막에 그림으로 바꿉니다 (분수 바꾸기가 그림을 건드리지 않게)
    const figs = [];
    const t = String(text == null ? '' : text).replace(/\[\[fig:([a-z0-9:]+)\]\]/g, (_, sp) => { figs.push(sp); return `\u0000${figs.length - 1}\u0000`; });
    return esc(t)
      .replace(/(\d+) (\d+)\/(\d+)/g, (_, w, n, d) => `<span class="mixed">${w}${fracHtml(n, d)}</span>`)
      .replace(/(\d+)\/(\d+)/g, (_, n, d) => fracHtml(n, d))
      .replace(/\u0000(\d+)\u0000/g, (_, i) => `<span class="fig-wrap">${window.MQFigures ? window.MQFigures.render(figs[+i]) : ''}</span>`);
  }

  // 모두 똑같은 '용사' 역할. 번호마다 얼굴만 다르고 레벨은 드러내지 않습니다.
  const HEROES = ['🦸', '🧙', '🧝', '🥷', '🧚', '🤴', '👸', '🧑‍🚀', '🦹', '🧞'];
  const hero = num => HEROES[(Math.max(1, num) - 1) % HEROES.length];

  // 몬스터 그림 (색은 단원마다, 크기는 스테이지마다)
  const IMG = { dragon: 'img/dragon.webp', fairy: 'img/fairy.webp' };
  function monsterImg(mon, hue, cls) {
    const h = hue != null ? hue : (mon && mon.hue) || 0;
    const sc = (mon && mon.scale) || 1;
    // 스테이지가 오를수록 진화한 모습: f1 새끼(밝고 작음) → f2 성장(어두운 기운·빛나는 눈) → f3 최종 보스(불꽃 기운·불씨·왕관)
    const form = (mon && mon.form) || (mon && mon.boss ? 3 : 1);
    const fx = form >= 2 ? `<i class="aura" aria-hidden="true"></i>` : '';
    const eyes = form >= 2 ? `<i class="eye e1" aria-hidden="true"></i><i class="eye e2" aria-hidden="true"></i>` : '';
    const boss = form >= 3 ? `<i class="embers" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b></i><i class="crown" aria-hidden="true">👑</i>` : '';
    return `<div class="mon f${form} ${cls || ''} ${mon && mon.boss ? 'boss' : ''}" style="--hue:${h}deg;--sc:${sc}">${fx}<img src="${IMG.dragon}" alt="" draggable="false">${eyes}${boss}</div>`;
  }

  // 사람 캐릭터 3종: 살구색 피부, 검은 머리 (기기마다 다른 이모지 피부색 대신 직접 그림)
  const SKIN = '#FFD0AE', SKIN_LINE = '#E5A47E', HAIR = '#16151c';
  const face = `<circle cx="13" cy="37" r="4" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1"/><circle cx="51" cy="37" r="4" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1"/><circle cx="32" cy="37" r="19" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1.2"/><circle cx="25" cy="38" r="2.6" fill="#2a1d14"/><circle cx="39" cy="38" r="2.6" fill="#2a1d14"/><circle cx="25.8" cy="37.2" r=".8" fill="#fff"/><circle cx="39.8" cy="37.2" r=".8" fill="#fff"/><circle cx="21" cy="44" r="3" fill="#ff8f9e" opacity=".45"/><circle cx="43" cy="44" r="3" fill="#ff8f9e" opacity=".45"/><path d="M27 45 Q32 50 37 45" fill="none" stroke="#a5523b" stroke-width="2" stroke-linecap="round"/>`;
  const HUMAN = {
    b_kid: `<svg viewBox="0 0 64 64" aria-hidden="true">${face}<path d="M11 37 C7 5 57 5 53 37 C49 28 41 25 33 29 C27 24 17 27 11 37Z" fill="${HAIR}"/></svg>`,
    b_girl: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 40 C7 13 57 13 54 40 L57 58 C50 54 47 49 47 43 L17 43 C17 49 14 54 7 58Z" fill="${HAIR}"/>${face}<path d="M12 36 C8 6 56 6 52 36 C46 29 38 30 32 24 C27 31 18 31 12 36Z" fill="${HAIR}"/><circle cx="48" cy="22" r="4" fill="#ff6b9a"/><circle cx="54" cy="25" r="3" fill="#ff6b9a"/></svg>`,
    b_boy: `<svg viewBox="0 0 64 64" aria-hidden="true">${face}<path d="M11 36 C9 26 11 20 14 17 L13 9 L21 14 L25 5 L31 12 L36 4 L39 13 L46 7 L47 16 L53 14 C55 21 55 28 53 36 C47 28 40 26 32 28 C24 26 17 28 11 36Z" fill="${HAIR}"/></svg>`,
  };
  const itemIcon = it => (it && HUMAN[it.id] ? `<span class="base-svg">${HUMAN[it.id]}</span>` : it ? it.icon : '');

  // 상점 꾸미기를 반영한 캐릭터 (catalog는 입장할 때 서버가 보내 줌)
  let CAT = {};
  const setCatalog = list => { CAT = Object.fromEntries((list || []).map(i => [i.id, i])); };
  function avatar(eq, size, num) {
    eq = eq || {};
    const g = id => (id && CAT[id]) || null;
    const base = g(eq.base), bg = g(eq.bg), hat = g(eq.hat), gl = g(eq.glasses), wp = g(eq.weapon), pet = g(eq.pet);
    const human = !!(base && HUMAN[base.id]);
    // 모자는 머리 위, 안경은 눈 위치에 (사람 그림과 동물 이모지는 눈 높이가 달라서 따로 맞춤)
    return `<span class="av ${human ? 'human' : 'emoji'} ${base ? 'b-' + base.id : ''}" style="--s:${size || 40}px${bg && bg.css ? ';background:' + bg.css : ''}" aria-hidden="true">` +
      `<b class="base ${base && HUMAN[base.id] ? 'is-svg' : ''}">${base ? (HUMAN[base.id] || base.icon) : hero(num || 1)}</b>` +
      (hat ? `<b class="hat">${hat.icon}</b>` : '') + (gl ? `<b class="glasses">${gl.icon}</b>` : '') +
      (wp ? `<b class="weapon">${wp.icon}</b>` : '') + (pet ? `<b class="pet">${pet.icon}</b>` : '') + `</span>`;
  }

  // ───── 학습 리포트 (학생 결과 화면·교사 상세 화면 공용) ─────
  // 성취 수준 이름: 학생 화면은 친근한 말, 교사 화면은 상·중·하
  const LV_STUDENT = { high: ['🌟', '아주 잘해요'], mid: ['👍', '잘하고 있어요'], low: ['💪', '조금 더 연습해요'], na: ['🔍', '더 풀어 봐야 알 수 있어요'] };
  const LV_TEACHER = { high: ['상', '상'], mid: ['중', '중'], low: ['하', '하'], na: ['?', '확인 필요'] };
  const lvBadge = (lv, teacher) => { const L = (teacher ? LV_TEACHER : LV_STUDENT)[lv] || LV_STUDENT.na; return `<span class="lv-badge ${lv}">${teacher ? L[1] : `${L[0]} ${L[1]}`}</span>`; };
  function areaCard(a, teacher) {
    const again = a.retry + a.many;
    const game = a.count ? `게임 ${a.count}문제(한 번에 ${a.first}${again ? ` · 다시 도전해서 ${again}` : ''}${a.gifts ? ` · 친구 힌트 ${a.gifts}개` : ''})` : '';
    const diag = a.diagN ? `레벨 테스트 ${a.diagN}문제 중 ${a.diagOk}개 정답` : '';
    const evidence = `${[game, diag].filter(Boolean).join(' · ')} → 점수 ${a.rate}%`;
    const mistakes = a.mistakes.length ? `<div class="mist"><b>${teacher ? '자주 보인 오류 유형' : '자주 한 실수'}</b><ul>${a.mistakes.map(m => `<li><span class="mist-name">${esc(m.name)}</span> ${m.count}번 — ${esc(teacher ? m.teacher : m.student)}</li>`).join('')}</ul></div>` : `<div class="mist none"><b>${teacher ? '자주 보인 오류 유형' : '자주 한 실수'}</b><p class="small muted">이 영역에서는 고른 오답이 없어요. 👏</p></div>`;
    const crit = teacher
      ? `<table class="crit"><tbody>${['high', 'mid', 'low'].map(k => `<tr class="${a.level === k ? 'on' : ''}"><th>${LV_TEACHER[k][1]}</th><td>${esc(a.criteria[k])}</td></tr>`).join('')}</tbody></table>`
      : a.level === 'na' ? `<p class="crit-now"><b>목표</b> ${esc(a.criteria.high)}</p>` : `<p class="crit-now"><b>지금 나의 모습</b> ${esc(a.criterion)}</p>`;
    return `<article class="area-card lv-${a.level}"><header>${lvBadge(a.level, teacher)}<h4>${esc(a.name)}</h4>${teacher ? `<span class="std-code">${esc(a.std)}</span>` : ''}</header>
      ${crit}
      <p class="evid">${evidence}</p>
      <div class="card-extra">${a.level === 'na' ? '<p class="small muted">이 영역은 푼 문제가 적어서 수준을 정하지 않았어요.</p>' : ''}
      ${a.needHard ? `<p class="small hard">⭐ ${teacher ? '점수율은 높지만 상 난이도 문항을 한 번에 해결한 기록이 없어 "중"으로 판정했어요.' : '도전(상) 문제를 한 번에 풀면 한 단계 더 올라갈 수 있어요!'}</p>` : ''}</div>
      ${mistakes}
      <p class="tip"><b>${teacher ? '지도 제안' : '다음에 해 볼 것'}</b> ${esc(teacher ? a.teacherTip : a.studentTip)}</p>
      <p class="concept">📗 개념 정리 — ${math(a.concept)}</p></article>`;
  }
  function resultCharts(r, opt) {
    const teacher = !!(opt && opt.teacher);
    const areas = (r && r.areas) || [];
    if (!areas.length) return '<p class="muted small">아직 해결한 문제가 없어요.</p>';
    return `<div class="area-cards">${areas.map(a => areaCard(a, teacher)).join('')}</div>
      ${teacher ? '<p class="muted small">판정 방법: 레벨 테스트(맞으면 1, 틀리면 0)와 게임 문항 점수(한 번에 1 · 1번 다시 0.6 · 2번 다시 0.3 · 3번 이상 0, 친구 힌트를 받으면 최대 0.6)의 평균이 80% 이상이고 상 난이도 문항을 한 번에 해결하면 상, 50% 이상이면 중, 그 밖은 하. 문항이 2개보다 적으면 확인 필요.</p>' : ''}`;
  }

  function toast(box, msg) {
    if (!box) return;
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    box.appendChild(d);
    while (box.children.length > 2) box.firstChild.remove();
    setTimeout(() => d.remove(), 3000);
  }

  const store = {
    get(area, k) { try { return JSON.parse(window[area].getItem(k)); } catch (e) { return null; } },
    set(area, k, v) { try { window[area].setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 안 돼도 게임은 됨 */ } },
    del(area, k) { try { window[area].removeItem(k); } catch (e) { /* */ } },
  };

  window.MQUI = { esc, math, hero, monsterImg, toast, store, IMG, avatar, setCatalog, resultCharts, lvBadge, itemIcon };
})();
