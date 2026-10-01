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
};

// AIがスキルを試す順番
WYD.data.skillOrder = ["vajra", "whirl"];
