// 装備ドロップの数値。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.items = {
  inventorySize: 60,   // 持ち物に入る数（6列なので6の倍数に）
  stashSize: 30,        // 倉庫に入る数
  fullSalvage: ["normal", "magic"],   // 持ち物がいっぱいのとき、拾ったその場で素材にするレア度
  fullWarnInterval: 30,  // 「持ち物がいっぱい」の知らせを出す間隔（秒）
  longPressMs: 450,     // 装備の欄を長押し（ミリ秒）すると「どうするか」の窓（捨てる・倉庫へ など）が出る
  pickupDelay: 0.8,     // 落ちてから拾うまでの秒数
  groundLifetime: 30,   // 拾えなかった装備が消えるまでの秒数
  levelScaling: 0.12,   // アイテムレベル+1ごとに数値が何割増えるか

  // レア度。weight が大きいほど出やすい。affixes = 追加能力の数 [最小, 最大]
  rarities: [
    { id: "normal", name: "ノーマル",   color: "#d8d8d8", weight: 60, affixes: [0, 0] },
    { id: "magic",  name: "マジック",   color: "#5b8cff", weight: 28, affixes: [1, 2] },
    { id: "rare",   name: "レア",       color: "#ffd447", weight: 10, affixes: [3, 4] },
    { id: "legend", name: "レジェンド", color: "#ff8a2a", weight: 2,  affixes: [5, 6] },
    // ユニークはふつうには出ない（weight 0）。ボスと精鋭がまれに落とす。data/uniques.js
    { id: "unique", name: "ユニーク",   color: "#e8c46a", weight: 0,  affixes: [0, 0] },
    // セットもふつうには出ない（weight 0）。ボスと精鋭がまれに落とす。data/sets.js
    { id: "set",    name: "セット",     color: "#3fd06a", weight: 0,  affixes: [0, 0] },
  ],

  slots: {
    weapon: "武器",
    head: "頭",
    body: "胴",
    hands: "手",
    feet: "足",
    ring: "指輪",
    offhand: "盾",
    neck: "首飾り",
    waist: "帯",
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
    { slot: "weapon", id: "great_blade", name: "大剣",       main: { attack: [8, 12], attackSpeed: [-10, -10] } },
    { slot: "weapon", id: "chakram", name: "ダガー",     main: { attack: [4, 6], critChance: [3, 5] } },
    { slot: "weapon", id: "staff", name: "杖",         main: { attack: [3, 5], skillDamage: [8, 14] } },
    { slot: "head",   id: "turban", name: "兜",         main: { defense: [2, 4] } },
    { slot: "head",   id: "crown", name: "サークレット", main: { defense: [1, 2], maxHp: [10, 20] } },
    { slot: "body",   id: "chainmail", name: "鎖帷子",     main: { defense: [4, 7] } },
    { slot: "body",   id: "robe", name: "ローブ",     main: { defense: [2, 3], maxHp: [15, 25] } },
    { slot: "hands",  id: "gauntlets", name: "籠手",       main: { defense: [1, 3] } },
    { slot: "hands",  id: "bracelet", name: "腕輪",       main: { attackSpeed: [3, 6] } },
    { slot: "feet",   id: "leggings", name: "グリーブ",   main: { defense: [1, 3] } },
    { slot: "feet",   id: "sandals", name: "ブーツ",     main: { moveSpeed: [5, 10] } },
    { slot: "ring",   id: "ring", name: "指輪",       main: { maxHp: [5, 10] } },
    { slot: "ring",   id: "rosary", name: "印章指輪",   main: { hpRegen: [0.5, 1] } },
    { slot: "offhand", id: "shield", name: "盾",         main: { defense: [2, 4], maxHp: [5, 12] } },
    { slot: "offhand", id: "tome", name: "魔導書",       main: { skillDamage: [5, 10] } },
    { slot: "neck",   id: "amulet", name: "首飾り",     main: { critChance: [1, 3] } },
    { slot: "neck",   id: "talisman", name: "護符",     main: { maxHp: [8, 15] } },
    { slot: "waist",  id: "belt", name: "帯",           main: { maxHp: [8, 15] } },
    { slot: "waist",  id: "sash", name: "飾り帯",       main: { hpRegen: [0.3, 0.8] } },
  ],

  // 装備のアイコンの絵（id → ファイル）。例: dual_blades: "assets/items/dual_blades.png"
  icons: {
    dual_blades: "assets/items/dual_blades.png",
    great_blade: "assets/items/great_blade.png",
    chakram: "assets/items/chakram.png",
    turban: "assets/items/turban.png",
    crown: "assets/items/crown.png",
    chainmail: "assets/items/chainmail.png",
    robe: "assets/items/robe.png",
    gauntlets: "assets/items/gauntlets.png",
    bracelet: "assets/items/bracelet.png",
    leggings: "assets/items/leggings.png",
    sandals: "assets/items/sandals.png",
    ring: "assets/items/ring.png",
    rosary: "assets/items/rosary.png",
    staff: "assets/items/staff.png",
    shield: "assets/items/shield.png",
    tome: "assets/items/tome.png",
    amulet: "assets/items/amulet.png",
    talisman: "assets/items/talisman.png",
    belt: "assets/items/belt.png",
    sash: "assets/items/sash.png",
  },

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
  legendPrefixes: ["熾天使の", "冥王の", "雷帝の", "焔王の", "嵐の"],

  // 名前を変えた言葉（前 → 今）。古いセーブに残っている装備の名前を、読みこむときに直す
  // id はセーブとのつながりのため、名前を変えても同じままにしている
  renamedWords: {
    "大刀": "大剣", "チャクラム": "ダガー", "ターバン": "兜", "宝冠": "サークレット",
    "法衣": "ローブ", "脚絆": "グリーブ", "サンダル": "ブーツ", "数珠": "印章指輪",
    "シヴァの": "熾天使の", "ヴィシュヌの": "冥王の", "インドラの": "雷帝の",
    "アグニの": "焔王の", "ヴァーユの": "嵐の",
  },

  buildSlots: 4,            // ビルドを保存できる数

  // 太古・始原（Diablo 3 のしくみ）：レジェンド・ユニーク・セットが、まれに能力の高い版で落ちる
  ancient: {
    rarities: ["legend", "unique", "set"],
    ancientChance: 0.1,      // 太古になる確率
    primalChance: 0.01,      // 始原になる確率
    ancientMult: 1.3,        // 能力の倍率
    primalMult: 1.6,
    names: { 1: "太古の", 2: "始原の" },
    colors: { 1: "#ff9a3c", 2: "#ff3c3c" },
  },

  // 自動で装備：拾った装備の点数が、今その部位につけている装備より高ければ着替える（上のバーの「自動装備」）
  //   ユニーク・セット・強化した装備・宝石をはめた装備を着ているときは、その部位は着替えない
  //   点数 = 能力ごとの weights × 数値 の合計 + perEffect × 特殊効果の数（tools/balance-sim.js と同じ考え方）
  autoEquip: {
    weights: { attack: 4, defense: 2.5, maxHp: 0.4, hpRegen: 4, attackSpeed: 1.5, critChance: 1.5, moveSpeed: 0.3, skillDamage: 0.8 },
    perEffect: 6,
    uniqueBonus: 30,         // ユニークの固有能力のぶん（数字で比べられないので目安）
    setBonus: 20,            // セット装備のぶん（そろえるボーナスの目安）
    minGain: 0.02,           // 点数がこの割合以上上がるときだけ着替える
  },
};

// 戦闘の計算
WYD.data.combat = {
  defenseFactor: 0.5,   // ダメージ = 攻撃力 − 防御力×これ
  damageVariance: 0.1,  // ダメージのブレ（±10%）
  minDamage: 1,
  minDamageRatio: 0.15, // 防御力がどれだけ高くても、攻撃力のこの割合は通る（防御を重ねて無敵にならないように）
  dpsWindow: 10,        // 秒間ダメージを、直近の何秒で計るか
};
