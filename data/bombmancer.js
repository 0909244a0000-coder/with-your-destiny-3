// 冥爆術師：威力・時間・演出の数値をここにまとめる。
window.WYD = window.WYD || {};
WYD.data.classes.bombmancer = {
  name: "冥爆術師", desc: "仮面の爆弾使い。敵に仕込む時限爆弾、追尾する使い魔、連鎖起爆で群れを崩す。仕込みも起爆も自動。",
  player: {
    className: "冥爆術師", weaponName: "触媒", color: "#d29cff", image: "assets/player_bombmancer.png", imageFilter: null,
    poses: { attack: "assets/player_bombmancer_attack.png" },
    preloadImages: ["assets/player_bombmancer_attack.png", "assets/bomb_hunter.png", "assets/vfx/bombOrb.png", "assets/vfx/bombBurst.png", "assets/vfx/bombSmoke.png", "assets/vfx/bombCloudBurst.webp", "assets/vfx/bombRingBurst.webp"],
    base: { maxHp: 105, attack: 10, defense: 1.5, attackSpeed: 1, critChance: 7, hpRegen: 1.1, moveSpeed: 125 },
    perLevel: { maxHp: 12, attack: 2.1, defense: 0.8 },
    rangedAttack: { range: 250, keepDistance: 155, speed: 430, size: 5, color: "#dda2ff", texture: "bombOrb" },
  },
  skills: {
    bomb_brand: { kind: "bomb", mode: "brand", name: "死の種", desc: "近い敵から時限爆弾を仕込む。1.2秒後、または宿主が倒れると周囲を爆破。ボスにも仕込める。", startLevel: 1, maxLevel: 10, cooldown: 4, range: 290, targetsBase: 2, targetsPerLevel: 0.3, radius: 70, fuse: 1.2, damageBase: 1.98, damagePerLevel: 0.37, color: "#db9aff" },
    bomb_cloak: { kind: "vajra", name: "灰の外套", desc: "HP60%以下で灰の外套をまとう。防御を上げ、HPを回復。", startLevel: 0, maxLevel: 10, cooldown: 10, duration: 6, defenseBase: 60, defensePerLevel: 9, healPercentBase: 12, healPercentPerLevel: 2, triggerHpPercent: 60, color: "#b7a5d8" },
    bomb_hunter: { kind: "bomb", mode: "hunter", name: "追葬の使い魔", desc: "仮面の使い魔が敵を追い、接触で爆発。標的が倒れたら別の敵へ向かう。", startLevel: 0, maxLevel: 10, cooldown: 5, range: 310, radius: 90, speed: 230, lifetime: 5, damageBase: 2.64, damagePerLevel: 0.462, color: "#ffc47b" },
    bomb_finale: { kind: "bomb", mode: "finale", name: "終幕の指鳴らし", desc: "仕込んだ爆弾を一斉起爆。爆弾がない時は敵1体へ仕込んで即起爆。仕込済みの爆弾は威力1.35倍で誘爆する。", startLevel: 0, maxLevel: 10, cooldown: 8, range: 300, radius: 105, chainBoost: 1.35, damageBase: 2.38, damagePerLevel: 0.422, color: "#ffba70" },
    bomb_mine: { kind: "bomb", mode: "mine", name: "葬送の地雷", desc: "敵の進路に地雷を置く。敵が近づくか3秒後に爆発。同時に3個まで。", startLevel: 0, maxLevel: 10, cooldown: 3, range: 280, placeAt: 0.6, radius: 90, triggerRadius: 40, fuse: 3, armTime: 0.35, maxBombs: 3, damageBase: 2.38, damagePerLevel: 0.396, color: "#ffa76a" },
    bomb_smoke: { kind: "nagapasha", name: "黒煙の檻", desc: "近づく敵を黒煙で縛り、ダメージを与える。ボスへの拘束は短い。", startLevel: 0, maxLevel: 10, cooldown: 10, radius: 160, minTargets: 1, bindBase: 1.8, bindPerLevel: 0.2, bossBindMult: 0.3, damageBase: 1.58, damagePerLevel: 0.343, color: "#b69acb" },
    bomb_haste: { kind: "hanuman", name: "静かな殺意", desc: "敵が近いと攻撃速度を上げる。通常攻撃の爆弾を次々と投げ、強くなった爆弾は周りの敵も巻きこむ（猛攻）。", startLevel: 0, maxLevel: 10, cooldown: 10, duration: 8, hasteBase: 65, hastePerLevel: 10, triggerRange: 260, color: "#d49aff" },
    bomb_cinders: { kind: "agni", name: "残火の庭", desc: "敵の集まる場所を紫の残火で焼き続ける。", startLevel: 0, maxLevel: 10, cooldown: 7, range: 280, radius: 90, duration: 4, tick: 0.5, damageBase: 0.66, damagePerLevel: 0.132, color: "#be85f4" },
    bomb_repose: { kind: "aura", auraType: "heal", name: "灰燼の安息", desc: "オーラ：自分と周囲の味方のHPを毎秒回復する。", startLevel: 0, maxLevel: 10, cooldown: 1, radius: 140, healPercentBase: 3.3, healPercentPerLevel: 0.66, color: "#d1b4de" },
  },
  autoBuild: ["bomb_brand", "bomb_cloak", "bomb_hunter"],
  skillOrder: ["bomb_cloak", "bomb_repose", "bomb_haste", "bomb_smoke", "bomb_brand", "bomb_hunter", "bomb_mine", "bomb_finale", "bomb_cinders"],
  skillIcons: Object.fromEntries(["brand", "cloak", "hunter", "finale", "mine", "smoke", "haste", "cinders", "repose"].map(k => ["bomb_" + k, "assets/skills/bomb_" + k + ".png"])),
};
WYD.data.mastery.perLevel.bomb = { critChance: 0.5 };
WYD.data.bombs = {
  maxActive: 24, chainDelay: 0.09, soundInterval: 0.12,
  visuals: { markSize: 26, mineSize: 30, hunterSize: 44, emberSize: 34, pulseSpeed: 8, pulseAlpha: 0.2, alpha: 0.8, burstScale: 2, burstDuration: 0.48, travelDuration: 0.22, shake: { strength: 2, time: 0.1 } },
};
Object.assign(WYD.data.runes.skills, {
  bomb_brand: [
    { id: "many", name: "種まき", desc: "仕込む敵 +2。威力0.8倍", mods: { targets: ["add", 2], damage: ["mul", 0.8] } },
    { id: "heavy", name: "処刑の種", desc: "仕込む敵は1体。威力1.7倍", mods: { targets: ["set", 1], targetsPerLevel: ["set", 0], damage: ["mul", 1.7] } },
    { id: "fast", name: "短い導火線", desc: "起爆まで0.45秒。使える間隔0.8倍", mods: { fuse: ["set", 0.45], cooldown: ["mul", 0.8] } },
  ],
  bomb_hunter: [
    { id: "swift", name: "追跡者", desc: "移動速度1.5倍。追える時間1.4倍", mods: { speed: ["mul", 1.5], lifetime: ["mul", 1.4] } },
    { id: "wide", name: "散華", desc: "爆発範囲1.4倍。威力0.85倍", mods: { radius: ["mul", 1.4], damage: ["mul", 0.85] } },
    { id: "heavy", name: "弔いの牙", desc: "威力1.5倍。使える間隔1.25倍", mods: { damage: ["mul", 1.5], cooldown: ["mul", 1.25] } },
  ],
  bomb_finale: [
    { id: "echo", name: "大合唱", desc: "誘爆の威力1.6倍、範囲1.2倍", mods: { chainBoost: ["set", 1.6], radius: ["mul", 1.2] } },
    { id: "quick", name: "即決", desc: "使える間隔0.65倍。威力0.8倍", mods: { cooldown: ["mul", 0.65], damage: ["mul", 0.8] } },
    { id: "blood", name: "命の喝采", desc: "終幕と終幕で誘爆した爆弾の与ダメージの5%を回復", extra: { lifesteal: 5 } },
  ],
  bomb_mine: [
    { id: "many", name: "埋葬地", desc: "同時に5個まで。威力0.8倍", mods: { maxBombs: ["set", 5], damage: ["mul", 0.8] } },
    { id: "wide", name: "破片の雨", desc: "爆発範囲1.4倍", mods: { radius: ["mul", 1.4] } },
    { id: "heavy", name: "深い墓穴", desc: "威力1.6倍。使える間隔1.4倍", mods: { damage: ["mul", 1.6], cooldown: ["mul", 1.4] } },
  ],
  bomb_cloak: WYD.data.runes.skills.vajra.map(r => ({ ...r })),
  bomb_smoke: WYD.data.runes.skills.nagapasha.map(r => ({ ...r })),
  bomb_haste: WYD.data.runes.skills.hanuman.map(r => ({ ...r })),
  bomb_cinders: WYD.data.runes.skills.agni.map(r => ({ ...r })),
  bomb_repose: WYD.data.runes.skills.sorc_warmth.map(r => ({ ...r })),
});
// 爆発の絵：ふつうの爆弾は紫と橙の爆炎、終幕の一斉起爆（終幕で起爆した爆弾も）と地雷は輪の爆発（data/vfx.js の bombTexture／bombTextureBySkill）
Object.assign(WYD.data.vfx.textures, { bombCloudBurst: "assets/vfx/bombCloudBurst.webp", bombRingBurst: "assets/vfx/bombRingBurst.webp" });
Object.assign(WYD.data.vfx.anim, { bombCloudBurst: { duration: 0.5, scaleFrom: 0.35, scaleTo: 1.15, spin: 0.3, additive: true }, bombRingBurst: { duration: 0.6, scaleFrom: 0.3, scaleTo: 1.2, spin: 0.5, additive: true } });
WYD.data.vfx.bombTexture = "bombCloudBurst";
WYD.data.vfx.bombTextureBySkill = { bomb_finale: "bombRingBurst", bomb_mine: "bombRingBurst" };
Object.assign(WYD.data.vfx.textures, { bombOrb: "assets/vfx/bombOrb.png", bombBurst: "assets/vfx/bombBurst.png", bombSmoke: "assets/vfx/bombSmoke.png", bombHunter: "assets/bomb_hunter.png" });
Object.assign(WYD.data.vfx.anim, { bombOrb: { duration: 0.34, size: 34, additive: true }, bombBurst: { duration: 0.48, scaleFrom: 0.35, scaleTo: 1.15, additive: true }, bombSmoke: { duration: 0.65, scaleFrom: 0.6, scaleTo: 1.1, additive: true } });
Object.assign(WYD.data.vfx.castOverrides, { bomb_cloak: { key: "bombSmoke" }, bomb_haste: { key: "bombSmoke" }, bomb_smoke: { key: "bombSmoke" }, bomb_repose: { key: "bombSmoke" } });
WYD.data.vfx.hitByClass.bombmancer = "hitShadow";
WYD.data.vfx.fieldCast.bomb_cinders = "bombBurst";
WYD.data.vfx.groundStyle.bomb_cinders = "bombSmoke";
WYD.data.vfx.bindStyle.bombmancer = "bombSmoke";
// 既存の固有能力・セットの仕組みを使い、冥爆術師だけの狙い周回も用意。
WYD.data.uniques.list.push(
  { id: "funeralWatch", home: "cathedral", name: "葬送の懐中時計", base: "amulet", weight: 10, classOnly: "bombmancer", stats: { critChance: [3, 6], skillDamage: [8, 16] }, power: "skillBoostFuneralWatch", desc: "爆弾スキルの威力1.15倍、時限爆弾の起爆までの時間0.7倍", params: { kind: "bomb", mods: { damage: ["mul", 1.15], fuse: ["mul", 0.7] } } },
  { id: "ashGloves", home: "smashana", name: "灰葬の手袋", base: "gauntlets", weight: 10, classOnly: "bombmancer", stats: { attack: [3, 6], maxHp: [15, 30] }, power: "skillBoostAshGloves", desc: "爆弾スキルの爆発範囲1.3倍、威力0.9倍", params: { kind: "bomb", mods: { radius: ["mul", 1.3], damage: ["mul", 0.9] } } },
);
WYD.data.sets.list.push({
  id: "mourningCourt", home: "patala", name: "灰燼宮の礼装", classOnly: "bombmancer",
  pieces: [
    { id: "mourning_staff", name: "灰燼宮の触媒", base: "staff", stats: { attack: [4, 8], skillDamage: [8, 14] } },
    { id: "mourning_robe", name: "灰燼宮の外套", base: "robe", stats: { maxHp: [20, 40] } },
    { id: "mourning_gloves", name: "灰燼宮の手袋", base: "gauntlets", stats: { critChance: [2, 5] } },
    { id: "mourning_ring", name: "灰燼宮の指輪", base: "ring", stats: { defense: [3, 6] } },
  ],
  bonuses: { 2: { stats: { skillDamage: 20, maxHp: 40 } }, 4: { effects: { lifesteal: 2 }, power: "skillBoostMourningCourt", params: { kind: "bomb", mods: { damage: ["mul", 1.6], cooldown: ["mul", 0.85] } }, desc: "爆弾スキルの威力1.6倍、使える間隔0.85倍" } },
});

