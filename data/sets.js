// セット装備の数値。同じセットの装備を2つ・4つ身につけると、ボーナスがつく。
//   pieces  … セットの装備（base = 装備の種類、stats = 必ずつく能力 [最小, 最大]）
//   bonuses … そろえた数ごとのボーナス
//     stats   … 能力（data/items.js の stats の名前）
//     effects … 特殊効果（data/effects.js の id → 数値。装備の特殊効果に足される）
//     power   … 固有能力（data/uniques.js と同じしくみ）、params、desc
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.sets = {
  color: "#3fd06a",          // セット装備の名前の色
  chanceFromBoss: 0.3,       // ボスを倒したときに1個落とす確率
  chanceFromElite: 0.05,     // 精鋭を倒したときに1個落とす確率

  list: [
    {
      id: "undying", name: "不死者の鎧",
      pieces: [
        { id: "undying_crown", name: "不死者の冠", base: "crown", stats: { maxHp: [20, 40] } },
        { id: "undying_mail", name: "不死者の鎖かたびら", base: "chainmail", stats: { defense: [4, 8] } },
        { id: "undying_gloves", name: "不死者の籠手", base: "gauntlets", stats: { hpRegen: [1, 2] } },
        { id: "undying_boots", name: "不死者のブーツ", base: "sandals", stats: { maxHp: [15, 30] } },
      ],
      bonuses: {
        2: { stats: { maxHp: 60, defense: 8 } },
        4: { effects: { killHeal: 5 }, power: "vajraThorns", params: { percent: 200 },
             desc: "{skill:vajra}の発動中、受けたダメージの {percent}% を相手に返す" },
      },
    },
    {
      id: "thunderlord", name: "雷帝の装い",
      pieces: [
        { id: "thunder_dagger", name: "雷帝の短剣", base: "chakram", stats: { critChance: [3, 6] } },
        { id: "thunder_robe", name: "雷帝のローブ", base: "robe", stats: { skillDamage: [8, 15] } },
        { id: "thunder_bangle", name: "雷帝の腕輪", base: "bracelet", stats: { attackSpeed: [4, 8] } },
        { id: "thunder_ring", name: "雷帝の指輪", base: "ring", stats: { attack: [3, 6] } },
      ],
      bonuses: {
        2: { effects: { thunder: 15 } },
        4: { stats: { skillDamage: 25 }, power: "chakraBounce", params: { extraTargets: 4, damagePercent: 60 },
             desc: "{skill:sudarshana}が跳ね返る数 +{extraTargets}、威力 +{damagePercent}%" },
      },
    },
    {
      id: "pyre", name: "業火の遺産",
      pieces: [
        { id: "pyre_staff", name: "業火の杖", base: "staff", stats: { skillDamage: [10, 18] } },
        { id: "pyre_helm", name: "業火の兜", base: "turban", stats: { defense: [3, 6] } },
        { id: "pyre_greaves", name: "業火のグリーブ", base: "leggings", stats: { moveSpeed: [5, 10] } },
        { id: "pyre_seal", name: "業火の印章", base: "rosary", stats: { critChance: [2, 5] } },
      ],
      bonuses: {
        2: { stats: { skillDamage: 20 } },
        4: { effects: { critDamage: 40 }, power: "whirlFire", params: { radius: 100, duration: 3.5, tick: 0.5, mult: 0.5, color: "#ff7a2a" },
             desc: "{skill:whirl}を使うと足元の地面が燃え、{duration}秒間 {tick}秒ごとに攻撃力×{mult}倍で焼く" },
      },
    },
    {
      // バーバリアンでだけ落ちる
      id: "immortalKing", name: "不滅の王の遺産", classOnly: "barbarian",
      pieces: [
        { id: "ik_blade", name: "不滅の王の剣", base: "dual_blades", stats: { attack: [5, 9] } },
        { id: "ik_mail", name: "不滅の王の鎧", base: "chainmail", stats: { defense: [5, 9] } },
        { id: "ik_gauntlets", name: "不滅の王の籠手", base: "gauntlets", stats: { attackSpeed: [4, 8] } },
        { id: "ik_boots", name: "不滅の王の脚甲", base: "leggings", stats: { maxHp: [20, 40] } },
      ],
      bonuses: {
        2: { stats: { attack: 15, maxHp: 60 } },
        4: { effects: { lifesteal: 3 }, power: "skillBoostIK", params: { kind: "whirl", mods: { damage: ["mul", 2], cooldown: ["mul", 0.6] } },
             desc: "{skill:whirl}の威力が2倍、使える間隔が0.6倍になる" },
      },
    },
    {
      // ソーサレスでだけ落ちる
      id: "talRasha", name: "大魔術師の装い", classOnly: "sorceress",
      pieces: [
        { id: "tr_orb", name: "大魔術師の杖", base: "staff", stats: { skillDamage: [12, 20] } },
        { id: "tr_robe", name: "大魔術師の法衣", base: "robe", stats: { maxHp: [20, 40] } },
        { id: "tr_belt", name: "大魔術師の腕輪", base: "bracelet", stats: { attackSpeed: [4, 8] } },
        { id: "tr_ring", name: "大魔術師の指輪", base: "ring", stats: { critChance: [2, 5] } },
      ],
      bonuses: {
        2: { stats: { skillDamage: 25 } },
        4: { effects: { cooldown: 10 }, power: "skillBoostTR", params: { kind: "sudarshana", mods: { targets: ["add", 4], damage: ["mul", 1.8] } },
             desc: "{skill:sudarshana}の当たる数 +4、威力が1.8倍になる" },
      },
    },
    {
      // ネクロマンサーでだけ落ちる（classOnly）
      id: "boneLord", name: "骸の王の装い", classOnly: "necromancer",
      pieces: [
        { id: "bonelord_staff", name: "骸の王の杖", base: "staff", stats: { skillDamage: [10, 18] } },
        { id: "bonelord_robe", name: "骸の王の法衣", base: "robe", stats: { maxHp: [20, 40] } },
        { id: "bonelord_boots", name: "骸の王の脚甲", base: "leggings", stats: { defense: [3, 6] } },
        { id: "bonelord_ring", name: "骸の王の指輪", base: "ring", stats: { attack: [3, 6] } },
      ],
      bonuses: {
        2: { stats: { skillDamage: 20, maxHp: 40 } },
        4: { power: "raiseBoost", params: { extraCount: 1, attackPercent: 60 },
             desc: "{skill:raise}で呼べる数 +{extraCount}、手下の攻撃力 +{attackPercent}%" },
      },
    },
    {
      // パラディンでだけ落ちる
      id: "crusader", name: "聖戦士の誓い", classOnly: "paladin",
      pieces: [
        { id: "crusader_hammer", name: "聖戦士の鎚", base: "great_blade", stats: { attack: [5, 9] } },
        { id: "crusader_shield", name: "聖戦士の盾", base: "shield", stats: { defense: [4, 7] } },
        { id: "crusader_mail", name: "聖戦士の鎧", base: "chainmail", stats: { maxHp: [20, 40] } },
        { id: "crusader_seal", name: "聖戦士の印章", base: "rosary", stats: { hpRegen: [1, 2] } },
      ],
      bonuses: {
        2: { stats: { defense: 10, maxHp: 60 } },
        4: { effects: { lifesteal: 2 }, power: "skillBoostCrusader", params: { kind: "whirl", mods: { damage: ["mul", 1.8], radius: ["mul", 1.25] } },
             desc: "{skill:whirl}の威力が1.8倍、範囲が1.25倍になる" },
      },
    },
  ],
};
