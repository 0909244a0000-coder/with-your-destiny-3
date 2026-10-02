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
    // ---- 奈落の双王でだけ出る（weight 0 なので、ふつうには落ちない。uberOnly）----
    {
      id: "abyssHeart", name: "奈落の心臓", base: "amulet", weight: 0, uberOnly: true,
      stats: { attack: [8, 14], skillDamage: [20, 30], critChance: [3, 5] },
      power: "eliteHunter",
      desc: "精鋭とボスに与えるダメージ +{percent}%",
      params: { percent: 50 },
    },
    {
      id: "twinCrown", name: "双王の冠", base: "crown", weight: 0, uberOnly: true,
      stats: { maxHp: [60, 90], defense: [8, 12] },
      power: "periodicSummon",
      desc: "{interval}秒ごとに双王の影を{count}体呼ぶ（{duration}秒いて、攻撃力×{attackMult}倍でなぐる）",
      params: { interval: 10, firstDelay: 2, count: 2, duration: 9, attackMult: 1.1, hpRatio: 0.6, defenseRatio: 1,
        moveSpeed: 130, attackSpeed: 1.2, range: 28, radius: 15, spawnSpread: 30, followDistance: 40, firstAttackDelay: 0.2,
        color: "#ff5ad0", image: "assets/enemies/ravana.png", imageFilter: "grayscale(1) brightness(0.6) sepia(1) hue-rotate(270deg) opacity(0.7)" },
    },
    // ---- 職業専用：スキルを強くする（power は "skillBoost〜"。params.kind のスキルの数値を mods で変える。書き方は data/runes.js と同じ）----
    {
      id: "giantBlade", name: "巨人の大剣", base: "great_blade", weight: 10, classOnly: "barbarian",
      stats: { attack: [6, 10], attackSpeed: [-5, 0] },
      power: "skillBoostWhirl",
      desc: "{skill:whirl}の範囲が1.4倍、威力が1.5倍になる",
      params: { kind: "whirl", mods: { radius: ["mul", 1.4], damage: ["mul", 1.5] } },
    },
    {
      id: "berserkerHelm", name: "狂戦士の兜", base: "turban", weight: 10, classOnly: "barbarian",
      stats: { defense: [3, 6], attackSpeed: [4, 8] },
      power: "skillBoostHaste",
      desc: "{skill:hanuman}の時間が2倍、上がる攻撃速度が1.3倍、使える間隔が0.7倍になる",
      params: { kind: "hanuman", mods: { duration: ["mul", 2], haste: ["mul", 1.3], cooldown: ["mul", 0.7] } },
    },
    {
      id: "archmageStaff", name: "大魔導の杖", base: "staff", weight: 10, classOnly: "sorceress",
      stats: { skillDamage: [15, 25] },
      power: "skillBoostAgni",
      desc: "{skill:agni}の範囲が1.3倍、威力が1.6倍、燃える時間が1.5倍になる",
      params: { kind: "agni", mods: { radius: ["mul", 1.3], damage: ["mul", 1.6], duration: ["mul", 1.5] } },
    },
    {
      id: "frostCrown", name: "氷結の冠", base: "crown", weight: 10, classOnly: "sorceress",
      stats: { maxHp: [15, 30], skillDamage: [8, 14] },
      power: "skillBoostFreeze",
      desc: "{skill:nagapasha}で凍らせる時間が1.6倍、範囲が1.3倍、敵が1体でも使う",
      params: { kind: "nagapasha", mods: { bind: ["mul", 1.6], radius: ["mul", 1.3], minTargets: ["set", 1] } },
    },
    {
      // classOnly … この職業でだけ落ちる（ほかの職業ではスキルがないので）
      id: "boneCrown", name: "骸の王冠", base: "crown", weight: 10, classOnly: "necromancer",
      stats: { maxHp: [20, 35], skillDamage: [8, 15] },
      power: "raiseBoost",
      desc: "{skill:raise}で呼べる数 +{extraCount}、手下の攻撃力 +{attackPercent}%",
      params: { extraCount: 2, attackPercent: 30 },
    },
    {
      id: "crusaderCrown", name: "聖騎士の冠", base: "crown", weight: 10, classOnly: "paladin",
      stats: { maxHp: [20, 35], defense: [2, 4] },
      power: "skillBoostAura",
      desc: "すべてのオーラの範囲が1.3倍、効き目が1.4倍になる",
      params: { kind: "aura", mods: { radius: ["mul", 1.3], damage: ["mul", 1.4], heal: ["mul", 1.4], mightBase: ["mul", 1.4], mightPerLevel: ["mul", 1.4] } },
    },
  ],
};
