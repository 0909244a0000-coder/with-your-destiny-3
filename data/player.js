// プレイヤー（職業）の数値。強さを調整したいときはここを変える。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.player = {
  className: "バーバリアン",    // 職業名
  weaponName: "双剣",           // 初期の武器種（表示用）
  color: "#4fa3ff",             // 絵がないときの丸の色
  image: "assets/player.png",    // バーバリアンの透過スプライト
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
  expBase: 30,
  expGrowth: 1.25,
  maxLevel: 50,
};
