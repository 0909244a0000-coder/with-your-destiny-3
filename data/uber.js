// 奈落の双王（Diablo 2/3 の Uber ボス風）：「奈落の鍵」を集めて、強くなったボス2体に同時に挑む。
// 倒すと豪華なごほうびと、ここでしか出ないユニーク装備（data/uniques.js の uberOnly）。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.uber = {
  name: "奈落の双王",
  keyName: "奈落の鍵",
  keysNeeded: 3,
  bosses: ["ravana", "asuraKing"],   // いっしょに出るボス
  stageOffset: 3,          // 試練の最高段階より、いくつ上の強さか（最低でも minStage）
  minStage: 6,
  timeLimit: 240,
  // 鍵の落ち方
  drop: {
    bossChance: 0.25, bossMinDifficulty: 5,   // 危険度5以上のボス
    trialGuardianChance: 0.3,                 // 試練の守護者（日替わり・地図もふくむ）
  },
  // ごほうび
  rewardUniques: 2,
  uberUniqueChance: 0.3,   // そのうち1つが、ここでしか出ないユニークになる確率
  rewardMaterials: 150,
  rewardGems: 4,
  color: "#ff5ad0",
};
