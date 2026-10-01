// ソケットと宝石。装備にソケット（穴）がつくことがあり、宝石をはめると能力が上がる。
//   gems    … 宝石の種類。はめる場所（weapon = 武器、armor = 頭・胴・手・足、jewelry = 指輪）ごとに上がる能力
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
    chance: { normal: 0, magic: 0.08, rare: 0.2, legend: 0.4, unique: 0.5, set: 0.35 },
    max: { weapon: 2, body: 2, head: 1, hands: 1, feet: 1, ring: 1 },
    secondChance: 0.35,            // 最大2つの部位で、2つ目がつく確率
  },
  slotGroup: { weapon: "weapon", head: "armor", body: "armor", hands: "armor", feet: "armor", ring: "jewelry" },
  groupName: { weapon: "武器", armor: "防具", jewelry: "指輪" },

  drop: {
    chanceNormal: 0.01,            // ふつうの敵が落とす確率
    chanceElite: 0.3,              // 精鋭
    bossCount: 2,                  // ボス・守護者は必ずこの数
    tierEvery: 6,                  // 危険度がこれだけ上がるごとに、落ちる宝石の段階が1上がる
    trialTierEvery: 5,             // 試練の段階がこれだけ上がるごとに、1上がる
    maxDropTier: 2,                // 落ちる宝石の最高段階（0 = 欠けた。上は合成で作る）
  },
};
