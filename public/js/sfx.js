// 효과음: 소리 파일 없이 브라우저(Web Audio)로 직접 만듭니다. 새로 만든 소리라 저작권 문제가 없습니다.
// const sfx = MQSfx.create({ key, volume }) → sfx.play(이름), sfx.toggle(), sfx.isOn()  (체험판처럼 한 화면에 선생님·학생이 함께 있어도 따로 켜고 끔)
// 브라우저 규칙상 화면을 한 번 누른 뒤부터 소리가 납니다.
(function (g) {
  let ctx = null, master = null;
  const get = k => { try { return g.localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { g.localStorage.setItem(k, v); } catch (e) { /* 저장 못 해도 소리는 그대로 */ } };
  function ac() {
    if (ctx) return ctx;
    const A = g.AudioContext || g.webkitAudioContext;
    if (!A) return null;
    try { ctx = new A(); master = ctx.createDynamicsCompressor(); master.threshold.value = -12; master.ratio.value = 8; master.connect(ctx.destination); } catch (e) { ctx = null; } // 큰 폭발음도 찢어지지 않게 압축
    return ctx;
  }
  function unlock() { const c = ac(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
  // 음 하나: 주파수(Hz), 시작(초, 지금부터), 길이(초), 파형, 크기, 끝 주파수(미끄러지기)
  function tone(out, f, at, dur, type, amp, f2) {
    const c = ctx, t = c.currentTime + at;
    const o = c.createOscillator(), e = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(amp || 0.3, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e); e.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  // 잡음(타격·폭발 느낌)
  function noise(out, at, dur, amp, freq) {
    const c = ctx, t = c.currentTime + at, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), e = c.createGain();
    s.buffer = buf; fl.type = 'lowpass'; fl.frequency.value = freq || 1800;
    e.gain.setValueAtTime(amp || 0.3, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(e); e.connect(out); s.start(t);
  }
  // 바람 가르는 소리: 잡음을 좁은 대역으로 걸러 낮은 음 → 높은 음으로 빠르게 쓸어 올림
  function swish(out, at, dur, amp, f1, f2) {
    const c = ctx, t = c.currentTime + at, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), e = c.createGain();
    s.buffer = buf; fl.type = 'bandpass'; fl.Q.value = 1.4;
    fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(amp, t + dur * 0.55); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(e); e.connect(out); s.start(t); s.stop(t + dur + 0.02);
  }
  // 큰 폭발: 쾅(넓은 잡음) + 우르르(낮은 잡음) + 쿵(아주 낮은 음이 떨어짐) + 파편 튀는 소리
  function boom(out, at) {
    noise(out, at, 1.3, 0.9, 900);
    noise(out, at + 0.12, 1.1, 0.6, 350);
    noise(out, at, 0.35, 0.45, 4500);
    tone(out, 130, at, 1.0, 'sine', 0.85, 28);
    tone(out, 75, at, 0.7, 'sawtooth', 0.3, 30);
    [0.18, 0.27, 0.4].forEach(d => noise(out, at + d, 0.08, 0.25, 6000));
  }
  // 폭발 한 방: 잡음을 일그러뜨려(거친 소리) 밝은 소리에서 어두운 소리로 바꾸며, 서서히 길게 사라지게
  let curve = null;
  function crunch() { if (curve) return curve; curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 4); } return curve; }
  function blast(out, at, dur, amp, f1, f2, brown) {
    const c = ctx, t = c.currentTime + at, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.04 * w) / 1.04; d[i] = last * 3.5; } else d[i] = w; }
    const src = c.createBufferSource(), sh = c.createWaveShaper(), fl = c.createBiquadFilter(), e = c.createGain();
    src.buffer = buf; sh.curve = crunch(); fl.type = 'lowpass'; fl.Q.value = 0.8;
    fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.7);
    e.gain.setValueAtTime(amp, t); e.gain.setTargetAtTime(0.0001, t + Math.min(0.12, dur * 0.2), dur / 4);
    src.connect(sh); sh.connect(fl); fl.connect(e); e.connect(out); src.start(t); src.stop(t + dur + 0.05);
  }
  function kwang(out) {
    blast(out, 0, 0.22, 0.4, 5000, 1500);              // 쿠
    blast(out, 0.14, 0.35, 0.5, 4500, 900);             // 콰
    blast(out, 0.32, 2.4, 0.5, 7000, 220);              // 쾅!!
    blast(out, 0.36, 2.8, 0.45, 400, 90, true);          // 우르르 (낮게 깔리는 울림)
    [0.55, 0.7, 0.82, 1.0, 1.15, 1.35].forEach((d, k) => blast(out, d, 0.09, 0.16 - k * 0.015, 6000, 2500)); // 파편 튀는 소리
  }
  const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, A4 = 440, D5 = 587.33;
  const SOUNDS = {
    // 정답: 휙(칼바람) → 챙(칼날) → 퍽(베임)
    correct(o) {
      swish(o, 0, 0.2, 0.9, 500, 6000);
      tone(o, 2637, 0.15, 0.28, 'sine', 0.12); tone(o, 3951, 0.15, 0.2, 'sine', 0.07);
      noise(o, 0.16, 0.14, 0.45, 3000); tone(o, 170, 0.16, 0.16, 'sine', 0.35, 60);
    },
    wrong(o) { tone(o, 220, 0, 0.18, 'square', 0.12, 180); tone(o, 165, 0.14, 0.22, 'square', 0.1, 140); },
    hit(o) { noise(o, 0, 0.15, 0.35, 2500); tone(o, 180, 0, 0.18, 'sine', 0.35, 70); },
    team(o) { boom(o, 0); [C5, E5, G5, C6].forEach((f, i) => tone(o, f, 0.6 + i * 0.08, 0.3, 'triangle', 0.25)); },
    // 최종 보스: 쿠(작은 폭발) → 콰(중간) → 쾅!!(큰 폭발이 밝게 터졌다가 어둡게 우르르 사라짐) + 파편 + 승리 음
    boss(o) { kwang(o); [[C5, 1.5], [E5, 1.62], [G5, 1.74]].forEach(([f, t]) => tone(o, f, t, 0.16, 'square', 0.07)); tone(o, C6, 1.86, 0.8, 'triangle', 0.18); tone(o, G5, 1.86, 0.8, 'triangle', 0.12); },
    count(o) { tone(o, A4, 0, 0.12, 'square', 0.12); },
    go(o) { tone(o, A4 * 2, 0, 0.35, 'square', 0.14); },
    hint(o) { [G5, C6, E5 * 2].forEach((f, i) => tone(o, f, i * 0.07, 0.18, 'sine', 0.2)); },
    coin(o) { tone(o, 988, 0, 0.08, 'square', 0.1); tone(o, 1319, 0.07, 0.25, 'square', 0.1); },
    join(o) { tone(o, D5, 0, 0.1, 'sine', 0.2); tone(o, A4 * 2, 0.08, 0.15, 'sine', 0.2); },
    ready(o) { [C5, G5].forEach((f, i) => tone(o, f, i * 0.1, 0.2, 'triangle', 0.25)); },
  };
  let unlocked = false;
  function hookUnlock() { if (unlocked || !g.addEventListener) return; unlocked = true; ['pointerdown', 'keydown', 'touchstart'].forEach(ev => g.addEventListener(ev, unlock, { capture: true, passive: true })); }
  function create(opt) {
    opt = opt || {};
    const key = opt.key || 'mq_sound', vol = opt.volume == null ? 0.5 : opt.volume;
    let on = get(key) !== '0', gain = null;
    hookUnlock();
    const out = () => { const c = ac(); if (!c) return null; if (!gain) { gain = c.createGain(); gain.gain.value = vol; gain.connect(master); } return gain; };
    const me = {
      isOn: () => on,
      toggle() { on = !on; set(key, on ? '1' : '0'); if (on) { unlock(); me.play('coin', true); } return on; },
      // force: 꺼져 있어도 확인용으로 울리기
      play(name, force) {
        if (!on && !force) return;
        const c = ac(); if (!c || !SOUNDS[name]) return;
        if (c.state === 'suspended') { c.resume().catch(() => {}); return; }
        try { SOUNDS[name](out()); } catch (e) { /* 소리 실패는 게임에 영향 없음 */ }
      },
    };
    return me;
  }
  const api = { create, names: Object.keys(SOUNDS) };
  g.MQSfx = api;
})(typeof window !== 'undefined' ? window : globalThis);
