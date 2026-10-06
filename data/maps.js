// 地図（Path of Exile のしくみ）：クリア後に「地図」が落ちる。使うと、その地図の段階と条件で試練（時間内に倒して守護者）に挑む。
// 条件（data/daily.js の mods と同じもの）が多いほど難しいが、ごほうびが増える。守護者を倒すと次の地図が落ちる。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.maps = {
  sceneImages: ["forest", "smashana", "patala", "cathedral", "frost", "inferno"].map((id) => `assets/areas/scenes/${id}.webp`),
  maxTier: 16,
  maxHeld: 20,                 // 持てる地図の数
  stagePerTier: 1,             // 地図の段階1つで、試練の段階がいくつ上がるか
  stageOffset: 1,              // 地図の段階1 = 試練の段階 (1 + これ)
  timeLimit: 240,              // 地図の制限時間（秒）
  // 条件の数：ノーマル 0 / マジック 1〜2 / レア 3〜4
  rarities: [
    { id: "normal", name: "ノーマル", weight: 55, mods: [0, 0], color: "#d8d8d8" },
    { id: "magic", name: "マジック", weight: 35, mods: [1, 2], color: "#5b8cff" },
    { id: "rare", name: "レア", weight: 10, mods: [3, 4], color: "#ffd447" },
  ],
  drop: {
    chanceNormal: 0.003,       // クリア後、ふつうの敵が地図を落とす確率
    chanceElite: 0.05,
    chanceBoss: 0.6,
    tierPerDifficulty: 3,      // 危険度がこれだけ上がるごとに、落ちる地図の段階が1上がる
    guardianDrops: 1,          // 地図の守護者を倒すと必ず落とす数
    guardianExtraChance: 0.35, // もう1つ落とす確率
    tierUpChance: 0.3,         // 守護者が落とす地図が、1つ上の段階になる確率
  },
  // ごほうび（成功したとき）。条件の rewardMult をかけあわせたものを「量の倍率」にする
  rewardItems: 4,
  rewardMaterials: 25,
  rewardMaterialsPerTier: 8,
  rewardGems: 1,
  // 地図を「レア」にする（条件を足し直す）のに使う素材（段階ごと）
  upgradeCostPerTier: 6,
  color: "#9fe0a8",
};
