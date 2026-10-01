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
  //   desc   … 固有能力の説明。{名前} = params の同じ名前の数値、{skill:しくみ} = 今の職業のそのスキルの名前
  //   params … 固有能力の数値
  //   weight … 大きいほど出やすい
  list: [
    {
      id: "agniBangle", name: "劫火の腕輪", base: "bracelet", weight: 10,
      stats: { attack: [3, 6], skillDamage: [10, 20] },
      power: "whirlFire",
      desc: "{skill:whirl}を使うと足元の地面が燃え、{duration}秒間 {tick}秒ごとに攻撃力×{mult}倍で焼く",
      params: { radius: 90, duration: 3, tick: 0.5, mult: 0.4, color: "#ff7a2a" },
    },
    {
      id: "vishnuDisc", name: "彷徨う刃", base: "chakram", weight: 10,
      stats: { attack: [4, 7], critChance: [3, 6] },
      power: "chakraBounce",
      desc: "{skill:sudarshana}が跳ね返る数 +{extraTargets}、威力 +{damagePercent}%",
      params: { extraTargets: 3, damagePercent: 40 },
    },
    {
      id: "indraRing", name: "不壊の指輪", base: "ring", weight: 10,
      stats: { maxHp: [20, 40], defense: [3, 6] },
      power: "vajraThorns",
      desc: "{skill:vajra}の発動中、受けたダメージの {percent}% を相手に返す",
      params: { percent: 150 },
    },
    {
      id: "hanumanFists", name: "狂王の籠手", base: "gauntlets", weight: 10,
      stats: { attackSpeed: [5, 10], attack: [2, 5] },
      power: "hasteCleave",
      desc: "{skill:hanuman}の発動中、通常攻撃が周り{radius}の敵にも攻撃力×{mult}倍で当たる",
      params: { radius: 80, mult: 0.6 },
    },
    {
      id: "nagaCrown", name: "鎖の王冠", base: "crown", weight: 10,
      stats: { maxHp: [25, 45], skillDamage: [5, 15] },
      power: "bindExplode",
      desc: "{skill:nagapasha}で縛られた敵が倒れると爆発し、周り{radius}に攻撃力×{mult}倍のダメージ",
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
    {
      id: "wardRing", name: "流星避けの指輪", base: "ring", weight: 8,
      stats: { maxHp: [15, 30], defense: [2, 4] },
      power: "projectileWard",
      desc: "敵の弾を {chance}% の確率ではじく（弾幕を撃つボスに強い）",
      params: { chance: 45, color: "#9fdcff" },
    },
    {
      id: "hunterGauntlets", name: "狩人の籠手", base: "gauntlets", weight: 8,
      stats: { attack: [3, 6], critChance: [2, 4] },
      power: "eliteHunter",
      desc: "精鋭とボスに与えるダメージ +{percent}%",
      params: { percent: 35 },
    },
    {
      // periodicSummon … 敵がいるとき、interval 秒ごとに味方を count 体呼ぶ（手下のしくみ。src/allies.js）
      id: "ancestorHelm", name: "祖霊の兜", base: "turban", weight: 7,
      stats: { defense: [3, 6], maxHp: [20, 35] },
      power: "periodicSummon",
      desc: "{interval}秒ごとに祖先の戦士を{count}体呼ぶ（{duration}秒いて、攻撃力×{attackMult}倍でなぐる）",
      params: { interval: 15, firstDelay: 3, count: 2, duration: 10, attackMult: 0.6, hpRatio: 0.5, defenseRatio: 0.8,
        moveSpeed: 120, attackSpeed: 1.0, range: 26, radius: 13, spawnSpread: 30, followDistance: 40, firstAttackDelay: 0.3,
        color: "#ffcf6a", image: "assets/enemies/yaksha.png", imageFilter: "sepia(0.8) brightness(1.4) opacity(0.8)" },
    },
    {
      id: "frostOrb", name: "氷霊の腕輪", base: "bracelet", weight: 7,
      stats: { attackSpeed: [4, 8], skillDamage: [8, 15] },
      power: "periodicSummon",
      desc: "{interval}秒ごとに氷の精霊を{count}体呼ぶ（{duration}秒いて、攻撃力×{attackMult}倍でなぐる）",
      params: { interval: 10, firstDelay: 2, count: 1, duration: 8, attackMult: 1.0, hpRatio: 0.35, defenseRatio: 0.5,
        moveSpeed: 140, attackSpeed: 1.3, range: 24, radius: 11, spawnSpread: 25, followDistance: 40, firstAttackDelay: 0.2,
        color: "#9fdcff", image: "assets/enemies/preta.png", imageFilter: "hue-rotate(170deg) brightness(1.6) opacity(0.8)" },
    },
    {
      // classOnly … この職業でだけ落ちる（ほかの職業ではスキルがないので）
      id: "boneCrown", name: "骸の王冠", base: "crown", weight: 10, classOnly: "necromancer",
      stats: { maxHp: [20, 35], skillDamage: [8, 15] },
      power: "raiseBoost",
      desc: "{skill:raise}で呼べる数 +{extraCount}、手下の攻撃力 +{attackPercent}%",
      params: { extraCount: 2, attackPercent: 30 },
    },
  ],
};
