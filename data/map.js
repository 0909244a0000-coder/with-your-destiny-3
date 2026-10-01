// マップの設定。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.map = {
  name: "マンダラの森",
  width: 960,
  height: 600,
  bgColor: "#2b3a2a",
  maxEnemies: 6,        // 同時に出る敵の最大数
  spawnInterval: 1.2,   // 敵が出てくる間隔（秒）
  spawnMinDistance: 220,// プレイヤーからこれ以上離れた場所に出る
  decorationCount: 40,  // 飾り（草・石）の数
  decorationSeed: 7,
};
