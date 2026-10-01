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

  rerollCost: { normal: 0, magic: 10, rare: 25, legend: 60, unique: 40, set: 35 },

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
