// 天下三分：ゲームの数値（調整はこのファイルで行う）
var SG = typeof SG !== 'undefined' ? SG : {};
SG.data = SG.data || {};
SG.data.rules = {
  saveKey: 'wyd3-sangoku-save-v1',
  comeOfAge: 15,              // この年齢で登場する
  // 収入
  goldPerComm: 0.25,          // 毎月 金 += 商業 × これ × 治安/100
  harvestMonth: 9,            // 兵糧の収穫月
  foodPerAgri: 5,             // 収穫 兵糧 += 農業 × これ × 治安/100
  foodPerTroop: 0.01,         // 毎月 兵糧 -= 兵士 × これ
  starveLoss: 0.1,            // 兵糧が尽きたとき逃げる兵の割合
  popGrowth: 0.004,           // 毎月の人口増加（治安100のとき）
  // 内政（金の消費と上がる量）
  devCost: 40,                // 開墾・商業・城壁
  devBase: 5, devPerStat: 0.3,// 上がる量 = devBase + 能力 × devPerStat（±20%）
  orderCost: 30, orderBase: 2, orderPerStat: 0.08,
  trainBase: 3, trainPerStat: 0.1,
  // 徴兵
  goldPer100Troops: 10,
  recruitBase: 500, recruitPerCha: 30, // 1回の上限 = recruitBase + 魅力 × recruitPerCha
  recruitOrderLoss: 3,        // 1000人あたり下がる治安
  recruitPopRate: 0.1,        // 人口の何割まで一度に集められるか
  // 売買
  buyFoodPerGold: 8, sellFoodPerGold: 12,
  // 人事
  searchGold: [50, 200], searchGoldChance: 0.3,
  rewardLoyaltyPerGold: 0.1,  // 褒美の金 ×これ だけ忠誠が上がる
  desertLoyalty: 40, desertChance: 0.02,
  // 計略（隣の敵の都市へ）。成功率 = base + (仕掛ける武将の知力 − 相手の都市で一番の知力) / 100 を min〜max に収める
  plot: {
    rumor: { name: '流言', cost: 100, base: 0.5, min: 0.1, max: 0.9, order: [10, 25] },             // 治安を下げる
    incite: { name: '扇動', cost: 200, base: 0.4, min: 0.05, max: 0.8, troops: [0.05, 0.12], order: [3, 8] }, // 兵が逃げる
    discord: { name: '離間', cost: 100, base: 0.45, min: 0.05, max: 0.85, loyalty: [8, 20] },       // 武将の忠誠を下げる（君主の魅力が高いほど効きにくい）
    mole: { name: '埋伏の毒', cost: 300, base: 0.3, min: 0.05, max: 0.7 },                          // 偽って寝返る。攻めたとき内応して城門を開く
  },
  moleGateDef: 0.3,           // 内応で城門が開いたとき、計算の戦の城壁の守りをこの割合にする
  // AI の計略：知力がこれ以上の武将が、この確率で隣の敵に仕掛ける
  aiPlot: { int: 75, chance: 0.15, minGold: 400 },
  // 戦争
  maxUnits: 5,
  battleDays: 30,
  battleK: 0.06,              // 1日の損害の大きさ
  defDiv: 1000,               // 守備側の防御補正 = 1 + 城壁 / defDiv
  march: { foodMonths: 1 },   // 出陣で使う兵糧（兵士 × foodPerTroop × 月数）
  duelChance: 0.3,
  stratDiv: 600,              // 計略の発動率 = 知力 / stratDiv（毎日）
  captureRate: 0.3,           // 敗走した武将が捕まる確率
  fleeRate: 0.6,              // 落城時に隣の自城へ逃げられる確率
  conquestOrderLoss: 10,
  // 死亡（寿命）
  deathChance: 0.35,          // 没年以降、毎年1月に亡くなる確率
  // 災害（毎月・都市ごと）
  events: [
    { id: 'plague', name: '疫病', chance: 0.006, pop: -0.08, order: -10 },
    { id: 'flood', name: '洪水', chance: 0.005, agri: -0.15, def: -0.1 },
    { id: 'locust', name: '蝗害', chance: 0.004, food: -0.3, month: [6, 7, 8] },
  ],
  // AI
  ai: {
    attackChance: 0.5,        // 1都市で毎月攻撃を考える確率
    attackRatio: 1.15,        // 攻撃に出す兵 > 相手の守備力 × これ なら攻める
    attackShare: 0.75,        // 出陣に出す兵の割合
    minAttackTroops: 6000,
    occupyTroops: 3000,       // 空白地へ送る兵
    rewardBelow: 60,
  },
};
