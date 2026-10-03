// 日替わりの試練（クリア後、1日1回成功できる）。日付で条件が決まり、その日はだれが遊んでも同じ条件になる。
//   mods … 条件の候補。毎日 modCount 個えらばれる
//     enemyHp・enemyAttack・enemySpeed … 敵のHP・攻撃力・動く速さの倍率
//     eliteMult … 精鋭の出やすさの倍率
//     timeMult・killsMult … 制限時間・守護者までに倒す数の倍率
//     rewardMult … ごほうびの素材の倍率（むずかしい条件ほど高い）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.daily = {
  modCount: 2,
  stageOffset: -2,            // 試練の最高段階からいくつ下の段階で挑むか（最低1）
  rewardMaterials: 80,        // 成功したときの素材（条件の rewardMult をかける）
  rewardMaterialsPerStage: 6, // 段階ごとに足す素材
  rewardUnique: true,         // 成功するとユニーク装備が1つ必ず落ちる
  rewardGems: 2,              // 成功したときにもらえる宝石の数（段階は試練と同じ決め方）
  streakBonus: 0.1,           // 連続で成功した日数ごとに、素材が何割増えるか
  streakBonusMax: 1.0,        // その上限（+100%）
  color: "#ff9a3c",

  mods: [
    { id: "tough", name: "鋼の肉体", desc: "敵のHP 1.6倍", enemyHp: 1.6, rewardMult: 1.3 },
    { id: "fierce", name: "猛る群れ", desc: "敵の攻撃力 1.4倍", enemyAttack: 1.4, rewardMult: 1.3 },
    { id: "swift", name: "疾風", desc: "敵の動きが 1.4倍速い", enemySpeed: 1.4, rewardMult: 1.15 },
    { id: "elite", name: "精鋭の巣", desc: "精鋭が 3倍出やすい", eliteMult: 3, rewardMult: 1.25 },
    { id: "hurry", name: "時の砂", desc: "制限時間 0.7倍", timeMult: 0.7, rewardMult: 1.25 },
    { id: "horde", name: "大軍", desc: "守護者までに倒す数 1.5倍", killsMult: 1.5, rewardMult: 1.2 },
    { id: "glass", name: "もろい刃", desc: "敵のHP 0.7倍、攻撃力 1.7倍", enemyHp: 0.7, enemyAttack: 1.7, rewardMult: 1.2 },
  ],
};
