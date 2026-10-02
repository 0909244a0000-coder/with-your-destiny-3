// エフェクト用の絵の設定。絵がない（null）ものは、今までの粒や円で表示する。
// 絵は黒い背景でもよい（光を重ねる描き方をするので、黒は透けて見える）。置き場所は docs/ART.md。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.vfx = {
  // 絵のファイル（例: slash: "assets/vfx/slash.png"）
  textures: {
    slash: "assets/vfx/slash.png",        // 斬撃の弧（バーバリアンの通常攻撃）
    whirl: "assets/vfx/whirl.png",        // 旋風の渦（旋風斬）
    iceNova: "assets/vfx/iceNova.png",      // 氷の衝撃の輪（フロストノヴァ）
    fireBurst: "assets/vfx/fireBurst.png",    // 炎の爆発（爆発・隕石の着地）
    fireGround: "assets/vfx/fireGround.png",   // 燃える地面（焦土・メテオ・劫火の腕輪）
    lightning: "assets/vfx/lightning.png",    // 稲妻（チェインライトニング・雷鳴）
    axe: "assets/vfx/axe.png",          // 回る投げ斧（連鎖の投げ斧）
    meteor: "assets/vfx/meteor.png",       // 落ちてくる隕石（メテオ）
    magicCircle: "assets/vfx/magicCircle.png",  // 足元の魔法陣（鉄の皮膚・マナシールド・狂戦士の怒り・魔力の奔流）
    shield: "assets/vfx/shield.png",       // 体を包む光の球（鉄の皮膚・マナシールドの間）
    chains: "assets/vfx/chains.png",       // 縛る鎖・氷（鉄鎖の束縛・凍てつく檻の間）
    shockwave: "assets/vfx/shockwave.png",    // 衝撃波の輪（ボスの大技）
    fireball: "assets/vfx/fireball.png", // 火の玉（ソーサレスの通常攻撃）
    plague: "assets/vfx/plague.png",
    trap: "assets/vfx/trap.png",       // アサシンの罠の装置（なければ三角の図形）   // 毒の霧の地面（疫病の霧・腐敗の地）
  },

  // 絵の動かし方（共通）
  //   duration … 出ている秒数、size … 大きさ（px。スキルの範囲があればそれに合わせる）
  //   scaleFrom/scaleTo … 出始めと終わりの大きさの倍率、spin … 1秒の回転（ラジアン）
  //   additive … 光を重ねる描き方（黒い背景が透ける）
  anim: {
    slash:       { duration: 0.18, size: 70,  scaleFrom: 0.8, scaleTo: 1.1, spin: 0,   additive: true },
    whirl:       { duration: 0.45, size: 0,   scaleFrom: 0.5, scaleTo: 1.1, spin: 14,  additive: true },
    iceNova:     { duration: 0.45, size: 0,   scaleFrom: 0.3, scaleTo: 1.1, spin: 1,   additive: true },
    fireBurst:   { duration: 0.5,  size: 0,   scaleFrom: 0.4, scaleTo: 1.2, spin: 0.5, additive: true },
    lightning:   { duration: 0.25, size: 0,   scaleFrom: 1,   scaleTo: 1,   spin: 0,   additive: true },
    axe:         { duration: 0.3,  size: 40,  scaleFrom: 1,   scaleTo: 1,   spin: 25,  additive: false },
    magicCircle: { duration: 0.8,  size: 120, scaleFrom: 0.6, scaleTo: 1.0, spin: 1.5, additive: true },
    shockwave:   { duration: 0.5,  size: 0,   scaleFrom: 0.3, scaleTo: 1.2, spin: 0,   additive: true },
  },

  // スキルを使ったときに出す絵（スキル名 → 絵の名前）
  skillCast: {
    whirl: "whirl", sorc_nova: "iceNova",
    vajra: "magicCircle", sorc_shield: "magicCircle",
    hanuman: "magicCircle", sorc_haste: "magicCircle",
    nagapasha: "magicCircle", sorc_freeze: "iceNova",
  },
  // 敵から敵へ飛ぶスキルの見た目（"segment" = 稲妻のように線でつなぐ、"hit" = 当たった敵ごとに絵）
  chainStyle: { sudarshana: { mode: "hit", key: "axe" }, sorc_chain: { mode: "segment", key: "lightning" } },
  // 地面に残るもの（燃える地面など）の絵。スキル名 → 絵の名前。ここにないスキルは fireGround。null なら絵を使わず色の円で描く
  groundStyle: {
    nec_plague: "plague", nec_nova: "plague",   // 毒の霧・腐敗の地
    sorc_nova: null, dru_tornado: null,          // 霜の地面・風の渦（炎の絵は合わないので色の円）
  },
  meteorFall: 0.45,     // メテオの隕石が落ちてくるまでの秒数
  trapImageScale: 2.6,  // 罠の絵の大きさ（罠の半径の何倍の幅で描くか）
  groundPulse: 0.08,    // 燃える地面のゆらぎの大きさ
};
