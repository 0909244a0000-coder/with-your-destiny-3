// 敵の数値（危険度1のときの値）。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.enemies = {
  preta: {
    name: "餓鬼",
    color: "#9aa86a",
    image: null,
    radius: 11,
    hp: 30,
    attack: 4,
    defense: 0,
    attackSpeed: 0.8,
    moveSpeed: 70,
    range: 22,
    exp: 5,
    dropChance: 0.15,  // 装備を落とす確率（0〜1）
    rarityBonus: 1.0,  // 大きいほどレアが出やすい
    spawnWeight: 60,   // 出現しやすさ
  },
  yaksha: {
    name: "夜叉",
    color: "#c0653a",
    image: null,
    radius: 14,
    hp: 75,
    attack: 8,
    defense: 2,
    attackSpeed: 0.9,
    moveSpeed: 85,
    range: 26,
    exp: 12,
    dropChance: 0.3,
    rarityBonus: 1.3,
    spawnWeight: 30,
  },
  rakshasa: {
    name: "羅刹",
    color: "#8e3bd1",
    image: null,
    radius: 20,
    hp: 240,
    attack: 14,
    defense: 5,
    attackSpeed: 0.6,
    moveSpeed: 55,
    range: 32,
    exp: 45,
    dropChance: 1.0,
    rarityBonus: 2.5,
    spawnWeight: 8,
    showName: true,    // 頭の上に名前を出す
  },
};

// 危険度（数字が大きいほど敵が強く、ごほうびも良くなる）
WYD.data.difficulty = {
  max: 30,
  hpGrowth: 0.45,        // 危険度+1ごとのHP増加率
  attackGrowth: 0.3,
  defenseGrowth: 0.35,
  expGrowth: 0.4,
  rarityGrowth: 0.08,    // 危険度+1ごとのレア出やすさ増加
  killsToUnlockNext: 25, // 今の最高危険度でこの数倒すと次が解放
};
