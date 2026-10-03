// 伝説の宝石（Diablo 3）。試練（日替わり・地図・双王もふくむ）に成功すると手に入り、成功するたびにランクが上がる。
// 同時に3つまで身につけられる。効果は base + perRank ×（ランク - 1）。
// type … 効果のしくみ（src/legendaryGems.js）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.legendaryGems = {
  slots: 3,              // 同時に身につけられる数
  maxRank: 50,
  dropChance: 0.45,      // 試練に成功したとき、まだ持っていない宝石が手に入る確率
  firstDropGuaranteed: true,   // 1つも持っていなければ必ず手に入る
  upgradeTries: 3,       // 成功1回で、ランク上げを何回ためすか
  // ランク上げの成功率：base + step ×（試練の段階 - 今のランク）。min〜1 の間
  upgradeChance: { base: 0.6, step: 0.04, min: 0.05 },
  color: "#ff9a3a",

  list: [
    { id: "trapped", name: "囚われ人の災い", type: "trapped", base: 15, perRank: 0.5,
      desc: "動けない（縛られた・凍った）敵へのダメージ +{v}%", color: "#9a8aff" },
    { id: "powerful", name: "強者の災い", type: "powerful", base: 20, perRank: 0.6, duration: 20,
      desc: "精鋭かボスを倒すと、{duration}秒間ダメージ +{v}%", color: "#ff6a5a" },
    { id: "zei", name: "ゼイの復讐石", type: "zei", base: 4, perRank: 0.08, per: 100,
      desc: "敵との距離{per}ごとにダメージ +{v}%（遠くから戦う職業向け）", color: "#7fd0ff" },
    { id: "gogok", name: "迅速の宝石", type: "gogok", base: 1, perRank: 0.03, maxStacks: 15, duration: 4,
      desc: "攻撃を当てるたびに攻撃速度 +{v}%（{maxStacks}回まで重なる、{duration}秒）", color: "#ffe36a" },
    { id: "life", name: "命の宝石", type: "life", base: 10, perRank: 0.4,
      desc: "最大HP +{v}%", color: "#7dff8a" },
    { id: "blood", name: "血の宝石", type: "blood", base: 1, perRank: 0.04,
      desc: "吸血 +{v}%（与えたダメージをHPとして吸収）", color: "#ff3a5a" },
  ],
};
