// ユニーク装備の数値。名前と固有能力が決まっている特別な装備。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.uniques = {
  color: "#e8c46a",          // 固有能力を表示する色
  chanceFromBoss: 0.35,      // ボスを倒したときに1個落とす確率
  chanceFromElite: 0.04,     // 精鋭を倒したときに1個落とす確率
  // home … よく落ちるエリア（data/areas.js の id）。そのエリアで落ちるときは weight が homeMult 倍になる（狙って周回できる）
  homeMult: 6,
  // ボス・精鋭が落とすユニーク・セットのアイテムレベル：今のエリアの補正から、行ったことのある一番奥のエリアの補正へ、この割合だけ近づける
  // （1 = どこで落ちても一番奥と同じ、0 = 今のエリアのまま。前のエリアを周回しても弱くなりすぎないように）
  deepLevelShare: 0.8,

  // ユニーク装備の一覧
  //   base   … 装備の種類（data/items.js の id）
  //   stats  … 必ずつく能力 [最小, 最大]（装備の種類の能力に追加）
  //   power  … 固有能力のしくみ（src/world.js で使う名前）
  //   desc   … 固有能力の説明。{名前} = params の同じ名前の数値、{skill:しくみ} = 今の職業のそのスキルの名前
  //   params … 固有能力の数値
  //   weight … 大きいほど出やすい
  //   home   … よく落ちるエリア
  //   icon   … 専用のアイコンの絵（なければ部位の絵）
  list: [
    {
      id: "agniBangle", icon: "assets/items/unique_agniBangle.png", home: "inferno", name: "劫火の腕輪", base: "bracelet", weight: 10,
      stats: { attack: [3, 6], skillDamage: [10, 20] },
      power: "whirlFire",
      desc: "{skill:whirl}を使うと足元の地面が燃え、{duration}秒間 {tick}秒ごとに攻撃力×{mult}倍で焼く",
      params: { radius: 90, duration: 3, tick: 0.5, mult: 0.4, color: "#ff7a2a" },
    },
    {
      id: "vishnuDisc", home: "forest", name: "彷徨う刃", base: "chakram", weight: 10,
      stats: { attack: [4, 7], critChance: [3, 6] },
      power: "chakraBounce",
      desc: "{skill:sudarshana}が跳ね返る数 +{extraTargets}、威力 +{damagePercent}%",
      params: { extraTargets: 3, damagePercent: 40 },
    },
    {
      id: "indraRing", icon: "assets/items/unique_indraRing.png", home: "cathedral", name: "不壊の指輪", base: "ring", weight: 10,
      stats: { maxHp: [20, 40], defense: [3, 6] },
      power: "vajraThorns",
      desc: "{skill:vajra}の発動中、受けたダメージの {percent}% を相手に返す",
      params: { percent: 150 },
    },
    {
      id: "hanumanFists", home: "forest", name: "狂王の籠手", base: "gauntlets", weight: 10,
      stats: { attackSpeed: [5, 10], attack: [2, 5] },
      power: "hasteCleave",
      desc: "{skill:hanuman}の発動中、通常攻撃が周り{radius}の敵にも攻撃力×{mult}倍で当たる",
      params: { radius: 80, mult: 0.6 },
    },
    {
      id: "nagaCrown", icon: "assets/items/unique_nagaCrown.png", home: "patala", name: "鎖の王冠", base: "crown", weight: 10,
      stats: { maxHp: [25, 45], skillDamage: [5, 15] },
      power: "bindExplode",
      desc: "{skill:nagapasha}で縛られた敵が倒れると爆発し、周り{radius}に攻撃力×{mult}倍のダメージ",
      params: { radius: 90, mult: 1.5, color: "#5fd9a0" },
    },
    {
      id: "kaliMala", icon: "assets/items/unique_kaliMala.png", home: "smashana", name: "屍爆の印章", base: "rosary", weight: 8,
      stats: { hpRegen: [1, 2], critChance: [2, 5] },
      power: "killNova",
      desc: "敵を倒すと {chance}% の確率で死体が爆発し、周り{radius}に攻撃力×{mult}倍のダメージ",
      params: { chance: 30, radius: 80, mult: 1.2, color: "#ff4a6a" },
    },
    {
      id: "asceticRobe", icon: "assets/items/unique_asceticRobe.png", home: "cathedral", name: "隠者のローブ", base: "robe", weight: 8,
      stats: { defense: [3, 6], maxHp: [15, 30] },
      power: "ascetic",
      desc: "スキルの空き枠1つにつき、スキル威力 +{percentPerSlot}%（使うスキルをしぼるほど強い）",
      params: { percentPerSlot: 45 },
    },
    {
      id: "wardRing", icon: "assets/items/unique_wardRing.png", home: "frost", name: "流星避けの指輪", base: "ring", weight: 8,
      stats: { maxHp: [15, 30], defense: [2, 4] },
      power: "projectileWard",
      desc: "敵の弾を {chance}% の確率ではじく（弾幕を撃つボスに強い）",
      params: { chance: 45, color: "#9fdcff" },
    },
    {
      id: "hunterGauntlets", home: "forest", name: "狩人の籠手", base: "gauntlets", weight: 8,
      stats: { attack: [3, 6], critChance: [2, 4] },
      power: "eliteHunter",
      desc: "精鋭とボスに与えるダメージ +{percent}%",
      params: { percent: 35 },
    },
    {
      // periodicSummon … 敵がいるとき、interval 秒ごとに味方を count 体呼ぶ（手下のしくみ。src/allies.js）
      id: "ancestorHelm", icon: "assets/items/unique_ancestorHelm.png", home: "smashana", name: "祖霊の兜", base: "turban", weight: 7,
      stats: { defense: [3, 6], maxHp: [20, 35] },
      power: "periodicSummon",
      desc: "{interval}秒ごとに祖先の戦士を{count}体呼ぶ（{duration}秒いて、攻撃力×{attackMult}倍でなぐる）",
      params: { interval: 15, firstDelay: 3, count: 2, duration: 10, attackMult: 0.6, hpRatio: 0.5, defenseRatio: 0.8,
        moveSpeed: 120, attackSpeed: 1.0, range: 26, radius: 13, spawnSpread: 30, followDistance: 40, firstAttackDelay: 0.3,
        color: "#ffcf6a", image: "assets/enemies/yaksha.png", imageFilter: "sepia(0.8) brightness(1.4) opacity(0.8)" },
    },
    {
      id: "frostOrb", icon: "assets/items/unique_frostOrb.png", home: "frost", name: "氷霊の腕輪", base: "bracelet", weight: 7,
      stats: { attackSpeed: [4, 8], skillDamage: [8, 15] },
      power: "periodicSummon",
      desc: "{interval}秒ごとに氷の精霊を{count}体呼ぶ（{duration}秒いて、攻撃力×{attackMult}倍でなぐる）",
      params: { interval: 10, firstDelay: 2, count: 1, duration: 8, attackMult: 1.0, hpRatio: 0.35, defenseRatio: 0.5,
        moveSpeed: 140, attackSpeed: 1.3, range: 24, radius: 11, spawnSpread: 25, followDistance: 40, firstAttackDelay: 0.2,
        color: "#9fdcff", image: "assets/enemies/preta.png", imageFilter: "hue-rotate(170deg) brightness(1.6) opacity(0.8)" },
    },
    // ---- 奈落の双王でだけ出る（weight 0 なので、ふつうには落ちない。uberOnly）----
    {
      id: "abyssHeart", icon: "assets/items/unique_abyssHeart.png", name: "奈落の心臓", base: "amulet", weight: 0, uberOnly: true,
      stats: { attack: [8, 14], skillDamage: [20, 30], critChance: [3, 5] },
      power: "eliteHunter",
      desc: "精鋭とボスに与えるダメージ +{percent}%",
      params: { percent: 50 },
    },
    {
      id: "twinCrown", icon: "assets/items/unique_twinCrown.png", name: "双王の冠", base: "crown", weight: 0, uberOnly: true,
      stats: { maxHp: [60, 90], defense: [8, 12] },
      power: "periodicSummon",
      desc: "{interval}秒ごとに双王の影を{count}体呼ぶ（{duration}秒いて、攻撃力×{attackMult}倍でなぐる）",
      params: { interval: 10, firstDelay: 2, count: 2, duration: 9, attackMult: 1.1, hpRatio: 0.6, defenseRatio: 1,
        moveSpeed: 130, attackSpeed: 1.2, range: 28, radius: 15, spawnSpread: 30, followDistance: 40, firstAttackDelay: 0.2,
        color: "#ff5ad0", image: "assets/enemies/ravana.png", imageFilter: "grayscale(1) brightness(0.6) sepia(1) hue-rotate(270deg) opacity(0.7)" },
    },
    // ---- どの職業でも：スキルの「しくみ」を変えて遊び方を変える（power は skillBoost〜。そのしくみのスキルがある職業でだけ落ちる）----
    {
      id: "stormMail", icon: "assets/items/unique_stormMail.png", home: "frost", name: "嵐の鎖帷子", base: "chainmail", weight: 8,
      stats: { defense: [4, 8], maxHp: [15, 30] },
      power: "skillBoostWhirlStorm",
      desc: "{skill:whirl}の使える間隔が0.55倍、範囲が1.25倍になる（威力は0.85倍。回し続ける型）",
      params: { kind: "whirl", mods: { cooldown: ["mul", 0.55], radius: ["mul", 1.25], damage: ["mul", 0.85] } },
    },
    {
      id: "aegisShield", icon: "assets/items/unique_aegisShield.png", home: "cathedral", name: "不動の大盾", base: "shield", weight: 8,
      stats: { defense: [5, 9], maxHp: [20, 35] },
      power: "skillBoostVajraAlways",
      desc: "{skill:vajra}をHPが減っていなくても使い、使える間隔が0.7倍、時間が1.4倍になる（ほぼずっと守りが上がる）",
      params: { kind: "vajra", mods: { triggerHpPercent: ["set", 100], cooldown: ["mul", 0.7], duration: ["mul", 1.4] } },
    },
    {
      id: "twinFangs", home: "forest", name: "双牙の連刃", base: "dual_blades", weight: 8,
      stats: { attack: [5, 9], attackSpeed: [4, 8] },
      power: "skillBoostChainMany",
      desc: "{skill:sudarshana}の当たる数 +4、跳ねる距離が1.5倍になる（敵が多いほど強い）",
      params: { kind: "sudarshana", mods: { targets: ["add", 4], jumpRange: ["mul", 1.5] } },
    },
    {
      id: "ashTome", icon: "assets/items/unique_ashTome.png", home: "inferno", name: "灰燼の魔導書", base: "tome", weight: 8,
      stats: { skillDamage: [10, 18], attack: [2, 4] },
      power: "skillBoostAgniSpam",
      desc: "{skill:agni}の使える間隔が0.5倍、範囲が1.2倍になる（1回の威力は0.8倍。地面を焼き続ける型）",
      params: { kind: "agni", mods: { cooldown: ["mul", 0.5], radius: ["mul", 1.2], damage: ["mul", 0.8] } },
    },
    {
      id: "galeBoots", icon: "assets/items/unique_galeBoots.png", home: "patala", name: "疾風の長靴", base: "sandals", weight: 8,
      stats: { moveSpeed: [8, 14], attackSpeed: [3, 6] },
      power: "skillBoostHasteFar",
      desc: "{skill:hanuman}を遠くの敵にも使い（{triggerText}）、使える間隔が0.6倍になる",
      params: { kind: "hanuman", triggerText: "反応する距離3倍", mods: { triggerRange: ["mul", 3], cooldown: ["mul", 0.6] } },
    },
    {
      id: "chainBelt", icon: "assets/items/unique_chainBelt.png", home: "patala", name: "縛鎖の帯", base: "belt", weight: 8,
      stats: { maxHp: [20, 35], defense: [2, 5] },
      power: "skillBoostBindSolo",
      desc: "{skill:nagapasha}を敵が1体でも使い、ボスを縛る時間が2.5倍、使える間隔が0.7倍になる（ボス戦向け）",
      params: { kind: "nagapasha", mods: { minTargets: ["set", 1], bossBindMult: ["mul", 2.5], cooldown: ["mul", 0.7] } },
    },
    {
      id: "legionSash", icon: "assets/items/unique_legionSash.png", home: "smashana", name: "軍勢の飾り帯", base: "sash", weight: 8,
      stats: { maxHp: [15, 30], skillDamage: [6, 12] },
      power: "skillBoostRaiseLegion",
      desc: "{skill:raise}で呼ぶ数 +2、いられる時間が1.5倍になる",
      params: { kind: "raise", mods: { countBase: ["add", 2], duration: ["mul", 1.5] } },
    },
    {
      id: "echoTalisman", icon: "assets/items/unique_echoTalisman.png", home: "cathedral", name: "残響の護符", base: "talisman", weight: 8,
      stats: { maxHp: [15, 30], hpRegen: [1, 2] },
      power: "skillBoostAuraWide",
      desc: "すべてのオーラの届く範囲が1.7倍になる（仲間にも広く届く）",
      params: { kind: "aura", mods: { radius: ["mul", 1.7] } },
    },
    {
      id: "trapperGreaves", icon: "assets/items/unique_trapperGreaves.png", home: "smashana", name: "罠師の脚甲", base: "leggings", weight: 8,
      stats: { defense: [3, 6], moveSpeed: [4, 8] },
      power: "skillBoostTrapRapid",
      desc: "すべての罠で、撃つ間隔が0.6倍、置いていられる時間が1.5倍になる",
      params: { kind: "trap", mods: { fireInterval: ["mul", 0.6], duration: ["mul", 1.5] } },
    },
    {
      id: "moonAmulet", icon: "assets/items/unique_moonAmulet.png", home: "frost", name: "月影の首飾り", base: "amulet", weight: 8,
      stats: { maxHp: [20, 35], attack: [3, 5] },
      power: "skillBoostShiftLong",
      desc: "すべての変身で、使える間隔が0.5倍、時間が1.3倍になる（ほぼずっと変身していられる）",
      params: { kind: "shift", mods: { cooldown: ["mul", 0.5], duration: ["mul", 1.3] } },
    },
    // ---- 職業専用：スキルを強くする（power は "skillBoost〜"。params.kind のスキルの数値を mods で変える。書き方は data/runes.js と同じ）----
    {
      id: "giantBlade", icon: "assets/items/unique_giantBlade.png", home: "patala", name: "巨人の大剣", base: "great_blade", weight: 10, classOnly: "barbarian",
      stats: { attack: [6, 10], attackSpeed: [-5, 0] },
      power: "skillBoostWhirl",
      desc: "{skill:whirl}の範囲が1.4倍、威力が1.5倍になる",
      params: { kind: "whirl", mods: { radius: ["mul", 1.4], damage: ["mul", 1.5] } },
    },
    {
      id: "berserkerHelm", icon: "assets/items/unique_berserkerHelm.png", home: "inferno", name: "狂戦士の兜", base: "turban", weight: 10, classOnly: "barbarian",
      stats: { defense: [3, 6], attackSpeed: [4, 8] },
      power: "skillBoostHaste",
      desc: "{skill:hanuman}の時間が2倍、上がる攻撃速度が1.3倍、使える間隔が0.7倍になる",
      params: { kind: "hanuman", mods: { duration: ["mul", 2], haste: ["mul", 1.3], cooldown: ["mul", 0.7] } },
    },
    {
      id: "archmageStaff", icon: "assets/items/unique_archmageStaff.png", home: "inferno", name: "大魔導の杖", base: "staff", weight: 10, classOnly: "sorceress",
      stats: { skillDamage: [15, 25] },
      power: "skillBoostAgni",
      desc: "{skill:agni}の範囲が1.3倍、威力が1.6倍、燃える時間が1.5倍になる",
      params: { kind: "agni", mods: { radius: ["mul", 1.3], damage: ["mul", 1.6], duration: ["mul", 1.5] } },
    },
    {
      id: "frostCrown", icon: "assets/items/unique_frostCrown.png", home: "frost", name: "氷結の冠", base: "crown", weight: 10, classOnly: "sorceress",
      stats: { maxHp: [15, 30], skillDamage: [8, 14] },
      power: "skillBoostFreeze",
      desc: "{skill:nagapasha}で凍らせる時間が1.6倍、範囲が1.3倍、敵が1体でも使う",
      params: { kind: "nagapasha", mods: { bind: ["mul", 1.6], radius: ["mul", 1.3], minTargets: ["set", 1] } },
    },
    {
      // classOnly … この職業でだけ落ちる（ほかの職業ではスキルがないので）
      id: "boneCrown", icon: "assets/items/unique_boneCrown.png", home: "smashana", name: "骸の王冠", base: "crown", weight: 10, classOnly: "necromancer",
      stats: { maxHp: [20, 35], skillDamage: [8, 15] },
      power: "raiseBoost",
      desc: "{skill:raise}で呼べる数 +{extraCount}、手下の攻撃力 +{attackPercent}%",
      params: { extraCount: 2, attackPercent: 30 },
    },
    {
      id: "crusaderCrown", icon: "assets/items/unique_crusaderCrown.png", home: "cathedral", name: "聖騎士の冠", base: "crown", weight: 10, classOnly: "paladin",
      stats: { maxHp: [20, 35], defense: [2, 4] },
      power: "skillBoostAura",
      desc: "すべてのオーラの範囲が1.3倍、効き目が1.4倍になる",
      params: { kind: "aura", mods: { radius: ["mul", 1.3], damage: ["mul", 1.4], heal: ["mul", 1.4], mightBase: ["mul", 1.4], mightPerLevel: ["mul", 1.4] } },
    },
    {
      id: "shadowClaw", icon: "assets/items/unique_shadowClaw.png", home: "patala", name: "影の鉤爪", base: "chakram", weight: 10, classOnly: "assassin",
      stats: { attack: [4, 8], critChance: [3, 6] },
      power: "skillBoostTrap",
      desc: "すべての罠で、置ける数 +2、威力が1.3倍になる",
      params: { kind: "trap", mods: { maxTrapsBase: ["add", 2], damage: ["mul", 1.3] } },
    },
    {
      id: "beastHeart", home: "forest", name: "獣王の心臓", base: "amulet", weight: 10, classOnly: "druid",
      stats: { maxHp: [20, 40], attack: [3, 6] },
      power: "skillBoostShift",
      desc: "すべての変身で、時間が1.5倍、攻撃力の上がり方が1.3倍になる",
      params: { kind: "shift", mods: { duration: ["mul", 1.5], attackPctBase: ["mul", 1.3], attackPctPerLevel: ["mul", 1.3] } },
    },
  ],
};
