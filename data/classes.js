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
      poses: { attack: null },   // 例: "assets/player_sorceress_attack.png"
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

  // 骸骨の手下を呼び出して、いっしょに戦う職業
  // 絵がまだないので、ソーサレスの絵の色を変えて仮に使う（imageFilter）。手下は亡者の絵を白くして使う
  necromancer: {
    name: "ネクロマンサー",
    player: {
      className: "ネクロマンサー",
      weaponName: "杖",
      color: "#7dff9a",
      image: "assets/player_sorceress.png",
      imageFilter: "hue-rotate(95deg) saturate(0.55) brightness(0.8)",   // 本番の絵が来たら null にする
      poses: { attack: null },
      base: { maxHp: 100, attack: 9, defense: 1, attackSpeed: 0.9, critChance: 5, hpRegen: 1, moveSpeed: 115 },
      perLevel: { maxHp: 12, attack: 2.0, defense: 0.7 },
      // 通常攻撃は「骨の槍」（敵と距離をとって撃つ）
      rangedAttack: {
        range: 240,
        keepDistance: 160,
        speed: 380,
        size: 5,
        color: "#d8ffd0",
      },
    },
    skills: {
      nec_raise: {
        kind: "raise", name: "骸骨召喚",
        desc: "骸骨の戦士を呼び出す。手下は敵を殴り、敵の攻撃も引きつける。時間がたつと崩れる。",
        startLevel: 1, maxLevel: 10, cooldown: 3,
        countBase: 2, countPerLevel: 0.35,     // 呼べる数（レベルごとに足して、小数は切り捨て）
        hpRatio: 0.45,                         // 手下のHP（主人公の最大HPの何倍か）
        attackBase: 0.45, attackPerLevel: 0.06, // 手下の攻撃力（主人公の攻撃力×これ）
        defenseRatio: 0.6,                     // 手下の防御力（主人公の防御力×これ）
        duration: 20,                          // 手下がいられる秒数
        moveSpeed: 115, attackSpeed: 1.0, range: 26, radius: 12,
        spawnSpread: 30,                       // 主人公のまわりのどれくらいの所に出るか
        followDistance: 40,                    // 敵がいないとき、主人公からこの距離までついてくる
        firstAttackDelay: 0.5,                 // 出てから最初に攻撃するまでの秒数
        color: "#e8e2c8",
        image: "assets/enemies/preta.png",     // 手下の絵（本番の絵が来たら差し替え）
        imageFilter: "grayscale(1) brightness(1.6)",
      },
      nec_nova: {
        kind: "whirl", name: "骨の嵐",
        desc: "周りに骨の破片をまき散らし、敵すべてにダメージ。",
        startLevel: 0, maxLevel: 10, cooldown: 5,
        radius: 100, damageBase: 1.2, damagePerLevel: 0.26, minTargets: 2, color: "#e8e2c8",
      },
      nec_armor: {
        kind: "vajra", name: "骨の鎧",
        desc: "HPが減ると発動。骨の鎧で防御力アップし、HPを回復。",
        startLevel: 0, maxLevel: 10, cooldown: 12, duration: 5,
        defenseBase: 7, defensePerLevel: 3, healPercentBase: 12, healPercentPerLevel: 2,
        triggerHpPercent: 60, color: "#d8d0b0",
      },
      nec_spear: {
        kind: "sudarshana", name: "骨の飛槍",
        desc: "骨の槍が敵から敵へ飛び移り、何体もまとめて貫く。",
        startLevel: 0, maxLevel: 10, cooldown: 4,
        range: 280, jumpRange: 170, targetsBase: 3, targetsPerLevel: 0.5,
        damageBase: 1.3, damagePerLevel: 0.24, color: "#f0ead0",
      },
      nec_plague: {
        kind: "agni", name: "疫病の霧",
        desc: "敵の多い場所に毒の霧を広げ、中の敵をむしばみ続ける。",
        startLevel: 0, maxLevel: 10, cooldown: 7,
        range: 260, radius: 95, duration: 5, tick: 0.5, damageBase: 0.5, damagePerLevel: 0.1, color: "#7dff6a",
      },
      nec_pact: {
        kind: "hanuman", name: "血の契約",
        desc: "近くに敵がいると発動。しばらく攻撃速度が大きく上がる。",
        startLevel: 0, maxLevel: 10, cooldown: 14, duration: 6,
        hasteBase: 45, hastePerLevel: 6, triggerRange: 240, color: "#c03a3a",
      },
      nec_grasp: {
        kind: "nagapasha", name: "亡者の手",
        desc: "地面から亡者の手が伸び、周りの敵をつかんで動けなくしてダメージ。ボスには効きにくい。",
        startLevel: 0, maxLevel: 10, cooldown: 10,
        radius: 125, minTargets: 2, bindBase: 1.7, bindPerLevel: 0.2, bossBindMult: 0.3,
        damageBase: 0.6, damagePerLevel: 0.14, color: "#9a8aff",
      },
    },
    skillOrder: ["nec_armor", "nec_raise", "nec_pact", "nec_grasp", "nec_nova", "nec_spear", "nec_plague"],
    skillIcons: {},
  },
};
