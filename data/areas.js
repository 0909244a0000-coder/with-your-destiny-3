// エリア（マップ）の数値。上から順番に解放されていく。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.areas = [
  {
    id: "forest",
    name: "マンダラの森",
    bgColor: "#2b3a2a",
    grassColor: "#34482f",   // 飾り（草）の色
    stoneColor: "#4a4f47",   // 飾り（石）の色
    groundImage: null,       // 地面の絵（例: "assets/areas/forest.png"）。あれば色の代わりに敷きつめる
    powerMult: 1,            // 敵のHP・攻撃力・防御力・経験値の倍率
    itemLevelBonus: 0,       // 落ちる装備のアイテムレベルに足す数
    enemies: [               // 出てくる敵と出やすさ（data/enemies.js の名前）
      { kind: "preta", weight: 60 },
      { kind: "yaksha", weight: 30 },
      { kind: "rakshasa", weight: 8 },
    ],
    boss: "ravana",          // ボス
    killsForBoss: 40,        // この数倒すとボスが出る
  },
  {
    id: "smashana",
    name: "シュマシャーナ（火葬場）",
    bgColor: "#3a2c26",
    grassColor: "#5a3a2a",
    stoneColor: "#6b6258",
    groundImage: null,
    powerMult: 2.2,
    itemLevelBonus: 3,
    enemies: [
      { kind: "vetala", weight: 50 },
      { kind: "pishacha", weight: 35 },
      { kind: "rakshasa", weight: 12 },
    ],
    boss: "bhairava",
    killsForBoss: 50,
  },
  {
    id: "patala",
    name: "パーターラ（地底界）",
    bgColor: "#232a3a",
    grassColor: "#2f3f5a",
    stoneColor: "#55506b",
    groundImage: null,
    powerMult: 4.5,
    itemLevelBonus: 7,
    enemies: [
      { kind: "naga", weight: 45 },
      { kind: "daitya", weight: 40 },
      { kind: "pishacha", weight: 15 },
    ],
    boss: "mahisha",
    killsForBoss: 60,
  },
];

// ボス戦の共通設定
WYD.data.boss = {
  dropCount: 4,          // 必ず落とす装備の数
  nameColor: "#ff5a5a",  // 名前の色
  warnColor: "#ff3030",  // 大技の予告の色
};
