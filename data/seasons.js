// 季節のルール（Diablo 4 のシーズン・Path of Exile のリーグ風）：1つ選ぶと、遊び方が変わり、ごほうびが増える。いつでも変えられる。
//   それぞれの数値は倍率（書いていないものは 1 倍）
//     enemyHp・enemyAttack … 敵のHP・攻撃力   eliteMult … 精鋭の出やすさ   goblinMult … 宝物ゴブリンの出やすさ
//     expMult … 経験値   rarityMult … レアの出やすさ   materialsMult … 捨てたときの素材   gemMult … 宝石とルーンの出やすさ
//     hpRegenMult … 主人公のHP回復   effects … 主人公に足す特殊効果（data/effects.js の id → 数値）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.seasons = {
  list: [
    { id: "none", name: "ふつう", desc: "季節のルールなし" },
    { id: "elite", name: "精鋭の季節", desc: "精鋭が2倍出る。敵のHP1.1倍。レアの出やすさ1.3倍・経験値1.2倍",
      eliteMult: 2, enemyHp: 1.1, rarityMult: 1.3, expMult: 1.2 },
    { id: "gold", name: "黄金の季節", desc: "宝物ゴブリンが5倍出る。捨てたときの素材1.5倍",
      goblinMult: 5, materialsMult: 1.5 },
    { id: "blood", name: "血の季節", desc: "HPが自然に回復しない。そのかわり吸血 +5%・経験値1.3倍",
      hpRegenMult: 0, effects: { lifesteal: 5 }, expMult: 1.3 },
    { id: "gem", name: "輝石の季節", desc: "宝石とルーンが3倍出る",
      gemMult: 3 },
    { id: "storm", name: "嵐の季節（むずかしい）", desc: "敵のHP1.5倍・攻撃力1.3倍。そのかわり経験値1.6倍・レアの出やすさ1.8倍・素材1.3倍",
      enemyHp: 1.5, enemyAttack: 1.3, expMult: 1.6, rarityMult: 1.8, materialsMult: 1.3 },
  ],
  color: "#8ad0ff",
};
