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
    trap: "assets/vfx/trap.png",
    boneSpear: "assets/vfx/boneSpear.png",   // 骨の飛槍
    holyHammer: "assets/vfx/holyHammer.png", // 祝福の鎚
    shuriken: "assets/vfx/shuriken.png",     // 連鎖の手裏剣
    boulder: "assets/vfx/boulder.png",       // 転がる岩
    tornado: "assets/vfx/tornado.png",       // 竜巻
    boneStorm: "assets/vfx/boneStorm.png",   // 骨の嵐
    holyGround: "assets/vfx/holyGround.png", // 天の裁きの地面
    vines: "assets/vfx/vines.png",           // 絡みつく蔓（ドルイドが縛った敵）       // アサシンの罠の装置（なければ三角の図形）   // 毒の霧の地面（疫病の霧・腐敗の地）
  },

  // 絵の動かし方（共通）
  //   duration … 出ている秒数、size … 大きさ（px。スキルの範囲があればそれに合わせる）
  //   scaleFrom/scaleTo … 出始めと終わりの大きさの倍率、spin … 1秒の回転（ラジアン）
  //   additive … 光を重ねる描き方（黒い背景が透ける）
  anim: {
    slash:       { duration: 0.18, size: 70,  scaleFrom: 0.8, scaleTo: 1.1, spin: 0,   additive: true },
    whirl:       { duration: 0.45, size: 0,   scaleFrom: 0.5, scaleTo: 1.1, spin: 14,  additive: true, echo: true },
    iceNova:     { duration: 0.45, size: 0,   scaleFrom: 0.3, scaleTo: 1.1, spin: 1,   additive: true, echo: true },
    fireBurst:   { duration: 0.5,  size: 0,   scaleFrom: 0.4, scaleTo: 1.2, spin: 0.5, additive: true, echo: true },
    lightning:   { duration: 0.25, size: 0,   scaleFrom: 1,   scaleTo: 1,   spin: 0,   additive: true },
    axe:         { duration: 0.3,  size: 40,  scaleFrom: 1,   scaleTo: 1,   spin: 25,  additive: false },
    magicCircle: { duration: 0.8,  size: 120, scaleFrom: 0.6, scaleTo: 1.0, spin: 1.5, additive: true },
    shockwave:   { duration: 0.5,  size: 0,   scaleFrom: 0.3, scaleTo: 1.2, spin: 0,   additive: true },
    boneSpear:   { duration: 0.3,  size: 72,  scaleFrom: 1,   scaleTo: 1,   spin: 0,   additive: false, angleOffset: 0.785 },
    holyHammer:  { duration: 0.35, size: 50,  scaleFrom: 1,   scaleTo: 1,   spin: 20,  additive: false },
    shuriken:    { duration: 0.3,  size: 40,  scaleFrom: 1,   scaleTo: 1,   spin: 30,  additive: false },
    boulder:     { duration: 0.35, size: 50,  scaleFrom: 1,   scaleTo: 0.9, spin: 10,  additive: false },
    tornado:     { duration: 0.55, size: 0,   scaleFrom: 0.5, scaleTo: 1.1, spin: 10,  additive: true, echo: true },
    boneStorm:   { duration: 0.45, size: 0,   scaleFrom: 0.4, scaleTo: 1.15, spin: 3,  additive: true, echo: true },
    vines:       { duration: 0.6,  size: 0,   scaleFrom: 0.5, scaleTo: 1.0, spin: 1,   additive: true, echo: true },
  },

  // 動きの演出（共通）
  //   pop … 出た瞬間に少し大きくなってから戻る割合（ぽんっと出る）
  //   echo … echo: true の絵は、うすく大きい2枚目を逆向きに回して重ねる（厚みを出す）
  //   trail … 飛んでいく絵の残像（数・間隔の秒数・最初の濃さ）
  //   flySpeed … 飛んでいく絵の速さ（px/秒）。impact … 着いたところに出す衝撃の輪（絵の名前と大きさ）
  pop: 0.18,
  echo: { scale: 1.3, alpha: 0.35, spin: -0.6 },
  trail: { count: 4, gap: 0.025, alpha: 0.45 },
  flySpeed: 900,
  impact: { key: "shockwave", size: 46, duration: 0.25 },
  // スキルを使ったときの画面の揺れ（スキルのしくみ → 強さと秒数）
  castShake: { whirl: { strength: 2.5, time: 0.12 }, agni: { strength: 3.5, time: 0.16 }, nagapasha: { strength: 2, time: 0.1 }, shift: { strength: 3, time: 0.15 } },

  // スキルを使ったときに出す絵（スキル名 → 絵の名前）
  skillCast: {
    whirl: "whirl", sorc_nova: "iceNova",
    vajra: "magicCircle", sorc_shield: "magicCircle",
    hanuman: "magicCircle", sorc_haste: "magicCircle",
    nagapasha: "magicCircle", sorc_freeze: "iceNova",
    dru_tornado: "tornado", nec_nova: "boneStorm", dru_vines: "vines",
  },
  // 敵から敵へ飛ぶスキルの見た目（"segment" = 稲妻のように線でつなぐ、"hit" = 当たった敵ごとに絵）
  // "fly" = 前の敵から次の敵へ、残像をひいて飛んでいき、着いたところに衝撃の輪
  chainStyle: { sudarshana: { mode: "fly", key: "axe" }, sorc_chain: { mode: "segment", key: "lightning" },
    nec_spear: { mode: "fly", key: "boneSpear", face: true }, pal_hammer: { mode: "fly", key: "holyHammer" },
    asn_shuriken: { mode: "fly", key: "shuriken" }, dru_boulder: { mode: "fly", key: "boulder" } },
  // 地面に残るもの（燃える地面など）の絵。スキル名 → 絵の名前。ここにないスキルは fireGround。null なら絵を使わず色の円で描く
  groundStyle: {
    nec_plague: "plague", nec_nova: "plague",   // 毒の霧・腐敗の地
    sorc_nova: null, dru_tornado: "tornado",     // 霜の地面（炎の絵は合わないので色の円）・風の渦
    pal_judgment: "holyGround", pal_fire: "holyGround",   // 聖なる光
  },
  // 縛られた敵に重ねる絵（職業 → 絵の名前。ここにない職業は chains）
  bindStyle: { druid: "vines" },
  meteorFall: 0.45,     // メテオの隕石が落ちてくるまでの秒数
  trapImageScale: 2.6,  // 罠の絵の大きさ（罠の半径の何倍の幅で描くか）
  groundPulse: 0.08,    // 燃える地面のゆらぎの大きさ
};
