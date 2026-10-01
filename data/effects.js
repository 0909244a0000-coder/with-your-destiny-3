// 装備の特殊効果の数値。効果の種類・強さ・出やすさはここで調整する。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.effects = {
  // レア度ごとに付く特殊効果の数 [最小, 最大]
  countByRarity: {
    normal: [0, 0],
    magic:  [1, 1],
    rare:   [2, 2],
    legend: [3, 3],
    unique: [1, 1],
  },

  color: "#e58cff",  // 持ち物画面で特殊効果を表示する色

  // 特殊効果の一覧
  //   name     … 表示名
  //   desc     … 説明文。{v} = ランダムで決まる数値、{名前} = 下に書いた同じ名前の数値
  //   range    … ランダムで決まる数値 [最小, 最大]
  //   decimals … 小数点以下の桁数
  //   weight   … 大きいほど出やすい
  //   cap      … 複数の装備で重ねたときの合計の上限
  list: [
    {
      id: "thunder", name: "インドラの雷",
      desc: "攻撃時 {v}% の確率で雷が落ち、攻撃力×{power}倍のダメージ",
      range: [8, 15], decimals: 0, weight: 10, cap: 50,
      power: 1.2,          // 雷ダメージの倍率（攻撃力×これ）
      color: "#9fd8ff",
    },
    {
      id: "lifesteal", name: "ラクタビージャの渇き",
      desc: "与えたダメージの {v}% をHPとして吸収",
      range: [2, 5], decimals: 1, weight: 10, cap: 20,
    },
    {
      id: "cooldown", name: "カーラチャクラ",
      desc: "スキルのクールダウン {v}% 短縮",
      range: [5, 12], decimals: 0, weight: 8, cap: 50,
    },
    {
      id: "killHeal", name: "チャームンダーの饗宴",
      desc: "敵を倒すと最大HPの {v}% を回復",
      range: [2, 5], decimals: 0, weight: 10, cap: 25,
    },
    {
      id: "critDamage", name: "シヴァの第三の眼",
      desc: "会心ダメージ +{v}%",
      range: [10, 30], decimals: 0, weight: 10, cap: 200,
    },
    {
      id: "moveSpeed", name: "ガルダの翼",
      desc: "移動速度 +{v}%",
      range: [8, 15], decimals: 0, weight: 10, cap: 60,
    },
    {
      id: "wrath", name: "カーリーの憤怒",
      desc: "HPが{hpPercent}%以下のとき、与ダメージ +{v}%",
      range: [15, 30], decimals: 0, weight: 8, cap: 100,
      hpPercent: 50,       // この%以下で発動
    },
    {
      id: "thorns", name: "ナーガの鱗",
      desc: "受けたダメージの {v}% を相手に返す",
      range: [15, 40], decimals: 0, weight: 8, cap: 200,
    },
  ],
};
