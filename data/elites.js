// 精鋭（エリート）敵の数値。ふつうの敵が強化されて出てくる。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.elites = {
  chance: 0.07,          // 敵が出るとき精鋭になる確率（0〜1）
  affixCount: [1, 2],    // 精鋭につく能力の数 [最小, 最大]
  color: "#6fa8ff",      // 名前と輪の色

  // 精鋭になると、元の敵からこれだけ強くなる（倍率）
  hpMult: 3.5,
  attackMult: 1.4,
  expMult: 5,
  dropCount: 2,          // 必ず落とす装備の数
  rarityBonusMult: 2.5,  // レアの出やすさの倍率

  // 精鋭の能力
  //   name … 表示名（名前の頭につく）
  //   desc … 説明
  affixes: [
    { id: "swift",    name: "疾風", desc: "動きと攻撃が速い", weight: 10,
      moveSpeedMult: 1.6, attackSpeedMult: 1.4 },
    { id: "adamant",  name: "金剛", desc: "とても硬い", weight: 10,
      defenseMult: 2.5, hpMult: 1.4 },
    { id: "mighty",   name: "剛力", desc: "攻撃力が高い", weight: 10,
      attackMult: 1.5 },
    { id: "vampiric", name: "吸血", desc: "与えたダメージでHPを回復する", weight: 8,
      lifestealPercent: 60 },
    { id: "burning",  name: "業火", desc: "近くにいるとじわじわ焼かれる", weight: 8,
      auraRadius: 70,      // 炎が届く距離
      auraDamage: 0.35,    // 1秒あたりのダメージ（その敵の攻撃力×これ）
      auraColor: "#ff6a2a" },
    { id: "summoner", name: "眷属使い", desc: "手下を呼び出す", weight: 6,
      summonKind: "preta", // 呼ぶ手下の種類（data/enemies.js の名前）
      summonInterval: 5,   // 呼ぶ間隔（秒）
      summonMax: 3 },      // 同時にいられる手下の数
  ],
};
