// 賞金首の依頼（Diablo 3 の Bounties）。いつも3つの依頼があり、ふつうに遊んでいるだけで進む。
// 達成すると、ご褒美（素材と、レア度の高い装備の箱）。新しい依頼がすぐに出る。
// types … 依頼の種類。record は数える記録（data/records.js の counters）、area=true は決まったエリアの中でだけ数える（試練の中は数えない）
//         target は [最小, 最大]、text の {n} は数、{area} はエリア名
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.bounties = {
  count: 3,                // 同時に出ている依頼の数
  types: [
    { id: "kills", record: "kills", area: true, target: [120, 220], weight: 30, text: "{area}で敵を{n}体倒す" },
    { id: "elites", record: "eliteKills", area: true, target: [4, 8], weight: 25, text: "{area}で精鋭を{n}体倒す" },
    { id: "boss", record: "bossKills", area: true, target: [1, 1], weight: 15, text: "{area}のボスを倒す" },
    { id: "shrines", record: "shrinesUsed", area: false, target: [2, 3], weight: 12, text: "祠に{n}回触れる" },
    { id: "breach", record: "breaches", area: false, target: [1, 1], weight: 10, text: "裂け目を{n}回閉じる" },
    { id: "goblin", record: "goblinKills", area: false, target: [1, 1], weight: 8, text: "宝物ゴブリンを{n}体倒す" },
  ],
  // ご褒美：素材 = materialsBase + materialsPerArea × エリアの順番（0から）。エリアのない依頼は、行ける一番奥のエリアで数える
  // items 個の装備は、odds のレア度から選ぶ（いつもレア以上。自動分解はせず持ち物へ。いっぱいなら素材に）
  reward: { materialsBase: 40, materialsPerArea: 15, items: 2, odds: [{ rarity: "rare", weight: 75 }, { rarity: "legend", weight: 25 }] },
  rerollCost: 20,          // 依頼を取り替える素材
  color: "#ffcf5a",
};
