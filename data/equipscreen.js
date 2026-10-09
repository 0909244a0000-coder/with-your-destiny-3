// 装備画面（src/equipscreen.js）の数値と並び。リネレボ風：左右に装備の枠、真ん中にキャラ、右に持ち物、下に能力。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.equipScreen = {
  // キャラの左右に並べる装備の枠（data/items.js の slots）
  leftSlots: ["weapon", "head", "body", "hands", "feet"],
  rightSlots: ["offhand", "neck", "ring", "waist"],
  // 持ち物の絞り込み。slots = 入る部位（なし = すべて）、rarities = レア度、socketed = 宝石つきだけ
  tabs: [
    { id: "all", label: "すべて" },
    { id: "weapon", label: "武器", slots: ["weapon"] },
    { id: "armor", label: "防具", slots: ["head", "body", "hands", "feet", "offhand", "waist"] },
    { id: "jewelry", label: "装飾品", slots: ["ring", "neck"] },
    { id: "special", label: "ユニーク・セット", rarities: ["unique", "set"] },
    { id: "up", label: "▲ 強い", upgrade: true },
  ],
  // マスの左上の印（レア度）
  rarityMark: { normal: "N", magic: "M", rare: "R", legend: "L", unique: "U", set: "S" },
  // 戦闘力 = 能力 × 重み の合計（目安。実際の強さは DPS テストで）
  power: { attack: 10, defense: 6, maxHp: 1, hpRegen: 5, attackSpeed: 400, critChance: 20, moveSpeed: 0, skillDamage: 8 },
  // 下に並べる能力 [能力, 名前, 表示]（表示：int = 整数、pct = %、rate = 秒間）
  stats: [["attack", "攻撃力", "int"], ["defense", "防御力", "int"], ["maxHp", "最大HP", "int"], ["critChance", "会心率", "pct"], ["attackSpeed", "攻撃速度", "rate"], ["skillDamage", "スキル威力", "pct"]],
};
