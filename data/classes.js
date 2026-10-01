// 職業の数値。職業ごとにセーブは別々（上のバーの「キャラ」で切り替える）。
// player … data/player.js の値を、この職業のときだけ上書きする
// skills … この職業のスキル（null なら data/skills.js のまま）。
//          kind = スキルのしくみ（data/skills.js のスキル名。同じしくみで名前と数値だけ変える）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.classes = {
  // 最初の職業。今までのセーブはこの職業として読み込む
  barbarian: {
    name: "バーバリアン",
    player: {},
    skills: null,
    skillOrder: null,
    skillIcons: null,
  },

  // 遠くから魔法で戦う職業
  sorceress: {
    name: "ソーサレス",
    player: {
      className: "ソーサレス",
      weaponName: "杖",
      color: "#ff8a4a",
      image: "assets/player_sorceress.png",
      base: { maxHp: 95, attack: 11, defense: 1, attackSpeed: 1.0, critChance: 6, hpRegen: 1, moveSpeed: 120 },
      perLevel: { maxHp: 11, attack: 2.3, defense: 0.7 },
      // 通常攻撃を「火の玉」にする（敵と距離をとって撃つ）
      rangedAttack: {
        range: 260,         // この距離に入ったら撃つ
        keepDistance: 170,  // 敵とこの距離を保とうとする
        speed: 420,         // 火の玉の速さ
        size: 5,
        color: "#ff9a4a",
      },
    },
    skills: {
      sorc_nova: {
        kind: "whirl", name: "フロストノヴァ",
        desc: "周りの敵すべてに冷気の衝撃。攻撃力×倍率のダメージ。",
        startLevel: 1, maxLevel: 10, cooldown: 5,
        radius: 110, damageBase: 1.3, damagePerLevel: 0.28, minTargets: 1, color: "#9fdcff",
      },
      sorc_shield: {
        kind: "vajra", name: "マナシールド",
        desc: "HPが減ると発動。魔力の盾で防御力アップし、HPを回復。",
        startLevel: 0, maxLevel: 10, cooldown: 12, duration: 5,
        defenseBase: 6, defensePerLevel: 3, healPercentBase: 12, healPercentPerLevel: 2,
        triggerHpPercent: 60, color: "#7fb0ff",
      },
      sorc_chain: {
        kind: "sudarshana", name: "チェインライトニング",
        desc: "稲妻が敵から敵へ飛び移り、何体もまとめて撃つ。",
        startLevel: 0, maxLevel: 10, cooldown: 4,
        range: 300, jumpRange: 180, targetsBase: 4, targetsPerLevel: 0.5,
        damageBase: 1.4, damagePerLevel: 0.25, color: "#cfe8ff",
      },
      sorc_meteor: {
        kind: "agni", name: "メテオ",
        desc: "敵の多い場所に隕石を落とし、燃える地面で焼き続ける。",
        startLevel: 0, maxLevel: 10, cooldown: 7,
        range: 280, radius: 90, duration: 4, tick: 0.5, damageBase: 0.6, damagePerLevel: 0.12, color: "#ff6a2a",
      },
      sorc_haste: {
        kind: "hanuman", name: "魔力の奔流",
        desc: "近くに敵がいると発動。しばらく攻撃速度が大きく上がる。",
        startLevel: 0, maxLevel: 10, cooldown: 14, duration: 6,
        hasteBase: 50, hastePerLevel: 6, triggerRange: 260, color: "#d58aff",
      },
      sorc_freeze: {
        kind: "nagapasha", name: "凍てつく檻",
        desc: "周りの敵を凍らせ、しばらく動けなくしてダメージ。ボスには効きにくい。",
        startLevel: 0, maxLevel: 10, cooldown: 10,
        radius: 130, minTargets: 2, bindBase: 1.8, bindPerLevel: 0.2, bossBindMult: 0.3,
        damageBase: 0.7, damagePerLevel: 0.15, color: "#9fe8ff",
      },
    },
    skillOrder: ["sorc_shield", "sorc_haste", "sorc_freeze", "sorc_nova", "sorc_chain", "sorc_meteor"],
    skillIcons: {},
  },
};
