// 装備ドロップの数値。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.items = {
  inventorySize: 30,
  pickupDelay: 0.8,     // 落ちてから拾うまでの秒数
  groundLifetime: 30,   // 拾えなかった装備が消えるまでの秒数
  levelScaling: 0.12,   // アイテムレベル+1ごとに数値が何割増えるか

  // レア度。weight が大きいほど出やすい。affixes = 追加能力の数 [最小, 最大]
  rarities: [
    { id: "normal", name: "ノーマル",   color: "#d8d8d8", weight: 60, affixes: [0, 0] },
    { id: "magic",  name: "マジック",   color: "#5b8cff", weight: 28, affixes: [1, 2] },
    { id: "rare",   name: "レア",       color: "#ffd447", weight: 10, affixes: [3, 4] },
    { id: "legend", name: "レジェンド", color: "#ff8a2a", weight: 2,  affixes: [5, 6] },
  ],

  slots: {
    weapon: "武器",
    head: "頭",
    body: "胴",
    hands: "手",
    feet: "足",
    ring: "指輪",
  },

  // 能力の名前と表示のしかた。scales=true はアイテムレベルで強くなる
  stats: {
    attack:      { name: "攻撃力",       percent: false, decimals: 0, scales: true },
    defense:     { name: "防御力",       percent: false, decimals: 0, scales: true },
    maxHp:       { name: "最大HP",       percent: false, decimals: 0, scales: true },
    hpRegen:     { name: "HP回復/秒",    percent: false, decimals: 1, scales: true },
    attackSpeed: { name: "攻撃速度",     percent: true,  decimals: 0, scales: false },
    critChance:  { name: "会心率",       percent: true,  decimals: 0, scales: false },
    moveSpeed:   { name: "移動速度",     percent: true,  decimals: 0, scales: false },
    skillDamage: { name: "スキル威力",   percent: true,  decimals: 0, scales: false },
  },

  // 装備の種類。main = 必ず付く能力 [最小, 最大]
  // アイコンの絵は icons に書く（なければ文字だけで表示）
  bases: [
    { slot: "weapon", id: "dual_blades", name: "双剣",       main: { attack: [5, 8] } },
    { slot: "weapon", id: "great_blade", name: "大刀",       main: { attack: [8, 12], attackSpeed: [-10, -10] } },
    { slot: "weapon", id: "chakram", name: "チャクラム", main: { attack: [4, 6], critChance: [3, 5] } },
    { slot: "head",   id: "turban", name: "ターバン",   main: { defense: [2, 4] } },
    { slot: "head",   id: "crown", name: "宝冠",       main: { defense: [1, 2], maxHp: [10, 20] } },
    { slot: "body",   id: "chainmail", name: "鎖帷子",     main: { defense: [4, 7] } },
    { slot: "body",   id: "robe", name: "法衣",       main: { defense: [2, 3], maxHp: [15, 25] } },
    { slot: "hands",  id: "gauntlets", name: "籠手",       main: { defense: [1, 3] } },
    { slot: "hands",  id: "bracelet", name: "腕輪",       main: { attackSpeed: [3, 6] } },
    { slot: "feet",   id: "leggings", name: "脚絆",       main: { defense: [1, 3] } },
    { slot: "feet",   id: "sandals", name: "サンダル",   main: { moveSpeed: [5, 10] } },
    { slot: "ring",   id: "ring", name: "指輪",       main: { maxHp: [5, 10] } },
    { slot: "ring",   id: "rosary", name: "数珠",       main: { hpRegen: [0.5, 1] } },
  ],

  // 装備のアイコンの絵（id → ファイル）。例: dual_blades: "assets/items/dual_blades.png"
  icons: {},

  // 追加能力（マジック以上に付く）
  affixes: [
    { stat: "attack",      range: [1, 4] },
    { stat: "defense",     range: [1, 4] },
    { stat: "maxHp",       range: [5, 15] },
    { stat: "hpRegen",     range: [0.3, 1.2] },
    { stat: "attackSpeed", range: [3, 8] },
    { stat: "critChance",  range: [1, 4] },
    { stat: "moveSpeed",   range: [3, 8] },
    { stat: "skillDamage", range: [5, 12] },
  ],

  // 名前の頭につく言葉
  rarePrefixes: ["鋭き", "古の", "猛き", "聖なる", "呪われし", "黄昏の"],
  legendPrefixes: ["シヴァの", "ヴィシュヌの", "インドラの", "アグニの", "ヴァーユの"],
};

// 戦闘の計算
WYD.data.combat = {
  defenseFactor: 0.5,   // ダメージ = 攻撃力 − 防御力×これ
  damageVariance: 0.1,  // ダメージのブレ（±10%）
  minDamage: 1,
};
