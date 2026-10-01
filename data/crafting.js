// 分解とクラフトの数値。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.crafting = {
  materialName: "カルマの欠片",   // 素材の名前
  materialColor: "#c9a0ff",

  // 装備を捨てる（分解する）ともらえる素材の数（レア度ごと）
  salvage: { normal: 1, magic: 3, rare: 8, legend: 20, unique: 30 },

  // 特殊効果をつけ直すのに必要な素材の数（レア度ごと）。0 = つけ直せない
  rerollCost: { normal: 0, magic: 10, rare: 25, legend: 60, unique: 40 },
};
