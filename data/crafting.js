// 分解とクラフトの数値。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.crafting = {
  materialName: "魂の欠片",       // 素材の名前
  materialColor: "#c9a0ff",

  // 装備を捨てる（分解する）ともらえる素材の数（レア度ごと）
  salvage: { normal: 1, magic: 3, rare: 8, legend: 20, unique: 30, set: 25 },

  // 特殊効果をつけ直すのに必要な素材の数（レア度ごと）。0 = つけ直せない
  // 自動分解：拾う前に、選んだレア度以下の装備をその場で素材にする（レジェンドとユニークは対象外）
  //   upTo … このレア度まで分解する（null = しない）
  autoSalvageOptions: [
    { id: "none",   label: "しない",       upTo: null },
    { id: "normal", label: "ノーマル",     upTo: "normal" },
    { id: "magic",  label: "マジック以下", upTo: "magic" },
    { id: "rare",   label: "レア以下",     upTo: "rare" },
  ],

  // 戦利品フィルター（Path of Exile のしくみ）：部位ごとに「このレア度から拾う」を決める。拾わない装備はその場で素材になる
  //   ユニーク・セットはいつも拾う。keepUpgrades = 今の装備より強いものは拾う、keepSocketed = ソケット2つ以上のノーマルは拾う
  filterLevels: [
    { id: "normal", label: "全部拾う" },
    { id: "magic", label: "マジック以上" },
    { id: "rare", label: "レア以上" },
    { id: "legend", label: "レジェンド以上" },
    { id: "none", label: "拾わない" },
  ],

  rerollCost: { normal: 0, magic: 10, rare: 25, legend: 60, unique: 40, set: 35 },

  // 鍛造（Last Epoch のしくみ）：装備ごとに「鍛造の余地」があり、それを使って能力を1つずつ狙って強くする。
  // 余地がなくなったら、もう鍛えられない。運がよいと余地を使わずに済む（会心の鍛造）
  forge: {
    potential: { normal: 8, magic: 14, rare: 18, legend: 22, unique: 6, set: 6 },   // はじめの余地（レア度ごと）
    improvePercent: 8,          // 能力1つを、元の値（はじめて鍛えたときの値）の何％ぶん上げるか（何度でも同じ量）
    improvePotential: [1, 4],   // 能力を上げるときに減る余地 [最小, 最大]
    improveCost: 6,             // 素材（アイテムレベルの半分を足す）
    addPotential: [3, 6],       // 新しい能力を足すときに減る余地
    addCost: 15,                // 素材（アイテムレベルを足す）
    maxAffixes: 6,              // 追加能力の最大の数
    critChance: 0.12,           // 会心の鍛造（余地が減らない）の確率
    color: "#ff9a5a",
  },

  // スキルと修練の振り直し：使ったポイントを全部もどす。素材 = respecBase + respecPerLevel × レベル
  respecBase: 20,
  respecPerLevel: 2,

  // 装備の強化（+1, +2, …）。素材を使って、装備の能力（宝石はのぞく）を少しずつ上げる
  enhance: {
    max: 10,                 // 最大で +10
    statPerLevel: 0.08,      // +1 ごとに、装備の能力が何割上がるか（+10 で 1.8倍）
    costBase: 8,             // +0 → +1 の素材
    costGrowth: 1.45,        // 1つ上げるごとに素材が何倍になるか
    rarityCostMult: { normal: 0.5, magic: 0.75, rare: 1, legend: 1.5, unique: 1.5, set: 1.5 },
    refundOnSalvage: 0.5,    // 強化した装備を捨てると、使った素材のこの割合がもどる
    color: "#7fe0ff",        // +数字 の色
  },
};
