// プレイヤー（職業）の数値。強さを調整したいときはここを変える。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.player = {
  className: "バーバリアン",    // 職業名
  weaponName: "双剣",           // 初期の武器種（表示用）
  color: "#4fa3ff",             // 絵がないときの丸の色
  image: "assets/player.png",    // バーバリアンの透過スプライト（立ち姿）
  poses: { attack: null },       // ポーズ違いの絵（例: attack: "assets/player_attack.png"）。攻撃の瞬間に差し替える
  radius: 14,                   // 体の大きさ（当たり判定・表示）

  // レベル1のときの能力
  base: {
    maxHp: 120,       // 最大HP
    attack: 10,       // 攻撃力
    defense: 2,       // 防御力
    attackSpeed: 1.0, // 1秒あたりの攻撃回数
    critChance: 5,    // 会心率（%）
    hpRegen: 1,       // 1秒あたりのHP回復
    moveSpeed: 120,   // 移動速度（1秒あたりのピクセル）
  },

  // レベルが1上がるごとに増える量
  perLevel: {
    maxHp: 15,
    attack: 2,
    defense: 1,
  },

  attackRange: 30,        // 通常攻撃が届く距離
  critMultiplier: 1.5,    // 会心のときのダメージ倍率
  critChanceCap: 75,      // 会心率の上限（%）
  minAttackSpeed: 0.3,    // 攻撃速度の下限

  skillPointsPerLevel: 1, // レベルアップでもらえるスキルポイント
  respawnSeconds: 3,      // 倒れてから復活するまでの秒数

  // 経験値：次のレベルまでに必要な量 = expBase × expGrowth^(レベル-1)
  // ただし expLateFrom 以降は、増え方を expGrowthLate にゆるめる（上限まで届くように）
  expBase: 30,
  expGrowth: 1.25,
  expLateFrom: 20,
  expGrowthLate: 1.1,
  maxLevel: 50,

  // 修練（レベル上限のあとのやり込み）：上限のあとの経験値で「修練レベル」が上がり、
  // 1つ上がるごとに修練ポイント。ポイントで能力を少しずつ上げられる（上限なし）
  paragon: {
    expBase: 40000,      // 修練レベル1つぶんに必要な経験値
    expGrowth: 1.03,     // 修練レベルが上がるごとに必要な量が何倍になるか
    pointsPerLevel: 1,
    // ポイント1つで上がる量
    stats: {
      attack:     { name: "攻撃力", per: 2 },
      defense:    { name: "防御力", per: 1.5 },
      maxHp:      { name: "最大HP", per: 10 },
      critChance: { name: "会心率", per: 0.25, percent: true },
    },
  },
};
