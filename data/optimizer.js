// おすすめ装備（src/optimizer.js）の重み。目的ごとに「能力1点あたり何点」。10点 = その目的の強さが1%伸びる。
// 手持ち（持ち物・今の装備・倉庫）から部位ごとに点数のいちばん高い装備を選ぶ。見るだけで、着替えない。
// 能力は WYD.loot.statTotals（強化・宝石こみ）。特殊効果・ユニーク・セットの加点は data/items.js の autoEquip（perEffect・uniqueBonus・setBonus）のまま。
//
// 重みは実測（2026-10-10、tools/stat-weights.js → tools/optimizer-weights.js。docs/reviews/2026-10-10-stat-weights/）：
//   Lv50・レジェンド装備・業火の玉座 危険度5、職業ごとにスキル3つの組み合わせ全部（84ビルド）で、能力を足したときの伸びの中央値。
//   火力 = 与ダメージ/秒、防御 = 20秒もつ敵の強さ。対人はまだ測っていないので、火力と防御の平均。マイナスは0。
//   byClass の normal = 猛攻（攻撃速度アップのスキル・狼変化）を使わないビルド、frenzy = 使うビルド。職業がない（蒐集者など）ときは weights。
// 数値を変えたら（バランス調整のあと）、測り直して作り直す：
//   OUT_DIR=<フォルダ> node tools/stat-weights.js all 40 4 → node tools/optimizer-weights.js <フォルダ>
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.optimizer = {
  goals: [
    { id: "damage", label: "火力", desc: "与ダメージ/秒がどれだけ伸びるか" },
    { id: "defense", label: "防御", desc: "どれだけ強い敵に耐えられるか（防御・最大HP・HP回復・吸血）" },
    { id: "pvp", label: "対人", desc: "火力と防御の半分ずつ（対人はまだ測っていない）" },
  ],
  // 全職業・猛攻なしのビルドの中央値（職業の表がないとき）
  weights: {
    damage: { attack: 3.77, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 0.44, critChance: 9.6, moveSpeed: 0, skillDamage: 5.8 },
    defense: { attack: 0.27, defense: 2.37, maxHp: 0.41, hpRegen: 1.94, attackSpeed: 0.2, critChance: 0.6, moveSpeed: 0.04, skillDamage: 0.08 },
    pvp: { attack: 2.02, defense: 1.19, maxHp: 0.21, hpRegen: 0.97, attackSpeed: 0.32, critChance: 5.1, moveSpeed: 0.02, skillDamage: 2.94 },
  },
  byClass: {
    assassin: {  // ビルドの数：猛攻なし 56・あり 28
      normal: { damage: { attack: 3.97, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 0.4, critChance: 9.42, moveSpeed: 0, skillDamage: 5.96 },
        defense: { attack: 0.07, defense: 2.37, maxHp: 0.46, hpRegen: 1.94, attackSpeed: 0.08, critChance: 0.46, moveSpeed: 0, skillDamage: 0.06 },
        pvp: { attack: 2.02, defense: 1.19, maxHp: 0.23, hpRegen: 0.97, attackSpeed: 0.24, critChance: 4.94, moveSpeed: 0, skillDamage: 3.01 } },
      frenzy: { damage: { attack: 4.1, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 3.62, critChance: 9.46, moveSpeed: 0.22, skillDamage: 3.26 },
        defense: { attack: 0, defense: 2.37, maxHp: 0.49, hpRegen: 1.94, attackSpeed: 0.03, critChance: 0, moveSpeed: 0, skillDamage: 0 },
        pvp: { attack: 2.05, defense: 1.19, maxHp: 0.25, hpRegen: 0.97, attackSpeed: 1.83, critChance: 4.73, moveSpeed: 0.11, skillDamage: 1.63 } },
    },
    barbarian: {  // ビルドの数：猛攻なし 56・あり 28
      normal: { damage: { attack: 3.8, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 0.36, critChance: 10.12, moveSpeed: 0, skillDamage: 5.83 },
        defense: { attack: 0.26, defense: 2.31, maxHp: 0.41, hpRegen: 1.58, attackSpeed: 0.22, critChance: 0.72, moveSpeed: 0, skillDamage: 0.21 },
        pvp: { attack: 2.03, defense: 1.16, maxHp: 0.21, hpRegen: 0.79, attackSpeed: 0.29, critChance: 5.42, moveSpeed: 0, skillDamage: 3.02 } },
      frenzy: { damage: { attack: 3.93, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 1.95, critChance: 9.86, moveSpeed: 0.29, skillDamage: 3.32 },
        defense: { attack: 0.02, defense: 2.31, maxHp: 0.47, hpRegen: 1.84, attackSpeed: 0, critChance: 0.06, moveSpeed: 0, skillDamage: 0 },
        pvp: { attack: 1.98, defense: 1.16, maxHp: 0.24, hpRegen: 0.92, attackSpeed: 0.98, critChance: 4.96, moveSpeed: 0.14, skillDamage: 1.66 } },
    },
    bombmancer: {  // ビルドの数：猛攻なし 56・あり 28
      normal: { damage: { attack: 3.61, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 0.36, critChance: 10, moveSpeed: 1.49, skillDamage: 5.91 },
        defense: { attack: 0.28, defense: 2.37, maxHp: 0.46, hpRegen: 1.77, attackSpeed: 0.25, critChance: 0.38, moveSpeed: 17.42, skillDamage: 0.15 },
        pvp: { attack: 1.94, defense: 1.19, maxHp: 0.23, hpRegen: 0.89, attackSpeed: 0.31, critChance: 5.19, moveSpeed: 9.46, skillDamage: 3.03 } },
      frenzy: { damage: { attack: 3.78, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 1.84, critChance: 10.56, moveSpeed: 0.94, skillDamage: 3.39 },
        defense: { attack: 0, defense: 2.4, maxHp: 0.5, hpRegen: 1.99, attackSpeed: 0.01, critChance: 0.12, moveSpeed: 18.77, skillDamage: 0.01 },
        pvp: { attack: 1.89, defense: 1.2, maxHp: 0.25, hpRegen: 1, attackSpeed: 0.93, critChance: 5.34, moveSpeed: 9.86, skillDamage: 1.7 } },
    },
    druid: {  // ビルドの数：猛攻なし 35・あり 49
      normal: { damage: { attack: 3.93, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 0.91, critChance: 10.68, moveSpeed: 0, skillDamage: 5.86 },
        defense: { attack: 0.23, defense: 2.46, maxHp: 0.39, hpRegen: 1.85, attackSpeed: 0.34, critChance: 0.64, moveSpeed: 0, skillDamage: 0.07 },
        pvp: { attack: 2.08, defense: 1.23, maxHp: 0.2, hpRegen: 0.93, attackSpeed: 0.63, critChance: 5.66, moveSpeed: 0, skillDamage: 2.97 } },
      frenzy: { damage: { attack: 4.01, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 2.8, critChance: 9.36, moveSpeed: 0.16, skillDamage: 3.33 },
        defense: { attack: 0.01, defense: 2.33, maxHp: 0.45, hpRegen: 1.84, attackSpeed: 0.08, critChance: 0.12, moveSpeed: 0.04, skillDamage: 0 },
        pvp: { attack: 2.01, defense: 1.17, maxHp: 0.23, hpRegen: 0.92, attackSpeed: 1.44, critChance: 4.74, moveSpeed: 0.1, skillDamage: 1.67 } },
    },
    necromancer: {  // ビルドの数：猛攻なし 56・あり 28
      normal: { damage: { attack: 3.9, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 0.41, critChance: 9.72, moveSpeed: 0, skillDamage: 5.99 },
        defense: { attack: 0.24, defense: 2.42, maxHp: 0.41, hpRegen: 2.04, attackSpeed: 0.33, critChance: 1.16, moveSpeed: 0.77, skillDamage: 0.14 },
        pvp: { attack: 2.07, defense: 1.21, maxHp: 0.21, hpRegen: 1.02, attackSpeed: 0.37, critChance: 5.44, moveSpeed: 0.39, skillDamage: 3.07 } },
      frenzy: { damage: { attack: 3.99, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 2.51, critChance: 9.58, moveSpeed: 0, skillDamage: 3.11 },
        defense: { attack: 0.02, defense: 2.4, maxHp: 0.48, hpRegen: 1.99, attackSpeed: 0, critChance: 0.48, moveSpeed: 0.02, skillDamage: 0 },
        pvp: { attack: 2.01, defense: 1.2, maxHp: 0.24, hpRegen: 1, attackSpeed: 1.25, critChance: 5.03, moveSpeed: 0.01, skillDamage: 1.56 } },
    },
    paladin: {  // ビルドの数：猛攻なし 56・あり 28
      normal: { damage: { attack: 3.9, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 0.59, critChance: 9.24, moveSpeed: 0, skillDamage: 5.79 },
        defense: { attack: 0.07, defense: 2.26, maxHp: 0.42, hpRegen: 1.35, attackSpeed: 0.05, critChance: 0.36, moveSpeed: 0, skillDamage: 0.17 },
        pvp: { attack: 1.99, defense: 1.13, maxHp: 0.21, hpRegen: 0.68, attackSpeed: 0.32, critChance: 4.8, moveSpeed: 0, skillDamage: 2.98 } },
      frenzy: { damage: { attack: 4.03, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 2.18, critChance: 10.26, moveSpeed: 0, skillDamage: 3.16 },
        defense: { attack: 0.01, defense: 2.27, maxHp: 0.45, hpRegen: 1.78, attackSpeed: 0, critChance: 0.18, moveSpeed: 0, skillDamage: 0.01 },
        pvp: { attack: 2.02, defense: 1.14, maxHp: 0.23, hpRegen: 0.89, attackSpeed: 1.09, critChance: 5.22, moveSpeed: 0, skillDamage: 1.59 } },
    },
    puppeteer: {  // ビルドの数：猛攻なし 84・あり 0
      normal: { damage: { attack: 1.47, defense: 1.55, maxHp: 0.2, hpRegen: 0, attackSpeed: 0.28, critChance: 10.48, moveSpeed: 0.15, skillDamage: 5.26 },
        defense: { attack: 0.64, defense: 2.27, maxHp: 0.25, hpRegen: 3.2, attackSpeed: 1.05, critChance: 1.38, moveSpeed: 0.55, skillDamage: 0 },
        pvp: { attack: 1.06, defense: 1.91, maxHp: 0.23, hpRegen: 1.6, attackSpeed: 0.67, critChance: 5.93, moveSpeed: 0.35, skillDamage: 2.63 } },
      frenzy: { damage: { attack: 1.47, defense: 1.55, maxHp: 0.2, hpRegen: 0, attackSpeed: 0.28, critChance: 10.48, moveSpeed: 0.15, skillDamage: 5.26 },
        defense: { attack: 0.64, defense: 2.27, maxHp: 0.25, hpRegen: 3.2, attackSpeed: 1.05, critChance: 1.38, moveSpeed: 0.55, skillDamage: 0 },
        pvp: { attack: 1.06, defense: 1.91, maxHp: 0.23, hpRegen: 1.6, attackSpeed: 0.67, critChance: 5.93, moveSpeed: 0.35, skillDamage: 2.63 } },
    },
    sorceress: {  // ビルドの数：猛攻なし 56・あり 28
      normal: { damage: { attack: 3.58, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 0.49, critChance: 9.12, moveSpeed: 0, skillDamage: 5.74 },
        defense: { attack: 0.18, defense: 2.42, maxHp: 0.46, hpRegen: 1.69, attackSpeed: 0.12, critChance: 0.56, moveSpeed: 36.36, skillDamage: 0.39 },
        pvp: { attack: 1.88, defense: 1.21, maxHp: 0.23, hpRegen: 0.85, attackSpeed: 0.31, critChance: 4.84, moveSpeed: 18.18, skillDamage: 3.07 } },
      frenzy: { damage: { attack: 3.7, defense: 0, maxHp: 0, hpRegen: 0, attackSpeed: 2.64, critChance: 9.08, moveSpeed: 0, skillDamage: 2.72 },
        defense: { attack: 0, defense: 2.43, maxHp: 0.52, hpRegen: 2.05, attackSpeed: 0.04, critChance: 0.22, moveSpeed: 58.36, skillDamage: 0.01 },
        pvp: { attack: 1.85, defense: 1.22, maxHp: 0.26, hpRegen: 1.02, attackSpeed: 1.34, critChance: 4.65, moveSpeed: 29.18, skillDamage: 1.37 } },
    },
  },
  reasonCount: 3,   // 選んだ理由に出す能力の数（点数の差が大きい順）
};
