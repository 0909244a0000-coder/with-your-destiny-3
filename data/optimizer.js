// おすすめ装備（src/optimizer.js）の重み。目的ごとに「能力1あたり何点」。
// 手持ち（持ち物・今の装備・倉庫）から部位ごとに点数のいちばん高い装備を選ぶ。見るだけで、着替えない。
// 能力は WYD.loot.statTotals（強化・宝石こみ）。特殊効果・ユニーク・セットの加点は data/items.js の autoEquip（perEffect・uniqueBonus・setBonus）のまま。
// 初期値は autoEquip.weights（attack 4, defense 2.5, maxHp 0.4, hpRegen 4, attackSpeed 1.5, critChance 1.5, moveSpeed 0.3, skillDamage 0.8）をもとにした。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.optimizer = {
  goals: [
    // 火力：攻撃・会心・攻速・技威力を重く
    { id: "damage", label: "火力", desc: "攻撃力・会心率・攻撃速度・スキル威力を重く見る",
      weights: { attack: 6, defense: 1, maxHp: 0.2, hpRegen: 1, attackSpeed: 3, critChance: 3, moveSpeed: 0.3, skillDamage: 1.6 } },
    // 防御：防御・HP・回復を重く
    { id: "defense", label: "防御", desc: "防御力・最大HP・HP回復を重く見る",
      weights: { attack: 1.5, defense: 5, maxHp: 0.8, hpRegen: 8, attackSpeed: 0.5, critChance: 0.5, moveSpeed: 0.3, skillDamage: 0.3 } },
    // 対人：HPと防御を重め、攻撃はふつう（autoEquip と同じ）
    { id: "pvp", label: "対人", desc: "最大HP・防御力を重めに、攻撃はふつうに見る",
      weights: { attack: 4, defense: 4, maxHp: 0.7, hpRegen: 4, attackSpeed: 1.5, critChance: 1.5, moveSpeed: 0.5, skillDamage: 0.8 } },
  ],
  reasonCount: 3,   // 選んだ理由に出す能力の数（点数の差が大きい順）
};
