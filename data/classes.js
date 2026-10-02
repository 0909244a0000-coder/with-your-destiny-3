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
    desc: "近くで戦う力自慢。旋風斬で周りをまとめて斬り、雄叫びや祖霊で押し切る。打たれ強く、はじめてでも扱いやすい",
    player: {},
    skills: null,
    autoBuild: null,
    skillOrder: null,
    skillIcons: null,
  },

  // 遠くから魔法で戦う職業
  sorceress: {
    name: "ソーサレス",
    desc: "遠くから火の玉で戦う魔法使い。凍らせて足を止め、メテオやハイドラで焼き払う。打たれ弱いので距離が大事",
    player: {
      className: "ソーサレス",
      weaponName: "杖",
      color: "#ff8a4a",
      image: "assets/player_sorceress.png",
      poses: { attack: "assets/player_sorceress_attack.png" },
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
      sorc_hydra: {
        kind: "trap", name: "ハイドラ",
        desc: "炎の竜を呼び出す。竜はその場にとどまり、近くの敵へ火の玉を吐き続ける（罠と同じしくみ）。",
        startLevel: 0, maxLevel: 10, cooldown: 3,
        triggerRange: 280, placeAt: 0.5,
        maxTrapsBase: 1, maxTrapsPerLevel: 0.2,
        duration: 10, fireInterval: 0.8, range: 260, targetsBase: 1, trapRadius: 10,
        damageBase: 0.5, damagePerLevel: 0.08, color: "#ff7a2a",
      },
      sorc_static: {
        kind: "aura", auraType: "damage", name: "静電気の場",
        desc: "オーラ：まわりに静電気をまとい、近くの敵を雷で削り続ける。攻撃力×倍率のダメージ。",
        startLevel: 0, maxLevel: 10, cooldown: 1,
        radius: 140, damageBase: 0.3, damagePerLevel: 0.06, color: "#cfe8ff",
      },
      sorc_warmth: {
        kind: "aura", auraType: "heal", name: "温もり",
        desc: "オーラ：魔力の温もりで、HPがずっと回復する。手下にも効く。最大HPの何%か。",
        startLevel: 0, maxLevel: 10, cooldown: 1,
        radius: 140, healPercentBase: 1.1, healPercentPerLevel: 0.22, color: "#ffc07a",
      },
    },
    autoBuild: ["sorc_nova", "sorc_shield", "sorc_chain"],   // 「おまかせ」で先に覚えてONにするスキル
    skillOrder: ["sorc_shield", "sorc_warmth", "sorc_static", "sorc_haste", "sorc_hydra", "sorc_freeze", "sorc_nova", "sorc_chain", "sorc_meteor"],
    skillIcons: {
      sorc_nova: "assets/skills/sorc_nova.png", sorc_shield: "assets/skills/sorc_shield.png", sorc_chain: "assets/skills/sorc_chain.png",
      sorc_meteor: "assets/skills/sorc_meteor.png", sorc_haste: "assets/skills/sorc_haste.png", sorc_freeze: "assets/skills/sorc_freeze.png",
    },
  },

  // 骸骨の手下を呼び出して、いっしょに戦う職業
  // 主人公の絵は player_necromancer.png。手下は亡者の絵を白くして仮に使う（絵が来たら imageFilter を null に）
  necromancer: {
    name: "ネクロマンサー",
    desc: "骸骨の戦士と魔術師を呼び出して、いっしょに戦う。手下が敵を引きつけるので、本人は後ろから骨の槍を撃つ",
    player: {
      className: "ネクロマンサー",
      weaponName: "杖",
      color: "#7dff9a",
      image: "assets/player_necromancer.png",
      imageFilter: null,
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
        image: "assets/ally_skeleton.png",
        imageFilter: null,
      },
      nec_mage: {
        kind: "raise", name: "骸骨の魔術師",
        desc: "遠くから魔法を撃つ骸骨を呼び出す。戦士より打たれ弱いが、離れたところから攻撃する。",
        startLevel: 0, maxLevel: 10, cooldown: 4,
        countBase: 1, countPerLevel: 0.25,
        hpRatio: 0.25, attackBase: 0.55, attackPerLevel: 0.07, defenseRatio: 0.3,
        duration: 18, moveSpeed: 100, attackSpeed: 0.8, range: 26, radius: 11,
        rangedRange: 220,                      // この距離から撃つ
        keepDistance: 120,                     // 敵とこの距離を保つ
        shotColor: "#b98aff",
        spawnSpread: 40, followDistance: 70, firstAttackDelay: 0.6,
        color: "#d8c8ff",
        image: "assets/enemies/nagaCaster.png",   // 仮の絵
        imageFilter: "grayscale(1) brightness(1.5) hue-rotate(240deg)",
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
      nec_decay: {
        kind: "aura", auraType: "damage", name: "腐敗の気",
        desc: "オーラ：まわりに死の気配をまとい、近くの敵を腐らせ続ける。攻撃力×倍率のダメージ。",
        startLevel: 0, maxLevel: 10, cooldown: 1,
        radius: 130, damageBase: 0.3, damagePerLevel: 0.06, color: "#9adf7a",
      },
    },
    autoBuild: ["nec_raise", "nec_mage", "nec_nova"],   // 「おまかせ」で先に覚えてONにするスキル
    skillOrder: ["nec_armor", "nec_decay", "nec_raise", "nec_mage", "nec_pact", "nec_grasp", "nec_nova", "nec_spear", "nec_plague"],
    skillIcons: {},
  },

  // 聖なる力で戦う騎士。「オーラ」（ONにしているあいだずっと効くスキル）を持つ
  // 主人公の絵は player_paladin.png
  paladin: {
    name: "パラディン",
    desc: "聖なる騎士。オーラ（ONのあいだずっと効く）で、炎・回復・攻撃力アップを味方にまとい続ける。とても打たれ強い",
    player: {
      className: "パラディン",
      weaponName: "鎚",
      color: "#ffd75e",
      image: "assets/player_paladin.png",
      imageFilter: null,
      poses: { attack: null },
      base: { maxHp: 130, attack: 9, defense: 3, attackSpeed: 1.0, critChance: 5, hpRegen: 1.5, moveSpeed: 115 },
      perLevel: { maxHp: 16, attack: 1.9, defense: 1.2 },
    },
    skills: {
      pal_zeal: {
        kind: "whirl", name: "熱狂の一撃",
        desc: "すばやく何度も振り回し、周りの敵すべてにダメージ。",
        startLevel: 1, maxLevel: 10, cooldown: 4,
        radius: 85, damageBase: 1.4, damagePerLevel: 0.28, minTargets: 1, color: "#fff2a8",
      },
      pal_shield: {
        kind: "vajra", name: "聖なる盾",
        desc: "HPが減ると発動。光の盾で防御力アップし、HPを回復。",
        startLevel: 0, maxLevel: 10, cooldown: 12, duration: 5,
        defenseBase: 7, defensePerLevel: 3.5, healPercentBase: 10, healPercentPerLevel: 2,
        triggerHpPercent: 60, color: "#ffe68a",
      },
      pal_hammer: {
        kind: "sudarshana", name: "祝福の鎚",
        desc: "光の鎚が敵から敵へ飛び移り、何体もまとめて打つ。",
        startLevel: 0, maxLevel: 10, cooldown: 5,
        range: 240, jumpRange: 160, targetsBase: 3, targetsPerLevel: 0.5,
        damageBase: 1.5, damagePerLevel: 0.25, color: "#cfe0ff",
      },
      pal_judgment: {
        kind: "agni", name: "天の裁き",
        desc: "敵の多い場所に光の柱を下ろし、中の敵を焼き続ける。",
        startLevel: 0, maxLevel: 10, cooldown: 8,
        range: 220, radius: 85, duration: 4, tick: 0.5, damageBase: 0.5, damagePerLevel: 0.1, color: "#fff6c8",
      },
      pal_vow: {
        kind: "hanuman", name: "聖戦の誓い",
        desc: "近くに敵がいると発動。しばらく攻撃速度が大きく上がる。",
        startLevel: 0, maxLevel: 10, cooldown: 14, duration: 6,
        hasteBase: 40, hastePerLevel: 6, triggerRange: 120, color: "#ffb84a",
      },
      pal_chain: {
        kind: "nagapasha", name: "審判の鎖",
        desc: "光の鎖で周りの敵を縛り、しばらく動けなくしてダメージ。ボスには効きにくい。",
        startLevel: 0, maxLevel: 10, cooldown: 10,
        radius: 120, minTargets: 2, bindBase: 1.6, bindPerLevel: 0.2, bossBindMult: 0.3,
        damageBase: 0.7, damagePerLevel: 0.15, color: "#fff2a8",
      },
      // ---- オーラ（kind: "aura"）。ONにしているあいだ、ずっと効き続ける ----
      // auraType … "damage"（周りの敵を焼く）・"heal"（HPを回復）・"might"（攻撃力アップ）
      // cooldown … 何秒ごとに効くか（might は常に効くので使わない）
      pal_fire: {
        kind: "aura", auraType: "damage", name: "聖なる炎",
        desc: "オーラ：まわりの敵を聖なる炎で焼き続ける。攻撃力×倍率のダメージ。",
        startLevel: 0, maxLevel: 10, cooldown: 1,
        radius: 100, damageBase: 0.35, damagePerLevel: 0.07, color: "#ffb84a",
      },
      pal_prayer: {
        kind: "aura", auraType: "heal", name: "祈り",
        desc: "オーラ：HPがずっと回復する。手下にも効く。最大HPの何%か。",
        startLevel: 0, maxLevel: 10, cooldown: 1,
        radius: 140, healPercentBase: 1.2, healPercentPerLevel: 0.25, color: "#9fffb0",
      },
      pal_might: {
        kind: "aura", auraType: "might", name: "力",
        desc: "オーラ：攻撃力が上がり続ける。",
        startLevel: 0, maxLevel: 10, cooldown: 1,
        radius: 120, mightBase: 15, mightPerLevel: 4, color: "#ff6a5a",
      },
    },
    autoBuild: ["pal_zeal", "pal_shield", "pal_hammer"],   // 「おまかせ」で先に覚えてONにするスキル
    skillOrder: ["pal_shield", "pal_might", "pal_prayer", "pal_fire", "pal_vow", "pal_chain", "pal_zeal", "pal_hammer", "pal_judgment"],
    skillIcons: {
      pal_zeal: "assets/skills/pal_zeal.png",
      pal_shield: "assets/skills/pal_shield.png",
      pal_hammer: "assets/skills/pal_hammer.png",
      pal_judgment: "assets/skills/pal_judgment.png",
      pal_vow: "assets/skills/pal_vow.png",
      pal_chain: "assets/skills/pal_chain.png",
      pal_fire: "assets/skills/pal_fire.png",
      pal_prayer: "assets/skills/pal_prayer.png",
      pal_might: "assets/skills/pal_might.png",
    },
  },

  // 素早い近接と、地面に置く「罠」で戦う職業（kind: "trap"。src/traps.js）
  // 主人公の絵は player_assassin.png。影の戦士は同じ絵を暗くして使う
  assassin: {
    name: "アサシン",
    desc: "素早い近接と、地面に置く罠で戦う。罠は置いておくだけで敵を撃ち続け、影の戦士が身代わりになる",
    player: {
      className: "アサシン",
      weaponName: "鉤爪",
      color: "#c08aff",
      image: "assets/player_assassin.png",
      imageFilter: null,
      poses: { attack: null },
      base: { maxHp: 110, attack: 9, defense: 2, attackSpeed: 1.1, critChance: 7, hpRegen: 1, moveSpeed: 130 },
      perLevel: { maxHp: 13, attack: 1.85, defense: 0.85 },
    },
    skills: {
      asn_blade: {
        kind: "whirl", name: "刃の舞",
        desc: "回転しながら周りの敵すべてを切り裂く。",
        startLevel: 1, maxLevel: 10, cooldown: 3.5,
        radius: 85, damageBase: 1.3, damagePerLevel: 0.27, minTargets: 1, color: "#d8b0ff",
      },
      asn_cloak: {
        kind: "vajra", name: "影の外套",
        desc: "HPが減ると発動。影に身を包んで防御力アップし、HPを回復。",
        startLevel: 0, maxLevel: 10, cooldown: 12, duration: 5,
        defenseBase: 6, defensePerLevel: 3, healPercentBase: 11, healPercentPerLevel: 2,
        triggerHpPercent: 60, color: "#7a5aa8",
      },
      asn_shuriken: {
        kind: "sudarshana", name: "連鎖の手裏剣",
        desc: "手裏剣が敵から敵へ飛び移り、何体もまとめて切る。",
        startLevel: 0, maxLevel: 10, cooldown: 4,
        range: 260, jumpRange: 170, targetsBase: 4, targetsPerLevel: 0.5,
        damageBase: 1.3, damagePerLevel: 0.23, color: "#e0e0f0",
      },
      asn_fire: {
        kind: "agni", name: "爆炎の罠",
        desc: "敵の多い場所に炎の罠をしかけ、燃える地面で焼き続ける。",
        startLevel: 0, maxLevel: 10, cooldown: 7,
        range: 240, radius: 85, duration: 4, tick: 0.5, damageBase: 0.55, damagePerLevel: 0.11, color: "#ff7a3a",
      },
      asn_burst: {
        kind: "hanuman", name: "疾風の構え",
        desc: "近くに敵がいると発動。しばらく攻撃速度が大きく上がる。",
        startLevel: 0, maxLevel: 10, cooldown: 13, duration: 6,
        hasteBase: 45, hastePerLevel: 6, triggerRange: 140, color: "#9affd8",
      },
      asn_mind: {
        kind: "nagapasha", name: "心縛り",
        desc: "念の力で周りの敵の心を縛り、しばらく動けなくしてダメージ。ボスには効きにくい。",
        startLevel: 0, maxLevel: 10, cooldown: 10,
        radius: 125, minTargets: 2, bindBase: 1.7, bindPerLevel: 0.2, bossBindMult: 0.3,
        damageBase: 0.65, damagePerLevel: 0.14, color: "#c08aff",
      },
      asn_shadow: {
        kind: "raise", name: "影の戦士",
        desc: "自分そっくりの影を1体呼び出す。影は敵を切り、敵の攻撃も引きつける。",
        startLevel: 0, maxLevel: 10, cooldown: 4,
        countBase: 1, countPerLevel: 0,
        hpRatio: 0.6, attackBase: 0.6, attackPerLevel: 0.08, defenseRatio: 0.8,
        duration: 25, moveSpeed: 130, attackSpeed: 1.2, range: 28, radius: 13,
        spawnSpread: 30, followDistance: 50, firstAttackDelay: 0.4,
        color: "#5a3a7a",
        image: "assets/player_assassin.png",
        imageFilter: "brightness(0.35) saturate(0.5) opacity(0.85)",   // 影なので主人公の絵を暗く
      },
      // ---- 罠（kind: "trap"）。置くと duration 秒、fireInterval 秒ごとに range の中の敵（targetsBase 体）を撃つ ----
      asn_sentry: {
        kind: "trap", name: "稲妻の歩哨",
        desc: "罠：近くの敵へ稲妻を撃ち続ける装置を置く。いくつも置ける。",
        startLevel: 0, maxLevel: 10, cooldown: 2,
        triggerRange: 260,      // この距離に敵がいたら置く
        placeAt: 0.4,           // 主人公と敵のあいだのどこに置くか（0＝主人公、1＝敵）
        maxTrapsBase: 2, maxTrapsPerLevel: 0.2,   // 同時に置ける数（小数は切り捨て）
        duration: 10, fireInterval: 0.6, range: 230, targetsBase: 1, trapRadius: 9,
        damageBase: 0.4, damagePerLevel: 0.065, color: "#9ad0ff",
      },
      asn_death: {
        kind: "trap", name: "死の歩哨",
        desc: "罠：ゆっくりだが、近くの敵3体へまとめて強い一撃を撃つ装置を置く。",
        startLevel: 0, maxLevel: 10, cooldown: 3,
        triggerRange: 240, placeAt: 0.4,
        maxTrapsBase: 1, maxTrapsPerLevel: 0.15,
        duration: 12, fireInterval: 1.5, range: 220, targetsBase: 3, trapRadius: 11,
        damageBase: 0.72, damagePerLevel: 0.1, color: "#ff5a8a",
      },
    },
    autoBuild: ["asn_blade", "asn_cloak", "asn_shuriken"],   // 「おまかせ」で先に覚えてONにするスキル
    skillOrder: ["asn_cloak", "asn_burst", "asn_shadow", "asn_mind", "asn_sentry", "asn_death", "asn_blade", "asn_shuriken", "asn_fire"],
    skillIcons: {},
  },

  // 獣に変身して戦う、自然の力の職業（kind: "shift"。src/forms.js）
  // 主人公の絵は player_druid.png。熊変化は druid_bear.png、狼変化は druid_wolf.png（formImage）
  druid: {
    name: "ドルイド",
    desc: "熊や狼に変身して戦う、自然の力の職業。狼の群れや竜巻、地割れも使える。変身の時間をどう使うかがカギ",
    player: {
      className: "ドルイド",
      weaponName: "杖",
      color: "#9adf6a",
      image: "assets/player_druid.png",
      imageFilter: null,
      poses: { attack: null },
      base: { maxHp: 120, attack: 9, defense: 2, attackSpeed: 0.95, critChance: 5, hpRegen: 1.2, moveSpeed: 120 },
      perLevel: { maxHp: 15, attack: 1.9, defense: 1 },
    },
    skills: {
      // ---- 変身（kind: "shift"）。近くに敵がいると duration 秒のあいだ獣の姿になる。一度に1つの姿だけ ----
      dru_bear: {
        kind: "shift", name: "熊変化", formName: "熊",
        desc: "変身：近くに敵がいると熊に変身。攻撃力・最大HP・防御が大きく上がる。",
        startLevel: 1, maxLevel: 10, cooldown: 16,
        triggerRange: 160, duration: 15,
        attackPctBase: 30, attackPctPerLevel: 5, maxHpPct: 30, defensePct: 40,
        scale: 1.3, formImage: "assets/druid_bear.png", formFilter: null, color: "#c08a4a",
      },
      dru_wolf: {
        kind: "shift", name: "狼変化", formName: "狼",
        desc: "変身：近くに敵がいると狼に変身。攻撃速度と移動速度が大きく上がる。",
        startLevel: 0, maxLevel: 10, cooldown: 16,
        triggerRange: 200, duration: 15,
        attackPctBase: 10, attackPctPerLevel: 2, attackSpeedPctBase: 35, attackSpeedPctPerLevel: 5, moveSpeedPct: 25,
        scale: 1.1, formImage: "assets/druid_wolf.png", formFilter: null, color: "#b8c8d8",
      },
      dru_wolves: {
        kind: "raise", name: "狼の群れ",
        desc: "狼を呼び出す。狼は素早く敵にかみつき、敵の攻撃も引きつける。",
        startLevel: 0, maxLevel: 10, cooldown: 3,
        countBase: 2, countPerLevel: 0.3,
        hpRatio: 0.4, attackBase: 0.4, attackPerLevel: 0.06, defenseRatio: 0.6,
        duration: 22, moveSpeed: 150, attackSpeed: 1.3, range: 24, radius: 11,
        spawnSpread: 30, followDistance: 45, firstAttackDelay: 0.3,
        color: "#a8a8b8",
        image: "assets/enemies/daitya.png",   // 仮の絵
        imageFilter: "grayscale(0.8) brightness(1.4)",
      },
      dru_tornado: {
        kind: "whirl", name: "竜巻",
        desc: "まわりに竜巻を起こし、周りの敵すべてにダメージ。",
        startLevel: 0, maxLevel: 10, cooldown: 4.5,
        radius: 100, damageBase: 1.3, damagePerLevel: 0.26, minTargets: 1, color: "#cfeedd",
      },
      dru_bark: {
        kind: "vajra", name: "樹皮の守り",
        desc: "HPが減ると発動。木の皮で体を包んで防御力アップし、HPを回復。",
        startLevel: 0, maxLevel: 10, cooldown: 12, duration: 5,
        defenseBase: 7, defensePerLevel: 3, healPercentBase: 12, healPercentPerLevel: 2,
        triggerHpPercent: 60, color: "#8a6a3a",
      },
      dru_boulder: {
        kind: "sudarshana", name: "転がる岩",
        desc: "大きな岩が敵から敵へ転がり、何体もまとめて押しつぶす。",
        startLevel: 0, maxLevel: 10, cooldown: 5,
        range: 240, jumpRange: 150, targetsBase: 3, targetsPerLevel: 0.5,
        damageBase: 1.6, damagePerLevel: 0.25, color: "#b8a07a",
      },
      dru_fissure: {
        kind: "agni", name: "地割れ",
        desc: "敵の多い場所の地面を割り、吹き出す溶岩で焼き続ける。",
        startLevel: 0, maxLevel: 10, cooldown: 7.5,
        range: 240, radius: 90, duration: 4, tick: 0.5, damageBase: 0.55, damagePerLevel: 0.11, color: "#ff8a3a",
      },
      dru_howl: {
        kind: "hanuman", name: "野生の咆哮",
        desc: "近くに敵がいると発動。しばらく攻撃速度が大きく上がる。",
        startLevel: 0, maxLevel: 10, cooldown: 14, duration: 6,
        hasteBase: 40, hastePerLevel: 6, triggerRange: 140, color: "#e0c070",
      },
      dru_vines: {
        kind: "nagapasha", name: "絡みつく蔓",
        desc: "地面から蔓が伸びて周りの敵に絡みつき、動けなくしてダメージ。ボスには効きにくい。",
        startLevel: 0, maxLevel: 10, cooldown: 10,
        radius: 125, minTargets: 2, bindBase: 1.8, bindPerLevel: 0.2, bossBindMult: 0.3,
        damageBase: 0.6, damagePerLevel: 0.14, color: "#6adf6a",
      },
    },
    autoBuild: ["dru_bear", "dru_wolf", "dru_wolves"],   // 「おまかせ」で先に覚えてONにするスキル
    skillOrder: ["dru_bark", "dru_bear", "dru_wolf", "dru_howl", "dru_wolves", "dru_vines", "dru_tornado", "dru_boulder", "dru_fissure"],
    skillIcons: {},
  },
};
