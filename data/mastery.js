// 熟練：レベルを上げたのに OFF にしているスキル（スキル枠からはずしたスキル）は、レベルに応じて能力が上がる。
// 使わないスキルに振ったポイントもむだにならないように。スキルの「しくみ」（kind）ごとに上がる能力が決まっている。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.mastery = {
  label: "熟練",
  color: "#d8c27a",
  // しくみ → 1レベルごとに上がる能力（data/items.js の stats の名前）
  perLevel: {
    whirl:      { skillDamage: 1.5 },   // 周りを攻撃するスキル → スキル威力 %
    sudarshana: { critChance: 0.5 },    // 跳ねて当たるスキル → 会心率 %
    agni:       { skillDamage: 1.5 },   // 地面を焼くスキル → スキル威力 %
    nagapasha:  { defense: 1.5 },       // 縛るスキル → 防御力
    vajra:      { maxHp: 6 },           // 守りのスキル → 最大HP
    hanuman:    { attackSpeed: 1.5 },   // 加速のスキル → 攻撃速度 %
    raise:      { attack: 0.8 },        // 呼び出すスキル → 攻撃力
    aura:       { hpRegen: 0.3 },       // オーラ → HP回復/秒
    trap:       { critChance: 0.5 },    // 罠 → 会心率 %
    shift:      { maxHp: 6 },           // 変身 → 最大HP
  },
};
