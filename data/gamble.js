// キャダラの賭け（Diablo 3）。素材を払って部位を選ぶと、その部位の装備がランダムで1つもらえる。
// ふつうに拾うより、レジェンド・ユニーク・セットが出やすい。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.gamble = {
  hold: { delayMs: 450, repeatMs: 180, moveTolerance: 12 }, // 長押し開始・連続購入の間隔・移動で中止する距離
  costBase: 30,          // 1回の素材（costBase + costPerLevel × アイテムレベル）
  costPerLevel: 1,
  // 出るレア度と出やすさ（unique・set はその部位のものから選ぶ。その部位になければ legend）
  odds: [
    { rarity: "rare", weight: 70 },
    { rarity: "legend", weight: 18 },
    { rarity: "unique", weight: 6 },
    { rarity: "set", weight: 6 },
  ],
  minLevel: 10,          // 使えるようになるレベル
  color: "#ff9a3a",
};
