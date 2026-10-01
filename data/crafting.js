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
};
