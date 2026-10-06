// エフェクト用の絵の設定。絵がない（null）ものは、今までの粒や円で表示する。
// 絵は黒い背景でもよい（光を重ねる描き方をするので、黒は透けて見える）。置き場所は docs/ART.md。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.vfx = {
  // 線画の紋章を使わず、煙・炎・光の絵で発動の質感を分ける。
  castProfiles: {
    vajra: { key: "holyWisp", size: 108, duration: 0.65, from: 0.55, to: 1.05, alpha: 0.65, flatten: 0.9, rise: 22 },
    hanuman: { key: "rageWisp", size: 126, duration: 0.7, from: 0.55, to: 1.15, alpha: 0.75, flatten: 0.9, rise: 26 },
    nagapasha: { key: "chains", size: 112, duration: 0.55, from: 1.1, to: 0.65, alpha: 0.6, flatten: 0.65 },
    raise: { key: "graveWisp", size: 132, duration: 0.85, from: 0.55, to: 1.2, alpha: 0.65, flatten: 0.8, rise: 22 },
    shift: { key: "rageWisp", size: 132, duration: 0.65, from: 0.55, to: 1.1, alpha: 0.7, flatten: 0.85, rise: 22 },
    trap: { key: "shadowWisp", size: 94, duration: 0.55, from: 0.6, to: 1.1, alpha: 0.55, flatten: 0.65 },
    aura: { key: "holyWisp", size: 118, duration: 0.7, from: 0.5, to: 1.15, alpha: 0.55, flatten: 0.65, rise: 12 },
  },
  castOverrides: {
    sorc_shield: { key: "arcaneBarrier", size: 116, duration: 0.6, alpha: 0.7, flatten: 1, rise: 0 }, sorc_haste: { key: "shadowWisp", alpha: 0.65 },
    nec_armor: { key: "boneCarapace", size: 116, duration: 0.6, alpha: 0.7, flatten: 1, rise: 0 }, asn_cloak: { key: "shadowWisp" }, asn_burst: { key: "shadowWisp" },
    asn_shadow: { key: "shadowWisp" }, sorc_hydra: { key: "rageWisp" },
    dru_wolves: { key: "graveWisp" }, dru_bark: { key: "oakBulwark", size: 116, duration: 0.6, alpha: 0.75, flatten: 1, rise: 0 },
    pal_fire: { key: "rageWisp" }, nec_decay: { key: "graveWisp" }, sorc_static: { key: "shadowWisp" },
  },
  trapShot: { duration: 0.28, size: 42, alpha: 0.8, tailCount: 2, tailGap: 0.06, tailAlpha: 0.22 },
  trapStyles: { sorc_hydra: "fireball", asn_sentry: "lightning", asn_death: "shadowWisp" },
  fieldCast: { nec_plague: "plague", pal_judgment: "holyGround", dru_fissure: "fireBurst", asn_fire: "fireBurst" },
  auraMist: { alpha: 0.14, pulseAlpha: 0.05, spin: 0.12, radiusRatio: 0.9 },
  // 範囲全体を白く塗らず、術者の姿と形で見分ける。性能/有効範囲には使わない。
  buffStyles: {
    sorceress: { key: "arcaneBarrier", sizeRatio: 1.4, alphaFactor: 0.55 },
    necromancer: { key: "boneCarapace", sizeRatio: 1.4, alphaFactor: 0.7 },
    druid: { key: "oakBulwark", sizeRatio: 1.5, alphaFactor: 0.8 },
  },
  auraStyles: {
    pal_prayer: { key: "sanctuaryBloom", size: 110, alphaFactor: 0.7 },
    pal_might: { key: "warEmbers", size: 100, alphaFactor: 0.7 },
  },
  groundAlpha: 0.9,

  // 絵のファイル（例: slash: "assets/vfx/slash.png"）
  textures: {
    graveWisp: "assets/vfx/graveWisp.png",
    rageWisp: "assets/vfx/rageWisp.png",
    holyWisp: "assets/vfx/holyWisp.png",
    shadowWisp: "assets/vfx/shadowWisp.png",
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
    vines: "assets/vfx/vines.png",           // 絡みつく蔓（ドルイドが縛った敵）
    slashHoly: "assets/vfx/slashHoly.png",   // パラディンの斬撃
    slashClaw: "assets/vfx/slashClaw.png",   // アサシンの三本爪
    slashBeast: "assets/vfx/slashBeast.png", // ドルイドの獣の爪痕
    hitSpark: "assets/vfx/hitSpark.png",     // 当たったときの火花（白）
    hitFire: "assets/vfx/hitFire.png",       // 炎
    hitIce: "assets/vfx/hitIce.png",         // 氷
    hitHoly: "assets/vfx/hitHoly.png",       // 聖なる光
    hitPoison: "assets/vfx/hitPoison.png",   // 毒・死霊
    hitShadow: "assets/vfx/hitShadow.png",   // 影       // アサシンの罠の装置（なければ三角の図形）   // 毒の霧の地面（疫病の霧・腐敗の地）
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
    slashHoly:   { duration: 0.2,  size: 86,  scaleFrom: 0.8, scaleTo: 1.1, spin: 0,   additive: true, boost: 2 },
    slashClaw:   { duration: 0.2,  size: 80,  scaleFrom: 0.8, scaleTo: 1.1, spin: 0,   additive: true, boost: 2 },
    slashBeast:  { duration: 0.2,  size: 84,  scaleFrom: 0.8, scaleTo: 1.1, spin: 0,   additive: true, boost: 2 },
    hitSpark:    { duration: 0.3, size: 74,  scaleFrom: 0.5, scaleTo: 1.2, spin: 2,   additive: true },
    hitFire:     { duration: 0.3, size: 80,  scaleFrom: 0.5, scaleTo: 1.2, spin: 1,   additive: true },
    hitIce:      { duration: 0.3, size: 76,  scaleFrom: 0.5, scaleTo: 1.2, spin: 1,   additive: true },
    hitHoly:     { duration: 0.3, size: 80,  scaleFrom: 0.5, scaleTo: 1.2, spin: 0,   additive: true },
    hitPoison:   { duration: 0.3, size: 80,  scaleFrom: 0.5, scaleTo: 1.2, spin: 1,   additive: true },
    hitShadow:   { duration: 0.3, size: 76,  scaleFrom: 0.5, scaleTo: 1.2, spin: 2,   additive: true },
  },

  // 動きの演出（共通）
  //   pop … 出た瞬間に少し大きくなってから戻る割合（ぽんっと出る）
  //   echo … echo: true の絵は、うすく大きい2枚目を逆向きに回して重ねる（厚みを出す）
  //   boost … アニメの項目に boost: 回数 があると、光を重ねて明るくする（暗い地面で見えにくい絵に）
  //   trail … 飛んでいく絵の残像（数・間隔の秒数・最初の濃さ）
  //   flySpeed … 飛んでいく絵の速さ（px/秒）。impact … 着いたところに出す衝撃の輪（絵の名前と大きさ）
  pop: 0.18,
  echo: { scale: 1.3, alpha: 0.35, spin: -0.6 },
  trail: { count: 4, gap: 0.025, alpha: 0.45 },
  flySpeed: 900,
  impact: { key: "shockwave", size: 46, duration: 0.25 },
  // 当たったときの火花：スキル → 絵、なければ職業 → 絵。会心は大きく。画面のエフェクトが maxEffects より多いときは出さない（重くならないように）
  hitBySkill: {
    sorc_nova: "hitIce", sorc_freeze: "hitIce", sorc_meteor: "hitFire", agni: "hitFire", sorc_chain: "hitSpark",
    pal_judgment: "hitHoly", pal_hammer: "hitHoly", pal_fire: "hitFire",
    nec_spear: "hitPoison", nec_nova: "hitPoison", nec_plague: "hitPoison",
    asn_fire: "hitFire", asn_shuriken: "hitShadow", asn_blade: "hitShadow",
    dru_fissure: "hitFire", dru_boulder: "hitSpark", dru_tornado: "hitSpark",
  },
  hitByClass: { barbarian: "hitSpark", sorceress: "hitFire", necromancer: "hitPoison", paladin: "hitHoly", assassin: "hitShadow", druid: "hitSpark" },
  hitCritScale: 1.5,
  maxEffects: 140,

  // 専用4コマ。絵の範囲は命中判定ではなく演出サイズ。倍率や上限はここだけで管理。
  impactSkills: { whirl: "steelWhirl", sorc_nova: "frostCrown", nec_nova: "corpseBloom", asn_blade: "violetAmbush" },
  placedSkills: ["dru_tornado", "pal_judgment", "pal_prayer", "pal_might"],
  stormTexture: "stormColumn",
  bombTexture: "voidDetonation",
  atlasQuietAlpha: 0.65,
  atlases: {
    steelWhirl: { columns: 2, rows: 2, frames: 4, alpha: 0.8, anchorY: 0.5, maxSize: 240 },
    frostCrown: { columns: 2, rows: 2, frames: 4, alpha: 0.78, anchorY: 0.5, maxSize: 240 },
    corpseBloom: { columns: 2, rows: 2, frames: 4, alpha: 0.8, anchorY: 0.68, maxSize: 220 },
    holyJudgment: { columns: 2, rows: 2, frames: 4, alpha: 0.8, anchorY: 0.8, maxSize: 240 },
    violetAmbush: { columns: 2, rows: 2, frames: 4, alpha: 0.85, anchorY: 0.5, maxSize: 190 },
    stormColumn: { columns: 2, rows: 2, frames: 4, alpha: 0.75, anchorY: 0.8, maxSize: 210, loopFrames: [1, 2] },
    voidDetonation: { columns: 2, rows: 2, frames: 4, alpha: 0.75, anchorY: 0.5, maxSize: 230 },
    arcaneBarrier: { columns: 2, rows: 2, frames: 4, alpha: 0.7, anchorY: 0.5, maxSize: 150, loopFrames: [1, 2] },
    boneCarapace: { columns: 2, rows: 2, frames: 4, alpha: 0.8, anchorY: 0.5, maxSize: 150, loopFrames: [1, 2] },
    oakBulwark: { columns: 2, rows: 2, frames: 4, alpha: 0.8, anchorY: 0.5, maxSize: 170, loopFrames: [1, 2] },
    sanctuaryBloom: { columns: 2, rows: 2, frames: 4, alpha: 0.75, anchorY: 0.72, maxSize: 140, loopFrames: [1, 2] },
    warEmbers: { columns: 2, rows: 2, frames: 4, alpha: 0.75, anchorY: 0.72, maxSize: 130, loopFrames: [1, 2] },
  },

  // スキルを使ったときの画面の揺れ（スキルのしくみ → 強さと秒数）
  castShake: { whirl: { strength: 2.5, time: 0.12 }, agni: { strength: 3.5, time: 0.16 }, nagapasha: { strength: 2, time: 0.1 }, shift: { strength: 3, time: 0.15 } },

  // スキルを使ったときに出す絵（スキル名 → 絵の名前）
  skillCast: {
    whirl: "whirl", sorc_nova: "iceNova",
    sorc_freeze: "iceNova",
    dru_tornado: "tornado", nec_nova: "boneStorm", dru_vines: "vines",
  },
  // 敵から敵へ飛ぶスキルの見た目（"segment" = 稲妻のように線でつなぐ、"hit" = 当たった敵ごとに絵）
  // "fly" = 前の敵から次の敵へ、残像をひいて飛んでいき、着いたところに衝撃の輪
  chainStyle: { sudarshana: { mode: "fly", key: "axe" }, sorc_chain: { mode: "segment", key: "lightning" },
    nec_spear: { mode: "fly", key: "boneSpear", face: true, impact: "hitPoison" }, pal_hammer: { mode: "fly", key: "holyHammer", impact: "hitHoly" },
    asn_shuriken: { mode: "fly", key: "shuriken", impact: "hitShadow" }, dru_boulder: { mode: "fly", key: "boulder" } },
  // 地面に残るもの（燃える地面など）の絵。スキル名 → 絵の名前。ここにないスキルは fireGround。null なら絵を使わず色の円で描く
  groundStyle: {
    nec_plague: "plague", nec_nova: "plague",   // 毒の霧・腐敗の地
    sorc_nova: null, dru_tornado: "tornado",     // 霜の地面（炎の絵は合わないので色の円）・風の渦
    pal_judgment: "holyGround", pal_fire: "holyGround",   // 聖なる光
  },
  // 縛られた敵に重ねる絵（職業 → 絵の名前。ここにない職業は chains）
  bindStyle: { druid: "vines" },
  meteorFall: 0.45,     // メテオの隕石が落ちてくるまでの秒数
  trapRangeAlpha: 0.05, // 射程の目安は発射中だけ薄く。常時の大きな点線円は出さない
  trapImageScale: 2.6,  // 罠の絵の大きさ（罠の半径の何倍の幅で描くか）
  groundPulse: 0.08,    // 燃える地面のゆらぎの大きさ
};

// 旧画像は残す。新規技へ流用するときは必ずコマ切り出し描画を通す。
for (const key of Object.keys(WYD.data.vfx.atlases)) {
  WYD.data.vfx.textures[key] = "assets/vfx/" + key + "Atlas.webp";
  WYD.data.vfx.anim[key] = { duration: 0.6, scaleFrom: 0.9, scaleTo: 1.05, additive: true };
}
WYD.data.vfx.anim.violetAmbush.duration = 0.32;
WYD.data.vfx.anim.holyJudgment.duration = 0.75;
WYD.data.vfx.anim.stormColumn.duration = 0.7;
for (const style of [...Object.values(WYD.data.vfx.buffStyles), ...Object.values(WYD.data.vfx.auraStyles)]) WYD.data.vfx.anim[style.key].duration = 1.4;
WYD.data.vfx.fieldCast.pal_judgment = "holyJudgment";
