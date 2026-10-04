// 拠点（野営地）：敵の出ない安全な場所。戦いの画面の「🏕 拠点へ」か H キーで行き来する。
// 行くとHPが全快し、戦いは止まる。「⚔ 戦場へ」で、もとのエリア・階にもどる（その階の敵は出直す）。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.town = {
  name: "野営地",
  label: "（安全）",
  hint: "ここでは敵は出ません。「🎒 装備・持ち物」でゆっくり整えて、「⚔ 戦場へ」でもどります",
  enterText: "野営地にもどった。ここは安全（HPが全快した）",
  leaveText: "戦場へもどった",
  trialText: "試練の最中は野営地にもどれない",
  // 見た目
  ground: "#1b150f",          // 地面の色
  groundImage: "assets/areas/forest.png",   // 地面の絵（暗くして敷く。なければ色だけ）
  groundDim: 0.6,             // 地面の絵を暗くする強さ
  // image があれば絵で描く（size = 絵の幅。絵がなければ図形）
  fire: { x: 480, y: 330, radius: 26, glow: 230, color: "rgba(255,150,60,0.55)", flicker: 0.12, image: "assets/town/fire.png", size: 96 },   // たき火
  tent: { x: 330, y: 250, w: 120, h: 90, color: "#4a3a28", edge: "#8a6d32", image: "assets/town/tent.png", size: 210 },   // テント
  chest: { x: 640, y: 300, w: 46, h: 30, color: "#5a3e22", edge: "#d9a441", image: "assets/town/chest.png", size: 84 },   // 倉庫の箱
  playerPos: { x: 440, y: 360 },   // 主人公が立つ場所
};
