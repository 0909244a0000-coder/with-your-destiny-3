// BGM：拍ごとに少し先まで音を予約して、エリアに合った曲を流しつづける（数値は data/music.js）
window.WYD = window.WYD || {};

WYD.music = {
  nextTime: 0,
  beat: 0,
  theme: null,
  out: null,

  enabled(state) {
    const s = WYD.sound;
    return s.ctx && s.ctx.state === "running" && state.settings.music !== false;
  },

  // 今の曲の名前
  themeFor(state, world) {
    if (WYD.trial.active(state)) return "trial";
    if (world && world.enemies.some((e) => e.boss)) return "boss";
    return state.area;
  },

  // 毎コマ呼ぶ
  update(state, world) {
    if (!this.enabled(state)) return;
    const ctx = WYD.sound.ctx;
    const M = WYD.data.music;
    if (!this.out) {
      this.out = ctx.createGain();
      this.out.connect(ctx.destination);
    }
    this.out.gain.value = M.volume;
    const key = this.themeFor(state, world);
    if (key !== this.theme) {
      this.theme = key;
      this.beat = 0;
      this.nextTime = ctx.currentTime + 0.1;
    }
    const th = M.themes[key] || M.themes.forest;
    const spb = 60 / th.tempo;
    while (this.nextTime < ctx.currentTime + M.lookAhead) {
      this.playBeat(th, this.nextTime, spb);
      this.nextTime += spb;
      this.beat++;
    }
  },

  note(th, degree, octave) {
    const n = th.scale.length;
    const oct = octave + Math.floor(degree / n);
    const semis = th.scale[((degree % n) + n) % n] + 12 * oct;
    return th.root * Math.pow(2, semis / 12);
  },

  playBeat(th, t, spb) {
    // 低い持続音（根音と5度）
    if (this.beat % th.drone === 0) {
      this.voice(th.root, t, spb * th.drone, 0.9, "sine");
      this.voice(th.root * 1.5, t, spb * th.drone, 0.4, "sine");
    }
    // 打音
    if (th.pulse) this.voice(th.root / 2, t, spb * 0.4, 1.2, "sine", true);
    // メロディ（音階の中からゆっくり動く）
    if (Math.random() < th.melody) {
      this.melodyDegree = (this.melodyDegree || 0) + WYD.util.pick([-2, -1, -1, 0, 1, 1, 2]);
      this.melodyDegree = WYD.util.clamp(this.melodyDegree, -3, 9);
      this.voice(this.note(th, this.melodyDegree, th.octave), t, spb * WYD.util.pick([1, 1, 2]), 0.35, th.wave);
    }
  },

  voice(freq, t, dur, gain, wave, short) {
    const ctx = WYD.sound.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (short) o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
    const attack = short ? 0.005 : Math.min(0.4, dur * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
};
