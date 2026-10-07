// 奈落の双王（Diablo 2/3 の Uber ボス風）：「奈落の鍵」を集めて、強くなったボス2体に同時に挑む。
// 倒すと豪華なごほうびと、ここでしか出ないユニーク装備（data/uniques.js の uberOnly）。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.uber = {
  name: "奈落の双王",
  sceneImage: "assets/areas/scenes/inferno.webp",
  keyName: "奈落の鍵",
  keysNeeded: 3,
  bosses: ["ravana", "asuraKing"],   // いっしょに出るボス
  stageOffset: 3,          // 挑める最高の段階＝試練の最高段階＋これ（最低でも minStage）
  minStage: 6,             // 挑める最低の段階。この間から選べる（ごほうびの装備の強さも段階で決まる）
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
