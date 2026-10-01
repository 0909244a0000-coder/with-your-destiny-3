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
  decorationCount: 40,  // 飾り（草・石）の数
  decorationSeed: 7,
};
