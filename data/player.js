// プレイヤー（職業）の数値。強さを調整したいときはここを変える。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.player = {
  className: "バーバリアン",    // 職業名
  weaponName: "双剣",           // 初期の武器種（表示用）
  color: "#4fa3ff",             // 絵がないときの丸の色
  image: "assets/player.png",    // バーバリアンの透過スプライト（立ち姿）
  poses: { attack: "assets/player_attack.png" },   // ポーズ違いの絵。攻撃の瞬間に差し替える
  radius: 14,                   // 体の大きさ（当たり判定・表示）
  escapeDirections: 16,         // 爆発の輪から逃げるとき、何方向を試すか

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
  maxAttackSpeed: 4,      // 攻撃速度の上限（回/秒）
  maxMoveSpeedMult: 2,    // 移動速度の上限（はじめの何倍まで）
  maxMagicFind: 300,      // レア発見の上限（%）

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
    // パラゴンボード（Diablo 4 のしくみ）：修練ポイント1つでマスを1つ取る。取れるのは、もう取ったマスのとなり（上下左右）だけ。
    //   layout … 盤面。1文字が1マス（"." はマスなし、"S" は始まり＝はじめから取ってある）
    //   tiles  … 文字ごとのマスの中身。kind（normal / magic / rare / legend：色と大きさ）、stats（能力）、effects（特殊効果）、
    //            power と params と desc（固有能力。data/uniques.js と同じしくみ）
    //   能力の名前は data/items.js の stats と同じ。magicFind = レア発見（%）
    board: {
      layout: [
        "..WaaLkkX..",
        "..a..s..k..",
        "..a..s..k..",
        "Ydd..m..rrZ",
        "..d..s..r..",
        "..dccsKKr..",
        "....AsH....",
        ".....s.....",
        "...hhshh...",
        ".....s.....",
        ".....S.....",
      ],
      tiles: {
        S: { kind: "normal", stats: {} },
        s: { kind: "normal", stats: { attack: 1, maxHp: 5 } },
        a: { kind: "normal", stats: { attack: 3 } },
        d: { kind: "normal", stats: { defense: 2 } },
        h: { kind: "normal", stats: { maxHp: 15 } },
        c: { kind: "normal", stats: { critChance: 0.5 } },
        k: { kind: "normal", stats: { skillDamage: 2 } },
        r: { kind: "normal", stats: { hpRegen: 0.3 } },
        m: { kind: "magic", stats: { magicFind: 10 } },
        A: { kind: "magic", stats: { attack: 8, attackSpeed: 3 } },
        H: { kind: "magic", stats: { maxHp: 40, defense: 3 } },
        K: { kind: "magic", stats: { skillDamage: 6 } },
        W: { kind: "rare", stats: { attack: 6 }, effects: { critDamage: 15 } },
        X: { kind: "rare", stats: { skillDamage: 10 }, effects: { cooldown: 5 } },
        Y: { kind: "rare", stats: { defense: 6 }, effects: { thorns: 15 } },
        Z: { kind: "rare", stats: { maxHp: 30 }, effects: { killHeal: 2 } },
        L: { kind: "legend", stats: { skillDamage: 5 }, power: "eliteHunter", params: { percent: 25 },
             desc: "精鋭とボスに与えるダメージ +{percent}%" },
      },
      colors: { normal: "#8a7d66", magic: "#5b8cff", rare: "#ffd447", legend: "#ff8a2a" },
      magicFindName: "レア発見",
    },
  },
};
