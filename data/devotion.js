// 星座（Grim Dawn のしくみ）：信仰ポイントで星座を1つずつ埋める。
// 星座には「縁（えにし）」が必要なものがあり、ほかの星座を埋めると縁がたまる。上の星座ほど強く、固有能力がつく。
//   points … 信仰ポイントのたまり方（レベル・はじめて倒したボス・試練・地図の記録から計算する）
//   list   … 星座。cost = 必要なポイント、requires = 必要な縁、grants = 埋めるともらえる縁
//            bonus = stats（能力）・effects（特殊効果）・power と params と desc（data/uniques.js と同じしくみ）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.devotion = {
  points: { perLevels: 5, perBoss: 2, perTrialStages: 3, perMapTier: 1 },
  affinities: { war: { name: "戦", color: "#ff6a5a" }, arcane: { name: "魔", color: "#7fb0ff" }, life: { name: "命", color: "#6adf8a" } },
  list: [
    // ---- はじまりの星座（縁いらず）----
    { id: "hound", name: "猟犬", cost: 3, requires: {}, grants: { war: 2 }, bonus: { stats: { attack: 6, attackSpeed: 4 } } },
    { id: "owl", name: "梟", cost: 3, requires: {}, grants: { arcane: 2 }, bonus: { stats: { skillDamage: 10 } } },
    { id: "tortoise", name: "陸亀", cost: 3, requires: {}, grants: { life: 2 }, bonus: { stats: { maxHp: 40, defense: 4 } } },
    { id: "falcon", name: "隼", cost: 4, requires: {}, grants: { war: 1, arcane: 1 }, bonus: { stats: { critChance: 3 }, effects: { moveSpeed: 6 } } },
    // ---- なかほど（縁が3〜4）----
    { id: "wolf", name: "狼群", cost: 5, requires: { war: 3 }, grants: { war: 3 }, bonus: { stats: { attack: 12 }, effects: { critDamage: 20 } } },
    { id: "lantern", name: "灯火", cost: 5, requires: { arcane: 3 }, grants: { arcane: 3 }, bonus: { stats: { skillDamage: 20 }, effects: { cooldown: 8 } } },
    { id: "spring", name: "泉", cost: 5, requires: { life: 3 }, grants: { life: 3 }, bonus: { stats: { hpRegen: 2, maxHp: 50 }, effects: { killHeal: 2 } } },
    { id: "serpent", name: "大蛇", cost: 6, requires: { war: 2, life: 2 }, grants: { war: 2, life: 2 }, bonus: { effects: { lifesteal: 3, thorns: 20 } } },
    // ---- 天の星座（縁が6以上、固有能力つき）----
    { id: "behemoth", name: "巨獣", cost: 8, requires: { life: 6 }, grants: { life: 2 },
      bonus: { stats: { maxHp: 120, defense: 10 }, power: "vajraThorns", params: { percent: 150 },
        desc: "{skill:vajra}の発動中、受けたダメージの {percent}% を相手に返す" } },
    { id: "storm", name: "嵐の王", cost: 8, requires: { arcane: 6 }, grants: { arcane: 2 },
      bonus: { effects: { thunder: 20 }, power: "chakraBounce", params: { extraTargets: 3, damagePercent: 50 },
        desc: "{skill:sudarshana}が跳ね返る数 +{extraTargets}、威力 +{damagePercent}%" } },
    { id: "reaper", name: "死神", cost: 8, requires: { war: 6 }, grants: { war: 2 },
      bonus: { stats: { attack: 15 }, power: "killNova", params: { chance: 25, radius: 85, mult: 1.3, color: "#c060ff" },
        desc: "敵を倒すと {chance}% の確率で死体が爆発し、周り{radius}に攻撃力×{mult}倍のダメージ" } },
    { id: "host", name: "天の軍勢", cost: 10, requires: { war: 4, arcane: 4, life: 4 }, grants: {},
      bonus: { stats: { skillDamage: 15 }, power: "periodicSummon",
        params: { interval: 12, firstDelay: 3, count: 2, duration: 9, attackMult: 0.8, hpRatio: 0.5, defenseRatio: 0.8,
          moveSpeed: 130, attackSpeed: 1.1, range: 26, radius: 13, spawnSpread: 30, followDistance: 40, firstAttackDelay: 0.3,
          color: "#fff0a0", image: "assets/enemies/yaksha.png", imageFilter: "grayscale(1) sepia(0.4) brightness(1.8) opacity(0.75)" },
        desc: "{interval}秒ごとに天の兵を{count}体呼ぶ（{duration}秒いて、攻撃力×{attackMult}倍でなぐる）" } },
  ],
};
