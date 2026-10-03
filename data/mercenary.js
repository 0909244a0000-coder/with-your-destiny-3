// 傭兵（Diablo 2）。どの職業でも1人雇える、ずっといっしょに戦う仲間。
// 倒れても少したつと戻ってくる。強さは主人公の能力×割合なので、主人公が強くなると傭兵も強くなる。
// 雇っているあいだ、主人公に「加護」（bonus：stats は能力、effects は特殊効果）がつく。
// 絵は assets/merc_<種類>.png（ChatGPT に発注したもの）。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.mercenary = {
  hireCost: 40,                    // 雇う（別の傭兵に替える）のに使う素材
  rankCosts: [120, 300, 650, 1300], // 位を上げる素材（位2・3・4・5になるとき）
  rankMult: 0.25,                  // 位が1つ上がるごとに、HPと攻撃力が何割ふえるか
  reviveTime: 12,                  // 倒れてから戻るまでの秒数
  firstDelay: 1,                   // エリアに入ってから出てくるまでの秒数
  spawnSpread: 30,
  firstAttackDelay: 0.5,
  minLevel: 5,                     // 雇えるようになるレベル

  types: [
    {
      id: "spear", name: "槍兵", desc: "近くで戦う、打たれ強い傭兵。敵の攻撃を引きつける。",
      hpRatio: 1.0, attackRatio: 0.45, defenseRatio: 1.0,
      moveSpeed: 115, attackSpeed: 1.0, range: 34, radius: 14, followDistance: 45,
      color: "#c9d6e8", image: "assets/merc_spear.png", imageFilter: null,
      bonusName: "不屈の加護", bonus: { effects: { lifesteal: 2 }, stats: { defense: 6 } },
    },
    {
      id: "archer", name: "弓兵", desc: "離れたところから矢を射る傭兵。打たれ弱い。",
      hpRatio: 0.55, attackRatio: 0.55, defenseRatio: 0.5,
      moveSpeed: 115, attackSpeed: 1.1, range: 26, radius: 12, followDistance: 70,
      rangedRange: 240, keepDistance: 140, shotColor: "#e8e2a0",
      color: "#b8e89a", image: "assets/merc_archer.png", imageFilter: null,
      bonusName: "鷹の目の加護", bonus: { stats: { critChance: 6 } },
    },
    {
      id: "mage", name: "魔術師", desc: "離れたところから魔法を撃つ傭兵。打たれ弱い。",
      hpRatio: 0.5, attackRatio: 0.6, defenseRatio: 0.4,
      moveSpeed: 105, attackSpeed: 0.85, range: 26, radius: 12, followDistance: 70,
      rangedRange: 220, keepDistance: 130, shotColor: "#9ad0ff",
      color: "#a8c8ff", image: "assets/merc_mage.png", imageFilter: null,
      bonusName: "魔力の加護", bonus: { stats: { skillDamage: 15 } },
    },
  ],
};
