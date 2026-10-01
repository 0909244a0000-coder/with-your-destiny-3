// 効果音：Web Audio でその場で音を作って鳴らす（数値は data/sound.js）。
// ブラウザのきまりで、画面を一度クリックするまでは音が出ない。
window.WYD = window.WYD || {};

WYD.sound = {
  ctx: null,
  last: {},

  // 最初のクリックで音の準備をする
  init() {
    const start = () => {
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === "suspended") this.ctx.resume();
      } catch (e) {
        this.ctx = null;
      }
    };
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
  },

  enabled() {
    return this.ctx && WYD.state && WYD.state.settings.sound !== false && this.ctx.state === "running";
  },

  play(name) {
    if (!this.enabled()) return;
    const S = WYD.data.sound;
    const def = S.sounds[name];
    if (!def) return;
    const now = this.ctx.currentTime;
    const gap = S.minGap[name] || 0;
    if (this.last[name] != null && now - this.last[name] < gap) return;
    this.last[name] = now;
    if (def.tone) this.tone(def.tone, now);
    if (def.noise) this.noise(def.noise, now);
    if (def.notes) def.notes.forEach((f, i) => this.tone({ freq: f, type: def.type, dur: def.dur, gain: def.gain }, now + i * def.step));
  },

  envelope(gainValue, t, dur) {
    const g = this.ctx.createGain();
    const v = gainValue * WYD.data.sound.volume;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.ctx.destination);
    return g;
  },

  tone(d, t) {
    const o = this.ctx.createOscillator();
    o.type = d.type || "sine";
    o.frequency.setValueAtTime(d.freq, t);
    if (d.to) o.frequency.exponentialRampToValueAtTime(d.to, t + d.dur);
    o.connect(this.envelope(d.gain, t, d.dur));
    o.start(t);
    o.stop(t + d.dur + 0.05);
  },

  noise(d, t) {
    const len = Math.ceil(this.ctx.sampleRate * d.dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(d.filter, t);
    if (d.sweep) f.frequency.exponentialRampToValueAtTime(d.sweep, t + d.dur);
    src.connect(f);
    f.connect(this.envelope(d.gain, t, d.dur));
    src.start(t);
  },
};