// 共通のセット・ユニークのうち、旋風斬・連鎖の投げ斧に結びついた効果は冥爆術師では発動しなかった。
// 冥爆術師のときだけ、同じ方向性（炎・跳ねる刃）の爆弾向けの効果に差し替える（ほかの数値はそのまま）。
//   bombEmbers   … 爆発の地点が燃える。maxFields：燃える地面の同時数の上限（爆弾は数が多いので）
//   bombShrapnel … 爆発に巻き込まれなかった近くの敵へ破片が飛ぶ
const bombEmbers = { power: "bombEmbers", params: { radius: 70, duration: 2.5, tick: 0.5, mult: 0.3, maxFields: 6, color: "#ff7a2a" },
  desc: "爆弾の爆発した地点が{duration}秒燃え、{tick}秒ごとに攻撃力×{mult}倍で焼く（同時に{maxFields}か所まで）" };
const bombShrapnel = { power: "bombShrapnel", params: { extraTargets: 3, damagePercent: 50, range: 160, color: "#dda2ff" },
  desc: "爆弾が爆発すると、巻き込まれなかった近くの敵{extraTargets}体へ破片が飛び、爆発の{damagePercent}%のダメージ" };
for (const u of WYD.data.uniques.list) {
  if (u.id === "agniBangle") (u.classPowers ||= {}).bombmancer = bombEmbers;
  if (u.id === "vishnuDisc") (u.classPowers ||= {}).bombmancer = bombShrapnel;
}
for (const set of WYD.data.sets.list) {
  if (set.id === "pyre") (set.classBonuses ||= {}).bombmancer = { 4: { effects: { critDamage: 40 }, ...bombEmbers } };
  if (set.id === "thunderlord") (set.classBonuses ||= {}).bombmancer = { 4: { stats: { skillDamage: 25 }, ...bombShrapnel } };
}
for (const c of WYD.data.devotion.list) if (c.id === "storm") (c.bonus.classPowers ||= {}).bombmancer = bombShrapnel;
WYD.data.results.labels["effect:bombEmbers"] = { name: "爆弾の残り火", group: "装備効果", color: "#ff7a2a" };
WYD.data.results.labels["effect:bombShrapnel"] = { name: "爆弾の破片", group: "装備効果", color: "#dda2ff" };
