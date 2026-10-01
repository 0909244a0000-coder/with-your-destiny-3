// 効果音の数値。音のファイルは使わず、ブラウザの中で音を作る。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.sound = {
  volume: 0.35,        // 全体の音量（0〜1）
  // 同じ音を続けて鳴らすときの最短の間（秒）。速度×4でもうるさくなりすぎないように
  minGap: { hit: 0.06, crit: 0.08, death: 0.07, hurt: 0.15, whirl: 0.2, thunder: 0.1 },

  // 音の作り方
  //   tone  … 音程のある音（freq = 高さHz、to = 終わりの高さ、type = 音色、dur = 長さ秒、gain = 大きさ）
  //   noise … ザッという音（filter = こもり具合Hz）
  //   notes … 順番に鳴らす音の高さ（ファンファーレ）
  sounds: {
    hit:     { noise: { dur: 0.05, filter: 2500, gain: 0.25 } },
    crit:    { noise: { dur: 0.07, filter: 4000, gain: 0.35 }, tone: { freq: 880, to: 660, type: "square", dur: 0.06, gain: 0.08 } },
    death:   { tone: { freq: 160, to: 60, type: "triangle", dur: 0.18, gain: 0.3 } },
    bigDeath:{ tone: { freq: 120, to: 35, type: "sawtooth", dur: 0.6, gain: 0.35 }, noise: { dur: 0.5, filter: 600, gain: 0.4 } },
    hurt:    { tone: { freq: 220, to: 110, type: "square", dur: 0.08, gain: 0.12 } },
    whirl:   { noise: { dur: 0.3, filter: 1200, gain: 0.25, sweep: 3000 } },
    thunder: { noise: { dur: 0.25, filter: 5000, gain: 0.35 }, tone: { freq: 70, to: 40, type: "sawtooth", dur: 0.25, gain: 0.2 } },
    slam:    { tone: { freq: 90, to: 30, type: "sine", dur: 0.5, gain: 0.6 }, noise: { dur: 0.35, filter: 400, gain: 0.5 } },
    bossAppear: { tone: { freq: 55, to: 50, type: "sawtooth", dur: 1.6, gain: 0.25 } },
    levelUp: { notes: [523, 659, 784, 1047], type: "triangle", step: 0.09, dur: 0.25, gain: 0.18 },
    rareDrop:{ notes: [988, 1319], type: "sine", step: 0.07, dur: 0.3, gain: 0.15 },
    uniqueDrop: { notes: [784, 988, 1175, 1568], type: "sine", step: 0.08, dur: 0.5, gain: 0.2 },
  },
};
