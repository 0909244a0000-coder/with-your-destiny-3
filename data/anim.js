// 絵の動き（1枚の絵を、ゆらす・のばす・かたむける・ずらすで動かして見せる）の数値。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.anim = {
  breath: { speed: 2.4, amount: 0.035 },  // 立っているときの呼吸（のび縮みの速さと大きさ）
  walk: { speed: 11, bob: 3.5, tilt: 0.07 },// 歩くときの上下のはずみ（px）と左右のかたむき
  attack: { time: 0.18, lunge: 10, tilt: 0.18 }, // 攻撃の踏み込み（秒・px・かたむき）
  hitKnock: 5,          // 攻撃を受けたときに後ろにずれる距離（px）
  bindColor: "#5fd9a0", // 縛られている敵の輪の色
  faceTarget: true,     // 進む向き・相手の向きに合わせて絵を左右反転するか
  boss: {
    idleSway: 0.04,     // ボスの立っているときのゆれ（かたむき）
    windupGrow: 0.18,   // 大技の溜めで大きくなる割合
    windupShake: 3,     // 大技の溜めで震える大きさ（px）
    slamSquash: 0.25,   // 大技を打ったあとにつぶれる割合
  },
};
