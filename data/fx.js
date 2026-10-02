// エフェクト（火花・血しぶき・光・画面の揺れ）の数値。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.fx = {
  maxParticles: 700,     // 同時に出せる粒の数（重くなったら減らす）

  // 粒の出し方：count = 数、speed = 飛ぶ速さ、life = 消えるまでの秒数、size = 大きさ
  hit:      { count: 6,  speed: 140, life: 0.35, size: 2.2, color: "#fff2c0" },  // 攻撃が当たった火花
  blood:    { count: 5,  speed: 90,  life: 0.5,  size: 2.6 },                    // 敵の色の血しぶき
  crit:     { count: 14, speed: 220, life: 0.45, size: 2.8, color: "#ffd447" },  // 会心の火花
  // 倒れた敵の体：time 秒かけて横にたおれ（tilt ラジアン）、沈みながら消える。maxCount 体まで
  corpse:   { time: 0.7, tilt: 1.3, sink: 0.25, maxCount: 30 },
  death:    { count: 18, speed: 150, life: 0.7,  size: 3.2 },                    // 敵が倒れたとき（敵の色）
  bigDeath: { count: 70, speed: 260, life: 1.2,  size: 4.0 },                    // 精鋭・ボスが倒れたとき
  playerHit:{ count: 6,  speed: 110, life: 0.4,  size: 2.4, color: "#ff4a4a" },  // 主人公が殴られたとき
  whirl:    { count: 28, speed: 60,  life: 0.45, size: 2.4, color: "#bfefff" },  // 旋風斬の風
  ember:    { perSecond: 30, speed: 40, life: 0.8, size: 2.2, color: "#ffb04a" },// 燃える地面の火の粉
  aura:     { count: 6,  speed: 150, life: 0.5,  size: 2.2 },                    // オーラ「聖なる炎」の火の粉（オーラの色）
  formGlow: { radiusMult: 1.6, alpha: 0.18, pulseAlpha: 0.08, pulseSpeed: 4 },   // 変身中の体のまわりの光（ドルイド）
  auraRing: { linger: 0.3, alpha: 0.25, pulseAlpha: 0.2, pulseSpeed: 3, flatten: 0.4 },  // オーラの足元の輪
  levelUp:  { count: 60, speed: 80,  life: 1.4,  size: 3.0, color: "#ffe680" },  // レベルアップの光
  slamDust: { count: 50, speed: 260, life: 0.6,  size: 3.4, color: "#c9a27a" },  // ボスの大技の土煙

  gravity: 220,          // 粒が下に落ちる強さ（血しぶきなど）

  // 画面の揺れ（strength = 揺れの大きさ px、time = 秒）
  shakeSlam: { strength: 9, time: 0.35 },
  shakeBossDeath: { strength: 12, time: 0.6 },
  shakeEliteDeath: { strength: 4, time: 0.25 },

  // ダメージの数字
  text: {
    life: 0.9,           // 消えるまでの秒数
    size: 14,            // ふつうの大きさ
    critSize: 22,        // 会心の大きさ
    pop: 1.8,            // 出た瞬間に何倍にふくらむか
    rise: 40,            // 1秒に上がる距離
  },

  // 落ちている装備の光の柱（レア度 → 柱の高さ。書いていないレア度は柱なし）
  lootBeam: { rare: 40, legend: 90, unique: 110, set: 110 },
};
