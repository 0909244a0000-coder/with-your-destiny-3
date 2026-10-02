// BGM：ブラウザでその場で作る、雰囲気の曲（ファイルはいらない）。エリア・ボス・試練で曲が変わる。
//   root  … いちばん低い音（Hz）、scale … 使う音（root から何半音上か）
//   tempo … 1分あたりの拍の数、drone … 低い持続音を何拍ごとに鳴らすか
//   melody … メロディを鳴らす確率（拍ごと）、octave … メロディを何オクターブ上で鳴らすか
//   pulse … 拍ごとに低い打音（ボス戦など）、wave … 音の形（sine / triangle / square / sawtooth）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.music = {
  volume: 0.06,
  lookAhead: 0.3,     // 何秒先まで音を予約しておくか
  themes: {
    forest:    { root: 110,  scale: [0, 2, 3, 5, 7, 8, 10], tempo: 66, drone: 8, melody: 0.45, octave: 2, wave: "triangle" },
    smashana:  { root: 98,   scale: [0, 1, 3, 5, 7, 8, 10], tempo: 58, drone: 8, melody: 0.35, octave: 2, wave: "sine" },
    patala:    { root: 87.3, scale: [0, 2, 3, 5, 7, 8, 11], tempo: 72, drone: 8, melody: 0.4, octave: 2, wave: "triangle" },
    cathedral: { root: 73.4, scale: [0, 1, 3, 5, 6, 8, 10], tempo: 54, drone: 4, melody: 0.35, octave: 2, wave: "square" },
    inferno:   { root: 82.4, scale: [0, 1, 4, 5, 7, 8, 10], tempo: 64, drone: 4, melody: 0.4, octave: 2, wave: "sawtooth" },
    frost:     { root: 92.5, scale: [0, 2, 3, 7, 8], tempo: 50, drone: 8, melody: 0.3, octave: 3, wave: "sine" },
    boss:      { root: 65.4, scale: [0, 1, 3, 5, 7, 8, 10], tempo: 112, drone: 4, melody: 0.5, octave: 2, wave: "sawtooth", pulse: true },
    trial:     { root: 82.4, scale: [0, 2, 3, 5, 7, 9, 10], tempo: 96, drone: 4, melody: 0.5, octave: 2, wave: "triangle", pulse: true },
  },
};
