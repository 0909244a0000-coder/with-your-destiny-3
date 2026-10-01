// マップの設定（全エリア共通）。エリアごとの設定は data/areas.js。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.map = {
  width: 960,
  height: 600,
  maxEnemies: 6,        // 同時に出る敵の最大数
  spawnInterval: 1.2,   // 敵が出てくる間隔（秒）
  spawnMinDistance: 220,// プレイヤーからこれ以上離れた場所に出る
  projectileLifetime: 3,// 弾が消えるまでの秒数
  spriteScale: 4,       // 絵の大きさ（体の大きさ×これ の正方形で描く）
  spriteShadow: 0.45,   // 絵の足元の影の濃さ（0〜1）
  groundDim: 0.35,      // 地面の絵を暗くする強さ（0〜1）。キャラを目立たせるため
  // 明かり：主人公のまわりだけ明るく、離れるほど暗くする（ディアブロの「たいまつの明かり」）
  light: {
    inner: 170,         // この距離までは暗くならない
    outer: 520,         // この距離で一番暗くなる
    darkness: 0.72,     // 一番暗いところの暗さ（0〜1）
  },
  playerRing: 0.8,      // 主人公の足元の輪の濃さ（0〜1）。主人公がどこにいるか分かるように
  decorationCount: 40,  // 飾り（草・石）の数
  decorationSeed: 7,
};
