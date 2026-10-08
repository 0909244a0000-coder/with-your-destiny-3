// ソケットと宝石。装備にソケット（穴）がつくことがあり、宝石をはめると能力が上がる。
//   gems    … 宝石の種類。はめる場所（weapon = 武器、armor = 頭・胴・手・足・盾・帯、jewelry = 指輪・首飾り）ごとに上がる能力
//             数値は一番下の段階（欠けた）のもの。段階が上がると tiers の mult 倍
//   tiers   … 宝石の段階。同じ宝石を combineCount 個と素材 cost で1つ上の段階にできる
//   sockets … ソケットのつき方。chance = レア度ごとのつく確率、max = 部位ごとの最大数
//   drop    … 宝石の落ち方。tierEvery = 危険度がいくつ上がるごとに段階が1上がるか（試練は段階ごと）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.gems = {
  gems: [
    { id: "ruby", name: "ルビー", color: "#ff4a4a",
      weapon: { attack: 3 }, armor: { maxHp: 15 }, jewelry: { attack: 2 } },
    { id: "topaz", name: "トパーズ", color: "#ffd447",
      weapon: { skillDamage: 5 }, armor: { defense: 2 }, jewelry: { skillDamage: 4 } },
    { id: "emerald", name: "エメラルド", color: "#3fd06a",
      weapon: { critChance: 2 }, armor: { hpRegen: 0.5 }, jewelry: { critChance: 1 } },
    { id: "amethyst", name: "アメジスト", color: "#b070ff",
      weapon: { attackSpeed: 3 }, armor: { moveSpeed: 2 }, jewelry: { attackSpeed: 2 } },
  ],

  tiers: [
    { name: "欠けた", mult: 1 },
    { name: "", mult: 2 },
    { name: "完全な", mult: 3.5 },
    { name: "至高の", mult: 5.5 },
    { name: "王者の", mult: 8 },
  ],
  combineCount: 3,                 // 1つ上にするのに使う数
  combineCost: [5, 15, 40, 100],   // 1つ上にするときの素材（今の段階ごと）

  sockets: {
    chance: { normal: 0.25, magic: 0.08, rare: 0.2, legend: 0.4, unique: 0.5, set: 0.35 },   // ノーマルはルーンワード用に多め
    max: { weapon: 3, body: 3, head: 2, hands: 1, feet: 1, ring: 1, offhand: 2, neck: 1, waist: 1 },
    secondChance: 0.35,            // 最大2つの部位で、2つ目がつく確率
  },
  // ---- ルーン（Diablo 2 のしくみ）----
  // ルーンもソケットにはめられる。ノーマル装備のソケットを、決まったルーンを決まった順番でうめると「ルーンワード」になる
  //   runes … 上のほうが出やすい。1つずつでも能力が上がる（宝石と同じ書き方）
  //   runeDrop … 落ちる確率と、それぞれの出やすさ（weight）
  //   runeUpgrade … 同じルーン3つと素材で、1つ上のルーンにする（上のルーンほど素材が多い）
  runes: [
    { id: "el", name: "エル", color: "#d8d8d8", weight: 30, weapon: { attack: 2 }, armor: { maxHp: 10 }, jewelry: { attack: 1 } },
    { id: "eld", name: "エルド", color: "#d8d8d8", weight: 26, weapon: { attackSpeed: 3 }, armor: { defense: 1 }, jewelry: { maxHp: 8 } },
    { id: "tir", name: "ティル", color: "#d8d8d8", weight: 22, weapon: { skillDamage: 4 }, armor: { hpRegen: 0.4 }, jewelry: { skillDamage: 3 } },
    { id: "nef", name: "ネフ", color: "#d8d8d8", weight: 18, weapon: { critChance: 2 }, armor: { defense: 2 }, jewelry: { critChance: 1 } },
    { id: "eth", name: "エス", color: "#d8d8d8", weight: 15, weapon: { attack: 4 }, armor: { maxHp: 18 }, jewelry: { attack: 2 } },
    { id: "ith", name: "イス", color: "#d8d8d8", weight: 12, weapon: { attackSpeed: 5 }, armor: { moveSpeed: 3 }, jewelry: { attackSpeed: 3 } },
    { id: "tal", name: "タル", color: "#ffb05a", weight: 9, weapon: { skillDamage: 8 }, armor: { defense: 3 }, jewelry: { skillDamage: 5 } },
    { id: "ral", name: "ラル", color: "#ffb05a", weight: 7, weapon: { attack: 6 }, armor: { maxHp: 25 }, jewelry: { attack: 3 } },
    { id: "ort", name: "オルト", color: "#ffb05a", weight: 5, weapon: { critChance: 3 }, armor: { hpRegen: 0.8 }, jewelry: { critChance: 2 } },
    { id: "thul", name: "サル", color: "#ff7a3a", weight: 3, weapon: { attackSpeed: 8 }, armor: { defense: 5 }, jewelry: { attackSpeed: 5 } },
    { id: "sol", name: "ソル", color: "#ff7a3a", weight: 2, weapon: { attack: 9 }, armor: { maxHp: 40 }, jewelry: { attack: 5 } },
    { id: "ber", name: "ベル", color: "#ff4a4a", weight: 0.6, weapon: { skillDamage: 18 }, armor: { defense: 8 }, jewelry: { skillDamage: 10 } },
  ],
  runeDrop: { chanceNormal: 0.006, chanceElite: 0.12, chanceBoss: 0.8 },
  runeUpgradeCost: 10,          // 1つ上にするときの素材（ルーンの順番 × これ）

  // 旧セーブの継承専用。新しいルーンはdata/runeSkills.js。ソケットでは発動しない。
  //   group … はめられる部位（weapon / armor / jewelry。armor は頭・胴・手・足・盾・帯）
  //   bonus … stats（能力）・effects（特殊効果）・power と params と desc（固有能力。data/uniques.js と同じしくみ）
  runewords: [
    { id: "steel", name: "鋼", runes: ["tir", "el"], group: "weapon",
      bonus: { stats: { attack: 10, attackSpeed: 15, critChance: 4 } } },
    { id: "stealth", name: "隠密", runes: ["tal", "eth"], group: "armor",
      bonus: { stats: { defense: 8, attackSpeed: 10 }, effects: { moveSpeed: 15 } } },
    { id: "lore", name: "伝承", runes: ["ort", "tir"], group: "armor",
      bonus: { stats: { skillDamage: 25, maxHp: 30 } } },
    { id: "malice", name: "悪意", runes: ["ith", "el", "eth"], group: "weapon",
      bonus: { stats: { attack: 16 }, effects: { lifesteal: 4, critDamage: 25 } } },
    { id: "spirit", name: "精霊", runes: ["tal", "thul", "ort"], group: "weapon",
      bonus: { stats: { skillDamage: 40 }, effects: { cooldown: 15 } } },
    { id: "grief", name: "悲嘆", runes: ["eth", "tir", "ral"], group: "weapon",
      bonus: { stats: { attack: 22, attackSpeed: 20 }, power: "killNova", params: { chance: 35, radius: 90, mult: 1.5, color: "#ff4a6a" },
        desc: "敵を倒すと {chance}% の確率で死体が爆発し、周り{radius}に攻撃力×{mult}倍のダメージ" } },
    { id: "fortitude", name: "不屈", runes: ["el", "sol", "ral"], group: "armor",
      bonus: { stats: { maxHp: 80, defense: 12, skillDamage: 20 }, effects: { killHeal: 3 } } },
    { id: "enigma", name: "謎", runes: ["ber", "ith", "sol"], group: "armor",
      bonus: { stats: { maxHp: 60, moveSpeed: 15, skillDamage: 30 }, power: "projectileWard", params: { chance: 50, color: "#c08aff" },
        desc: "敵の弾を {chance}% の確率ではじく" } },
  ],
  runewordColor: "#c7a96b",

  // ---- 宝石合成（混沌の宝石）----
  // あまった宝石を、種類も段階も混ぜて入れ、ランダムな能力をもつ「混沌の宝石」を1つ作る。どの部位にはめても同じ能力。
  //   need      … 必要な量（欠けた = 1、1段上がるごとに combineCount 倍。王者 = 81 → 810 で王者10個ぶん）
  //   cost      … 素材（0 = いらない）
  //   lineCount … 能力の数とその出やすさ（weight）
  //   pool      … 出る能力。kind: "stat" = 基本の能力（data/items.js の stats）、"effect" = 特殊効果（data/effects.js。合計の上限 cap はそのまま）
  //               range = 数値の幅 [最小, 最大]、weight = 出やすさ。既存の宝石にない能力（特殊効果）もふくむ
  fusion: {
    name: "混沌の宝石", color: "#ff7ad9",
    need: 810, cost: 0,
    lineCount: [{ n: 1, weight: 10 }, { n: 2, weight: 40 }, { n: 3, weight: 35 }, { n: 4, weight: 15 }],
    pool: [
      { kind: "stat", id: "attack", range: [10, 32], weight: 10 },
      { kind: "stat", id: "defense", range: [6, 20], weight: 10 },
      { kind: "stat", id: "maxHp", range: [50, 160], weight: 10 },
      { kind: "stat", id: "hpRegen", range: [1.5, 5], weight: 8 },
      { kind: "stat", id: "attackSpeed", range: [8, 28], weight: 8 },
      { kind: "stat", id: "critChance", range: [5, 18], weight: 8 },
      { kind: "stat", id: "moveSpeed", range: [6, 18], weight: 6 },
      { kind: "stat", id: "skillDamage", range: [15, 50], weight: 10 },
      { kind: "effect", id: "lifesteal", range: [1, 4], weight: 6 },
      { kind: "effect", id: "cooldown", range: [3, 10], weight: 5 },
      { kind: "effect", id: "killHeal", range: [1, 4], weight: 6 },
      { kind: "effect", id: "critDamage", range: [10, 40], weight: 6 },
      { kind: "effect", id: "thunder", range: [5, 12], weight: 5 },
      { kind: "effect", id: "wrath", range: [10, 30], weight: 5 },
      { kind: "effect", id: "thorns", range: [10, 35], weight: 5 },
    ],
  },

  slotGroup: { weapon: "weapon", head: "armor", body: "armor", hands: "armor", feet: "armor", ring: "jewelry",
    offhand: "armor", neck: "jewelry", waist: "armor" },
  groupName: { weapon: "武器", armor: "防具", jewelry: "装飾品" },

  drop: {
    chanceNormal: 0.01,            // ふつうの敵が落とす確率
    chanceElite: 0.3,              // 精鋭
    bossCount: 2,                  // ボス・守護者は必ずこの数
    tierEvery: 6,                  // 危険度がこれだけ上がるごとに、落ちる宝石の段階が1上がる
    trialTierEvery: 5,             // 試練の段階がこれだけ上がるごとに、1上がる
    maxDropTier: 2,                // 落ちる宝石の最高段階（0 = 欠けた。上は合成で作る）
  },
};
