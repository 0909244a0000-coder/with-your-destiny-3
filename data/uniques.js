// ユニーク装備の数値。名前と固有能力が決まっている特別な装備。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.uniques = {
  color: "#e8c46a",          // 固有能力を表示する色
  chanceFromBoss: 0.35,      // ボスを倒したときに1個落とす確率
  chanceFromElite: 0.04,     // 精鋭を倒したときに1個落とす確率

  // ユニーク装備の一覧
  //   base   … 装備の種類（data/items.js の id）
  //   stats  … 必ずつく能力 [最小, 最大]（装備の種類の能力に追加）
  //   power  … 固有能力のしくみ（src/world.js で使う名前）
  //   desc   … 固有能力の説明。{名前} = params の同じ名前の数値
  //   params … 固有能力の数値
  //   weight … 大きいほど出やすい
  list: [
    {
      id: "agniBangle", name: "劫火の腕輪", base: "bracelet", weight: 10,
      stats: { attack: [3, 6], skillDamage: [10, 20] },
      power: "whirlFire",
      desc: "旋風斬を使うと足元の地面が燃え、{duration}秒間 {tick}秒ごとに攻撃力×{mult}倍で焼く",
      params: { radius: 90, duration: 3, tick: 0.5, mult: 0.4, color: "#ff7a2a" },
    },
    {
      id: "vishnuDisc", name: "彷徨う刃", base: "chakram", weight: 10,
      stats: { attack: [4, 7], critChance: [3, 6] },
      power: "chakraBounce",
      desc: "連鎖の投げ斧が跳ね返る数 +{extraTargets}、威力 +{damagePercent}%",
      params: { extraTargets: 3, damagePercent: 40 },
    },
    {
      id: "indraRing", name: "不壊の指輪", base: "ring", weight: 10,
      stats: { maxHp: [20, 40], defense: [3, 6] },
      power: "vajraThorns",
      desc: "鉄の皮膚の発動中、受けたダメージの {percent}% を相手に返す",
      params: { percent: 150 },
    },
    {
      id: "hanumanFists", name: "狂王の籠手", base: "gauntlets", weight: 10,
      stats: { attackSpeed: [5, 10], attack: [2, 5] },
      power: "hasteCleave",
      desc: "狂戦士の怒りの発動中、通常攻撃が周り{radius}の敵にも攻撃力×{mult}倍で当たる",
      params: { radius: 80, mult: 0.6 },
    },
    {
      id: "nagaCrown", name: "鎖の王冠", base: "crown", weight: 10,
      stats: { maxHp: [25, 45], skillDamage: [5, 15] },
      power: "bindExplode",
      desc: "鉄鎖の束縛で縛られた敵が倒れると爆発し、周り{radius}に攻撃力×{mult}倍のダメージ",
      params: { radius: 90, mult: 1.5, color: "#5fd9a0" },
    },
    {
      id: "kaliMala", name: "屍爆の印章", base: "rosary", weight: 8,
      stats: { hpRegen: [1, 2], critChance: [2, 5] },
      power: "killNova",
      desc: "敵を倒すと {chance}% の確率で死体が爆発し、周り{radius}に攻撃力×{mult}倍のダメージ",
      params: { chance: 30, radius: 80, mult: 1.2, color: "#ff4a6a" },
    },
    {
      id: "asceticRobe", name: "隠者のローブ", base: "robe", weight: 8,
      stats: { defense: [3, 6], maxHp: [15, 30] },
      power: "ascetic",
      desc: "スキルの空き枠1つにつき、スキル威力 +{percentPerSlot}%（使うスキルをしぼるほど強い）",
      params: { percentPerSlot: 45 },
    },
  ],
};
