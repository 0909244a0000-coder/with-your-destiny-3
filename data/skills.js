// スキルの数値。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.skills = {
  // 攻撃スキル：周りの敵まとめてダメージ
  whirl: {
    name: "旋風斬",
    desc: "周囲の敵すべてに、攻撃力×倍率のダメージ。",
    startLevel: 1,        // 最初から覚えているレベル
    maxLevel: 10,
    cooldown: 4,          // 次に使えるまでの秒数
    radius: 90,           // 届く範囲
    damageBase: 1.5,      // Lv1の倍率
    damagePerLevel: 0.3,  // 1レベルごとに増える倍率
    minTargets: 1,        // 範囲内にこの数以上の敵がいたら使う
    color: "#7fe0ff",
  },
  // 守りスキル：HPが減ったら防御アップ＋回復
  vajra: {
    name: "金剛身",
    desc: "HPが減ると発動。しばらく防御力アップし、HPを回復。",
    startLevel: 0,        // 0 = 最初は覚えていない（スキルポイントで覚える）
    maxLevel: 10,
    cooldown: 12,
    duration: 5,          // 効果が続く秒数
    defenseBase: 5,
    defensePerLevel: 3,
    healPercentBase: 10,  // 最大HPの何%回復するか
    healPercentPerLevel: 2,
    triggerHpPercent: 60, // HPがこの%以下になったら使う
    color: "#ffd75e",
  },
  // 攻撃スキル：敵から敵へ飛び移る円盤
  sudarshana: {
    name: "スダルシャナ・チャクラ",
    desc: "円盤が敵から敵へ飛び移り、何体もまとめて切り裂く。",
    startLevel: 0,
    maxLevel: 10,
    cooldown: 5,
    range: 260,           // 最初の敵までの距離
    jumpRange: 160,       // 次の敵へ飛び移れる距離
    targetsBase: 3,       // Lv1で当たる敵の数
    targetsPerLevel: 0.5, // 1レベルごとに増える数（端数は切り捨て）
    damageBase: 1.6,
    damagePerLevel: 0.25,
    color: "#ffe680",
  },
  // 攻撃スキル：地面に炎を残す
  agni: {
    name: "アグニの火炎陣",
    desc: "敵の多い場所に炎の陣を張り、中の敵を焼き続ける。",
    startLevel: 0,
    maxLevel: 10,
    cooldown: 8,
    range: 220,           // 陣を張れる距離
    radius: 80,           // 陣の大きさ
    duration: 4,          // 陣が残る秒数
    tick: 0.5,            // 何秒ごとにダメージを与えるか
    damageBase: 0.5,      // 1回あたりの倍率（攻撃力×これ）
    damagePerLevel: 0.1,
    color: "#ff7a2a",
  },
  // 強化スキル：攻撃速度アップ
  hanuman: {
    name: "ハヌマーンの剛力",
    desc: "近くに敵がいると発動。しばらく攻撃速度が大きく上がる。",
    startLevel: 0,
    maxLevel: 10,
    cooldown: 14,
    duration: 6,
    hasteBase: 40,        // 攻撃速度 +%
    hastePerLevel: 6,
    triggerRange: 120,    // この距離に敵がいたら使う
    color: "#ff9a5e",
  },
  // 足止めスキル：周りの敵を縛る
  nagapasha: {
    name: "ナーガパーシャ",
    desc: "蛇の縄で周りの敵を縛り、しばらく動けなくしてダメージ。ボスには効きにくい。",
    startLevel: 0,
    maxLevel: 10,
    cooldown: 10,
    radius: 110,
    minTargets: 2,
    bindBase: 1.5,        // 縛る秒数
    bindPerLevel: 0.2,
    bossBindMult: 0.3,    // ボスを縛る時間の倍率
    damageBase: 0.8,
    damagePerLevel: 0.15,
    color: "#5fd9a0",
  },
};

// スキルのアイコンの絵（スキル名 → ファイル）。例: whirl: "assets/skills/whirl.png"
WYD.data.skillIcons = {};

// 同時にONにできるスキルの数（ここでビルドを選ぶ）
WYD.data.skillSlots = 3;

// AIがスキルを試す順番
WYD.data.skillOrder = ["vajra", "hanuman", "nagapasha", "whirl", "sudarshana", "agni"];
