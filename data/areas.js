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
    groundImage: "assets/areas/forest.png", // 地面の絵を敷きつめる
    powerMult: 1,            // 敵のHP・攻撃力・防御力・経験値の倍率
    itemLevelBonus: 0,       // 落ちる装備のアイテムレベルに足す数
    enemies: [               // 出てくる敵と出やすさ（data/enemies.js の名前）
      { kind: "preta", weight: 60 },
      { kind: "yaksha", weight: 30 },
      { kind: "rakshasa", weight: 8 },
      { kind: "yakshaArcher", weight: 15 },
    ],
    boss: "ravana",          // ボス（一番下の「ボスの間」にいる）
    floors: 3,               // ふつうの階の数（このあとに「ボスの間」がある）
    killsPerFloor: 27,       // この数倒すと次の階へ降りる
  },
  {
    id: "smashana",
    name: "シュマシャーナ（火葬場）",
    bgColor: "#3a2c26",
    grassColor: "#5a3a2a",
    stoneColor: "#6b6258",
    groundImage: "assets/areas/smashana.png",
    powerMult: 2.0,
    itemLevelBonus: 3,
    enemies: [
      { kind: "vetala", weight: 50 },
      { kind: "pishacha", weight: 35 },
      { kind: "rakshasa", weight: 12 },
      { kind: "bhuta", weight: 18 },
    ],
    boss: "asuraKing",
    floors: 3,
    killsPerFloor: 40,
  },
  {
    id: "patala",
    name: "パーターラ（地底界）",
    bgColor: "#232a3a",
    grassColor: "#2f3f5a",
    stoneColor: "#55506b",
    groundImage: "assets/areas/patala.png",
    powerMult: 3.5,
    itemLevelBonus: 7,
    enemies: [
      { kind: "naga", weight: 45 },
      { kind: "daitya", weight: 40 },
      { kind: "pishacha", weight: 15 },
      { kind: "nagaCaster", weight: 20 },
    ],
    boss: "mahisha",
    floors: 3,
    killsPerFloor: 53,
  },
  {
    // 4つ目：西洋の闇。地面の絵はまだないので、火葬場の絵に紫の色をかぶせて仮に使う（groundTint）
    id: "cathedral",
    name: "奈落の大聖堂",
    bgColor: "#1f1a26",
    grassColor: "#2c2438",
    stoneColor: "#4a4458",
    groundImage: "assets/areas/smashana.png",
    groundTint: "rgba(70,30,110,0.45)",   // 地面にかぶせる色（本番の絵が来たら消す）
    powerMult: 4.8,
    itemLevelBonus: 11,
    enemies: [
      { kind: "fallenKnight", weight: 35 },
      { kind: "shadowBeast", weight: 35 },
      { kind: "wailingSpirit", weight: 30 },
      { kind: "boneCleric", weight: 20 },
    ],
    boss: "archbishop",
    floors: 3,
    killsPerFloor: 60,
  },
  {
    // 5つ目：氷の深淵。地面の絵はまだないので、地底界の絵に青白い色をかぶせて仮に使う
    id: "frost",
    name: "凍てつく深淵",
    bgColor: "#1a2430",
    grassColor: "#2a3a4a",
    stoneColor: "#5a6a7a",
    groundImage: "assets/areas/patala.png",
    groundTint: "rgba(150,200,255,0.35)",
    powerMult: 6.6,
    itemLevelBonus: 15,
    enemies: [
      { kind: "frostWraith", weight: 35 },
      { kind: "iceGiant", weight: 25 },
      { kind: "blizzardArcher", weight: 22 },
      { kind: "frostWitch", weight: 18 },
    ],
    boss: "iceDragon",
    floors: 3,
    killsPerFloor: 66,
  },
  {
    // 6つ目：炎の地獄。地面の絵はまだないので、火葬場の絵に赤い色をかぶせて仮に使う
    id: "inferno",
    name: "業火の玉座",
    bgColor: "#2a1210",
    grassColor: "#4a1a10",
    stoneColor: "#6a3a2a",
    groundImage: "assets/areas/smashana.png",
    groundTint: "rgba(255,80,30,0.3)",
    powerMult: 8.0,
    itemLevelBonus: 19,
    enemies: [
      { kind: "fireImp", weight: 35 },
      { kind: "lavaGolem", weight: 22 },
      { kind: "hellArcher", weight: 22 },
      { kind: "pyromancer", weight: 18 },
    ],
    boss: "hellLord",
    floors: 3,
    killsPerFloor: 72,
  },
];

// ボス戦の共通設定
WYD.data.boss = {
  dropCount: 4,          // 必ず落とす装備の数
  nameColor: "#ff5a5a",  // 名前の色
  warnColor: "#ff3030",  // 大技の予告の色
  // ボスの間で倒れたら、1つ上の階にもどる。そのとき、降りるまでの数をどれだけ残すか（0〜1）
  // 0.5 なら、あと半分倒すとまたボスの間に降りられる（その間にレベルを上げられる）
  retryProgressRatio: 0.5,
  floorPowerStep: 0.15,    // 1階深くなるごとに敵が何割強くなるか
  bossRoomMaxEnemies: 3,   // ボスの間に同時にいるふつうの敵の数
  bossAppearDelay: 1.5,    // ボスの間に入ってからボスが出るまでの秒数

  // 何度もボスに倒されたら、そのボスが少しずつ弱くなる（倒すと元にもどる。試練・地図では弱くならない）
  easePerDeath: 0.05,      // 1回倒されるごとに、ボスのHPと攻撃力がこれだけ下がる
  easeMax: 0.3,            // 下がるのはここまで

  // ボスの怒り：HPが hpRatio を切ると1回だけ怒り、強くなって手下を呼ぶ（試練の守護者も同じ）
  enrage: {
    hpRatio: 0.5,
    attackMult: 1.1,         // 攻撃力
    attackSpeedMult: 1.25,   // 攻撃の速さ
    moveSpeedMult: 1.25,     // 動く速さ
    slamIntervalMult: 0.65,  // 大技の間隔（小さいほど多く使う）
    firstSlamDelay: 1.5,     // 怒ってから最初の大技までの秒数（これより長ければ縮める）
    summonCount: 2,          // 呼ぶ手下の数
    summonSpread: 70,        // 手下が出る広さ
    color: "#ff2a2a",        // 怒りのオーラの色
    auraRadius: 1.6,         // オーラの大きさ（ボスの大きさの何倍か）
  },
};
